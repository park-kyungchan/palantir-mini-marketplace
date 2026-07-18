// X-001 (requirement trace, ledger row P450).
//
// Source: harness-upstream _workspace/2026-07-17-palantir-ontology-field-manual/
// context/w7-requirements.md row X-001: "Palantir Ontology primitives and
// local control-plane objects are explicitly separated; schemas, hooks,
// tools, workflows, and runtime state are not promoted into product
// primitives." Fixed by docs/architecture.md ADR-003, implemented here.
//
// This suite proves BOTH directions of the bidirectional boundary named by
// ADR-003 ("reject any attempt to register [a control-plane node] as a
// product primitive, and any product primitive as a control-plane node"):
//
// - Direction A (control-plane node registered as a product primitive):
//   already implemented and tested by `src/altitude1/staged-construction.ts`
//   (`stageConstruction`'s `isPrimitiveKind` guard,
//   `RC_CONSTRUCTION_UNREGISTERED_PRIMITIVE_KIND`) — see
//   `tests/altitude1/staged-construction.test.ts`'s "A1-006: fails closed on
//   an unregistered primitive kind (never a ControlPlaneNodeKind value)",
//   which stages `kind: "hook"` (a ControlPlaneNodeKind value) and asserts
//   the denial. Not duplicated here; re-confirmed by name below.
// - Direction B (product primitive registered as a control-plane node):
//   this task's own `scanControlPlaneKindCollisions`
//   (`src/control-plane/boundary-validator.ts`).
//
// Plus the absence scan the mission separately requires: zero runtime
// surfaces modeled as an ObjectType (`*.objecttype.ts`-shaped file)
// anywhere in the successor tree.

import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { isPrimitiveKind, PRIMITIVE_KINDS } from "../../src/altitude1/staged-construction";
import { CONTROL_PLANE_NODE_KINDS, isControlPlaneNodeKind } from "../../src/control-plane/types";
import { CONTROL_PLANE_CATALOG } from "../../src/control-plane/registry";
import { scanControlPlaneKindCollisions, scanForObjectTypeShapedFiles } from "../../src/control-plane/boundary-validator";
import type { ControlPlaneNode } from "../../src/control-plane/types";

const PACKAGE_ROOT = resolve(import.meta.dir, "..", "..");

describe("X-001: the two kind vocabularies are explicitly separated", () => {
  test("positive: zero string overlap between ControlPlaneNodeKind (8 values) and PrimitiveKind (7 values)", () => {
    const overlap = CONTROL_PLANE_NODE_KINDS.filter((k) => isPrimitiveKind(k));
    expect(overlap).toEqual([]);
    const reverseOverlap = PRIMITIVE_KINDS.filter((k) => isControlPlaneNodeKind(k));
    expect(reverseOverlap).toEqual([]);
  });

  test("positive: every registered CONTROL_PLANE_CATALOG entry passes the boundary validator (real catalog, live scan)", () => {
    expect(scanControlPlaneKindCollisions(CONTROL_PLANE_CATALOG)).toEqual([]);
  });

  test("negative, direction B (product primitive registered as a control-plane node): each of the 7 PrimitiveKind values is rejected with a stable code", () => {
    for (const primitiveKind of PRIMITIVE_KINDS) {
      const synthetic = [{ nodeId: `synthetic-${primitiveKind}`, kind: primitiveKind as unknown as ControlPlaneNode["kind"] }];
      const violations = scanControlPlaneKindCollisions(synthetic);
      expect(violations).toHaveLength(1);
      expect(violations[0]?.reasonCode).toBe("RC-CONTROL-PLANE-PRODUCT-PRIMITIVE-COLLISION");
    }
  });

  test("negative, direction A (control-plane node registered as a product primitive): re-confirms staged-construction.ts already rejects every ControlPlaneNodeKind value", () => {
    // Direct re-check of the underlying guard `stageConstruction` calls
    // (`!isPrimitiveKind(params.kind)`), without re-deriving the full
    // FdeSession/DTC fixture machinery `tests/altitude1/
    // staged-construction.test.ts`'s "A1-006" test already exercises
    // end-to-end (that test is the authoritative full-pipeline proof for
    // this direction; this is a lightweight pointer-level re-check that the
    // guard itself covers every ADR-003 kind value, not just "hook").
    for (const controlPlaneKind of CONTROL_PLANE_NODE_KINDS) {
      expect(isPrimitiveKind(controlPlaneKind)).toBe(false);
    }
  });
});

describe("X-001: absence scan — zero runtime surfaces modeled as an ObjectType", () => {
  test("command: scanForObjectTypeShapedFiles(PACKAGE_ROOT); expected output: []", () => {
    expect(scanForObjectTypeShapedFiles(PACKAGE_ROOT)).toEqual([]);
  });
});
