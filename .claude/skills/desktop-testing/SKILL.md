---
name: desktop-testing
description: Run and inspect the Konzendi Tauri window headlessly on a private X server — screenshots, keyboard and mouse input, colour sampling, and offline checks — without touching the developer's real desktop. Use when verifying UI changes, theme or contrast work, or any acceptance check that says it must be seen in the running application.
---

# Testing the desktop application

The frontend can be opened in a browser, but persistence and the real window size only exist in
the Tauri shell, and several acceptance checks say so explicitly. Drive the app on a private
X server instead of the developer's session.

## Why not the real display

`DISPLAY=:0` is the developer's desktop. Driving it with `xdotool` steals focus and types into
whatever happens to be focused, and screenshots capture their windows. Always use `:99`.

## Set up

```bash
Xvfb :99 -screen 0 1024x768x24 -nolisten tcp &   # background it
DISPLAY=:99 xdpyinfo | grep dimensions            # confirm it is up
DISPLAY=:99 npm run tauri dev &                   # background it
```

There is no window manager on `:99`. Windows still map and render; use `xdotool windowfocus`
rather than `windowactivate`, which needs a WM.

## Find the window

`xdotool search` matches several windows, including a 10x10 helper. Select by geometry:

```bash
export DISPLAY=:99
W=$(xdotool search --name "^Konzendi$" | while read w; do
      xdotool getwindowgeometry $w | grep -q "800x600" && echo $w; done | head -1)
```

## Screenshot and inspect

```bash
import -window $W shot.png          # ImageMagick, window-relative
```

Read the PNG back with the Read tool to look at it. To assert a colour rather than eyeball it:

```bash
python3 -c "
from PIL import Image
print(Image.open('shot.png').convert('RGB').getpixel((400,580)))"
```

Compare two renders objectively with `compare -metric AE a.png b.png null:`, cropping to regions
that should be identical — a clock that ticks will always differ.

## Input

`xdotool key --window $W` uses `XSendEvent` and WebKit ignores it. Focus the window first, then
send events through XTEST:

```bash
xdotool windowfocus $W; sleep 1
xdotool key 1                          # switch to topic 1
xdotool mousemove --window $W 710 37 click 1   # window-relative coordinates
xdotool key Down; xdotool key Return   # drive a native <select>
```

Give the webview a second or two after each action before capturing; screenshots taken
immediately catch the previous frame. Digits 1-9 switch topics, so avoid them unless that is
what you want.

## Checking colour scheme behaviour

`prefers-color-scheme` reaches WebKitGTK from the desktop session over D-Bus. `GTK_THEME`,
`gtk-application-prefer-dark-theme` in a `settings.ini`, and
`org.gnome.desktop.interface color-scheme` all had no effect when measured — do not use them as
levers. What does change the result is whether the session bus is reachable: without it the
webview falls back to light.

## Offline verification

The dev binary loads from the Vite server, so it is not an offline test. Build the standalone
binary and run it with no network at all:

```bash
npm run build && npm run tauri build -- --debug --no-bundle
DISPLAY=:99 unshare -rn -- ./src-tauri/target/debug/konzendi &
```

`tauri build --debug` writes to the same path as the dev binary, so a later `tauri dev` will
overwrite it. Note that `unshare -rn` also cuts the session bus, so the window renders light
regardless of the desktop setting.

## Data

The app reads `~/.local/share/com.konzendi.app/events/*.jsonl`, which is the developer's real
log. Clicking records events into it. Ask before exercising flows that append, or back the
directory up first. Reading, switching views, and opening panels are safe; Save, Add, Undo, and
topic switches are not.

## Cleaning up

```bash
pgrep -x konzendi | xargs -r kill
pgrep -x Xvfb | xargs -r kill
```

Never use `pkill -f` with a pattern like `konzendi` or `vite`: the pattern matches the command
line of the shell running it, so the call kills its own session and the tool reports exit 144 or
143. Match on the exact process name with `pgrep -x`, or find the process by port:

```bash
ss -lptnH 'sport = :1420' | grep -oP 'pid=\K[0-9]+' | xargs -r kill
```

## Static styling harness

For fast iteration on CSS alone, a plain HTML page linking `src/App.css` renders every state at
once without rebuilding. Keep it outside the repository — a stray `.html` at the root is picked
up by `npm run lint` — and serve it with symlinks:

```bash
mkdir -p "$SCRATCH/serve" && cd "$SCRATCH/serve"
ln -sfn "$REPOSITORY_ROOT/node_modules" node_modules
ln -sfn "$REPOSITORY_ROOT/src" src
python3 -m http.server 8792 --bind 127.0.0.1 &
```

Set `REPOSITORY_ROOT` to the absolute path of the Konzendi checkout before you run these
commands.

Chrome cannot open `file://` through the browser tools, so HTTP is required. This is a
convenience for styling only; it proves nothing about the desktop shell.
