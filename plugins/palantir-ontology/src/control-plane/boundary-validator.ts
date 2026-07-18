// Control-plane boundary validator (ledger row P450, docs/architecture.md
// ADR-003): "the boundary validator (P450) must reject any attempt to
// register [a control-plane node] as a product primitive (and any product
// primitive as a control-plane node)". Three pure, filesystem/data scans:
//
// 1. `scanControlPlaneKindCollisions` — the forward-declared half of the
//    boundary: does any `CONTROL_PLANE_CATALOG` entry's `kind` collide with
//    one of the 7 registered product-primitive kinds
//    (`src/altitude1/staged-construction.ts`'s `PrimitiveKind`)? Under
//    normal typed usage this is structurally unreachable (the two enums are
//    disjoint by construction), so this is defense-in-depth against an
//    untyped/`as any` bypass — the same discipline
//    `staged-construction.ts`'s `checkEvidenceCollection` already applies to
//    cross-class evidence contamination. The REVERSE half of the boundary
//    (a control-plane kind value staged as a product primitive) is already
//    enforced and tested by `staged-construction.ts`'s `stageConstruction`
//    (`RC_CONSTRUCTION_UNREGISTERED_PRIMITIVE_KIND`) — `tests/control-plane/
//    x-001.test.ts` re-demonstrates that direction from this task's own
//    suite without modifying `staged-construction.ts`.
// 2. `scanControlPlaneCompleteness` — walks `scripts/*.ts` (top level only),
//    `scripts/generators/*.ts`, `scripts/generated/*.generated.ts`, and
//    `src/adapters/**`, and fails if any discovered file has no matching
//    `sourcePath` in the catalog, or any `status: "active"` entry's
//    `sourcePath` does not exist on disk. This is validation-contract item
//    2's "method recorded" — a mechanical scan, not a hand-typed claim.
// 3. `scanForObjectTypeShapedFiles` — the absence scan the mission requires
//    ("no runtime surface is modeled as an ObjectType anywhere in the
//    successor tree"): walks the whole plugin tree for any
//    `*.objecttype.ts` file, the exact legacy-anti-pattern shape P210 §8d
//    found in `plugins/palantir-mini`'s `runtime-overlay/schemas-snapshot/
//    ontology/self/*.objecttype.ts` (9 files) and this successor exists to
//    correct (AGENT-CONTRACT.md §2).
//
// Peer-import note: this module imports `isPrimitiveKind` from
// `../altitude1/staged-construction`. `src/altitude1/` and
// `src/control-plane/` are declared PEERS in the same dependency-graph
// bucket (AGENT-CONTRACT.md §1: both listed between `contracts/` and
// `application-service validators`) — `boundary-check.ts`'s scan only
// restricts imports INTO `src/adapters/**` and INTO the two governance
// writer primitives, neither of which applies here, and
// `staged-construction.ts` itself never imports `src/control-plane/`
// (confirmed by its own module doc), so this one-directional peer import
// introduces no cycle.

import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { isPrimitiveKind } from "../altitude1/staged-construction";
import { RC_CONTROL_PLANE_PRODUCT_PRIMITIVE_COLLISION, isRegisteredReasonCode, type ReasonCode } from "../semantic-core/reason-codes";
import { walkFiles } from "../../scripts/lib/fs-walk";
import type { ControlPlaneNode } from "./types";

/** ADR-003 boundary violation: a catalog entry's `kind` collides with a registered product-primitive kind. Always carries a stable, registered reasonCode — never a free-text-only denial. */
export interface KindCollisionViolation {
  readonly nodeId: string;
  readonly kind: string;
  readonly reasonCode: ReasonCode;
  readonly detail: string;
}

export function scanControlPlaneKindCollisions(catalog: readonly Pick<ControlPlaneNode, "nodeId" | "kind">[]): KindCollisionViolation[] {
  const violations: KindCollisionViolation[] = [];
  for (const entry of catalog) {
    if (isPrimitiveKind(entry.kind)) {
      violations.push({
        nodeId: entry.nodeId,
        kind: entry.kind,
        reasonCode: RC_CONTROL_PLANE_PRODUCT_PRIMITIVE_COLLISION,
        detail: `kind "${entry.kind}" collides with a registered product-primitive kind (ADR-001/ADR-003 boundary) — a control-plane node may never be registered as a product primitive`,
      });
    }
  }
  return violations;
}

// Belt-and-suspenders self-check (same discipline as reason-codes.ts's own
// bound-module precedent): the reason code this module binds must actually
// be registered in contracts/reason-code-registry.json.
if (!isRegisteredReasonCode(RC_CONTROL_PLANE_PRODUCT_PRIMITIVE_COLLISION)) {
  throw new Error("boundary-validator.ts: RC_CONTROL_PLANE_PRODUCT_PRIMITIVE_COLLISION is not registered in contracts/reason-code-registry.json");
}

