# Phase 27 — Always-visible tracking reminder

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 26](phase-26-fine-grained-time-correction.md) · next: none

**Depends on:** [Phase 2](phase-2-tracking-implementation.md), [Phase 6](phase-6-application-theme.md), [Phase 8](phase-8-window-frame.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

> **Discovery first.** The trial identified forgotten tracking, not a proven reminder design.
> Investigate the reminder and its cost before writing production code.

## Investigation gate

The Phase 5 owner trial found that the main window worked well when it stayed visible on a third
screen. Late recordings occurred when a small urgent request, most often through Microsoft
Teams, changed the work but Konzendi did not come to mind for several minutes. The owner proposed
a small floating Konzendi mark or dashboard as a possible reminder.

Answer and record these questions before implementation:

- **What must the reminder accomplish?** Define the observable behavior that makes forgotten
  tracking less likely. Separate a passive reminder from a notification, alarm, or demand to
  switch topics.
- **Which surface is the smallest useful one?** Compare a logo-only indicator, a current-topic
  indicator, and a compact dashboard. Also compare them with keeping the existing main window
  visible. Record whether the surface only reminds, opens Konzendi, or supports tracking actions.
- **When and where is it visible?** Decide always-on-top behavior, supported monitors and
  workspaces, position, movement, stored position, full-screen behavior, and what happens after a
  display is disconnected. Investigate Linux/X11 behavior first. Do not assume that Windows and
  macOS window managers behave the same way.
- **How does the user control it?** Define how to show, hide, move, and restore the surface. It
  must be optional and must not trap pointer or keyboard input.
- **What can it reveal?** Decide whether it shows a topic name, elapsed time, color, or only the
  Konzendi mark. Include screen sharing, shoulder visibility, screenshots, and a neutral hidden
  state in the privacy review.
- **Does it become distracting?** Define a bounded owner experiment that records whether the
  reminder was noticed at real switches, whether late corrections decreased, whether it covered
  work, and whether the owner hid or ignored it. Do not claim a productivity effect.
- **What desktop implementation is reliable?** Prototype only what is necessary to verify window
  capabilities, focus behavior, application shutdown, startup restoration, multiple displays,
  and interaction with the main and quick-access windows. Record platform limits before choosing
  the production design.

The gate closes when the owner selects a design or rejects the reminder, the evidence and
rationale are recorded, and the document has concrete implementation work packages and
acceptance checks. Change readiness to `Implementation-ready` only after that decision.

## Outcome and scope

A decision and, if supported by evidence, an implementation-ready design for an optional,
persistent Konzendi surface that reminds the user what is currently tracked. The design must be
small enough to remain visible during normal work and quiet enough not to create a new
interruption.

The discovery scope includes Linux/X11 window behavior, multi-monitor placement, interaction and
focus rules, privacy, theme and logo use, accessibility, persistence of the user's choice, and a
bounded owner experiment.

Out of scope:

- Microsoft Teams integration or monitoring another application's messages;
- automatic topic detection, application tracking, or activity surveillance;
- notification alarms, forced prompts, or a claim that the reminder improves productivity;
- weekly statistics, achievements, or changes to the event vocabulary;
- enabling the reminder by default before the owner accepts its behavior; and
- promising identical Windows or macOS behavior before native investigation.

## Decisions and evidence

On 19 September 2026, the owner chose to investigate an always-visible reminder. On
22 September 2026, the owner selected a candidate for a prototype and a trial. No production
design is accepted yet. The Phase 5 evidence supports the problem statement:

- the owner used the main window for approximately 70% of switches and found it easiest when it
  remained visible on a third screen;
- quick access covered approximately 30% of switches, while the tray did not come to mind;
- approximately one or two switches per day were recorded several minutes late and corrected;
  and
- small urgent requests were the most common trigger for a late recording.

This evidence does not show that a floating window solves the problem. The existing main window
is the comparison case for discovery.

### Candidate review

On 22 September 2026, the owner compared five candidates in interactive desktop mockups. The
mockups showed a stand-in chat application on the working screen:

| Candidate | Surface | Shows at a glance | Click |
| --- | --- | --- | --- |
| 0 · Main window only | Existing 800×600 window on the third screen | Everything, on that screen only | Full tracking |
| A · Mark | 48×48 logo with a ring in the state color | Konzendi runs; tracking or stopped | Opens the main window |
| B · Topic chip | Line of about 220×32: run mark, topic color, topic name, hours:minutes | Current topic by name | Opens quick access |
| C · Mini panel | 292×170 panel: elapsed time, topic, four numbered topics | Topic and choices | Switches directly |
| D · Edge line | 4 px line along a screen edge in the state color | State color only | Hover shows B |

The review found that only B and C show a wrong topic by name. A small urgent request does not
change the chip, so the chip continues to show the old topic in peripheral view. A and D show
only that Konzendi runs, which the tray already shows. C adds a third switching surface that must
stay consistent with the main window and quick access, and it covers more of the screen.

### Owner decisions

| Question | Decision on 22 September 2026 | Rationale |
| --- | --- | --- |
| Surface | B · Topic chip. Prototype it, then use it for the owner trial. | It is the smallest surface that makes a wrong topic visible. |
| Click action | The chip expands into quick access with a short, smooth animation. Quick access that opens with the global shortcut does not change. | Quick access is familiar and already supports switch, stop, undo, and open. |
| Placement and control | Use the recommended defaults below, then judge them in the trial. | The owner must see how the placement feels in real work. |
| Content | Run mark, topic color, topic name, and hours:minutes. No seconds. A manual Private state shows only the Konzendi mark. | A reading that changes once per minute does not tick in peripheral view. Linux cannot exclude a window from capture. |
| Experiment | One week with the chip, as specified in [Owner trial](#owner-trial). | Accepted as proposed. |

Recommended defaults for the prototype and the trial:

- The chip is off by default. The tray and the main window menu show and hide it.
- The chip stays above other windows, shows on all workspaces, and does not show in the taskbar.
- A click on the chip does not take the keyboard from the working window. Only the expanded
  quick access takes the keyboard. When quick access closes, the keyboard goes back to the
  working window, as in Phase 3.
- The user drags the chip to move it. The chip snaps to the edges of the monitor work area.
- The application stores the position with the monitor setup. If the stored monitor is not
  connected, the chip goes to the top-right corner of the primary monitor work area.
- A right click or the tray switches Private on and off. The Private state is stored.
- A hide control shows when the pointer is on the chip.
- Long topic names are shortened. The chip is not wider than 300 logical pixels.

### Platform findings

Source inspection of the locked Tauri 2.11.5 and tao 0.35.3 found these Linux capabilities.
They are not yet verified in a running window.

| Capability | Linux implementation | Result |
| --- | --- | --- |
| `always_on_top` | GTK `set_keep_above` | Available. Quick access uses it. |
| `visible_on_all_workspaces` | GTK `stick` | Available. |
| `focusable(false)` | GTK `accept_focus(false)` | Available. |
| `skip_taskbar`, `transparent`, `set_position`, `available_monitors` | GTK and GDK | Available. |
| `set_ignore_cursor_events` | Empty GDK input shape | Available. Not necessary for the chip. |
| `content_protected` | None | Not available. Screen sharing and screenshots always include the chip. |

X11 gives no reliable signal that screen sharing started. Private must therefore be a manual
state. Rounded corners and a transparent area need a compositor (see
[Phase 8](phase-8-window-frame.md)). Cinnamon runs a compositor. Wayland does not give a normal
client global position control or keep-above, so this phase supports X11 only, as Phase 3 does.

### Expansion design

Quick access is a separate window. It sizes itself to its rows and opens in the center of a
monitor. If the window frame moves and resizes step by step, each step is a round trip to the
window manager, so the movement is not smooth. The prototype must therefore test this method:

1. When the user clicks the chip, the application positions quick access so that one corner
   sits on the matching corner of the chip. It uses the corner nearest the screen edge, and
   keeps quick access inside the monitor work area.
2. Quick access opens with a transparent window background. A CSS clip starts at the chip
   rectangle and opens to the full surface. The rows fade in after the clip starts.
3. On dismissal, the clip closes back to the chip rectangle, and then the window hides.
4. With reduced motion, or without a compositor, quick access opens and closes without an
   animation.

The mockup tested durations of 120, 180, and 260 ms. The prototype starts with 180 ms.

### Prototype results

On 22 September 2026, a disposable prototype ran on a private X server (Xvfb) with Muffin 6.6,
the Cinnamon window manager, and `xed` as the working window. It used separate data
directories and example topics. It did not open the owner's tracking data. The owner then
asked to deliver it for the trial; see [Trial delivery](#trial-delivery).

| Question | Result | Consequence |
| --- | --- | --- |
| Can the chip be 32 px high? | No, with `resizable: false`. GTK gives a fixed-size window the natural size of the webview, 200×200. A resizable window with the same minimum and maximum size gets the correct size. | The chip is resizable and keeps equal minimum and maximum sizes. |
| Does the resizable chip show resize edges? | Yes. tao gives an undecorated resizable window resize edges 5 px wide. When the window was resizable only during a size change, GTK made it 200 px high again. The chip now has a transparent 5 px margin, and an X input shape lets the pointer through the margin. A press at the edge of the visible chip then moved it and did not resize it. | The margin scales with the GDK scale, because the tao band does. |
| Does a click on the non-focusable chip reach its content, and does the working window keep the keyboard? | Yes. A right click switched Private, and `xed` kept the keyboard. | `focusable: false` is sufficient. |
| Does quick access take the keyboard when it opens from the chip? | Yes. A number key recorded the switch, and the keyboard went back to `xed`. Escape also gave the keyboard back. | The Phase 3 focus path works without change. |
| Does the expansion run smoothly? | The first attempt competed with the window manager's own map animation. As utility windows, quick access and the chip get no Cinnamon map or close effect. The owner then saw a jump at the start. Measured heights per frame showed two causes: the first easing curve grew 37% in the first frame, and the newly mapped window dropped its first animation frame. With CSS `ease-out` over 200 ms (no step above 13%), a start four frames after the window shows, and separate compositing layers, three captures began without a jump. Two of them dropped one frame later, with software rendering. | Quick access also opens from the shortcut without the Cinnamon effect. The owner must accept this change. The owner checks the start on the real desktop. |
| Can the user drag the chip? | The window manager move worked, but WebKit then lost the button release, and the next press did nothing. When the chip moves itself to the pointer position on each step, every drag and every following click worked. | The chip does not use the window manager move. |
| Does the chip snap and store its position? | Yes. A drop near the bottom edge snapped to 8 px from the work area edge. A restart on the same monitor setup restored the position. | As designed. |
| Where does the chip go on a different monitor setup? | To the top-right corner of the primary work area. A stored position is used only for the same monitor setup. | As designed. |
| Does a focused full-screen window cover the chip? | No. The chip stayed above full-screen `xed`. | Open decision: hide the chip while a full-screen window is focused on its monitor. |
| Two real monitors | Not tested. Xvfb does not give Muffin two monitors. | Check on the owner's desktop. |
| Shutdown and startup | The chip closes with the process. When it was visible, the main window shows it again at startup. The tray items were not tested, because Xvfb has no tray. | Check in the owner's session. |

The owner trial of the prototype found two defects of quick access that also occur in the
released version, and the prototype branch fixes both:

- A row that kept focus got it back when quick access opened again, and WebKit drew the
  keyboard focus ring on it. Quick access now removes focus from the row when it closes. Tab
  still shows the ring.
- When the user closed quick access by clicking another window, Konzendi activated the window
  that was interrupted, and that window came to the front. A check with two `xed` windows
  showed this with the previous code. Konzendi now gives the keyboard back only when a
  Konzendi window or no window has it. Escape, a topic key, and the global shortcut still give
  it back to the interrupted window.

Two further defects were fixed in the prototype. The first chip width came from the placeholder that
shows before the log loads, and the chip then moved when it grew. A width change that came
from a font change had no effect. One unexpected topic selection was recorded during the
automated drag checks. Two replays of the same steps did not record it again. The trial must
compare the event log with the switches that the owner made.

### Trial delivery

On 22 September 2026, the owner asked to deliver the chip and the two quick access fixes in the
product, so that the [owner trial](#owner-trial) uses a normal build. Readiness stays
`Discovery required`: the trial, the checks on the owner's desktop, and the two open decisions
still decide whether the chip is accepted, revised, or removed.

The delivered build:

- creates the chip window only on Linux, from `src-tauri/tauri.linux.conf.json`, and offers it
  only on X11. Windows and macOS use the same window configuration as before;
- keeps the chip off until the user selects **Show tracking chip** in the tray. **Hide topic on
  chip** in the tray, or a right click on the chip, switches Private on and off;
- makes quick access transparent only while it expands from the chip or collapses into it;
- keeps the placement rules in `src/chipGeometry.ts`, with Vitest tests; and
- does not change the event vocabulary. The chip preferences are view state in local storage.

During the last check before delivery, one headless run used the owner's data directory by
mistake, because an edit to the test script removed the separate data directories. That run
received no input and recorded no event. The test script now refuses to start without its
own data directory.

### Owner trial

After the checks on the owner's desktop pass, the owner uses the chip for one week of normal work.
Each day, the owner records:

- the number of late corrections, compared with the Phase 5 baseline of one or two a day;
- the number of switches where the owner noticed the chip;
- each time the chip covered something that the owner needed; and
- each time the owner hid the chip or switched Private on, and why.

The trial does not measure productivity. It gives an accept, revise, or reject decision.

## Work packages

Production work packages are not written yet. The chip is delivered for the trial, off by
default. Discovery must still:

- [x] document current window capabilities and platform limits;
- [x] compare the candidate surfaces in disposable mockups;
- [x] review privacy, focus, positioning, and accessibility with the owner;
- [x] build a disposable prototype of the chip and its expansion, and record the
      [prototype results](#prototype-results);
- [x] deliver the chip and the quick access fixes for the trial, off by default;
- [ ] decide full-screen behavior and accept the loss of the Cinnamon effect on quick access;
- [ ] check two monitors, the tray items, and the expansion on the owner's desktop;
- [ ] run the [owner trial](#owner-trial) with the chip; and
- [ ] record an accept, revise, or reject decision.

If the owner accepts a production design, replace this list with file-specific work packages,
failure handling, delivery steps, and completion conditions before changing readiness.

## Acceptance and verification

Discovery is complete when the investigation gate has recorded evidence for every question and
the owner has accepted or rejected the reminder. An accepted design must specify observable
behavior for startup, shutdown, show and hide, focus, pointer and keyboard access, window
position, display changes, privacy, theme, and failure recovery. It must also define automated
checks and native desktop walkthroughs.

No production acceptance checks have run. The delivered chip passed the automated checks and the
headless walkthroughs recorded in [Prototype results](#prototype-results). This shows
feasibility only; it does not establish that the reminder is useful.

## Rollout and rollback

Discovery changes documentation and may use disposable local prototypes. Do not distribute a
prototype or open the owner's tracking data during technical checks. Remove disposable windows,
configuration, and test data after the investigation.

For the trial build:

- **Enable and disable.** The tray item **Show tracking chip** shows the chip, and **Hide
  tracking chip** or the ✕ on the chip hides it. The choice, the Private state, and the
  position are kept in local storage under `konzendi.chip.*`.
- **Compatibility.** An older version ignores these keys. The event log does not change, so
  the user can move between versions.
- **Rollback.** Revert the delivery commit. This removes the chip window, the Linux window
  configuration, and the expansion. Quick access then opens in the center again, and the two
  quick access fixes are also removed. Tracking data does not change.
