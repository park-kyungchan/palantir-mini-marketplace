/**
 * palantir-mini — lib/recap/mcp-first-compliance.ts
 *
 * Shared logic for MCP-First Compliance telemetry.
 * Consumed by:
 *   - scripts/lead-token-audit.ts (CLI)
 *   - bridge/handlers/pm-recap.ts (pm_recap §MCP-First Compliance section)
 *
 * Two event-based modes:
 *   1. Native (lead_mcp_first_compliance events present): count passed vs bypassed.
 *   2. Heuristic (fallback): count MCP impact tool calls vs Edit/Write/MultiEdit calls.
 *
 * Token savings estimate (operating model §4.5.2):
 *   Per passed event: ~25K tokens saved (30K legacy file-read → 5K MCP-first average).
 *
 * Authority: plan inherited-discovering-quill.md §3.B.W5 + §4.5.5
 */

import type { EventEnvelope } from "../event-log/types";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Assumed token savings per MCP-first compliance event (operating model §4.5.2 mid-range). */
export const TOKENS_SAVED_PER_PASSED = 25_000;

/**
 * MCP tool names counted as "MCP-first impact analysis" in heuristic mode.
 * Sourced from plan §3.B.W5 heuristic filter.
 * semantic_change_plan removed (sprint-063 W2.A — handler deleted; use impact_query).
 */
const HEURISTIC_MCP_TOOLS = new Set([
  "mcp__plugin_palantir-mini_palantir-mini__impact_query",
  "mcp__plugin_palantir-mini_palantir-mini__pre_edit_impact",
  "mcp__plugin_palantir-mini_palantir-mini__pm_workflow_lineage_query",
]);

/**
 * Tool names counted as "file edits" in heuristic mode.
 */
const HEURISTIC_EDIT_TOOLS = new Set([
  "Edit",
  "Write",
  "MultiEdit",
]);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface McpFirstBucket {
  /** Sprint number or day label (YYYY-MM-DD). */
  label: string;
  passed: number;
  bypassed: number;
  ratio: number;
  estimatedTokensSaved: number;
  mode: "native" | "heuristic";
}

export interface McpFirstComplianceResult {
  totalPassed: number;
  totalBypassed: number;
  ratio: number;
  estimatedTokensSaved: number;
  mode: "native" | "heuristic";
  /** Per-sprint or per-day buckets when bucketing is requested. */
  buckets: McpFirstBucket[];
  /** Top-3 RIDs extracted from impact_query / semantic_change_plan payloads. */
  topRids: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract sprint number from sprint_contract_bound event payload.
 * Returns "sprint-NNN" label or null when not determinable.
 */
function sprintLabelFromEvent(ev: EventEnvelope): string | null {
  if (ev.type === "sprint_contract_bound") {
    const n = (ev.payload as { sprintNumber?: unknown }).sprintNumber;
    if (typeof n === "number") return `sprint-${String(n).padStart(3, "0")}`;
  }
  return null;
}

/**
 * Assign sprint label to an event by the most recently seen sprint_contract_bound
 * before it in chronological order. Returns "unassigned" when none found.
 */
function buildSprintIndex(events: readonly EventEnvelope[]): Map<number, string> {
  const idx = new Map<number, string>();
  let currentSprint = "unassigned";
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev) continue;
    const label = sprintLabelFromEvent(ev);
    if (label !== null) currentSprint = label;
    idx.set(i, currentSprint);
  }
  return idx;
}

/** Extract RIDs from impact_query / pre_edit_impact event payloads. */
function extractRids(events: readonly EventEnvelope[]): string[] {
  const ridSet = new Map<string, number>();

  for (const ev of events) {
    const payload = (ev as unknown as Record<string, unknown>).payload as Record<string, unknown> | undefined;
    if (!payload) continue;

    // tool_invocation_completed carries toolName in payload
    if (ev.type === "tool_invocation_completed") {
      const toolName = String(payload.toolName ?? "");
      if (
        toolName.includes("impact_query") ||
        toolName.includes("pre_edit_impact")
      ) {
        // No RID in tool_invocation_completed; skip
        continue;
      }
    }

    // phase_completed with phaseTag containing rid or objectRid
    const objectRid = payload.objectRid ?? payload.rid ?? payload.targetRid;
    if (typeof objectRid === "string" && objectRid.length > 0) {
      ridSet.set(objectRid, (ridSet.get(objectRid) ?? 0) + 1);
    }

    // impact_query / pre_edit_impact payloads may carry rids array or targetRid
    const rids = payload.rids ?? payload.affectedRids;
    if (Array.isArray(rids)) {
      for (const r of rids) {
        if (typeof r === "string" && r.length > 0) {
          ridSet.set(r, (ridSet.get(r) ?? 0) + 1);
        }
      }
    }
  }

  return [...ridSet.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([rid]) => rid);
}

