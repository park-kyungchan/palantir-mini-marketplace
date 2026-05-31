// palantir-mini PR-13 — Hook enforcement level
//   enforcement: scoped-blocking
//   rationale:   permissionDecision=defer + blocks when no impact-query event precedes first edit in tracked project; bypass PALANTIR_MINI_MCP_FIRST_BYPASS=1 (audited).
// palantir-mini v4.15.0 — pre-edit-impact-mcp-first hook (sprint-063 W2.B)
// Fires on: PreToolUse(Edit|Write|MultiEdit) — BLOCKING by default (promoted from advisory sprint-062 W3)
//
// PURPOSE: MCP-First discipline enforcement (rule 12 v3.10.0 §MCP-First protocol).
// Before editing a file in a tracked palantir-mini project, checks whether Lead
// called impact_query / pre_edit_impact / get_ontology / pm-impact-quick
// with matching RID/path evidence in the last 5 minutes.
//
// sprint-063 W2.B: semantic_change_plan removed (broken per user directive 2026-05-09);
// pre_edit_impact added as alternative to impact_query.
//
// Sprint-062 W3-α CHANGE: promoted from async advisory to synchronous blocking hook.
// Sprint-063 W2.B: semantic_change_plan removed; pre_edit_impact added.
// Advisory escape valve: PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY=1 (rollout safety;
// defaults to blocking; set this env to revert to advisory during sprint-062 rollout).
//
// Logic:
//   1. Resolve file_path from tool_input; skip if none.
//   2. Synthesis path exemption: <project>/.palantir-mini/plan/**, legacy
//      ~/.claude/plans/**, BROWSE.md, INDEX.md, MEMORY.md,
//      retro/cold-start drafts → return continue.
//   3. Small-file exemption: tool_input.old_string shorter than SMALL_CHANGE_MAX_CHARS (≤5 LOC
//      estimate) → continue.
//   4. Walk upward to find project root (.palantir-mini/). Skip if not tracked.
//   5. Read last 100 events from project events.jsonl.
//   6. Filter to events within last MCP_FIRST_WINDOW_MS (5 min) whose throughWhich.toolName
//      matches the MCP-first tool set (impact_query / pre_edit_impact /
//      get_ontology) through the shared hook classifier, or
//      event.type === "skill_started" && payload.skillName === "pm-impact-quick".
//   7. If match found: emit lead_mcp_first_compliance{outcome:"passed"} → continue.
//   8. If no match:
//      - If PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY=1: advisory additionalContext only (no deny).
//      - Otherwise: emit validation_phase_completed errorClass="mcp_first_blocked" passed=false
//        + refinementTarget → return permissionDecision:"deny".
//   9. If PALANTIR_MINI_MCP_FIRST_BYPASS=1: emit bypass audit + continue.
//  10. If the current prompt-front-door envelope explicitly opted out of the
//      palantir-mini plugin workflow, skip MCP-first blocking for that prompt.
//
// Bypass: PALANTIR_MINI_MCP_FIRST_BYPASS=1 (audited via mcp_first_bypass_invoked).
// Advisory escape: PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY=1 (sprint-062 rollout safety).
//
// Chain position: LAST — agent-ownership-validate → pre-delegation-check →
//   lead-direct-edit-watch → task-context-budget-enforcer → pre-edit-impact-mcp-first
//   (if prior hooks deny, this blocking hook never fires — correct short-circuit behaviour).
//
// Cross-ref: rule 12 v3.10.0 §MCP-First protocol
//            rule 26 §Axis B1 (outcome-paired; lead_mcp_first_compliance pairs open→close)
//            sprint-062 plan §Phase 4 W3-α (blocking promotion)

// @domain: LOGIC

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { findProjectRoot } from "./harness-base-mode-advisory";
import { readEvents } from "../lib/event-log/read";
import { eventsPathFor } from "../scripts/log";
import { evaluatePreMutationImpactGate } from "../lib/governance/pre-mutation-impact-gate";
import { isMcpFirstEvidenceToolName } from "../lib/hooks/tool-classifier";
import { isPlanArtifactPath } from "../lib/plan-root/resolve-plan-root";
import {
  PROMPT_RUNTIMES,
  PromptFrontDoorStore,
  isPromptRuntime,
  type PromptEnvelope,
  type PromptRuntime,
} from "../lib/prompt-front-door";

/** 5-minute window in milliseconds */
const MCP_FIRST_WINDOW_MS = 5 * 60 * 1000;

/** Maximum events to scan (last N rows) */
const MAX_EVENTS_SCAN = 100;

