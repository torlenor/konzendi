// Tests for scripts/release-ci.mjs against an in-memory GitHub. Run with `npm run test:scripts`.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, describe, test } from "node:test";
import { VERSION_FILES } from "./release.mjs";
import {
  assetNames,
  assets,
  authorize,
  GitHub,
  MANIFEST,
  planAssets,
  publish,
  ReleaseCiError,
  releaseFor,
  SUMS,
  tagVersion,
  validate,
} from "./release-ci.mjs";

const scratch = mkdtempSync(join(tmpdir(), "konzendi-release-ci-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

const COMMIT = "a".repeat(40);
const OTHER = "b".repeat(40);
const TAG_OBJECT = "c".repeat(40);
const REPO = "torlenor/konzendi";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const env = (overrides = {}) => ({
  GITHUB_ACTOR: "torlenor",
  GITHUB_TRIGGERING_ACTOR: "torlenor",
  GITHUB_REPOSITORY: REPO,
  GITHUB_REF: "refs/tags/v0.1.0",
  GITHUB_SHA: COMMIT,
  ...overrides,
});

/** Just enough of the GitHub REST API for the release steps, with a request log. */
class FakeGitHub {
  constructor({
    tags = { "v0.1.0": { commit: COMMIT, annotated: true } },
    main = [COMMIT],
    releases = [],
  } = {}) {
    Object.assign(this, {
      tags,
      main,
      releases,
      nextId: 100,
      requests: [],
    });
  }

  response(status, body) {
    const bytes =
      body instanceof Uint8Array
        ? body
        : Buffer.from(body === undefined ? "" : JSON.stringify(body));
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => JSON.parse(bytes.toString()),
      text: async () => bytes.toString(),
      arrayBuffer: async () => bytes,
    };
  }

  view(release) {
    return {
      ...release,
      html_url: `https://github.com/${REPO}/releases/${release.id}`,
      upload_url: `https://uploads.github.com/repos/${REPO}/releases/${release.id}/assets{?name,label}`,
      assets: release.assets.map(({ id, name }) => ({ id, name })),
    };
  }

  fetch = async (url, { method, body }) => {
    const path = url
      .replace("https://api.github.com", "")
      .replace("https://uploads.github.com", "");
    this.requests.push(`${method} ${path}`);
    for (const [verb, pattern, handle] of this.routes()) {
      const match = pattern.exec(path);
      if (match && (verb === null || verb === method)) {
        return handle(match, method, body);
      }
    }
    throw new Error(`unexpected request ${method} ${path}`);
  };

  routes() {
    const byId = (id) => this.releases.find((entry) => entry.id === Number(id));
    return [
      [
        null,
        /^\/repos\/[^/]+\/[^/]+\/git\/ref\/tags\/(.+)$/,
        ([, name]) => {
          const tag = this.tags[name];
          if (!tag) return this.response(404, { message: "Not Found" });
          return this.response(200, {
            ref: `refs/tags/${name}`,
            object: tag.annotated
              ? { type: "tag", sha: TAG_OBJECT }
              : { type: "commit", sha: tag.commit },
          });
        },
      ],
      [
        null,
        /\/git\/tags\/(.+)$/,
        () => {
          const tag = Object.values(this.tags).find((entry) => entry.annotated);
          return this.response(200, {
            object: { type: "commit", sha: tag.commit },
          });
        },
      ],
      [
        null,
        /\/compare\/([0-9a-f]+)\.\.\.main$/,
        ([, commit]) =>
          this.response(200, {
            status: this.main.includes(commit) ? "ahead" : "diverged",
          }),
      ],
      [
        "GET",
        /\/releases\?per_page=100&page=1$/,
        () =>
          this.response(
            200,
            this.releases.map((release) => this.view(release)),
          ),
      ],
      [
        "POST",
        /\/releases$/,
        (_match, _method, body) => {
          const release = {
            id: this.nextId++,
            assets: [],
            ...JSON.parse(body),
          };
          this.releases.push(release);
          return this.response(201, this.view(release));
        },
      ],
      [
        null,
        /\/releases\/(\d+)$/,
        ([, id], method, body) => {
          const release = byId(id);
          if (method === "PATCH") {
            const fields = JSON.parse(body);
            // As measured on GitHub: an update to a draft that omits tag_name detaches it.
            if (release.draft && fields.tag_name === undefined) {
              fields.tag_name = `untagged-${release.id}`;
            }
            Object.assign(release, fields);
          }
          return this.response(200, this.view(release));
        },
      ],
      [
        "GET",
        /\/releases\/assets\/(\d+)$/,
        ([, id]) => {
          const asset = this.releases
            .flatMap((release) => release.assets)
            .find((entry) => entry.id === Number(id));
          return this.response(200, asset.bytes);
        },
      ],
      [
        "POST",
        /\/releases\/(\d+)\/assets\?name=(.+)$/,
        ([, id, encoded], _method, body) => {
          const release = byId(id);
          const name = decodeURIComponent(encoded);
          if (release.assets.some((asset) => asset.name === name)) {
            return this.response(422, { message: "already_exists" });
          }
          release.assets.push({
            id: this.nextId++,
            name,
            bytes: Buffer.from(body),
          });
          return this.response(201, {});
        },
      ],
    ];
  }

  client() {
    return new GitHub({
      token: "test-token",
      repository: REPO,
      fetch: this.fetch,
    });
  }

  writes() {
    return this.requests.filter((request) => !request.startsWith("GET"));
  }
}

const published = (tag, id = 1) => ({
  id,
  tag_name: tag,
  draft: false,
  assets: [],
  name: tag,
});

/** A checkout with a prepared 0.1.0 and a checked build for COMMIT. */
function fixture(name = "build") {
  const root = join(scratch, `${name}-root`);
  const repository = resolve(import.meta.dirname, "..");
  for (const file of VERSION_FILES) {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), readFileSync(join(repository, file)));
  }
  writeFileSync(
    join(root, "CHANGELOG.md"),
    "# Changelog\n\n## [Unreleased]\n\n## [0.1.0] - 2026-09-12\n\n### Added\n\n- Tracking.\n\n### Compatibility\n\n- Ubuntu 24.04.\n\n### Known limitations\n\n- X11 only.\n",
  );
  const input = join(scratch, `${name}-input`);
  mkdirSync(input, { recursive: true });
  writeFileSync(join(input, "Konzendi_0.1.0_amd64.deb"), "package bytes");
  writeFileSync(join(input, "NOTICES.md"), "notices");
  const dir = join(scratch, `${name}-assets`);
  assets({
    deb: join(input, "Konzendi_0.1.0_amd64.deb"),
    notices: join(input, "NOTICES.md"),
    version: "0.1.0",
    commit: COMMIT,
    tag: "v0.1.0",
    out: dir,
    env: {
      GITHUB_REPOSITORY: REPO,
      GITHUB_RUN_ID: "42",
      GITHUB_SERVER_URL: "https://github.com",
    },
    probe: () => "probed",
  });
  return { root, dir };
}

