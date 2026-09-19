# Phase 10 — Server-supported encrypted sync

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 9](phase-9-quick-access-open-window.md) · next: [Phase 11](phase-11-windows-macos.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md)  
**Effort:** H  
**Complexity:** H  
**Readiness:** Discovery required

> **Discovery design, updated 19 September 2026.** This document records the product direction,
> research findings, storage audit, and a candidate architecture. The threat-model boundary,
> cryptographic construction, authentication, recovery policy, and service stack are not yet
> approved. Do not implement production sync against this draft.

## Investigation gate

The owner established the following direction on 11 September 2026:

- synchronization is supported by a Konzendi service rather than relying only on a folder copied
  by external tooling;
- tracking remains local-first and usable without the service;
- tracking data stored or relayed by the service is protected by a user-held password; and
- the service operator must not be able to read the synchronized tracking content.

The remaining synchronization questions are owned by this phase and listed below.

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
- Turn the candidate wire-format sketch into an exact format and have the cryptographic
  construction reviewed before choosing libraries or writing production code.
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

### Discovery progress — 19 September 2026

Completed in this research pass:

- audited the current Rust store, TypeScript merge, event vocabulary, startup read, and append
  failure behavior;
- reviewed primary guidance for password key derivation, authenticated encryption, retry-safe
  HTTP writes, and local secret storage;
- compared whole-log upload with immutable encrypted batches;
- measured the serialized size of synthetic records for all ten current event kinds; and
- identified the local storage changes that sync requires.

Still required before implementation readiness:

- measure an owner-approved, privacy-safe summary of representative real log sizes and append
  rates; do not copy a real log into the repository or a test fixture;
- select the threat-model boundary, recovery behavior, account model, and device-revocation
  guarantee;
- benchmark password derivation on the slowest supported Linux, Windows, and macOS trial systems;
- write and review exact binary or JSON envelopes with algorithm identifiers and parameters;
- run the disposable two-client and domain-blind-service spike; and
- select and review the service stack and its operational policy.

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

### Security and protocol research — 19 September 2026

The research supports the existing key hierarchy and immutable-batch direction. It does not
approve an exact cryptographic format.