/**
 * Estimated LOC for "small change" exemption.
 * old_string / new_string with fewer chars than this → exempted.
 * ~5 lines * ~80 chars/line = 400 chars as proxy.
 */
const SMALL_CHANGE_MAX_CHARS = 400;

/** pm-impact-quick skill satisfies MCP-first (it bundles all 3 calls) */
const PM_IMPACT_QUICK_SLUG = "pm-impact-quick";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    file_path?:     string;
    notebook_path?: string;
    path?:          string;
    promptId?:      string;
    promptHash?:    string;
    sessionId?:     string;
    runtime?:       string;
    /** Edit tool: old text being replaced (used for small-change LOC estimation) */
    old_string?:    string;
    /** Write tool: content being written */
    content?:       string;
  };
  byWhom?: {
    agentName?:  string;
    identity?:   string;
  };
  agent_name?:    string;
  subagent_type?: string;
}

interface HookResult {
  message:            string;
  additionalContext?: string;
  hookSpecificOutput?: {
    permissionDecision?:       "deny" | "allow";
    permissionDecisionReason?: string;
  };
}

/** Resolve absolute path, expanding ~ prefix */
function resolveAbsPath(filePath: string): string {
  const home = process.env.HOME ?? "/home/palantirkc";
  if (filePath.startsWith("~/")) {
    return path.resolve(home, filePath.slice(2));
  }
  return path.resolve(filePath);
}

/**
 * Check if a file path is a synthesis path exempt from MCP-first gate.
 * Exempt: <project>/.palantir-mini/plan/**, legacy ~/.claude/plans/**,
 * BROWSE.md, INDEX.md, MEMORY.md.
 */
function isSynthesisPath(absPath: string, cwd = process.cwd()): boolean {
  if (isPlanArtifactPath(absPath, { projectRoot: cwd, cwd })) return true;
  const base = path.basename(absPath);
  if (
    base === "BROWSE.md" ||
    base === "INDEX.md" ||
    base === "MEMORY.md"
  ) return true;
  // Retro / cold-start docs in plans pattern
  if (base.includes("retrospective") || base.includes("cold-start")) return true;
  return false;
}

/**
 * Estimate whether the change is "small" (≤5 LOC proxy).
 * Uses old_string for Edit, content for Write.
 */
function isSmallChange(payload: HookPayload["tool_input"]): boolean {
  if (!payload) return false;
  const text = payload.old_string ?? payload.content;
  if (text === undefined) return false;
  return text.length <= SMALL_CHANGE_MAX_CHARS;
}

/**
 * Derive a relative path token and its parent dir token for event scanning.
 * Returns [relPath, parentDir] or null when projectRoot cannot be determined.
 */
function deriveRidTokens(
  absFilePath: string,
  projectRoot: string
): { relPath: string; parentDir: string } {
  const rel = path.relative(projectRoot, absFilePath);
  const parent = path.dirname(rel);
  return { relPath: rel, parentDir: parent === "." ? "" : parent };
}

function detectRuntime(payload: HookPayload): PromptRuntime | undefined {
  const envRuntime = process.env.PALANTIR_MINI_HOST_RUNTIME;
  if (isPromptRuntime(envRuntime)) return envRuntime;
  const inputRuntime = payload.tool_input?.runtime;
  if (isPromptRuntime(inputRuntime)) return inputRuntime;
  return undefined;
}

function uniqueRoots(roots: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const root of roots) {
    if (!root || root.trim().length === 0) continue;
    const resolved = path.resolve(root);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    result.push(resolved);
  }
  return result;
}

function promptRootCandidates(projectRoot: string, cwd: string): string[] {
  return uniqueRoots([
    projectRoot,
    process.env.PALANTIR_MINI_PROJECT,
    findProjectRoot(cwd),
    cwd,
    process.env.HOME,
  ]);
}

function promptHashMatchesPayload(envelope: PromptEnvelope, payload: HookPayload): boolean {
  const expectedPromptHash = payload.tool_input?.promptHash;
  return typeof expectedPromptHash !== "string" || envelope.promptHash === expectedPromptHash;
}

