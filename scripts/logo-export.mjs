#!/usr/bin/env node
// Exports the tray icon PNG from the Konzendi logo source. `--check` compares instead of
// writing. `--app-icons` regenerates the application icons in src-tauri/icons/ instead.
// The tray and the application use the logo as it is; see docs/phases/phase-12-logo-design.md.

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Resvg } from "@resvg/resvg-js";

export const SOURCE = "assets/logo/konzendi-mark-on-light.svg";
export const OUTPUT = "src/assets/konzendi-tray-32.png";
export const SOURCE_VIEW_BOX = "0 0 64 64";
export const OUTPUT_SIZE = 32;

export class LogoExportError extends Error {}

/** The source must use the 64-unit view box and no other intrinsic size. */
export function checkSource(svg) {
  const root = svg.match(/<svg\b[^>]*>/);
  if (root === null)
    throw new LogoExportError("the source has no <svg> element");
  const attribute = (name) =>
    root[0].match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  const viewBox = attribute("viewBox");
  if (viewBox !== SOURCE_VIEW_BOX)
    throw new LogoExportError(
      `the source view box is ${viewBox === undefined ? "missing" : `"${viewBox}"`}, expected "${SOURCE_VIEW_BOX}"`,
    );
  for (const name of ["width", "height"]) {
    const value = attribute(name);
    if (value !== undefined && value !== "64")
      throw new LogoExportError(
        `the source ${name} is "${value}", expected none or "64"`,
      );
  }
}

/** Reads the size and pixel format from the PNG header. */
export function pngHeader(png) {
  const signature = "89504e470d0a1a0a";
  if (png.subarray(0, 8).toString("hex") !== signature)
    throw new LogoExportError("the output is not a PNG");
  if (png.subarray(12, 16).toString("latin1") !== "IHDR")
    throw new LogoExportError("the output PNG has no IHDR chunk");
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    bitDepth: png.readUInt8(24),
    colourType: png.readUInt8(25),
  };
}

/** The output must be an 8-bit RGBA PNG of exactly `size` by `size` pixels. */
export function checkOutput(png, size = OUTPUT_SIZE) {
  const { width, height, bitDepth, colourType } = pngHeader(png);
  if (width !== size || height !== size)
    throw new LogoExportError(
      `the output is ${width} by ${height} px, expected ${size} by ${size} px`,
    );
  if (bitDepth !== 8 || colourType !== 6)
    throw new LogoExportError(
      `the output is not 8-bit RGBA (bit depth ${bitDepth}, colour type ${colourType})`,
    );
}

export function render(svg, size = OUTPUT_SIZE) {
  checkSource(svg);
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
  checkOutput(png, size);
  return png;
}

export const APP_ICON_DIR = "src-tauri/icons";

/** The icon files the application bundle uses. `tauri icon` also writes mobile icons; they are not kept. */
export const APP_ICON_FILES = [
  "32x32.png",
  "128x128.png",
  "128x128@2x.png",
  "icon.png",
  "icon.icns",
  "icon.ico",
  "Square30x30Logo.png",
  "Square44x44Logo.png",
  "Square71x71Logo.png",
  "Square89x89Logo.png",
  "Square107x107Logo.png",
  "Square142x142Logo.png",
  "Square150x150Logo.png",
  "Square284x284Logo.png",
  "Square310x310Logo.png",
  "StoreLogo.png",
];

/** Generates the application icons with the locked Tauri CLI and replaces the bundled set. */
export function exportAppIcons(rootDir) {
  checkSource(readFileSync(join(rootDir, SOURCE), "utf8"));
  const scratch = mkdtempSync(join(tmpdir(), "konzendi-app-icons-"));
  try {
    try {
      execFileSync(
        join(rootDir, "node_modules", ".bin", "tauri"),
        ["icon", SOURCE, "--output", scratch],
        { cwd: rootDir, stdio: "pipe" },
      );
    } catch (failure) {
      throw new LogoExportError(
        `tauri icon failed: ${String(failure.stderr ?? failure).trim()}`,
      );
    }
    const missing = APP_ICON_FILES.filter(
      (file) => !existsSync(join(scratch, file)),
    );
    if (missing.length > 0)
      throw new LogoExportError(
        `tauri icon did not write ${missing.join(", ")}`,
      );
    for (const file of APP_ICON_FILES)
      copyFileSync(join(scratch, file), join(rootDir, APP_ICON_DIR, file));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  checkOutput(readFileSync(join(rootDir, APP_ICON_DIR, "32x32.png")), 32);
}

export function main(argv, rootDir = resolve(import.meta.dirname, "..")) {
  const usage = "usage: logo-export.mjs [--check | --app-icons]";
  if (argv.length > 1) throw new LogoExportError(usage);
  if (argv[0] === "--app-icons") {
    exportAppIcons(rootDir);
    console.log(`Wrote ${APP_ICON_DIR}/ from ${SOURCE}.`);
    return;
  }
  const checkOnly = argv[0] === "--check";
  if (argv.length === 1 && !checkOnly) throw new LogoExportError(usage);
  const png = render(readFileSync(join(rootDir, SOURCE), "utf8"));
  const target = join(rootDir, OUTPUT);
  if (checkOnly) {
    let current;
    try {
      current = readFileSync(target);
    } catch {
      throw new LogoExportError(
        `${OUTPUT} is missing; run npm run logo:export`,
      );
    }
    if (!current.equals(png))
      throw new LogoExportError(
        `${OUTPUT} differs from ${SOURCE}; run npm run logo:export`,
      );
    console.log(`${OUTPUT} matches ${SOURCE}.`);
    return;
  }
  writeFileSync(target, png);
  console.log(`Wrote ${OUTPUT} from ${SOURCE}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof LogoExportError)) throw error;
    console.error(`error: ${error.message}`);
    process.exit(1);
  }
}
