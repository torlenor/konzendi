<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo/konzendi-mark-on-dark.svg">
  <img src="assets/logo/konzendi-mark-on-light.svg" width="80" height="80" alt="Konzendi Threaded Mind logo">
</picture>

# Konzendi

Konzendi is a local desktop application for tracking work topics and context switches. It helps
you record what you work on and review how your day changed, without an account or a backend
service.

## Features

- Start, switch, stop, undo, and correct tracked work.
- Assign stable quick keys and colors to topics.
- Open quick access from any application with **Ctrl+Alt+K**.
- Review entries and a daily timeline with topic totals, switch counts, and longest stretches.
- Store every change as an append-only event in a local JSONL log.
- Use the application offline. It has no external network features.

Analytics describes what the log contains. It does not measure productivity.

## Platform status

Linux on X11 is the supported platform. The release package targets x86_64 Ubuntu 24.04 and
Linux Mint 22. Windows 11 x64 and macOS 15 Apple-silicon packages are available for testing, but
their native walkthroughs are not complete. Wayland is not supported.

All release packages are unsigned. Read the known limitations before installation and verify
the downloaded package with `SHA256SUMS`.

## Local setup

Install Node.js 24 with npm, Rust 1.98, and the native dependencies. On Ubuntu 24.04 or Linux
Mint 22:

```bash
sudo apt update
sudo apt install build-essential pkg-config libwebkit2gtk-4.1-dev libssl-dev librsvg2-dev libayatana-appindicator3-dev patchelf
```

See the [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/#linux) for other
distributions. Then run:

```bash
npm install
npm run tauri dev
```

The first dependency installation and Rust build need internet access. Run the application
through Tauri because the browser-only development server does not provide local persistence.

## Quick access

Press **Ctrl+Alt+K** to open the switcher. Use a topic's number to switch, `s` to stop, `u` to
undo, `K` to open the Konzendi window, or Escape to close quick access. You can change the global
shortcut in the tracking window. The tray menu provides the same main actions.

## Local data and privacy

Konzendi stores its data on the local computer:

| Platform | Data directory |
| --- | --- |
| Linux | `$XDG_DATA_HOME/com.konzendi.app`, or `~/.local/share/com.konzendi.app` |
| Windows | `%APPDATA%\com.konzendi.app` |
| macOS | `~/Library/Application Support/com.konzendi.app` |

`device.json` contains the device identity, and `events/<device-id>.jsonl` contains the event
log. Close Konzendi and copy the complete data directory to make a manual backup. Never attach a
real log to an issue or commit it to the repository.

## Checks

Run the frontend and script checks from the repository root:

```bash
npm run typecheck
npm run lint
npm test
npm run test:scripts
npm run build
```

Run the Rust checks from `src-tauri/`:

```bash
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo test --locked
```

GitHub Actions also builds and checks the Linux, Windows, and macOS packages. See
[`ci.yml`](.github/workflows/ci.yml) and the [release guide](docs/RELEASING.md) for package and
smoke-test details.

## Releases

Each `0.x` version is a public prerelease. The maintainer prepares the changelog and version
locally, pushes an annotated tag, reviews the draft that GitHub creates, and publishes it by
hand. The workflow does not commit, tag, push, or publish.

Use the next version in place of `0.2.1`:

1. Add the changes under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md), including
   `### Compatibility` and `### Known limitations`.
2. Prepare, review, and check the release:

   ```bash
   git switch main
   git pull --ff-only
   npm run release:prepare -- 0.2.1
   git diff
   npm run release:check -- 0.2.1
   ```

3. Commit the files listed by the helper and push `main`:

   ```bash
   git add CHANGELOG.md package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
   git commit -m 'Release 0.2.1'
   git push origin main
   ```

4. Wait for CI on that commit. Then create and push the annotated tag:

   ```bash
   gh run watch "$(gh run list --workflow CI --commit "$(git rev-parse HEAD)" --json databaseId --jq '.[0].databaseId')" --exit-status
   git tag -a v0.2.1 -m 'Release 0.2.1'
   git push origin v0.2.1
   ```

5. Wait for the release workflow. Download the draft assets and verify their checksums before
   you select **Publish release**:

   ```bash
   gh run watch "$(gh run list --workflow Release --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
   gh release download v0.2.1 --repo torlenor/konzendi --dir /tmp/konzendi-0.2.1
   (cd /tmp/konzendi-0.2.1 && sha256sum --check SHA256SUMS)
   ```

The [release guide](docs/RELEASING.md) covers installation, recovery, hotfixes, artifact
retention, and toolchain maintenance.

## Project documentation

- [Roadmap](docs/ROADMAP.md) — product direction and phase status.
- [Open questions](docs/OPEN_QUESTIONS.md) — decisions that are not assigned to a phase.
- [Working rules](AGENTS.md) — repository structure and contribution requirements.
- [Public repository checklist](docs/PUBLIC_RELEASE.md) — GitHub settings and visibility steps.

## Contributing and license

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you open an issue or pull request. Report a
suspected vulnerability through [SECURITY.md](SECURITY.md), not through a public issue.

The source code and documentation use the [MIT License](LICENSE). The Konzendi logo and its
generated exports have separate terms in [assets/logo/RIGHTS.md](assets/logo/RIGHTS.md).
