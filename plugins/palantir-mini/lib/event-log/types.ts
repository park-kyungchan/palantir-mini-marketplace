/**
 * palantir-mini — EventEnvelope discriminated union
 * @owner palantirkc-plugin-events
 * @purpose palantir-mini EventEnvelope discriminated union
 */
// palantir-mini — EventEnvelope discriminated union
// Full schema per palantir-mini-blueprint.md Gap fill 1 + v1 extension.
// Domain: DATA (prim-data-01 EventEnvelope)
//
// Decision Lineage 5-dim (Palantir §DL-02) is captured on every envelope via
// EventEnvelopeBase: WHEN / ATOP_WHICH / THROUGH_WHICH / BY_WHOM / WITH_WHAT.
//
// OCP: new variants extend the union without modifying existing variants.
// PECS: consumers use exhaustive visitors over the supertype, not per-variant
//        switch blocks. TypeScript enforces exhaustiveness at compile time.

// ─── Branded value types (prim-data-05 CommitSha) ──────────────────────────
// ENVELOPE-1: brands are single-sourced from the canonical event-envelope
// primitive (schemas-snapshot is the authority). Re-exported here so existing
// runtime imports of `EventId`/`SessionId`/`CommitSha` from this module keep
// working unchanged.
export type { EventId, SessionId, CommitSha } from "#schemas/ontology/primitives/event-envelope";
export { eventId, sessionId, commitSha } from "#schemas/ontology/primitives/event-envelope";

// ─── v1.35.0 valuable-data substrate imports (rule 26) ────────────────────
import type { ValueGrade } from "#schemas/ontology/primitives/value-grade";
import type { AgenticMemoryLayer } from "#schemas/ontology/primitives/agentic-memory-layer";
import type { LineageRefs } from "#schemas/ontology/primitives/lineage-refs";
import type { RefinementTarget } from "#schemas/ontology/primitives/refinement-target";
// ENVELOPE-1: the canonical 5-dim envelope SUBSTRATE is imported from the
// schema primitive (the SSoT) and EXTENDED here — the runtime owns the full
// variant union (OCP) but does NOT re-declare the 5-dim shape. `withWhat` is
// the only sub-field the runtime widens (rule-26 memoryLayers/refinementTarget
// extensions), so it is Omit-ed from the primitive base and re-added below.
import type {
  EventEnvelopeBase as PrimitiveEventEnvelopeBase,
  EventWithWhat as PrimitiveEventWithWhat,
} from "#schemas/ontology/primitives/event-envelope";

// The canonical primitive declares its fields `readonly` (schema hygiene). The
// runtime mirror is built field-by-field by many handlers and mutated in tests,
// so it must be mutable — but we do NOT want to re-declare the 5-dim shapes.
// DeepMutable strips `readonly` recursively WITHOUT restating any field names,
// keeping the primitive the single source of the envelope SUBSTRATE shape.
// Branded primitives (e.g. `string & { __brand }` for EventId/CommitSha) must be
// left intact — the leading primitive guard prevents recursing INTO a brand and
// exploding it into a `{ [x:number]: string; toString: {}; ... }` mapped type.
type DeepMutable<T> = T extends string | number | boolean | symbol | bigint | null | undefined
  ? T
  : T extends ReadonlyArray<infer U>
    ? Array<DeepMutable<U>>
    : T extends object
      ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
      : T;

// ─── Decision Lineage 5 dimensions (prim-learn-02, v1.35.0 extended) ─────
// Mirror = primitive base (eventId / when / atopWhich / throughWhich / byWhom /
// sequence / propagationDepth / propagationDepthSource) with the runtime-only
// rule-26 extensions added on top. The 5-dim shape lives in ONE place
// (the primitive); this interface only ADDS optional fields + drops readonly.
export interface EventEnvelopeBase
  extends Omit<DeepMutable<PrimitiveEventEnvelopeBase>, "withWhat"> {
  /**
   * WITH_WHAT — primitive's reasoning/hypothesis core, widened with the rule-26
   * Axes C2 + E extension fields the runtime carries (memoryLayers /
   * refinementTarget). The core 5-dim WITH_WHAT shape is single-sourced from
   * the primitive's `EventWithWhat`.
   *
   * `withWhat.reasoning` is a FIRST-CLASS decision-lineage field (the WHY behind
   * the emitted decision), NOT a free-form advisory pointer. It is REQUIRED-AT-
   * EMIT for every T1+ (valuable) event: the emit boundary
   * (bridge/handlers/emit-event.ts `validateReasoningPresence` + the
   * value-grade-assigner PreToolUse hook) advises on a missing `reasoning` and
   * hard-rejects under PALANTIR_MINI_REASONING_ENFORCE=1. T0 (5-dim incomplete)
   * is unaffected (rejected earlier); the requirement is scoped to T1+ so
   * structural emits that already grade T1 carry their WHY. The field stays
   * OPTIONAL in the TYPE (non-breaking for legacy/historical rows + in-flight
   * call sites) — the emit-boundary gate is the enforcement seam, not the type.
   */
  withWhat?: DeepMutable<PrimitiveEventWithWhat> & {
    /**
     * v1.35.0+ Axis E — agentic memory layer(s) this event refines. Required
     * on T2+ envelopes per rule 26. Empty array treated same as missing.
     */
    memoryLayers?: readonly AgenticMemoryLayer[];
    /**
     * v1.35.0+ Axis C2 — typed refinement pointer. Required on
     * `validation_phase_completed.passed=false` per rule 26 §R5.
     */
    refinementTarget?: RefinementTarget;
  };
  /**
   * v1.35.0+ Axis A3 — typed cross-references (actionRid / dryRunRef /
   * outcomePairId / evidenceUrls / playgroundSandboxId). COMPLEMENTS the
   * first-class `withWhat.reasoning` WHY-narrative per rule 26 §Axis A3: typed
   * refs carry the machine-followable pointers, `reasoning` carries the human-
   * readable decision rationale. lineageRefs does NOT supersede reasoning — both
   * are required-for-valuable; the emit boundary gates on reasoning presence.
   */
  lineageRefs?: LineageRefs;
  /**
   * v1.35.0+ Substrate-routing grade (T0..T4) per rule 26 §Grading. Auto-
   * assigned by `value-grade-assigner` hook (PreToolUse on emit_event).
   * T0 envelopes are rejected at emit. Optional during 1-sprint migration
   * window; mandatory once value-grade-assigner is live.
   */
  valueGrade?: ValueGrade;
  /**
   * ENVELOPE REVISION — additive per-row schema revision tag (lockstep mirror
   * of the primitive `EventEnvelopeBase.envelopeRev`). Keyed on by the on-read
   * upcaster (`lib/event-log/upcasters`). Absent ⇒ rev 0 / current. NOT named
   * `schemaVersion` (collides with the module const EVENT_ENVELOPE_SCHEMA_VERSION).
   */
  envelopeRev?: number;
}

// ─── Ontology edit payload (placeholder until lib/actions defines it) ───────
// v0: a minimal OntologyEdit shape — the 3 edit classes from OSDK 2.0.
export type OntologyEdit =
  | { kind: "object"; rid: string; properties: Record<string, unknown> }
  | {
      kind: "link";
      rid: string;
      srcRid: string;
      dstRid: string;
      linkName: string;
      // OE-11: endpoint cardinalities (the first-class `Cardinality` primitive
      // "one"|"many"), optional + additive so the FOLD-1 declaration carries the
      // link's cardinality when the register seam threaded it. Absent on legacy edits.
      srcCardinality?: "one" | "many";
      dstCardinality?: "one" | "many";
    }
  | { kind: "interface"; rid: string; interfaceName: string };

// ─── 10 variants ────────────────────────────────────────────────────────────

export type EditProposedEnvelope = EventEnvelopeBase & {
  type: "edit_proposed";
  payload: {
    functionName:      string;
    params:            unknown;
    hypotheticalEdits: OntologyEdit[];
  };
};

export type EditCommittedEnvelope = EventEnvelopeBase & {
  type: "edit_committed";
  payload: {
    actionTypeRid:            string;
    appliedEdits:             OntologyEdit[];
    submissionCriteriaPassed: string[];
  };
};

