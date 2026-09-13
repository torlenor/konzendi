# Releasing Konzendi

This guide is the operating manual for releases. The short sequence is in the
[README](../README.md#releases). The decisions behind it, and their rationale, are in
[Phase 7](phases/phase-7-releases-ci-cd.md#decisions-and-evidence).

## Policy in brief

- Releases are private GitHub releases of `torlenor/konzendi`. Only repository readers can
  download them.
- Each release has four assets: `konzendi_VERSION_amd64.deb`, `SHA256SUMS`,
  `release-manifest.json`, and `THIRD_PARTY_NOTICES.md`. The package is unsigned and
  targets x86_64 Ubuntu 24.04 and Linux Mint 22 under X11.
- Versions are `MAJOR.MINOR.PATCH` with no prefix or suffix. Tags are `vMAJOR.MINOR.PATCH`,
  annotated. Every `0.x` release is a GitHub prerelease.
- The maintainer prepares the version and changelog locally and pushes a tag. GitHub builds a
  draft. The maintainer reviews the draft and publishes it by hand. No workflow commits, tags,
  pushes, or publishes.
- `SHA256SUMS` detects a damaged download. It does not prove who built the package.

## What runs where

| Workflow | Trigger | Jobs | Writes |
| --- | --- | --- | --- |
| [`ci.yml`](../.github/workflows/ci.yml) | Pull requests, pushes to `main` | `frontend`, `rust`, `package-smoke` | Caches, only on pushes to `main` |
| [`release.yml`](../.github/workflows/release.yml) | A pushed `v*` tag | `validate`, `checks` (calls `ci.yml`), `draft release` | One draft release and its assets |

- **frontend:** version agreement, release script tests, typecheck, lint, Vitest, and the
  frontend build.
- **rust:** `cargo fmt --check`, `cargo clippy --locked -- -D warnings`, `cargo test --locked`.
- **package-smoke:** third-party notice check, `npm run tauri build -- --ci --bundles deb --
  --locked`, asset collection, and [`scripts/package-smoke.sh`](../scripts/package-smoke.sh).
  The smoke test installs the package in a clean Ubuntu 24.04 container, then runs it with no
  network on a private X server with synthetic data: first run, back-dating, stop, restart
  persistence, and a log in the prototype format. Screenshots and logs are kept as the
  `smoke-evidence` artifact.

`validate` refuses the release before anything is built when the tag was not pushed and
started by `torlenor`, is not an annotated `vMAJOR.MINOR.PATCH` tag, has moved, points to a
commit that is not on `main`, belongs to a published release, or is not higher than every
published version. It then runs `npm run release:check` for the tag's version on the tagged
commit. Only the `draft release` job has `contents: write`, and it checks the actors again.

GitHub does not enforce these checks before a merge: branch protection and rulesets are not
available for this private repository on the current plan. Merging only with green checks is a
maintainer convention. The release workflow enforces its own checks.

## Before the first release

1. Install and sign in to the GitHub CLI: `gh auth login`.
2. In the GitHub account settings, confirm the remaining Actions minutes for private
   repositories and set a budget that stops usage at the limit
   ([budgets](https://docs.github.com/en/billing/how-tos/set-up-budgets)). A full release run
   uses roughly 20–30 runner minutes. If the allowance is exhausted, delivery stops; do not
   skip checks to save minutes.
3. Confirm Actions are enabled for the repository and the default workflow token is read-only
   (Settings → Actions → General). The workflows request the permissions they need.

No personal access token, signing key, or repository secret is used.

## Normal release

The example releases `0.1.1`. Use the real version.

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
npm run release:prepare -- 0.1.1
```

The helper refuses to run outside `main`, with uncommitted changes to a version file, with an
invalid or non-increasing version, with incomplete Unreleased notes, or when the version already
has a changelog entry. It checks everything before it writes. It then:

- writes the version to `package.json`, the root entries of `package-lock.json`,
  `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and the `konzendi` entry of
  `src-tauri/Cargo.lock`, without changing any dependency;
- moves the Unreleased notes into `## [0.1.1] - YYYY-MM-DD` (UTC date) and leaves an empty
  `## [Unreleased]` heading;
- prints the changed files and the next commands.

It never stages, commits, tags, pushes, or publishes. Other uncommitted work is left alone.
When the version already equals the current unreleased version (the first release, `0.1.0`),
only the changelog changes.

### 3. Review and commit

```bash
git diff
npm run release:check -- 0.1.1
git add CHANGELOG.md package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m 'Release 0.1.1'
git push origin main
```

Add only the files the helper listed. Do not use `git add .`.

### 4. Wait for CI on that commit

```bash
gh run list --workflow CI --branch main --limit 3
gh run watch <run-id> --exit-status
```

Continue only when all three jobs pass for the release commit. Then confirm the local state:

```bash
git fetch origin
test -z "$(git status --porcelain)" && echo "clean worktree"
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" && echo "HEAD is the checked commit"
gh run list --workflow CI --commit "$(git rev-parse HEAD)" --json conclusion --jq '.[0].conclusion'  # success
```

### 5. Tag and push the tag

```bash
git tag -a v0.1.1 -m 'Release 0.1.1'
git push origin v0.1.1
```

A tag that exists only locally does nothing. Pushing it starts the release workflow. The
workflow file must already be on `main` in the tagged commit.

### 6. Review the draft and publish

```bash
gh run list --workflow Release --limit 1
gh run watch <run-id> --exit-status
```

The run summary of the `draft release` job links to the draft. The draft is also listed under
**Releases** on GitHub. Its title is `Konzendi 0.1.1` when it is complete; a title that says
*incomplete draft, do not publish* means the run did not finish.

Before publishing, check the draft:

```bash
gh api repos/torlenor/konzendi/releases --jq '.[] | select(.draft) | .name + " " + .tag_name'   # Konzendi 0.1.1 v0.1.1
mkdir -p /tmp/konzendi-0.1.1 && cd /tmp/konzendi-0.1.1
gh release download v0.1.1 --repo torlenor/konzendi
sha256sum --check SHA256SUMS
jq '{version, tag, source, workflow}' release-manifest.json   # tag and commit match
```

The draft must name the tag `v0.1.1`, not `untagged-…`. GitHub detaches a draft from its tag
when an API update leaves out `tag_name`; the workflow always sends it and refuses to report a
detached draft as ready. If a draft shows `untagged-…`, re-run the `draft release` job, which
finds the draft by a hidden marker in its notes and attaches it again. Do not publish a
detached draft.

Read the notes, then open the draft on GitHub, select **Edit**, check that the tag field shows
`v0.1.1`, and select **Publish release**. The release stays a prerelease for `0.x` versions.

## Manual preparation

The helper is optional. To prepare by hand, make the same edits and let the checker confirm
them before committing:

1. Set the version in `package.json` (`"version"`), in `package-lock.json` (the top-level
   `"version"` and `packages[""].version`), in `src-tauri/tauri.conf.json` (`"version"`), in
   `src-tauri/Cargo.toml` (`[package]` `version`), and in `src-tauri/Cargo.lock` (the
   `[[package]]` entry with `name = "konzendi"`). Change nothing else.
2. In `CHANGELOG.md`, insert `## [0.1.1] - YYYY-MM-DD` below `## [Unreleased]`, move the notes
   under it, and keep the `## [Unreleased]` heading. Entries stay in descending version order.
3. Run `npm run release:check -- 0.1.1`, then continue with [Review and commit](#3-review-and-commit).

## Hotfix

There is no separate hotfix branch. Merge the fix to `main`, add notes under Unreleased, and
release the next patch version with the normal steps. Never move a tag or replace the assets of
a published release. To warn about a broken release, edit its notes:

```bash
gh release view v0.1.1 --repo torlenor/konzendi --json body --jq .body > notes.md
# Add at the top: "> [!CAUTION]\n> Do not install 0.1.1: <reason>. Use 0.1.2."
gh release edit v0.1.1 --repo torlenor/konzendi --notes-file notes.md
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
| `package-smoke` fails | The package does not work | Download `smoke-evidence` (screenshots, logs, synthetic events) and fix the problem on `main`. Release a new version. |
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

- Close Konzendi and back up `~/.local/share/com.konzendi.app` before installing any version.
- The identifier `com.konzendi.app` decides the data location. Changing it needs an explicit
  migration in a planned phase.
- Rust stores event kinds without interpreting them, but the interface decides what they mean.
  An older version may ignore or misread event kinds added later, so do not assume a downgrade
  is safe. Each release notes its data compatibility under `### Compatibility`.
- To go back after a bad upgrade: close Konzendi, install the older package with
  `sudo apt install --allow-downgrades ./konzendi_OLD_amd64.deb`, and restore the backup.
  Restoring a backup loses the events recorded after it was made.
- Workflows and package removal never delete user data. `apt remove konzendi` leaves the data
  directory in place.

## Artifacts and retention

| Item | Where | Kept |
| --- | --- | --- |
| `package` (CI package build) | Actions artifact | 7 days |
| `smoke-evidence` | Actions artifact | 7 days |
| `release-assets` (handoff from `checks` to `draft release`) | Actions artifact | 30 days |
| Release assets | GitHub release | Until the maintainer removes them |

## Maintenance

Pinned versions and where they live:

| What | Where |
| --- | --- |
| Node.js, npm, Rust, cargo-about version and SHA-256 | `env` in `.github/workflows/ci.yml`; Node.js also in `release.yml` |
| Third-party actions (full commit SHA, version in a comment) | `uses:` lines in both workflows |
| Ubuntu image for the smoke test (index digest) | `IMAGE_BASE` in `scripts/package-smoke.sh` |
| Runner image | `runs-on: ubuntu-24.04` in both workflows |
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

The smoke test clicks fixed window positions in the 800×600 tracking window. When the tracking
screen layout changes, run it locally and update the coordinates:

```bash
npm run tauri build -- --bundles deb
scripts/package-smoke.sh src-tauri/target/release/bundle/deb/Konzendi_*_amd64.deb /tmp/konzendi-smoke
```

It needs Docker, uses only synthetic data inside the container, and never touches the local
display or the real log.
