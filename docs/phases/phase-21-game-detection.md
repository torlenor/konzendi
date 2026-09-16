# Phase 21 — Game detection on Windows

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 20](phase-20-add-topics-in-topics.md) · next: [Phase 22](phase-22-achievements.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md), [Phase 11](phase-11-windows-macos.md)  
**Effort:** H  
**Complexity:** H  
**Readiness:** Discovery required

## Investigation gate

The owner requested on 14 September 2026: "I want to experient with making it a game tracker
also. For that I want the application to detect which game one currently plays, only after the
user agrees to that, of course. It should work similar to the game detection in Discord and then
tracks this as a topic."

The owner also decided that the phase starts in discovery, and that Windows is the first target
platform. This phase is an experiment. It does not change the product vision in the
[roadmap](../ROADMAP.md#vision) until the owner accepts its result.

Do not write production code against this document. Answer the questions below. Record the
evidence and the decisions in this document. Then change the readiness.

### Questions to answer

1. **Detection method.** Which Windows interface tells the application that a game runs? Examine
   these candidates:
   - a poll of the process list, for example with `CreateToolhelp32Snapshot` or `EnumProcesses`
     and `QueryFullProcessImageNameW`;
   - the foreground window, with `GetForegroundWindow` and `GetWindowThreadProcessId`;
   - process start and stop notifications, for example through WMI.

   For each candidate, record the permissions it needs, the delay until a detection, and the CPU
   and memory cost. Record whether it works without administrator rights.
2. **Game identification.** How does the application know that a process is a game? Examine
   these sources:
   - executables that the user registers manually, as with "Add it!" in Discord;
   - a list of known games that the application includes;
   - a list from a third party, for example the list that Discord uses;
   - the installation data of game launchers, for example Steam, Epic Games, and GOG;
   - a heuristic, for example a full-screen window with high GPU use.

   For each source, record its coverage, its false detections, its maintenance cost, and its
   licence or terms of use. A source that needs a network connection needs a separate owner
   decision, because Konzendi is local-first.
3. **Launchers and helpers.** How does the application ignore game launchers, updaters, crash
   reporters, and anti-cheat services? How does it identify one game that starts more than one
   process?
4. **Consent.** What does the user agree to, and where? Examine these points:
   - the text that explains what the application reads and what it stores;
   - where the user turns detection on and off;
   - a visible sign while detection runs;
   - what happens to the recorded game topics and entries when the user turns detection off.
5. **Relation to the tracking model.** [Phase 1](phase-1-tracking-design.md) specifies manual
   tracking: the user selects each topic. Decide how detection fits that model:
   - Does a detected game start its topic automatically, or does the application ask first?
   - What happens to the current topic when a game starts?
   - When the game stops, does tracking stop, or does the previous topic continue?
   - What happens when the user switches manually while a game runs?
   - Does a game in the background count, or only a game in the foreground?
   - Which minimum run time prevents entries for short starts?
   - How does undo apply to an automatic switch?
6. **Topic mapping.** Does each game get its own topic? Does the application create the topic, or
   does the user connect a game to an existing topic? Which value identifies the game in a stable
   way, for example the executable path or a launcher identifier?
7. **Event representation.** Must the log show that a detection, not the user, started an entry?
   If yes, choose between a new field in the `focus.started` payload and a new event kind. Record
   how an older build reads the log, and the effect on
   [Phase 10](phase-10-encrypted-sync.md) sync.
8. **Game interference.** Confirm that detection only reads process and window data. Confirm that
   it does not inject code, hook into, or read the memory of a game process. Record whether
   anti-cheat software reacts to the chosen method.
9. **Application lifecycle.** Detection works only while Konzendi runs. Decide whether detection
   needs a start at login. Confirm that no Konzendi window opens over a full-screen game.
10. **Other platforms.** Confirm that the Windows code compiles only for Windows, and that the
    Linux/X11 build and its checks do not change.
11. **Game submission.** The owner decided that the user can submit a game that the application
    does not detect (see "Decided by the owner, 15 September 2026"). Decide these points:
    - How does the user select a window? Which Windows interface identifies the window below the
      pointer, and how does the user cancel the selection?
    - Which data does the application extract from the window and its process? Which fields does
      the JSON contain, and does its format agree with the identification source from question 2?
    - Which data can identify the user or the computer, for example a user name in the executable
      path? How does the application remove or show this data before the user submits?
    - How does the application post the issue? Examine a prefilled issue URL that opens in the
      browser, and the GitHub API with a user token. Record whether the user needs a GitHub
      account, and how the user sees and changes the text before it is sent.
    - Which repository receives the issues? How does a maintainer check a submission and add it
      to the list of known games?
    - What does the application do while no network connection is available?

### Evidence to gather

- A disposable spike on Windows 10 and Windows 11. The spike logs the detected processes and the
  foreground window at a fixed interval. Test it with a minimum of: one Steam game, one Epic
  Games game, one game without a launcher, one game with anti-cheat software, and one
  non-game application in full screen. For each test, record the detection delay, false
  detections, missed detections, and CPU use.
- A comparison of the identification sources in question 2, with coverage for the test games.
- The terms of use and the licence of each third-party list or data source that the owner
  considers.
- A short description of the Discord behaviour that the owner wants to copy, confirmed in the
  current Discord client.

### Decisions to record

The owner decides the questions 2, 4, 5, and 6, the use of a network source, and the data and
the target repository of a game submission in question 11. The investigation proposes answers
with evidence. The questions 1, 3, 7, 8, 9, and 10, and the other points of question 11, are
technical decisions. Record them with their evidence, and the owner can change them.

## Outcome and scope

The eventual outcome is an optional function on Windows. When the user agrees, Konzendi detects
the game that the user plays, and tracks the time on the game as a topic. The function is off
until the user turns it on.

In scope for discovery:

- the questions, the spike, and the decisions of the investigation gate;
- the design of consent, detection, topic mapping, and the relation to manual tracking;
- the design of the game submission: window selection, the generated JSON, and the GitHub issue;
- implementation work packages, acceptance checks, rollout, and rollback for the chosen design.

Out of scope:

- game detection on Linux or macOS;
- an in-game overlay, code injection, or hooks into a game process;
- Discord Rich Presence, the Discord SDK, or other data exchange with Discord;
- data that the application sends to a service or shows to other people, except a game
  submission that the user starts and posts as a GitHub issue;
- details inside a game, for example a level, a match, or achievements;
- a score or an assessment of gaming habits or health;
- a change to the product vision before the owner accepts the result of the experiment.

## Decisions and evidence

### Decided by the owner, 14 September 2026

| Area | Decision | Rationale |
| --- | --- | --- |
| Purpose | Konzendi gets an experimental game tracker. | The owner's request. |
| Consent | Detection runs only after the user agrees. | The owner's request. Detection reads data about other applications on the computer. |
| Model | Detection works similar to game detection in Discord, and tracks the game as a topic. | The owner's request. |
| Platform | Windows is the first target platform. | The owner's request. |
| Readiness | The phase starts as `Discovery required`. | The detection method is not known yet. |

### Decided by the owner, 15 September 2026

The owner requested: "Submitting a new, previously undetected, game, let's you click a window
(which extracts all the required info), it then automatically generates a json and allows you to
posts this on Github as an issue."

| Area | Decision | Rationale |
| --- | --- | --- |
| Game submission | The user can submit a game that the application does not detect. The user clicks the window of the game. The application extracts the necessary data from the window, generates a JSON description, and lets the user post it as a GitHub issue. | The owner's request. Submissions help to extend the list of known games. |
| Network use | The game submission is the only function of this phase that sends data to a service. The user starts each submission. | Konzendi is local-first. Detection itself stays local. |

Question 11 contains the open points of this decision.

### Verified facts from the repository, 14 September 2026

- The product targets Linux/X11. No Windows build exists. [Phase 11](phase-11-windows-macos.md)
  owns Windows support and is not started.
- The event vocabulary in `src/core/tracking.ts` has `topic.created`, `topic.renamed`,
  `topic.archived`, `topic.restored`, `focus.started`, `focus.paused`, `entry.revoked`, and
  `entry.retimed`. The `focus.started` payload has `topicId` and `effectiveAt` only. No event
  records what started an entry.
- `readEvent` in `src/core/tracking.ts` ignores an event kind that the build does not know, and
  a payload that does not match its kind.

### External information, not verified

These statements come from web sources on 14 September 2026. Confirm them before a decision
uses them.

- The Discord client has a setting that detects games automatically. Its "Registered Games"
  list has an "Add it!" action that adds a running application manually. Sources:
  [Discord community post](https://support.discord.com/hc/en-us/community/posts/14704678145303--Implemented-Preventing-Automatic-Game-Registration-in-Discord),
  [GoLinuxCloud](https://www.golinuxcloud.com/add-games-to-discord/).
- Unofficial community documentation describes a Discord list of detectable applications. Each
  entry has `executables` with `os`, `name`, and `is_launcher`. The documentation does not
  describe how the client matches processes to the list. Discord does not publish this
  documentation, and the terms of use for the list are not known. Source:
  [Discord Userdoccers](https://docs.discord.food/resources/game).

## Work packages

These are discovery packages. Replace them with implementation packages when the investigation
gate is complete.

- [ ] **Confirm the reference behaviour.** Examine game detection in the current Discord client
  on Windows. Complete when this document describes the consent, the manual add, the automatic
  detection, and the behaviour when a game stops.
- [ ] **Run the detection spike.** Build a disposable program outside the application source.
  Run the tests in "Evidence to gather". Complete when this document has the results for each
  test and a recommended detection method.
- [ ] **Compare identification sources.** Complete when this document has a table of the sources
  in question 2, with coverage, false detections, maintenance, licence, and network need, and the
  owner selected one or more sources.
- [ ] **Design consent and the user flow.** Write the consent text, the setting, the sign while
  detection runs, and the behaviour when the user turns detection off. Complete when the owner
  accepts the design.
- [ ] **Design the relation to manual tracking.** Answer questions 5 and 6. Complete when the
  owner accepts the rules, and each rule has an example sequence of events.
- [ ] **Design the event representation.** Answer question 7. Complete when this document
  describes the events, the compatibility with older builds, and the effect on sync.
- [ ] **Design the game submission.** Answer question 11. Complete when this document describes
  the window selection, the JSON fields, the removal of personal data, the posting method, and the
  review of submissions, and the owner accepts the design.
- [ ] **Align with Phase 11.** Record which Windows versions, architectures, and builds this
  phase needs from [Phase 11](phase-11-windows-macos.md). Complete when the two documents agree.
- [ ] **Complete discovery.** Replace the discovery outline with implementation work packages,
  acceptance checks, rollout, and rollback. Change the readiness. Do not change the roadmap status
  only because the plan is complete.

## Acceptance and verification

The phase makes no claim about game detection yet. Before the readiness changes to
`Implementation-ready`, this document must contain:

- the spike results on Windows 10 and Windows 11, and the selected detection method;
- the selected game identification sources, with their licence or terms of use;
- the owner-accepted consent design, and the rules for automatic and manual switches;
- the event design, with compatibility for older builds and for sync;
- the confirmation that detection does not interfere with game processes;
- the owner-accepted design of the game submission, with the JSON fields and the removal of
  personal data;
- acceptance checks that include false detections, launchers, a game that stops unexpectedly,
  detection turned off, a game submission without a network connection, and an unchanged
  Linux/X11 build.

Record the actual result of each spike test, including failures.

## Rollout and rollback

No rollout is authorized while this document requires discovery. Spikes use synthetic event logs
and disposable programs. They are not part of a release.

The eventual rollout depends on a Windows trial build from
[Phase 11](phase-11-windows-macos.md). Detection is off by default. To roll back, the user turns
detection off, or a later build removes the function. The recorded topics and entries stay in the
append-only log and remain readable, as manual entries do. The event design must make sure that
a build without the function reads a log that contains detected entries.
