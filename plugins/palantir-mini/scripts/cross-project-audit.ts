#!/usr/bin/env bun
// palantir-mini — cross-project-audit.ts (sprint-060 W2.3 / R4-F8)
//
// Reads events.jsonl from all registered projects and the monorepo root,
// counts `harness_bypass_invoked` events per project, and writes a summary
// suitable for `pm_recap`.
//
// Architecture review §5.E.3 (R4-F8):
//   "grep harness_bypass_invoked events.jsonl = 0 hits. Cannot disambiguate
//   whether bypass discipline is excellent or telemetry coverage is incomplete."
//   Suggested fix: investigate via grep across all consumer projects.
//
// Usage:
//   bun run cross-project-audit.ts [--event-class <class>] [--dry-run] [--json]
//
// Options:
//   --event-class <class>   Event errorClass to count (default: harness_bypass_invoked)
//   --dry-run               Print results without emitting summary event
//   --json                  Output raw JSON result
//
// Default behavior:
//   - Scans registered projects in plugins/palantir-mini/session/registered-projects.json
//   - Also scans the monorepo root (~/) and sub-projects under ~/projects/
//   - Counts events matching the errorClass in payload
//   - Emits validation_phase_completed{errorClass:"cross_project_audit_completed"} with counts
//
// Authority:
//   rule 10 (events-jsonl) §Canonical scope — per-project events.jsonl
//   rule 16 (sprint-harness) §Default-On Policy — harness_bypass_invoked audit
//   ~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md §5.E.3 (R4-F8)

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { emit } from "./log";
import { resolvePalantirMiniRoot } from "../lib/config/root";

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_EVENT_CLASS = "harness_bypass_invoked";

const PLUGIN_ROOT = resolvePalantirMiniRoot();

const PROJECTS_ROOT = path.join(
  process.env.HOME ?? os.homedir(),
  "projects"
);

const MONOREPO_ROOT = process.env.HOME ?? os.homedir();

// ─── CLI arg parsing ─────────────────────────────────────────────────────────

function parseArgs(argv: string[]): {
  eventClass: string;
  dryRun: boolean;
  jsonOutput: boolean;
} {
  let eventClass = DEFAULT_EVENT_CLASS;
  let dryRun = false;
  let jsonOutput = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--event-class" && argv[i + 1]) {
      eventClass = argv[++i]!;
    } else if (argv[i] === "--dry-run") {
      dryRun = true;
    } else if (argv[i] === "--json") {
      jsonOutput = true;
    }
  }

  return { eventClass, dryRun, jsonOutput };
}

// ─── Events.jsonl path resolution ────────────────────────────────────────────

function eventsPathFor(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
}

// ─── Registry reader ─────────────────────────────────────────────────────────

interface RegistrationEntry {
  rid?:         string;
  projectPath?: string;
  label?:       string;
}

function readRegisteredProjects(): string[] {
  const registryPath = path.join(PLUGIN_ROOT, "session", "registered-projects.json");
  if (!fs.existsSync(registryPath)) return [];
  try {
    const raw = fs.readFileSync(registryPath, "utf8");
    const entries = JSON.parse(raw) as RegistrationEntry[];
    return entries
      .map((e) => e.projectPath)
      .filter((p): p is string => typeof p === "string" && p.length > 0);
  } catch {
    return [];
  }
}

// ─── Sub-project discovery ────────────────────────────────────────────────────

function discoverSubProjects(): string[] {
  const results: string[] = [];
  if (!fs.existsSync(PROJECTS_ROOT)) return results;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(PROJECTS_ROOT, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const projectPath = path.join(PROJECTS_ROOT, entry.name);
    const eventsPath = eventsPathFor(projectPath);
    if (fs.existsSync(eventsPath)) {
      results.push(projectPath);
    }
  }
  return results;
}

// ─── Event class counter ──────────────────────────────────────────────────────

interface EventRow {
  eventId?:  string;
  type?:     string;
  when?:     string;
  payload?:  Record<string, unknown>;
  sequence?: number;
}

export interface ProjectAuditEntry {
  projectPath:   string;
  eventsPath:    string;
  exists:        boolean;
  totalEvents:   number;
  matchingEvents: number;
  matchingRows:  Array<{ eventId?: string; when?: string; sequence?: number }>;
}

export function countEventClass(
  eventsPath: string,
  targetErrorClass: string,
): Pick<ProjectAuditEntry, "totalEvents" | "matchingEvents" | "matchingRows"> {
  if (!fs.existsSync(eventsPath)) {
    return { totalEvents: 0, matchingEvents: 0, matchingRows: [] };
  }

  let raw: string;
  try {
    raw = fs.readFileSync(eventsPath, "utf8");
  } catch {
    return { totalEvents: 0, matchingEvents: 0, matchingRows: [] };
  }

  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  let totalEvents = 0;
  let matchingEvents = 0;
  const matchingRows: Array<{ eventId?: string; when?: string; sequence?: number }> = [];

  for (const line of lines) {
    let row: EventRow;
    try {
      row = JSON.parse(line) as EventRow;
    } catch {
      continue;
    }
    totalEvents++;

    const payload = row.payload;
    if (
      payload &&
      typeof payload === "object" &&
      payload["errorClass"] === targetErrorClass
    ) {
      matchingEvents++;
      matchingRows.push({
        eventId:  row.eventId,
        when:     row.when,
        sequence: row.sequence,
      });
    }
  }

  return { totalEvents, matchingEvents, matchingRows };
}