export type CompletenessGap =
  | { readonly kind: "undiscovered-file"; readonly relPath: string; readonly detail: string }
  | { readonly kind: "missing-active-source"; readonly nodeId: string; readonly sourcePath: string; readonly detail: string };

/** Top-level (non-recursive) `.ts` files directly inside `dir`, sorted, relative to `dir`. */
function topLevelTsFiles(dir: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && !e.isSymbolicLink() && e.name.endsWith(".ts"))
    .map((e) => e.name)
    .sort();
}

function fileExists(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Cross-checks the on-disk surfaces this catalog is scoped to migrate
 * (successor's own section-11.2 script set/checkers, generators, and
 * `src/adapters/**`) against `catalog`. Two failure directions: a file
 * exists but no catalog entry names it ("undiscovered-file"), or an
 * `active` catalog entry names a `sourcePath` that does not exist
 * ("missing-active-source"). `planned` entries are exempt from the second
 * check by design (ADR-003: registered ahead of construction).
 */
export function scanControlPlaneCompleteness(packageRoot: string, catalog: readonly ControlPlaneNode[]): CompletenessGap[] {
  const gaps: CompletenessGap[] = [];
  const catalogSourcePaths = new Set(catalog.map((e) => e.sourcePath));

  const scriptsDir = join(packageRoot, "scripts");
  const generatorsDir = join(scriptsDir, "generators");
  const generatedDir = join(scriptsDir, "generated");
  const adaptersDir = join(packageRoot, "src", "adapters");

  for (const name of topLevelTsFiles(scriptsDir)) {
    const relPath = `scripts/${name}`;
    if (!catalogSourcePaths.has(relPath)) {
      gaps.push({ kind: "undiscovered-file", relPath, detail: `scripts/*.ts file "${relPath}" has no matching CONTROL_PLANE_CATALOG sourcePath` });
    }
  }
  for (const name of topLevelTsFiles(generatorsDir)) {
    const relPath = `scripts/generators/${name}`;
    if (!catalogSourcePaths.has(relPath)) {
      gaps.push({ kind: "undiscovered-file", relPath, detail: `scripts/generators/*.ts file "${relPath}" has no matching CONTROL_PLANE_CATALOG sourcePath` });
    }
  }
  for (const name of topLevelTsFiles(generatedDir).filter((n) => n.endsWith(".generated.ts"))) {
    const relPath = `scripts/generated/${name}`;
    if (!catalogSourcePaths.has(relPath)) {
      gaps.push({ kind: "undiscovered-file", relPath, detail: `scripts/generated/*.generated.ts file "${relPath}" has no matching CONTROL_PLANE_CATALOG sourcePath` });
    }
  }
  for (const relPath of walkFiles(adaptersDir, (n) => n.endsWith(".ts") || n.endsWith(".tsx"))) {
    const catalogPath = `src/adapters/${relPath}`;
    // Also accept a directory-level registration (this catalog registers
    // planned adapters at the directory, not per-file, granularity).
    const dirLevel = `src/adapters/${relPath.split("/")[0]}/`;
    if (!catalogSourcePaths.has(catalogPath) && !catalogSourcePaths.has(dirLevel)) {
      gaps.push({ kind: "undiscovered-file", relPath: catalogPath, detail: `src/adapters/**/*.ts file "${catalogPath}" has no matching CONTROL_PLANE_CATALOG sourcePath (checked file-level and directory-level)` });
    }
  }

  for (const entry of catalog) {
    if (entry.status !== "active") continue;
    const isDirEntry = entry.sourcePath.endsWith("/");
    const onDiskPath = join(packageRoot, entry.sourcePath);
    const exists = isDirEntry ? (() => {
      try {
        return statSync(onDiskPath).isDirectory();
      } catch {
        return false;
      }
    })() : fileExists(onDiskPath);
    if (!exists) {
      gaps.push({ kind: "missing-active-source", nodeId: entry.nodeId, sourcePath: entry.sourcePath, detail: `catalog entry "${entry.nodeId}" is status:"active" but "${entry.sourcePath}" does not exist on disk` });
    }
  }

  return gaps;
}

/**
 * Absence scan (mission requirement): recursively finds any `*.objecttype.ts`
 * file anywhere under `packageRoot` (excluding `node_modules`) — the exact
 * legacy anti-pattern P210 §8d found and this successor exists to correct.
 * Expected result: `[]`.
 */
export function scanForObjectTypeShapedFiles(packageRoot: string): string[] {
  return walkFiles(resolve(packageRoot), (name) => name.endsWith(".objecttype.ts"));
}
