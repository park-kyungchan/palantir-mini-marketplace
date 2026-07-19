// Copy-only migration manifest types + direction enforcement (ledger row
// P550, execution-plan.md Wave 5, contracts/migration-manifest.contract.json,
// docs/architecture.md ADR-006/ADR-008).
//
// A1-012 ("Existing constructed ontology state and its lineage have a
// compatible migration/versioning path when contracts, schemas, primitives,
// or storage representations evolve"), MEM-012 ("Existing memory and
// lineage can migrate across schema/storage changes without losing
// provenance, replay order, or retention state"), X-010 ("Existing ontology
// state, event lineage, contracts, and consumer bindings can be migrated
// and rolled forward safely, with compatibility or rollback evidence"):
// `MigrationManifest` below is the exact typed shape that carries that
// path/evidence for every ADR-006 store family this successor owns --
// `idMap` (id translation), `reconciliation` (count/hash zero-loss proof),
// `checkpoints` (resumability), and `rollback` (recorded rollback
// availability), matching `contracts/migration-manifest.contract.json`
// field-for-field.
//
// ADR-008 ("copy-only importers -- one-directional, non-mutating readers
// that translate legacy-shaped state into successor-shaped state without
// writing back to, or altering, the legacy store or its schema"):
// `checkCopyOnlyDirection` is the enforcement primitive. This is the exact
// predicate `scripts/migration-check.ts` (P340) already used inline; it now
// lives here as the canonical, typed, src-owned implementation --
// `scripts/migration-check.ts` imports and re-exports it rather than
// duplicating the logic (Simplicity/Surgical: one definition, not two).
//
// consumer-domain-ownership note (required term): every `sourceStore`/
// `targetStore` this file's types describe is successor- or legacy-plugin-
// owned control/knowledge state (ADR-006's per-project `.palantir-mini`/
// `.palantir-ontology` storage authority), never the consumer domain
// Ontology itself.
//
// ControlPlaneNodeKind note (required term): a `MigrationManifest` record
// is content/knowledge-migration state, never a
// `src/control-plane/types.ts` `ControlPlaneNodeKind` lifecycle-control
// entry -- this file never constructs, reads, or references that catalog.
//
// mutation-authority note (required term): a migration manifest's `status`
// lifecycle is a DIFFERENT concept from `src/governance/types.ts`'s
// `MutationAuthorityEnvelope` -- copying legacy-shaped data into the
// successor store is not itself a governed product-primitive mutation, and
// this file imports nothing from `src/governance/**`.
//
// UNKNOWN-is-not-PASS note (required term): `checkCopyOnlyDirection`
// returns an explicit `DirectionViolation` object on any violation, never a
// bare `false`/`undefined` that a caller could mistake for "unchecked" --
// and it returns `null` (not `undefined`) on success, so a caller cannot
// conflate "not yet checked" with "checked and clean".
//
// math-KG-excluded note (required term): no math-KG path
// (`/home/palantirkc/projects/data/curriculum-kg/**` or any other) was read
// or referenced by this file.

/** The seven ADR-006 successor-owned state families this wave's migration manifests cover (mission: "sessions, SIC/DTC, events, memory, consumer bindings, retention state, and projections"). */
export const MIGRATION_STATE_FAMILIES = [
  "sessions",
  "sic-dtc",
  "events",
  "memory",
  "consumer-bindings",
  "retention",
  "projections",
] as const;

export type MigrationStateFamily = (typeof MIGRATION_STATE_FAMILIES)[number];

export function isMigrationStateFamily(value: unknown): value is MigrationStateFamily {
  return typeof value === "string" && (MIGRATION_STATE_FAMILIES as readonly string[]).includes(value);
}

export type MigrationStatus = "pending" | "in-progress" | "completed" | "rolled-back";
export type CheckpointStatus = "pending" | "passed" | "failed";

export interface IdMapEntry {
  readonly legacyId: string;
  readonly successorId: string;
}

export interface Reconciliation {
  readonly expectedCount: number;
  readonly actualCount: number;
  readonly expectedHash: string;
  readonly actualHash: string;
}

export interface Checkpoint {
  readonly checkpointId: string;
  readonly at: string;
  readonly status: CheckpointStatus;
}

export interface RollbackDescriptor {
  readonly available: boolean;
  readonly procedureRef?: string;
}

export interface MigrationByWhom {
  readonly identity: string;
  readonly role?: string;
}

/** Mirrors contracts/migration-manifest.contract.json field-for-field. */
export interface MigrationManifest {
  readonly schemaVersion: string;
  readonly migrationId: string;
  readonly sourceStore: string;
  readonly targetStore: string;
  readonly idMap: readonly IdMapEntry[];
  readonly reconciliation: Reconciliation;
  readonly checkpoints?: readonly Checkpoint[];
  readonly rollback: RollbackDescriptor;
  readonly status: MigrationStatus;
  readonly byWhom?: MigrationByWhom;
  readonly stateFamily?: MigrationStateFamily;
}

export interface DirectionViolation {
  readonly file: string;
  readonly reason: string;
}

interface ManifestLike {
  schemaVersion?: unknown;
  sourceStore?: unknown;
  targetStore?: unknown;
}

export const CURRENT_MIGRATION_MANIFEST_SCHEMA_VERSION = "1.0.0";

export interface MigrationManifestSemanticViolation {
  readonly file: string;
  readonly reason: string;
}

export function validateMigrationManifestSchemaVersion(file: string, data: ManifestLike): MigrationManifestSemanticViolation | null {
  if (data.schemaVersion !== CURRENT_MIGRATION_MANIFEST_SCHEMA_VERSION) {
    return {
      file,
      reason: `schemaVersion ${JSON.stringify(data.schemaVersion)} is not the current migration manifest schema version "${CURRENT_MIGRATION_MANIFEST_SCHEMA_VERSION}"`,
    };
  }
  return null;
}

export function validateMigrationManifestSemantics(file: string, data: ManifestLike): MigrationManifestSemanticViolation | null {
  const versionViolation = validateMigrationManifestSchemaVersion(file, data);
  if (versionViolation !== null) return versionViolation;
  return checkCopyOnlyDirection(file, data);
}

/**
 * ADR-008's copy-only direction rule: `sourceStore` must reference the
 * legacy plugin and never the successor; `targetStore` must reference the
 * successor and never the legacy plugin. `file`/`data` naming matches the
 * original P340 `scripts/migration-check.ts` predicate this supersedes
 * (identical behavior, now the single canonical definition).
 */
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
