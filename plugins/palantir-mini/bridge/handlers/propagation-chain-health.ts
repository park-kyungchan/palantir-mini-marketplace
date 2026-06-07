// palantir-mini v4.0.0 — MCP tool handler: propagation_chain_health
// Domain: LEARN (chain health score 0-1 across all 6 propagation steps)
//
// Runs forward + backward audits, aggregates per-step scores, returns
// PropagationHealthPayload. Used by W7 gate 8.
//
// v4.0.1 (sprint-060 W2.3 / R2-F7) — weight-calc fix:
//   Excluded (unwalked) steps no longer contribute a 0.5 sentinel to totalWeight.
//   Previously: skipped steps dragged the aggregate score toward 0.5, causing
//   partial-chain audits to report "drift-suspected" even on an all-pass chain.
//   Fix: `computeOverallScore` skips steps where `perStepHealth[step] === undefined`.
//
// B.W4 (sprint-061) — usage-activation axis:
//   Query events.jsonl over last 30d for invocations per layer. Activation score
//   per layer: min(invocationCount30d / expectedBaseline, 1.0). Baselines per
//   operating model §6.4 suggestion (research=10, schemas=5, shared-core=20,
//   project-ontology=50, contracts=100, runtime=200).
//   Return shape extended: structuralScore, usageActivationScore, perLayerActivation,
//   overallScore = weighted(structural*0.5 + usageActivation*0.5).
//
// Authority chain:
//   rules/01-ontology-first-core.md §Propagation
//   schemas/ontology/primitives/propagation-health.ts (PropagationHealthPayload SSoT)
//   plans/distributed-wishing-manatee.md §T4.4
//   plans/2026-05-07-palantir-mini-architecture-review.md §5.C.7 (R2-F7)
//   plans/2026-05-09-palantir-mini-ontology-harness-operating-model.md §6.4 (B.W4)

import * as fs from "fs";
import { emit, projectRoot as resolveProjectRoot, eventsPathFor } from "../../scripts/log";
import {
  PROPAGATION_STEPS,
  type PropagationHealthPayload,
  type PropagationStep,
} from "#schemas/ontology/primitives/propagation-health";
import { readEvents } from "../../lib/event-log/read";
import propagationAuditForward from "./propagation-audit-forward";
import propagationAuditBackward from "./propagation-audit-backward";

export interface PropagationChainHealthInput {
  project?: string;
  mode?: "advisory" | "strict";
}

// ── B.W4: usage-activation axis ───────────────────────────────────────────

/**
 * Per-layer expected invocation baselines over 30 days.
 * Tuned per operating model §6.4 — lower-authority layers have higher
 * expected baseline because they are invoked more frequently at runtime.
 *
 * research=10: infrequent (analyst-level reads, not every turn)
 * schemas=5: very infrequent (schema queries are rare; ontology is stable)
 * shared-core=20: moderate (shared-core imports show up in many edits)
 * project-ontology=50: frequent (every project-level semantic query)
 * contracts=100: high (contract checks on every edit path)
 * runtime=200: very high (runtime events fired on every operation)
 */
const LAYER_BASELINES: Record<PropagationStep, number> = {
  "research":         10,
  "schema":           5,
  "shared-core":      20,
  "project-ontology": 50,
  "contracts":        100,
  "runtime":          200,
};

/**
 * Map a propagation step to the set of event type prefixes that indicate
 * an invocation at that layer. Heuristic: events emitted by handlers or
 * hooks that operate primarily at that layer are counted.
 */
const LAYER_EVENT_PREFIXES: Record<PropagationStep, string[]> = {
  "research":         ["research_citation_validated", "pm_research_citation_validate"],
  "schema":           ["schema_", "codegen_", "pm_codegen"],
  "shared-core":      ["shared_core_", "ontology_schema_get", "get_ontology"],
  "project-ontology": ["impact_query", "pre_edit_impact", "ontology_", "semantic_change_plan", "doc_drift"],
  "contracts":        ["sprint_contract", "commit_edits"],
  "runtime":          ["edit_committed", "edit_proposed", "validation_phase_completed", "session_"],
};

