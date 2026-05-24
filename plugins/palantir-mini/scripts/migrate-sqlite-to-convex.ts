#!/usr/bin/env bun
// palantir-mini sprint-061 B.W1 — migrate-sqlite-to-convex script
// CLI: bun script.ts [--dry-run] [--projects PATH1,PATH2,...]
//
// PURPOSE: One-time migration of existing SQLite impact-graph data to Convex.
// Reads impact_edges table from each project's SQLite DB and calls
// getConvexClient().applyDiff() for each file's edges.
//
// Default SQLite DB paths:
//   /home/palantirkc/.palantir-mini/impact-graph.db
//   /home/palantirkc/projects/palantir-math/.palantir-mini/impact-graph.db
//   /home/palantirkc/projects/mathcrew/.palantir-mini/impact-graph.db
//
// Idempotent: skips files where Convex contentHash already matches.
// Dry-run: logs row counts and estimated edges without Convex writes.
//
// Convex not configured? Advisory + exit 0 (no crash).
//
// Authority: sprint-061 plan §3.B.W1 Step E

import * as fs from "fs";
import * as path from "path";

// ─── Arg parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

const projectsArgIdx = args.indexOf("--projects");
let projectPaths: string[] | null = null;
const projectsArgValue: string | undefined = projectsArgIdx !== -1 ? args[projectsArgIdx + 1] : undefined;
if (projectsArgValue) {
  projectPaths = projectsArgValue.split(",").map((p) => p.trim());
}

// ─── Default DB paths ─────────────────────────────────────────────────────────

const HOME = process.env.HOME ?? "/home/palantirkc";

const DEFAULT_DB_PATHS = [
  path.join(HOME, ".palantir-mini", "impact-graph.db"),
  path.join(HOME, "projects", "palantir-math", ".palantir-mini", "impact-graph.db"),
  path.join(HOME, "projects", "mathcrew", ".palantir-mini", "impact-graph.db"),
];

// Resolve project paths → DB paths
function resolveDbPaths(): { dbPath: string; projectRoot: string }[] {
  if (projectPaths) {
    return projectPaths.map((projectRoot) => ({
      dbPath:      path.join(projectRoot, ".palantir-mini", "impact-graph.db"),
      projectRoot,
    }));
  }
  return DEFAULT_DB_PATHS.map((dbPath) => {
    // Infer project root from db path: db is at <root>/.palantir-mini/impact-graph.db
    const projectRoot = path.dirname(path.dirname(dbPath));
    return { dbPath, projectRoot };
  });
}

// ─── Check Convex configured ──────────────────────────────────────────────────

function isConvexConfigured(): boolean {
  if (process.env.CONVEX_URL) return true;
  if (process.env.CONVEX_DEPLOYMENT) return true;
  const PLUGIN_ROOT = path.resolve(import.meta.dirname ?? __dirname, "..");
  for (const candidate of [
    path.join(PLUGIN_ROOT, "convex", ".env.local"),
    path.join(PLUGIN_ROOT, ".env.local"),
  ]) {
    if (fs.existsSync(candidate)) {
      try {
        const content = fs.readFileSync(candidate, "utf8");
        if (/^CONVEX_URL=/m.test(content)) return true;
      } catch { /* ignore */ }
    }
  }
  return false;
}

// ─── SQLite row type (mirrors impact_edges DDL) ───────────────────────────────

interface SqliteEdgeRow {
  fromRid:    string;
  toRid:      string;
  edgeKind:   string;
  confidence: number;
  evidence:   string | null;
  scannedAt:  string;
}

// ─── Migration logic ──────────────────────────────────────────────────────────

