// palantir-mini v4.11.0 — MCP tool handler: pm_value_grade_metrics
// Domain: LEARN (rule 26 substrate health dashboard)
//
// Substrate health dashboard. Reads project events.jsonl, computes:
//   - Total event count + per-grade distribution (T0..T4)
//   - T0 reject rate (T0 / total)
//   - T2+ ratio ((T2+T3+T4) / denominator) — target ≥ 0.25
//   - T3 circuit input count (T3+T4) — BackProp pulse signal
//   - Daily 7-day trend by grade
//
// v4.11.0 sprint-057 W5 — useGradedDenominator arg (default false for back-compat).
//   When true, t2PlusRatio denominator = (T0+T1+T2+T3+T4) instead of totalEvents,
//   excluding ungraded historical events (pre-rule-26 substrate). Closes Priority D
//   metric semantics issue per sprint-056 carry-over closure.
//
// Authority: ~/.claude/rules/26-valuable-data-standard.md §Grading
//            ~/.claude/plans/quiet-fluttering-garden.md §Phase 3.3
//            ~/.claude/plans/quirky-popping-frog.md §W5

import * as fs from "fs";
import * as path from "path";
import { readEvents } from "../../lib/event-log/read";
import { VALUE_GRADES, type ValueGrade } from "#schemas/ontology/primitives/value-grade";
import type { EventEnvelope } from "../../lib/event-log/types";

interface PmValueGradeMetricsArgs {
  project:    string;
  windowDays?: number;
  /**
   * v4.11.0 sprint-057 W5 — when true, t2PlusRatio denominator = (T0+T1+T2+T3+T4)
   * instead of totalEvents, excluding ungraded historical events. Default false
   * for back-compat with existing consumers (pm-value-audit Three-Questions mode etc).
   */
  useGradedDenominator?: boolean;
}

interface DayBucket {
  day:     string;
  T0:      number;
  T1:      number;
  T2:      number;
  T3:      number;
  T4:      number;
  total:   number;
}

interface PmValueGradeMetricsResult {
  totalEvents:             number;
  gradeDistribution:       Record<ValueGrade, number>;
  ungraded:                number;
  t0RejectRate:            number;
  t2PlusRatio:             number;
  t3CircuitInputs:         number;
  trend:                   DayBucket[];
  windowDays:              number;
  windowStart:             string;
  windowEnd:               string;
  recommendation:          string;
  /** W3.C3: count of auto_regen_committed phase_completed events within windowDays */
  autoRegenCommitsLast7d:  number;
  /** v4.11.0 sprint-057 W5: graded-only denominator used (T0+T1+T2+T3+T4). */
  gradedTotal:             number;
  /** v4.11.0 sprint-057 W5: which denominator was used for t2PlusRatio. */
  denominatorMode:         "totalEvents" | "graded";
}

function isoDate(when: unknown): string | null {
  if (!when) return null;
  // Defensive type guard — events.jsonl is append-only and may carry legacy/external rows
  // where `when` is an object (e.g. {timestamp: "..."}) instead of the typed string.
  // Mirrors the pattern in pm-memory-layer-audit.ts:81.
  if (typeof when !== "string") return null;
  // Extract YYYY-MM-DD from ISO timestamp
  const m = when.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1]! : null;
}

function daysBack(n: number): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function recommendFor(t0Rate: number, t2Plus: number): string {
  if (t0Rate > 0.05) {
    return `T0 reject rate ${(t0Rate * 100).toFixed(1)}% > 5%. Substrate noise high — investigate emit sources missing 5-dim.`;
  }
  if (t2Plus < 0.15) {
    return `T2+ ratio ${(t2Plus * 100).toFixed(1)}% < 15%. Most events lack outcome pairing OR memory layer mapping. Run /palantir-mini:pm-memory-map.`;
  }
  if (t2Plus < 0.25) {
    return `T2+ ratio ${(t2Plus * 100).toFixed(1)}% in 15-25% range — improving but below target 25%. Continue tagging emits.`;
  }
  return `Substrate healthy: T0 ${(t0Rate * 100).toFixed(1)}%, T2+ ${(t2Plus * 100).toFixed(1)}%. BackProp circuit active.`;
}

