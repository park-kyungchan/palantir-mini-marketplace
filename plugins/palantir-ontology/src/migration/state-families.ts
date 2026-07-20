// Per-state-family migration manifest builder (ledger row P550,
// execution-plan.md Wave 5: "Implement copy-only migration manifests for
// sessions, SIC/DTC, events, memory, consumer bindings, retention state,
// and projections"; A1-012, MEM-012, X-010; docs/architecture.md
// ADR-006/ADR-008).
//
// `STATE_FAMILY_DEFINITIONS` fixes the exact legacy/successor store path
// for each of the seven families, grounded in real evidence, not invented
// paths -- every `legacyStore` cites the exact
// `outputs/p230-state-migration-census.md` row it comes from:
//
//   - sessions: "FDE ontology-engineering session" row --
//     `<root>/.palantir-mini/session/fde-ontology-engineering/<sessionId>.json`.
//   - sic-dtc: "DTC / ontology-context approvals" row --
//     `<root>/.palantir-mini/session/ontology-context-approvals/` (paired
//     with the "SIC front-door state" row, `prompt-front-door/`; one
//     representative family manifest covers both per this wave's scope --
//     an explicit reading, not a silent one, matching `replay.ts`'s
//     "selected state" precedent for naming an interpretation).
//   - events: "Canonical event log" row --
//     `<root>/.palantir-mini/session/events.jsonl` -- matches the existing
//     P330 `tests/fixtures/migration-manifest/valid-1.json` fixture.
//   - memory: the existing P330 `valid-2.json` fixture's
//     `.palantir-mini/second-brain/manifest.json` source.
//   - consumer-bindings: "Registered-projects registry" row (P230 §13
//     grand-counts, `[global]`) -- the plugin host's global (non-per-project)
//     install root's `plugins/palantir-mini/session/registered-projects.json`
//     -- the closest legacy analog to the successor's typed
//     `OntologyBinding`/`src/altitude2/consumer-binding.ts` (which itself
//     depends on `deps.resolveConsumerProject`, i.e. exactly this
//     registry's role).
//   - retention: "Per-session retention manifest" row --
//     `<root>/.palantir-mini/session/retention/manifest.json`.
//   - projections: "Snapshot (fold cache)" row --
//     `<root>/.palantir-mini/session/snapshots/{ontology.json,manifest.json}`
//     -- the legacy analog to `src/migration/replay.ts`'s `ReplayResult`
//     projections this wave's replay work already builds.
//
// `buildFamilyManifest` assembles a full `MigrationManifest` for one family
// from real id-map/reconciliation/checkpoint/rollback inputs, then asserts
// `checkCopyOnlyDirection` holds -- defensive (the seven fixed store paths
// above are already correct-by-construction), but proves the assertion
// holds for all seven families, not just the two P330 originally fixture'd.
//
// See src/migration/manifest.ts's module doc for the full required-terms
// trace (consumer-domain-ownership, ControlPlaneNodeKind,
// mutation-authority, UNKNOWN-is-not-PASS, math-KG-excluded) this file
// shares.

import { type AggregateResult, denied, ok } from "../altitude1/types";
import type { CanonicalizableValue } from "../semantic-core/canonical-json";
import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED, type ReasonCode } from "../semantic-core/reason-codes";
import { buildIdMap } from "./id-map";
import {
  checkCopyOnlyDirection,
  type Checkpoint,
  type IdMapEntry,
  type MigrationByWhom,
  type MigrationManifest,
  type MigrationStateFamily,
  type MigrationStatus,
  MIGRATION_STATE_FAMILIES,
  type RollbackDescriptor,
  validateMigrationManifestSchemaVersion,
} from "./manifest";
import { computeReconciliation } from "./reconciliation";

