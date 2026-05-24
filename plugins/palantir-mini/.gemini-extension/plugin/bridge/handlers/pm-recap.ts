// palantir-mini — MCP tool handler: pm_recap (sprint-061 B.W5)
// Domain: LEARN (prim-learn-01 AppendOnlyEventLog — session recap view)
//
// Produces a structured recap of a palantir-mini project session, including:
//   - §Substrate Health  — T0-T4 distribution, T2+ ratio, T3 circuit count
//   - §MCP-First Compliance — ratio of impact questions answered via MCP vs file-read
//   - §Sprint Summary  — sprint_contract_bound events + sprint_completed verdicts
//   - §Top Events     — phase_completed + edit_committed counts
//
// §MCP-First Compliance section (sprint-061 B.W5):
//   Reads lead_mcp_first_compliance phase_completed events (native mode);
//   falls back to heuristic tool_invocation_completed counting when absent.
//
// Authority: plan inherited-discovering-quill.md §3.B.W5
//            rule 12 v3.10.0 §MCP-First protocol
//            rule 26 §Grading (substrate routing T0-T4)
//            rule 10 §Canonical scope (per-project events.jsonl)

import * as path from "path";
import { readEvents } from "../../lib/event-log/read";
import type { EventEnvelope } from "../../lib/event-log/types";
import {
  computeMcpFirstCompliance,
  filterToSprint,
  filterToLastNDays,
  renderMcpFirstComplianceSection,
} from "../../lib/recap/mcp-first-compliance";
import {
  computeClassificationAccuracy,
  type CalibrationScore,
} from "../../lib/recap/classification-accuracy";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PmRecapArgs {
  /** Absolute path to project root. Default: $PALANTIR_MINI_PROJECT or cwd. */
  project?: string;
  /**
   * Filter scope for MCP-First Compliance section.
   * "current-sprint" = events since most recent sprint_contract_bound (default).
   * "sprint-NNN" (e.g. "sprint-060") = events for that sprint.
   * "last-7-days" or "last-N-days" (e.g. "last-30-days") = calendar window.
   * "all" = all events.
   */
  scope?: string;
  /**
   * When true, skip the §MCP-First Compliance section.
   * Default false — include the section.
   */
  skipMcpFirst?: boolean;
  /** Include per-bucket breakdown in §MCP-First Compliance. Default false. */
  withBuckets?: boolean;
  /**
   * When true, include §Classification Accuracy section (sprint-062 W4-α).
   * Default false — opt-in to avoid cost for quick recaps.
   */
  withClassificationAccuracy?: boolean;
  /**
   * Window in days for classification accuracy pairing (default 14).
   * A prediction is confirmed when an edit_committed event fires for the same
   * RID within ±classificationWindowDays of the plan output.
   */
  classificationWindowDays?: number;
}

interface SprintSummary {
  sprintNumber: number;
  contractId?: string;
  bound: boolean;
  verdict?: string;
}

interface SubstrateHealth {
  totalEvents: number;
  gradeDistribution: Record<string, number>;
  t2PlusRatio: number;
  t3CircuitInputs: number;
}

interface ClassificationAccuracySummary {
  aggregate: number;
  totalPlans: number;
  totalMatches: number;
  windowDays: number;
  trust: boolean;
  retrain: boolean;
  perKindAccuracy: Record<string, number>;
  section: string;
}

interface PmRecapResult {
  project: string;
  scope: string;
  generatedAt: string;
  substrateHealth: SubstrateHealth;
  sprintSummary: SprintSummary[];
  topEvents: Record<string, number>;
  mcpFirstCompliance?: {
    passed: number;
    bypassed: number;
    ratio: number;
    estimatedTokensSaved: number;
    mode: "native" | "heuristic";
    topRids: string[];
    section: string;
  };
  classificationAccuracy?: ClassificationAccuracySummary;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseScope(scope: string, events: readonly EventEnvelope[]): EventEnvelope[] {
  if (scope === "all") return events as EventEnvelope[];

  if (scope === "current-sprint") {
    // Find the most recent sprint_contract_bound and return events from there to end
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (ev?.type === "sprint_contract_bound") {
        const n = (ev.payload as { sprintNumber?: unknown }).sprintNumber;
        if (typeof n === "number") {
          return filterToSprint(events, n);
        }
      }
    }
    // No sprint contract found: return last 24h as fallback
    return filterToLastNDays(events, 1);
  }

