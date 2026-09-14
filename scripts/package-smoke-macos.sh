#!/usr/bin/env bash
# Install and restart the macOS trial package with isolated application data.
# The hosted runner has no reliable interactive desktop, so native shortcut, tray, and
# focus checks remain part of the installed-application walkthrough in Phase 11.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 DMG OUTPUT_DIRECTORY" >&2
  exit 2
fi

dmg=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
output=$(mkdir -p "$2" && cd "$2" && pwd)
sandbox="$output/sandbox"
mount="$sandbox/mount"
home="$sandbox/home"
application="$sandbox/Applications/Konzendi.app"
mkdir -p "$mount" "$home" "$(dirname "$application")"

cleanup() {
  if [[ -n "${process_id:-}" ]]; then kill "$process_id" 2>/dev/null || true; fi
  hdiutil detach "$mount" -quiet 2>/dev/null || true
}
trap cleanup EXIT

hdiutil attach "$dmg" -nobrowse -readonly -mountpoint "$mount" -quiet
cp -R "$mount/Konzendi.app" "$application"
hdiutil detach "$mount" -quiet

export HOME="$home"
data="$HOME/Library/Application Support/com.konzendi.app"
device="$data/device.json"
executable="$application/Contents/MacOS/konzendi"

start_and_wait_for_store() {
  "$executable" >"$output/application.log" 2>&1 &
  process_id=$!
  for _ in $(seq 1 40); do
    [[ -f "$device" ]] && break
    sleep 0.25
  done
  [[ -f "$device" ]] || { echo "Konzendi did not create its application data directory." >&2; return 1; }
  sleep 0.5
  kill -0 "$process_id"
  kill "$process_id"
  wait "$process_id" 2>/dev/null || true
  process_id=
}

start_and_wait_for_store
identity=$(cat "$device")
start_and_wait_for_store
[[ $(cat "$device") == "$identity" ]] || { echo "The device identity changed after restart." >&2; exit 1; }
rm -rf "$application"
[[ -f "$device" ]] || { echo "Package removal deleted the event-store identity." >&2; exit 1; }

cat >"$output/macos-smoke.json" <<EOF
{
  "package": "$(basename "$dmg")",
  "data": "$data",
  "identityPreservedAfterRestart": true,
  "dataPreservedAfterRemoval": true
}
EOF
