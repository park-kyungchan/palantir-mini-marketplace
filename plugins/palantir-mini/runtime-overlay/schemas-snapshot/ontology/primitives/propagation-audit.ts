/**
 * @stable — PropagationAuditPayload primitive (prim-data-18, v1.34.0)
 *
 * Result envelope of the `propagation_audit_forward` MCP handler. Captures
 * a single forward-walk audit of the ForwardProp authority chain
 *   research → schema → shared-core → project-ontology → contracts → runtime
 * verifying each step's invariant via a named validator. Used by the
 * cosmic-hatching-pizza W6 substrate to detect chain breaks before they
 * surface as runtime regressions.
 *
 * Authority chain:
 *   plans/distributed-wishing-manatee.md §Phase 1 + parent
 *     plans/cosmic-hatching-pizza.md §W6 (substrate primitives)
 *       ↓
 *   schemas/ontology/primitives/propagation-audit.ts (this file — SSoT for
 *     PropagationStep enum)
 *       ↓
 *   schemas/ontology/primitives/propagation-replay.ts (re-exports
 *     PropagationStep)
 *       ↓
 *   schemas/ontology/primitives/propagation-health.ts (re-exports
 *     PropagationStep)
 *       ↓
 *   palantir-mini bridge/handlers/propagation-audit-forward.ts (consumer,
 *     Phase 4)
 *
 * D/L/A domain: DATA (audit-result envelope; not an executable action)
 * @owner palantirkc-ontology
 * @purpose Canonical forward-chain audit result primitive for W6 substrate
 * @authorityChain research → schemas → shared-core → project-ontology → contracts → runtime
 */

/**
 * Six canonical steps of the ForwardProp authority chain (rule 01 §Propagation).
 *
 * - `research`         — `~/.claude/research/` evidence layer
 * - `schema`           — `~/.claude/schemas/ontology/primitives/`
 * - `shared-core`      — `~/ontology/shared-core/` consumer surface
 * - `project-ontology` — `<project>/ontology/` per-project semantic layer
 * - `contracts`        — generated TypeScript contracts (e.g. SDK clients)
 * - `runtime`          — runtime artifacts (binaries, schemas in service)
 *
 * Order is meaningful — index 0 (`research`) is the highest authority;
 * index 5 (`runtime`) is the lowest. Disagreement is resolved upward.
 */
export type PropagationStep =
  | "research"
  | "schema"
  | "shared-core"
  | "project-ontology"
  | "contracts"
  | "runtime";

/**
 * Runtime-readable list of all valid PropagationStep values, in
 * authority-descending order. Forward audits walk index 0 → 5.
 */
export const PROPAGATION_STEPS: readonly PropagationStep[] = [
  "research",
  "schema",
  "shared-core",
  "project-ontology",
  "contracts",
  "runtime",
] as const;

/**
 * Type guard — returns true if `s` is a valid PropagationStep string.
 * Use to coerce user-supplied or persisted strings before indexing
 * `perStepResult` records.
 */
export function isPropagationStep(s: string): s is PropagationStep {
  return (PROPAGATION_STEPS as readonly string[]).includes(s);
}

// ─── propagationDepth — canonical 5-layer (0-4) scale (XRUN-2) ──────────────
//
// SCALE RECONCILIATION. rule 10 v2.2.0 §Auto-derivation + rule 01 §ForwardProp
// define FIVE layers (0-4); divergent code paths previously used SIX layers
// (0-5, splitting research/schema). This is the ONE canonical enumeration —
// the hook's inferPropagationDepth, scripts/log.ts emit(), the backward-prop
// audit, and the compactor all consume it.
//
//   0 = research / schemas          (origin layer; rule 10 path-table row 1)
//   1 = shared-core                 (ontology/shared-core)
//   2 = project-ontology            (project ontology)
//   3 = contracts / hooks
//   4 = runtime / src
//
// Note the relationship to the SIX-value `PropagationStep` authority vocabulary
// above: `PropagationStep` keeps its full 6-entry forward-chain enum (research
// AND schema are distinct STEPS), but the 5-layer DEPTH scale COLLAPSES
// research+schema into layer 0. PROPAGATION_DEPTH_TO_STEP maps a depth integer
// to its representative step (layer 0 → "research", the highest authority).
export const MIN_PROPAGATION_DEPTH = 0;
export const MAX_PROPAGATION_DEPTH = 4;

/** Canonical 0-4 propagation layer depth (rule 10 §Auto-derivation). */
export type PropagationDepth = 0 | 1 | 2 | 3 | 4;

