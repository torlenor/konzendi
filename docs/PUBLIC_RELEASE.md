# Public repository transition

This checklist prepares `torlenor/konzendi` for public visibility. Complete the GitHub settings
steps immediately before or after the visibility change.

## Before the visibility change

- [x] Review the complete Git history for secrets, credentials, personal tracking logs, and
      private screenshots. A current-tree scan is not sufficient because public visibility
      exposes the full reachable history.
- [ ] Confirm that the author names and email addresses in the Git history can be public.
- [x] Review all published releases. Public visibility also makes their notes and assets public.
- [ ] Update the `v0.1.1` and `v0.2.0` release notes to remove the private-repository wording.
      Keep their checksums and unsigned-package warnings.
- [x] Keep the Windows and macOS 0.2.0 packages labeled as unsigned, experimental artifacts.
      Their native interactive acceptance is not complete.
- [x] Confirm that the repository variable `RELEASE_FAULT` is absent.
- [x] Confirm that no repository secret, deploy key, webhook, or environment contains private
      infrastructure details that are unnecessary for this project.

The 18 September 2026 audit inspected tracked files and reachable history for common secret and
private-key patterns, reviewed the historical logo study images and committed PDF metadata, and
found no secret candidate or personal tracking data. Git history contains the commit author name
and email address, which still needs owner confirmation. GitHub had no repository variable,
secret, deploy key, webhook, or environment. Repeat the checks if repository state changes.

## GitHub settings

- [ ] Change the repository visibility to public.
- [ ] Enable private vulnerability reporting, secret scanning, push protection, and Dependabot
      alerts in **Settings → Security**.
- [ ] Confirm that the monthly npm, Cargo, and GitHub Actions update checks from
      `.github/dependabot.yml` are active.
- [ ] Add a branch ruleset for `main`. Require a pull request and the `frontend`, `rust`,
      `package-smoke`, `windows-package`, `macos-package`, and `release-assets` checks. Do not
      allow a branch deletion or a non-fast-forward update.
- [ ] Keep the default workflow token permission at **Read repository contents**. Do not allow
      workflows to approve pull requests.
- [ ] Review the policy for workflows from forks. Pull request checks do not need repository
      secrets or write access.
- [ ] Add the repository description, website only if one exists, and relevant topics.

## After the visibility change

- [ ] Open the repository and both published prereleases while signed out. Confirm that source,
      documentation, checksums, and the unsigned-package warnings are visible.
- [ ] Confirm that GitHub detects the MIT license and links `SECURITY.md` and `CONTRIBUTING.md`
      from the repository community profile.
- [ ] Open a test pull request from a fork. Confirm that it cannot write a cache, create a
      release, or access a secret.
- [ ] Confirm that the required checks run and that the branch ruleset blocks a merge until they
      pass.
- [ ] Confirm that the private vulnerability reporting form opens.

Changing visibility, repository settings, release notes, or branch rules is a GitHub
administration action. These repository changes do not perform those actions.
