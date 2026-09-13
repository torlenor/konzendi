// Tests for scripts/logo-export.mjs. Run with `npm run test:scripts`.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, test } from "node:test";
import {
  checkOutput,
  checkSource,
  LogoExportError,
  main,
  OUTPUT,
  pngHeader,
  render,
  SOURCE,
} from "./logo-export.mjs";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(join(root, SOURCE), "utf8");

describe("logo export", () => {
  test("the committed tray icon is the export of the logo source", () => {
    const committed = readFileSync(join(root, OUTPUT));
    assert.ok(render(source).equals(committed));
  });

  test("the export is a 32 by 32 px 8-bit RGBA PNG", () => {
    assert.deepEqual(pngHeader(render(source)), {
      width: 32,
      height: 32,
      bitDepth: 8,
      colourType: 6,
    });
  });

  test("two exports are byte-identical", () => {
    assert.ok(render(source).equals(render(source)));
  });

  test("a source with another view box is rejected", () => {
    const wrong = source.replace('viewBox="0 0 64 64"', 'viewBox="0 0 48 48"');
    assert.throws(() => render(wrong), LogoExportError);
  });

  test("a source without a view box is rejected", () => {
    const wrong = source.replace(' viewBox="0 0 64 64"', "");
    assert.throws(() => checkSource(wrong), LogoExportError);
  });

  test("a source with another intrinsic size is rejected", () => {
    const wrong = source.replace("<svg ", '<svg width="32" ');
    assert.throws(() => checkSource(wrong), LogoExportError);
  });

  test("an output of another size is rejected", () => {
    assert.throws(() => checkOutput(render(source, 16)), LogoExportError);
  });

  test("data that is not a PNG is rejected", () => {
    assert.throws(() => checkOutput(Buffer.from(source)), LogoExportError);
  });

  test("the command line rejects unknown and extra arguments", () => {
    assert.throws(() => main(["--size=16"], root), LogoExportError);
    assert.throws(
      () => main(["--check", "--app-icons"], root),
      LogoExportError,
    );
  });
});
