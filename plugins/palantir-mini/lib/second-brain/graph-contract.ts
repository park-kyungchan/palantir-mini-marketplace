// @domain: LEARN
// graph-contract — pure runtime validation for the second-brain fold's governed
// NDJSON interchange (W3 workstream B).
//
// Validates the two NDJSON line shapes the out-of-repo fold engine
// (second-brain/scripts/fold.ts) prints to stdout and the second-brain-fold agent
// streams: SecondBrainFoldBatchLine ({"kind":"batch",...}) and
// SecondBrainFoldSummaryLine ({"kind":"summary",...}), per the schema-level
// contract at #schemas/ontology/primitives/second-brain-graph.ts.
//
// Every validator returns a GraphContractResult — either { ok:true } or
// { ok:false, errors } where each GraphContractError names the OFFENDING FIELD,
// what was EXPECTED vs FOUND, and (for batch-scoped errors) the batchIndex, so a
// rejection is immediately actionable without re-deriving context. Pure — no I/O,
// no throw on malformed input (a validator's job is to REPORT malformance, not
// crash on it).
//
// Wired into lib/second-brain/foldedsessions-emit-cli.ts's validate-before-commit
// gate: an invalid batch is rejected BEFORE any of its verdicts (or the summary)
// are forwarded into events.jsonl — all-or-nothing per batch/summary line.

import type {
  SecondBrainFoldBatchLine,
  SecondBrainFoldSummaryLine,
  SecondBrainFoldEmitObj,
  SecondBrainVerdictKind,
} from "#schemas/ontology/primitives/second-brain-graph";

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

export interface GraphContractError {
  /** Dotted/bracketed path to the offending field, e.g. "verdicts[2].payload.verdict". */
  readonly field: string;
  readonly expected: string;
  readonly found: string;
  /** Present for batch-scoped errors (the NDJSON line's batchIndex, when known). */
  readonly batchIndex?: number;
}

export type GraphContractResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly errors: readonly GraphContractError[] };

function ok(): GraphContractResult {
  return { ok: true };
}

function fail(errors: GraphContractError[]): GraphContractResult {
  return { ok: false, errors };
}

/** Human-readable JS-typeof-ish description of a value, for "found" messages. */
function describe(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (Array.isArray(v)) return `array(len=${v.length})`;
  return typeof v;
}

const VALID_VERDICT_KINDS: readonly SecondBrainVerdictKind[] = ["ADD", "UPDATE", "DELETE", "NONE"];

// ---------------------------------------------------------------------------
// EmitObj validation (shared by verdicts + the summary)
// ---------------------------------------------------------------------------

/**
 * Validate ONE SecondBrainFoldEmitObj shape ({ type, payload, memoryLayers?,
 * hypothesis?, refinementTarget? }). `fieldPrefix` scopes error field paths
 * (e.g. "verdicts[0]" or "summary"). Does NOT validate payload CONTENTS beyond
 * the type-specific checks in validateResolutionVerdictPayload /
 * validateMemoryFoldCommittedPayload (called separately by the batch/summary
 * validators below, since only THEY know which payload shape applies).
 */
