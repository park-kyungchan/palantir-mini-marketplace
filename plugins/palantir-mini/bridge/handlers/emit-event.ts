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
import { validateReservedProvenanceType } from "../../lib/event-log/reserved-provenance";
import { isRefinementTarget } from "#schemas/ontology/primitives/refinement-target";
import type { ValueGrade } from "#schemas/ontology/primitives/value-grade";
// P1 unification S3 — the rule-26 T0..T4 auto-grader now lives in the CANONICAL
// schemas package (ontology/lineage/value-grade-grading.ts; single source per
// g12 de-2026-07-11-schemas-authority-ruling-plugin-self-containment-confirmed).
// Re-exported below so the existing importers (scripts/log.ts,
// hooks/value-grade-assigner.ts, tests/governance/rule-26-doc-grading-
// conformance.test.ts) keep resolving it from this module unchanged. The
// grader's `GradeableEnvelope` structural input view is a subset of the runtime
// `Omit<EventEnvelope, "sequence">` shape, so every existing call site
// type-checks without edits.
import { autoGradeEnvelope } from "#schemas/ontology/lineage/value-grade-grading";

export { autoGradeEnvelope };

interface EmitEventArgs {
  project:  string;
  envelope: Omit<EventEnvelope, "sequence">;
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

/**
 * P1-3 / rule 26 §Axis A — `withWhat.reasoning` is a FIRST-CLASS decision-
 * lineage field (the WHY behind the emitted decision), required at the emit
 * boundary for every T1+ (valuable) event. Returns null when the envelope
 * satisfies the requirement, or a human-readable message when a valuable
 * (graded ≥ T1) envelope omits a non-empty `withWhat.reasoning`.
 *
 * Scope (non-breaking):
 *   - T0 envelopes (5-dim incomplete) are NOT checked here — they are already
 *     rejected by the T0 path; piling a reasoning error on top is noise.
 *   - The check ONLY fires for envelopes that would emit as valuable (T1+), so
 *     structural/historical T0 rows are unaffected.
 *   - Default mode is ADVISORY (logged to stderr; emit proceeds). Hard-reject
 *     only under PALANTIR_MINI_REASONING_ENFORCE=1 (bypassable via the shared
 *     PALANTIR_MINI_VALUE_GRADE_BYPASS=1). This mirrors the rule 26 §R5 gate.
 */
export function validateReasoningPresence(
  envelope: Omit<EventEnvelope, "sequence">,
): string | null {
  // Only valuable (T1+) envelopes are required to carry the WHY. T0 (5-dim
  // incomplete) is rejected elsewhere; do not double-report.
  if (autoGradeEnvelope(envelope) === "T0") return null;

  const reasoning = envelope.withWhat?.reasoning;
  if (typeof reasoning === "string" && reasoning.trim().length > 0) return null;

  return (
    "rule 26 §Axis A: T1+ (valuable) envelopes MUST carry a non-empty " +
    "withWhat.reasoning (the WHY behind the emitted decision) — it is a " +
    "first-class decision-lineage field, not an optional pointer. Add " +
    "`reasoning` to the emit() call OR set PALANTIR_MINI_VALUE_GRADE_BYPASS=1 " +
    "to bypass (audited)."
  );
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

  // P1-3 / rule 26 §Axis A — first-class withWhat.reasoning required at the emit
  // boundary for T1+ valuable events. Advisory by default; hard-reject under
  // PALANTIR_MINI_REASONING_ENFORCE=1 (bypassable via the shared bypass env).
  const reasoningViolation = validateReasoningPresence(args.envelope);
  if (reasoningViolation !== null) {
    const enforce = process.env.PALANTIR_MINI_REASONING_ENFORCE === "1";
    const bypass  = process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS  === "1";
    if (enforce && !bypass) {
      throw new Error(`emit_event: ${reasoningViolation}`);
    }
    process.stderr.write(`[palantir-mini/emit-event ADVISORY] ${reasoningViolation}\n`);
    if (valuableDataAdvisory === undefined) valuableDataAdvisory = reasoningViolation;
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
