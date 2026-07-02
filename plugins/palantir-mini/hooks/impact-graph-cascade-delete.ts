// palantir-mini sprint-061 B.W1 — impact-graph-cascade-delete hook
// Fires on: PostToolUse(Bash)
//
// PURPOSE: Detect file-delete commands (rm, git rm, mv .../dev/null) and
// cascade-delete their impact-graph edges from Convex so stale edges don't
// pollute future impact queries.
//
// Matched commands:
//   rm [-flags] <path>
//   git rm <path>
//   mv <path> /dev/null
//
// Authority: sprint-061 plan §3.B.W1 Step D + operating model §4.5.6a.3

import * as path from "path";
import * as fs from "fs";
import * as os from "os";
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

// Matches: rm [-flags] path, git rm path, mv path /dev/null
const DELETE_REGEX = /^\s*(rm\s+(-[a-zA-Z]+\s+)?|git\s+rm\s+|mv\s+\S+\s+\/dev\/null)/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract file paths from a delete command.
 * Handles simple single-path forms (not glob expansion — best-effort).
 */
function extractDeletePaths(command: string): string[] {
  const trimmed = command.trim();
  const paths: string[] = [];

  // mv <src> /dev/null — extract src
  const mvMatch = trimmed.match(/^mv\s+(\S+)\s+\/dev\/null/);
  if (mvMatch?.[1]) {
    paths.push(mvMatch[1]);
    return paths;
  }

  // git rm [--cached] <path> — extract path arg after flags
  const gitRmMatch = trimmed.match(/^git\s+rm\s+(--?\S+\s+)?(.+)$/);
  if (gitRmMatch) {
    const pathPart = (gitRmMatch[2] ?? "").trim();
    // Split by whitespace for multiple files
    paths.push(...pathPart.split(/\s+/).filter(Boolean));
    return paths;
  }

  // rm [-flags] path1 path2 ...
  const rmMatch = trimmed.match(/^rm\s+(-[a-zA-Z]+\s+)?(.+)$/);
  if (rmMatch) {
    const pathPart = (rmMatch[2] ?? "").trim();
    paths.push(...pathPart.split(/\s+/).filter(Boolean));
    return paths;
  }

  return paths;
}

/**
 * Infer project root from file path by walking up to find .palantir-mini dir.
 */
function resolveProjectRoot(absFilePath: string, cwd: string): string {
  let dir = path.dirname(absFilePath);
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default async function impactGraphCascadeDelete(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd      = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "Bash";

  const command = p.tool_input?.command ?? "";
  if (!command || typeof command !== "string") {
    return { message: "palantir-mini: impact-graph-cascade-delete SKIP (no command)", decision: "continue" };
  }

  if (!DELETE_REGEX.test(command)) {
    return { message: "palantir-mini: impact-graph-cascade-delete SKIP (no delete pattern)", decision: "continue" };
  }

  const rawPaths = extractDeletePaths(command);
  if (rawPaths.length === 0) {
    return { message: "palantir-mini: impact-graph-cascade-delete SKIP (no paths extracted)", decision: "continue" };
  }

  // Resolve absolute paths and cascade-delete from Convex
  const home = process.env.HOME ?? os.homedir();
  const deletedFiles: string[] = [];
  let totalDeleted = 0;

  for (const rawPath of rawPaths) {
    let absPath = rawPath;
    if (rawPath.startsWith("~/")) {
      absPath = path.join(home, rawPath.slice(2));
    } else if (!path.isAbsolute(rawPath)) {
      absPath = path.resolve(cwd, rawPath);
    }

    const projectRoot = resolveProjectRoot(absPath, cwd);
    const relPath     = path.relative(projectRoot, absPath).replace(/\\/g, "/");

    try {
      const result = await getConvexClient().cascadeDelete(projectRoot, relPath);
      totalDeleted += result.deletedCount;
      deletedFiles.push(relPath);
    } catch (e) {
      process.stderr.write(
        `[palantir-mini/impact-graph-cascade-delete] cascadeDelete failed for ${relPath}: ${(e as Error).message}\n`,
      );
    }
  }

  // Emit 5-dim event (best-effort)
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase:      "design",
      passed:     true,
      errorClass: "impact_graph_edges_cascade_deleted",
    } as Record<string, unknown>,
    toolName,
    cwd,
    sessionId:    p.session_id,
    identity:     "monitor",
    memoryLayers: ["procedural"],
    reasoning:    `PostToolUse:Bash delete-command cascade-deleted ${totalDeleted} impact-graph edges for files=[${deletedFiles.join(",")}] (sprint-061 B.W1)`,
  }).catch(() => { /* best-effort */ });

  return {
    message: `palantir-mini: impact-graph-cascade-delete DONE (files=${deletedFiles.length}, edgesRemoved=${totalDeleted})`,
    decision: "continue",
  };
}