export type SubmissionCriteriaFailedEnvelope = EventEnvelopeBase & {
  type: "submission_criteria_failed";
  payload: {
    actionTypeRid:      string;
    failedConstraints:  Array<{
      constraintType:
        | "Range"
        | "ArraySize"
        | "StringLength"
        | "StringRegexMatch"
        | "OneOf"
        | "ObjectQueryResult"
        | "ObjectPropertyValue"
        | "GroupMember"
        | "Unevaluable";
      failureMessage: string;
    }>;
  };
};

export type ValidationPhaseCompletedEnvelope = EventEnvelopeBase & {
  type: "validation_phase_completed";
  payload: {
    phase:       "design" | "compile" | "deploy" | "merge" | "runtime" | "post_write";
    passed:      boolean;
    errorClass?: string;
  };
};

export type CodegenStartedEnvelope = EventEnvelopeBase & {
  type: "codegen_started";
  payload: {
    targetProject:   string;
    ontologyVersion: string;
  };
};

export type CodegenCompletedEnvelope = EventEnvelopeBase & {
  type: "codegen_completed";
  payload: {
    targetProject:  string;
    generatedFiles: string[];
    durationMs:     number;
  };
};

export type PhaseCompletedEnvelope = EventEnvelopeBase & {
  type: "phase_completed";
  payload: {
    phaseTag:    string;
    taskId:      string;
    validations: string[];
  };
};

export type DriftDetectedEnvelope = EventEnvelopeBase & {
  type: "drift_detected";
  payload: {
    driftType:          "schema_mismatch" | "stale_codegen" | "orphan_reference";
    affectedObjectType: string;
  };
};

export type SessionStartedEnvelope = EventEnvelopeBase & {
  type: "session_started";
  payload: {
    // Optional: SessionStart emits the live `payload.model` it receives; when the
    // host does not supply one we omit it rather than fabricate a (stale) literal.
    model?: string;
    effort: string;
  };
};

export type SessionEndedEnvelope = EventEnvelopeBase & {
  type: "session_ended";
  payload: {
    reason:     "clear" | "logout" | "compact" | "other";
    eventCount: number;
    workflowResponseValidation?: {
      status: "pass" | "fail" | "runtime-gap";
      reason?: string;
      required?: boolean;
      validation?: unknown;
    };
  };
};

// ─── v1 extension variants ────────────────────────────────────────────────
export type TaskCreatedEnvelope = EventEnvelopeBase & {
  type: "task_created";
  payload: { taskId: string; subject?: string; description?: string };
};

export type TeammateidleEnvelope = EventEnvelopeBase & {
  type: "teammate_idle";
  payload: { agentId: string; idleCount: number };
};

export type SubagentStopEnvelope = EventEnvelopeBase & {
  type: "subagent_stop";
  payload: { agentId: string; exitCode?: number; reason?: string };
};

export type PostCompactVerifiedEnvelope = EventEnvelopeBase & {
  type: "post_compact_verified";
  payload: { totalEvents: number; lastSequence: number; invariantOk: boolean; invariantNote?: string };
};

export type UserPromptSubmittedEnvelope = EventEnvelopeBase & {
  type: "user_prompt_submitted";
  payload: { promptLength?: number };
};

export type MemoryWriteEnvelope = EventEnvelopeBase & {
  type: "memory_write";
  payload: { memoryType?: string; memoryKey?: string };
};

export type MemoryReadEnvelope = EventEnvelopeBase & {
  type: "memory_read";
  payload: { memoryType?: string; memoryKey?: string };
};

export type AgentStartEnvelope = EventEnvelopeBase & {
  type: "agent_start";
  payload: { agentId: string; agentName?: string; taskId?: string };
};

export type AgentStopEnvelope = EventEnvelopeBase & {
  type: "agent_stop";
  payload: { agentId: string; agentName?: string; exitCode?: number; reason?: string };
};

export type ScenarioCreatedEnvelope = EventEnvelopeBase & {
  type: "scenario_created";
  payload: { scenarioRid: string; parentSessionRid: string; isolationMode: "full" | "shared-read"; sandboxDir: string };
};

// ─── v1.1 extension variants (Phase A-2 W2-2 — 9-defect fix) ──────────────
export type ShutdownRequestEnvelope = EventEnvelopeBase & {
  type: "shutdown_request";
  payload: {
    agentId:          string;
    reason:           string;
    idleCount?:       number;
    blockedByDepth?:  number;
  };
};

export type InboxDeliveredEnvelope = EventEnvelopeBase & {
  type: "inbox_delivered";
  payload: {
    recipient:     string;
    deliveredCount: number;
    messageIds:    string[];
  };
};

export type StaleStateWarningEnvelope = EventEnvelopeBase & {
  type: "stale_state_warning";
  payload: {
    staleFiles: string[];
    preserved:  boolean;
  };
};

export type InboxCleanedEnvelope = EventEnvelopeBase & {
  type: "inbox_cleaned";
  payload: {
    taskId:       string;
    removedCount: number;
    inboxFiles:   string[];
  };
};

export type SubagentStateValidationEnvelope = EventEnvelopeBase & {
  type: "subagent_state_validation";
  payload: {
    agentId:       string;
    agentName?:    string;
    statePath?:    string;
    markdownReportPath?: string;
    passed:        boolean;
    errorClass?:   string;
    wrapped?:      boolean;
  };
};

export type AgentFrontmatterValidatedEnvelope = EventEnvelopeBase & {
  type: "agent_frontmatter_validated";
  payload: {
    scanned:        number;
    conformant:     number;
    nonconformant:  number;
    warnings:       number;
  };
};

// ─── v1.4 extension variants (Phase A-4 Day 2 — MCP tools batch 3) ──────────
export type ImpactGraphInitializedEnvelope = EventEnvelopeBase & {
  type: "impact_graph_initialized";
  payload: {
    projectRoot: string;
    dbPath:      string;
  };
};

export type AutoSpawnRequestedEnvelope = EventEnvelopeBase & {
  type: "auto_spawn_requested";
  payload: {
    terminatedAgentName: string;
    ownedTaskIds:        string[];
    requestFile:         string;
  };
};

// ─── v1.5 extension variants (Phase A-5 Wave 1a — pm-retro + pm-learn) ──────
export type SkillStartedEnvelope = EventEnvelopeBase & {
  type: "skill_started";
  payload: {
    skillName: string;
  };
};

export type SkillCompletedEnvelope = EventEnvelopeBase & {
  type: "skill_completed";
  payload: {
    skillName:  string;
    durationMs: number;
    outcome:    "success" | "fail" | "partial";
  };
};

/**
 * v1.36 / sprint-025 / W1.8 — Persisted advisory event for skill invocation
 * recommendations. Closes Agent #3 audit gap "substrate-signal advisories not
 * persisted as events" (rule 26 §Definition: every meaningful decision should
 * close BackProp circuit). Emitted by hooks (harness-base-mode-advisory,
 * memory-layer-validator, rule-audit, value-grade-assigner, pre-edit-impact-check)
 * when they output advisory text recommending a `/palantir-mini:pm-*` skill.
 *
 * Replay-able via `replay_lineage` with `eventTypes: ["skill_invocation_suggested"]`
 * to reconstruct the suggestion → invocation → outcome chain (rule 26 §Axis B1
 * outcome-paired). Suggestions that go unfulfilled feed Agent dispatch tuning.
 */
export type SkillInvocationSuggestedEnvelope = EventEnvelopeBase & {
  type: "skill_invocation_suggested";
  payload: {
    /** Canonical skill slug, e.g. "pm-recap" / "pm-value-audit" / "pm-replay". */
    suggestedSkillSlug: string;
    /** Hook that emitted the suggestion. */
    suggestedByHook:    string;
    /** What condition triggered (e.g. "T2+ ratio < 15%", "blastRadius >= 5", "events.jsonl >= 10 since session_started"). */
    triggerCondition:   string;
    /** Optional file or RID the suggestion is grounded in. */
    suggestionContext?: string;
  };
};

export type LearningCapturedEnvelope = EventEnvelopeBase & {
  type: "learning_captured";
  payload: {
    topic:      string;
    content:    string;
    confidence: number;
    source?:    string;
  };
};

