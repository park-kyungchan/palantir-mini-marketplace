/**
 * palantir-mini — Event type registry primitive (prim-data-01 DATA domain)
 *
 * EventEnvelope discriminator registry. This is the schema-side list used by
 * projects that want to build a visitor over the palantir-mini event log.
 *
 * This file is PURE TYPE DECLARATION — no runtime logic. The actual
 * EventEnvelope union lives in palantir-mini/lib/event-log/types.ts.
 */

export const EVENT_TYPE_NAMES = [
  "edit_proposed",
  "edit_committed",
  "submission_criteria_failed",
  "validation_phase_completed",
  "codegen_started",
  "codegen_completed",
  "phase_completed",
  "drift_detected",
  "session_started",
  "session_ended",
  // Runtime lifecycle + memory variants present in palantir-mini/lib/event-log/types.ts
  "task_created",
  "teammate_idle",
  "subagent_stop",
  "post_compact_verified",
  "user_prompt_submitted",
  "memory_write",
  "memory_read",
  "agent_start",
  "agent_stop",
  "shutdown_request",
  "inbox_delivered",
  "stale_state_warning",
  "inbox_cleaned",
  "subagent_state_validation",
  "agent_frontmatter_validated",
  "impact_graph_initialized",
  "auto_spawn_requested",
  "skill_started",
  "skill_completed",
  "learning_captured",
  "retro_emitted",
  "plan_reviewed",
  "scenario_created",
  "doc_drift_detected",
  "session_resumed",
  "research_library_refreshed",
  "research_library_pruned",
  "claude_code_version_checked",
  "research_docs_drift_detected",
  "orphan_event_reconciled",
  "chrome_ratio_measured",
  "pre_sprint_diff_computed",
  "drift_gate_evaluated",
  "semantic_manifest_refreshed",
  "semantic_change_plan_emitted",
  "semantic_drift_audited",
  // v1.14 harness events (6) — Prithvi Rajasekaran 3-agent harness lifecycle
  "harness_agent_spawned",
  "sprint_contract_negotiated",
  "sprint_contract_bound",
  "feedback_loop_opened",
  "playwright_scenario_executed",
  "grading_completed",
  // v1.15 — D4 fix: split feedback_loop close from open for cleaner Decision Lineage
  "feedback_loop_closed",
  // v1.16 retire/deprecate/ultrareview lifecycle events — palantir-mini v2.1.0 tombstone substrate
  // v1.23 W1 + W2 — Planner output meta-rubric + Evaluator strictness probe (palantir-mini v2.18.0 bundle)
  "planner_output_graded",
  "evaluator_strictness_probe",
  // v1.24 W3 — Dissent record preservation (palantir-mini v2.19.0)
  "sprint_contract_dissent_preserved",
  // v1.25 W4 — Context reset optional hook (palantir-mini v2.20.0; declaration-only)
  "context_reset_handoff_emitted",
  // v1.26 W5 — Component audit (palantir-mini v2.21.0)
  "harness_component_audit_emitted",
  // v1.28 — palantir-mini v3.2.0 substrate-integrity bundle
  "snapshot_written",
  "event_log_rotated",
  "tool_invocation_completed",
  "plugin_self_check_completed",
  "sprint_completed",
  "failure_mode_synthesized",
  "events_summarized",
  // OE-14 / D5-7 — first-class UniversalOntologyEntry status-transition lineage
  // (was piggybacked on phase_completed; now a typed discriminator).
  "universal_ontology_entry_transitioned",
  // v1.92 — second-brain memory-fold governed event types (P0.4r)
  "resolution_verdict",
  "memory_fold_committed",
  // 7.36.0 — P3 Lead-decision governed-emit (Path-B); clean separation from fold output.
  "lead_decision",
  // Sprint-cartography W1 — vocabulary/union drift closure: 14 typed EventEnvelope
  // variants existed in lib/event-log/types.ts with real emit sites but had never been
  // added to this canonical vocabulary list. Promoted here to close the reverse-direction
  // drift gap found by the bidirectional compile-time assertion in
  // lib/event-log/vocabulary-assertions.ts.
  "dtc_fill_turn_advanced",
  "digital_twin_contract_finalized",
  "dtc_grading_completed",
  "dtc_grader_runtime_gap",
  "dtc_eval_refs_bypass_invoked",
  "source_mutation_approval_granted",
  "source_mutation_approval_denied",
  "drift_rebind_envelope_advanced",
  "workflow_trace_opened",
  "workflow_trace_transitioned",
  "workflow_trace_closed",
  "workflow_trace_leak_detected",
  "pre_mutation_governance_decided",
  "skill_invocation_suggested",
  // v1.96 — P1 unification S2: home-cartography g12 decision-ledger mirror. A row of
  // governance/cartography-decisions.jsonl (the home tree's append-only DecisionEvent
  // ledger, which stays the substrate of record per c42 — never rewritten) mirrored
  // into events.jsonl as a graded pm envelope, via live-emit (emit-cli Path-B) or the
  // idempotent backfill keyed on payload.sourceEventId.
  "cartography_decision_mirrored",
  // pm authorization-flexibility slice 3 — G-DSN-E structured grant issuance. A
  // caller-supplied userApprovalQuote/promptId/promptHash was re-verified against
  // the hook-captured PromptEnvelope (fail-closed, unforgeable) and a SESSION-scoped
  // delivery-authorization grant (30-min TTL) was minted by pm_authorize_delivery.
  "delivery_authorization_granted",
] as const;

