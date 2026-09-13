# Phase 19 — A scrollbar that is always visible

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 18](phase-18-window-content-fit.md) · next: none

**Depends on:** [Phase 6](phase-6-application-theme.md), [Phase 18](phase-18-window-content-fit.md)  
**Effort:** L  
**Complexity:** L  
**Readiness:** Discovery required

## Investigation gate

The owner accepted the target behaviour on 13 September 2026 (see
[Decisions and evidence](#decisions-and-evidence)). The platform behaviour is not measured. Do
not write production code until questions 1 and 2 have answers.

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

### Proposal to confirm in the gate

These values are a starting point, not decisions:

- the track uses `ground` and the thumb uses `edge`; the thumb under the pointer uses `ink-soft`;
- the thumb has a radius, because in this theme a radius means that an element can be pressed;
- the width is about 12px, so that the thumb stays usable next to the 5px resize zone;
- `scrollbar-gutter: stable` keeps the content from moving sideways when a view change adds or
  removes the scrollbar.

## Work packages

Complete these packages after the gate. They can change with its findings.

- [ ] Record the answers to questions 1 and 2 and the selected rules, and make this document
  `Implementation-ready`.
- [ ] Style the scrollbar of `.app-scroll` in `src/App.css` with theme tokens only. Complete
  when the scrollbar is visible at rest in every view that is taller than its area, and no
  scrollbar shows in a view that fits.
- [ ] Keep the content in place when the scrollbar comes and goes. Complete when a change
  between a view that scrolls and a view that fits does not move the content sideways.
- [ ] Make the thumb usable next to the east resize zone. Complete when a drag on the thumb
  scrolls the content, and a drag on the east edge still resizes the window.
- [ ] Remove the scrollbar limitation from `CHANGELOG.md` and add a brief entry for the change.

## Acceptance and verification

Checks are done on Linux/X11 with the
[desktop-testing](../../.claude/skills/desktop-testing/SKILL.md) procedure and `metacity`. Use
isolated data. Complete this table after the gate.

| # | Criterion | How it is checked | Actual result |
| --- | --- | --- | --- |
| 1 | The scrollbar is visible at rest | Open the tracking view with many topics at 800×600. Wait without input, then take a screenshot | Not run |
| 2 | No scrollbar shows when a view fits | Open Analytics maximised, then take a screenshot | Not run |
| 3 | The track and the thumb can be used | Click the track below the thumb, and drag the thumb to the end. Read the scroll position after each action | Not run |
| 4 | The content does not move sideways | Change between the tracking view and a view that fits. Compare the left edge of the content | Not run |
| 5 | The resize edges still work | Drag the east edge, the north-east corner, and the south-east corner. Compare the window sizes. Read the cursor in each zone | Not run |
| 6 | Contrast meets WCAG 2.2 AA for non-text elements | Measure the thumb against the track in light and dark appearance, as Phase 6 did | Not run |
| 7 | The desktop frame, a narrow window, and a maximised window give the same result | Repeat checks 1 to 4 with the desktop frame, at 480×600, and maximised | Not run |
| 8 | Phase 18 behaviour is unchanged | Repeat checks 2, 3, and 8 of [Phase 18](phase-18-window-content-fit.md#acceptance-and-verification) | Not run |
| 9 | No event kind is added and the log is not changed | Compare `src/core/` and the stored log across the session | Not run |
| 10 | The project checks pass | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test` in `src-tauri/` | Not run |

Record the actual result of each row when you do the check, including failures. Record what was
not verified.

## Rollout and rollback

Local delivery. Nothing is published. To roll back, remove the scrollbar rules from
`src/App.css`. WebKitGTK then shows its overlay scrollbar again. This change is only
presentation. It adds no event and no record shape, so there is no data compatibility concern.
