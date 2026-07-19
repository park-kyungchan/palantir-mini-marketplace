// Shadow comparison harness (ledger row M830, execution-plan.md Wave 8;
// depends on M820's `legacy-import.ts` and P550's `manifest.ts`/`replay.ts`;
// ADR-006/ADR-008).
//
// Mission: dual-READ the copied fixtures M820's importer produces (never
// the live legacy store directly, and never a live dual-write) and compare
// read/query/proposal/denial/replay outcomes between the legacy-shaped copy
// and the successor's own semantic-core processing of the same imported
// data. This file does ZERO filesystem I/O of its own -- every exported
// function is a pure function of already-in-memory data
// (`LegacyRecord[]`/`IdMapEntry[]`, both M820's own typed shapes). The
// CALLER (in practice, `tests/migration/shadow-comparison.test.ts`, exactly
// like M820's own test) is the one that invokes
// `readLegacyFamilySource`/`importFamily` to obtain that in-memory copy --
// this file only ever receives it as a parameter, so it structurally cannot
// read the live legacy store, and has no write call of any kind (so it
// structurally cannot dual-write). "the copy is byte-identical
// before/after a shadow run" (validation item 1) therefore holds by
// construction: nothing in this module's call graph ever assigns into an
// input array/object.
//
// Outcome categories exercised, matching the mission's "read / query /
// proposal / denial / replay" five-way split:
//   - read:      `legacyOutcome` -- always "legacy-read-ok" for every
//                `LegacyRecord` this file receives, because the legacy
//                stores are documented as schema-free ad hoc JSON with no
//                contract gate at all (`state-families.ts`'s own framing of
//                the seven legacy stores; `legacy-import.ts`'s
//                `readLegacyFamilySource` already proves this empirically --
//                it accepts any plain-JSON-parseable record, the ONLY
//                thing it refuses is unparseable JSON, which is excluded
//                upstream of this file and never reaches it as a
//                `LegacyRecord`).
//   - query:     `successorId` -- looked up through M820's own bijective
//                `IdMapEntry[]` (produced once by `buildIdMap`/
//                `importFamily`, reused here unchanged, never recomputed).
//                A miss is a genuine query-lookup gap between the two
//                views and is always flagged `unexplained-defect` -- never
//                silently coerced into parity (UNKNOWN-is-not-PASS).
//   - proposal / - `evaluateSuccessorGate` -- would the successor's own
//     denial:      typed contract (read directly from
//                `contracts/*.contract.json`, the exact same "read the
//                registry file directly, no duplicated list" pattern
//                `src/semantic-core/reason-codes.ts` already establishes
//                for `reason-code-registry.json`) accept or deny this
//                legacy-shaped body as a `propose this record` gate. Five
//                of the seven families have a directly corresponding
//                successor contract (sessions -> fde-session,
//                events -> event-envelope, memory -> memory-item,
//                consumer-bindings -> ontology-binding); `sic-dtc` maps to
//                `semantic-intent` as the single representative family
//                manifest, the same explicit reading `state-families.ts`'s
//                own module doc already adopts for that family pair. The
//                remaining two families (`retention`, `projections`) have
//                NO standalone successor contract type registered anywhere
//                in `contracts/*.contract.json` or
//                `reason-code-registry.json`'s `appliesTo` lists today --
//                this is a real, current gap, not an oversight this file
//                should paper over, so their gate outcome is the explicit
//                third state `{ kind: "no-successor-contract" }`, which
//                counts as neither accept nor deny and produces no
//                divergence (there is nothing yet to diverge from).
//                A deny always carries `RC-SCHEMA-VALIDATION-FAILED`, the
//                one reason code already registered against all five of
//                those `appliesTo` slugs -- checked with
//                `isRegisteredReasonCode` before use (defense-in-depth,
//                mirroring `reconciliation.ts`'s `CITED_CODES` pattern);
//                this file never invents a code.
//   - replay:    `compareFamilyReplay` -- `events` only (the one family
//                with inherent sequence/temporal ordering;
//                `state-families.ts` itself names `replay.ts`'s
//                `ReplayResult` as the successor analog of the
//                `projections` family's legacy snapshot, but `replayToState`
//                operates on event-envelope-shaped input, not a snapshot
//                blob, so this file keeps the two families independent
//                rather than forcing a shape `projections`'s real legacy
//                store does not carry). Compares a NAIVE legacy
//                reconstruction (last record per `atopWhich`, by raw
//                array/file read order -- the only ordering a schema-free
//                legacy reader could use) against the successor's actual
//                `replayToState` (sequence-number-authoritative,
//                `replay.ts`'s own pre-existing, unmodified MEM-002/MEM-009
//                guarantee). Think Before Coding -- named explicitly: when
//                array order and sequence order disagree, the two
//                reconstructions can legitimately differ. That difference
//                is NOT a denial (no record was rejected; both views
//                "accept" every record) and therefore is never forced
//                through the `RC-SCHEMA-VALIDATION-FAILED` reason-code
//                mechanism above (which would be a miscited code, exactly
//                what the stop condition "a denial reason code that is not
//                registered [or does not apply]" guards against). It is
//                surfaced instead as `orderMatches: false` plus
//                `replayHashStableAcrossRepeat` (proving determinism
//                separately), and is explained in prose, directly, by this
//                comment and the durable report -- never hidden, never
//                silently summarized away.
//
// consumer-domain-ownership: every value this file touches is
// successor-owned migration-copy state (the seven `STATE_FAMILY_DEFINITIONS`
// families), never a consumer project's own Ontology.
// ControlPlaneNodeKind: this file constructs, reads, and references no
// `src/control-plane/types.ts` catalog entry at all.
// mutation-authority: every function here is a pure, read-only comparison
// with no write path -- a different concept from
// `src/governance/types.ts`'s `MutationAuthorityEnvelope`; this file
// imports nothing from `src/governance/**`.
// UNKNOWN-is-not-PASS: a query miss is `unexplained-defect`, not silently
// treated as parity; a family with no mapped successor contract is
// `no-successor-contract`, never silently upgraded to `successor-accept`.
// math-KG-excluded: no math-KG path
// (`/home/palantirkc/projects/data/curriculum-kg/**` or any other) is read
// or referenced anywhere in this file.

