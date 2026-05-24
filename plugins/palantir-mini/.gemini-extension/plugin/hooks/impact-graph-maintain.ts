// palantir-mini sprint-061 B.W1 — impact-graph-maintain hook
// Fires on: PostToolUse(Edit|Write|MultiEdit|NotebookEdit)
//
// PURPOSE: Continuous-maintenance hook for the Convex impact-graph substrate.
// After any file edit, checks whether the file's content hash changed since the
// last walk. If changed, spawns a detached incremental re-walk via
// scripts/impact-graph-incremental-convex.ts. 50ms ceiling on client round-trip.
//
// Skip conditions:
//   • File extension not in {.ts,.tsx,.js,.jsx,.md}
//   • Convex returns a matching contentHash (no-op gate)
//
// Authority: sprint-061 plan §3.B.W1 Step D + operating model §4.5.6a.3

import * as fs from "fs";
import * as crypto from "crypto";
import * as path from "path";
import { emit } from "../scripts/log";
import { getConvexClient } from "../lib/impact-graph/convex-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    file_path?:     string;
    notebook_path?: string;
    new_string?:    string;
    [key: string]:  unknown;
  };
  tool_response?: {
    content?: string;
    [key: string]: unknown;
  };
}

interface HookResult {
  message:   string;
  decision?: "continue";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLUGIN_ROOT = path.resolve(
  import.meta.dirname ?? __dirname,
  "..",
);

const TRACKED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".md"]);
const CLIENT_CEILING_MS  = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256File(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return crypto.createHash("sha256").update(content, "utf8").digest("hex");
  } catch {
    return null;
  }
}

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
  );
}

/**
 * Infer project root from file path by walking up to find .palantir-mini dir.
 * Falls back to cwd when no project root found.
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

export default async function impactGraphMaintain(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd      = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "Edit";

  const rawPath = p.tool_input?.file_path ?? p.tool_input?.notebook_path ?? "";
  if (!rawPath || typeof rawPath !== "string") {
    return { message: "palantir-mini: impact-graph-maintain SKIP (no file_path)", decision: "continue" };
  }

  // Resolve absolute path
  const home     = process.env.HOME ?? "/home/palantirkc";
  let absPath = rawPath;
  if (rawPath.startsWith("~/")) {
    absPath = path.join(home, rawPath.slice(2));
  } else if (!path.isAbsolute(rawPath)) {
    absPath = path.resolve(cwd, rawPath);
  }

  // Extension filter
  const ext = path.extname(absPath).toLowerCase();
  if (!TRACKED_EXTENSIONS.has(ext)) {
    return { message: `palantir-mini: impact-graph-maintain SKIP (extension=${ext})`, decision: "continue" };
  }

  const projectRoot = resolveProjectRoot(absPath, cwd);
  const relPath     = path.relative(projectRoot, absPath).replace(/\\/g, "/");

  // Hash the current file
  const currentHash = sha256File(absPath);
  if (!currentHash) {
    return { message: "palantir-mini: impact-graph-maintain SKIP (unreadable file)", decision: "continue" };
  }

  try {
    // 50ms ceiling: race Convex lookup vs timeout
    const fileState = await Promise.race([
      getConvexClient().getFileState(projectRoot, relPath),
      timeoutAfter(CLIENT_CEILING_MS),
    ]).catch((err: Error) => {
      process.stderr.write(
        `[palantir-mini/impact-graph-maintain] Convex lookup: ${err.message}\n`,
      );
      return null;
    });

    // Hash-gate: skip if unchanged
    if (fileState && fileState.contentHash === currentHash) {
      return {
        message: `palantir-mini: impact-graph-maintain NO-OP (hash unchanged, file=${relPath})`,
        decision: "continue",
      };
    }
  } catch {
    // Non-fatal — proceed to spawn re-walk
  }

  // Spawn detached incremental re-walk (fire-and-forget)
  try {
    const scriptPath = path.join(PLUGIN_ROOT, "scripts", "impact-graph-incremental-convex.ts");
    Bun.spawn(["bun", scriptPath, projectRoot, absPath], {
      stdio: ["ignore", "ignore", "ignore"],
      // @ts-ignore — unref is valid in Bun but not in Node typings
    }).unref?.();
  } catch (spawnErr) {
    process.stderr.write(
      `[palantir-mini/impact-graph-maintain] spawn failed: ${(spawnErr as Error).message}\n`,
    );
  }

  // Emit 5-dim event (best-effort, async)
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase:      "design",
      passed:     true,
      errorClass: "impact_graph_file_marked_dirty",
    },
    toolName,
    cwd,
    sessionId:  p.session_id,
    identity:   "monitor",
    memoryLayers: ["procedural"],
    reasoning:  `PostToolUse:Edit triggered impact-graph re-walk for ${relPath} (changed content hash; sprint-061 B.W1 continuous-maintenance)`,
  }).catch(() => { /* best-effort */ });

  return {
    message: `palantir-mini: impact-graph-maintain SPAWNED re-walk (file=${relPath})`,
    decision: "continue",
  };
}
