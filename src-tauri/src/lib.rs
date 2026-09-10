mod storage;
#[cfg(target_os = "linux")]
mod x11;

use serde_json::Value;
use storage::{Event, Store};
use tauri::{AppHandle, Emitter, Manager, State};

/// Broadcast name for a record the store has just written.
const APPENDED: &str = "event-appended";

/// The window labels declared in `tauri.conf.json`.
const MAIN: &str = "main";
const QUICK: &str = "quick";

#[tauri::command]
fn append_event(
    app: AppHandle,
    store: State<'_, Store>,
    kind: String,
    payload: Value,
) -> Result<Event, String> {
    let event = store
        .append(kind, payload)
        .map_err(|error| error.to_string())?;
    // Two windows fold the same log, so a write from either has to reach the other.
    // The record travels as it was stored; the kind stays opaque here.
    let _ = app.emit(APPENDED, &event);
    Ok(event)
}

#[tauri::command]
fn read_events(store: State<'_, Store>) -> Result<Vec<Event>, String> {
    store.read().map_err(|error| error.to_string())
}

/// The window system actually in use, which decides whether a global shortcut can work.
/// `global-hotkey` grabs keys through X11 and nothing else, so the answer is reported
/// rather than assumed.
#[tauri::command]
fn window_system() -> String {
    if std::env::var_os("WAYLAND_DISPLAY").is_some()
        || std::env::var("XDG_SESSION_TYPE").is_ok_and(|value| value == "wayland")
    {
        "wayland".to_string()
    } else if std::env::var_os("DISPLAY").is_some() {
        "x11".to_string()
    } else {
        "unknown".to_string()
    }
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

/// Bring the tracking window back, which is what the tray offers while it is hidden.
#[tauri::command]
fn show_main(app: AppHandle) -> Result<(), String> {
    let window = window_of(&app, MAIN)?;
    present(&app, window)
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
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            app.manage(Store::open(app.path().app_data_dir()?)?);
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
