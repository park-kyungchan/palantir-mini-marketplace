// palantir-mini v2.18.0 — W2 Evaluator Strictness Audit
// Domain: LEARN (audit of evaluator_strictness_probe events)
//
// Reads evaluator_strictness_probe events from project's events.jsonl for a
// given sprintNumber. Groups by criterionHash. For each group, computes mean
// score trend + mean failureClassCount trend across iterations. When score
// trends up >0.05 while failureClassCount does NOT trend down, flag as
// drift-suspected. Closes Part 2 Gap 3 of cheeky-wandering-yeti.md.
//
// Read-only — no side effects, no event emission (pure audit).

import * as fs from "fs";
import * as path from "path";
import { projectRoot as resolveProjectRoot } from "../../scripts/log";

export interface PmHarnessStrictnessAuditArgs {
  sprintNumber: number;
  projectPath?: string;
}

export interface DriftingCriterion {
  criterionHash: string;
  iterations: number;
  scoreTrend: number;
  failureClassTrend: number;
  meanScore: number;
  meanFailureClassCount: number;
}

export interface PmHarnessStrictnessAuditResult {
  sprintNumber: number;
  criteriaAnalyzed: number;
  driftingCriteria: DriftingCriterion[];
  verdict: "clean" | "drift-suspected";
  reasoning: string;
}

interface ProbeRow {
  type: "evaluator_strictness_probe";
  payload: {
    sprintNumber: number;
    iteration: number;
    criterionHash: string;
    score: number;
    evidenceCitationCount: number;
    failureClassCount: number;
  };
}

/**
 * Simple linear trend estimator (sign-preserving slope of a least-squares
 * fit on values[i] against index i). Positive = trending up.
 */
export function linearTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i]! - meanY);
    den += (i - meanX) * (i - meanX);
  }
  return den === 0 ? 0 : num / den;
}

function readProbeRows(project: string, sprintNumber: number): ProbeRow[] {
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  const rows: ProbeRow[] = [];
  for (const line of fs.readFileSync(eventsPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      const parsed = JSON.parse(trimmed) as { type?: string; payload?: unknown };
      if (parsed.type !== "evaluator_strictness_probe") continue;
      const p = parsed.payload as ProbeRow["payload"] | undefined;
      if (!p || p.sprintNumber !== sprintNumber) continue;
      rows.push({ type: "evaluator_strictness_probe", payload: p });
    } catch {
      continue;
    }
  }
  return rows;
}

export async function pmHarnessStrictnessAudit(
  args: PmHarnessStrictnessAuditArgs,
): Promise<PmHarnessStrictnessAuditResult> {
  const project = args.projectPath ?? resolveProjectRoot();
  const rows = readProbeRows(project, args.sprintNumber);

  const byHash = new Map<string, ProbeRow["payload"][]>();
  for (const row of rows) {
    const key = row.payload.criterionHash;
    const existing = byHash.get(key) ?? [];
    existing.push(row.payload);
    byHash.set(key, existing);
  }

  const drifting: DriftingCriterion[] = [];
  for (const [criterionHash, group] of byHash.entries()) {
    // sort by iteration
    group.sort((a, b) => a.iteration - b.iteration);
    const scores = group.map((g) => g.score);
    const failureCounts = group.map((g) => g.failureClassCount);
    const scoreTrend = linearTrend(scores);
    const failureClassTrend = linearTrend(failureCounts);
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const meanFailureClassCount = failureCounts.reduce((a, b) => a + b, 0) / failureCounts.length;
    const isDrifting = scoreTrend > 0.05 && failureClassTrend >= 0;
    if (isDrifting) {
      drifting.push({
        criterionHash,
        iterations: group.length,
        scoreTrend,
        failureClassTrend,
        meanScore,
        meanFailureClassCount,
      });
    }
  }

  const verdict: PmHarnessStrictnessAuditResult["verdict"] =
    drifting.length > 0 ? "drift-suspected" : "clean";
  const reasoning =
    verdict === "clean"
      ? `sprint ${args.sprintNumber}: ${byHash.size} criteria analyzed across ${rows.length} probes; no drift detected.`
      : `sprint ${args.sprintNumber}: ${drifting.length} of ${byHash.size} criteria show rising score trend without matching drop in failure-class count (strictness decay suspected).`;

  return {
    sprintNumber: args.sprintNumber,
    criteriaAnalyzed: byHash.size,
    driftingCriteria: drifting,
    verdict,
    reasoning,
  };
}

export default async function pmHarnessStrictnessAuditHandler(
  rawArgs: unknown,
): Promise<PmHarnessStrictnessAuditResult> {
  return pmHarnessStrictnessAudit((rawArgs ?? {}) as PmHarnessStrictnessAuditArgs);
}
