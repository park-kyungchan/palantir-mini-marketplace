// palantir-mini — MCP tool handler: pm_intent_router (sprint-063 W3.A)
// Domain: ACTION (Lead Routing — cost-aware species + recipe + prefetched context)
//
// Subsumes delegate_or_direct + dispatch_route_decide + dispatch_to_runtime.
// Single entry-point for Lead dispatch decisions.
//
// Logic flow:
//   a. classify domain (reuses classifyDomain + buildRecipe from lib)
//   b. cost-aware species pick (HarnessSpeciesCostProfile registry)
//   c. ontology_context_query (canonical context-load path; PR 3.4 sprint-096)
//   d. prefetch context (impact_query top-RID + workflow lineage 7d + value-grade metrics)
//   e. return enriched recipe
//
// PR 3.4 (sprint-096) — canonical context path:
//   ontology_context_query is now the FIRST context-loading step (step c, after contract
//   gate). Its OntologyContextQueryResult is passed into buildRecipe via BuildRecipeInput
//   .ontologyContext. When ontology_context_query fails (timeout/error), the router falls
//   back to the legacy prefetch chain and emits advisory validation_phase_completed with
//   errorClass="ontology_context_query_failed_fallback". Raw-intent routing basis
//   ("raw-intent") is now treated as a deprecated fallback path — callers should supply
//   approved contract refs for complex ontology-affecting dispatch.
//
// Rule cross-refs:
//   rule 12 v3.13.0 §Lead routing canonical (pm_intent_router = single dispatch entry)
//   rule 24 v1.2.0  §Cost-aware dispatch
//   rule 16 v4.1.0  §0 (7 harness species)
//   rule 20 v1.0.0  §Mode ladder
//   rule 26 §Axis E (semantic + procedural memory layers)
//
// Hard constraints:
//   - lazy-import handler modules via await import() to avoid circular deps
//   - 500ms hard wall on each prefetch call (best-effort; never blocks return)
//   - DO NOT modify bridge/mcp-server.ts (Phase 4 Lead handles TOOLS registration)

import {
  attachContractBindingToRecipe,
  buildRecipe,
  deriveOntologyContextDigest,
  pickDispatchModeFromConfidence,
} from "../../lib/delegation-recipe/recipe-builder";
import {
  isLowRiskIntent,
  createOntologyContextApproval,
} from "../../lib/ontology-context/approval";
import type {
  BuildRecipeInput,
  DelegationRecipe,
  DispatchMode,
} from "../../lib/delegation-recipe/recipe-builder";
import type { OntologyContextQueryResult } from "./ontology-context-query";
import { loadCapabilityRegistry } from "../../lib/capability-registry/index";
import type { CapabilityRegistryStats } from "../../lib/capability-registry/index";
import {
  HARNESS_SPECIES_COST_PROFILES,
  isFlatSubscriptionVendor,
} from "#schemas/ontology/primitives/harness-species-cost-profile";
import type { HarnessSpeciesVendor } from "#schemas/ontology/primitives/harness-species-cost-profile";
import { emit } from "../../scripts/log";
import {
  assessContractGate,
  assessOntologyDtcBuildReadinessGate,
  deriveWorkContractFromContracts,
  isOntologyAffectingIntent,
  isReadOnlyIntent,
  projectRoutingFromContracts,
  validateRouterBinding,
  validateWorkContract,
} from "../../lib/lead-intent/contracts";
import type {
  ContractGateResult,
  ContractRoutingProjection,
  ContractValidationResult,
  DigitalTwinChangeContract,
  OntologyDtcBuildReadinessGate,
  RouterBinding,
  SemanticIntentContract,
  WorkContract,
} from "../../lib/lead-intent/contracts";
import type { RecipeContractBinding } from "../../lib/delegation-recipe/recipe-builder";
import {
  PromptFrontDoorStore,
  isPromptRuntime,
  validatePromptContinuity,
} from "../../lib/prompt-front-door";
import type {
  PromptContractRefs,
  PromptContractRecord,
  PromptEnvelope,
  PromptRuntime,
} from "../../lib/prompt-front-door";
import type { SemanticConsistencyResolverOutput } from "../../lib/semantic-consistency/types";
import { attachRoutingProjectionToCapsule } from "../../lib/context/context-capsule";
import { readCurrentUniversalOntologyEntry } from "../../lib/ontology-entry/entry-store";
import { transitionUniversalOntologyEntry } from "../../lib/ontology-entry/lifecycle";
import { readCurrentFDEOntologyEngineeringSession } from "../../lib/fde-ontology-engineering/session-store";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  transitionOntologyWorkflowTrace,
  type OntologyWorkflowTrace,
} from "../../lib/ontology-workflow/emit";

// Re-export for downstream consumers / tests
export type { HarnessSpeciesVendor };

/** Best-effort lookup of the most recently opened (non-closed) workflow trace for a project. */
function findLatestOpenTrace(projectRoot: string): OntologyWorkflowTrace | undefined {
  const tracesDir = path.join(projectRoot, ".palantir-mini", "session", "workflow-traces");
  if (!fs.existsSync(tracesDir)) return undefined;
  try {
    const files = fs.readdirSync(tracesDir)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".tmp"));
    let latest: OntologyWorkflowTrace | undefined;
    let latestTime = "";
    for (const file of files) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(tracesDir, file), "utf8")) as Record<string, unknown>;
        if (raw.lastEvent === "closed") continue;
        const updatedAt = String(raw.updatedAt ?? raw.createdAt ?? "");
        if (!latest || updatedAt > latestTime) {
          latest = raw as unknown as OntologyWorkflowTrace;
          latestTime = updatedAt;
        }
      } catch { /* skip corrupt file */ }
    }
    return latest;
  } catch {
    return undefined;
  }
}

function requiresFDEWorkflowProvenance(input: IntentRouterInput): boolean {
  const text = `${input.intent} ${(input.scopePaths ?? []).join(" ")}`.toLowerCase();
  return [
    "ontology engineering",
    "fde",
    "runtime-native question ui",
    "workflowcontract",
    "turncarddecisionspec",
    "userdecisionrecord",
    "pm_ontology_engineering_workflow",
  ].some((marker) => text.includes(marker));
}

