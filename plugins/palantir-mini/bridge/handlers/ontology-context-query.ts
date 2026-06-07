// palantir-mini v6.14.0 — ontology_context_query NEW canonical MCP handler
//
// Sprint-093 PR 3.1 (canonical AIP-aligned plan v2 §4 row 3.1; Phase 3 entry point).
// Per proposal §8 Stage 4 input/output schema. SHELL implementation: wires the
// directly-available sub-contexts (impact + capability + lineage) and returns
// typed placeholders for applicationState (PR 3.2), retrievalContext (PR 3.3),
// riskContext (later PR), evalContext (later PR — Convex evalRuns).
//
// Predecessor: plugin v6.13.0 (sprint-092 PR 2.15) + main HEAD 0394433d6.
//              PHASE 2 SUBSTRATE 100% COMPLETE (10 indexers + impact_query
//              upgrade + capability registry + workflow lineage query).
//
// Coexistence: the LEGACY ontology_context_query handler (UniversalOntologyEntry
// / workflowTrace flow; internal-only) is preserved at
// `./ontology-context-query-legacy.ts` and registered in HANDLER_MODULES under
// the slot `ontology_context_query_legacy`. Existing internal callers reach it
// by that name; this canonical handler claims the public `ontology_context_query`
// name in TOOLS array.
//
// Sprint-115 PR 5.4b: NEW opt-in includeEvalRuns arg + evalRunsContext field.
// When includeEvalRuns=true AND Cloud reachable AND not STUB MODE, the response
// includes evalRunsContext: { recentRuns, lastRunAt, perVerdictCounts }.
// Graceful degrade: STUB MODE + Cloud-down both yield omission, never error.
// Per canonical plan v2 §4 row 5.4b. FINAL CANONICAL PR.
//
// @owner palantirkc-ontology
// @since palantir-mini v6.14.0 (sprint-093 PR 3.1; Phase 3 PR 1/7)

import * as fs from "node:fs";
import * as path from "node:path";

