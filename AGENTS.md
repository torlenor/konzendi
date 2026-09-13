# Working in Konzendi

Use concise, clean, understandable language. Use ASD-STE100. Read this file and the relevant documentation before making changes. Keep work within the requested scope and preserve unrelated edits.

## Repository layout

The repository contains a Tauri v2 desktop application with React, TypeScript, and Vite that
tracks topics against an append-only event log. Linux (X11) is the initial target. Rust owns
local event persistence and keeps event kinds opaque; `src/core/` owns the event vocabulary and
the fold from log to state, and must import neither React nor Tauri. GitHub Actions runs CI
and builds private draft releases from pushed version tags; nothing is deployed.

- `README.md` — project introduction and documentation entry point.
- `AGENTS.md` — working rules; `CLAUDE.md` links to this file.
- `docs/ROADMAP.md` — product direction, phase index, and the sole source of phase status.
- `docs/OPEN_QUESTIONS.md` — questions, decision status, outcomes, timing, and related phases.
- `docs/phases/` — implementation plans and a reusable phase template.
- `docs/brainstorming/` — discussion history and proposals, not approved specifications.
- `.claude/skills/` — repeatable working procedures, such as driving the desktop window headlessly.
- `src/` — React interface: the tracking window, the entry list, topic maintenance, and the
  quick switcher opened by the global shortcut.
- `src/core/` — pure domain core: event types, merging, the event vocabulary, the fold, and their
  Vitest tests.
- `src-tauri/` — Rust event store, IPC commands, and desktop configuration.
- `scripts/` — release helpers, third-party notice generation, the package smoke test, and
  their Node tests.
- `.github/workflows/` — CI (`ci.yml`) and the tag-triggered draft release (`release.yml`).
- `CHANGELOG.md` — user-visible changes per release; `docs/RELEASING.md` — release procedure.
- `THIRD_PARTY_NOTICES.md` — generated; run `npm run notices` when a lockfile changes.
- `package.json`, `package-lock.json`, `biome.json`, `tsconfig.json`, `vite.config.ts` — frontend tooling.

Run `npm install` at the root, then `npm run tauri dev` for the desktop application.
Root checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:scripts`, and
`npm run build`.
Formatting: `npm run format`. In `src-tauri/`, run `cargo fmt --check`,
`cargo clippy -- -D warnings`, and `cargo test`. See README prerequisites before setup.
Do not invent commands or describe planned components as implemented.

## Documentation authority

Explicit user decisions take precedence over proposals in documents. Record accepted decisions
in the relevant phase document (including rationale), update the roadmap if scope changes, and
retain the resolved entry in `docs/OPEN_QUESTIONS.md` with its status and a brief outcome.
Link to the recorded decision for rationale rather than duplicating the full decision record. Ask when conflicting instructions affect the work.

The roadmap owns what is being built and why; phase documents own how. Brainstorming material
is historical context: its platform, pricing, licensing, and scoring recommendations remain
proposals until explicitly decided. Verify external technical or commercial claims before
relying on them for implementation.

## Adding a phase

1. Create `docs/phases/phase-N-<slug>.md` using
   `docs/phases/phase-X-template.md`. Include `Depends on`, `Readiness`, `Effort`, and
   `Complexity`. Effort and complexity use L (low), M (medium), or H (high).
2. Add a row to the roadmap's phase table: Phase · Focus · Delivers · Depends on · Status.
   This is the only phase index and the only place to record phase status. Allowed statuses:
   `Not started`, `In progress`, `Done`, `Blocked`, `Cancelled`.
3. Maintain each phase's roadmap back-link and the previous/next links in both directions.
   Use `none` at either end; the template is not part of the chain. Navigation order does
   not imply a dependency. Explain concurrency below the roadmap table when needed.

Keep dependency declarations consistent between the table and phase header. Item checkboxes
may track work inside a phase, but must not duplicate its overall status.

There is no need to always define a question a phase must answer.

## Phase readiness

Every phase declares exactly one readiness value:

- **Implementation-ready** — scope, decisions, work packages, acceptance checks, and applicable
  rollout and rollback steps are concrete enough to implement.
- **Discovery required** — opens with an investigation gate: questions, evidence to gather,
  and decisions to record. Investigate first; do not write production code against this plan.
  Incorporate the findings and decisions, then change readiness before implementation.

Discovery may conclude that work should be merged, replaced, or removed. Record that outcome
and update the roadmap and links. Readiness describes the document, not execution progress;
changing readiness alone does not change phase status.

## Working and verification conventions

- Inspect the actual workspace and available version-control state before editing. Do not
  overwrite unrelated work, initialize version control, or commit or push without a request.
- Keep changes small and relevant. Do not choose a stack, commercial service, or new product
  scope merely because it appears in the concept document.
- Keep secrets and personal tracking data out of source control and documentation examples.
- Describe recorded behavior accurately. Do not present a proposed score as a validated
  measurement of productivity, cognition, or mental health.
- For documentation changes, check local links, phase metadata, dependency consistency, and
  the previous/next chain. For implementation, run the checks defined by its phase and the
  actual project tooling. Report what passed and what could not be verified.
- Mark a phase `Done` only after its acceptance criteria are satisfied with recorded evidence.
  A completed plan or scaffold does not establish that the product works.