function hasFDEWorkflowProvenance(input: IntentRouterInput): boolean {
  if (input.fdeOntologyEngineeringSessionRef?.trim()) return true;
  return readCurrentFDEOntologyEngineeringSession(input.project) !== null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** Input shape for pm_intent_router MCP tool. */
export interface IntentRouterInput {
  /** Absolute project path. Required. */
  project: string;
  /** 1-2 sentence task description. Required. */
  intent: string;
  /** Scope file paths (drives domain classification + complexity). */
  scopePaths?: string[];
  /** Complexity hint — drives sprint mode selection. */
  complexityHint?: BuildRecipeInput["complexityHint"];
  /** Caller-preferred harness species. When supplied and valid, overrides cost-selection. */
  harnessSpeciesPreference?: HarnessSpeciesVendor;
  /** Approved SemanticIntentContract RID/ref. Required for complex ontology-affecting dispatch. */
  semanticIntentContractRef?: string;
  /** Approved DigitalTwinChangeContract RID/ref. Required for complex ontology-affecting dispatch. */
  digitalTwinChangeContractRef?: string;
  /** Optional inline contract for local validation before a persistent ref exists. */
  semanticIntentContract?: SemanticIntentContract;
  /** Optional inline Digital Twin contract for local validation before a persistent ref exists. */
  digitalTwinChangeContract?: DigitalTwinChangeContract;
  /** Prompt-front-door identity captured by UserPromptSubmit. */
  promptId?: string;
  /** Expected prompt hash for continuity validation. */
  promptHash?: string;
  /** Runtime session that owns the prompt envelope. */
  sessionId?: string;
  /** Runtime that captured the prompt envelope. */
  runtime?: PromptRuntime;
  /** FDE Ontology Engineering session provenance required for workflow-control-plane routing. */
  fdeOntologyEngineeringSessionRef?: string;
  /**
   * When true (default), pm_intent_router auto-creates an OntologyContextApproval
   * of kind "auto-low-risk" when the capability-context signals are available and
   * the auto-low-risk trigger condition fires (requiredDtc=false AND
   * selectedCapabilities>0 AND impactContext.confidence="high").
   * Set to false to suppress auto-creation (e.g. in test scenarios or when the
   * caller handles approval creation explicitly).
   */
  readonly acceptApprovalAutoCreate?: boolean;
}

export interface IntentRouterWorkBindingInput {
  /** Optional WorkContract RID/ref. Advisory until local contract-store dereference is available. */
  workContractRef?: string;
  /** Optional RouterBinding RID/ref. Advisory until local contract-store dereference is available. */
  routerBindingRef?: string;
  /** Optional inline WorkContract for router binding validation. */
  workContract?: WorkContract;
  /** Optional inline RouterBinding for router output binding validation. */
  routerBinding?: RouterBinding;
  /** Optional deterministic semantic consistency evidence for in-process router callers. */
  semanticConsistencyResultRef?: string;
  /** Optional deterministic semantic consistency resolver output for approved SIC/DTC promotion. */
  semanticConsistencyResult?: SemanticConsistencyResolverOutput;
}

type EffectiveIntentRouterInput = IntentRouterInput & IntentRouterWorkBindingInput;

/** Pre-fetched context bundle (all fields best-effort; absent when fetch failed). */
export interface PrefetchedContext {
  /** Top-RID from impact_query on first scopePath (depth=2). */
  impact?: Record<string, unknown>;
  /** Last 7d edit/validation events (pm_workflow_lineage_query). */
  lineage?: Record<string, unknown>;
  /** pm_value_grade_metrics summary. */
  grades?: Record<string, unknown>;
}

/** Timing data for each prefetch attempt (ms). */
export interface PrefetchTimings {
  impactMs: number | null;
  lineageMs: number | null;
  gradesMs: number | null;
}

export type IntentRouterDecision =
  | DelegationRecipe["decision"]
  | "contract_required"
  | "blocked_for_clarification";

/** Enriched delegation recipe returned by pm_intent_router. */
export interface IntentRouterResult {
  decision: IntentRouterDecision;
  rationale: string;
  recipe?: DelegationRecipe["recipe"];
  /** Recommended harness species (cost-aware). */
  dispatchSpecies: HarnessSpeciesVendor;
  /** 1-2 sentence cost rationale. */
  costRationale: string;
  /** Semantic Intent / Digital Twin gate status. */
  contractGate: ContractGateResult;
  /** Ontology-DTC dispatch readiness diagnostics for ontology-affecting work. */
  ontologyDtcBuildReadinessGate?: OntologyDtcBuildReadinessGate;
  /** The actual semantic basis used to choose the downstream route. */
  routingProjection: ContractRoutingProjection;
  /** Best-effort prefetched context. */
  prefetchedContext: PrefetchedContext;
  /** Per-field timing in ms (null = not attempted or errored). */
  prefetchTimingsMs: PrefetchTimings;
  /** Which prefetch calls succeeded: [impact, lineage, grades]. */
  prefetchSucceeded: [boolean, boolean, boolean];
  /** Resolved prompt-front-door envelope, when prompt identity was supplied. */
  promptEnvelope?: PromptEnvelope;
  /** Effective prompt-front-door contract refs used by the router. */
  contractRefs?: PromptContractRefs;
  /** Effective WorkContract ref supplied by caller or derived from approved inline contracts. */
  workContractRef?: string;
  /** Effective RouterBinding ref supplied by caller or derived for this route. */
  routerBindingRef?: string;
  /** Inline WorkContract supplied by caller or derived from approved SIC/DTC fields. */
  workContract?: WorkContract;
  /** Inline RouterBinding supplied by caller or derived from the final router output. */
  routerBinding?: RouterBinding;
  /** Validation diagnostics for supplied or derived WorkContract. Advisory only. */
  workContractValidation?: ContractValidationResult;
  /** Validation diagnostics for supplied or derived RouterBinding. Advisory only. */
  routerBindingValidation?: ContractValidationResult;
  /** Prompt identity continuity validation, when prompt identity was supplied. */
  promptContinuity?: ContractValidationResult;
  /** Prompt-front-door root selected for envelope/contract lookup. */
  promptEnvelopeLookup?: PromptEnvelopeLookup;
  /**
   * Digest of the OntologyContextQueryResult used to enrich this routing decision.
   * Format: "gc:<graphConfidence>|rids:<axisRidCount>|caps:<totalCapabilities>|t3+:<t3PlusCount>"
   * Undefined when ontology_context_query was not invoked (e.g. contract gate blocked routing)
   * or when the query failed and the fallback path was used.
   * Sprint-096 PR 3.4: canonical plan v2 §4 row 3.4.
   */
  readonly ontologyContextDigest?: string;
  /**
   * Set when the auto-low-risk approval path fires (requiredDtc=false AND
   * selectedCapabilities>0 AND impactContext.confidence="high").
   * Undefined when: auto-create was suppressed, prerequisite signals were not
   * available in this routing context, or the create call threw (best-effort).
   *
   * Note: full auto-low-risk wiring requires an OntologyContextQueryResult with
   * capabilityContext.requiredDtc + selectedCapabilityIds + impactContext.confidence
   * in routing scope. PR-5 (ProjectOntologyIndex consumption in query.ts) will
   * wire the context query result into routeIntent() so this field is populated
   * on every low-risk routing call. Until PR-5 lands, ontologyContextApprovalRef
   * remains undefined on the default path; callers may pass a pre-computed
   * contextQueryResult via a future input field to trigger early.
   */
  readonly ontologyContextApprovalRef?: string;
  /**
   * Diagnostic stats from the unified CapabilityRegistry (PR-7).
   * Always populated when routing succeeds; best-effort (undefined if registry
   * load threw). Behavioral routing paths are NOT changed in this PR — stats
   * are additive diagnostics only. Full registry-first routing migration deferred
   * to a follow-up PR.
   */
  readonly capabilityRegistryStats?: CapabilityRegistryStats;
  /**
   * graphConfidence-derived dispatch mode (sprint-098 PR 3.6).
   * Present when ontology_context_query succeeded and returned a graphConfidence value.
   * Mirrors recipe.dispatchMode for callers who read the top-level result shape.
   *
   * lead-direct          — graphConfidence ≥ 0.7 (and missingEdges ≤ 5)
   * targeted-verification — 0.4 ≤ graphConfidence < 0.7  OR  ≥0.7 with missingEdges > 5
   * bounded-explorer     — graphConfidence < 0.4  OR  targeted-verification with missingEdges > 5
   *
   * Undefined when: contract gate blocked routing, ontology_context_query failed,
   * or the query result did not include impact context.
   * Per canonical plan v2 §4 row 3.6 + proposal §8 Stage 5.
   */
  readonly graphConfidenceDispatchMode?: DispatchMode;
}

// ─── Species selection (cost-aware, rule 24 v1.2.0) ──────────────────────────

/**
 * Pick the cheapest active species for the given input.
 * Default: claude-code-cli-max (flat-rate, canonical palantir-mini platform).
 * Sporadic (≤1 file, ≤10min): prefer anthropic-managed-agents (per-event cheaper).
 * When harnessSpeciesPreference is supplied and is a known vendor, use it directly.
 */
function selectSpecies(
  input: IntentRouterInput,
  scopeCount: number,
): { species: HarnessSpeciesVendor; rationale: string } {
  // Caller-preference overrides cost selection
  if (input.harnessSpeciesPreference) {
    const pref = input.harnessSpeciesPreference;
    const profile = HARNESS_SPECIES_COST_PROFILES.find((p) => p.vendor === pref);
    const billing =
      profile?.billingAxes.join(" + ") ?? "unknown billing axes";
    return {
      species: pref,
      rationale: `Caller-preferred species '${pref}' (${billing}). Cost-selection bypassed.`,
    };
  }

  const isBulk =
    input.complexityHint === "cross-cutting" ||
    input.complexityHint === "multi-file" ||
    scopeCount >= 3;

  if (!isBulk && scopeCount <= 1) {
    // Sporadic — per-event cheaper than flat subscription at low utilization
    const vendor: HarnessSpeciesVendor = "anthropic-managed-agents";
    const profile = HARNESS_SPECIES_COST_PROFILES.find((p) => p.vendor === vendor);
    const billing = profile?.billingAxes.join(" + ") ?? "session-hour + per-token";
    return {
      species: vendor,
      rationale:
        `Sporadic/single-file task (${scopeCount} path(s), hint=${input.complexityHint ?? "none"}) ` +
        `favors ${vendor} (${billing}): per-event billing beats flat-subscription ` +
        `amortized over low utilization (rule 24 v1.2.0 §Cost-aware dispatch).`,
    };
  }

  // Default: flat-rate subscription for bulk/multi-file work
  const flatVendor =
    HARNESS_SPECIES_COST_PROFILES.find((p) => isFlatSubscriptionVendor(p.vendor))
      ?.vendor ?? "claude-code-cli-max";
  const flatProfile = HARNESS_SPECIES_COST_PROFILES.find((p) => p.vendor === flatVendor);
  const billing = flatProfile?.billingAxes.join(" + ") ?? "flat-subscription";
  return {
    species: flatVendor,
    rationale:
      `Bulk/multi-file task (${scopeCount} path(s), hint=${input.complexityHint ?? "none"}) ` +
      `favors ${flatVendor} (${billing}): flat-rate subscription eliminates per-token ` +
      `marginal cost (3rd pricing arbitrage per CONTEXT.md §17; rule 24 v1.2.0).`,
  };
}

// ─── Prefetch helpers (500ms hard wall, best-effort) ─────────────────────────

const PREFETCH_TIMEOUT_MS = 500;

/** Sentinel value indicating a prefetch was intentionally skipped (not an error). */
const SKIP_SENTINEL = Symbol("skip");

async function withTimeout<T>(
  fn: () => Promise<T | typeof SKIP_SENTINEL>,
  timeoutMs: number,
): Promise<{ result: T; elapsedMs: number } | null> {
  const start = Date.now();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("prefetch_timeout")), timeoutMs),
  );
  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    if (result === SKIP_SENTINEL) return null;
    return { result: result as T, elapsedMs: Date.now() - start };
  } catch {
    return null;
  }
}

