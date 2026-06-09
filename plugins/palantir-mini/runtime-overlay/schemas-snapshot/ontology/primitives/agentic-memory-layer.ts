/**
 * @stable — AgenticMemoryLayer enum primitive (prim-learn-16, v1.35.0)
 *
 * 4-layer taxonomy from Palantir's "Connecting Agents to Decisions" (2026-04-29):
 *
 *   "decision lineage ... continuously refine all forms of agentic memory
 *    (working memory, episodic memory, semantic memory, procedural memory)"
 *
 * Every events.jsonl envelope at T2+ MUST declare ≥1 memory layer it feeds in
 * `withWhat.memoryLayers`. Drives memory-layer-validator.ts hook + per-layer
 * audit (`pm_memory_layer_audit` MCP).
 *
 * Authority chain:
 *   research/palantir-vision/aipcon-devcon/devcon.md §DC5-02
 *     + blog.palantir.com/connecting-agents-to-decisions (2026-04-29) verbatim
 *     ↓
 *   plans/nifty-mixing-diffie.md §Axis E
 *     ↓
 *   schemas/ontology/primitives/agentic-memory-layer.ts (this file)
 *     ↓
 *   palantir-mini/hooks/memory-layer-validator.ts (PostToolUse on emit_event)
 *     + bridge/handlers/pm-memory-layer-audit.ts
 *     + agents/*.md §Memory layer declaration
 *
 * D/L/A domain: LEARN (memory taxonomy is a LEARN classification).
 * Rule cross-refs: rule 26, rule 12 §Briefing template (5th section).
 *
 * @owner palantirkc-ontology
 * @purpose 4-layer agentic memory taxonomy for envelope tagging
 */

/**
 * Four canonical agentic memory layers (Palantir A1, 2026-04-29).
 *
 * - `working`    — current-task scratchpad / context window state
 * - `episodic`   — specific past sessions, sprints, incidents (events.jsonl rows)
 * - `semantic`   — typed knowledge: DH/HC/rubric/criterion/spec markers
 * - `procedural` — skills / hooks / agents / scripts (how-to artifacts)
 */
export type AgenticMemoryLayer =
  | "working"
  | "episodic"
  | "semantic"
  | "procedural";

/**
 * Runtime-readable list of all valid AgenticMemoryLayer values. Used by
 * memory-layer-validator hook + pm_memory_layer_audit handler.
 */
export const AGENTIC_MEMORY_LAYERS: readonly AgenticMemoryLayer[] = [
  "working",
  "episodic",
  "semantic",
  "procedural",
] as const;

/**
 * Type guard — returns true if `s` is a valid AgenticMemoryLayer string.
 */
export function isAgenticMemoryLayer(s: string): s is AgenticMemoryLayer {
  return (AGENTIC_MEMORY_LAYERS as readonly string[]).includes(s);
}

/**
 * Type guard — returns true if `xs` is a non-empty array of valid layers.
 * Use to validate `withWhat.memoryLayers` field on T2+ envelopes.
 */
export function isAgenticMemoryLayerArray(xs: unknown): xs is AgenticMemoryLayer[] {
  return (
    Array.isArray(xs) &&
    xs.length > 0 &&
    xs.every((x): x is AgenticMemoryLayer =>
      typeof x === "string" && isAgenticMemoryLayer(x),
    )
  );
}
