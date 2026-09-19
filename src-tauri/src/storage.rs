use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    fs::{self, File, OpenOptions},
    io::{self, BufRead, BufReader, Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub id: Uuid,
    pub device: Uuid,
    pub recorded_at: DateTime<Utc>,
    pub kind: String,
    pub payload: Value,
}

#[derive(Serialize, Deserialize)]
struct Device {
    id: Uuid,
}

pub struct Store {
    root: PathBuf,
    device: Uuid,
}

fn invalid_data(error: impl ToString) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, error.to_string())
}

/// Flush a directory entry where the operating system permits directory handles.
///
/// Windows flushes each file before the rename or append completes, but it does not let
/// `std::fs::File` open a directory. Keep the stronger directory flush on Unix and do not
/// turn a successful Windows write into an error only because the directory cannot open.
fn sync_directory(path: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        File::open(path)?.sync_all()
    }
    #[cfg(not(unix))]
    {
        let _ = path;
        Ok(())
    }
}

impl Store {
    // An OS file lock coordinates separate application processes as well as IPC calls.
    fn lock(root: &Path) -> io::Result<File> {
        let file = OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(root.join("store.lock"))?;
        file.lock()?;
        Ok(file)
    }

    pub fn open(root: PathBuf) -> io::Result<Self> {
        fs::create_dir_all(root.join("events"))?;
        let _lock = Self::lock(&root)?;
        let identity = root.join("device.json");
        let device = match fs::read(&identity) {
            Ok(bytes) => {
                serde_json::from_slice::<Device>(&bytes)
                    .map_err(invalid_data)?
                    .id
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => {
                let device = Device { id: Uuid::new_v4() };
                // Publish identity only after the complete file is durable.
                let temporary = root.join("device.json.tmp");
                let mut file = File::create(&temporary)?;
                file.write_all(&serde_json::to_vec(&device)?)?;
                file.sync_all()?;
                fs::rename(temporary, identity)?;
                sync_directory(&root)?;
                device.id
            }
            Err(error) => return Err(error),
        };
        Ok(Self { root, device })
    }

    /// The directory this store opened. The interface shows this path to the user, so it
    /// must come from the store and not from a second calculation of the same location.
    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn append(&self, kind: String, payload: Value) -> io::Result<Event> {
        let _lock = Self::lock(&self.root)?;
        let event = Event {
            id: Uuid::new_v4(),
            device: self.device,
            recorded_at: Utc::now(),
            kind,
            payload,
        };
        let path = self
            .root
            .join("events")
            .join(format!("{}.jsonl", self.device));
        let mut file = OpenOptions::new()
            .create(true)
            .read(true)
            .append(true)
            .open(path)?;
        let mut bytes = Vec::new();
        // Preserve a crash-truncated tail, but separate it from the next valid event.
        if file.metadata()?.len() > 0 {
            file.seek(SeekFrom::End(-1))?;
            let mut last = [0];
            file.read_exact(&mut last)?;
            if last[0] != b'\n' {
                bytes.push(b'\n');
            }
        }
        serde_json::to_writer(&mut bytes, &event)?;
        bytes.push(b'\n');
        file.write_all(&bytes)?;
        file.flush()?;
        file.sync_all()?;
        sync_directory(&self.root.join("events"))?;
        Ok(event)
    }

    pub fn read(&self) -> io::Result<Vec<Event>> {
        let _lock = Self::lock(&self.root)?;
        let mut events = Vec::new();
        for entry in fs::read_dir(self.root.join("events"))? {
            let path = entry?.path();
            if path
                .extension()
                .is_none_or(|extension| extension != "jsonl")
                || !path.is_file()
            {
                continue;
            }
            for (index, line) in BufReader::new(File::open(&path)?).split(b'\n').enumerate() {
                match serde_json::from_slice::<Event>(&line?) {
                    Ok(event) => events.push(event),
                    Err(error) => eprintln!(
                        "Skipped malformed event at {}:{}: {error}",
                        path.display(),
                        index + 1
                    ),
                }
            }
        }
        events.sort_by(|a, b| a.recorded_at.cmp(&b.recorded_at).then(a.id.cmp(&b.id)));
        Ok(events)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn identity_and_event_survive_restart() {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::open(dir.path().into()).unwrap();
        let event = store.append("foundation.check".into(), json!({})).unwrap();
        let restarted = Store::open(dir.path().into()).unwrap();
        assert_eq!(store.device, restarted.device);
        assert_eq!(restarted.read().unwrap(), vec![event]);
        let log =
            fs::read_to_string(dir.path().join(format!("events/{}.jsonl", store.device))).unwrap();
        assert_eq!(log.lines().count(), 1);
        assert!(log.ends_with('\n'));
    }

    #[test]
    fn malformed_lines_and_truncated_tail_do_not_hide_valid_events() {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::open(dir.path().into()).unwrap();
        let path = dir.path().join(format!("events/{}.jsonl", store.device));
        fs::write(path, b"invalid\n\xff\n{\"partial\":").unwrap();
        let event = store.append("foundation.check".into(), json!({})).unwrap();
        assert_eq!(store.read().unwrap(), vec![event]);
    }

    #[test]
    fn reads_all_devices_in_timestamp_order() {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::open(dir.path().into()).unwrap();
        let current = store.append("foundation.check".into(), json!({})).unwrap();
        let mut older = current.clone();
        older.id = Uuid::new_v4();
        older.device = Uuid::new_v4();
        older.recorded_at = "2020-01-01T00:00:00Z".parse().unwrap();
        fs::write(
            dir.path().join("events/other.jsonl"),
            format!("{}\n", serde_json::to_string(&older).unwrap()),
        )
        .unwrap();
        assert_eq!(store.read().unwrap(), vec![older, current]);
    }

    #[test]
    fn corrupt_identity_is_not_silently_replaced() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("device.json"), "broken").unwrap();
        assert!(Store::open(dir.path().into()).is_err());
        assert_eq!(
            fs::read_to_string(dir.path().join("device.json")).unwrap(),
            "broken"
        );
    }

    #[test]
    fn concurrent_stores_share_identity_and_preserve_every_append() {
        let dir = tempfile::tempdir().unwrap();
        let handles: Vec<_> = (0..8)
            .map(|_| {
                let root = dir.path().to_path_buf();
                std::thread::spawn(move || {
                    let store = Store::open(root).unwrap();
                    store.append("foundation.check".into(), json!({})).unwrap()
                })
            })
            .collect();
        let appended: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();
        let store = Store::open(dir.path().into()).unwrap();
        assert!(appended.iter().all(|event| event.device == store.device));
        assert_eq!(store.read().unwrap().len(), 8);
    }
}
