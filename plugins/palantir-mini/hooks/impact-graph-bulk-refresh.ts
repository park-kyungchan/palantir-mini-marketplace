// palantir-mini sprint-061 B.W1 — impact-graph-bulk-refresh hook
// Fires on: PostToolUse(Bash)
//
// PURPOSE: Detect git commands that change the working tree in bulk
// (checkout, merge, rebase, pull) and mark all changed files as dirty
// in Convex so the impact graph stays consistent after branch switches.
//
// Matched commands:
//   git checkout ...
//   git merge ...
//   git rebase ...
//   git pull ...
//
// After matching, runs `git diff --name-only HEAD@{1} HEAD` to enumerate
// changed paths, calls markBatchDirty, then spawns a detached re-walk.
//
// Authority: sprint-061 plan §3.B.W1 Step D + operating model §4.5.6a.3

import * as path from "path";
import * as fs from "fs";
import { emit } from "../scripts/log";
import { getConvexClient } from "../lib/impact-graph/convex-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    command?: string;
    [key: string]: unknown;
  };
}

interface HookResult {
  message:   string;
  decision?: "continue";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GIT_BULK_REGEX = /^\s*git\s+(checkout|merge|rebase|pull)\b/;

const PLUGIN_ROOT = path.resolve(
  import.meta.dirname ?? __dirname,
  "..",
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Infer project root from cwd by walking up to find .palantir-mini dir.
 */
function resolveProjectRoot(cwd: string): string {
  let dir = cwd;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, ".palantir-mini");
    try {
      if (fs.statSync(candidate).isDirectory()) return dir;
    } catch { /* not found */ }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return cwd;
}

/**
 * Run `git diff --name-only HEAD@{1} HEAD` in the given cwd.
 * Returns list of changed paths (project-relative). Non-fatal on error.
 */
async function getChangedPaths(cwd: string): Promise<string[]> {
  try {
    const proc = Bun.spawn(["git", "diff", "--name-only", "HEAD@{1}", "HEAD"], {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;
    return stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default async function impactGraphBulkRefresh(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd      = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "Bash";

  const command = p.tool_input?.command ?? "";
  if (!command || typeof command !== "string") {
    return { message: "palantir-mini: impact-graph-bulk-refresh SKIP (no command)", decision: "continue" };
  }

  if (!GIT_BULK_REGEX.test(command)) {
    return { message: "palantir-mini: impact-graph-bulk-refresh SKIP (no git bulk pattern)", decision: "continue" };
  }

  const projectRoot  = resolveProjectRoot(cwd);
  const changedPaths = await getChangedPaths(cwd);

  if (changedPaths.length === 0) {
    return {
      message: "palantir-mini: impact-graph-bulk-refresh SKIP (no changed paths)",
      decision: "continue",
    };
  }

  // Mark batch dirty in Convex
  let markedCount = 0;
  try {
    const result = await getConvexClient().markBatchDirty(projectRoot, changedPaths);
    markedCount = result.markedCount;
  } catch (e) {
    process.stderr.write(
      `[palantir-mini/impact-graph-bulk-refresh] markBatchDirty failed: ${(e as Error).message}\n`,
    );
  }

  // Spawn detached re-walk runner for first changed path (batch-coalesce entry)
  if (changedPaths.length > 0) {
    try {
      const scriptPath = path.join(PLUGIN_ROOT, "scripts", "impact-graph-incremental-convex.ts");
      const first = changedPaths[0] ?? "";
      const firstPath  = path.isAbsolute(first)
        ? first
        : path.join(projectRoot, first);
      Bun.spawn(["bun", scriptPath, projectRoot, firstPath], {
        stdio: ["ignore", "ignore", "ignore"],
        // @ts-ignore — unref valid in Bun
      }).unref?.();
    } catch (spawnErr) {
      process.stderr.write(
        `[palantir-mini/impact-graph-bulk-refresh] spawn failed: ${(spawnErr as Error).message}\n`,
      );
    }
  }

  // Emit 5-dim event (best-effort)
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase:        "design",
      passed:       true,
      errorClass:   "impact_graph_bulk_refresh_started",
    } as Record<string, unknown>,
    toolName,
    cwd,
    sessionId:     p.session_id,
    identity:      "monitor",
    memoryLayers:  ["procedural"],
    reasoning:     `PostToolUse:Bash git-bulk-command triggered markBatchDirty for ${changedPaths.length} paths (markedCount=${markedCount}, sprint-061 B.W1 bulk-refresh)`,
  }).catch(() => { /* best-effort */ });

  return {
    message: `palantir-mini: impact-graph-bulk-refresh DONE (changed=${changedPaths.length}, marked=${markedCount})`,
    decision: "continue",
  };
}
