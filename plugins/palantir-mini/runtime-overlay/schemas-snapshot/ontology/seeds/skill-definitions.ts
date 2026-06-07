/**
 * @stable — SkillDefinition seed instances (v1.27.0)
 *
 * Minimal seeds for current Claude Code skills — covers both plugin-scope
 * (`~/.claude/plugins/palantir-mini/skills/pm-XXX/SKILL.md`) and user-scope
 * (`~/.claude/skills/<name>/SKILL.md`).
 *
 * v1.27.0 ships LIGHTWEIGHT seeds (slug + scope + filePath + description
 * stub). Full frontmatter hydration via `pm-codegen` automation arrives in
 * v1.28.0+. Plugin skills are namespace-prefixed via the plugin's name when
 * invoked (e.g. `/palantir-mini:pm-rule`); the slug here is unprefixed.
 *
 * Authority chain:
 *   ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §10.2
 *   -> ~/.claude/plans/immutable-forging-summit.md §4.1 T2d-5
 *   -> ./../primitives/skill-definition.ts (type spec)
 *
 * @owner palantirkc-ontology
 * @purpose seed SkillDefinitionRegistry from filesystem inventory
 */

import {
  SKILL_DEFINITION_REGISTRY,
  skillDefinitionRid,
} from "../primitives/skill-definition";

const HOME = process.env.HOME ?? "/home/palantirkc";

const PLUGIN_SKILLS_DIR = `${HOME}/.claude/plugins/palantir-mini/skills`;
const USER_SKILLS_DIR = `${HOME}/.claude/skills`;

