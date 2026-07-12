// palantir-mini PR-13 — Hook enforcement level
//   enforcement: blocking
//   rationale:   decision=block in hooks.json; rejects T0 event envelopes missing 5-dim fields before emit_event MCP call proceeds.
// palantir-mini v4.12.0 — value-grade-assigner hook (rule 26 §Auto-grade)
// Fires on: PreToolUse with matcher for emit_event MCP tool names.
// Claude plugin runtime historically exposed:
//   mcp__plugin_palantir-mini_palantir-mini__emit_event
// Codex MCP currently exposes:
//   mcp__palantir_mini__.emit_event
//
// Per rule 26 §Auto-grade + §R5 (Reject-at-emit):
//   1. Parse tool_input.envelope.
//   2. Recursion guard: skip envelopes with payload.errorClass === "value_grade_assignment_completed"
//      OR payload.metaEvent === true so the instrumentation meta-event never
//      re-triggers this hook.
//   3. Compute valueGrade T0..T4 via autoGradeEnvelope() (re-used from
//      bridge/handlers/emit-event.ts to keep grading logic single-sourced),
//      AFTER applying axis-E softening (infer memoryLayers from byWhom.agent
//      when the field is missing/empty — sprint-059 W1.5 B5 fix).
//   4. T0 envelopes → BLOCK at MCP boundary BEFORE the handler runs (cleaner
//      reject path than the existing handler-level stderr advisory + envvar
//      throw; also surfaces the failure earlier in the audit trail).
//   5. validation_phase_completed.passed=false envelopes missing
//      withWhat.refinementTarget → BLOCK in hard-enforce mode (rule 26 §R5).
//   6. T1..T4 → continue (handler still runs autoGradeEnvelope as the
//      authoritative grade — this hook is a strict superset enforcer).
//   7. Emit instrumentation meta-event (valueGrade_assignment_completed) for
//      EVERY invocation. Payload includes originalEnvelopeId, assignedTier,
//      axesScored (all 14 criteria A1-A3/B1-B3/C1-C3/D1-D3/E1-E4 → boolean),
//      axesNotApplicable[], and byWhom.identity propagated from the original
//      envelope. payload.metaEvent=true marks it so recursion guard fires.
//   8. Coverage instrumentation: per-session counter of (1) total emit_event
//      invocations seen + (2) meta-events emitted. Ratio surfaces coverage gap
//      in pm_value_grade_metrics MCP via invocationCoverage field.
//   9. Auto-inject propagationDepth (rule 10 v2.1.0 §propagationDepth) when
//      absent — derived from emitter identity + refinementTarget.kind to
//      classify the ForwardProp chain layer (sprint-059 W2.6 R2-F5 Major).
//      Hook signals the inferred depth via additionalContext; it cannot mutate
//      tool_input at runtime, but the value is available to BackProp auditors.
//  10. Per-class metric extraction (sprint-060 W3 R1-F11): emits a sibling
//      valueGrade_class_metric event every CLASS_METRIC_EMIT_INTERVAL invocations
//      (default=50) for time-series grading visibility. Each event carries
//      per-axis-class counts (passA, passB, passC, passD, passE) and totals.
//      Substrate routing annotation (sprint-060 W3 R1-F12): additionalContext
//      and meta-event payload include explicit tier-routing annotation so
//      BackProp auditors know which substrate path was applied.
//
// Bypass:
//   PALANTIR_MINI_VALUE_GRADE_BYPASS=1 — disables block; advisory only.
//   PALANTIR_MINI_VALUE_GRADE_ENFORCE=1 — flips R5 advisory to block.
//   PALANTIR_MINI_VALUE_GRADE_AXIS_RELAX=1 — softens axis E for routine events
//     that omit memoryLayers by inferring a default (["procedural"]) rather
//     than treating the absence as a T1 ceiling. Audited via emit().
//   All env vars audited via emit().
//
// Authority: ~/.claude/rules/26-valuable-data-standard.md §Auto-grade + §R5
//            ~/.claude/rules/10-events-jsonl.md §propagationDepth
//            ~/.claude/plans/quiet-fluttering-garden.md §Phase 2.1
//            ~/.claude/plans/nifty-mixing-diffie.md §Phase 2
//            sprint-059 W1.5 (B5 blocker: axis-E softening + instrumentation)
//            sprint-059 W2.6 (R2-F5 Major: propagationDepth auto-inject)
//            sprint-060 W1.9 (P1.E1/M24/H.5: 14-criteria meta-event + coverage counter)
//            sprint-060 W3 R1-F11/F12 (per-class metric extraction + substrate routing annotation)

import { emit } from "../scripts/log";
import { emitSkillSuggestion } from "../lib/skill-suggestion-emit";
import {
  autoGradeEnvelope,
  validateRule26R5,
  validateReasoningPresence,
} from "../bridge/handlers/emit-event";
import { normalizePalantirMiniMcpToolName } from "../lib/hooks/tool-classifier";
import type { EventEnvelope } from "../lib/event-log/types";
import type { AgenticMemoryLayer } from "#schemas/ontology/primitives/agentic-memory-layer";
import type { ValueGrade } from "#schemas/ontology/primitives/value-grade";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    project?: string;
    envelope?: Omit<EventEnvelope, "sequence">;
  };
}

