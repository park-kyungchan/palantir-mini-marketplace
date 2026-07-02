/**
 * palantir-mini — lib/recap/classification-accuracy.ts (sprint-062 W4-α; updated sprint-063 W2.A)
 *
 * Pure helpers for computing retrospective classification accuracy of
 * impact_query RID predictions vs edit_committed events.
 *
 * Algorithm (post-hoc replay, read-only):
 *   1. Extract impact_query output events:
 *      tool_invocation_completed events where payload.toolName includes
 *      "impact_query", carrying payload.outputs[].affectedRids[].{rid, kind}.
 *      Also reads semantic_change_plan_emitted events for backward-compat
 *      (pre-W2.A history).
 *   2. Extract edit_committed events carrying payload.rid (or payload.targetRid).
 *   3. Per plan prediction (rid, kind): within ±windowMs, did an edit_committed
 *      event fire for the same rid?
 *   4. Per ImpactEdgeKind: accuracy = matches / plans.
 *   5. Aggregate = volume-weighted mean across kinds.
 *
 * Does NOT call impact_query or semantic_change_plan directly.
 * Pure function — no file I/O, no MCP calls, no side effects.
 *
 * Authority: sprint-062 W4-α briefing §1 NEW lib
 *            sprint-063 W2.A (semantic_change_plan removed; rewired to impact_query)
 *            rule 10 §Append-only (reads events.jsonl only via callers)
 *            schemas/ontology/primitives/impact-edge.ts ImpactEdgeKind canonical list
 */

// @domain: LOGIC

import type { ImpactEdgeKind } from "#schemas/ontology/primitives/impact-edge";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface KindStats {
  /** Number of plan predictions for this ImpactEdgeKind */
  plans: number;
  /** Number of edit_committed events seen within the window (for any RID in predictions) */
  commits: number;
  /** Plan predictions that were confirmed by an edit_committed within the window */
  matches: number;
  /** matches / plans, or 0 when plans === 0 */
  accuracy: number;
}

export interface CalibrationScore {
  /** Per-ImpactEdgeKind breakdown */
  perKind: Record<ImpactEdgeKind | string, KindStats>;
  /** Volume-weighted mean accuracy across all kinds that had ≥1 plan */
  aggregate: number;
  /** Total plan predictions across all kinds */
  totalPlans: number;
  /** Total edit_committed events found within window across all predicted RIDs */
  totalCommits: number;
  /** Total matched predictions */
  totalMatches: number;
  /** Window in days (windowMs / 86400000) */
  windowDays: number;
}

/**
 * pm_recap-facing §Classification Accuracy shape (sprint-062 W4-α).
 * Reshapes CalibrationScore for the recap result: trust/retrain verdicts
 * (threshold-gated booleans) and a flattened perKindAccuracy map replace the
 * raw perKind KindStats breakdown, plus the rendered markdown `section`.
 * Consumed by bridge/handlers/pm-recap.ts via PmRecapResult
 * (lib/recap/types.ts) — this type lives here (the module that computes the
 * underlying CalibrationScore) rather than in lib/recap/types.ts itself.
 */
