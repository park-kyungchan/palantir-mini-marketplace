/**
 * @stable — SkillDefinition primitive (prim-ops-23, v1.27.0)
 *
 * Typed representation of a Claude Code Skill declaration. Until v1.27.0,
 * skill SKILL.md files were filesystem conventions only. URL #47 docs ~15
 * frontmatter fields — typo in `disable-model-invocation` silently disables
 * the feature. This primitive turns the convention into ontology.
 *
 * Phase 2d (v2.27.0) ships the type + seed instances + advisory cross-check
 * in pm_plugin_self_check. Cross-refs `agent` to AgentDefinition (typed via
 * AgentDefinitionRid) so skills that bind to a model run through the
 * subagent registry.
 *
 * Authority chain:
 *   ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §10.2
 *   -> ~/.claude/plans/immutable-forging-summit.md §4.1 T2d-2
 *   -> https://code.claude.com/docs/en/skills (frontmatter spec)
 *
 * D/L/A domain: OPS (substrate health input; skill-frontmatter-validate substrate)
 * @owner palantirkc-ontology
 * @purpose SkillDefinition primitive (Phase 2d schemas v1.27.0)
 */

import type { AgentDefinitionRid } from "./agent-definition";

export type SkillDefinitionRid = string & { readonly __brand: "SkillDefinitionRid" };

export const skillDefinitionRid = (s: string): SkillDefinitionRid =>
  s as SkillDefinitionRid;

/** Skill scope precedence per https://code.claude.com/docs/en/skills:
 *  enterprise > personal (~/.claude/skills/) > project (.claude/skills/).
 *  Plugin skills always namespaced (`/<plugin>:<skill>`) so they don't collide. */
export type SkillScope = "plugin" | "user" | "project" | "enterprise";

export type SkillModel = "haiku" | "sonnet" | "opus" | "inherit";

/**
 * Typed mirror of a Claude Code skill SKILL.md frontmatter + metadata.
 * `agent: AgentDefinitionRid?` cross-refs the subagent registry — type-checked
 * at compile time, advisory-checked at runtime via pm_plugin_self_check.
 */
export interface SkillDefinitionDeclaration {
  readonly skillId: SkillDefinitionRid;
  /** Kebab-case slug (e.g. "pm-rule"). Plugin skills carry their plugin name as namespace. */
  readonly slug: string;
  /** Frontmatter `description:` line. ≤1536 chars per Anthropic spec. */
  readonly description: string;
  readonly scope: SkillScope;
  readonly allowedTools?: ReadonlyArray<string>;
  readonly model?: SkillModel;
  /**
   * costClass — economic cost tier orthogonal to effort.
   *   low    — cheap fast call (haiku-tier model + minimal token budget).
   *   medium — sonnet-tier subagent OR ≥2 MCP roundtrips.
   *   high   — opus-tier subagent OR multi-iter sprint OR ≥10 MCP roundtrips.
   *
   * Used by pm_dispatch_cost_estimate handler + audit §C.
   * Schemas v1.45.0+ (sprint-053 W3D).
   */
  readonly costClass?: "low" | "medium" | "high";
  /** Frontmatter `disable-model-invocation: true` — skill must be user-invoked only. */
  readonly disableModelInvocation?: boolean;
  /** Frontmatter `user-invocable: false` — skill cannot be invoked via /<plugin>:<skill>. */
  readonly userInvocable?: boolean;
  readonly argumentHint?: string;
  readonly argumentsList?: ReadonlyArray<string>;
  /** Frontmatter `context: fork` — fork conversation when skill runs. */
  readonly context?: "fork";
  /** Cross-ref to AgentDefinition.slug (when skill is bound to a specific agent). */
  readonly agent?: AgentDefinitionRid;
  /** Optional file/directory paths the skill operates on (used by some auto-spawn skills). */
  readonly paths?: ReadonlyArray<string>;
  /** Absolute path to the SKILL.md file on disk. */
  readonly filePath: string;
  /** When set, the skill is deprecated — superseded by another. */
  readonly deprecatedBy?: string;
  readonly supersededBy?: SkillDefinitionRid;
}

/**
 * In-memory registry — populated at module load by seed files.
 */
export class SkillDefinitionRegistry {
  private readonly items = new Map<SkillDefinitionRid, SkillDefinitionDeclaration>();

  register(decl: SkillDefinitionDeclaration): void {
    this.items.set(decl.skillId, decl);
  }

  get(rid: SkillDefinitionRid): SkillDefinitionDeclaration | undefined {
    return this.items.get(rid);
  }

  findBySlug(slug: string): SkillDefinitionDeclaration | undefined {
    for (const s of this.items.values()) {
      if (s.slug === slug) return s;
    }
    return undefined;
  }

  findByScope(scope: SkillScope): SkillDefinitionDeclaration[] {
    return [...this.items.values()].filter((s) => s.scope === scope);
  }

  /** Skills that cross-ref a specific AgentDefinition. */
  findByAgent(agent: AgentDefinitionRid): SkillDefinitionDeclaration[] {
    return [...this.items.values()].filter((s) => s.agent === agent);
  }

  list(): SkillDefinitionDeclaration[] {
    return [...this.items.values()];
  }

  listSlugs(): string[] {
    return [...this.items.values()].map((s) => s.slug);
  }
}

export const SKILL_DEFINITION_REGISTRY = new SkillDefinitionRegistry();