export type RetroEmittedEnvelope = EventEnvelopeBase & {
  type: "retro_emitted";
  payload: {
    sessionMinutes: number;
    summaryText:    string;
  };
};

export type PlanReviewedEnvelope = EventEnvelopeBase & {
  type: "plan_reviewed";
  payload: {
    planPath:      string;
    reviewerAgent: string;
    approved:      boolean;
  };
};

// ─── Phase B3 (2026-04-20) — Research library governance + kosmos federation ───

export type ResearchLibraryRefreshedEnvelope = EventEnvelopeBase & {
  type: "research_library_refreshed";
  payload: {
    source:           "palantir-foundry" | "claude-code" | "all";
    added:            string[];
    removed:          string[];
    changed:          string[];
    unchanged_count:  number;
    libraryRoot?:     string;
  };
};

export type ResearchLibraryPrunedEnvelope = EventEnvelopeBase & {
  type: "research_library_pruned";
  payload: {
    archived:   string[];
    threshold:  number;
    libraryRoot?: string;
  };
};

export type ClaudeCodeVersionCheckedEnvelope = EventEnvelopeBase & {
  type: "claude_code_version_checked";
  payload: {
    from_version:                    string;
    to_version:                      string;
    new_features:                    string[];
    deprecations:                    string[];
    research_docs_that_need_update:  { feature: string; suggested_doc: string }[];
    error?:                          string;
  };
};

export type ResearchDocsDriftDetectedEnvelope = EventEnvelopeBase & {
  type: "research_docs_drift_detected";
  payload: {
    since:         string;
    changesCount:  number;
    summary:       string;
  };
};

export type OrphanEventReconciledEnvelope = EventEnvelopeBase & {
  type: "orphan_event_reconciled";
  payload: {
    orphanRef: {
      file:            string;
      line_offset:     number;
      original_line:   string;
    };
    reconciled: {
      when:          string;
      atopWhich:     string;
      throughWhich:  { sessionId: string; toolName: string; cwd: string };
      byWhom:        { identity: string; agentName?: string };
    };
  };
};

// ─── v1.7 extension variants (Phase G — harness instrumentation) ───────────
export type ChromeRatioMeasuredEnvelope = EventEnvelopeBase & {
  type: "chrome_ratio_measured";
  payload: {
    surface: string;
    chromeAreaPct: number;
    canvasAreaPct: number;
    breakdown: {
      viewportAreaPx: number;
      chromeAreaPx: number;
      canvasAreaPx: number;
      overlapAreaPx: number;
      unclassifiedAreaPx: number;
      chromeElementCount: number;
      canvasElementCount: number;
      url?: string;
      viewport?: { width: number; height: number };
    };
  };
};

export type PreSprintDiffComputedEnvelope = EventEnvelopeBase & {
  type: "pre_sprint_diff_computed";
  payload: {
    base: string;
    head: string;
    changedRids: string[];
    downstreamConsumers: string[];
  };
};

export type DriftGateEvaluatedEnvelope = EventEnvelopeBase & {
  type: "drift_gate_evaluated";
  payload: {
    gatePassed: boolean;
    failedChecks: string[];
  };
};

// ─── v2.0 extension variants (Phase H2 — 3-agent harness lifecycle) ─────────

export type HarnessAgentSpawnedEnvelope = EventEnvelopeBase & {
  type: "harness_agent_spawned";
  payload: {
    agentRid:       string;
    role:           "planner" | "generator" | "evaluator" | "orchestrator" | "grader_code" | "grader_rule" | "grader_model" | "grader_human";
    phase:          "planning" | "sprint" | "evaluation" | "synthesis";
    modelRef:       "haiku" | "sonnet" | "opus";
    sprintNumber?:  number;
    loopId?:        string;
    iteration?:     number;
  };
};

export type SprintContractNegotiatedEnvelope = EventEnvelopeBase & {
  type: "sprint_contract_negotiated";
  payload: {
    project:       string;
    sprintNumber:  number;
    round:         number;
    role:          "generator" | "evaluator" | "orchestrator";
    action:        "propose" | "counter" | "approve" | "read";
  };
};

export type SprintContractBoundEnvelope = EventEnvelopeBase & {
  type: "sprint_contract_bound";
  payload: {
    project:        string;
    sprintNumber:   number;
    contractPath:   string | null;
    roundCount:     number;
    role:           "generator" | "evaluator" | "orchestrator";
    /**
     * v3.13.0+ — Project slug for cross-project lineage disambiguation
     * (crystalline-resilient-narwhal P-EXTRA, 2026-05-01). Optional;
     * legacy events without this field interpreted as "unspecified-slug".
     */
    projectSlug?:   string;
    /**
     * v3.13.0+ — Slug-prefixed contractId actually written to disk
     * (e.g. "palantirkc-sprint-019-quick"). Optional; when absent,
     * readers fall back to inferring from `contractPath` basename.
     */
    contractId?:    string;
  };
};

/**
 * Emitted when a FeedbackLoop is opened.
 */
export type FeedbackLoopOpenedEnvelope = EventEnvelopeBase & {
  type: "feedback_loop_opened";
  payload: {
    project:               string;
    loopId:                string;
    sprintContractRid?:    string;
    generatorAgentRid?:    string;
    evaluatorAgentRid?:    string;
    orchestratorAgentRid?: string;
    sprintNumber?:         number;
    initialState?:         "negotiating" | "generating";
  };
};

/**
 * Emitted when a FeedbackLoop transitions to a terminal state (passed/failed/aborted).
 *
 * v1.15 split from FeedbackLoopOpenedEnvelope per H3 retrospective D4:
 *   - "when did this loop open?"   → filter by feedback_loop_opened
 *   - "when did this loop close?"  → filter by feedback_loop_closed
 *
 * Authority: ~/.claude/schemas/ontology/primitives/feedback-loop-closed.ts
 */
export type FeedbackLoopClosedEnvelope = EventEnvelopeBase & {
  type: "feedback_loop_closed";
  payload: {
    project:        string;
    loopId:         string;
    sprintNumber:   number;
    verdict:        "passed" | "failed" | "aborted";
    iterationCount: number;
    terminationCondition: {
      type:                "threshold_met" | "iteration_exhausted" | "timeout" | "abort" | "error";
      rationale:           string;
      terminatedAt:        string;
      finalScore?:         number;
      failedCriterionRid?: string;
    };
  };
};

/**
 * v2.9.0 — Session 3 Slice 2 (B-14 closure): added optional `outcome` field
 * populated when state ∈ {"completed", "failed"} via `complete_playwright_scenario`
 * handler. instructions_issued + running emit without outcome (forwards-compat:
 * existing readers ignore the unknown field on those states). Closes the harness
 * production loop — Evaluator's recorded outcome surfaces in Decision Lineage
 * payload, not just in evidenceDir/outcome.json on disk.
 */
export type PlaywrightFailureClass =
  | "timeout"
  | "selector_not_found"
  | "assertion_failed"
  | "unexpected_navigation"
  | "transient_network"
  | "browser_crash"
  | "other";

export type PlaywrightScenarioExecutedEnvelope = EventEnvelopeBase & {
  type: "playwright_scenario_executed";
  payload: {
    project:         string;
    scenarioId:      string;
    evidenceDir:     string;
    mcpToolBinding:  string;
    sprintNumber?:   number;
    iteration?:      number;
    loopId?:         string;
    stepCount:       number;
    state:           "instructions_issued" | "running" | "completed" | "failed";
    /** v2.9.0 — populated when state ∈ {completed, failed}. */
    outcome?: {
      passed:        boolean;
      failedStep?:   string;
      failureClass?: PlaywrightFailureClass;
      durationMs?:   number;
      retries?:      number;
    };
  };
};

export type GradingCompletedEnvelope = EventEnvelopeBase & {
  type: "grading_completed";
  payload: {
    project:              string;
    rubricId:             string;
    artifactPath:         string;
    overallScore:         number;
    maxPossibleScore:     number;
    passedCriteria:       number;
    failedCriteria:       number;
    humanReviewRequired:  number;
    loopId?:              string;
    sprintNumber?:        number;
    iteration?:           number;
  };
};

