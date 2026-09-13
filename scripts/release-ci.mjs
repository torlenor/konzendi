#!/usr/bin/env node
// Release steps that run in GitHub Actions. See docs/RELEASING.md and
// .github/workflows/release.yml.
//
//   node scripts/release-ci.mjs assets --deb PATH --version V --commit SHA --out DIR [--tag TAG]
//   node scripts/release-ci.mjs validate
//   node scripts/release-ci.mjs publish --dir DIR --tag TAG --commit SHA
//
// `validate` and `publish` read GITHUB_* variables and use GITHUB_TOKEN. Neither ever
// creates, moves, or deletes a tag or commit, and neither publishes a release.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  compareVersions,
  notes,
  parseVersion,
  REPOSITORY,
  ReleaseError,
} from "./release.mjs";

/** The only account allowed to start, re-run, and write a release. */
export const OWNER = "torlenor";
export const SUMS = "SHA256SUMS";
export const MANIFEST = "release-manifest.json";
export const NOTICES = "THIRD_PARTY_NOTICES.md";

export class ReleaseCiError extends Error {}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function packageName(version) {
  return `konzendi_${version}_amd64.deb`;
}

export function assetNames(version) {
  return [packageName(version), SUMS, MANIFEST, NOTICES];
}

/** Both the account that pushed the tag and the account that started this attempt. */
export function authorize({ actor, triggeringActor, repository }) {
  const problems = [];
  if (repository !== REPOSITORY)
    problems.push(`repository ${repository} is not ${REPOSITORY}`);
  if (actor !== OWNER)
    problems.push(`the tag was pushed by ${actor || "an unknown actor"}`);
  if (triggeringActor !== OWNER)
    problems.push(
      `this attempt was started by ${triggeringActor || "an unknown actor"}`,
    );
  if (problems.length > 0) {
    throw new ReleaseCiError(
      `only ${OWNER} may release: ${problems.join("; ")}`,
    );
  }
}

/** `refs/tags/vMAJOR.MINOR.PATCH` to its version. */
export function tagVersion(ref) {
  const match = /^refs\/tags\/v(.*)$/.exec(ref ?? "");
  if (!match || !parseVersion(match[1])) {
    throw new ReleaseCiError(
      `${ref} is not a release tag: use vMAJOR.MINOR.PATCH, for example v0.1.0`,
    );
  }
  return match[1];
}

/**
 * Decide what may happen to the release for `tag`: never touch a published one, and only
 * release versions above every published version. Returns the existing draft, if any.
 */
export function releaseFor(releases, tag, version) {
  const own = releases.filter((release) => release.tag_name === tag);
  const published = own.find((release) => !release.draft);
  if (published) {
    throw new ReleaseCiError(
      `${tag} is already published (${published.html_url}). Published releases are never changed; release a new version.`,
    );
  }
  if (own.length > 1) {
    throw new ReleaseCiError(
      `${own.length} drafts exist for ${tag}; delete the extra drafts (not the tag) and re-run`,
    );
  }
  for (const release of releases) {
    if (release.draft || release.tag_name === tag) continue;
    const other = /^v(.*)$/.exec(release.tag_name)?.[1];
    if (parseVersion(other) && compareVersions(version, other) <= 0) {
      throw new ReleaseCiError(
        `${version} is not higher than the published version ${other}`,
      );
    }
  }
  return own[0] ?? null;
}

export function parseSums(text) {
  const sums = new Map();
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    const match = /^([0-9a-f]{64}) {2}(\S+)$/.exec(line);
    if (!match) throw new ReleaseCiError(`malformed ${SUMS} line: ${line}`);
    sums.set(match[2], match[1]);
  }
  return sums;
}

