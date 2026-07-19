// Copy-only legacy importers (ledger row M820, execution-plan.md Wave 8;
// depends on P550's `manifest.ts`/`id-map.ts`/`reconciliation.ts`/
// `state-families.ts`; ADR-006/ADR-008).
//
// P550 (Wave 5) built the TYPED shape (`MigrationManifest`) and the PURE
// assembly primitives (`buildFamilyManifest`, `buildIdMap`,
// `computeReconciliation`) but every P550 fixture's `sourceItems`/
// `idMapPairs` were hand-authored test data -- no file in `src/migration/`
// ever opened a real filesystem path. This file is the first real,
// read-only reader of the seven `STATE_FAMILY_DEFINITIONS[*].legacyStore`
// paths (`state-families.ts`) -- one level of the mission's two verbs
// ("READS the real legacy store ... WRITES a copy-only MigrationManifest").
//
// Scope note on "WRITES" (Think Before Coding -- stated explicitly, not
// silently assumed): this file does NOT perform real disk I/O against
// `<successorStore>`. Three independent reasons, all traced to real
// evidence rather than convenience:
//
//   1. `scripts/boundary-check.ts`'s `GOVERNANCE_WRITER_MODULES` /
//      `resolvesIntoGovernanceWriter` structurally forbids any module
//      outside `src/governance/**` from importing
//      `governance/atomic-write` (or `governance/mint-ledger`) directly --
//      `src/migration/**` importing it would fail `boundary:check`, one of
//      this row's own required-green scripts.
//   2. Every existing `src/migration/*.ts` primitive (`manifest.ts`,
//      `id-map.ts`, `reconciliation.ts`, `checkpoint.ts`, `rollback.ts`,
//      `replay.ts`) is a PURE function -- none does file I/O. Adding real
//      writes here would be new-shape scope this file's own reused
//      primitives do not license.
//   3. `context/shared-worker-contract.md`'s Wave-11 exception clause
//      reserves "install, reload, cache, live-state, and cutover
//      operations" for ledger rows `I1110`-`I1199` specifically -- Wave 8's
//      own gate text is "migration and rollback are proven on COPIES; no
//      live cutover has occurred" (execution-plan.md). Physically
//      materializing `<successorStore>` is that live-cutover step.
//
// So "WRITES a copy-only MigrationManifest ... into the successor's own
// store under <successorStore>" is satisfied here as: the returned, fully
// contract-valid `MigrationManifest`'s `targetStore` field IS the exact
// `<successorStore>` path from `STATE_FAMILY_DEFINITIONS` (unchanged, via
// `buildFamilyManifest`'s existing behavior) -- the manifest is the
// copy-only write DESCRIPTOR this wave proves, matching ADR-008's own
// framing of an importer as a "one-directional, non-mutating reader ...
// without writing back to ... the legacy store" (manifest.ts's module
// doc); it says nothing about the successor side needing physical bytes
// on disk yet. `tests/migration/legacy-import.test.ts` proves the real
// read + manifest assembly end-to-end; it does not assert any file
// appears under `.palantir-ontology/**`.
//
// Weak-provenance labeling (mission: "label it as weak/uncertain ... never
// synthesize or upgrade it into false-strong provenance";
// decisions/w6-plugin-manifest-adjudication.md): `contracts/migration-
// manifest.contract.json`'s `byWhom` is `additionalProperties: false` with
// only `identity`/`role` -- both plain, unconstrained strings. Adding a new
// typed field for "weak" would be a `contracts/**` change, out of this
// row's write set (spec: "HONEST_STOP, do not expand scope" on that need).
// This file therefore encodes weakness in the EXISTING free-text `role`
// field rather than inventing a schema field -- a real label the contract
// already carries, not a workaround.
//
// consumer-domain-ownership / ControlPlaneNodeKind / mutation-authority /
// UNKNOWN-is-not-PASS / math-KG-excluded (required terms): see
// `manifest.ts`'s module doc, which this file's every export defers to
// unchanged -- this file imports nothing from `src/governance/**` or
// `src/control-plane/**`, constructs no `ControlPlaneNodeKind`, and never
// reads any `curriculum-kg` path. UNKNOWN-is-not-PASS: an unparseable
// legacy record is never silently dropped -- it is excluded from
// `sourceItems`/`idMap` (so it cannot masquerade as a successfully copied
// item) AND named in `ImportFamilyResult.unparseableLegacyIds`, the same
// "exclude, never guess, never hide" discipline `replay.ts` already
// established for malformed episodes.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import type { AggregateResult } from "../altitude1/types";
import { denied, ok } from "../altitude1/types";
import type { CanonicalizableValue } from "../semantic-core/canonical-json";
import { RC_SCHEMA_VALIDATION_FAILED } from "../semantic-core/reason-codes";
import type { IdMapEntry, MigrationByWhom, MigrationManifest, MigrationStateFamily, RollbackDescriptor } from "./manifest";
import { buildFamilyManifest, stateFamilyDefinition } from "./state-families";

