# Phase 8 — Application window frame

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 7](phase-7-releases-ci-cd.md) · next: [Phase 9](phase-9-quick-access-open-window.md)

**Depends on:** [Phase 3](phase-3-quick-access.md), [Phase 6](phase-6-application-theme.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

## Investigation gate

The owner decided the shape of the frame on 10 September 2026. What remains is platform
evidence: an undecorated window on X11 gives up services the window manager was providing, and
which of them survive has not been measured. Do not write production code against this plan
until the questions below have answers.

### Decided by the owner, 10 September 2026

These answers resolve [Q17](../OPEN_QUESTIONS.md) and are not reopened by the investigation.

| Area | Decision |
| --- | --- |
| What the bar carries | It absorbs today's header. One band holds the application name (or the `‹ Back` control in a sub-view), the Entries and Topics navigation, the appearance override, and the window controls. Today's separate header band goes away rather than being stacked under a new one. |
| Window controls | Minimise, maximise/restore, and close. Close keeps [Phase 3](phase-3-quick-access.md#accepted-decisions)'s behaviour: it hides the window to the tray, and `Quit Konzendi` in the tray menu is still the only way to end the process. |
| Fallback | A stored preference switches between the application's frame and the desktop's own, held like the appearance preference. A window manager that treats undecorated windows badly has a way out. |
| Which windows | Both. The quick switcher, already undecorated since Phase 3, gets the same border and corner treatment so the two windows read as one application. It gains no controls: it is keystroke-driven and dismisses itself. |
| A window menu on right-click | No. The bar carries its controls in the open, and a hidden second way to reach them is a component to build, style and test for no gain the visible controls do not already give. |
| Always on top | No. It was offered as the one genuinely frame-shaped command the bar could add, and declined. The frame carries no command that is not already in the header or a window control. |

### Questions that must be answered

1. **Can the window still be resized?** `tao` 0.35.3 hit-tests a 5 logical-pixel border on
   button-press and calls `begin_resize_drag`, but only when the window is undecorated,
   resizable, and not maximised. Whether that handler sees the press at all with a WebKit
   webview filling the window, and whether a 5px target is usable in practice, is unmeasured.
   If it is unreachable, the frame draws its own handles and calls `startResizeDragging`.
2. **Does dragging the bar behave like a native title bar?** Move, double-click to maximise, and
   the window manager's own edge snapping and tiling. `start_dragging` reaches
   `gtk_window_begin_move_drag`, so snapping should remain the window manager's, but this is
   read from the source rather than seen.
3. **What else is lost with the frame?** The drop shadow, the window menu on right-click or
   `Alt+Space`, `Alt`+drag to move, and keyboard resize. Establish which still work when
   undecorated, and which the bar has to replace.
4. **Does the fallback switch cleanly?** `setDecorations` in both directions at runtime, and
   whether either startup path shows a visible flash of the wrong frame before the stored
   preference is applied.
5. **Does the tray path stay identical?** Close to tray, reopen, and what happens to a maximised
   window across that round trip.

### Decisions to record before implementation

The owner declined the two additions above, so the bar's contents are settled. What remains is
the implementer's, decided against the gate's findings and recorded here before any code:

- Where the frame preference is exposed. The appearance select is the only preference surface
  that exists; a second select beside it is the obvious placement and a crowded one.
- The control glyphs and their order. Follow the target desktop's convention rather than
  inventing one.

## Outcome and scope

The application draws its own title bar and window edge instead of the desktop's, and that bar
carries the controls the header carries today plus the window commands. The window becomes one
continuous surface under [Phase 6](phase-6-application-theme.md)'s token set rather than a
themed panel inside somebody else's frame, and a stored preference restores the desktop's
decorations where the custom frame does not work.

Out of scope: changes to the tracking interaction fixed in
[Phase 1](phase-1-tracking-design.md), new views, analytics, any frame command beyond the three
window controls — a right-click window menu and an always-on-top toggle were both offered and
declined — anything the quick switcher does beyond its border treatment, window transparency and rounded corners (see below), fullscreen,
per-desktop control layouts beyond the target desktop's, and packaging.

## Decisions and evidence

Recorded here are the choices that follow from the accepted direction and from what is already
verified in the tree. Everything the investigation still has to establish is in the gate above.

### The frame is square and opaque

Rounded window corners on X11 need a transparent window and therefore a running compositor;
without one the corners paint black. They would also contradict
[Phase 6](phase-6-application-theme.md#accepted-direction-readout)'s own rule that radius means
"pressable" and nothing else is rounded. The frame is square, opaque, and needs no `transparent`
window flag.

Losing the frame also loses the window manager's drop shadow, so a 1px `edge` border is what
separates the window from whatever is behind it. It is structural, not decoration.

### The bar is a band

[Phase 6](phase-6-application-theme.md) drew the window as horizontal bands separated by rules.
The title bar is the first of them, not a new kind of surface, and it reuses `ground`, `ink`,
`ink-soft`, `edge`, `rule`, and `focus`. No new colour role is expected; if one turns out to be
needed it is added to the token region in `src/App.css` with the rest.

### Verified in the tree

Read from the installed dependencies on 10 September 2026, not assumed.

- **The APIs exist.** `@tauri-apps/api` 2.11.1 provides `startDragging`,
  `startResizeDragging`, `toggleMaximize`, `isMaximized`, `setDecorations`, and `onResized`.
- **Dragging is an attribute.** `tauri` 2.11.5 injects a script that handles
  `data-tauri-drag-region`. A single press calls `start_dragging`; a double press calls
  `internal_toggle_maximize`.
- **Controls inside the bar keep working.** That script treats `A`, `BUTTON`, `INPUT`,
  `SELECT`, `TEXTAREA`, `LABEL` and `SUMMARY` as clickable and refuses to drag from them. The
  navigation buttons, the appearance select and the window controls therefore stay clickable
  inside a `data-tauri-drag-region="deep"` bar with no special handling.
- **The capability has to grow.** `core:window:default` grants the read-only queries and
  `allow-internal-toggle-maximize`, so double-click maximise already works, but
  `allow-start-dragging`, `allow-minimize`, `allow-toggle-maximize`, `allow-set-decorations`,
  and `allow-close` are not granted and must be added to
  `src-tauri/capabilities/default.json`. `allow-start-resize-dragging` is added only if
  question 1 shows the built-in edge resize cannot be reached.
- **Resize is conditional.** `tao`'s edge hit-test runs only while the window is undecorated,
  resizable and not maximised — consistent with what a native frame offers, and the reason the
  quick switcher, which is `resizable: false`, is unaffected by it.

### Close means hide

The custom close button calls the window's own close, so the request reaches the
`CloseRequested` handler already in `src-tauri/src/lib.rs` and hides the window exactly as the
desktop's close button does today. One behaviour, one code path; the button's accessible name
says that it closes to the tray rather than quitting.

### The quick switcher's height

`fitQuick` in `src/desktop.ts` sizes the surface to its own content. A border adds to the
measured height, so the sizing has to account for it or the surface clips its last row. This is
the only place where the shared frame touches Phase 3's behaviour.

### Rejected alternatives

- **Stacking a thin title bar above the existing header.** Two bands carrying the application
  name, and one of them nearly empty. The owner chose the absorbed header instead.
- **Putting the running topic and elapsed reading in the bar.** A status-forward bar was offered
  and not chosen. The readout already dominates the fold, and duplicating it in the frame
  competes with the thing [Phase 6](phase-6-application-theme.md) built the window around.
- **Drawing the frame in Rust.** The bar is the header, and the header is React. Only what the
  webview cannot do — if anything turns out to be in that category — belongs in Rust, as with
  Phase 3's X11 activation.
- **Transparency and rounded corners.** See above.

## Work packages

- [ ] **Investigate the gate.** Answer the five questions against a running, undecorated build
  under a window manager, and get the owner's decision on the four items listed. Complete when
  each question has an answer backed by a measurement or by the dependency's source, and this
  section is rewritten as findings.

- [ ] **Store the frame preference** (`src/frame.ts`, or an extension of `src/theme.ts`).
  `custom` or `native`, in `localStorage`, applied before the first paint, with storage failures
  caught and falling back to `custom`. It appends no event and `src-tauri/` never sees it.
  Complete when the choice survives a restart and a webview with storage denied still runs.

- [ ] **Build the title bar** (`src/TitleBar.tsx`, `src/App.tsx`, `src/App.css`). The absorbed
  header as one band with `data-tauri-drag-region="deep"`, carrying the name or `‹ Back`, the
  navigation, the appearance override, the frame preference, and the window controls. Complete
  when every control today's header offers is present and reachable, and the empty parts of the
  band drag the window.

- [ ] **Wire the window commands** (`src/desktop.ts`, `src-tauri/capabilities/default.json`).
  Minimise, toggle maximise with the button reflecting the current state, and close-to-tray.
  Grant exactly the permissions used and no more. Complete when each control does what it says
  from both the mouse and the keyboard, and the maximise control shows restore while maximised.

- [ ] **Draw the frame** (`src/App.css`, `src-tauri/tauri.conf.json`, `src/desktop.ts`). The
  window border and band separation, the same border on the quick switcher, and `fitQuick`
  adjusted for it. Complete when both windows carry the same edge and the quick switcher still
  sizes to its rows without clipping.

- [ ] **Resize affordance**, only if the gate finds the built-in edge resize unreachable. Explicit
  handles calling `startResizeDragging`. Complete when every edge and corner resizes.

- [ ] **Accessibility pass.** Accessible names on the controls, keyboard reachability, and
  contrast measured against [Phase 6](phase-6-application-theme.md#accepted-direction-readout)'s
  floor of WCAG 2.2 AA. Complete when the measured values are recorded below.

- [ ] **Run the checks and record the results.** Complete when every row in the table below has
  an actual result.

## Acceptance and verification

Checks are run on Linux/X11 with the [desktop-testing](../../.claude/skills/desktop-testing/SKILL.md)
procedure, on a private X server with a window manager running — `metacity`, as
[Phase 3](phase-3-quick-access.md#verification-evidence--10-september-2026) used. A window
manager is required: without one there is no move, no snap and no maximise to test.

| # | Criterion | How it is checked |
| --- | --- | --- |
| 1 | The window opens with no desktop title bar and the application's own bar in its place | Screenshot the window and compare its outer geometry with its inner geometry |
| 2 | Dragging an empty part of the bar moves the window | Drag with `xdotool`, read the position before and after |
| 3 | Every control the header offered still works from the bar | Exercise Entries, Topics, `‹ Back`, and each appearance option |
| 4 | Pressing a control in the bar does not drag the window | Press each control and read the position afterwards |
| 5 | Minimise, maximise and restore behave as the desktop's own controls do | Use each and read the window state from the X server |
| 6 | Double-clicking the bar toggles maximise | Double-click, read the state |
| 7 | Close hides the window to the tray and leaves the process running | Close, then confirm the process is alive, the tray item is still on the bus, and the shortcut still opens the surface |
| 8 | The window can be resized from every edge and corner | Drag each edge and corner, compare outer sizes |
| 9 | The window manager's snapping still works | Drag to a screen edge and read the resulting geometry |
| 10 | The bar is fully usable from the keyboard, with a visible focus ring on every control | Tab through the bar; check the ring against the Phase 6 rule |
| 11 | Contrast meets WCAG 2.2 AA in both light and dark | Measure each element's computed colour against its painted background, as Phase 6 did |
| 12 | The native fallback restores the desktop's decorations, and the choice survives a restart | Switch the preference, screenshot, restart, screenshot again |
| 13 | Neither startup path shows a visible flash of the wrong frame | Capture frames from launch and inspect the first paints |
| 14 | The quick switcher carries the same border and still sizes to its rows | Screenshot the surface with three topics and with nine; check nothing is clipped |
| 15 | Phase 3's quick access is unaffected | Repeat checks 1 to 7 of [Phase 3](phase-3-quick-access.md#acceptance-and-verification) |
| 16 | No event kind is added and the log is untouched | Compare `src/core/` and the stored log across the session |
| 17 | The project checks pass | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run format`, then `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test` in `src-tauri/` |
| 18 | The standalone build behaves as the development build does | `npm run tauri build -- --debug --no-bundle`, then repeat checks 1, 2, 5, 7 and 8 |

Record the actual result of each row when it is executed, including failures. Note explicitly
what was not verified — other window managers, other desktops, Wayland, and scaled displays are
expected to be on that list.

## Rollout and rollback

Local delivery; nothing is published. Rollback is restoring `decorations` for the tracking
window and putting the header back as its own band, which returns the desktop's title bar and
changes nothing else.

No data compatibility concern: the frame is presentation and window management only. It appends
no event and adds no record shape, so a log written by a build with the frame is read unchanged
by one without it. The stored frame preference is a preference like the appearance; removing it
falls back to the default frame rather than failing.