async function prefetchImpact(
  project: string,
  scopePaths: string[],
): Promise<Record<string, unknown> | typeof SKIP_SENTINEL> {
  if (scopePaths.length === 0) return SKIP_SENTINEL;
  const firstPath = scopePaths[0];
  const { default: impactQueryHandler } = await import("./impact-query");
  // impact_query uses `rid` + `projectRoot` (not `project`)
  const result = await (impactQueryHandler as (args: unknown) => Promise<unknown>)({
    projectRoot: project,
    rid: `file:${firstPath}`,
    depth: 2,
  });
  return result as Record<string, unknown>;
}

async function prefetchLineage(
  project: string,
): Promise<Record<string, unknown> | typeof SKIP_SENTINEL> {
  const { default: lineageHandler } = await import("./pm-workflow-lineage-query");
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // pm_workflow_lineage_query uses `projects` (list) + nested `filter` object
  const result = await (lineageHandler as (args: unknown) => Promise<unknown>)({
    projects: [project],
    filter: {
      whenRange: { from: since },
      eventTypes: ["edit_committed", "validation_phase_completed"],
      limit: 200,
    },
  });
  return result as Record<string, unknown>;
}

async function prefetchGrades(
  project: string,
): Promise<Record<string, unknown> | typeof SKIP_SENTINEL> {
  const { default: gradesHandler } = await import("./pm-value-grade-metrics");
  const result = await (gradesHandler as (args: unknown) => Promise<unknown>)({ project });
  return result as Record<string, unknown>;
}

async function collectPrefetches(
  project: string,
  scopePaths: string[],
): Promise<{
  prefetchedContext: PrefetchedContext;
  timings: PrefetchTimings;
  succeeded: [boolean, boolean, boolean];
}> {
  const prefetchedContext: PrefetchedContext = {};
  const timings: PrefetchTimings = { impactMs: null, lineageMs: null, gradesMs: null };
  const succeeded: [boolean, boolean, boolean] = [false, false, false];

  const [impactRes, lineageRes, gradesRes] = await Promise.all([
    withTimeout(() => prefetchImpact(project, scopePaths), PREFETCH_TIMEOUT_MS),
    withTimeout(() => prefetchLineage(project), PREFETCH_TIMEOUT_MS),
    withTimeout(() => prefetchGrades(project), PREFETCH_TIMEOUT_MS),
  ]);

  if (impactRes !== null) {
    prefetchedContext.impact = impactRes.result ?? undefined;
    timings.impactMs = impactRes.elapsedMs;
    succeeded[0] = true;
  }
  if (lineageRes !== null) {
    prefetchedContext.lineage = lineageRes.result ?? undefined;
    timings.lineageMs = lineageRes.elapsedMs;
    succeeded[1] = true;
  }
  if (gradesRes !== null) {
    prefetchedContext.grades = gradesRes.result ?? undefined;
    timings.gradesMs = gradesRes.elapsedMs;
    succeeded[2] = true;
  }

  return { prefetchedContext, timings, succeeded };
}

function continuityFailure(field: string, message: string): ContractValidationResult {
  return { valid: false, issues: [{ field, message }] };
}

type PromptEnvelopeLookupSelectedBy =
  | "input-project"
  | "env-project"
  | "cwd"
  | "home-fallback";

interface PromptEnvelopeLookup {
  suppliedProject: string;
  selectedPromptFrontDoorRoot: string;
  selectedBy: PromptEnvelopeLookupSelectedBy;
  candidateRootsChecked: string[];
}

interface PromptFrontDoorStoreCandidate {
  store: PromptFrontDoorStore;
  projectRoot: string;
  selectedBy: PromptEnvelopeLookupSelectedBy;
}

function promptFrontDoorCandidateStores(projectRoot: string): PromptFrontDoorStoreCandidate[] {
  const home = process.env.HOME;
  const candidates: Array<{ projectRoot?: string; selectedBy: PromptEnvelopeLookupSelectedBy }> = [
    { projectRoot, selectedBy: "input-project" },
    { projectRoot: process.env.PALANTIR_MINI_PROJECT, selectedBy: "env-project" },
    { projectRoot: process.cwd(), selectedBy: "cwd" },
    {
      projectRoot: projectRoot.startsWith(`${home ?? ""}${path.sep}.claude${path.sep}`)
        ? home
        : undefined,
      selectedBy: "home-fallback",
    },
    { projectRoot: home, selectedBy: "home-fallback" },
  ];
  const seen = new Set<string>();
  return candidates
    .filter((candidate): candidate is { projectRoot: string; selectedBy: PromptEnvelopeLookupSelectedBy } =>
      Boolean(candidate.projectRoot && path.isAbsolute(candidate.projectRoot))
    )
    .map((candidate) => ({ ...candidate, projectRoot: path.resolve(candidate.projectRoot) }))
    .filter((candidate) => {
      if (seen.has(candidate.projectRoot)) return false;
      seen.add(candidate.projectRoot);
      return true;
    })
    .map((candidate) => ({
      ...candidate,
      store: new PromptFrontDoorStore({ projectRoot: candidate.projectRoot }),
    }));
}

async function readContractRecordByRefFromCandidates<
  TContract extends SemanticIntentContract | DigitalTwinChangeContract,
>(
  ref: string,
  candidates: PromptFrontDoorStoreCandidate[],
  selected: PromptFrontDoorStoreCandidate,
): Promise<{
  record: PromptContractRecord<TContract>;
  selected: PromptFrontDoorStoreCandidate;
} | null> {
  const orderedCandidates = [
    selected,
    ...candidates.filter((candidate) => candidate.projectRoot !== selected.projectRoot),
  ];
  for (const candidate of orderedCandidates) {
    const record = await candidate.store.readContractRecordByRef<TContract>(ref);
    if (record) return { record, selected: candidate };
  }
  return null;
}

function applyPromptContinuityFailure(
  gate: ContractGateResult,
  continuity: ContractValidationResult,
): ContractGateResult {
  return {
    ...gate,
    status: "blocked_for_clarification",
    allowsRouting: false,
    reason:
      "Prompt-front-door continuity failed: " +
      continuity.issues.map((issue) => `${issue.field}: ${issue.message}`).join("; "),
    semanticIntent: {
      valid: false,
      issues: [...gate.semanticIntent.issues, ...continuity.issues],
    },
  };
}

function promptLineagePayload(
  input: EffectiveIntentRouterInput,
  promptRouting: {
    envelope?: PromptEnvelope;
    contractRefs?: PromptContractRefs;
  },
  workBindingState?: WorkBindingState,
): Record<string, unknown> {
  const semanticIntentContractRef =
    promptRouting.contractRefs?.semanticIntentContractRef ?? input.semanticIntentContractRef;
  const digitalTwinChangeContractRef =
    promptRouting.contractRefs?.digitalTwinChangeContractRef ?? input.digitalTwinChangeContractRef;
  const workContractRef =
    workBindingState?.workContractRef ??
    workBindingState?.workContract?.contractId ??
    input.workContractRef ??
    input.workContract?.contractId;
  const routerBindingRef =
    workBindingState?.routerBindingRef ??
    workBindingState?.routerBinding?.bindingId ??
    workBindingState?.workContract?.routerBinding?.bindingId ??
    input.routerBindingRef ??
    input.routerBinding?.bindingId ??
    input.workContract?.routerBinding?.bindingId;
  return {
    promptId: promptRouting.envelope?.promptId ?? input.promptId,
    promptHash: promptRouting.envelope?.promptHash ?? input.promptHash,
    runtime: promptRouting.envelope?.runtime ?? input.runtime ?? "unknown",
    projectRoot: promptRouting.envelope?.projectRoot ?? input.project,
    promptEnvelopeState: promptRouting.envelope?.state,
    semanticIntentContractRef,
    digitalTwinChangeContractRef,
    workContractRef,
    routerBindingRef,
    approvalRef: promptRouting.contractRefs?.approvalRef,
    contractRefs: {
      semanticIntentContractRef,
      digitalTwinChangeContractRef,
      workContractRef,
      routerBindingRef,
      approvalRef: promptRouting.contractRefs?.approvalRef,
    },
    memoryLayers: ["semantic", "procedural"],
  };
}

interface WorkBindingState {
  workContractRef?: string;
  routerBindingRef?: string;
  workContract?: WorkContract;
  routerBinding?: RouterBinding;
  workContractValidation?: ContractValidationResult;
  routerBindingValidation?: ContractValidationResult;
}