describe("gates", () => {
  test("only the owner may push and re-run", () => {
    authorize({
      actor: "torlenor",
      triggeringActor: "torlenor",
      repository: REPO,
    });
    assert.throws(
      () =>
        authorize({
          actor: "someone",
          triggeringActor: "torlenor",
          repository: REPO,
        }),
      /pushed by someone/,
    );
    assert.throws(
      () =>
        authorize({
          actor: "torlenor",
          triggeringActor: "someone",
          repository: REPO,
        }),
      /started by someone/,
    );
    assert.throws(
      () =>
        authorize({
          actor: "torlenor",
          triggeringActor: "torlenor",
          repository: "fork/konzendi",
        }),
      /is not/,
    );
  });

  test("tags must be vMAJOR.MINOR.PATCH", () => {
    assert.equal(tagVersion("refs/tags/v1.2.3"), "1.2.3");
    for (const ref of [
      "refs/tags/1.2.3",
      "refs/tags/v1.2",
      "refs/tags/v1.2.3-rc.1",
      "refs/heads/v1.2.3",
      "refs/tags/v01.2.3",
      "refs/tags/v1.2.3;id",
    ]) {
      assert.throws(() => tagVersion(ref), ReleaseCiError, ref);
    }
  });

  test("published releases are never reused and versions must increase", () => {
    assert.equal(releaseFor([], "v0.1.0", "0.1.0"), null);
    const draft = { id: 5, tag_name: "v0.2.0", draft: true };
    assert.equal(
      releaseFor([published("v0.1.0"), draft], "v0.2.0", "0.2.0"),
      draft,
    );
    assert.throws(
      () => releaseFor([published("v0.2.0")], "v0.2.0", "0.2.0"),
      /already published/,
    );
    assert.throws(
      () => releaseFor([published("v0.3.0")], "v0.2.0", "0.2.0"),
      /not higher than the published version 0\.3\.0/,
    );
    // Drafts of other versions and unrelated tags do not count as released.
    assert.equal(
      releaseFor(
        [{ id: 1, tag_name: "v9.0.0", draft: true }, published("nightly")],
        "v0.2.0",
        "0.2.0",
      ),
      null,
    );
  });

  test("asset plans keep matches, upload gaps, and stop on conflicts", () => {
    const expected = new Map([
      ["a", "1"],
      ["b", "2"],
      ["c", "3"],
    ]);
    assert.deepEqual(planAssets(expected, [{ name: "a", sha256: "1" }]), {
      skip: ["a"],
      upload: ["b", "c"],
      conflicts: [],
    });
    const plan = planAssets(expected, [
      { name: "a", sha256: "9" },
      { name: "x", sha256: "1" },
    ]);
    assert.deepEqual(plan.conflicts, [
      "a differs from the checked build",
      "x is not part of this release",
    ]);
  });
});