// ─── Audit runner ─────────────────────────────────────────────────────────────

export interface CrossProjectAuditResult {
  eventClass:     string;
  auditedAt:      string;
  projectEntries: ProjectAuditEntry[];
  totalProjects:  number;
  projectsWithHits: number;
  totalMatchingEvents: number;
  verdict:        "clean" | "hits-found" | "no-data";
}

export function runCrossProjectAudit(eventClass: string): CrossProjectAuditResult {
  const auditedAt = new Date().toISOString();

  // Collect all project roots to check: registered + discovered + monorepo root
  const projectRoots = new Set<string>();

  // 1. Registered projects
  for (const p of readRegisteredProjects()) {
    projectRoots.add(p);
  }

  // 2. Discovered sub-projects (projects/ with events.jsonl)
  for (const p of discoverSubProjects()) {
    projectRoots.add(p);
  }

  // 3. Monorepo root itself
  const monorepoEventsPath = eventsPathFor(MONOREPO_ROOT);
  if (fs.existsSync(monorepoEventsPath)) {
    projectRoots.add(MONOREPO_ROOT);
  }

  const projectEntries: ProjectAuditEntry[] = [];
  let totalMatchingEvents = 0;
  let projectsWithHits = 0;

  for (const projectPath of Array.from(projectRoots).sort()) {
    const eventsPath = eventsPathFor(projectPath);
    const exists = fs.existsSync(eventsPath);

    const counts = exists
      ? countEventClass(eventsPath, eventClass)
      : { totalEvents: 0, matchingEvents: 0, matchingRows: [] };

    projectEntries.push({
      projectPath,
      eventsPath,
      exists,
      ...counts,
    });

    totalMatchingEvents += counts.matchingEvents;
    if (counts.matchingEvents > 0) {
      projectsWithHits++;
    }
  }

  let verdict: CrossProjectAuditResult["verdict"];
  if (projectEntries.length === 0 || projectEntries.every((e) => !e.exists)) {
    verdict = "no-data";
  } else if (totalMatchingEvents === 0) {
    verdict = "clean";
  } else {
    verdict = "hits-found";
  }

  return {
    eventClass,
    auditedAt,
    projectEntries,
    totalProjects:       projectEntries.length,
    projectsWithHits,
    totalMatchingEvents,
    verdict,
  };
}

// ─── Output formatter ─────────────────────────────────────────────────────────

function formatTextReport(result: CrossProjectAuditResult): string {
  const lines: string[] = [
    `cross-project-audit: eventClass="${result.eventClass}"`,
    `  Audited at:      ${result.auditedAt}`,
    `  Projects scanned: ${result.totalProjects}`,
    `  Verdict:          ${result.verdict}`,
    `  Total hits:       ${result.totalMatchingEvents}`,
    `  Projects with hits: ${result.projectsWithHits}`,
    "",
  ];

  for (const entry of result.projectEntries) {
    const status = !entry.exists
      ? "[no events.jsonl]"
      : entry.matchingEvents === 0
        ? "[clean]"
        : `[${entry.matchingEvents} hits]`;
    lines.push(`  ${status} ${entry.projectPath}`);
    if (entry.matchingEvents > 0) {
      for (const row of entry.matchingRows.slice(0, 5)) {
        lines.push(`    - eventId=${row.eventId ?? "??"} when=${row.when ?? "??"}`);
      }
      if (entry.matchingRows.length > 5) {
        lines.push(`    ... and ${entry.matchingRows.length - 5} more`);
      }
    }
  }

  if (result.verdict === "clean") {
    lines.push(
      "",
      `Interpretation: 0 "${result.eventClass}" events across all ${result.totalProjects} projects.`,
      "Either bypass discipline is excellent, or events are outside this project's events.jsonl scope.",
    );
  }

  return lines.join("\n");
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = runCrossProjectAudit(args.eventClass);

  if (args.jsonOutput) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(formatTextReport(result) + "\n");
  }

  if (!args.dryRun) {
    // Emit 5-dim audit event so pm_recap can surface this run in lineage queries.
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:               "post_write",
          passed:              true,
          errorClass:          "cross_project_audit_completed",
          auditEventClass:     args.eventClass,
          totalProjects:       result.totalProjects,
          totalMatchingEvents: result.totalMatchingEvents,
          projectsWithHits:    result.projectsWithHits,
          verdict:             result.verdict,
        } as Record<string, unknown>,
        toolName:  "cross-project-audit",
        cwd:       MONOREPO_ROOT,
        identity:  "monitor",
        memoryLayers: ["procedural"],
        reasoning: `cross-project-audit: scanned ${result.totalProjects} projects for "${args.eventClass}" events — verdict=${result.verdict}, total hits=${result.totalMatchingEvents} (R4-F8 architecture review follow-up)`,
      });
    } catch {
      // best-effort — script must not crash if emit fails
    }
  }
}

main().catch((err) => {
  process.stderr.write(`cross-project-audit: FATAL: ${String(err)}\n`);
  process.exit(1);
});
