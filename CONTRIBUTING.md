# Contributing to Konzendi

Thank you for your interest in Konzendi.

## Before you start

- Read the [roadmap](docs/ROADMAP.md) and the [working rules](AGENTS.md).
- Use an issue to discuss a large change before you implement it.
- Do not include personal tracking logs, screenshots with private information, secrets, or
  credentials in an issue or pull request.
- Report security vulnerabilities through the process in [SECURITY.md](SECURITY.md).

## Set up the project

Use Linux with an X11 session for the supported development environment. Install the
prerequisites and dependencies from the [README](README.md#local-setup).

Run these checks before you open a pull request:

```bash
npm run typecheck
npm run lint
npm test
npm run test:scripts
npm run build
```

Run the Rust checks from `src-tauri/`:

```bash
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo test --locked
```

If you change a lockfile, run `npm run notices` and include the updated
`THIRD_PARTY_NOTICES.md` when it changes.

## Make a change

- Keep each pull request small and focused.
- Add tests for changed behavior when practical.
- Add a brief entry to `CHANGELOG.md` for a user-visible change or bug fix.
- Update the relevant phase document when a change implements or changes an accepted design.
- State which checks you ran and which checks you could not run.

By submitting a contribution, you agree to license it under the repository's
[MIT License](LICENSE). The Konzendi logo has separate terms in
[`assets/logo/RIGHTS.md`](assets/logo/RIGHTS.md).
