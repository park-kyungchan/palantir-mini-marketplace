// palantir-mini v3.13.0 — MCP tool handler: emit_event
// Domain: LEARN (AppendOnlyEventLog) + ACTION (AtomicCommit)
//
// Atomically append an EventEnvelope to the project's events.jsonl.
// Sequence is assigned inside the fs.mkdir-locked critical section.
//
// v1.35.0 / rule 26 §R5 — Validates that
// `validation_phase_completed.passed=false` envelopes carry
// `withWhat.refinementTarget`. Default mode: log advisory to stderr; hard
// mode (PALANTIR_MINI_VALUE_GRADE_ENFORCE=1): throw at emit (T0 reject).

import * as path from "path";
import { appendEventAtomic } from "../../lib/event-log/append";
import type { EventEnvelope } from "../../lib/event-log/types";
import { isRefinementTarget } from "#schemas/ontology/primitives/refinement-target";
import type { ValueGrade } from "#schemas/ontology/primitives/value-grade";
import { hasAnyLineageRef } from "#schemas/ontology/primitives/lineage-refs";

interface EmitEventArgs {
  project:  string;
  envelope: Omit<EventEnvelope, "sequence">;
}

/**
 * F1 / ssot/palantir/ontology/approval-and-lineage.md (ActionType = SOLE write-back
 * commit gate) — commit-provenance event types that assert "the governed commit path
 * ran" (an ActionType committed edits, or a submission-criteria gate rejected them).
 * These are emitted EXCLUSIVELY by lib/actions/commit.ts (commitEdits) via
 * appendEventAtomic — NEVER through this MCP boundary. Accepting them here would let a
 * caller forge `edit_committed`/`submission_criteria_failed` with an arbitrary
 * actionTypeRid, bypassing the A2 ActionType gate and poisoning the fold's
 * registeredPrimitives + audit counts. Fail closed: reject direct emit of these types.
 */
const RESERVED_PROVENANCE_TYPES: ReadonlySet<string> = new Set([
  "edit_committed",
  "submission_criteria_failed",
]);

/**
 * F1 — Returns an error message when the envelope's type is a reserved commit-provenance
 * type that must only originate from the governed commit path, or null when allowed.
 */
export function validateReservedProvenanceType(
  envelope: Omit<EventEnvelope, "sequence">,
): string | null {
  if (RESERVED_PROVENANCE_TYPES.has(envelope.type)) {
    return (
      `emit_event refuses reserved commit-provenance type "${envelope.type}": this type ` +
      "may only be emitted by the governed commit path (lib/actions/commit.ts via the " +
      "ActionType gate), not by a direct emit_event. Commit through commit_edits so the " +
      "ActionType write-back gate (ssot/palantir approval-and-lineage) applies."
    );
  }
  return null;
}

interface EmitEventResult {
  eventId:  string;
  sequence: number;
  eventsPath: string;
  /** v1.35.0+ Advisory message when rule 26 §R5 not satisfied (advisory mode). */
  valuableDataAdvisory?: string;
  /** v1.35.0+ Computed valueGrade for this envelope (auto-assigned per rule 26 §Auto-grade). */
  valueGrade?: ValueGrade;
}

/**
 * v1.35.0 / rule 26 §Auto-grade — Compute valueGrade T0..T4 from envelope axes.
 * Conservative implementation: scans presence of required fields; no payload-
 * specific heuristics. value-grade-assigner hook (Phase 2) will refine this.
 *
 * Scoring rules:
 *   T0 — A1 5-dim incomplete (when/atopWhich/throughWhich/byWhom missing).
 *   T1 — A axis full + E axis (memoryLayers ≥1).
 *   T2 — T1 + B axis ≥1 (lineageRefs OR hypothesis OR rubric grading).
 *   T3 — T2 + C axis ≥1 (refinementTarget OR FailureCategory in payload).
 *   T4 — T3 + D2 (K-LLM consensus annotation in payload.kLlmConsensus).
 */
