mod storage;
#[cfg(target_os = "linux")]
mod x11;

use serde_json::Value;
use std::{path::Path, sync::OnceLock};
use storage::{Event, Store};
use tauri::{AppHandle, Emitter, Manager, State};

/// Broadcast name for a record the store has just written.
const APPENDED: &str = "event-appended";

/// The window labels declared in `tauri.conf.json`.
const MAIN: &str = "main";
const QUICK: &str = "quick";

/// The event store, created on the first command that needs it.
///
/// Builder-managed state exists before a webview can call a command. This is important on
/// Windows, where a webview can load before the application setup hook runs.
#[derive(Default)]
struct StoreState {
    store: OnceLock<Store>,
}

impl StoreState {
    fn open_at(&self, root: &Path) -> std::io::Result<&Store> {
        if let Some(store) = self.store.get() {
            return Ok(store);
        }

        let candidate = Store::open(root.to_path_buf())?;
        // A concurrent command can win this race. Both candidates use the same locked
        // identity, so use the value that the state accepted.
        let _ = self.store.set(candidate);
        Ok(self
            .store
            .get()
            .expect("the event store was set by this command or a concurrent command"))
    }

    fn for_app<'a>(&'a self, app: &AppHandle) -> Result<&'a Store, String> {
        let root = app.path().app_data_dir().map_err(|error| {
            format!("could not resolve the application data directory: {error}")
        })?;
        self.open_at(&root).map_err(|error| {
            format!(
                "could not open the event store at {}: {error}",
                root.display()
            )
        })
    }
}

#[tauri::command]
fn append_event(
    app: AppHandle,
    store: State<'_, StoreState>,
    kind: String,
    payload: Value,
) -> Result<Event, String> {
    let event = store
        .for_app(&app)?
        .append(kind, payload)
        .map_err(|error| error.to_string())?;
    // Two windows fold the same log, so a write from either has to reach the other.
    // The record travels as it was stored; the kind stays opaque here.
    let _ = app.emit(APPENDED, &event);
    Ok(event)
}

#[tauri::command]
fn read_events(app: AppHandle, store: State<'_, StoreState>) -> Result<Vec<Event>, String> {
    store
        .for_app(&app)?
        .read()
        .map_err(|error| error.to_string())
}

/// The desktop integration in use, which decides whether a global shortcut can work.
/// Linux needs X11. The global-shortcut plugin also has native Windows and macOS backends.
/// Report the detected integration instead of treating a successful build as runtime proof.
#[tauri::command]
fn window_system() -> String {
    #[cfg(target_os = "windows")]
    return "windows".to_string();
    #[cfg(target_os = "macos")]
    return "macos".to_string();
    #[cfg(target_os = "linux")]
    if std::env::var_os("WAYLAND_DISPLAY").is_some()
        || std::env::var("XDG_SESSION_TYPE").is_ok_and(|value| value == "wayland")
    {
        return "wayland".to_string();
    } else if std::env::var_os("DISPLAY").is_some() {
        return "x11".to_string();
    }
    "unknown".to_string()
}

fn window_of(app: &AppHandle, label: &str) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window(label)
        .ok_or_else(|| format!("the {label} window is missing"))
}

/// Put a window on screen with the keyboard in it.
///
/// Showing a window and being allowed to take the keyboard are two different things on
/// X11. `set_focus` asks GTK, and GTK asks the window manager using the time the user
/// last touched *this* application — which, when the tracking window has been sitting in
/// the tray for an hour, is old enough that the window manager refuses the request and
/// the window appears without the keyboard. Asking with `CurrentTime` instead is the
/// request a window manager grants, and it is the honest description of the situation:
/// the user pressed the shortcut just now.
fn present(app: &AppHandle, window: tauri::WebviewWindow) -> Result<(), String> {
    let _ = window.unminimize();
    window.show().map_err(|error| error.to_string())?;
    #[cfg(target_os = "linux")]
    app.run_on_main_thread(move || {
        use gtk::prelude::{GtkWindowExt, WidgetExt};
        if let Ok(gtk_window) = window.gtk_window() {
            gtk_window.present();
            if let Some(surface) = gtk_window.window() {
                surface.focus(0);
            }
        }
    })
    .map_err(|error| error.to_string())?;
    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        window.set_focus().map_err(|error| error.to_string())?;
    }
    Ok(())
}