// No `import.meta`-based root resolution lives in this file on purpose:
// `scripts/boundary-check.ts`'s `indirect-module-access` rule (P460 v4)
// bans the bare `import` token outside a static `import ... from`
// declaration or a direct call across the scanned `src/**` tree (adapters
// excluded) -- `import.meta.dir`'s "import" token does not fit either
// allowed shape and would be flagged. Every existing test file that needs
// the real marketplace root already computes it locally via
// `resolve(import.meta.dir, ...)` (`*.test.ts` is the one exemption this
// same rule carves out) -- `ImportFamilyParams.marketplaceRoot` is
// REQUIRED here for the identical reason: the caller (a test, in
// practice) supplies the root, this file never resolves one itself.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const HASH_LIKE_RE = /^[0-9a-f]{40}$|^[0-9a-f]{64}$/;
const TIMESTAMP_LIKE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/** Shallow (one-level) scan for a plausible hash-like or timestamp-like string value among a record's own top-level fields. Generic on purpose -- the seven families' legacy shapes differ, and this file does not assume any one of them beyond "plain JSON object". */
function assessProvenance(body: CanonicalizableValue): { hasByWhom: boolean; hasHashLike: boolean; hasTimestampLike: boolean } {
  if (!isPlainObject(body)) return { hasByWhom: false, hasHashLike: false, hasTimestampLike: false };
  const byWhom = body["byWhom"];
  const hasByWhom = isPlainObject(byWhom) && typeof byWhom["identity"] === "string" && byWhom["identity"].length > 0;
  let hasHashLike = false;
  let hasTimestampLike = false;
  for (const value of Object.values(body)) {
    if (typeof value === "string") {
      if (HASH_LIKE_RE.test(value)) hasHashLike = true;
      if (TIMESTAMP_LIKE_RE.test(value)) hasTimestampLike = true;
    }
  }
  return { hasByWhom, hasHashLike, hasTimestampLike };
}

export interface LegacyRecord {
  readonly legacyId: string;
  readonly body: CanonicalizableValue;
  readonly hasByWhom: boolean;
  readonly hasHashLike: boolean;
  readonly hasTimestampLike: boolean;
}

function toLegacyRecord(legacyId: string, body: CanonicalizableValue): LegacyRecord {
  return { legacyId, body, ...assessProvenance(body) };
}

export interface LegacyReadResult {
  readonly records: readonly LegacyRecord[];
  /** Entries this reader found but could not parse as JSON -- named, never silently dropped (UNKNOWN-is-not-PASS). */
  readonly unparseableLegacyIds: readonly string[];
  /** Parsed entries with no stable source identity -- named separately, never promoted to generated legacy ids. */
  readonly unidentifiableLegacyIds: readonly string[];
}

/**
 * Real, read-only fs read of one family's legacy store at an ALREADY
 * RESOLVED absolute path (never writes; never mutates `legacyStoreAbsPath`
 * or anything under it). An absent path returns zero records -- a
 * legitimate "nothing migrated yet" outcome for this live tree today, not
 * an error (refresh-first: several of the seven families' legacy stores
 * are genuinely empty/absent in this worktree right now; this reader must
 * not assume otherwise).
 *
 * Three real legacy shapes this file's seven families actually take
 * (`state-families.ts`'s `STATE_FAMILY_DEFINITIONS`):
 *   - a DIRECTORY of one-record-per-file JSON (`sessions`, `sic-dtc`);
 *   - a single JSONL file, one record per line (`events`);
 *   - a single JSON file holding either one object or an array of records
 *     (`memory`, `consumer-bindings`, `retention`, `projections`).
 */