// ─── Core computation ────────────────────────────────────────────────────────

/**
 * Compute MCP-First Compliance metrics from a slice of events.
 *
 * @param events - Pre-filtered event slice (sprint window or time window).
 * @param bucketBy - "sprint" groups by sprint_contract_bound; "day" groups by YYYY-MM-DD; undefined = no bucketing.
 */
export function computeMcpFirstCompliance(
  events: readonly EventEnvelope[],
  bucketBy?: "sprint" | "day",
): McpFirstComplianceResult {
  // ── Mode detection ─────────────────────────────────────────────────────────
  const nativeEvents = events.filter(
    (ev) =>
      ev.type === "phase_completed" &&
      (ev.payload as { phaseTag?: string }).phaseTag?.startsWith("lead_mcp_first_compliance"),
  );

  const hasNative = nativeEvents.length > 0;
  const mode: "native" | "heuristic" = hasNative ? "native" : "heuristic";

  // ── Count ─────────────────────────────────────────────────────────────────
  let totalPassed = 0;
  let totalBypassed = 0;

  if (hasNative) {
    for (const ev of nativeEvents) {
      const tag = (ev.payload as { phaseTag?: string }).phaseTag ?? "";
      // Exact match on canonical tag names to avoid "bypassed".endsWith("passed") false positive
      if (tag.endsWith("_passed") && !tag.endsWith("_bypassed")) {
        totalPassed++;
      } else if (tag.endsWith("_bypassed")) {
        totalBypassed++;
      }
    }
  } else {
    // Heuristic: tool_invocation_completed or phase_completed phaseTag containing tool names
    for (const ev of events) {
      if (ev.type === "tool_invocation_completed") {
        const toolName = String(
          (ev.payload as { toolName?: unknown }).toolName ?? "",
        );
        if (HEURISTIC_MCP_TOOLS.has(toolName)) totalPassed++;
        else if (HEURISTIC_EDIT_TOOLS.has(toolName)) totalBypassed++;
      }
    }
  }

  const total = totalPassed + totalBypassed;
  const ratio = total > 0 ? totalPassed / total : 0;
  const estimatedTokensSaved = totalPassed * TOKENS_SAVED_PER_PASSED;

  // ── Bucket computation ────────────────────────────────────────────────────
  let buckets: McpFirstBucket[] = [];

  if (bucketBy === "sprint") {
    const sprintIdx = buildSprintIndex(events);
    const bucketMap = new Map<string, { passed: number; bypassed: number }>();

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (!ev) continue;
      const label = sprintIdx.get(i) ?? "unassigned";
      if (!bucketMap.has(label)) bucketMap.set(label, { passed: 0, bypassed: 0 });
      const b = bucketMap.get(label)!;

      if (hasNative) {
        if (
          ev.type === "phase_completed" &&
          (ev.payload as { phaseTag?: string }).phaseTag?.startsWith("lead_mcp_first_compliance")
        ) {
          const tag = (ev.payload as { phaseTag?: string }).phaseTag ?? "";
          if (tag.endsWith("_passed") && !tag.endsWith("_bypassed")) b.passed++;
          else if (tag.endsWith("_bypassed")) b.bypassed++;
        }
      } else {
        if (ev.type === "tool_invocation_completed") {
          const toolName = String(
            (ev.payload as { toolName?: unknown }).toolName ?? "",
          );
          if (HEURISTIC_MCP_TOOLS.has(toolName)) b.passed++;
          else if (HEURISTIC_EDIT_TOOLS.has(toolName)) b.bypassed++;
        }
      }
    }

    buckets = [...bucketMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, b]) => {
        const t = b.passed + b.bypassed;
        return {
          label,
          passed: b.passed,
          bypassed: b.bypassed,
          ratio: t > 0 ? b.passed / t : 0,
          estimatedTokensSaved: b.passed * TOKENS_SAVED_PER_PASSED,
          mode,
        };
      });
  } else if (bucketBy === "day") {
    const dayMap = new Map<string, { passed: number; bypassed: number }>();

    for (const ev of events) {
      const day = typeof ev.when === "string" ? ev.when.slice(0, 10) : null;
      if (!day) continue;
      if (!dayMap.has(day)) dayMap.set(day, { passed: 0, bypassed: 0 });
      const b = dayMap.get(day)!;

      if (hasNative) {
        if (
          ev.type === "phase_completed" &&
          (ev.payload as { phaseTag?: string }).phaseTag?.startsWith("lead_mcp_first_compliance")
        ) {
          const tag = (ev.payload as { phaseTag?: string }).phaseTag ?? "";
          if (tag.endsWith("_passed") && !tag.endsWith("_bypassed")) b.passed++;
          else if (tag.endsWith("_bypassed")) b.bypassed++;
        }
      } else {
        if (ev.type === "tool_invocation_completed") {
          const toolName = String(
            (ev.payload as { toolName?: unknown }).toolName ?? "",
          );
          if (HEURISTIC_MCP_TOOLS.has(toolName)) b.passed++;
          else if (HEURISTIC_EDIT_TOOLS.has(toolName)) b.bypassed++;
        }
      }
    }

    buckets = [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, b]) => {
        const t = b.passed + b.bypassed;
        return {
          label,
          passed: b.passed,
          bypassed: b.bypassed,
          ratio: t > 0 ? b.passed / t : 0,
          estimatedTokensSaved: b.passed * TOKENS_SAVED_PER_PASSED,
          mode,
        };
      });
  }

  const topRids = extractRids(events);

  return {
    totalPassed,
    totalBypassed,
    ratio,
    estimatedTokensSaved,
    mode,
    buckets,
    topRids,
  };
}