export type EventTypeName = typeof EVENT_TYPE_NAMES[number];

export interface EventTypeDeclaration {
  readonly name: EventTypeName;
  readonly description: string;
  /** Which domain is this event primarily associated with */
  readonly primaryDomain: "data" | "logic" | "action" | "security" | "learn";
}

export const EVENT_TYPE_REGISTRY: Readonly<Record<EventTypeName, EventTypeDeclaration>> = Object.freeze({
  edit_proposed: {
    name: "edit_proposed",
    description: "An EditFunction returned hypothetical OntologyEdit[] without committing.",
    primaryDomain: "logic",
  },
  edit_committed: {
    name: "edit_committed",
    description: "AtomicCommit applied edits to ontology state via submission criteria pre-flight.",
    primaryDomain: "action",
  },
  submission_criteria_failed: {
    name: "submission_criteria_failed",
    description: "A commit was rejected because one or more submission criteria failed.",
    primaryDomain: "security",
  },
  validation_phase_completed: {
    name: "validation_phase_completed",
    description: "A validation phase (design/compile/runtime/post_write) finished with a verdict.",
    primaryDomain: "logic",
  },
  codegen_started: {
    name: "codegen_started",
    description: "A descender regeneration run started.",
    primaryDomain: "action",
  },
  codegen_completed: {
    name: "codegen_completed",
    description: "A descender regeneration run finished with a list of generated files.",
    primaryDomain: "action",
  },
  phase_completed: {
    name: "phase_completed",
    description: "A task or workflow phase was marked complete.",
    primaryDomain: "learn",
  },
  drift_detected: {
    name: "drift_detected",
    description: "A drift signal (schema_mismatch / stale_codegen / orphan_reference) was surfaced.",
    primaryDomain: "learn",
  },
  session_started: {
    name: "session_started",
    description: "A new Claude session opened for this project.",
    primaryDomain: "learn",
  },
  session_ended: {
    name: "session_ended",
    description: "A Claude session ended (clear / logout / compact / other).",
    primaryDomain: "learn",
  },
  task_created: {
    name: "task_created",
    description: "A task was created in the agent workflow and assigned a task id for later completion and replay.",
    primaryDomain: "learn",
  },
  teammate_idle: {
    name: "teammate_idle",
    description: "A teammate agent reached an idle threshold and may require orchestration attention.",
    primaryDomain: "learn",
  },
  subagent_stop: {
    name: "subagent_stop",
    description: "A subagent process stopped. Payload records agent id and optional exit or reason metadata.",
    primaryDomain: "learn",
  },
  post_compact_verified: {
    name: "post_compact_verified",
    description: "A post-compaction verification pass checked event count, last sequence, and invariants.",
    primaryDomain: "learn",
  },
  user_prompt_submitted: {
    name: "user_prompt_submitted",
    description: "A user prompt was submitted and recorded as workflow input metadata.",
    primaryDomain: "learn",
  },
  memory_write: {
    name: "memory_write",
    description: "A runtime memory write occurred and was recorded for replay/audit.",
    primaryDomain: "learn",
  },
  memory_read: {
    name: "memory_read",
    description: "A runtime memory read occurred and was recorded for replay/audit.",
    primaryDomain: "learn",
  },
  agent_start: {
    name: "agent_start",
    description: "An agent started work on a task or session.",
    primaryDomain: "learn",
  },
  agent_stop: {
    name: "agent_stop",
    description: "An agent stopped work, optionally with exit code or stop reason.",
    primaryDomain: "learn",
  },
  shutdown_request: {
    name: "shutdown_request",
    description: "A shutdown request was issued for an agent or workflow surface.",
    primaryDomain: "action",
  },
  inbox_delivered: {
    name: "inbox_delivered",
    description: "A message or work item was delivered through the palantir-mini inbox substrate.",
    primaryDomain: "learn",
  },
  stale_state_warning: {
    name: "stale_state_warning",
    description: "A stale state condition was detected and surfaced as an advisory lineage event.",
    primaryDomain: "learn",
  },
  inbox_cleaned: {
    name: "inbox_cleaned",
    description: "The palantir-mini inbox substrate was cleaned or compacted.",
    primaryDomain: "action",
  },
  subagent_state_validation: {
    name: "subagent_state_validation",
    description: "A subagent state validation pass completed and recorded the result.",
    primaryDomain: "learn",
  },
  agent_frontmatter_validated: {
    name: "agent_frontmatter_validated",
    description: "Agent frontmatter validation scanned agent files and recorded conformance counts.",
    primaryDomain: "logic",
  },
  impact_graph_initialized: {
    name: "impact_graph_initialized",
    description: "The impact graph substrate was initialized for a project root and backing database path.",
    primaryDomain: "learn",
  },
  auto_spawn_requested: {
    name: "auto_spawn_requested",
    description: "A replacement-spawn request was logged for a terminated teammate with unfinished tasks.",
    primaryDomain: "action",
  },
  skill_started: {
    name: "skill_started",
    description: "A palantir-mini skill invocation started and recorded the skill name.",
    primaryDomain: "learn",
  },
  skill_completed: {
    name: "skill_completed",
    description: "A palantir-mini skill invocation completed with duration and outcome.",
    primaryDomain: "learn",
  },
  learning_captured: {
    name: "learning_captured",
    description: "A cross-session learning was captured with topic, content, confidence, and optional source.",
    primaryDomain: "learn",
  },
  retro_emitted: {
    name: "retro_emitted",
    description: "A retrospective summary was emitted for a session window.",
    primaryDomain: "learn",
  },
  plan_reviewed: {
    name: "plan_reviewed",
    description: "A plan artifact was reviewed by a reviewer agent and approved or rejected.",
    primaryDomain: "learn",
  },
  scenario_created: {
    name: "scenario_created",
    description: "A ScenarioSandbox was spawned for isolated what-if analysis.",
    primaryDomain: "learn",
  },
  doc_drift_detected: {
    name: "doc_drift_detected",
    description: "detect-doc-drift found a stale reference (missing file, wrong version, dead symbol) in a tracked document.",
    primaryDomain: "learn",
  },
  session_resumed: {
    name: "session_resumed",
    description: "A session was resumed from an events.jsonl checkpoint (last_session_rid + last_sequence restored). Local mirror of Managed Agents durable Session resume.",
    primaryDomain: "learn",
  },
  research_library_refreshed: {
    name: "research_library_refreshed",
    description: "research_library_refresh MCP tool re-fetched upstream docs (palantir-foundry sitemap / Claude Code release notes) and reconciled local ~/.claude/research/ with added/removed/changed URL sets.",
    primaryDomain: "learn",
  },
  research_library_pruned: {
    name: "research_library_pruned",
    description: "research_library_prune MCP tool archived stale interpretation files (age-based or citation-based) to _archive/ under palantir-vision/.",
    primaryDomain: "learn",
  },
  claude_code_version_checked: {
    name: "claude_code_version_checked",
    description: "claude_code_version_delta MCP tool fetched Anthropic release notes and surfaced new features / deprecations / breaking changes requiring research-doc updates.",
    primaryDomain: "learn",
  },
  research_docs_drift_detected: {
    name: "research_docs_drift_detected",
    description: "Drift signal raised against ~/.claude/research/ — a tracked BROWSE/INDEX/MEMORY entry references a doc that was refreshed, pruned, or rendered stale by upstream change.",
    primaryDomain: "learn",
  },
  orphan_event_reconciled: {
    name: "orphan_event_reconciled",
    description: "An orphan event (emitted without a matching ontology-registered primitive) was reconciled post-hoc — either by registering the missing primitive or by archiving the orphan event with a documented rationale.",
    primaryDomain: "learn",
  },
  chrome_ratio_measured: {
    name: "chrome_ratio_measured",
    description: "chrome_ratio_measure MCP tool measured how much of a surface's viewport was occupied by chrome versus canvas/content, with geometry breakdown metadata for audit.",
    primaryDomain: "learn",
  },
  pre_sprint_diff_computed: {
    name: "pre_sprint_diff_computed",
    description: "pre_sprint_diff MCP tool compared base...head, converted changed files into file:RIDs, and expanded forward impact to downstream consumers before sprint merge.",
    primaryDomain: "learn",
  },
  drift_gate_evaluated: {
    name: "drift_gate_evaluated",
    description: "gate_on_drift MCP tool ran the pre-iteration drift gate (ontology:drift + lint:fonts) and recorded whether the next harness iteration could proceed.",
    primaryDomain: "learn",
  },
  semantic_manifest_refreshed: {
    name: "semantic_manifest_refreshed",
    description: "Per-project semantic graph manifest persisted to <project>/.palantir-mini/semantic-manifest.json. Emitted by palantir-mini/lib/semantic-graph/manifest-writer.ts after all producers run.",
    primaryDomain: "learn",
  },
  semantic_change_plan_emitted: {
    name: "semantic_change_plan_emitted",
    description: "semantic_change_plan MCP handler returned a plan to a caller. Payload includes the affected semantic RID count, the confidence score, and the number of uncertainties flagged.",
    primaryDomain: "learn",
  },
  semantic_drift_audited: {
    name: "semantic_drift_audited",
    description: "semantic_drift_audit MCP handler returned a graph-integrity audit. Payload: audited RID count, remediation hint count, orthogonal to runtime gate_on_drift.",
    primaryDomain: "learn",
  },
  // v1.14 harness lifecycle events — Prithvi Rajasekaran 3-agent harness
  harness_agent_spawned: {
    name: "harness_agent_spawned",
    description: "A HarnessAgent (planner/generator/evaluator/orchestrator/grader_*) was spawned with a role binding to a sprint or feedback loop. Records role, phase, modelRef, and tool allowlist for audit.",
    primaryDomain: "learn",
  },
  sprint_contract_negotiated: {
    name: "sprint_contract_negotiated",
    description: "Generator and Evaluator exchanged a proposal/counter-proposal during SprintContract negotiation. Recorded per round to track convergence. File-based IPC in .palantir-mini/harness/sprints/*/contract-negotiation.md.",
    primaryDomain: "action",
  },
  sprint_contract_bound: {
    name: "sprint_contract_bound",
    description: "A SprintContract transitioned from 'negotiating' to 'bound' status. From this point the contract is frozen — modifications require a new contract (version bump).",
    primaryDomain: "action",
  },
  feedback_loop_opened: {
    name: "feedback_loop_opened",
    description: "A FeedbackLoop was opened for a bound SprintContract, binding a Generator and Evaluator pair. Tracks iterationCount=0 at open; subsequent iterations append feedback artifacts until termination.",
    primaryDomain: "logic",
  },
  playwright_scenario_executed: {
    name: "playwright_scenario_executed",
    description: "A PlaywrightScenario was executed by the Evaluator against a running application via mcp__playwright__* or mcp__claude-in-chrome__* MCP. Captures evidence (screenshots/logs/network) per EvidenceCaptureSpec.",
    primaryDomain: "learn",
  },
  grading_completed: {
    name: "grading_completed",
    description: "Evaluator finished scoring artifacts against a GradingRubric (ordered Set<GradingCriterion>). Emits weighted score, per-criterion scores, and hard-threshold pass/fail verdict. Consumed by FeedbackLoop orchestrator to decide next state.",
    primaryDomain: "learn",
  },
  // v1.15 lifecycle event — D4 fix from H3 retrospective (harness-h3-retrospective.md)
  feedback_loop_closed: {
    name: "feedback_loop_closed",
    description: "A FeedbackLoop transitioned to terminal state (passed/failed/aborted). Replaces the v1.14 pattern of overloading feedback_loop_opened with payload.transition='close'. Cleaner Decision Lineage: 'when did this loop open' = filter by feedback_loop_opened; 'when did it close' = feedback_loop_closed. During v1.15 deprecation window, both variants are accepted by consumers; producers SHOULD emit feedback_loop_closed.",
    primaryDomain: "logic",
  },
  // v1.16 retire/deprecate/ultrareview lifecycle — palantir-mini v2.1.0 substrate
  // v1.23 — W1 Planner output meta-rubric (palantir-mini v2.18.0)
  planner_output_graded: {
    name: "planner_output_graded",
    description: "harness-planner spec.md + eval-rubric.md scored by grade_planner_output handler against a 3-axis meta-rubric (featureCount, designSpecificity, antiPatternCount). Verdict = pass | warn | block. Closes Part 2 Gap 4 — previously only Generator artifacts were rubric-scored, giving Planner drift room to produce safe under-scoped specs. Emitted once per planner invocation during pm-harness-plan execution.",
    primaryDomain: "learn",
  },
  // v1.23 — W2 Evaluator strictness probe (palantir-mini v2.18.0)
  evaluator_strictness_probe: {
    name: "evaluator_strictness_probe",
    description: "Per-criterion probe emitted during grade_outcome_with_rubric. Payload captures { sprintNumber, iteration, criterionHash (SHA256(criterionId + scoringPrompt)), score, evidenceCitationCount, failureClassCount }. pm_harness_strictness_audit MCP reads these to detect drift — same criterion showing rising score trend without matching drop in failureClassCount = drift-suspected. Closes Part 2 Gap 3 — previously no mechanism to measure iteration-over-iteration evaluator strictness decay.",
    primaryDomain: "learn",
  },
  // v1.24 — W3 Dissent record (palantir-mini v2.19.0)
  sprint_contract_dissent_preserved: {
    name: "sprint_contract_dissent_preserved",
    description: "Emitted by negotiate_sprint_contract at bind time when SprintContract.negotiationHistory contains at least one entry with acceptedInFinal=false. Payload captures { contractId, sprintNumber, disputedRounds: NegotiationHistoryRound[], totalRounds }. harness-analyzer consults the audit trail to correlate post-sprint failures with rejected proposals from negotiation. Closes Part 2 Gap 5 — previously disagreementResolution policy existed but left zero audit trail.",
    primaryDomain: "learn",
  },
  // v1.25 — W4 Context reset optional hook (palantir-mini v2.20.0; declaration-only)
  context_reset_handoff_emitted: {
    name: "context_reset_handoff_emitted",
    description: "Emitted by pm-harness-sprint when SprintContract.iterationResetPolicy='auto' triggers a Generator re-spawn at an iteration boundary. Payload captures { sprintNumber, fromIteration, toIteration, handoffBytes, handoffFiles: string[] }. v2.20.0 ships the schema + field declaration only; runtime implementation deferred pending W5 component audit evidence (per Rajasekaran blog: Opus 4.5+ largely removed context anxiety, so field-only addition may remain unused in practice). Closes Part 2 Gap 2 at minimum-viable scope.",
    primaryDomain: "learn",
  },
  // v1.26 — W5 Component audit (palantir-mini v2.21.0)
  harness_component_audit_emitted: {
    name: "harness_component_audit_emitted",
    description: "Emitted by pm_harness_component_audit handler after running a canary comparison between a HarnessComponent's full behavior and its simpleVariant on the same rubric. Payload captures { componentId, verdict (load-bearing | remove-candidate | needs-rework), scoreDelta, rationale, baselineRubricRid, canaryArtifacts }. harness-analyzer consults the stream to decide which components become remove-candidates for the next MAJOR bump. Closes Part 2 Gap 1 — 'every component in a harness encodes an assumption … worth stress testing' (Rajasekaran blog §1).",
    primaryDomain: "learn",
  },
  // v1.28 — palantir-mini v3.2.0 substrate-integrity bundle
  snapshot_written: {
    name: "snapshot_written",
    description: "Emitted by pre-compact-state hook after copying live events.jsonl to <projectRoot>/.palantir-mini/session/snapshots/events-<ISO>.jsonl. Fulfills rule 10 §PreCompact gate guarantee ('Snapshots events.jsonl so long sessions lose no events') which was unimplemented before v3.2.0. Payload captures { path, sizeBytes, atSequence }. Retention policy bounds growth (last keepCount OR within maxAgeMs, whichever larger). Closes v3.1.0 handoff §7.1 D2.",
    primaryDomain: "data",
  },
  event_log_rotated: {
    name: "event_log_rotated",
    description: "Emitted by events_log_rotate MCP handler immediately into the FRESH events.jsonl after renaming the breached log to <sessionDir>/archive/events-rotated-<ISO>.jsonl. Payload captures { archivedPath, sizeBytes, lineCount, thresholdBytes, thresholdLines }. Threshold defaults to 10 MB OR 10K lines. Readers (replay-lineage / pm-retro-query / pm-recap) auto-merge archive/ via lib/event-log/read.ts:readEvents. Closes v3.1.0 handoff §7.2 G3.",
    primaryDomain: "data",
  },
  tool_invocation_completed: {
    name: "tool_invocation_completed",
    description: "An MCP handler invocation completed, recording tool name, duration, success, and optional error class for observability.",
    primaryDomain: "learn",
  },
  plugin_self_check_completed: {
    name: "plugin_self_check_completed",
    description: "palantir-mini self-check completed and recorded substrate health summary data.",
    primaryDomain: "learn",
  },
  sprint_completed: {
    name: "sprint_completed",
    description: "A bounded sprint completed and recorded final status for BackProp and retrospective analysis.",
    primaryDomain: "learn",
  },
  failure_mode_synthesized: {
    name: "failure_mode_synthesized",
    description: "A harness analyzer synthesized a failure category, root-cause hypothesis, and smallest suggested patch.",
    primaryDomain: "learn",
  },
  events_summarized: {
    name: "events_summarized",
    description: "Compactor summary envelope replacing N consecutive same-type low-value events (canonical plan v2 §4 row 4.3; rule 10 append-only). Payload: { summarizedType, count, firstSeq, lastSeq, firstAt, lastAt, sampledPayloads, threshold }.",
    primaryDomain: "data",
  },
  universal_ontology_entry_transitioned: {
    name: "universal_ontology_entry_transitioned",
    description: "A UniversalOntologyEntry advanced its lifecycle status (e.g. context-retrieved → semantic-approved → registered). First-class typed lineage (OE-14 / D5-7) replacing the prior phase_completed piggyback. Payload: { entryRef, fromStatus, toStatus, isNoOp }.",
    primaryDomain: "learn",
  },
  // v1.92 — second-brain memory-fold governed event types (P0.4r)
  resolution_verdict: {
    name: "resolution_verdict",
    description: "The session-end memory fold recorded an entity-resolution verdict (ADD/UPDATE/DELETE/NONE) for a Layer-2 graph mutation as an immutable Layer-1 audit event. Emitted via the gated emit_event MCP path (rule 27). Payload: { verdict, targetId?, derivedFrom? }.",
    primaryDomain: "learn",
  },
  memory_fold_committed: {
    name: "memory_fold_committed",
    description: "The session-end memory fold committed a derived Layer-2 graph.json projection (node/edge counts) for a session. Advisory, non-gating; emitted via the gated emit_event MCP path (rule 27). Payload: { graphPath, nodeCount, edgeCount, sessionId, fromStatus?, toStatus?, totalBatches?, foldedAt?, byWhom?, engineVersion? } — the fromStatus/toStatus/totalBatches/foldedAt/byWhom/engineVersion fields are W3 additive audit fields carrying the manifest.json.foldedSessions status transition + completing identity; all optional, back-compat with pre-W3 rows.",
    primaryDomain: "learn",
  },
  // 7.36.0 — P3 Lead-decision governed-emit (Path-B). A Lead orchestration
  // verdict (delegate / pick approach / refine hypothesis) landed into events.jsonl
  // via the in-process scripts/log.ts emit() (Path B), NOT the altitude-2-hidden MCP
  // emit_event tool. Distinct type from the fold's resolution_verdict so the Lead's
  // decisions stay cleanly separable from fold output. Grades ≥T2 (T3 when it carries
  // withWhat.refinementTarget). Payload: { decision }.
  lead_decision: {
    name: "lead_decision",
    description: "A Lead orchestration decision (e.g. delegate to a subagent / pick an approach / refine a hypothesis) recorded as a governed Layer-1 audit event via the in-process Path-B emit() (the MCP emit_event tool is hidden under the altitude-2 profile). Carries withWhat.reasoning + withWhat.refinementTarget + memoryLayers so it grades ≥T2 (T3 with refinementTarget), and surfaces NEXT session via the a2-prior fold-verdict BY-TYPE branch. Payload: { decision }.",
    primaryDomain: "learn",
  },
  // Sprint-cartography W1 — vocabulary/union drift closure (14 typed variants promoted
  // from lib/event-log/types.ts; see EVENT_TYPE_NAMES tail comment above).
  dtc_fill_turn_advanced: {
    name: "dtc_fill_turn_advanced",
    description: "Sprint 97 W1 DTC governance — a Digital Twin Contract fill turn advanced (dtcStep + advancedField). Payload: { dtcStep, advancedField, capturedRefs?, promptId? }.",
    primaryDomain: "logic",
  },
  digital_twin_contract_finalized: {
    name: "digital_twin_contract_finalized",
    description: "Sprint 97 W1 DTC governance — a Digital Twin Contract reached a terminal T6 verdict (dtc-filled / dtc-rejected / dtc-aborted). Payload: { dtcRef, verdict, fillTurnCount, sessionId? }.",
    primaryDomain: "action",
  },
  dtc_grading_completed: {
    name: "dtc_grading_completed",
    description: "Sprint 97 W1 DTC governance — a DTC finished rubric grading with an overall pass/fail/partial verdict and score. Payload: { dtcRef, verdict, score, criteriaCount, sprintRef? }.",
    primaryDomain: "learn",
  },
  dtc_grader_runtime_gap: {
    name: "dtc_grader_runtime_gap",
    description: "Sprint 97 W1 DTC governance — a DTC grader criterion could not be dispatched under the current runtime (e.g. Codex cannot dispatch model/simulator criteria) and was skipped or fell back. Payload: { criterionId?, skippedCriteria?, runtime, reason?, fallback?, rubricId?, projectPath?, promptId?, sessionId? }.",
    primaryDomain: "learn",
  },
  dtc_eval_refs_bypass_invoked: {
    name: "dtc_eval_refs_bypass_invoked",
    description: "Sprint 97 W1 DTC governance — an eval-refs bypass envvar was invoked to skip DTC evaluation reference checks. Audit precedent for the fast-path grant/denial pair below. Payload: { bypassEnvVar, context, bypassedRefs? }.",
    primaryDomain: "security",
  },
  source_mutation_approval_granted: {
    name: "source_mutation_approval_granted",
    description: "Improvement #2 — a minted, LLM-unforgeable user-approval fast-path GRANT (identity=\"user\") authorizing a scoped, single-use, short-TTL source edit in lieu of the SIC/DTC ceremony. Payload: { approvalRef, approvedSourcePaths, promptId, promptHash, userQuoteHash, runtime? }.",
    primaryDomain: "security",
  },
  source_mutation_approval_denied: {
    name: "source_mutation_approval_denied",
    description: "Improvement #2 — the fast-path approval verification failed at mint-time (no record written to the approval ledger; only this denial audit event is recorded). Payload: { invalidReason, promptId?, approvedSourcePaths? }.",
    primaryDomain: "security",
  },
  drift_rebind_envelope_advanced: {
    name: "drift_rebind_envelope_advanced",
    description: "7.23.0 — a persisted, minted, approved SIC + DTC pair was re-bound to the CURRENT prompt envelope (a legitimate RESUME copying the minted approvalRefs forward; never mints, never bypasses). Payload: { promptId, promptHash, semanticIntentContractRef, digitalTwinChangeContractRef, approvedSicContractId, runtime? }.",
    primaryDomain: "security",
  },
  workflow_trace_opened: {
    name: "workflow_trace_opened",
    description: "PR-10 OntologyWorkflowTrace lifecycle — a workflow trace was opened for a mode. Payload: { traceId, mode, refs }.",
    primaryDomain: "learn",
  },
  workflow_trace_transitioned: {
    name: "workflow_trace_transitioned",
    description: "PR-10 OntologyWorkflowTrace lifecycle — a workflow trace transitioned between modes. Payload: { traceId, fromMode, toMode, refs }.",
    primaryDomain: "learn",
  },
  workflow_trace_closed: {
    name: "workflow_trace_closed",
    description: "PR-10 OntologyWorkflowTrace lifecycle — a workflow trace closed with a terminal outcome (passed/failed/aborted). Payload: { traceId, mode, outcome, refs }.",
    primaryDomain: "learn",
  },
  workflow_trace_leak_detected: {
    name: "workflow_trace_leak_detected",
    description: "PR-10 OntologyWorkflowTrace lifecycle — a workflow trace was detected as leaked (stale, past its expected close). Payload: { traceId, mode, lastEvent, updatedAt, ageMs }.",
    primaryDomain: "learn",
  },
  pre_mutation_governance_decided: {
    name: "pre_mutation_governance_decided",
    description: "PR-11 PreMutationGovernance policy compiler — a mutation-gating decision was recorded (allowed/denied + rule applied + refs). Payload: { decisionId, toolName, targetFiles, allowed, reason, ruleApplied, refs }.",
    primaryDomain: "security",
  },
  skill_invocation_suggested: {
    name: "skill_invocation_suggested",
    description: "v1.36 / sprint-025 / W1.8 — a hook emitted a persisted advisory recommending a /palantir-mini:pm-* skill invocation. Payload: { suggestedSkillSlug, suggestedByHook, triggerCondition, suggestionContext? }.",
    primaryDomain: "learn",
  },
  // v1.96 — P1 unification S2: home-cartography g12 decision-ledger mirror.
  cartography_decision_mirrored: {
    name: "cartography_decision_mirrored",
    description: "v1.96 / P1 unification S2 — a home-cartography g12 DecisionEvent (governance/cartography-decisions.jsonl row) was mirrored into events.jsonl as a graded pm envelope. The g12 ledger stays the substrate of record (c42 — append-only, never rewritten); this typed mirror joins the pm Decision-Lineage substrate for grading/promotion/replay. The envelope's own atopWhich stays CommitSha; the source row's path-array rides in payload.sourceAtopWhich. Payload: { sourceEventId, sourceLedger, sourceAtopWhich, decision, reasoning, expectedOutcome, memoryLayers, standing?, supersedes?, pairs?, intent?, outcomeRef?, mirroredBy: 'live-emit'|'backfill' }.",
    primaryDomain: "learn",
  },
  delivery_authorization_granted: {
    name: "delivery_authorization_granted",
    description: "pm authorization-flexibility slice 3 (G-DSN-E) — a SESSION-scoped delivery-authorization grant (30-min TTL) was minted by the pm_authorize_delivery MCP tool after re-verifying a caller-supplied userApprovalQuote/promptId/promptHash against the hook-captured PromptEnvelope (verifyDeliveryApprovalAgainstEnvelope, fail-closed, unforgeable). No event is emitted on a failed verification. Payload: { grantId, scope, sessionId, projectRoot, promptId, promptHash, issuedAt, expiresAt }.",
    primaryDomain: "security",
  },
});