  const sprintMatch = scope.match(/^sprint-(\d+)$/);
  if (sprintMatch) {
    const n = parseInt(sprintMatch[1] ?? "", 10);
    if (!isNaN(n)) return filterToSprint(events, n);
  }

  const lastDaysMatch = scope.match(/^last-(\d+)-days?$/);
  if (lastDaysMatch) {
    const n = parseInt(lastDaysMatch[1] ?? "", 10);
    if (!isNaN(n)) return filterToLastNDays(events, n);
  }

  // Unknown scope: return all
  return events as EventEnvelope[];
}

function computeSubstrateHealth(events: readonly EventEnvelope[]): SubstrateHealth {
  const dist: Record<string, number> = { T0: 0, T1: 0, T2: 0, T3: 0, T4: 0 };
  let ungraded = 0;

  for (const ev of events) {
    const grade = (ev as unknown as Record<string, unknown>).valueGrade as string | undefined;
    if (grade && grade in dist) {
      dist[grade] = (dist[grade] ?? 0) + 1;
    } else {
      ungraded++;
    }
  }

  const total = events.length;
  const t2Plus = (dist.T2 ?? 0) + (dist.T3 ?? 0) + (dist.T4 ?? 0);
  const t2PlusRatio = total > 0 ? t2Plus / total : 0;
  const t3CircuitInputs = (dist.T3 ?? 0) + (dist.T4 ?? 0);

  return {
    totalEvents: total,
    gradeDistribution: { ...dist, ungraded },
    t2PlusRatio,
    t3CircuitInputs,
  };
}

function computeSprintSummary(events: readonly EventEnvelope[]): SprintSummary[] {
  const sprintMap = new Map<number, SprintSummary>();

  for (const ev of events) {
    if (ev.type === "sprint_contract_bound") {
      const payload = ev.payload as { sprintNumber?: unknown; contractId?: unknown };
      const n = typeof payload.sprintNumber === "number" ? payload.sprintNumber : null;
      if (n === null) continue;
      if (!sprintMap.has(n)) {
        sprintMap.set(n, {
          sprintNumber: n,
          contractId: typeof payload.contractId === "string" ? payload.contractId : undefined,
          bound: true,
        });
      }
    }
    if (ev.type === "sprint_completed") {
      const payload = ev.payload as { sprintNumber?: unknown; verdict?: unknown };
      const n = typeof payload.sprintNumber === "number" ? payload.sprintNumber : null;
      if (n === null) continue;
      const existing = sprintMap.get(n);
      if (existing) {
        existing.verdict = typeof payload.verdict === "string" ? payload.verdict : undefined;
      }
    }
  }

  return [...sprintMap.values()].sort((a, b) => a.sprintNumber - b.sprintNumber);
}

function computeTopEvents(events: readonly EventEnvelope[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ev of events) {
    counts[ev.type] = (counts[ev.type] ?? 0) + 1;
  }
  // Return top 10 by count, sorted descending
  return Object.fromEntries(
    Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10),
  );
}

// ─── §Classification Accuracy section (sprint-062 W4-α; updated sprint-063 W2.A) ──────────────────────
// Now reflects impact_query-based RID prediction accuracy (semantic_change_plan removed W2.A).

