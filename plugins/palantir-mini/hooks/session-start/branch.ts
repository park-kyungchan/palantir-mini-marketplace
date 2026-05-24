// palantir-mini v3.7.0 — hooks/session-start/branch.ts
// Live git branch resolution (v3.2.0 G6).
// Extracted from session-start.ts during A.1 decomposition.

import { execSync } from "child_process";

/**
 * v3.2.0 G6 — live `git branch --show-current` resolution.
 *
 * Pre-v3.2.0 SessionStart echoed a stale branch (often from prior cached
 * state) instead of the actual current branch. This helper reads the live
 * branch via the git CLI; non-git cwd OR command failure returns null,
 * which the caller treats as "skip the branch context line".
 */
export function liveBranch(cwd: string): string | null {
  try {
    const out = execSync("git branch --show-current", {
      cwd,
      encoding: "utf8",
      timeout:  1000,
      stdio:    ["pipe", "pipe", "pipe"],
    }).trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}