// ─── v2.8.2 — handler latency instrumentation (Session 3 Slice 1, B-15 closure) ──
//
// Captured by mcp-server.ts dispatch wrapper around every tools/call. Provides
// 100% handler-timing coverage without per-handler instrumentation cost. Mirrors
// AIP architecture #2 End-to-end observability — token + latency telemetry per
// handler invocation. Successor primitive to the per-handler durationMs fields
// already present on CodegenCompletedEnvelope.payload + SkillCompletedEnvelope.
//
// `errorClass` is populated only on failure paths; surface = JS Error class name
// (e.g. "TypeError", "ENOENT"), NOT the full stack trace (kept light to avoid
// Decision Lineage payload bloat per rule 10).

export type ToolInvocationCompletedEnvelope = EventEnvelopeBase & {
  type: "tool_invocation_completed";
  payload: {
    toolName:    string;
    durationMs:  number;
    success:     boolean;
    errorClass?: string;
  };
};

// ─── v2.18.0 — W1 Planner Output Meta-Rubric (schemas v1.23 planner_output_graded) ──
//
// Emitted after scoring a planner's spec.md against featureCount +
// designSpecificity + antiPatternCount. A verdict="block" alerts Lead.

export type PlannerOutputGradedEnvelope = EventEnvelopeBase & {
  type: "planner_output_graded";
  payload: {
    specPath:   string;
    rubricPath?: string;
    metaScores: {
      featureCount:       number;
      designSpecificity:  0 | 1 | 2;
      antiPatternCount:   number;
    };
    verdict: "pass" | "warn" | "block";
  };
};

// ─── v2.18.0 — W2 Evaluator Strictness Probe (schemas v1.23 evaluator_strictness_probe) ──
//
// Per-criterion probe emitted during grade_outcome_with_rubric. Consumed by
// pm_harness_strictness_audit MCP to detect drift over iterations.

export type EvaluatorStrictnessProbeEnvelope = EventEnvelopeBase & {
  type: "evaluator_strictness_probe";
  payload: {
    sprintNumber:          number;
    iteration:             number;
    criterionHash:         string;
    score:                 number;
    evidenceCitationCount: number;
    failureClassCount:     number;
  };
};

// ─── v2.19.0 — W3 Dissent Record (schemas v1.24 sprint_contract_dissent_preserved) ──
//
// Emitted by negotiate_sprint_contract at bind time when the contract's
// negotiationHistory contains at least one acceptedInFinal=false entry.
// harness-analyzer correlates post-sprint failures with rejected proposals.

export type SprintContractDissentPreservedEnvelope = EventEnvelopeBase & {
  type: "sprint_contract_dissent_preserved";
  payload: {
    project:        string;
    contractId:     string;
    sprintNumber:   number;
    disputedRounds: Array<{
      round?:           number;
      proposer?:        "generator" | "evaluator" | "lead-arbitrator";
      targetField?:     string;
      delta?:           { from?: string | number; to?: string | number };
      rationale?:       string;
      acceptedInFinal?: boolean;
      at?:              string;
    }>;
    totalRounds:    number;
    /**
     * v3.13.0+ — Project slug for cross-project disambiguation
     * (crystalline-resilient-narwhal P-EXTRA, 2026-05-01). Optional.
     */
    projectSlug?:   string;
  };
};

// ─── v2.20.0 — W4 Context Reset Optional (schemas v1.25 context_reset_handoff_emitted) ──
//
// Declaration-only this release. Emitted when a harness sprint records a
// context-reset handoff at an iteration boundary (SprintContract.iterationResetPolicy="auto").
// Runtime impl deferred pending W5 audit.

export type ContextResetHandoffEmittedEnvelope = EventEnvelopeBase & {
  type: "context_reset_handoff_emitted";
  payload: {
    sprintNumber:  number;
    fromIteration: number;
    toIteration:   number;
    handoffBytes:  number;
    handoffFiles:  readonly string[];
  };
};

// ─── v2.21.0 — W5 Component Audit (schemas v1.26 harness_component_audit_emitted) ──
//
// Emitted by pm_harness_component_audit handler when a caller reports a
// canary comparison verdict for a HarnessComponent. Substrate for
// Rajasekaran's §1 "every component encodes an assumption" stress test.

export type HarnessComponentAuditEmittedEnvelope = EventEnvelopeBase & {
  type: "harness_component_audit_emitted";
  payload: {
    componentId:        string;
    verdict:            "load-bearing" | "remove-candidate" | "needs-rework";
    scoreDelta:         number;
    rationale:          string;
    baselineRubricRid:  string;
    canaryArtifacts:    readonly string[];
  };
};

// ─── v2.23.0 Phase 1 — pm_plugin_self_check substrate health aggregator ────
//
// Emitted by pm_plugin_self_check handler after completing a full substrate
// health check. Records per-axis verdict for BackwardProp replay.

export type PluginSelfCheckCompletedEnvelope = EventEnvelopeBase & {
  type: "plugin_self_check_completed";
  payload: {
    schemaPinResult:        { status: "pass" | "fail"; details: string };
    codegenHeadersResult:   { status: "pass" | "fail" | "skipped"; details: string };
    ruleAuditResult:        { status: "pass" | "fail"; driftLines: number; staleCrossRefs: number; unclaimedHookCitations: number };
    declaredAgentsResult:   { status: "pass" | "fail"; total: number; missing: string[] };
    declaredSkillsResult:   { status: "pass" | "fail"; total: number; missing: string[] };
    overallStatus:          "pass" | "fail";
  };
};

// ─── v3.2.0 — D2 PreCompact raw-NDJSON snapshot + G3 events_log_rotate ─────
//
// SnapshotWrittenEnvelope: emitted by pre-compact-state hook after copying
// the live events.jsonl to .palantir-mini/session/snapshots/. Closes rule 10
// §PreCompact gate snapshot guarantee that was unimplemented before v3.2.0.
//
// EventLogRotatedEnvelope: emitted by events_log_rotate handler into the
// fresh events.jsonl after renaming the breached log to archive/. Closes
// v3.1.0 handoff §7.2 G3 (no rotation/archive mechanism).

export type SnapshotWrittenEnvelope = EventEnvelopeBase & {
  type: "snapshot_written";
  payload: {
    path:        string;
    sizeBytes:   number;
    atSequence:  number;
  };
};

export type EventLogRotatedEnvelope = EventEnvelopeBase & {
  type: "event_log_rotated";
  payload: {
    archivedPath:    string;
    sizeBytes:       number;
    lineCount:       number;
    thresholdBytes:  number;
    thresholdLines:  number;
  };
};

// ─── v3.13.0 — sprint-006 BackProp loop closure (schemas v1.32.0 sync) ─────
//
// SprintCompletedEnvelope: emitted by sprint-terminal-detector PostToolUse
// hook when commit_edits closes a bound SprintContract (verdict pass / fail
// / timeout / abort + iterationLimit reached or /pm-harness-abort).
//
// FailureModeSynthesizedEnvelope: emitted by analyzer-output-injector
// PostToolUse hook when an iteration's analysis-NNN.md is parsed and tagged
// with a structured FailureCategory. Lineage: zero-or-more per sprint.
//
// Authority: ~/.claude/schemas/ontology/primitives/sprint-completed.ts +
//            ~/.claude/schemas/ontology/primitives/failure-mode-synthesized.ts +
//            ~/.claude/schemas/ontology/primitives/failure-category.ts

export type SprintCompletedEnvelope = EventEnvelopeBase & {
  type: "sprint_completed";
  payload: {
    project:             string;
    sprintNumber:        number;
    contractId:          string;
    verdict:             "passed" | "failed" | "timeout" | "aborted";
    iterationCount:      number;
    bestScore:           number;
    terminationCriteria: readonly string[];
    /**
     * v3.13.0+ — Project slug for cross-project disambiguation
     * (crystalline-resilient-narwhal P-EXTRA, 2026-05-01). Optional;
     * legacy sprints emit without this field — readers fall back to
     * inferring from `project` basename.
     */
    projectSlug?:        string;
  };
};

export type FailureModeSynthesizedEnvelope = EventEnvelopeBase & {
  type: "failure_mode_synthesized";
  payload: {
    sprintNumber:         number;
    iteration:            number;
    failureCategory:
      | "spec_misalignment"
      | "scope_overreach"
      | "threshold_too_strict"
      | "regression"
      | "rule_conformance_violation"
      | "unknown";
    rootCauseHypothesis:  string;
    suggestedPatchType?:  string;
    smallestPatch?:       string;
  };
};