async function readCurrentPromptEnvelope(
  projectRoot: string,
  payload: HookPayload,
): Promise<PromptEnvelope | undefined> {
  const store = new PromptFrontDoorStore({ projectRoot });
  const sessionId = payload.tool_input?.sessionId ?? payload.session_id;
  const promptId = payload.tool_input?.promptId;
  if (typeof promptId === "string" && typeof sessionId === "string") {
    const envelope = (await store.readEnvelope(sessionId, promptId)) ?? undefined;
    return envelope && promptHashMatchesPayload(envelope, payload) ? envelope : undefined;
  }
  if (typeof sessionId !== "string" || sessionId.length === 0) return undefined;

  const preferred = detectRuntime(payload);
  const runtimes = preferred
    ? [preferred, ...PROMPT_RUNTIMES.filter((runtime) => runtime !== preferred)]
    : PROMPT_RUNTIMES;
  for (const runtime of runtimes) {
    const pointer = await store.readCurrentPointer(runtime, sessionId);
    if (!pointer) continue;
    const envelope = await store.readEnvelope(pointer.sessionId, pointer.promptId);
    if (envelope && promptHashMatchesPayload(envelope, payload)) return envelope;
  }
  return undefined;
}

async function readPluginOptOutEnvelope(
  projectRoot: string,
  cwd: string,
  payload: HookPayload,
): Promise<PromptEnvelope | undefined> {
  for (const root of promptRootCandidates(projectRoot, cwd)) {
    try {
      const envelope = await readCurrentPromptEnvelope(root, payload);
      if (envelope?.palantirMiniPluginOptOut?.explicit) return envelope;
    } catch {
      // Best-effort: absence or corrupt prompt-front-door data must not break the hook.
    }
  }
  return undefined;
}

/**
 * Scan the last MAX_EVENTS_SCAN events for an MCP-first call within
 * MCP_FIRST_WINDOW_MS that references the target file or its parent directory.
 *
 * Matching criteria (any one is sufficient):
 *   A. event.throughWhich.toolName is a central-classifier MCP-first evidence tool
 *   B. event.type === "skill_started" && payload.skillName === PM_IMPACT_QUICK_SLUG
 *
 * AND event.when within last MCP_FIRST_WINDOW_MS.
 *
 * RID/path matching is required: payload must carry rid/query/filePath/proposedFiles
 * evidence that references relPath, parentDir, or basename.
 */
function hasMcpFirstCall(
  projectRoot: string,
  tokens: { relPath: string; parentDir: string }
): boolean {
  try {
    const eventsPath = eventsPathFor(projectRoot);
    if (!fs.existsSync(eventsPath)) return false;

    const all = readEvents(eventsPath);
    const cutoff = Date.now() - MCP_FIRST_WINDOW_MS;

    // Take last MAX_EVENTS_SCAN events
    const recent = all.slice(-MAX_EVENTS_SCAN);

    for (const evt of recent) {
      const evtWhen = new Date(evt.when).getTime();
      if (evtWhen < cutoff) continue;

      // A. Tool-name match
      const toolName = (evt as unknown as { throughWhich?: { toolName?: string } })
        .throughWhich?.toolName ?? "";
      if (isMcpFirstEvidenceToolName(toolName)) {
        if (matchesRid(evt.payload as Record<string, unknown>, tokens)) return true;
      }

      // B. skill_started with pm-impact-quick
      if (evt.type === "skill_started") {
        const skillName = (evt.payload as Record<string, unknown>)?.skillName;
        if (skillName === PM_IMPACT_QUICK_SLUG) {
          if (matchesRid(evt.payload as Record<string, unknown>, tokens)) return true;
        }
      }
    }
  } catch {
    // best-effort — if we can't read events, treat as no match
  }
  return false;
}

/**
 * Check if the event payload references the target file or its parent directory.
 * Returns true when payload.rid/query/filePath/proposedFiles/files contains relPath
 * or parentDir. Generic MCP evidence is intentionally insufficient.
 */
function matchesRid(
  payload: Record<string, unknown>,
  tokens: { relPath: string; parentDir: string }
): boolean {
  const { relPath, parentDir } = tokens;
  const candidates = [
    payload?.rid,
    payload?.query,
    payload?.filePath,
    payload?.file_path,
    payload?.target,
    payload?.skillContext,
    ...(Array.isArray(payload?.proposedFiles) ? payload.proposedFiles : []),
    ...(Array.isArray(payload?.files) ? payload.files : []),
  ]
    .filter((v) => typeof v === "string")
    .map((v) => v as string);

  if (candidates.length === 0) return false;

  // Check if any candidate contains the relPath or parentDir substring
  for (const c of candidates) {
    if (relPath && c.includes(relPath)) return true;
    if (parentDir && parentDir.length > 0 && c.includes(parentDir)) return true;
    // Also match file basename
    const basename = path.basename(relPath);
    if (basename && c.includes(basename)) return true;
  }

  // No substring match — the tool was called but for a different RID
  return false;
}