/** Compare draft assets with the checked build: skip matches, upload gaps, stop on conflicts. */
export function planAssets(expected, remote) {
  const plan = { skip: [], upload: [], conflicts: [] };
  const seen = new Set();
  for (const asset of remote) {
    seen.add(asset.name);
    if (!expected.has(asset.name))
      plan.conflicts.push(`${asset.name} is not part of this release`);
    else if (expected.get(asset.name) !== asset.sha256)
      plan.conflicts.push(`${asset.name} differs from the checked build`);
    else plan.skip.push(asset.name);
  }
  for (const name of expected.keys())
    if (!seen.has(name)) plan.upload.push(name);
  return plan;
}

// --- GitHub REST API ---------------------------------------------------------------------

export class GitHub {
  constructor({
    token,
    repository,
    fetch = globalThis.fetch,
    api = "https://api.github.com",
  }) {
    if (!token) throw new ReleaseCiError("GITHUB_TOKEN is not set");
    Object.assign(this, { token, repository, fetch, api });
  }

  async request(
    method,
    path,
    {
      body,
      accept = "application/vnd.github+json",
      contentType,
      allow404 = false,
    } = {},
  ) {
    const url = path.startsWith("https://") ? path : `${this.api}${path}`;
    const headers = {
      Accept: accept,
      Authorization: `Bearer ${this.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    let payload = body;
    if (body !== undefined && !(body instanceof Uint8Array)) {
      payload = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    } else if (contentType) {
      headers["Content-Type"] = contentType;
    }
    const response = await this.fetch(url, { method, headers, body: payload });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) {
      const text = await response.text();
      throw new ReleaseCiError(
        `${method} ${url} failed with ${response.status}: ${text.slice(0, 500)}`,
      );
    }
    if (accept === "application/octet-stream")
      return Buffer.from(await response.arrayBuffer());
    return response.status === 204 ? null : response.json();
  }

  /** The commit a tag points to now, and whether it is an annotated tag. */
  async resolveTag(tag) {
    const ref = await this.request(
      "GET",
      `/repos/${this.repository}/git/ref/tags/${tag}`,
      { allow404: true },
    );
    if (ref === null || ref.ref !== `refs/tags/${tag}`)
      throw new ReleaseCiError(`the tag ${tag} no longer exists`);
    if (ref.object.type === "commit")
      return {
        commit: ref.object.sha,
        object: ref.object.sha,
        annotated: false,
      };
    const annotated = await this.request(
      "GET",
      `/repos/${this.repository}/git/tags/${ref.object.sha}`,
    );
    if (annotated.object.type !== "commit")
      throw new ReleaseCiError(`${tag} does not point to a commit`);
    return {
      commit: annotated.object.sha,
      object: ref.object.sha,
      annotated: true,
    };
  }

  /** Whether `commit` is contained in the default branch. */
  async onMain(commit) {
    const comparison = await this.request(
      "GET",
      `/repos/${this.repository}/compare/${commit}...main`,
    );
    return comparison.status === "identical" || comparison.status === "ahead";
  }

  async releases() {
    const all = [];
    for (let page = 1; ; page++) {
      const batch = await this.request(
        "GET",
        `/repos/${this.repository}/releases?per_page=100&page=${page}`,
      );
      all.push(...batch);
      if (batch.length < 100) return all;
    }
  }

  release(id) {
    return this.request("GET", `/repos/${this.repository}/releases/${id}`);
  }

  createRelease(fields) {
    return this.request("POST", `/repos/${this.repository}/releases`, {
      body: fields,
    });
  }

  updateRelease(id, fields) {
    return this.request("PATCH", `/repos/${this.repository}/releases/${id}`, {
      body: fields,
    });
  }

  downloadAsset(id) {
    return this.request(
      "GET",
      `/repos/${this.repository}/releases/assets/${id}`,
      { accept: "application/octet-stream" },
    );
  }

  uploadAsset(release, name, bytes) {
    const url = `${release.upload_url.replace(/\{.*$/, "")}?name=${encodeURIComponent(name)}`;
    return this.request("POST", url, {
      body: bytes,
      contentType: "application/octet-stream",
    });
  }
}

// --- Commands ----------------------------------------------------------------------------

function run(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/** Collect the four release assets from a checked build. */
export function assets({
  deb,
  version,
  commit,
  out,
  tag = null,
  notices = NOTICES,
  env = process.env,
  probe = run,
}) {
  if (!parseVersion(version))
    throw new ReleaseCiError(`invalid version ${version}`);
  if (!/^[0-9a-f]{40}$/.test(commit ?? ""))
    throw new ReleaseCiError(`invalid commit ${commit}`);
  mkdirSync(out, { recursive: true });
  const name = packageName(version);
  copyFileSync(deb, join(out, name));
  copyFileSync(notices, join(out, NOTICES));
  const bytes = readFileSync(join(out, name));
  const nativePackages = {};
  for (const pkg of (env.NATIVE_PACKAGES ?? "").split(/\s+/).filter(Boolean)) {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: a dpkg-query format, not JavaScript.
    nativePackages[pkg] = probe("dpkg-query", ["-W", "-f=${Version}", pkg]);
  }
  const tauriCli = existsSync("node_modules/@tauri-apps/cli/package.json")
    ? JSON.parse(
        readFileSync("node_modules/@tauri-apps/cli/package.json", "utf8"),
      ).version
    : null;
  const osRelease = existsSync("/etc/os-release")
    ? readFileSync("/etc/os-release", "utf8")
    : "";
  const manifest = {
    schema: 1,
    name: "konzendi",
    version,
    tag,
    source: { repository: env.GITHUB_REPOSITORY ?? null, commit },
    workflow: env.GITHUB_RUN_ID
      ? {
          runId: env.GITHUB_RUN_ID,
          runAttempt: env.GITHUB_RUN_ATTEMPT ?? null,
          url: `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`,
          workflowRef: env.GITHUB_WORKFLOW_REF ?? null,
        }
      : null,
    runner: {
      image: env.ImageOS ?? null,
      imageVersion: env.ImageVersion ?? null,
      os: /^PRETTY_NAME="?([^"\n]*)"?$/m.exec(osRelease)?.[1] ?? null,
      arch: process.arch,
    },
    target: "x86_64-unknown-linux-gnu",
    toolchains: {
      node: process.version,
      npm: probe("npm", ["--version"]),
      rustc: probe("rustc", ["--version"]),
      cargo: probe("cargo", ["--version"]),
      tauriCli,
    },
    nativePackages,
    package: { file: name, sha256: sha256(bytes), size: bytes.length },
  };
  writeFileSync(join(out, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  const sums = [name, MANIFEST, NOTICES]
    .sort()
    .map((file) => `${sha256(readFileSync(join(out, file)))}  ${file}`)
    .join("\n");
  writeFileSync(join(out, SUMS), `${sums}\n`);
  return manifest;
}

function context(env) {
  return {
    actor: env.GITHUB_ACTOR,
    triggeringActor: env.GITHUB_TRIGGERING_ACTOR,
    repository: env.GITHUB_REPOSITORY,
  };
}

/** Everything that must hold before a release is built. */
export async function validate({ env = process.env, github, event = {} }) {
  authorize(context(env));
  if (event.deleted)
    throw new ReleaseCiError("the tag was deleted; nothing to release");
  const version = tagVersion(env.GITHUB_REF);
  const tag = `v${version}`;
  const resolved = await github.resolveTag(tag);
  if (!resolved.annotated) {
    throw new ReleaseCiError(
      `${tag} is a lightweight tag; create it with git tag -a ${tag} -m 'Release ${version}'`,
    );
  }
  if (
    env.GITHUB_SHA !== resolved.commit &&
    env.GITHUB_SHA !== resolved.object
  ) {
    throw new ReleaseCiError(
      `${tag} now points to ${resolved.commit}, but this run started for ${env.GITHUB_SHA}. Pushed tags must not move; release a new version.`,
    );
  }
  if (!(await github.onMain(resolved.commit))) {
    throw new ReleaseCiError(
      `${resolved.commit} is not on main; tag a commit that has been pushed to main`,
    );
  }
  releaseFor(await github.releases(), tag, version);
  return {
    version,
    tag,
    commit: resolved.commit,
    prerelease: parseVersion(version)[0] === 0,
  };
}

function incompleteTitle(version) {
  return `Konzendi ${version} (incomplete draft, do not publish)`;
}

const INCOMPLETE =
  "> [!WARNING]\n> This draft is incomplete. Do not publish it. Re-run the release workflow.\n\n";

/** Create or complete the draft release for a checked build. Never publishes. */
export async function publish({
  env = process.env,
  github,
  dir,
  tag,
  commit,
  root,
  fault = env.RELEASE_FAULT,
  log = console.log,
}) {
  authorize(context(env));
  const version = tagVersion(`refs/tags/${tag}`);
  const names = assetNames(version);

  // The artifacts must be the ones checked for this exact commit and version.
  for (const name of names) {
    if (!existsSync(join(dir, name)))
      throw new ReleaseCiError(
        `the checked build is missing ${name}; re-run all jobs`,
      );
  }
  const local = new Map(
    names.map((name) => [name, sha256(readFileSync(join(dir, name)))]),
  );
  const sums = parseSums(readFileSync(join(dir, SUMS), "utf8"));
  const covered = names.filter((name) => name !== SUMS);
  if (
    sums.size !== covered.length ||
    covered.some((name) => sums.get(name) !== local.get(name))
  ) {
    throw new ReleaseCiError(
      `${SUMS} does not match the downloaded build artifacts`,
    );
  }
  const manifest = JSON.parse(readFileSync(join(dir, MANIFEST), "utf8"));
  if (
    manifest.version !== version ||
    manifest.source?.commit !== commit ||
    manifest.tag !== tag
  ) {
    throw new ReleaseCiError(
      `${MANIFEST} describes ${manifest.tag} at ${manifest.source?.commit}, not ${tag} at ${commit}`,
    );
  }
  if (manifest.package?.sha256 !== local.get(packageName(version))) {
    throw new ReleaseCiError(`${MANIFEST} records a different package hash`);
  }

  const recheck = async () => {
    const resolved = await github.resolveTag(tag);
    if (resolved.commit !== commit) {
      throw new ReleaseCiError(
        `${tag} now points to ${resolved.commit}, not the checked commit ${commit}; stopping`,
      );
    }
  };
  await recheck();

  const body = notes(root, version);
  const prerelease = parseVersion(version)[0] === 0;
  let release = releaseFor(await github.releases(), tag, version);
  if (release === null) {
    release = await github.createRelease({
      tag_name: tag,
      name: incompleteTitle(version),
      body: INCOMPLETE + body,
      draft: true,
      prerelease,
    });
    log(`Created draft ${release.id} for ${tag}`);
  } else {
    release = await github.updateRelease(release.id, {
      name: incompleteTitle(version),
      body: INCOMPLETE + body,
      prerelease,
    });
    log(`Continuing draft ${release.id} for ${tag}`);
  }
  if (!release.draft)
    throw new ReleaseCiError(
      `${tag} was published during this run; stopping without changes`,
    );

  const remote = [];
  for (const asset of release.assets ?? []) {
    remote.push({
      name: asset.name,
      sha256: sha256(await github.downloadAsset(asset.id)),
    });
  }
  const plan = planAssets(local, remote);
  if (plan.conflicts.length > 0) {
    throw new ReleaseCiError(
      [
        `the draft for ${tag} has conflicting assets; nothing was overwritten:`,
        ...plan.conflicts.map((conflict) => `  ${conflict}`),
        `Delete only the incomplete draft (keep the tag): gh release delete ${tag} --repo ${REPOSITORY} --yes`,
        "Then re-run the failed jobs of this workflow run.",
      ].join("\n"),
    );
  }
  for (const name of plan.skip) log(`Matching asset kept: ${name}`);
  for (const name of plan.upload) {
    await github.uploadAsset(release, name, readFileSync(join(dir, name)));
    log(`Uploaded ${name}`);
    if (fault === "upload")
      throw new ReleaseCiError(
        "injected failure after the first upload (RELEASE_FAULT=upload)",
      );
  }

  // Verify what a maintainer would download before calling the draft ready.
  const uploaded = await github.release(release.id);
  const present = uploaded.assets.map((asset) => asset.name).sort();
  if (JSON.stringify(present) !== JSON.stringify([...names].sort())) {
    throw new ReleaseCiError(
      `the draft has assets ${present.join(", ")}, expected ${names.join(", ")}`,
    );
  }
  for (const asset of uploaded.assets) {
    if (
      sha256(await github.downloadAsset(asset.id)) !== local.get(asset.name)
    ) {
      throw new ReleaseCiError(
        `downloaded ${asset.name} does not match the checked build`,
      );
    }
  }
  await recheck();
  const latest = await github.release(release.id);
  if (!latest.draft)
    throw new ReleaseCiError(
      `${tag} was published during this run; stopping without changes`,
    );
  const ready = await github.updateRelease(release.id, {
    name: `Konzendi ${version}`,
    body,
    prerelease,
  });
  return {
    release: ready,
    uploaded: plan.upload,
    kept: plan.skip,
    hashes: local,
  };
}

// --- Command line ------------------------------------------------------------------------

function output(values) {
  const file = process.env.GITHUB_OUTPUT;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  if (file) appendFileSync(file, `${lines.join("\n")}\n`);
  console.log(lines.join("\n"));
}

function summary(markdown) {
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

function github() {
  return new GitHub({
    token: process.env.GITHUB_TOKEN,
    repository: process.env.GITHUB_REPOSITORY,
  });
}

async function main(argv) {
  const [command, ...rest] = argv;
  const { values } = parseArgs({
    args: rest,
    options: {
      deb: { type: "string" },
      version: { type: "string" },
      commit: { type: "string" },
      out: { type: "string" },
      tag: { type: "string" },
      dir: { type: "string" },
    },
  });
  const root = resolve(import.meta.dirname, "..");
  switch (command) {
    case "assets": {
      const manifest = assets({
        ...values,
        tag: values.tag || null,
        notices: join(root, NOTICES),
      });
      console.log(JSON.stringify(manifest, null, 2));
      return;
    }
    case "validate": {
      const event = process.env.GITHUB_EVENT_PATH
        ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
        : {};
      const result = await validate({ github: github(), event });
      output(result);
      return;
    }
    case "publish": {
      const result = await publish({
        github: github(),
        dir: values.dir,
        tag: values.tag,
        commit: values.commit,
        root,
      });
      const rows = [...result.hashes]
        .map(([name, hash]) => `| ${name} | \`${hash}\` |`)
        .join("\n");
      summary(
        `## Draft ready: ${result.release.name}\n\n[Review and publish the draft](${result.release.html_url})\n\n` +
          `Uploaded: ${result.uploaded.join(", ") || "none"}. Kept: ${result.kept.join(", ") || "none"}.\n\n` +
          `| Asset | SHA-256 |\n| --- | --- |\n${rows}\n`,
      );
      console.log(`Draft ready: ${result.release.html_url}`);
      return;
    }
    default:
      throw new ReleaseCiError(
        "usage: release-ci.mjs assets|validate|publish [options]",
      );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((error) => {
    if (!(error instanceof ReleaseCiError || error instanceof ReleaseError))
      throw error;
    console.error(`error: ${error.message}`);
    if (process.env.GITHUB_STEP_SUMMARY)
      summary(`## Release stopped\n\n\`\`\`text\n${error.message}\n\`\`\`\n`);
    process.exit(1);
  });
}
