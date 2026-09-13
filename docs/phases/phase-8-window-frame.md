# Phase 8 — Application window frame

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 7](phase-7-releases-ci-cd.md) · next: [Phase 9](phase-9-quick-access-open-window.md)

**Depends on:** [Phase 3](phase-3-quick-access.md), [Phase 6](phase-6-application-theme.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Implementation-ready

## Investigation findings — 12 September 2026

The gate was run in an isolated 1024×768 X11 session with Metacity and the installed Tauri
2.11.5, tao 0.35.3, and WebKitGTK stack. The prototype used a separate application-data
directory and did not read or write the owner's event log.

### Decided by the owner, 10 September 2026

These decisions are final and are not reopened by the investigation.

| Area | Decision |
| --- | --- |
| What the bar carries | It absorbs today's header. One band holds the application name (or the `‹ Back` control in a sub-view), the Entries and Topics navigation, the appearance override, and the window controls. Today's separate header band goes away rather than being stacked under a new one. |
| Window controls | Minimise, maximise/restore, and close. Close keeps [Phase 3](phase-3-quick-access.md#accepted-decisions)'s behaviour: it hides the window to the tray, and `Quit Konzendi` in the tray menu is still the only way to end the process. |
| Fallback | A stored preference switches between the application's frame and the desktop's own, held like the appearance preference. A window manager that treats undecorated windows badly has a way out. |
| Which windows | Both. The quick switcher, already undecorated since Phase 3, gets the same border and corner treatment so the two windows read as one application. It gains no controls: it is keystroke-driven and dismisses itself. |
| A window menu on right-click | No. The bar carries its controls in the open, and a hidden second way to reach them is a component to build, style and test for no gain the visible controls do not already give. |
| Always on top | No. It was offered as the one genuinely frame-shaped command the bar could add, and declined. The frame carries no command that is not already in the header or a window control. |

| Question | Finding | Consequence |
| --- | --- | --- |
| Resize | A press one physical pixel inside the left edge reached tao's built-in resize path through the WebKit surface. Moving it 31 pixels changed the window from 800 to 831 pixels and moved the left edge by the same amount. | Use tao's 5 logical-pixel edge hit-test. Do not add web resize handles or the `startResizeDragging` permission. The press is enough for the resize; the pointer shape is not part of it, and is covered by the cursor choice below. |
| Bar behaviour | Dragging an empty header area moved the window. Dragging it to the left screen edge produced Metacity's half-screen tile at 512×768. Tauri's injected drag script maps a double press to `internal_toggle_maximize`; the completed-bar walkthrough then verified that path. | Use `data-tauri-drag-region="deep"`. Moving, maximising, and snapping stay with Tauri and the window manager. |
| Lost services | `Alt+Space` still opened Metacity's window menu. `Alt`+drag moved the window, and `Alt+F8` plus arrow keys resized it from 831 to 871 pixels. A title-bar right-click target and the desktop-drawn frame and shadow are absent. The private X server has no compositor, so it cannot supply a useful shadow. | The frame replaces the visible controls and draws the decided 1px edge. It does not replace working keyboard or window-manager gestures. |
| Fallback | Calling `setDecorations(true)` added Metacity's 37px title bar; calling `setDecorations(false)` removed it again without changing the 800×600 client size. A visible-at-startup window cannot apply a `localStorage` choice before the webview exists. | Create the main window hidden, apply the stored choice before React renders, then show it. This prevents either startup path from displaying the other frame first. |
| Tray round trip | Closing a maximised prototype hid the main window and left the process and global shortcut alive. The quick window opened, and the existing `show_main` path restored the main window with both maximised state atoms still set. | The custom close control calls the existing window close path. No new lifecycle path is needed. |

### Implementation choices

- The frame preference is a second labelled select beside the appearance select. This keeps the
  only two presentation preferences together and leaves tracking data unchanged.
- The controls are on the right in Metacity's order: minimise, maximise or restore, then close.
  They use the familiar minus, square or overlapping-squares, and multiplication glyphs. Their
  accessible names state the full action; the close name says that it closes to the tray.
- The page names the resize cursor. tao sets the cursor from its own motion handler, but the
  webview paints the pointer over the same area: on the owner's X11 desktop no edge showed a
  resize shape, although a blind press on the edge still resized the window. Eight transparent
  zones, one for each edge and corner, cover tao's 5 logical-pixel band and carry only a `cursor`
  value. They start no resize, so the press continues to reach the built-in path, and they are
  not drawn while the window is maximised, because a maximised window does not resize from its
  edges. The inset is the `--resize-inset` token, which records the value tao uses.
- The zones refuse the default action of the press. The webview reads a slow drag out of the
  edge as a text selection and highlights everything the pointer crosses. A `user-select: none`
  rule does not stop it — it was measured and the webview selects anyway — so the zones cancel
  the press event instead. This is in the webview only and does not reach tao's resize, which
  starts before the page sees the press. A selection inside the content is unaffected.

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
  question 1 shows the built-in edge resize cannot be reached. `allow-show` is also needed
  because the main window now stays hidden until its stored frame is applied.
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

- [x] **Investigate the gate.** Answer the five questions against a running, undecorated build
  under a window manager, and record the two implementation choices. Complete when each question
  has an answer backed by a measurement or by the dependency's source, and this section is
  rewritten as findings.

- [x] **Store the frame preference** (`src/frame.ts`, or an extension of `src/theme.ts`).
  `custom` or `native`, in `localStorage`, applied before the first paint, with storage failures
  caught and falling back to `custom`. It appends no event and `src-tauri/` never sees it.
  Complete when the choice survives a restart and a webview with storage denied still runs.

- [x] **Build the title bar** (`src/TitleBar.tsx`, `src/App.tsx`, `src/App.css`). The absorbed
  header as one band with `data-tauri-drag-region="deep"`, carrying the name or `‹ Back`, the
  navigation, the appearance override, the frame preference, and the window controls. Complete
  when every control today's header offers is present and reachable, and the empty parts of the
  band drag the window.

- [x] **Wire the window commands** (`src/desktop.ts`, `src-tauri/capabilities/default.json`).
  Minimise, toggle maximise with the button reflecting the current state, and close-to-tray.
  Grant exactly the permissions used and no more. Complete when each control does what it says
  from both the mouse and the keyboard, and the maximise control shows restore while maximised.

- [x] **Draw the frame** (`src/App.css`, `src-tauri/tauri.conf.json`, `src/desktop.ts`). The
  window border and band separation, the same border on the quick switcher, and `fitQuick`
  adjusted for it. Complete when both windows carry the same edge and the quick switcher still
  sizes to its rows without clipping.

- [x] **Resolve the resize affordance.** The gate found that tao's built-in edge resize is
  reachable, so explicit handles and `startResizeDragging` are not needed. The pointer shape is
  not reachable in the same way, so `src/ResizeEdges.tsx` and the `.resize-edge` rules in
  `src/App.css` name the cursor over tao's band, and the zones refuse the press's default action
  so that a slow drag does not select the text it crosses. Complete when every edge and corner
  resizes, shows the matching pointer, and selects nothing.

- [x] **Accessibility pass.** Accessible names on the controls, keyboard reachability, and
  contrast measured against [Phase 6](phase-6-application-theme.md#accepted-direction-readout)'s
  floor of WCAG 2.2 AA. Complete when the measured values are recorded below.

- [x] **Run the checks and record the results.** Complete when every row in the table below has
  an actual result.

## Acceptance and verification

Checks are run on Linux/X11 with the [desktop-testing](../../.claude/skills/desktop-testing/SKILL.md)
procedure, on a private X server with a window manager running — `metacity`, as
[Phase 3](phase-3-quick-access.md#verification-evidence--10-september-2026) used. A window
manager is required: without one there is no move, no snap and no maximise to test.

| # | Criterion | How it is checked | Actual result — 12 September 2026 |
| --- | --- | --- | --- |
| 1 | The window opens with no desktop title bar and the application's own bar in its place | Screenshot the window and compare its outer geometry with its inner geometry | Passed. The 800×600 client had no desktop title bar, `_MOTIF_WM_HINTS` reported decorations off, and the 1px `edge` border enclosed the whole surface. |
| 2 | Dragging an empty part of the bar moves the window | Drag with `xdotool`, read the position before and after | Passed. A timed drag on the application name moved the client from 111,55 to 161,125. |
| 3 | Every control the header offered still works from the bar | Exercise Analytics, Entries, Topics, `‹ Back`, and each appearance option | Passed. Analytics, Entries, Topics, and Back opened the correct view. System, Light, and Dark each changed the rendered theme. |
| 4 | Pressing a control in the bar does not drag the window | Press each control and read the position afterwards | Passed. Navigation and preference controls kept the client at 161,125; each window command changed only the state it names. |
| 5 | Minimise, maximise and restore behave as the desktop's own controls do | Use each and read the window state from the X server | Passed. Minimise produced `Iconic` and `_NET_WM_STATE_HIDDEN`; maximise produced both maximise atoms and 1024×768; restore returned to the prior geometry. The glyph and accessible name changed to restore while maximised. |
| 6 | Double-clicking the bar toggles maximise | Double-click, read the state | Passed. A timed two-click XTEST sequence on the application name changed the restored 768×576 window to 1024×768 with both maximise atoms. |
| 7 | Close hides the window to the tray and leaves the process running | Close, then confirm the process is alive, the tray item is still on the bus, and the shortcut still opens the surface | Passed in the standalone build. The main window disappeared, process 519278 stayed alive, the status-notifier item stayed registered, and the shortcut still opened quick access. Invoking the exported `Open Konzendi` tray item restored the maximised main window. |
| 8 | The window can be resized from every edge and corner | Drag each edge and corner, compare outer sizes | Passed in development and the standalone build. From 600×450, the four edges produced 616×450, 617×450, 600×466, and 600×466; the four corners produced 616×466, 617×466, 616×466, and 617×466. No explicit web handles or extra permission were needed. Re-measured after the cursor zones were added: the eight targets still resized, and a bar drag still moved the window without changing its size. |
| 9 | The window manager's snapping still works | Drag to a screen edge and read the resulting geometry | Passed. Dragging the restored bar to the left edge produced Metacity's 512×768 half-screen tile and `_NET_WM_STATE_MAXIMIZED_VERT`. |
| 10 | The bar is fully usable from the keyboard, with a visible focus ring on every control | Tab through the bar; check the ring against the Phase 6 rule | Passed. Tab reached Back, navigation, both selects, minimise, maximise or restore, and close in DOM order. Each showed the 3px `focus` outline. |
| 11 | Contrast meets WCAG 2.2 AA in both light and dark | Measure each element's computed colour against its painted background, as Phase 6 did | Passed. Against `ground`, `ink-soft` text is 5.26:1 light and 7.45:1 dark; `ink` and the focus ring are 12.31:1 and 14.40:1; the `edge` control outline is 3.22:1 and 4.01:1. The lower-contrast `rule` is only a band separator and does not identify a control or carry content. |
| 12 | The native fallback restores the desktop's decorations, and the choice survives a restart | Switch the preference, screenshot, restart, screenshot again | Passed. The runtime switch added and removed Metacity's 37px title bar without changing the client size. `Desktop frame` and `App frame` each survived a separate restart. A denied or invalid storage read falls back to `custom`; two Vitest cases cover it. |
| 13 | Neither startup path shows a visible flash of the wrong frame | Capture frames from launch and inspect the first paints | Passed. The main window stayed hidden until the preference and React tree were applied. The first mapped frame after each restart already had the stored decoration state and matching select value. |
| 14 | The quick switcher carries the same border and still sizes to its rows | Screenshot the surface with three topics and with nine; check nothing is clipped | Passed in the standalone build. It measured 360×200 with three topics and 360×401 with nine. Both images include the full 1px edge and the last Undo row. |
| 15 | Phase 3's quick access is unaffected | Repeat checks 1 to 7 of [Phase 3](phase-3-quick-access.md#acceptance-and-verification) | Passed against isolated data. With the main window closed and `xclock` focused, the shortcut opened quick access; a number appended one `focus.started`, dismissed the surface, and returned focus. Stop and Undo appended `focus.paused` and `entry.revoked`. Escape, shortcut toggle, and click-away dismissed without an append. |
| 16 | No event kind is added and the log is untouched | Compare `src/core/` and the stored log across the session | Passed. `src/core/` has no diff. Desktop tests used `XDG_DATA_HOME=/tmp/konzendi-phase8-test-data`; the owner's application-data directory was not opened. |
| 17 | The project checks pass | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run format`, then `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test` in `src-tauri/` | Passed. TypeScript and Biome reported no diagnostics; all 55 Vitest tests and 5 Rust tests passed; both builds passed; Rust formatting and Clippy passed with warnings denied. No `src/core/` file imports React or Tauri. |
| 18 | The standalone build behaves as the development build does | `npm run tauri build -- --debug --no-bundle`, then repeat checks 1, 2, 5, 7 and 8 | Passed. The final debug build completed. It repeated the custom frame, bar move and snap, all window-control states, close and tray reopen, and all eight resize targets with the network namespace disabled. |
| 19 | Every edge and corner shows the matching resize pointer | Move the pointer into each edge and corner and read the cursor from the X server | Passed. The eight zones each produced a distinct cursor, and each hotspot matched its direction. A test inset of 20px put the same cursors 14px inside the edge, where tao sets none, which shows that the page supplies the shape. A maximised window showed the normal pointer at every edge, and a restore brought the resize pointers back. |
| 20 | A resize drag selects no text | Drag slowly out of each edge, then compare the content against the same crop taken before the drag | Passed. Before the fix a slow drag out of the left edge selected the whole document, which is 37,123 changed pixels in the compared crop. With the press refused, four slow edge drags changed 23 pixels, which is the running readout. A drag across the text in the content still selects it. |

Record the actual result of each row when it is executed, including failures. Note explicitly
what was not verified — other window managers, other desktops, Wayland, and scaled displays are
expected to be on that list.

Other window managers, desktop environments, Wayland, and scaled displays were not verified.

## Rollout and rollback

Local delivery; nothing is published. Rollback is restoring `decorations` for the tracking
window and putting the header back as its own band, which returns the desktop's title bar and
changes nothing else.

No data compatibility concern: the frame is presentation and window management only. It appends
no event and adds no record shape, so a log written by a build with the frame is read unchanged
by one without it. The stored frame preference is a preference like the appearance; removing it
falls back to the default frame rather than failing.
