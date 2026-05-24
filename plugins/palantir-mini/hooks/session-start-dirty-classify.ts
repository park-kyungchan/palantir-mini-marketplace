// palantir-mini v4.9.0 / sprint-055 W2.A — session-start-dirty-classify hook
// Fires on: SessionStart (async: true, advisory only by default)
//
// Reads `git status --porcelain`, classifies via lib/dirty-classify into
// 4 axes (auto-regen / runtime-substrate / user-WIP / ephemeral), surfaces a
// summary as `additionalContext` so Lead's first turn knows the working-tree
// state without manually checking.
//
// Sibling to session-start-cleanliness.ts (which only counts; this one
// categorizes). Both fire — they answer different questions:
//   - session-start-cleanliness: "is the dirty count over threshold?" (count)
//   - session-start-dirty-classify: "what KIND of dirt is this?" (categorical)
//
// Modes:
//   - default (advisory): emits message + additionalContext summary
//   - PALANTIR_MINI_DIRTY_GATE_STRICT=1: blocks SessionStart with exit-2
//     when out-of-scope user-WIP exceeds 5 entries
//
// Bypass: PALANTIR_MINI_DIRTY_CLASSIFY_DISABLE=1.
//
// Authority: ~/.claude/rules/25-auto-merge-cleanup-default.md v1.1.0+

import { execSync } from "child_process";
import { classifyDirty, formatSummary } from "../lib/dirty-classify";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message:            string;
  additionalContext?: string;
  decision?:          "block" | "continue";
  reason?:            string;
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

export default async function sessionStartDirtyClassify(
  payload: unknown,
): Promise<HookResult> {
  const p   = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  if (process.env.PALANTIR_MINI_DIRTY_CLASSIFY_DISABLE === "1") {
    return { message: "palantir-mini: dirty-classify bypassed (PALANTIR_MINI_DIRTY_CLASSIFY_DISABLE=1)" };
  }

  const porcelain = safeExec("git status --porcelain", cwd);
  if (!porcelain) {
    return { message: "palantir-mini: working-tree clean (no dirty entries)" };
  }

  const result = classifyDirty(porcelain);
  if (result.total === 0) {
    return { message: "palantir-mini: working-tree clean" };
  }

  const summary = formatSummary(result);
  const isStrict = process.env.PALANTIR_MINI_DIRTY_GATE_STRICT === "1";
  const userWipCount = result.byAxis["user-WIP"];

  // Strict mode: block if user-WIP exceeds threshold (5 = sprint-end buffer).
  if (isStrict && userWipCount > 5) {
    const wipList = result.entries
      .filter((e) => e.axis === "user-WIP")
      .slice(0, 10)
      .map((e) => `  ${e.status} ${e.path}`)
      .join("\n");
    const reason = [
      "=== DIRTY-GATE STRICT BLOCK (rule 25 v1.1.0) ===",
      summary,
      "",
      `User-WIP exceeds threshold (${userWipCount} > 5). Top 10:`,
      wipList,
      "",
      "Resolution: commit, stash, or run /palantir-mini:pm-dirty-classify --auto-stage.",
      "Bypass: unset PALANTIR_MINI_DIRTY_GATE_STRICT or set PALANTIR_MINI_DIRTY_CLASSIFY_DISABLE=1.",
    ].join("\n");
    return {
      message:  `palantir-mini: dirty-gate strict block (user-WIP=${userWipCount}/5)`,
      decision: "block",
      reason,
    };
  }

  // Default advisory mode.
  const advisory = [
    "=== DIRTY-CLASSIFY ADVISORY (rule 25 v1.1.0) ===",
    summary,
    "",
    "Suggested actions:",
    `  - auto-regen (${result.byAxis["auto-regen"]}): /palantir-mini:pm-dirty-classify --auto-stage`,
    `  - ephemeral (${result.byAxis["ephemeral"]}): add to .gitignore (W2.G targets these)`,
    `  - user-WIP (${result.byAxis["user-WIP"]}): preserve untouched`,
    "",
    "Bypass: PALANTIR_MINI_DIRTY_CLASSIFY_DISABLE=1.",
  ].join("\n");

  return {
    message:           `palantir-mini: dirty-classify (auto-regen=${result.byAxis["auto-regen"]}, runtime=${result.byAxis["runtime-substrate"]}, WIP=${userWipCount}, ephemeral=${result.byAxis["ephemeral"]})`,
    additionalContext: advisory,
  };
}
