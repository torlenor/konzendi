// Tests for scripts/release.mjs. Run with `npm run test:scripts`.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, describe, test } from "node:test";
import {
  CHANGELOG,
  check,
  compareVersions,
  entryProblems,
  main,
  notes,
  parseVersion,
  prepare,
  ReleaseError,
  VERSION_FILES,
  versions,
} from "./release.mjs";

const root = resolve(import.meta.dirname, "..");
const scratch = mkdtempSync(join(tmpdir(), "konzendi-release-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

const NOTES = `### Added

- Something a user can see.

### Compatibility

- Ubuntu 24.04.

### Known limitations

- None known.`;

function changelog(unreleased, released = "") {
  return `# Changelog

Intro text stays.

## [Unreleased]
${unreleased ? `\n${unreleased}\n` : ""}${released ? `\n${released}\n` : ""}`;
}

let dir;
let counter = 0;

function git(...args) {
  return execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
}

function write(file, text) {
  mkdirSync(dirname(join(dir, file)), { recursive: true });
  writeFileSync(join(dir, file), text);
}

function read(file) {
  return readFileSync(join(dir, file), "utf8");
}

/** A repository with the real version files and the given changelog, committed on main. */
function repository(changelogText) {
  dir = join(scratch, `repo-${counter++}`);
  for (const file of VERSION_FILES) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    cpSync(join(root, file), join(dir, file));
  }
  write(CHANGELOG, changelogText);
  write("src/unrelated.ts", "export const untouched = 1;\n");
  git("init", "--quiet", "--initial-branch=main");
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.invalid",
    "add",
    ".",
  );
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "fixture",
  );
}

/** Everything a failed or successful preparation must not change. */
function snapshot() {
  const files = {};
  for (const file of [...VERSION_FILES, CHANGELOG, "src/unrelated.ts"])
    files[file] = read(file);
  return {
    files,
    head: git("rev-parse", "HEAD"),
    refs: git("for-each-ref"),
    index: createHash("sha256")
      .update(readFileSync(join(dir, ".git/index")))
      .digest("hex"),
  };
}

/** Manual preparation: edit each application version by hand, as a maintainer would. */
function setAllVersions(version) {
  const current = versions(dir);
  const edits = {
    "package.json": [`"version": "${current}"`, 1],
    "package-lock.json": [`"version": "${current}"`, 2],
    "src-tauri/tauri.conf.json": [`"version": "${current}"`, 1],
    "src-tauri/Cargo.toml": [`version = "${current}"`, 1],
    "src-tauri/Cargo.lock": [`name = "konzendi"\nversion = "${current}"`, 1],
  };
  for (const [file, [text, count]] of Object.entries(edits)) {
    let content = read(file);
    for (let i = 0; i < count; i++)
      content = content.replace(text, text.replace(current, version));
    write(file, content);
  }
}

const fixedNow = new Date("2026-09-12T23:30:00Z");

describe("versions", () => {
  test("parses only plain MAJOR.MINOR.PATCH", () => {
    assert.deepEqual(parseVersion("0.1.0"), [0, 1, 0]);
    assert.deepEqual(parseVersion("12.0.345"), [12, 0, 345]);
    for (const bad of [
      "v0.1.0",
      "0.1",
      "0.1.0-rc.1",
      "01.0.0",
      "0.1.0 ",
      "0.1.0;rm -rf /",
      "$(id)",
      "",
      undefined,
    ]) {
      assert.equal(parseVersion(bad), null, String(bad));
    }
  });

  test("compares numerically", () => {
    assert.ok(compareVersions("0.10.0", "0.9.9") > 0);
    assert.ok(compareVersions("1.0.0", "0.99.99") > 0);
    assert.equal(compareVersions("0.1.0", "0.1.0"), 0);
  });

  test("the repository's own version files agree", () => {
    assert.ok(parseVersion(versions(root)));
  });

  test("a mismatch names every file and value", () => {
    repository(changelog(NOTES));
    write(
      "src-tauri/tauri.conf.json",
      read("src-tauri/tauri.conf.json").replace(
        '"version": "0.1.0"',
        '"version": "0.1.1"',
      ),
    );
    assert.throws(
      () => versions(dir),
      (error) => {
        assert.ok(error instanceof ReleaseError);
        assert.match(error.message, /tauri\.conf\.json version: 0\.1\.1/);
        assert.match(error.message, /Cargo\.lock konzendi entry: 0\.1\.0/);
        return true;
      },
    );
  });
});

