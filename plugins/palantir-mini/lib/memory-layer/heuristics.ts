/**
 * palantir-mini v1.36 / sprint-026 / W1.5 — AUTO_TAG_HEURISTICS pure data module.
 *
 * Extracted from `hooks/memory-layer-validator.ts` so both the hook (PostToolUse
 * advisory path A — fires for MCP-routed emits) and `scripts/log.ts:emit()`
 * (in-band path B — fires for hook-direct emits) can share the same heuristic
 * table without circular import (memory-layer-validator imports `emit` from
 * scripts/log).
 *
 * Authority: rule 26 v1.0.0 §Auto-grade + §Axis E.
 *
 * Layer model (Palantir A1 2026-04-29 blog "Connecting Agents to Decisions"):
 *   - working    — current-task scratchpad + ad-hoc analysis
 *   - episodic   — specific past sessions, sprints, incidents (event rows)
 *   - semantic   — typed knowledge: DH/HC/rubric/criterion/spec markers
 *   - procedural — skills / hooks / agents / scripts (how-to artifacts)
 */

import type { AgenticMemoryLayer } from "#schemas/ontology/primitives/agentic-memory-layer";

export const AUTO_TAG_HEURISTICS: Record<string, readonly AgenticMemoryLayer[]> = {
  // Lifecycle / session
  session_started: ["working", "episodic"],
  session_ended: ["episodic"],
  session_resumed: ["working", "episodic"],
  user_prompt_submitted: ["working", "episodic"],

  // Agent lifecycle (procedural how-to)
  agent_start: ["procedural", "episodic"],
  agent_stop: ["procedural", "episodic"],
  subagent_stop: ["procedural", "episodic"],
  subagent_state_validation: ["procedural", "episodic"],
  agent_frontmatter_validated: ["procedural"],

  // Memory primitives
  memory_write: ["episodic", "semantic"],
  memory_read: ["episodic", "semantic"],

  // Task lifecycle
  task_created: ["procedural", "episodic"],
  teammate_idle: ["episodic"],
  inbox_delivered: ["working", "episodic"],
  inbox_cleaned: ["procedural"],
  shutdown_request: ["procedural", "episodic"],
  stale_state_warning: ["episodic"],

  // Skill / learning / retro (semantic + episodic)
  skill_started: ["procedural", "episodic"],
  skill_completed: ["procedural", "episodic"],
  skill_invocation_suggested: ["procedural"],
  learning_captured: ["episodic", "semantic"],
  retro_emitted: ["episodic", "semantic"],
  plan_reviewed: ["semantic", "episodic"],

  // Edit / commit pipeline (semantic schema + procedural code)
  edit_proposed: ["semantic", "procedural"],
  edit_committed: ["semantic", "procedural"],
  submission_criteria_failed: ["semantic", "procedural"],
  validation_phase_completed: ["procedural", "semantic"],
  drift_detected: ["semantic", "procedural"],

  // Codegen
  codegen_started: ["procedural", "semantic"],
  codegen_completed: ["procedural", "semantic"],

  // Phase / pipeline
  phase_completed: ["episodic", "working"],
  post_compact_verified: ["episodic", "working"],
  snapshot_written: ["episodic"],
  event_log_rotated: ["procedural"],

  // Harness / sprint
  harness_agent_spawned: ["procedural", "episodic"],
  sprint_contract_negotiated: ["semantic", "procedural", "episodic"],
  sprint_contract_bound: ["semantic", "procedural", "episodic"],
  sprint_completed: ["episodic", "semantic"],
  feedback_loop_opened: ["procedural", "episodic"],
  feedback_loop_closed: ["procedural", "episodic", "semantic"],
  failure_mode_synthesized: ["semantic", "episodic"],
  grading_completed: ["procedural", "semantic"],
  playwright_scenario_executed: ["procedural", "episodic"],
  evaluator_strictness_probe: ["procedural", "semantic"],
  planner_output_graded: ["procedural", "semantic"],
  sprint_contract_dissent_preserved: ["semantic", "episodic"],
  context_reset_handoff_emitted: ["procedural", "episodic"],
  harness_component_audit_emitted: ["semantic", "procedural"],

  // Research / drift
  research_library_refreshed: ["semantic"],
  research_library_pruned: ["semantic"],
  claude_code_version_checked: ["semantic", "procedural"],
  research_docs_drift_detected: ["semantic"],
  orphan_event_reconciled: ["episodic", "procedural"],

  // Telemetry
  chrome_ratio_measured: ["procedural"],
  pre_sprint_diff_computed: ["semantic", "procedural"],
  drift_gate_evaluated: ["procedural", "semantic"],
  tool_invocation_completed: ["procedural"],

  // Plugin self-check
  plugin_self_check_completed: ["procedural", "semantic"],

  // Scenarios
  scenario_created: ["semantic", "procedural"],

  // Auto-spawn
  auto_spawn_requested: ["procedural", "episodic"],

  // Impact graph
  impact_graph_initialized: ["semantic", "procedural"],
};

/** Returns suggested memoryLayers for an event type, or empty array on miss. */
export function suggestLayers(eventType: string): readonly AgenticMemoryLayer[] {
  return AUTO_TAG_HEURISTICS[eventType] ?? [];
}