interface HookResult {
  message:   string;
  decision?: "block";
  reason?:   string;
  hookSpecificOutput?: {
    permissionDecision?:       "deny" | "allow";
    permissionDecisionReason?: string;
    additionalContext?:        string;
  };
}

const EMIT_EVENT_TOOL = "emit_event";

// ─── Recursion guard constant ───────────────────────────────────────────────
// The instrumentation meta-event uses:
//   errorClass: "value_grade_assignment_completed"   (legacy field match)
//   payload.metaEvent: true                          (new explicit flag)
// Either check is sufficient to prevent infinite recursion.
const META_ERROR_CLASS = "value_grade_assignment_completed";

// ─── 14-criteria axes type (sprint-060 W1.9) ────────────────────────────────
// Rule 26 §5-Axes 14-Criteria: A1/A2/A3 + B1/B2/B3 + C1/C2/C3 + D1/D2/D3 + E1/E2/E3/E4
export interface AxesScored14 {
  // Axis A — Contractual (rule 10)
  A1: boolean; // 5-dim full (when/atopWhich/throughWhich/byWhom)
  A2: boolean; // propagationDepth present
  A3: boolean; // evidence-cited (lineageRefs present)
  // Axis B — Verifiable (DC5-02 #2 + AIP Evals)
  B1: boolean; // outcome-paired (lineageRefs.outcomePairId or equivalent)
  B2: boolean; // rubric-measurable (payload has a grading field)
  B3: boolean; // hypothesis-bearing (withWhat.hypothesis present)
  // Axis C — Refining (LEARN_MECHANISMS)
  C1: boolean; // LEARN-mapped (envelope type maps to a LEARN mechanism)
  C2: boolean; // refinement target typed (withWhat.refinementTarget present)
  C3: boolean; // failure-categorizable (payload.failureCategory present)
  // Axis D — Shareable (LLMI-02 + A3 Embedded Ontology)
  D1: boolean; // provider-neutral (byWhom has no vendor-lock fields)
  D2: boolean; // K-LLM consensus (payload.kLlmConsensus present)
  D3: boolean; // edge-compatible (no cloud-only dependencies in payload)
  // Axis E — Memory-mapped (A1 2026-04-29)
  E1: boolean; // working memory layer declared
  E2: boolean; // episodic memory layer declared
  E3: boolean; // semantic memory layer declared
  E4: boolean; // procedural memory layer declared
}

// ─── Coverage counter (sprint-060 W1.9) ─────────────────────────────────────
// Module-level counters track per-process invocations vs meta-events emitted.
// These are reset on process restart (hook processes are ephemeral). Surfaces in
// pm_value_grade_metrics via PALANTIR_MINI_COVERAGE_FILE env var when set.
let _totalInvocationsSeen = 0;
let _metaEventsEmitted = 0;

/** Returns the current coverage counters for external inspection (e.g. tests). */
export function getCoverageCounters(): { totalInvocationsSeen: number; metaEventsEmitted: number } {
  return { totalInvocationsSeen: _totalInvocationsSeen, metaEventsEmitted: _metaEventsEmitted };
}

/** Resets coverage counters — for test isolation only. */
export function resetCoverageCounters(): void {
  _totalInvocationsSeen = 0;
  _metaEventsEmitted = 0;
}

// ─── Per-class metric extraction (sprint-060 W3 R1-F11) ─────────────────────
// Every CLASS_METRIC_EMIT_INTERVAL invocations, emit a valueGrade_class_metric
// sibling event with per-axis-class pass counts for time-series grading
// visibility. This enables dashboards and BackProp auditors to track axis
// health trends across multiple sessions.
//
// Architecture review §3.4: "per-class metric extraction sibling event types
// after migration window" — these events are emitted alongside normal
// instrumentation so they do not replace existing flow, only supplement it.
const CLASS_METRIC_EMIT_INTERVAL = 50;

/** Per-class accumulator (module-level, reset on process restart). */
let _classMetrics: {
  passA: number; passB: number; passC: number; passD: number; passE: number;
  totalSamples: number;
} = { passA: 0, passB: 0, passC: 0, passD: 0, passE: 0, totalSamples: 0 };

/** Accumulate one scored axes result into the per-class metrics. */
export function accumulateClassMetrics(axes: AxesScored14): void {
  _classMetrics.totalSamples += 1;
  // Axis A (A1+A2+A3): count as pass if A1 is true (core 5-dim requirement)
  if (axes.A1) _classMetrics.passA += 1;
  // Axis B (B1+B2+B3): count as pass if any B criterion is true
  if (axes.B1 || axes.B2 || axes.B3) _classMetrics.passB += 1;
  // Axis C (C1+C2+C3): count as pass if any C criterion is true
  if (axes.C1 || axes.C2 || axes.C3) _classMetrics.passC += 1;
  // Axis D (D1+D2+D3): count as pass if D1 (provider-neutral) is true
  if (axes.D1) _classMetrics.passD += 1;
  // Axis E (E1+E2+E3+E4): count as pass if any E criterion is true
  if (axes.E1 || axes.E2 || axes.E3 || axes.E4) _classMetrics.passE += 1;
}

