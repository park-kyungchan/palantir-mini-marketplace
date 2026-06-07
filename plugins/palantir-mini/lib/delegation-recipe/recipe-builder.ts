// palantir-mini v4.12.0 — lib/delegation-recipe/recipe-builder.ts
// Pure function: intent + scope → DelegationRecipe (rule 12 §Pre-delegation + rule 07 §Agent file-ownership)
// 6-domain model: rule | hook | primitive | research | agent-definition | mass-edit
// v4.12.1+: consults CapabilityRouterResult.suggestedAgents before static domain map
// v4.12.2 (sprint-096 PR 3.4): accepts optional OntologyContextQueryResult to enrich recipe
//   - scopePaths enriched from retrievalContext.pluginSourceFiles.scopedFiles when present
//   - sprint mode upgraded to "full" when impactContext.perRidImpact has any
//     forwardCount+backwardCount > 6 (cross-cutting signal)
//   - ontologyContextDigest surfaced for downstream consumers
// v4.12.3 (sprint-098 PR 3.6): graphConfidence threshold-based dispatchMode routing
//   - DelegationRecipe gains optional dispatchMode / verificationScope / boundedExplorers
//   - pickDispatchModeFromConfidence: ≥0.7 → lead-direct, 0.4–0.7 → targeted-verification,
//     <0.4 → bounded-explorer; missingEdges>5 downgrades by one tier
//   - Per canonical plan v2 §4 row 3.6 + proposal §8 Stage 5.

// ─── Imports ─────────────────────────────────────────────────────────────────

import type { CapabilityRouterResult } from "../capability/capability-router";
import type { OntologyContextQueryResult } from "../../bridge/handlers/ontology-context-query";

// ─── Types ──────────────────────────────────────────────────────────────────

export type RecipeDomain =
  | "rule"
  | "hook"
  | "primitive"
  | "research"
  | "agent-definition"
  | "mass-edit";

export type AgentModel = "opus" | "sonnet" | "haiku";

export type MemoryLayer = "working" | "episodic" | "semantic" | "procedural";

/**
 * graphConfidence-derived dispatch mode (sprint-098 PR 3.6).
 * Mirrors RecommendedAgentUse from lib/impact-query/graph-confidence.ts but
 * is surfaced at the recipe layer so callers receive actionable routing intent.
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

/**
 * Scope entry for a single bounded-explorer agent.
 * Each explorer is assigned a disjoint subset of missingEdges (3-5 per agent, capped at 3 agents).
 */
export interface BoundedExplorerScope {
  readonly scope: ReadonlyArray<string>;
  readonly focus: string;
}

export interface RecipeContractBinding {
  readonly workContractRef?: string;
  readonly routerBindingRef?: string;
}

export interface DelegationExecutionTask {
  readonly taskId: string;
  readonly phase: "parallel-readonly" | "sequential-worker" | "verification" | "lead-only";
  readonly agent: string;
  readonly dependsOn: ReadonlyArray<string>;
  readonly writeScope: ReadonlyArray<string>;
  readonly readOnlyScope: ReadonlyArray<string>;
  readonly forbiddenScope: ReadonlyArray<string>;
  readonly outputContract: ReadonlyArray<string>;
}

export interface DelegationExecutionPlan {
  readonly leadRole: "orchestrator";
  readonly dispatchMode: DispatchMode;
  readonly parallelReadOnlyAgents: ReadonlyArray<DelegationExecutionTask>;
  readonly sequentialWorkers: ReadonlyArray<DelegationExecutionTask>;
  readonly verificationAgents: ReadonlyArray<DelegationExecutionTask>;
  readonly leadOnlyTasks: ReadonlyArray<DelegationExecutionTask>;
  readonly exclusiveWriteScopes: ReadonlyArray<string>;
  readonly forbiddenScopes: ReadonlyArray<string>;
  readonly runtimeGaps: ReadonlyArray<string>;
}

