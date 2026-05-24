// palantir-mini v4.9.0 / sprint-055 W2.B — pre-pr-dirty-gate hook
// Fires on: PreToolUse:Bash matching `gh pr create*`
//
// Blocks PR creation when user-WIP files lie OUTSIDE the active sprint scope.
// Prevents the 30+min stash-dance failure mode by catching cross-sprint
// pollution at PR-create time.
//
// Sprint scope sources (in priority order):
//   1. PALANTIR_MINI_SPRINT_SCOPE env (comma-separated path prefixes)
//   2. Branch name pattern `sprint-NNN-wM-*` → infer scope from
//      .palantir-mini/harness/sprints/sprint-NNN-quick/contract.json
//   3. No scope detected → permissive (advisory only, never blocks)
//
// Bypass: PALANTIR_MINI_DIRTY_GATE_BYPASS=1 (audited via dirty_gate_bypass_invoked event).
// PR contract boundary:
//   PALANTIR_MINI_PR_CONTRACT_BOUNDARY_INPUT=/path/to/boundary.json validates
//   branchProposalPolicy + permissionBoundary before PR creation.
//   PALANTIR_MINI_PR_CONTRACT_BOUNDARY_REQUIRED=1 blocks when input is missing.
//
// Authority: ~/.claude/rules/25-auto-merge-cleanup-default.md v1.1.0+

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { classifyDirty, isOutOfScope } from "../lib/dirty-classify";
import { emit } from "../scripts/log";
import {
  validatePrContractBoundary,
  type PrContractBoundaryInput,
} from "../scripts/validate-pr-contract-boundary";

interface HookPayload {
  cwd?:         string;
  session_id?:  string;
  tool_input?:  { command?: string };
}

interface HookResult {
  message:           string;
  decision?:         "block" | "continue";
  reason?:           string;
  permissionDecision?: "deny" | "allow";
}