/** Returns a snapshot of the per-class metrics (for tests and dashboards). */
export function getClassMetrics(): typeof _classMetrics {
  return { ..._classMetrics };
}

/** Resets class metrics — for test isolation only. */
export function resetClassMetrics(): void {
  _classMetrics = { passA: 0, passB: 0, passC: 0, passD: 0, passE: 0, totalSamples: 0 };
}

/**
 * Emit a valueGrade_class_metric event if the interval threshold is reached.
 * Best-effort fire-and-forget. The event is marked metaEvent=true to prevent
 * recursion, same as the instrumentation meta-event.
 */
function maybeEmitClassMetric(cwd: string, sessionId?: string): void {
  if (_classMetrics.totalSamples > 0 && _classMetrics.totalSamples % CLASS_METRIC_EMIT_INTERVAL === 0) {
    const snapshot = getClassMetrics();
    void emit({
      type: "validation_phase_completed",
      payload: {
        phase:        "design",
        passed:       true,
        errorClass:   "valueGrade_class_metric",
        metaEvent:    true,
        // ─── Per-class pass counts ─────────────────────────────────────────
        passRateA:    snapshot.passA / snapshot.totalSamples,
        passRateB:    snapshot.passB / snapshot.totalSamples,
        passRateC:    snapshot.passC / snapshot.totalSamples,
        passRateD:    snapshot.passD / snapshot.totalSamples,
        passRateE:    snapshot.passE / snapshot.totalSamples,
        // ─── Raw counts ───────────────────────────────────────────────────
        rawPassA:     snapshot.passA,
        rawPassB:     snapshot.passB,
        rawPassC:     snapshot.passC,
        rawPassD:     snapshot.passD,
        rawPassE:     snapshot.passE,
        totalSamples: snapshot.totalSamples,
        interval:     CLASS_METRIC_EMIT_INTERVAL,
      } as Record<string, unknown>,
      toolName:     "PreToolUse",
      cwd,
      sessionId,
      identity:     "monitor",
      memoryLayers: ["episodic"],
      reasoning:    `value-grade-assigner per-class metrics at ${snapshot.totalSamples} samples (sprint-060 W3 R1-F11)`,
    }).catch(() => {});
  }
}

// ─── Substrate routing annotation (sprint-060 W3 R1-F12) ────────────────────
// Maps T0-T4 tier to the target substrate path so auditors can confirm the
// correct write path was applied. Each tier corresponds to a substrate action
// described in rule 26 §Substrate routing.
const SUBSTRATE_ROUTING_MAP: Record<string, string> = {
  T0: "T0 → archive 7d then delete (rule 26 §Substrate routing)",
  T1: "T1 → events.jsonl (Workflow Lineage only)",
  T2: "T2 → events.jsonl + outcomes.jsonl pair pending",
  T3: "T3 → events.jsonl + decisions/ subdir (BackProp input)",
  T4: "T4 → events.jsonl + shared-core/promotions/ candidate",
};

/** Returns a human-readable routing annotation for the given tier. */
export function substrateRoutingAnnotation(tier: string): string {
  return SUBSTRATE_ROUTING_MAP[tier] ?? `${tier} → unknown tier (check rule 26)`;
}

// ─── Axis E softening (sprint-059 W1.5 B5 fix) ─────────────────────────────
// Rule 26 §Axis E: ≥1 of 4 agentic memory layers must be declared. When an
// emitter omits withWhat.memoryLayers, infer a default from context so the
// envelope reaches T1+ rather than being permanently stuck below T1.
//
// Inference rules (in priority order):
//   1. Envelope already has non-empty memoryLayers → keep as-is (caller wins).
//   2. byWhom.agentName contains "sprint" → ["episodic"] (sprint-bound emit).
//   3. Any agent emit (byWhom.agentName present) → ["procedural"].
//   4. Fallback for all other emitters → ["procedural"] (safe default;
//      every tool invocation refines procedural memory at minimum).
//
// The inferred layers are ONLY injected into a local copy of the envelope for
// grading purposes. The hook cannot mutate tool_input at runtime; the
// authoritative grade is computed by the handler after this hook exits.
// However, the hook signals the softened grade via additionalContext so that
// future BackProp audits can detect how often inference was needed.
function inferMemoryLayers(
  envelope: Omit<EventEnvelope, "sequence">,
): readonly AgenticMemoryLayer[] {
  const existing = envelope.withWhat?.memoryLayers;
  if (existing && existing.length > 0) return existing;

  const agentName = (envelope.byWhom as { agentName?: string }).agentName ?? "";
  if (agentName.toLowerCase().includes("sprint")) {
    return ["episodic"];
  }
  if (agentName.length > 0) {
    return ["procedural"];
  }
  // Fallback: every emit contributes to procedural memory.
  return ["procedural"];
}

