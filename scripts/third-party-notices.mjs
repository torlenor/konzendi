#!/usr/bin/env node
// Generates THIRD_PARTY_NOTICES.md from the npm packages embedded in the frontend and the
// Rust crates linked into the Linux executable. `--check` compares instead of writing.
//
// Rust licence data comes from cargo-about (https://github.com/EmbarkStudios/cargo-about),
// run offline against the locked dependency graph so the result does not depend on the
// network. Run `cargo fetch --locked` in src-tauri/ first. Set CARGO_ABOUT to its path when
// it is not on PATH.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = join(root, "THIRD_PARTY_NOTICES.md");

// Packages that ship no licence text of their own. Each entry names a text with the same
// terms and copyright holder, and says why it applies.
const npmTextOverrides = {
  "@tauri-apps/plugin-global-shortcut": {
    file: "node_modules/@tauri-apps/api/LICENSE_MIT",
    reason:
      "The package ships only an SPDX summary (MIT OR Apache-2.0, Tauri contributors). It is used under MIT; the text is the MIT licence of @tauri-apps/api from the same project.",
  },
};

const fence = "````";

function block(text) {
  if (text.includes(fence))
    throw new Error("licence text contains a Markdown fence");
  return `${fence}text\n${text.replace(/\s+$/, "")}\n${fence}\n`;
}

function npmPackages() {
  const lock = JSON.parse(
    readFileSync(join(root, "package-lock.json"), "utf8"),
  );
  const packages = [];
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (path === "" || entry.dev || entry.devOptional) continue;
    const name = path.replace(/^.*node_modules\//, "");
    const dir = join(root, path);
    const override = npmTextOverrides[name];
    let texts;
    if (override) {
      texts = [
        {
          file: override.file,
          text: readFileSync(join(root, override.file), "utf8"),
        },
      ];
    } else {
      texts = readdirSync(dir)
        .filter(
          (file) =>
            /^(licen[cs]e|copying|notice)/i.test(file) &&
            !/\.spdx$/i.test(file),
        )
        .sort()
        .map((file) => ({ file, text: readFileSync(join(dir, file), "utf8") }));
    }
    if (texts.length === 0) {
      throw new Error(
        `${name} ${entry.version} has no licence text; add an override`,
      );
    }
    packages.push({
      name,
      version: entry.version,
      license: entry.license,
      texts,
      reason: override?.reason,
    });
  }
  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

function cargoAbout() {
  const tool = process.env.CARGO_ABOUT ?? "cargo-about";
  const dir = mkdtempSync(join(tmpdir(), "konzendi-notices-"));
  try {
    const file = join(dir, "about.json");
    execFileSync(
      tool,
      [
        "generate",
        "--format",
        "json",
        "--offline",
        "--locked",
        "--manifest-path",
        join(root, "src-tauri/Cargo.toml"),
        "--config",
        join(root, "src-tauri/about.toml"),
        "--output-file",
        file,
      ],
      { stdio: ["ignore", "inherit", "inherit"] },
    );
    return JSON.parse(readFileSync(file, "utf8"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Procedural macros run in the compiler and are not part of the executable, and the
// application crate is not third-party.
function distributed(crate) {
  if (crate.source === null) return false;
  return !crate.targets.every((target) => target.kind.includes("proc-macro"));
}

function rustLicences(about) {
  // cargo-about groups by exact text; texts that differ only in white space are one text.
  const byText = new Map();
  for (const licence of about.licenses) {
    const users = licence.used_by
      .map((use) => use.crate)
      .filter(distributed)
      .map((crate) => `${crate.name} ${crate.version}`);
    if (users.length === 0) continue;
    const key = `${licence.id}\n${licence.text.replace(/\s+/g, " ").trim()}`;
    const known = byText.get(key);
    if (known) known.users.push(...users);
    else
      byText.set(key, {
        id: licence.id,
        name: licence.name,
        text: licence.text,
        users,
      });
  }
  const licences = [...byText.values()];
  for (const licence of licences)
    licence.users = [...new Set(licence.users)].sort();
  const crates = new Map();
  for (const licence of licences) {
    for (const user of licence.users) crates.set(user, licence.id);
  }
  for (const entry of about.crates) {
    const key = `${entry.package.name} ${entry.package.version}`;
    if (crates.has(key)) crates.set(key, entry.license);
  }
  return { licences, crates };
}

function render(npm, rust) {
  const lines = [];
  lines.push("# Third-party notices", "");
  lines.push(
    "Konzendi includes the third-party software listed below. Each component remains under its",
    "own licence; the licence texts and copyright notices follow. This file is generated by",
    "`npm run notices` from `package-lock.json` and `src-tauri/Cargo.lock`. Do not edit it by hand.",
    "",
    "Native system libraries, such as WebKitGTK and GTK, are installed by the operating system as",
    "package dependencies and are not included here.",
    "",
  );

  lines.push("## JavaScript packages embedded in the interface", "");
  lines.push("| Package | Version | Licence |", "| --- | --- | --- |");
  for (const pkg of npm)
    lines.push(`| ${pkg.name} | ${pkg.version} | ${pkg.license} |`);
  lines.push("");
  for (const pkg of npm) {
    lines.push(`### ${pkg.name} ${pkg.version}`, "");
    if (pkg.reason) lines.push(pkg.reason, "");
    for (const { text } of pkg.texts) lines.push(block(text));
  }

  lines.push("## Rust crates linked into the executable", "");
  lines.push("| Crate | Version | Licence |", "| --- | --- | --- |");
  const sorted = [...rust.crates.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [key, licence] of sorted) {
    const [name, version] = key.split(" ");
    lines.push(`| ${name} | ${version} | ${licence} |`);
  }
  lines.push("");
  lines.push("### Licence texts", "");
  rust.licences.forEach((licence, index) => {
    lines.push(`#### ${index + 1}. ${licence.name} (${licence.id})`, "");
    lines.push(`Used by: ${licence.users.join(", ")}.`, "");
    lines.push(block(licence.text));
  });
  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

function main() {
  const check = process.argv.includes("--check");
  const text = render(npmPackages(), rustLicences(cargoAbout()));
  if (check) {
    const current = existsSync(output) ? readFileSync(output, "utf8") : "";
    if (current !== text) {
      console.error(
        "THIRD_PARTY_NOTICES.md is out of date. Run `npm run notices` and commit it.",
      );
      process.exit(1);
    }
    console.log("THIRD_PARTY_NOTICES.md is up to date.");
    return;
  }
  writeFileSync(output, text);
  console.log(`Wrote ${output}`);
}

main();
