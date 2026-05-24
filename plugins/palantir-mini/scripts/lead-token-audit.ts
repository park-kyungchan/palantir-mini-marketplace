#!/usr/bin/env bun
// palantir-mini — lead-token-audit.ts (sprint-061 B.W5)
//
// CLI: bun ${PLUGIN_ROOT}/scripts/lead-token-audit.ts --sprint <NNN>
//      bun ${PLUGIN_ROOT}/scripts/lead-token-audit.ts --last-N-days <N>
//      bun ${PLUGIN_ROOT}/scripts/lead-token-audit.ts --help
//
// Reads <projectRoot>/.palantir-mini/session/events.jsonl (rule 10 §Canonical scope).
// Auto-merges rotated archives via lib/event-log/read.ts:readEvents.
//
// Counts lead_mcp_first_compliance events: passed count vs bypassed count → ratio.
// Fallback (no native events): heuristic from tool_invocation_completed tool names.
// Estimates token savings: passed * 25K (operating model §4.5.2 mid-range).
//
// Output: markdown table to stdout. Optional --output <path> writes report file.
//
// Authority: plan inherited-discovering-quill.md §3.B.W5 + §4.5.5
//            rule 10 §Canonical scope (events.jsonl per-project)

import * as fs from "fs";
import * as path from "path";
import { readEvents } from "../lib/event-log/read";
import {
  computeMcpFirstCompliance,
  filterToSprint,
  filterToLastNDays,
  renderMcpFirstComplianceSection,
  TOKENS_SAVED_PER_PASSED,
} from "../lib/recap/mcp-first-compliance";

// ─── CLI arg parsing ────────────────────────────────────────────────────────

interface CliArgs {
  projectRoot: string;
  sprint: number | null;
  lastNDays: number | null;
  outputPath: string | null;
  json: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  let projectRoot = process.env.PALANTIR_MINI_PROJECT ?? process.cwd();
  let sprint: number | null = null;
  let lastNDays: number | null = null;
  let outputPath: string | null = null;
  let json = false;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === "--project" || arg === "-p") && args[i + 1]) {
      projectRoot = path.resolve(args[++i] ?? "");
    } else if (arg === "--sprint" && args[i + 1]) {
      const parsed = parseInt(args[++i] ?? "", 10);
      if (!isNaN(parsed) && parsed > 0) sprint = parsed;
    } else if (arg === "--last-N-days" && args[i + 1]) {
      const parsed = parseInt(args[++i] ?? "", 10);
      if (!isNaN(parsed) && parsed > 0) lastNDays = parsed;
    } else if (arg === "--output" && args[i + 1]) {
      outputPath = path.resolve(args[++i] ?? "");
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    }
  }

  return { projectRoot, sprint, lastNDays, outputPath, json, help };
}

// ─── Markdown rendering ─────────────────────────────────────────────────────

interface AuditReport {
  generatedAt: string;
  projectRoot: string;
  filter: string;
  totalEvents: number;
  totalPassed: number;
  totalBypassed: number;
  ratio: number;
  estimatedTokensSaved: number;
  mode: "native" | "heuristic";
  topRids: string[];
  buckets: Array<{
    label: string;
    passed: number;
    bypassed: number;
    ratio: number;
    estimatedTokensSaved: number;
  }>;
}

