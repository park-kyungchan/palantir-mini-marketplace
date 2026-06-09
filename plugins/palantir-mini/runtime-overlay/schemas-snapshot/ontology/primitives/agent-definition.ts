/**
 * @stable — AgentDefinition primitive (prim-ops-22, v1.27.0)
 *
 * Typed representation of a Claude Code subagent declaration. Until v1.27.0,
 * agent .md files were filesystem conventions only — frontmatter drift (e.g.,
 * adding `effort:`) had no compile-time check, and `Agent(...)` spawn types
 * were untyped strings. This primitive turns the convention into ontology.
 *
 * Cross-runtime — applies equally to Claude (~/.claude/agents/ +
 * ~/.claude/plugins/<id>/agents/) and any future runtime that adopts the
 * subagent .md spec.
 *
 * Phase 2d (v2.27.0) ships the type + seed instances + advisory cross-check
 * in pm_plugin_self_check. Filesystem remains AUTHORITATIVE this version;
 * primitive-authoritative flip deferred to a later patch once seed accuracy
 * is proven over 2+ sessions.
 *
 * Authority chain:
 *   ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §10.1
 *   -> ~/.claude/plans/immutable-forging-summit.md §4.1 T2d-1
 *   -> rules/12-lead-protocol-v2.md §Agent frontmatter standard
 *   -> https://code.claude.com/docs/en/sub-agents (scope precedence)
 *
 * D/L/A domain: OPS (substrate health input; agent-frontmatter-validate hook backbone)
 * @owner palantirkc-ontology
 * @purpose AgentDefinition primitive (Phase 2d schemas v1.27.0)
 */

export type AgentDefinitionRid = string & { readonly __brand: "AgentDefinitionRid" };

export const agentDefinitionRid = (s: string): AgentDefinitionRid =>
  s as AgentDefinitionRid;

/** Subagent scope precedence per https://code.claude.com/docs/en/sub-agents:
 *  1 managed > 2 cli `--agents` > 3 project `.claude/agents/` > 4 user `~/.claude/agents/` > 5 plugin (lowest). */
export type AgentScope = "plugin" | "user" | "project" | "managed";

export type AgentModel = "haiku" | "sonnet" | "opus" | "inherit";

export type AgentMemory = "user" | "project" | "local" | "none";

export type AgentIsolation = "worktree" | "none";

/**
 * Typed mirror of a Claude Code agent .md frontmatter + metadata. The
 * `filePath` lets `pm_plugin_self_check` cross-reference filesystem state.
 */
export interface AgentDefinitionDeclaration {
  readonly agentId: AgentDefinitionRid;
  /** Kebab-case slug (e.g. "harness-planner"). Stable identifier. */
  readonly slug: string;
  /** Frontmatter `description:` line. ≤1536 chars per Anthropic skill cap analog. */
  readonly description: string;
  readonly scope: AgentScope;
  readonly model: AgentModel;
  readonly maxTurns: number;
  readonly tools: ReadonlyArray<string>;
  readonly disallowedTools?: ReadonlyArray<string>;
  readonly memory?: AgentMemory;
  readonly isolation?: AgentIsolation;
  /** Absolute path to the .md file on disk (anchor for cross-check). */
  readonly filePath: string;
  /** When set, the agent is deprecated — banner present in source file. */
  readonly deprecatedBy?: string;
  /** When set, declaration has been superseded by another (e.g., Phase 3 cutover). */
  readonly supersededBy?: AgentDefinitionRid;
}

/**
 * In-memory registry — populated at module load by seed files.
 * Filesystem walk in pm_plugin_self_check cross-checks against this registry
 * advisory-only in v2.27.0; primitive-authoritative flip is later work.
 */
export class AgentDefinitionRegistry {
  private readonly items = new Map<AgentDefinitionRid, AgentDefinitionDeclaration>();

  register(decl: AgentDefinitionDeclaration): void {
    this.items.set(decl.agentId, decl);
  }

  get(rid: AgentDefinitionRid): AgentDefinitionDeclaration | undefined {
    return this.items.get(rid);
  }

  findBySlug(slug: string): AgentDefinitionDeclaration | undefined {
    for (const a of this.items.values()) {
      if (a.slug === slug) return a;
    }
    return undefined;
  }

  findByScope(scope: AgentScope): AgentDefinitionDeclaration[] {
    return [...this.items.values()].filter((a) => a.scope === scope);
  }

  list(): AgentDefinitionDeclaration[] {
    return [...this.items.values()];
  }

  /** Convenience: list slugs only — useful for filesystem cross-check. */
  listSlugs(): string[] {
    return [...this.items.values()].map((a) => a.slug);
  }
}

export const AGENT_DEFINITION_REGISTRY = new AgentDefinitionRegistry();
