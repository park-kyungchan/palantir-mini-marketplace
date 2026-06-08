// palantir-mini PR-13 — Hook enforcement level
//   enforcement: advisory
//   rationale:   async:true in hooks.json; emits advisory when Lead edits without prior ontology discovery; does not block tool execution.
// palantir-mini v4.15.0 — lead-ontology-discovery-completeness hook (sprint-063 W2.B)
// Fires on: PreToolUse(Edit|Write|MultiEdit|NotebookEdit) — BLOCKING MODE (promoted sprint-063 W2.B)
//
// PURPOSE: Detect when Lead is about to edit a file without having first run an
// ontology discovery MCP call (impact_query plus ontology_context_query or pm_substrate_query) for the
// target file's RID neighborhood within the last 5 minutes.
//
// SPRINT-062 W1: ADVISORY mode only. Returns additionalContext (NEVER permissionDecision: deny).
// SPRINT-063 W2.B: BLOCKING — impact_query plus current context/substrate evidence required.
//   semantic_change_plan removed (broken per user directive 2026-05-09).
//   Returns permissionDecision: deny when BOTH tools absent in last 5 min.
//
// Logic:
//   1. Extract file_path from tool_input.
//   2. Synthesis path exemption: skip <project>/.palantir-mini/plan/**,
//      legacy ~/.claude/plans/**, BROWSE.md, INDEX.md, MEMORY.md,
//      retro/cold-start drafts → return continue immediately.
//   3. Small-file exemption: if edit delta ≤5 LOC (old_string + new_string) → continue.
//   4. Find project root (.palantir-mini/ ancestor).
//   5. Read last 100 events from project events.jsonl.
//   6. Check for recent (≤5 min) MCP call matching discovery tools.
//   7. If no match found: emit blocking event + return permissionDecision: deny.
//
// Discovery tools checked (sprint-063 W2.B active list — semantic_change_plan removed):
//   - impact_query (required for RID blast-radius)
//   - ontology_context_query or pm_substrate_query (required for context/substrate evidence)
//   - get_ontology (fallback — satisfies ontology snapshot requirement)
//   - pm_intent_router (sprint-063 W3 new skill; satisfies all)
//   - intent_to_ontology_skill_invoked (pm-intent-to-ontology skill completion event)
//
// BLOCKING criteria (sprint-063 W2.B):
//   Block when BOTH impact_query AND context/substrate evidence are absent in last 5 min.
//   Any other discovery tool (get_ontology, pm_intent_router, etc.) satisfies on its own.
//
// Bypass: PALANTIR_MINI_INTENT_PROTOCOL_BYPASS=1 (audited via intent_protocol_bypass_invoked)
//
// sprint-063 W2.B (the former Lead-Protocol policy v3.12.0): BLOCKING — required impact_query + context/substrate evidence
//   (semantic_change_plan removed)
//
// Authority: sprint-063 W2.B; the former Lead-Protocol policy v3.10.0 §MCP-First protocol;
//            rule 26 §Axis E (procedural + semantic).

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { findProjectRoot } from "../lib/project/find-root";
import { readEvents } from "../lib/event-log/read";
import { eventsPathFor } from "../scripts/log";
import { isPlanArtifactPath } from "../lib/plan-root/resolve-plan-root";

// ─── Config ───────────────────────────────────────────────────────────────────

/** 5-minute discovery window in milliseconds. */
const DISCOVERY_WINDOW_MS = 5 * 60 * 1000;

/** Maximum events to scan (last N rows). */
const MAX_EVENTS_SCAN = 100;

/**
 * MCP tool names that satisfy the ontology discovery requirement.
 *
 * SPRINT-063 W2.B: Added impact_query + context/substrate evidence requirement.
 *   semantic_change_plan removed (broken per user directive 2026-05-09).
 *   Any tool from this set satisfies the discovery check on its own.
 *   BLOCKING triggers only when BOTH impact_query AND context/substrate evidence are absent.
 */