// ─── PR-11: PreMutationGovernance decision envelopes ──────────────────────────

export type PreMutationGovernanceDecidedEnvelope = EventEnvelopeBase & {
  type: "pre_mutation_governance_decided";
  payload: {
    decisionId:           string;
    toolName:             string;
    targetFiles:          readonly string[];
    allowed:              boolean;
    reason:               string;
    ruleApplied:          string;   // "read-only-allow" | "generated-file-direct-edit-forbidden" | etc.
    refs: {
      semanticIntentContractRef?:    string;
      digitalTwinChangeContractRef?: string;
      approvalRef?:                  string;
      universalOntologyEntryRef?:    string;
      ontologyContextQueryRef?:      string;
      workflowTraceId?:              string;
    };
  };
};

// ─── PR-10: OntologyWorkflowTrace lifecycle envelopes ─────────────────────────

export type WorkflowTraceOpenedEnvelope = EventEnvelopeBase & {
  type: "workflow_trace_opened";
  payload: {
    traceId:  string;
    mode:     string;
    refs:     Record<string, unknown>;
  };
};

export type WorkflowTraceTransitionedEnvelope = EventEnvelopeBase & {
  type: "workflow_trace_transitioned";
  payload: {
    traceId:   string;
    fromMode:  string;
    toMode:    string;
    refs:      Record<string, unknown>;
  };
};

export type WorkflowTraceClosedEnvelope = EventEnvelopeBase & {
  type: "workflow_trace_closed";
  payload: {
    traceId:  string;
    mode:     string;
    outcome:  "passed" | "failed" | "aborted";
    refs:     Record<string, unknown>;
  };
};

export type WorkflowTraceLeakDetectedEnvelope = EventEnvelopeBase & {
  type: "workflow_trace_leak_detected";
  payload: {
    traceId:    string;
    mode:       string;
    lastEvent:  string;
    updatedAt:  string;
    ageMs:      number;
  };
};

export type EventsSummarizedEnvelope = EventEnvelopeBase & {
  type: "events_summarized";
  payload: {
    summarizedType: string; count: number; firstSeq: number; lastSeq: number;
    firstAt: string; lastAt: string; sampledPayloads: unknown[]; threshold: number;
  };
};

// ─── DTC governance events (Sprint 97 W1) ─────────────────────────────────

/** Payload for `dtc_fill_turn_advanced` */
export interface DtcFillTurnAdvancedPayload {
  /** Which DTC fill step was just advanced (0-based). */
  dtcStep: number;
  /** Name of the field or dimension that was advanced. */
  advancedField: string;
  /** Optional list of captured ref IDs surfaced at this step. */
  capturedRefs?: readonly string[];
  /** Optional prompt ID correlating to the fill session. */
  promptId?: string;
}

export type DtcFillTurnAdvancedEnvelope = EventEnvelopeBase & {
  type: "dtc_fill_turn_advanced";
  payload: DtcFillTurnAdvancedPayload;
};

/** Payload for `digital_twin_contract_finalized` */
export interface DigitalTwinContractFinalizedPayload {
  /** RID or path of the finalized DTC. */
  dtcRef: string;
  /** Final verdict at T6 (dtc-filled). */
  verdict: "dtc-filled" | "dtc-rejected" | "dtc-aborted";
  /** Number of fill turns completed. */
  fillTurnCount: number;
  /** Optional session ID of the fill session. */
  sessionId?: string;
}

export type DigitalTwinContractFinalizedEnvelope = EventEnvelopeBase & {
  type: "digital_twin_contract_finalized";
  payload: DigitalTwinContractFinalizedPayload;
};

/** Payload for `dtc_grading_completed` */
export interface DtcGradingCompletedPayload {
  /** RID or path of the DTC that was graded. */
  dtcRef: string;
  /** Overall grading verdict. */
  verdict: "pass" | "fail" | "partial";
  /** Numeric score (0..1). */
  score: number;
  /** Number of criteria evaluated. */
  criteriaCount: number;
  /** Optional sprint or contract reference. */
  sprintRef?: string;
}

export type DtcGradingCompletedEnvelope = EventEnvelopeBase & {
  type: "dtc_grading_completed";
  payload: DtcGradingCompletedPayload;
};

/** Payload for `dtc_grader_runtime_gap` */
export interface DtcGraderRuntimeGapPayload {
  /** Criterion ID that could not be dispatched (single-criterion form). */
  criterionId?: string;
  /** Skipped criterion IDs (multi-criterion form; used when batching). */
  skippedCriteria?: readonly string[];
  /** Runtime that failed to dispatch (e.g. "codex", "gemini"). */
  runtime: string;
  /** Reason for the dispatch failure. */
  reason?: string;
  /** Optional fallback action taken. */
  fallback?: string;
  /** Optional rubric RID that triggered the gap. */
  rubricId?: string;
  /** Optional project path context. */
  projectPath?: string;
  /** Optional prompt ID correlating to the fill session. */
  promptId?: string;
  /** Optional session ID. */
  sessionId?: string;
}

export type DtcGraderRuntimeGapEnvelope = EventEnvelopeBase & {
  type: "dtc_grader_runtime_gap";
  payload: DtcGraderRuntimeGapPayload;
};

/** Payload for `dtc_eval_refs_bypass_invoked` */
export interface DtcEvalRefsBypassInvokedPayload {
  /** Bypass envvar that was set (e.g. "PALANTIR_MINI_DTC_EVAL_REFS_BYPASS"). */
  bypassEnvVar: string;
  /** Context in which bypass was invoked. */
  context: string;
  /** Optional refs that were bypassed. */
  bypassedRefs?: readonly string[];
}

export type DtcEvalRefsBypassInvokedEnvelope = EventEnvelopeBase & {
  type: "dtc_eval_refs_bypass_invoked";
  payload: DtcEvalRefsBypassInvokedPayload;
};

// ─── Improvement #2 — developer/source-mutation fast-path audit events ─────
//
// Two 5-dim audit events (rule 10) that make the LLM-unforgeable user-approval
// fast-path auditable: the GRANT (at mint, identity="user") and the DENIAL (at
// mint-time verification failure). Mirror the dtc_eval_refs_bypass_invoked
// audit precedent. The fast-path NEVER sets mutationAuthorized; it authorizes a
// scoped, single-use, short-TTL source edit in lieu of the SIC/DTC ceremony.

/** Payload for `source_mutation_approval_granted` (minted; identity="user"). */
export interface SourceMutationApprovalGrantedPayload {
  /** Stringified or structured approvalRef bound to promptId+promptHash. */
  approvalRef: string;
  /** SCOPE — normalized path/glob prefixes the user named. */
  approvedSourcePaths: readonly string[];
  /** Turn binding — the captured prompt this approval points at. */
  promptId: string;
  /** sha256 of the captured prompt. */
  promptHash: string;
  /** sha256 of the verified user quote (avoids logging raw quote verbatim). */
  userQuoteHash: string;
  /** Front-door runtime the approval was minted under. */
  runtime?: string;
}

export type SourceMutationApprovalGrantedEnvelope = EventEnvelopeBase & {
  type: "source_mutation_approval_granted";
  payload: SourceMutationApprovalGrantedPayload;
};

/** Payload for `source_mutation_approval_denied` (verification failure; no record written). */
export interface SourceMutationApprovalDeniedPayload {
  /** Explicit reason the verification failed (first failing check). */
  invalidReason: string;
  /** Model-claimed promptId (unverified). */
  promptId?: string;
  /** Model-claimed scope (unverified). */
  approvedSourcePaths?: readonly string[];
}

export type SourceMutationApprovalDeniedEnvelope = EventEnvelopeBase & {
  type: "source_mutation_approval_denied";
  payload: SourceMutationApprovalDeniedPayload;
};