export default async function preEditImpactMcpFirst(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "unknown";
  const sessionId = p.session_id;

  // Determine mode: advisory-only escape valve (sprint-062 rollout safety)
  const advisoryOnly = process.env.PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY === "1";

  try {
    // Hard bypass via env var (audited)
    if (process.env.PALANTIR_MINI_MCP_FIRST_BYPASS === "1") {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     true,
            errorClass: "mcp_first_bypass_invoked",
          },
          toolName: "PALANTIR_MINI_MCP_FIRST_BYPASS",
          cwd,
          sessionId,
          identity:    "monitor",
          memoryLayers: ["working"],
          reasoning:   `pre-edit-impact-mcp-first: bypass via PALANTIR_MINI_MCP_FIRST_BYPASS=1 (tool=${toolName}, filePath=${p.tool_input?.file_path ?? p.tool_input?.path ?? "unknown"}). Audited per sprint-062 W3-α.`,
        });
      } catch { /* best-effort */ }
      return { message: "palantir-mini: pre-edit-impact-mcp-first BYPASS (env)" };
    }

    // Extract file path
    const rawFilePath =
      p.tool_input?.file_path ??
      p.tool_input?.notebook_path ??
      p.tool_input?.path;

    if (!rawFilePath || typeof rawFilePath !== "string" || rawFilePath.trim().length === 0) {
      return { message: "palantir-mini: pre-edit-impact-mcp-first skipped (no file_path)" };
    }

    const absFilePath = resolveAbsPath(rawFilePath);

    // Synthesis path exemption
    if (isSynthesisPath(absFilePath, cwd)) {
      return {
        message: `palantir-mini: pre-edit-impact-mcp-first skipped (synthesis path: ${path.basename(absFilePath)})`,
      };
    }

    // Small-file exemption
    if (isSmallChange(p.tool_input)) {
      return {
        message: `palantir-mini: pre-edit-impact-mcp-first skipped (small change ≤${SMALL_CHANGE_MAX_CHARS} chars)`,
      };
    }

    // Find project root
    const projectRoot = findProjectRoot(absFilePath) ?? findProjectRoot(cwd);
    const tmpRoot = path.resolve(process.env.TMPDIR ?? "/tmp");
    if (!projectRoot || path.resolve(projectRoot) === tmpRoot) {
      return {
        message: `palantir-mini: pre-edit-impact-mcp-first skipped (not a tracked project)`,
      };
    }

    // Derive RID tokens
    const tokens = deriveRidTokens(absFilePath, projectRoot);
    const relPath = tokens.relPath;
    const optOutEnvelope = await readPluginOptOutEnvelope(projectRoot, cwd, p);
    if (optOutEnvelope?.palantirMiniPluginOptOut?.explicit) {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     true,
            errorClass: "mcp_first_skipped_plugin_opt_out",
            promptId:   optOutEnvelope.promptId,
          },
          toolName,
          cwd:         projectRoot,
          sessionId,
          identity:    "monitor",
          memoryLayers: ["working", "episodic"],
          reasoning:   `pre-edit-impact-mcp-first skipped MCP-first blocking for file ${relPath} because the current prompt explicitly opted out of palantir-mini plugin workflow enforcement via marker ${optOutEnvelope.palantirMiniPluginOptOut.matchedMarker}.`,
        });
      } catch { /* best-effort */ }
      return {
        message: `palantir-mini: pre-edit-impact-mcp-first skipped (explicit plugin opt-out: ${optOutEnvelope.palantirMiniPluginOptOut.matchedMarker})`,
      };
    }
    const impactGateResult = evaluatePreMutationImpactGate({
      projectRoot,
      toolName,
      toolInput: p.tool_input ?? {},
      resolvedTargetFiles: [absFilePath],
    });
    if (impactGateResult.decision === "deny") {
      return {
        message: `palantir-mini: pre-edit-impact-mcp-first BLOCKED (pre-mutation impact gate for ${relPath})`,
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: impactGateResult.reason,
        },
      };
    }

    // Check for MCP-first call in last 5 minutes
    const hasCall = hasMcpFirstCall(projectRoot, tokens);

    if (hasCall) {
      // PASSED — Lead consulted MCP before editing
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     true,
            errorClass: "lead_mcp_first_compliance_passed",
          },
          toolName,
          cwd:         projectRoot,
          sessionId,
          identity:    "monitor",
          memoryLayers: ["procedural", "episodic"],
          reasoning:   `pre-edit-impact-mcp-first: Lead called impact_query/pre_edit_impact/get_ontology/pm-impact-quick with matching RID/path evidence within last 5 min for file ${relPath} (windowMs=${MCP_FIRST_WINDOW_MS}) in ${projectRoot}. MCP-first protocol satisfied (rule 12 v3.10.0 §MCP-First protocol). sprint-063 W2.B.`,
        });
      } catch { /* best-effort */ }
      return {
        message: `palantir-mini: pre-edit-impact-mcp-first PASSED (file=${relPath}, mcp-first call found)`,
      };
    }

    // NO MCP-first call found — emit non-compliance event
    const mcpCallSuggestion = [
      `mcp__palantir_mini__impact_query({"rid": "file:${relPath}", "depth": 3, "projectRoot": "<projectRoot>"})`,
      `mcp__palantir_mini__pre_edit_impact({"proposedFiles": ["${relPath}"], "project": "<projectRoot>"})`,
      `mcp__plugin_palantir-mini_palantir-mini__impact_query({"rid": "file:${relPath}", "depth": 3})`,
      `mcp__plugin_palantir-mini_palantir-mini__pre_edit_impact({"proposedFiles": ["${relPath}"], "project": "<projectRoot>"})`,
    ].join("\n  OR: ");
    const denyReason = [
      `rule 12 v3.10.0 §MCP-First protocol: no impact_query/pre_edit_impact/`,
      `get_ontology/pm-impact-quick call with matching RID/path evidence detected for`,
      `file "${relPath}" in last 5 min.`,
      ``,
      `Run MCP analysis BEFORE editing:`,
      `  ${mcpCallSuggestion}`,
      `  OR: /palantir-mini:pm-impact-quick file:${relPath}`,
      ``,
      `Bypass: PALANTIR_MINI_MCP_FIRST_BYPASS=1 (audited).`,
      `Advisory-only mode: PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY=1 (sprint-062 rollout escape).`,
      `sprint-063 W2.B: legacy semantic-change planning tool removed from valid tool set.`,
    ].join("\n");

    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     false,
          errorClass: "mcp_first_blocked",
        },
        toolName,
        cwd:         projectRoot,
        sessionId,
        identity:    "monitor",
        memoryLayers: ["procedural", "episodic"],
        reasoning:   `pre-edit-impact-mcp-first: BLOCKED — no impact_query/pre_edit_impact/get_ontology/pm-impact-quick call with matching RID/path evidence found in last 5 min for file ${relPath} (windowMs=${MCP_FIRST_WINDOW_MS}) in ${projectRoot}. Sprint-062 W3-α promoted to blocking; sprint-063 W2.B removed semantic_change_plan (rule 12 v3.10.0).`,
        refinementTarget: {
          kind:            "rule-conformance-policy",
          filePathOrRid:   relPath,
          description:     "no MCP impact analysis call with matching RID/path evidence detected before file edit; rule 12 v3.10.0 §MCP-First protocol requires impact_query/pre_edit_impact/get_ontology call within 5 min; semantic_change_plan removed sprint-063 W2.B",
          confidenceLevel: "high",
        },
      });
    } catch { /* best-effort */ }

    if (advisoryOnly) {
      // Advisory escape valve: warn but do NOT block
      return {
        message:           `palantir-mini: pre-edit-impact-mcp-first ADVISORY (no mcp-first call for ${relPath}; PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY=1)`,
        additionalContext: denyReason,
      };
    }

    // Hard block
    return {
      message: `palantir-mini: pre-edit-impact-mcp-first BLOCKED (no mcp-first call for ${relPath})`,
      hookSpecificOutput: {
        permissionDecision:       "deny",
        permissionDecisionReason: denyReason,
      },
    };

  } catch (err) {
    const errMsg = (err as Error).message ?? String(err);
    const reason = `pre-edit-impact-mcp-first failed closed on unexpected error: ${errMsg}`;
    try {
      process.stderr.write(
        `[palantir-mini/pre-edit-impact-mcp-first] unexpected error (fail-closed): ${errMsg}\n`
      );
    } catch { /* truly silent */ }
    if (advisoryOnly) {
      return {
        message:           `palantir-mini: pre-edit-impact-mcp-first ADVISORY (unexpected error; PALANTIR_MINI_MCP_FIRST_ADVISORY_ONLY=1)`,
        additionalContext: reason,
      };
    }
    return {
      message: `palantir-mini: pre-edit-impact-mcp-first BLOCKED (unexpected error)`,
      hookSpecificOutput: {
        permissionDecision:       "deny",
        permissionDecisionReason: reason,
      },
    };
  }
}
