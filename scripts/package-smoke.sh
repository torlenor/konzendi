#!/usr/bin/env bash
# Package smoke test: installs a Konzendi Debian package in a clean Ubuntu 24.04 container,
# then drives the installed application on a private X server with no network. It never
# touches the developer's display or real log: all data is synthetic and lives in the
# container. See .claude/skills/desktop-testing/SKILL.md for the techniques used.
#
# Usage: scripts/package-smoke.sh PACKAGE.deb [OUTPUT_DIR]
#
# Requires Docker on the host. OUTPUT_DIR (default: ./package-smoke-output) receives
# screenshots, application logs, the synthetic event logs, and result.txt.

set -euo pipefail

# ubuntu:24.04, pinned by index digest. Update together with the runner image.
readonly IMAGE_BASE="ubuntu@sha256:224a1869083a311ef3f13648a154ba79832fbef6364d31493642ca03082da254"
readonly SMOKE_PACKAGES="xvfb xauth xdotool imagemagick dbus-x11 jq"
readonly TOPIC="Smoke topic"

host() {
  local deb="${1:?usage: scripts/package-smoke.sh PACKAGE.deb [OUTPUT_DIR]}"
  local out="${2:-package-smoke-output}"
  local here
  [[ -f "$deb" ]] || { echo "error: no package at $deb" >&2; exit 1; }
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  mkdir -p "$out"
  out="$(cd "$out" && pwd)"
  # The container user writes results here.
  chmod 0777 "$out"

  context="$(mktemp -d)"
  tag="konzendi-package-smoke:$$"
  trap 'rm -rf "$context"; docker image rm -f "$tag" >/dev/null 2>&1 || true' EXIT
  cp "$deb" "$context/konzendi.deb"
  cat >"$context/Dockerfile" <<EOF
FROM $IMAGE_BASE
COPY konzendi.deb /tmp/konzendi.deb
# Installation resolves the package's own runtime dependencies from Ubuntu's archive.
RUN apt-get update \\
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $SMOKE_PACKAGES /tmp/konzendi.deb \\
 && rm -rf /var/lib/apt/lists/*
EOF
  echo "Installing $(basename "$deb") in a clean Ubuntu 24.04 image"
  docker build --quiet --tag "$tag" "$context" >/dev/null

  echo "Running the installed application with no network"
  timeout 600 docker run --rm --network none --user ubuntu \
    --env HOME=/tmp/smoke-home --env EXPECTED_VERSION \
    --volume "$here:/smoke:ro" \
    --volume "$(cd "$here/.." && pwd)/THIRD_PARTY_NOTICES.md:/smoke-notices.md:ro" \
    --volume "$out:/out" \
    "$tag" /smoke/package-smoke.sh --inside
}

# --- Inside the container ----------------------------------------------------------------

export DISPLAY=:99
DATA=""
LOCAL_LOG=""
WINDOW=""
STEP="setup"

log() { printf '[smoke] %s\n' "$*"; }

fail() {
  log "FAILED at step '$STEP': $*"
  exit 1
}

collect() {
  local status=$?
  if [[ -n "$WINDOW" ]]; then import -window "$WINDOW" "/out/final.png" 2>/dev/null || true; fi
  if [[ -d "$DATA/events" ]]; then cp "$DATA"/events/*.jsonl /out/ 2>/dev/null || true; fi
  if [[ $status -eq 0 ]]; then echo "PASS" >/out/result.txt; else echo "FAIL at $STEP" >/out/result.txt; fi
  pgrep -x konzendi | xargs -r kill 2>/dev/null || true
  pgrep -x Xvfb | xargs -r kill 2>/dev/null || true
}

# The webview needs a moment to paint the last change.
shot() { sleep 2; import -window "$WINDOW" "/out/$1.png"; }

start_app() {
  local run="$1" w
  dbus-run-session -- /usr/bin/konzendi >"/out/app-$run.log" 2>&1 &
  WINDOW=""
  for _ in $(seq 1 60); do
    if pgrep -x konzendi >/dev/null; then
      w="$(xdotool search --name '^Konzendi$' 2>/dev/null | while read -r id; do
        xdotool getwindowgeometry "$id" 2>/dev/null | grep -q '800x600' && echo "$id"; done | tail -1 || true)"
      if [[ -n "$w" ]]; then WINDOW="$w"; break; fi
    fi
    sleep 1
  done
  [[ -n "$WINDOW" ]] || fail "the tracking window did not appear"
  # Let the webview read the log and render.
  sleep 4
}

stop_app() {
  pgrep -x konzendi | xargs -r kill
  for _ in $(seq 1 20); do
    pgrep -x konzendi >/dev/null || { WINDOW=""; sleep 1; return; }
    sleep 0.5
  done
  fail "the application did not exit"
}

click() {
  xdotool mousemove --window "$WINDOW" "$1" "$2" click 1
  sleep 2
}

device_id() { jq -r .id "$DATA/device.json"; }

count() { if [[ -f "$LOCAL_LOG" ]]; then wc -l <"$LOCAL_LOG"; else echo 0; fi; }

wait_events() {
  for _ in $(seq 1 40); do
    [[ "$(count)" -ge "$1" ]] && break
    sleep 0.5
  done
  [[ "$(count)" -eq "$1" ]] || fail "expected $1 events in the local log, found $(count)"
}

event() { sed -n "${1}p" "$LOCAL_LOG" | jq -r "$2"; }

expect() {
  [[ "$2" == "$3" ]] || fail "$1: expected '$3', got '$2'"
}

inside() {
  trap collect EXIT
  mkdir -p "$HOME"
  export XDG_DATA_HOME="$HOME/data" XDG_CONFIG_HOME="$HOME/config" XDG_CACHE_HOME="$HOME/cache"
  DATA="$XDG_DATA_HOME/com.konzendi.app"

  STEP="package"
  dpkg-query -W -f='${Package} ${Version} ${Architecture} ${Maintainer}\n' konzendi | tee /out/package.txt
  read -r name version arch maintainer <<<"$(dpkg-query -W -f='${Package} ${Version} ${Architecture} ${Maintainer}' konzendi)"
  expect "package name" "$name" "konzendi"
  expect "architecture" "$arch" "amd64"
  expect "maintainer" "$maintainer" "torlenor"
  [[ -z "${EXPECTED_VERSION:-}" ]] || expect "version" "$version" "$EXPECTED_VERSION"
  [[ -x /usr/bin/konzendi ]] || fail "/usr/bin/konzendi is missing"
  [[ -f /usr/share/applications/Konzendi.desktop ]] || fail "desktop entry is missing"
  cmp -s /usr/share/doc/konzendi/THIRD_PARTY_NOTICES.md /smoke-notices.md \
    || fail "/usr/share/doc/konzendi/THIRD_PARTY_NOTICES.md is missing or differs from the repository"

  STEP="offline"
  interfaces="$(ls /sys/class/net)"
  expect "network interfaces" "$interfaces" "lo"

  STEP="display"
  Xvfb :99 -screen 0 1024x768x24 -nolisten tcp >/out/xvfb.log 2>&1 &
  for _ in $(seq 1 20); do xdotool getdisplaygeometry >/dev/null 2>&1 && break; sleep 0.5; done
  xdotool getdisplaygeometry >/dev/null || fail "Xvfb did not start"

  STEP="first run"
  start_app 1
  LOCAL_LOG="$DATA/events/$(device_id).jsonl"
  shot 01-first-run
  xdotool windowfocus "$WINDOW"
  sleep 1
  xdotool type --delay 40 "$TOPIC"
  xdotool key Return
  wait_events 2
  expect "event 1" "$(event 1 .kind)" "topic.created"
  expect "topic name" "$(event 1 .payload.name)" "$TOPIC"
  expect "event 2" "$(event 2 .kind)" "focus.started"
  topic="$(event 1 .payload.topicId)"
  expect "started topic" "$(event 2 .payload.topicId)" "$topic"
  shot 02-running

  STEP="correct"
  click 177 202 # adjust
  click 115 251 # −15m
  wait_events 3
  expect "event 3" "$(event 3 .kind)" "entry.retimed"
  expect "retimed entry" "$(event 3 .payload.targetId)" "$(event 2 .id)"
  shifted="$(jq -n --arg a "$(event 2 .payload.effectiveAt)" --arg b "$(event 3 .payload.effectiveAt)" \
    '($a | sub("\\.[0-9]+Z$"; "Z") | fromdate) - ($b | sub("\\.[0-9]+Z$"; "Z") | fromdate)')"
  expect "back-dated seconds" "$shifted" "900"

  STEP="stop"
  click 88 466 # ■ Stop
  wait_events 4
  expect "event 4" "$(event 4 .kind)" "focus.paused"
  shot 03-stopped

  STEP="restart"
  stop_app
  identity="$(sha256sum "$DATA/device.json")"
  before="$(sha256sum "$LOCAL_LOG")"
  start_app 2
  shot 04-restarted
  expect "device identity after restart" "$(sha256sum "$DATA/device.json")" "$identity"
  expect "log after restart" "$(sha256sum "$LOCAL_LOG")" "$before"
  # Resume exists only if the stopped state and its topic were rebuilt from the log.
  click 147 466 # ▶ Resume Smoke topic
  wait_events 5
  expect "event 5" "$(event 5 .kind)" "focus.started"
  expect "resumed topic" "$(event 5 .payload.topicId)" "$topic"
  shot 05-resumed

  STEP="prototype log"
  stop_app
  fixture="$DATA/events/0b9d6c1a-2f4e-4d7b-8c3a-000000000001.jsonl"
  cp /smoke/fixtures/prototype-device.jsonl "$fixture"
  fixture_hash="$(sha256sum "$fixture")"
  start_app 3
  shot 06-with-prototype-log
  xdotool windowfocus "$WINDOW"
  sleep 1
  # The fixture topic was created first, so it holds key 1.
  xdotool key 1
  wait_events 6
  expect "event 6" "$(event 6 .kind)" "focus.started"
  expect "switched to fixture topic" "$(event 6 .payload.topicId)" "3c7e9f2a-5b1d-4e8c-a6f0-000000000001"
  expect "fixture log unchanged" "$(sha256sum "$fixture")" "$fixture_hash"
  expect "device identity with fixture" "$(sha256sum "$DATA/device.json")" "$identity"
  shot 07-fixture-topic
  stop_app

  STEP="done"
  log "PASS: install, first run, correction, stop, restart persistence, and prototype log, offline"
}

if [[ "${1:-}" == "--inside" ]]; then
  inside
else
  host "$@"
fi
