/**
 * palantir-mini sprint-061 B.W1 — Convex impact-graph client
 * @owner hook-builder
 * @purpose Wraps ConvexClient for impact-graph queries/mutations.
 *          Replaces lib/impact-graph/sqlite-cache.ts as the primary SSoT.
 *          Per operating model §4.5.6a and rule 27 (cross-runtime substrate).
 *
 * STUB-ONLY as of W3f-1 (2026-06-08): the Convex Cloud mirror is disabled.
 * The real ConvexHttpClient and its WAL buffering have been removed;
 * `getConvexClient()` ALWAYS returns a `StubConvexClient`. All queries return
 * empty results and all mutations are no-ops that log to stderr. The public
 * export surface (names + signatures) is preserved so all importers keep
 * typechecking; callers degrade gracefully via `getConvexClient().isStub`.
 */

import * as path from "path";
import type { BackPropValueIndexEntry } from "#schemas/ontology/primitives/back-prop-value-index";
import type { AIPEvaluationRunConvexRow } from "#schemas/ontology/primitives/aip-evaluation";

// ─── Types (mirrors StoredEdge from sqlite-cache for interface parity) ────────

export interface ConvexEdge {
  /** Absolute project root (partition key) */
  projectRoot:  string;
  fromRid:      string;
  toRid:        string;
  edgeKind:     string;
  confidence:   number;
  evidence?:    string;
  registeredAt: string;
  verifiedAt?:  string;
}

export interface ConvexFileState {
  projectRoot:       string;
  filePath:          string;
  contentHash:       string;
  lastWalkedAt:      string;
  lastWalkedTsConfig: string;
  edgeCount:         number;
  walkDurationMs:    number;
}

export interface ImpactGraphResult {
  forward:    ConvexEdge[];
  backward:   ConvexEdge[];
  transitive: {
    forward:  ConvexEdge[];
    backward: ConvexEdge[];
  };
}

export interface ApplyDiffArgs {
  projectRoot:        string;
  filePath:           string;
  contentHash:        string;
  addedEdges:         Omit<ConvexEdge, "_id" | "_creationTime">[];
  deletedEdges:       Pick<ConvexEdge, "projectRoot" | "fromRid" | "toRid" | "edgeKind">[];
  walkDurationMs:     number;
  lastWalkedTsConfig?: string;
}

/**
 * Arguments for mirrorDecisionEvent — maps BackPropValueIndexEntry 18 keys
 * onto the Convex decisionEvents mutation shape.
 * Per canonical plan v2 §4 row 4.1c (sprint-102 PR 4.1c).
 */
export interface MirrorDecisionEventArgs {
  projectRoot:    string;
  sequence:       number;
  eventType:      string;
  valueGrade:     "T0" | "T1" | "T2" | "T3" | "T4";
  byWhomIdentity: string;
  when:           string;
  raw:            string;
  /** 18-key BackPropValueIndexEntry fields (all optional except eventId + when above) */
  entry?: BackPropValueIndexEntry;
}

/**
 * Result of queryRecentEvalRuns.
 * Per canonical plan v2 §4 row 5.4b (sprint-115 PR 5.4b).
 */
export interface EvalRunQueryResult {
  /** Runs ordered by ranAt descending (most recent first), up to limit. */
  rows: AIPEvaluationRunConvexRow[];
}

// ─── No-op stub client (Convex Cloud mirror disabled — W3f-1) ────────────────

class StubConvexClient {
  readonly isStub = true;

  warn(method: string): void {
    try {
      process.stderr.write(
        `[palantir-mini/convex-client] STUB mode — ${method} is a no-op. ` +
        `Run \`bunx convex dev\` in plugins/palantir-mini to bind a real deployment.\n`,
      );
    } catch { /* ignore */ }
  }

  async getImpactGraph(_projectRoot: string, _rid: string, _depth?: number): Promise<ImpactGraphResult> {
    this.warn("getImpactGraph");
    return { forward: [], backward: [], transitive: { forward: [], backward: [] } };
  }

  async getFileState(_projectRoot: string, _filePath: string): Promise<ConvexFileState | null> {
    this.warn("getFileState");
    return null;
  }

  async populateGraph(_projectRoot: string, _filePath: string, _contentHash: string, _edges: Omit<ConvexEdge, "_id" | "_creationTime">[], _walkDurationMs: number, _tsConfig?: string): Promise<{ upserted: number }> {
    this.warn("populateGraph");
    return { upserted: 0 };
  }

  async applyDiff(_args: ApplyDiffArgs): Promise<{ added: number; deleted: number }> {
    this.warn("applyDiff");
    return { added: 0, deleted: 0 };
  }

  async cascadeDelete(_projectRoot: string, _filePath: string): Promise<{ deletedCount: number }> {
    this.warn("cascadeDelete");
    return { deletedCount: 0 };
  }

