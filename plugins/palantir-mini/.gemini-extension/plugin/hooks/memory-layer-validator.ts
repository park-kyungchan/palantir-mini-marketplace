// palantir-mini v4.1.0 — memory-layer-validator hook (rule 26 §Axis E)
// Fires on: PostToolUse with matcher
//   mcp__plugin_palantir-mini_palantir-mini__emit_event (advisory, async)
//
// Per rule 26 §Axis E (Memory-mapped):
//   T2+ envelopes MUST carry withWhat.memoryLayers (≥1 of working / episodic /
//   semantic / procedural). When missing, this hook emits an advisory event
//   (not a block) suggesting auto-tag heuristics by event type.
//
// T0/T1 envelopes are exempt — only T2+ enforced.
//
// Idempotency: advisory event includes the source eventId so dedupe is
// trivial via downstream readers (no on-disk marker needed; the advisory
// itself is the audit trail).
//
// Authority: ~/.claude/rules/26-valuable-data-standard.md §Axis E
//            ~/.claude/schemas/ontology/primitives/agentic-memory-layer.ts
//            ~/.claude/plans/quiet-fluttering-garden.md §Phase 2.3

import { emit } from "../scripts/log";
import { emitSkillSuggestion } from "../lib/skill-suggestion-emit";
import { normalizePalantirMiniMcpToolName } from "../lib/hooks/tool-classifier";
import {
  type AgenticMemoryLayer,
} from "#schemas/ontology/primitives/agentic-memory-layer";

const TARGET_TOOL = "emit_event";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    project?: string;
    envelope?: {
      type?: string;
      eventId?: string;
      valueGrade?: string;
      withWhat?: {
        memoryLayers?: readonly string[];
        hypothesis?: string;
      };
      payload?: Record<string, unknown>;
    };
  };
}

interface HookResult {
  message:           string;
  decision?:         "continue";
  additionalContext?: string;
}

/**
 * Heuristic auto-tag map per rule 26 §Axis E. Suggested layers when an event
 * type is emitted without explicit `withWhat.memoryLayers`. Used both by this
 * hook (advisory) and by `pm_memory_layer_audit` MCP for retroactive audits.
 *
 * Rationale per layer:
 *   - working    — current-task scratchpad / context window state
 *   - episodic   — specific past sessions, sprints, incidents (event rows)
 *   - semantic   — typed knowledge: DH/HC/rubric/criterion/spec markers
 *   - procedural — skills / hooks / agents / scripts (how-to artifacts)
 */
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

/** True if envelope has non-empty memoryLayers. */
function hasMemoryLayers(envelope: HookPayload["tool_input"] extends infer T
  ? T extends { envelope?: infer E } ? E : never
  : never): boolean {
  const layers = envelope?.withWhat?.memoryLayers;
  return Array.isArray(layers) && layers.length > 0;
}

/** True if grade is T2 / T3 / T4 (i.e., subject to memoryLayer enforcement). */
function isT2Plus(grade: string | undefined): boolean {
  return grade === "T2" || grade === "T3" || grade === "T4";
}

export default async function memoryLayerValidator(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const toolName = p.tool_name ?? "";

  if (normalizePalantirMiniMcpToolName(toolName) !== TARGET_TOOL) {
    return {
      message: `palantir-mini: memory-layer-validator skipped (tool=${toolName})`,
      decision: "continue",
    };
  }

  const envelope = p.tool_input?.envelope;
  if (!envelope || !envelope.type) {
    return {
      message: "palantir-mini: memory-layer-validator skipped (no envelope)",
      decision: "continue",
    };
  }

  // Only T2+ envelopes enforced
  if (!isT2Plus(envelope.valueGrade)) {
    return {
      message: `palantir-mini: memory-layer-validator skipped (grade=${envelope.valueGrade ?? "missing"} — only T2+ enforced)`,
      decision: "continue",
    };
  }

  if (hasMemoryLayers(envelope)) {
    return {
      message: `palantir-mini: memory-layer-validator OK (event=${envelope.type}, layers present)`,
      decision: "continue",
    };
  }

  // T2+ envelope MISSING memoryLayers — emit advisory + suggest auto-tag
  const suggested = suggestLayers(envelope.type);
  const projectRoot = p.tool_input?.project ?? p.cwd ?? process.cwd();

  void emit({
    type: "phase_completed",
    payload: {
      phaseTag: "memory_layer_advisory",
      taskId: `memlayer-advisory-${envelope.eventId ?? "unknown"}`,
      validations: [
        `event-type=${envelope.type}`,
        `value-grade=${envelope.valueGrade}`,
        `suggested-layers=${suggested.join(",") || "none"}`,
      ],
    },
    toolName: "PostToolUse",
    cwd: projectRoot,
    sessionId: p.session_id,
    identity: "monitor",
    memoryLayers: ["procedural", "semantic"],
    reasoning: `memory-layer-validator: T2+ envelope (${envelope.type}, grade=${envelope.valueGrade}) missing withWhat.memoryLayers. Suggested auto-tag: [${suggested.join(", ") || "no heuristic — declare manually"}].`,
  }).catch(() => {});

  const advisory = [
    "[rule 26 §Axis E]",
    `Event ${envelope.type} (grade=${envelope.valueGrade}) missing withWhat.memoryLayers.`,
    suggested.length > 0
      ? `Suggested auto-tag: [${suggested.join(", ")}]`
      : `No heuristic match — declare manually from {working, episodic, semantic, procedural}.`,
    `Add to emit() call: memoryLayers: [${suggested.length > 0 ? suggested.map((l) => `"${l}"`).join(", ") : '"<layer>"'}]`,
  ].join("\n");

  // W1.8 — persist suggestion as 5-dim event (rule 26 §Definition closure; Agent #3 audit gap)
  await emitSkillSuggestion({
    suggestedSkillSlug: "pm-memory-map",
    suggestedByHook:    "memory-layer-validator",
    triggerCondition:   `T2+ envelope ${envelope.type} (grade=${envelope.valueGrade}) missing withWhat.memoryLayers; suggested=${suggested.join(",") || "manual"}`,
    suggestionContext:  envelope.eventId,
    memoryLayers:       ["procedural", "semantic"],
  });

  return {
    message: `palantir-mini: memory-layer-validator advisory (event=${envelope.type}, missing layers)`,
    decision: "continue",
    additionalContext: advisory,
  };
}
