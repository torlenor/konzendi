# Phase 10 — Server-supported encrypted sync

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 9](phase-9-quick-access-open-window.md) · next: none

**Depends on:** [Phase 2](phase-2-tracking-implementation.md)  
**Effort:** H  
**Complexity:** H  
**Readiness:** Discovery required

> **Preliminary design.** This document records the product direction, privacy boundary, and a
> candidate architecture. The protocol, cryptographic construction, service stack, and recovery
> policy are not yet approved. Do not implement production sync against this draft.

## Investigation gate

The owner established the following direction on 11 September 2026:

- synchronization is supported by a Konzendi service rather than relying only on a folder copied
  by external tooling;
- tracking remains local-first and usable without the service;
- tracking data stored or relayed by the service is protected by a user-held password; and
- the service operator must not be able to read the synchronized tracking content.

This begins the investigation of [Q11](../OPEN_QUESTIONS.md). It does not yet resolve the
question.

### Terminology and target claim

“Password-encrypted on the server” would not by itself meet the privacy goal. If the service
receives plaintext and then encrypts it, or if it retains the decryption key, it can read the
data. The required property is **client-side end-to-end encryption**: the desktop application
encrypts before upload and decrypts after download.

The candidate privacy claim is:

> The sync service never receives plaintext tracking records, the encryption password, or a
> usable content-encryption key. It stores and transfers authenticated ciphertext plus the
> minimum metadata required to authorize clients, enforce limits, and route opaque objects.

The service will necessarily observe some metadata, including an account or capability, IP
addresses, request times, ciphertext sizes, and object counts. “The server never knows what was
synced” is therefore interpreted as content confidentiality, not complete traffic anonymity.
The owner must confirm that boundary before the phase becomes implementation-ready.

### Questions to resolve

1. **Threat model:** Is the target an honest-but-curious service and stolen server storage, or
   must clients also detect a malicious service withholding, replaying, rolling back, or forking
   encrypted history?
2. **Authentication:** Does sync use a conventional account, a passkey, a recovery code, or an
   unguessable sync-space capability? Account authentication must remain separate from the
   encryption secret.
3. **Key lifecycle:** How is the content key created, wrapped by the password, cached locally,
   added to another device, rotated, backed up, and destroyed? What exactly happens when the
   password and all connected devices are lost?
4. **Remote representation:** Does the service store encrypted copies of whole per-device JSONL
   files or immutable encrypted batches derived from them? How are objects versioned, padded,
   retained, compacted, and deleted?
5. **Synchronization protocol:** How do upload retries, concurrent clients, cursors, device-id
   cloning, partial downloads, corruption, and a clean-device restore behave?
6. **Integrity:** Which fields are cryptographically bound together, and what prevents an object
   from being substituted under another identifier? Are per-device signatures or an encrypted
   hash chain needed in addition to authenticated encryption?
7. **Service operation:** Which server and storage stack is appropriate, where is it hosted, what
   is logged, how are quotas and abuse handled, and what availability and backup promises apply?
8. **Product boundary:** Is synchronization personal-only? How many devices and sync spaces are
   supported? Are sharing, collaboration, and server-side deletion explicitly excluded?

### Evidence to gather

- Measure representative log sizes and append rates so the whole-file and immutable-batch
  alternatives can be compared with numbers.
- Write a versioned wire-format sketch and have the cryptographic construction reviewed before
  choosing libraries or writing production code.
- Build a disposable protocol spike with two clients and an intentionally domain-blind object
  service. The spike must use synthetic data and must not become a production migration path.
- Capture the service-visible requests from that spike and classify every visible field as
  necessary metadata or a privacy defect.
- Exercise offline writes, concurrent upload, duplicate delivery, truncated ciphertext,
  tampering, stale server state, clean-device restore, password change, and lost-password paths.
- Benchmark the password key-derivation settings on the slowest supported client and record the
  security/usability trade-off.
- Decide whether the first rollout is private dogfooding or a supported hosted service; derive
  operational, legal, and deletion requirements from that decision rather than assuming them.

## Outcome and scope

The intended outcome is opt-in multi-device synchronization that preserves the current local
tracking experience. A device records events locally first and continues to work when the
network or sync service is unavailable. When connectivity returns, clients exchange opaque,
encrypted objects through the service and merge the recovered events with the existing
deterministic domain fold.

“File sync” describes the responsibility boundary: the service transfers encrypted blobs and
does not expose a topic, event, timeline, or analytics API. It does not yet decide that each
growing local JSONL file must map one-to-one to a remote object.

In scope for the eventual phase:

- one person's tracking data across that person's authorized devices;
- client-side encryption, key setup, device connection, and understandable recovery limits;
- background upload and download without blocking local tracking;
- idempotent import into the existing append-only model;
- visible sync health and actionable errors; and
- a minimal authenticated service that stores and returns opaque objects.

Out of scope unless explicitly added after discovery: shared workspaces, collaboration,
server-side search or analytics, a browser that decrypts tracking data, arbitrary user files,
real-time presence, commercial plans, payment, and silently collecting telemetry.