import { denied, ok, type AggregateResult } from "../altitude1/types";
import { readEvents } from "../lineage/event-reader";
import type { CanonicalizableValue } from "../semantic-core/canonical-json";
import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED, type ReasonCode } from "../semantic-core/reason-codes";
import type { LegacyRecord } from "./legacy-import";
import type { IdMapEntry, MigrationStateFamily } from "./manifest";
import { replayHash, replayToState } from "./replay";

import eventEnvelopeContract from "../../contracts/event-envelope.contract.json";
import fdeSessionContract from "../../contracts/fde-session.contract.json";
import memoryItemContract from "../../contracts/memory-item.contract.json";
import ontologyBindingContract from "../../contracts/ontology-binding.contract.json";
import semanticIntentContract from "../../contracts/semantic-intent.contract.json";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface FamilyContractMapping {
  readonly aggregateSlug: string;
  readonly requiredFields: readonly string[];
}

/** Only five of the seven families have a directly-mapped successor contract today -- see module doc. */
const FAMILY_CONTRACT: Partial<Record<MigrationStateFamily, FamilyContractMapping>> = {
  sessions: { aggregateSlug: "fde-session", requiredFields: fdeSessionContract.required },
  "sic-dtc": { aggregateSlug: "semantic-intent", requiredFields: semanticIntentContract.required },
  events: { aggregateSlug: "event-envelope", requiredFields: eventEnvelopeContract.required },
  memory: { aggregateSlug: "memory-item", requiredFields: memoryItemContract.required },
  "consumer-bindings": { aggregateSlug: "ontology-binding", requiredFields: ontologyBindingContract.required },
};

/** A required field counts as present only if it is neither absent, `null`, nor an empty string -- the same "present and non-blank" bar every `contracts/*.contract.json`'s `minLength`/`required` pair implies together. */
function requiredFieldsMissing(body: CanonicalizableValue, requiredFields: readonly string[]): string[] {
  if (!isPlainObject(body)) return [...requiredFields];
  return requiredFields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === "string" && value.length === 0);
  });
}

export type SuccessorGateOutcome =
  | { readonly kind: "no-successor-contract" }
  | { readonly kind: "gated"; readonly aggregateSlug: string; readonly result: AggregateResult<null> };

