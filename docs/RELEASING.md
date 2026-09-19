# Releasing Konzendi

This guide is the operating manual for releases. The short sequence is in the
[README](../README.md#releases). The decisions behind it, and their rationale, are in
[Phase 7](phases/phase-7-releases-ci-cd.md#decisions-and-evidence).
The Windows and macOS extension is in
[Phase 11](phases/phase-11-windows-macos.md#decisions-and-evidence).

## Policy in brief

- Releases are public GitHub prereleases of `torlenor/konzendi`.
- Each release has six assets: `konzendi_VERSION_amd64.deb`,
  `Konzendi_VERSION_x64-setup.exe`, `Konzendi_VERSION_aarch64.dmg`, `SHA256SUMS`,
  `release-manifest.json`, and `THIRD_PARTY_NOTICES.md`. All packages are unsigned. The Linux
  package targets x86_64 Ubuntu 24.04 and Linux Mint 22 under X11. The other packages target
  Windows 11 x64 and macOS 15 on Apple silicon as experimental Phase 11 artifacts. Their native
  interactive acceptance is not complete.
- Versions are `MAJOR.MINOR.PATCH` with no prefix or suffix. Tags are `vMAJOR.MINOR.PATCH`,
  annotated. Every `0.x` release is a GitHub prerelease.
- The maintainer prepares the version and changelog locally and pushes a tag. GitHub builds a
  draft. The maintainer reviews the draft and publishes it by hand. No workflow commits, tags,
  pushes, or publishes.
- `SHA256SUMS` detects a damaged download. It does not prove who built the package.

## What runs where

| Workflow | Trigger | Jobs | Writes |
| --- | --- | --- | --- |
| [`ci.yml`](../.github/workflows/ci.yml) | Pull requests, pushes to `main` | `frontend`, `rust`, three native package jobs, `release-assets` | Caches, only on pushes to `main` |
| [`release.yml`](../.github/workflows/release.yml) | A pushed `v*` tag | `validate`, `checks` (calls `ci.yml`), `draft release` | One draft release and its assets |

- **frontend:** version agreement, release script tests, typecheck, lint, Vitest, and the
  frontend build.
- **rust:** `cargo fmt --check`, `cargo clippy --locked -- -D warnings`, `cargo test --locked`.
- **package-smoke:** third-party notice check, `npm run tauri build -- --ci --bundles deb --
  --locked`, and [`scripts/package-smoke.sh`](../scripts/package-smoke.sh).
  The smoke test installs the package in a clean Ubuntu 24.04 container, then runs it with no
  network on a private X server. It checks package metadata, installed files, a visible window,
  and local identity creation. A screenshot and logs are kept as the `smoke-evidence` artifact.
- **windows-package:** native x64 NSIS build on `windows-2025`, then a current-user install,
  start, restart, identity check, removal, and data-preservation check with isolated data.
- **macos-package:** native Apple-silicon DMG build on `macos-15`, then a copied-app start,
  restart, identity check, removal, and data-preservation check with isolated data.
- **release-assets:** downloads the three checked packages, normalizes their names, records
  their targets and hashes, and creates the combined checksum-covered artifact.

`validate` refuses the release before anything is built when the tag was not pushed and
started by `torlenor`, is not an annotated `vMAJOR.MINOR.PATCH` tag, has moved, points to a
commit that is not on `main`, belongs to a published release, or is not higher than every
published version. It then runs `npm run release:check` for the tag's version on the tagged
commit. Only the `draft release` job has `contents: write`, and it checks the actors again.

The `main` branch ruleset must require these checks after the repository becomes public. Until
the rule is active, merging only with green checks is a maintainer convention. The release
workflow enforces its own checks.

## Repository and release settings

1. Install and sign in to the GitHub CLI: `gh auth login`.
2. Confirm Actions are enabled for the repository and the default workflow token is read-only
   (Settings → Actions → General). The workflows request the permissions they need.
3. Complete the [public repository checklist](PUBLIC_RELEASE.md), including the branch ruleset
   and security settings.

No personal access token, signing key, or repository secret is used.

## Normal release

The example releases `0.1.2`. Use the real version.

### 1. Write the notes

Add user-visible changes under `## [Unreleased]` in [`CHANGELOG.md`](../CHANGELOG.md), using
`### Added`, `### Changed`, `### Fixed`, and `### Removed` only when needed. Every release also
needs `### Compatibility` (supported systems and data compatibility) and
`### Known limitations`. Describe behavior that exists, not planned work. Commit the notes
through a normal pull request, or edit them during preparation.

### 2. Prepare on main

```bash
git switch main
git pull --ff-only
npm run release:prepare -- 0.1.2
```

The helper refuses to run outside `main`, with uncommitted changes to a version file, with an
invalid or non-increasing version, with incomplete Unreleased notes, or when the version already
has a changelog entry. It checks everything before it writes. It then:

- writes the version to `package.json`, the root entries of `package-lock.json`,
  `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and the `konzendi` entry of
  `src-tauri/Cargo.lock`, without changing any dependency;
- moves the Unreleased notes into `## [0.1.2] - YYYY-MM-DD` (UTC date) and leaves an empty
  `## [Unreleased]` heading;
- prints the changed files and the next commands.

It never stages, commits, tags, pushes, or publishes. Other uncommitted work is left alone.
When the version already equals the current unreleased version, as for a first release,
only the changelog changes.

### 3. Review and commit

```bash
git diff
npm run release:check -- 0.1.2
git add CHANGELOG.md package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m 'Release 0.1.2'
git push origin main
```

Add only the files the helper listed. Do not use `git add .`.

### 4. Wait for CI on that commit

```bash
gh run list --workflow CI --branch main --limit 3
gh run watch <run-id> --exit-status
```

Continue only when all native package and combined asset jobs pass for the release commit. Then
confirm the local state:

```bash
git fetch origin
test -z "$(git status --porcelain)" && echo "clean worktree"
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" && echo "HEAD is the checked commit"
gh run list --workflow CI --commit "$(git rev-parse HEAD)" --json conclusion --jq '.[0].conclusion'  # success
```

### 5. Tag and push the tag

```bash
git tag -a v0.1.2 -m 'Release 0.1.2'
git push origin v0.1.2
```

A tag that exists only locally does nothing. Pushing it starts the release workflow. The
workflow file must already be on `main` in the tagged commit.

### 6. Review the draft and publish

```bash
gh run list --workflow Release --limit 1
gh run watch <run-id> --exit-status
```

The run summary of the `draft release` job links to the draft. The draft is also listed under
**Releases** on GitHub. Its title is `Konzendi 0.1.2` when it is complete; a title that says
*incomplete draft, do not publish* means the run did not finish.

Before publishing, check the draft:

```bash
gh api repos/torlenor/konzendi/releases --jq '.[] | select(.draft) | .name + " " + .tag_name'   # Konzendi 0.1.2 v0.1.2
mkdir -p /tmp/konzendi-0.1.2 && cd /tmp/konzendi-0.1.2
gh release download v0.1.2 --repo torlenor/konzendi
sha256sum --check SHA256SUMS
jq '{version, tag, source, workflow, packages}' release-manifest.json   # tag, commit, targets, and hashes match
```

The draft must name the tag `v0.1.2`, not `untagged-…`. (The draft's web address contains
`untagged-…` for every draft; that is normal. Check the tag name, not the address.) GitHub detaches a draft from its tag
when an API update leaves out `tag_name`; the workflow always sends it and refuses to report a
detached draft as ready. If a draft shows `untagged-…`, re-run the `draft release` job, which
finds the draft by a hidden marker in its notes and attaches it again. Do not publish a
detached draft.

Read the notes, then open the draft on GitHub, select **Edit**, check that the tag field shows
`v0.1.2`, and select **Publish release**. The release stays a prerelease for `0.x` versions.

## Manual preparation

The helper is optional. To prepare by hand, make the same edits and let the checker confirm
them before committing:

1. Set the version in `package.json` (`"version"`), in `package-lock.json` (the top-level
   `"version"` and `packages[""].version`), in `src-tauri/tauri.conf.json` (`"version"`), in
   `src-tauri/Cargo.toml` (`[package]` `version`), and in `src-tauri/Cargo.lock` (the
   `[[package]]` entry with `name = "konzendi"`). Change nothing else.
2. In `CHANGELOG.md`, insert `## [0.1.2] - YYYY-MM-DD` below `## [Unreleased]`, move the notes
   under it, and keep the `## [Unreleased]` heading. Entries stay in descending version order.
3. Run `npm run release:check -- 0.1.2`, then continue with [Review and commit](#3-review-and-commit).

## Hotfix

There is no separate hotfix branch. Merge the fix to `main`, add notes under Unreleased, and
release the next patch version with the normal steps. Never move a tag or replace the assets of
a published release. To warn about a broken release, edit its notes:

```bash
gh release view v0.1.2 --repo torlenor/konzendi --json body --jq .body > notes.md
# Add at the top: "> [!CAUTION]\n> Do not install 0.1.2: <reason>. Use 0.1.3."
gh release edit v0.1.2 --repo torlenor/konzendi --notes-file notes.md
```

Delete a published release only if its package must not be downloaded at all. Keep the tag, so
the version is not reused.

## Failure recovery

Re-run from the run page (**Re-run failed jobs** or **Re-run all jobs**) or with
`gh run rerun <run-id> [--failed]`. A re-run uses the same tag and commit. It never needs a new
commit or tag.

| Symptom | Cause | Action |
| --- | --- | --- |
| `validate` fails: not a release tag, lightweight tag, not on `main`, versions or changelog do not match | Wrong tag or unprepared commit | Nothing was built. Fix the source through `main` and release a **new** version. Do not re-point the tag. The unused tag may be deleted: `git push origin :refs/tags/vX.Y.Z` and `git tag -d vX.Y.Z`. Do not reuse its version. |
| `validate` fails: already published, or not higher than a published version | The version was released before | Release a higher version. The published release was not touched. |
| `validate` or `draft release` fails: the tag now points to another commit | Someone moved the tag during the run | Stop. Restore the tag to the checked commit if it was an accident, or release a new version. |
| A job fails for a runner or network reason | Transient | **Re-run failed jobs**. |
| `package-smoke` fails | The package does not install or launch offline | Download `smoke-evidence` (screenshot and logs) and fix the problem on `main`. Release a new version. |
| `windows-package` or `macos-package` fails | A native build, install, restart, removal, or persistence probe failed | Download that platform's smoke evidence. Fix the problem on `main` and release a new version. |
| `release-assets` fails | A native package is missing or the combined checksums do not match | Re-run the failed native job for a transient artifact failure. Fix source defects on `main` and use a new version. |
| `draft release` fails after some uploads | Upload interrupted | **Re-run failed jobs**. Matching assets are kept, missing ones uploaded, and the draft is verified again. The draft title says *incomplete* until then. |
| Two drafts exist for the tag | A draft was duplicated, for example by an older workflow version | Nothing was changed. Delete the extra draft by its id, keeping the tag: `gh api -X DELETE repos/torlenor/konzendi/releases/<id>`. Then re-run the `draft release` job. |
| `draft release` reports conflicting assets | A draft asset differs from the checked build | Nothing was overwritten. Delete only the draft, keeping the tag: `gh release delete vX.Y.Z --repo torlenor/konzendi --yes`. Then **Re-run failed jobs**. |
| `draft release` cannot download `release-assets` | The 30-day handoff expired | **Re-run all jobs**. The same commit is checked and built again. A rebuilt package can differ byte for byte, so if a draft with assets from the earlier build exists, delete that draft first (keep the tag). |
| `validate` fails with *only torlenor may release* | Another account pushed the tag or started the re-run | Expected. The owner decides whether to release. |

For rehearsals, the repository variable `RELEASE_FAULT` injects failures into tag runs only:
`build` fails `package-smoke` before the build, and `upload` fails `draft release` after its
first upload. Set it with `gh variable set RELEASE_FAULT --body upload` and always remove it
afterwards with `gh variable delete RELEASE_FAULT`.

## Data compatibility, upgrade, and downgrade

- Close Konzendi and back up its data directory before installing any version:
  `%APPDATA%\com.konzendi.app` on Windows, `~/Library/Application Support/com.konzendi.app` on
  macOS, or `~/.local/share/com.konzendi.app` on the supported Linux systems.
- The identifier `com.konzendi.app` decides the data location. Changing it needs an explicit
  migration in a planned phase.
- Rust stores event kinds without interpreting them, but the interface decides what they mean.
  An older version may ignore or misread event kinds added later, so do not assume a downgrade
  is safe. Each release notes its data compatibility under `### Compatibility`.
- To go back after a bad upgrade: close Konzendi, install the older package with
  `sudo apt install --allow-downgrades ./konzendi_OLD_amd64.deb`, and restore the backup.
  Restoring a backup loses the events recorded after it was made.
- On Windows, remove the current package through **Installed apps**, install the older NSIS
  package, and restore the backup only when its release notes allow it. On macOS, delete the
  current `Konzendi.app`, copy the older one from its DMG, and apply the same compatibility rule.
- Workflows and package removal never delete user data. `apt remove konzendi`, the NSIS
  uninstaller, and deletion of `Konzendi.app` leave the platform data directory in place.

## Artifacts and retention

| Item | Where | Kept |
| --- | --- | --- |
| Platform package inputs and combined `package` artifact | Actions artifact | 7 days |
| Linux, Windows, and macOS smoke evidence | Actions artifact | 7 days |
| `release-assets` (handoff from `checks` to `draft release`) | Actions artifact | 30 days |
| Release assets | GitHub release | Until the maintainer removes them |

## Maintenance

Pinned versions and where they live:

| What | Where |
| --- | --- |
| Node.js, npm, Rust, cargo-about version and SHA-256 | `env` in `.github/workflows/ci.yml`; Node.js also in `release.yml` |
| Third-party actions (full commit SHA, version in a comment) | `uses:` lines in both workflows |
| Ubuntu image for the smoke test (index digest) | `IMAGE_BASE` in `scripts/package-smoke.sh` |
| Runner images | `runs-on: ubuntu-24.04`, `windows-2025`, and `macos-15` in `ci.yml` |
| Native build packages | `NATIVE_PACKAGES` in `ci.yml` and the README setup command |

To move an action to a new release, resolve its tag to a commit and replace the SHA and comment
in every `uses:` line:

```bash
tag=$(gh api repos/actions/checkout/releases/latest --jq .tag_name)
gh api "repos/actions/checkout/git/ref/tags/$tag" --jq '.object.type + " " + .object.sha'
# For type "tag", resolve once more: gh api repos/actions/checkout/git/tags/<sha> --jq .object.sha
```

To resolve a new Ubuntu image digest: `docker buildx imagetools inspect ubuntu:24.04`.

When `package-lock.json` or `src-tauri/Cargo.lock` changes, regenerate the notices, or the
`package-smoke` job fails:

```bash
(cd src-tauri && cargo fetch --locked)
CARGO_ABOUT=/path/to/cargo-about npm run notices
```

Use the cargo-about version pinned in `ci.yml`
([releases](https://github.com/EmbarkStudios/cargo-about/releases)). A crate with a licence
that is not listed in `src-tauri/about.toml` stops generation until the licence is reviewed.

Run the package smoke test locally after a packaging or startup change:

```bash
npm run tauri build -- --bundles deb
scripts/package-smoke.sh src-tauri/target/release/bundle/deb/Konzendi_*_amd64.deb /tmp/konzendi-smoke
```

It needs Docker. It uses isolated data inside the container and never touches the local display
or the real log. The smoke test does not exercise tracking behavior. Use the automated tests and
the supported-platform walkthroughs for that behavior.
