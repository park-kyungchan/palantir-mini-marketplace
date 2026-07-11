/**
 * palantir-mini SELF-ONTOLOGY — EventEnvelope as a registered ObjectType + its 84
 * discriminator instances (Wave 1 ObjectType build; count updated by Sprint-cartography
 * W1 vocabulary/union drift closure — 18 vocabulary-dead discriminators removed after
 * an exhaustive emit-site + fixture audit found zero occurrences anywhere in the
 * plugin outside this read-only snapshot boundary, and 14 typed EventEnvelope variants
 * with real emit sites but no prior vocabulary entry were added, restoring exact set
 * equality with lib/event-log/types.ts's EventType union: 87 - 18 + 14 = 83; then
 * schemas v1.96 / P1 unification S2 added cartography_decision_mirrored: 83 + 1 = 84).
 * pm's append-only Decision-Lineage
 * substrate modeled AS ontology: every ontology-state edit emits a 5-dim event row
 * (rule 10) into events.jsonl, and the set of legal row kinds is the EVENT_TYPE_NAMES
 * discriminator registry. This file turns that lineage substrate into a typed surface.
 *
 * This file declares ONE `EventEnvelope` ObjectType (the type) and seeds the 84 event
 * discriminators as instances (eventType = the EVENT_TYPE_NAMES entry). A logged
 * EventEnvelope row is keyed by `eventId`; the 84 instances seed the discriminator
 * VOCABULARY (the eventType identity), mirroring how the McpTool seed carries the
 * stable tool identity. The snapshot OWNS the seed (it is the authority), so it does
 * NOT import the event-types module's array uphill as data. The paired registration
 * test cross-checks these 84 names against the LIVE event-types.ts EVENT_TYPE_NAMES
 * array (read as text) so the self-model fails loud if pm's event surface drifts
 * (a discriminator added/removed without updating this seed).
 *
 * Count provenance (schemas v1.96 / P1 unification S2, LIVE-verified): event-types.ts
 * EVENT_TYPE_NAMES holds EXACTLY 84 discriminator entries. The 5-dim envelope fields
 * (when / atopWhich / throughWhich / byWhom / withWhat) + valueGrade (rule 26) are the
 * stored-fact surface; the registered INSTANCES carry the eventType identity only.
 *
 * @owner palantirkc-ontology
 * @purpose Wave 1 self-Ontology ObjectType (EventEnvelope, 84 discriminator instances)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology EventEnvelope ObjectType. */
export const EVENT_ENVELOPE_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/event-envelope",
);

/**
 * EventEnvelope modeled as a Palantir ObjectType. A logged envelope row is keyed by
 * `eventId`; `eventType` is the discriminator, and the 5 lineage dimensions
 * (when / atopWhich / throughWhich / byWhom / withWhat — rule 10) plus `valueGrade`
 * (rule 26) complete the stored-fact surface. The registered INSTANCES below seed the
 * discriminator vocabulary (eventType identity), not individual logged rows.
 */
export const EVENT_ENVELOPE_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: EVENT_ENVELOPE_OBJECT_TYPE_RID,
  apiName: "EventEnvelope",
  name: "EventEnvelope",
  description:
    "palantir-mini append-only Decision-Lineage row modeled as an ObjectType: the " +
    "5-dim envelope (when/atopWhich/throughWhich/byWhom/withWhat, rule 10) + valueGrade " +
    "(rule 26). Instances seed the 84-entry eventType discriminator vocabulary from the " +
    "live EVENT_TYPE_NAMES registry; per-row payloads are the runtime concern.",
  primaryKeyProperty: "eventId",
  titleProperty: "eventType",
  properties: [
    { name: "eventId", type: "string" },
    { name: "eventType", type: "string" },
    { name: "when", type: "string" },
    { name: "atopWhich", type: "string" },
    { name: "throughWhich", type: "string" },
    { name: "byWhom", type: "string" },
    { name: "withWhat", type: "string" },
    { name: "valueGrade", type: "string", optional: true },
  ],
};

/** A registered EventEnvelope instance — a stable eventType discriminator identity. */
export interface EventEnvelopeInstance {
  readonly eventType: string;
}

/**
 * The 84 EventEnvelope instances — pm's LIVE event discriminator surface, in
 * EVENT_TYPE_NAMES declaration order. Snapshot-owned seed (no event-types array import
 * as data); the registration test cross-checks this set against the live
 * lineage/event-types.ts EVENT_TYPE_NAMES array (read as text) and fails on any drift.
 */