/** Evaluates whether the successor's own typed contract for `family` would accept or deny `body` as-is (a "propose this record" gate) -- never mutates `body`. */
export function evaluateSuccessorGate(family: MigrationStateFamily, body: CanonicalizableValue): SuccessorGateOutcome {
  const mapping = FAMILY_CONTRACT[family];
  if (!mapping) return { kind: "no-successor-contract" };

  if (family === "events") {
    const read = readEvents([body]);
    const quarantined = read.quarantined[0];
    if (quarantined !== undefined) {
      return { kind: "gated", aggregateSlug: mapping.aggregateSlug, result: denied(quarantined.reasonCode, quarantined.detail) };
    }
    if (read.envelopes.length === 1) {
      return { kind: "gated", aggregateSlug: mapping.aggregateSlug, result: ok(null) };
    }
  }

  const missing = requiredFieldsMissing(body, mapping.requiredFields);
  if (missing.length === 0) {
    return { kind: "gated", aggregateSlug: mapping.aggregateSlug, result: ok(null) };
  }
  const reasonCode: ReasonCode = RC_SCHEMA_VALIDATION_FAILED;
  if (!isRegisteredReasonCode(reasonCode)) {
    // Defense-in-depth only -- RC_SCHEMA_VALIDATION_FAILED is a named,
    // already-registered export; this branch proves the assertion rather
    // than assuming it (mirrors reconciliation.ts's CITED_CODES pattern).
    return { kind: "gated", aggregateSlug: mapping.aggregateSlug, result: denied(reasonCode, "unreachable: named reason-code export not registered") };
  }
  return {
    kind: "gated",
    aggregateSlug: mapping.aggregateSlug,
    result: denied(reasonCode, `missing required field(s) for ${mapping.aggregateSlug}: ${missing.join(", ")}`),
  };
}

export type ShadowDivergence =
  | { readonly kind: "unexplained-defect"; readonly note: string }
  | { readonly kind: "explained-safe-denial"; readonly reasonCode: ReasonCode; readonly note: string };

export interface ShadowRecordOutcome {
  readonly legacyId: string;
  readonly successorId: string | null;
  readonly legacyOutcome: "legacy-read-ok";
  readonly successorGate: SuccessorGateOutcome;
  readonly divergence: ShadowDivergence | null;
}

/**
 * Read/query/proposal/denial comparison for one family's already-imported
 * copy. `idMap` MUST be the same bijective map `buildIdMap`/`importFamily`
 * produced for these exact `records` -- this function only looks it up, it
 * never rebuilds or re-validates the bijection (P550/M820 already own
 * that).
 */
export function compareFamilyRecords(family: MigrationStateFamily, records: readonly LegacyRecord[], idMap: readonly IdMapEntry[]): readonly ShadowRecordOutcome[] {
  const successorIdByLegacyId = new Map(idMap.map((entry) => [entry.legacyId, entry.successorId]));

  return records.map((record): ShadowRecordOutcome => {
    const successorId = successorIdByLegacyId.get(record.legacyId) ?? null;

    if (successorId === null) {
      return {
        legacyId: record.legacyId,
        successorId: null,
        legacyOutcome: "legacy-read-ok",
        successorGate: { kind: "no-successor-contract" },
        divergence: {
          kind: "unexplained-defect",
          note: `legacy-shaped copy read legacyId="${record.legacyId}" but the id-map produced no successorId for it -- a genuine query-lookup gap between the legacy-shaped and successor views, never silently treated as parity`,
        },
      };
    }

    const successorGate = evaluateSuccessorGate(family, record.body);
    const divergence: ShadowDivergence | null =
      successorGate.kind === "gated" && !successorGate.result.ok
        ? {
            kind: "explained-safe-denial",
            reasonCode: successorGate.result.reasonCode,
            note: `legacy allowed legacyId="${record.legacyId}" through (the legacy store is schema-free ad hoc JSON with no contract gate) but the successor's ${successorGate.aggregateSlug} contract denies it -- ${successorGate.result.detail}`,
          }
        : null;

    return { legacyId: record.legacyId, successorId, legacyOutcome: "legacy-read-ok", successorGate, divergence };
  });
}

export interface FamilyReplayComparison {
  readonly applicable: boolean;
  readonly legacyLastByTarget: Readonly<Record<string, { readonly atArrayIndex: number; readonly lastType: string }>>;
  readonly successorLastByTarget: Readonly<Record<string, { readonly lastSequence: number; readonly lastType: string }>>;
  readonly orderMatches: boolean;
  readonly replayHash: string | null;
  readonly replayHashStableAcrossRepeat: boolean;
}

const NOT_APPLICABLE_REPLAY: FamilyReplayComparison = {
  applicable: false,
  legacyLastByTarget: {},
  successorLastByTarget: {},
  orderMatches: true,
  replayHash: null,
  replayHashStableAcrossRepeat: true,
};

/**
 * Replay outcome comparison -- `events` only (see module doc). Compares a
 * naive legacy array-order-last-writer-wins reconstruction against the
 * successor's actual sequence-authoritative `replayToState`. Never mutates
 * `records`.
 */
