// palantir-mini — lib/delegation-recipe/recipe-builder.ts
// Pure function: intent + scope → neutral DispatchDecision.
//
// W3b-2b (v6.95.0) — de-identified for the LLM-agnostic core. Removed the Claude
//   agent/model bindings (DOMAIN_AGENT, AgentModel), the agent-selection subsystem
//   (router-suggested-agent consultation + recipe_agent_selected emit), the
//   execution DAG (DelegationExecutionPlan/Task), and the sprint/briefing/skills/
//   mcpTools/memoryLayers ceremony. buildRecipe now returns a flat, runtime-neutral
//   DispatchDecision; runtime adapters (Claude/Codex) own agent/model/skill
//   selection downstream. The neutral routing signal — 6-domain classification and
//   graphConfidence-derived DispatchMode — is retained.
//
// 6-domain model: rule | hook | primitive | research | agent-definition | mass-edit.

// ─── Imports ─────────────────────────────────────────────────────────────────

import type { OntologyContextQueryResult } from "../../bridge/handlers/ontology-context-query";

// ─── Types ──────────────────────────────────────────────────────────────────

export type RecipeDomain =
  | "rule"
  | "hook"
  | "primitive"
  | "research"
  | "agent-definition"
  | "mass-edit";

/**
 * graphConfidence-derived dispatch mode (sprint-098 PR 3.6).
 * Mirrors RecommendedAgentUse from lib/impact-query/graph-confidence.ts but
 * is surfaced at the dispatch layer so callers receive actionable routing intent.
 *
 * lead-direct          — high confidence (≥0.7); trust the graph, execute directly.
 * targeted-verification — medium confidence (0.4–<0.7); spawn ONE bounded explorer
 *                         to verify uncertain RIDs before committing edits.
 * bounded-explorer     — low confidence (<0.4); spawn multiple bounded explorers,
 *                         each assigned to a subset of missingEdges.
 *
 * Per canonical plan v2 §4 row 3.6 + proposal §8 Stage 5.
 */
export type DispatchMode = "lead-direct" | "targeted-verification" | "bounded-explorer";

/** Routing risk grade, derived from DispatchMode. */
export type DispatchRisk = "low" | "medium" | "high";

/**
 * Neutral dispatch decision (W3b-2b). Carries NO runtime/agent identity — a
 * Claude or Codex adapter maps `domain` + `dispatchMode` to concrete agents,
 * models, and tools at the adapter layer.
 */
export interface DispatchDecision {
  decision: "lead-direct" | "delegate";
  domain: RecipeDomain;
  dispatchMode: DispatchMode;
  risk: DispatchRisk;
  rationale: string;
}

export interface BuildRecipeInput {
  intent: string;
  scopePaths?: string[];
  complexityHint?: "trivial" | "single-file" | "multi-file" | "cross-cutting";
  affectedFiles?: string[];
  /**
   * Optional OntologyContext from ontology_context_query (PR 3.4).
   * When present, enriches scopePaths from retrievalContext and drives the
   * graphConfidence-based DispatchMode. Sprint-096 PR 3.4: canonical plan v2 §4 row 3.4.
   */
  ontologyContext?: OntologyContextQueryResult;
}

// ─── Domain tables (rule 07 §Agent file-ownership) ──────────────────────────

const DOMAIN_PATH_GLOBS: Record<RecipeDomain, readonly string[]> = {
  rule:              ["rules/", ".claude/rules/"],
  hook:              ["hooks/", "hooks.json", "bridge/handlers/"],
  primitive:         ["schemas/ontology/", ".claude/schemas/"],
  research:          ["research/", ".claude/research/", "docs/", "skills/"],
  "agent-definition":["plugins/palantir-mini/agents/", "projects/palantir-math/", "projects/mathcrew/"],
  "mass-edit":       [],
};