export function readLegacyFamilySource(legacyStoreAbsPath: string): LegacyReadResult {
  if (!existsSync(legacyStoreAbsPath)) return { records: [], unparseableLegacyIds: [], unidentifiableLegacyIds: [] };

  const stat = statSync(legacyStoreAbsPath);
  const records: LegacyRecord[] = [];
  const unparseableLegacyIds: string[] = [];
  const unidentifiableLegacyIds: string[] = [];

  if (stat.isDirectory()) {
    const names = readdirSync(legacyStoreAbsPath)
      .filter((f) => f.endsWith(".json"))
      .sort();
    for (const name of names) {
      const fallbackId = basename(name, extname(name));
      try {
        const parsed = JSON.parse(readFileSync(join(legacyStoreAbsPath, name), "utf8")) as CanonicalizableValue;
        const legacyId = pickId(parsed) ?? fallbackId;
        records.push(toLegacyRecord(legacyId, parsed));
      } catch {
        unparseableLegacyIds.push(fallbackId);
      }
    }
    return { records, unparseableLegacyIds, unidentifiableLegacyIds };
  }

  if (legacyStoreAbsPath.endsWith(".jsonl")) {
    const lines = readFileSync(legacyStoreAbsPath, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    lines.forEach((line, i) => {
      const fallbackId = `line-${i + 1}`;
      try {
        const parsed = JSON.parse(line) as CanonicalizableValue;
        const legacyId = pickId(parsed);
        if (legacyId === undefined) {
          unidentifiableLegacyIds.push(fallbackId);
        } else {
          records.push(toLegacyRecord(legacyId, parsed));
        }
      } catch {
        unparseableLegacyIds.push(fallbackId);
      }
    });
    return { records, unparseableLegacyIds, unidentifiableLegacyIds };
  }

  // Single JSON file (memory / consumer-bindings / retention / projections).
  try {
    const parsed = JSON.parse(readFileSync(legacyStoreAbsPath, "utf8")) as CanonicalizableValue;
    if (Array.isArray(parsed)) {
      parsed.forEach((item, i) => {
        const fallbackId = `item-${i + 1}`;
        const legacyId = pickId(item);
        if (legacyId === undefined) {
          unidentifiableLegacyIds.push(fallbackId);
        } else {
          records.push(toLegacyRecord(legacyId, item as CanonicalizableValue));
        }
      });
    } else {
      const legacyId = pickId(parsed);
      if (legacyId === undefined) {
        unidentifiableLegacyIds.push(basename(legacyStoreAbsPath));
      } else {
        records.push(toLegacyRecord(legacyId, parsed));
      }
    }
  } catch {
    unparseableLegacyIds.push(basename(legacyStoreAbsPath));
  }
  return { records, unparseableLegacyIds, unidentifiableLegacyIds };
}

function pickId(value: unknown): string | undefined {
  if (!isPlainObject(value)) return undefined;
  for (const key of ["eventId", "sessionId", "sicId", "itemId", "snapshotId", "id", "migrationId"]) {
    const v = value[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

const SUCCESSOR_ID_PREFIX: Record<MigrationStateFamily, string> = {
  sessions: "fde",
  "sic-dtc": "dtc",
  events: "evt",
  memory: "memory",
  "consumer-bindings": "binding",
  retention: "retention",
  projections: "projection",
};

/** Deterministic, index-based successor id -- never derived from wall-clock or randomness (mirrors `replay.ts`/`checkpoint.ts`'s no-ambient-I/O discipline). */
function generateSuccessorId(family: MigrationStateFamily, index: number): string {
  return `${SUCCESSOR_ID_PREFIX[family]}-${String(index + 1).padStart(4, "0")}`;
}

export interface ImportFamilyParams {
  readonly family: MigrationStateFamily;
  /** The marketplace repo root `STATE_FAMILY_DEFINITIONS[*].legacyStore` is relative to. REQUIRED (see module doc): callers resolve this themselves (the real tree for a genuine read, or a `mkdtempSync` root for a controlled fixture) -- this file never computes a root via `import.meta`. */
  readonly marketplaceRoot: string;
  readonly schemaVersion: string;
  readonly migrationId: string;
  readonly priorMigrationIds: readonly string[];
  readonly status?: MigrationManifest["status"];
  readonly rollback?: RollbackDescriptor;
}

export interface ImportFamilyResult {
  readonly manifest: MigrationManifest;
  readonly recordCount: number;
  /** legacyIds whose provenance this import could not confirm as strong (missing byWhom, missing hash-like signal, or missing timestamp-like signal) -- labeled in `manifest.byWhom.role`, never silently upgraded. */
  readonly weakLegacyIds: readonly string[];
  /** legacyIds this import found but could not parse -- excluded from the manifest's idMap/reconciliation entirely (not counted as copied), named here so the caller can report them. */
  readonly unparseableLegacyIds: readonly string[];
  /** parsed source locations with no stable legacy identity -- excluded and named separately from parse failures. */
  readonly unidentifiableLegacyIds: readonly string[];
}

/**
 * The copy-only importer for one state family (mission: "Each importer
 * READS the real legacy store ... and WRITES a copy-only MigrationManifest
 * ... reuse them, do not reimplement id-mapping or reconciliation"). Reads
 * the real `legacyStore` path via `readLegacyFamilySource`, builds a
 * bijective id map (`buildIdMap`, via `buildFamilyManifest`), computes
 * hash/count reconciliation over the read source vs. a real independent
 * deep copy as the target (`computeReconciliation`, via
 * `buildFamilyManifest`), and labels weak/absent provenance in
 * `byWhom.role` rather than fabricating a strong one. Denied (never
 * thrown) only if the resulting id map is not a bijection --
 * `buildFamilyManifest`'s own existing behavior, unchanged.
 */
export function importFamily(params: ImportFamilyParams): AggregateResult<ImportFamilyResult> {
  if (!Array.isArray(params.priorMigrationIds)) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, `importFamily requires a caller-supplied immutable prior migration-id collection before accepting migrationId "${params.migrationId}"`);
  }
  if (params.priorMigrationIds.includes(params.migrationId)) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, `migrationId "${params.migrationId}" already exists in the caller-supplied prior migration-id collection`);
  }

  const def = stateFamilyDefinition(params.family);
  const legacyAbsPath = resolve(params.marketplaceRoot, def.legacyStore);

  const { records, unparseableLegacyIds, unidentifiableLegacyIds } = readLegacyFamilySource(legacyAbsPath);
  if (unparseableLegacyIds.length > 0 || unidentifiableLegacyIds.length > 0) {
    const parts = [
      ...(unparseableLegacyIds.length > 0 ? [`unparseable source entr${unparseableLegacyIds.length === 1 ? "y" : "ies"}: ${unparseableLegacyIds.join(", ")}`] : []),
      ...(unidentifiableLegacyIds.length > 0 ? [`unidentifiable parsed source entr${unidentifiableLegacyIds.length === 1 ? "y" : "ies"}: ${unidentifiableLegacyIds.join(", ")}`] : []),
    ];
    return denied(RC_SCHEMA_VALIDATION_FAILED, `importFamily refuses a partial copy for "${params.family}" because ${parts.join("; ")}`);
  }

  const idMapPairs: IdMapEntry[] = records.map((r, i) => ({ legacyId: r.legacyId, successorId: generateSuccessorId(params.family, i) }));
  const sourceItems = records.map((r) => r.body);
  // Real, independent copy -- proves the target collection shares no
  // reference with the source read (a genuine copy, not an alias).
  const targetItems = records.map((r) => JSON.parse(JSON.stringify(r.body)) as CanonicalizableValue);

  const weakLegacyIds = records.filter((r) => !(r.hasByWhom && r.hasHashLike && r.hasTimestampLike)).map((r) => r.legacyId);

  const byWhom: MigrationByWhom =
    weakLegacyIds.length > 0
      ? {
          identity: `legacy-import:${params.family}`,
          role: `weak-provenance: ${weakLegacyIds.length}/${records.length} source record(s) missing byWhom, a hash-like signal, or a timestamp-like signal (${weakLegacyIds.join(", ")}) — imported unattributed, never upgraded to a synthesized strong provenance`,
        }
      : { identity: `legacy-import:${params.family}`, role: "worker" };

  const built = buildFamilyManifest({
    family: params.family,
    schemaVersion: params.schemaVersion,
    migrationId: params.migrationId,
    idMapPairs,
    sourceItems,
    targetItems,
    rollback: params.rollback ?? { available: records.length > 0 },
    status: params.status ?? (records.length > 0 ? "completed" : "pending"),
    byWhom,
  });
  if (!built.ok) return built;

  return ok({ manifest: built.value, recordCount: records.length, weakLegacyIds, unparseableLegacyIds, unidentifiableLegacyIds });
}