// ─── propagationDepth inference (sprint-059 W2.6 R2-F5 Major) ──────────────
// Rule 10 v2.2.0 §propagationDepth: optional integer indicating depth in the
// ForwardProp/BackwardProp chain. CANONICAL 0-4 SCALE (5 layers — XRUN-2):
//   0=research/schemas, 1=shared-core, 2=project-ontology, 3=contracts/hooks,
//   4=runtime/src. (Reconciled from the prior divergent 0-5 / 6-layer code.)
// The single source of the scale is propagation-audit.ts (PropagationDepth +
// MIN/MAX_PROPAGATION_DEPTH). With only 0.7% field adoption (15/2196 events),
// every backward audit falls through to brittle regex heuristics. This function
// auto-derives the depth from emitter identity so every future envelope carries
// the field automatically.
//
// Mapping (in priority order):
//   1. Envelope already has numeric propagationDepth → keep as-is (caller wins).
//   2. agent === "monitor" | "monitor-async" → 4 (runtime layer; hook/monitor emit).
//   3. agent === "claude-code" | "claude-opus-*" → refine by refinementTarget.kind:
//        "schema-primitive"        → 0  (research/schema layer)
//        "shared-core-binding"     → 1  (shared-core layer)
//        "rule-conformance-policy" → 3  (contracts/hooks layer)
//        (default)                 → 3  (contracts/hooks layer — most common)
//   4. Fallback → 3 (safe default; contracts/hooks layer is the most frequent
//      origin for tool-invocation events).
//
// The hook cannot mutate tool_input at runtime (PreToolUse hooks receive a
// read-only snapshot of the pending tool call). The inferred depth is returned
// and surfaced in additionalContext so BackProp auditors can pick it up at read
// time without requiring a second emit. Future harness iterations may propagate
// this value into the persisted row once Claude runtime exposes write-back.
function inferPropagationDepth(
  envelope: Omit<EventEnvelope, "sequence">,
): number {
  // Rule: caller-supplied value always wins.
  if (typeof (envelope as { propagationDepth?: unknown }).propagationDepth === "number") {
    return (envelope as { propagationDepth: number }).propagationDepth;
  }

  const byWhomRaw = (envelope.byWhom ?? {}) as Record<string, unknown>;
  const agent = (byWhomRaw.agent ?? byWhomRaw.agentName ?? "") as string;
  const identity = (byWhomRaw.identity ?? "") as string;

  // Monitor/hook emitters live at the runtime layer (depth 4 on the 0-4 scale).
  if (agent === "monitor" || agent === "monitor-async" || identity === "monitor") {
    return 4;
  }

  // Lead / subagent emitters — refine by refinementTarget.kind if present.
  if (
    agent === "claude-code" ||
    agent.startsWith("claude-opus") ||
    identity === "claude-code" ||
    identity === "codex"
  ) {
    const target = (envelope.withWhat as { refinementTarget?: { kind?: string } } | undefined)
      ?.refinementTarget;
    if (target?.kind === "schema-primitive") return 0;      // research/schema layer
    if (target?.kind === "shared-core-binding") return 1;   // shared-core layer
    if (target?.kind === "rule-conformance-policy") return 3; // contracts/hooks layer
    return 3; // default to contracts/hooks layer (most common Lead/subagent emit)
  }

  // Safe fallback — contracts/hooks layer.
  return 3;
}

