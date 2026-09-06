# Context Switching Tracker

Concept, platform options, and monetization discussion, 6 September 2026.

## 1. Status and scope

This document consolidates the discussion so far. The target audience and original product idea come from the user. Platform choices, feature packaging, pricing, and validation steps are recommendations, not approved implementation decisions. No app has been built or commercial service configured.

## 2. Product idea

Build an app for people working on a computer that makes it easy to record changes between topics with one tap, click, or a short keyboard interaction. The app tracks time spent on each topic and presents a graph of context switches alongside useful analytics.

The original idea also includes an effectiveness score based on the number of switches over the last X minutes. The score would recover during sustained work on one topic or a tracked pause. Topics could have an effort level indicating how mentally demanding they are, influencing the score.

The intended benefit is to help people understand fragmentation in their working day and identify changes that improve their ability to work uninterrupted.

## 3. What counts as a context?

Define a context as a goal or topic, rather than an application or individual action. Coding, reading documentation, and testing could all belong to “Implement login.” Counting every tool change would confuse ordinary steps within a task with switches between goals.

An intentional transition after completing work may differ from an interruption that leaves work unfinished. Capturing this distinction could improve the analysis, provided it does not make logging burdensome.

## 4. Tracking experience

The main product risk is whether people consistently record switches. Tracking must be quick enough to become a habit without becoming another interruption.

Proposed basic interface:

- A small number of large topic buttons.
- A clearly highlighted active topic and elapsed time.
- A persistent Pause button.
- Selecting another topic immediately ends the previous interval and starts the next.
- Undo for accidental switches.
- Easy timestamp correction for forgotten or late entries.

For desktop use, a proposed interaction is: press a global shortcut, select a topic, and immediately return to work. A system-tray or menu-bar control provides another entry point.

### Phone versus computer

| Situation | Assessment discussed |
| --- | --- |
| People working at a computer | A keyboard shortcut or tray control is likely more convenient. |
| Studying or working away from a computer | A phone could work, particularly when visible on a desk. |
| Repeated phone unlocking to log switches | Likely too much friction for sustained use. |

The user clarified that the target audience is people working on a computer. Phone usage is therefore not the primary design direction.

## 5. Score and effort levels

### Original proposal

- Calculate an effectiveness score from context switches during a recent time window.
- Reduce the score after switches.
- Let it recover during uninterrupted work or a recorded pause.
- Weight the score using the mental effort of topics.

### Recommended interpretation

Use a name such as **Focus continuity** and explain that it summarizes recorded work patterns. The inputs do not establish how effectively a person's brain works.