import impactQuery from "./impact-query";
import type { RecommendedAgentUse } from "../../lib/impact-query/graph-confidence";
import type { MissingEdgeRecord } from "../../lib/impact-query/missing-edges";
import { loadCapabilityRegistry } from "../../lib/capability-registry";
import {
  composeApplicationState,
  type ApplicationStateProjection as ComposedApplicationStateProjection,
} from "../../lib/ontology-context/application-state";
import {
  composeOntologyRiskContext,
  type OntologyRiskContext,
} from "../../lib/ontology-context/risk-context";
import {
  composeRetrievalContext,
  type RetrievalContextProjection as ComposedRetrievalContextProjection,
} from "../../lib/ontology-context/retrieval-context";
import pmWorkflowLineageQuery from "./pm-workflow-lineage-query";
import { queryRecentEvalRuns, getConvexClient } from "../../lib/impact-graph/convex-client";
import type { AIPEvaluationRunDeclaration } from "#schemas/ontology/primitives/aip-evaluation";
import { readDTCApprovalFromCache } from "../../lib/prompt-front-door/sic-approval-cache";
import { resolveDTCToolSurfaceTerms } from "../../lib/lead-intent/ontology-ref-resolver";
import { DTC_FILL_SEQUENCE } from "../../lib/semantic-intent/fill-sequence";
import type { DigitalTwinChangeContract } from "../../lib/lead-intent/contracts";
import {
  composeFDEOntologyBuildSession,
} from "../../lib/fde-build/session-composer";
import {
  fdeOntologyEngineeringSessionRef,
  readCurrentFDEOntologyEngineeringSession,
  readFDEOntologyEngineeringSession,
} from "../../lib/fde-ontology-engineering/session-store";
import type {
  FDEOntologyEngineeringSession,
} from "../../lib/fde-ontology-engineering/types";
import type {
  FDEOntologyBuildSession,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";

// ─── Input schema (proposal §8 Stage 4) ─────────────────────────────────────

export interface OntologyContextQueryInput {
  /** Absolute project root. */
  readonly project: string;
  /** PromptEnvelope.promptId for join (optional). */
  readonly promptId?: string;
  /** PromptEnvelope.promptHash (optional). */
  readonly promptHash?: string;
  /** Narrowing scope paths (relative or absolute). */
  readonly scopePaths?: ReadonlyArray<string>;
  /** Requested AIP axes (opaque identifiers; PR 3.1 treats as RIDs). */
  readonly requestedAxes?: ReadonlyArray<string>;
  /** Include impactContext + derived graphConfidence/missingEdges/recommendedAgentUse (default true). */
  readonly includeImpact?: boolean;
  /** Include lineageContext (default true). */
  readonly includeLineage?: boolean;
  /** Include capabilityContext (default true). */
  readonly includeCapabilities?: boolean;
  /** Include riskContext placeholder (default true). */
  readonly includeRisks?: boolean;
  /** Include evalContext placeholder (default true). */
  readonly includeEvals?: boolean;
  /**
   * Opt-in: when true AND Convex Cloud is reachable AND not STUB MODE,
   * adds evalRunsContext field with recent Convex evalRuns data.
   * When false/absent OR Cloud unreachable OR STUB MODE → field omitted.
   * Per canonical plan v2 §4 row 5.4b (sprint-115 PR 5.4b).
   */
  readonly includeEvalRuns?: boolean;
  /** Optional projectSlug for evalRuns filtering (defaults to last segment of project path). */
  readonly evalRunsProjectSlug?: string;
  /** Max number of recent evalRuns to include (default 20). */
  readonly evalRunsLimit?: number;
  /** Optional projectsRoot forwarded to pm_workflow_lineage_query discovery (default uses registered + discovered). */
  readonly projectsRoot?: string;
  /**
   * Include DTC fill readiness diagnostics in the response (default true).
   * When false OR when no DTC context is available, dtcFillReadinessDiagnostics
   * is omitted from the output. Requires promptId to be present for cache lookup.
   * Per canonical plan §4.1 dtc-T4-bridge-ocq (Sprint 97 W4).
   */
  readonly includeDTCContext?: boolean;
  /** Optional current/known FDE Ontology Engineering session object. */
  readonly fdeOntologyEngineeringSession?: unknown;
  /** Optional fde-ontology-engineering://session/<id> ref or raw sessionId. */
  readonly fdeOntologyEngineeringSessionRef?: string;
}

// ─── Projection types (Phase 3 SHELL canonical shapes) ──────────────────────

// Sprint-094 PR 3.2: ApplicationStateProjection is now the real composed
// projection authored at `lib/ontology-context/application-state.ts`. Public
// name preserved by re-export so consumers of `import type
// { ApplicationStateProjection } from "<handler>"` keep working.
export type ApplicationStateProjection = ComposedApplicationStateProjection;

// Sprint-095 PR 3.3: RetrievalContextProjection is now the real composed
// projection authored at `lib/ontology-context/retrieval-context.ts`. Public
// name preserved by re-export so consumers of `import type
// { RetrievalContextProjection } from "<handler>"` keep working.
export type RetrievalContextProjection = ComposedRetrievalContextProjection;

export interface ImpactContextProjection {
  /** Resolved RIDs for each requestedAxes/scopePaths entry. */
  readonly axisRids: ReadonlyArray<string>;
  /** Per-RID impact summary. */
  readonly perRidImpact: ReadonlyArray<{
    readonly rid: string;
    readonly forwardCount: number;
    readonly backwardCount: number;
    readonly graphConfidence: number;
    readonly recommendedAgentUse: RecommendedAgentUse;
  }>;
}

export interface CapabilityContextProjection {
  readonly totalCapabilities: number;
  /** Capability IDs whose readSurfaces/writeSurfaces intersect scopePaths (best-effort). */
  readonly scopedCapabilityIds: ReadonlyArray<string>;
  readonly skillCount: number;
  readonly mcpToolCount: number;
  readonly agentCount: number;
}

export interface RiskContextProjection {
  readonly status: "pending-later-pr" | "composed";
  readonly risks: ReadonlyArray<string> | OntologyRiskContext["risks"];
}

export interface LineageContextProjection {
  readonly recentT3PlusEventCount: number;
  /** ISO8601 of most recent event in window, or null when none found. */
  readonly lastEventWhen: string | null;
  readonly perProjectCounts: Readonly<Record<string, number>>;
}

export interface EvalContextProjection {
  readonly status: "pending-later-pr";
  readonly evalRuns: ReadonlyArray<string>;
}

/**
 * evalRunsContext — real Convex evalRuns data (opt-in, sprint-115 PR 5.4b).
 * Present only when includeEvalRuns=true AND Cloud reachable AND not STUB MODE.
 */
export interface EvalRunsContextProjection {
  /**
   * Recent runs ordered by ranAt descending.
   * Type follows AIPEvaluationRunDeclaration shape (from schemas aip-evaluation).
   */
  readonly recentRuns: ReadonlyArray<AIPEvaluationRunDeclaration>;
  /** ISO8601 of the most recent run, or null when no runs. */
  readonly lastRunAt: string | null;
  /** Per-verdict counts across recentRuns. */
  readonly perVerdictCounts: {
    readonly pass: number;
    readonly revise: number;
    readonly reject: number;
  };
}

export interface FDEOntologyEngineeringProjection {
  readonly sessionId: string;
  readonly sessionRef: string;
  readonly phase: string;
  readonly turnCount: number;
  readonly readiness: FDEOntologyBuildSession["readiness"];
  readonly completedLevels: FDEOntologyBuildSession["completedLevels"];
  readonly topGapCount: number;
  readonly mission: {
    readonly useCaseName?: string;
    readonly operationalDecision?: string;
  };
  readonly objectTypes: ReadonlyArray<string>;
  readonly linkTypes: ReadonlyArray<string>;
  readonly actionTypes: ReadonlyArray<string>;
  readonly functions: ReadonlyArray<string>;
  readonly chatbots: ReadonlyArray<string>;
  readonly evalObservability?: {
    readonly evalSuiteName?: string;
    readonly latestPassRate?: number;
    readonly auditSessionTraceEvidence: ReadonlyArray<string>;
  };
}

export interface MissingEdgeRef {
  readonly fromRid: string;
  readonly toRid: string;
  readonly edgeKind: string;
}

/**
 * DTC fill readiness diagnostics — surfaces DTC fill state at routing time.
 * Present only when includeDTCContext !== false AND a DTC is available in the
 * SIC approval cache or as an inline contract.
 * Per canonical plan §4.1 dtc-T4-bridge-ocq (Sprint 97 W4).
 */
export interface DtcFillReadinessDiagnostics {
  /** Steps completed in the 7-turn DTC fill sequence (step ordinals 1-7). */
  readonly completedTurns: readonly number[];
  /** Question for the next turn in the DTC fill sequence (Korean). */
  readonly nextTurnQuestion?: string;
  /** English mirror of nextTurnQuestion (per §5.12 bilingual policy). */
  readonly nextTurnQuestionEn?: string;
  /** MCP tool surface resolution from DTC.toolSurfaceReadiness + permittedMutationSurfaces. */
  readonly toolSurfaceReadiness: {
    /** Tool names successfully resolved against MCP tool registry. */
    readonly resolved: readonly string[];
    /** Terms from DTC that did NOT match any registered MCP tool. */
    readonly unresolved: readonly string[];
  };
  /** Subset of unresolved tool surface terms that block DTC approval. */
  readonly blockingUnresolvedTerms: readonly string[];
  /** ISO8601 timestamp of DTC approval from cache, if present. */
  readonly dtcApprovedAt?: string;
  /** DTC fill progress as a percentage (0-100; 7 turns = 100%). */
  readonly fillProgressPercent: number;
}

// ─── Output schema (proposal §8 Stage 4) ────────────────────────────────────

export interface OntologyContextQueryResult {
  readonly applicationState: ApplicationStateProjection;
  readonly retrievalContext: RetrievalContextProjection;
  /** Present when includeImpact !== false. */
  readonly impactContext?: ImpactContextProjection;
  /** Present when includeCapabilities !== false. */
  readonly capabilityContext?: CapabilityContextProjection;
  /** Present when includeRisks !== false. */
  readonly riskContext?: RiskContextProjection;
  /** Present when includeLineage !== false. */
  readonly lineageContext?: LineageContextProjection;
  /** Present when includeEvals !== false. */
  readonly evalContext?: EvalContextProjection;
  /**
   * Present only when includeEvalRuns=true AND Convex Cloud reachable AND not STUB MODE.
   * Omitted (not null) when opt-out or Cloud unreachable. Per canonical plan v2 §4 row 5.4b.
   */
  readonly evalRunsContext?: EvalRunsContextProjection;
  /**
   * Present only when includeDTCContext !== false AND a DTC is available
   * (via SIC approval cache lookup or inline contract on input).
   * Omitted (not null) when opt-out or no DTC context available.
   * Per canonical plan §4.1 dtc-T4-bridge-ocq (Sprint 97 W4).
   */
  readonly dtcFillReadinessDiagnostics?: DtcFillReadinessDiagnostics;
  /**
   * Compact FDE Ontology Engineering projection. Present when a current FDE
   * session exists, a session ref is supplied, or an inline session is supplied.
   */
  readonly fdeOntologyEngineeringProjection?: FDEOntologyEngineeringProjection;
  /** Aggregated graphConfidence (mean of per-RID; 1.0 when no impact requested or no axes provided). */
  readonly graphConfidence: number;
  /** Union of impact_query missingEdges across all axisRids, capped 50. */
  readonly missingEdges: ReadonlyArray<MissingEdgeRef>;
  /** Worst-case routing across per-RID recommendedAgentUse. */
  readonly recommendedAgentUse: RecommendedAgentUse;
  /** Derived from scopePaths × mutation-path patterns. */
  readonly requiredContracts: ReadonlyArray<string>;
  /** Loaded from <project>/.palantir-mini/project-scope.json#nonGoals, else []. */
  readonly nonGoals: ReadonlyArray<string>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MUTATION_PATH_PATTERNS: ReadonlyArray<RegExp> = [
  /(^|\/)ontology(\/|$)/,
  /(^|\/)schemas(\/|$)/,
  /(^|\/)contracts(\/|$)/,
  /(^|\/)handlers(\/|$)/,
  /(^|\/)bridge\/handlers(\/|$)/,
];

const MISSING_EDGES_CAP = 50;

const AGENT_USE_RANK: Record<RecommendedAgentUse, number> = {
  "lead-direct":           3,
  "targeted-verification": 2,
  "bounded-explorer":      1,
  "none":                  0,
};

const RANK_TO_AGENT_USE: ReadonlyArray<RecommendedAgentUse> = [
  "none",
  "bounded-explorer",
  "targeted-verification",
  "lead-direct",
];

// ─── Input validation ───────────────────────────────────────────────────────

function assertInput(value: unknown): asserts value is OntologyContextQueryInput {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ontology_context_query requires an object input.");
  }
  const input = value as Partial<OntologyContextQueryInput>;
  if (typeof input.project !== "string" || input.project.trim().length === 0) {
    throw new Error("ontology_context_query requires `project` (absolute path).");
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function axisToRid(axis: string): string {
  if (axis.startsWith("rid:")) return axis;
  return `axis:${axis}`;
}

function scopePathToRid(scopePath: string): string {
  if (scopePath.startsWith("file:")) return scopePath;
  return `file:${scopePath}`;
}

function deriveRequiredContracts(
  scopePaths: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> {
  if (!scopePaths || scopePaths.length === 0) return [];
  const touchesMutation = scopePaths.some((p) =>
    MUTATION_PATH_PATTERNS.some((rx) => rx.test(p)),
  );
  return touchesMutation
    ? ["SemanticIntentContract", "DigitalTwinChangeContract"]
    : [];
}

function readNonGoals(projectRoot: string): ReadonlyArray<string> {
  const scopePath = path.join(projectRoot, ".palantir-mini", "project-scope.json");
  if (!fs.existsSync(scopePath)) return [];
  try {
    const raw = fs.readFileSync(scopePath, "utf8");
    const parsed = JSON.parse(raw) as { nonGoals?: unknown };
    if (Array.isArray(parsed.nonGoals)) {
      return parsed.nonGoals.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // best-effort: malformed JSON yields empty nonGoals
  }
  return [];
}

function scopedCapabilityIds(
  capabilities: ReadonlyArray<{
    readonly capabilityId: string;
    readonly readSurfaces?: ReadonlyArray<string>;
    readonly writeSurfaces?: ReadonlyArray<string>;
  }>,
  scopePaths: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> {
  if (!scopePaths || scopePaths.length === 0) return [];
  const ids: string[] = [];
  for (const cap of capabilities) {
    const surfaces = [
      ...(cap.readSurfaces ?? []),
      ...(cap.writeSurfaces ?? []),
    ];
    if (surfaces.length === 0) continue;
    const intersects = surfaces.some((s) =>
      scopePaths.some((p) => s.includes(p) || p.includes(s)),
    );
    if (intersects) ids.push(cap.capabilityId);
  }
  return ids;
}

function minAgentUse(
  uses: ReadonlyArray<RecommendedAgentUse>,
): RecommendedAgentUse {
  if (uses.length === 0) return "lead-direct";
  let minRank = AGENT_USE_RANK["lead-direct"];
  for (const u of uses) {
    const r = AGENT_USE_RANK[u];
    if (r < minRank) minRank = r;
  }
  return RANK_TO_AGENT_USE[minRank] ?? "none";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asFDEOntologyEngineeringSession(value: unknown): FDEOntologyEngineeringSession | undefined {
  if (!isRecord(value)) return undefined;
  if (
    value["schemaVersion"] === "palantir-mini/fde-ontology-engineering-session/v1" &&
    typeof value["sessionId"] === "string" &&
    typeof value["projectRoot"] === "string"
  ) {
    return value as unknown as FDEOntologyEngineeringSession;
  }
  return undefined;
}

function sessionIdFromFDERef(ref: string): string {
  const prefix = "fde-ontology-engineering://session/";
  return ref.startsWith(prefix) ? ref.slice(prefix.length) : ref;
}

// ─── Sub-context builders ───────────────────────────────────────────────────

async function buildImpactContext(
  rids: ReadonlyArray<string>,
  projectRoot: string,
): Promise<{
  context: ImpactContextProjection;
  confidence: number;
  missingEdges: ReadonlyArray<MissingEdgeRef>;
  recommendedAgentUse: RecommendedAgentUse;
}> {
  if (rids.length === 0) {
    return {
      context: { axisRids: [], perRidImpact: [] },
      confidence: 1.0,
      missingEdges: [],
      recommendedAgentUse: "lead-direct",
    };
  }

  const perRidImpact: Array<{
    readonly rid: string;
    readonly forwardCount: number;
    readonly backwardCount: number;
    readonly graphConfidence: number;
    readonly recommendedAgentUse: RecommendedAgentUse;
  }> = [];
  const confidences: number[] = [];
  const agentUses: RecommendedAgentUse[] = [];
  const allMissing: MissingEdgeRef[] = [];

  for (const rid of rids) {
    try {
      const r = await impactQuery({ rid, projectRoot });
      perRidImpact.push({
        rid,
        forwardCount: r.forwardProp.length,
        backwardCount: r.backwardProp.length,
        graphConfidence: r.graphConfidence,
        recommendedAgentUse: r.recommendedAgentUse,
      });
      confidences.push(r.graphConfidence);
      agentUses.push(r.recommendedAgentUse);
      for (const e of r.missingEdges) {
        if (allMissing.length >= MISSING_EDGES_CAP) break;
        const ref: MissingEdgeRef = {
          fromRid:  (e as MissingEdgeRecord).fromRid,
          toRid:    (e as MissingEdgeRecord).toRid,
          edgeKind: (e as MissingEdgeRecord).edgeKind,
        };
        allMissing.push(ref);
      }
    } catch {
      // best-effort: a single RID failure does not poison the whole result
      perRidImpact.push({
        rid,
        forwardCount: 0,
        backwardCount: 0,
        graphConfidence: 0,
        recommendedAgentUse: "bounded-explorer",
      });
      confidences.push(0);
      agentUses.push("bounded-explorer");
    }
  }

  const meanConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 1.0;

  return {
    context: { axisRids: rids, perRidImpact },
    confidence: meanConfidence,
    missingEdges: allMissing.slice(0, MISSING_EDGES_CAP),
    recommendedAgentUse: minAgentUse(agentUses),
  };
}

function buildCapabilityContext(
  projectRoot: string,
  scopePaths: ReadonlyArray<string> | undefined,
): CapabilityContextProjection {
  try {
    const { registry, stats } = loadCapabilityRegistry(projectRoot);
    const all = [
      ...registry.skills,
      ...registry.mcpTools,
      ...registry.agents,
      ...registry.projectActions,
      ...registry.validationPacks,
      ...registry.knownIssues,
      ...registry.ontologyIndexEntries,
    ];
    return {
      totalCapabilities: stats.totalContracts,
      scopedCapabilityIds: scopedCapabilityIds(all, scopePaths),
      skillCount:   stats.skills,
      mcpToolCount: stats.mcpTools,
      agentCount:   stats.agents,
    };
  } catch {
    return {
      totalCapabilities: 0,
      scopedCapabilityIds: [],
      skillCount: 0,
      mcpToolCount: 0,
      agentCount: 0,
    };
  }
}

async function buildLineageContext(
  projectRoot: string,
  projectsRoot: string | undefined,
): Promise<LineageContextProjection> {
  try {
    const lineage = await pmWorkflowLineageQuery({
      projects: [projectRoot],
      projectsRoot,
      filter: { limit: 200 },
    });
    // Heuristic T3+ — events whose payload exposes a valueGrade T3 or T4.
    let t3Plus = 0;
    let lastWhen: string | null = null;
    for (const ev of lineage.events) {
      const grade = (ev.payload as { valueGrade?: unknown }).valueGrade;
      if (grade === "T3" || grade === "T4") t3Plus += 1;
      if (lastWhen === null || ev.when > lastWhen) lastWhen = ev.when;
    }
    return {
      recentT3PlusEventCount: t3Plus,
      lastEventWhen: lastWhen,
      perProjectCounts: lineage.perProjectCounts,
    };
  } catch {
    return {
      recentT3PlusEventCount: 0,
      lastEventWhen: null,
      perProjectCounts: {},
    };
  }
}

/**
 * Build evalRunsContext from Convex evalRuns table.
 * Returns undefined when STUB MODE, Cloud unreachable, or no data.
 * Never throws — graceful degrade per PR 5.4b spec.
 * Per canonical plan v2 §4 row 5.4b (sprint-115 PR 5.4b).
 */
async function buildEvalRunsContext(
  projectSlug: string,
  limit: number,
): Promise<EvalRunsContextProjection | undefined> {
  // STUB MODE check: if the singleton is a stub, skip entirely.
  if (getConvexClient().isStub) return undefined;

  try {
    const { rows } = await queryRecentEvalRuns(projectSlug, limit);
    if (rows.length === 0) {
      return {
        recentRuns: [],
        lastRunAt: null,
        perVerdictCounts: { pass: 0, revise: 0, reject: 0 },
      };
    }

    // Map AIPEvaluationRunConvexRow → AIPEvaluationRunDeclaration shape.
    // ConvexRow uses ranAt (epoch ms); Declaration uses startedAt (ISO8601).
    const recentRuns: AIPEvaluationRunDeclaration[] = rows.map((row) => ({
      runId:       row.runId as AIPEvaluationRunDeclaration["runId"],
      suiteId:     row.suiteId as AIPEvaluationRunDeclaration["suiteId"],
      target:      { kind: "mcp-tool" as const, rid: row.targetArtifactRef },
      status:      convexVerdictToStatus(row.verdict),
      startedAt:   new Date(row.ranAt).toISOString(),
      aggregateScore: row.scoreOverall,
    }));

    // lastRunAt: most recent ranAt (rows already sorted desc by queryRecentEvalRuns).
    const lastRunAt = new Date(rows[0]!.ranAt).toISOString();

    const perVerdictCounts = { pass: 0, revise: 0, reject: 0 };
    for (const row of rows) {
      if (row.verdict === "pass")   perVerdictCounts.pass   += 1;
      if (row.verdict === "revise") perVerdictCounts.revise += 1;
      if (row.verdict === "reject") perVerdictCounts.reject += 1;
    }

    return { recentRuns, lastRunAt, perVerdictCounts };
  } catch {
    // Cloud unreachable or any error → graceful omission.
    return undefined;
  }
}

function convexVerdictToStatus(
  verdict: "pass" | "revise" | "reject",
): AIPEvaluationRunDeclaration["status"] {
  if (verdict === "pass")   return "passed";
  if (verdict === "reject") return "failed";
  return "inconclusive"; // "revise" maps to inconclusive
}

/**
 * Build DTC fill readiness diagnostics from either the SIC approval cache
 * (when promptId is available) or an inline DTC contract.
 *
 * Returns undefined when:
 *   - includeDTCContext === false
 *   - No DTC available (cache miss AND no inline contract)
 * Never throws — graceful degrade per backward-compat invariant.
 */
async function buildDtcFillReadinessDiagnostics(
  projectRoot: string,
  promptId: string | undefined,
  inlineDtc: DigitalTwinChangeContract | undefined,
  includeDTCContext: boolean,
): Promise<DtcFillReadinessDiagnostics | undefined> {
  if (!includeDTCContext) return undefined;

  try {
    // Prefer SIC approval cache (fastest path; covers the common case where
    // the DTC was previously approved and cached for the current promptId).
    let dtcApprovedAt: string | undefined;
    let completedTurns: readonly number[] = [];
    let dtcForToolResolution: DigitalTwinChangeContract | undefined = inlineDtc;

    if (promptId) {
      const cached = readDTCApprovalFromCache(projectRoot, promptId, Date.now());
      if (cached) {
        dtcApprovedAt = cached.dtcApprovedAt;
        // dtcFillTurnsCompleted from cache = number of completed turns.
        // Map to 1-based step ordinals: [1, 2, ..., n].
        const n = cached.dtcFillTurnsCompleted;
        completedTurns = Array.from({ length: n }, (_, i) => i + 1);
      }
    }

    // If no inline DTC and no cache-backed DTC, nothing to diagnose.
    if (!dtcForToolResolution && dtcApprovedAt === undefined && completedTurns.length === 0) {
      return undefined;
    }

    // Compute completedTurns from inline DTC fill sequence if cache did not supply them.
    if (completedTurns.length === 0 && dtcForToolResolution) {
      // The DTC contract itself does not carry a fill sequence — steps are
      // tracked in the SIC approval cache (dtcFillTurnsCompleted). When the
      // cache is absent but an inline DTC is present, we treat all DTC_FILL_SEQUENCE
      // steps as completed (the DTC was fully filled before being passed inline).
      completedTurns = DTC_FILL_SEQUENCE.map((d) => d.step);
    }

    // Next turn question (Korean + English) from the descriptor table.
    const nextDescriptor = DTC_FILL_SEQUENCE[completedTurns.length];
    const nextTurnQuestion = nextDescriptor?.question;
    const nextTurnQuestionEn = nextDescriptor?.questionEn;

    // Tool surface resolution via W1 helper.
    const toolSurface = dtcForToolResolution
      ? resolveDTCToolSurfaceTerms(dtcForToolResolution)
      : { resolvedTools: [], unresolvedToolSurfaceTerms: [] };

    // blockingUnresolvedTerms — all unresolved tool surface terms are considered
    // potentially blocking since unresolved terms indicate readiness gaps.
    const blockingUnresolvedTerms = toolSurface.unresolvedToolSurfaceTerms;

    // fillProgressPercent: completedTurns / 7 * 100, capped [0, 100].
    const TOTAL_DTC_TURNS = 7;
    const fillProgressPercent = Math.min(
      100,
      Math.round((completedTurns.length / TOTAL_DTC_TURNS) * 100),
    );

    return {
      completedTurns,
      ...(nextTurnQuestion !== undefined ? { nextTurnQuestion } : {}),
      ...(nextTurnQuestionEn !== undefined ? { nextTurnQuestionEn } : {}),
      toolSurfaceReadiness: {
        resolved: toolSurface.resolvedTools,
        unresolved: toolSurface.unresolvedToolSurfaceTerms,
      },
      blockingUnresolvedTerms,
      ...(dtcApprovedAt !== undefined ? { dtcApprovedAt } : {}),
      fillProgressPercent,
    };
  } catch {
    // Best-effort: any error yields graceful omission.
    return undefined;
  }
}

function resolveFDEOntologyEngineeringSession(
  projectRoot: string,
  input: OntologyContextQueryInput,
): FDEOntologyEngineeringSession | undefined {
  const inline = asFDEOntologyEngineeringSession(input.fdeOntologyEngineeringSession);
  if (inline !== undefined) return inline;

  if (input.fdeOntologyEngineeringSessionRef !== undefined) {
    return readFDEOntologyEngineeringSession(
      projectRoot,
      sessionIdFromFDERef(input.fdeOntologyEngineeringSessionRef),
    ) ?? undefined;
  }

  return readCurrentFDEOntologyEngineeringSession(projectRoot) ?? undefined;
}

function compactFDEOntologyEngineeringProjection(
  session: FDEOntologyEngineeringSession,
  buildSession: FDEOntologyBuildSession,
): FDEOntologyEngineeringProjection {
  return {
    sessionId: session.sessionId,
    sessionRef: fdeOntologyEngineeringSessionRef(session.sessionId),
    phase: session.phase,
    turnCount: session.turnCount,
    readiness: buildSession.readiness,
    completedLevels: buildSession.completedLevels,
    topGapCount: buildSession.topGaps.length,
    mission: {
      ...(buildSession.missionDecision?.useCaseName !== undefined
        ? { useCaseName: buildSession.missionDecision.useCaseName }
        : {}),
      ...(buildSession.missionDecision?.operationalDecision !== undefined
        ? { operationalDecision: buildSession.missionDecision.operationalDecision }
        : {}),
    },
    objectTypes: buildSession.objectTypes.map((objectType) => objectType.objectTypeName),
    linkTypes: buildSession.linkTypes.map((linkType) => linkType.linkTypeName),
    actionTypes: buildSession.actionWriteback.map((action) => action.actionTypeName),
    functions: buildSession.functions.map((fn) => fn.functionName),
    chatbots: buildSession.chatbotStudio.map((chatbot) => chatbot.chatbotName),
    ...(buildSession.evalObservability !== undefined
      ? {
          evalObservability: {
            ...(buildSession.evalObservability.evalSuiteName !== undefined
              ? { evalSuiteName: buildSession.evalObservability.evalSuiteName }
              : {}),
            ...(buildSession.evalObservability.latestPassRate !== undefined
              ? { latestPassRate: buildSession.evalObservability.latestPassRate }
              : {}),
            auditSessionTraceEvidence: buildSession.evalObservability.auditSessionTraceEvidence ?? [],
          },
        }
      : {}),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function ontologyContextQuery(
  input: OntologyContextQueryInput,
): Promise<OntologyContextQueryResult> {
  const projectRoot      = input.project;
  const includeImpact    = input.includeImpact      !== false;
  const includeLineage   = input.includeLineage     !== false;
  const includeCaps      = input.includeCapabilities !== false;
  const includeRisks     = input.includeRisks       !== false;
  const includeEvals     = input.includeEvals       !== false;
  // opt-in: only true when explicitly requested
  const doIncludeEvalRuns = input.includeEvalRuns === true;
  // includeDTCContext defaults true (opposite of opt-in pattern; backward-compat
  // callers that omit the field receive diagnostics when DTC is available).
  const doIncludeDTCContext = input.includeDTCContext !== false;

  // Resolve RIDs from requestedAxes + scopePaths.
  const axisRids: string[] = [];
  if (input.requestedAxes) {
    for (const axis of input.requestedAxes) axisRids.push(axisToRid(axis));
  }
  if (input.scopePaths) {
    for (const p of input.scopePaths) axisRids.push(scopePathToRid(p));
  }

  // Impact sub-context (wired via impact_query).
  let impactContext: ImpactContextProjection | undefined;
  let graphConfidence  = 1.0;
  let missingEdges: ReadonlyArray<MissingEdgeRef> = [];
  let recommendedAgentUse: RecommendedAgentUse = "lead-direct";
  if (includeImpact) {
    const impact = await buildImpactContext(axisRids, projectRoot);
    impactContext       = impact.context;
    graphConfidence     = impact.confidence;
    missingEdges        = impact.missingEdges;
    recommendedAgentUse = impact.recommendedAgentUse;
  }

  // Capability sub-context (wired via CapabilityRegistry).
  const capabilityContext = includeCaps
    ? buildCapabilityContext(projectRoot, input.scopePaths)
    : undefined;

  // Lineage sub-context (wired via pm_workflow_lineage_query).
  const lineageContext = includeLineage
    ? await buildLineageContext(projectRoot, input.projectsRoot)
    : undefined;

  // Eval — typed placeholder for later PRs.
  const evalContext: EvalContextProjection | undefined = includeEvals
    ? { status: "pending-later-pr", evalRuns: [] }
    : undefined;

  // evalRunsContext — real Convex evalRuns data (opt-in, sprint-115 PR 5.4b).
  // Derive projectSlug from input or last path segment of project root.
  let evalRunsContext: EvalRunsContextProjection | undefined;
  if (doIncludeEvalRuns) {
    const projectSlug =
      input.evalRunsProjectSlug ??
      projectRoot.replace(/\\/g, "/").split("/").filter(Boolean).at(-1) ??
      "unknown";
    const limit = input.evalRunsLimit ?? 20;
    evalRunsContext = await buildEvalRunsContext(projectSlug, limit);
  }

  // DTC fill readiness diagnostics — surfaced at routing time (Sprint 97 W4).
  const dtcFillReadinessDiagnostics = await buildDtcFillReadinessDiagnostics(
    projectRoot,
    input.promptId,
    // LeadIntentGateInput shape on input is not guaranteed; check for inline DTC
    // via a safe property access (callers that pass digital twin context may use
    // the extended OntologyContextQueryInput shape from pm-semantic-intent-gate).
    (input as OntologyContextQueryInput & { digitalTwinChangeContract?: DigitalTwinChangeContract })
      .digitalTwinChangeContract,
    doIncludeDTCContext,
  );

  // Sprint-094 PR 3.2: ApplicationState composed via the real composer.
  // Sprint-095 PR 3.3: RetrievalContext composed via the real composer (this PR).
  const applicationState: ApplicationStateProjection = await composeApplicationState(
    projectRoot,
    {
      ...(input.promptId   !== undefined ? { promptId:   input.promptId   } : {}),
      ...(input.promptHash !== undefined ? { promptHash: input.promptHash } : {}),
      ...(input.scopePaths !== undefined ? { scopePaths: input.scopePaths } : {}),
    },
  );
  const retrievalContext: RetrievalContextProjection = await composeRetrievalContext(
    projectRoot,
    {
      ...(input.scopePaths    !== undefined ? { scopePaths:    input.scopePaths    } : {}),
      ...(input.requestedAxes !== undefined ? { requestedAxes: input.requestedAxes } : {}),
      axisRidCount: axisRids.length,
    },
  );
  const riskContext: RiskContextProjection | undefined = includeRisks
    ? composeOntologyRiskContext({
        applicationState,
        ...(dtcFillReadinessDiagnostics !== undefined ? { dtcFillReadinessDiagnostics } : {}),
      })
    : undefined;

  const fdeOntologyEngineeringSession = resolveFDEOntologyEngineeringSession(projectRoot, input);
  const canonicalOntologyContextForFDE = {
    applicationState,
    retrievalContext,
    ...(impactContext             !== undefined ? { impactContext             } : {}),
    ...(capabilityContext         !== undefined ? { capabilityContext         } : {}),
    ...(riskContext               !== undefined ? { riskContext               } : {}),
    ...(lineageContext            !== undefined ? { lineageContext            } : {}),
    ...(evalContext               !== undefined ? { evalContext               } : {}),
    ...(evalRunsContext           !== undefined ? { evalRunsContext           } : {}),
    ...(dtcFillReadinessDiagnostics !== undefined ? { dtcFillReadinessDiagnostics } : {}),
    ...(fdeOntologyEngineeringSession !== undefined
      ? { fdeOntologyEngineeringSession }
      : {}),
  };
  const fdeOntologyEngineeringProjection =
    fdeOntologyEngineeringSession !== undefined
      ? compactFDEOntologyEngineeringProjection(
          fdeOntologyEngineeringSession,
          composeFDEOntologyBuildSession({
            project: projectRoot,
            ontologyContext: canonicalOntologyContextForFDE,
            fdeOntologyEngineeringSession,
            nowIso: applicationState.composedAt,
          }),
        )
      : undefined;

  return {
    applicationState,
    retrievalContext,
    ...(impactContext             !== undefined ? { impactContext             } : {}),
    ...(capabilityContext         !== undefined ? { capabilityContext         } : {}),
    ...(riskContext               !== undefined ? { riskContext               } : {}),
    ...(lineageContext            !== undefined ? { lineageContext            } : {}),
    ...(evalContext               !== undefined ? { evalContext               } : {}),
    ...(evalRunsContext           !== undefined ? { evalRunsContext           } : {}),
    ...(dtcFillReadinessDiagnostics !== undefined ? { dtcFillReadinessDiagnostics } : {}),
    ...(fdeOntologyEngineeringProjection !== undefined
      ? { fdeOntologyEngineeringProjection }
      : {}),
    graphConfidence,
    missingEdges,
    recommendedAgentUse,
    requiredContracts: deriveRequiredContracts(input.scopePaths),
    nonGoals: readNonGoals(projectRoot),
  };
}

export default async function handler(
  rawArgs: unknown,
): Promise<OntologyContextQueryResult> {
  assertInput(rawArgs);
  return ontologyContextQuery(rawArgs);
}