export interface PerLayerActivation {
  readonly research:          number;
  readonly schema:            number;
  readonly "shared-core":     number;
  readonly "project-ontology": number;
  readonly contracts:         number;
  readonly runtime:           number;
}

/** Extended payload returned by this handler (B.W4 superset of PropagationHealthPayload). */
export interface PropagationChainHealthResult extends PropagationHealthPayload {
  /** Structural-only score (0..1) — same as the base score pre-B.W4. */
  readonly structuralScore: number;
  /** Usage-activation score (0..1) — ratio of observed/expected 30d invocations. */
  readonly usageActivationScore: number;
  /** Per-layer activation ratio (0..1). */
  readonly perLayerActivation: PerLayerActivation;
  /**
   * Combined score: weighted(structural*0.5 + usageActivation*0.5).
   * This is also propagated to the inherited `score` field for back-compat.
   */
  readonly overallScore: number;
}

/**
 * Compute per-layer activation scores from events.jsonl over the last 30d.
 * Returns PerLayerActivation where each value is min(count30d / baseline, 1.0).
 */
function computeUsageActivation(project: string): PerLayerActivation {
  const eventsPath = eventsPathFor(project);
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Count invocations per layer
  const counts: Record<PropagationStep, number> = {
    "research":         0,
    "schema":           0,
    "shared-core":      0,
    "project-ontology": 0,
    "contracts":        0,
    "runtime":          0,
  };

  try {
    const events = readEvents(eventsPath);
    for (const ev of events) {
      if (ev.when < cutoff) continue; // outside 30d window
      const evType = ev.type as string;
      for (const step of PROPAGATION_STEPS) {
        const prefixes = LAYER_EVENT_PREFIXES[step];
        if (prefixes.some((p) => evType.startsWith(p))) {
          counts[step]++;
          break; // count once per event (assign to first matching layer)
        }
      }
    }
  } catch {
    // events.jsonl may not exist or be unreadable — return zero activation
  }

  const activation: Record<string, number> = {};
  for (const step of PROPAGATION_STEPS) {
    activation[step] = Math.min(counts[step] / LAYER_BASELINES[step], 1.0);
  }

  return activation as unknown as PerLayerActivation;
}

// ── Recent violation event finder ─────────────────────────────────────────

interface MinimalRow {
  eventId?: string;
  type?: string;
  payload?: unknown;
  sequence?: number;
}

function findRecentViolationEvents(project: string, limit = 5): string[] {
  const eventsPath = eventsPathFor(project);
  if (!fs.existsSync(eventsPath)) return [];

  const rows: MinimalRow[] = [];
  for (const line of fs.readFileSync(eventsPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      rows.push(JSON.parse(t) as MinimalRow);
    } catch {
      // skip
    }
  }

  const violationTypes = [
    "drift_detected",
    "doc_drift_detected",
    "validation_phase_completed",
    "research_citation_validated",
  ];

  const violationIds: string[] = [];
  // Walk in reverse (most recent first)
  for (let i = rows.length - 1; i >= 0 && violationIds.length < limit; i--) {
    const row = rows[i]!;
    if (!row.eventId) continue;
    const t = row.type ?? "";
    const isViolationType = violationTypes.some((vt) => t.startsWith(vt));
    if (!isViolationType) continue;
    const p = row.payload as Record<string, unknown> | undefined;
    if (p) {
      if (p["verdict"] === "fail" || p["verdict"] === "failed") {
        violationIds.push(row.eventId);
        continue;
      }
      if (p["errorClass"] && typeof p["errorClass"] === "string") {
        violationIds.push(row.eventId);
        continue;
      }
      if (p["driftDetected"] === true) {
        violationIds.push(row.eventId);
        continue;
      }
    }
  }
  return violationIds;
}

