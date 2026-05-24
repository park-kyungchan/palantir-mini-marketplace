// palantir-mini v3.13.0+ — session-start-cleanliness hook handler
// Fires on: SessionStart (async: true, advisory only — never blocks)
//
// Sprint-020 W3 implementation per rule 25 §Working-tree cleanliness invariant.
// Detects working-tree pollution + stash accumulation early so user sees it
// at session start rather than discovering at Stop time.
//
// Trigger thresholds (only when BOTH are normal does the hook stay silent):
//   - dirty file count > 5 (excluding events.jsonl + user-prompt-profile.json
//     auto-mutated files used by the dirty classification gates)
//   - stash count > 1 (current sprint anti-scope stash allowed)
//
// Sprint mid-flight noise reduction: if any
//   <project>/.palantir-mini/harness/sprints/*/contract.json has status="active"
// then thresholds are relaxed (dirty > 20, stash > 3).
//
// Bypass: PALANTIR_MINI_CLEANLINESS_DISABLE=1.

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface CleanlinessResult {
  message:            string;
  additionalContext?: string;
}

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

/** Run a shell command, return trimmed stdout, or empty string on failure. */
function safeExec(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, timeout: 3000, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

/** Count git status lines, excluding auto-mutated paths. */
export function countDirtyFiles(cwd: string): number {
  const out = safeExec("git status --porcelain", cwd);
  if (!out) return 0;
  return out
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .filter((l) => !l.includes(".palantir-mini/session/events.jsonl"))
    .filter((l) => !l.includes(".claude/hooks/user-prompt-profile.json"))
    .length;
}

/** Count stash entries (lines from `git stash list`). */
export function countStashes(cwd: string): number {
  const out = safeExec("git stash list", cwd);
  return out ? out.split("\n").filter((l) => l.trim().length > 0).length : 0;
}

/** Detect sprint mid-flight via active SprintContract files. */
export function isSprintActive(cwd: string): boolean {
  const sprintsDir = path.join(cwd, ".palantir-mini", "harness", "sprints");
  if (!fs.existsSync(sprintsDir)) return false;
  try {
    for (const sprintName of fs.readdirSync(sprintsDir)) {
      const contractFile = path.join(sprintsDir, sprintName, "contract.json");
      if (!fs.existsSync(contractFile)) continue;
      const contract = JSON.parse(fs.readFileSync(contractFile, "utf8"));
      if (contract?.status === "active") return true;
    }
  } catch {
    // ignore — best-effort detection
  }
  return false;
}

export default async function sessionStartCleanliness(
  payload: unknown,
): Promise<CleanlinessResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  if (process.env.PALANTIR_MINI_CLEANLINESS_DISABLE === "1") {
    return { message: "palantir-mini: cleanliness check bypassed (PALANTIR_MINI_CLEANLINESS_DISABLE=1)" };
  }

  const dirty = countDirtyFiles(cwd);
  const stashes = countStashes(cwd);
  const sprintActive = isSprintActive(cwd);
  const dirtyThreshold = sprintActive ? 20 : 5;
  const stashThreshold = sprintActive ? 3 : 1;

  if (dirty <= dirtyThreshold && stashes <= stashThreshold) {
    return { message: `palantir-mini: working-tree clean (dirty=${dirty}, stashes=${stashes})` };
  }

  const advisory = [
    "=== WORKING-TREE CLEANLINESS ADVISORY (rule 25) ===",
    `Dirty files: ${dirty} (threshold ${dirtyThreshold}${sprintActive ? ", sprint mid-flight" : ""})`,
    `Stash count: ${stashes} (threshold ${stashThreshold})`,
    sprintActive
      ? "Active sprint detected — relaxed thresholds applied. Consider committing intermediate work."
      : "No active sprint. Recommend: commit, stash with intent, or invoke /palantir-mini:pm-quick-sprint.",
    "Bypass: PALANTIR_MINI_CLEANLINESS_DISABLE=1.",
    "Detail: pm_rule_query({byId:25}).",
  ].join("\n");

  return {
    message:           `palantir-mini: cleanliness advisory (dirty=${dirty}/${dirtyThreshold}, stashes=${stashes}/${stashThreshold}${sprintActive ? ", sprint-active" : ""})`,
    additionalContext: advisory,
  };
}