// ─── 14-criteria axis scorer (sprint-060 W1.9) ──────────────────────────────
// Computes the per-criterion pass/fail for all 14 criteria described in rule 26
// §5-Axes 14-Criteria. The softenedEnvelope is used for E-axis scoring (so
// inferred memoryLayers are counted); rawEnvelope is used for propagationDepth.
// Returns `axesScored` (AxesScored14) + `axesNotApplicable` (list of N/A IDs).
function computeAxes14(
  softenedEnvelope: Omit<EventEnvelope, "sequence">,
  rawEnvelope: Omit<EventEnvelope, "sequence">,
): { axesScored: AxesScored14; axesNotApplicable: string[] } {
  const raw = rawEnvelope as unknown as Record<string, unknown>;
  const soft = softenedEnvelope as unknown as Record<string, unknown>;
  const throughWhich = (raw.throughWhich ?? {}) as Record<string, unknown>;
  const byWhom       = (raw.byWhom       ?? {}) as Record<string, unknown>;
  const withWhat     = (soft.withWhat    ?? {}) as Record<string, unknown>;
  const rawPayload   = (raw.payload      ?? {}) as Record<string, unknown>;
  const memoryLayers = (withWhat.memoryLayers ?? []) as string[];

  // ─── Axis A — Contractual (rule 10) ────────────────────────────────────
  const A1 = Boolean(
    raw.when && raw.atopWhich &&
    throughWhich.sessionId && throughWhich.toolName && throughWhich.cwd &&
    byWhom.identity,
  );
  const A2 = typeof (raw.propagationDepth) === "number";
  const A3 = Boolean(
    (raw.lineageRefs as Record<string, unknown> | undefined) !== undefined &&
    Object.keys((raw.lineageRefs as Record<string, unknown> | undefined) ?? {}).length > 0,
  );

  // ─── Axis B — Verifiable ────────────────────────────────────────────────
  // B1: outcome-paired (lineageRefs.outcomePairId present)
  const lineageRefsObj = (raw.lineageRefs ?? {}) as Record<string, unknown>;
  const B1 = Boolean(lineageRefsObj.outcomePairId);
  // B2: rubric-measurable (payload has a scoring/rubric field or grading results)
  const B2 = Boolean(
    rawPayload.rubricId !== undefined ||
    rawPayload.overallScore !== undefined ||
    rawPayload.perCriterionScore !== undefined,
  );
  // B3: hypothesis-bearing (withWhat.hypothesis present)
  const B3 = Boolean(withWhat.hypothesis);

  // ─── Axis C — Refining ──────────────────────────────────────────────────
  // C1: LEARN-mapped (type matches a known LEARN mechanism or is an explicit learn type)
  const learnTypes = new Set([
    "refinement_applied", "validation_phase_completed", "grading_completed",
    "edit_committed", "sprint_contract_bound", "agent_decision_logged",
    // v1.92 — second-brain memory-fold governed events (P0.4r): C1 LEARN-mapped (diagnostic axis only).
    // NOTE: C1 feeds computeAxes14's axesScored (instrumentation meta-event) ONLY; it does NOT set the
    // tier. The authoritative grader is autoGradeEnvelope (bridge/handlers/emit-event.ts), which grades on
    // FIELD PRESENCE: a complete envelope of these types grades T1 (emittable), reaching T3 only when the
    // emitter supplies the memory/lineage + refinement axis fields. LEARN-mapping here does not force T3.
    "resolution_verdict", "memory_fold_committed",
  ]);
  const C1 = learnTypes.has((raw.type ?? "") as string);
  // C2: refinement target typed (withWhat.refinementTarget present)
  const C2 = Boolean(withWhat.refinementTarget !== undefined);
  // C3: failure-categorizable (payload.failureCategory present)
  const C3 = Boolean(rawPayload.failureCategory !== undefined);

  // ─── Axis D — Shareable ─────────────────────────────────────────────────
  // D1: provider-neutral (byWhom lacks vendor-lock fields like 'claudeVersion' without 'model')
  // Heuristic: provider-neutral if byWhom.identity is one of the agnostic values
  const neutralIdentities = new Set(["claude-code", "codex", "gemini", "user", "monitor", "test-agent"]);
  const D1 = neutralIdentities.has((byWhom.identity ?? "") as string);
  // D2: K-LLM consensus (payload.kLlmConsensus present)
  const D2 = Boolean(rawPayload.kLlmConsensus !== undefined);
  // D3: edge-compatible (no cloud-only required fields; heuristic: no 'cloudRegion' in payload)
  const D3 = Boolean(rawPayload.cloudRegion === undefined);

  // ─── Axis E — Memory-mapped ─────────────────────────────────────────────
  const E1 = memoryLayers.includes("working");
  const E2 = memoryLayers.includes("episodic");
  const E3 = memoryLayers.includes("semantic");
  const E4 = memoryLayers.includes("procedural");

  // ─── N/A criteria (axes that are not applicable for this envelope type) ──
  const axesNotApplicable: string[] = [];
  // B2 (rubric-measurable) only applies to grading_completed / validation_phase_completed envelopes
  const gradingTypes = new Set(["grading_completed", "validation_phase_completed"]);
  if (!gradingTypes.has((raw.type ?? "") as string)) {
    axesNotApplicable.push("B2");
  }
  // C3 (failure-categorizable): N/A when envelope type does not represent a failure and
  // payload.passed is not explicitly false and payload.failureCategory is absent.
  const isFailureEnvelope =
    ((raw.type as string) ?? "").toLowerCase().includes("fail") ||
    rawPayload.passed === false ||
    rawPayload.failureCategory !== undefined;
  if (!isFailureEnvelope) {
    axesNotApplicable.push("C3");
  }

  return {
    axesScored: { A1, A2, A3, B1, B2, B3, C1, C2, C3, D1, D2, D3, E1, E2, E3, E4 },
    axesNotApplicable,
  };
}