/// Show the quick switcher. Repeating the call is harmless: the window it interrupted is
/// remembered once, and asking again is how the surface is focused while it is mapping.
#[tauri::command]
fn show_quick(app: AppHandle) -> Result<(), String> {
    let window = window_of(&app, QUICK)?;
    #[cfg(target_os = "linux")]
    if let Some(desktop) = app.try_state::<x11::Desktop>() {
        desktop.remember_interrupted();
    }
    present(&app, window)
}

/// Bring the tracking window back, or replace a visible quick switcher with it.
///
/// Hide quick access and clear its interrupted-window target before presenting the main
/// window. If presentation fails, restore both so the quick switcher remains available.
#[tauri::command]
fn show_main(app: AppHandle) -> Result<(), String> {
    let quick = window_of(&app, QUICK)?;
    let window = window_of(&app, MAIN)?;
    let quick_visible = quick.is_visible().map_err(|error| error.to_string())?;

    if !quick_visible {
        return present(&app, window);
    }

    quick.hide().map_err(|error| error.to_string())?;
    #[cfg(target_os = "linux")]
    let interrupted = app
        .try_state::<x11::Desktop>()
        .and_then(|desktop| desktop.take_interrupted());

    if let Err(error) = present(&app, window) {
        #[cfg(target_os = "linux")]
        if let Some(desktop) = app.try_state::<x11::Desktop>() {
            desktop.restore_interrupted_target(interrupted);
        }
        // Re-open the surface without going through show_quick: its target was saved
        // before this command started, and must not be replaced with the current window.
        let _ = present(&app, quick);
        return Err(error);
    }
    Ok(())
}

/// Leave for good. The tray is the only control that ends the application, because the
/// window's close button now only hides it.
#[tauri::command]
fn quit(app: AppHandle) {
    app.exit(0);
}

/// Dismiss the surface and hand the keyboard back to the window it interrupted.
///
/// Without this the window manager is left with nothing focused at all, and the user has
/// to click their way back into the work they were doing — which is the cost the whole
/// feature exists to avoid.
#[tauri::command]
fn hide_quick(app: AppHandle) -> Result<(), String> {
    window_of(&app, QUICK)?
        .hide()
        .map_err(|error| error.to_string())?;
    #[cfg(target_os = "linux")]
    if let Some(desktop) = app.try_state::<x11::Desktop>() {
        desktop.restore_interrupted();
    }
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        // Register the holder before Tauri creates a webview. Store creation itself stays
        // lazy because the platform data path is available through the command AppHandle.
        .manage(StoreState::default())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Without a display the quick switcher is unavailable anyway, and the
            // tracking window says so; it is not a reason to refuse to start.
            #[cfg(target_os = "linux")]
            match x11::Desktop::open() {
                Ok(desktop) => {
                    app.manage(desktop);
                }
                Err(reason) => eprintln!("no X11 display for quick access: {reason}"),
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            append_event,
            read_events,
            window_system,
            show_quick,
            hide_quick,
            show_main,
            quit
        ])
        .on_window_event(|window, event| {
            // Closing a window leaves the application running: the shortcut and the tray
            // are the point of this phase, and both die with the process. The tray's Quit
            // is what ends it. Only the tracking window has a close control to reach this;
            // the surface is undecorated and dismisses itself.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Konzendi");
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn managed_store_opens_once_and_keeps_events() {
        let dir = tempfile::tempdir().unwrap();
        let state = StoreState::default();
        let event = state
            .open_at(dir.path())
            .unwrap()
            .append("foundation.check".into(), json!({}))
            .unwrap();

        assert_eq!(
            state.open_at(dir.path()).unwrap().read().unwrap(),
            vec![event]
        );
    }
}
