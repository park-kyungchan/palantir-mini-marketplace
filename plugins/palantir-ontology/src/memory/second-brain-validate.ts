// SecondBrain interchange + governing-graph validation (ledger row P520,
// docs/architecture.md ADR-006, execution-plan.md section 9 row P520 "Bring
// SecondBrain interchange, validation, and governing graph schema under
// successor source authority").
//
// Step 2 of the mission's ordered pipeline ("extract/quarantine -> validate
// -> governed emit -> authoritative persist"): every function in this file
// is a PURE, SYNCHRONOUS, ZERO-I/O function — no network call, no file
// read, no LLM invocation. This is the concrete implementation of MEM-006
// ("SecondBrain folding validates extracted batches before emission... and
// avoids LLM work on the blocking hook path") — a caller may run this
// directly on a blocking hook path without any latency or availability risk
// a model call would introduce.
//
// Mirrors `contracts/second-brain-interchange.contract.json` and
// `contracts/second-brain-graph.contract.json` field-for-field, and adds
// exactly the kind-conditional and cross-field checks those contracts'
// descriptions name as beyond the successor's minimal schema-validator
// subset (no `oneOf`/`if`-`then`, no array-length-vs-integer-field
// comparison) — the same "JSON contract stays a loose envelope, the TS file
// is the real enforcement point" split `src/memory/memory-item.ts` (P510)
// already established for the four memory layers.
//
// This is a FRESH implementation, not an import of, port of, or dependency
// on the out-of-repo legacy plugin's `lib/second-brain/graph-contract.ts`
// (P230 section 2.3, reference-only evidence for this task, math-KG-
// excluded) or the out-of-repo SecondBrain fold engine
// (`second-brain/scripts/fold.ts`) it validates the interchange of — no
// path under either is imported, read at runtime, or otherwise depended on
// by this file (grep-verified in the P520 report). The successor's
// interchange/graph shape below is independently designed against this
// contract's own JSON files, the only in-tree, versioned source of truth.

const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const SCHEMA_VERSION_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;

export interface SecondBrainValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isWellFormedActor(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.identity !== "string" || v.identity.length === 0) return false;
  if (v.role !== undefined && typeof v.role !== "string") return false;
  return true;
}

function checkEnvelopeCommon(o: Record<string, unknown>, errors: string[]): void {
  if (typeof o.schemaVersion !== "string" || !SCHEMA_VERSION_RE.test(o.schemaVersion)) {
    errors.push(`$.schemaVersion: expected "N.N.N", got ${JSON.stringify(o.schemaVersion)}`);
  }
  if (typeof o.sessionId !== "string" || o.sessionId.length === 0) {
    errors.push(`$.sessionId: expected non-empty string, got ${typeOf(o.sessionId)}`);
  }
  if (typeof o.emittedAt !== "string" || !DATE_TIME_RE.test(o.emittedAt)) {
    errors.push(`$.emittedAt: expected date-time, got ${JSON.stringify(o.emittedAt)}`);
  }
  if (!isWellFormedActor(o.byWhom)) {
    errors.push(`$.byWhom: expected { identity, role? }, got ${typeOf(o.byWhom)}`);
  }
}

const VALID_VERDICT_KINDS = ["ADD", "UPDATE", "DELETE", "NONE"] as const;
type VerdictKind = (typeof VALID_VERDICT_KINDS)[number];

function checkVerdict(value: unknown, index: number, errors: string[]): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`$.verdicts[${index}]: expected object, got ${typeOf(value)}`);
    return;
  }
  const o = value as Record<string, unknown>;
  if (typeof o.kind !== "string" || !VALID_VERDICT_KINDS.includes(o.kind as VerdictKind)) {
    errors.push(`$.verdicts[${index}].kind: expected one of ${VALID_VERDICT_KINDS.join("|")}, got ${JSON.stringify(o.kind)}`);
    return;
  }
  if ((o.kind === "ADD" || o.kind === "UPDATE") && (typeof o.nodeId !== "string" || o.nodeId.length === 0)) {
    errors.push(`$.verdicts[${index}].nodeId: required non-empty string for verdict kind "${o.kind}"`);
  }
  if (o.kind === "DELETE" && typeof o.nodeId !== "string" && typeof o.edgeId !== "string") {
    errors.push(`$.verdicts[${index}]: DELETE requires nodeId or edgeId`);
  }
}

/**
 * kind=batch line: `batchIndex` + `verdicts` required, `summary`/`totalBatches`
 * forbidden (a batch line never smuggles the terminal summary's fields).
 */