/** Plugin-scope skills — palantir-mini bundle. Namespace prefix `palantir-mini:` applied at invocation. */
const PLUGIN_SKILLS: ReadonlyArray<{
  slug: string;
  description: string;
}> = [
  { slug: "pm-autoplan",                description: "Auto-review pipeline — invokes CEO/eng/DX review skills + auto-decides via 6 encoded principles" },
  { slug: "pm-blueprint",               description: "TechBlueprint generation via kosmos 7-agent Agent Teams research pipeline pattern" },
  { slug: "pm-change-plan",             description: "Generate SemanticChangePlan walking the ontology-first semantic graph" },
  { slug: "pm-codegen",                 description: "Run palantir-mini codegen to regenerate <project>/src/generated/ from schemas" },
  { slug: "pm-decision-replay",         description: "BackProp circuit replay — folds T3+ events only (T2+ optional via flag) for noise-free decision lineage replay" },
  { slug: "pm-events-rotate",           description: "Rotate a project's events.jsonl when it crosses size or line-count thresholds — atomic rename to <sessionDir>/archive/events-rotated-<ISO>.jsonl" },
  { slug: "pm-guard",                   description: "Full safety mode — destructive command warnings + directory-scoped edits" },
  { slug: "pm-harness-abort",           description: "Force-terminate a FeedbackLoop preserving artifacts + evidence" },
  { slug: "pm-harness-analyze",         description: "Spawn harness-analyzer agent for failed sprint iteration" },
  { slug: "pm-harness-base-mode-audit", description: "B1 → B2 escalation observation audit — weekly snapshot of commit-edits-precondition gate behavior" },
  { slug: "pm-harness-component-audit", description: "v2.21.0 W5 — run component stress-test audit per Rajasekaran §1" },
  { slug: "pm-harness-grade",           description: "Standalone rubric grading — apply GradingRubric to any artifact" },
  { slug: "pm-harness-init",            description: "Bootstrap the 3-agent harness workspace in a project" },
  { slug: "pm-harness-plan",            description: "Spawn harness-planner agent for spec + GradingRubric expansion" },
  { slug: "pm-harness-sprint",          description: "Execute a sprint in the harness (rule 16) — default 2-role" },
  { slug: "pm-harness-status",          description: "Query current state of all active FeedbackLoops in a project" },
  { slug: "pm-harness-stop",            description: "Orderly abort of all active harness loops in current project" },
  { slug: "pm-init",                    description: "Bootstrap palantir-mini for a project — create .palantir-mini/session/ + emit session_started" },
  { slug: "pm-investigate",             description: "Systematic root-cause debugging — 4 phases (investigate/analyze/hypothesize/implement)" },
  { slug: "pm-learn",                   description: "Manage cross-session project learnings — review/search/prune/export/log insights" },
  { slug: "pm-lineage",                 description: "Cross-project workflow lineage query — joins events.jsonl across registered + auto-discovered projects + filters by 5-dim Decision Lineage" },
  { slug: "pm-lsp-audit",               description: "Comprehensive codebase audit using LSP-powered TypeScript code analysis" },
  { slug: "pm-memory-map",              description: "4-layer agentic memory balance audit (working / episodic / semantic / procedural) — distribution + per-event-type stats + recommendations" },
  { slug: "pm-office-hours",            description: "YC Office Hours — startup forcing-questions or builder design-thinking modes" },
  { slug: "pm-orchestrate",             description: "Ontology-Driven work orchestration — 6-phase protocol for complex multi-step tasks" },
  { slug: "pm-plan-eng-review",         description: "Eng manager-mode plan review — locks in execution architecture" },
  { slug: "pm-pr-impact",               description: "PR-scoped impact analysis — diffs branch vs base + computes blast radius" },
  { slug: "pm-quick-sprint",            description: "Bootstrap a 1-iteration SprintContract for Lead-direct work — satisfies harness commit-gate per rule 16 v3.3.0+" },
  { slug: "pm-recap",                   description: "Cold-start state surfacing — fold last N events to compact markdown brief" },
  { slug: "pm-replay",                  description: "Deterministic BackwardProp replay of events.jsonl filtered by 5-dim Decision Lineage" },
  { slug: "pm-research-diff",           description: "Show what changed between local research library and upstream canonical sources" },
  { slug: "pm-research-refresh",        description: "Audit/refresh/prune palantir-mini research libraries via diff+refresh+prune chain" },
  { slug: "pm-retro",                   description: "Engineering retrospective — aggregates session metrics from event log" },
  { slug: "pm-review",                  description: "Pre-landing PR review — analyzes diff against base for SQL safety / LLM trust / etc." },
  { slug: "pm-rule",                    description: "Fetch or enumerate Claude-local overlay rules via pm_rule_query MCP" },
  { slug: "pm-rule-audit",              description: "Comprehensive rules/ health check via pm_rule_audit MCP" },
  { slug: "pm-self-test",               description: "End-to-end smoke test of the plugin-only substrate — schema pin + codegen + harness + rule audit" },
  { slug: "pm-ship",                    description: "Ship workflow — base detect/merge + tests + coverage + diff + version + commit + push + PR" },
  { slug: "pm-value-audit",             description: "Substrate health dashboard for rule 26 valuable-data — T0-T4 distribution + 7-day trend + alarm thresholds" },
  { slug: "pm-verify",                  description: "Run palantir-mini validation pipeline — Design + Compile + Runtime + Post-Write phases" },
  { slug: "pm-walk-analyze",            description: "Mode B (Project Analysis) — walk real production ontology code block by block" },
  { slug: "pm-walk-build",              description: "Mode A (Small Block) — build ontology entities step by step using scene-based pedagogy" },
];

/** User-scope skills — DELETED at v3.0.0 Phase 3 (user-scope cutover). Empty array. */
const USER_SCOPE_SKILLS: ReadonlyArray<{
  slug: string;
  description: string;
}> = [];

// ─── Register seeds ──────────────────────────────────────────────────────────

for (const s of PLUGIN_SKILLS) {
  SKILL_DEFINITION_REGISTRY.register({
    skillId: skillDefinitionRid(`skill-plugin-${s.slug}`),
    slug: s.slug,
    description: s.description,
    scope: "plugin",
    filePath: `${PLUGIN_SKILLS_DIR}/${s.slug}/SKILL.md`,
  });
}

for (const s of USER_SCOPE_SKILLS) {
  SKILL_DEFINITION_REGISTRY.register({
    skillId: skillDefinitionRid(`skill-user-${s.slug}`),
    slug: s.slug,
    description: s.description,
    scope: "user",
    filePath: `${USER_SKILLS_DIR}/${s.slug}/SKILL.md`,
  });
}

/** Convenience export — total seed count. */
export const SKILL_DEFINITION_SEED_COUNT =
  PLUGIN_SKILLS.length + USER_SCOPE_SKILLS.length;