const DISCOVERY_TOOL_NAMES = new Set([
  "impact_query",
  "ontology_context_query",
  "get_ontology",
  "pm_substrate_query",
  "pm_intent_router",
  "pm_semantic_intent_gate",
  // MCP-prefixed forms
  "mcp__plugin_palantir-mini_palantir-mini__impact_query",
  "mcp__plugin_palantir-mini_palantir-mini__ontology_context_query",
  "mcp__plugin_palantir-mini_palantir-mini__get_ontology",
  "mcp__plugin_palantir-mini_palantir-mini__pm_substrate_query",
  "mcp__plugin_palantir-mini_palantir-mini__pm_intent_router",
  "mcp__plugin_palantir-mini_palantir-mini__pm_semantic_intent_gate",
  // Codex palantir-mini MCP namespace aliases. These are evidence-name aliases
  // only; they do not imply native Codex hook parity.
  "mcp__palantir_mini__impact_query",
  "mcp__palantir_mini__ontology_context_query",
  "mcp__palantir_mini__get_ontology",
  "mcp__palantir_mini__pm_substrate_query",
  "mcp__palantir_mini__pm_intent_router",
  "mcp__palantir_mini__pm_semantic_intent_gate",
  "mcp__palantir_mini__.impact_query",
  "mcp__palantir_mini__.ontology_context_query",
  "mcp__palantir_mini__.get_ontology",
  "mcp__palantir_mini__.pm_substrate_query",
  "mcp__palantir_mini__.pm_intent_router",
  "mcp__palantir_mini__.pm_semantic_intent_gate",
]);

/**
 * Tool names that SPECIFICALLY satisfy the impact_query leg of the BLOCKING criteria.
 * sprint-063 W2.B: BLOCKING fires only when BOTH impact_query AND context/substrate evidence
 * are absent. If either is present, the hook passes.
 */
const IMPACT_TOOL_NAMES = new Set([
  "impact_query",
  "mcp__plugin_palantir-mini_palantir-mini__impact_query",
  "mcp__palantir_mini__impact_query",
  "mcp__palantir_mini__.impact_query",
]);

/**
 * Tool names that SPECIFICALLY satisfy the context/substrate evidence leg.
 */
const CONTEXT_TOOL_NAMES = new Set([
  "ontology_context_query",
  "pm_substrate_query",
  "pm_intent_router",
  "pm_semantic_intent_gate",
  "mcp__plugin_palantir-mini_palantir-mini__ontology_context_query",
  "mcp__plugin_palantir-mini_palantir-mini__pm_substrate_query",
  "mcp__plugin_palantir-mini_palantir-mini__pm_intent_router",
  "mcp__plugin_palantir-mini_palantir-mini__pm_semantic_intent_gate",
  "mcp__palantir_mini__ontology_context_query",
  "mcp__palantir_mini__pm_substrate_query",
  "mcp__palantir_mini__pm_intent_router",
  "mcp__palantir_mini__pm_semantic_intent_gate",
  "mcp__palantir_mini__.ontology_context_query",
  "mcp__palantir_mini__.pm_substrate_query",
  "mcp__palantir_mini__.pm_intent_router",
  "mcp__palantir_mini__.pm_semantic_intent_gate",
]);

/** Event type emitted when pm-intent-to-ontology skill completes (satisfies discovery). */
const INTENT_TO_ONTOLOGY_SKILL_EVENT_CLASS = "intent_to_ontology_protocol_advised";

/** Maximum edit LOC delta that exempts the hook (small-file exemption). */
const SMALL_FILE_LOC_THRESHOLD = 5;

/**
 * Synthesis path patterns that are always exempt from ontology discovery.
 * These are internal palantir-mini planning/docs files where discovery is unnecessary.
 */
