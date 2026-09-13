# Phase 18 — Window content that fits the window

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 17](phase-17-storage-location-menu.md) · next: none

**Depends on:** [Phase 8](phase-8-window-frame.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

## Investigation gate

The owner reported the problem on 13 September 2026 with a screenshot of the tracking view.
The window has the default 800×600 size and the application frame. The content does not fit
the window. The bottom of the `▶ Resume Watching TV` button is cut off at the lower edge, and
the Quick access band below it is not visible. The owner wants the content to adapt to the
window size and not to be cut off.

Do not write production code until questions 1 to 3 have answers and the owner has recorded
the decision in question 4.

### Questions that must be answered

1. **What scrolls today?** The source suggests that the whole document scrolls (see
   [Assumptions from the source](#assumptions-from-the-source)). Measure it in the running
   window. Record which element scrolls, and whether the title bar, the window controls, and
   the 1px window edge stay visible after a scroll to the bottom.
2. **Where does content get cut off?** Measure each view — tracking, Analytics, Entries, and
   Topics — at these client sizes:
   - the default 800×600;
   - Metacity's half-screen tile on a 1024×768 screen, which is 512×768;
   - a short window, for example 800×400;
   - a narrow window, for example 480×600;
   - a maximised window.

   Do this with the application frame and with the desktop frame. For each case, record
   whether content is clipped vertically, clipped horizontally, or reachable only by a scroll.
   Include the title bar: its controls are in one row that does not wrap.
3. **Is there a size below which no layout can work?** The main window sets no `minWidth` or
   `minHeight` in `src-tauri/tauri.conf.json`. Find the smallest size at which the title bar
   still shows all of its controls and the tracking view still shows the readout.
4. **What does "fit" mean?** The owner must select the target behaviour. The candidates are:
   - **A. Fixed bar, scrolling content.** The title bar stays at the top. Only the area below
     it scrolls. The window edge stays on all four sides.
   - **B. Compact layout.** Spacing and the readout size become smaller in a short or narrow
     window, so that more content fits before a scroll is necessary. This can be added to A.
   - **C. A minimum window size.** The window cannot become smaller than the size found in
     question 3. This can be added to A or B.
   - **D. Window sized to its content.** The window changes its height to fit the content, as
     the quick switcher does with `fitQuick`. The main window is resizable, and its content
     length changes by view and by number of topics, so this conflicts with a size that the
     user sets. Record why it is accepted or rejected.

   The recommendation from the source reading is A, with C as a floor. Evidence from
   questions 1 to 3 can change this.

### Evidence to gather

Use the [desktop-testing](../../.claude/skills/desktop-testing/SKILL.md) procedure on a private
X server with `metacity` running, as [Phase 8](phase-8-window-frame.md#acceptance-and-verification)
did. Resize, tile, and maximise need a window manager. Use a separate `XDG_DATA_HOME`, and put
enough topics in it to make the tracking view taller than the window. Do not open the owner's
application-data directory.

For each measured case, keep a screenshot and the client geometry. Record the scroll height and
client height of `document.scrollingElement` and of `.app-content`.

### Decision to record

The owner records the selected behaviour from question 4, with the date and rationale, in
[Decisions and evidence](#decisions-and-evidence). The findings from questions 1 to 3 go in the
same section. Then complete the work packages and the acceptance table, and change readiness
to `Implementation-ready`.

## Outcome and scope

At every window size the application supports, the user can see and use the title bar, the
window controls, and the window edge. All content in each view is visible or can be reached by
a scroll inside the content area. No control or reading is cut off without a way to reach it.

The scope includes:

- the layout of the main window below the title bar, for the four views;
- the layout of the title bar at narrow widths;
- a minimum window size, if the owner selects it.

Out of scope:

- the quick switcher, which sets its own size in `fitQuick` in `src/desktop.ts`;
- new controls, a new arrangement of the bar, or a move of controls into a menu. This is the
  work of [Phase 17](phase-17-storage-location-menu.md);
- changes to the tracking interaction or to the event log;
- display scaling, Wayland, and window managers other than Metacity.

## Decisions and evidence

### Verified facts

These facts come from the tree on 13 September 2026:

- The main window is 800×600, resizable, and has no minimum size
  (`src-tauri/tauri.conf.json`).
- `body` has `min-height: 100vh` and no `overflow` rule. With the application frame, `body`
  also has the 1px `edge` border (`src/App.css`).
- The title bar is the first child of `main`. It has no `position: sticky` or
  `position: fixed` rule.
- `.app-content` has `max-width: 44rem` and no height or `overflow` rule.
- The eight resize zones use `position: fixed`, so they stay at the window edges during a scroll.
- The title bar is a flex row with no `flex-wrap`. Its identity area has `min-width: 4.75rem`.

### Assumptions from the source

These are not yet measured in the running window:

- The document is the element that scrolls. A scroll moves the title bar out of view. With the
  application frame, the drag area and the window controls are then not available until the
  user scrolls back to the top.
- `body` grows with its content, so the lower part of the 1px window edge moves below the
  bottom of the window.
- At a narrow width, the title bar does not wrap, and its controls extend past the right edge.

### Relation to other phases

- [Phase 8](phase-8-window-frame.md) added the application frame, the title bar, and the
  window edge. This phase changes how they behave when the content is taller or wider than
  the window. The dependency is declared because this phase keeps Phase 8's acceptance results
  true.
- [Phase 17](phase-17-storage-location-menu.md) moves controls out of the bar and makes it
  shorter. The two phases are independent. The bar layout must work with the current controls
  and with the controls after Phase 17.

## Work packages

Complete these packages after the gate. They are the expected shape for candidate A with C, and
the owner's decision can change them.

- [ ] Record the findings and the owner's decision, and make this document
  `Implementation-ready`.
- [ ] Put the window in a layout in which the title bar stays at the top and only the content
  below it scrolls. The 1px window edge stays on all four sides. Complete when a scroll to the
  bottom of each view keeps the bar, the controls, and the edge visible.
- [ ] Make the title bar usable at the smallest supported width. Complete when no control
  extends past the window edge at that width.
- [ ] If selected, set the minimum window size in `src-tauri/tauri.conf.json`. Complete when a
  resize stops at that size on every edge and corner.
- [ ] Add a brief entry to `CHANGELOG.md`.

## Acceptance and verification

Checks are done on Linux/X11 with the
[desktop-testing](../../.claude/skills/desktop-testing/SKILL.md) procedure and `metacity`. Use
isolated data. Complete this table after the decision.

| # | Criterion | How it is checked | Actual result |
| --- | --- | --- | --- |
| 1 | No content is cut off at the default size | Open each view at 800×600 with many topics. Scroll to the end and take a screenshot | Not run |
| 2 | The title bar, the window controls, and the edge stay visible during a scroll | Scroll each view to the bottom. Take a screenshot and compare it with the top | Not run |
| 3 | The layout works in a tiled, a short, a narrow, and a maximised window | Repeat checks 1 and 2 at 512×768, 800×400, 480×600, and maximised | Not run |
| 4 | The desktop frame gives the same result | Repeat checks 1 to 3 with the desktop frame | Not run |
| 5 | Phase 8 behaviour is unchanged | Repeat checks 2, 5, 6, 8, and 19 of [Phase 8](phase-8-window-frame.md#acceptance-and-verification) | Not run |
| 6 | No event kind is added and the log is not changed | Compare `src/core/` and the stored log across the session | Not run |
| 7 | The project checks pass | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test` in `src-tauri/` | Not run |

Record the actual result of each row when you do the check, including failures. Record what was
not verified.

## Rollout and rollback

Local delivery. Nothing is published. To roll back, revert the layout rules in `src/App.css`
and any minimum size in `src-tauri/tauri.conf.json`. This change is only presentation and
window size. It adds no event and no record shape, so there is no data compatibility concern.