describe("validate", () => {
  test("accepts an annotated tag on main", async () => {
    const github = new FakeGitHub();
    const result = await validate({ env: env(), github: github.client() });
    assert.deepEqual(result, {
      version: "0.1.0",
      tag: "v0.1.0",
      commit: COMMIT,
      prerelease: true,
    });
    assert.deepEqual(github.writes(), []);
  });

  const refusals = [
    [
      "an untrusted actor",
      {},
      env({ GITHUB_ACTOR: "stranger" }),
      /only torlenor may release/,
    ],
    [
      "an untrusted re-run",
      {},
      env({ GITHUB_TRIGGERING_ACTOR: "stranger" }),
      /started by stranger/,
    ],
    [
      "a malformed tag",
      {},
      env({ GITHUB_REF: "refs/tags/v0.1" }),
      /not a release tag/,
    ],
    [
      "a lightweight tag",
      { tags: { "v0.1.0": { commit: COMMIT, annotated: false } } },
      env(),
      /lightweight tag/,
    ],
    ["a deleted tag", { tags: {} }, env(), /no longer exists/],
    [
      "a moved tag",
      { tags: { "v0.1.0": { commit: OTHER, annotated: true } } },
      env(),
      /now points to b+, but this run started for a+/,
    ],
    ["a commit outside main", { main: [OTHER] }, env(), /is not on main/],
    [
      "a published version",
      { releases: [published("v0.1.0")] },
      env(),
      /already published/,
    ],
    [
      "a version below a published one",
      { releases: [published("v0.2.0")] },
      env(),
      /not higher/,
    ],
  ];
  for (const [name, state, environment, message] of refusals) {
    test(`refuses ${name} before building`, async () => {
      const github = new FakeGitHub(state);
      await assert.rejects(
        validate({ env: environment, github: github.client() }),
        message,
      );
      assert.deepEqual(github.writes(), []);
    });
  }

  test("refuses a tag deletion event", async () => {
    await assert.rejects(
      validate({
        env: env(),
        github: new FakeGitHub().client(),
        event: { deleted: true },
      }),
      /deleted/,
    );
  });
});