const SYNTHESIS_PATH_PATTERNS: RegExp[] = [
  /\/BROWSE\.md$/,
  /\/INDEX\.md$/,
  /\/MEMORY\.md$/,
  /\/retro[-_]/,
  /\/cold-start[-_]/,
  /retrospective/i,
  /blueprint/i,
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface HookPayload {
  session_id?:    string;
  cwd?:           string;
  tool_name?:     string;
  tool_input?: {
    file_path?:     string;
    notebook_path?: string;
    path?:          string;
    old_string?:    string;
    new_string?:    string;
    // Write tool
    content?:       string;
  };
}

interface HookResult {
  message:            string;
  additionalContext?: string;
  hookSpecificOutput?: {
    permissionDecision?:       "deny" | "allow";
    permissionDecisionReason?: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve absolute path, expanding ~ prefix. */
function resolveAbsPath(filePath: string): string {
  const home = process.env.HOME ?? "/home/palantirkc";
  if (filePath.startsWith("~/")) {
    return path.resolve(home, filePath.slice(2));
  }
  return path.resolve(filePath);
}

/** Check if the file path is a synthesis/docs exempt path. */
function isSynthesisPath(absFilePath: string, cwd = process.cwd()): boolean {
  if (isPlanArtifactPath(absFilePath, { projectRoot: cwd, cwd })) return true;
  for (const pattern of SYNTHESIS_PATH_PATTERNS) {
    if (pattern.test(absFilePath)) return true;
  }
  return false;
}

/** Count lines in a string (for small-file exemption). */
function countLines(text: string | undefined): number {
  if (!text || text.trim().length === 0) return 0;
  return text.split("\n").length;
}

/**
 * Result of scanning recent events for discovery calls.
 * sprint-063 W2.B: BLOCKING fires only when BOTH hasImpact AND hasContext are false.
 * If any other discovery tool is found (hasAny=true), hook passes regardless.
 */
interface DiscoveryCallResult {
  hasAny:     boolean; // any DISCOVERY_TOOL_NAMES hit
  hasImpact:  boolean; // impact_query specifically
  hasContext: boolean; // ontology_context_query / pm_substrate_query / router gate evidence
}

/**
 * Check if a recent (≤DISCOVERY_WINDOW_MS) ontology discovery MCP call exists
 * for this file's RID neighborhood in the project's events.jsonl.
 *
 * sprint-063 W2.B: returns granular result so caller can decide BLOCKING criteria:
 *   Block when hasImpact=false AND hasContext=false AND hasAny=false.
 */
function hasDiscoveryCall(projectRoot: string): DiscoveryCallResult {
  const result: DiscoveryCallResult = { hasAny: false, hasImpact: false, hasContext: false };
  try {
    const eventsPath = eventsPathFor(projectRoot);
    if (!fs.existsSync(eventsPath)) return result;

    const all    = readEvents(eventsPath);
    const cutoff = Date.now() - DISCOVERY_WINDOW_MS;

    // Scan last MAX_EVENTS_SCAN events
    const recent = all.slice(-MAX_EVENTS_SCAN);

    for (const evt of recent) {
      const evtWhen = new Date(evt.when).getTime();
      if (evtWhen < cutoff) continue;

      // A. Check throughWhich.toolName
      const toolName = (evt as unknown as { throughWhich?: { toolName?: string } })
        .throughWhich?.toolName ?? "";
      if (DISCOVERY_TOOL_NAMES.has(toolName)) {
        result.hasAny = true;
        if (IMPACT_TOOL_NAMES.has(toolName))  result.hasImpact = true;
        if (CONTEXT_TOOL_NAMES.has(toolName)) result.hasContext = true;
      }

      // B. Check validation_phase_completed with intent_to_ontology_protocol_advised errorClass
      if (evt.type === "validation_phase_completed") {
        const errorClass = (evt.payload as Record<string, unknown>)?.errorClass;
        if (errorClass === INTENT_TO_ONTOLOGY_SKILL_EVENT_CLASS) {
          result.hasAny = result.hasImpact = result.hasContext = true;
        }
      }

      // C. Check skill_started with pm-intent-to-ontology
      if (evt.type === "skill_started") {
        const skillName = (evt.payload as Record<string, unknown>)?.skillName;
        if (skillName === "pm-intent-to-ontology") {
          result.hasAny = result.hasImpact = result.hasContext = true;
        }
      }
    }
  } catch {
    // best-effort: if we can't read events, treat as no match (blocking fires)
  }
  return result;
}

// ─── Advisory text ────────────────────────────────────────────────────────────

function buildDenyReason(relPath: string, hasImpact: boolean, hasContext: boolean): string {
  const missingTools: string[] = [];
  if (!hasImpact)  missingTools.push("impact_query");
  if (!hasContext) missingTools.push("ontology_context_query or pm_substrate_query");

  return [
    `palantir-mini Intent-to-Ontology BLOCKED: ontology discovery incomplete for ${relPath}.`,
    ``,
    `sprint-063 W2.B (the former Lead-Protocol policy v3.12.0): BLOCKING — required evidence missing: ${missingTools.join(" + ")}`,
    ``,
    `Call impact_query plus ontology_context_query or pm_substrate_query within 5 min BEFORE this edit.`,
    ``,
    `Run BEFORE editing:`,
    `  mcp__plugin_palantir-mini_palantir-mini__impact_query({"rid": "file:${relPath}", "depth": 3})`,
    `  mcp__plugin_palantir-mini_palantir-mini__ontology_context_query({"project": "<projectRoot>", "scopePaths": ["${relPath}"]})`,
    `  # or: mcp__plugin_palantir-mini_palantir-mini__pm_substrate_query({"project": "<projectRoot>", "mode": "lineage"})`,
    ``,
    `Or use the shortcut (satisfies both):`,
    `  /palantir-mini:pm-intent-to-ontology "<intent>" ${relPath}`,
    ``,
    `Bypass: PALANTIR_MINI_INTENT_PROTOCOL_BYPASS=1 (audited).`,
  ].join("\n");
}

// ─── Hook entry point ─────────────────────────────────────────────────────────

// SPRINT-062 W1: ADVISORY mode only.
// SPRINT-063 W2.B: BLOCKING — permissionDecision: deny when impact_query AND context/substrate evidence
//   are both absent in last 5 min. semantic_change_plan removed entirely.

export default async function leadOntologyDiscoveryCompleteness(
  payload: unknown,
): Promise<HookResult> {
  const p         = (payload ?? {}) as HookPayload;
  const cwd       = p.cwd ?? process.cwd();
  const sessionId = p.session_id;
  const toolName  = p.tool_name ?? "unknown";

  try {
    // ── Bypass ────────────────────────────────────────────────────────────────
    if (process.env.PALANTIR_MINI_INTENT_PROTOCOL_BYPASS === "1") {
      try {
        await emit({
          type:    "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     true,
            errorClass: "intent_protocol_bypass_invoked",
          },
          toolName:     "PALANTIR_MINI_INTENT_PROTOCOL_BYPASS",
          cwd,
          sessionId,
          identity:     "monitor",
          memoryLayers: ["working"],
          reasoning:    `lead-ontology-discovery-completeness: bypass via PALANTIR_MINI_INTENT_PROTOCOL_BYPASS=1 (tool=${toolName}). Audited per sprint-062 Phase 2 W1-alpha.`,
        });
      } catch { /* best-effort */ }
      return { message: "palantir-mini: lead-ontology-discovery-completeness BYPASS (env)" };
    }

    // ── Extract file path ─────────────────────────────────────────────────────
    const rawFilePath =
      p.tool_input?.file_path ??
      p.tool_input?.notebook_path ??
      p.tool_input?.path;

    if (!rawFilePath || typeof rawFilePath !== "string" || rawFilePath.trim().length === 0) {
      return { message: "palantir-mini: lead-ontology-discovery-completeness skipped (no file_path)" };
    }

    const absFilePath = resolveAbsPath(rawFilePath);

    // ── Synthesis path exemption ───────────────────────────────────────────────
    if (isSynthesisPath(absFilePath, cwd)) {
      return {
        message: `palantir-mini: lead-ontology-discovery-completeness skipped (synthesis path: ${rawFilePath})`,
      };
    }

    // ── Small-file exemption ──────────────────────────────────────────────────
    const oldLines = countLines(p.tool_input?.old_string);
    const newLines = countLines(p.tool_input?.new_string ?? p.tool_input?.content);
    const deltaLoc = oldLines + newLines;

    if (deltaLoc > 0 && deltaLoc <= SMALL_FILE_LOC_THRESHOLD) {
      return {
        message: `palantir-mini: lead-ontology-discovery-completeness skipped (small edit: ${deltaLoc} LOC ≤ ${SMALL_FILE_LOC_THRESHOLD})`,
      };
    }

    // ── Find project root ─────────────────────────────────────────────────────
    const projectRoot = findProjectRoot(absFilePath) ?? findProjectRoot(cwd);
    if (!projectRoot) {
      return {
        message: `palantir-mini: lead-ontology-discovery-completeness skipped (not a tracked project)`,
      };
    }

    const relPath = path.relative(projectRoot, absFilePath);

    // ── Check for recent discovery call ────────────────────────────────────────
    const discoveryResult = hasDiscoveryCall(projectRoot);

    if (discoveryResult.hasAny) {
      return {
        message: `palantir-mini: lead-ontology-discovery-completeness PASSED (discovery call found for ${relPath})`,
      };
    }

    // ── No discovery call found — sprint-063 W2.B BLOCKING ───────────────────
    // Block when BOTH impact_query AND current context/substrate evidence are absent.
    const shouldBlock = !discoveryResult.hasImpact && !discoveryResult.hasContext;
    const denyReason = buildDenyReason(relPath, discoveryResult.hasImpact, discoveryResult.hasContext);

    try {
      await emit({
        type:    "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     false,
          errorClass: "ontology_discovery_incomplete",
        },
        toolName,
        cwd:          projectRoot,
        sessionId,
        identity:     "monitor",
        memoryLayers: ["procedural", "semantic"],
        reasoning:    `lead-ontology-discovery-completeness: BLOCKED (sprint-063 W2.B) — impact_query=${discoveryResult.hasImpact} context_or_substrate=${discoveryResult.hasContext} in last ${DISCOVERY_WINDOW_MS / 60000} min for file=${relPath} in projectRoot=${projectRoot}. semantic_change_plan removed. the former Lead-Protocol policy v3.12.0.`,
      });
    } catch { /* best-effort */ }

    if (shouldBlock) {
      // sprint-063 W2.B: hard block
      return {
        message: `palantir-mini: lead-ontology-discovery-completeness BLOCKED (no impact_query+context/substrate evidence for ${relPath})`,
        hookSpecificOutput: {
          permissionDecision:       "deny",
          permissionDecisionReason: denyReason,
        },
      };
    }

    // Partial discovery (should not normally reach here given hasAny=false check above)
    return {
      message:          `palantir-mini: lead-ontology-discovery-completeness ADVISORY (partial discovery for ${relPath})`,
      additionalContext: denyReason,
    };

  } catch (err) {
    // Never fail the hook — always allow through
    const errMsg = err instanceof Error ? err.message : String(err);
    try {
      process.stderr.write(
        `[palantir-mini/lead-ontology-discovery-completeness] unexpected error (suppressed): ${errMsg}\n`,
      );
    } catch { /* truly silent */ }
    return {
      message: `palantir-mini: lead-ontology-discovery-completeness error suppressed (${errMsg})`,
    };
  }
}