export function validateSecondBrainBatchLine(value: unknown): SecondBrainValidationResult {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, errors: [`$: expected object, got ${typeOf(value)}`] };
  }
  const o = value as Record<string, unknown>;
  const errors: string[] = [];
  if (o.kind !== "batch") errors.push(`$.kind: expected "batch", got ${JSON.stringify(o.kind)}`);
  checkEnvelopeCommon(o, errors);
  if (typeof o.batchIndex !== "number" || !Number.isInteger(o.batchIndex) || o.batchIndex < 0) {
    errors.push(`$.batchIndex: expected non-negative integer, got ${JSON.stringify(o.batchIndex)}`);
  }
  if (!Array.isArray(o.verdicts)) {
    errors.push(`$.verdicts: expected array, got ${typeOf(o.verdicts)}`);
  } else {
    o.verdicts.forEach((v, i) => checkVerdict(v, i, errors));
  }
  if (o.summary !== undefined) errors.push(`$.summary: forbidden on a "batch" line`);
  if (o.totalBatches !== undefined) errors.push(`$.totalBatches: forbidden on a "batch" line`);
  return { valid: errors.length === 0, errors };
}

/**
 * kind=summary line: `summary` + `totalBatches` required, `batchIndex`/
 * `verdicts` forbidden (the terminal line never carries a mid-fold batch's
 * fields).
 */
export function validateSecondBrainSummaryLine(value: unknown): SecondBrainValidationResult {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, errors: [`$: expected object, got ${typeOf(value)}`] };
  }
  const o = value as Record<string, unknown>;
  const errors: string[] = [];
  if (o.kind !== "summary") errors.push(`$.kind: expected "summary", got ${JSON.stringify(o.kind)}`);
  checkEnvelopeCommon(o, errors);
  if (typeof o.totalBatches !== "number" || !Number.isInteger(o.totalBatches) || o.totalBatches < 0) {
    errors.push(`$.totalBatches: expected non-negative integer, got ${JSON.stringify(o.totalBatches)}`);
  }
  if (o.summary === null || typeof o.summary !== "object" || Array.isArray(o.summary)) {
    errors.push(`$.summary: expected object, got ${typeOf(o.summary)}`);
  } else {
    const s = o.summary as Record<string, unknown>;
    if (typeof s.nodeCount !== "number" || !Number.isInteger(s.nodeCount) || s.nodeCount < 0) {
      errors.push(`$.summary.nodeCount: expected non-negative integer, got ${JSON.stringify(s.nodeCount)}`);
    }
    if (typeof s.edgeCount !== "number" || !Number.isInteger(s.edgeCount) || s.edgeCount < 0) {
      errors.push(`$.summary.edgeCount: expected non-negative integer, got ${JSON.stringify(s.edgeCount)}`);
    }
    if (typeof s.sessionId !== "string" || s.sessionId.length === 0) {
      errors.push(`$.summary.sessionId: expected non-empty string, got ${typeOf(s.sessionId)}`);
    }
    if (typeof s.graphRef !== "string" || s.graphRef.length === 0) {
      errors.push(`$.summary.graphRef: expected non-empty string, got ${typeOf(s.graphRef)}`);
    }
  }
  if (o.batchIndex !== undefined) errors.push(`$.batchIndex: forbidden on a "summary" line`);
  if (o.verdicts !== undefined) errors.push(`$.verdicts: forbidden on a "summary" line`);
  return { valid: errors.length === 0, errors };
}

/**
 * The single dispatch entry point (mirrors `classifyMemoryItem`'s role in
 * `src/memory/memory-item.ts`): reads the `kind` discriminator and routes to
 * the matching validator. An unrecognized/missing `kind` fails closed with a
 * descriptive error — never a silent pass (`UNKNOWN-is-not-PASS`).
 */
export function validateSecondBrainInterchangeLine(value: unknown): SecondBrainValidationResult {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, errors: [`$: expected object, got ${typeOf(value)}`] };
  }
  const kind = (value as Record<string, unknown>).kind;
  if (kind === "batch") return validateSecondBrainBatchLine(value);
  if (kind === "summary") return validateSecondBrainSummaryLine(value);
  return { valid: false, errors: [`$.kind: expected "batch" or "summary", got ${JSON.stringify(kind)}`] };
}