// ─── 7.23.0 — drift_rebind composed RESUME audit event ─────────────────────
//
// Emitted by the `drift_rebind` handler's STEP 1 (gate-advance) when a PERSISTED
// minted approved SIC + DTC are RE-BOUND to the CURRENT prompt envelope and the
// envelope is advanced to digital_twin_approved — a legitimate RESUME that copies
// the minted approvalRefs forward (NEVER mints, NEVER bypasses). DISTINCT from the
// `rebind_registered` re-elevation's `edit_committed` and from any gate
// off/bypass event: it records ONLY the approval RE-BIND to the current prompt.

/** Payload for `drift_rebind_envelope_advanced` (the approval re-bind step). */
export interface DriftRebindEnvelopeAdvancedPayload {
  /** The current prompt envelope the persisted approval was re-bound to. */
  promptId: string;
  /** sha256 of the current captured prompt. */
  promptHash: string;
  /** The NEW re-keyed front-door SIC record ref under the current promptId. */
  semanticIntentContractRef: string;
  /** The NEW re-keyed front-door DTC record ref under the current promptId. */
  digitalTwinChangeContractRef: string;
  /** The persisted approved SIC contractId the minted approval was carried forward from. */
  approvedSicContractId: string;
  /** Front-door runtime of the current envelope. */
  runtime?: string;
}

export type DriftRebindEnvelopeAdvancedEnvelope = EventEnvelopeBase & {
  type: "drift_rebind_envelope_advanced";
  payload: DriftRebindEnvelopeAdvancedPayload;
};

/**
 * OE-14 / D5-7 — first-class UniversalOntologyEntry status-transition lineage.
 * A UniversalOntologyEntry advanced its lifecycle status (e.g. context-retrieved
 * → semantic-approved → registered). Replaces the prior `phase_completed`
 * piggyback in `lib/ontology-entry/lifecycle.ts` with a typed discriminator.
 */
export type UniversalOntologyEntryTransitionedEnvelope = EventEnvelopeBase & {
  type: "universal_ontology_entry_transitioned";
  payload: {
    /** Stable entry reference (entryId-derived). */
    entryRef:   string;
    /** Status before the transition. */
    fromStatus: string;
    /** Status after the transition (=== fromStatus on a no-op). */
    toStatus:   string;
    /** True when fromStatus === toStatus (idempotent no-op transition). */
    isNoOp:     boolean;
  };
};

// ─── v1.92 — second-brain memory-fold governed events (P0.4r) ──────────────
//
// Two governed Layer-1 events emitted (via the gated emit_event MCP path,
// rule 27) by the session-end memory fold. resolution_verdict records the
// ADD/UPDATE/DELETE/NONE entity-resolution verdict per graph mutation (the
// log = audit trail of every Layer-2 graph mutation). memory_fold_committed
// records the committed graph.json projection (node/edge counts) for a session.
//
// GUARDRAIL (P3-7 — agent-memory vs graph-SSoT): the per-project second-brain
// engine's Zod-validated graph.json IS the Layer-2 SSoT. `graphPath` below is a
// POINTER to that authoritative artifact, never a substitute for it; this event
// (and the value-grade / fold-snapshot counters that read it) is an advisory,
// non-gating PROJECTION, not the source of truth. Any persistent agent-memory
// surface — the runtime's native MEMORY.md cache (lib/runtime-overlay/
// memory-reflect.ts), recap digests, host-runtime memory layers — is a
// CONVENIENCE surface derived for retrieval ergonomics, NOT a parallel SSoT.
// Do NOT treat an agent-memory write as authoritative, and do NOT let it
// diverge from graph.json: on any conflict, graph.json (Zod-validated) wins and
// the convenience surface must be re-derived from it. New fold/memory code MUST
// keep graph.json's Zod schema as the single Layer-2 validation boundary.

export type ResolutionVerdictEnvelope = EventEnvelopeBase & {
  type: "resolution_verdict";
  payload: {
    verdict:      "ADD" | "UPDATE" | "DELETE" | "NONE";
    /** The Layer-2 node/edge id the verdict resolves to (absent on NONE). */
    targetId?:    string;
    /** Source event/turn ids this verdict was derived from (provenance). */
    derivedFrom?: string[];
  };
};

export type MemoryFoldCommittedEnvelope = EventEnvelopeBase & {
  type: "memory_fold_committed";
  payload: {
    /** Path of the committed Layer-2 graph.json projection. */
    graphPath:  string;
    nodeCount:  number;
    edgeCount:  number;
    /** Session whose transcript was folded. */
    sessionId:  string;
  };
};

// ─── 7.36.0 — P3 Lead-decision governed-emit (Path-B) ──────────────────────
//
// A Lead orchestration verdict (delegate / pick approach / refine hypothesis)
// landed into events.jsonl via the in-process scripts/log.ts emit() (Path B),
// NOT the altitude-2-hidden MCP emit_event tool. Distinct type from the fold's
// resolution_verdict (clean separation — the Lead's decisions stay separable
// from fold output). The decision-grade fields (reasoning / refinementTarget /
// memoryLayers) live in the 5-dim envelope's withWhat, not the payload, so the
// payload carries only the decision STRING; the a2-prior fold-verdict BY-TYPE
// branch (lib/runtime-overlay/a2-prior.ts) surfaces it NEXT session.
export type LeadDecisionEnvelope = EventEnvelopeBase & {
  type: "lead_decision";
  payload: {
    /** The Lead's decision, one line (e.g. "delegate STAGE 4 to an opus subagent"). */
    decision: string;
  };
};

// ─── The discriminated union ───────────────────────────────────────────────
export type EventEnvelope =
  | EditProposedEnvelope
  | EditCommittedEnvelope
  | SubmissionCriteriaFailedEnvelope
  | ValidationPhaseCompletedEnvelope
  | CodegenStartedEnvelope
  | CodegenCompletedEnvelope
  | PhaseCompletedEnvelope
  | DriftDetectedEnvelope
  | SessionStartedEnvelope
  | SessionEndedEnvelope
  | TaskCreatedEnvelope
  | TeammateidleEnvelope
  | SubagentStopEnvelope
  | PostCompactVerifiedEnvelope
  | UserPromptSubmittedEnvelope
  | MemoryWriteEnvelope
  | MemoryReadEnvelope
  | AgentStartEnvelope
  | AgentStopEnvelope
  | ScenarioCreatedEnvelope
  | ShutdownRequestEnvelope
  | InboxDeliveredEnvelope
  | StaleStateWarningEnvelope
  | InboxCleanedEnvelope
  | SubagentStateValidationEnvelope
  | AgentFrontmatterValidatedEnvelope
  | ImpactGraphInitializedEnvelope
  | AutoSpawnRequestedEnvelope
  | SkillStartedEnvelope
  | SkillCompletedEnvelope
  | SkillInvocationSuggestedEnvelope
  | LearningCapturedEnvelope
  | RetroEmittedEnvelope
  | PlanReviewedEnvelope
  | ResearchLibraryRefreshedEnvelope
  | ResearchLibraryPrunedEnvelope
  | ClaudeCodeVersionCheckedEnvelope
  | ResearchDocsDriftDetectedEnvelope
  | OrphanEventReconciledEnvelope
  | ChromeRatioMeasuredEnvelope
  | PlannerOutputGradedEnvelope
  | EvaluatorStrictnessProbeEnvelope
  | SprintContractDissentPreservedEnvelope
  | ContextResetHandoffEmittedEnvelope
  | HarnessComponentAuditEmittedEnvelope
  | PreSprintDiffComputedEnvelope
  | DriftGateEvaluatedEnvelope
  // v2.0 harness variants (Phase H2)
  | HarnessAgentSpawnedEnvelope
  | SprintContractNegotiatedEnvelope
  | SprintContractBoundEnvelope
  | FeedbackLoopOpenedEnvelope
  | PlaywrightScenarioExecutedEnvelope
  | GradingCompletedEnvelope
  // v2.0.2 — schemas v1.15 D4 fix (feedback_loop_closed split)
  | FeedbackLoopClosedEnvelope
  // v2.8.2 — Session 3 Slice 1 (B-15 closure) handler latency instrumentation
  | ToolInvocationCompletedEnvelope
  // v2.23.0 Phase 1 — plugin substrate health aggregator
  | PluginSelfCheckCompletedEnvelope
  // v3.2.0 — D2 PreCompact raw snapshot + G3 events_log_rotate
  | SnapshotWrittenEnvelope
  | EventLogRotatedEnvelope
  // v3.13.0 — sprint-006 BackProp loop closure (schemas v1.32.0)
  | SprintCompletedEnvelope
  | FailureModeSynthesizedEnvelope
  // PR-10 — OntologyWorkflowTrace lifecycle (foamy-giggling-kettle)
  | WorkflowTraceOpenedEnvelope
  | WorkflowTraceTransitionedEnvelope
  | WorkflowTraceClosedEnvelope
  | WorkflowTraceLeakDetectedEnvelope
  // PR-11 — PreMutationGovernance policy compiler (foamy-giggling-kettle)
  | PreMutationGovernanceDecidedEnvelope
  | EventsSummarizedEnvelope
  // Sprint 97 W1 — DTC governance events
  | DtcFillTurnAdvancedEnvelope
  | DigitalTwinContractFinalizedEnvelope
  | DtcGradingCompletedEnvelope
  | DtcGraderRuntimeGapEnvelope
  | DtcEvalRefsBypassInvokedEnvelope
  // Improvement #2 — developer/source-mutation fast-path audit events
  | SourceMutationApprovalGrantedEnvelope
  | SourceMutationApprovalDeniedEnvelope
  // 7.23.0 — drift_rebind composed RESUME audit event
  | DriftRebindEnvelopeAdvancedEnvelope
  // OE-14 / D5-7 — first-class UniversalOntologyEntry status-transition lineage
  | UniversalOntologyEntryTransitionedEnvelope
  // v1.92 — second-brain memory-fold governed events (P0.4r)
  | ResolutionVerdictEnvelope
  | MemoryFoldCommittedEnvelope
  // 7.36.0 — P3 Lead-decision governed-emit (Path-B)
  | LeadDecisionEnvelope;