export default async function pmValueGradeMetrics(
  rawArgs: unknown,
): Promise<PmValueGradeMetricsResult> {
  const args = (rawArgs ?? {}) as PmValueGradeMetricsArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("pm_value_grade_metrics: `project` is required");
  }
  const windowDays = args.windowDays ?? 7;
  const windowStart = daysBack(windowDays);
  const windowEnd = daysBack(0);

  const eventsPath = path.join(args.project, ".palantir-mini", "session", "events.jsonl");

  const distribution: Record<ValueGrade, number> = { T0: 0, T1: 0, T2: 0, T3: 0, T4: 0 };
  let ungraded = 0;
  let totalEvents = 0;

  // Build day buckets for trend
  const buckets = new Map<string, DayBucket>();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = daysBack(i);
    buckets.set(d, { day: d, T0: 0, T1: 0, T2: 0, T3: 0, T4: 0, total: 0 });
  }

  if (!fs.existsSync(eventsPath)) {
    return {
      totalEvents: 0,
      gradeDistribution: distribution,
      ungraded: 0,
      t0RejectRate: 0,
      t2PlusRatio: 0,
      t3CircuitInputs: 0,
      trend: [...buckets.values()],
      windowDays,
      windowStart,
      windowEnd,
      recommendation: "No events yet.",
      autoRegenCommitsLast7d: 0,
      gradedTotal: 0,
      denominatorMode: args.useGradedDenominator ? "graded" : "totalEvents",
    };
  }

  const events = readEvents(eventsPath);

  let autoRegenCommitsLast7d = 0;

  for (const ev of events) {
    totalEvents += 1;
    const env = ev as EventEnvelope;
    const grade = env.valueGrade;
    if (grade !== undefined && (VALUE_GRADES as readonly string[]).includes(grade)) {
      distribution[grade] += 1;
    } else {
      ungraded += 1;
    }

    // Trend bucketing — only count if event is within window
    const day = isoDate(env.when);
    if (day && buckets.has(day)) {
      const b = buckets.get(day)!;
      b.total += 1;
      if (grade !== undefined && (VALUE_GRADES as readonly string[]).includes(grade)) {
        b[grade] += 1;
      }
    }

    // W3.C3: count auto_regen_committed phase_completed events within window
    if (day && day >= windowStart) {
      const payload = (env as unknown as Record<string, unknown>).payload as Record<string, unknown> | undefined;
      if (
        env.type === "phase_completed" &&
        payload?.phaseTag === "auto_regen_committed"
      ) {
        autoRegenCommitsLast7d += 1;
      }
    }
  }

  const t0RejectRate = totalEvents > 0 ? distribution.T0 / totalEvents : 0;
  const t2PlusCount = distribution.T2 + distribution.T3 + distribution.T4;
  const gradedTotal = distribution.T0 + distribution.T1 + distribution.T2 + distribution.T3 + distribution.T4;
  const denominator = args.useGradedDenominator ? gradedTotal : totalEvents;
  const t2PlusRatio = denominator > 0 ? t2PlusCount / denominator : 0;
  const t3CircuitInputs = distribution.T3 + distribution.T4;
  const recommendation = recommendFor(t0RejectRate, t2PlusRatio);

  return {
    totalEvents,
    gradeDistribution: distribution,
    ungraded,
    t0RejectRate,
    t2PlusRatio,
    t3CircuitInputs,
    trend: [...buckets.values()],
    windowDays,
    windowStart,
    windowEnd,
    recommendation,
    autoRegenCommitsLast7d,
    gradedTotal,
    denominatorMode: args.useGradedDenominator ? "graded" : "totalEvents",
  };
}
