// palantir-mini v4.15.0 — pm-intent-to-ontology skill (sprint-063 W2.C simplification)
//
// 1-call wrapper for the 6-step Intent-to-Ontology Protocol.
// (Simplified from 8-step in sprint-062; semantic_change_plan removed per sprint-063 C13 gap)
//
// Accepted args: { intent, scopePaths, project }
//
// Steps:
//   Step 1 — get_ontology
//   Step 2 — impact_query (depth=2, top scope RID)
//   Step 3 — pm_workflow_lineage_query (last 7d, limit 30, eventTypes: edit_committed)
//   Step 4 — pm_event_query_by_grade T3+
//   Step 5 — propagation_audit_forward
//   Step 6 — negotiate_sprint_contract (Lead action, no MCP call here)
//
// MCP invocations go through the spawn-child subprocess pattern used by
// other skill implementations. Since this runs in a bash sub-process under
// `bun run`, it invokes MCP tools via the skills' bash-level invocation
// surface (Lead calls each MCP tool in sequence) — the TypeScript file here
// documents the protocol and provides the combinedResult shape for Lead to use.
//
// Design note: Claude Code skills are prose + TypeScript that Lead reads and
// executes step-by-step. They are NOT runtime libraries called by hooks.
// This TS file defines the step interface + result shapes for type safety +
// is consumed by tests (which mock each step).
//
// sprint-063 W2.C: dropped semantic_change_plan branch (handler removed per C13 gap).
// Former steps 1 (identify-intent, Lead-internal) + 3 (impact_query) + 4 (semantic_change_plan)
// collapsed → new step 2 (impact_query only). Step numbering renumbered 1-6.
//
// Authority: sprint-063 W2.C; rule 12 v3.12.0 §Intent-to-Ontology Protocol;
//            rule 01 §ForwardProp Audit; rule 26 §Axis E.

import type { AgenticMemoryLayer } from "#schemas/ontology/primitives/agentic-memory-layer";
import { resolveHostRuntimeIdentity } from "../../lib/runtime/identity";

// ─── Args ────────────────────────────────────────────────────────────────────

export interface IntentToOntologyArgs {
  intent:     string;
  scopePaths: string[];
  project?:   string;
}

// ─── Per-step result shapes ───────────────────────────────────────────────────

export interface StepResult<T = unknown> {
  ok:           boolean;
  data?:        T;
  error?:       string;
  elapsedMs:    number;
}

export interface OntologySnapshot {
  entityTypes?:   unknown[];
  relationTypes?: unknown[];
  version?:       string;
  [key: string]:  unknown;
}

export interface LineageSnapshot {
  events?:         unknown[];
  totalCount?:     number;
  [key: string]:   unknown;
}

export interface DecisionSnapshot {
  events?:         unknown[];
  gradeFilter?:    string;
  [key: string]:   unknown;
}

export interface PropagationAudit {
  healthy?:        boolean;
  steps?:          unknown[];
  [key: string]:   unknown;
}

// ─── Impact query result shape ────────────────────────────────────────────────

export interface ImpactSnapshot {
  affectedRids?:  unknown[];
  edgeTypes?:     unknown[];
  impactScore?:   number;
  [key: string]:  unknown;
}

// ─── Combined result ──────────────────────────────────────────────────────────

export interface IntentToOntologyResult {
  intent:               string;
  scopePaths:           string[];
  project:              string;
  ontology?:            OntologySnapshot;
  impact?:              ImpactSnapshot;
  lineage?:             LineageSnapshot;
  decisions?:           DecisionSnapshot;
  propagation?:         PropagationAudit;
  errors:               Record<string, string>;
  totalElapsedMs:       number;
  memoryLayers:         AgenticMemoryLayer[];
}

// sprint-063 W2.C: semantic_change_plan permanently removed from this skill.
// impact_query is now step 2 (active). No skipped steps in the 6-step protocol.

// ─── Invoke MCP step helper ───────────────────────────────────────────────────

/**
 * Invoke a single MCP step with error isolation.
 * In a real skill execution, Lead calls each MCP tool and captures the result.
 * This function models the contract for testing purposes.
 */