  async markBatchDirty(_projectRoot: string, _paths: string[]): Promise<{ markedCount: number }> {
    this.warn("markBatchDirty");
    return { markedCount: 0 };
  }

  async dirtyCount(_projectRoot: string): Promise<number> {
    this.warn("dirtyCount");
    return 0;
  }

  async totalEdgeCount(_projectRoot?: string): Promise<number> {
    this.warn("totalEdgeCount");
    return 0;
  }

  async mirrorDecisionEvent(_args: MirrorDecisionEventArgs): Promise<{ _id: string; deduped: boolean } | null> {
    this.warn("mirrorDecisionEvent");
    return null;
  }

  async queryRecentEvalRuns(_projectSlug: string, _limit: number): Promise<EvalRunQueryResult> {
    this.warn("queryRecentEvalRuns");
    return { rows: [] };
  }
}

// ─── Module-level singleton ───────────────────────────────────────────────────

let _client: StubConvexClient | null = null;

export function getConvexClient(): StubConvexClient {
  if (_client !== null) return _client;
  // STUB-ONLY as of W3f-1: the Convex Cloud mirror is disabled — always stub.
  _client = new StubConvexClient();
  return _client;
}

/** Reset the singleton (primarily for tests). */
export function resetConvexClient(): void {
  _client = null;
}

// ─── Public API (matches sqlite-cache interface for handler drop-in swap) ────

/** Resolve a file path to a project-relative RID. */
export function normalize(filePath: string, projectRoot: string): string {
  if (path.isAbsolute(filePath)) {
    const rel = path.relative(projectRoot, filePath);
    return rel.startsWith("..") ? filePath : rel.replace(/\\/g, "/");
  }
  return filePath.replace(/\\/g, "/");
}

export async function getImpactGraph(
  projectRoot: string,
  rid: string,
  depth?: number,
): Promise<ImpactGraphResult> {
  return getConvexClient().getImpactGraph(projectRoot, rid, depth);
}

export async function getFileState(
  projectRoot: string,
  filePath: string,
): Promise<ConvexFileState | null> {
  return getConvexClient().getFileState(projectRoot, filePath);
}

export async function populateGraph(
  projectRoot: string,
  filePath: string,
  contentHash: string,
  edges: Omit<ConvexEdge, "_id" | "_creationTime">[],
  walkDurationMs: number,
  tsConfig?: string,
): Promise<{ upserted: number }> {
  return getConvexClient().populateGraph(projectRoot, filePath, contentHash, edges, walkDurationMs, tsConfig);
}

export async function applyDiff(args: ApplyDiffArgs): Promise<{ added: number; deleted: number }> {
  return getConvexClient().applyDiff(args);
}

export async function cascadeDelete(
  projectRoot: string,
  filePath: string,
): Promise<{ deletedCount: number }> {
  return getConvexClient().cascadeDelete(projectRoot, filePath);
}

export async function markBatchDirty(
  projectRoot: string,
  paths: string[],
): Promise<{ markedCount: number }> {
  return getConvexClient().markBatchDirty(projectRoot, paths);
}

export async function dirtyCount(projectRoot: string): Promise<number> {
  return getConvexClient().dirtyCount(projectRoot);
}

export async function totalEdgeCount(projectRoot?: string): Promise<number> {
  return getConvexClient().totalEdgeCount(projectRoot);
}

/**
 * Mirror a T3+/T4 event to Convex using the 18-key BackPropValueIndexEntry
 * envelope shape.
 * STUB-ONLY as of W3f-1: returns null immediately (Convex Cloud mirror disabled).
 * Per canonical plan v2 §4 row 4.1c (sprint-102 PR 4.1c).
 */
export async function mirrorDecisionEvent(
  args: MirrorDecisionEventArgs,
): Promise<{ _id: string; deduped: boolean } | null> {
  return getConvexClient().mirrorDecisionEvent(args);
}

/**
 * Query recent eval runs from Convex evalRuns table for a given projectSlug.
 * Returns rows ordered by ranAt descending, up to limit.
 * STUB-ONLY as of W3f-1: returns { rows: [] } (Convex Cloud mirror disabled).
 * Per canonical plan v2 §4 row 5.4b (sprint-115 PR 5.4b).
 */
export async function queryRecentEvalRuns(
  projectSlug: string,
  limit: number,
): Promise<EvalRunQueryResult> {
  return getConvexClient().queryRecentEvalRuns(projectSlug, limit);
}

// Re-export types for callers
export type { BackPropValueIndexEntry } from "#schemas/ontology/primitives/back-prop-value-index";
export type { AIPEvaluationRunConvexRow } from "#schemas/ontology/primitives/aip-evaluation";
