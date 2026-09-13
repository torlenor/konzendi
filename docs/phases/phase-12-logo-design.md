# Phase 12 — Logo design

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 11](phase-11-windows-macos.md) · next: [Phase 13](phase-13-stop-replaces-pause.md)

**Depends on:** [Phase 6](phase-6-application-theme.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

## Investigation gate

Resolve this phase's investigation gate before creating or adopting a production logo. The
approved public product name is `Konzendi`; use it for any wordmark. This phase does not change
identifiers, data paths, window titles, package metadata, or existing product text.

Gather and record:

1. The intended qualities, avoided associations, and any audience or competitor references that
   should constrain the mark. The logo must support a quiet tool used beside other work; it must
   not suggest a validated measure of productivity, cognition, or mental health.
2. At least three distinct, original mark directions, each tested with and without its wordmark
   against Phase 6's *Readout* theme. Evaluate recognisability, visual noise, and distinction at
   tray size rather than choosing only from enlarged artwork.
3. The exact tray environments and pixel sizes to support on the initial Linux/X11 target. Test
   opaque and translucent desktop panels, light and dark desktop themes, and the status-notifier
   host used by the application. Determine whether the tray asset must be a fixed-colour raster,
   a monochrome symbolic mark, or both.
4. The documentation treatment: a README header or inline mark, its rendered width, light/dark
   backgrounds, alternative text, and whether the README must remain readable when image loading
   is disabled.
5. Asset formats, source ownership, licences, export sizes, and how generated exports can be
   reproduced without committing unrelated build output. Prefer a repository-owned vector source
   where it remains faithful at every required size.

Record the selected mark, wordmark, colour and monochrome variants, clear-space and minimum-size
rules, tray export contract, README treatment, and licence before changing readiness to
`Implementation-ready`.

## Outcome and scope

The eventual result is one coherent Konzendi logo system with two purposeful applications:

- a compact tray mark that remains identifiable and legible at the selected Linux desktop sizes;
  and
- a README-ready version, which may pair that mark with the approved wordmark at documentation
  scale and has useful alternative text.

The selected assets replace the current generated Tauri icon only where explicitly decided and
are integrated into the tray and README. The phase also documents the source asset, export
matrix, accessibility requirements, and any licensing attribution.

Out of scope: a full rename, product-copy rewrite, application theme redesign, a marketing site,
social-media collateral, package signing, or claims about product outcomes. A window icon,
installer icon, favicon, splash screen, and platform-specific icon sets are excluded unless
discovery shows that they must change together with the tray asset; in that case, record the
scope change in the roadmap before implementing it.

## Decisions and evidence

No mark, wordmark, colour, or asset format has been selected. Phase 6 supplies the current
visual language, including the *Readout* direction and its light/dark accessibility floor; it
is a constraint and not a preselected logo design.

The current tray calls `defaultWindowIcon()` and therefore shows the generated application icon.
That coupling is an implementation fact, not a decision that a new tray mark must also become
the window or package icon. Discovery must inspect the current Tauri icon configuration and
record the least disruptive integration path.

## Work packages

- [ ] **Define the brief.** Record the Konzendi wordmark, desired and avoided
      associations, target contexts, and the owner-approved evaluation criteria. Complete when
      no later asset work has to infer the public-facing name or the intended meaning of the
      mark.
- [ ] **Explore and select a logo direction.** Create original, attributable candidate marks and
      show each in the selected tray and README contexts. Complete when the owner selects one
      direction and the rejected alternatives and rationale are recorded.
- [ ] **Define the source and export contract.** Add the editable source, declare its licence,
      and specify deterministic exports for the selected tray sizes and README variant. Complete
      when a clean checkout can regenerate or otherwise verify every committed derived asset.
- [ ] **Integrate the tray mark.** Update only the tray-icon path required by the selected
      contract, without changing tray actions or lifecycle. Complete when it renders correctly
      in the real Linux/X11 status-notifier host at every supported size and theme.
- [ ] **Integrate the README version.** Add the selected documentation asset and concise
      alternative text near the README title. Complete when GitHub-style Markdown rendering has
      no broken local asset link, readable fallback text, or distracting layout at desktop and
      narrow widths.
- [ ] **Record usage and recovery.** Document source location, allowed variants, export steps,
      licence/attribution, and replacement procedure. Complete when a later contributor can
      update the mark without guessing which output belongs in the tray or README.

## Acceptance and verification

Do not claim a completed logo until all of the following have recorded results:

- The investigation gate is resolved and the Konzendi wordmark agrees with every new public asset.
- The selected tray mark is visibly distinguishable at each declared pixel size in a running
  Linux/X11 application, on both light and dark panel treatments, with no clipped or blurred
  detail that changes its meaning.
- The tray menu, open-window action, tracking actions, close-to-tray behavior, and quit behavior
  retain the Phase 3 acceptance behaviour after the icon change.
- The README variant renders from a repository-relative path, has meaningful alternative text,
  remains understandable when images are unavailable, and is legible at its documented width.
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