describe("changelog entries", () => {
  test("require compatibility and known limitations, and no empty or unknown subsections", () => {
    assert.deepEqual(entryProblems(NOTES), []);
    assert.deepEqual(entryProblems(""), [
      "the entry is empty",
      'missing "### Compatibility"',
      'missing "### Known limitations"',
    ]);
    assert.match(
      entryProblems("### Added\n\n- x").join("\n"),
      /missing "### Compatibility"/,
    );
    assert.match(
      entryProblems(`${NOTES}\n\n### Fixed\n`).join("\n"),
      /"### Fixed" is empty/,
    );
    assert.match(
      entryProblems(`${NOTES}\n\n### Security\n\n- x`).join("\n"),
      /unknown subsection/,
    );
  });
});

describe("prepare", () => {
  test("first release equal to the current unreleased version dates the changelog only", () => {
    repository(changelog(NOTES));
    const before = snapshot();
    const result = prepare(dir, "0.1.0", { now: fixedNow });
    assert.deepEqual(result.changed, [CHANGELOG]);
    assert.equal(result.date, "2026-09-12");
    const text = read(CHANGELOG);
    assert.match(text, /^Intro text stays\.$/m);
    assert.match(
      text,
      /## \[Unreleased\]\n\n## \[0\.1\.0\] - 2026-09-12\n\n### Added\n/,
    );
    assert.equal(text.match(/## \[Unreleased\]/g).length, 1);
    for (const file of VERSION_FILES)
      assert.equal(read(file), before.files[file], file);
    assert.equal(read("src/unrelated.ts"), before.files["src/unrelated.ts"]);
    const afterState = snapshot();
    assert.equal(afterState.head, before.head);
    assert.equal(afterState.refs, before.refs);
    assert.equal(afterState.index, before.index);
    check(dir, "0.1.0");
  });

  test("a later version changes exactly one line per version location and nothing else", () => {
    repository(changelog(NOTES, `## [0.1.0] - 2026-09-01\n\n${NOTES}`));
    const before = snapshot();
    const result = prepare(dir, "0.2.0", { now: fixedNow });
    assert.deepEqual(
      result.changed.sort(),
      [...VERSION_FILES, CHANGELOG].sort(),
    );
    const expectedLines = {
      "package.json": 1,
      "package-lock.json": 2,
      "src-tauri/tauri.conf.json": 1,
      "src-tauri/Cargo.toml": 1,
      "src-tauri/Cargo.lock": 1,
    };
    for (const file of VERSION_FILES) {
      const old = before.files[file].split("\n");
      const now = read(file).split("\n");
      assert.equal(now.length, old.length, file);
      const changed = old
        .map((line, index) => [line, now[index]])
        .filter(([a, b]) => a !== b);
      assert.equal(changed.length, expectedLines[file], file);
      for (const [a, b] of changed)
        assert.equal(b, a.replace("0.1.0", "0.2.0"), file);
    }
    // Dependencies keep their locked versions.
    const lock = JSON.parse(read("package-lock.json"));
    const oldLock = JSON.parse(before.files["package-lock.json"]);
    for (const [path, entry] of Object.entries(oldLock.packages)) {
      if (path !== "")
        assert.equal(lock.packages[path].version, entry.version, path);
    }
    assert.equal(versions(dir), "0.2.0");
    assert.match(
      read(CHANGELOG),
      /## \[Unreleased\]\n\n## \[0\.2\.0\] - 2026-09-12\n\n### Added[\s\S]*## \[0\.1\.0\] - 2026-09-01/,
    );
    const afterState = snapshot();
    assert.equal(afterState.head, before.head);
    assert.equal(afterState.refs, before.refs);
    assert.equal(afterState.index, before.index);
    check(dir, "0.2.0");
  });

  test("keeps unrelated edits and existing changelog edits", () => {
    repository(changelog("### Added\n\n- placeholder"));
    write(
      "src/unrelated.ts",
      "export const untouched = 2; // work in progress\n",
    );
    write(CHANGELOG, changelog(NOTES));
    prepare(dir, "0.1.0", { now: fixedNow });
    assert.equal(
      read("src/unrelated.ts"),
      "export const untouched = 2; // work in progress\n",
    );
    assert.match(read(CHANGELOG), /Something a user can see/);
  });

  const refusals = [
    [
      "shell-like input",
      changelog(NOTES),
      () => "0.2.0; touch pwned",
      /invalid version/,
    ],
    ["a prefixed version", changelog(NOTES), () => "v0.2.0", /invalid version/],
    [
      "a prerelease suffix",
      changelog(NOTES),
      () => "0.2.0-rc.1",
      /invalid version/,
    ],
    [
      "empty Unreleased notes",
      changelog(""),
      () => "0.1.0",
      /the entry is empty/,
    ],
    [
      "notes without known limitations",
      changelog("### Added\n\n- x\n\n### Compatibility\n\n- y"),
      () => "0.1.0",
      /Known limitations/,
    ],
    [
      "a duplicate dated entry",
      changelog(NOTES, `## [0.2.0] - 2026-09-01\n\n${NOTES}`),
      () => "0.2.0",
      /already has an entry|higher/,
    ],
    [
      "a version already released",
      changelog(NOTES, `## [0.1.0] - 2026-09-01\n\n${NOTES}`),
      () => "0.1.0",
      /already/,
    ],
    [
      "a lower version",
      changelog(NOTES),
      () => "0.0.9",
      /lower than the current version/,
    ],
    [
      "a version not above the latest entry",
      changelog(NOTES, `## [0.3.0] - 2026-09-01\n\n${NOTES}`),
      () => "0.2.0",
      /higher than the latest released version 0\.3\.0/,
    ],
    [
      "an invalid changelog date",
      changelog(NOTES, `## [0.0.1] - 2026-02-30\n\n${NOTES}`),
      () => "0.2.0",
      /invalid date/,
    ],
  ];
  for (const [name, text, version, message] of refusals) {
    test(`refuses ${name} without writing anything`, () => {
      repository(text);
      const before = snapshot();
      assert.throws(() => prepare(dir, version(), { now: fixedNow }), message);
      assert.deepEqual(snapshot(), before);
    });
  }

  test("refuses a branch other than main", () => {
    repository(changelog(NOTES));
    git("checkout", "--quiet", "-b", "feature");
    const before = snapshot();
    assert.throws(() => prepare(dir, "0.1.0"), /prepared on main, not feature/);
    assert.deepEqual(snapshot(), before);
  });

  test("refuses uncommitted changes to a version file", () => {
    repository(changelog(NOTES));
    write(
      "src-tauri/Cargo.toml",
      `${read("src-tauri/Cargo.toml")}\n# local edit\n`,
    );
    const before = snapshot();
    assert.throws(
      () => prepare(dir, "0.2.0"),
      /commit or discard changes to the version files/,
    );
    assert.deepEqual(snapshot(), before);
  });

  test("refuses version files that already disagree", () => {
    repository(changelog(NOTES));
    write(
      "package.json",
      read("package.json").replace('"version": "0.1.0"', '"version": "0.1.5"'),
    );
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "--quiet",
      "-am",
      "drift",
    );
    const before = snapshot();
    assert.throws(() => prepare(dir, "0.2.0"), /do not agree/);
    assert.deepEqual(snapshot(), before);
  });
});

describe("check", () => {
  test("accepts a manually prepared release", () => {
    repository(changelog("", `## [0.4.0] - 2026-09-12\n\n${NOTES}`));
    setAllVersions("0.4.0");
    check(dir, "0.4.0");
    assert.match(
      notes(dir, "0.4.0"),
      /Something a user can see[\s\S]*prototype prerelease[\s\S]*konzendi_0\.4\.0_amd64\.deb/,
    );
  });

  test("rejects a tag version that the files do not declare", () => {
    repository(changelog("", `## [0.1.0] - 2026-09-12\n\n${NOTES}`));
    assert.throws(
      () => check(dir, "0.1.1"),
      /declare 0\.1\.0, not 0\.1\.1[\s\S]*found 0/,
    );
  });

  test("rejects an incomplete entry and a malformed heading", () => {
    repository(
      changelog("", "## [0.1.0] - 2026-09-12\n\n### Added\n\n- x\n\n## Notes"),
    );
    assert.throws(
      () => check(dir, "0.1.0"),
      (error) => {
        assert.match(error.message, /missing "### Compatibility"/);
        assert.match(error.message, /expected "## \[Unreleased\]" or/);
        return true;
      },
    );
  });

  test("never writes", () => {
    repository(changelog(NOTES));
    const before = snapshot();
    assert.throws(() => check(dir, "0.1.0"));
    assert.deepEqual(snapshot(), before);
  });

  test("the command line reports usage for unknown commands", () => {
    assert.throws(() => main(["publish", "0.1.0"], root), /usage/);
  });
});