export interface DelegationRecipe {
  decision: "lead-direct" | `delegate-to-${string}`;
  rationale: string;
  recipe?: {
    agent: string;
    agentModel: AgentModel;
    mcpTools: string[];
    skills: string[];
    sprintArgs: { mode: "quick" | "full"; iterationLimit: number; timeoutMs: number };
    criticalFiles: string[];
    verifyCommand: string | null;
    memoryLayers: MemoryLayer[];
    outOfScope: string[];
    briefingTemplate: string;
    /**
     * Dispatch mode derived from graphConfidence (sprint-098 PR 3.6).
     * Absent when ontologyContext was not provided to buildRecipe.
     */
    dispatchMode?: DispatchMode;
    /**
     * RIDs with per-RID graphConfidence below 0.7 — the uncertain set that
     * targeted-verification mode should verify. Present only when
     * dispatchMode === "targeted-verification".
     */
    verificationScope?: ReadonlyArray<string>;
    /**
     * Per-explorer assignment chunks for bounded-explorer mode.
     * Present only when dispatchMode === "bounded-explorer".
     * Capped at 3 explorers; each explorer receives 3-5 missingEdge RID pairs.
     */
    boundedExplorers?: ReadonlyArray<BoundedExplorerScope>;
    /**
     * Deterministic execution DAG for Lead orchestration. This is a recipe
     * contract only; runtimes still need native subagent support to execute it.
     */
    delegationExecutionPlan?: DelegationExecutionPlan;
    /**
     * Optional WorkContract/RouterBinding refs attached by pm_intent_router.
     * Additive only: existing DelegationRecipe callers can ignore this field.
     */
    contractBinding?: RecipeContractBinding;
  };
}

