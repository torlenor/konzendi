//! Open a directory in the desktop's own file manager.
//!
//! Konzendi does not read, write, or list the directory. It gives the path to the desktop
//! and the desktop decides which program shows it.
//!
//! Tauri publishes an opener plugin for this. Measurement on 19 September 2026 showed that
//! the plugin starts the launcher detached and returns success as soon as the process
//! starts. A desktop with `xdg-open` but with no file manager therefore looks like a
//! success, and the user sees no folder and no message. Phase 17 must tell the user when
//! the folder did not open, so this module starts the launcher itself and reads its exit
//! code.

use std::{
    path::Path,
    process::{Child, Command, Stdio},
    thread,
    time::{Duration, Instant},
};

/// The launchers a desktop can supply, in the order they are tried.
///
/// This is the list the `open` crate uses, which is the list the Tauri opener plugin uses.
#[cfg(any(
    target_os = "linux",
    target_os = "dragonfly",
    target_os = "freebsd",
    target_os = "netbsd",
    target_os = "openbsd"
))]
const LAUNCHERS: &[&[&str]] = &[
    &["xdg-open"],
    &["gio", "open"],
    &["gnome-open"],
    &["kde-open"],
];
#[cfg(target_os = "macos")]
const LAUNCHERS: &[&[&str]] = &[&["open"]];
#[cfg(target_os = "windows")]
const LAUNCHERS: &[&[&str]] = &[&["explorer"]];

/// Windows Explorer reports a non-zero code after it opens a folder correctly, so its exit
/// code says nothing. Every other target reports a code that can be trusted.
const CODE_IS_MEANINGFUL: bool = !cfg!(target_os = "windows");

/// How long a launcher has to report a failure.
///
/// Measured on X11 with Cinnamon on 19 September 2026: `xdg-open` reported success in 33 ms
/// and, with no file manager installed, reported code 4 in 0.55 s. A launcher that still
/// runs after this time is a launcher that keeps the file manager as its child, so the
/// folder is open and the wait must end.
const VERDICT: Duration = Duration::from_secs(2);

/// How often the launcher is examined while the application waits for it.
const POLL: Duration = Duration::from_millis(20);

/// The message the user sees when no launcher opened the directory.
const FAILED: &str = "Konzendi could not open the folder. Copy the path instead.";

/// Open `path` in the file manager of the desktop.
///
/// This blocks for at most [`VERDICT`]. Call it away from the main thread.
pub fn open_directory(path: &Path) -> Result<(), String> {
    if !path.is_dir() {
        return Err(FAILED.to_string());
    }

    for launcher in LAUNCHERS {
        let (program, arguments) = launcher
            .split_first()
            .expect("each launcher names its program first");
        let started = Command::new(program)
            .args(arguments)
            .arg(path)
            // A launcher that inherits the pipes of the application keeps them open for as
            // long as the file manager runs. Give it none.
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();
        let Ok(mut child) = started else {
            // This desktop does not have this launcher. Try the next one.
            continue;
        };
        if !CODE_IS_MEANINGFUL {
            release(child);
            return Ok(());
        }
        match verdict(&mut child) {
            Verdict::Opened => return Ok(()),
            Verdict::StillRunning => {
                release(child);
                return Ok(());
            }
            // The launcher exists but the desktop refused the directory. A second launcher
            // can still succeed, so the list continues.
            Verdict::Refused => continue,
        }
    }

    Err(FAILED.to_string())
}

enum Verdict {
    Opened,
    Refused,
    StillRunning,
}

/// Wait for the launcher, but not for longer than [`VERDICT`].
fn verdict(child: &mut Child) -> Verdict {
    let deadline = Instant::now() + VERDICT;
    loop {
        match child.try_wait() {
            Ok(Some(status)) if status.success() => return Verdict::Opened,
            Ok(Some(_)) => return Verdict::Refused,
            // The launcher cannot be examined, so nothing can be claimed about the folder.
            Err(_) => return Verdict::StillRunning,
            Ok(None) => {
                if Instant::now() >= deadline {
                    return Verdict::StillRunning;
                }
                thread::sleep(POLL);
            }
        }
    }
}

/// Collect a launcher that outlives this call, so that it does not stay a zombie process.
fn release(mut child: Child) {
    thread::spawn(move || {
        let _ = child.wait();
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_path_that_is_not_a_directory_is_reported() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("device.json");
        std::fs::write(&file, "{}").unwrap();

        assert_eq!(open_directory(&file), Err(FAILED.to_string()));
        assert_eq!(
            open_directory(&dir.path().join("absent")),
            Err(FAILED.to_string())
        );
    }

    /// A launcher that exits with a failure code must not look like an opened folder.
    #[test]
    fn a_refusing_launcher_is_a_failure() {
        let mut child = Command::new("sh")
            .args(["-c", "exit 4"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap();
        assert!(matches!(verdict(&mut child), Verdict::Refused));
    }

    #[test]
    fn a_launcher_that_succeeds_is_an_opened_folder() {
        let mut child = Command::new("sh")
            .args(["-c", "exit 0"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap();
        assert!(matches!(verdict(&mut child), Verdict::Opened));
    }
}