export type EventType = EventEnvelope["type"];

// ─── Type guards ────────────────────────────────────────────────────────────
export const isEditProposed              = (e: EventEnvelope): e is EditProposedEnvelope              => e.type === "edit_proposed";
export const isEditCommitted             = (e: EventEnvelope): e is EditCommittedEnvelope             => e.type === "edit_committed";
export const isSubmissionCriteriaFailed  = (e: EventEnvelope): e is SubmissionCriteriaFailedEnvelope  => e.type === "submission_criteria_failed";
export const isValidationPhaseCompleted  = (e: EventEnvelope): e is ValidationPhaseCompletedEnvelope  => e.type === "validation_phase_completed";
export const isCodegenStarted            = (e: EventEnvelope): e is CodegenStartedEnvelope            => e.type === "codegen_started";
export const isCodegenCompleted          = (e: EventEnvelope): e is CodegenCompletedEnvelope          => e.type === "codegen_completed";
export const isPhaseCompleted            = (e: EventEnvelope): e is PhaseCompletedEnvelope            => e.type === "phase_completed";
export const isDriftDetected             = (e: EventEnvelope): e is DriftDetectedEnvelope             => e.type === "drift_detected";
export const isSessionStarted            = (e: EventEnvelope): e is SessionStartedEnvelope            => e.type === "session_started";
export const isSessionEnded              = (e: EventEnvelope): e is SessionEndedEnvelope              => e.type === "session_ended";
// v3.13.0 — sprint-006 BackProp loop closure
export const isSprintCompleted                 = (e: EventEnvelope): e is SprintCompletedEnvelope                 => e.type === "sprint_completed";
export const isFailureModeSynthesized          = (e: EventEnvelope): e is FailureModeSynthesizedEnvelope          => e.type === "failure_mode_synthesized";
// PR-11 — PreMutationGovernance policy compiler (foamy-giggling-kettle)
export const isPreMutationGovernanceDecided    = (e: EventEnvelope): e is PreMutationGovernanceDecidedEnvelope    => e.type === "pre_mutation_governance_decided";
export const isEventsSummarized                = (e: EventEnvelope): e is EventsSummarizedEnvelope                => e.type === "events_summarized";

// Sprint 97 W1 — DTC governance type guards
export const isDtcFillTurnAdvanced            = (e: EventEnvelope): e is DtcFillTurnAdvancedEnvelope            => e.type === "dtc_fill_turn_advanced";
export const isDigitalTwinContractFinalized   = (e: EventEnvelope): e is DigitalTwinContractFinalizedEnvelope   => e.type === "digital_twin_contract_finalized";
export const isDtcGradingCompleted            = (e: EventEnvelope): e is DtcGradingCompletedEnvelope            => e.type === "dtc_grading_completed";
export const isDtcGraderRuntimeGap            = (e: EventEnvelope): e is DtcGraderRuntimeGapEnvelope            => e.type === "dtc_grader_runtime_gap";
export const isDtcEvalRefsBypassInvoked       = (e: EventEnvelope): e is DtcEvalRefsBypassInvokedEnvelope       => e.type === "dtc_eval_refs_bypass_invoked";

// OE-14 / D5-7 — first-class UniversalOntologyEntry status-transition lineage
export const isUniversalOntologyEntryTransitioned = (e: EventEnvelope): e is UniversalOntologyEntryTransitionedEnvelope => e.type === "universal_ontology_entry_transitioned";

// v1.92 — second-brain memory-fold governed events (P0.4r)
export const isResolutionVerdict    = (e: EventEnvelope): e is ResolutionVerdictEnvelope    => e.type === "resolution_verdict";
export const isMemoryFoldCommitted  = (e: EventEnvelope): e is MemoryFoldCommittedEnvelope  => e.type === "memory_fold_committed";
// 7.36.0 — P3 Lead-decision governed-emit (Path-B)
export const isLeadDecision         = (e: EventEnvelope): e is LeadDecisionEnvelope         => e.type === "lead_decision";

// ─── Snapshot type produced by foldToSnapshot (prim-data-04 SnapshotManifest) ─

/**
 * FOLD-1 — a single materialized register-primitive entry in the canonical
 * fold. Carries the registered `rid` PLUS the committed `declaration` (the
 * register edit's `properties` minus `primitiveKind`, or the link edit's
 * `{ srcRid, dstRid, linkName }`), so the fold is meaning-bearing — a reader
 * sees WHAT was registered, not just THAT something was. `declaration` is
 * OPTIONAL: historical / fixture snapshots that only carried bare rids fold
 * into entries with `declaration` absent.
 */
export interface RegisteredPrimitiveEntry {
  rid: string;
  declaration?: Record<string, unknown>;
}

