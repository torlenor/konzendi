#!/usr/bin/env node
// Local release helper. See docs/RELEASING.md.
//
//   node scripts/release.mjs prepare VERSION   write the version and date the changelog entry
//   node scripts/release.mjs check VERSION     read-only: the files are ready to tag VERSION
//   node scripts/release.mjs versions          read-only: the five version files agree
//   node scripts/release.mjs notes VERSION     print the release notes for VERSION
//
// `prepare` never stages, commits, tags, pushes, or publishes.

import { execFileSync } from "node:child_process";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const VERSION_FILES = [
  "package.json",
  "package-lock.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
];
export const CHANGELOG = "CHANGELOG.md";
export const REPOSITORY = "torlenor/konzendi";

const VERSION = /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/;
const RELEASE_HEADING = /^## \[([^\]]*)\] - (\S+)$/;
const SECTIONS = [
  "Added",
  "Changed",
  "Fixed",
  "Removed",
  "Compatibility",
  "Known limitations",
];
const REQUIRED_SECTIONS = ["Compatibility", "Known limitations"];

export class ReleaseError extends Error {}

/** Parse a `MAJOR.MINOR.PATCH` version, or return null. */
export function parseVersion(text) {
  const match = typeof text === "string" ? VERSION.exec(text) : null;
  return match ? match.slice(1, 4).map(Number) : null;
}

