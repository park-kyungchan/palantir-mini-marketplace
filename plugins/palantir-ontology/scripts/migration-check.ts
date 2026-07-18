#!/usr/bin/env bun
// migration:check (ledger row P340, docs/architecture.md ADR-008's
// copy-only-importer rule; contracts/migration-manifest.contract.json).
//
// Two real rules checked against whatever migration-manifest fixtures
// exist in-tree today (Wave 5, P550, will add many more; this scope is
// intentionally small but genuine, per the P340 mission):
//
//  1. Schema conformance: every tests/fixtures/migration-manifest/*.json
//     fixture validates against contracts/migration-manifest.contract.json;
//     every tests/negative/migration-manifest/*.json fixture is rejected
//     (reuses the same hand-rolled validator tests/contracts already use —
//     no new dependency).
//  2. Copy-only direction (ADR-008: "one-directional, non-mutating
//     readers that translate legacy-shaped state into successor-shaped
//     state without writing back to... the legacy store"): every valid
//     fixture's `sourceStore` must reference `palantir-mini` and must NOT
//     reference `palantir-ontology`; its `targetStore` must reference
//     `palantir-ontology` and must NOT reference `palantir-mini`. A
//     fixture with the direction reversed is a live ADR-008 violation.
//
// Run standalone: `bun run migration:check`.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { validateContract } from "../tests/support/schema-validate";

const PACKAGE_ROOT = resolve(import.meta.dir, "..");
const SCHEMA_PATH = join(PACKAGE_ROOT, "contracts", "migration-manifest.contract.json");

export interface DirectionViolation {
  readonly file: string;
  readonly reason: string;
}

interface ManifestLike {
  sourceStore?: unknown;
  targetStore?: unknown;
}

export function checkCopyOnlyDirection(file: string, data: ManifestLike): DirectionViolation | null {
  const source = typeof data.sourceStore === "string" ? data.sourceStore : "";
  const target = typeof data.targetStore === "string" ? data.targetStore : "";

  if (!source.includes("palantir-mini")) {
    return { file, reason: `sourceStore ${JSON.stringify(source)} does not reference "palantir-mini" (legacy read side)` };
  }
  if (source.includes("palantir-ontology")) {
    return { file, reason: `sourceStore ${JSON.stringify(source)} references "palantir-ontology" — a migration must never read FROM the successor store` };
  }
  if (!target.includes("palantir-ontology")) {
    return { file, reason: `targetStore ${JSON.stringify(target)} does not reference "palantir-ontology" (successor write side)` };
  }
  if (target.includes("palantir-mini")) {
    return { file, reason: `targetStore ${JSON.stringify(target)} references "palantir-mini" — ADR-008 forbids writing back to the legacy store` };
  }
  return null;
}

function loadJsonFiles(dir: string): Array<{ file: string; data: unknown }> {
  let names: string[];
  try {
    names = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  return names.map((file) => ({ file, data: JSON.parse(readFileSync(join(dir, file), "utf8")) }));
}

function main(): void {
  const positiveDir = join(PACKAGE_ROOT, "tests", "fixtures", "migration-manifest");
  const negativeDir = join(PACKAGE_ROOT, "tests", "negative", "migration-manifest");
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));

  const positives = loadJsonFiles(positiveDir);
  const negatives = loadJsonFiles(negativeDir);
  const errors: string[] = [];

  if (positives.length < 2) errors.push(`expected >=2 positive migration-manifest fixtures, found ${positives.length}`);
  if (negatives.length < 2) errors.push(`expected >=2 negative migration-manifest fixtures, found ${negatives.length}`);

  for (const { file, data } of positives) {
    const result = validateContract(schema, data);
    if (!result.valid) {
      errors.push(`positive fixture ${file} FAILED schema validation: ${result.errors.join("; ")}`);
      continue;
    }
    const violation = checkCopyOnlyDirection(file, data as ManifestLike);
    if (violation) errors.push(`positive fixture ${violation.file} FAILED copy-only direction check: ${violation.reason}`);
  }

  for (const { file, data } of negatives) {
    const result = validateContract(schema, data);
    if (result.valid) {
      errors.push(`negative fixture ${file} unexpectedly PASSED schema validation`);
    }
  }

  if (errors.length > 0) {
    console.error(`migration:check FAIL — ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  console.log(
    `migration:check PASS — ${positives.length} positive fixture(s) schema-valid and copy-only-direction-correct; ${negatives.length} negative fixture(s) correctly rejected.`,
  );
}

if (import.meta.main) main();
