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

The first discovery run produced a brief and three candidate directions. The candidate record
contained the vector geometry probes, generated context boards, image prompts, strengths, risks,
provenance, and owner decisions. A review page rendered each vector at 16, 22, 24, and 32 CSS
pixels on light and dark strips. These were geometry checks. They were not evidence from a tray
host.

The discovery files were removed on 13 September 2026 after implementation, because the
production sources are in [`assets/logo/`](../../assets/logo/README.md). They remain in Git
history in the `docs/phases/phase-12-logo-design/` directory of commit `b1d3f91`. Use, for example,
`git show b1d3f91:docs/phases/phase-12-logo-design/README.md`.

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
one 32 by 32 px PNG and let the host scale it. The 16, 22, 24, and 32 px sizes are visual test
sizes, not four runtime assets.

On 13 September 2026, the owner decided that the tray does not get a special treatment. The tray
uses the logo as it is. This replaces the earlier plan for a separate tray SVG with light and
petrol keylines. Rationale: one logo source is simpler, and the tray mark must be the same as the
logo that people see elsewhere. The real-host acceptance check below still applies. If the
petrol lobes are not visible on the dark panel, record that result before you change the
treatment.

The first implementation exported a 16 px PNG. On 13 September 2026, the owner saw that this
icon looks too pixelated in the real panel and decided to export 32 px again. Rationale: the host
scales the PNG to its icon box, and a 16 px source becomes blocky when the box is larger.

On 13 September 2026, the owner also added the window icon, the application package icons in
`src-tauri/icons/`, and the favicon to this phase. They use the two-colour logo as it is, on a
transparent background, like the tray. Rationale: the application must show one logo in all
places. This changes the earlier tray-only scope, and the roadmap row shows the change.

On 13 September 2026, the dark-panel check failed: the petrol lobes and the spine were not
visible on the Cinnamon dark panel (see the verification record). The owner compared a light
rounded tile, a light circle, a light keyline, and a theme-aware tray, and selected the light
tile. The tray, the window and package icons, and the favicon now use
`assets/logo/konzendi-app-icon.svg`: the logo at 78% scale on a rounded `#dbe5ea` square with a
14-unit corner radius. This replaces the plain logo for these icons. The README keeps the plain
light and dark logo sources. Rationale: the window-list icon comes from a static icon file and
cannot follow the panel theme, so one static icon must show on dark and light panels. Petrol on
the tile has high contrast, and the tile has high contrast on a dark panel. On a light panel the
tile is faint, but the logo on it stays visible.

## Outcome and scope

The result is one coherent Konzendi logo system with these applications:

- a compact tray mark that remains identifiable and legible at the selected Linux desktop sizes;
- the window icon and the application package icons in `src-tauri/icons/`;
- the favicon of the application web view; and
- a README-ready version that places the mark before the approved text heading at documentation
  scale and has useful alternative text.

The selected assets replace the generated Tauri icons and are integrated into the README. The
phase also documents the source asset, export rules, accessibility requirements, and licensing
notice.

Out of scope: a full rename, product-copy rewrite, application theme redesign, a marketing site,
social-media collateral, package signing, a splash screen, Android and iOS icons, or claims about
product outcomes. A later change to that scope requires a roadmap update.

## Decisions and evidence

The selected mark is **F1. Balanced**, stored as
[`konzendi-mark-on-light.svg`](../../assets/logo/konzendi-mark-on-light.svg). The public
wordmark is `Konzendi`. The README keeps its text heading, so it does not embed a font in an
image. Phase 6 supplies the current visual language, including the *Readout* direction and its
light/dark accessibility floor.

The selected source contract fixes the two-colour SVG sources in a transparent 64-unit view box,
clear space of at least the 6-unit spine width outside the view box, the 32 px tray export, the
16–32 px test matrix, and the 80 px README treatment. The owner selected an
[asset-specific all-rights-reserved notice](../../assets/logo/RIGHTS.md). It applies to F1 and
its derivatives, does not license other repository files, and does not imply trademark
registration.

### Production asset contract

- Promote the selected geometry to `assets/logo/konzendi-mark-on-light.svg`. Keep petrol
  `#0d151a` and blue `#6fb2e8` in their selected diagonal positions.
- Add `assets/logo/konzendi-mark-on-dark.svg`. Replace petrol with cool light `#dbe5ea`; keep the
  blue positions. README uses a `<picture>` element to choose these sources by colour scheme,
  renders the mark at 80 px, and keeps the existing `# Konzendi` heading as text and fallback.
  The image alternative text is `Konzendi Threaded Mind logo`.
- Add `assets/logo/konzendi-app-icon.svg`: the logo scaled to 78% about the centre, on a
  rounded `#dbe5ea` tile that fills the 64-unit view box with a 14-unit corner radius. The tray,
  application icons, and favicon use this source. Do not add a keyline or a theme-dependent
  icon. Do not select a tray asset from the application theme because the panel can use a
  different theme.