export interface BuildRecipeInput {
  intent: string;
  scopePaths?: string[];
  complexityHint?: "trivial" | "single-file" | "multi-file" | "cross-cutting";
  affectedFiles?: string[];
  /**
   * Optional result from a prior routeCapabilityOntology() call.
   * When suggestedAgents.length > 0, the top-scored agent is used instead of
   * the static 6-domain map. Falls back to static map when empty or absent.
   * An `recipe_agent_selected` event is emitted with chosenPath for lineage.
   */
  routerResult?: CapabilityRouterResult;
  /**
   * Optional async emit function injected by caller (pm-intent-router handler).
   * When provided, buildRecipe will emit recipe_agent_selected via this fn.
   * Signature matches scripts/log.ts emit() interface subset.
   */
  emitFn?: (args: {
    type: string;
    payload: Record<string, unknown>;
    toolName: string;
    cwd: string;
    reasoning: string;
    memoryLayers: string[];
  }) => Promise<void>;
  /**
   * Optional OntologyContext from ontology_context_query (PR 3.4).
   * When present, enriches scopePaths from retrievalContext, upgrades sprint
   * mode to "full" when cross-cutting impact is detected, and surfaces
   * ontologyContextDigest for lineage tracing.
   * Sprint-096 PR 3.4: canonical plan v2 §4 row 3.4.
   */
  ontologyContext?: OntologyContextQueryResult;
  /**
   * Optional WorkContract/RouterBinding refs. buildRecipe only carries these
   * through as metadata; it does not validate or change routing decisions.
   */
  contractBinding?: RecipeContractBinding;
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

const DOMAIN_AGENT: Record<RecipeDomain, { agent: string; model: AgentModel }> = {
  rule:              { agent: "protocol-designer", model: "sonnet" },
  hook:              { agent: "hook-builder",       model: "sonnet" },
  primitive:         { agent: "ontology-steward",   model: "opus"   },
  research:          { agent: "docs-researcher",    model: "opus"   },
  "agent-definition":{ agent: "implementer",        model: "sonnet" },
  "mass-edit":       { agent: "implementer",        model: "sonnet" },
};

const DOMAIN_MCP_TOOLS: Record<RecipeDomain, string[]> = {
  rule:              ["pm_rule_query", "pm_rule_audit", "emit_event"],
  hook:              ["apply_edit_function", "commit_edits", "emit_event"],
  primitive:         ["apply_edit_function", "commit_edits", "emit_event", "pm_rule_query"],
  research:          ["research_library_refresh", "emit_event", "pm_rule_query"],
  "agent-definition":["apply_edit_function", "commit_edits", "emit_event"],
  "mass-edit":       ["apply_edit_function", "commit_edits", "emit_event"],
};

const DOMAIN_SKILLS: Record<RecipeDomain, string[]> = {
  rule:              ["/palantir-mini:pm-rule-audit", "/palantir-mini:pm-rule"],
  hook:              ["/palantir-mini:pm-harness-grade", "/palantir-mini:pm-rule-audit"],
  primitive:         ["/palantir-mini:pm-codegen", "/palantir-mini:pm-verify"],
  research:          ["/palantir-mini:pm-research-diff", "/palantir-mini:pm-research-staleness-audit"],
  "agent-definition":["/palantir-mini:pm-rule-audit"],
  "mass-edit":       ["/palantir-mini:pm-rule-audit", "/palantir-mini:pm-verify"],
};

const DOMAIN_MEMORY_LAYERS: Record<RecipeDomain, MemoryLayer[]> = {
  rule:              ["semantic", "procedural"],
  hook:              ["working", "procedural"],
  primitive:         ["semantic", "procedural"],
  research:          ["episodic", "semantic"],
  "agent-definition":["procedural", "episodic"],
  "mass-edit":       ["working", "procedural"],
};

const DOMAIN_OUT_OF_SCOPE: Record<RecipeDomain, string[]> = {
  rule:              ["hooks/**", "bridge/handlers/**", "lib/**", ".codex-plugin/plugin.json"],
  hook:              [".codex-plugin/plugin.json", "package.json", "agents/**", "skills/**"],
  primitive:         ["hooks/**", "bridge/handlers/**", "agents/**", ".codex-plugin/plugin.json"],
  research:          ["hooks/**", "bridge/handlers/**", "lib/**", "schemas/ontology/**"],
  "agent-definition":["hooks/**", "bridge/handlers/**", ".codex-plugin/plugin.json", "package.json"],
  "mass-edit":       [".codex-plugin/plugin.json", "package.json"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferVerifyCommand(files: string[]): string | null {
  const first = files[0];
  if (!first) return null;
  if (first.endsWith(".ts")) return "bunx tsc --noEmit";
  if (first.endsWith(".md") && first.includes("rules/")) return "pm_rule_audit";
  if (first.endsWith(".json")) return `bun run scripts/validate-json.ts ${first}`;
  return null;
}

function buildBriefingTemplate(agent: string, taskId: string, memoryLayers: MemoryLayer[], sprintMode: "quick" | "full"): string {
  const layers = memoryLayers.map((l) => `\`${l}\``).join(", ");
  return `## Briefing — ${agent} / ${taskId}\n1. Speed target: 10-20 min.\n2. Claim: 1. ${taskId}\n3. No idle polling; self-shutdown when done.\n4. Reply-in-text on Lead DM.\n5. Memory layers: ${layers} (${sprintMode}).`;
}

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

function buildSprintArgs(fileCount: number, complexityHint: BuildRecipeInput["complexityHint"]) {
  const isComplex = fileCount > 3 || complexityHint === "multi-file" || complexityHint === "cross-cutting";
  return isComplex
    ? { mode: "full"  as const, iterationLimit: 4, timeoutMs: 3600000 }
    : { mode: "quick" as const, iterationLimit: 1, timeoutMs: 900000  };
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
 * (pluginSourceFiles.scopedFiles capped at 5 to avoid bloating the recipe).
 * Returns a deduplicated merged array.
 */
function enrichScopePathsFromContext(
  base: string[],
  ctx: OntologyContextQueryResult,
): string[] {
  const extra = ctx.retrievalContext.pluginSourceFiles.scopedFiles ?? [];
  // Only add the first 5 scoped files to avoid unbounded recipe growth
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

/**
 * Detect cross-cutting impact from perRidImpact.
 * Returns true when any RID has combined forward+backward > 6 — signals
 * that the change propagates broadly and warrants Full Sprint mode.
 */
function hasCrossCuttingImpact(ctx: OntologyContextQueryResult): boolean {
  if (!ctx.impactContext) return false;
  return ctx.impactContext.perRidImpact.some(
    (r) => r.forwardCount + r.backwardCount > 6,
  );
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

/**
 * Build the dispatch-mode enrichment fields for a DelegationRecipe.
 * Called from buildRecipe when ontologyContext is available.
 *
 * Returns:
 *   dispatchMode — always present when called
 *   verificationScope — present only for targeted-verification mode (RIDs with low confidence)
 *   boundedExplorers — present only for bounded-explorer mode (chunked missingEdge scopes)
 */
function buildDispatchModeEnrichment(
  ctx: OntologyContextQueryResult,
): {
  dispatchMode: DispatchMode;
  verificationScope?: ReadonlyArray<string>;
  boundedExplorers?: ReadonlyArray<BoundedExplorerScope>;
} {
  const missingEdgesCount = ctx.missingEdges.length;
  const dispatchMode = pickDispatchModeFromConfidence(ctx.graphConfidence, missingEdgesCount);

  if (dispatchMode === "targeted-verification") {
    // Collect RIDs whose per-RID confidence is below 0.7 (the uncertain set).
    const uncertainRids: string[] = [];
    if (ctx.impactContext) {
      for (const r of ctx.impactContext.perRidImpact) {
        if (r.graphConfidence < 0.7) uncertainRids.push(r.rid);
      }
    }
    return { dispatchMode, verificationScope: uncertainRids };
  }

  if (dispatchMode === "bounded-explorer") {
    // Split missingEdges into chunks of 3-5 per explorer, capped at 3 explorers total.
    const CHUNK_SIZE = 5;
    const MAX_EXPLORERS = 3;
    const edges = ctx.missingEdges.slice(0, CHUNK_SIZE * MAX_EXPLORERS);
    const explorers: BoundedExplorerScope[] = [];
    for (let i = 0; i < edges.length && explorers.length < MAX_EXPLORERS; i += CHUNK_SIZE) {
      const chunk = edges.slice(i, i + CHUNK_SIZE);
      const scopeRids = Array.from(
        new Set(chunk.flatMap((e) => [e.fromRid, e.toRid])),
      );
      const startEdge = i + 1;
      const endEdge = i + chunk.length;
      explorers.push({
        scope: scopeRids,
        focus: `edges ${startEdge}-${endEdge}`,
      });
    }
    return { dispatchMode, boundedExplorers: explorers };
  }

  // lead-direct — no extra enrichment fields needed.
  return { dispatchMode };
}

function task(
  input: Omit<DelegationExecutionTask, "outputContract"> & {
    readonly outputContract?: ReadonlyArray<string>;
  },
): DelegationExecutionTask {
  return {
    ...input,
    outputContract: input.outputContract ?? [
      "changed files",
      "design summary",
      "validation results",
      "residual risks or runtime gaps",
    ],
  };
}

function buildDelegationExecutionPlan(input: {
  readonly agent: string;
  readonly dispatchMode: DispatchMode;
  readonly allFiles: ReadonlyArray<string>;
  readonly forbiddenScope: ReadonlyArray<string>;
  readonly verificationScope?: ReadonlyArray<string>;
  readonly boundedExplorers?: ReadonlyArray<BoundedExplorerScope>;
}): DelegationExecutionPlan {
  const exclusiveWriteScopes = input.allFiles;
  const parallelReadOnlyAgents =
    input.dispatchMode === "targeted-verification"
      ? [
          task({
            taskId: "parallel-readonly-verifier-001",
            phase: "parallel-readonly",
            agent: "read-only-verifier",
            dependsOn: [],
            writeScope: [],
            readOnlyScope: input.verificationScope ?? input.allFiles,
            forbiddenScope: input.forbiddenScope,
          }),
        ]
      : input.dispatchMode === "bounded-explorer"
        ? (input.boundedExplorers ?? []).map((explorer, index) =>
            task({
              taskId: `parallel-bounded-explorer-${String(index + 1).padStart(3, "0")}`,
              phase: "parallel-readonly",
              agent: "bounded-explorer",
              dependsOn: [],
              writeScope: [],
              readOnlyScope: explorer.scope,
              forbiddenScope: input.forbiddenScope,
              outputContract: [
                "missing-edge findings",
                "authority paths inspected",
                "recommended next worker scope",
                "runtime gaps",
              ],
            }),
          )
        : [];
  const sequentialWorkers = [
    task({
      taskId: "sequential-worker-001",
      phase: "sequential-worker",
      agent: input.agent,
      dependsOn: parallelReadOnlyAgents.map((agentTask) => agentTask.taskId),
      writeScope: exclusiveWriteScopes,
      readOnlyScope: input.allFiles,
      forbiddenScope: input.forbiddenScope,
    }),
  ];
  const verificationAgents = [
    task({
      taskId: "verification-agent-001",
      phase: "verification",
      agent: "read-only-verifier",
      dependsOn: sequentialWorkers.map((workerTask) => workerTask.taskId),
      writeScope: [],
      readOnlyScope: input.allFiles,
      forbiddenScope: input.forbiddenScope,
      outputContract: [
        "contract adherence",
        "generated-file guardrail check",
        "runtime gap honesty",
        "release-blocking risks",
      ],
    }),
  ];
  const leadOnlyTasks = [
    task({
      taskId: "lead-only-integration-001",
      phase: "lead-only",
      agent: "lead-orchestrator",
      dependsOn: verificationAgents.map((verifierTask) => verifierTask.taskId),
      writeScope: [],
      readOnlyScope: input.allFiles,
      forbiddenScope: input.forbiddenScope,
      outputContract: ["integration summary", "final validation commands", "release evidence refs"],
    }),
  ];

  return {
    leadRole: "orchestrator",
    dispatchMode: input.dispatchMode,
    parallelReadOnlyAgents,
    sequentialWorkers,
    verificationAgents,
    leadOnlyTasks,
    exclusiveWriteScopes,
    forbiddenScopes: input.forbiddenScope,
    runtimeGaps: [
      "Recipe generation does not prove Codex native subagent execution parity.",
    ],
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function attachContractBindingToRecipe(
  recipe: DelegationRecipe,
  contractBinding?: RecipeContractBinding,
): DelegationRecipe {
  if (
    !recipe.recipe ||
    !contractBinding ||
    (!contractBinding.workContractRef && !contractBinding.routerBindingRef)
  ) {
    return recipe;
  }
  return {
    ...recipe,
    recipe: {
      ...recipe.recipe,
      contractBinding,
    },
  };
}

export function buildRecipe(input: BuildRecipeInput): DelegationRecipe {
  const {
    intent,
    scopePaths = [],
    complexityHint,
    affectedFiles = [],
    routerResult,
    emitFn,
    ontologyContext,
    contractBinding,
  } = input;

  // PR 3.4: enrich scopePaths and complexityHint from OntologyContext when available.
  const enrichedScopePaths = ontologyContext
    ? enrichScopePathsFromContext(scopePaths, ontologyContext)
    : scopePaths;
  const enrichedComplexityHint: BuildRecipeInput["complexityHint"] =
    ontologyContext && hasCrossCuttingImpact(ontologyContext) && complexityHint !== "trivial"
      ? "cross-cutting"
      : complexityHint;

  const allFiles = [...enrichedScopePaths, ...affectedFiles];
  const fileCount = allFiles.length;

  if (complexityHint === "trivial" && fileCount <= 3) {
    return attachContractBindingToRecipe({
      decision: "lead-direct",
      rationale: `Complexity hint is 'trivial' and file count (${fileCount}) ≤ 3. Lead handles inline.`,
    }, contractBinding);
  }

  // Determine static-map agent (always computed for observability comparison)
  const domain = classifyDomain(intent, enrichedScopePaths);
  const { agent: staticAgent, model: staticModel } = DOMAIN_AGENT[domain];

  // Consult router-suggested agents first (rule 12 §Pre-delegation framework)
  const topSuggested = routerResult?.suggestedAgents?.[0];
  const routerSuggestedAgent = topSuggested
    ? topSuggested.capabilityId.replace(/^agent:/, "")
    : undefined;

  const chosenPath: "router-suggested" | "static-map" =
    routerSuggestedAgent ? "router-suggested" : "static-map";
  const agent = routerSuggestedAgent ?? staticAgent;
  // Model: for router-suggested agents use sonnet default (no model info in decision)
  const model: AgentModel = routerSuggestedAgent ? "sonnet" : staticModel;

  // Emit recipe_agent_selected for lineage (best-effort, non-fatal)
  if (emitFn) {
    emitFn({
      type: "recipe_agent_selected",
      payload: {
        routerSuggestedAgent: routerSuggestedAgent ?? null,
        staticMapAgent: staticAgent,
        chosenPath,
        domain,
        intent: intent.slice(0, 120),
        routerScore: topSuggested?.score ?? null,
        ontologyContextDigest: ontologyContext ? deriveOntologyContextDigest(ontologyContext) : null,
      },
      toolName: "buildRecipe",
      cwd: process.cwd(),
      reasoning: `buildRecipe: chosenPath=${chosenPath} agent=${agent} domain=${domain}. ` +
        (chosenPath === "router-suggested"
          ? `Router suggested '${routerSuggestedAgent}' (score ${topSuggested?.score ?? "?"}); static map would have chosen '${staticAgent}'.`
          : `No router suggestion; static 6-domain map chose '${staticAgent}' for domain '${domain}'.`),
      memoryLayers: ["procedural"],
    }).catch(() => undefined);
  }

  const sprintArgs = buildSprintArgs(fileCount, enrichedComplexityHint);
  const taskId = `T-${domain.replace(/[^a-z0-9]/g, "-")}-001`;

  // PR 3.6: compute graphConfidence-based dispatch mode enrichment when ontologyContext
  // is available. Pure computation; no I/O. Absent when ontologyContext is not provided.
  const dispatchEnrichment = ontologyContext
    ? buildDispatchModeEnrichment(ontologyContext)
    : undefined;

  return attachContractBindingToRecipe({
    decision: `delegate-to-${agent}`,
    rationale:
      chosenPath === "router-suggested"
        ? `Router suggested agent '${agent}' (score ${topSuggested?.score ?? "?"}) for intent/paths. Overrides static-map default '${staticAgent}' (domain '${domain}').`
        : `Domain '${domain}' from intent/paths. Agent '${agent}' (${model}) per rule 07 §Agent file-ownership.`,
    recipe: {
      agent,
      agentModel: model,
      mcpTools:       DOMAIN_MCP_TOOLS[domain],
      skills:         DOMAIN_SKILLS[domain],
      sprintArgs,
      criticalFiles:  allFiles,
      verifyCommand:  inferVerifyCommand(allFiles),
      memoryLayers:   DOMAIN_MEMORY_LAYERS[domain],
      outOfScope:     DOMAIN_OUT_OF_SCOPE[domain],
      briefingTemplate: buildBriefingTemplate(agent, taskId, DOMAIN_MEMORY_LAYERS[domain], sprintArgs.mode),
      ...(dispatchEnrichment !== undefined ? {
        dispatchMode: dispatchEnrichment.dispatchMode,
        ...(dispatchEnrichment.verificationScope !== undefined
          ? { verificationScope: dispatchEnrichment.verificationScope }
          : {}),
        ...(dispatchEnrichment.boundedExplorers !== undefined
          ? { boundedExplorers: dispatchEnrichment.boundedExplorers }
          : {}),
        delegationExecutionPlan: buildDelegationExecutionPlan({
          agent,
          dispatchMode: dispatchEnrichment.dispatchMode,
          allFiles,
          forbiddenScope: DOMAIN_OUT_OF_SCOPE[domain],
          verificationScope: dispatchEnrichment.verificationScope,
          boundedExplorers: dispatchEnrichment.boundedExplorers,
        }),
      } : {}),
    },
  }, contractBinding);
}
