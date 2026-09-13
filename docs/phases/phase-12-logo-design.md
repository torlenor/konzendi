# Phase 12 — Logo design

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 11](phase-11-windows-macos.md) · next: [Phase 13](phase-13-stop-replaces-pause.md)

**Depends on:** [Phase 6](phase-6-application-theme.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Implementation-ready

## Investigation gate

Closed on 13 September 2026. The owner selected the brief, F1 geometry, public wordmark, and
licence. This discovery run also fixes the source and export contract, tray treatment, README
treatment, and initial target environment. The decisions and evidence are below. Implementation
must still validate the mark in the real tray host. That acceptance work does not reopen
discovery unless the selected geometry fails.

### Discovery run: 13 September 2026

The first discovery run produced a brief and three candidate directions. The
[candidate record](phase-12-logo-design/README.md) contains the vector geometry probes, generated
context boards, strengths, risks, provenance, and owner decisions.
[`review.html`](phase-12-logo-design/review.html) renders each vector at 16, 22, 24, and 32 CSS
pixels on light and dark strips. These are geometry checks. They are not evidence from a tray
host.

The owner then asked to combine a brain with the logo. This is an explicit change to the first
brief, which avoided brain imagery. Three additional candidates use a simplified brain to mean
contexts and reflection. They must not imply intelligence, cognitive measurement, mental-health
measurement, or a medical product.

The owner selected **F. Threaded Mind** on 13 September 2026, specifically its generated context
board. The selected identity has four broad, asymmetric brain lobes around one uninterrupted
vertical event-record spine. Petrol and blue alternate diagonally. Candidates A to C were
rejected because they do not contain the requested brain. D was rejected because its switching
path competes with the brain, and E was rejected because it omits the append-only record thread.
Three F refinements now test balanced geometry, stronger brain shaping, and a compact tray shape.

The owner selected **F1. Balanced** on 13 September 2026. It is the final geometry direction.
F2 was rejected because its extra shaping does not improve the 16 px silhouette. F3 was rejected
because its shorter spine weakens the append-only-record idea. The final contract below resolves
colour behavior and export sizes. Real tray-host evidence is an implementation acceptance check,
not an open design decision.

The initial target is Cinnamon on X11 with its `xapp-sn-watcher` status-notifier host. The
development panel is 40 logical pixels high and uses `Mint-Y-Dark-Grey`. Implementation must test
the current dark panel and a light Cinnamon panel treatment. It must record the rendered icon box.
Other status-notifier hosts, desktop environments, fractional scaling, and Wayland remain outside
the verified target.

The current Linux implementation of Tauri 2.11.5 writes the supplied tray image as one PNG and
gives its path to AppIndicator. It does not expose the Status Notifier Item specification's
multi-resolution pixmap list through the current JavaScript path. The implementation must supply
one 16 by 16 px PNG and let the host scale it. The 16, 22, 24, and 32 px sizes are visual test
sizes, not four runtime assets.

On 13 September 2026, the owner decided that the tray does not get a special treatment. The tray
uses the logo as it is, exported as a 16 px PNG. This replaces the earlier plan for a separate
tray SVG with light and petrol keylines. Rationale: one logo source is simpler, and the tray mark
must be the same as the logo that people see elsewhere. The real-host acceptance check below
still applies. If the petrol lobes are not visible on the dark panel, record that result before
you change the treatment.

## Outcome and scope

The result is one coherent Konzendi logo system with two purposeful applications:

- a compact tray mark that remains identifiable and legible at the selected Linux desktop sizes;
  and
- a README-ready version that places the mark before the approved text heading at documentation
  scale and has useful alternative text.

The selected assets replace the current generated Tauri icon only in the tray and are integrated
into the README. The phase also documents the source asset, export rule, accessibility
requirements, and licensing notice.

Out of scope: a full rename, product-copy rewrite, application theme redesign, a marketing site,
social-media collateral, package signing, or claims about product outcomes. A window icon,
installer icon, favicon, splash screen, and platform-specific icon sets are excluded. A later
change to that scope requires a roadmap update.

## Decisions and evidence

The selected mark is **F1. Balanced**, stored as
[`threaded-mind-balanced.svg`](phase-12-logo-design/threaded-mind-balanced.svg). The public
wordmark is `Konzendi`. The README keeps its text heading, so it does not embed a font in an
image. Phase 6 supplies the current visual language, including the *Readout* direction and its
light/dark accessibility floor.

The [selected source contract](phase-12-logo-design/README.md#selected-source-contract) fixes the
two-colour and monochrome SVG sources, 64-unit geometry, clear space, 16 px tray export, 16–32 px
test matrix, 80 px README treatment, and tray-only application scope. The owner selected an
[asset-specific all-rights-reserved notice](phase-12-logo-design/RIGHTS.md). It applies to F1 and
its derivatives, does not license other repository files, and does not imply trademark
registration.

### Production asset contract

- Promote the selected geometry to `assets/logo/konzendi-mark-on-light.svg`. Keep petrol
  `#0d151a` and blue `#6fb2e8` in their selected diagonal positions.
- Add `assets/logo/konzendi-mark-on-dark.svg`. Replace petrol with cool light `#dbe5ea`; keep the
  blue positions. README uses a `<picture>` element to choose these sources by colour scheme,
  renders the mark at 80 px, and keeps the existing `# Konzendi` heading as text and fallback.
  The image alternative text is `Konzendi Threaded Mind logo`.
- Do not add a tray-specific SVG, keyline, or other tray treatment. The tray uses
  `assets/logo/konzendi-mark-on-light.svg` without changes. Do not select a tray asset from the
  application theme because the panel can use a different theme.
- Export only `src/assets/konzendi-tray-16.png` for runtime use. Add a pinned development
  dependency and `npm run logo:export` script that produces it deterministically from
  `konzendi-mark-on-light.svg`. The script must fail if source dimensions or expected output
  dimensions differ, and
  `npm run notices` must refresh third-party notices after the lockfile changes.
- In `useTray.ts`, load the PNG bytes and construct the Tauri image with `Image.fromBytes` before
  `TrayIcon.new`. The existing `image-png` Cargo feature supports this path. If asset loading or
  decoding fails, use `defaultWindowIcon()` and report the failure without removing the tray.
- Do not change `src-tauri/icons/`, `tauri.conf.json`, the window icon, package icon, favicon, or
  platform-specific icon sets.

The six candidates are:

| Candidate | Product idea | Principal risk |
| --- | --- | --- |
| [A. Continuity Gate](phase-12-logo-design/README.md#a-continuity-gate) | Work continues through a context switch. | The crossing can become busy at 16 px. |
| [B. Switch Lanes](phase-12-logo-design/README.md#b-switch-lanes) | A recorded path changes from one context to another. | The mark can resemble a menu or generic routing symbol. |
| [C. Event Thread](phase-12-logo-design/README.md#c-event-thread) | An unbroken record carries events on alternating sides. | The mark can resemble sliders or controls. |
| [D. Neural Gate](phase-12-logo-design/README.md#d-neural-gate) | A continuous path crosses a simplified brain-shaped gate. | The path competes with the brain at 16 px. |
| [E. Split Focus](phase-12-logo-design/README.md#e-split-focus) | A brain is divided by a context-switch path in negative space. | The central path can look decorative. |
| **[F. Threaded Mind](phase-12-logo-design/README.md#f-threaded-mind) — selected** | Brain lobes attach to an unbroken event-record thread. | The mark can resemble controls or a butterfly. |

All six are original project studies. Their SVG files are deterministic geometry probes. The
PNG boards came from OpenAI's built-in image generation tool and are context references only;
they are not sources for production exports. F1 is the only selected geometry source.

The current tray calls `defaultWindowIcon()` and therefore shows the generated application icon.
The inspected Tauri configuration uses separate generated package icons. The least disruptive
path is to replace only the image passed to `TrayIcon.new` and keep the current default as a
failure fallback.

## Work packages

- [x] **Define the brief.** Record the Konzendi wordmark, desired and avoided
      associations, target contexts, and the owner-approved evaluation criteria. Complete when
      no later asset work has to infer the public-facing name or the intended meaning of the
      mark.
- [x] **Explore and select a logo direction.** Create original, attributable candidate marks and
      show each in the selected tray and README contexts. Complete when the owner selects one
      direction and the rejected alternatives and rationale are recorded.
- [ ] **Create the production sources and export.** Promote F1 to the two SVG sources under
      `assets/logo/`, add the deterministic 16 px tray export script and its pinned dependency,
      refresh notices, and commit only the generated tray PNG. Complete when a clean checkout can
      regenerate a byte-identical PNG and the script rejects wrong dimensions.
- [ ] **Integrate the tray mark.** Update only the tray-icon path required by the selected
      contract, preserve the default-icon failure path, and do not change tray actions or
      lifecycle. Complete when the mark renders correctly in Cinnamon's real Linux/X11
      status-notifier host on the declared light and dark panel treatments.
- [ ] **Integrate the README version.** Add the selected documentation asset and concise
      alternative text before the README title. Complete when GitHub-style rendering selects the
      correct light or dark source and has no broken local asset link, unreadable fallback, or
      distracting layout at desktop and narrow widths.
- [ ] **Record usage and recovery.** Document source location, allowed variants, export steps,
      licence/attribution, and replacement procedure. Complete when a later contributor can
      update the mark without guessing which output belongs in the tray or README.

## Acceptance and verification

Do not claim a completed logo until all of the following have recorded results:

- The investigation gate is resolved and the Konzendi wordmark agrees with every new public asset.
- `npm run logo:export` produces a byte-identical 16 by 16 px RGBA PNG from a clean checkout and
  fails on an invalid source or output dimension.
- The selected tray mark is visibly distinguishable in the 16, 22, 24, and 32 px review renders.
  Record the actual box used by Cinnamon in the running Linux/X11 application on both light and
  dark panel treatments. The full silhouette must remain visible, without clipping or blur that
  changes its meaning.
- The tray menu, open-window action, tracking actions, close-to-tray behavior, and quit behavior
  retain the Phase 3 acceptance behaviour after the icon change.
- The README variant renders both colour-scheme sources from repository-relative paths, uses the
  alternative text `Konzendi Threaded Mind logo`, remains understandable when images are
  unavailable, and is legible at 80 px and at a narrow viewport.
- The source and generated assets have recorded licence/provenance; committed files contain no
  personal data, third-party logo, or unlicensed font.
- Relevant root checks (`npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`) and
  the applicable Rust checks pass after integration. Record actual commands and results here;
  do not prefill a successful outcome.

## Rollout and rollback

This is local repository delivery until a release phase publishes it. Introduce the new assets in
one reviewable change after the owner selects them. Preserve the prior generated tray asset and
the previous README markup in Git history so a visual or desktop-host regression can be reverted
without touching the append-only event log or tracking behavior.

If the new tray mark is unreadable, absent, or harms status-notifier integration, restore the
previous tray icon path first and investigate the affected host with synthetic tracking data.
If the README asset breaks rendering, revert only its markup and asset reference; the document's
text must still identify the project without the image.