const CITED_CODES: readonly ReasonCode[] = [RC_SCHEMA_VALIDATION_FAILED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("state-families.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

export interface StateFamilyDefinition {
  readonly family: MigrationStateFamily;
  readonly legacyStore: string;
  readonly successorStore: string;
  /** Metadata-only pointer to the P230 census evidence row this path is grounded in — never treated as semantic authority itself. */
  readonly legacyEvidence: string;
}

export const STATE_FAMILY_DEFINITIONS: readonly StateFamilyDefinition[] = [
  {
    family: "sessions",
    legacyStore: "plugins/palantir-mini/.palantir-mini/session/fde-ontology-engineering/",
    successorStore: "plugins/palantir-ontology/.palantir-ontology/session/fde-ontology-engineering/",
    legacyEvidence: "outputs/p230-state-migration-census.md: 'FDE ontology-engineering session' row",
  },
  {
    family: "sic-dtc",
    legacyStore: "plugins/palantir-mini/.palantir-mini/session/ontology-context-approvals/",
    successorStore: "plugins/palantir-ontology/.palantir-ontology/session/sic-dtc/",
    legacyEvidence: "outputs/p230-state-migration-census.md: 'DTC / ontology-context approvals' row (paired with 'SIC front-door state')",
  },
  {
    family: "events",
    legacyStore: "plugins/palantir-mini/.palantir-mini/session/events.jsonl",
    successorStore: "plugins/palantir-ontology/.palantir-ontology/session/events.jsonl",
    legacyEvidence: "outputs/p230-state-migration-census.md: 'Canonical event log' row (matches P330 valid-1.json fixture)",
  },
  {
    family: "memory",
    legacyStore: "plugins/palantir-mini/.palantir-mini/second-brain/manifest.json",
    successorStore: "plugins/palantir-ontology/.palantir-ontology/memory/manifest.json",
    legacyEvidence: "matches P330 tests/fixtures/migration-manifest/valid-2.json fixture",
  },
  {
    family: "consumer-bindings",
    legacyStore: "plugins/palantir-mini/.palantir-mini/session/registered-projects.json",
    successorStore: "plugins/palantir-ontology/.palantir-ontology/consumer-bindings/manifest.json",
    legacyEvidence: "outputs/p230-state-migration-census.md: 'Registered-projects registry [global]' row",
  },
  {
    family: "retention",
    legacyStore: "plugins/palantir-mini/.palantir-mini/session/retention/manifest.json",
    successorStore: "plugins/palantir-ontology/.palantir-ontology/retention/manifest.json",
    legacyEvidence: "outputs/p230-state-migration-census.md: 'Per-session retention manifest' row",
  },
  {
    family: "projections",
    legacyStore: "plugins/palantir-mini/.palantir-mini/session/snapshots/manifest.json",
    successorStore: "plugins/palantir-ontology/.palantir-ontology/projections/manifest.json",
    legacyEvidence: "outputs/p230-state-migration-census.md: 'Snapshot (fold cache)' row",
  },
];

if (STATE_FAMILY_DEFINITIONS.length !== MIGRATION_STATE_FAMILIES.length) {
  throw new Error("state-families.ts: STATE_FAMILY_DEFINITIONS does not cover exactly the MIGRATION_STATE_FAMILIES set");
}

export function stateFamilyDefinition(family: MigrationStateFamily): StateFamilyDefinition {
  const found = STATE_FAMILY_DEFINITIONS.find((d) => d.family === family);
  if (found === undefined) {
    // Defensive only: the module-load check above already guarantees every
    // MigrationStateFamily has a definition.
    throw new Error(`state-families.ts: no StateFamilyDefinition registered for family "${family}"`);
  }
  return found;
}

export interface BuildFamilyManifestParams {
  readonly family: MigrationStateFamily;
  readonly schemaVersion: string;
  readonly migrationId: string;
  readonly idMapPairs: readonly IdMapEntry[];
  readonly sourceItems: readonly CanonicalizableValue[];
  readonly targetItems: readonly CanonicalizableValue[];
  readonly checkpoints?: readonly Checkpoint[];
  readonly rollback: RollbackDescriptor;
  readonly status: MigrationStatus;
  readonly byWhom?: MigrationByWhom;
}

/**
 * Assembles a full, contract-shaped `MigrationManifest` for one state
 * family from real id-map/reconciliation/checkpoint/rollback inputs.
 * Denied (never thrown) if the id map is not a bijection
 * (`id-map.ts#buildIdMap`) or if — defensively — the assembled manifest
 * somehow violated the copy-only direction rule (should never trigger
 * given `STATE_FAMILY_DEFINITIONS`'s fixed, correct paths;
 * `tests/migration/state-families.test.ts` proves it holds for all seven
 * families).
 */
export function buildFamilyManifest(params: BuildFamilyManifestParams): AggregateResult<MigrationManifest> {
  const def = stateFamilyDefinition(params.family);

  const schemaVersionViolation = validateMigrationManifestSchemaVersion(params.migrationId, { schemaVersion: params.schemaVersion });
  if (schemaVersionViolation !== null) {
    return denied(
      RC_SCHEMA_VALIDATION_FAILED,
      `state-family manifest for "${params.family}" violates the migration manifest semantic version rule: ${schemaVersionViolation.reason}`,
    );
  }

  const idMapResult = buildIdMap(params.idMapPairs);
  if (!idMapResult.ok) return idMapResult;

  const reconciliation = computeReconciliation(params.sourceItems, params.targetItems);

  const manifest: MigrationManifest = {
    schemaVersion: params.schemaVersion,
    migrationId: params.migrationId,
    sourceStore: def.legacyStore,
    targetStore: def.successorStore,
    idMap: idMapResult.value,
    reconciliation,
    ...(params.checkpoints !== undefined ? { checkpoints: params.checkpoints } : {}),
    rollback: params.rollback,
    status: params.status,
    ...(params.byWhom !== undefined ? { byWhom: params.byWhom } : {}),
    stateFamily: params.family,
  };

  const violation = checkCopyOnlyDirection(params.migrationId, manifest);
  if (violation !== null) {
    return denied(
      RC_SCHEMA_VALIDATION_FAILED,
      `state-family manifest for "${params.family}" violates the copy-only direction rule: ${violation.reason}`,
    );
  }

  return ok(manifest);
}