## Decisions and evidence

### Accepted direction

| Area | Direction | Status |
| --- | --- | --- |
| Service model | Konzendi-supported remote sync, not only a user-owned replicated folder | Accepted |
| Offline behavior | Local writes remain authoritative for the running application; sync is asynchronous | Accepted as a continuation of the local-first product |
| Content confidentiality | Encrypt tracking content on the client before it crosses the network | Accepted |
| Server knowledge | Do not send plaintext tracking events or a usable content-encryption key to the service | Accepted |
| Unlock | A user-held password protects access to synchronized content | Accepted in principle; key and recovery details remain open |
| Server semantics | Prefer an opaque object service over a domain-aware tracking API | Working interpretation of “file sync”; not yet final |

### Obsidian comparison

The comparison is directionally accurate but should not be treated as a protocol specification.
Obsidian documents that its remote vault can use end-to-end encryption, that encryption and
decryption happen at the endpoints, that the encryption password is separate from the account
password, and that local files remain unencrypted. It also documents metadata trade-offs:
deterministic encrypted file hashes reveal content equality in a narrow attack, while device,
upload/delete timing, and the mapping between encrypted paths and content remain visible to its
server.

Konzendi can adopt the privacy principle without copying those trade-offs. In particular, this
draft does not propose deterministic content hashes, plaintext device identifiers, or a visible
path-to-content mapping. Sources: [Obsidian Sync security and privacy](https://obsidian.md/help/sync/security)
and [Obsidian's encryption verification guide](https://obsidian.md/blog/verify-obsidian-sync-encryption/).

### Current repository constraints

- Rust owns the application data directory, durable appends, device identity, and reads from all
  `events/*.jsonl` files.
- Each event has a random event id, an originating device id, a recorded timestamp, an opaque
  kind, and a payload.
- Each device appends to its own log. The pure TypeScript core merges devices, deduplicates by
  event id, and applies deterministic correction events.
- The current application has no network client, account, credential storage, backend, migration
  system, or sync status model.
- A JSONL file grows after every event. Encrypting and uploading the complete file after every
  append would make bandwidth and conflict handling grow with history size.

### Candidate trust boundary

```text
plaintext local log                                      plaintext local log
        |                                                        ^
        v                                                        |
Client A: batch -> encrypt -> authenticated TLS -> opaque service -> decrypt -> Client B
                    key stays here          stores ciphertext       key stays here
```

TLS remains required for endpoint authentication and transport metadata protection; it does not
replace end-to-end encryption. Local event files remain plaintext under the operating-system user
account unless a separate local-encryption phase is proposed.

The target covers a curious operator, leaked database backups, and compromise of object storage:
those parties should obtain no tracking plaintext. It cannot protect plaintext on an unlocked or
compromised client, a captured password, a malicious application update, or information inferred
from traffic volume and timing. Authenticated encryption can detect modified ciphertext, but
detecting server-side omission, rollback, or forks requires additional protocol state and remains
an explicit discovery decision.

### Candidate key hierarchy

This is the leading design to evaluate, not an approved cryptographic specification:

1. A client generates a random content key for a sync space.
2. A memory-hard password key-derivation function combines the sync password with a random salt
   and explicit, versioned cost parameters.
3. The derived key encrypts or “wraps” the random content key. The service may store the salt,
   parameters, and wrapped key, but never the password or derived key.
4. The content key encrypts immutable sync objects with a reviewed authenticated-encryption
   construction. Object identifiers and format versions are cryptographically bound to their
   ciphertext.
5. Account authentication authorizes access to ciphertext but cannot decrypt it. A password
   change can re-wrap the content key without re-encrypting all history, if discovery accepts
   that capability.

This separation also makes the hard recovery property explicit: if no authorized device retains
the content key and the password or recovery material is lost, the service cannot restore the
data. A “forgot password” flow that recovers the same content from the service would contradict
the stated privacy guarantee unless the user had previously created separate recovery material.

A stolen wrapped key also gives an attacker material against which password guesses can be
checked offline. A memory-hard derivation function raises the cost but does not make a weak
password strong. Discovery must compare a strong user-generated sync password with a generated
recovery key and any reviewed password-authenticated key-exchange or server-assisted hardening
option; it must not imply that ordinary account rate limiting still protects an offline copy.

Do not select algorithms from this outline alone. The final construction must use maintained,
high-level cryptographic libraries, version every envelope and parameter set, define nonce and
key-separation rules, and receive focused review.

### Remote layout alternatives

| Alternative | Benefit | Main cost or risk | Discovery position |
| --- | --- | --- | --- |
| Encrypted whole file per device | Closest literal match to file sync; few object types | Re-uploads a growing history; needs compare-and-swap and rollback handling; a cloned device identity creates competing writers | Measure, but not preferred |
| Immutable encrypted event batches | Uploads only new history; retryable; fits append-only events; server remains domain-blind | Requires client batching, an opaque listing/cursor protocol, and later retention or compaction rules | Leading candidate |
| One encrypted current-state snapshot | Small read model and simple restore | Loses the append-only audit history and creates last-writer-wins conflicts | Reject unless the data model changes explicitly |
| Domain-aware event API with encrypted payload fields | Enables fine-grained server queries | Leaks event structure and couples the service to the event vocabulary without helping a blind server | Not preferred |

The leading candidate still has file-like semantics: an object is an opaque, versioned binary
file to the service. Inside the encrypted payload, the client can identify its sync space,
originating device, batch sequence, and event records. The service-visible object id should be
random rather than a deterministic hash of plaintext.

### Candidate sync flow

1. Append and durably flush a local event exactly as today; do not wait for the network.
2. Persist a local outbox entry identifying a bounded immutable batch. Encrypt it once and retain
   its random object id and ciphertext across retries.
3. Upload idempotently. A retry of the same batch must not create a logically new object.
4. List opaque objects after a service cursor, download unseen ciphertext, authenticate and
   decrypt locally, then validate its encrypted schema.
5. Import valid events without rewriting the originating device's history and deduplicate by
   event id. Quarantine invalid objects and expose an actionable error rather than silently
   treating them as an empty history.
6. Fold the merged local events through the existing pure domain core. No server response is the
   authoritative current tracking state.

Whether a server cursor is sufficient, how a new device enumerates all retained objects, and how
clients detect omitted or rolled-back history remain open protocol questions.

### Minimum metadata budget

| Service may need to observe | Service must not receive in plaintext |
| --- | --- |
| Account or opaque authorization capability | Topic names or identifiers |
| Sync-space identifier | Event kinds and payloads |
| Random object identifier and protocol version | Event ids, originating device ids, or batch sequence |
| Ciphertext byte length and object creation/request times | Tracking timestamps or current tracking state |
| Quota usage, coarse service cursor, and deletion state if retained | Encryption password, derived password key, or content key |

Discovery must justify every service-visible field. Padding can reduce size leakage but cannot
hide connection timing or IP addresses; stronger traffic-analysis resistance is not assumed.
Operational logs must not record authorization secrets, ciphertext bodies, or client-supplied
diagnostics that could contain plaintext.

## Work packages

These are discovery packages. Production implementation packages and their acceptance checks are
written only after the gate closes.

- [ ] **Write the threat model and privacy contract.** Define protected assets, attackers,
  metadata leakage, integrity/availability guarantees, and explicit non-goals. Complete when the
  target claim can be tested and the owner has accepted its limits.
- [ ] **Measure and select the remote layout.** Compare whole-file and immutable-batch transfer
  using representative local logs. Complete when object boundaries, maximum sizes, batching,
  retention, and compaction are decided.
- [ ] **Specify authentication and key lifecycle.** Cover enrollment, local key storage, adding
  and revoking devices, password change, recovery, rotation, and deletion. Complete when every
  loss and compromise scenario has an explicit outcome.
- [ ] **Specify and review the versioned protocol.** Define envelopes, authenticated fields,
  idempotency, cursors, concurrency, integrity, migrations, and error behavior. Complete after a
  focused security review records findings and required changes.
- [ ] **Run a disposable two-client spike.** Demonstrate offline writes, opaque upload, merge,
  duplicates, tampering, stale state, and clean-device restore with synthetic data. Complete when
  captured service traffic matches the metadata budget and the spike's limitations are recorded.
- [ ] **Design the product and operational surfaces.** Specify account or capability setup,
  password prompts, sync health, recovery warnings, service deployment, logging, quotas, backup,
  deletion, and incident response. Complete when these have testable failure and recovery paths.
- [ ] Replace this discovery outline with decision-complete implementation work packages,
  acceptance checks, rollout, and rollback; update Q11 and readiness without changing roadmap
  status merely because planning completed.

## Acceptance and verification

The phase has no implementation acceptance claim yet. Before changing readiness to
`Implementation-ready`, the document must contain:

- an owner-approved threat model and precise privacy statement;
- a selected account/capability and recovery model;
- a reviewed, versioned key hierarchy and wire format with named libraries and parameters;
- a chosen remote layout backed by measurements;
- deterministic behavior for offline, concurrent, duplicate, corrupted, stale, and restored
  clients;
- production work packages with unit, integration, two-client, migration, and adversarial tests;
- a verification method proving that captured requests contain no plaintext tracking content or
  content key; and
- concrete service rollout, monitoring, backup, deletion, incident-response, and rollback steps.

The eventual implementation must also keep all existing local checks passing. Successful plan
review or a passing spike will not show that production sync is secure or operational.

## Rollout and rollback

No service rollout is authorized by this draft. Discovery prototypes use synthetic data,
disposable credentials, and disposable storage and are removed after their evidence is recorded.
They must not read the application's real event directory or establish a production endpoint.

The eventual feature must be opt-in and must leave the existing local event log usable if sync is
disabled, the service is unreachable, or the client rolls back. Enabling sync must begin with a
verified local backup. Disabling it removes remote credentials and queued network work without
deleting local history. Remote deletion, key destruction, protocol downgrade, and rollback after
a client has imported newer events remain discovery decisions.
