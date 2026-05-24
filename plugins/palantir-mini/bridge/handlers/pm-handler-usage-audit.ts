// palantir-mini v4.6.0 — pm_handler_usage_audit MCP handler (sprint-047 W2.B)
// Domain: LEARN (handler usage statistics for Vercel-style tool pruning decision)
//
// Reads two event sources:
//   1. Plugin-self events.jsonl (tool_invocation_completed) — primary MCP dispatch telemetry.
//   2. Project events.jsonl (validation_phase_completed errorClass=agent_decision_logged) — agent decision trail.
//
// Merges both sources by toolName, groups by tool, counts usage in a rolling window.
// Flags deprecation candidates (Vercel "remove 80%" rule):
//   usage_count_Nd < 5 AND toolName in SUBSUMABLE_BY_DEFAULT set.
//
// Authority:
//   ~/.claude/research/harness-engineering-2026/ (Vercel "remove 80%" + Manus 5x rewrites)
//   ~/.claude/plans/mellow-plotting-oasis.md §Wave 2 W2.B
//   rule 26 §Axis E (procedural + semantic memory layers)

import * as path from "path";
import { readEvents } from "../../lib/event-log/read";
import { emit } from "../../scripts/log";
import type { EventEnvelope } from "../../lib/event-log/types";
import { DEPRECATION_MAP, formatRemovalAdvisory } from "./_deprecation-map";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PmHandlerUsageAuditArgs {
  /** Absolute project root — required. */
  project: string;
  /** Rolling window in days (default 30). */
  windowDays?: number;
  /** Emit mcp_handler_audit_completed event after computing (default true). */
  emitEvent?: boolean;
}

export interface HandlerStats {
  toolName: string;
  usageCount: number;
  lastUsedIso: string | null;
  sources: { projectLog: number; pluginSelf: number };
  deprecationCandidate: boolean;
  reason?: string;
}

export interface PmHandlerUsageAuditResult {
  windowDays: number;
  windowStart: string;
  totalHandlers: number;
  totalUsages: number;
  perHandler: HandlerStats[];
  deprecationCandidateCount: number;
  /** Removed tools surfaced from DEPRECATION_MAP for any tool names seen in events. */
  removedToolAdvisories?: string[];
}

// ─── Subsumable set (initial heuristic — Vercel "80% removal" audit seed) ────
//
// These are handlers whose functionality can be covered by:
//   Read, Grep, Bash, or 5-7 high-value ontology MCP tools.
// Populated from actual 30d usage (≥5 threshold) + behavioral subsumability analysis.
// Refine via audit output — this list seeds the first run.
const SUBSUMABLE_BY_DEFAULT = new Set<string>([
  "pm_workflow_lineage_query",   // covered by Grep + readEvents + pm_retro_query
  "pm_agent_lineage_export",     // covered by readEvents + Bash jq pipeline
  "replay_lineage",              // covered by readEvents direct
  "pm_event_query_by_grade",     // covered by readEvents + filter in Bash
  "pm_learn_query",              // covered by Grep ~/.claude/plans/ + Bash
  "pm_retro_query",              // covered by Grep + readEvents
  "pm_portable_bundle_manifest", // covered by Bash ls + jq
  "research_context_select",     // covered by Read + Grep ~/.claude/research/
]);

// ─── Path helpers ─────────────────────────────────────────────────────────────

/** Resolve plugin-self events.jsonl path (tool_invocation_completed telemetry). */
function pluginSelfEventsPath(): string {
  // This handler runs as part of the palantir-mini plugin.
  // import.meta.dir = bridge/handlers → two levels up = plugin root.
  const pluginRoot = path.resolve(import.meta.dir, "..", "..");
  return path.join(pluginRoot, ".palantir-mini", "session", "events.jsonl");
}

/** Resolve project events.jsonl path. */
function projectEventsPath(project: string): string {
  return path.join(project, ".palantir-mini", "session", "events.jsonl");
}

// ─── Event reading + filtering ────────────────────────────────────────────────

interface UsageRow {
  toolName: string;
  when: string;
  source: "plugin-self" | "project";
}

function extractUsageRows(
  events: EventEnvelope[],
  source: "plugin-self" | "project",
  windowStart: string,
): UsageRow[] {
  const rows: UsageRow[] = [];
  for (const ev of events) {
    const when = ev.when ?? "";
    if (typeof when === "string" && when < windowStart) continue;

    let toolName: string | undefined;

    if (source === "plugin-self" && ev.type === "tool_invocation_completed") {
      const p = ev.payload as Record<string, unknown> | undefined;
      const t = p?.toolName;
      if (typeof t === "string" && t.length > 0) toolName = t;
    } else if (source === "project" && ev.type === "validation_phase_completed") {
      const p = ev.payload as Record<string, unknown> | undefined;
      if (p?.errorClass === "agent_decision_logged") {
        const t = p?.toolName;
        if (typeof t === "string" && t.length > 0) {
          // Normalize MCP namespaced name: mcp__<server-prefix>__<tool> → <tool>.
          // Server prefix can contain single underscores (e.g. plugin_palantir-mini_palantir-mini),
          // so we slice on the LAST `__` separator rather than enforcing 3 segments.
          if (t.startsWith("mcp__")) {
            const lastSep = t.lastIndexOf("__");
            toolName = lastSep > 4 ? t.slice(lastSep + 2) : t;
          } else {
            toolName = t;
          }
        }
      }
    }

    if (toolName !== undefined) {
      rows.push({ toolName, when, source });
    }
  }
  return rows;
}

