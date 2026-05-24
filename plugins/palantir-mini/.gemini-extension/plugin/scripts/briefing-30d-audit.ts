#!/usr/bin/env bun
// palantir-mini — briefing-30d-audit.ts (sprint-060 W3 R6-F14)
//
// Scheduled audit script: reads events.jsonl for the past 30 days and counts
// `briefing_validation_failed` events (emitted by briefing-template-validate.ts
// when a subagent briefing is missing required sections). Produces a per-rule
// breakdown report.
//
// Architecture review §5.H.4: "scheduled to run 2026-06-07 and monthly thereafter"
//
// Usage:
//   bun run scripts/briefing-30d-audit.ts [--project <projectRoot>] [--days <N>] [--json]
//   bun run scripts/briefing-30d-audit.ts --help
//
// Output (default): markdown report printed to stdout
// Output (--json):  JSON object with per-rule breakdown + summary
//
// Authority: rule 12 §Briefing template (5-section) + §Subagent decision audit invariant
//            architecture review §5.H.4 (sprint-060 W3 R6-F14)

import * as fs from "fs";
import * as path from "path";
import { readEvents } from "../lib/event-log/read";
import type { EventEnvelope } from "../lib/event-log/types";

// ─── CLI arg parsing ────────────────────────────────────────────────────────

function parseArgs(argv: string[]): {
  projectRoot: string;
  days: number;
  json: boolean;
  help: boolean;
} {
  const args = argv.slice(2);
  let projectRoot = process.cwd();
  let days = 30;
  let json = false;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--project" && args[i + 1]) {
      projectRoot = path.resolve(args[++i] ?? "");
    } else if (arg === "--days" && args[i + 1]) {
      const parsed = parseInt(args[++i] ?? "", 10);
      if (!isNaN(parsed) && parsed > 0) days = parsed;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    }
  }

  return { projectRoot, days, json, help };
}

// ─── Event filtering ────────────────────────────────────────────────────────

/** Filter events to only briefing validation failures within the time window. */
function filterBriefingFailures(events: EventEnvelope[], cutoffMs: number): EventEnvelope[] {
  return events.filter((ev) => {
    // Time filter
    const ts = new Date(ev.when).getTime();
    if (isNaN(ts) || ts < cutoffMs) return false;

    // Type filter: briefing-template-validate emits validation_phase_completed
    // with errorClass containing "briefing" or payload.section info
    if (ev.type !== "validation_phase_completed") return false;

    const payload = (ev.payload ?? {}) as Record<string, unknown>;

    // Match known error classes from briefing-template-validate.ts
    const errorClass = String(payload.errorClass ?? "");
    if (errorClass.includes("briefing")) return true;
    if (errorClass === "briefing_section_missing") return true;
    if (errorClass === "briefing_validation_failed") return true;

    // Also match if passed=false and phase contains "subagent" or "briefing"
    const phase = String(payload.phase ?? "");
    if (payload.passed === false && (phase.includes("briefing") || phase.includes("subagent"))) {
      return true;
    }

    return false;
  });
}

// ─── Breakdown computation ──────────────────────────────────────────────────

interface RuleBreakdown {
  ruleId: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  agentNames: string[];
}

interface AuditReport {
  generatedAt: string;
  projectRoot: string;
  windowDays: number;
  cutoffDate: string;
  totalEvents: number;
  totalBriefingFailures: number;
  byRule: RuleBreakdown[];
  byAgent: Array<{ agentName: string; count: number }>;
  byDay: Array<{ date: string; count: number }>;
  recommendation: string;
}