function validateEmitObjEnvelope(
  value: unknown,
  fieldPrefix: string,
  batchIndex: number | undefined,
): GraphContractError[] {
  const errors: GraphContractError[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push({
      field: fieldPrefix,
      expected: "object { type, payload, memoryLayers?, hypothesis?, refinementTarget? }",
      found: describe(value),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
    return errors;
  }
  const o = value as Record<string, unknown>;

  if (typeof o.type !== "string" || o.type.length === 0) {
    errors.push({
      field: `${fieldPrefix}.type`,
      expected: "non-empty string",
      found: describe(o.type),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  if (!o.payload || typeof o.payload !== "object" || Array.isArray(o.payload)) {
    errors.push({
      field: `${fieldPrefix}.payload`,
      expected: "object",
      found: describe(o.payload),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  if (o.memoryLayers !== undefined && !Array.isArray(o.memoryLayers)) {
    errors.push({
      field: `${fieldPrefix}.memoryLayers`,
      expected: "array | undefined",
      found: describe(o.memoryLayers),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  if (o.hypothesis !== undefined && typeof o.hypothesis !== "string") {
    errors.push({
      field: `${fieldPrefix}.hypothesis`,
      expected: "string | undefined",
      found: describe(o.hypothesis),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  if (
    o.refinementTarget !== undefined &&
    (typeof o.refinementTarget !== "object" || o.refinementTarget === null || Array.isArray(o.refinementTarget))
  ) {
    errors.push({
      field: `${fieldPrefix}.refinementTarget`,
      expected: "object | undefined",
      found: describe(o.refinementTarget),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  return errors;
}

/** Validate a resolution_verdict EmitObj's payload contents. */
function validateResolutionVerdictPayload(
  payload: Record<string, unknown>,
  fieldPrefix: string,
  batchIndex: number | undefined,
): GraphContractError[] {
  const errors: GraphContractError[] = [];
  const verdict = payload.verdict;
  if (typeof verdict !== "string" || !VALID_VERDICT_KINDS.includes(verdict as SecondBrainVerdictKind)) {
    errors.push({
      field: `${fieldPrefix}.payload.verdict`,
      expected: `one of ${VALID_VERDICT_KINDS.join("|")}`,
      found: describe(verdict),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  if (payload.targetId !== undefined && typeof payload.targetId !== "string") {
    errors.push({
      field: `${fieldPrefix}.payload.targetId`,
      expected: "string | undefined",
      found: describe(payload.targetId),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  if (payload.derivedFrom !== undefined && !Array.isArray(payload.derivedFrom)) {
    errors.push({
      field: `${fieldPrefix}.payload.derivedFrom`,
      expected: "array | undefined",
      found: describe(payload.derivedFrom),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  return errors;
}

/** Validate a memory_fold_committed EmitObj's payload contents (the 4 base fields; W3 audit fields are optional). */
function validateMemoryFoldCommittedPayload(
  payload: Record<string, unknown>,
  fieldPrefix: string,
  batchIndex: number | undefined,
): GraphContractError[] {
  const errors: GraphContractError[] = [];
  if (typeof payload.graphPath !== "string" || payload.graphPath.length === 0) {
    errors.push({
      field: `${fieldPrefix}.payload.graphPath`,
      expected: "non-empty string",
      found: describe(payload.graphPath),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  if (typeof payload.nodeCount !== "number" || !Number.isFinite(payload.nodeCount)) {
    errors.push({
      field: `${fieldPrefix}.payload.nodeCount`,
      expected: "finite number",
      found: describe(payload.nodeCount),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  if (typeof payload.edgeCount !== "number" || !Number.isFinite(payload.edgeCount)) {
    errors.push({
      field: `${fieldPrefix}.payload.edgeCount`,
      expected: "finite number",
      found: describe(payload.edgeCount),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  if (typeof payload.sessionId !== "string" || payload.sessionId.length === 0) {
    errors.push({
      field: `${fieldPrefix}.payload.sessionId`,
      expected: "non-empty string",
      found: describe(payload.sessionId),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  return errors;
}

/**
 * Validate ONE verdict EmitObj (as found inside a batch line's `verdicts[]`).
 * Only `resolution_verdict` gets payload-content validation today (the only
 * verdict type the engine emits mid-batch); an unrecognized `type` string still
 * passes envelope-shape validation (forward-compat — new verdict types are not
 * REJECTED sight-unseen, only their known payload shape is checked).
 */
export function validateVerdictEmitObj(
  value: unknown,
  index: number,
  batchIndex: number,
): GraphContractResult {
  const fieldPrefix = `verdicts[${index}]`;
  const errors = validateEmitObjEnvelope(value, fieldPrefix, batchIndex);
  if (errors.length > 0) return fail(errors);

  const obj = value as SecondBrainFoldEmitObj;
  if (obj.type === "resolution_verdict") {
    const payloadErrors = validateResolutionVerdictPayload(
      obj.payload as Record<string, unknown>,
      fieldPrefix,
      batchIndex,
    );
    if (payloadErrors.length > 0) return fail(payloadErrors);
  }
  return ok();
}

/**
 * Validate ONE `{"kind":"batch",...}` NDJSON line in full: the envelope
 * (kind/batchIndex/verdicts array shape) AND every verdict inside `verdicts[]`.
 * Returns ALL errors found (not just the first) so a rejection is maximally
 * actionable in one pass.
 */
export function validateBatchLine(value: unknown): GraphContractResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail([{ field: "$", expected: "object { kind:\"batch\", batchIndex, verdicts }", found: describe(value) }]);
  }
  const o = value as Record<string, unknown>;
  const errors: GraphContractError[] = [];

  if (o.kind !== "batch") {
    errors.push({ field: "kind", expected: '"batch"', found: describe(o.kind) });
  }
  const batchIndex = typeof o.batchIndex === "number" ? o.batchIndex : undefined;
  if (typeof o.batchIndex !== "number" || !Number.isInteger(o.batchIndex) || o.batchIndex < 0) {
    errors.push({
      field: "batchIndex",
      expected: "non-negative integer",
      found: describe(o.batchIndex),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  }
  if (!Array.isArray(o.verdicts)) {
    errors.push({
      field: "verdicts",
      expected: "array (may be empty)",
      found: describe(o.verdicts),
      ...(batchIndex !== undefined ? { batchIndex } : {}),
    });
  } else {
    o.verdicts.forEach((v, i) => {
      const r = validateVerdictEmitObj(v, i, batchIndex ?? -1);
      if (!r.ok) errors.push(...r.errors);
    });
  }

  return errors.length > 0 ? fail(errors) : ok();
}

/**
 * Validate the ONE terminal `{"kind":"summary",...}` NDJSON line: the envelope
 * (kind/summary/totalBatches shape) AND the summary EmitObj's
 * memory_fold_committed payload contents.
 */
export function validateSummaryLine(value: unknown): GraphContractResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail([{ field: "$", expected: "object { kind:\"summary\", summary, totalBatches }", found: describe(value) }]);
  }
  const o = value as Record<string, unknown>;
  const errors: GraphContractError[] = [];

  if (o.kind !== "summary") {
    errors.push({ field: "kind", expected: '"summary"', found: describe(o.kind) });
  }
  if (typeof o.totalBatches !== "number" || !Number.isInteger(o.totalBatches) || o.totalBatches < 0) {
    errors.push({ field: "totalBatches", expected: "non-negative integer", found: describe(o.totalBatches) });
  }

  const envelopeErrors = validateEmitObjEnvelope(o.summary, "summary", undefined);
  errors.push(...envelopeErrors);
  if (envelopeErrors.length === 0) {
    const summaryObj = o.summary as SecondBrainFoldEmitObj;
    if (summaryObj.type === "memory_fold_committed") {
      errors.push(
        ...validateMemoryFoldCommittedPayload(summaryObj.payload as Record<string, unknown>, "summary", undefined),
      );
    }
  }

  return errors.length > 0 ? fail(errors) : ok();
}

/** Render a GraphContractResult's errors as one human-readable line (for stderr / thrown Error messages). */
export function formatGraphContractErrors(errors: readonly GraphContractError[]): string {
  return errors
    .map((e) => {
      const loc = e.batchIndex !== undefined ? `batchIndex=${e.batchIndex} ` : "";
      return `${loc}field="${e.field}" expected=${e.expected} found=${e.found}`;
    })
    .join("; ");
}

export type { SecondBrainFoldBatchLine, SecondBrainFoldSummaryLine };
