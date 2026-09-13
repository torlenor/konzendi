# Phase 6 — Application theme

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 5](phase-5-validation-trial.md) · next: [Phase 7](phase-7-releases-ci-cd.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md)  
**Effort:** M  
**Complexity:** L  
**Readiness:** Implementation-ready

## Investigation gate

Closed. The project owner chose the direction, the mode support, and the typography from three
named candidates on 7 September 2026; the answers are recorded below.

**Which qualities follow from the intended user base?** Three are real constraints, and the rest
is taste. Glanceability of the elapsed time is a constraint, because Phase 1 made an implausible
number the whole defence against a missed entry. Low visual noise beside an editor is a
constraint, because the window sits in peripheral vision for hours. Readability in a dark room
is a constraint, because long sessions run late. "Feeling like a developer tool" is taste and was
not treated as a requirement.

**What does "unique" mean concretely, and how is it judged?** Three directions were drawn as
wireframes with a stated trade-off each — *Spine* (the append-only log drawn as a continuous
vertical rule), *Readout* (an instrument panel, clock-dominant, switch targets as the keypad they
are), and *Margin* (a quiet notebook with timestamps in a left margin) — and the owner chose.
Distinctiveness is judged against the direction's stated idea, not against taste: the accepted
theme must make the elapsed reading dominate the fold and must derive its structure from what the
application actually is. Where the design would otherwise have fallen back to a common default
(a near-black ground with one bright accent; monospace applied to every small label), the
alternative was chosen deliberately and the reason recorded below.

**Which modes must exist?** Both, following the desktop setting by default, with an
in-application override of System, Light, or Dark. The override was accepted knowing that it adds
one control, which the original scope excluded; the gate contemplated an in-application choice,
so this amends that exclusion and nothing else. The measurement below shows that the desktop
setting is followed correctly, so the override is explicit user control rather than a
workaround.

**Where is the preference stored?** `localStorage`, under `konzendi.appearance`, read and written
in `src/theme.ts`. It is a preference, not tracking data: it appends no event and the store in
`src-tauri/` never sees it. Storage failures are caught and fall back to `system`, so a webview
with storage denied still runs and merely forgets the choice.

**What is the token vocabulary?** Thirteen roles, all defined in `src/App.css` and named for the
job they do rather than the colour they hold: `ground`, `band`, `ink`, `ink-soft`, `ink-faint`,
`edge`, `rule`, `live`, `rest`, `alarm`, `on-accent`, `focus`, and `state`. `state` is the
resolved colour of the current tracking state, set from `data-state` on `<main>`, so a running
interval, a pause, and an idle window all read from one variable. Styling stayed out of
`src/core/`, which is unchanged.

**Typography: stay on `system-ui`, or bundle a font?** Bundled. `system-ui` on Linux resolves to
DejaVu Sans or Cantarell depending on the distribution, and the design turns on the shape of a
large numeral, so leaving it to the machine was not acceptable. Fira Sans carries the interface
and Fira Mono is used only where alignment does real work — log timestamps and the key caps.

**What accessibility floor applies?** WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and
for non-text indicators including the focus ring and control boundaries. Measured results are
below.

**Which tokens must survive later phases?** `ground`, `band`, `ink`, `ink-soft`, `ink-faint`,
`edge`, `rule`, `focus`, and `on-accent` are general and carry to any surface.
[Phase 3](phase-3-quick-access.md)'s quick-access surface needs `band`, `ink`, `edge`, and the key
caps, which are already a token-only treatment. [Phase 4](phase-4-timeline-analytics.md)'s
timeline needs `live` and `rest` to colour its segments and `rule` for its axis, which is why
those two are named for the state they mean rather than for a hue. Nothing in the set is specific
to today's views.

## Outcome and scope

A deliberate, distinctive visual theme for the desktop application, applied across the existing
interface and expressed as a documented token set rather than scattered literal values, so
later phases inherit it instead of restyling around it.

Out of scope: layout and information architecture changes, new views, changes to the tracking
interaction decided in [Phase 1](phase-1-tracking-design.md), analytics, an application icon or
any branding asset outside the running window, and packaging. The appearance control is the one
accepted exception to "no new controls", recorded in the gate above.

## Decisions and evidence

### Accepted direction: "Readout"