function renderClassificationAccuracySection(
  score: CalibrationScore,
  trust: boolean,
  retrain: boolean,
  trustThreshold: number = 0.8,
  retrainThreshold: number = 0.6,
): string {
  const pct = (score.aggregate * 100).toFixed(1);
  const lines: string[] = [
    "## §Classification Accuracy — impact_query RID prediction calibration",
    `- aggregate: ${pct}% (${score.totalMatches}/${score.totalPlans} predictions matched, ${score.windowDays}-day window)`,
    `- trust: ${trust ? "YES" : "NO"} (threshold ≥${(trustThreshold * 100).toFixed(0)}%)`,
    `- retrain: ${retrain ? "YES" : "NO"} (threshold <${(retrainThreshold * 100).toFixed(0)}%)`,
  ];

  const kindCount = Object.keys(score.perKind).length;
  if (kindCount > 0) {
    lines.push("");
    lines.push("| ImpactEdgeKind | Plans | Matches | Accuracy |");
    lines.push("|----------------|-------|---------|----------|");
    for (const [kind, stats] of Object.entries(score.perKind)) {
      lines.push(
        `| ${kind} | ${stats.plans} | ${stats.matches} | ${(stats.accuracy * 100).toFixed(1)}% |`,
      );
    }
  } else {
    lines.push("- no impact_query RID predictions found in event log");
  }

  return lines.join("\n");
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function pmRecap(rawArgs: unknown): Promise<PmRecapResult> {
  const args = (rawArgs ?? {}) as PmRecapArgs;

  const projectRoot = args.project ?? process.env.PALANTIR_MINI_PROJECT ?? process.cwd();
  const scope = args.scope ?? "current-sprint";
  const skipMcpFirst = args.skipMcpFirst === true;
  const withBuckets = args.withBuckets === true;
  const withClassificationAccuracy = args.withClassificationAccuracy === true;
  const classificationWindowDays = typeof args.classificationWindowDays === "number" && args.classificationWindowDays > 0
    ? args.classificationWindowDays
    : 14;

  const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
  const allEvents = readEvents(eventsPath);

  // Apply scope filter for MCP-first section
  const scopedEvents = parseScope(scope, allEvents);

  // Substrate health uses scoped events
  const substrateHealth = computeSubstrateHealth(scopedEvents);

  // Sprint summary uses all events (cross-sprint visibility)
  const sprintSummary = computeSprintSummary(allEvents);

  // Top events from scoped slice
  const topEvents = computeTopEvents(scopedEvents);

  // §Classification Accuracy section (sprint-062 W4-α)
  let classificationAccuracy: PmRecapResult["classificationAccuracy"] = undefined;
  if (withClassificationAccuracy) {
    const windowMs = classificationWindowDays * 24 * 3_600_000;
    const classScore = computeClassificationAccuracy(
      allEvents as unknown[],
      windowMs,
    );
    const trust = classScore.aggregate >= 0.8;
    const retrain = classScore.aggregate < 0.6;
    const section = renderClassificationAccuracySection(classScore, trust, retrain);
    classificationAccuracy = {
      aggregate: classScore.aggregate,
      totalPlans: classScore.totalPlans,
      totalMatches: classScore.totalMatches,
      windowDays: classScore.windowDays,
      trust,
      retrain,
      perKindAccuracy: Object.fromEntries(
        Object.entries(classScore.perKind).map(([k, v]) => [k, v.accuracy]),
      ),
      section,
    };
  }

  // §MCP-First Compliance section
  let mcpFirstCompliance: PmRecapResult["mcpFirstCompliance"] = undefined;
  if (!skipMcpFirst) {
    const bucketBy = withBuckets
      ? (scope.startsWith("sprint") ? "sprint" as const : "day" as const)
      : undefined;
    const compliance = computeMcpFirstCompliance(scopedEvents, bucketBy);
    const section = renderMcpFirstComplianceSection(compliance, scope);
    mcpFirstCompliance = {
      passed: compliance.totalPassed,
      bypassed: compliance.totalBypassed,
      ratio: compliance.ratio,
      estimatedTokensSaved: compliance.estimatedTokensSaved,
      mode: compliance.mode,
      topRids: compliance.topRids,
      section,
    };
  }

  return {
    project: projectRoot,
    scope,
    generatedAt: new Date().toISOString(),
    substrateHealth,
    sprintSummary,
    topEvents,
    mcpFirstCompliance,
    classificationAccuracy,
  };
}