function computeReport(
  failures: EventEnvelope[],
  projectRoot: string,
  days: number,
  cutoffMs: number,
  totalEvents: number,
): AuditReport {
  const generatedAt = new Date().toISOString();
  const cutoffDate = new Date(cutoffMs).toISOString().slice(0, 10);

  // Group by errorClass / rule cited
  const byRuleMap = new Map<string, { count: number; first: number; last: number; agents: Set<string> }>();
  // Group by agent name
  const byAgentMap = new Map<string, number>();
  // Group by day (YYYY-MM-DD)
  const byDayMap = new Map<string, number>();

  for (const ev of failures) {
    const payload = (ev.payload ?? {}) as Record<string, unknown>;
    const errorClass = String(payload.errorClass ?? "unknown");
    const agentName  = String((ev.byWhom as Record<string, unknown> | undefined)?.agentName ?? "unknown");
    const dayKey     = ev.when.slice(0, 10);
    const ts         = new Date(ev.when).getTime();

    // By rule
    const ruleEntry = byRuleMap.get(errorClass) ?? { count: 0, first: ts, last: ts, agents: new Set() };
    ruleEntry.count += 1;
    ruleEntry.first  = Math.min(ruleEntry.first, ts);
    ruleEntry.last   = Math.max(ruleEntry.last, ts);
    ruleEntry.agents.add(agentName);
    byRuleMap.set(errorClass, ruleEntry);

    // By agent
    byAgentMap.set(agentName, (byAgentMap.get(agentName) ?? 0) + 1);

    // By day
    byDayMap.set(dayKey, (byDayMap.get(dayKey) ?? 0) + 1);
  }

  const byRule: RuleBreakdown[] = Array.from(byRuleMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([ruleId, data]) => ({
      ruleId,
      count:      data.count,
      firstSeen:  new Date(data.first).toISOString(),
      lastSeen:   new Date(data.last).toISOString(),
      agentNames: Array.from(data.agents).sort(),
    }));

  const byAgent = Array.from(byAgentMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([agentName, count]) => ({ agentName, count }));

  const byDay = Array.from(byDayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  const failureRate = totalEvents > 0 ? failures.length / totalEvents : 0;
  let recommendation: string;
  if (failures.length === 0) {
    recommendation = "No briefing validation failures in the audit window. Briefing discipline is healthy.";
  } else if (failureRate > 0.05) {
    recommendation = `High failure rate (${(failureRate * 100).toFixed(1)}%). Review rule 12 §Briefing template with Lead and check if PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY=1 is set.`;
  } else {
    recommendation = `${failures.length} failure(s) in ${days}d window (${(failureRate * 100).toFixed(2)}% of events). Acceptable; monitor monthly.`;
  }

  return {
    generatedAt,
    projectRoot,
    windowDays: days,
    cutoffDate,
    totalEvents,
    totalBriefingFailures: failures.length,
    byRule,
    byAgent,
    byDay,
    recommendation,
  };
}

// ─── Markdown rendering ─────────────────────────────────────────────────────

function renderMarkdown(report: AuditReport): string {
  const lines: string[] = [
    "# palantir-mini — Briefing Validation 30-Day Audit",
    "",
    `Generated: ${report.generatedAt}`,
    `Project: ${report.projectRoot}`,
    `Window: ${report.windowDays} days (from ${report.cutoffDate})`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total events in window | ${report.totalEvents} |`,
    `| Briefing validation failures | ${report.totalBriefingFailures} |`,
    `| Failure rate | ${report.totalEvents > 0 ? ((report.totalBriefingFailures / report.totalEvents) * 100).toFixed(2) : "0.00"}% |`,
    "",
    `**Recommendation**: ${report.recommendation}`,
    "",
  ];

  if (report.totalBriefingFailures > 0) {
    lines.push(
      "## By error class / rule",
      "",
      "| Error class | Count | First seen | Last seen | Agents |",
      "|-------------|-------|------------|-----------|--------|",
    );
    for (const row of report.byRule) {
      lines.push(
        `| \`${row.ruleId}\` | ${row.count} | ${row.firstSeen.slice(0, 10)} | ${row.lastSeen.slice(0, 10)} | ${row.agentNames.slice(0, 3).join(", ")} |`,
      );
    }
    lines.push("");

    lines.push(
      "## By agent",
      "",
      "| Agent | Failures |",
      "|-------|----------|",
    );
    for (const row of report.byAgent) {
      lines.push(`| \`${row.agentName}\` | ${row.count} |`);
    }
    lines.push("");

    lines.push(
      "## Daily trend",
      "",
      "| Date | Failures |",
      "|------|----------|",
    );
    for (const row of report.byDay) {
      lines.push(`| ${row.date} | ${row.count} |`);
    }
    lines.push("");
  }

  lines.push(
    "## Authority",
    "",
    "- Rule 12 §Briefing template (5-section) — `~/.claude/rules/12-lead-protocol-v2.md`",
    "- Architecture review §5.H.4 (sprint-060 W3 R6-F14)",
    "- Scheduled next run: monthly (next: 2026-06-07)",
  );

  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { projectRoot, days, json: jsonOutput, help } = parseArgs(process.argv);

  if (help) {
    process.stdout.write(
      [
        "briefing-30d-audit.ts — palantir-mini briefing validation audit",
        "",
        "Usage: bun run briefing-30d-audit.ts [--project <root>] [--days <N>] [--json]",
        "",
        "  --project <path>  Path to project root containing .palantir-mini/ (default: cwd)",
        "  --days <N>        Audit window in days (default: 30)",
        "  --json            Output JSON instead of markdown",
        "  --help, -h        Show this help",
        "",
        "Scheduled: monthly (next: 2026-06-07 per architecture review §5.H.4)",
      ].join("\n") + "\n",
    );
    return;
  }

  const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");

  let allEvents: EventEnvelope[] = [];
  if (fs.existsSync(eventsPath)) {
    allEvents = readEvents(eventsPath);
  }

  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const windowEvents = allEvents.filter((ev) => {
    const ts = new Date(ev.when).getTime();
    return !isNaN(ts) && ts >= cutoffMs;
  });

  const failures = filterBriefingFailures(windowEvents, cutoffMs);
  const report   = computeReport(failures, projectRoot, days, cutoffMs, windowEvents.length);

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(renderMarkdown(report) + "\n");
  }
}

await main();