// ─── Core logic (exported for tests) ─────────────────────────────────────────

export function computeStats(
  rows: UsageRow[],
  windowDays: number,
  windowStart: string,
): PmHandlerUsageAuditResult {
  // Group by toolName
  const byTool = new Map<
    string,
    { usageCount: number; lastUsedIso: string | null; pluginSelf: number; projectLog: number }
  >();

  for (const row of rows) {
    const existing = byTool.get(row.toolName);
    if (!existing) {
      byTool.set(row.toolName, {
        usageCount: 1,
        lastUsedIso: row.when,
        pluginSelf: row.source === "plugin-self" ? 1 : 0,
        projectLog: row.source === "project" ? 1 : 0,
      });
    } else {
      existing.usageCount += 1;
      if (row.when > (existing.lastUsedIso ?? "")) existing.lastUsedIso = row.when;
      if (row.source === "plugin-self") existing.pluginSelf += 1;
      else existing.projectLog += 1;
    }
  }

  // Build sorted output: most-used first
  const perHandler: HandlerStats[] = Array.from(byTool.entries())
    .sort((a, b) => b[1].usageCount - a[1].usageCount)
    .map(([toolName, stats]) => {
      const isSubsumable = SUBSUMABLE_BY_DEFAULT.has(toolName);
      const isLowUsage = stats.usageCount < 5;
      const deprecationCandidate = isLowUsage && isSubsumable;
      const entry: HandlerStats = {
        toolName,
        usageCount: stats.usageCount,
        lastUsedIso: stats.lastUsedIso,
        sources: { projectLog: stats.projectLog, pluginSelf: stats.pluginSelf },
        deprecationCandidate,
      };
      if (deprecationCandidate) {
        entry.reason = `usageCount=${stats.usageCount} < 5 AND subsumable by Read/Grep/Bash or high-value ontology tools`;
      }
      return entry;
    });

  const totalUsages = rows.length;
  const deprecationCandidateCount = perHandler.filter((h) => h.deprecationCandidate).length;

  return {
    windowDays,
    windowStart,
    totalHandlers: perHandler.length,
    totalUsages,
    perHandler,
    deprecationCandidateCount,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function pmHandlerUsageAudit(
  rawArgs: unknown,
): Promise<PmHandlerUsageAuditResult> {
  const args = (rawArgs ?? {}) as PmHandlerUsageAuditArgs;

  if (!args.project || typeof args.project !== "string") {
    throw new Error("pm_handler_usage_audit: `project` is required");
  }

  const windowDays = typeof args.windowDays === "number" && args.windowDays > 0
    ? args.windowDays
    : 30;
  const emitEventFlag = args.emitEvent !== false; // default true

  const windowStart = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // 1. Read plugin-self tool_invocation_completed (primary handler usage telemetry)
  const pluginEventsPath = pluginSelfEventsPath();
  const pluginEvents = readEvents(pluginEventsPath);
  const pluginRows = extractUsageRows(pluginEvents, "plugin-self", windowStart);

  // 2. Read project agent_decision_logged (agent-initiated tool calls)
  const projEventsPath = projectEventsPath(args.project);
  const projectEvents = readEvents(projEventsPath);
  const projectRows = extractUsageRows(projectEvents, "project", windowStart);

  // 3. Merge + compute stats
  const allRows: UsageRow[] = [...pluginRows, ...projectRows];
  const result = computeStats(allRows, windowDays, windowStart);

  // 3b. Surface removal advisories for any removed tool names seen in event logs.
  // Callers invoking removed tools deserve a clear "use X instead" message.
  const removedToolAdvisories: string[] = [];
  const seenToolNames = new Set(allRows.map((r) => r.toolName));
  for (const { removed } of DEPRECATION_MAP) {
    if (seenToolNames.has(removed)) {
      const advisory = formatRemovalAdvisory(removed);
      if (advisory) removedToolAdvisories.push(advisory);
    }
  }
  if (removedToolAdvisories.length > 0) {
    (result as PmHandlerUsageAuditResult).removedToolAdvisories = removedToolAdvisories;
  }

  // 4. Emit mcp_handler_audit_completed event (T3 — Contractual + Verifiable + Refining + Memory-mapped)
  if (emitEventFlag) {
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "post_write",
          passed: true,
          errorClass: "mcp_handler_audit_completed",
          windowDays,
          windowStart,
          totalHandlers: result.totalHandlers,
          totalUsages: result.totalUsages,
          deprecationCandidateCount: result.deprecationCandidateCount,
          sources: {
            pluginSelf: pluginRows.length,
            projectLog: projectRows.length,
          },
        } as Record<string, unknown>,
        toolName: "pm_handler_usage_audit",
        cwd: args.project,
        identity: "monitor",
        memoryLayers: ["procedural", "semantic"],
        reasoning:
          `pm_handler_usage_audit: window=${windowDays}d ` +
          `handlers=${result.totalHandlers} usages=${result.totalUsages} ` +
          `deprecation_candidates=${result.deprecationCandidateCount} ` +
          `(Vercel-style "remove 80%" audit — sprint-047 W2.B)`,
        hypothesis:
          `${result.deprecationCandidateCount} handlers subsumable by Read/Grep/Bash; ` +
          `Wave 4 deletion would reduce handler surface by ~${result.deprecationCandidateCount}/${result.totalHandlers}`,
      });
    } catch {
      // best-effort — never fail the audit on emit error
    }
  }

  return result;
}