async function invokeStep<T>(
  _name: string,
  fn: () => Promise<T>,
): Promise<StepResult<T>> {
  const start = Date.now();
  try {
    const data = await fn();
    return { ok: true, data, elapsedMs: Date.now() - start };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, error, elapsedMs: Date.now() - start };
  }
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function sevenDaysAgo(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

// ─── Main skill function ──────────────────────────────────────────────────────

/**
 * Execute the 6-step Intent-to-Ontology Protocol (sprint-063 W2.C).
 *
 * In production, Lead reads SKILL.md and executes each active step using the MCP
 * tool surface. This TypeScript function provides the type-safe contract and is
 * exercised directly by tests (which inject mock MCP callables).
 *
 * Steps:
 *   1. get_ontology         — current snapshot
 *   2. impact_query         — blast radius (depth=2, top scope RID)
 *   3. pm_workflow_lineage_query — last 7d edits
 *   4. pm_event_query_by_grade T3+ — BackProp circuit inputs
 *   5. propagation_audit_forward — ForwardProp chain integrity
 *   6. negotiate_sprint_contract — Lead action; not called here
 *
 * @param args - Intent, scope paths, and optional project root.
 * @param mcpClient - Injectable MCP callable map (for tests and Claude/Codex/Gemini runtime adapters).
 */
export async function runIntentToOntology(
  args: IntentToOntologyArgs,
  mcpClient?: {
    getOntology?:               (params: { project: string }) => Promise<OntologySnapshot>;
    impactQuery?:               (params: { rid: string; depth: number }) => Promise<ImpactSnapshot>;
    pmWorkflowLineageQuery?:    (params: unknown) => Promise<LineageSnapshot>;
    pmEventQueryByGrade?:       (params: { project: string; gradeFilter: string }) => Promise<DecisionSnapshot>;
    propagationAuditForward?:   (params: { project: string }) => Promise<PropagationAudit>;
  },
): Promise<IntentToOntologyResult> {
  const wallStart = Date.now();

  const project      = args.project ?? process.cwd();
  const intent       = String(args.intent ?? "").trim();
  const scopePaths   = Array.isArray(args.scopePaths) ? args.scopePaths : [];
  const errors: Record<string, string> = {};

  // ── Step 1: get_ontology ──────────────────────────────────────────────────
  const ontologyResult = await invokeStep<OntologySnapshot>(
    "get_ontology",
    async () => {
      if (mcpClient?.getOntology) {
        return mcpClient.getOntology({ project });
      }
      // Fallback: return an empty snapshot when MCP is not wired in this context.
      // Lead is expected to call the MCP tool directly per SKILL.md step-by-step.
      return {};
    },
  );
  if (!ontologyResult.ok && ontologyResult.error) {
    errors["get_ontology"] = ontologyResult.error;
  }

  // ── Step 2: impact_query (blast radius, depth=2) ──────────────────────────
  // sprint-063 W2.C: impact_query is now an active step (was skipped in sprint-062).
  // semantic_change_plan permanently removed (handler removed per C13 gap).
  const impactResult = await invokeStep<ImpactSnapshot>(
    "impact_query",
    async () => {
      const topRid = scopePaths[0] ?? project;
      if (mcpClient?.impactQuery) {
        return mcpClient.impactQuery({ rid: topRid, depth: 2 });
      }
      return {};
    },
  );
  if (!impactResult.ok && impactResult.error) {
    errors["impact_query"] = impactResult.error;
  }

  // ── Step 3: pm_workflow_lineage_query ─────────────────────────────────────
  const lineageResult = await invokeStep<LineageSnapshot>(
    "pm_workflow_lineage_query",
    async () => {
      if (mcpClient?.pmWorkflowLineageQuery) {
        return mcpClient.pmWorkflowLineageQuery({
          projects: [project],
          filter: {
            whenRange: { from: sevenDaysAgo(), to: new Date().toISOString() },
            byWhom: { identity: resolveHostRuntimeIdentity() },
            eventTypes: ["edit_committed"],
            limit: 30,
          },
        });
      }
      return {};
    },
  );
  if (!lineageResult.ok && lineageResult.error) {
    errors["pm_workflow_lineage_query"] = lineageResult.error;
  }

  // ── Step 4: pm_event_query_by_grade T3+ ──────────────────────────────────
  const decisionsResult = await invokeStep<DecisionSnapshot>(
    "pm_event_query_by_grade",
    async () => {
      if (mcpClient?.pmEventQueryByGrade) {
        return mcpClient.pmEventQueryByGrade({ project, gradeFilter: "T3+" });
      }
      return { gradeFilter: "T3+" };
    },
  );
  if (!decisionsResult.ok && decisionsResult.error) {
    errors["pm_event_query_by_grade"] = decisionsResult.error;
  }

  // ── Step 5: propagation_audit_forward ────────────────────────────────────
  const propagationResult = await invokeStep<PropagationAudit>(
    "propagation_audit_forward",
    async () => {
      if (mcpClient?.propagationAuditForward) {
        return mcpClient.propagationAuditForward({ project });
      }
      return {};
    },
  );
  if (!propagationResult.ok && propagationResult.error) {
    errors["propagation_audit_forward"] = propagationResult.error;
  }

  // Step 6 (negotiate_sprint_contract) is a Lead action — not invoked here.

  // sprint-063 W2.C: totalElapsedMs computation removed — was unused; per-step elapsedMs sufficient.

  return {
    intent,
    scopePaths,
    project,
    ontology:    ontologyResult.ok ? ontologyResult.data : undefined,
    impact:      impactResult.ok   ? impactResult.data   : undefined,
    lineage:     lineageResult.ok  ? lineageResult.data  : undefined,
    decisions:   decisionsResult.ok ? decisionsResult.data : undefined,
    propagation: propagationResult.ok ? propagationResult.data : undefined,
    errors,
    totalElapsedMs: Date.now() - wallStart,
    memoryLayers:   ["procedural", "semantic"] satisfies AgenticMemoryLayer[],
  };
}

// ─── CLI entry (when invoked as a script) ─────────────────────────────────────

// When this file is run directly (bun run pm-intent-to-ontology.ts <intent> <paths...>),
// it prints the protocol summary and exits. Lead's bash invocation uses this output.
if (import.meta.main) {
  const [, , intentArg, ...scopeArgs] = process.argv;
  if (!intentArg) {
    process.stderr.write(
      "Usage: bun run pm-intent-to-ontology.ts <intent> [scopePath1] [scopePath2] ...\n",
    );
    process.exit(1);
  }

  const result = await runIntentToOntology({
    intent:     intentArg ?? "",
    scopePaths: scopeArgs ?? [],
    project:    process.env.PALANTIR_MINI_PROJECT ?? process.cwd(),
  });

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}
