#!/usr/bin/env bash
# Package smoke test: installs a Konzendi Debian package in a clean Ubuntu 24.04 container,
# then starts the installed application on a private X server with no network. It never
# touches the developer's display or real log. The application data stays in the container.
#
# Usage: scripts/package-smoke.sh PACKAGE.deb [OUTPUT_DIR]
#
# Requires Docker on the host. OUTPUT_DIR (default: ./package-smoke-output) receives
# a screenshot, application logs, package metadata, and result.txt.

set -euo pipefail

# ubuntu:24.04, pinned by index digest. Update together with the runner image.
readonly IMAGE_BASE="ubuntu@sha256:224a1869083a311ef3f13648a154ba79832fbef6364d31493642ca03082da254"
readonly SMOKE_PACKAGES="xvfb xdotool imagemagick dbus-x11 jq"

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
  if [[ $status -eq 0 ]]; then echo "PASS" >/out/result.txt; else echo "FAIL at $STEP" >/out/result.txt; fi
  pgrep -x konzendi | xargs -r kill 2>/dev/null || true
  pgrep -x Xvfb | xargs -r kill 2>/dev/null || true
}

start_app() {
  local w
  dbus-run-session -- /usr/bin/konzendi >"/out/app.log" 2>&1 &
  WINDOW=""
  for _ in $(seq 1 60); do
    if pgrep -x konzendi >/dev/null; then
      w="$(xdotool search --onlyvisible --name '^Konzendi$' 2>/dev/null | tail -1 || true)"
      if [[ -n "$w" ]]; then WINDOW="$w"; break; fi
    fi
    sleep 1
  done
  [[ -n "$WINDOW" ]] || fail "the tracking window did not appear"
  # Let the webview read the log and render.
  sleep 4
}

expect() {
  [[ "$2" == "$3" ]] || fail "$1: expected '$3', got '$2'"
}

inside() {
  trap collect EXIT
  mkdir -p "$HOME"
  export XDG_DATA_HOME="$HOME/data" XDG_CONFIG_HOME="$HOME/config" XDG_CACHE_HOME="$HOME/cache"

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

  STEP="launch"
  start_app
  pgrep -x konzendi >/dev/null || fail "the application exited after launch"
  device="$XDG_DATA_HOME/com.konzendi.app/device.json"
  [[ -s "$device" ]] || fail "the application did not create a device identity"
  jq -e '.id | type == "string" and length > 0' "$device" >/dev/null \
    || fail "the application created an invalid device identity"
  import -window "$WINDOW" /out/launched.png

  STEP="done"
  log "PASS: package metadata, installed files, offline launch, and local identity creation"
}

if [[ "${1:-}" == "--inside" ]]; then
  inside
else
  host "$@"
fi
