# Phase 18 — Window content that fits the window

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 17](phase-17-storage-location-menu.md) · next: none

**Depends on:** [Phase 8](phase-8-window-frame.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Implementation-ready

## Investigation gate

The owner reported the problem on 13 September 2026 with a screenshot of the tracking view.
The window has the default 800×600 size and the application frame. The content does not fit
the window. The bottom of the `▶ Resume Watching TV` button is cut off at the lower edge, and
the Quick access band below it is not visible. The owner wants the content to adapt to the
window size and not to be cut off.

Do not write production code until questions 1 to 3 have answers and the owner has recorded
the decision in question 4.

The gate closed on 13 September 2026. The findings for questions 1 to 3 and the owner's
decision are in [Decisions and evidence](#decisions-and-evidence).

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

### Decided by the owner, 13 September 2026

The owner selected the behaviour after the findings for questions 1 to 3 were available.

| Area | Decision | Rationale |
| --- | --- | --- |
| Target behaviour | **A. Fixed bar, scrolling content.** The title bar stays at the top. Only the area below it scrolls. The window edge stays on all four sides. | The measured failure is that a document scroll moves the bar, the window controls, and the upper edge out of view. A makes these always available and does not change the size of any content. |
| Compact layout | **B is not selected.** Spacing and the readout size do not change with the window height. | A makes all content reachable. B adds rules and checks and does not remove the need for a scroll with many topics. |
| Window sized to its content | **D is rejected.** | The window is resizable, and the content height changes with the view and the number of topics. D would override the size that the user or the window manager sets. |
| Narrow bar | The bar **wraps onto a second row** when the window is too narrow for one row. The window identity and the window controls stay on the first row. The navigation and the preference selects move to the second row. | A floor at the one-row width of 682px would remove Metacity's 512px half-screen tile on a 1024px screen. A wrap keeps that tile. It also works after [Phase 17](phase-17-storage-location-menu.md), because a shorter bar only needs the wrap at a smaller width. |
| Minimum window size | **C with a floor of 480×320**, set as `minWidth` and `minHeight` in `src-tauri/tauri.conf.json`. | 480 is the narrow test width of question 2. At 480 wide the two-row bar holds all current controls. At 320 high the bar and the readout are visible without a scroll. |

This does not change the tracking interaction, the event log, or the quick switcher.

### Verified facts

These facts come from the tree on 13 September 2026, before the change of this phase:

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

The measurements below confirm all three assumptions:

- The document is the element that scrolls. A scroll moves the title bar out of view. With the
  application frame, the drag area and the window controls are then not available until the
  user scrolls back to the top.
- `body` grows with its content, so the lower part of the 1px window edge moves below the
  bottom of the window.
- At a narrow width, the title bar does not wrap, and its controls extend past the right edge.

### Findings, 13 September 2026

**Method.** The development build ran on a private `Xvfb :99` screen of 1024×768 with
`metacity`. `XDG_DATA_HOME` pointed to a temporary directory with a seeded log: 12 topics,
12 switches, and a stop, so the tracking view shows `▶ Resume Watching TV` as in the owner's
report. The owner's application-data directory was not opened. A temporary probe, which is not
in the tree, read the element geometry and sent it to a file through the Vite development
server. Sizes were set with `xdotool windowsize`, and maximise with `wmctrl`. Each view was
measured at the top and after a scroll to the end, with one screenshot for each position. The
screenshots are outside the repository.

**Question 1 — what scrolls.** `document.scrollingElement` is `HTML`. No other element
scrolls. `.app-content` has the same height as its content, for example 1020 of 1020px in the
tracking view. At 800×600 with the application frame, the document is 1070px high in a 600px
client. After a scroll to the end:

- The title bar is at −469px. The drag area, the navigation, and the window controls are out
  of view.
- `body` ends at the bottom of the window, so the lower edge shows. The upper edge is out of
  view. Before the scroll, the lower edge is 470px below the window.
- The left and right edges stay visible. The eight resize zones stay at the window edges.
- WebKitGTK shows an overlay scrollbar only during a scroll. When the page is at rest, no
  scrollbar shows. Nothing tells the user that more content is below the window. This agrees
  with the owner's report: the `Resume` button is cut off at 800×600 and the Quick access band
  is below it.
- The mouse wheel scrolls the document to the end.

**Question 2 — where content is cut off.** The table gives the document scroll height against
the client height (vertical) and the document scroll width against the client width
(horizontal). "Scroll" means that the content is reachable only by a document scroll, which
also moves the bar out of view. At 512 wide with the desktop frame, Metacity limits the client
to 512×731, because its title bar takes 37px of the 768px screen.

| Frame | Client | Tracking | Analytics | Entries | Topics | Horizontal |
| --- | --- | --- | --- | --- | --- | --- |
| App | 800×600 | 1070/600 scroll | 655/600 scroll | 850/600 scroll | 756/600 scroll | fits |
| App | 512×768 | 1061/768 scroll | fits | 870/768 scroll | fits | bar 673/512: cut off |
| App | 800×400 | 1070/400 scroll | 655/400 scroll | 850/400 scroll | 756/400 scroll | fits |
| App | 480×600 | 1058/600 scroll | 727/600 scroll | 870/600 scroll | 756/600 scroll | bar 673/480: cut off |
| App | 1024×768 maximised | 1070/768 scroll | fits | 850/768 scroll | fits | fits |
| Desktop | 800×600 | 1068/600 scroll | 653/600 scroll | 848/600 scroll | 754/600 scroll | fits |
| Desktop | 512×731 | 1059/731 scroll | fits | 868/731 scroll | 754/731 scroll | bar 557/512: cut off |
| Desktop | 800×400 | 1068/400 scroll | 653/400 scroll | 848/400 scroll | 754/400 scroll | fits |
| Desktop | 480×600 | 1056/600 scroll | 725/600 scroll | 868/600 scroll | 754/600 scroll | bar 557/480: cut off |
| Desktop | 1024×731 maximised | 1068/731 scroll | fits | 848/731 scroll | 754/731 scroll | fits |

- No content is clipped vertically without a scroll. A document scroll reaches all content in
  all views at all sizes.
- Only the title bar is clipped horizontally. The content below it wraps and fits at 480px.
- With the application frame at 512 and 480 wide, the frame select, Minimise, Maximise, Close,
  and the right window edge are past the right edge. With the desktop frame, the frame select
  is cut off.
- The document then scrolls horizontally, but no horizontal scrollbar shows at rest. The
  resize zones stay at the window edge, so the right resize zone covers content, not the edge
  of the bar.

**Question 3 — the smallest usable size.** The window has no floor. Metacity accepted a
200×100 client, and `WM_NORMAL_HINTS` gives a minimum size of 0 by 0. The bar sets the floor
for the width:

| Frame | Bar has its full padding | Last control touches the window edge | Controls cut off |
| --- | --- | --- | --- |
| App | 682px and wider | 673px (the right edge is covered) | 672px and narrower |
| Desktop | 565px and wider | 557px | 556px and narrower |

The `Konzendi` name and `‹ Back` give the same widths, because `.title-bar-identity` has a
minimum width of 4.75rem. The readout needs a client height of 155px: its bottom is at 151px to
154px, because its font size follows the window width. A floor of 682px wide for the
application frame is wider than Metacity's 512px half-screen tile on a 1024px screen. Such a
floor removes that tile, which question 2 lists as a size to support. A floor was not set in
`tauri.conf.json` during the investigation, so the effect of a minimum size on a Metacity tile
is not measured.

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

- [x] Record the findings and the owner's decision, and make this document
  `Implementation-ready`.
- [x] Put the window in a layout in which the title bar stays at the top and only the content
  below it scrolls. The 1px window edge stays on all four sides. Complete when a scroll to the
  bottom of each view keeps the bar, the controls, and the edge visible. `main` fills `body`,
  and the new `.app-scroll` element around `.app-content` is the only element that scrolls
  (`src/App.tsx`, `src/App.css`).
- [x] Make the title bar usable at the smallest supported width. Complete when no control
  extends past the window edge at that width. Below 43rem (688px), the bar wraps: the identity
  and the window controls stay on the first row, and the navigation goes to the second row.
- [x] Set the minimum window size in `src-tauri/tauri.conf.json`. Complete when a resize stops
  at that size on every edge and corner. `minWidth` is 480 and `minHeight` is 320.
- [x] Add a brief entry to `CHANGELOG.md`.

## Acceptance and verification

Checks are done on Linux/X11 with the
[desktop-testing](../../.claude/skills/desktop-testing/SKILL.md) procedure and `metacity`. Use
isolated data. Complete this table after the decision.

| # | Criterion | How it is checked | Actual result — 13 September 2026 |
| --- | --- | --- | --- |
| 1 | No content is cut off at the default size | Open each view at 800×600 with many topics. Scroll to the end and take a screenshot | Passed. With 12 topics, the tracking view scrolls 1020px of content in a 550px area. After a scroll to the end, the `Resume` button and the Quick access band show in full. Analytics, Entries, and Topics also reach their last line. |
| 2 | The title bar, the window controls, and the edge stay visible during a scroll | Scroll each view to the bottom. Take a screenshot and compare it with the top | Passed. In all cases the document scroll position stays 0 and its height is the client height. The bar stays at 1px from the top, `body` fills the client, and the scroll area ends 1px inside the lower edge. The mouse wheel and Page Down scroll the content area. |
| 3 | The layout works in a tiled, a short, a narrow, and a maximised window | Repeat checks 1 and 2 at 512×768, 800×400, 480×600, and maximised | Passed at 512×768, 800×400, 480×600, and 1024×768 maximised. A bar drag to the left screen edge gave Metacity's 512×768 tile with `_NET_WM_STATE_MAXIMIZED_VERT`. The bar wraps to two rows (88px). No control is past the right edge, and the content has no horizontal overflow. The bar keeps its height when the view changes. The bar has one row at 689px and two rows at 688px. |
| 4 | The desktop frame gives the same result | Repeat checks 1 to 3 with the desktop frame | Passed at 800×600, 512×731, 800×400, 480×600, and 1024×731 maximised. The desktop title bar takes 37px of the screen height. The first run was not valid: the window stayed in the tile and ignored the size requests. A drag out of the tile removed it, and the repeated run passed. |
| 5 | Phase 8 behaviour is unchanged | Repeat checks 2, 5, 6, 8, and 19 of [Phase 8](phase-8-window-frame.md#acceptance-and-verification) | Passed. 2: a bar drag moved the client from 100,80 to 150,140. 5: Minimise gave `Iconic` and `_NET_WM_STATE_HIDDEN`, Maximise gave both maximise atoms and 1024×768, and Restore returned 800×600 at 150,140. This also passed from the two-row bar at 480×400. 6: a double-click on the name maximised and restored, also at 480×400. The first attempt with `xdotool click --repeat` did not toggle, but separate timed press and release events did. 8: from 600×450, the edges gave 616×450 and 600×466, and the corners 616×466. 19: the eight zones gave eight different cursors, and each hotspot agreed with its direction. The pointer inside the window was the normal pointer. |
| 6 | No event kind is added and the log is not changed | Compare `src/core/` and the stored log across the session | Passed. `src/core/` has no diff. The seeded log in the temporary `XDG_DATA_HOME` had the same SHA-256 at the start and the end. The owner's application-data directory was not opened. |
| 7 | The project checks pass | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test` in `src-tauri/` | Passed. TypeScript and Biome gave no diagnostics. The 55 Vitest tests, the 62 script tests, and the 5 Rust tests passed. The build, Rust formatting, and Clippy with warnings denied passed. |
| 8 | The minimum size holds | Request a smaller size, then drag each edge and corner past the floor | Passed in both frames. `WM_NORMAL_HINTS` gives a minimum of 480 by 320. A 300×200 request gave 480×320. From 540×380, a 100px drag inward stopped at 480 on the east and west edges, at 320 on the north and south edges, and at 480×320 on the four corners. At 480×320 the bar and the readout show without a scroll. |
| 9 | The quick switcher is not changed | Open it with the shortcut, take a screenshot, and close it with Escape | Passed. With 12 topics it opened at 360×432. The screenshot shows the full edge and the last `Open Konzendi` row. Escape closed it and appended no event. |

Record the actual result of each row when you do the check, including failures. Record what was
not verified.

Not verified: the standalone build, keyboard focus order and focus rings in the two-row bar,
other window managers, other desktops, Wayland, and scaled displays. The checks used the
development build, and the window showed the dark appearance.

### Follow-up outside this phase

WebKitGTK showed its overlay scrollbar only during a scroll. When the content area is at rest,
nothing shows that it continues below the window. This is the first impression in the owner's
report. A scrollbar that is always visible, or another cue, is new visual design and was not
part of the decision. `CHANGELOG.md` records it as a known limitation. On 13 September 2026 the
owner selected a scrollbar that is always visible and styled with the theme, as
[Phase 19](phase-19-visible-scrollbar.md).

## Rollout and rollback

Local delivery. Nothing is published. To roll back, revert the layout rules in `src/App.css`
and any minimum size in `src-tauri/tauri.conf.json`. This change is only presentation and
window size. It adds no event and no record shape, so there is no data compatibility concern.