// ── Score computation ─────────────────────────────────────────────────────

/**
 * Compute per-step health scores (0..1):
 *  - forward audit: 1.0 if step passed, 0.0 if failed, 0.5 if not walked
 *  - backward audit violation penalty: -0.3 per violation event tracing to that step
 * Final per-step score = clamp(forwardScore + backwardPenalty, 0, 1)
 */
function computePerStepHealth(
  forwardResult: Awaited<ReturnType<typeof propagationAuditForward>>,
  backwardViolationSteps: Array<PropagationStep | null>,
): { perStepHealth: Partial<Record<PropagationStep, number>>; driftSignals: string[] } {
  const perStepHealth: Partial<Record<PropagationStep, number>> = {};
  const driftSignals: string[] = [];

  for (const step of PROPAGATION_STEPS) {
    const stepResult = forwardResult.perStepResult[step];
    let score: number;
    if (!stepResult) {
      // step not walked (startStep skipped it) — treat as neutral
      score = 0.5;
    } else {
      score = stepResult.pass ? 1.0 : 0.0;
      if (!stepResult.pass) {
        driftSignals.push(`${step}: ${stepResult.validator} failed (evidence: ${stepResult.evidence ?? "none"})`);
      }
    }

    // Apply backward violation penalty
    const violationCount = backwardViolationSteps.filter((s) => s === step).length;
    if (violationCount > 0) {
      score = Math.max(0, score - 0.3 * violationCount);
      driftSignals.push(`${step}: ${violationCount} backward violation(s) traced to this step`);
    }

    perStepHealth[step] = score;
  }

  return { perStepHealth, driftSignals };
}