function slugForRef(value: string | undefined, fallback: string): string {
  const slug = (value ?? fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

function semanticContractRef(input: EffectiveIntentRouterInput): string | undefined {
  return input.semanticIntentContractRef ?? input.semanticIntentContract?.contractId;
}

function digitalTwinContractRef(input: EffectiveIntentRouterInput): string | undefined {
  return input.digitalTwinChangeContractRef ?? input.digitalTwinChangeContract?.contractId;
}

function resolveSuppliedWorkBinding(input: EffectiveIntentRouterInput): WorkBindingState {
  const routerBinding = input.routerBinding ?? input.workContract?.routerBinding;
  return {
    ...(input.workContractRef ?? input.workContract?.contractId
      ? { workContractRef: input.workContractRef ?? input.workContract?.contractId }
      : {}),
    ...(input.routerBindingRef ?? routerBinding?.bindingId
      ? { routerBindingRef: input.routerBindingRef ?? routerBinding?.bindingId }
      : {}),
    ...(input.workContract ? { workContract: input.workContract } : {}),
    ...(routerBinding ? { routerBinding } : {}),
  };
}

function validateWorkBindingState(
  state: WorkBindingState,
  input: EffectiveIntentRouterInput,
): WorkBindingState {
  const workContract = state.workContract;
  const routerBinding = state.routerBinding ?? workContract?.routerBinding;
  const workContractRef = state.workContractRef ?? workContract?.contractId;
  const routerBindingRef = state.routerBindingRef ?? routerBinding?.bindingId;
  const semanticIntentContractRef =
    workContract?.semanticIntentContractRef ?? semanticContractRef(input);
  const digitalTwinChangeContractRef =
    workContract?.digitalTwinChangeContractRef ?? digitalTwinContractRef(input);

  const workContractValidation = workContract
    ? validateWorkContract(workContract, {
        semanticIntentContractRef: input.semanticIntentContractRef,
        digitalTwinChangeContractRef: input.digitalTwinChangeContractRef,
        semanticIntentContract: input.semanticIntentContract,
        digitalTwinChangeContract: input.digitalTwinChangeContract,
        semanticConsistencyResultRef:
          input.semanticConsistencyResultRef ?? input.semanticConsistencyResult?.resolverRunId,
        semanticConsistencyResult: input.semanticConsistencyResult,
      })
    : undefined;
  const routerBindingValidation = routerBinding
    ? validateRouterBinding(routerBinding, {
        ...(semanticIntentContractRef ? { semanticIntentContractRef } : {}),
        ...(digitalTwinChangeContractRef ? { digitalTwinChangeContractRef } : {}),
        ...(workContractRef ? { workContractRef } : {}),
      })
    : undefined;

  return {
    ...(workContractRef ? { workContractRef } : {}),
    ...(routerBindingRef ? { routerBindingRef } : {}),
    ...(workContract ? { workContract } : {}),
    ...(routerBinding ? { routerBinding } : {}),
    ...(workContractValidation ? { workContractValidation } : {}),
    ...(routerBindingValidation ? { routerBindingValidation } : {}),
  };
}

function routerBindingForRecipe(input: {
  workContract: WorkContract;
  baseRecipe: DelegationRecipe;
  routingProjection: ContractRoutingProjection;
}): RouterBinding {
  const delegationMode: RouterBinding["delegationMode"] =
    input.baseRecipe.decision === "lead-direct" ? "lead-direct" : "delegated";
  const routerOutputRef =
    `pm-intent-router://${slugForRef(input.routingProjection.basis, "basis")}/` +
    slugForRef(input.baseRecipe.decision, "decision");
  const delegationRecipeRef = input.baseRecipe.recipe?.agent
    ? `delegation-recipe://${input.baseRecipe.decision}-${input.baseRecipe.recipe.agent}`
    : undefined;
  return {
    bindingId:
      `router-binding:${slugForRef(input.workContract.contractId, "work-contract")}:` +
      slugForRef(input.baseRecipe.decision, "route"),
    status: "attached",
    source: "pm_intent_router",
    delegationMode,
    semanticIntentContractRef: input.workContract.semanticIntentContractRef,
    digitalTwinChangeContractRef: input.workContract.digitalTwinChangeContractRef,
    workContractRef: input.workContract.contractId,
    routerBasis: input.routingProjection.basis,
    routerOutputRef,
    ...(delegationRecipeRef ? { delegationRecipeRef } : {}),
    attachedOutputRefs: [
      routerOutputRef,
      ...(delegationRecipeRef ? [delegationRecipeRef] : []),
    ],
    rationale:
      "pm_intent_router attached this RouterBinding additively after selecting " +
      `${input.baseRecipe.decision}; DelegationRecipe fields remain unchanged.`,
  };
}

function deriveWorkBindingForRoute(input: {
  state: WorkBindingState;
  effectiveInput: EffectiveIntentRouterInput;
  baseRecipe: DelegationRecipe;
  routingProjection: ContractRoutingProjection;
}): WorkBindingState {
  let state = validateWorkBindingState(input.state, input.effectiveInput);
  let workContract = state.workContract;
  let routerBinding = state.routerBinding;

  if (
    !workContract &&
    input.effectiveInput.semanticIntentContract &&
    input.effectiveInput.digitalTwinChangeContract
  ) {
    const semanticIntentContractRef =
      input.effectiveInput.semanticIntentContract.contractId;
    const digitalTwinChangeContractRef =
      input.effectiveInput.digitalTwinChangeContract.contractId;
    workContract = deriveWorkContractFromContracts({
      semanticIntentContract: input.effectiveInput.semanticIntentContract,
      digitalTwinChangeContract: input.effectiveInput.digitalTwinChangeContract,
      semanticIntentContractRef,
      digitalTwinChangeContractRef,
      workSummary: input.routingProjection.intent.split("\n")[0] ?? input.effectiveInput.intent,
    });
    state = validateWorkBindingState({
      ...state,
      workContract,
      workContractRef: workContract.contractId,
    }, input.effectiveInput);
  }

  if (
    workContract &&
    !routerBinding &&
    state.workContractValidation?.valid !== false
  ) {
    routerBinding = routerBindingForRecipe({
      workContract,
      baseRecipe: input.baseRecipe,
      routingProjection: input.routingProjection,
    });
    workContract = {
      ...workContract,
      routerBinding,
    };
    state = validateWorkBindingState({
      ...state,
      workContract,
      workContractRef: workContract.contractId,
      routerBinding,
      routerBindingRef: routerBinding.bindingId,
    }, input.effectiveInput);
  }

  return state;
}

function recipeContractBinding(state: WorkBindingState): RecipeContractBinding | undefined {
  if (!state.workContractRef && !state.routerBindingRef) return undefined;
  return {
    ...(state.workContractRef ? { workContractRef: state.workContractRef } : {}),
    ...(state.routerBindingRef ? { routerBindingRef: state.routerBindingRef } : {}),
  };
}

function workBindingResultFields(state: WorkBindingState): Partial<IntentRouterResult> {
  return {
    ...(state.workContractRef ? { workContractRef: state.workContractRef } : {}),
    ...(state.routerBindingRef ? { routerBindingRef: state.routerBindingRef } : {}),
    ...(state.workContract ? { workContract: state.workContract } : {}),
    ...(state.routerBinding ? { routerBinding: state.routerBinding } : {}),
    ...(state.workContractValidation
      ? { workContractValidation: state.workContractValidation }
      : {}),
    ...(state.routerBindingValidation
      ? { routerBindingValidation: state.routerBindingValidation }
      : {}),
  };
}

function shouldAssessOntologyDtcBuildReadiness(
  input: EffectiveIntentRouterInput,
  routingProjection: ContractRoutingProjection,
): boolean {
  if (isReadOnlyIntent(input.intent)) return false;
  return isOntologyAffectingIntent({
    intent: input.intent,
    scopePaths: routingProjection.scopePaths,
    complexityHint: input.complexityHint,
  });
}

function assessRouterOntologyDtcBuildReadiness(input: {
  effectiveInput: EffectiveIntentRouterInput;
  routingProjection: ContractRoutingProjection;
  workBindingState: WorkBindingState;
}): OntologyDtcBuildReadinessGate | undefined {
  if (
    !shouldAssessOntologyDtcBuildReadiness(
      input.effectiveInput,
      input.routingProjection,
    )
  ) {
    return undefined;
  }

  const routerBinding =
    input.workBindingState.routerBinding ??
    input.workBindingState.workContract?.routerBinding;
  return assessOntologyDtcBuildReadinessGate({
    intent: input.routingProjection.intent,
    scopePaths: input.routingProjection.scopePaths,
    complexityHint: input.routingProjection.complexityHint,
    projectRoot: input.effectiveInput.project,
    semanticIntentContractRef:
      input.effectiveInput.semanticIntentContract?.contractId ??
      input.effectiveInput.semanticIntentContractRef,
    digitalTwinChangeContractRef:
      input.effectiveInput.digitalTwinChangeContract?.contractId ??
      input.effectiveInput.digitalTwinChangeContractRef,
    workContractRef: input.workBindingState.workContractRef,
    routerBindingRef: input.workBindingState.routerBindingRef,
    semanticConsistencyResultRef:
      input.effectiveInput.semanticConsistencyResultRef ??
      input.effectiveInput.semanticConsistencyResult?.resolverRunId,
    semanticIntentContract: input.effectiveInput.semanticIntentContract,
    digitalTwinChangeContract: input.effectiveInput.digitalTwinChangeContract,
    semanticConsistencyResult: input.effectiveInput.semanticConsistencyResult,
    workContract: input.workBindingState.workContract,
    routerBinding,
  });
}

function ontologyDtcReadinessBlockedChecks(
  gate: OntologyDtcBuildReadinessGate | undefined,
): string[] {
  if (!gate) return [];
  return Object.entries(gate.checks)
    .filter(([, result]) => !result.valid)
    .map(([check]) => check);
}

function ontologyDtcReadinessPayload(
  gate: OntologyDtcBuildReadinessGate | undefined,
): Record<string, unknown> {
  if (!gate) return {};
  return {
    ontologyDtcBuildReadinessGateStatus: gate.status,
    ontologyDtcReadyForRouter: gate.readyForRouter,
    ontologyDtcReadinessBlockedChecks: ontologyDtcReadinessBlockedChecks(gate),
    ontologyDtcReadinessIssueCount: gate.issues.length,
  };
}

function applyOntologyDtcReadinessFailure(
  gate: ContractGateResult,
  readinessGate: OntologyDtcBuildReadinessGate,
): ContractGateResult {
  const issueSummary = readinessGate.issues
    .slice(0, 4)
    .map((issue) => `${issue.field}: ${issue.message}`)
    .join("; ");
  return {
    ...gate,
    status: "contract_required",
    allowsRouting: false,
    reason:
      "OntologyDtcBuildReadinessGate blocked router dispatch before recipe return: " +
      (issueSummary || "ready-for-router check failed"),
    contractPolicy: "approval-required",
    riskClass: "digital-twin",
    requiredContracts: ["SemanticIntentContract", "DigitalTwinChangeContract"],
    recommendedContracts: ["SemanticIntentContract", "DigitalTwinChangeContract"],
    semanticIntent: readinessGate.semanticIntent,
    digitalTwin: readinessGate.digitalTwin,
  };
}

async function resolvePromptRoutingInput(
  input: EffectiveIntentRouterInput,
): Promise<{
  input: EffectiveIntentRouterInput;
  envelope?: PromptEnvelope;
  contractRefs?: PromptContractRefs;
  continuity?: ContractValidationResult;
  lookup: PromptEnvelopeLookup;
}> {
  const candidates = promptFrontDoorCandidateStores(input.project);
  let selected =
    candidates[0] ??
    {
      store: new PromptFrontDoorStore({ projectRoot: input.project }),
      projectRoot: input.project,
      selectedBy: "input-project" as const,
    };
  const lookup = (): PromptEnvelopeLookup => ({
    suppliedProject: input.project,
    selectedPromptFrontDoorRoot: selected.projectRoot,
    selectedBy: selected.selectedBy,
    candidateRootsChecked: candidates.map((candidate) => candidate.projectRoot),
  });
  const runtime = isPromptRuntime(input.runtime) ? input.runtime : undefined;
  let promptId = input.promptId;
  const sessionId = input.sessionId;

  if (!promptId && runtime && sessionId) {
    for (const candidate of candidates) {
      const current = await candidate.store.readCurrentPointer(runtime, sessionId);
      if (current?.promptId) {
        selected = candidate;
        promptId = current.promptId;
        break;
      }
    }
  }

  let envelope: PromptEnvelope | undefined;
  let continuity: ContractValidationResult | undefined;
  if (promptId || sessionId || input.promptHash || runtime) {
    if (!promptId || !sessionId) {
      continuity = continuityFailure(
        "promptId",
        "promptId and sessionId are required to resolve prompt-front-door routing",
      );
    } else {
      for (const candidate of candidates) {
        const candidateEnvelope = await candidate.store.readEnvelope(sessionId, promptId);
        if (candidateEnvelope) {
          selected = candidate;
          envelope = candidateEnvelope;
          break;
        }
      }
      continuity = envelope
        ? validatePromptContinuity({
            envelope,
            expectedPromptHash: input.promptHash,
            currentPromptId: input.promptId,
            runtime,
            sessionId,
          })
        : continuityFailure(
            "promptId",
            "prompt-front-door envelope was not found for the supplied promptId/sessionId",
          );
    }
  }

  const inlineSemanticRef = input.semanticIntentContract?.contractId;
  const inlineDigitalTwinRef = input.digitalTwinChangeContract?.contractId;
  const requestedContractRefs: PromptContractRefs = {
    semanticIntentContractRef:
      input.semanticIntentContractRef ??
      inlineSemanticRef ??
      envelope?.contractRefs.semanticIntentContractRef,
    digitalTwinChangeContractRef:
      input.digitalTwinChangeContractRef ??
      inlineDigitalTwinRef ??
      envelope?.contractRefs.digitalTwinChangeContractRef,
    approvalRef: envelope?.contractRefs.approvalRef,
  };

  const semanticLookup =
    !input.semanticIntentContract && requestedContractRefs.semanticIntentContractRef
      ? await readContractRecordByRefFromCandidates<SemanticIntentContract>(
          requestedContractRefs.semanticIntentContractRef,
          candidates,
          selected,
        )
      : null;
  if (semanticLookup) selected = semanticLookup.selected;
  const digitalTwinLookup =
    !input.digitalTwinChangeContract && requestedContractRefs.digitalTwinChangeContractRef
      ? await readContractRecordByRefFromCandidates<DigitalTwinChangeContract>(
          requestedContractRefs.digitalTwinChangeContractRef,
          candidates,
          selected,
        )
      : null;
  if (digitalTwinLookup) selected = digitalTwinLookup.selected;
  const semanticRecord = semanticLookup?.record ?? null;
  const digitalTwinRecord = digitalTwinLookup?.record ?? null;
  const semanticIntentContract = input.semanticIntentContract ?? semanticRecord?.contract;
  const digitalTwinChangeContract = input.digitalTwinChangeContract ?? digitalTwinRecord?.contract;
  const contractRefs: PromptContractRefs = {
    ...(semanticIntentContract
      ? {
          semanticIntentContractRef:
            input.semanticIntentContractRef ??
            semanticRecord?.ref ??
            semanticIntentContract.contractId,
        }
      : {}),
    ...(digitalTwinChangeContract
      ? {
          digitalTwinChangeContractRef:
            input.digitalTwinChangeContractRef ??
            digitalTwinRecord?.ref ??
            digitalTwinChangeContract.contractId,
        }
      : {}),
    ...(requestedContractRefs.approvalRef ? { approvalRef: requestedContractRefs.approvalRef } : {}),
  };

  return {
    input: {
      ...input,
      semanticIntentContractRef:
        contractRefs.semanticIntentContractRef ??
        requestedContractRefs.semanticIntentContractRef,
      digitalTwinChangeContractRef:
        contractRefs.digitalTwinChangeContractRef ??
        requestedContractRefs.digitalTwinChangeContractRef,
      semanticIntentContract,
      digitalTwinChangeContract,
    },
    ...(envelope ? { envelope } : {}),
    ...(contractRefs.semanticIntentContractRef || contractRefs.digitalTwinChangeContractRef
      ? { contractRefs }
      : {}),
    ...(continuity ? { continuity } : {}),
    lookup: lookup(),
  };
}

// ─── Core routing function ────────────────────────────────────────────────────

export async function routeIntent(
  input: EffectiveIntentRouterInput,
): Promise<IntentRouterResult> {
  // Validation
  if (!input.project || typeof input.project !== "string") {
    throw new Error("pm_intent_router: `project` is required");
  }
  if (!input.intent || typeof input.intent !== "string") {
    throw new Error("pm_intent_router: `intent` is required");
  }

  // Load unified CapabilityRegistry (best-effort; does not block routing)
  let capabilityRegistryStats: CapabilityRegistryStats | undefined;
  try {
    const { stats } = loadCapabilityRegistry(input.project);
    capabilityRegistryStats = stats;
  } catch {
    // Non-fatal — routing proceeds without registry stats
  }

  const scopePaths: string[] = Array.isArray(input.scopePaths) ? input.scopePaths : [];
  const scopeCount = scopePaths.length;
  const promptRouting = await resolvePromptRoutingInput(input);
  const effectiveInput = promptRouting.input;
  const lineagePayload = promptLineagePayload(input, promptRouting);
  let workBindingState = validateWorkBindingState(
    resolveSuppliedWorkBinding(effectiveInput),
    effectiveInput,
  );

  // a. Semantic Intent / Digital Twin hard stop.
  const contractGate = assessContractGate({
    intent: effectiveInput.intent,
    scopePaths,
    complexityHint: effectiveInput.complexityHint,
    projectRoot: input.project,
    semanticIntentContractRef: effectiveInput.semanticIntentContractRef,
    digitalTwinChangeContractRef: effectiveInput.digitalTwinChangeContractRef,
    semanticConsistencyResultRef:
      effectiveInput.semanticConsistencyResultRef ??
      effectiveInput.semanticConsistencyResult?.resolverRunId,
    semanticIntentContract: effectiveInput.semanticIntentContract,
    digitalTwinChangeContract: effectiveInput.digitalTwinChangeContract,
    semanticConsistencyResult: effectiveInput.semanticConsistencyResult,
  });
  const effectiveContractGate =
    promptRouting.continuity && !promptRouting.continuity.valid
      ? applyPromptContinuityFailure(contractGate, promptRouting.continuity)
      : contractGate;
  const fdeProvenanceRequired = requiresFDEWorkflowProvenance(effectiveInput);
  const fdeProvenanceMissing =
    effectiveContractGate.allowsRouting &&
    fdeProvenanceRequired &&
    !hasFDEWorkflowProvenance(effectiveInput);
  const routingContractGate: ContractGateResult = fdeProvenanceMissing
    ? {
        ...effectiveContractGate,
        status: "contract_required",
        allowsRouting: false,
        reason:
          "FDEOntologyEngineeringSession provenance is required before Ontology Engineering workflow routing.",
      }
    : effectiveContractGate;
  let routingProjection = projectRoutingFromContracts({
    intent: effectiveInput.intent,
    scopePaths,
    complexityHint: effectiveInput.complexityHint,
    projectRoot: input.project,
    semanticIntentContractRef: effectiveInput.semanticIntentContractRef,
    digitalTwinChangeContractRef: effectiveInput.digitalTwinChangeContractRef,
    semanticConsistencyResultRef:
      effectiveInput.semanticConsistencyResultRef ??
      effectiveInput.semanticConsistencyResult?.resolverRunId,
    semanticIntentContract: effectiveInput.semanticIntentContract,
    digitalTwinChangeContract: effectiveInput.digitalTwinChangeContract,
    semanticConsistencyResult: effectiveInput.semanticConsistencyResult,
  });

  // FAIL-CLOSED: if the routing basis is raw-intent and the intent is ontology-affecting
  // (no approved typed-ref DTC present), flip the projection to fail-closed basis.
  // This ensures Lead cannot proceed with raw-intent routing for unsafe ontology work.
  // Bypass: PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS=1 (audited; hot-rollback path).
  // Sprint-097 W5-A dtc-T5; plan §8.2.
  const bypassRouterFailClosed =
    process.env["PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS"] === "1";
  if (bypassRouterFailClosed) {
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          passed: true,
          errorClass: "router_fail_closed_bypass_invoked",
          intent: effectiveInput.intent.slice(0, 80),
          bypassEnvVar: "PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS",
          ...lineagePayload,
        } as Record<string, unknown>,
        toolName: "pm_intent_router",
        cwd: input.project,
        reasoning:
          `pm_intent_router: PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS=1 set — ` +
          `skipping fail-closed predicate for intent="${effectiveInput.intent.slice(0, 60)}". ` +
          `Sprint-097 W5-A dtc-T5 hot-rollback path; plan §8.4.`,
        hypothesis:
          "Bypass is a temporary hot-rollback path; caller should remove the envvar once " +
          "the isOntologyAffectingIntent markers are refined to eliminate false positives.",
        memoryLayers: ["procedural"],
      });
    } catch {
      // Non-fatal — bypass proceeds regardless of emit failure
    }
  } else if (
    routingProjection.basis === "raw-intent" &&
    !isReadOnlyIntent(effectiveInput.intent) &&
    isOntologyAffectingIntent({
      intent: effectiveInput.intent,
      scopePaths,
      complexityHint: effectiveInput.complexityHint,
    }) &&
    !effectiveInput.semanticIntentContract &&
    !effectiveInput.digitalTwinChangeContract &&
    !effectiveInput.semanticIntentContractRef &&
    !effectiveInput.digitalTwinChangeContractRef
  ) {
    // Flip projection to fail-closed; caller will treat this as contract_required.
    routingProjection = {
      ...routingProjection,
      basis: "ontology-affecting-raw-intent-fail-closed",
      rationale:
        "Routing FAIL-CLOSED: ontology-affecting intent without approved typed-ref DTC. " +
        "Run pm_semantic_intent_gate with fillPolicy='ontology-dtc-build' to author DTC before routing.",
    };
  }

  let ontologyDtcBuildReadinessGate = assessRouterOntologyDtcBuildReadiness({
    effectiveInput,
    routingProjection,
    workBindingState,
  });

  const routingScopePaths = routingProjection.scopePaths;
  const routingScopeCount = routingScopePaths.length;

  // b. Cost-aware species pick
  const { species: dispatchSpecies, rationale: costRationale } = selectSpecies(
    input,
    routingScopeCount,
  );

  // c. ontology_context_query — canonical context-load path (PR 3.4, sprint-096).
  //    Lazy-imported to avoid circular deps (consistent with prefetch pattern above).
  //    500ms hard wall; fallback emits advisory event on failure.
  // PR 3.6 (sprint-098): graphConfidenceDispatchMode is computed after query succeeds.
  const ONTOLOGY_CTX_TIMEOUT_MS = 500;
  let ontologyContext: OntologyContextQueryResult | undefined;
  let ontologyContextDigest: string | undefined;
  let graphConfidenceDispatchMode: DispatchMode | undefined;
  if (routingContractGate.allowsRouting) {
    const ctxStart = Date.now();
    try {
      const { ontologyContextQuery } = await import("./ontology-context-query");
      const ctxResult = await Promise.race([
        ontologyContextQuery({
          project: input.project,
          ...(input.promptId   !== undefined ? { promptId:   input.promptId   } : {}),
          ...(input.promptHash !== undefined ? { promptHash: input.promptHash } : {}),
          ...(routingScopePaths.length > 0   ? { scopePaths: routingScopePaths } : {}),
          includeImpact:       true,
          includeLineage:      true,
          includeCapabilities: true,
          includeRisks:        false,
          includeEvals:        false,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("ontology_context_query_timeout")),
            ONTOLOGY_CTX_TIMEOUT_MS,
          ),
        ),
      ]);
      ontologyContext = ctxResult;
      ontologyContextDigest = deriveOntologyContextDigest(ctxResult);
      // PR 3.6: derive dispatch mode from graphConfidence + missingEdges count.
      graphConfidenceDispatchMode = pickDispatchModeFromConfidence(
        ctxResult.graphConfidence,
        ctxResult.missingEdges.length,
      );
    } catch (ctxErr) {
      // Non-fatal: emit advisory event and fall through to legacy prefetch path.
      const ctxElapsedMs = Date.now() - ctxStart;
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            passed: false,
            errorClass: "ontology_context_query_failed_fallback",
            elapsedMs: ctxElapsedMs,
            reason: String(ctxErr).slice(0, 200),
            scopeCount: routingScopeCount,
            ...lineagePayload,
          } as Record<string, unknown>,
          toolName: "pm_intent_router",
          cwd: input.project,
          reasoning:
            `pm_intent_router PR 3.4: ontology_context_query failed after ${ctxElapsedMs}ms — ` +
            `falling back to legacy prefetch path. intent="${input.intent.slice(0, 60)}" ` +
            `error=${String(ctxErr).slice(0, 80)}. ` +
            `Sprint-096 PR 3.4; canonical plan v2 §4 row 3.4.`,
          hypothesis:
            "Context query failure is transient (timeout or handler init); legacy prefetch " +
            "provides partial context until the canonical path stabilises.",
          memoryLayers: ["semantic", "procedural"],
        });
      } catch {
        // emit failure is non-fatal; fallback path always used regardless
      }
    }
  }

  // d. Prefetch context (500ms per call, best-effort, all try/catch)
  const { prefetchedContext, timings, succeeded } = await collectPrefetches(
    input.project,
    routingScopePaths,
  );

  if (
    !routingContractGate.allowsRouting ||
    routingProjection.basis === "ontology-affecting-raw-intent-fail-closed"
  ) {
    const isFailClosed =
      routingProjection.basis === "ontology-affecting-raw-intent-fail-closed";
    const blockedDecision: IntentRouterDecision = isFailClosed
      ? "contract_required"
      : routingContractGate.status === "blocked_for_clarification"
        ? "blocked_for_clarification"
        : "contract_required";
    try {
      const durationMs =
        (timings.impactMs ?? 0) + (timings.lineageMs ?? 0) + (timings.gradesMs ?? 0);
      await emit({
        type: "validation_phase_completed",
        payload: {
          passed: false,
          errorClass: isFailClosed
            ? "raw_intent_ontology_affecting_fail_closed"
            : fdeProvenanceMissing
              ? "fde_session_required"
              : routingContractGate.status,
          decision: blockedDecision,
          dispatchSpecies,
          prefetchSucceeded: succeeded,
          durationMs,
          scopeCount: routingScopeCount,
          rawScopeCount: scopeCount,
          contractPolicy: routingContractGate.contractPolicy,
          requiredContracts: routingContractGate.requiredContracts,
          recommendedContracts: routingContractGate.recommendedContracts,
          questionCount: routingContractGate.questions.length,
          fdeProvenanceRequired,
          fdeProvenanceMissing,
          routingBasis: routingProjection.basis,
          failClosedPredicate: isFailClosed,
          workContractRef: workBindingState.workContractRef,
          routerBindingRef: workBindingState.routerBindingRef,
          workContractValid: workBindingState.workContractValidation?.valid,
          routerBindingValid: workBindingState.routerBindingValidation?.valid,
          ...ontologyDtcReadinessPayload(ontologyDtcBuildReadinessGate),
          ...promptLineagePayload(input, promptRouting, workBindingState),
        } as Record<string, unknown>,
        toolName: "pm_intent_router",
        cwd: input.project,
        reasoning: isFailClosed
          ? `pm_intent_router FAIL-CLOSED: ontology-affecting intent="${input.intent.slice(0, 80)}" ` +
            `has no typed-ref DTC — returning contract_required. ` +
            `Sprint-097 W5-A dtc-T5; plan §8.2. Run pm_semantic_intent_gate with ` +
            `fillPolicy='ontology-dtc-build' to author DTC before routing.`
          : `pm_intent_router: contract gate stopped intent="${input.intent.slice(0, 80)}" ` +
            `status=${routingContractGate.status} species=${dispatchSpecies}`,
        hypothesis: isFailClosed
          ? "Fail-closed predicate prevents raw-intent routing for ontology-affecting work. " +
            "If a false positive, adjust isOntologyAffectingIntent markers in contracts.ts " +
            "or set PALANTIR_MINI_ROUTER_FAIL_CLOSED_BYPASS=1 for hot rollback."
          : "Complex ontology-affecting dispatch requires an approved SemanticIntentContract " +
            "and DigitalTwinChangeContract before selecting a downstream runtime.",
        memoryLayers: ["semantic", "procedural"],
        refinementTarget: {
          kind: "rule-conformance-policy",
          filePathOrRid: "bridge/handlers/pm-intent-router.ts",
          description: isFailClosed
            ? "Intent router fail-closed: ontology-affecting intent routed without approved DTC."
            : "Intent router stopped dispatch before approved prompt-contract continuity was established.",
          confidenceLevel: "high",
        },
      });
    } catch {
      // Non-fatal — result is returned regardless of emit failure
    }

    return {
      decision: blockedDecision,
      rationale: routingContractGate.reason,
      dispatchSpecies,
      costRationale,
      contractGate: routingContractGate,
      ...(ontologyDtcBuildReadinessGate
        ? { ontologyDtcBuildReadinessGate }
        : {}),
      routingProjection,
      prefetchedContext,
      prefetchTimingsMs: timings,
      prefetchSucceeded: succeeded,
      ...workBindingResultFields(workBindingState),
      ...(capabilityRegistryStats !== undefined ? { capabilityRegistryStats } : {}),
      ...(promptRouting.envelope ? { promptEnvelope: promptRouting.envelope } : {}),
      ...(promptRouting.contractRefs ? { contractRefs: promptRouting.contractRefs } : {}),
      ...(promptRouting.continuity ? { promptContinuity: promptRouting.continuity } : {}),
      promptEnvelopeLookup: promptRouting.lookup,
    };
  }

  // e. Build base recipe (classifyDomain + buildRecipe — pure, no side effects)
  //    Pass ontologyContext when available (PR 3.4) to enrich scopePaths + sprint mode.
  const buildInput: BuildRecipeInput = {
    intent: routingProjection.intent,
    scopePaths: routingProjection.scopePaths,
    complexityHint: routingProjection.complexityHint,
    ...(ontologyContext !== undefined ? { ontologyContext } : {}),
  };
  const baseRecipe = buildRecipe(buildInput);
  workBindingState = deriveWorkBindingForRoute({
    state: workBindingState,
    effectiveInput,
    baseRecipe,
    routingProjection,
  });
  const routeRecipe = attachContractBindingToRecipe(
    baseRecipe,
    recipeContractBinding(workBindingState),
  );
  ontologyDtcBuildReadinessGate = assessRouterOntologyDtcBuildReadiness({
    effectiveInput,
    routingProjection,
    workBindingState,
  });

  if (
    ontologyDtcBuildReadinessGate &&
    !ontologyDtcBuildReadinessGate.readyForRouter
  ) {
    const readinessContractGate = applyOntologyDtcReadinessFailure(
      routingContractGate,
      ontologyDtcBuildReadinessGate,
    );
    const blockedDecision: IntentRouterDecision = "contract_required";
    try {
      const durationMs =
        (timings.impactMs ?? 0) + (timings.lineageMs ?? 0) + (timings.gradesMs ?? 0);
      await emit({
        type: "validation_phase_completed",
        payload: {
          passed: false,
          errorClass: "ontology_dtc_build_readiness_gate_blocked",
          decision: blockedDecision,
          dispatchSpecies,
          prefetchSucceeded: succeeded,
          durationMs,
          scopeCount: routingScopeCount,
          rawScopeCount: scopeCount,
          contractPolicy: readinessContractGate.contractPolicy,
          requiredContracts: readinessContractGate.requiredContracts,
          recommendedContracts: readinessContractGate.recommendedContracts,
          routingBasis: routingProjection.basis,
          failClosedPredicate: false,
          workContractRef: workBindingState.workContractRef,
          routerBindingRef: workBindingState.routerBindingRef,
          workContractValid: workBindingState.workContractValidation?.valid,
          routerBindingValid: workBindingState.routerBindingValidation?.valid,
          ...ontologyDtcReadinessPayload(ontologyDtcBuildReadinessGate),
          ...lineagePayload,
        } as Record<string, unknown>,
        toolName: "pm_intent_router",
        cwd: input.project,
        reasoning:
          `pm_intent_router: OntologyDtcBuildReadinessGate blocked dispatch for ` +
          `intent="${input.intent.slice(0, 80)}" basis=${routingProjection.basis}.`,
        hypothesis:
          "Ontology-affecting dispatch requires approved SIC/DTC bodies plus eval, " +
          "branch, permission, WorkContract, and RouterBinding evidence. Context or tools " +
          "can enrich diagnostics but cannot authorize the route.",
        memoryLayers: ["semantic", "procedural"],
        refinementTarget: {
          kind: "rule-conformance-policy",
          filePathOrRid: "bridge/handlers/pm-intent-router.ts",
          description:
            "Intent router stopped ontology-affecting dispatch before readiness evidence was complete.",
          confidenceLevel: "high",
        },
      });
    } catch {
      // Non-fatal — result is returned regardless of emit failure.
    }

    return {
      decision: blockedDecision,
      rationale: readinessContractGate.reason,
      dispatchSpecies,
      costRationale,
      contractGate: readinessContractGate,
      ontologyDtcBuildReadinessGate,
      routingProjection,
      prefetchedContext,
      prefetchTimingsMs: timings,
      prefetchSucceeded: succeeded,
      ...workBindingResultFields(workBindingState),
      ...(ontologyContextDigest !== undefined ? { ontologyContextDigest } : {}),
      ...(graphConfidenceDispatchMode !== undefined ? { graphConfidenceDispatchMode } : {}),
      ...(capabilityRegistryStats !== undefined ? { capabilityRegistryStats } : {}),
      ...(promptRouting.envelope ? { promptEnvelope: promptRouting.envelope } : {}),
      ...(promptRouting.contractRefs ? { contractRefs: promptRouting.contractRefs } : {}),
      ...(promptRouting.continuity ? { promptContinuity: promptRouting.continuity } : {}),
      promptEnvelopeLookup: promptRouting.lookup,
    };
  }

  // f. Emit validation_phase_completed (best-effort, non-fatal)
  //    PR 3.4: includes ontologyContextDigest + rawIntentFallback advisory signal.
  try {
    const durationMs =
      (timings.impactMs ?? 0) + (timings.lineageMs ?? 0) + (timings.gradesMs ?? 0);
    // Advisory signal: raw-intent basis means routing used raw prompt text — callers
    // should supply approved contract refs for complex ontology-affecting dispatch.
    const rawIntentFallback = routingProjection.basis === "raw-intent";
    await emit({
      type: "validation_phase_completed",
      payload: {
        passed: true,
        errorClass: "intent_routing_completed",
        decision: routeRecipe.decision,
        agent: routeRecipe.recipe?.agent ?? null,
        dispatchSpecies,
        contractGate: routingContractGate.status,
        contractPolicy: routingContractGate.contractPolicy,
        recommendedContracts: routingContractGate.recommendedContracts,
        routingBasis: routingProjection.basis,
        routingFromContractFields: routingProjection.hasContractFields,
        rawIntentFallback,
        ontologyContextDigest: ontologyContextDigest ?? null,
        graphConfidenceDispatchMode: graphConfidenceDispatchMode ?? null,
        workContractRef: workBindingState.workContractRef,
        routerBindingRef: workBindingState.routerBindingRef,
        workContractValid: workBindingState.workContractValidation?.valid,
        routerBindingValid: workBindingState.routerBindingValidation?.valid,
        ...ontologyDtcReadinessPayload(ontologyDtcBuildReadinessGate),
        prefetchSucceeded: succeeded,
        durationMs,
        scopeCount: routingScopeCount,
        rawScopeCount: scopeCount,
        ...promptLineagePayload(input, promptRouting, workBindingState),
      } as Record<string, unknown>,
      toolName: "pm_intent_router",
      cwd: input.project,
      reasoning:
        `pm_intent_router: intent="${input.intent.slice(0, 80)}" ` +
        `decision=${routeRecipe.decision} species=${dispatchSpecies} ` +
        `routingBasis=${routingProjection.basis} ` +
        `ontologyCtx=${ontologyContextDigest ?? "none"} ` +
        `dispatchMode=${graphConfidenceDispatchMode ?? "none"} ` +
        `prefetch=[${succeeded.join(",")}] durationMs=${durationMs}. ` +
        `Sprint-098 PR 3.6 graphConfidence threshold routing; canonical plan v2 §4 row 3.6.`,
      hypothesis:
        "Unified intent-router reduces Lead's first-turn MCP call count from 3+ to 1, " +
        "cutting token burn and improving routing consistency (sprint-063 W3.A). " +
        "PR 3.4 grounds routing in OntologyContext instead of raw intent text.",
      memoryLayers: ["semantic", "procedural"],
    });
  } catch {
    // Non-fatal — result is returned regardless of emit failure
  }

  try {
    await attachRoutingProjectionToCapsule(input.promptId, {
      decision: routeRecipe.decision,
      agent: routeRecipe.recipe?.agent ?? null,
      dispatchSpecies,
      routingProjection,
    }, input.project);
  } catch {
    // Non-fatal — capsule persistence is lineage enrichment, not routing authority.
  }

  // Transition UniversalOntologyEntry to "routed" (best-effort).
  try {
    const entry = readCurrentUniversalOntologyEntry(input.project);
    if (entry) {
      const delegationRecipeRef = routeRecipe.recipe?.agent
        ? `delegation-recipe://${routeRecipe.decision}-${routeRecipe.recipe.agent}`
        : `delegation-recipe://${routeRecipe.decision}`;
      await transitionUniversalOntologyEntry({
        entry,
        nextStatus: "routed",
        refs: {
          delegationRecipeRef,
          semanticIntentContractRef: promptRouting.contractRefs?.semanticIntentContractRef,
          digitalTwinChangeContractRef: promptRouting.contractRefs?.digitalTwinChangeContractRef,
        },
        projectRoot: input.project,
      });
    }
  } catch {
    // Best-effort — routing result is authoritative; entry lifecycle is lineage enrichment.
  }

  // e. Auto-low-risk OntologyContextApproval (best-effort, PR-4 wiring; PR 3.5 policy gate).
  // PR 3.5 (sprint-097): approval auto-create is now gated on explicit 6-signal low-risk
  // check (isLowRiskIntent) per canonical plan v2 §4 row 3.5 + proposal §11 Phase 3.
  // High-risk intents skip auto-create and emit an advisory validation_phase_completed event.
  // When acceptApprovalAutoCreate=false (caller override), auto-create is always skipped.
  //
  // Full wiring requires an OntologyContextQueryResult with capabilityContext.requiredDtc +
  // selectedCapabilityIds + impactContext.confidence in routing scope. PR-5
  // (ProjectOntologyIndex consumption in query.ts) will wire the context query result
  // into routeIntent() so selectedCapabilityIds are available for the approvedCapabilityRefs
  // field. Until PR-5 lands, approvedCapabilityRefs is empty on the auto-create path;
  // the approval record is still created for audit lineage.
  let ontologyContextApprovalRef: string | undefined;
  const acceptApprovalAutoCreate = input.acceptApprovalAutoCreate ?? true;
  if (acceptApprovalAutoCreate) {
    // 6-signal low-risk gate (PR 3.5).
    const lowRiskResult = isLowRiskIntent({
      intent: input.intent,
      scopePaths: routingScopePaths,
      complexityHint: input.complexityHint ?? null,
      // requiresT3PlusEvent and hasContractMutation default to false (safe) when absent.
    });

    if (lowRiskResult.lowRisk) {
      // All 6 signals pass → auto-create approval (best-effort).
      try {
        const universalEntry = readCurrentUniversalOntologyEntry(input.project);
        const universalOntologyEntryRef = universalEntry
          ? `universal-ontology-entry://${universalEntry.entryId ?? "current"}`
          : "universal-ontology-entry://unknown";
        const sourceQueryRef = ontologyContextDigest
          ? `ontology-context-query://${ontologyContextDigest}`
          : `ontology-context-query://intent-router-${Date.now()}`;

        const { approvalRef } = await createOntologyContextApproval({
          sourceQueryRef,
          universalOntologyEntryRef,
          approvedCapabilityRefs: [], // PR-5 will supply selectedCapabilityIds here
          rejectedCapabilityRefs: [],
          approvedSurfaceRefs: routingScopePaths.slice(),
          forbiddenSurfaceRefs: [],
          approvalKind: "auto-low-risk",
          approverIdentity: "claude-code",
          projectRoot: input.project,
          ...(input.promptId   !== undefined ? { promptId:   input.promptId   } : {}),
          ...(input.promptHash !== undefined ? { promptHash: input.promptHash } : {}),
          ...(input.sessionId  !== undefined ? { sessionId:  input.sessionId  } : {}),
        });
        ontologyContextApprovalRef = approvalRef;
      } catch {
        // Best-effort — approval failure never blocks routing result.
      }
    } else {
      // One or more signals failed → skip auto-create and emit advisory.
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            passed: false,
            errorClass: "approval_auto_create_skipped_high_risk",
            failedSignal: lowRiskResult.failedSignal,
            intent: input.intent.slice(0, 120),
            scopeCount: routingScopeCount,
            complexityHint: input.complexityHint ?? null,
            ...lineagePayload,
          } as Record<string, unknown>,
          toolName: "pm_intent_router",
          cwd: input.project,
          reasoning:
            `Sprint-097 PR 3.5 — approval auto-create policy gated on explicit 6-signal ` +
            `low-risk check per canonical plan v2 §4 row 3.5 + proposal §11 Phase 3 final acceptance. ` +
            `High-risk intent skipped auto-create. failedSignal=${lowRiskResult.failedSignal}`,
          memoryLayers: ["semantic", "procedural"],
        });
      } catch {
        // Non-fatal — advisory emit failure does not affect routing result.
      }
    }
  }

  // PR-10: transition the latest open workflow trace to "router" (best-effort).
  try {
    const openTrace = findLatestOpenTrace(input.project);
    if (openTrace) {
      await transitionOntologyWorkflowTrace({
        projectRoot: input.project,
        trace: openTrace,
        nextMode: "router",
        refsPatch: {
          semanticIntentContractRef: promptRouting.contractRefs?.semanticIntentContractRef,
          digitalTwinChangeContractRef: promptRouting.contractRefs?.digitalTwinChangeContractRef,
        },
        sessionId: input.sessionId,
        reasoning:
          `pm_intent_router transitions trace to router mode; ` +
          `decision=${routeRecipe.decision} species=${dispatchSpecies} — ` +
          `rule 01 §ForwardProp; PR-10 wire #5`,
      });
    }
  } catch {
    // best-effort — routing result is authoritative; trace transition is lineage enrichment
  }

  return {
    ...routeRecipe,
    dispatchSpecies,
    costRationale,
    contractGate: routingContractGate,
    ...(ontologyDtcBuildReadinessGate
      ? { ontologyDtcBuildReadinessGate }
      : {}),
    routingProjection,
    prefetchedContext,
    prefetchTimingsMs: timings,
    prefetchSucceeded: succeeded,
    ...workBindingResultFields(workBindingState),
    ...(ontologyContextDigest !== undefined ? { ontologyContextDigest } : {}),
    ...(graphConfidenceDispatchMode !== undefined ? { graphConfidenceDispatchMode } : {}),
    ...(ontologyContextApprovalRef !== undefined ? { ontologyContextApprovalRef } : {}),
    ...(capabilityRegistryStats !== undefined ? { capabilityRegistryStats } : {}),
    ...(promptRouting.envelope ? { promptEnvelope: promptRouting.envelope } : {}),
    ...(promptRouting.contractRefs ? { contractRefs: promptRouting.contractRefs } : {}),
    ...(promptRouting.continuity ? { promptContinuity: promptRouting.continuity } : {}),
    promptEnvelopeLookup: promptRouting.lookup,
  };
}

// ─── Default export (MCP handler signature) ──────────────────────────────────

export default async function pmIntentRouterHandler(
  rawArgs: unknown,
): Promise<IntentRouterResult> {
  return routeIntent((rawArgs ?? {}) as EffectiveIntentRouterInput);
}