async function migrateDb(
  dbPath:      string,
  projectRoot: string,
): Promise<{ rowsRead: number; filesProcessed: number; edgesUpserted: number; skipped: number }> {
  if (!fs.existsSync(dbPath)) {
    process.stderr.write(`[migrate-sqlite-to-convex] DB not found: ${dbPath} — skipping\n`);
    return { rowsRead: 0, filesProcessed: 0, edgesUpserted: 0, skipped: 0 };
  }

  // Dynamic import bun:sqlite
  const { Database } = await import("bun:sqlite");
  const db = new Database(dbPath, { readonly: true });

  let rows: SqliteEdgeRow[];
  try {
    rows = db.query(`
      SELECT fromRid, toRid, edgeKind, confidence, evidence, scannedAt
      FROM impact_edges
      ORDER BY fromRid, scannedAt
    `).all() as SqliteEdgeRow[];
  } catch (e) {
    process.stderr.write(
      `[migrate-sqlite-to-convex] Failed to query ${dbPath}: ${(e as Error).message}\n`,
    );
    db.close();
    return { rowsRead: 0, filesProcessed: 0, edgesUpserted: 0, skipped: 0 };
  }
  db.close();

  process.stderr.write(
    `[migrate-sqlite-to-convex] ${path.basename(projectRoot)}: read ${rows.length} rows\n`,
  );

  if (isDryRun) {
    // Count unique files
    const files = new Set(rows.map((r) => r.fromRid));
    process.stderr.write(
      `[migrate-sqlite-to-convex] DRY-RUN ${path.basename(projectRoot)}: ` +
      `${rows.length} rows, ${files.size} files, estimated ${rows.length} edges to upsert\n`,
    );
    return { rowsRead: rows.length, filesProcessed: files.size, edgesUpserted: 0, skipped: 0 };
  }

  // Group rows by fromRid (file)
  const byFile = new Map<string, SqliteEdgeRow[]>();
  for (const row of rows) {
    const existing = byFile.get(row.fromRid);
    if (existing) {
      existing.push(row);
    } else {
      byFile.set(row.fromRid, [row]);
    }
  }

  const { getConvexClient } = await import("../lib/impact-graph/convex-client");
  const client = getConvexClient();

  let edgesUpserted = 0;
  let skipped = 0;

  for (const [fromRid, edgeRows] of byFile) {
    // fromRid is "file:relative/path" — extract file path
    const filePath = fromRid.startsWith("file:") ? fromRid.slice(5) : fromRid;
    const absPath  = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);

    // Idempotency check: skip if Convex already has a matching contentHash
    let convexHash: string | null = null;
    try {
      const fileState = await client.getFileState(projectRoot, filePath);
      convexHash = fileState?.contentHash ?? null;
    } catch { /* non-fatal */ }

    // Compute content hash from disk (if file exists)
    let diskHash: string | null = null;
    if (fs.existsSync(absPath)) {
      try {
        const { createHash } = await import("crypto");
        const content = fs.readFileSync(absPath, "utf8");
        diskHash = createHash("sha256").update(content, "utf8").digest("hex");
      } catch { /* non-fatal */ }
    }

    if (convexHash && diskHash && convexHash === diskHash) {
      skipped += 1;
      process.stderr.write(
        `[migrate-sqlite-to-convex] SKIP ${filePath} (hash matches Convex)\n`,
      );
      continue;
    }

    // Apply diff: all edges from SQLite are "added" (full replacement)
    try {
      const addedEdges = edgeRows.map((r) => ({
        projectRoot,
        fromRid:      r.fromRid,
        toRid:        r.toRid,
        edgeKind:     r.edgeKind,
        confidence:   r.confidence,
        evidence:     r.evidence ?? undefined,
        registeredAt: r.scannedAt,
      }));

      const result = await client.applyDiff({
        projectRoot,
        filePath,
        contentHash:  diskHash ?? "migrated-from-sqlite",
        addedEdges,
        deletedEdges: [],
        walkDurationMs: 0,
      });

      edgesUpserted += result.added;
      process.stderr.write(
        `[migrate-sqlite-to-convex] UPSERTED ${filePath}: +${result.added} edges\n`,
      );
    } catch (e) {
      process.stderr.write(
        `[migrate-sqlite-to-convex] WARN applyDiff failed for ${filePath}: ${(e as Error).message}\n`,
      );
    }
  }

  return { rowsRead: rows.length, filesProcessed: byFile.size, edgesUpserted, skipped };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

(async () => {
  if (!isDryRun && !isConvexConfigured()) {
    process.stderr.write(
      "[migrate-sqlite-to-convex] ADVISORY: Convex deployment not configured " +
      "(no CONVEX_URL env, no CONVEX_DEPLOYMENT env, no .env.local). " +
      "Run `bunx convex dev` first, or use --dry-run to preview row counts.\n",
    );
    process.exit(0);
  }

  const dbEntries = resolveDbPaths();
  process.stderr.write(
    `[migrate-sqlite-to-convex] Starting ${isDryRun ? "DRY-RUN " : ""}migration for ${dbEntries.length} DB(s)\n`,
  );

  let totalRows = 0;
  let totalFiles = 0;
  let totalEdges = 0;
  let totalSkipped = 0;

  for (const { dbPath, projectRoot } of dbEntries) {
    try {
      const stats = await migrateDb(dbPath, projectRoot);
      totalRows    += stats.rowsRead;
      totalFiles   += stats.filesProcessed;
      totalEdges   += stats.edgesUpserted;
      totalSkipped += stats.skipped;
    } catch (e) {
      process.stderr.write(
        `[migrate-sqlite-to-convex] FATAL for ${dbPath}: ${(e as Error).message}\n`,
      );
    }
  }

  process.stderr.write(
    `[migrate-sqlite-to-convex] DONE — rows=${totalRows} files=${totalFiles} ` +
    `edgesUpserted=${totalEdges} skipped=${totalSkipped}${isDryRun ? " (DRY-RUN)" : ""}\n`,
  );

  process.exit(0);
})();