export interface ClassificationAccuracySummary {
  aggregate: number;
  totalPlans: number;
  totalMatches: number;
  windowDays: number;
  trust: boolean;
  retrain: boolean;
  perKindAccuracy: Record<string, number>;
  section: string;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface PlanPrediction {
  /** RID predicted to be affected */
  rid: string;
  /** ImpactEdgeKind of the predicted relationship */
  kind: string;
  /** ISO timestamp the plan was emitted */
  when: number;
}

interface CommitEvent {
  /** RID that was committed */
  rid: string;
  /** ISO timestamp of the edit_committed event */
  when: number;
}

// ─── Extraction helpers ───────────────────────────────────────────────────────

/**
 * Extract plan predictions from tool_invocation_completed events that wrap
 * impact_query outputs (primary) or historic semantic_change_plan_emitted events
 * (backward-compat for pre-W2.A history).
 *
 * Supported payload shapes:
 *   - payload.toolName includes "impact_query"
 *     AND payload.outputs[].affectedRids[].{rid, kind}
 *   - payload.toolName includes "impact_query"
 *     AND payload.result.affectedRids[].{rid, kind}
 *   - payload.toolName includes "impact_query"
 *     AND payload.affectedRids[] (string array — kind defaults to "semantic")
 *   - legacy: payload.toolName includes "semantic_change_plan" (pre-W2.A events)
 */
function extractPlanPredictions(events: unknown[]): PlanPrediction[] {
  const predictions: PlanPrediction[] = [];

  for (const raw of events) {
    const ev = raw as Record<string, unknown>;
    if (ev["type"] !== "tool_invocation_completed" &&
        ev["type"] !== "validation_phase_completed") {
      // Also try phase_completed with phaseTag containing impact_query or semantic_change_plan (legacy)
      if (ev["type"] === "phase_completed") {
        const payload = ev["payload"] as Record<string, unknown> | undefined;
        if (!payload) continue;
        const phaseTag = String(payload["phaseTag"] ?? "");
        if (!phaseTag.includes("impact_query") && !phaseTag.includes("semantic_change_plan")) continue;
        const ts = parseTs(String(ev["when"] ?? ""));
        if (ts === null) continue;
        extractRidKindPairs(payload, ts, predictions);
        continue;
      }
      continue;
    }

    const payload = ev["payload"] as Record<string, unknown> | undefined;
    if (!payload) continue;

    const toolName = String(payload["toolName"] ?? "");
    // Primary: impact_query events (sprint-063+); backward-compat: semantic_change_plan events (pre-W2.A)
    if (!toolName.includes("impact_query") && !toolName.includes("semantic_change_plan")) continue;

    const ts = parseTs(String(ev["when"] ?? ""));
    if (ts === null) continue;

    extractRidKindPairs(payload, ts, predictions);

    // Also check payload.result (nested)
    const result = payload["result"] as Record<string, unknown> | undefined;
    if (result) {
      extractRidKindPairs(result, ts, predictions);
    }

    // payload.outputs[] array
    const outputs = payload["outputs"];
    if (Array.isArray(outputs)) {
      for (const out of outputs) {
        if (out && typeof out === "object") {
          extractRidKindPairs(out as Record<string, unknown>, ts, predictions);
        }
      }
    }
  }

  return predictions;
}

/**
 * Extract (rid, kind) pairs from a payload object into the predictions array.
 * Tries multiple shapes: affectedSemanticRids, affectedRids, rids.
 */
function extractRidKindPairs(
  payload: Record<string, unknown>,
  ts: number,
  out: PlanPrediction[],
): void {
  // Shape 1: affectedSemanticRids[].{rid, kind}
  const semanticRids = payload["affectedSemanticRids"];
  if (Array.isArray(semanticRids)) {
    for (const item of semanticRids) {
      if (item && typeof item === "object") {
        const r = item as Record<string, unknown>;
        const rid = String(r["rid"] ?? "");
        const kind = String(r["kind"] ?? "semantic");
        if (rid.length > 0) {
          out.push({ rid, kind, when: ts });
        }
      }
    }
  }

  // Shape 2: affectedRids[] (string array) — kind defaults to "semantic"
  const affectedRids = payload["affectedRids"];
  if (Array.isArray(affectedRids)) {
    for (const item of affectedRids) {
      if (typeof item === "string" && item.length > 0) {
        out.push({ rid: item, kind: "semantic", when: ts });
      }
    }
  }

  // Shape 3: rids[] (string array) — kind defaults to "semantic"
  const rids = payload["rids"];
  if (Array.isArray(rids)) {
    for (const item of rids) {
      if (typeof item === "string" && item.length > 0) {
        out.push({ rid: item, kind: "semantic", when: ts });
      }
    }
  }
}

/**
 * Extract committed RIDs from edit_committed events.
 *
 * Supported payload shapes:
 *   - payload.rid (string)
 *   - payload.targetRid (string)
 *   - payload.rids[] (string array)
 *   - payload.committedRids[] (string array)
 */
function extractCommitEvents(events: unknown[]): CommitEvent[] {
  const commits: CommitEvent[] = [];

  for (const raw of events) {
    const ev = raw as Record<string, unknown>;
    if (ev["type"] !== "edit_committed") continue;

    const payload = ev["payload"] as Record<string, unknown> | undefined;
    if (!payload) continue;

    const ts = parseTs(String(ev["when"] ?? ""));
    if (ts === null) continue;

    // Shape 1: rid (string)
    const rid = payload["rid"];
    if (typeof rid === "string" && rid.length > 0) {
      commits.push({ rid, when: ts });
    }

    // Shape 2: targetRid (string)
    const targetRid = payload["targetRid"];
    if (typeof targetRid === "string" && targetRid.length > 0) {
      commits.push({ rid: targetRid, when: ts });
    }

    // Shape 3: rids[] or committedRids[]
    for (const key of ["rids", "committedRids"]) {
      const arr = payload[key];
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (typeof item === "string" && item.length > 0) {
            commits.push({ rid: item, when: ts });
          }
        }
      }
    }
  }

  return commits;
}

