/**
 * palantir-mini v3.7.0 — Fold events into typed count snapshot
 * @owner palantirkc-plugin-events
 * @purpose Reducer<EventEnvelope, EventSnapshot> — exhaustive over current union.
 */
// Domain: LOGIC (prim-logic-05 Reducer)
// Extracted from read.ts during A.2 decomposition.

import type { EventEnvelope, EventSnapshot } from "../types";

/**
 * Folds the event log into a typed count snapshot — canonical Reducer primitive.
 * Exhaustive over all registered EventEnvelope variants.
 */
export function foldToSnapshot(events: EventEnvelope[]): EventSnapshot {
  const snapshot: EventSnapshot = {
    edit_proposed:               0,
    edit_committed:              0,
    submission_criteria_failed:  0,
    validation_phase_completed:  0,
    codegen_started:             0,
    codegen_completed:           0,
    phase_completed:             0,
    drift_detected:              0,
    session_started:             0,
    session_ended:               0,
    task_created:                0,
    teammate_idle:               0,
    subagent_stop:               0,
    post_compact_verified:       0,
    user_prompt_submitted:       0,
    memory_write:                0,
    memory_read:                 0,
    agent_start:                 0,
    agent_stop:                  0,
    scenario_created:            0,
    shutdown_request:            0,
    inbox_delivered:             0,
    stale_state_warning:         0,
    inbox_cleaned:               0,
    subagent_state_validation:   0,
    agent_frontmatter_validated: 0,
    impact_graph_initialized:    0,
    auto_spawn_requested:        0,
    skill_started:               0,
    skill_completed:             0,
    learning_captured:           0,
    retro_emitted:               0,
    plan_reviewed:               0,
    research_library_refreshed:  0,
    research_library_pruned:     0,
    claude_code_version_checked: 0,
    research_docs_drift_detected: 0,
    orphan_event_reconciled:     0,
    chrome_ratio_measured:       0,
    pre_sprint_diff_computed:    0,
    drift_gate_evaluated:        0,
    harness_agent_spawned:        0,
    sprint_contract_negotiated:   0,
    sprint_contract_bound:        0,
    feedback_loop_opened:         0,
    playwright_scenario_executed: 0,
    grading_completed:            0,
    feedback_loop_closed:         0,
    tool_invocation_completed:    0,
    planner_output_graded:        0,
    evaluator_strictness_probe:   0,
    sprint_contract_dissent_preserved: 0,
    context_reset_handoff_emitted:     0,
    harness_component_audit_emitted:   0,
    plugin_self_check_completed:       0,
    snapshot_written:                  0,
    event_log_rotated:                 0,
    sprint_completed:                  0,
    failure_mode_synthesized:          0,
    // O-2 — register→commit→materialize→read loop: projection of committed
    // applyRegister* edits into a readable typed-primitive collection.
    registeredPrimitives: { objectTypes: [], linkTypes: [], actionTypes: [], functions: [], roles: [], properties: [] },
    totalEvents:                 events.length,
    lastSequence:                0,
  };

  for (const ev of events) {
    switch (ev.type) {
      case "edit_proposed":               snapshot.edit_proposed++;               break;
      case "edit_committed": {
        snapshot.edit_committed++;
        // O-2 materialization: project each committed register edit's rid into the
        // readable typed-primitive collection, binned by properties.primitiveKind
        // (ObjectType/ActionType/Function carried as kind:"object") or edit kind:"link".
        const reg = snapshot.registeredPrimitives!;
        // Defensive: historical / fixture edit_committed rows may omit appliedEdits.
        const appliedEdits = Array.isArray(ev.payload?.appliedEdits) ? ev.payload.appliedEdits : [];
        for (const edit of appliedEdits) {
          if (edit.kind === "link") {
            // FOLD-1: carry the link's meaning (its endpoints + name) as the
            // declaration so the fold is meaning-bearing, not a bare rid. OE-11:
            // the first-class `Cardinality` ("one"|"many") survives here too when
            // the register seam threaded it — present-only so legacy folds are
            // byte-identical.
            reg.linkTypes.push({
              rid: edit.rid,
              declaration: {
                srcRid: edit.srcRid,
                dstRid: edit.dstRid,
                linkName: edit.linkName,
                ...(edit.srcCardinality !== undefined ? { srcCardinality: edit.srcCardinality } : {}),
                ...(edit.dstCardinality !== undefined ? { dstCardinality: edit.dstCardinality } : {}),
              },
            });
          } else if (edit.kind === "object") {
            // FOLD-1: project the committed declaration (the edit's properties
            // MINUS the primitiveKind tag, which is the binning discriminator,
            // not part of the registered meaning) into the bucket entry.
            const props = (edit.properties as Record<string, unknown> | undefined) ?? {};
            const primitiveKind = props.primitiveKind;
            const { primitiveKind: _omit, ...declaration } = props;
            void _omit;
            const entry = { rid: edit.rid, declaration };
            if (primitiveKind === "ObjectType")      reg.objectTypes.push(entry);
            else if (primitiveKind === "ActionType") reg.actionTypes.push(entry);
            else if (primitiveKind === "Function")   reg.functions.push(entry);
            else if (primitiveKind === "Role")       reg.roles.push(entry);
            else if (primitiveKind === "Property")   reg.properties.push(entry);
          }
        }
        break;
      }
      case "submission_criteria_failed":  snapshot.submission_criteria_failed++;  break;
      case "validation_phase_completed":  snapshot.validation_phase_completed++;  break;
      case "codegen_started":             snapshot.codegen_started++;             break;
      case "codegen_completed":           snapshot.codegen_completed++;           break;
      case "phase_completed":             snapshot.phase_completed++;             break;
      case "drift_detected":              snapshot.drift_detected++;              break;
      case "session_started":             snapshot.session_started++;             break;
      case "session_ended":               snapshot.session_ended++;               break;
      case "task_created":                snapshot.task_created++;                break;
      case "teammate_idle":               snapshot.teammate_idle++;               break;
      case "subagent_stop":               snapshot.subagent_stop++;               break;
      case "post_compact_verified":       snapshot.post_compact_verified++;       break;
      case "user_prompt_submitted":       snapshot.user_prompt_submitted++;       break;
      case "memory_write":                snapshot.memory_write++;                break;
      case "memory_read":                 snapshot.memory_read++;                 break;
      case "agent_start":                 snapshot.agent_start++;                 break;
      case "agent_stop":                  snapshot.agent_stop++;                  break;
      case "scenario_created":            snapshot.scenario_created++;            break;
      case "shutdown_request":            snapshot.shutdown_request++;            break;
      case "inbox_delivered":             snapshot.inbox_delivered++;             break;
      case "stale_state_warning":         snapshot.stale_state_warning++;         break;
      case "inbox_cleaned":               snapshot.inbox_cleaned++;               break;
      case "subagent_state_validation":   snapshot.subagent_state_validation++;   break;
      case "agent_frontmatter_validated": snapshot.agent_frontmatter_validated++; break;
      case "impact_graph_initialized":    snapshot.impact_graph_initialized++;    break;
      case "auto_spawn_requested":        snapshot.auto_spawn_requested++;        break;
      case "skill_started":               snapshot.skill_started++;               break;
      case "skill_completed":             snapshot.skill_completed++;             break;
      case "learning_captured":           snapshot.learning_captured++;           break;
      case "retro_emitted":               snapshot.retro_emitted++;               break;
      case "plan_reviewed":               snapshot.plan_reviewed++;               break;
      case "research_library_refreshed":  snapshot.research_library_refreshed++;  break;
      case "research_library_pruned":     snapshot.research_library_pruned++;     break;
      case "claude_code_version_checked": snapshot.claude_code_version_checked++; break;
      case "research_docs_drift_detected": snapshot.research_docs_drift_detected++; break;
      case "orphan_event_reconciled":     snapshot.orphan_event_reconciled++;     break;
      case "chrome_ratio_measured":       snapshot.chrome_ratio_measured++;       break;
      case "pre_sprint_diff_computed":    snapshot.pre_sprint_diff_computed++;    break;
      case "drift_gate_evaluated":        snapshot.drift_gate_evaluated++;        break;
      case "harness_agent_spawned":        snapshot.harness_agent_spawned++;        break;
      case "sprint_contract_negotiated":   snapshot.sprint_contract_negotiated++;   break;
      case "sprint_contract_bound":        snapshot.sprint_contract_bound++;        break;
      case "feedback_loop_opened":         snapshot.feedback_loop_opened++;         break;
      case "playwright_scenario_executed": snapshot.playwright_scenario_executed++; break;
      case "grading_completed":            snapshot.grading_completed++;            break;
      case "feedback_loop_closed":         snapshot.feedback_loop_closed++;         break;
      case "tool_invocation_completed":    snapshot.tool_invocation_completed++;    break;
      case "planner_output_graded":        snapshot.planner_output_graded++;        break;
      case "evaluator_strictness_probe":   snapshot.evaluator_strictness_probe++;   break;
      case "sprint_contract_dissent_preserved": snapshot.sprint_contract_dissent_preserved++; break;
      case "context_reset_handoff_emitted":     snapshot.context_reset_handoff_emitted++;     break;
      case "harness_component_audit_emitted":   snapshot.harness_component_audit_emitted++;   break;
      case "plugin_self_check_completed":       snapshot.plugin_self_check_completed++;       break;
      case "snapshot_written":                  snapshot.snapshot_written++;                  break;
      case "event_log_rotated":                 snapshot.event_log_rotated++;                 break;
      case "sprint_completed":                  snapshot.sprint_completed++;                  break;
      case "failure_mode_synthesized":          snapshot.failure_mode_synthesized++;          break;
      // PR-10 — OntologyWorkflowTrace lifecycle (foamy-giggling-kettle)
      case "workflow_trace_opened":             snapshot.workflow_trace_opened = (snapshot.workflow_trace_opened ?? 0) + 1; break;
      case "workflow_trace_transitioned":       snapshot.workflow_trace_transitioned = (snapshot.workflow_trace_transitioned ?? 0) + 1; break;
      case "workflow_trace_closed":             snapshot.workflow_trace_closed = (snapshot.workflow_trace_closed ?? 0) + 1; break;
      case "workflow_trace_leak_detected":      snapshot.workflow_trace_leak_detected = (snapshot.workflow_trace_leak_detected ?? 0) + 1; break;
      // v1.36 / sprint-025 / W1.8 — counter for skill_invocation_suggested
      case "skill_invocation_suggested":        snapshot.skill_invocation_suggested = (snapshot.skill_invocation_suggested ?? 0) + 1; break;
      // PR-11 — PreMutationGovernance policy compiler (foamy-giggling-kettle)
      case "pre_mutation_governance_decided":   snapshot.pre_mutation_governance_decided = (snapshot.pre_mutation_governance_decided ?? 0) + 1; break;
      case "events_summarized":                 snapshot.events_summarized = (snapshot.events_summarized ?? 0) + 1; break;
      // Sprint 97 W1 — DTC governance events
      case "dtc_fill_turn_advanced":            snapshot.dtc_fill_turn_advanced = (snapshot.dtc_fill_turn_advanced ?? 0) + 1; break;
      case "digital_twin_contract_finalized":   snapshot.digital_twin_contract_finalized = (snapshot.digital_twin_contract_finalized ?? 0) + 1; break;
      case "dtc_grading_completed":             snapshot.dtc_grading_completed = (snapshot.dtc_grading_completed ?? 0) + 1; break;
      case "dtc_grader_runtime_gap":            snapshot.dtc_grader_runtime_gap = (snapshot.dtc_grader_runtime_gap ?? 0) + 1; break;
      case "dtc_eval_refs_bypass_invoked":      snapshot.dtc_eval_refs_bypass_invoked = (snapshot.dtc_eval_refs_bypass_invoked ?? 0) + 1; break;
      // Improvement #2 — developer/source-mutation fast-path audit events
      case "source_mutation_approval_granted":  snapshot.source_mutation_approval_granted = (snapshot.source_mutation_approval_granted ?? 0) + 1; break;
      case "source_mutation_approval_denied":   snapshot.source_mutation_approval_denied = (snapshot.source_mutation_approval_denied ?? 0) + 1; break;
      // OE-14 / D5-7 — first-class UniversalOntologyEntry status-transition lineage
      case "universal_ontology_entry_transitioned": snapshot.universal_ontology_entry_transitioned = (snapshot.universal_ontology_entry_transitioned ?? 0) + 1; break;
      default: {
        const _exhaustive: never = ev;
        void _exhaustive;
        break;
      }
    }
    if (ev.sequence > snapshot.lastSequence) {
      snapshot.lastSequence = ev.sequence;
    }
  }

  return snapshot;
}