- Export only `src/assets/konzendi-tray-32.png` for runtime use. Add a pinned development
  dependency and `npm run logo:export` script that produces it deterministically from
  `konzendi-app-icon.svg`. The script must fail if source dimensions or expected output
  dimensions differ, and
  `npm run notices` must refresh third-party notices after the lockfile changes.
- In `useTray.ts`, load the PNG bytes and construct the Tauri image with `Image.fromBytes` before
  `TrayIcon.new`. The existing `image-png` Cargo feature supports this path. If asset loading or
  decoding fails, use `defaultWindowIcon()` and report the failure without removing the tray.
- Add `npm run logo:icons`. It runs the locked Tauri CLI (`tauri icon`) on
  `konzendi-app-icon.svg` and replaces only the existing desktop icon files in
  `src-tauri/icons/`. Do not add Android or iOS icons. Do not change the `bundle.icon` list in
  `tauri.conf.json`; the Linux window icon is its first PNG, `icons/32x32.png`.
- In `index.html`, link the favicon to `assets/logo/konzendi-app-icon.svg`. Vite copies it
  into the build.

The six candidates are:

| Candidate | Product idea | Principal risk |
| --- | --- | --- |
| A. Continuity Gate | Work continues through a context switch. | The crossing can become busy at 16 px. |
| B. Switch Lanes | A recorded path changes from one context to another. | The mark can resemble a menu or generic routing symbol. |
| C. Event Thread | An unbroken record carries events on alternating sides. | The mark can resemble sliders or controls. |
| D. Neural Gate | A continuous path crosses a simplified brain-shaped gate. | The path competes with the brain at 16 px. |
| E. Split Focus | A brain is divided by a context-switch path in negative space. | The central path can look decorative. |
| **F. Threaded Mind — selected** | Brain lobes attach to an unbroken event-record thread. | The mark can resemble controls or a butterfly. |

All six are original project studies. Their SVG files were deterministic geometry probes. The
PNG boards came from OpenAI's built-in image generation tool and were context references only;
they were not sources for production exports. The F1, F2, and F3 SVG files were redrawn to match
their boards, with arcs fitted to the average of the four lobes. F1 is the only selected geometry
source.

Before this phase, the tray called `defaultWindowIcon()` and therefore showed the generated
application icon. The tray now receives its own PNG and keeps `defaultWindowIcon()` as a failure
fallback. Because the application icons now also show the logo, the fallback shows the logo too.

## Work packages

- [x] **Define the brief.** Record the Konzendi wordmark, desired and avoided
      associations, target contexts, and the owner-approved evaluation criteria. Complete when
      no later asset work has to infer the public-facing name or the intended meaning of the
      mark.
- [x] **Explore and select a logo direction.** Create original, attributable candidate marks and
      show each in the selected tray and README contexts. Complete when the owner selects one
      direction and the rejected alternatives and rationale are recorded.
- [x] **Create the production sources and export.** Promote F1 to the two SVG sources under
      `assets/logo/`, add the deterministic 32 px tray export script and its pinned dependency,
      refresh notices, and commit only the generated tray PNG. Complete when a clean checkout can
      regenerate a byte-identical PNG and the script rejects wrong dimensions.
- [ ] **Integrate the tray mark.** Update only the tray-icon path required by the selected
      contract, preserve the default-icon failure path, and do not change tray actions or
      lifecycle. Complete when the mark renders correctly in Cinnamon's real Linux/X11
      status-notifier host on the declared light and dark panel treatments.
- [ ] **Replace the application icons and favicon.** Regenerate `src-tauri/icons/` with
      `npm run logo:icons` and link the favicon. Complete when the running window shows the new
      icon and the Debian package installs the new icons.
- [ ] **Integrate the README version.** Add the selected documentation asset and concise
      alternative text before the README title. Complete when GitHub-style rendering selects the
      correct light or dark source and has no broken local asset link, unreadable fallback, or
      distracting layout at desktop and narrow widths.
- [x] **Record usage and recovery.** Document source location, allowed variants, export steps,
      licence/attribution, and replacement procedure. Complete when a later contributor can
      update the mark without guessing which output belongs in the tray or README.

## Acceptance and verification

Do not claim a completed logo until all of the following have recorded results:

- The investigation gate is resolved and the Konzendi wordmark agrees with every new public asset.
- `npm run logo:export` produces a byte-identical 32 by 32 px RGBA PNG from a clean checkout and
  fails on an invalid source or output dimension.
- The selected tray mark is visibly distinguishable in the 16, 22, 24, and 32 px review renders.
  Record the actual box used by Cinnamon in the running Linux/X11 application on both light and
  dark panel treatments. The full silhouette must remain visible, without clipping or blur that
  changes its meaning.
- The running window uses `src-tauri/icons/32x32.png` as its icon. The Debian package installs
  the regenerated icons, and the built `index.html` links the favicon.
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

### Verification record: 13 September 2026

Implementation added `assets/logo/konzendi-mark-on-light.svg`, `konzendi-mark-on-dark.svg`,
`konzendi-app-icon.svg`,
[usage and recovery notes](../../assets/logo/README.md), `npm run logo:export` with the pinned
development dependency `@resvg/resvg-js` 2.6.2, `src/assets/konzendi-tray-32.png`, the tray
change in `src/useTray.ts`, `npm run logo:icons`, regenerated icons in `src-tauri/icons/`, the
favicon link in `index.html`, and the README `<picture>` element.

