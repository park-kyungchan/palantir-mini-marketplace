// DEPRECATED 2026-05-09 (sprint-061 B.W1) — replaced by lib/impact-graph/convex-client.ts. Removal target: sprint-062. DO NOT IMPORT.
/**
 * palantir-mini v3.7.0 — Impact Graph SQLite cache (orchestrator)
 * @owner palantirkc-plugin-learn
 * @purpose Wraps bun:sqlite for impact_edges table; transitive walks delegated to siblings.
 */
// Domain: LEARN (ImpactEdge prim-learn-12 — Context Engineering materialization)
// Decomposed in v3.7.0 A.2: types + walk-helpers extracted to ./sqlite-cache/*.

import { Database } from "bun:sqlite";
import * as path from "path";
import { transitiveForward, transitiveBackward } from "./sqlite-cache.deprecated/walk-helpers";
import type { StoredEdge } from "./types";

// Backward-compat re-exports
export type { AstEdgeKind, StoredEdge } from "./types";
export { transitiveForward, transitiveBackward } from "./sqlite-cache.deprecated/walk-helpers";

const DDL = `
  CREATE TABLE IF NOT EXISTS impact_edges (
    fromRid    TEXT NOT NULL,
    toRid      TEXT NOT NULL,
    edgeKind   TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    evidence   TEXT,
    scannedAt  TEXT NOT NULL,
    PRIMARY KEY (fromRid, toRid, edgeKind)
  );
  CREATE INDEX IF NOT EXISTS idx_impact_from ON impact_edges(fromRid);
  CREATE INDEX IF NOT EXISTS idx_impact_to   ON impact_edges(toRid);
`.trim();

export class ImpactGraphSqliteCache {
  private readonly db: Database;
  private readonly stmtUpsert: ReturnType<Database["prepare"]>;
  private readonly stmtByFrom: ReturnType<Database["prepare"]>;
  private readonly stmtByTo:   ReturnType<Database["prepare"]>;
  private readonly stmtCount:  ReturnType<Database["prepare"]>;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { create: true });
    this.db.run("PRAGMA journal_mode=WAL");
    this.db.run("PRAGMA synchronous=NORMAL");
    for (const stmt of DDL.split(";").map((s) => s.trim()).filter(Boolean)) {
      this.db.run(stmt);
    }

    this.stmtUpsert = this.db.prepare(`
      INSERT OR REPLACE INTO impact_edges
        (fromRid, toRid, edgeKind, confidence, evidence, scannedAt)
      VALUES ($fromRid, $toRid, $edgeKind, $confidence, $evidence, $scannedAt)
    `);

    this.stmtByFrom = this.db.prepare(`
      SELECT fromRid, toRid, edgeKind, confidence, evidence, scannedAt
      FROM impact_edges
      WHERE fromRid = $rid
    `);

    this.stmtByTo = this.db.prepare(`
      SELECT fromRid, toRid, edgeKind, confidence, evidence, scannedAt
      FROM impact_edges
      WHERE toRid = $rid
    `);

    this.stmtCount = this.db.prepare(`SELECT COUNT(*) as n FROM impact_edges`);
  }

  /** Upsert a single edge (INSERT OR REPLACE on PK). */
  upsertEdge(edge: StoredEdge): void {
    this.stmtUpsert.run({
      $fromRid:    edge.fromRid,
      $toRid:      edge.toRid,
      $edgeKind:   edge.edgeKind,
      $confidence: edge.confidence,
      $evidence:   edge.evidence ?? null,
      $scannedAt:  edge.scannedAt,
    });
  }

  /** Bulk upsert via a single transaction. Batched in chunks of 5000. */
  upsertBulk(edges: StoredEdge[]): void {
    const CHUNK = 5_000;
    for (let i = 0; i < edges.length; i += CHUNK) {
      const chunk = edges.slice(i, i + CHUNK);
      this.db.transaction(() => {
        for (const e of chunk) this.upsertEdge(e);
      })();
    }
  }

  /** Query outbound edges from a given source RID (direct, depth=1). */
  queryByFromRid(fromRid: string): StoredEdge[] {
    return this.stmtByFrom.all({ $rid: fromRid }) as StoredEdge[];
  }

  /** Query inbound edges to a given target RID (direct, depth=1). */
  queryByToRid(toRid: string): StoredEdge[] {
    return this.stmtByTo.all({ $rid: toRid }) as StoredEdge[];
  }

  /** Transitive BFS walk forward from startRid up to maxDepth. */
  walkTransitiveForward(startRid: string, maxDepth: number = 3): StoredEdge[] {
    return transitiveForward(this, startRid, maxDepth);
  }

  /** Transitive BFS walk backward from startRid up to maxDepth. */
  walkTransitiveBackward(startRid: string, maxDepth: number = 3): StoredEdge[] {
    return transitiveBackward(this, startRid, maxDepth);
  }

  /** Remove all rows. Used for full re-population. */
  clear(): void {
    this.db.run("DELETE FROM impact_edges");
  }

  /** Total edge count in the database. */
  count(): number {
    const row = this.stmtCount.get() as { n: number } | null;
    return row?.n ?? 0;
  }

  /** Normalize a file path to project-relative form (forward slashes). */
  static normalize(filePath: string, projectRoot: string): string {
    if (path.isAbsolute(filePath)) {
      const rel = path.relative(projectRoot, filePath);
      return rel.startsWith("..") ? filePath : rel.replace(/\\/g, "/");
    }
    return filePath.replace(/\\/g, "/");
  }

  close(): void {
    this.db.close();
  }
}