// ─── Instrumentation helper (sprint-060 W1.9 expanded) ──────────────────────
// Emit the valueGrade_assignment_completed meta-event for EVERY hook invocation
// (T0, T1, T2, T3, T4, bypass, guard-triggered). Payload captures all 14-criteria
// axesScored + axesNotApplicable + byWhom.identity from original envelope for
// coverage gap analysis. Uses best-effort fire-and-forget (never throws).
//
// The meta-event is marked payload.metaEvent=true + errorClass=META_ERROR_CLASS
// so the recursion guard fires on re-entry.
function emitInstrumentationEvent(opts: {
  cwd:                  string;
  sessionId?:           string;
  originalEnvelopeId?:  string;
  assignedTier:         ValueGrade | "bypassed" | "guarded";
  axesScored:           AxesScored14;
  axesNotApplicable:    string[];
  originalIdentity?:    string;
  rejectedReason?:      string;
}): void {
  _metaEventsEmitted += 1;
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase:      "design",
      passed:     opts.assignedTier !== "T0",
      errorClass: META_ERROR_CLASS,
      // Recursion guard flag — prevents infinite loop when hook sees this event
      metaEvent:  true,
      // ─── Extended payload fields for audit (rule 10 allows extra keys) ─────
      originalEnvelopeId:  opts.originalEnvelopeId,
      assignedTier:        opts.assignedTier,
      axesScored:          opts.axesScored,
      axesNotApplicable:   opts.axesNotApplicable,
      originalIdentity:    opts.originalIdentity,
      // ─── R1-F12: Explicit substrate routing annotation (sprint-060 W3) ──────
      substrateRouting:    substrateRoutingAnnotation(String(opts.assignedTier)),
      coverageCounters: {
        totalInvocationsSeen: _totalInvocationsSeen,
        metaEventsEmitted:    _metaEventsEmitted,
      },
      ...(opts.rejectedReason !== undefined
        ? { rejectedReason: opts.rejectedReason }
        : {}),
    } as Record<string, unknown>,
    toolName:     "PreToolUse",
    cwd:          opts.cwd,
    sessionId:    opts.sessionId,
    identity:     "monitor",
    memoryLayers: ["procedural"],
    reasoning:    `value-grade-assigner instrumentation: tier=${opts.assignedTier}`,
  }).catch(() => {});
}

