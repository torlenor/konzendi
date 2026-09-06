mod storage;

use serde_json::Value;
use storage::{Event, Store};
use tauri::{Manager, State};

#[tauri::command]
fn append_event(store: State<'_, Store>, kind: String, payload: Value) -> Result<Event, String> {
    store
        .append(kind, payload)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn read_events(store: State<'_, Store>) -> Result<Vec<Event>, String> {
    store.read().map_err(|error| error.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(Store::open(app.path().app_data_dir()?)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![append_event, read_events])
        .run(tauri::generate_context!())
        .expect("error while running Konzendi");
}