/**
 * Filter events to a specific sprint number by matching sprint_contract_bound events.
 * Returns all events between the sprint's first sprint_contract_bound and the next one (or end).
 */
export function filterToSprint(
  events: readonly EventEnvelope[],
  sprintNumber: number,
): EventEnvelope[] {
  let startIdx = -1;
  let endIdx = events.length;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev) continue;
    if (ev.type === "sprint_contract_bound") {
      const n = (ev.payload as { sprintNumber?: unknown }).sprintNumber;
      if (typeof n === "number") {
        if (n === sprintNumber && startIdx === -1) {
          startIdx = i;
        } else if (n !== sprintNumber && startIdx !== -1) {
          endIdx = i;
          break;
        }
      }
    }
  }

  if (startIdx === -1) return [];
  return events.slice(startIdx, endIdx) as EventEnvelope[];
}

/**
 * Filter events to the last N days.
 */
export function filterToLastNDays(
  events: readonly EventEnvelope[],
  days: number,
): EventEnvelope[] {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  return events.filter((ev) => {
    const ts = new Date(ev.when).getTime();
    return !isNaN(ts) && ts >= cutoffMs;
  }) as EventEnvelope[];
}

/**
 * Render a McpFirstComplianceResult as a markdown section.
 * Used by both the CLI script and pm-recap handler.
 */
export function renderMcpFirstComplianceSection(
  result: McpFirstComplianceResult,
  label?: string,
): string {
  const target = "≥80% per rule 12 v3.10.0";
  const modeNote = result.mode === "heuristic" ? " (heuristic — no native events yet)" : "";
  const ratioStr = `${(result.ratio * 100).toFixed(1)}%`;
  const savedStr = result.estimatedTokensSaved > 0
    ? `~${(result.estimatedTokensSaved / 1000).toFixed(0)}K`
    : "0";

  const lines: string[] = [];
  if (label) {
    lines.push(`## §MCP-First Compliance — ${label}`);
  } else {
    lines.push("## §MCP-First Compliance");
  }
  lines.push(`- ratio: ${ratioStr}${modeNote} (${result.totalPassed} of ${result.totalPassed + result.totalBypassed} impact questions used MCP)`);
  lines.push(`- estimated tokens saved: ${savedStr} (vs file-read baseline)`);
  if (result.topRids.length > 0) {
    lines.push(`- top-3 RIDs queried: ${result.topRids.join(", ")}`);
  } else {
    lines.push("- top-3 RIDs queried: (none recorded)");
  }
  lines.push(`- target: ${target}`);

  if (result.buckets.length > 0) {
    lines.push("");
    lines.push("| Label | Passed | Bypassed | Ratio | Tokens Saved |");
    lines.push("|-------|--------|----------|-------|--------------|");
    for (const b of result.buckets) {
      lines.push(
        `| ${b.label} | ${b.passed} | ${b.bypassed} | ${(b.ratio * 100).toFixed(1)}% | ~${(b.estimatedTokensSaved / 1000).toFixed(0)}K |`,
      );
    }
  }

  return lines.join("\n");
}
