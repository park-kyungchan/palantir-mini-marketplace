// palantir-mini PR-13 — Hook enforcement level
//   enforcement: advisory
//   rationale:   async:true in hooks.json; never blocks git Bash commands; emits advisory only when no delegation recipe precedes git commit/add/stash/push.
// palantir-mini v4.15.0 — lead-git-operation-watch hook (sprint-063 W5.C / C16)
// Fires on: PreToolUse:Bash — ADVISORY ONLY, NEVER blocks (no permissionDecision:"deny")
//
// PURPOSE: Downstream git-operation advisory. When Lead is about to run a git
// commit/add/stash/push command directly (without having first run pm_intent_router
// / delegate_or_direct), emit an advisory event suggesting the MCP-first dispatch
// pattern. This does not prove prompt/DTC approval; prompt-front-door-capture +
// pm_semantic_intent_gate remain the canonical proof path.
//
// Logic:
//   1. Check tool_input.command against GIT_OP_PATTERN (git commit|add|stash|push).
//      If no match → continue (skip non-git or non-matching git commands).
//   2. Check PALANTIR_MINI_GIT_DELEGATION_BYPASS=1 → if set, emit bypass audit event
//      + return continue (audited escape hatch).
//   3. Find project root. If not a tracked project → continue.
//   4. Read recent events.jsonl (last READ_WINDOW events). If `delegation_recipe_generated`
//      found within last 30 min → continue (delegation was done; git op is fine).
//   5. Check git working tree: if clean (no staged/unstaged changes) → continue
//      (nothing to commit; advisory would be noise).
//   6. Else → emit validation_phase_completed errorClass="git_op_lead_direct_advisory"
//      + return additionalContext suggesting pm_intent_router first.
//   Always returns decision: "continue" (advisory hook, never blocks).
//
// Bypass envvar:  PALANTIR_MINI_GIT_DELEGATION_BYPASS=1  (audited)
// Hook event:     validation_phase_completed errorClass="git_op_lead_direct_advisory"
// Bypass event:   validation_phase_completed errorClass="git_delegation_bypass_invoked"
//
// Cross-ref: rule 12 (lead-protocol) §Pre-delegation hard gate (v3.14.0)
//            rule 12 §Lead self-test directive (v3.8.0)
//            rule 12 §MCP-First protocol (v3.10.0)
//            rule 10 — events.jsonl 5-dim envelope
//            sprint-063 plan §3 Phase 5 W5.C + §4 NEW #5

// @domain: LOGIC

import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { emit } from "../scripts/log";
import { findProjectRoot } from "./harness-base-mode-advisory";
import { readEvents } from "../lib/event-log/read";
import { eventsPathFor } from "../scripts/log";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Pattern for git operations that signal a direct commit without delegation. */
const GIT_OP_PATTERN = /^(git\s+(commit|add|stash|push))\b/;

/** Number of recent events to scan for delegation_recipe_generated. */
const READ_WINDOW = 300;

/** Milliseconds: how recent a delegation_recipe_generated event must be to count. */
const RECIPE_FRESHNESS_MS = 30 * 60 * 1_000; // 30 minutes

// ─── Types ────────────────────────────────────────────────────────────────────

