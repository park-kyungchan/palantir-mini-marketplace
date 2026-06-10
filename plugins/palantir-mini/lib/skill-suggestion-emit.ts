/**
 * palantir-mini v1.36 / sprint-025 / W1.8 — skill_invocation_suggested helper
 *
 * Closes Agent #3 audit gap "substrate-signal advisories not persisted as events"
 * (BackProp circuit zero-input root cause). When a hook outputs advisory text
 * recommending a `/palantir-mini:pm-*` skill, it should ALSO call
 * `emitSkillSuggestion(...)` to persist the recommendation as a 5-dim envelope.
 *
 * Wired hooks (per plan async-jingling-garden Phase 1 W1.8):
 *   - harness-base-mode-advisory.ts → suggests pm-quick-sprint when no contract
 *   - memory-layer-validator.ts → suggests pm-memory-map when working layer
 *     under-represented
 *   - rule-audit.ts → suggests pm-rule-audit when bottleneck/citation findings
 *   - value-grade-assigner.ts → suggests pm-value-audit when T2+ ratio < 15%
 *   - pre-edit-impact-check.ts → suggests pm-replay when blastRadius ≥ 5
 *
 * Best-effort emit; never blocks the hook's primary path. Errors are silently
 * swallowed (events.jsonl substrate is opportunistic visibility, not the gate).
 */

import { emit } from "../scripts/log";

export interface SkillSuggestionParams {
  /** Canonical SKILL.md slug; must be in plugin /skills/ to satisfy invocation routing. */
  suggestedSkillSlug: string;
  /** Hook filename (without .ts) emitting the suggestion. */
  suggestedByHook:    string;
  /** Condition expression that triggered (e.g. "T2+ ratio 1.5% < 15%"). */
  triggerCondition:   string;
  /** Optional file path / RID grounding the suggestion. */
  suggestionContext?: string;
  /** Optional override for which memory layers this suggestion refines. */
  memoryLayers?:      readonly ("working" | "episodic" | "semantic" | "procedural")[];
  /** Optional cwd; defaults to process.cwd(). */
  cwd?:               string;
}

/**
 * Best-effort emit of a `skill_invocation_suggested` envelope. Returns void;
 * silently no-ops on emit error so the calling hook's advisory output remains
 * the primary signal.
 */
export async function emitSkillSuggestion(params: SkillSuggestionParams): Promise<void> {
  try {
    await emit({
      type: "skill_invocation_suggested",
      payload: {
        suggestedSkillSlug: params.suggestedSkillSlug,
        suggestedByHook:    params.suggestedByHook,
        triggerCondition:   params.triggerCondition,
        suggestionContext:  params.suggestionContext,
      },
      toolName:  params.suggestedByHook,
      cwd:       params.cwd ?? process.cwd(),
      identity:  "claude-code",
      memoryLayers: params.memoryLayers ?? ["procedural"],
      reasoning: `Hook ${params.suggestedByHook} suggests skill ${params.suggestedSkillSlug} due to: ${params.triggerCondition}`,
    });
  } catch {
    // best-effort — never block the calling hook
  }
}
