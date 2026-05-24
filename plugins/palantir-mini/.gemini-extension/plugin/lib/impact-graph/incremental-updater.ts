/**
 * palantir-mini sprint-061 B.W1 — Incremental impact-graph updater
 * @owner hook-builder
 * @purpose Hash-gated incremental update for a single file via Convex.
 *          Computes old vs new edge diff; calls applyDiff mutation atomically.
 *          Per operating model §4.5.6a.5.
 *
 * 50ms client ceiling: if Convex round-trip exceeds 50ms, logs advisory but
 * still completes the update. The ceiling is a performance target, not a gate.
 */

import * as fs from "fs";
import * as crypto from "crypto";
import * as path from "path";
import {
  getConvexClient,
  type ConvexEdge,
  type ApplyDiffArgs,
} from "./convex-client";
import { walkProject } from "./ast-walker";
import type { StoredEdge } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Convert a StoredEdge (from ts-morph walk) to a ConvexEdge ready for insert.
 * projectRoot is the partition key.
 */
function storedToConvex(e: StoredEdge, projectRoot: string): ConvexEdge {
  return {
    projectRoot,
    fromRid:      e.fromRid,
    toRid:        e.toRid,
    edgeKind:     e.edgeKind as ConvexEdge["edgeKind"],
    confidence:   e.confidence,
    evidence:     e.evidence,
    registeredAt: e.scannedAt,
  };
}

/**
 * Edge equality key (fromRid + toRid + edgeKind).
 * Used to compute diff between old and new edge sets.
 */
function edgeKey(e: { fromRid: string; toRid: string; edgeKind: string }): string {
  return `${e.fromRid}:${e.toRid}:${e.edgeKind}`;
}

// ─── IncrementalImpactUpdater ─────────────────────────────────────────────────

export class IncrementalImpactUpdater {
  /**
   * Update the impact graph for a single file.
   *
   * 1. Compute sha256 of new file content.
   * 2. Compare with stored contentHash in Convex fileState (hash-gate).
   * 3. If unchanged, skip (no-op).
   * 4. Walk the file with ts-morph; compute edge diff (added/deleted).
   * 5. Call applyDiff Convex mutation atomically.
   *
   * @param projectRoot  Absolute project root (Convex partition key).
   * @param filePath     Absolute or project-relative file path.
   * @param newContent   Current file content (pass in to avoid double-read).
   *                     When undefined, reads from disk.
   * @param tsConfigPath Optional tsconfig path for ts-morph resolution.
   */
  async updateFile(
    projectRoot: string,
    filePath: string,
    newContent?: string,
    tsConfigPath?: string,
  ): Promise<{
    skipped: boolean;
    added: number;
    deleted: number;
    durationMs: number;
  }> {
    const t0 = Date.now();

    // Resolve absolute path
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(projectRoot, filePath);
    const relPath = path.relative(projectRoot, absPath).replace(/\\/g, "/");

    // Read content if not supplied
    let content = newContent;
    if (content === undefined) {
      try {
        content = fs.readFileSync(absPath, "utf8");
      } catch {
        // File may have been deleted; treat as cascade-delete
        try {
          await getConvexClient().cascadeDelete(projectRoot, relPath);
        } catch { /* best-effort */ }
        return { skipped: false, added: 0, deleted: -1, durationMs: Date.now() - t0 };
      }
    }

    const newHash = sha256(content);

    // Hash-gate: check existing fileState
    try {
      const fileState = await getConvexClient().getFileState(projectRoot, relPath);
      if (fileState && fileState.contentHash === newHash) {
        // Unchanged — skip walk
        return { skipped: true, added: 0, deleted: 0, durationMs: Date.now() - t0 };
      }
    } catch {
      // Non-fatal: proceed with full update
    }

    // Walk file with ts-morph (single-file scope via projectRoot + path)
    const walkResult = walkProject({
      projectRoot,
      tsConfigPath,
    });

    // Filter edges for this specific file RID
    const fileRid = `file:${relPath}`;
    const newEdges = walkResult.edges.filter(
      (e) => e.fromRid === fileRid,
    );

    // Fetch existing edges from Convex for diff
    let oldEdges: { fromRid: string; toRid: string; edgeKind: string }[] = [];
    try {
      const result = await getConvexClient().getImpactGraph(projectRoot, fileRid, 1);
      oldEdges = result.forward;
    } catch {
      // Non-fatal: treat as no prior edges
    }

    // Compute diff
    const oldKeySet = new Set(oldEdges.map(edgeKey));
    const newKeySet = new Set(newEdges.map(edgeKey));

    const addedEdges = newEdges
      .filter((e) => !oldKeySet.has(edgeKey(e)))
      .map((e) => storedToConvex(e, projectRoot));

    const deletedEdges = oldEdges
      .filter((e) => !newKeySet.has(edgeKey(e)))
      .map((e) => ({
        projectRoot,
        fromRid:  e.fromRid,
        toRid:    e.toRid,
        edgeKind: e.edgeKind,
      }));

    const walkDurationMs = Date.now() - t0;

    // 50ms ceiling advisory
    if (walkDurationMs > 50) {
      try {
        process.stderr.write(
          `[palantir-mini/incremental-updater] ${relPath}: walk+diff took ${walkDurationMs}ms (>50ms ceiling advisory)\n`,
        );
      } catch { /* ignore */ }
    }

    // Apply diff via Convex mutation
    const diffArgs: ApplyDiffArgs = {
      projectRoot,
      filePath:   relPath,
      contentHash: newHash,
      addedEdges,
      deletedEdges: deletedEdges as ApplyDiffArgs["deletedEdges"],
      walkDurationMs,
      lastWalkedTsConfig: tsConfigPath,
    };

    let added = 0;
    let deleted = 0;
    try {
      const result = await getConvexClient().applyDiff(diffArgs);
      added = result.added;
      deleted = result.deleted;
    } catch (e) {
      process.stderr.write(
        `[palantir-mini/incremental-updater] applyDiff failed for ${relPath}: ${(e as Error).message}\n`,
      );
    }

    return { skipped: false, added, deleted, durationMs: Date.now() - t0 };
  }

  /**
   * Cascade-delete all edges for a file (called on rm / git rm).
   */
  async cascadeDelete(
    projectRoot: string,
    filePath: string,
  ): Promise<{ deletedCount: number }> {
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(projectRoot, filePath);
    const relPath = path.relative(projectRoot, absPath).replace(/\\/g, "/");

    try {
      return await getConvexClient().cascadeDelete(projectRoot, relPath);
    } catch (e) {
      process.stderr.write(
        `[palantir-mini/incremental-updater] cascadeDelete failed for ${relPath}: ${(e as Error).message}\n`,
      );
      return { deletedCount: 0 };
    }
  }
}