function parseTs(when: string): number | null {
  if (!when) return null;
  const ms = new Date(when).getTime();
  return isNaN(ms) ? null : ms;
}

// ─── Core computation ─────────────────────────────────────────────────────────

/**
 * Compute classification accuracy by replaying past semantic_change_plan
 * outputs vs edit_committed events within a time window.
 *
 * @param events - Raw event rows from events.jsonl (unknown[] for flexibility).
 * @param windowMs - Matching window in ms (default 24h = 86_400_000 ms).
 *                   A prediction is "confirmed" when an edit_committed event
 *                   for the same RID fires within ±windowMs of the plan.
 * @returns CalibrationScore with per-kind stats and aggregate.
 */
export function computeClassificationAccuracy(
  events: unknown[],
  windowMs: number = 24 * 3_600_000,
): CalibrationScore {
  const predictions = extractPlanPredictions(events);
  const commits = extractCommitEvents(events);

  // Per-kind accumulator
  const kindMap = new Map<string, { plans: number; commits: number; matches: number }>();

  // Helper: get or init kind bucket
  const bucket = (kind: string) => {
    if (!kindMap.has(kind)) kindMap.set(kind, { plans: 0, commits: 0, matches: 0 });
    return kindMap.get(kind)!;
  };

  // For each prediction, check if any commit covers its RID within windowMs
  for (const pred of predictions) {
    const b = bucket(pred.kind);
    b.plans++;

    // Commits for this RID within ±windowMs
    const matchingCommits = commits.filter(
      (c) => c.rid === pred.rid && Math.abs(c.when - pred.when) <= windowMs,
    );

    if (matchingCommits.length > 0) {
      b.matches++;
      b.commits++;
    }
  }

  // Also count commits that were predicted (to surface total commits in window)
  const predictedRids = new Set(predictions.map((p) => p.rid));
  let totalCommits = 0;
  for (const commit of commits) {
    if (predictedRids.has(commit.rid)) {
      totalCommits++;
    }
  }

  // Build perKind record
  const perKind: Record<string, KindStats> = {};
  for (const [kind, stats] of kindMap.entries()) {
    perKind[kind] = {
      plans: stats.plans,
      commits: stats.commits,
      matches: stats.matches,
      accuracy: stats.plans > 0 ? stats.matches / stats.plans : 0,
    };
  }

  // Volume-weighted aggregate
  let totalPlans = 0;
  let totalMatches = 0;
  let weightedSum = 0;

  for (const stats of Object.values(perKind)) {
    totalPlans += stats.plans;
    totalMatches += stats.matches;
    weightedSum += stats.accuracy * stats.plans;
  }

  const aggregate = totalPlans > 0 ? weightedSum / totalPlans : 0;

  return {
    perKind,
    aggregate,
    totalPlans,
    totalCommits,
    totalMatches,
    windowDays: windowMs / 86_400_000,
  };
}
