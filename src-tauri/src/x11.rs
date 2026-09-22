//! The one X11 request GTK cannot make on the application's behalf.
//!
//! When the quick switcher opens, the window the user was working in loses the keyboard.
//! Hiding the surface again does not give it back: the window manager is left with
//! nothing focused, and the user has to click their way back into their work. GTK can
//! only focus windows this application owns, so the window that was interrupted — which
//! belongs to somebody else — is asked for through X directly.
//!
//! `_NET_ACTIVE_WINDOW` with `CurrentTime` is the request window managers grant; see the
//! note on `show_quick`.

use std::sync::Mutex;
use x11rb::connection::Connection;
use x11rb::protocol::xproto::{AtomEnum, ClientMessageEvent, ConnectionExt, EventMask, Window};
use x11rb::rust_connection::RustConnection;

pub struct Desktop {
    connection: RustConnection,
    root: Window,
    active_window: u32,
    wm_pid: u32,
    /// The window that had the keyboard when the surface last opened.
    interrupted: Mutex<Option<Window>>,
}

impl Desktop {
    /// Connect to the display, or report that there is none to talk to.
    pub fn open() -> Result<Self, String> {
        let (connection, screen) =
            RustConnection::connect(None).map_err(|error| error.to_string())?;
        let root = connection.setup().roots[screen].root;
        let active_window = connection
            .intern_atom(false, b"_NET_ACTIVE_WINDOW")
            .map_err(|error| error.to_string())?
            .reply()
            .map_err(|error| error.to_string())?
            .atom;
        let wm_pid = connection
            .intern_atom(false, b"_NET_WM_PID")
            .map_err(|error| error.to_string())?
            .reply()
            .map_err(|error| error.to_string())?
            .atom;
        Ok(Self {
            connection,
            root,
            active_window,
            wm_pid,
            interrupted: Mutex::new(None),
        })
    }

    fn focused(&self) -> Option<Window> {
        let reply = self
            .connection
            .get_property(false, self.root, self.active_window, AtomEnum::WINDOW, 0, 1)
            .ok()?
            .reply()
            .ok()?;
        let window = reply.value32()?.next()?;
        (window != 0).then_some(window)
    }

    /// Remember the window the surface is about to interrupt, unless one is already
    /// remembered: the surface asks to be shown more than once while it is opening, and
    /// by the second ask the window with the keyboard is the surface itself.
    pub fn remember_interrupted(&self) {
        let Ok(mut interrupted) = self.interrupted.lock() else {
            return;
        };
        if interrupted.is_none() {
            *interrupted = self.focused();
        }
    }

    /// Remove the interrupted window without activating anything.
    pub fn take_interrupted(&self) -> Option<Window> {
        let Ok(mut interrupted) = self.interrupted.lock() else {
            return None;
        };
        interrupted.take()
    }

    /// Restore a saved interrupted-window target after a failed replacement.
    pub fn restore_interrupted_target(&self, window: Option<Window>) {
        if let Ok(mut interrupted) = self.interrupted.lock() {
            *interrupted = window;
        }
    }

    /// Hand the keyboard back to the remembered window, if it is still there.
    ///
    /// When the surface closed because the user clicked another application's window,
    /// that window has the keyboard now, and the remembered one must not take it back:
    /// activating it would also raise it over the window the user chose.
    pub fn restore_interrupted(&self) {
        let Some(window) = self.take_interrupted() else {
            return;
        };
        if let Some(active) = self.focused() {
            if active != window && !self.is_own(active) {
                return;
            }
        }
        self.activate(window);
    }

    /// Whether a window belongs to this process. GTK sets `_NET_WM_PID` on every window.
    fn is_own(&self, window: Window) -> bool {
        let pid = self
            .connection
            .get_property(false, window, self.wm_pid, AtomEnum::CARDINAL, 0, 1)
            .ok()
            .and_then(|cookie| cookie.reply().ok())
            .and_then(|reply| reply.value32().and_then(|mut values| values.next()));
        pid == Some(std::process::id())
    }

    /// The pointer position on the root window, in physical pixels.
    pub fn pointer(&self) -> Option<(i32, i32)> {
        let reply = self
            .connection
            .query_pointer(self.root)
            .ok()?
            .reply()
            .ok()?;
        Some((i32::from(reply.root_x), i32::from(reply.root_y)))
    }

    fn activate(&self, window: Window) {
        // data[0] = 1 says an application is asking; data[1] = 0 is `CurrentTime`.
        let message = ClientMessageEvent::new(32, window, self.active_window, [1, 0, 0, 0, 0]);
        let sent = self.connection.send_event(
            false,
            self.root,
            EventMask::SUBSTRUCTURE_REDIRECT | EventMask::SUBSTRUCTURE_NOTIFY,
            message,
        );
        if sent.is_ok() {
            let _ = self.connection.flush();
        }
    }
}
