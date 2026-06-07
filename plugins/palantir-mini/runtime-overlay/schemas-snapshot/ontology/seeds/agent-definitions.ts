/**
 * @stable — AgentDefinition seed instances (v1.27.0)
 *
 * Minimal seeds for current Claude Code agents — covers both plugin-scope
 * (~/.claude/plugins/palantir-mini/agents/) and user-scope (~/.claude/agents/).
 * Each entry is registered into AGENT_DEFINITION_REGISTRY at module load.
 *
 * v1.27.0 ships LIGHTWEIGHT seeds (slug + scope + filePath + description
 * stub). Full frontmatter hydration via `pm-codegen` automation arrives in
 * v1.28.0+. pm_plugin_self_check uses these seeds for advisory-only
 * cross-check vs filesystem walk; FILESYSTEM REMAINS AUTHORITATIVE.
 *
 * When adding/removing/renaming agents:
 *   1. Update this seed file in the same PR as the .md file.
 *   2. v1.28.0+ — `pm-codegen agent-registry` will regenerate this file
 *      from the .md frontmatter automatically.
 *
 * Authority chain:
 *   ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §10.1
 *   -> ~/.claude/plans/immutable-forging-summit.md §4.1 T2d-4
 *   -> ./../primitives/agent-definition.ts (type spec)
 *
 * @owner palantirkc-ontology
 * @purpose seed AgentDefinitionRegistry from filesystem inventory
 */

import {
  AGENT_DEFINITION_REGISTRY,
  agentDefinitionRid,
  type AgentDefinitionDeclaration,
} from "../primitives/agent-definition";

const HOME = process.env.HOME ?? "/home/palantirkc";

const PLUGIN_AGENTS_DIR = `${HOME}/.claude/plugins/palantir-mini/agents`;
const USER_AGENTS_DIR = `${HOME}/.claude/agents`;

/** Plugin-scope agents — palantir-mini bundle. */
const PLUGIN_AGENTS: ReadonlyArray<{
  slug: string;
  description: string;
  model: AgentDefinitionDeclaration["model"];
  maxTurns: number;
  deprecatedBy?: string;
}> = [
  // 9 migrated copies (priority 5 — dormant; user-scope still wins)
  { slug: "researcher",            description: "Deep research specialist for multi-angle information gathering", model: "opus",   maxTurns: 30 },
  { slug: "docs-researcher",       description: "Opus-powered research + synthesis + write specialist", model: "opus",   maxTurns: 40 },
  { slug: "implementer",           description: "Focused execution specialist for coding/refactoring/file modifications", model: "sonnet", maxTurns: 30 },
  { slug: "verifier-correctness",  description: "Verification specialist for correctness/completeness/consistency", model: "opus",   maxTurns: 30 },
  { slug: "verifier-adversarial",  description: "Adversarial verification specialist — red team lens", model: "opus",   maxTurns: 30 },
  { slug: "protocol-designer",     description: "Claude-local rule authoring specialist", model: "sonnet", maxTurns: 25 },
  { slug: "hook-builder",          description: "palantir-mini plugin hook + monitor + script specialist", model: "sonnet", maxTurns: 35 },
  { slug: "plugin-maintainer",     description: "palantir-mini plugin maintenance specialist (version sync + RBAC fragments)", model: "sonnet", maxTurns: 30 },
  { slug: "ontology-steward",      description: "Shared-schema + shared-core ontology steward", model: "opus",   maxTurns: 40 },
  // 5 new plugin agents (Phase 1 v2.23.0)
  { slug: "lead-orchestrator",     description: "Formal Lead-as-spawnable-agent — Lead Protocol v2 implementation", model: "opus",   maxTurns: 40 },
  { slug: "eval-judge",            description: "Explicit rubric grading agent — opus-tier judge for harness rubric criteria", model: "opus",   maxTurns: 30 },
  { slug: "code-grader",           description: "Shell-expression rubric scoring — sonnet-tier code-domain criterion evaluator", model: "sonnet", maxTurns: 20 },
  { slug: "model-grader",          description: "claude -p rubric scoring — sonnet-tier model-domain criterion evaluator", model: "sonnet", maxTurns: 20 },
  { slug: "scrapling-fetcher",     description: "Haiku-tier cost-optimized web fetch agent — pure content delivery", model: "haiku",  maxTurns: 10 },

  // (Deprecated documentation-writer agent entry removed 2026-05-04 in
  // palantirkc-sprint-002-quick PR-D follow-up: the .md file had been absent
  // on disk; the agent itself was retired 2026-05-03 nifty-mixing-diffie Phase
  // 6 — duties consolidated into the docs-researcher seed entry above per rule
  // 12 §research-over-codegen.)
];

/** User-scope agents — DELETED at v3.0.0 Phase 3 (user-scope cutover). Empty array. */
const USER_SCOPE_AGENTS: ReadonlyArray<{
  slug: string;
  description: string;
  model: AgentDefinitionDeclaration["model"];
  maxTurns: number;
  deprecatedBy?: string;
}> = [];

// ─── Register seeds ──────────────────────────────────────────────────────────

for (const a of PLUGIN_AGENTS) {
  AGENT_DEFINITION_REGISTRY.register({
    agentId: agentDefinitionRid(`agent-plugin-${a.slug}`),
    slug: a.slug,
    description: a.description,
    scope: "plugin",
    model: a.model,
    maxTurns: a.maxTurns,
    tools: [],
    filePath: `${PLUGIN_AGENTS_DIR}/${a.slug}.md`,
    ...(a.deprecatedBy ? { deprecatedBy: a.deprecatedBy } : {}),
  });
}

for (const a of USER_SCOPE_AGENTS) {
  AGENT_DEFINITION_REGISTRY.register({
    agentId: agentDefinitionRid(`agent-user-${a.slug}`),
    slug: a.slug,
    description: a.description,
    scope: "user",
    model: a.model,
    maxTurns: a.maxTurns,
    tools: [],
    filePath: `${USER_AGENTS_DIR}/${a.slug}.md`,
    ...(a.deprecatedBy ? { deprecatedBy: a.deprecatedBy } : {}),
  });
}

/** Convenience export — total seed count. */
export const AGENT_DEFINITION_SEED_COUNT =
  PLUGIN_AGENTS.length + USER_SCOPE_AGENTS.length;
