/**
 * palantir-mini — rule-26 value-grade auto-grader (schema-side, prim-learn lineage axis)
 *
 * CANONICAL grading authority for the T0..T4 substrate-routing tier ladder
 * (rule 26 §Auto-grade / §Grading), lifted VERBATIM from
 * palantir-mini/bridge/handlers/emit-event.ts `autoGradeEnvelope` (P1
 * unification S3; g12 de-2026-07-11-schemas-authority-ruling-plugin-self-
 * containment-confirmed + de-2026-07-11-p1-unification-s2-s3-wave-design-of).
 * The plugin re-imports this function (single source); home-side cartography
 * consumers import it through the package exports map
 * (`@palantirKC/claude-schemas/ontology/lineage/value-grade-grading`).
 *
 * AUTHORITY: schemas-snapshot is the SSoT. This module imports ONLY sibling
 * package primitives (value-grade, lineage-refs) — never uphill from the
 * plugin's lib/ or bridge/ (the runtime consumes THIS declaration, not the
 * reverse).
 *
 * Scoring rules (branch order is semantics — do not reorder):
 *   T0 — A1 5-dim incomplete (when/atopWhich/throughWhich/byWhom missing).
 *   T1 — A axis full + E axis (memoryLayers ≥1).
 *   T2 — T1 + B axis ≥1 (lineageRefs OR hypothesis).
 *   T3 — T2 + C axis ≥1 (refinementTarget OR failureCategory in payload).
 *   T4 — T3 + D2 (K-LLM consensus annotation in payload.kLlmConsensus).
 *
 * (The historical doc comment's "OR rubric grading" on axis B was prose-only —
 * the lifted implementation never had a rubric branch; axis B is exactly
 * lineageRefs-or-hypothesis. Preserved as-is for byte-identical behavior.)
 *
 * D/L/A domain: LEARN (grading is a LEARN classification over the envelope).
 * Rule cross-refs: rule 26 §Auto-grade, rule 10 v3.0.0 (envelope).
 *
 * @owner palantirkc-ontology
 * @purpose Canonical rule-26 T0..T4 auto-grader over the 5-dim envelope
 */

import type { ValueGrade } from "../primitives/value-grade";
import { hasAnyLineageRef, type LineageRefs } from "../primitives/lineage-refs";

/**
 * Structural INPUT VIEW over any 5-dim envelope-shaped value — the exact
 * field surface `autoGradeEnvelope` reads, and nothing more. Declared here
 * (schema-side) so this module imports NOTHING from the plugin tree: the
 * plugin's runtime `EventEnvelope` union (lib/event-log/types.ts) is a
 * structural superset of this view, so every `Omit<EventEnvelope,"sequence">`
 * value the plugin passes today type-checks unchanged. Home-side consumers
 * (g12 cartography DecisionEvent mirrors) satisfy it by construction.
 *
 * All fields are optional/loose on purpose: the grader's JOB is to inspect
 * presence/absence — a missing dimension must be representable, not a type
 * error.
 */
export interface GradeableEnvelope {
  readonly when?: string;
  readonly atopWhich?: string;
  readonly throughWhich?: {
    readonly sessionId?: string;
    readonly toolName?: string;
    readonly cwd?: string;
  };
  readonly byWhom?: {
    readonly identity?: string;
  };
  readonly withWhat?: {
    readonly hypothesis?: string;
    readonly memoryLayers?: readonly string[];
    readonly refinementTarget?: unknown;
  };
  readonly lineageRefs?: LineageRefs;
  readonly payload?: unknown;
}

/**
 * rule 26 §Auto-grade — Compute valueGrade T0..T4 from envelope axes.
 * Conservative implementation: scans presence of required fields; no payload-
 * specific heuristics. Ported VERBATIM (branch order + edge-case semantics
 * preserved) from bridge/handlers/emit-event.ts.
 */
export function autoGradeEnvelope(envelope: GradeableEnvelope): ValueGrade {
  // Axis A1 — 5-dim completeness
  const dim5 = Boolean(
    envelope.when &&
    envelope.atopWhich &&
    envelope.throughWhich?.sessionId &&
    envelope.throughWhich?.toolName &&
    envelope.throughWhich?.cwd &&
    envelope.byWhom?.identity,
  );
  if (!dim5) return "T0";

  // Axis E — memory layer mapping
  const hasMemoryLayer = Boolean(
    envelope.withWhat?.memoryLayers && envelope.withWhat.memoryLayers.length > 0,
  );
  if (!hasMemoryLayer) return "T1"; // 5-dim full but no memory mapping

  // Axis B — verifiability signals
  const hasLineageRef = envelope.lineageRefs !== undefined && hasAnyLineageRef(envelope.lineageRefs);
  const hasHypothesis = Boolean(envelope.withWhat?.hypothesis);
  const axisB = hasLineageRef || hasHypothesis;
  if (!axisB) return "T1";

  // Axis C — refinement signals
  const hasRefinementTarget = envelope.withWhat?.refinementTarget !== undefined;
  const payloadAny = (envelope as { payload?: { failureCategory?: unknown } }).payload;
  const hasFailureCategory = Boolean(payloadAny?.failureCategory);
  const axisC = hasRefinementTarget || hasFailureCategory;
  if (!axisC) return "T2";

  // Axis D2 — K-LLM consensus
  const payloadConsensus = (envelope as { payload?: { kLlmConsensus?: unknown } }).payload;
  const hasKLlmConsensus = Boolean(payloadConsensus?.kLlmConsensus);
  return hasKLlmConsensus ? "T4" : "T3";
}