function renderMarkdown(report: AuditReport): string {
  const modeNote = report.mode === "heuristic"
    ? " (heuristic — no native `lead_mcp_first_compliance` events; use pre-edit-impact-mcp-first hook for native tracking)"
    : "";
  const ratioStr = `${(report.ratio * 100).toFixed(1)}%`;
  const savedStr = report.estimatedTokensSaved > 0
    ? `~${(report.estimatedTokensSaved / 1000).toFixed(0)}K tokens`
    : "0 tokens";

  const lines: string[] = [
    "# palantir-mini — Lead Token Audit (MCP-First Compliance)",
    "",
    `Generated: ${report.generatedAt}`,
    `Project: ${report.projectRoot}`,
    `Filter: ${report.filter}`,
    `Mode: ${report.mode}${modeNote}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total events in scope | ${report.totalEvents} |`,
    `| MCP-first passed | ${report.totalPassed} |`,
    `| MCP-first bypassed (file-read) | ${report.totalBypassed} |`,
    `| MCP-first ratio | ${ratioStr} |`,
    `| Estimated tokens saved | ${savedStr} |`,
    `| Target | ≥80% per rule 12 v3.10.0 |`,
    "",
  ];

  if (report.topRids.length > 0) {
    lines.push("## Top-3 RIDs queried via MCP", "");
    for (const rid of report.topRids) {
      lines.push(`- \`${rid}\``);
    }
    lines.push("");
  }

  if (report.buckets.length > 0) {
    const header = report.filter.startsWith("sprint") ? "Sprint" : "Day";
    lines.push(
      `## Per-${header.toLowerCase()} breakdown`,
      "",
      `| ${header} | Passed | Bypassed | Ratio | Tokens Saved |`,
      `|${"-".repeat(header.length + 2)}|--------|----------|-------|--------------|`,
    );
    for (const b of report.buckets) {
      lines.push(
        `| ${b.label} | ${b.passed} | ${b.bypassed} | ${(b.ratio * 100).toFixed(1)}% | ~${(b.estimatedTokensSaved / 1000).toFixed(0)}K |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Authority",
    "",
    "- Plan `inherited-discovering-quill.md` §3.B.W5 + §4.5.5",
    "- Rule 12 v3.10.0 §MCP-First protocol (target ≥80%)",
    `- Token savings estimate: ${TOKENS_SAVED_PER_PASSED.toLocaleString()} tokens per passed event (operating model §4.5.2)`,
  );

  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { projectRoot, sprint, lastNDays, outputPath, json: jsonOutput, help } = parseArgs(process.argv);

  if (help) {
    process.stdout.write(
      [
        "lead-token-audit.ts — palantir-mini MCP-First Compliance telemetry",
        "",
        "Usage:",
        "  bun lead-token-audit.ts --sprint <NNN>        # events for sprint NNN",
        "  bun lead-token-audit.ts --last-N-days <N>     # events from last N days",
        "  bun lead-token-audit.ts                       # all events",
        "",
        "Options:",
        "  --project, -p <path>    Project root (default: $PALANTIR_MINI_PROJECT or cwd)",
        "  --sprint <NNN>          Filter to sprint NNN (via sprint_contract_bound events)",
        "  --last-N-days <N>       Filter to last N calendar days",
        "  --output <path>         Write markdown report to file",
        "  --json                  Output JSON instead of markdown",
        "  --help, -h              Show this help",
        "",
        "Token savings: ~25K per MCP-first passed event (vs 30K file-read baseline).",
        "Native mode: reads lead_mcp_first_compliance phase_completed events.",
        "Heuristic fallback: counts tool_invocation_completed by tool name.",
      ].join("\n") + "\n",
    );
    return;
  }

  const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");

  let allEvents = readEvents(eventsPath);

  // Apply filter
  let filterLabel: string;
  let scopedEvents = allEvents;

  if (sprint !== null) {
    scopedEvents = filterToSprint(allEvents, sprint);
    filterLabel = `sprint-${String(sprint).padStart(3, "0")}`;
  } else if (lastNDays !== null) {
    scopedEvents = filterToLastNDays(allEvents, lastNDays);
    filterLabel = `last ${lastNDays} days`;
  } else {
    filterLabel = "all events";
  }

  const bucketBy = sprint !== null ? "sprint" : lastNDays !== null ? "day" : undefined;
  const result = computeMcpFirstCompliance(scopedEvents, bucketBy);

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    projectRoot,
    filter: filterLabel,
    totalEvents: scopedEvents.length,
    totalPassed: result.totalPassed,
    totalBypassed: result.totalBypassed,
    ratio: result.ratio,
    estimatedTokensSaved: result.estimatedTokensSaved,
    mode: result.mode,
    topRids: result.topRids,
    buckets: result.buckets,
  };

  const output = jsonOutput
    ? JSON.stringify(report, null, 2)
    : renderMarkdown(report);

  process.stdout.write(output + "\n");

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output + "\n", "utf8");
    process.stderr.write(`[lead-token-audit] Report written to ${outputPath}\n`);
  }
}

await main();