const DOMAIN_KEYWORDS: Record<RecipeDomain, readonly string[]> = {
  rule:              ["rule", "rules/", "rule-audit", "ruleId", "invariant", "CORE.md", "CONTEXT.md"],
  hook:              ["hook", "hooks/", "PostToolUse", "PreToolUse", "SubagentStart", "SubagentStop", "SessionStart", "handler", "mcp handler"],
  primitive:         ["schema", "schemas/", "primitive", "ontology primitive", "semver", "codegen", "pm-codegen"],
  research:          ["research", "research/", "mirror", "blog", "synthesis", "docs-researcher", "README", "CHANGELOG", "SKILL.md"],
  "agent-definition":["plugin agent", "project agent", "agents/", "plugin-scope agent"],
  "mass-edit":       ["mass", "mass-edit", "bulk", "all agents", "multiple files", "across all", "every plugin", "batch"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifyDomain(intent: string, scopePaths: string[]): RecipeDomain {
  const scopeStr = scopePaths.join(" ").toLowerCase();
  for (const [domain, globs] of Object.entries(DOMAIN_PATH_GLOBS) as [RecipeDomain, string[]][]) {
    if (globs.some((g) => scopeStr.includes(g.toLowerCase()))) return domain;
  }
  const combined = `${intent.toLowerCase()} ${scopeStr}`;
  if (DOMAIN_KEYWORDS["mass-edit"].some((kw) => combined.includes(kw.toLowerCase()))) return "mass-edit";
  const order: RecipeDomain[] = ["primitive", "hook", "rule", "research", "agent-definition"];
  for (const domain of order) {
    if (DOMAIN_KEYWORDS[domain].some((kw) => combined.includes(kw.toLowerCase()))) return domain;
  }
  return "research";
}

/** Map the confidence-derived DispatchMode onto a routing risk grade. */
function riskFromDispatchMode(mode: DispatchMode): DispatchRisk {
  if (mode === "lead-direct") return "low";
  if (mode === "targeted-verification") return "medium";
  return "high";
}

// ─── OntologyContext enrichment helpers (PR 3.4) ─────────────────────────────

/**
 * Derive a short digest string from OntologyContextQueryResult for lineage tracing.
 * Format: "gc:<graphConfidence>|rids:<axisRidCount>|caps:<totalCapabilities>|t3+:<t3PlusCount>"
 */
export function deriveOntologyContextDigest(ctx: OntologyContextQueryResult): string {
  const gc = ctx.graphConfidence.toFixed(2);
  const rids = ctx.impactContext?.axisRids.length ?? 0;
  const caps = ctx.capabilityContext?.totalCapabilities ?? 0;
  const t3Plus = ctx.lineageContext?.recentT3PlusEventCount ?? 0;
  return `gc:${gc}|rids:${rids}|caps:${caps}|t3+:${t3Plus}`;
}

/**
 * Merge scopePaths with files surfaced by ontologyContext.retrievalContext
 * (pluginSourceFiles.scopedFiles capped at 5 to avoid bloating the decision).
 * Returns a deduplicated merged array.
 */
function enrichScopePathsFromContext(
  base: string[],
  ctx: OntologyContextQueryResult,
): string[] {
  const extra = ctx.retrievalContext.pluginSourceFiles.scopedFiles ?? [];
  // Only add the first 5 scoped files to avoid unbounded growth
  const candidates = extra.slice(0, 5);
  const seen = new Set(base);
  const merged = [...base];
  for (const p of candidates) {
    if (!seen.has(p)) {
      merged.push(p);
      seen.add(p);
    }
  }
  return merged;
}

// ─── graphConfidence threshold routing (sprint-098 PR 3.6) ──────────────────

/**
 * Map graphConfidence to a DispatchMode per canonical plan v2 §4 row 3.6.
 *
 * Thresholds:
 *   graphConfidence ≥ 0.7  → "lead-direct"           (high confidence)
 *   0.4 ≤ gc < 0.7         → "targeted-verification"  (medium confidence)
 *   gc < 0.4               → "bounded-explorer"        (low confidence)
 *
 * Downgrade rule: when missingEdgesCount > 5, the mode is downgraded one tier
 * (lead-direct → targeted-verification; targeted-verification → bounded-explorer).
 * This handles the case where confidence is nominally high but the graph has
 * many unknown edges that could produce incorrect routing decisions.
 *
 * Edge case — boundary values:
 *   gc = 0.7  → "lead-direct"  (inclusive lower bound for lead-direct)
 *   gc = 0.4  → "targeted-verification" (inclusive lower bound)
 */
export function pickDispatchModeFromConfidence(
  graphConfidence: number,
  missingEdgesCount?: number,
): DispatchMode {
  let base: DispatchMode;
  if (graphConfidence >= 0.7) {
    base = "lead-direct";
  } else if (graphConfidence >= 0.4) {
    base = "targeted-verification";
  } else {
    base = "bounded-explorer";
  }

  // Downgrade by one tier when missing-edges exceeds safety threshold.
  const missingCount = missingEdgesCount ?? 0;
  if (missingCount > 5) {
    if (base === "lead-direct") base = "targeted-verification";
    else if (base === "targeted-verification") base = "bounded-explorer";
    // "bounded-explorer" stays — already lowest tier.
  }

  return base;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function buildRecipe(input: BuildRecipeInput): DispatchDecision {
  const {
    intent,
    scopePaths = [],
    complexityHint,
    affectedFiles = [],
    ontologyContext,
  } = input;

  // PR 3.4: enrich scopePaths from OntologyContext when available (feeds classifyDomain).
  const enrichedScopePaths = ontologyContext
    ? enrichScopePathsFromContext(scopePaths, ontologyContext)
    : scopePaths;

  const fileCount = enrichedScopePaths.length + affectedFiles.length;

  const domain = classifyDomain(intent, enrichedScopePaths);

  // Trivial, small-scope work: Lead handles inline. dispatchMode/risk sit at the
  // safe floor because nothing is delegated (graph confidence is moot here).
  if (complexityHint === "trivial" && fileCount <= 3) {
    return {
      decision: "lead-direct",
      domain,
      dispatchMode: "lead-direct",
      risk: "low",
      rationale: `Complexity hint is 'trivial' and file count (${fileCount}) ≤ 3. Lead handles inline.`,
    };
  }

  // Delegate path: DispatchMode from graphConfidence when ontologyContext is
  // available; otherwise default to lead-direct (high-confidence default).
  const dispatchMode: DispatchMode = ontologyContext
    ? pickDispatchModeFromConfidence(ontologyContext.graphConfidence, ontologyContext.missingEdges.length)
    : "lead-direct";
  const risk = riskFromDispatchMode(dispatchMode);

  return {
    decision: "delegate",
    domain,
    dispatchMode,
    risk,
    rationale:
      `Domain '${domain}' from intent/paths (dispatchMode '${dispatchMode}', risk '${risk}'). ` +
      `Delegate to a runtime adapter for agent/skill selection.`,
  };
}
