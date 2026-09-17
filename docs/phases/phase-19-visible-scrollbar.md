# Phase 19 — A scrollbar that is always visible

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 18](phase-18-window-content-fit.md) · next: [Phase 20](phase-20-add-topics-in-topics.md)

**Depends on:** [Phase 6](phase-6-application-theme.md), [Phase 18](phase-18-window-content-fit.md)  
**Effort:** L  
**Complexity:** L  
**Readiness:** Implementation-ready

## Investigation gate

The owner accepted the target behaviour on 13 September 2026 (see
[Decisions and evidence](#decisions-and-evidence)). Questions 1 and 2 were answered on
16 September 2026. The answers are in [Findings, 16 September 2026](#findings-16-september-2026),
and the gate is closed.

### Questions that must be answered

1. **Does WebKitGTK use a styled scrollbar?** The expected mechanism is the
   `::-webkit-scrollbar` pseudo-elements on `.app-scroll`. When a page styles them, WebKit is
   expected to draw a scrollbar that does not overlay the content and does not disappear. Also
   find out if the WebKitGTK version in use supports the standard `scrollbar-width`,
   `scrollbar-color`, and `scrollbar-gutter` properties. Measure both in the running window.
   Record the WebKitGTK version, the rules that have an effect, and a screenshot of the content
   area at rest.
2. **Does the scrollbar conflict with the east resize zone?** With the application frame, the
   east resize zone covers the right 5px of the window, above the content (`--resize-inset` in
   `src/App.css`). A scrollbar at the right edge of `.app-scroll` is partly below that zone.
   Measure a press and a drag on each part of the thumb and the track. Record which positions
   scroll the content and which positions start a resize. Select a scrollbar width or an inset
   so that the thumb can be used and each edge still resizes the window.

### Evidence to gather

Use the [desktop-testing](../../.claude/skills/desktop-testing/SKILL.md) procedure on a private
X server with `metacity`, as [Phase 18](phase-18-window-content-fit.md#findings-13-september-2026)
did. Use a separate `XDG_DATA_HOME` with enough topics to make the tracking view taller than the
window. Do not open the owner's application-data directory. A bounded experiment with the
candidate rules in `src/App.css` is permitted. Remove it if the gate does not close.

### Decision to record

Record the answers to questions 1 and 2, the selected rules, and the selected width in
[Decisions and evidence](#decisions-and-evidence). Then complete the acceptance table and change
readiness to `Implementation-ready`. If WebKitGTK does not draw a styled scrollbar that stays
visible, record that result. The owner must then decide on a different mechanism before
implementation.

## Outcome and scope

When a view is taller than the content area, the tracking window shows a scrollbar at all
times, not only during a scroll. The user can see that the view continues below the window and
how far it continues. The user can click the track and drag the thumb. The scrollbar uses the
theme tokens in light and dark appearance.

The scope includes:

- the scrollbar of `.app-scroll`, the content area below the title bar, for all four views;
- its colours, width, and gutter in `src/App.css`;
- the removal of the known limitation for the scrollbar from `CHANGELOG.md`.

Out of scope:

- the quick switcher, which has no scroll area;
- a fade, a shadow, or another cue at the bottom of the content area;
- scrollbars inside a view, and any change to the title bar or the window frame;
- display scaling, Wayland, and window managers other than Metacity.

## Decisions and evidence

### Decided by the owner, 13 September 2026

| Area | Decision | Rationale |
| --- | --- | --- |
| Cue | A scrollbar that is always visible, on the content area only. | A desktop user knows a scrollbar. It shows that the view continues and how far, and it can be clicked and dragged. It answers the [Phase 18 follow-up](phase-18-window-content-fit.md#follow-up-outside-this-phase). |
| Appearance | Styled with the theme tokens. | The scrollbar must look the same on all desktops and in both appearances. It must not add a colour that carries a meaning, because in this theme colour shows state only. |
| Fade or shadow | Rejected. | A fade can cover the last row, does not show how far the view continues, cannot be dragged, and needs a scroll listener or a background technique. |
| Delivery | A separate phase, implemented later. | Phase 18 is complete. This is new visual design with an unmeasured platform question. |

### Verified facts

These facts come from the tree and the Phase 18 measurements on 13 September 2026:

- `.app-scroll` is the only element that scrolls in the tracking window. It has
  `overflow-y: auto`, so a scrollbar is necessary only when the content is taller than the area.
- WebKitGTK showed an overlay scrollbar during a scroll, and no scrollbar at rest.
- The eight resize zones are `position: fixed` with `z-index: 10`. They are 5px wide, and they
  are shown only with the application frame when the window is not maximised.
- [Phase 8](phase-8-window-frame.md#acceptance-and-verification) measured the `edge` token
  against `ground` at 3.22:1 in light and 4.01:1 in dark appearance.

### Findings, 16 September 2026

**Method.** The development build ran on a private `Xvfb :99` screen of 1024×768 with
`metacity`. `XDG_DATA_HOME` pointed to a temporary directory with a seeded log: 12 topics, nine
quick keys, 12 switches, and a stop. The owner's application-data directory was not opened. A
temporary probe, which is not in the tree, read the geometry of `.app-scroll` and
`.app-content` and sent it to a file through the Vite development server. Input used `xdotool`
through XTEST, sizes used `xdotool windowsize`, and maximize used `wmctrl`. The screenshots are
outside the repository.

**Question 1 — styled scrollbar.** WebKitGTK is 2.52.6 (`libwebkit2gtk-4.1-0`
2.52.6-0ubuntu0.24.04.1).

- Without rules, `offsetWidth` and `clientWidth` of `.app-scroll` are both 798px at 800×600.
  The scrollbar is an overlay, and no scrollbar shows at rest.
- `CSS.supports` returns true for `scrollbar-width`, `scrollbar-color`, and `scrollbar-gutter`,
  and the computed values change. But `scrollbar-color: var(--edge) var(--ground)` with
  `scrollbar-gutter: stable` has no effect: the right 60px of the window were identical to the
  screenshot without rules (0 different pixels), and `clientWidth` stayed 798px.
- The `::-webkit-scrollbar` pseudo-elements have an effect. WebKitGTK then draws a scrollbar
  that takes space (`clientWidth` 786px with a 12px width) and that stays visible at rest. The
  rules take effect only when the page loads. A change through hot module replacement did not
  change the scrollbar until the page was loaded again. A change of the theme tokens, from dark
  to light, changed the scrollbar colors immediately.
- `scrollbar-gutter: stable` does not keep the gutter of a styled scrollbar. Maximized, the
  tracking view scrolls and Analytics fits. With `overflow-y: auto` and
  `scrollbar-gutter: stable`, `clientWidth` changed from 1006px to 1022px, and the left edge
  of the content moved from 124px to 132px. With `overflow-y: scroll`, `clientWidth` stayed
  1006px and the content stayed at 124px. In the view that fits, WebKit draws no thumb, and
  the 18px at the right edge have only the `ground` color.

**Question 2 — the east resize zone.** At 800×600 with the application frame, `.app-scroll`
ends at 799px, inside the 1px window edge. The east zone covers 795px to 799px.
`document.elementFromPoint` returns the zone at 1, 3, and 5px from the right edge, and
`.app-scroll` at 6px and more.

- With a 12px scrollbar and a thumb without a border, the thumb is 787px to 798px. A 100px
  drag down at 788, 792, and 794px scrolled the content to 169px. A drag at 795, 796, 798, and
  799px did not scroll. A track click below the thumb at 790 and 794px scrolled to 376px, and
  at 796px it did nothing. A horizontal drag at 796 and 799px resized the window from 800 to
  840px, and at 790px it did not. Thus the right 4px of the visible thumb start a resize.
- With the selected rules, the scrollbar is 16px (783px to 798px). The thumb has a transparent
  border of 2px on the left and 4px on the right. The visible thumb is 785px to 794px (10px)
  in the `edge` color, and 795px to 798px has the `ground` color. The full visible thumb is
  outside the zone.

**Selected rules.** In `src/App.css`:

- `.app-scroll` has `overflow-y: scroll`, so the gutter stays when a view fits;
- `::-webkit-scrollbar` has a width of 16px;
- `::-webkit-scrollbar-track` uses `ground`;
- `::-webkit-scrollbar-thumb` uses `edge`, `background-clip: padding-box`, a transparent
  border of `0 4px 0 2px`, and a 7px radius;
- the thumb under the pointer and during a drag uses `ink-soft`.

The width of 16px is different from the proposal of about 12px, because the east zone covers
4px of the scrollbar. `scrollbar-gutter: stable` is not used, because it had no effect.

## Work packages

Complete these packages after the gate. They can change with its findings.

- [x] Record the answers to questions 1 and 2 and the selected rules, and make this document
  `Implementation-ready`.
- [x] Style the scrollbar of `.app-scroll` in `src/App.css` with theme tokens only. Complete
  when the scrollbar is visible at rest in every view that is taller than its area, and no
  scrollbar shows in a view that fits.
- [x] Keep the content in place when the scrollbar comes and goes. Complete when a change
  between a view that scrolls and a view that fits does not move the content sideways.
- [x] Make the thumb usable next to the east resize zone. Complete when a drag on the thumb
  scrolls the content, and a drag on the east edge still resizes the window.
- [x] Remove the scrollbar limitation from `CHANGELOG.md` and add a brief entry for the change.

## Acceptance and verification

Checks are done on Linux/X11 with the
[desktop-testing](../../.claude/skills/desktop-testing/SKILL.md) procedure and `metacity`. Use
isolated data. Complete this table after the gate.

| # | Criterion | How it is checked | Actual result — 16 September 2026 |
| --- | --- | --- | --- |
| 1 | The scrollbar is visible at rest | Open the tracking view with many topics at 800×600. Wait without input, then take a screenshot | Passed. With 12 topics, the tracking view has 926px of content in a 550px area. After the page loaded, with the pointer outside the window, the thumb showed at 785px to 794px from 49px down, in `edge` (101, 120, 131) on `ground` (13, 21, 26). |
| 2 | No scrollbar shows when a view fits | Open Analytics maximised, then take a screenshot | Passed. Maximized, Analytics has 718px of content in a 718px area. No thumb shows, and the 18px at the right edge have only the `ground` color. |
| 3 | The track and the thumb can be used | Click the track below the thumb, and drag the thumb to the end. Read the scroll position after each action | Passed. A 100px drag down on the thumb at 783, 785, 790, and 794px scrolled to 169px. A click on the track below the thumb scrolled to 376px, the end. A 500px drag on the thumb scrolled to 376px. A drag at 795 and 797px did not scroll. The thumb under the pointer changed to `ink-soft`. |
| 4 | The content does not move sideways | Change between the tracking view and a view that fits. Compare the left edge of the content | Passed. Maximized, the content starts at 124px and `clientWidth` is 1006px in the tracking view, in Analytics (fits), and after the return to the tracking view. With the desktop frame, maximized, the content starts at 124px in all four views. |
| 5 | The resize edges still work | Drag the east edge, the north-east corner, and the south-east corner. Compare the window sizes. Read the cursor in each zone | Passed. From 800×600, a drag on the east edge at 797px gave 840×600, on the north-east corner 840×640, and on the south-east corner 840×640 from 840×600. The cursor, read with XFixes, had a different shape in the east zone (hotspot 17,10), the north-east corner (18,2), the south-east corner (18,19), and the south edge (11,18). On the thumb it was the normal pointer. |
| 6 | Contrast meets WCAG 2.2 AA for non-text elements | Measure the thumb against the track in light and dark appearance, as Phase 6 did | Passed. Measured in the screenshots: in light appearance the thumb is #6e7d84 on #dae1e3, 3.22:1, and under the pointer #4a5c66, 5.26:1. In dark appearance the thumb is #657883 on #0d151a, 4.01:1, and under the pointer #93a8b2, 7.45:1. All are at least 3:1. |
| 7 | The desktop frame, a narrow window, and a maximised window give the same result | Repeat checks 1 to 4 with the desktop frame, at 480×600, and maximised | Passed. Desktop frame at 800×600: the thumb is 786px to 795px, a drag at 786, 795, and 798px scrolled to 168px, and a track click scrolled to 374px. Desktop frame, maximized: see check 5, and Analytics shows no thumb. Application frame at 480×600: the thumb is 465px to 474px, a drag scrolled to the end (404px), a drag at 477px did not scroll, and the east edge resized to 520×600. Application frame, maximized: see checks 2 and 5. |
| 8 | Phase 18 behaviour is unchanged | Repeat checks 2, 3, and 8 of [Phase 18](phase-18-window-content-fit.md#acceptance-and-verification) | Passed. 2: at 480×600, in all four views, a scroll to the end reached the last line, and the bar, the window controls, and the edges stayed visible. The area stayed 510px high, so no horizontal scrollbar showed. 3: in Metacity's 512×768 tile, the area was 678px high in all four views, and the content started at 1px. At 800×400, all four views scrolled to the end in a 350px area. 8: a 300×200 request gave 480×320. |
| 9 | No event kind is added and the log is not changed | Compare `src/core/` and the stored log across the session | Passed. `src/core/` has no diff. The seeded log had the same SHA-256 at the start and the end. The owner's application-data directory was not opened. Only local preferences for the appearance and the frame were changed. |
| 10 | The project checks pass | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test` in `src-tauri/` | Passed. TypeScript and Biome gave no diagnostics. The 91 Vitest tests, the 64 script tests, and the 6 Rust tests passed. The build, Rust formatting, and Clippy with warnings denied passed. |

Record the actual result of each row when you do the check, including failures. Record what was
not verified.

Not verified: the standalone build, the desktop frame at 480×600, the scrollbar with keyboard
scrolling, other window managers, other desktops, Wayland, scaled displays, and the Windows and
macOS trial builds, which also read these rules. The checks
used the development build. A press on the application name in the tracking view starts a
window move. One test run moved the window into Metacity's right tile by mistake. That run
was used for the 512×768 tile in check 9, and the other runs were done again after a drag out
of the tile.

## Rollout and rollback

Local delivery. Nothing is published. To roll back, remove the `::-webkit-scrollbar` rules
from `src/App.css` and set `overflow-y: auto` on `.app-scroll` again. WebKitGTK then shows its
overlay scrollbar again. This change is only
presentation. It adds no event and no record shape, so there is no data compatibility concern.
