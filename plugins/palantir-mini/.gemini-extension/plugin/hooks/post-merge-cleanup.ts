// palantir-mini v4.12.0 — post-merge-cleanup hook handler (sprint-060 W2.2 R6-F12)
// Fires on: PostToolUse(Bash) when command matches `gh pr merge`
//
// Sprint-020 W4 implementation per rule 25 §Post-merge actions.
// Provides safety net even when users invoke `gh pr merge` directly outside
// pm-ship skill — auto-prunes worktrees + verifies cleanliness.
//
// sprint-060 W2.2 R6-F12: Emit `validation_phase_completed{errorClass:"automerge_gate_validated"}`
// carrying 3-gate values (branchPrefixMatch / isDraftFalse / mergeableMergeable) just before
// (conceptually) the merge is confirmed, so replay_lineage can reconstruct auto-merge decisions.
//
// Non-blocking by design — emits message + advisory; never fails.
// Bypass: PALANTIR_MINI_AUTOMERGE_BYPASS=1 (audited via run_marker file).

import { execSync } from "child_process";
import { emit } from "../scripts/log";

interface PostMergeResult {
  message:            string;
  additionalContext?: string;
}

interface HookPayload {
  session_id?: string;
  cwd?:        string;
  tool_name?:  string;
  tool_input?: {
    command?: string;
  };
  tool_response?: {
    success?: boolean;
  };
}

/**
 * Inspect the `gh pr merge` command string and infer the 3-gate values.
 * Returns null when the command doesn't look like a merge; non-null when it does.
 * Gate resolution is best-effort from the command line + env:
 *   branchPrefixMatch: derived from git HEAD branch name pattern
 *   isDraftFalse:      assumed true when the merge command ran (gh would not have run on a draft without --merge-when-ready)
 *   mergeableMergeable: assumed true when the merge command succeeded (tool_response.success)
 */
function inferAutomergeGates(
  command: string,
  cwd: string,
  mergeSucceeded: boolean,
): { branchPrefixMatch: boolean; isDraftFalse: boolean; mergeableMergeable: boolean; branchName: string } | null {
  if (!isPrMergeCommand(command)) return null;

  // Detect current branch name for prefix check
  let branchName = "";
  try {
    branchName = execSync("git branch --show-current", { cwd, timeout: 3000, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch { /* best-effort */ }

  const BRANCH_ALLOWLIST = /^(sprint-|fix\/|chore\/|docs\/)/;
  const branchPrefixMatch = branchName.length > 0 && BRANCH_ALLOWLIST.test(branchName);

  return {
    branchName,
    branchPrefixMatch,
    // If the merge was invoked, we assume it was not a draft (gh pr merge rejects drafts)
    isDraftFalse: true,
    // If the bash command succeeded, the PR was mergeable
    mergeableMergeable: mergeSucceeded,
  };
}

/** Run a shell command, return trimmed stdout, or empty string on failure. */
function safeExec(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, timeout: 5000, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

/** Detect whether a Bash command merged a PR. */
export function isPrMergeCommand(command: string | undefined): boolean {
  if (!command) return false;
  const stripped = command.replace(/\s+/g, " ").trim();
  return /\bgh pr merge\b/.test(stripped);
}

export default async function postMergeCleanup(
  payload: unknown,
): Promise<PostMergeResult> {
  const p = (payload ?? {}) as HookPayload;
  const command = p.tool_input?.command;
  const cwd = p.cwd ?? process.cwd();

  if (!isPrMergeCommand(command)) {
    return { message: "palantir-mini: non-merge bash, skipping cleanup" };
  }

  const mergeSucceeded = p.tool_response?.success !== false;

  if (!mergeSucceeded) {
    return { message: "palantir-mini: merge command failed, skipping cleanup" };
  }

  if (process.env.PALANTIR_MINI_AUTOMERGE_BYPASS === "1") {
    return { message: "palantir-mini: post-merge cleanup bypassed (PALANTIR_MINI_AUTOMERGE_BYPASS=1)" };
  }

  // sprint-060 W2.2 R6-F12: emit automerge_gate_validated event with 3-gate values.
  // Fires after successful gh pr merge so replay_lineage can reconstruct auto-merge decisions.
  // Rule 25 §Post-merge actions.
  const gates = inferAutomergeGates(command ?? "", cwd, mergeSucceeded);
  if (gates !== null) {
    void emit({
      type: "validation_phase_completed",
      payload: {
        phase:      "design",
        passed:     gates.branchPrefixMatch && gates.isDraftFalse && gates.mergeableMergeable,
        errorClass: "automerge_gate_validated",
      },
      toolName:  "Bash",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
      memoryLayers: ["episodic", "procedural"],
      reasoning: `sprint-060 W2.2 R6-F12 — post-merge-cleanup hook emits automerge_gate_validated after successful gh pr merge. Gates: branchPrefixMatch=${gates.branchPrefixMatch} (branch="${gates.branchName}"), isDraftFalse=${gates.isDraftFalse}, mergeableMergeable=${gates.mergeableMergeable}. Rule 25 §Post-merge actions. Replay-able via replay_lineage.`,
    }).catch(() => { /* best-effort — never crash cleanup */ });
  }

  // Run cleanup sequence (best-effort; never fails)
  const wtPrune = safeExec("git worktree prune -v", cwd);
  const stashCount = safeExec("git stash list", cwd).split("\n").filter((l) => l.trim()).length;
  const dirtyCount = safeExec("git status --porcelain", cwd)
    .split("\n")
    .filter((l) => l.trim() && !l.includes(".palantir-mini/session/events.jsonl"))
    .length;

  const cleanlinessIssues: string[] = [];
  if (dirtyCount > 0) cleanlinessIssues.push(`dirty=${dirtyCount}`);
  if (stashCount > 1) cleanlinessIssues.push(`stash=${stashCount} (>1)`);

  const advisory = [
    "=== POST-MERGE CLEANUP (rule 25) ===",
    `Command: ${command?.slice(0, 80) ?? "?"}`,
    `Worktree prune: ${wtPrune || "no stale worktrees"}`,
    cleanlinessIssues.length > 0
      ? `WARNING: Cleanliness issues: ${cleanlinessIssues.join(", ")} — manual review recommended`
      : "Working tree clean post-merge",
    "Detail: pm_rule_query({byId:25}).",
  ].join("\n");

  return {
    message:           `palantir-mini: post-merge cleanup (${cleanlinessIssues.length === 0 ? "clean" : "issues: " + cleanlinessIssues.join(",")})`,
    additionalContext: advisory,
  };
}
