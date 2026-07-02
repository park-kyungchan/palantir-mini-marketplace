// palantir-mini sprint-061 B.W1 — impact-graph-session-end-flush hook
// Fires on: Stop
//
// PURPOSE: At session end, query each registered project for dirty file counts.
// For any project with dirty files, spawn a detached re-walk runner to drain
// the queue. This ensures the impact graph is eventually consistent even when
// per-edit hooks were skipped (e.g. bulk edits, bypassed hooks).
//
// Project discovery:
//   1. ~/.claude/plugins/palantir-mini/registries/projects.json (if exists)
//   2. Fallback: scan known project roots under $HOME (or os.homedir() if HOME unset)
//
// Authority: sprint-061 plan §3.B.W1 Step D + operating model §4.5.6a.3

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { emit } from "../scripts/log";
import { getConvexClient } from "../lib/impact-graph/convex-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message:   string;
  decision?: "continue";
}

interface ProjectCounts {
  projectRoot: string;
  dirtyCount:  number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLUGIN_ROOT = path.resolve(
  import.meta.dirname ?? __dirname,
  "..",
);

const HOME = process.env.HOME ?? os.homedir();

/** Fallback project roots when projects.json absent. */
const FALLBACK_ROOTS = [
  HOME,
  path.join(HOME, "projects", "palantir-math"),
  path.join(HOME, "projects", "mathcrew"),
  path.join(HOME, "projects", "hyperframes"),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Attempt to read registered project roots from projects.json.
 * Returns null when file absent or parse fails.
 */
function readProjectsRegistry(): string[] | null {
  const registryPath = path.join(PLUGIN_ROOT, "registries", "projects.json");
  try {
    const raw = fs.readFileSync(registryPath, "utf8");
    const parsed = JSON.parse(raw) as { projects?: string[] };
    if (Array.isArray(parsed.projects)) return parsed.projects;
    return null;
  } catch {
    return null;
  }
}

/**
 * Discover project roots: from registry or fallback scan.
 * A path counts as a project root if it contains a .palantir-mini directory.
 */
function discoverProjectRoots(): string[] {
  const fromRegistry = readProjectsRegistry();
  if (fromRegistry && fromRegistry.length > 0) return fromRegistry;

  // Fallback: filter to those that exist and have .palantir-mini
  return FALLBACK_ROOTS.filter((root) => {
    try {
      return fs.statSync(path.join(root, ".palantir-mini")).isDirectory();
    } catch {
      return false;
    }
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default async function impactGraphSessionEndFlush(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  const projectRoots = discoverProjectRoots();
  if (projectRoots.length === 0) {
    return {
      message: "palantir-mini: impact-graph-session-end-flush SKIP (no projects discovered)",
      decision: "continue",
    };
  }

  const projectCounts: ProjectCounts[] = [];
  let totalDirty = 0;
  const spawned: string[] = [];

  for (const projectRoot of projectRoots) {
    try {
      const count = await getConvexClient().dirtyCount(projectRoot);
      projectCounts.push({ projectRoot, dirtyCount: count });
      if (count > 0) {
        totalDirty += count;

        // Spawn detached re-walk for this project
        // Pass projectRoot twice (second arg = projectRoot means "scan all dirty files")
        try {
          const scriptPath = path.join(PLUGIN_ROOT, "scripts", "impact-graph-incremental-convex.ts");
          Bun.spawn(["bun", scriptPath, projectRoot, "--all-dirty"], {
            stdio: ["ignore", "ignore", "ignore"],
            // @ts-ignore — unref valid in Bun
          }).unref?.();
          spawned.push(projectRoot);
        } catch (spawnErr) {
          process.stderr.write(
            `[palantir-mini/impact-graph-session-end-flush] spawn failed for ${projectRoot}: ${(spawnErr as Error).message}\n`,
          );
        }
      }
    } catch (e) {
      process.stderr.write(
        `[palantir-mini/impact-graph-session-end-flush] dirtyCount failed for ${projectRoot}: ${(e as Error).message}\n`,
      );
    }
  }

  // Emit 5-dim event (best-effort)
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase:      "design",
      passed:     true,
      errorClass: "impact_graph_session_flush",
    } as Record<string, unknown>,
    toolName:     "Stop",
    cwd,
    sessionId:    p.session_id,
    identity:     "monitor",
    memoryLayers: ["procedural", "episodic"],
    reasoning:    `Session-end flush: scanned ${projectRoots.length} projects; found ${totalDirty} dirty files across ${spawned.length} projects; spawned detached re-walk runners (sprint-061 B.W1)`,
  }).catch(() => { /* best-effort */ });

  const summary = projectCounts
    .map((c) => `${path.basename(c.projectRoot)}:${c.dirtyCount}`)
    .join(", ");

  return {
    message: `palantir-mini: impact-graph-session-end-flush DONE (projects=${projectRoots.length}, totalDirty=${totalDirty}, summary=[${summary}])`,
    decision: "continue",
  };
}