export default async function valueGradeAssigner(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "";

  // Only intercept emit_event MCP. Other tools pass through.
  if (normalizePalantirMiniMcpToolName(toolName) !== EMIT_EVENT_TOOL) {
    return {
      message: `palantir-mini: value-grade-assigner skipped (tool=${toolName})`,
    };
  }

  // ─── Coverage counter: increment on every emit_event interception ──────────
  _totalInvocationsSeen += 1;

  // Bypass via env var (audited per rule 26 §R5).
  // Uses validation_phase_completed with errorClass="value_grade_bypass_invoked"
  // so the event type matches the registered EventEnvelope discriminated union.
  if (process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS === "1") {
    void emit({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: true,
        errorClass: "value_grade_bypass_invoked",
        bypassEnvVar: "PALANTIR_MINI_VALUE_GRADE_BYPASS",
        bypassedTool: toolName,
        envelopeId: (p.tool_input?.envelope as { eventId?: string } | undefined)?.eventId,
        envelopeType: (p.tool_input?.envelope as { type?: string } | undefined)?.type,
      } as Record<string, unknown>,
      toolName: "PreToolUse",
      cwd,
      sessionId: p.session_id,
      identity: "monitor",
      memoryLayers: ["procedural"],
      reasoning: "value-grade-assigner: T0 block bypassed via PALANTIR_MINI_VALUE_GRADE_BYPASS=1 (audited)",
    }).catch(() => {});
    return {
      message: "palantir-mini: value-grade-assigner BYPASS (env)",
    };
  }

  const envelope = p.tool_input?.envelope;
  if (!envelope || typeof envelope !== "object") {
    // Malformed payload — let it through; handler will reject cleanly.
    return {
      message: "palantir-mini: value-grade-assigner skipped (no envelope)",
    };
  }

  // ─── Recursion guard (sprint-059 W1.5 + sprint-060 W1.9 enhanced) ──────────
  // The instrumentation meta-event carries both:
  //   payload.errorClass === "value_grade_assignment_completed"  (legacy field)
  //   payload.metaEvent === true                                 (new explicit flag)
  // Either check is sufficient. We check both for belt-and-suspenders safety.
  const envelopePayload = (envelope as { payload?: Record<string, unknown> }).payload ?? {};
  if (envelopePayload.errorClass === META_ERROR_CLASS || envelopePayload.metaEvent === true) {
    return {
      message: "palantir-mini: value-grade-assigner skipped (recursion guard)",
    };
  }

  // ─── Step 1: rule 26 §R5 — validation_phase_completed.passed=false MUST carry refinementTarget
  const r5Violation = validateRule26R5(envelope);
  const enforceMode = process.env.PALANTIR_MINI_VALUE_GRADE_ENFORCE === "1";

  // ─── Step 2: Axis E softening ───────────────────────────────────────────────
  // PALANTIR_MINI_VALUE_GRADE_AXIS_RELAX=1 (sprint-060 W1.9) enables softened
  // axis-E behavior: infer ["procedural"] default when memoryLayers is missing.
  // This is ADDITIVE on top of the existing sprint-059 W1.5 inference logic —
  // the relax flag only controls whether axis-E absence is audited as a gap.
  // The inference itself was already present in all paths.
  //
  // Without the relax flag: inference still happens (backward-compat with W1.5),
  // and the gap is reported in additionalContext. With the flag: the advisory is
  // suppressed and the inferred value is treated as authoritative. Audited.
  const axisRelaxMode = process.env.PALANTIR_MINI_VALUE_GRADE_AXIS_RELAX === "1";
  if (axisRelaxMode) {
    // Audit the first relaxed invocation per process (best-effort; no-op if emit fails).
    void emit({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: true,
        errorClass: "value_grade_axis_relax_invoked",
        bypassEnvVar: "PALANTIR_MINI_VALUE_GRADE_AXIS_RELAX",
        bypassedTool: toolName,
        envelopeId: (envelope as { eventId?: string }).eventId,
      } as Record<string, unknown>,
      toolName: "PreToolUse",
      cwd,
      sessionId: p.session_id,
      identity: "monitor",
      memoryLayers: ["procedural"],
      reasoning: "value-grade-assigner: axis-E relaxed via PALANTIR_MINI_VALUE_GRADE_AXIS_RELAX=1 (audited)",
    }).catch(() => {});
  }

  if (r5Violation !== null && enforceMode) {
    const axes14R5 = computeAxes14(envelope, envelope);
    emitInstrumentationEvent({
      cwd,
      sessionId:           p.session_id,
      originalEnvelopeId:  (envelope as { eventId?: string }).eventId,
      assignedTier:        "T0",
      axesScored:          axes14R5.axesScored,
      axesNotApplicable:   axes14R5.axesNotApplicable,
      originalIdentity:    (envelope as { byWhom?: { identity?: string } }).byWhom?.identity,
      rejectedReason:      "rule-26-r5-violation",
    });
    return blockReason(p, "rule-26-r5-violation", r5Violation);
  }

  // ─── Step 3: Axis E softening (sprint-059 W1.5 B5 fix + sprint-060 W1.9 RELAX)
  // If withWhat.memoryLayers is missing or empty, infer from byWhom.agentName.
  // We build a softened copy of the envelope for grading only; the hook cannot
  // mutate tool_input at runtime (the handler's autoGradeEnvelope is authoritative
  // for the persisted grade). The softened grade is communicated via additionalContext.
  const inferredLayers = inferMemoryLayers(envelope);
  const needsInference =
    !envelope.withWhat?.memoryLayers || envelope.withWhat.memoryLayers.length === 0;
  const softenedEnvelope: Omit<EventEnvelope, "sequence"> = needsInference
    ? {
        ...envelope,
        withWhat: {
          ...(envelope.withWhat ?? {}),
          memoryLayers: inferredLayers,
        },
      } as Omit<EventEnvelope, "sequence">
    : envelope as Omit<EventEnvelope, "sequence">;

  // ─── Step 4: Compute valueGrade (on softened envelope)
  const grade = autoGradeEnvelope(softenedEnvelope);

  // ─── Step 4b: propagationDepth inference (sprint-059 W2.6) ────────────────
  // Derive depth from emitter identity. Hook cannot mutate tool_input (PreToolUse
  // receives a read-only snapshot); depth is surfaced via additionalContext so
  // BackProp auditors can read it at query time without requiring a second emit.
  const envelopeHasDepth = typeof (envelope as { propagationDepth?: unknown }).propagationDepth === "number";
  const inferredDepth = inferPropagationDepth(envelope);

  // ─── Step 5: Compute all 14 axis criteria (sprint-060 W1.9) ────────────────
  const axes14 = computeAxes14(softenedEnvelope, envelope);

  // ─── Step 5b: Accumulate per-class metrics (sprint-060 W3 R1-F11) ───────────
  accumulateClassMetrics(axes14.axesScored);
  maybeEmitClassMetric(cwd, p.session_id);

  // ─── Step 6: T0 reject (always — even without enforce mode)
  if (grade === "T0") {
    const t0Msg =
      "rule 26 §Grading: envelope graded T0 (5-dim incomplete). Required: " +
      "when / atopWhich / throughWhich.{sessionId,toolName,cwd} / byWhom.identity. " +
      "Add the missing dimensions before emit, OR set PALANTIR_MINI_VALUE_GRADE_BYPASS=1 (audited) for emergency.";
    // W1.8 — persist suggestion as 5-dim event (rule 26 §Definition closure; Agent #3 audit gap)
    await emitSkillSuggestion({
      suggestedSkillSlug: "pm-value-audit",
      suggestedByHook:    "value-grade-assigner",
      triggerCondition:   `T0 envelope rejected (type=${envelope.type ?? "unknown"})`,
      suggestionContext:  (envelope as { eventId?: string }).eventId,
      memoryLayers:       ["procedural", "semantic"],
    });
    emitInstrumentationEvent({
      cwd,
      sessionId:           p.session_id,
      originalEnvelopeId:  (envelope as { eventId?: string }).eventId,
      assignedTier:        "T0",
      axesScored:          axes14.axesScored,
      axesNotApplicable:   axes14.axesNotApplicable,
      originalIdentity:    (envelope as { byWhom?: { identity?: string } }).byWhom?.identity,
      rejectedReason:      "rule-26-t0-rejected",
    });
    return blockReason(p, "rule-26-t0-rejected", t0Msg);
  }

  // ─── Step 7 removed (W3a): rule 26 v2.0.0 dropped K≥2 multi-vendor consensus,
  // so the T3 → T4 consensus promotion no longer applies. effectiveGrade follows grade.
  const effectiveGrade = grade;

  // ─── Step 7b (P1-3): first-class withWhat.reasoning required at emit for T1+
  // valuable events. We are past the T0 reject, so this only fires for valuable
  // envelopes. Advisory by default (surfaced in additionalContext); BLOCK under
  // PALANTIR_MINI_REASONING_ENFORCE=1 (bypass env already short-circuits above).
  const reasoningViolation = validateReasoningPresence(envelope);
  const reasoningEnforce = process.env.PALANTIR_MINI_REASONING_ENFORCE === "1";
  if (reasoningViolation !== null && reasoningEnforce) {
    emitInstrumentationEvent({
      cwd,
      sessionId:           p.session_id,
      originalEnvelopeId:  (envelope as { eventId?: string }).eventId,
      assignedTier:        effectiveGrade,
      axesScored:          axes14.axesScored,
      axesNotApplicable:   axes14.axesNotApplicable,
      originalIdentity:    (envelope as { byWhom?: { identity?: string } }).byWhom?.identity,
      rejectedReason:      "rule-26-reasoning-missing",
    });
    return blockReason(p, "rule-26-reasoning-missing", reasoningViolation);
  }

  // ─── Step 8: Instrumentation meta-event (EVERY T1..T4 path, sprint-060 W1.9)
  emitInstrumentationEvent({
    cwd,
    sessionId:           p.session_id,
    originalEnvelopeId:  (envelope as { eventId?: string }).eventId,
    assignedTier:        effectiveGrade,
    axesScored:          axes14.axesScored,
    axesNotApplicable:   axes14.axesNotApplicable,
    originalIdentity:    (envelope as { byWhom?: { identity?: string } }).byWhom?.identity,
    ...(needsInference ? { rejectedReason: `axis-E inferred layers=[${inferredLayers.join(",")}]` } : {}),
  });

  // ─── Step 9: T1..T4 continue (informational logging via additionalContext)
  const depthContext = envelopeHasDepth
    ? `propagationDepth=${(envelope as { propagationDepth: number }).propagationDepth} (caller-supplied)`
    : `propagationDepth=${inferredDepth} (inferred from byWhom.identity)`;

  const axisRelaxNote = axisRelaxMode && needsInference
    ? ` (axis-E RELAXED: [${inferredLayers.join(",")}])`
    : needsInference ? ` (axis-E inferred: [${inferredLayers.join(",")}])` : "";

  // ─── R1-F12: Explicit substrate routing annotation (sprint-060 W3) ──────────
  const routingNote = substrateRoutingAnnotation(effectiveGrade);

  // P1-3: advisory note when a T1+ envelope omits first-class withWhat.reasoning
  // (non-enforce path — emit proceeds; the gap is surfaced for BackProp audit).
  const reasoningNote = reasoningViolation !== null ? ` (reasoning advisory: missing withWhat.reasoning)` : "";

  return {
    message: `palantir-mini: value-grade-assigner OK (grade=${effectiveGrade})`,
    hookSpecificOutput: {
      permissionDecision: "allow",
      additionalContext: `[rule 26] envelope grade=${effectiveGrade}${axisRelaxNote}${
        r5Violation !== null ? ` (R5 advisory: ${r5Violation})` : ""
      }${reasoningNote} routing=${routingNote} [rule 10] ${depthContext}`,
    },
  };
}

