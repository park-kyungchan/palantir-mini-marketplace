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
 * invoked (e.g. `/palantir-mini:pm-rule-audit`); the slug here is unprefixed.
 *
 * Authority chain:
 *   ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §10.2
 *   -> ~/.claude/plans/immutable-forging-summit.md §4.1 T2d-5
 *   -> ./../primitives/skill-definition.ts (type spec)
 *
 * @owner palantirkc-ontology
 * @purpose seed SkillDefinitionRegistry from filesystem inventory
 */

import * as os from "node:os";
import {
  SKILL_DEFINITION_REGISTRY,
  skillDefinitionRid,
} from "../primitives/skill-definition";

const HOME = process.env.HOME ?? os.homedir();

const PLUGIN_SKILLS_DIR = `${HOME}/.claude/plugins/palantir-mini/skills`;
const USER_SKILLS_DIR = `${HOME}/.claude/skills`;

/** Plugin-scope skills — palantir-mini bundle. Namespace prefix `palantir-mini:` applied at invocation. */
const PLUGIN_SKILLS: ReadonlyArray<{
  slug: string;
  description: string;
}> = [
  { slug: "pm-ai-fde-route",            description: "Route a user prompt to the appropriate AI FDE mode (8 canonical modes) + suggest the mode-scoped tool surface for mode-aware retrieval" },
  { slug: "pm-aip-agent-author",        description: "Author an AIPAgentDeclaration — ontology-connected product agent (Chatbot Studio / AI FDE / AIP Assist) with scoped tools + eval suites + deployment lifecycle" },
  { slug: "pm-blueprint",               description: "TechBlueprint generation via kosmos 7-agent Agent Teams research pipeline pattern" },
  { slug: "pm-codegen",                 description: "Run palantir-mini codegen to regenerate <project>/src/generated/ from schemas" },
  { slug: "pm-cold-start-orchestrate",  description: "Manually invoked (or Lead-invoked) — deep-injects canonical research BROWSE+INDEX context; no SessionStart auto-fire hook (the former companion hook was retired as an orphan)" },
  { slug: "pm-dirty-classify",          description: "Manual triage of working-tree dirt via 4-axis classifier (auto-regen / safe / review / block) — companion to session-start-dirty-classify + pre-pr-dirty-gate hooks" },
  { slug: "pm-dtc-fill",                description: "Turn-by-turn DTC (DigitalTwinChangeContract) fill conversation — runs after an approved SIC tied to an FDEOntologyEngineeringSession to build DATA/LOGIC/ACTION evidence" },
  { slug: "pm-eval-suite",              description: "AIP-Evals lifecycle — author | run | compare modes over an EvaluationSuite (test cases + target + evaluator policy, run dispatch, baseline-vs-candidate experiment decision)" },
  { slug: "pm-fde-session-preview",     description: "Show a read-only FDE Ontology Build Session preview — mission/object/link/action/function readiness for non-developer users" },
  { slug: "pm-guard",                   description: "Full safety mode — destructive command warnings + directory-scoped edits" },
  { slug: "pm-hitl-feedback-workbench", description: "Generic HITL Lead Feedback Workbench — create docs-only user-review artifacts for any ontology engineering work needing user feedback before the Lead proceeds" },
  { slug: "pm-impact-quick",            description: "1-call wrapper for impact_query + pm_workflow_lineage_query targeting a single RID" },
  { slug: "pm-init",                    description: "Bootstrap palantir-mini for a project — create .palantir-mini/session/ + emit session_started" },
  { slug: "pm-intent-to-ontology",      description: "1-call wrapper for the 6-step Intent-to-Ontology Protocol — extract ontology intent from a complex prompt touching multiple files / new features / architectural change" },
  { slug: "pm-investigate",             description: "Systematic root-cause debugging — 4 phases (investigate/analyze/hypothesize/implement)" },
  { slug: "pm-learn",                   description: "Manage cross-session project learnings — review/search/prune/export/log insights" },
  { slug: "pm-lineage",                 description: "Cross-project workflow lineage query — joins events.jsonl across registered + auto-discovered projects + filters by 5-dim Decision Lineage" },
  { slug: "pm-lsp-audit",               description: "Comprehensive codebase audit using LSP-powered TypeScript code analysis" },
  { slug: "pm-mcp-reload",              description: "Guide the user through MCP server module reload after a bridge handler edit so handler changes are picked up by MCP tool calls" },
  { slug: "pm-memory-map",              description: "4-layer agentic memory balance audit (working / episodic / semantic / procedural) — distribution + per-event-type stats + recommendations" },
  { slug: "pm-ontology-branch-create",  description: "Create an OntologyBranchDeclaration (Foundry Global Branching / AI FDE working branch) to sandbox a what-if or reviewable ontology edit cycle without mutating production" },
  { slug: "pm-ontology-engineering-lead", description: "Docs-only session-first Lead workflow for ontology engineering — does not register a public MCP tool and does not authorize mutation" },
  { slug: "pm-ontology-proposal-create", description: "Create an OntologyProposalDeclaration (or GlobalBranchingProposal v1.40+) from a branch + edits as a review surface — proposals are reviews, not direct commits" },
  { slug: "pm-ontology-proposal-review", description: "Append a review verdict (approve / reject / defer / merge) to an existing OntologyProposal / GlobalBranchingProposal" },
  { slug: "pm-orchestrate",             description: "Ontology-Driven work orchestration — 6-phase protocol for complex multi-step tasks" },
  { slug: "pm-pr-impact",               description: "PR-scoped impact analysis — diffs branch vs base + computes blast radius" },
  { slug: "pm-project-onboard",         description: "Scaffold the minimum palantir-mini ProjectOntologyIndex runtime for a project (idempotent 4-file scaffold via runOnboardScaffold) without changing application runtime code" },
  { slug: "pm-recap",                   description: "Cold-start state surfacing — fold last N events to compact markdown brief" },
  { slug: "pm-replay",                  description: "Deterministic BackwardProp replay of events.jsonl filtered by 5-dim Decision Lineage" },
  { slug: "pm-research",                description: "Research-library lifecycle — diff (local vs upstream drift) | refresh (manifest-backed re-fetch) | audit (manifest staleness report) modes" },
  { slug: "pm-retro",                   description: "Engineering retrospective — aggregates session metrics from event log" },
  { slug: "pm-review",                  description: "Pre-landing PR review — analyzes diff against base for SQL safety / LLM trust / etc." },
  { slug: "pm-rule-audit",              description: "Comprehensive rules/ health check via pm_rule_audit MCP" },
  { slug: "pm-rule-memory-prune",       description: "Unified prune-candidate list combining pm_rule_audit (unused_rule_30d) + stale-memory findings for rule 26 substrate housekeeping" },
  { slug: "pm-self-test",               description: "End-to-end smoke test of the plugin-only substrate — schema pin + codegen + harness + rule audit" },
  { slug: "pm-semantic-intent-gate",    description: "Maintain the FDE-to-contract front door — FDE meaning discovery, SIC boundary, DTC handoff" },
  { slug: "pm-ship",                    description: "Ship workflow — base detect/merge + tests + coverage + diff + version + commit + push + PR" },
  { slug: "pm-t4-promotion-review",     description: "Audit T4-graded events (rule 26 §Substrate routing top tier) and surface candidates meriting promotion to canonical surfaces (shared-core re-export, rule citation)" },
  { slug: "pm-understand",              description: "Run the 9-axis understand-phase (the harness heart) — surface a request's explicit + implicit intent across the 9 axes before any build" },
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