interface HookPayload {
  tool_input?: {
    command?: string;
  };
  tool_name?: string;
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message:          string;
  decision:         "continue";
  additionalContext?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Checks whether a `delegation_recipe_generated` event exists in the most
 * recent READ_WINDOW events and was emitted within RECIPE_FRESHNESS_MS.
 * Returns true when a fresh recipe is found (git op is safe to proceed).
 *
 * Note: delegation_recipe_generated is not yet in the EventEnvelope union;
 * we cast to Record<string, unknown> for the type check.
 */
export function hasFreshDelegationRecipe(eventsPath: string): boolean {
  if (!fs.existsSync(eventsPath)) return false;
  try {
    const all = readEvents(eventsPath);
    const recent = all.slice(-READ_WINDOW);
    const cutoff = Date.now() - RECIPE_FRESHNESS_MS;
    for (const evt of recent) {
      // Cast to raw record to check for event types not yet in the union
      const raw = evt as unknown as Record<string, unknown>;
      if (raw["type"] === "delegation_recipe_generated") {
        const when = typeof raw["when"] === "string"
          ? new Date(raw["when"]).getTime()
          : 0;
        if (when >= cutoff) return true;
      }
    }
    return false;
  } catch {
    // readEvents failure → treat as no recipe (best-effort advisory)
    return false;
  }
}

/**
 * Returns true when the working tree has no staged or unstaged changes (i.e.
 * `git status --porcelain` produces empty output). In this case a `git commit`
 * would be a no-op and we skip the advisory to avoid noise.
 * Returns false on any spawn error (conservative: emit advisory on failure).
 */
export function isWorkingTreeClean(cwd: string): boolean {
  try {
    const result = spawnSync("git", ["status", "--porcelain"], {
      encoding: "utf8",
      cwd,
      timeout: 5_000,
    });
    if (result.error) return false;
    if (result.status !== 0) return false;
    return (result.stdout ?? "").trim().length === 0;
  } catch {
    return false;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // 1. Parse stdin payload
  let payload: HookPayload = {};
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of process.stdin) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw.trim().length > 0) {
        payload = JSON.parse(raw) as HookPayload;
      }
    } catch {
      // Parse failure → empty payload; still apply skip logic safely
    }
  }

  const command   = payload.tool_input?.command ?? "";
  const cwd       = payload.cwd ?? process.cwd();
  const sessionId = payload.session_id;
  const toolName  = payload.tool_name ?? "Bash";

  // 2. Match git operation — skip anything else immediately
  if (!GIT_OP_PATTERN.test(command)) {
    const result: HookResult = {
      message:  "palantir-mini: lead-git-operation-watch skipped (non-git command)",
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  // 3. Check bypass envvar
  if (process.env.PALANTIR_MINI_GIT_DELEGATION_BYPASS === "1") {
    // Emit audited bypass event (best-effort; never blocks)
    const projectRoot = findProjectRoot(cwd) ?? cwd;
    try {
      // Use Record<string, unknown> payload to carry extra fields beyond the strict schema shape
      const bypassPayload: Record<string, unknown> = {
        phase:      "design",
        passed:     true,
        errorClass: "git_delegation_bypass_invoked",
        command:    command.slice(0, 120),
      };
      await emit({
        type: "validation_phase_completed",
        payload: bypassPayload,
        toolName,
        cwd: projectRoot,
        sessionId,
        identity:     "monitor",
        memoryLayers: ["procedural"],
        reasoning:    `PALANTIR_MINI_GIT_DELEGATION_BYPASS=1 set; skipping git-op advisory for: ${command.slice(0, 80)}. Audited per rule 12 v3.14.0 §Pre-delegation hard gate.`,
      });
    } catch { /* best-effort */ }

    const result: HookResult = {
      message:  "palantir-mini: lead-git-operation-watch bypassed (PALANTIR_MINI_GIT_DELEGATION_BYPASS=1; audited)",
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  // 4. Find project root — skip if not a tracked project
  const projectRoot = findProjectRoot(cwd);
  if (!projectRoot) {
    const result: HookResult = {
      message:  "palantir-mini: lead-git-operation-watch skipped (not a tracked project)",
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  // 5. Check for fresh delegation recipe in recent events
  const eventsPath = eventsPathFor(projectRoot);
  if (hasFreshDelegationRecipe(eventsPath)) {
    const result: HookResult = {
      message:  "palantir-mini: lead-git-operation-watch OK (delegation_recipe_generated found within 30 min)",
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  // 6. Check working tree — skip advisory when tree is already clean (no-op commit)
  if (isWorkingTreeClean(projectRoot)) {
    const result: HookResult = {
      message:  "palantir-mini: lead-git-operation-watch skipped (working tree clean; nothing to commit)",
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  // 7. Emit advisory event (T2+: reasoning ≥40 chars + Axis E)
  const advisoryText = [
    "palantir-mini: lead-git-operation-watch ADVISORY",
    `  Detected: ${command.slice(0, 80)}`,
    "  No delegation_recipe_generated event found in last 30 min.",
    "  Prompt/DTC proof remains prompt-front-door-capture + pm_semantic_intent_gate approved refs.",
    "  Consider calling pm_intent_router first with approved contract refs (rule 12 §Pre-delegation hard gate v3.14.0):",
    "    mcp__plugin_palantir-mini_palantir-mini__pm_intent_router",
    "  This ensures the MCP-first impact analysis (rule 12 §MCP-First protocol) and",
    "  delegation recipe are anchored before committing. ADVISORY ONLY — proceeding.",
    "  Bypass permanently: PALANTIR_MINI_GIT_DELEGATION_BYPASS=1",
  ].join("\n");

  try {
    // Use Record<string, unknown> payload to carry extra fields beyond the strict schema shape
    const advisoryPayload: Record<string, unknown> = {
      phase:      "design",
      passed:     false,
      errorClass: "git_op_lead_direct_advisory",
      command:    command.slice(0, 120),
      hint:       "run pm_semantic_intent_gate, then pm_intent_router with approved refs before git commit/add/stash/push (rule 12 v3.14.0 §Pre-delegation hard gate)",
    };
    await emit({
      type: "validation_phase_completed",
      payload: advisoryPayload,
      toolName,
      cwd:      projectRoot,
      sessionId,
      identity:  "monitor",
      memoryLayers: ["procedural", "episodic"],
      reasoning: `lead-git-operation-watch: git operation "${command.slice(0, 60)}" detected without recent delegation_recipe_generated (last 30 min). Advisory: prompt/DTC proof remains prompt-front-door-capture + pm_semantic_intent_gate; run pm_intent_router with approved refs to satisfy MCP-First + pre-delegation framework (rule 12 v3.14.0 §Pre-delegation hard gate). Sprint-063 W5.C C16.`,
      refinementTarget: {
        kind:            "other",
        filePathOrRid:   "~/.claude/rules/12-lead-protocol-v2.md",
        description:     "Lead bypassed pm_intent_router before git operation; pre-delegation hook advisory fired (sprint-063 W5.C C16)",
        confidenceLevel: "medium",
      },
    });
  } catch { /* best-effort; advisory never blocks */ }

  process.stderr.write(advisoryText + "\n");

  const result: HookResult = {
    message:           "palantir-mini: lead-git-operation-watch ADVISORY (no recent delegation recipe; see stderr)",
    decision:          "continue",
    additionalContext: advisoryText,
  };
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(0);
}

// Guard top-level execution so test imports don't trigger main()
if (import.meta.main) {
  void main().catch((e) => {
    // Last-resort: advisory hook must NEVER crash the git operation
    process.stderr.write(`[lead-git-operation-watch] unhandled error (suppressed): ${(e as Error).message}\n`);
    const fallback: HookResult = {
      message:  "palantir-mini: lead-git-operation-watch — unhandled error; continuing",
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(fallback) + "\n");
    process.exit(0);
  });
}