/**
 * The governing graph document (`contracts/second-brain-graph.contract.json`):
 * closed node/edge shape plus the two cross-field checks the JSON contract's
 * minimal subset cannot express — `nodeCount === nodes.length`,
 * `edgeCount === edges.length`, and every edge's `from`/`to` resolving to a
 * declared node id (no dangling edge reaches the "governed" graph).
 */
export function validateSecondBrainGraphDocument(value: unknown): SecondBrainValidationResult {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, errors: [`$: expected object, got ${typeOf(value)}`] };
  }
  const o = value as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof o.schemaVersion !== "string" || !SCHEMA_VERSION_RE.test(o.schemaVersion)) {
    errors.push(`$.schemaVersion: expected "N.N.N", got ${JSON.stringify(o.schemaVersion)}`);
  }
  if (typeof o.sessionId !== "string" || o.sessionId.length === 0) {
    errors.push(`$.sessionId: expected non-empty string, got ${typeOf(o.sessionId)}`);
  }

  const nodeIds = new Set<string>();
  if (!Array.isArray(o.nodes)) {
    errors.push(`$.nodes: expected array, got ${typeOf(o.nodes)}`);
  } else {
    o.nodes.forEach((n, i) => {
      if (n === null || typeof n !== "object" || Array.isArray(n)) {
        errors.push(`$.nodes[${i}]: expected object, got ${typeOf(n)}`);
        return;
      }
      const nn = n as Record<string, unknown>;
      if (typeof nn.nodeId !== "string" || nn.nodeId.length === 0) {
        errors.push(`$.nodes[${i}].nodeId: expected non-empty string, got ${typeOf(nn.nodeId)}`);
      } else {
        nodeIds.add(nn.nodeId);
      }
      if (typeof nn.kind !== "string" || nn.kind.length === 0) {
        errors.push(`$.nodes[${i}].kind: expected non-empty string, got ${typeOf(nn.kind)}`);
      }
    });
  }

  if (!Array.isArray(o.edges)) {
    errors.push(`$.edges: expected array, got ${typeOf(o.edges)}`);
  } else {
    o.edges.forEach((e, i) => {
      if (e === null || typeof e !== "object" || Array.isArray(e)) {
        errors.push(`$.edges[${i}]: expected object, got ${typeOf(e)}`);
        return;
      }
      const ee = e as Record<string, unknown>;
      if (typeof ee.edgeId !== "string" || ee.edgeId.length === 0) {
        errors.push(`$.edges[${i}].edgeId: expected non-empty string, got ${typeOf(ee.edgeId)}`);
      }
      if (typeof ee.kind !== "string" || ee.kind.length === 0) {
        errors.push(`$.edges[${i}].kind: expected non-empty string, got ${typeOf(ee.kind)}`);
      }
      if (typeof ee.from !== "string" || ee.from.length === 0) {
        errors.push(`$.edges[${i}].from: expected non-empty string, got ${typeOf(ee.from)}`);
      } else if (!nodeIds.has(ee.from)) {
        errors.push(`$.edges[${i}].from: "${ee.from}" does not reference a declared node`);
      }
      if (typeof ee.to !== "string" || ee.to.length === 0) {
        errors.push(`$.edges[${i}].to: expected non-empty string, got ${typeOf(ee.to)}`);
      } else if (!nodeIds.has(ee.to)) {
        errors.push(`$.edges[${i}].to: "${ee.to}" does not reference a declared node`);
      }
    });
  }

  if (typeof o.nodeCount !== "number" || !Number.isInteger(o.nodeCount) || o.nodeCount < 0) {
    errors.push(`$.nodeCount: expected non-negative integer, got ${JSON.stringify(o.nodeCount)}`);
  } else if (Array.isArray(o.nodes) && o.nodeCount !== o.nodes.length) {
    errors.push(`$.nodeCount: ${o.nodeCount} does not equal nodes.length (${o.nodes.length})`);
  }
  if (typeof o.edgeCount !== "number" || !Number.isInteger(o.edgeCount) || o.edgeCount < 0) {
    errors.push(`$.edgeCount: expected non-negative integer, got ${JSON.stringify(o.edgeCount)}`);
  } else if (Array.isArray(o.edges) && o.edgeCount !== o.edges.length) {
    errors.push(`$.edgeCount: ${o.edgeCount} does not equal edges.length (${o.edges.length})`);
  }

  return { valid: errors.length === 0, errors };
}

/** Render a `SecondBrainValidationResult`'s errors as one human-readable line, for a denial's `detail` string. */
export function formatSecondBrainValidationErrors(errors: readonly string[]): string {
  return errors.join("; ");
}