export function autoGradeEnvelope(
  envelope: Omit<EventEnvelope, "sequence">,
): ValueGrade {
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

/**
 * v1.35.0 / rule 26 §R5 — Verify that failed-validation envelopes carry a
 * typed refinementTarget. Returns null when the envelope passes the rule, or
 * a human-readable error message when it fails.
 *
 * Scope: only enforced for `validation_phase_completed` envelopes whose
 * `payload.passed === false`. All other envelope types pass silently.
 */
export function validateRule26R5(
  envelope: Omit<EventEnvelope, "sequence">,
): string | null {
  if (envelope.type !== "validation_phase_completed") return null;
  const payload = (envelope as { payload?: { passed?: unknown } }).payload;
  if (!payload || payload.passed !== false) return null;

  const target = envelope.withWhat?.refinementTarget;
  if (target === undefined) {
    return (
      "rule 26 §R5: validation_phase_completed.passed=false envelopes MUST " +
      "carry withWhat.refinementTarget (kind/filePathOrRid/description/" +
      "confidenceLevel). Add the field to the emit() call OR set " +
      "PALANTIR_MINI_VALUE_GRADE_BYPASS=1 to bypass (audited)."
    );
  }
  if (!isRefinementTarget(target)) {
    return (
      "rule 26 §R5: withWhat.refinementTarget present but malformed " +
      "(expect: { kind, filePathOrRid, description, confidenceLevel }). " +
      "See schemas/ontology/primitives/refinement-target.ts for shape."
    );
  }
  return null;
}

export default async function emitEvent(rawArgs: unknown): Promise<EmitEventResult> {
  const args = (rawArgs ?? {}) as EmitEventArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("emit_event: `project` is required");
  }
  if (!args.envelope || typeof args.envelope !== "object") {
    throw new Error("emit_event: `envelope` is required");
  }

  // F1 — fail-closed: reject direct emit of reserved commit-provenance types. No env
  // bypass; this is a governance invariant (ActionType = sole write-back commit gate),
  // not an advisory grading check.
  const provenanceViolation = validateReservedProvenanceType(args.envelope);
  if (provenanceViolation !== null) {
    const err = new Error(`emit_event: ${provenanceViolation}`) as Error & {
      errorClass?: string;
    };
    err.errorClass = "reserved_provenance_type_direct_emit";
    throw err;
  }

  // rule 26 §R5 advisory / hard-enforce
  const r5Violation = validateRule26R5(args.envelope);
  let valuableDataAdvisory: string | undefined;
  if (r5Violation !== null) {
    const enforce = process.env.PALANTIR_MINI_VALUE_GRADE_ENFORCE === "1";
    const bypass  = process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS  === "1";
    if (enforce && !bypass) {
      throw new Error(`emit_event: ${r5Violation}`);
    }
    process.stderr.write(`[palantir-mini/emit-event ADVISORY] ${r5Violation}\n`);
    valuableDataAdvisory = r5Violation;
  }

  // rule 26 §Auto-grade — compute + inject valueGrade if not pre-set by caller.
  const computedGrade = autoGradeEnvelope(args.envelope);
  const envelopeWithGrade: Omit<EventEnvelope, "sequence"> =
    args.envelope.valueGrade === undefined
      ? { ...args.envelope, valueGrade: computedGrade }
      : args.envelope;

  // T0 reject in hard-enforce mode
  if (envelopeWithGrade.valueGrade === "T0") {
    const enforce = process.env.PALANTIR_MINI_VALUE_GRADE_ENFORCE === "1";
    const bypass  = process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS  === "1";
    const t0Msg =
      "rule 26 §Grading: envelope graded T0 (5-dim incomplete). Required: " +
      "when/atopWhich/throughWhich.{sessionId,toolName,cwd}/byWhom.identity.";
    if (enforce && !bypass) {
      throw new Error(`emit_event: ${t0Msg}`);
    }
    process.stderr.write(`[palantir-mini/emit-event T0] ${t0Msg}\n`);
    if (valuableDataAdvisory === undefined) valuableDataAdvisory = t0Msg;
  }

  const eventsPath = path.join(args.project, ".palantir-mini", "session", "events.jsonl");
  const sequence = await appendEventAtomic(eventsPath, envelopeWithGrade);

  return {
    eventId: (envelopeWithGrade as { eventId: string }).eventId,
    sequence,
    eventsPath,
    valueGrade: envelopeWithGrade.valueGrade,
    ...(valuableDataAdvisory !== undefined ? { valuableDataAdvisory } : {}),
  };
}