Research supports task-switching and task-resumption costs, but does not establish a universal effectiveness percentage or recovery timer for this app. Recovery depends on the work and the interruption. See [Microsoft Research's field study of disruption and recovery](https://www.microsoft.com/en-us/research/publication/disruption-recovery-computing-tasks-field-study-analysis-directions/).

| Input | Proposed behavior, to be tested |
| --- | --- |
| Several switches close together | Reduce continuity more than widely spaced switches. |
| Sustained work on one topic | Gradually reduce the influence of earlier switches. |
| Mentally demanding topic | Optionally give interruptions away from it greater weight. |
| Pause | Record separately rather than counting it as an ordinary topic switch. Any assumed recovery benefit is a heuristic. |
| Intentional topic completion | Distinguish from an interruption if it can be captured easily. |

Suggested effort levels are **Light / Moderate / Demanding**, set as topic defaults and optionally adjusted for a session. Initially collect this information before deciding how strongly it should affect the score.

No formula, time window, weights, recovery rate, or numerical scale has been selected. These remain product hypotheses, not validated measurements of cognition or productivity.

## 6. Analytics

Analytics discussed include:

- A coloured timeline of topics and pauses.
- Number of context switches and switches per tracked working hour.
- Typical uninterrupted working time per topic.
- Topics people most frequently switch between.
- Planned transitions versus interruptions, if practical to record.
- Historical trends and comparisons.
- Effort-aware analysis and richer reports.

The commercial value should go beyond displaying a graph or score. An example of useful feedback is that uninterrupted work periods became longer after batching email. Such comparisons can reveal patterns without proving causation.

## 7. Validation before a full product

Suggested experiment: a one-week trial with a small group using topic buttons, pauses, corrections, and a timeline.

Evaluate:

- How often users forget to log a switch.
- How annoying or disruptive logging feels.
- Whether the timeline reveals anything useful.
- Whether access through a window, shortcut, or tray control changes usability.
- Whether people learn something that helps them change their working day.

The score becomes useful only if the underlying tracking habit and data are reliable enough. The trial has been proposed, not scheduled or conducted.

## 8. Platform options

### Offline-first web app / PWA

A web app does not inherently need an application backend or continuous internet access.

A possible setup:

- React for the interface, charts, and score calculations.
- IndexedDB for local topics and tracking events.
- A service worker to cache the application for offline use after initial download and caching.
- Static HTTPS hosting for initial delivery and updates.
- No user accounts, API, or server-side tracking database.

See [MDN's service-worker guidance](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) and [IndexedDB documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).

Browser-managed storage can be cleared. Export/import and backup are important. Requesting persistent storage can protect against automatic eviction when granted, but cannot stop a user from deleting the data. See [PWA data persistence](https://web.dev/learn/pwa/offline-data).

A paid PWA is possible, but durable purchase restoration and local access control require additional design. Accounts can help, while adding implementation effort.

### Desktop app

The recommended candidate is **Tauri with a React frontend**, keeping tracking and analytics local. Tauri offers [global shortcuts](https://v2.tauri.app/plugin/global-shortcut/) and [system-tray integration](https://v2.tauri.app/learn/system-tray/), which directly support low-friction tracking.

No application backend is needed for everyday usage. A local database or application files can store the data.

Desktop development adds platform builds, packaging, code signing, OS testing, and update handling. Tauri supports platform-specific installers and store distribution; see its [distribution documentation](https://v2.tauri.app/distribute/).

| Consideration | Offline PWA | Desktop app |
| --- | --- | --- |
| Initial implementation | Simpler | Extra packaging and platform setup |
| Offline tracking and analytics | Yes | Yes |
| Access while another app is active | Usually bring the app window forward | Global shortcut or tray menu |
| Distribution | Open a link | Download and install |
| Data storage | Browser-managed storage | Local application files or database |
| Maintenance | Web application and cache updates | OS testing, builds, signing, and updates |

Recommendation discussed: **PWA for a quick experiment; Tauri for a first usable desktop product.** If starting with a PWA, separate tracking logic from storage so the logic can later be reused in Tauri. Final platform and supported operating systems remain undecided.

## 9. Monetization options

Offline functionality does not prevent monetization. It changes purchase verification and licence management.

| Model | Fit | Additional requirements |
| --- | --- | --- |
| Paid desktop app-store download | Simple offline product | Store integration and distribution requirements |
| Free app with a one-time Pro unlock | Users can establish a tracking habit before paying | Purchase verification and locally saved entitlement |
| Direct sale with a licence key | Control over distribution across desktop platforms | Checkout, licence issuance, activation, and restoration |
| Subscription | Possible if there is convincing ongoing value | Recurring billing and periodic entitlement checks |

The recommendation is a complete free tracking experience plus a **one-time Pro purchase**. A subscription was not recommended for the current scope because the ongoing value proposition has not yet been established.

### Proposed initial commercial offer

These are starting hypotheses, not final prices or commitments.

| Item | Proposal |
| --- | --- |
| Free | Unlimited topics, switching, pauses, daily timeline, basic statistics |
| Pro | Historical comparisons, advanced analytics, effort-based analysis, richer reports |
| Price | €29 one-time, to test willingness to pay |
| Devices | Two active computers per licence |
| Updates | All 1.x updates included; optional paid major upgrades later |
| Data access | Basic export and backup remain free |

## 10. Direct licensing through Lemon Squeezy

The suggested starting provider is **Lemon Squeezy**, offering hosted checkout and licence management. This can avoid building a custom payment backend.

### Purchase flow

1. The user downloads the app and uses its free features.
2. Unlock Pro opens a hosted checkout in the browser.
3. After payment, the user receives a licence key by email.
4. The user enters the key in the desktop app.
5. The app activates the key through Lemon Squeezy's Licence API.
6. The app saves the activation locally and unlocks Pro.

The provider supports automatic key generation, activation limits, validation, and deactivation for moving licences between computers. Its documented Licence API flow can be called from the app without embedding the private merchant API key. The app should verify that the returned licence belongs to the correct store/product and retain the activation instance identifier. See the [licensing tutorial](https://docs.lemonsqueezy.com/guides/tutorials/license-keys).

### Offline access and verification

- All topic and tracking data can remain local.
- Checkout, activation, and subsequent licence checks use the internet.
- The app needs an explicit offline entitlement policy, for example retaining Pro access when a check fails because of connectivity.
- A network failure must be distinguished from a successful response indicating an invalid or revoked licence.
- Refunds or revoked licences can only be reflected after the app learns about them through an online check.
- The exact validation cadence and offline allowance remain undecided.

This approach is **online activation with cached local access**. It is not automatically a cryptographically signed offline licence. Signed offline licences, verified using an embedded public key while keeping the signing secret outside the app, were discussed as a separate option requiring a different or additional implementation.

### Fees and responsibilities

At the time of the discussion, Lemon Squeezy advertised **5% + US$0.50 per transaction**, with additional fees for some payments and no monthly payment-processing fee. As merchant of record, it handles customer-facing sales tax and VAT collection and remittance for those sales. The developer's own accounting responsibilities remain separate. Verify terms before launch; see [Lemon Squeezy pricing](https://www.lemonsqueezy.com/pricing).

### Work still needed in the app

- Pro feature gates.
- Licence entry and activation screen.
- Local entitlement storage.
- Validation, connectivity, and invalid-licence handling.
- Deactivation and device-transfer handling.
- Desktop packaging, signing, and updates.

This setup does not require user accounts or a cloud database for tracking data, but it does depend on an external service for commerce and licensing.

## 11. App-store alternative

For a Mac-only release, the **Mac App Store** is an alternative using a paid download or a non-consumable Pro purchase through Apple's purchase system. See [Apple's in-app purchase documentation](https://developer.apple.com/in-app-purchase/) and [Tauri's App Store distribution guidance](https://v2.tauri.app/distribute/app-store/).

Direct licensing was favoured in the discussion for selling the same product across desktop platforms. A store-first approach may be attractive if the initial scope is macOS only. No distribution channel has been selected.

## 12. Open decisions

| Question | Current status |
| --- | --- |
| Target audience | Confirmed: people working on a computer |
| App name | Not selected |
| First operating system(s) | Not selected |
| PWA versus desktop | Tauri recommended for the product; PWA suggested for a quick experiment |
| Primary logging interaction | Topic buttons, global shortcut, and tray access proposed |
| Completed work versus interruption | Useful distinction; interaction design unresolved |
| Score name and interpretation | Focus continuity suggested; original idea was an effectiveness score |
| Formula, time window, recovery, and effort weights | Not defined or validated |
| Free versus Pro boundary | Initial proposal documented above |
| Price and update entitlement | €29 and 1.x updates proposed, not decided |
| Sales provider and channel | Lemon Squeezy direct licensing recommended; Mac App Store alternative |
| Offline licence policy | Needs a decision on validation frequency and continued offline access |
| Validation trial | One-week trial proposed; not yet conducted |

## 13. Proposed next steps

1. Choose the first desktop platform and the smallest logging interaction to test.
2. Prototype topics, switching, pauses, corrections, and a timeline.
3. Run the one-week usability trial and assess missed entries and perceived value.
4. Define and test a transparent continuity score and effort model.
5. Confirm which additional analytics justify Pro and test willingness to pay.
6. Add purchase activation and offline entitlement handling once the product direction is supported by the trial.

These steps are a proposed sequence, not an agreed sprint plan.
