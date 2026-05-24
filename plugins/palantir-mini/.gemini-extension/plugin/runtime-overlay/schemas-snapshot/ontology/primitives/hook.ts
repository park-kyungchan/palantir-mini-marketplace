/**
 * @stable — Hook primitive (prim-ops-24, v1.0.0)
 *
 * Typed mirror of one entry in `~/.claude/plugins/palantir-mini/hooks/hooks.json`.
 * Enables the PR 2.6 indexer to populate the ImpactGraph with Hook nodes so
 * the impact_query handler can answer "which hooks cite rule NN?" and
 * "which hooks fire on event E?". Field layout mirrors agent-definition.ts
 * (slug + scope + filePath pattern).
 *
 * The PR 2.6 indexer reads hooks.json at startup and registers instances.
 * This primitive is the graph-node identity only — no runtime behaviour.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/hook.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: OPS (substrate health node — mirrors hooks.json registration record)
 * @owner palantirkc-ontology
 * @purpose Hook graph-node identity (Phase 2 ImpactGraph node-type)
 */

/** Hook lifecycle events from hooks.json `event` field. */
export type HookEventName =
  | "PreToolUse"
  | "PostToolUse"
  | "SubagentStart"
  | "SubagentStop"
  | "SessionStart"
  | "Stop"
  | "UserPromptSubmit"
  | "PreCompact"
  | string; // extensible for new event types

/** Hook scope — plugin | user | project (mirrors AgentScope precedence). */
export type HookScope = "plugin" | "user" | "project";

export type HookRid = string & { readonly __brand: "HookRid" };
export const hookRid = (s: string): HookRid => s as HookRid;

export interface HookDeclaration {
  readonly hookId: HookRid;
  /** Kebab-case slug matching the TypeScript filename without extension. */
  readonly slug: string;
  /** hooks.json `event` field — event that triggers this hook. */
  readonly eventName: HookEventName;
  /** Scope where this hook is registered. */
  readonly scope: HookScope;
  /** Absolute path to the hook TypeScript source file. */
  readonly filePath: string;
  /**
   * Rule IDs cited in the hook source via "rule NN" patterns.
   * Populated by the PR 2.6 indexer; validated by rule-citation-validate (rule 22).
   */
  readonly ruleCitations?: ReadonlyArray<number>;
}

export function isHookDeclaration(x: unknown): x is HookDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as HookDeclaration;
  return (
    typeof d.hookId === "string" &&
    d.hookId.length > 0 &&
    typeof d.slug === "string" &&
    typeof d.eventName === "string" &&
    typeof d.scope === "string" &&
    typeof d.filePath === "string"
  );
}