export interface EventSnapshot {
  edit_proposed:               number;
  edit_committed:              number;
  submission_criteria_failed:  number;
  validation_phase_completed:  number;
  codegen_started:             number;
  codegen_completed:           number;
  phase_completed:             number;
  drift_detected:              number;
  session_started:             number;
  session_ended:               number;
  // v1 additions
  task_created:                number;
  teammate_idle:               number;
  subagent_stop:               number;
  post_compact_verified:       number;
  user_prompt_submitted:       number;
  memory_write:                number;
  memory_read:                 number;
  agent_start:                 number;
  agent_stop:                  number;
  scenario_created:            number;
  // v1.1 additions (Phase A-2 W2-2 — 9-defect fix)
  shutdown_request:            number;
  inbox_delivered:             number;
  stale_state_warning:         number;
  inbox_cleaned:               number;
  subagent_state_validation:   number;
  agent_frontmatter_validated: number;
  // v1.4 additions (Phase A-4 Day 2 — MCP tools batch 3)
  impact_graph_initialized:    number;
  auto_spawn_requested:        number;
  // v1.5 additions (Phase A-5 Wave 1a — pm-retro + pm-learn)
  skill_started:               number;
  skill_completed:             number;
  learning_captured:           number;
  retro_emitted:               number;
  plan_reviewed:               number;
  // v1.6 additions (Phase B3 — Research library governance)
  research_library_refreshed:   number;
  research_library_pruned:      number;
  claude_code_version_checked:  number;
  research_docs_drift_detected: number;
  orphan_event_reconciled:      number;
  chrome_ratio_measured:        number;
  pre_sprint_diff_computed:     number;
  drift_gate_evaluated:         number;
  // v2.0 additions (Phase H2 — 3-agent harness lifecycle)
  harness_agent_spawned:        number;
  sprint_contract_negotiated:   number;
  sprint_contract_bound:        number;
  feedback_loop_opened:         number;
  playwright_scenario_executed: number;
  grading_completed:            number;
  // v2.0.2 — schemas v1.15 D4 fix
  feedback_loop_closed:         number;
  // v2.8.2 — Session 3 Slice 1 (B-15)
  tool_invocation_completed:    number;
  // v2.18.0 — W1 + W2 bundle (schemas v1.23.0)
  planner_output_graded:        number;
  evaluator_strictness_probe:   number;
  // v2.19.0 — W3 Dissent Record (schemas v1.24.0)
  sprint_contract_dissent_preserved: number;
  // v2.20.0 — W4 Context Reset Optional (schemas v1.25.0; declaration-only)
  context_reset_handoff_emitted:     number;
  // v2.21.0 — W5 Component Audit (schemas v1.26.0)
  harness_component_audit_emitted:   number;
  // v2.23.0 Phase 1 — plugin substrate health
  plugin_self_check_completed:       number;
  // v3.2.0 — D2 PreCompact raw snapshot + G3 events_log_rotate
  snapshot_written:                  number;
  event_log_rotated:                 number;
  // v3.13.0 — sprint-006 BackProp loop closure (schemas v1.32.0)
  sprint_completed:                  number;
  failure_mode_synthesized:          number;
  // PR-10 — OntologyWorkflowTrace lifecycle (foamy-giggling-kettle)
  workflow_trace_opened?:            number;
  workflow_trace_transitioned?:      number;
  workflow_trace_closed?:            number;
  workflow_trace_leak_detected?:     number;
  // PR-11 — PreMutationGovernance policy compiler (foamy-giggling-kettle)
  pre_mutation_governance_decided?:  number;
  // v1.36 — sprint-025 W1.8 advisory persistence
  skill_invocation_suggested?:       number;
  events_summarized?:                number;
  // Sprint 97 W1 — DTC governance events
  dtc_fill_turn_advanced?:            number;
  digital_twin_contract_finalized?:   number;
  dtc_grading_completed?:             number;
  dtc_grader_runtime_gap?:            number;
  dtc_eval_refs_bypass_invoked?:      number;
  // Improvement #2 — developer/source-mutation fast-path audit events
  source_mutation_approval_granted?:  number;
  source_mutation_approval_denied?:   number;
  // 7.23.0 — drift_rebind composed RESUME audit event
  drift_rebind_envelope_advanced?:    number;
  // OE-14 / D5-7 — first-class UniversalOntologyEntry status-transition lineage
  universal_ontology_entry_transitioned?: number;
  // v1.92 — second-brain memory-fold governed events (P0.4r)
  resolution_verdict?:                number;
  memory_fold_committed?:             number;
  // 7.36.0 — P3 Lead-decision governed-emit (Path-B)
  lead_decision?:                     number;
  // O-2 — register→commit→materialize→read loop closure. Projection of committed
  // applyRegister* edits into a readable typed-primitive collection (fold-snapshot.ts).
  // FOLD-1 — each bucket entry carries the registered rid PLUS the committed
  // declaration (the edit's projected meaning), not just the bare rid, so the
  // canonical fold is meaning-bearing. `declaration` is OPTIONAL for back-compat
  // with historical / fixture snapshots that only carried rids.
  registeredPrimitives?: {
    objectTypes: RegisteredPrimitiveEntry[];
    linkTypes:   RegisteredPrimitiveEntry[];
    actionTypes: RegisteredPrimitiveEntry[];
    functions:   RegisteredPrimitiveEntry[];
    roles:       RegisteredPrimitiveEntry[];
    properties:  RegisteredPrimitiveEntry[];
  };
  totalEvents:                 number;
  lastSequence:                number;
}

// ─── SnapshotManifest — cache metadata (prim-data-04) ──────────────────────
export interface SnapshotManifest {
  version:          string;
  atSequence:       number;
  generatedAt:      string;
  sourceEventCount: number;
}

// ─── DecisionRecord — the ONE bound D+L+A+S decision (P1-13) ────────────────
//
// GROUNDING (ssot/palantir/ontology/decision-model.md + approval-and-lineage.md):
// the Ontology is decision-centric, and a decision has FOUR components —
// "decision = Data + Logic + Action + Security" IS the commit pipeline:
//   Logic *computes* the staged edit  → Security (submission criteria + the
//   ActionType permission) *gates* it → Action *commits* it to Data.
// Those four already flow through the event log as SEPARATE rows: Logic + the
// staged edit land as `edit_proposed` (functionName + hypotheticalEdits + the
// withWhat.reasoning WHY-narrative); Action + Security + Data land as
// `edit_committed` (actionTypeRid = the verb that gated+committed,
// submissionCriteriaPassed = the Security gate, appliedEdits = the Data). Before
// P1-13 nothing UNITED a proposal with its commit into one record — Logic and
// Action were unlinked.
//
// `DecisionRecord` is that bound record: ONE structure that links the Logic side
// (`edit_proposed`) to the Action side (`edit_committed`) carrying Data +
// Security, so a KG decision can fold its staging + data into a single
// meaning-bearing unit. It is DERIVED (a fold projection over the existing
// append-only event stream — see lib/event-log/read/decision-record.ts), NOT a
// new authoritative source: the events.jsonl rows remain the SSoT and the
// derivation is a pure read. Additive + non-breaking — no existing event/fold
// path is altered.
//
// The four named fields map 1:1 onto the four decision components so the binding
// is legible at the type level (decision-model.md §"The four components"):
//   data     — the nouns that landed / would land (the edit set)
//   logic    — the heuristic that produced the staged edit + its WHY-narrative
//   action   — the verb (ActionType) that committed it + commit provenance
//   security — the actor + the submission-criteria gate that authorized it.

/** LOGIC component — the heuristic/computation that staged the edit (from `edit_proposed`). */
export interface DecisionLogic {
  /** The edit function / binding whose evaluation produced the staged edit. */
  functionName?: string;
  /** WITH_WHAT.reasoning — the first-class WHY-narrative behind the decision (P1-3). */
  reasoning?:    string;
  /** Sequence of the `edit_proposed` row this decision was staged by (absent ⇒ commit-only). */
  proposedSeq?:  number;
}

/** ACTION component — the verb that committed the decision to Data (from `edit_committed`). */
export interface DecisionAction {
  /** The ActionType rid = the sole write-back commit gate (approval-and-lineage.md). */
  actionTypeRid?: string;
  /** True once an `edit_committed` row bound to this decision was observed. */
  committed:      boolean;
  /** Sequence of the `edit_committed` row (absent ⇒ staged-only / proposal-only). */
  committedSeq?:  number;
}

/** SECURITY component — the actor + the gate that authorized the commit. */
export interface DecisionSecurity {
  /** BY_WHOM.identity — the actor (human/agent) whose permissions the commit ran under. */
  actor?:                    string;
  /** Submission-criteria names that PASSED — the Security gate that admitted the commit. */
  submissionCriteriaPassed?: readonly string[];
  /** ATOP_WHICH — the commit-base lineage sha the decision was committed against. */
  atopWhich?:                string;
}

/**
 * The ONE bound decision record uniting Data + Logic + Action + Security
 * (P1-13). Derived by `foldDecisionRecords` from a contiguous event stream;
 * `committed === false` (action.committed) ⇒ the decision is `proposal-only`
 * (staged, not yet admitted through the ActionType gate) per the write-back
 * boundary invariant.
 */
export interface DecisionRecord {
  /** Stable correlation id for this decision (derives from proposed/committed seqs). */
  decisionId: string;
  /** DATA — the edit set (the nouns) the decision lands; committed edits when present, else staged. */
  data:       readonly OntologyEdit[];
  /** LOGIC — the heuristic that staged the edit + its WHY. */
  logic:      DecisionLogic;
  /** ACTION — the verb that committed it (or proposal-only when not yet committed). */
  action:     DecisionAction;
  /** SECURITY — the actor + submission-criteria gate that authorized the commit. */
  security:   DecisionSecurity;
  /** WHEN — ISO timestamp of the binding event (the commit if present, else the proposal). */
  when?:      string;
  /** THROUGH_WHICH.sessionId — the session this decision belongs to. */
  sessionId?: string;
}