export const EVENT_ENVELOPE_INSTANCES: readonly EventEnvelopeInstance[] = [
  { eventType: "edit_proposed" },
  { eventType: "edit_committed" },
  { eventType: "submission_criteria_failed" },
  { eventType: "validation_phase_completed" },
  { eventType: "codegen_started" },
  { eventType: "codegen_completed" },
  { eventType: "phase_completed" },
  { eventType: "drift_detected" },
  { eventType: "session_started" },
  { eventType: "session_ended" },
  { eventType: "task_created" },
  { eventType: "teammate_idle" },
  { eventType: "subagent_stop" },
  { eventType: "post_compact_verified" },
  { eventType: "user_prompt_submitted" },
  { eventType: "memory_write" },
  { eventType: "memory_read" },
  { eventType: "agent_start" },
  { eventType: "agent_stop" },
  { eventType: "shutdown_request" },
  { eventType: "inbox_delivered" },
  { eventType: "stale_state_warning" },
  { eventType: "inbox_cleaned" },
  { eventType: "subagent_state_validation" },
  { eventType: "agent_frontmatter_validated" },
  { eventType: "impact_graph_initialized" },
  { eventType: "auto_spawn_requested" },
  { eventType: "skill_started" },
  { eventType: "skill_completed" },
  { eventType: "learning_captured" },
  { eventType: "retro_emitted" },
  { eventType: "plan_reviewed" },
  { eventType: "scenario_created" },
  { eventType: "doc_drift_detected" },
  { eventType: "session_resumed" },
  { eventType: "research_library_refreshed" },
  { eventType: "research_library_pruned" },
  { eventType: "claude_code_version_checked" },
  { eventType: "research_docs_drift_detected" },
  { eventType: "orphan_event_reconciled" },
  { eventType: "chrome_ratio_measured" },
  { eventType: "pre_sprint_diff_computed" },
  { eventType: "drift_gate_evaluated" },
  { eventType: "semantic_manifest_refreshed" },
  { eventType: "semantic_change_plan_emitted" },
  { eventType: "semantic_drift_audited" },
  { eventType: "harness_agent_spawned" },
  { eventType: "sprint_contract_negotiated" },
  { eventType: "sprint_contract_bound" },
  { eventType: "feedback_loop_opened" },
  { eventType: "playwright_scenario_executed" },
  { eventType: "grading_completed" },
  { eventType: "feedback_loop_closed" },
  { eventType: "planner_output_graded" },
  { eventType: "evaluator_strictness_probe" },
  { eventType: "sprint_contract_dissent_preserved" },
  { eventType: "context_reset_handoff_emitted" },
  { eventType: "harness_component_audit_emitted" },
  { eventType: "snapshot_written" },
  { eventType: "event_log_rotated" },
  { eventType: "tool_invocation_completed" },
  { eventType: "plugin_self_check_completed" },
  { eventType: "sprint_completed" },
  { eventType: "failure_mode_synthesized" },
  { eventType: "events_summarized" },
  // OE-14 / D5-7 — first-class UniversalOntologyEntry status-transition lineage.
  { eventType: "universal_ontology_entry_transitioned" },
  // v1.92 — second-brain memory-fold governed event types (P0.4r).
  { eventType: "resolution_verdict" },
  { eventType: "memory_fold_committed" },
  // 7.36.0 — P3 Lead-decision governed-emit (Path-B).
  { eventType: "lead_decision" },
  // Sprint-cartography W1 — vocabulary/union drift closure (14 typed variants promoted
  // from lib/event-log/types.ts that had real emit sites but no vocabulary entry).
  { eventType: "dtc_fill_turn_advanced" },
  { eventType: "digital_twin_contract_finalized" },
  { eventType: "dtc_grading_completed" },
  { eventType: "dtc_grader_runtime_gap" },
  { eventType: "dtc_eval_refs_bypass_invoked" },
  { eventType: "source_mutation_approval_granted" },
  { eventType: "source_mutation_approval_denied" },
  { eventType: "drift_rebind_envelope_advanced" },
  { eventType: "workflow_trace_opened" },
  { eventType: "workflow_trace_transitioned" },
  { eventType: "workflow_trace_closed" },
  { eventType: "workflow_trace_leak_detected" },
  { eventType: "pre_mutation_governance_decided" },
  { eventType: "skill_invocation_suggested" },
  // v1.96 — P1 unification S2: home-cartography g12 decision-ledger mirror.
  { eventType: "cartography_decision_mirrored" },
];

// Register the EventEnvelope ObjectType (the type). The 84 instances above are data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(EVENT_ENVELOPE_OBJECT_TYPE);