**Password key derivation.** [RFC 9106](https://www.rfc-editor.org/rfc/rfc9106.html) specifies
Argon2id for password-based key derivation. It gives a 64 MiB, three-pass profile as its second
recommended option for memory-constrained environments. Use that profile only as a benchmark
starting point. Store the algorithm, version, salt, memory, pass, parallelism, and output-length
parameters in the key envelope. Measure and select the final parameters on every supported
platform. A client must reject parameters above safe local limits before it allocates memory.
This prevents a modified envelope from causing unbounded resource use.

The password-derived key must wrap a random sync-space content key. It must not encrypt every
event directly. This envelope pattern permits a password change to create a new wrapped-key
record without re-encrypting all event objects. The
[OWASP cryptographic-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
also recommends separate data-encryption and key-encryption keys. A copied key envelope still
permits offline password guessing. The interface must require a strong sync password or a
generated recovery secret and must state the loss behavior accurately.

**Object encryption.** Use a reviewed authenticated-encryption API. Bind the public envelope
fields, including the format version, sync-space id, object id, and key epoch, as associated data.
Generate a new random nonce for each object and persist the complete object before its first
upload. A retry must reuse the same object bytes and nonce. The current
[RustCrypto XChaCha20-Poly1305 API](https://docs.rs/chacha20poly1305/latest/chacha20poly1305/)
and [libsodium secretstream API](https://doc.libsodium.org/secret-key_cryptography/secretstream)
show maintained options for single bounded objects and chunked streams. Discovery must select one
construction after the object-size limit is known. Do not compose encryption, authentication,
and chunking from low-level primitives.

**Retry and concurrency.** An object id is random and does not depend on plaintext. The client
creates an immutable object at that id. HTTP `PUT` is idempotent, and conditional requests prevent
an existing object from being replaced. This matches
[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods). A successful retry
therefore does not create another remote object. A key-envelope update must also use a condition,
such as an entity tag, so two password changes cannot silently overwrite each other.

**Local key custody.** Keep password handling, content keys, encryption, and network I/O in Rust.
The webview needs status and user actions, not raw key material. The
[Tauri Stronghold plugin](https://v2.tauri.app/plugin/stronghold/) provides an encrypted local
secret database and an Argon2 integration. An operating-system credential store is another
candidate for an explicit **Remember on this device** option. Neither option removes the need to
test locked, missing, unavailable, restored-backup, and headless-session behavior on each platform.
Until that test selects a store, the safe baseline is memory-only unlock: local tracking works
before unlock, and sync waits for the user.

**Threat boundary.** Authenticated encryption detects changed ciphertext and object substitution
when all routing fields are bound. It does not prove that the service returned every object or the
newest key envelope. A service can omit, delay, roll back, or fork history. A local checkpoint can
detect rollback only on a device that has seen newer state; it cannot protect a clean restore.
Fresh-device detection needs a stronger design, such as signed per-replica chains plus a trusted
checkpoint or cross-device comparison. The owner must either add that complexity or accept that
the first version protects confidentiality and object integrity but not service availability,
omission, or fresh-device rollback.

**Library position.** Maintained high-level libraries exist, but a current version number is not
part of this discovery decision. Pin reviewed versions during implementation, include their
licenses in the generated notices, and rerun the security review when the envelope version or a
cryptographic dependency changes.

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

The current implementation also has five properties that matter to sync:

- `Store::read` accepts every flat `events/*.jsonl` file. It does not require the file name to
  match an event's `device` field.
- A malformed JSONL line is reported to standard error and skipped. This recovery behavior is not
  sufficient for a downloaded object because silent omission can produce an incomplete restore.
- `mergeEvents` keeps the first record for a duplicate event id. It does not reject two different
  records with the same id. Directory enumeration can therefore decide which conflicting record
  wins before the final timestamp sort.
- The data directory has no format manifest, migration state, prepared upload, remote cursor,
  quarantine, or sync-space identity.
- Copying the complete data directory copies `device.json`. Two installations can then append as
  the same device. Random event ids still avoid normal collisions, but a protocol must not assume
  that the current device id identifies one physical writer.

### Storage readiness assessment

The append-only event model does not need replacement. JSONL can remain the user-readable local
history, and the current event shape can remain the domain input. Sync does require a compatible
extension of the store before a network client is enabled.

| Current part | Assessment | Required change for sync |
| --- | --- | --- |
| Event records | Keep `{id, device, recordedAt, kind, payload}`. Random ids, origin ids, and opaque kinds support union and forward-compatible reads. | Put records inside a versioned encrypted batch. An event-level version is not required for the first format because the batch version defines how records are decoded. |
| Local author log | Keep append-only `events/<device-id>.jsonl` for events created on this installation. | The sync scanner reads durable records after the last covered position. It must not delay or replace the existing append path. |
| Imported history | The store has no import transaction. Appending downloaded records into another device's author log would create a second writer and can leave a partial batch. | Validate a complete decrypted batch, remove identical duplicates, then publish new records atomically as an immutable flat file such as `events/sync-<object-id>.jsonl`. The current reader and an older client can read that compatible extension. Never append to an imported fragment. |
| Duplicate ids | The TypeScript merge silently keeps the first record. This is safe only for equivalent copies. | Compare the full parsed event. Accept an identical duplicate. Quarantine and report a duplicate id with different content. Do not let directory order select the result. |
| Malformed data | Local crash remnants are skipped. | Apply strict size, count, field, timestamp, and JSON limits before an imported file becomes visible. A failed object stays in a quarantine record with a persistent actionable error. It must not become an empty or partial success. |
| Data layout | No store-format version or migration journal exists. | Add a versioned store manifest and idempotent migration state before the first layout change. Preserve `device.json` and existing logs. Refuse an unsupported newer store version. |
| Sync work | No durable outbox or inbox exists. | Add a `sync/` area for prepared ciphertext objects, remote cursor pages, wrapped-key metadata, quarantine records, and non-secret status. Use temporary-file, flush, atomic-rename, and directory-sync rules equivalent to the event store. |
| Secrets | All current data is plaintext and there is no credential store. | Never put the password, derived key, content key, account token, or recovery secret in the event files, manifest, logs, diagnostics, or frontend persistence. Store remembered secrets only through the selected secret-store abstraction. |
| Device identity | `device.json` can be cloned with a backup. It is useful event provenance but is not a secure installation identity. | Give each sync enrollment a separate random replica id. Do not use the legacy device id as proof of device authorization or as the only remote writer key. Define how restored backups receive a new replica id. |

The flat imported-fragment layout is a compatibility recommendation, not an approved file name.
It has three useful properties: the current `read` path already sees it, an older client can still
fold imported events after rollback, and a complete fragment can be published with one atomic
rename. The sync-aware reader must identify these files by a strict safe name and parse them in
strict mode.

The store does not need an atomic database transaction that includes both the user event and its
upload marker. The event log remains the source. After a crash, a scanner can rediscover an
uncovered event. It must first make a prepared encrypted object durable, and only then advance its
local coverage state. If a crash causes an event to enter two objects, event-level deduplication
makes the replay harmless. Once an object upload starts, retries must use its persisted bytes.

Remote cursors are performance hints, not evidence of completeness. Commit a downloaded page in
this order: download, authenticate, decrypt, validate all objects, publish accepted fragments,
persist quarantine results, and then advance the cursor. A crash before the last step repeats work
without losing events. A clean device must be able to enumerate all retained objects without a
pre-existing cursor.

Before the first upload of existing data, run a strict local audit. Report malformed legacy lines
and conflicting event ids. Do not silently omit them from the initial encrypted history. Enabling
sync must make a verified local backup before it writes the store manifest or sync state.

### Synthetic size evidence

This pass serialized one synthetic example of each of the ten current event kinds with UUIDs and
RFC 3339 timestamps. The records were 215 to 293 bytes, with a mean of 247 bytes including the
JSONL newline. At that mean, 10,000 events use about 2.47 MB before encryption or optional
compression. This is schema-based evidence, not a measurement of owner data or real append rates.

The result is enough to reject upload-after-every-append of the complete growing log. It also shows
that the first version does not need compaction for capacity alone. The spike can start with a
bounded batch target, such as 256 events or 256 KiB before encryption, but it must treat those
numbers as experiment parameters. The real-log summary and restore benchmark must select the
production limit. Do not compress an object until the review considers size leakage and
decompression limits.

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

### Key lifecycle consequences

The following behaviors follow from the candidate hierarchy. They still need owner approval:

| Situation | Recommended first-version behavior | Limit that the interface must state |
| --- | --- | --- |
| Add a device | Authenticate to the account or capability, download the wrapped-key envelope, and enter the sync password on the new device. | Account access alone cannot decrypt history. |
| Remember a device | Store only the unwrapped content key or a device-local wrapping key through the selected secret-store abstraction. Never store the sync password. | Anyone who can use the unlocked operating-system account may be able to sync and decrypt. |
| Change the sync password | Derive a new wrapping key with a new salt and parameters, then conditionally replace the wrapped-key envelope. Keep the content key and event objects unchanged. | This does not remove a content key already copied from a compromised device. |
| Forget the password | Let an already unlocked authorized device create a new wrapped-key envelope after strong user confirmation. | With no unlocked device or recovery material, history is unrecoverable by design. |
| Use a recovery secret | Optionally let a generated high-entropy recovery secret wrap the same content key in a separate versioned envelope. | A copied recovery secret grants decryption. The service must not display or retain its plaintext. |
| Revoke a device | Revoke its service credential so it cannot fetch new objects. | A revoked device can keep data and keys it already received. Credential revocation alone is not cryptographic revocation. |
| Suspect key compromise | For the first version, create a new sync space and key, upload retained history again, connect trusted devices, and retire the old space. | Transparent forward-only key rotation needs epoch and device-membership rules that this draft has not designed. |
| Delete remote data | Delete the remote sync space and its wrapped-key envelopes after explicit confirmation. Keep local plaintext unless the user separately deletes it. | Provider backups and retention can delay physical erasure; the service policy must state the period. |

Account authentication should use a separate credential and established authentication service or
library. Reusing the encryption password as the server login would couple account reset to content
decryption and would expose password-derived verification material to another system. Passkeys,
recovery codes, account email, and service abuse controls are product decisions that remain open.

### Remote layout alternatives

| Alternative | Benefit | Main cost or risk | Discovery position |
| --- | --- | --- | --- |
| Encrypted whole file per device | Closest literal match to file sync; few object types | Re-uploads a growing history; needs compare-and-swap and rollback handling; a cloned device identity creates competing writers | Measure, but not preferred |
| Immutable encrypted event batches | Uploads only new history; retryable; fits append-only events; server remains domain-blind | Requires client batching, an opaque listing/cursor protocol, and later retention or compaction rules | Leading candidate |
| One encrypted current-state snapshot | Small read model and simple restore | Loses the append-only audit history and creates last-writer-wins conflicts | Reject unless the data model changes explicitly |
| Domain-aware event API with encrypted payload fields | Enables fine-grained server queries | Leaks event structure and couples the service to the event vocabulary without helping a blind server | Not preferred |

The leading candidate still has file-like semantics: an object is an opaque, versioned binary
file to the service. A batch can contain any validated events that the local scanner has not
covered. Its encrypted body identifies the creating sync replica and the events. It does not need
one originating device or a public sequence. This avoids treating a copied legacy `device.json` as
a unique remote writer. A per-replica sequence or hash-chain predecessor is added only if the
selected rollback-detection design needs it. The service-visible object id is random rather than a
deterministic hash of plaintext.

### Candidate versioned envelopes

The spike must turn this sketch into an exact format and test vector. Names below describe fields;
they do not select JSON, CBOR, an encoding, or an algorithm.

The service-visible object envelope contains only:

- an envelope format and version;
- a random sync-space routing id and random object id;
- a key epoch and encryption-algorithm id;
- a nonce or stream header; and
- ciphertext with its authentication tag.

All public fields are authenticated as associated data. The encrypted batch contains its own
format and version, the matching object id, a sync-replica id, and a bounded list of complete event
records. It can also contain an encrypted predecessor or sequence if the threat-model decision
requires one. Plaintext creation time, device id, event count, event ids, kinds, and batch sequence
do not appear in the public envelope.

The separate wrapped-key envelope contains a version, KDF algorithm and complete parameters,
random salt, key epoch, wrapping-algorithm id, nonce, and wrapped content key. Authentication
credentials are not part of this envelope. Every parser has explicit maximum lengths before it
allocates memory, derives a key, decompresses data, or constructs an event list.

### Candidate opaque service contract

The service needs resources for the wrapped-key envelope and immutable encrypted objects. It does
not need event or topic routes.

- Create an object at a client-selected random id with idempotent, create-only semantics. The
  service never transforms the bytes. Reuse of an id with different bytes is a conflict.
- List object ids and ciphertext metadata in a stable server order with pagination. A clean client
  can list from the beginning. A cursor can resume an existing client.
- Fetch an exact object and return a strong validator for the stored ciphertext.
- Replace the wrapped-key envelope only with a matching prior version or validator.
- Delete a complete sync space through a separate authenticated operation with an explicit user
  confirmation and recorded retention result. Per-event deletion is not part of the blind API.
- Enforce byte, object, request, and rate limits without inspecting plaintext. Do not accept a
  diagnostic field that can contain event data.

The server cursor and validators improve retry behavior. They do not prove completeness against a
malicious service.

### Candidate sync flow

1. Append and durably flush a local event exactly as today; do not wait for the network.
2. Reconcile the local author log against durable sync coverage. Build a bounded immutable batch,
   encrypt it once, and atomically publish its random object id and ciphertext in the local outbox.
3. Upload idempotently. A retry of the same batch must not create a logically new object.
4. List opaque objects after a service cursor, download unseen ciphertext, authenticate and
   decrypt locally, then validate its encrypted schema.
5. Compare every event id with the local store. Accept identical duplicates. Quarantine the object
   if an id has different content or any new record is invalid.
6. Atomically publish accepted new records in an immutable import fragment. Advance the remote
   cursor only after accepted fragments and quarantine state are durable.
7. Fold the merged local events through the existing pure domain core. No server response is the
   authoritative current tracking state.

Whether a server cursor is sufficient, how a new device enumerates all retained objects, and how
clients detect omitted or rolled-back history remain open protocol questions.

### Minimum metadata budget

| Service may need to observe | Service must not receive in plaintext |
| --- | --- |
| Account or opaque authorization capability | Topic names or identifiers |
| Sync-space identifier | Event kinds and payloads |
| Random object identifier and protocol version | Event ids, originating device ids, or batch sequence |
| Key-envelope algorithms, salt, cost parameters, and key epoch | Sync password or recovery secret |
| Ciphertext byte length and object creation/request times | Tracking timestamps or current tracking state |
| Quota usage, coarse service cursor, and deletion state if retained | Derived password key or content key |

Discovery must justify every service-visible field. Padding can reduce size leakage but cannot
hide connection timing or IP addresses; stronger traffic-analysis resistance is not assumed.
Operational logs must not record authorization secrets, ciphertext bodies, or client-supplied
diagnostics that could contain plaintext.

## Work packages

These are discovery packages. Production implementation packages and their acceptance checks are
written only after the gate closes.

- [x] **Audit the existing store for sync readiness.** Inspect event identity, merge behavior,
  JSONL durability, malformed-data handling, device cloning, import needs, retry state, migration,
  and rollback compatibility. Complete: the 19 September 2026 storage assessment above records
  what stays and the required compatible extensions. No production storage code changed.
- [x] **Research the protocol building blocks.** Review primary guidance for password derivation,
  authenticated encryption, secret custody, and retry-safe writes. Complete: the research above
  records candidate components, limits, sources, and decisions that still need review. This does
  not approve an exact construction.
- [ ] **Write the threat model and privacy contract.** Define protected assets, attackers,
  metadata leakage, integrity/availability guarantees, and explicit non-goals. Complete when the
  target claim can be tested and the owner has accepted its limits.
- [ ] **Measure and select the remote layout.** Compare whole-file and immutable-batch transfer
  using representative local logs. Complete when object boundaries, maximum sizes, batching,
  retention, and compaction are decided. The synthetic size evidence is an input, not completion.
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
  acceptance checks, rollout, and rollback; update readiness without changing roadmap status
  merely because planning completed.

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

It must also include storage acceptance checks that prove:

- existing event files open without rewrite and an older supported client can still read imported
  flat fragments after rollback;
- a crash at every outbox, upload, download, import, and cursor persistence boundary loses no
  accepted event and creates no conflicting result;
- identical duplicate events are harmless, while one id with different content blocks that object
  with a persistent error;
- malformed, oversized, truncated, tampered, and unsupported objects never become partial or
  empty imports;
- copying a data-directory backup to a new installation does not create two authorized sync
  replicas with the same identity; and
- disabling sync retains every local and imported plaintext event while it removes credentials and
  network work according to the selected policy.

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

The migration must be additive. Keep `device.json` and existing `events/<device-id>.jsonl` files.
Create the store manifest, sync directories, and import fragments with new names. Do not rewrite
existing logs merely to add sync. A rollback can ignore the sync control area and still read the
flat JSONL history, including imported fragments. If a future envelope or store version cannot
preserve that property, its rollout needs a separate export and downgrade procedure.
