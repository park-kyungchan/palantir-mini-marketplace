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
export type EventId   = string & { readonly __brand: "EventId" };
export type SessionId = string & { readonly __brand: "SessionId" };
export type CommitSha = string & { readonly __brand: "CommitSha" };

export const eventId   = (s: string): EventId   => s as EventId;
export const sessionId = (s: string): SessionId => s as SessionId;
export const commitSha = (s: string): CommitSha => s as CommitSha;

// ─── v1.35.0 valuable-data substrate imports (rule 26) ────────────────────
import type { ValueGrade } from "#schemas/ontology/primitives/value-grade";
import type { AgenticMemoryLayer } from "#schemas/ontology/primitives/agentic-memory-layer";
import type { LineageRefs } from "#schemas/ontology/primitives/lineage-refs";
import type { RefinementTarget } from "#schemas/ontology/primitives/refinement-target";

// ─── Decision Lineage 5 dimensions (prim-learn-02, v1.35.0 extended) ─────
export interface EventEnvelopeBase {
  eventId:  EventId;
  /** WHEN — ISO8601 */
  when:     string;
  /** ATOP_WHICH — git HEAD SHA at time of emit */
  atopWhich: CommitSha;
  /** THROUGH_WHICH — session / tool / cwd context */
  throughWhich: {
    sessionId: SessionId;
    toolName:  string;
    cwd:       string;
    /** v1.35.0+ Optional UI/system surface tag (e.g. "workshop", "cli", "mcp"). */
    surface?:  string;
  };
  /**
   * BY_WHOM — identity of the emitter (v1.35.0 extended with provider-neutral
   * fields per rule 26 §Axis D1; LLMI-02 provider-neutral runtime contract).
   */
  byWhom: {
    identity:   "claude-code" | "codex" | "gemini" | "user" | "monitor" | "test-agent" | "unknown";
    agentName?: string;
    teamName?:  string;
    /** v1.35.0+ Normalized model name (e.g. "claude-opus-4-7", "gpt-5.4"). */
    model?:     string;
    /** v1.35.0+ Provider tag (e.g. "anthropic", "openai", "xai", "google"). */
    provider?:  string;
    /** v1.35.0+ Interface family (e.g. "messages", "responses", "vertex"). */
    interfaceFamily?: string;
    /** v1.35.0+ Runtime tag (e.g. "claude-code", "codex", "gemini"). */
    runtime?:   string;
  };
  /**
   * WITH_WHAT — optional reasoning / hypothesis / refinement target / memory
   * layers (v1.35.0 extended per rule 26 §Axes C2 + E).
   */
  withWhat?: {
    reasoning?:  string;
    hypothesis?: string;
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
  /** Monotonic counter — serves as optimistic version for concurrent writes */
  sequence: number;
  /**
   * PROPAGATION_DEPTH — W6 FwdProp/BwdProp chain depth (0=research touch,
   * 1=schema, 2=shared-core, 3=project ontology, 4=contracts, 5=runtime).
   * Optional; backward-compat.
   */
  propagationDepth?: number;
  /**
   * v1.35.0+ Axis A3 — typed cross-references (actionRid / dryRunRef /
   * outcomePairId / evidenceUrls / playgroundSandboxId). Replaces free-form
   * `withWhat.reasoning` pointers per rule 26 §Axis A3.
   */
  lineageRefs?: LineageRefs;
  /**
   * v1.35.0+ Substrate-routing grade (T0..T4) per rule 26 §Grading. Auto-
   * assigned by `value-grade-assigner` hook (PreToolUse on emit_event).
   * T0 envelopes are rejected at emit. Optional during 1-sprint migration
   * window; mandatory once value-grade-assigner is live.
   */
  valueGrade?: ValueGrade;
}

// ─── Ontology edit payload (placeholder until lib/actions defines it) ───────
// v0: a minimal OntologyEdit shape — the 3 edit classes from OSDK 2.0.
export type OntologyEdit =
  | { kind: "object"; rid: string; properties: Record<string, unknown> }
  | { kind: "link";   rid: string; srcRid: string; dstRid: string; linkName: string }
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
    model:  string;
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
    /** Canonical skill slug, e.g. "pm-recap" / "pm-value-audit" / "pm-decision-replay". */
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
 *
 * DEPRECATED FIELDS (v1.15, removal in v1.16):
 *   - `transition` — use event type (feedback_loop_opened vs feedback_loop_closed).
 *   - `verdict` — on close only; moved to FeedbackLoopClosedEnvelope.
 *   - `terminationCondition` — on close only; moved to FeedbackLoopClosedEnvelope.
 *   - `iterationCount` — on close only; moved to FeedbackLoopClosedEnvelope.
 *
 * Fields are retained for one MINOR cycle so consumers that still read the
 * v1.14 close-overload pattern keep compiling. Emitters should stop writing
 * them as of v1.15 (close handler now emits feedback_loop_closed).
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
    // v3.2.0 N1 retention: still consumed by bridge/handlers/pm-harness-outcome-replay.ts
    // for legacy event reads. v1.16 removal blocked on consumer refactor.
    /** @deprecated v1.15 — use event type feedback_loop_closed for close transitions. Removal blocked on pm-harness-outcome-replay refactor. */
    transition?:           "open" | "close";
    /** @deprecated v1.15 — moved to FeedbackLoopClosedEnvelope.payload.verdict. Removal blocked on pm-harness-outcome-replay refactor. */
    verdict?:              "passed" | "failed" | "aborted";
    /** @deprecated v1.15 — moved to FeedbackLoopClosedEnvelope.payload.terminationCondition. Removal blocked on pm-harness-outcome-replay refactor. */
    terminationCondition?: {
      type:                "threshold_met" | "iteration_exhausted" | "timeout" | "abort" | "error";
      rationale:           string;
      terminatedAt:        string;
      finalScore?:         number;
      failedCriterionRid?: string;
    };
    /** @deprecated v1.15 — moved to FeedbackLoopClosedEnvelope.payload.iterationCount. Removal blocked on pm-harness-outcome-replay refactor. */
    iterationCount?:       number;
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
// Emitted by grade_planner_output handler after scoring harness-planner's
// spec.md against featureCount + designSpecificity + antiPatternCount.
// Consumed by pm-harness-plan skill — verdict="block" alerts Lead.

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
// Declaration-only this release. Will be emitted by pm-harness-sprint when
// SprintContract.iterationResetPolicy="auto" triggers a fresh Generator
// spawn at an iteration boundary. Runtime impl deferred pending W5 audit.

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
  | DtcEvalRefsBypassInvokedEnvelope;

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

// ─── Snapshot type produced by foldToSnapshot (prim-data-04 SnapshotManifest) ─
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