export function compareFamilyReplay(family: MigrationStateFamily, records: readonly LegacyRecord[]): FamilyReplayComparison {
  if (family !== "events") return NOT_APPLICABLE_REPLAY;

  const bodies: unknown[] = records.map((r) => r.body);

  const legacyLastByTarget: Record<string, { atArrayIndex: number; lastType: string }> = {};
  bodies.forEach((body, index) => {
    if (!isPlainObject(body)) return;
    const atopWhich = body["atopWhich"];
    const type = body["type"];
    if (typeof atopWhich === "string" && atopWhich.length > 0 && typeof type === "string" && type.length > 0) {
      legacyLastByTarget[atopWhich] = { atArrayIndex: index, lastType: type };
    }
  });

  const cutSequence = Number.MAX_SAFE_INTEGER;
  const result = replayToState(bodies, [], cutSequence);
  const successorLastByTarget: Record<string, { lastSequence: number; lastType: string }> = {};
  for (const [target, entry] of Object.entries(result.stateByTarget)) {
    successorLastByTarget[target] = { lastSequence: entry.lastSequence, lastType: entry.lastType };
  }

  const allTargets = new Set([...Object.keys(legacyLastByTarget), ...Object.keys(successorLastByTarget)]);
  let orderMatches = true;
  for (const target of allTargets) {
    const legacyEntry = legacyLastByTarget[target];
    const successorEntry = successorLastByTarget[target];
    if (!legacyEntry || !successorEntry || legacyEntry.lastType !== successorEntry.lastType) {
      orderMatches = false;
      break;
    }
  }

  const hashA = replayHash(result);
  const repeatResult = replayToState(bodies, [], cutSequence);
  const hashB = replayHash(repeatResult);

  return {
    applicable: true,
    legacyLastByTarget,
    successorLastByTarget,
    orderMatches,
    replayHash: hashA,
    replayHashStableAcrossRepeat: hashA === hashB,
  };
}

export interface FamilyShadowSummary {
  readonly total: number;
  readonly parity: number;
  readonly explainedSafeDenials: number;
  readonly unexplainedDefects: number;
  readonly noSuccessorContract: number;
}

export interface FamilyShadowResult {
  readonly family: MigrationStateFamily;
  readonly recordOutcomes: readonly ShadowRecordOutcome[];
  readonly replay: FamilyReplayComparison;
  readonly summary: FamilyShadowSummary;
}

/** The single entry point tests call per family: read/query/proposal/denial comparison plus replay comparison, summarized. Never mutates `records` or `idMap`. */
export function runFamilyShadowComparison(family: MigrationStateFamily, records: readonly LegacyRecord[], idMap: readonly IdMapEntry[]): FamilyShadowResult {
  const recordOutcomes = compareFamilyRecords(family, records, idMap);
  const replay = compareFamilyReplay(family, records);

  const summary: FamilyShadowSummary = {
    total: recordOutcomes.length,
    parity: recordOutcomes.filter((o) => o.divergence === null).length,
    explainedSafeDenials: recordOutcomes.filter((o) => o.divergence?.kind === "explained-safe-denial").length,
    unexplainedDefects: recordOutcomes.filter((o) => o.divergence?.kind === "unexplained-defect").length,
    noSuccessorContract: recordOutcomes.filter((o) => o.successorGate.kind === "no-successor-contract").length,
  };

  return { family, recordOutcomes, replay, summary };
}

export interface GoldenShadowResults {
  readonly generatedFromFamilies: readonly MigrationStateFamily[];
  readonly perFamily: readonly FamilyShadowResult[];
  readonly totalUnexplainedDefects: number;
}

/** Assembles the golden results record from one shadow run's per-family outputs -- pure, no I/O; the caller (test) persists it. */
export function buildGoldenResults(perFamily: readonly FamilyShadowResult[]): GoldenShadowResults {
  return {
    generatedFromFamilies: perFamily.map((f) => f.family),
    perFamily,
    totalUnexplainedDefects: perFamily.reduce((sum, f) => sum + f.summary.unexplainedDefects, 0),
  };
}

/** Deterministic, human-readable report text for `golden` -- pure function, no I/O. */
export function generateShadowReport(golden: GoldenShadowResults): string {
  const lines: string[] = ["# Shadow Comparison Golden Results"];
  for (const f of golden.perFamily) {
    lines.push(`## ${f.family}`);
    lines.push(
      `total=${f.summary.total} parity=${f.summary.parity} explained-safe-denials=${f.summary.explainedSafeDenials} unexplained-defects=${f.summary.unexplainedDefects} no-successor-contract=${f.summary.noSuccessorContract}`,
    );
    lines.push(`replay: applicable=${f.replay.applicable} orderMatches=${f.replay.orderMatches} replayHashStable=${f.replay.replayHashStableAcrossRepeat}`);
  }
  lines.push(`TOTAL unexplained-defects across all families: ${golden.totalUnexplainedDefects}`);
  return lines.join("\n");
}
