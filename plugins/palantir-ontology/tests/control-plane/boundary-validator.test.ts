// S2/S3: boundary validator regression (ledger row P450, docs/architecture.md
// ADR-003). Complements the manual live bite-proof demonstration recorded in
// outputs/p450-control-plane-catalog.md — this test keeps the same
// detection surviving as an automated `bun test` check, matching the
// precedent `tests/scripts/boundary-check.test.ts` set for P340/P430.

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  scanControlPlaneCompleteness,
  scanControlPlaneKindCollisions,
  scanForObjectTypeShapedFiles,
} from "../../src/control-plane/boundary-validator";
import { CONTROL_PLANE_CATALOG } from "../../src/control-plane/registry";
import type { ControlPlaneNode } from "../../src/control-plane/types";

const PACKAGE_ROOT = resolve(import.meta.dir, "..", "..");

describe("scanControlPlaneKindCollisions", () => {
  test("the real CONTROL_PLANE_CATALOG has zero collisions", () => {
    expect(scanControlPlaneKindCollisions(CONTROL_PLANE_CATALOG)).toEqual([]);
  });

  test("bite proof: a synthetic entry whose kind is a registered product-primitive value FAILS with a stable, registered reason code", () => {
    // `kind` is deliberately cast through `unknown` — this is exactly the
    // untyped-bypass shape the check defends against; a correctly-typed
    // caller can never construct this value (ControlPlaneNodeKind and
    // PrimitiveKind are disjoint enums).
    const synthetic = [{ nodeId: "synthetic-bypass", kind: "ObjectType" as unknown as ControlPlaneNode["kind"] }];
    const violations = scanControlPlaneKindCollisions(synthetic);
    expect(violations).toEqual([
      {
        nodeId: "synthetic-bypass",
        kind: "ObjectType",
        reasonCode: "RC-CONTROL-PLANE-PRODUCT-PRIMITIVE-COLLISION",
        detail: 'kind "ObjectType" collides with a registered product-primitive kind (ADR-001/ADR-003 boundary) — a control-plane node may never be registered as a product primitive',
      },
    ]);
  });

  test("bite proof, then clean: removing the synthetic entry restores zero violations", () => {
    const synthetic = [{ nodeId: "synthetic-bypass", kind: "Property" as unknown as ControlPlaneNode["kind"] }];
    expect(scanControlPlaneKindCollisions(synthetic).length).toBe(1);
    // "remove" — the synthetic array is discarded (never written to disk);
    // the real catalog was never touched.
    expect(scanControlPlaneKindCollisions(CONTROL_PLANE_CATALOG)).toEqual([]);
  });

  test("a legitimate ControlPlaneNodeKind value never trips the collision check", () => {
    expect(scanControlPlaneKindCollisions([{ nodeId: "x", kind: "tool" }])).toEqual([]);
  });
});

describe("scanControlPlaneCompleteness", () => {
  test("the real package tree against the real catalog has zero gaps (method proof: live filesystem scan, not a hand-typed claim)", () => {
    expect(scanControlPlaneCompleteness(PACKAGE_ROOT, CONTROL_PLANE_CATALOG)).toEqual([]);
  });

  test("a scripts/*.ts file with no matching catalog entry is caught as an undiscovered-file gap", () => {
    const scratchRoot = mkdtempSync(join(tmpdir(), "p450-completeness-scan-"));
    try {
      mkdirSync(join(scratchRoot, "scripts"), { recursive: true });
      writeFileSync(join(scratchRoot, "scripts", "unregistered-tool.ts"), "export {};\n");

      const gaps = scanControlPlaneCompleteness(scratchRoot, []);
      expect(gaps).toContainEqual({
        kind: "undiscovered-file",
        relPath: "scripts/unregistered-tool.ts",
        detail: 'scripts/*.ts file "scripts/unregistered-tool.ts" has no matching CONTROL_PLANE_CATALOG sourcePath',
      });
    } finally {
      rmSync(scratchRoot, { recursive: true, force: true });
    }
  });

  test("an active catalog entry whose sourcePath is missing on disk is caught as a missing-active-source gap", () => {
    const scratchRoot = mkdtempSync(join(tmpdir(), "p450-completeness-missing-"));
    try {
      const catalog: readonly ControlPlaneNode[] = [
        {
          nodeId: "ghost",
          kind: "tool",
          sourcePath: "scripts/ghost.ts",
          runtimeScope: "all",
          status: "active",
          disposition: { source: "self", row: "test" },
        },
      ];
      const gaps = scanControlPlaneCompleteness(scratchRoot, catalog);
      expect(gaps).toContainEqual({
        kind: "missing-active-source",
        nodeId: "ghost",
        sourcePath: "scripts/ghost.ts",
        detail: 'catalog entry "ghost" is status:"active" but "scripts/ghost.ts" does not exist on disk',
      });
    } finally {
      rmSync(scratchRoot, { recursive: true, force: true });
    }
  });

  test("a 'planned' entry's missing sourcePath is NOT flagged (ADR-003: registered ahead of construction)", () => {
    const scratchRoot = mkdtempSync(join(tmpdir(), "p450-completeness-planned-"));
    try {
      const catalog: readonly ControlPlaneNode[] = [
        {
          nodeId: "future-adapter",
          kind: "adapter",
          sourcePath: "src/adapters/future/",
          runtimeScope: "codex",
          status: "planned",
          disposition: { source: "self", row: "test" },
        },
      ];
      expect(scanControlPlaneCompleteness(scratchRoot, catalog)).toEqual([]);
    } finally {
      rmSync(scratchRoot, { recursive: true, force: true });
    }
  });
});

describe("scanForObjectTypeShapedFiles (absence scan)", () => {
  test("the real successor tree has zero *.objecttype.ts files", () => {
    expect(scanForObjectTypeShapedFiles(PACKAGE_ROOT)).toEqual([]);
  });

  test("bite proof: a synthetic *.objecttype.ts file IS detected, then removal restores zero matches", () => {
    const scratchRoot = mkdtempSync(join(tmpdir(), "p450-objecttype-scan-"));
    try {
      mkdirSync(join(scratchRoot, "self"), { recursive: true });
      writeFileSync(join(scratchRoot, "self", "hook.objecttype.ts"), "// SCRATCH — the exact legacy anti-pattern P210 found.\nexport {};\n");

      expect(scanForObjectTypeShapedFiles(scratchRoot)).toEqual(["self/hook.objecttype.ts"]);
    } finally {
      rmSync(scratchRoot, { recursive: true, force: true });
      // "remove -> PASS": once the scratch dir is gone, a fresh scan of the
      // real tree (never touched by this test) is still empty.
      expect(scanForObjectTypeShapedFiles(PACKAGE_ROOT)).toEqual([]);
    }
  });
});