export function compareVersions(a, b) {
  const [x, y] = [parseVersion(a), parseVersion(b)];
  if (!x || !y) throw new ReleaseError(`cannot compare ${a} and ${b}`);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

function requireVersion(version) {
  if (!parseVersion(version)) {
    throw new ReleaseError(
      `invalid version ${JSON.stringify(version ?? "")}: use MAJOR.MINOR.PATCH, digits only, no prefix, suffix, or leading zeroes`,
    );
  }
  return version;
}

function isRealDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// --- Version files ------------------------------------------------------------------------

/**
 * The places that carry the application version, each with a reader and a writer that
 * changes exactly that one value in the text. Writers never reformat a file.
 */
const locations = [
  {
    file: "package.json",
    name: "package.json version",
    pattern: /^( {2}"version": ")([^"]*)(",?)$/m,
    parsed: (text) => JSON.parse(text).version,
  },
  {
    file: "package-lock.json",
    name: "package-lock.json version",
    pattern: /^( {2}"version": ")([^"]*)(",?)$/m,
    parsed: (text) => JSON.parse(text).version,
  },
  {
    file: "package-lock.json",
    name: 'package-lock.json packages[""].version',
    pattern: /^( {4}"": \{\n(?: {6}.*\n)*? {6}"version": ")([^"]*)(",?)$/m,
    parsed: (text) => JSON.parse(text).packages?.[""]?.version,
  },
  {
    file: "src-tauri/tauri.conf.json",
    name: "tauri.conf.json version",
    pattern: /^( {2}"version": ")([^"]*)(",?)$/m,
    parsed: (text) => JSON.parse(text).version,
  },
  {
    file: "src-tauri/Cargo.toml",
    name: "Cargo.toml [package] version",
    pattern: /^(\[package\]\n(?:(?!\[).*\n)*?version = ")([^"]*)(")$/m,
  },
  {
    file: "src-tauri/Cargo.lock",
    name: "Cargo.lock konzendi entry",
    pattern: /^(\[\[package\]\]\nname = "konzendi"\nversion = ")([^"]*)(")$/m,
    unique: /^name = "konzendi"$/gm,
  },
];

function readFiles(rootDir, files) {
  const contents = {};
  for (const file of files) {
    try {
      contents[file] = readFileSync(join(rootDir, file), "utf8");
    } catch (error) {
      throw new ReleaseError(`cannot read ${file}: ${error.message}`);
    }
  }
  return contents;
}

/** Read every application version; a value that cannot be found is reported, not guessed. */
export function readVersions(contents) {
  const found = [];
  const errors = [];
  for (const location of locations) {
    const text = contents[location.file];
    const match = location.pattern.exec(text);
    if (!match) {
      errors.push(`${location.name}: not found`);
      continue;
    }
    if (location.unique && (text.match(location.unique) ?? []).length !== 1) {
      errors.push(`${location.name}: expected exactly one entry`);
      continue;
    }
    if (location.parsed) {
      let parsed;
      try {
        parsed = location.parsed(text);
      } catch (error) {
        errors.push(`${location.file}: invalid JSON (${error.message})`);
        continue;
      }
      if (parsed !== match[2]) {
        errors.push(
          `${location.name}: unexpected layout, found ${JSON.stringify(parsed)}`,
        );
        continue;
      }
    }
    found.push({ name: location.name, version: match[2] });
  }
  return { found, errors };
}

/** Return the one version every file agrees on, or throw with each disagreement. */
export function agreedVersion(contents) {
  const { found, errors } = readVersions(contents);
  const distinct = new Set(found.map((entry) => entry.version));
  if (errors.length === 0 && distinct.size === 1) {
    const [version] = distinct;
    if (parseVersion(version)) return version;
    errors.push(`version ${JSON.stringify(version)} is not MAJOR.MINOR.PATCH`);
  }
  const lines = found.map((entry) => `  ${entry.name}: ${entry.version}`);
  throw new ReleaseError(
    [
      "application versions do not agree:",
      ...lines,
      ...errors.map((error) => `  ${error}`),
    ].join("\n"),
  );
}

/**
 * The version files with every application version set to `version`. The writers change one
 * line per location and nothing else; unchanged when the files already declare `version`.
 */
export function setVersions(contents, version) {
  if (agreedVersion(contents) === version) return { ...contents };
  const next = { ...contents };
  for (const location of locations) {
    next[location.file] = next[location.file].replace(
      location.pattern,
      `$1${version}$3`,
    );
  }
  // The writers change one line per location and nothing else.
  for (const file of VERSION_FILES) {
    const before = contents[file].split("\n");
    const after = next[file].split("\n");
    const expected = locations.filter(
      (location) => location.file === file,
    ).length;
    const changed = before.filter(
      (line, index) => line !== after[index],
    ).length;
    if (before.length !== after.length || changed !== expected) {
      throw new ReleaseError(`internal error: unexpected change in ${file}`);
    }
  }
  if (agreedVersion(next) !== version)
    throw new ReleaseError("internal error: version not written");
  return next;
}

// --- Changelog ---------------------------------------------------------------------------

/** Split the changelog into its level-two sections. */
export function parseChangelog(text) {
  const lines = text.split("\n");
  const sections = [];
  const errors = [];
  lines.forEach((line, index) => {
    if (!line.startsWith("## ")) return;
    const current = { line: index, heading: line };
    if (line === "## [Unreleased]") {
      current.type = "unreleased";
    } else {
      const match = RELEASE_HEADING.exec(line);
      if (match && parseVersion(match[1])) {
        Object.assign(current, {
          type: "release",
          version: match[1],
          date: match[2],
        });
        if (!isRealDate(match[2]))
          errors.push(`line ${index + 1}: invalid date in "${line}"`);
      } else {
        current.type = "invalid";
        errors.push(
          `line ${index + 1}: expected "## [Unreleased]" or "## [MAJOR.MINOR.PATCH] - YYYY-MM-DD", found "${line}"`,
        );
      }
    }
    sections.push(current);
  });
  sections.forEach((section, index) => {
    const end =
      index + 1 < sections.length ? sections[index + 1].line : lines.length;
    section.end = end;
    section.body = lines
      .slice(section.line + 1, end)
      .join("\n")
      .trim();
  });
  return { lines, sections, errors };
}

/** Check one entry's body: known subsections, required ones present, none left empty. */
export function entryProblems(body) {
  const problems = [];
  const headings = [];
  let current = null;
  let preamble = false;
  const content = new Map();
  for (const line of body.split("\n")) {
    if (line.startsWith("### ")) {
      current = line.slice(4).trim();
      headings.push(current);
      if (!SECTIONS.includes(current))
        problems.push(
          `unknown subsection "### ${current}" (use ${SECTIONS.join(", ")})`,
        );
      if (content.has(current))
        problems.push(`duplicate subsection "### ${current}"`);
      content.set(current, false);
    } else if (line.trim() !== "") {
      if (current === null) preamble = true;
      else content.set(current, true);
    }
  }
  if (headings.length === 0 && !preamble) problems.push("the entry is empty");
  for (const required of REQUIRED_SECTIONS) {
    if (!content.has(required)) problems.push(`missing "### ${required}"`);
  }
  for (const [heading, filled] of content) {
    if (!filled) problems.push(`"### ${heading}" is empty`);
  }
  return problems;
}

function changelogErrors(parsed) {
  const errors = [...parsed.errors];
  const unreleased = parsed.sections.filter(
    (section) => section.type === "unreleased",
  );
  if (unreleased.length !== 1)
    errors.push(
      `expected exactly one "## [Unreleased]" heading, found ${unreleased.length}`,
    );
  else if (parsed.sections[0] !== unreleased[0])
    errors.push('"## [Unreleased]" must come before every release entry');
  const seen = new Set();
  let previous = null;
  for (const section of parsed.sections.filter(
    (entry) => entry.type === "release",
  )) {
    if (seen.has(section.version))
      errors.push(`duplicate entry for ${section.version}`);
    seen.add(section.version);
    if (previous && compareVersions(section.version, previous) >= 0) {
      errors.push(
        `entry ${section.version} must be listed below the higher version ${previous}`,
      );
    }
    previous = section.version;
  }
  return errors;
}

// --- Commands ----------------------------------------------------------------------------

/** Read-only: every version file agrees. */
export function versions(rootDir) {
  return agreedVersion(readFiles(rootDir, VERSION_FILES));
}

/** Read-only: the working files are ready to be tagged as `version`. */
export function check(rootDir, version) {
  requireVersion(version);
  const contents = readFiles(rootDir, [...VERSION_FILES, CHANGELOG]);
  const errors = [];
  try {
    const agreed = agreedVersion(contents);
    if (agreed !== version)
      errors.push(`the version files declare ${agreed}, not ${version}`);
  } catch (error) {
    if (!(error instanceof ReleaseError)) throw error;
    errors.push(error.message);
  }
  const parsed = parseChangelog(contents[CHANGELOG]);
  errors.push(
    ...changelogErrors(parsed).map((error) => `${CHANGELOG}: ${error}`),
  );
  const entries = parsed.sections.filter(
    (section) => section.version === version,
  );
  if (entries.length !== 1) {
    errors.push(
      `${CHANGELOG}: expected exactly one "## [${version}] - YYYY-MM-DD" entry, found ${entries.length}`,
    );
  } else {
    errors.push(
      ...entryProblems(entries[0].body).map(
        (problem) => `${CHANGELOG} [${version}]: ${problem}`,
      ),
    );
  }
  if (errors.length > 0) throw new ReleaseError(errors.join("\n"));
  return entries[0];
}

function git(rootDir, args) {
  try {
    return execFileSync("git", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    throw new ReleaseError(
      `git ${args.join(" ")} failed: ${error.stderr?.trim() || error.message}`,
    );
  }
}

function writeAtomically(path, text) {
  const temporary = `${path}.release-tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, path);
}

/**
 * Move the Unreleased notes into a dated entry and write `version` to the five version files.
 * Everything is validated before the first write.
 */
export function prepare(rootDir, version, { now = new Date() } = {}) {
  requireVersion(version);
  const branch = git(rootDir, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch !== "main")
    throw new ReleaseError(`releases are prepared on main, not ${branch}`);
  const dirty = git(rootDir, ["status", "--porcelain", "--", ...VERSION_FILES]);
  if (dirty !== "") {
    throw new ReleaseError(
      `commit or discard changes to the version files first:\n${dirty}`,
    );
  }

  const contents = readFiles(rootDir, [...VERSION_FILES, CHANGELOG]);
  const current = agreedVersion(contents);
  const parsed = parseChangelog(contents[CHANGELOG]);
  const errors = changelogErrors(parsed);
  if (errors.length > 0)
    throw new ReleaseError(`${CHANGELOG}:\n${errors.join("\n")}`);

  const released = parsed.sections.filter(
    (section) => section.type === "release",
  );
  if (released.some((section) => section.version === version)) {
    throw new ReleaseError(`${CHANGELOG} already has an entry for ${version}`);
  }
  const comparison = compareVersions(version, current);
  if (comparison < 0)
    throw new ReleaseError(
      `${version} is lower than the current version ${current}`,
    );
  if (
    comparison === 0 &&
    released.some((section) => section.version === current)
  ) {
    throw new ReleaseError(
      `${current} is already released in ${CHANGELOG}; choose a higher version`,
    );
  }
  const highest = released[0]?.version;
  if (highest && compareVersions(version, highest) <= 0) {
    throw new ReleaseError(
      `${version} must be higher than the latest released version ${highest}`,
    );
  }

  const unreleased = parsed.sections.find(
    (section) => section.type === "unreleased",
  );
  const problems = entryProblems(unreleased.body);
  if (problems.length > 0) {
    throw new ReleaseError(
      `the Unreleased notes are not ready:\n${problems.map((problem) => `  ${problem}`).join("\n")}`,
    );
  }

  const date = now.toISOString().slice(0, 10);
  const { lines } = parsed;
  const changelog = [
    ...lines.slice(0, unreleased.line + 1),
    "",
    `## [${version}] - ${date}`,
    "",
    unreleased.body,
    "",
    ...lines.slice(unreleased.end),
  ].join("\n");
  const next =
    comparison === 0 ? { ...contents } : setVersions(contents, version);
  next[CHANGELOG] = changelog;

  const changed = [...VERSION_FILES, CHANGELOG].filter(
    (file) => next[file] !== contents[file],
  );
  for (const file of changed) writeAtomically(join(rootDir, file), next[file]);
  check(rootDir, version);
  return { changed, date, previous: current };
}

/** The release body: the changelog entry plus installation and verification steps. */
export function notes(rootDir, version) {
  const entry = check(rootDir, version);
  const tag = `v${version}`;
  const deb = `konzendi_${version}_amd64.deb`;
  const stability =
    parseVersion(version)[0] === 0
      ? "a prototype prerelease"
      : "a stable release";
  return `${entry.body}

### Installation

Konzendi ${version} is ${stability}: an unsigned Debian package for x86_64 Ubuntu 24.04 and
Linux Mint 22 under X11. It is distributed only to readers of this private repository.

1. Download the package and checksums:
   \`gh release download ${tag} --repo ${REPOSITORY} --pattern '${deb}' --pattern SHA256SUMS\`
2. Verify the download: \`sha256sum --check --ignore-missing SHA256SUMS\` must print \`${deb}: OK\`.
   A checksum detects a damaged download. It does not prove who built the package.
3. Close Konzendi and back up \`~/.local/share/com.konzendi.app\`.
4. Install: \`sudo apt install ./${deb}\`. Installing the runtime dependencies may need network
   access; Konzendi itself works offline.

\`release-manifest.json\` records the source commit, workflow run, toolchains, and package hash.
\`THIRD_PARTY_NOTICES.md\` lists bundled third-party software and its licences.
`;
}

// --- Command line ------------------------------------------------------------------------

const usage = `usage:
  npm run release:prepare -- VERSION
  npm run release:check -- VERSION
  node scripts/release.mjs versions
  node scripts/release.mjs notes VERSION`;

export function main(argv, rootDir = resolve(import.meta.dirname, "..")) {
  const [command, version, ...rest] = argv;
  if (rest.length > 0) throw new ReleaseError(usage);
  switch (command) {
    case "prepare": {
      const result = prepare(rootDir, version);
      console.log(
        `Prepared ${version} (changelog dated ${result.date} UTC). Changed files:`,
      );
      for (const file of result.changed) console.log(`  ${file}`);
      console.log(`
Nothing was staged, committed, tagged, or pushed. Next steps:
  git diff
  git add ${result.changed.join(" ")}
  git commit -m 'Release ${version}'
  git push origin main
Wait for CI on that commit, then tag and push it: README.md, Releases, steps 4 to 6.`);
      return;
    }
    case "check":
      check(rootDir, version);
      console.log(
        `Ready to tag v${version}: versions agree and ${CHANGELOG} has a complete entry.`,
      );
      return;
    case "versions":
      if (version !== undefined) throw new ReleaseError(usage);
      console.log(versions(rootDir));
      return;
    case "notes":
      process.stdout.write(notes(rootDir, version));
      return;
    default:
      throw new ReleaseError(usage);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof ReleaseError)) throw error;
    console.error(`error: ${error.message}`);
    process.exit(1);
  }
}
