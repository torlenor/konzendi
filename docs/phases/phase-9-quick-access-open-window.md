# Phase 9 — Quick access: open window

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 8](phase-8-window-frame.md) · next: [Phase 10](phase-10-encrypted-sync.md)

**Depends on:** [Phase 3](phase-3-quick-access.md)  
**Effort:** L  
**Complexity:** L  
**Readiness:** Implementation-ready

## Investigation gate

Resolved by the owner on 11 September 2026. The command opens the Konzendi tracking window
when the user presses `K` in quick access: `Ctrl+Alt+K`, then `K`. The existing surface already
owns unmodified letter-key commands, and its tray has an **Open Konzendi** item backed by
`show_main`; no discovery remains before implementation.

## Outcome and scope

Quick access gains an `Open Konzendi` row with the `K` hint. Pressing `Ctrl+Alt+K`, then `K`
hides the quick switcher and brings the tracking window to the front with the keyboard.

The command is navigation only: it creates no event, changes no tracking state, and does not
alter the global shortcut setting. It replaces the quick switcher rather than dismissing it
back to the application that was interrupted, because the user's chosen destination is now
Konzendi.

Out of scope: changing topic-slot numbering, adding other quick-access commands, changing the
tray menu, altering close-to-tray behaviour, or revisiting the X11-only global shortcut.

## Decisions and evidence

| Area | Decision | Rationale |
| --- | --- | --- |
| Key | Lower- or upper-case `K`, with no Ctrl, Alt, or Super modifier | It follows the surface's existing letter-key convention and is the owner's requested sequence. |
| Visible affordance | An `Open Konzendi` row, keyed `K`, in the commands section | A key command must be visible in the window it operates, as the existing pause and undo commands are. |
| Destination | The main tracking window | This is the window the tray already exposes as **Open Konzendi**. |
| Focus and dismissal | Replace quick access with the main window; do not restore the interrupted external window | The action explicitly navigates into Konzendi. Returning focus externally after presenting the main window would make the command appear to fail. |
| Persistence | None | Window navigation is not tracking data or a preference. |

`QuickView.tsx` ignores Ctrl, Alt, and Super before considering a letter, and already handles
`p` and `u`. `desktop.ts` exposes `showMain`, which invokes Rust's `show_main`; the tray's
**Open Konzendi** item uses that same path. The implementation must make this path safe while
quick access is visible: its ordinary `hide_quick` path restores the window interrupted by the
global shortcut, which is the wrong destination after `K`.

## Work packages

- [x] **Add the visible quick-access command** (`src/QuickView.tsx`). Add an `Open Konzendi`
  command row with `K` as its hint and route an unmodified `k` keypress to it. Disable it while
  an event append is in progress, consistently with the other commands. Complete when click and
  either key case take the same path, while modified `Ctrl+Alt+K` remains reserved for the
  global shortcut.

- [x] **Make main-window presentation replace quick access** (`src/desktop.ts`,
  `src-tauri/src/lib.rs`, and `src-tauri/src/x11.rs` if its interrupted-window state needs an
  explicit clear operation). When `show_main` is invoked while `quick` is visible, hide `quick`,
  discard its saved interrupted-window target, then present and focus `main`. Keep the existing
  tray behaviour when `quick` is already hidden. Complete when opening the main window never
  lets quick access's focus-restoration path return the keyboard to the prior external window.

- [x] **Keep the surface's failure behaviour coherent** (`src/QuickView.tsx`, and tests where
  the project can cover the extracted logic). If the main-window request fails, leave quick
  access open and show the existing error treatment or a specific actionable error; do not hide
  it first. Complete when a failed request neither records an event nor strands the user with no
  focused window.

- [x] **Update the user-facing shortcut reference** (`README.md`). State that `K` opens the
  Konzendi tracking window from quick access. Complete when the documented key list matches the
  rendered command list.

- [ ] **Run and record verification.** Complete when every acceptance row below has an actual
  result, including any platform limitation.

## Acceptance and verification

| # | Criterion | How it is checked | Actual result |
| --- | --- | --- | --- |
| 1 | `Ctrl+Alt+K`, then `K` opens and focuses the tracking window | With another X11 application focused and the main window hidden to the tray, use the global shortcut then press `K`; inspect visibility and keyboard focus. | Pending user X11 walkthrough. |
| 2 | The command is discoverable and mouse-equivalent | Open quick access and confirm the `K`/`Open Konzendi` row is visible; click it and observe the same transition. | Pending user X11 walkthrough. |
| 3 | `K` appends no event and changes no tracking state | Record the event-log line count and folded state before and after the command. | Pending user X11 walkthrough. |
| 4 | The interrupted external application does not regain focus after `K` | Start with another application focused, invoke quick access, press `K`, wait longer than the focus-loss delay, then inspect the active X11 window. | Pending user X11 walkthrough. |
| 5 | Escape and the global shortcut still return focus to the interrupted application | Repeat Phase 3's dismissal/toggle walkthrough without using `K`. | Pending user X11 walkthrough. |
| 6 | A failed main-window request leaves quick access available and reports the failure | Exercise the failure seam added for the request; inspect the visible surface and event log. | Pending user failure walkthrough. |
| 7 | Project checks pass | Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`; then run `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test` in `src-tauri/`. | Passed locally. The listed frontend and Rust checks passed. `npm run test:scripts` also passed with its Git fixture run outside the sandbox restriction. |

Record actual results when executed. The X11 walkthrough uses the
[desktop-testing](../../.claude/skills/desktop-testing/SKILL.md) procedure, as Phase 3 does.
Wayland is outside the initial target and does not establish global-shortcut acceptance.

## Rollout and rollback

Local delivery only; no release is part of this phase. Roll out with the normal desktop
walkthrough after the automated checks, exercising both the new route and the existing dismiss
route.

Rollback removes the `K` row and key handler, and restores `show_main`'s prior tray-only
behaviour if it was changed solely for this command. No event kind, stored preference, or log
shape changes, so builds on either side read the same data.
