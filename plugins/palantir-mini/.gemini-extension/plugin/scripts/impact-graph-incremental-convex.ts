#!/usr/bin/env bun
// palantir-mini sprint-061 B.W1 — impact-graph-incremental-convex script
// CLI: bun script.ts <projectRoot> <filePath>
//      bun script.ts <projectRoot> --all-dirty
//
// PURPOSE: CLI entry point for the incremental Convex impact-graph update.
// Invoked as a detached subprocess by PostToolUse hooks (impact-graph-maintain,
// impact-graph-bulk-refresh, impact-graph-session-end-flush).
//
// When filePath is a real path: calls IncrementalImpactUpdater.updateFile().
// When filePath is "--all-dirty": queries Convex for all dirty files and
// attempts incremental update for each (best-effort drain).
//
// Logs to stderr only — stdout is intentionally silent for fire-and-forget use.
// Exit 0 on success or non-fatal error; exit 1 on fatal.
//
// Authority: sprint-061 plan §3.B.W1 Step E + operating model §4.5.6a.3

import * as fs from "fs";
import * as path from "path";
import { IncrementalImpactUpdater } from "../lib/impact-graph/incremental-updater";

// ─── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length < 2) {
  process.stderr.write(
    "[impact-graph-incremental-convex] Usage: bun script.ts <projectRoot> <filePath|--all-dirty>\n",
  );
  process.exit(1);
}

const projectRoot: string = args[0] ?? "";
const fileArg: string = args[1] ?? "";

if (!projectRoot || !path.isAbsolute(projectRoot)) {
  process.stderr.write(
    `[impact-graph-incremental-convex] projectRoot must be absolute: got "${projectRoot}"\n`,
  );
  process.exit(1);
}

// ─── tsconfig heuristic ───────────────────────────────────────────────────────

const PLUGIN_ROOT = path.resolve(import.meta.dirname ?? __dirname, "..");

function resolveTsConfig(root: string): string {
  const candidates = [
    path.join(root, "tsconfig.json"),
    path.join(root, "tsconfig.base.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // Fallback to plugin root tsconfig
  return path.join(PLUGIN_ROOT, "tsconfig.json");
}

const tsConfigPath = resolveTsConfig(projectRoot);

// ─── Updater ──────────────────────────────────────────────────────────────────

const updater = new IncrementalImpactUpdater();

// ─── --all-dirty mode ─────────────────────────────────────────────────────────

async function drainAllDirty(): Promise<void> {
  // Import convex client lazily to avoid crash when Convex not configured
  let dirtyPaths: string[] = [];
  try {
    const { getConvexClient } = await import("../lib/impact-graph/convex-client");
    const client = getConvexClient();
    // dirtyCount gives a count; to get actual paths we query the impact graph.
    // The Convex schema stores dirty-state per fileState entry; we use totalEdgeCount
    // as a proxy. For full drain we'd need a listDirtyFiles query — use
    // a conservative fallback: scan .ts/.tsx/.js/.jsx files in project.
    const count = await client.dirtyCount(projectRoot);
    if (count === 0) {
      process.stderr.write(
        `[impact-graph-incremental-convex] --all-dirty: 0 dirty files in ${projectRoot}\n`,
      );
      return;
    }
    process.stderr.write(
      `[impact-graph-incremental-convex] --all-dirty: ${count} dirty files in ${projectRoot} — scanning filesystem\n`,
    );
  } catch (e) {
    process.stderr.write(
      `[impact-graph-incremental-convex] --all-dirty: Convex query failed (${(e as Error).message}); skipping drain\n`,
    );
    return;
  }

  // Walk project root for tracked files (limited depth scan)
  try {
    const { execSync } = await import("child_process");
    const output = execSync(
      `find "${projectRoot}" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | grep -v node_modules | grep -v ".palantir-mini" | head -200`,
      { encoding: "utf8", timeout: 10000 },
    );
    dirtyPaths = output.split("\n").filter(Boolean);
  } catch {
    process.stderr.write(
      "[impact-graph-incremental-convex] --all-dirty: filesystem scan failed\n",
    );
    return;
  }

  let updated = 0;
  for (const filePath of dirtyPaths) {
    try {
      const result = await updater.updateFile(projectRoot, filePath, undefined, tsConfigPath);
      if (!result.skipped) updated += 1;
    } catch {
      // non-fatal — continue drain
    }
  }

  process.stderr.write(
    `[impact-graph-incremental-convex] --all-dirty: updated ${updated}/${dirtyPaths.length} files\n`,
  );
}

// ─── Single file mode ─────────────────────────────────────────────────────────

async function updateSingleFile(filePath: string): Promise<void> {
  // Resolve absolute path
  const home = process.env.HOME ?? "/home/palantirkc";
  let absPath = filePath;
  if (filePath.startsWith("~/")) {
    absPath = path.join(home, filePath.slice(2));
  } else if (!path.isAbsolute(filePath)) {
    absPath = path.join(projectRoot, filePath);
  }

  const t0 = Date.now();
  try {
    const result = await updater.updateFile(projectRoot, absPath, undefined, tsConfigPath);
    const elapsed = Date.now() - t0;
    if (result.skipped) {
      process.stderr.write(
        `[impact-graph-incremental-convex] NO-OP (hash unchanged) ${absPath} (${elapsed}ms)\n`,
      );
    } else {
      process.stderr.write(
        `[impact-graph-incremental-convex] UPDATED ${absPath}: +${result.added} -${result.deleted} edges (${elapsed}ms)\n`,
      );
    }
  } catch (e) {
    process.stderr.write(
      `[impact-graph-incremental-convex] WARN update failed for ${absPath}: ${(e as Error).message}\n`,
    );
    // Non-fatal: exit 0 so the parent hook doesn't error
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

(async () => {
  try {
    if (fileArg === "--all-dirty") {
      await drainAllDirty();
    } else {
      await updateSingleFile(fileArg);
    }
    process.exit(0);
  } catch (e) {
    process.stderr.write(
      `[impact-graph-incremental-convex] FATAL: ${(e as Error).message}\n`,
    );
    process.exit(1);
  }
})();
