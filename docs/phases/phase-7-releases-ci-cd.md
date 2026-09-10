# Phase 7 — Releases and CI/CD

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 6](phase-6-application-theme.md) · next: [Phase 8](phase-8-window-frame.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Implementation-ready

## Investigation gate

The owner selected private releases, unsigned x86_64 Debian packages for Ubuntu 24.04 / Mint 22,
SHA-256 checksums, and manual publication of an automatically prepared draft on 7 September
2026. The owner subsequently chose local changelog/version preparation, with optional helper
scripts, followed by a pushed Git tag triggering checks, packaging, and draft creation. This
supersedes the earlier workflow-driven version updates and tagging. These decisions resolve
[Q13–Q15](../OPEN_QUESTIONS.md); technical contracts and verification limits are below.

The hosted workflow run and full package acceptance remain implementation checks. Discovery
does not require publishing workflows merely to verify hosting. The local build probe informs
the plan but does not establish hosted CI or supported-platform acceptance.

## Outcome and scope

A repeatable path from a reviewed change to a checked, versioned Linux desktop release with
traceable artifacts, readable release notes, and a recovery procedure. CI runs quality checks;
CD builds and delivers desktop packages according to the publication policy decided above.

Includes dependency/toolchain pinning, workflow permissions, version consistency, a changelog,
packaging, artifact integrity, release verification, and maintainer documentation.

Out of scope: Windows/macOS support, app stores, payments or entitlement, backend deployment,
automatic in-app updates, synchronization, and new tracking features. The application remains
offline-only. This phase does not require the trial to finish and does not claim validation.

## Decisions and evidence

The user requested a phase for releases, CI/CD, and changelog management on 7 September 2026.
It depends on the working tracking application from Phase 2; later feature phases need not
block infrastructure work. Platform and offline constraints remain those accepted in
[Phase 0](phase-0-repo-setup.md#decisions-and-evidence).

Repository inspection on that date found:

- Root scripts already provide type checking, linting, unit tests, and frontend builds;
  Rust checks are documented in the [README](../../README.md#checks).
- `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` each declare `0.1.0`.
  npm and Cargo lockfiles also need consistent application version metadata when bumped.
- Tauri bundling is enabled with targets set to `all`, but the documented verification uses
  a debug executable without bundles. This does not establish installer or release readiness.
- No `.github` workflows, changelog, or application licence file were found; the Git remote
  is `git@github.com:torlenor/konzendi.git`.
- GitHub API inspection: private repository, default branch `main`, Actions enabled, default
  token permissions read-only, and authenticated account has admin access. No tags, releases,
  workflows, artifacts, or Actions caches exist. `main` is unprotected. Ruleset access returned
  HTTP 403 with an upgrade/public-repository requirement. Account billing was not verified.

### CI and operating limits — Q13

Use GitHub Actions on `ubuntu-24.04` x86_64, Node `24.16.0`, npm `11.13.0`, and Rust `1.98.0`
with rustfmt and clippy. Record actual runner image and native package versions in build
metadata. Install the README's native build prerequisites and `xvfb`, `xauth`, `xdotool`,
`imagemagick`, and `dbus-x11` for desktop smoke checks. The
[official runner inventory](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)
lists Xvfb; a successful project run on that runner is still required.

Use `npm ci --ignore-scripts --no-audit --no-fund`, then the four existing root check scripts;
use `cargo fmt --check`, `cargo clippy --locked -- -D warnings`, and `cargo test --locked` in
`src-tauri/`. A locked build may download dependencies; offline application behavior is a
separate test. Pin third-party actions by full commit SHA, disable checkout credential
persistence, and use `contents: read` except in the final release-writing job.

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`, with stable job names
`frontend`, `rust`, and `package-smoke`. Reuse the same checks for release candidates, passing
an explicit commit SHA. Run every job on PRs without path filters; cancel superseded PR runs,
but never cancel a release in progress. Use 15-minute frontend and 45-minute Rust/package
timeouts, seven-day diagnostic artifact retention, and lockfile/toolchain-keyed build caches.
Cache writes belong to trusted default-branch jobs; release candidates must not restore caches
produced by untrusted contributions.

Private hosted runners consume an account allowance and may incur charges beyond it
([GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)).
No plan upgrade, new paid runner, or budget increase is part of this phase. Before enabling
hosted runs, the maintainer verifies allowance and a stop-usage budget in account settings
([budget controls](https://docs.github.com/en/billing/how-tos/set-up-budgets)). An exhausted
allowance stops delivery; it is not a reason to skip checks.

Merge protection is unavailable in the inspected private-repository setup
([GitHub availability](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)).
Until that changes, passing checks before merge is a maintainer convention, not an enforced
gate. Release jobs enforce their own check dependencies. Do not claim CI prevents an admin
from merging or manually publishing outside this workflow. No paid upgrade is required to
finish this phase under that documented limitation.

### Local preparation and tag-triggered releases — Q14

The maintainer writes/reviews the changelog and version changes locally, commits them to
`main`, and pushes an annotated `vVERSION` tag. GitHub builds that exact commit and prepares
a draft; the maintainer reviews it and clicks **Publish release**. Creating a tag locally
does not trigger GitHub: the tag must be pushed. Publication remains private to repository
readers. This approach keeps release preparation reviewable in Git and removes the need for
CI to manufacture commits, update `main`, or create tags.

Use `.github/workflows/release.yml` with `push.tags: ['v*']`, then strictly validate the tag
format in the workflow. GitHub supports tag filters on push events
([workflow triggers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)).
No version input or dispatch trigger is needed; retry using GitHub's rerun controls. Restrict
the release-writing job to repository owner `torlenor`, checking original and rerun actors.
Use the repository `GITHUB_TOKEN`, with job-scoped `contents: write` for draft/asset creation;
the workflow never commits, tags, or pushes source. No PAT or signing secret is needed
([token permissions](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)).

Use numeric `MAJOR.MINOR.PATCH` versions without prefixes, suffixes, or leading zeroes; tags
are `vMAJOR.MINOR.PATCH`. Keep the first release at `0.1.0` if it is still unreleased. Later
versions must increase. All `0.x` releases are labelled GitHub prereleases, conveying prototype
status; `1.x` and above are stable. Distinct `-rc`/`-beta` package channels are outside this
phase, avoiding an unplanned Debian version conversion policy.

`package.json` is version authority. An optional local helper in planned `scripts/release.mjs` updates it, the npm
lockfile root/package entry, Tauri config, Cargo manifest, and the application entry in Cargo.lock
without changing dependency versions. CI asserts agreement; it must not assume Tauri's own
dependency-version check validates these application versions.

Maintain `CHANGELOG.md` with `## [Unreleased]` and dated `## [VERSION] - YYYY-MM-DD` entries,
using Added, Changed, Fixed, and Removed only when needed. Every release entry also states
compatibility and known limitations. The local helper moves nonempty Unreleased content into the
requested version using the UTC date and restores an empty Unreleased heading. Release notes
come from that exact section plus installation/checksum instructions. A maintained changelog
keeps notes about user-visible behavior; generated commit lists and a mandatory commit-message
convention add little here. The initial entry describes implemented tracking and theme behavior,
not planned analytics, tray access, or synchronization.

Provide two planned npm commands (not implemented yet):

- `npm run release:prepare -- 0.1.1`: require branch `main` and no changes to the five version
  files; allow existing changelog edits and preserve all unrelated work. Validate the version,
  nonempty Unreleased notes, and absence of a duplicate dated entry before writing. Update
  only the five version files and changelog, then print the changed files and next steps.
  Never stage, commit, tag, push, or publish. Manual preparation remains equally supported.
- `npm run release:check -- 0.1.1`: read-only validation of version agreement and exactly one
  nonempty, validly dated changelog entry for that version, including compatibility and known
  limitations. It works before committing and is reused by CI against the tag's version.
  Ordinary CI checks version agreement; it need not require a released entry during development.

After reviewing and committing the prepared files, the maintainer pushes `main`, waits for
its checks, creates `git tag -a v0.1.1 -m 'Release 0.1.1'` on that checked commit, and runs
`git push origin v0.1.1`. The handoff guide must show explicit paths for the release commit,
not `git add .`, and verify a clean worktree and that HEAD equals the checked remote commit.
The workflow must already be committed before pushing the first release tag.

The release workflow has four steps:

1. Serialize runs per tag with cancellation disabled. Reject deleted/malformed tags and
   unauthorized actors before building. Resolve the pushed tag to its commit, verify the
   current remote tag still points there, and require that commit to be reachable from
   `origin/main`. Check out that SHA, never the latest `main`. Validate version/changelog
   agreement and increasing versions against earlier released versions, excluding this tag
   for a retry. Reject a version that is already published without altering it.
2. Run the existing checks and package smoke against the tagged commit using read-only
   permissions. Pass checked assets and `release-manifest.json` to the release-writing job
   within the same run. The manifest records tag, source SHA, run ID, toolchains, and asset
   hashes. No candidate Git bundle or repository write transaction is needed.
3. Recheck the tag before creating a draft for that existing tag. Upload assets and verify
   downloads against checksums. Mark a partial draft incomplete; expose a ready draft link
   in the job summary only after the complete asset set matches.
4. Rerun the failed run for transient failures, retaining the exact tag/SHA. Reuse that run's
   checked artifacts when available; otherwise rebuild and recheck the same commit. Matching
   draft assets may be skipped and missing ones uploaded. Conflicting assets stop with
   instructions to remove only the incomplete draft and rerun; never overwrite silently.
   Source or changelog errors require a corrected commit and a new version/tag, not moving
   a pushed tag. Published releases are never changed by the workflow.

Retain build handoff artifacts for 30 days. Release assets remain until the maintainer
deliberately removes them. Manual publication is the final review point
([GitHub release management](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)).

### Package and distribution contract — Q15

Build only `deb`, with `npm run tauri build -- --ci --bundles deb -- --locked`. The target is
`x86_64-unknown-linux-gnu`; package architecture is `amd64`. Build on Ubuntu 24.04 and claim
Ubuntu 24.04 and Linux Mint 22 under X11 only after the acceptance checks pass there. Do not
infer compatibility with older systems from the file extension: native library baselines matter
([Tauri Debian packaging](https://v2.tauri.app/distribute/debian/)). AppImage, ARM, signing, and
automatic updates can be planned later.

Keep `com.konzendi.app` for this private Linux prototype because it determines the existing
data path. Tauri warns about `.app` on macOS; macOS is out of scope. Any future identity change
needs an explicit data migration. Keep existing icons for prototype packages and set package
publisher/maintainer to `torlenor`, with a concrete tracking description and Utility category.
Do not add an open-source licence or grant public redistribution rights in this phase. Private
repository access is the distribution boundary; Q09/Q10 retain commercial and licensing policy.
Inventory bundled third-party licences, include their required texts in `THIRD_PARTY_NOTICES.md`
and `/usr/share/doc/konzendi/`, and verify packaged contents before distribution.

Draft assets: `konzendi_VERSION_amd64.deb`, `SHA256SUMS`, `release-manifest.json`, and
`THIRD_PARTY_NOTICES.md`. The checksum file covers the other three assets. The manifest records
version, source commit, runner/toolchains, and package hash without attempting to hash itself.
The package is unsigned by accepted policy; checksums detect corruption, not publisher identity.
Download through authenticated GitHub access. Installing runtime dependencies may need network
access; launching and tracking afterward must not.

## Work packages

Execute in the order below. This discovery changes documentation only; the paths below are
planned implementation files.

- [ ] **CI baseline:** add workflow configuration for pull requests and the default branch,
      using locked installs and recorded toolchains/native dependencies. Run root typecheck,
      lint, test, and build scripts plus Rust fmt, clippy, and tests. Document required checks
      and configure them where repository permissions allow. Complete when a clean hosted run
      passes and an intentional failing check blocks release preparation. Record the absence
      of server-enforced merge protection explicitly.
- [ ] **Versioning and changelog:** add `CHANGELOG.md`, the accepted release conventions, and
      a consistency check covering manifests, application lockfile entries, and release tags.
      Document how unreleased changes become dated release notes, including compatibility and
      known limitations. Complete when both a valid candidate and a deliberate mismatch have
      the expected result; avoid inventing release history from planned phases. Implement
      `scripts/release.mjs` and `scripts/release.test.mjs` with Node's built-in test runner;
      test local preparation, read-only validation, preservation of unrelated edits, and
      invalid input without partial writes. Add helper tests and version checks to CI.
- [ ] **Packaging:** configure explicit approved targets in `src-tauri/tauri.conf.json`,
      finalize distribution metadata/notices, and build release packages from the candidate
      commit. Name artifacts by version/platform/architecture and attach checksums plus source
      commit and toolchain metadata. Complete when each supported package passes installation,
      launch, restart persistence, and offline checks in its declared environment. Add
      `scripts/package-smoke.sh` using a private X server, explicit process cleanup, and an
      isolated XDG data directory. Follow the repository desktop-testing skill; never exercise
      the developer's real log. Persist synthetic log assertions and screenshots on failure.
- [ ] **Release automation:** add the agreed release trigger and draft/staging-to-publication
      path, consuming only artifacts verified for that exact commit. Require quality and
      version gates before publication. Restrict write permissions and secrets to trusted
      release jobs; untrusted contributions must not access them. Pin workflow dependencies,
      serialize releases for the same version, and fail clearly on partial uploads or existing
      conflicting artifacts. Complete when a staged release and failure/retry cases pass.
- [ ] **Maintainer handoff:** add a release-process section directly to `README.md`, covering
      changelog preparation, version preparation/check helpers, review and commit, pushing
      `main`, waiting for checks, creating and pushing the version tag, finding the resulting
      draft, and manually publishing it. Include the actual implemented commands and explain
      that a local tag alone does not trigger the build. Add `docs/RELEASING.md` and link it
      from that section for operational details. Cover normal
      releases, hotfixes, credentials if applicable, dependency/toolchain maintenance, artifact
      retention, failure recovery, and data compatibility. Complete when the documented steps
      reproduce a candidate release without relying on undocumented local state.

## Acceptance and verification

Record actual commands, commit/tag, workflow runs, artifact checksums, tested environments,
and results here during implementation. The discovery probe below is not hosted CI evidence.

- All existing frontend and Rust checks pass from a clean checkout on the selected runner.
- Follow the release steps in `README.md` during the hosted rehearsal, from local preparation
  through the ready draft and manual publication step. Verify that the README itself contains
  the normal release sequence and working commands, not only a link to another guide.
- A failed check, mismatched version/tag, or untrusted release attempt prevents publication;
  ordinary contribution checks run without publication credentials.
- Every delivered artifact maps to the checked source commit and declared version; downloaded
  checksums match. Verify signatures if the accepted policy requires them. Checksums alone
  must not be described as publisher authentication.
- Release notes match the changelog and delivered behavior, and state platform support,
  installation steps, known limitations, and data compatibility.
- Each supported package installs and launches outside the development checkout with embedded
  assets. Using isolated synthetic data, track, pause, correct, restart, and confirm persistence;
  verify offline operation without the Vite server.
- Upgrade from the previous supported release preserves identity, log files, and folded state.
  For the first release, use a synthetic fixture from the current prototype and record the
  absence of a prior packaged release. Determine whether downgrade is safe by testing it.
- A failed upload or interrupted run can be retried without publishing incomplete assets or
  replacing an already published version. Exercise the documented withdrawal/hotfix procedure
  on a staged candidate. Record any hosted setting that could not be verified.
- Exercise first version equal to current unreleased `0.1.0`, later increasing versions,
  invalid/shell-like input, empty Unreleased, duplicate dated entries, and a published version.
  Assert local preparation touches only the six agreed files, never upgrades dependencies,
  and never changes Git refs/index. Manual preparation passes the same read-only checker.
- Push a valid tag and verify it automatically yields a ready draft after all checks pass.
  A tag/version mismatch, missing notes, or tag outside `main` fails before draft creation.
  Advance `main` during the run and verify the build remains on the original tagged SHA.
  Changing the remote tag must fail validation rather than silently building a different commit.
- Inject failures during building and asset upload; rerun without new commits or tags. Verify
  matching/missing/conflicting assets follow the recovery rules and an expired handoff causes
  a checked rebuild. Published releases remain untouched on rerun.
- Test the denied actor/ref paths. Assert no workflow writes source commits or tags, and no
  workflow publishes automatically. Record the actual hosted tag and draft used for rehearsal.

### Discovery probe — 7 September 2026

Source: clean `git archive` of `1fe38f4bbeb98d2f8699e5c06039eec999e29cd8`, extracted under
`/tmp/konzendi-release-discovery.DCaBys`. This excludes the pending documentation edits.
Host: Linux Mint 22.3, x86_64; Node 24.16.0, npm 11.13.0, Rust/Cargo 1.98.0. Existing npm and
Cargo download caches were used; compilation outputs were fresh.

| Check | Discovery result |
| --- | --- |
| `npm ci --offline --cache /home/hps/.npm --ignore-scripts --no-audit --no-fund` | Passed, 61 packages. |
| Root typecheck, lint, test, build | Passed; 24 Vitest tests, 26 files checked by Biome. |
| `cargo fmt --check` | Passed. |
| `cargo clippy --offline --locked -- -D warnings` | Passed; fresh check took 2m 23s. |
| `cargo test --offline --locked` | Passed, five storage tests; fresh test build took 2m 31s. |
| `npm run tauri build -- --ci --bundles deb -- --offline --locked` | Passed; optimized build took 5m 37s and produced `Konzendi_0.1.0_amd64.deb`. |
| Package metadata | `amd64`, version `0.1.0`, dependencies `libwebkit2gtk-4.1-0` and `libgtk-3-0`. Maintainer remains the scaffold value `konzendi`; packaging work must finalize it. |
| Ubuntu 24.04 isolated installation | `dpkg -i /tmp/konzendi.deb` passed in a fresh container with runtime dependencies preinstalled. Network mode `none`; Xvfb `:99`; non-root `ubuntu` account. |
| Packaged application smoke | Rendered the first-run screen and recorded a synthetic topic, producing two events in an isolated XDG directory. Restart restored the running topic with the same device identity and two unchanged events. No source checkout or Vite server was present in the container. |

Package SHA-256: `6fe8adbb054695b201a80d47fbaeb9ca681174c4ff43ea4aa3f6f00c59cfc0de`.
The dependency-container setup initially tried to create a UID already supplied by Ubuntu;
using the existing `ubuntu` account resolved that setup issue. No host dependencies or user
tracking data were changed. The build's `.app` identifier warning is accounted for in Q15.

Hosted Actions execution, account allowance/budget, upgrade/downgrade, and failure/retry
automation are not verified by these local checks. The private Ubuntu container is a bounded
packaging experiment, not a full desktop distribution certification.

## Rollout and rollback

Introduce CI first, then version/changelog checks and packaging, and rehearse release automation
in a draft or staging destination. Enable the accepted publication trigger only after the
artifact and failure-path checks pass. The maintainer reviews and publishes the draft inside
the private repository; this planning change publishes nothing.

If delivery fails, stop publication and retain diagnostic evidence without credentials or
personal data. Withdraw or mark an affected release according to the chosen host's verified
mechanism, point users to a known-good version only when data compatibility permits, and ship
a new version for the fix. Do not silently replace published binaries or move published tags.
Revert faulty workflow changes separately from application recovery.

Close the application and back up its data before upgrade or recovery. Do not assume an older
binary understands newer event kinds merely because Rust stores them opaquely: the TypeScript
fold owns their meaning. If downgrade is unsafe, provide a forward fix or an explicit restoration
procedure explaining that restoring an older backup omits later records. Never delete user logs
as part of workflow or package rollback.
