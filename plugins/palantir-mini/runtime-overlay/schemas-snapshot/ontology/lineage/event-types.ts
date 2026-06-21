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
  "session_drift_check_completed",
  "impact_graph_initialized",
  "auto_spawn_requested",
  "skill_started",
  "skill_completed",
  "learning_captured",
  "retro_emitted",
  "plan_reviewed",
  "ontology_registered",
  "capability_token_issued",
  "schema_locked",
  "scenario_created",
  "pr_body_generated",
  "session_complete",
  "doc_drift_detected",
  "refinement_proposed",
  "review_decision",
  "impact_edge_registered",
  "outcome_evaluated",
  "edits_computed_dry_run",
  "session_resumed",
  "semantic_frontmatter_validated",
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
  "diff_semantic_impact_computed",
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
  "skill_retired",
  "agent_retired",
  "primitive_deprecated",
  "pedagogy_contract_resolved",
  "ultrareview_completed",
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
  session_drift_check_completed: {
    name: "session_drift_check_completed",
    description: "A session-start drift check completed and recorded a lightweight status signal.",
    primaryDomain: "learn",
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
  ontology_registered: {
    name: "ontology_registered",
    description: "A new primitive or ontology declaration was registered via pm-ontology-register.",
    primaryDomain: "action",
  },
  capability_token_issued: {
    name: "capability_token_issued",
    description: "A CapabilityToken was issued to a holder for a scoped set of operations.",
    primaryDomain: "security",
  },
  schema_locked: {
    name: "schema_locked",
    description: "The schema surface was locked for a release; no further structural edits permitted until unlock.",
    primaryDomain: "action",
  },
  scenario_created: {
    name: "scenario_created",
    description: "A ScenarioSandbox was spawned for isolated what-if analysis.",
    primaryDomain: "learn",
  },
  pr_body_generated: {
    name: "pr_body_generated",
    description: "A pull request body was generated from events.jsonl lineage by the /ship skill.",
    primaryDomain: "action",
  },
  session_complete: {
    name: "session_complete",
    description: "A session was formally completed via /ship; emitted after PR merge or explicit completion signal.",
    primaryDomain: "learn",
  },
  doc_drift_detected: {
    name: "doc_drift_detected",
    description: "detect-doc-drift found a stale reference (missing file, wrong version, dead symbol) in a tracked document.",
    primaryDomain: "learn",
  },
  refinement_proposed: {
    name: "refinement_proposed",
    description: "BackwardProp closed a loop — runtime evidence produced a proposed refinement to ontology or validation.",
    primaryDomain: "learn",
  },
  review_decision: {
    name: "review_decision",
    description: "An ontologist accepted, rejected, or deferred a proposed refinement.",
    primaryDomain: "learn",
  },
  impact_edge_registered: {
    name: "impact_edge_registered",
    description: "A new ImpactEdge was added to the Context Engineering graph substrate.",
    primaryDomain: "learn",
  },
  outcome_evaluated: {
    name: "outcome_evaluated",
    description: "Outcomes-grader returned a rubric verdict (satisfied / needs_revision) for an agent pipeline work slice. Local mirror of Anthropic Managed Agents define_outcome.",
    primaryDomain: "learn",
  },
  edits_computed_dry_run: {
    name: "edits_computed_dry_run",
    description: "An edit function computed OntologyEdit[] via compute_edits_dry_run MCP without committing. Tier-2 compute-only path.",
    primaryDomain: "logic",
  },
  session_resumed: {
    name: "session_resumed",
    description: "A session was resumed from an events.jsonl checkpoint (last_session_rid + last_sequence restored). Local mirror of Managed Agents durable Session resume.",
    primaryDomain: "learn",
  },
  semantic_frontmatter_validated: {
    name: "semantic_frontmatter_validated",
    description: "PreToolUse/PostToolUse hook validated a hand-written ontology/primitives/contracts/codegen file for semantic frontmatter (owner+purpose).",
    primaryDomain: "logic",
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
  diff_semantic_impact_computed: {
    name: "diff_semantic_impact_computed",
    description: "diff_semantic_impact MCP handler returned semantic superset of pre_sprint_diff. Payload includes affected semantic RID count + affected verification surfaces (tests, evals, docs, monitoring).",
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
  skill_retired: {
    name: "skill_retired",
    description: "A palantir-mini plugin skill (commands/*.md) was moved to commands/.disabled/ as a tombstone. Payload captures skill id, rationale (evidence: 30d invocation count), and substitute. Decision Lineage preserved for BackwardProp replay of why a skill was removed.",
    primaryDomain: "learn",
  },
  agent_retired: {
    name: "agent_retired",
    description: "A palantir-mini plugin agent (agents/*.md) was moved to agents/.disabled/ as a tombstone. Payload captures agent name, rationale (evidence: 30d spawn count), and substitute (Lead-direct / sibling agent / retired-entirely). Pairs with skill_retired for plugin-slimdown PRs.",
    primaryDomain: "learn",
  },
  primitive_deprecated: {
    name: "primitive_deprecated",
    description: "An ontology primitive, MCP handler, or plugin surface was deprecated — either via .disabled/ tombstone or @deprecated JSDoc marker. Payload captures primitive id, deprecation mode (tombstone / jsdoc), removal window (e.g. next MINOR bump), and rationale. Consumer migration guidance recorded in CHANGELOG.",
    primaryDomain: "learn",
  },
  pedagogy_contract_resolved: {
    name: "pedagogy_contract_resolved",
    description: "A PedagogyContract (v1.15 primitive) finished plug-in resolution — primary pedagogy applied first, supporting pedagogies in array order, each a pure (SceneTree, PedagogyParams) → SceneTree transform. Payload captures conceptId, bloomTarget resolved, final SceneTree hash, and any CognitiveLoadConstraint warnings. Enables BackwardProp replay of contract resolution decisions.",
    primaryDomain: "learn",
  },
  ultrareview_completed: {
    name: "ultrareview_completed",
    description: "pm-ultrareview skill finished N parallel `claude -p` reviews of a target artifact (PR diff / file / branch). Payload captures N (reviewer count), per-review weighted scores, final consensus verdict, and per-reviewer rationale summaries. Fills the Decision Lineage gap in Anthropic's native /ultrareview command (which is session-scoped only).",
    primaryDomain: "learn",
  },
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
    description: "The session-end memory fold committed a derived Layer-2 graph.json projection (node/edge counts) for a session. Advisory, non-gating; emitted via the gated emit_event MCP path (rule 27). Payload: { graphPath, nodeCount, edgeCount, sessionId }.",
    primaryDomain: "learn",
  },
});