- From the plain logo, `npm run logo:export` wrote a 32 by 32 px 8-bit RGBA PNG (SHA-256
  `a185e5f99624f391e3a0a71fec6a231b46bc0afbc7b3d76042ec34e074fd6c42`). From the tiled
  `konzendi-app-icon.svg`, it wrote a 32 by 32 px 8-bit RGBA PNG (SHA-256
  `1de0a1fe9474c7a4ecfa2f93af1374a7cd7fd011b20708adaadc3aa95ae5498c`).
  `npm run logo:export -- --check` passed. The script tests in `scripts/logo-export.test.mjs`
  compare the committed PNG with a new export and reject a wrong view box, a wrong intrinsic
  size, a wrong output size, data that is not a PNG, and unknown arguments. The clean-checkout
  run is not recorded yet; CI runs these tests after `npm ci`.
- `npm run logo:icons` ran two times. The PNG and ICO files were the same after each run;
  `icon.icns` was different after each run.
- `npm run typecheck`, `npm run lint`, `npm test` (55 tests), `npm run test:scripts` (62 tests),
  and `npm run build` passed. The built `dist/index.html` links the hashed favicon SVG.
  In `src-tauri/`, `cargo fmt --check`, `cargo clippy --locked -- -D warnings`, and
  `cargo test --locked` passed after the icon change.
- `npm run notices -- --check` did not run: `cargo-about` is not installed on the development
  machine. The new package is a development dependency, so the npm part of the notices does not
  change. CI runs this check.
- `npm run tauri dev` ran on a private X server with a private session bus. The tray wrote
  `tray-icon-konzendi-0.png`, 32 by 32 px, with pixels identical to
  `src/assets/konzendi-tray-32.png`. The window `_NET_WM_ICON` property was 32 by 32 px, with
  pixels identical to `src-tauri/icons/32x32.png`. Cargo did not rebuild the application after
  only the icon files changed, so a first check showed the previous icon. `cargo clean -p konzendi`
  forced the rebuild. This is not evidence from a status-notifier host.
- The owner reported that the tray icon works in the real desktop session, and that the 16 px
  export looked too pixelated. The rendered box and the panel treatment were not recorded.
- In the owner's Cinnamon session, the panel first showed the previous icon with
  `npm run tauri dev`. Cause: the installed 0.1.1 package provides `Konzendi.desktop` with
  `StartupWMClass=konzendi` and `Icon=konzendi`, so Cinnamon used the old `konzendi.png` files in
  `/usr/share/icons/hicolor/` and not the window icon. The owner then reported that the new icon
  works. The steps that the owner used were not recorded.
- The owner reported that the tray icons work and that the Debian package installs and shows the
  new icons.
- **Dark panel: failed.** An owner screenshot of the Cinnamon dark panel shows the window-list
  icon and the tray icon with only the two blue lobes visible. The petrol lobes and the spine are
  present in the pixels (`#0d151a`), but they do not separate from the panel. Measured contrast
  ratios: petrol against the panel background `#1c1c20` is 1.09:1, and against the window-list
  button `#303036` is 1.41:1. Blue is 7.45:1 and 5.75:1. The icon is correct; the plain two-colour
  logo does not work on a dark panel.
- The owner decided on 13 September 2026 that the light and dark panel behaviour is the only
  remaining item to investigate before the phase is done. The README rendering on GitHub, the
  rendered icon box, and the failure path to `defaultWindowIcon()` were not recorded.
- After the change to the light tile, `npm run logo:export`, `npm run logo:icons`, and
  `cargo clean -p konzendi` ran. On a private X server with a private session bus, the tray PNG
  was pixel-identical to the tiled `src/assets/konzendi-tray-32.png`, and the window
  `_NET_WM_ICON` was pixel-identical to the tiled `src-tauri/icons/32x32.png`. Calculated contrast
  ratios: petrol on the tile 14.40:1, the tile on the dark panel `#1c1c20` 13.27:1 and on the
  window-list button `#303036` 10.24:1, the tile on a light panel `#efefef` 1.11:1. Blue on the
  tile is 1.78:1, so blue and tile are separated mainly by hue. Not verified yet: the tiled icons
  in the owner's Cinnamon session on the dark and light panels.

## Rollout and rollback

This is local repository delivery until a release phase publishes it. Introduce the new assets in
one reviewable change after the owner selects them. Preserve the prior generated tray asset and
the previous README markup in Git history so a visual or desktop-host regression can be reverted
without touching the append-only event log or tracking behavior.

If the new tray mark is unreadable, absent, or harms status-notifier integration, restore the
previous tray icon path first and investigate the affected host with synthetic tracking data.
If the application icons are wrong or missing in the window or package, revert the
`src-tauri/icons/` files and the favicon link; they do not affect stored data. If the README
asset breaks rendering, revert only its markup and asset reference; the document's
text must still identify the project without the image.