/** Build a block result with structured permission decision. */
function blockReason(
  p: HookPayload,
  errorClass: string,
  hint: string,
): HookResult {
  const reason = [
    `palantir-mini value-grade-assigner BLOCK`,
    `Cause: ${errorClass}`,
    ``,
    `Rule 26 §Auto-grade + §R5 — every envelope is auto-graded T0-T4 across 5 axes; T0 (5-dim incomplete) rejected at emit.`,
    ``,
    hint,
    ``,
    `Bypass for emergency: PALANTIR_MINI_VALUE_GRADE_BYPASS=1 (audited).`,
    `For full text: pm_rule_query({ byId: 26 })`,
  ].join("\n");

  process.stderr.write(`[palantir-mini/value-grade-assigner] ${reason}\n`);

  // best-effort emit
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase: "design",
      passed: false,
      errorClass,
    },
    toolName: "PreToolUse",
    cwd: p.cwd ?? process.cwd(),
    sessionId: p.session_id,
    identity: "monitor",
    memoryLayers: ["procedural"],
    refinementTarget: {
      kind: "rule-conformance-policy",
      filePathOrRid: "rule 26 §Auto-grade",
      description: `value-grade-assigner blocked envelope: ${errorClass}`,
      confidenceLevel: "high",
    },
    reasoning: `value-grade-assigner BLOCK: ${errorClass}`,
  }).catch(() => {});

  return {
    message: `palantir-mini: value-grade-assigner BLOCK (${errorClass})`,
    decision: "block",
    reason,
    hookSpecificOutput: {
      permissionDecision: "deny",
      permissionDecisionReason: reason,
      additionalContext: hint,
    },
  };
}
