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
- Private trial packages are prepared for Windows 11 x64 and macOS 15 on Apple silicon. The
  release remains a prototype and needs native installed-application verification.
- In Topics, you can give a topic a quick key from 1 to 9. The key selects the topic in the
  tracking window and in quick access, and it stays the same when you switch, rename, or add
  topics.
- In Topics, you can give a topic a color. It shows next to the topic name and fills the
  topic's bars in Analytics.

### Changed

- The number keys no longer follow the order of the topics. Only topics with a quick key have a
  number; all other topics are under **Other topics** in the tracking window and in quick
  access. Existing topics start without a key.
- The tray, window, and application package icons now show the Konzendi logo.
- The title bar stays at the top of the window, and only the content below it scrolls. In a
  narrow window the bar uses two rows, so no control is cut off. The window cannot be made
  smaller than 480×320.
- A storage failure now shows a persistent warning that tells the user to stop tracking and
  preserve the application data directory.

### Fixed

- Windows now registers the event store before a webview can read it. The application reads
  saved data on start and keeps new records after a restart.

### Compatibility

- The log has two new event kinds, `topic.quick-key-set` and `topic.color-set`. No existing
  records are changed. An older build ignores these events, so it shows its old number keys
  and no topic colors.

### Known limitations

- Windows and macOS packages are unsigned. Windows can show a SmartScreen warning. macOS needs
  approval in Privacy & Security before the application can open.
- Windows and macOS shortcut, tray, focus, and persistence behavior still needs native
  installed-application verification before those packages are supported trial downloads.
- On Linux, the global shortcut and quick switcher remain X11-only.
- The tray menu and the topic list in **Add a missed switch** do not show topic colors.
- On some desktops the scrollbar shows only while you scroll, so it is not always visible that
  a view continues below the window.

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
