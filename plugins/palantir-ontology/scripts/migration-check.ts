#!/usr/bin/env bun
// migration:check (ledger row P340/P550, docs/architecture.md ADR-008's
// copy-only-importer rule; contracts/migration-manifest.contract.json).
//
// Four real rules:
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
//     `palantir-ontology` and must NOT reference `palantir-mini`. The
//     predicate itself now lives in `src/migration/manifest.ts` (P550) —
//     this script imports and re-exports it rather than duplicating the
//     logic (kept for `tests/scripts/migration-check.test.ts`'s existing
//     import path).
//  3. P550 addition — reversed-direction fixtures ARE rejected: every
//     tests/fixtures/migration-manifest-direction-negative/*.json fixture
//     must be schema-VALID (it is a well-shaped manifest) but must FAIL
//     `checkCopyOnlyDirection` — proving a live ADR-008 violation is caught
//     even though the JSON Schema itself cannot express "direction". This
//     is deliberately a SEPARATE directory from
//     tests/negative/migration-manifest/, whose contract (enforced by
//     tests/support/contract-suite.ts) is that every fixture there is
//     schema-INVALID — a schema-valid-but-direction-reversed fixture placed
//     there would fail that generic assumption.
//  4. P550 addition — every ADR-006 state family
//     (src/migration/state-families.ts's seven `STATE_FAMILY_DEFINITIONS`)
//     is covered by at least one schema-valid positive fixture's
//     `stateFamily` field — proves "extend fixtures to cover every state
//     family" (mission) is a standing, re-checked gate, not a one-time
//     manual pass.
//
// Run standalone: `bun run migration:check`.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { validateContract } from "../tests/support/schema-validate";
import { checkCopyOnlyDirection, type DirectionViolation, MIGRATION_STATE_FAMILIES } from "../src/migration/manifest";

export { checkCopyOnlyDirection, type DirectionViolation };

const PACKAGE_ROOT = resolve(import.meta.dir, "..");
const SCHEMA_PATH = join(PACKAGE_ROOT, "contracts", "migration-manifest.contract.json");

interface ManifestLike {
  sourceStore?: unknown;
  targetStore?: unknown;
  stateFamily?: unknown;
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
  const directionNegativeDir = join(PACKAGE_ROOT, "tests", "fixtures", "migration-manifest-direction-negative");
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));

  const positives = loadJsonFiles(positiveDir);
  const negatives = loadJsonFiles(negativeDir);
  const directionNegatives = loadJsonFiles(directionNegativeDir);
  const errors: string[] = [];

  if (positives.length < 2) errors.push(`expected >=2 positive migration-manifest fixtures, found ${positives.length}`);
  if (negatives.length < 2) errors.push(`expected >=2 negative migration-manifest fixtures, found ${negatives.length}`);
  if (directionNegatives.length < 1) errors.push(`expected >=1 reversed-direction fixture in tests/fixtures/migration-manifest-direction-negative/, found ${directionNegatives.length}`);

  const coveredFamilies = new Set<string>();

  for (const { file, data } of positives) {
    const result = validateContract(schema, data);
    if (!result.valid) {
      errors.push(`positive fixture ${file} FAILED schema validation: ${result.errors.join("; ")}`);
      continue;
    }
    const manifest = data as ManifestLike;
    const violation = checkCopyOnlyDirection(file, manifest);
    if (violation) errors.push(`positive fixture ${violation.file} FAILED copy-only direction check: ${violation.reason}`);
    if (typeof manifest.stateFamily === "string") coveredFamilies.add(manifest.stateFamily);
  }

  for (const family of MIGRATION_STATE_FAMILIES) {
    if (!coveredFamilies.has(family)) {
      errors.push(`no positive migration-manifest fixture declares stateFamily "${family}" — every ADR-006 state family this wave covers must have >=1 fixture`);
    }
  }

  for (const { file, data } of negatives) {
    const result = validateContract(schema, data);
    if (result.valid) {
      errors.push(`negative fixture ${file} unexpectedly PASSED schema validation`);
    }
  }

  for (const { file, data } of directionNegatives) {
    const result = validateContract(schema, data);
    if (!result.valid) {
      errors.push(`reversed-direction fixture ${file} FAILED schema validation (it must be schema-valid AND direction-violating): ${result.errors.join("; ")}`);
      continue;
    }
    const violation = checkCopyOnlyDirection(file, data as ManifestLike);
    if (violation === null) {
      errors.push(`reversed-direction fixture ${file} unexpectedly PASSED the copy-only direction check`);
    }
  }

  if (errors.length > 0) {
    console.error(`migration:check FAIL — ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  console.log(
    `migration:check PASS — ${positives.length} positive fixture(s) schema-valid and copy-only-direction-correct (${MIGRATION_STATE_FAMILIES.length}/${MIGRATION_STATE_FAMILIES.length} state families covered); ${negatives.length} negative fixture(s) correctly rejected; ${directionNegatives.length} reversed-direction fixture(s) correctly caught.`,
  );
}

if (import.meta.main) main();
