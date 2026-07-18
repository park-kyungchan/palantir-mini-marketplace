#!/usr/bin/env bun
// control-plane:check (ledger row P450, docs/architecture.md ADR-003).
//
// Sibling entry point to the same three scans `boundary-check.ts` now also
// runs as part of `bun run boundary:check` (execution-plan.md section
// 11.2) — kept as its own standalone, directly-testable command per the
// mission's "wired into boundary:check or a sibling check" option (this
// task uses both): `scanControlPlaneKindCollisions` (the ADR-003 boundary
// validator), `scanControlPlaneCompleteness` (validation-contract item 2's
// mechanical completeness proof), and `scanForObjectTypeShapedFiles` (the
// mission's absence-scan requirement). Run standalone:
// `bun run control-plane:check`.

import { resolve } from "node:path";
import { CONTROL_PLANE_CATALOG } from "../src/control-plane/registry";
import { scanControlPlaneCompleteness, scanControlPlaneKindCollisions, scanForObjectTypeShapedFiles } from "../src/control-plane/boundary-validator";

const PACKAGE_ROOT = resolve(import.meta.dir, "..");

function main(): void {
  const kindCollisions = scanControlPlaneKindCollisions(CONTROL_PLANE_CATALOG);
  const completenessGaps = scanControlPlaneCompleteness(PACKAGE_ROOT, CONTROL_PLANE_CATALOG);
  const objectTypeFiles = scanForObjectTypeShapedFiles(PACKAGE_ROOT);
  const total = kindCollisions.length + completenessGaps.length + objectTypeFiles.length;

  console.log(`control-plane:check — ${CONTROL_PLANE_CATALOG.length} catalog entries scanned.`);

  if (total > 0) {
    console.error(`control-plane:check FAIL — ${total} total violation(s):`);
    for (const v of kindCollisions) {
      console.error(`  [kind-collision:${v.reasonCode}] ${v.nodeId}: ${v.detail}`);
    }
    for (const g of completenessGaps) {
      console.error(`  [completeness:${g.kind}] ${g.detail}`);
    }
    for (const f of objectTypeFiles) {
      console.error(`  [object-type-shaped-file] ${f}`);
    }
    process.exit(1);
  }

  console.log(
    `control-plane:check PASS — 0 kind collisions, 0 completeness gaps, 0 *.objecttype.ts files in the successor tree.`,
  );
}

if (import.meta.main) main();