/**
 * Maps a canonical 0-4 `propagationDepth` to its representative
 * `PropagationStep`. Layer 0 (research/schema collapsed) maps to "research".
 * Index by a clamped depth; out-of-range depths return undefined.
 */
export const PROPAGATION_DEPTH_TO_STEP: readonly PropagationStep[] = [
  "research",          // 0 — research / schemas
  "shared-core",       // 1 — ontology/shared-core
  "project-ontology",  // 2 — project ontology
  "contracts",         // 3 — contracts / hooks
  "runtime",           // 4 — runtime / src
] as const;

/** True when `n` is an integer in the canonical 0-4 range. */
export function isPropagationDepth(n: number): n is PropagationDepth {
  return Number.isInteger(n) && n >= MIN_PROPAGATION_DEPTH && n <= MAX_PROPAGATION_DEPTH;
}

/**
 * Path-heuristic auto-derivation of `propagationDepth` from an emitter context
 * path (rule 10 v2.2.0 §Auto-derivation). Best-effort — returns undefined when
 * the path matches no layer (caller then omits the field, which is valid).
 *
 *   research/ | schemas/       → 0
 *   ontology/shared-core/      → 1
 *   project ontology/          → 2
 *   contracts/ | hooks/        → 3
 *   runtime/ | src/            → 4
 */
export function derivePropagationDepthFromPath(
  contextPath: string | undefined,
): PropagationDepth | undefined {
  if (!contextPath) return undefined;
  const p = contextPath.replace(/\\/g, "/").toLowerCase();
  // Order matters: shared-core is under ontology/, so test it before the
  // generic project-ontology check.
  if (/(^|\/)(research|schemas)\//.test(p)) return 0;
  if (/(^|\/)ontology\/shared-core\//.test(p) || /(^|\/)shared-core\//.test(p)) return 1;
  if (/(^|\/)(project[- ]?ontology|ontology)\//.test(p)) return 2;
  if (/(^|\/)(contracts|hooks)\//.test(p)) return 3;
  if (/(^|\/)(runtime|runtime-overlay|src|lib|bridge|scripts)\//.test(p)) return 4;
  return undefined;
}

/**
 * Per-step audit result. One entry per `PropagationStep` in
 * `PropagationAuditPayload.perStepResult`.
 */
export interface PropagationStepResult {
  /** Whether this step's invariant held. */
  readonly pass: boolean;
  /** Named validator that produced the verdict (e.g. "schema-pin-check"). */
  readonly validator: string;
  /** Optional path or RID pointing to the supporting evidence. */
  readonly evidence?: string;
}

/**
 * Envelope returned by the `propagation_audit_forward` MCP handler.
 *
 * A single audit walks the 6-step ForwardProp chain in
 * authority-descending order, halting (or continuing per handler policy)
 * at the first failure. `firstFailureStep` records the earliest break;
 * `perStepResult` carries the full per-step verdict.
 */
export interface PropagationAuditPayload {
  /** Stable id of this audit run (opaque, generated by the handler). */
  readonly auditId: string;
  /**
   * Steps actually walked, in order. Usually equals
   * `PROPAGATION_STEPS`, but a partial audit (e.g. user requested only
   * `["schema", "shared-core"]`) records only the walked subset.
   */
  readonly chainSteps: readonly PropagationStep[];
  /**
   * The earliest step whose invariant failed, or `null` when the chain
   * is fully green.
   */
  readonly firstFailureStep: PropagationStep | null;
  /**
   * Per-step verdict map. Keys are a subset of `chainSteps`; absent keys
   * indicate the step was skipped (e.g. early-exit audit).
   */
  readonly perStepResult: Readonly<
    Partial<Record<PropagationStep, PropagationStepResult>>
  >;
  /** Aggregate verdict — `pass` iff every walked step passed. */
  readonly verdict: "pass" | "fail";
  /** ISO 8601 audit timestamp. */
  readonly auditedAt: string;
}

/**
 * Type guard — narrows an unknown value to PropagationAuditPayload.
 * Use when reading audit envelopes back from JSON / events.jsonl.
 */
export function isPropagationAuditPayload(
  x: unknown,
): x is PropagationAuditPayload {
  if (typeof x !== "object" || x === null) return false;
  const v = x as Record<string, unknown>;
  return (
    typeof v.auditId === "string" &&
    Array.isArray(v.chainSteps) &&
    (v.firstFailureStep === null ||
      (typeof v.firstFailureStep === "string" &&
        isPropagationStep(v.firstFailureStep))) &&
    typeof v.perStepResult === "object" &&
    v.perStepResult !== null &&
    (v.verdict === "pass" || v.verdict === "fail") &&
    typeof v.auditedAt === "string"
  );
}
