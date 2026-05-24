// palantir-mini v4.9.0 / sprint-055 W2.C — session-end-cleanup hook
// Fires on: Stop (async: true, advisory only — never blocks)
//
// At session end, auto-stages "auto-regen" classified files (chrome-native-host,
// .codex-plugin/plugin.json, .cursor-plugin/plugin.json, src/generated/**)
// so the next session starts clean. Emits auto_regen_committed event.
// User-WIP and ephemeral files are NEVER touched.
//
// This hook reduces dirty count by handling auto-regen automatically. It does
// not block session end; cleanliness is enforced by pre-PR gates and ship flow.
//
// Bypass: PALANTIR_MINI_SESSION_END_AUTOCOMMIT_DISABLE=1.
//
// Authority: ~/.claude/rules/25-auto-merge-cleanup-default.md v1.1.0+

import { execSync } from "child_process";
import { classifyDirty } from "../lib/dirty-classify";
import { emit } from "../scripts/log";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message:   string;
  decision?: "block" | "continue";
  reason?:   string;
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

function tryGitAdd(cwd: string, paths: readonly string[]): { staged: number; failed: string[] } {
  let staged = 0;
  const failed: string[] = [];
  for (const p of paths) {
    try {
      execSync(`git add -- ${JSON.stringify(p)}`, { cwd, timeout: 5000, stdio: "ignore" });
      staged += 1;
    } catch (err) {
      failed.push(p);
    }
  }
  return { staged, failed };
}

export default async function sessionEndCleanup(payload: unknown): Promise<HookResult> {
  const p   = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  if (process.env.PALANTIR_MINI_SESSION_END_AUTOCOMMIT_DISABLE === "1") {
    return { message: "palantir-mini: session-end-cleanup bypassed (PALANTIR_MINI_SESSION_END_AUTOCOMMIT_DISABLE=1)" };
  }

  const porcelain = safeExec("git status --porcelain", cwd);
  if (!porcelain) {
    return { message: "palantir-mini: session-end-cleanup OK (clean)", decision: "continue" };
  }

  const result = classifyDirty(porcelain);
  const autoRegen = result.entries.filter((e) => e.axis === "auto-regen");

  if (autoRegen.length === 0) {
    return {
      message:  `palantir-mini: session-end-cleanup — no auto-regen to stage (total dirty=${result.total})`,
      decision: "continue",
    };
  }

  const paths = autoRegen.map((e) => e.path);
  const { staged, failed } = tryGitAdd(cwd, paths);

  // Best-effort emit
  try {
    await emit({
      type: "phase_completed",
      payload: {
        phaseTag:    "auto_regen_committed",
        taskId:      "session-end-cleanup",
        validations: [
          `stagedCount=${staged}`,
          `failedCount=${failed.length}`,
          ...paths.slice(0, 10).map((p) => `file=${p}`),
        ],
      },
      toolName:  "session-end-cleanup",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
      memoryLayers: ["procedural"],
      reasoning: `Auto-staged ${staged}/${paths.length} auto-regen files at session end (rule 25 v1.1.0).`,
    });
  } catch { /* best-effort */ }

  return {
    message: `palantir-mini: session-end-cleanup auto-staged ${staged}/${paths.length} auto-regen files${failed.length > 0 ? ` (${failed.length} failed)` : ""}`,
    decision: "continue",
  };
}