function safeExec(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, timeout: 3000, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

function resolveSprintScope(cwd: string): readonly string[] {
  // 1. Env override
  const envScope = process.env.PALANTIR_MINI_SPRINT_SCOPE;
  if (envScope && envScope.trim().length > 0) {
    return envScope.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  }

  // 2. Branch-name + contract inspection (best-effort).
  const branch = safeExec("git rev-parse --abbrev-ref HEAD", cwd);
  if (!branch) return [];

  // Match patterns like sprint-055-w1-foo or sprint-NNN-* (without -wM-)
  const sprintMatch = branch.match(/^sprint-(\d+)/);
  if (!sprintMatch) {
    // Non-sprint branch (fix/, chore/, docs/) — no scope inference, permissive.
    return [];
  }

  // No contract introspection at the moment — keep simple. Future: read
  // contract.json scopePaths field once it exists.
  return [];
}

function validatePrContractBoundaryFromEnv(): HookResult | undefined {
  const inputPath = process.env.PALANTIR_MINI_PR_CONTRACT_BOUNDARY_INPUT;
  const required = process.env.PALANTIR_MINI_PR_CONTRACT_BOUNDARY_REQUIRED === "1";

  if (!inputPath) {
    if (!required) return undefined;
    return {
      message: "palantir-mini: pre-pr-dirty-gate BLOCK (missing PR contract boundary input)",
      decision: "block",
      permissionDecision: "deny",
      reason:
        "PALANTIR_MINI_PR_CONTRACT_BOUNDARY_REQUIRED=1 requires " +
        "PALANTIR_MINI_PR_CONTRACT_BOUNDARY_INPUT=/path/to/boundary.json",
    };
  }

  try {
    const input = JSON.parse(readFileSync(inputPath, "utf8")) as PrContractBoundaryInput;
    const validation = validatePrContractBoundary(input);
    if (validation.valid) {
      return {
        message:
          "palantir-mini: pre-pr-dirty-gate OK " +
          "(PR contract boundary validated)",
      };
    }

    const reason = [
      "=== PR-CONTRACT-BOUNDARY BLOCK ===",
      `Input: ${inputPath}`,
      "",
      ...validation.issues
        .filter((issue) => issue.severity === "block")
        .slice(0, 20)
        .map((issue) => `  - ${issue.field}: ${issue.message}`),
      "",
      "Resolution:",
      "  1. Fix PR body contract evidence, branch policy, or permission boundary.",
      "  2. Regenerate generated files when they are in scope.",
      "  3. Re-run validate-pr-contract-boundary.ts with the same input.",
    ].join("\n");

    return {
      message: "palantir-mini: pre-pr-dirty-gate BLOCK (PR contract boundary invalid)",
      decision: "block",
      permissionDecision: "deny",
      reason,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      message: "palantir-mini: pre-pr-dirty-gate BLOCK (PR contract boundary input unreadable)",
      decision: "block",
      permissionDecision: "deny",
      reason: `Could not read PALANTIR_MINI_PR_CONTRACT_BOUNDARY_INPUT=${inputPath}: ${message}`,
    };
  }
}

export default async function prePrDirtyGate(payload: unknown): Promise<HookResult> {
  const p   = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const cmd = p.tool_input?.command ?? "";

  // Only fire on `gh pr create`
  if (!/\bgh\s+pr\s+create\b/.test(cmd)) {
    return { message: "palantir-mini: pre-pr-dirty-gate skipped (not gh pr create)" };
  }

  // Bypass
  if (process.env.PALANTIR_MINI_DIRTY_GATE_BYPASS === "1") {
    try {
      await emit({
        type: "phase_completed",
        payload: {
          phaseTag:    "dirty_gate_bypass_invoked",
          taskId:      "pre-pr-dirty-gate",
          validations: [
            `tool=pre-pr-dirty-gate`,
            `command=${cmd.slice(0, 200)}`,
            `bypassEnv=PALANTIR_MINI_DIRTY_GATE_BYPASS=1`,
          ],
        },
        toolName:  "pre-pr-dirty-gate",
        cwd,
        identity:  "monitor",
        memoryLayers: ["procedural"],
        reasoning: "User invoked dirty-gate bypass for gh pr create",
      });
    } catch { /* best-effort */ }
    return { message: "palantir-mini: pre-pr-dirty-gate BYPASSED (audited)" };
  }

  const prBoundaryResult = validatePrContractBoundaryFromEnv();
  if (prBoundaryResult?.decision === "block") {
    return prBoundaryResult;
  }

  const porcelain = safeExec("git status --porcelain", cwd);
  if (!porcelain) {
    return prBoundaryResult ?? { message: "palantir-mini: pre-pr-dirty-gate OK (working-tree clean)" };
  }

  const result = classifyDirty(porcelain);
  const scope  = resolveSprintScope(cwd);

  // No scope inferred → permissive (advisory only)
  if (scope.length === 0) {
    return {
      message: `palantir-mini: pre-pr-dirty-gate ADVISORY (no sprint scope inferred; user-WIP=${result.byAxis["user-WIP"]}, total=${result.total})`,
    };
  }

  // Block if any user-WIP is outside scope
  const outOfScope = result.entries.filter((e) => isOutOfScope(e, scope));
  if (outOfScope.length === 0) {
    return {
      message: `palantir-mini: pre-pr-dirty-gate OK (all user-WIP within scope: ${scope.join(", ")})`,
    };
  }

  const reason = [
    "=== PRE-PR-DIRTY-GATE BLOCK (rule 25 v1.1.0 §Wave-split policy) ===",
    `Sprint scope: ${scope.join(", ")}`,
    `Out-of-scope user-WIP files: ${outOfScope.length}`,
    "",
    ...outOfScope.slice(0, 15).map((e) => `  ${e.status} ${e.path}`),
    "",
    "Resolution:",
    "  1. Add files to scope (PALANTIR_MINI_SPRINT_SCOPE='path1,path2 gh pr create ...')",
    "  2. Stash out-of-scope work + retry",
    "  3. Bypass: PALANTIR_MINI_DIRTY_GATE_BYPASS=1 gh pr create ... (audited)",
  ].join("\n");

  return {
    message:            `palantir-mini: pre-pr-dirty-gate BLOCK (${outOfScope.length} out-of-scope user-WIP)`,
    decision:           "block",
    permissionDecision: "deny",
    reason,
  };
}
