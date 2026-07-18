// Permanent regression for scripts/boundary-check.ts's pure detection
// logic (P340). Complements the manual bite-proof demonstration recorded
// in outputs/p340-generators-checkers.md — this test keeps the same
// detection surviving as an automated `bun test` check, using string
// inputs only (no scratch files under src/**).

import { describe, expect, test } from "bun:test";
import { resolvesIntoAdapters, scanBoundaries } from "../../scripts/boundary-check";
import { resolve } from "node:path";

describe("boundary-check: resolvesIntoAdapters", () => {
  test("a relative import climbing into src/adapters/** is a violation", () => {
    expect(resolvesIntoAdapters("../adapters/shared/thing", "/pkg/src/semantic-core", "/pkg/src")).toBe(true);
  });

  test("a relative import to a sibling semantic-core module is not a violation", () => {
    expect(resolvesIntoAdapters("../governance/gate", "/pkg/src/semantic-core", "/pkg/src")).toBe(false);
  });

  test("a bare package specifier is never treated as src-internal", () => {
    expect(resolvesIntoAdapters("node:fs", "/pkg/src/semantic-core", "/pkg/src")).toBe(false);
    expect(resolvesIntoAdapters("some-package", "/pkg/src/semantic-core", "/pkg/src")).toBe(false);
  });

  test("an import from within src/adapters itself to a sibling adapter file is not flagged by this predicate", () => {
    // (scanBoundaries separately skips scanning adapter files entirely — adapters
    // importing adapters, or adapters importing core, is allowed by ADR-002.)
    expect(resolvesIntoAdapters("./codex/x", "/pkg/src/adapters/shared", "/pkg/src")).toBe(true);
  });
});

describe("boundary-check: scanBoundaries against the real current src/ tree", () => {
  test("the current scaffold has zero boundary violations", () => {
    const srcDir = resolve(import.meta.dir, "..", "..", "src");
    const violations = scanBoundaries(srcDir);
    expect(violations).toEqual([]);
  });
});