function computeOverallScore(perStepHealth: Partial<Record<PropagationStep, number>>): number {
  // Weighted average: research/schema are higher-authority (weight 2x), others 1x.
  //
  // sprint-060 W2.3 (R2-F7) FIX: only include walked steps in totalWeight.
  // Previously unwalked steps defaulted to 0.5 and were included, which
  // incorrectly dragged the score down for partial-chain audits (e.g. startStep="schema"
  // skipping research still counted research weight at 0.5). Now we skip undefined entries
  // so totalWeight reflects only the steps actually evaluated.
  const weights: Record<PropagationStep, number> = {
    "research":         2,
    "schema":           2,
    "shared-core":      1.5,
    "project-ontology": 1.5,
    "contracts":        1,
    "runtime":          1,
  };
  let totalWeight = 0;
  let weightedSum = 0;
  for (const step of PROPAGATION_STEPS) {
    const score = perStepHealth[step];
    // Skip steps not included in this audit pass (undefined = not walked).
    if (score === undefined) continue;
    const w = weights[step];
    weightedSum += score * w;
    totalWeight += w;
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

function verdictFromScore(score: number, mode: "advisory" | "strict"): PropagationHealthPayload["verdict"] {
  // strict mode: lower thresholds
  if (mode === "strict") {
    if (score >= 0.95) return "healthy";
    if (score >= 0.7) return "drift-suspected";
    return "broken";
  }
  // advisory mode
  if (score >= 0.9) return "healthy";
  if (score >= 0.5) return "drift-suspected";
  return "broken";
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function propagationChainHealth(
  rawArgs: unknown,
): Promise<PropagationChainHealthResult> {
  const args = (rawArgs ?? {}) as PropagationChainHealthInput;
  const project = args.project ?? resolveProjectRoot();
  const mode = args.mode ?? "advisory";

  // Compute usage before this health check emits its own audit events. The
  // usage axis measures pre-existing workflow activation, not the observer.
  const perLayerActivation = computeUsageActivation(project);
  const usageActivationScore =
    PROPAGATION_STEPS.reduce((sum, step) => sum + perLayerActivation[step], 0) / PROPAGATION_STEPS.length;

  // 1. Forward audit. Treat audit runtime failures as a broken chain payload so
  // advisory callers still receive a deterministic readout.
  let forwardResult: Awaited<ReturnType<typeof propagationAuditForward>>;
  try {
    forwardResult = await propagationAuditForward({ project });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    forwardResult = {
      auditId: crypto.randomUUID(),
      chainSteps: [...PROPAGATION_STEPS],
      firstFailureStep: "project-ontology",
      perStepResult: {
        "project-ontology": {
          pass: false,
          validator: "propagation-audit-forward-runtime",
          evidence: message,
        },
      },
      verdict: "fail",
      auditedAt: new Date().toISOString(),
    };
  }

  // 2. Backward audit on recent violation events (best-effort)
  const violationEventIds = findRecentViolationEvents(project);
  const backwardViolationSteps: Array<PropagationStep | null> = [];

  for (const seedEventId of violationEventIds) {
    try {
      const backwardResult = await propagationAuditBackward({ project, seedEventId, maxDepth: 5 });
      backwardViolationSteps.push(backwardResult.firstViolationStep);
    } catch {
      // backward audit failure is non-fatal — skip
    }
  }

  // 3. Compute per-step health (structural score)
  const { perStepHealth, driftSignals } = computePerStepHealth(forwardResult, backwardViolationSteps);
  const structuralScore = computeOverallScore(perStepHealth);

  // 5. Combine: overallScore = structural*0.5 + usageActivation*0.5
  const overallScore = structuralScore * 0.5 + usageActivationScore * 0.5;

  const verdict = verdictFromScore(overallScore, mode);
  const measuredAt = new Date().toISOString();

  const payload: PropagationChainHealthResult = {
    // PropagationHealthPayload base fields
    score:          overallScore, // back-compat: `score` = combined overallScore
    perStepHealth,
    driftSignals,
    verdict,
    measuredAt,
    // B.W4 extension fields
    structuralScore,
    usageActivationScore,
    perLayerActivation,
    overallScore,
  };

  // 6. Emit 5-dim event
  // Map PropagationHealthPayload verdict → validation_phase_completed envelope verdict:
  // "healthy"        → passed  (errorClass: propagation_chain_healthy)
  // "drift-suspected"→ passed  (errorClass: propagation_chain_drift_suspected) — advisory, non-blocking
  // "broken"         → failed  (errorClass: propagation_chain_broken)
  const eventPassed = verdict !== "broken";
  const eventErrorClass =
    verdict === "healthy"         ? "propagation_chain_healthy" :
    verdict === "drift-suspected" ? "propagation_chain_drift_suspected" :
                                    "propagation_chain_broken";

  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "post_write",
        passed: eventPassed,
        errorClass: eventErrorClass,
        // B.W4: include activation scores in event payload for audit visibility
        // (extra fields beyond the strict union — cast via 'as any' per W2.10 precedent)
        structuralScore,
        usageActivationScore,
        overallScore,
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      toolName: "propagation_chain_health",
      cwd: project,
      reasoning: `Chain health: overallScore=${overallScore.toFixed(3)} structural=${structuralScore.toFixed(3)} usageActivation=${usageActivationScore.toFixed(3)} verdict=${verdict} mode=${mode} driftSignals=${driftSignals.length}. B.W4 usage-activation axis: research=${perLayerActivation.research.toFixed(2)} runtime=${perLayerActivation.runtime.toFixed(2)}.`,
    });
  } catch {
    // Best-effort lineage: the health readout remains authoritative even when
    // the target project path cannot accept an audit append.
  }

  // 7. Strict mode: throw on broken
  if (mode === "strict" && verdict === "broken") {
    throw new Error(
      `propagation_chain_health: chain BROKEN (score=${overallScore.toFixed(3)}) — ${driftSignals.slice(0, 3).join("; ")}`,
    );
  }

  return payload;
}
