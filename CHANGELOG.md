# Changelog

This file records user-visible changes in each Konzendi release. Versions use
`MAJOR.MINOR.PATCH`; every `0.x` release is a prototype prerelease. The release process is in
[docs/RELEASING.md](docs/RELEASING.md).

Write new notes under `## [Unreleased]`, using `### Added`, `### Changed`, `### Fixed`, and
`### Removed` only when needed. Every release entry must also have `### Compatibility` (supported
systems and data compatibility) and `### Known limitations`. `npm run release:prepare` moves the
notes into a dated entry.

The tag `v0.1.0` exists but was never published: a defect in the release workflow was found
while it was being built, and a pushed tag is never moved. The first release is 0.1.1.

## [Unreleased]

### Added

- Quick access now has `K` to open the Konzendi tracking window.

### Changed

- The tray, window, and application package icons now show the Konzendi logo.

### Compatibility

- No event or stored-data format changes.

### Known limitations

- The global shortcut and quick switcher remain X11-only.

## [0.1.1] - 2026-09-13

### Added

- Topic tracking in a desktop window: name a topic and start, switch with one click or with
  the keys 1–9, stop, undo the last entry, and back-date an entry with **adjust**.
- **Entries** lists every recorded entry, including revoked ones, and inserts a missed switch.
  **Topics** renames and archives topics.
- **Analytics** shows one day as a lane per topic, with the time recorded on each topic, the
  number of switches, and the longest uninterrupted stretch.
- Quick access: **Ctrl+Alt+K** opens a small switcher over the current application, and a tray
  icon offers the same actions. The shortcut can be changed in the tracking window.
- Light and dark appearance that follows the system, with a manual override.
- The application draws its own window frame, with a setting to use the desktop's frame instead.
- Every action is appended to a local JSONL event log, and the screen is rebuilt from that log
  on start.

### Compatibility

- Unsigned x86_64 Debian package for Ubuntu 24.04 and Linux Mint 22 under X11. Other
  distributions, Wayland sessions, Windows, and macOS are not supported.
- Data is stored in `~/.local/share/com.konzendi.app`, the same location the development builds
  use. Logs from those builds are read unchanged. There is no earlier packaged release.

### Known limitations

- The global shortcut and the quick switcher need an X11 session.
- There is no synchronization, import, or export; copy the data directory for a backup.
- Recorded sums describe what was logged. They are not a measure of productivity.
- The package is not signed. Checksums detect a damaged download but do not identify the
  publisher.
