// P430 S2/S3: the ONE shared atomic write utility — fail-closed proof
// (ADR-005 gap classes 1/3/4: no warn-only default, no env-var escape
// hatch). This is the "at least one assertion demonstrated to deny (not
// warn) on violation" evidence the validation contract requires.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assertWithinAllowedRoots, atomicWriteFile, WriteScopeViolationError } from "../../src/governance/atomic-write";
import { makeTempOutcomeDir } from "./gate-test-helpers";

describe("assertWithinAllowedRoots: fail-closed, not warn-only", () => {
  test("throws (never a console warning) when the target is outside every allowed root", () => {
    expect(() => assertWithinAllowedRoots("/etc/passwd", ["/tmp/allowed-root"])).toThrow(WriteScopeViolationError);
  });

  test("does not throw when the target resolves under an allowed root", () => {
    const root = makeTempOutcomeDir();
    expect(() => assertWithinAllowedRoots(join(root, "sub", "file.json"), [root])).not.toThrow();
  });

  test("a sibling directory whose name merely starts with the same prefix is NOT treated as within-root (no accidental path-prefix escape)", () => {
    const root = makeTempOutcomeDir();
    expect(() => assertWithinAllowedRoots(`${root}-evil-sibling/file.json`, [root])).toThrow(WriteScopeViolationError);
  });
});

describe("atomicWriteFile: fail-closed write + real tmp+rename", () => {
  test("writes byte-identical content inside an allowed root", () => {
    const root = makeTempOutcomeDir();
    const target = join(root, "nested", "out.json");
    atomicWriteFile(target, '{"a":1}', [root]);
    expect(existsSync(target)).toBe(true);
    expect(readFileSync(target, "utf8")).toBe('{"a":1}');
  });

  test("refuses (throws, no partial write left behind) a target outside every allowed root", () => {
    const root = makeTempOutcomeDir();
    const outsideTarget = join(root + "-outside", "out.json");
    expect(() => atomicWriteFile(outsideTarget, "{}", [root])).toThrow(WriteScopeViolationError);
    expect(existsSync(outsideTarget)).toBe(false);
  });

  test("there is no environment-variable override that permits the out-of-scope write", () => {
    const root = makeTempOutcomeDir();
    const outsideTarget = join(root + "-outside2", "out.json");
    const prior = process.env.PALANTIR_MINI_WRITE_SET_STRICT;
    try {
      // Setting this legacy P220-style flag to "0" (the shape that made the
      // legacy plugin's assertion permissive) must have NO effect here —
      // atomic-write.ts reads no environment variable at all.
      process.env.PALANTIR_MINI_WRITE_SET_STRICT = "0";
      expect(() => atomicWriteFile(outsideTarget, "{}", [root])).toThrow(WriteScopeViolationError);
    } finally {
      if (prior === undefined) delete process.env.PALANTIR_MINI_WRITE_SET_STRICT;
      else process.env.PALANTIR_MINI_WRITE_SET_STRICT = prior;
    }
  });
});