describe("assets", () => {
  test("names, checksums, and manifest describe the checked commit", () => {
    const { dir } = fixture("assets");
    const manifest = JSON.parse(readFileSync(join(dir, MANIFEST), "utf8"));
    assert.equal(manifest.source.commit, COMMIT);
    assert.equal(manifest.tag, "v0.1.0");
    assert.equal(
      manifest.workflow.url,
      `https://github.com/${REPO}/actions/runs/42`,
    );
    assert.equal(manifest.package.sha256, sha256(Buffer.from("package bytes")));
    const sums = readFileSync(join(dir, SUMS), "utf8").trim().split("\n");
    assert.equal(sums.length, 3);
    for (const line of sums) {
      const [hash, file] = line.split("  ");
      assert.equal(hash, sha256(readFileSync(join(dir, file))), file);
    }
    assert.ok(!sums.some((line) => line.endsWith(SUMS)));
  });

  test("refuses an invalid version or commit", () => {
    assert.throws(
      () => assets({ deb: "x", version: "0.1", commit: COMMIT, out: scratch }),
      /invalid version/,
    );
    assert.throws(
      () =>
        assets({ deb: "x", version: "0.1.0", commit: "main", out: scratch }),
      /invalid commit/,
    );
  });
});

describe("publish", () => {
  const quiet = () => {};

  test("creates a draft, uploads all assets, verifies them, and marks it ready without publishing", async () => {
    const { root, dir } = fixture("fresh");
    const github = new FakeGitHub();
    const result = await publish({
      env: env(),
      github: github.client(),
      dir,
      tag: "v0.1.0",
      commit: COMMIT,
      root,
      log: quiet,
    });
    assert.deepEqual(result.uploaded.sort(), assetNames("0.1.0").sort());
    const [release] = github.releases;
    assert.equal(release.draft, true);
    assert.equal(release.prerelease, true);
    assert.equal(release.name, "Konzendi 0.1.0");
    assert.match(release.body, /^### Added\n\n- Tracking\./);
    assert.doesNotMatch(release.body, /incomplete/);
    assert.equal(release.tag_name, "v0.1.0");
    assert.ok(
      !github.writes().some((request) => /git\/refs|git\/tags/.test(request)),
    );
  });

  test("a failed upload leaves a marked incomplete draft that a re-run completes", async () => {
    const { root, dir } = fixture("partial");
    const github = new FakeGitHub();
    const client = github.client();
    await assert.rejects(
      publish({
        env: env(),
        github: client,
        dir,
        tag: "v0.1.0",
        commit: COMMIT,
        root,
        fault: "upload",
        log: quiet,
      }),
      /injected failure/,
    );
    assert.equal(github.releases[0].assets.length, 1);
    assert.match(github.releases[0].name, /incomplete draft, do not publish/);
    const result = await publish({
      env: env(),
      github: client,
      dir,
      tag: "v0.1.0",
      commit: COMMIT,
      root,
      log: quiet,
    });
    assert.equal(result.kept.length, 1);
    assert.equal(result.uploaded.length, 3);
    assert.equal(github.releases.length, 1);
    assert.equal(github.releases[0].name, "Konzendi 0.1.0");
    assert.equal(github.releases[0].tag_name, "v0.1.0");
  });

  test("a re-run after a ready draft continues that draft and keeps it on the tag", async () => {
    const { root, dir } = fixture("rerun-ready");
    const github = new FakeGitHub();
    const client = github.client();
    const run = () =>
      publish({
        env: env(),
        github: client,
        dir,
        tag: "v0.1.0",
        commit: COMMIT,
        root,
        log: quiet,
      });
    await run();
    const second = await run();
    assert.equal(github.releases.length, 1);
    assert.equal(second.kept.length, 4);
    assert.deepEqual(second.uploaded, []);
    assert.equal(github.releases[0].tag_name, "v0.1.0");
  });

  test("a draft detached from its tag is found by its marker and attached again", async () => {
    const { root, dir } = fixture("detached");
    const github = new FakeGitHub();
    const client = github.client();
    const run = () =>
      publish({
        env: env(),
        github: client,
        dir,
        tag: "v0.1.0",
        commit: COMMIT,
        root,
        log: quiet,
      });
    await run();
    // An edit elsewhere that omits the tag, as on GitHub.
    github.releases[0].tag_name = "untagged-abc";
    const second = await run();
    assert.equal(github.releases.length, 1);
    assert.equal(second.kept.length, 4);
    assert.equal(github.releases[0].tag_name, "v0.1.0");
  });

  test("a conflicting asset stops without overwriting anything", async () => {
    const { root, dir } = fixture("conflict");
    const github = new FakeGitHub({
      releases: [
        {
          id: 7,
          tag_name: "v0.1.0",
          draft: true,
          assets: [{ id: 8, name: SUMS, bytes: Buffer.from("tampered") }],
        },
      ],
    });
    await assert.rejects(
      publish({
        env: env(),
        github: github.client(),
        dir,
        tag: "v0.1.0",
        commit: COMMIT,
        root,
        log: quiet,
      }),
      /SHA256SUMS differs from the checked build[\s\S]*gh release delete v0\.1\.0/,
    );
    assert.equal(github.releases[0].assets.length, 1);
    assert.ok(
      !github.requests.some((request) => request.includes("/assets?name=")),
    );
  });

  test("a published release is left untouched", async () => {
    const { root, dir } = fixture("published");
    const github = new FakeGitHub({ releases: [published("v0.1.0", 9)] });
    await assert.rejects(
      publish({
        env: env(),
        github: github.client(),
        dir,
        tag: "v0.1.0",
        commit: COMMIT,
        root,
        log: quiet,
      }),
      /already published/,
    );
    assert.deepEqual(github.writes(), []);
  });

  test("a tag moved after the checks stops before the draft is created", async () => {
    const { root, dir } = fixture("moved");
    const github = new FakeGitHub({
      tags: { "v0.1.0": { commit: OTHER, annotated: true } },
    });
    await assert.rejects(
      publish({
        env: env(),
        github: github.client(),
        dir,
        tag: "v0.1.0",
        commit: COMMIT,
        root,
        log: quiet,
      }),
      /not the checked commit/,
    );
    assert.deepEqual(github.writes(), []);
  });

  test("artifacts built for another commit are refused", async () => {
    const { root, dir } = fixture("other-commit");
    const github = new FakeGitHub({
      tags: { "v0.1.0": { commit: OTHER, annotated: true } },
    });
    await assert.rejects(
      publish({
        env: env(),
        github: github.client(),
        dir,
        tag: "v0.1.0",
        commit: OTHER,
        root,
        log: quiet,
      }),
      /describes v0\.1\.0 at a+, not v0\.1\.0 at b+/,
    );
    assert.deepEqual(github.writes(), []);
  });

  test("a modified artifact no longer matches its checksums", async () => {
    const { root, dir } = fixture("modified");
    writeFileSync(join(dir, "konzendi_0.1.0_amd64.deb"), "other bytes");
    await assert.rejects(
      publish({
        env: env(),
        github: new FakeGitHub().client(),
        dir,
        tag: "v0.1.0",
        commit: COMMIT,
        root,
        log: quiet,
      }),
      /does not match the downloaded build artifacts/,
    );
  });

  test("an untrusted re-run cannot write", async () => {
    const { root, dir } = fixture("actor");
    const github = new FakeGitHub();
    await assert.rejects(
      publish({
        env: env({ GITHUB_TRIGGERING_ACTOR: "stranger" }),
        github: github.client(),
        dir,
        tag: "v0.1.0",
        commit: COMMIT,
        root,
        log: quiet,
      }),
      /only torlenor/,
    );
    assert.deepEqual(github.requests, []);
  });
});