The window is an instrument panel. The bands run in the order
[Phase 1](phase-1-tracking-design.md#screen-design) fixed — header, readout, switch targets, undo
row, pause row — separated by rules rather than boxed into cards, because Phase 1's own wireframe
is already banded. Control placement is unchanged.

Three ideas carry the direction:

- **The elapsed reading dominates the fold.** It is set at `clamp(2.5rem, 8.5vw, 3.75rem)` in
  Fira Sans Light with tabular figures, and the seconds are set at 0.42em in `ink-soft`. Hours
  and minutes are the glanceable reading; seconds are churn and are deliberately demoted. This is
  what makes the clock an instrument scale rather than a dashboard statistic.
- **Colour is state, never decoration.** `live` marks a running interval, `rest` a pause, `alarm`
  a failure. Each block carries a 3px bar on its left edge in the state colour, and the same
  colour outlines the Pause or Resume action, so the window answers "am I still on this?" from
  across the desk. State is never carried by colour alone: the ▶ and ❙❙ marks and the wording
  carry it too. ([Phase 13](phase-13-stop-replaces-pause.md) replaced `❙❙` with `■` when Pause
  became Stop; the rule and every token are unchanged.)
- **The switch targets show the key that fires them.** Each row carries its digit in a bordered
  cap, because a number key in the focused window is the actual interaction. The numbering is not
  ornament: it is the shortcut.

Two supporting rules keep the rest quiet. Radius appears only on things that can be pressed —
buttons, inputs, key caps — and nothing else is rounded, so roundness means "pressable". A left
bar means "status of this block", which is why the adjust panel is a bordered box instead: it is
a group of controls, not a status.

**Chosen over.** *Spine* drew the append-only log as one continuous vertical rule with revoked
entries as hollow segments; it was the more unusual idea but it subordinates the clock, which
Phase 1 requires to be the largest element. *Margin* was the quietest of the three and the least
glanceable, which loses the constraint the theme exists to serve.

**Defaults deliberately avoided.** A near-black ground with a single bright accent is the common
look for a tool aimed at developers; the dark ground here is a petrol `#0d151a` with real hue and
the accent is a two-colour state system rather than one decorative highlight. Monospace was kept
off small labels and used only for timestamps and key caps, where column alignment is the point.
The light mode is a cool mineral grey rather than the warm cream that a document-like reading of
this brief would have produced.

### Palette

Light is the base; dark redefines the same roles. Both are declared as custom properties in a
single token region at the top of `src/App.css`.

| Role | Light | Dark | Job |
| --- | --- | --- | --- |
| `ground` | `#dae1e3` | `#0d151a` | The window |
| `band` | `#f1f4f5` | `#152229` | The lit reading plane, panels, inputs |
| `ink` | `#12222a` | `#dbe5ea` | Primary text, and the focus ring |
| `ink-soft` | `#4a5c66` | `#93a8b2` | Secondary text, marks in lists |
| `ink-faint` | `#51636d` | `#7d939e` | Revoked and archived text |
| `edge` | `#6e7d84` | `#657883` | Control and container boundaries |
| `rule` | `#a5b3b9` | `#2c3c45` | Structural separators between bands |
| `live` | `#0f4c81` | `#6fb2e8` | A running interval |
| `rest` | `#7a5410` | `#d9a64e` | A pause |
| `alarm` | `#9a2318` | `#f0897c` | A failure that was not recorded |
| `on-accent` | `#ffffff` | `#08131c` | Text on a filled accent |

`focus` is an alias of `ink` in both modes, so the focus ring is always the highest-contrast
value available and can never be confused with a state colour.

### Typography

`@fontsource/fira-sans` and `@fontsource/fira-mono`, both version 5.3.0, licensed **OFL-1.1**
(licence text ships in each package and the fonts are © Mozilla Foundation / Telefonica). Only
the latin subsets are imported — Fira Sans 300, 400, 500 and Fira Mono 400 — which Vite emits
into `dist/assets/` as local files. The stacks degrade to `system-ui` and `ui-monospace`, so a
missing font file changes the face and nothing else.

### Modes, and a platform finding

`prefers-color-scheme` selects the palette, `data-theme` on the root element overrides it, and
`src/theme.ts` applies the stored choice before React renders so the first paint is already
correct.

**System does follow the desktop, through the session bus.** Measured on the development machine
under a separate X server, with the appearance control set to System. The decisive comparison is
the same binary run twice: with the session bus reachable it rendered the dark palette, matching
the machine's dark desktop theme; run inside an empty network namespace, which also cut it off
from the session bus, it fell back to light. So `prefers-color-scheme` is delivered by the
desktop session rather than read from the toolkit.

Two earlier probes measured nothing and are recorded so they are not repeated: setting
`GTK_THEME=Adwaita` against `GTK_THEME=Adwaita:dark`, and `gtk-application-prefer-dark-theme=0`
against `=1` in a `gtk-3.0/settings.ini`, left the window dark in all four cases. Neither
channel is what WebKitGTK reads. `gsettings get org.gnome.desktop.interface color-scheme`
reports `default` on this machine while the window correctly renders dark, so that key is not
the source either.

The practical consequence is narrower than it first appeared: System works, and the override is
explicit user control rather than a workaround. A build launched without a desktop session — a
bare X server, a container — will render light regardless of intent, which the override also
covers.

## Work packages

- [x] Record the accepted visual direction in this document — palette roles, typography, mode
      support, and rationale.
- [x] Introduce the token layer in `src/App.css`: one custom property per role. Colour literals
      appear only in the three token blocks (light, system dark, explicit dark) and nowhere else
      in the file; verified by search. Three blocks rather than one is what mode support
      requires.
- [x] Apply the accepted palette and typography across every existing surface — `TrackView`,
      `EntriesView`, `TopicsView`, `AdjustPanel`, and the shared header, navigation, footer,
      and alert.
- [x] Implement the decided modes, including the override and where the preference is stored.
- [x] Bundle the fonts, declare the fallback stacks, and record the licence.
- [x] Measure contrast and focus visibility against the floor, and record the measured values.

## Acceptance and verification

Executed 7 September 2026 on the development machine (Linux Mint, X11).

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed, 26 files. |
| `npm test` | Passed, 24 tests in 3 files. |
| `npm run build` | Passed. Fonts emitted to `dist/assets/` as four `woff2` and four `woff` files. |
| `npm run format` | Leaves no changes. |
| Contrast | Passed. Measured on rendered output, reading each element's computed colour against its painted background: 56 text pairs per mode, zero below the floor. Worst pair 4.73:1 in light and 5.74:1 in dark, against a 4.5:1 requirement for body text. |
| Focus visibility | Passed. Every interactive element is a `button`, `input`, or `select`, all covered by one `:focus-visible` rule: a 3px `ink` outline at 3px offset. The ring sits on the ground, not on the control, so the ratio that matters is ring against ground — 12.31:1 in light and 14.40:1 in dark, against a 3:1 requirement. Confirmed visually in the running application. |
| Elapsed legible at a glance | Passed. Checked with `npm run tauri dev` in the 800×600 window, not in a browser alone. |
| Offline rendering | Passed. The standalone build (`npm run tauri build -- --debug --no-bundle`) was run inside an empty network namespace (`unshare -rn`). It started and rendered with the bundled Fira faces; static text regions were pixel-identical to the same build with the network available (0 differing pixels across two compared regions). |
| Event log unaffected | Passed. `src/core/` and `src-tauri/` are unchanged, so no event kind was added and the fold is the same code; the 24 core tests cover it. The only new persistence is `localStorage`. |

Surfaces checked in the running application: the running readout, the paused readout, the adjust
panel, the entry list including a revoked entry, the topic list, and the appearance override
repainting every surface with nothing left unreadable.

Two defects were found by looking at the rendered result and fixed: `.mark` inherited the current
state colour, which tinted historical entries in the log by whatever is running now; and the
filled Pause button was the loudest element on screen, which inverted the hierarchy the direction
depends on.

Not verified: how the theme reads on a desktop other than the development machine, and whether
any candidate direction is distinctive to someone other than the project owner. The nav gives no
indication of the current view, which predates this phase and was left alone as an information
architecture change.

## Rollout and rollback

Local delivery; nothing is published. Rollback is reverting the styling change, which restores
the current appearance. There is no data compatibility concern: the theme touches presentation
only and adds no event kind. Removing the stored mode preference falls back to the default mode
rather than failing.
