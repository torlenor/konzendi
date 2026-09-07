# Phase 6 — Application theme

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 5](phase-5-validation-trial.md) · next: none

**Depends on:** [Phase 2](phase-2-tracking-implementation.md)  
**Effort:** M  
**Complexity:** L  
**Readiness:** Discovery required

> The visual direction is not decided. The work packages below describe the shape of the
> change, which is structural and independent of which direction wins; the values they apply
> come from the investigation gate. Do not apply a palette, typography, or mode behavior that
> the gate has not recorded.

## Investigation gate

Answering these resolves [Q12](../OPEN_QUESTIONS.md).

- Which qualities follow from the intended user base? The roadmap describes people working on
  a computer, especially developers and engineers, in long sessions alongside other windows.
  Which of that is a real constraint on the theme — glanceability of the elapsed time, low
  visual noise beside an editor or terminal, readability in a dark room — and which is taste?
- What does "unique" mean concretely, and how is it judged? A checkable form is needed: named
  candidate directions compared against stated criteria, with the project owner deciding.
  Taste alone cannot be an acceptance criterion.
- Which modes must exist: light only, dark only, both following the desktop setting, or an
  in-application choice? Nothing in the application reads `prefers-color-scheme` today and
  `src-tauri/tauri.conf.json` declares no window theme, so this is an addition either way.
- If an in-application choice is chosen, where is the preference stored? It is a preference,
  not tracking data, and must not enter the append-only event log.
- What is the token vocabulary — which roles exist (surface, text, accent, focus, danger,
  muted, border), and what are they named? Styling stays out of `src/core/`, which imports
  neither React nor Tauri.
- Typography: stay on `system-ui`, or bundle a font? The application is offline-only, so a
  bundled font must ship as a local file and be requested over no network. Its licence must be
  checked and recorded before it is vendored.
- What accessibility floor applies — contrast targets for body and large text, and focus
  indicator visibility? The current palette has not been measured against any target.
- The theme must also carry surfaces that do not exist yet: [Phase 3](phase-3-quick-access.md)'s
  quick-access surface and [Phase 4](phase-4-timeline-analytics.md)'s timeline. Which tokens
  must be general enough to survive them, and which may stay specific to today's views?

## Outcome and scope

A deliberate, distinctive visual theme for the desktop application, applied across the existing
interface and expressed as a documented token set rather than scattered literal values, so
later phases inherit it instead of restyling around it.

Out of scope: layout and information architecture changes, new views or controls, changes to
the tracking interaction decided in [Phase 1](phase-1-tracking-design.md), analytics, an
application icon or any branding asset outside the running window, and packaging.

## Decisions and evidence

None recorded; the direction is [Q12](../OPEN_QUESTIONS.md).

Verified facts about the current state, read from the workspace:

- `src/App.css` (218 lines) holds every style in the frontend. There is no other stylesheet and
  no CSS-in-JS.
- Colors are literal hex values with no custom properties: a dark green (`#245d48`) on an
  off-white ground (`#f4f6f2`), muted greens for secondary text, an amber focus ring
  (`#9d6429`), and a red alert palette.
- Typography is `system-ui, sans-serif`. `index.html` loads no font and no external asset.
- There is no `prefers-color-scheme` handling anywhere in `src/`, and `tauri.conf.json` sets no
  window theme, so the application ignores the desktop light/dark setting.

Not verified: the contrast ratios of the current palette, how it reads on the target desktop,
and whether any candidate direction is distinctive rather than merely different.

## Work packages

- [ ] Record the accepted visual direction in this document — palette roles, typography, mode
      support, and rationale — and update [Q12](../OPEN_QUESTIONS.md). Complete when the
      decision section states the direction and the alternatives it was chosen over.
- [ ] Introduce the token layer in `src/App.css`: one custom property per role, defined in a
      single block. Complete when no literal color appears outside that block.
- [ ] Apply the accepted palette and typography across every existing surface — `TrackView`,
      `EntriesView`, `TopicsView`, `AdjustPanel`, and the shared header, navigation, footer,
      and alert. Complete when each renders in the new theme with no leftover default styling.
- [ ] Implement the decided modes, including how the window follows or overrides the desktop
      setting and where any preference is stored. Complete when every surface repaints on a
      mode change with no unreadable element, and no event is written by the change.
- [ ] If a font is bundled: vendor the file, declare `@font-face` with a system fallback stack,
      and record the licence. Complete when the application renders it with no network
      available.
- [ ] Measure contrast and focus visibility against the floor set by the gate, and record the
      measured values. Complete when every pair meets the target or the exception is recorded
      with its reason.

## Acceptance and verification

- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass; `npm run format`
  leaves no changes.
- Every text and background pair meets the recorded contrast target, with measured ratios
  written down rather than asserted.
- Every interactive element shows a visible focus indicator under keyboard navigation, in each
  supported mode.
- The elapsed time on the tracking window is legible at a glance in the running desktop
  application, checked with `npm run tauri dev` and not in a browser alone.
- With no network available, the application renders identically, including typography.
- The event log is unaffected: no event kind is added, and a log written before the change
  folds identically after it.

Record the commands or manual checks and their actual results when executed, including
failures. Do not prefill outcomes.

## Rollout and rollback

Local delivery; nothing is published. Rollback is reverting the styling change, which restores
the current appearance. There is no data compatibility concern: the theme touches presentation
only and adds no event kind. If a stored mode preference is introduced, removing it falls back
to the default mode rather than failing.
