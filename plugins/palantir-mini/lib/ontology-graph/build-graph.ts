/**
 * lib/ontology-graph/build-graph.ts — Top-level orchestrator that combines
 * all 12 concrete indexers (PR 2.4-2.13 + IMPACT-1 + PR-I S2) into a single
 * typed traversal over `OntologyGraphStore` (PR 2.3 sprint-080).
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/schemas/ontology/primitives/ (PR 2.1 node + PR 2.2 edge sources)
 *     → ~/ontology/shared-core/index.ts (consumer surface)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore + createOntologyGraphStore)
 *     → lib/ontology-graph/indexers/*.ts (12 concrete indexers)
 *     → this file (orchestration layer — passive; no event emission, no Convex)
 *     → PR 2.15 (pm_impact_query MCP handler — wraps this orchestrator)
 *
 * D/L/A domain: LOGIC — fans out to indexers, drains results into a fresh
 * store, returns store + stats. No event emission, no disk I/O beyond what
 * the underlying indexers perform. The orchestrator itself is passive.
 *
 * Sprint X3 PR 4/5. The `IndexerName` union below is the source of truth for
 * the count (now 12 after PR-I S2 wired the self-instance-edges indexer):
 *   1. browse-index    (PR 2.4 sprint-081)
 *   2. agents-rules    (PR 2.5 sprint-082)
 *   3. plugin-manifest (PR 2.6 sprint-083)
 *   4. skills          (PR 2.7 sprint-084)
 *   5. handlers        (PR 2.8 sprint-085)
 *   6. schema-primitives (PR 2.9 sprint-086)
 *   7. source-files    (PR 2.10 sprint-087)
 *   8. tests-evals     (PR 2.11 sprint-088)
 *   9. events          (PR 2.12 sprint-089)
 *  10. git-history     (PR 2.13 sprint-090)
 *  11. registered-primitives (IMPACT-1 — registered ontology primitives as nodes)
 *  12. self-instance-edges (PR-I S2 — pm's wiring surface projected onto the
 *      canonical self-ontology namespace + file-hash→canonical ALIAS edges)
 *
 * IMPLEMENTATION NOTE: Generic-only emission (Option A; inherits from PR 2.3
 * substrate). Orchestrator is generic over `TNode` / `TEdge` with `unknown`
 * defaults so a future snapshot-refresh chore can narrow the type
 * parameters without changing the public signature.
 *
 * Error containment: `Promise.allSettled` runs all 12 indexers concurrently
 * (when `opts.parallel ?? true`); a single rejection does NOT short-circuit
 * the other 11. The failed slot records `{ nodeCount: 0, edgeCount: 0,
 * durationMs, error: <message> }`. Sequential mode wraps each call in
 * try/catch for equivalent semantics.
 *
 * Two-pass drain (spec §2.6): pass 1 drains ALL nodes from ALL indexers
 * into the store; pass 2 drains ALL edges. This guarantees
 * `store.addEdge` never sees a missing endpoint when both endpoints came
 * from the same orchestrator run. Edges whose endpoints are missing in the
 * combined node set are silently dropped and counted toward an `error` on
 * the producing indexer's stats.
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.12.0 (sprint-091 PR 2.14; Sprint X3 PR 4/5)
 */

import { createOntologyGraphStore, type OntologyGraphStore } from "./store";
import type { NodeRecord, EdgeRecord } from "./types";

import { indexBrowseAndIndexDocs } from "./indexers/browse-index";
import { indexAgentsAndRules } from "./indexers/agents-rules";
import { indexPluginManifestAndHooks } from "./indexers/plugin-manifest";
import { indexSkillFrontmatter } from "./indexers/skills";
import { indexHandlerExports } from "./indexers/handlers";
import { indexSchemaPrimitives } from "./indexers/schema-primitives";
import { indexSourceFilesImports } from "./indexers/source-files";
import { indexTestsAndEvals } from "./indexers/tests-evals";
import { indexEventsT2Plus } from "./indexers/events";
import { indexGitHistory } from "./indexers/git-history";
import { indexRegisteredPrimitives } from "./indexers/registered-primitives";
import { indexSelfInstanceEdges } from "./indexers/self-instance-edges";

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * Literal-union of the 12 concrete indexer slugs registered with the
 * orchestrator. Order matches `lib/ontology-graph/indexers/` file order.
 */
export type IndexerName =
  | "browse-index"
  | "agents-rules"
  | "plugin-manifest"
  | "skills"
  | "handlers"
  | "schema-primitives"
  | "source-files"
  | "tests-evals"
  | "events"
  | "git-history"
  // IMPACT-1 — registered ontology primitives projected as first-class nodes.
  | "registered-primitives"
  // PR-I S2 — pm's wiring surface on the canonical self-ontology namespace.
  | "self-instance-edges";

/** All indexer names in canonical order. */
export const ALL_INDEXER_NAMES: ReadonlyArray<IndexerName> = [
  "browse-index",
  "agents-rules",
  "plugin-manifest",
  "skills",
  "handlers",
  "schema-primitives",
  "source-files",
  "tests-evals",
  "events",
  "git-history",
  "registered-primitives",
  "self-instance-edges",
];

/**
 * Per-indexer result row returned in the `stats` array. `error` is present
 * only when the indexer rejected (Promise.allSettled status="rejected") or
 * one of its edges was dropped due to a missing endpoint (pass 2 drain).
 */
export interface IndexerStats {
  readonly indexerName: IndexerName;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly durationMs: number;
  readonly error?: string;
}

/** Options bag for `buildOntologyGraph`. */
export interface BuildOntologyGraphOpts {
  /** Allowlist of indexer names. Defaults to all of `ALL_INDEXER_NAMES`. */
  readonly indexers?: ReadonlyArray<IndexerName>;
  /** Subtract from the active set. Default empty. */
  readonly skip?: ReadonlyArray<IndexerName>;
  /** Per-indexer post-hoc node cap. Default 1000. */
  readonly maxNodesPerIndexer?: number;
  /** When true (default), fan out via Promise.allSettled. */
  readonly parallel?: boolean;
  /** Forwarded to each indexer's `opts.nowIso` for test determinism. */
  readonly nowIso?: string;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Single indexer's raw fragment shape (matches every indexer's return). */
interface IndexerFragment {
  readonly nodes: ReadonlyArray<NodeRecord<unknown>>;
  readonly edges: ReadonlyArray<EdgeRecord<unknown>>;
}

/** Registry: indexer name → invoker thunk. Frozen at module load. */
const INDEXER_REGISTRY: Readonly<
  Record<IndexerName, (projectRoot: string, nowIso: string | undefined) => Promise<IndexerFragment>>
> = {
  "browse-index": (root, nowIso) =>
    indexBrowseAndIndexDocs(root, nowIso !== undefined ? { nowIso } : undefined),
  "agents-rules": (root, nowIso) =>
    indexAgentsAndRules(root, nowIso !== undefined ? { nowIso } : undefined),
  "plugin-manifest": (root, nowIso) =>
    indexPluginManifestAndHooks(root, nowIso !== undefined ? { nowIso } : undefined),
  "skills": (root, nowIso) =>
    indexSkillFrontmatter(root, nowIso !== undefined ? { nowIso } : undefined),
  "handlers": (root, nowIso) =>
    indexHandlerExports(root, nowIso !== undefined ? { nowIso } : undefined),
  "schema-primitives": (root, nowIso) =>
    indexSchemaPrimitives(root, nowIso !== undefined ? { nowIso } : undefined),
  "source-files": (root, nowIso) =>
    indexSourceFilesImports(root, nowIso !== undefined ? { nowIso } : undefined),
  "tests-evals": (root, nowIso) =>
    indexTestsAndEvals(root, nowIso !== undefined ? { nowIso } : undefined),
  "events": (root, nowIso) =>
    indexEventsT2Plus(root, nowIso !== undefined ? { nowIso } : undefined),
  "git-history": (root, nowIso) =>
    indexGitHistory(root, nowIso !== undefined ? { nowIso, skipPRs: true } : { skipPRs: true }),
  "registered-primitives": (root, nowIso) =>
    indexRegisteredPrimitives(root, nowIso !== undefined ? { nowIso } : undefined),
  "self-instance-edges": (root, nowIso) =>
    indexSelfInstanceEdges(root, nowIso !== undefined ? { nowIso } : undefined),
};

/** Internal per-indexer outcome (after timing + error capture). */
interface IndexerOutcome {
  readonly name: IndexerName;
  readonly durationMs: number;
  readonly fragment?: IndexerFragment;
  readonly error?: string;
}

async function runOne(
  name: IndexerName,
  projectRoot: string,
  nowIso: string | undefined,
): Promise<IndexerOutcome> {
  const start = Date.now();
  try {
    const fragment = await INDEXER_REGISTRY[name](projectRoot, nowIso);
    return { name, durationMs: Date.now() - start, fragment };
  } catch (e) {
    return {
      name,
      durationMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Apply post-hoc node cap (Decision D). Returns a possibly-truncated
 * fragment. Edges with endpoints outside the kept node set are dropped at
 * pass-2 drain time, not here, so the truncation count is observable via
 * the producing indexer's `error` field if it triggers an addEdge skip.
 */
function applyMaxNodesPerIndexer(
  fragment: IndexerFragment,
  maxNodesPerIndexer: number,
): IndexerFragment {
  if (fragment.nodes.length <= maxNodesPerIndexer) return fragment;
  return {
    nodes: fragment.nodes.slice(0, maxNodesPerIndexer),
    edges: fragment.edges,
  };
}

// ─── Public orchestrator ─────────────────────────────────────────────────────

/**
 * Build a fresh `OntologyGraphStore` populated by running all (or selected)
 * indexers and draining their results in a two-pass write (nodes then edges).
 *
 * @param projectRoot Absolute path to the project root passed to every indexer.
 * @param opts Optional config (indexers / skip / maxNodesPerIndexer /
 *   parallel / nowIso).
 * @returns `{ store, stats }` where `stats` has exactly one row per ACTIVE
 *   indexer (in the order the active set was determined).
 */
export async function buildOntologyGraph<TNode = unknown, TEdge = unknown>(
  projectRoot: string,
  opts?: BuildOntologyGraphOpts,
): Promise<{
  readonly store: OntologyGraphStore<TNode, TEdge>;
  readonly stats: ReadonlyArray<IndexerStats>;
}> {
  const allowlist = opts?.indexers ?? ALL_INDEXER_NAMES;
  const skipSet = new Set<IndexerName>(opts?.skip ?? []);
  const active: ReadonlyArray<IndexerName> = allowlist.filter((n) => !skipSet.has(n));

  const maxNodesPerIndexer = opts?.maxNodesPerIndexer ?? 1000;
  const parallel = opts?.parallel ?? true;
  const nowIso = opts?.nowIso;

  // ── Run indexers ───────────────────────────────────────────────────────────

  let outcomes: ReadonlyArray<IndexerOutcome>;
  if (parallel) {
    const settled = await Promise.allSettled(
      active.map((name) => runOne(name, projectRoot, nowIso)),
    );
    outcomes = settled.map((s, i) => {
      const name = active[i] as IndexerName;
      if (s.status === "fulfilled") return s.value;
      // runOne already captures errors internally — a rejection here means
      // runOne itself threw (which shouldn't happen, but defensively handle).
      return {
        name,
        durationMs: 0,
        error: s.reason instanceof Error ? s.reason.message : String(s.reason),
      };
    });
  } else {
    const collected: IndexerOutcome[] = [];
    for (const name of active) {
      collected.push(await runOne(name, projectRoot, nowIso));
    }
    outcomes = collected;
  }

  // ── Two-pass drain into a fresh store ─────────────────────────────────────

  const store = createOntologyGraphStore<TNode, TEdge>();

  // Pass 1 — drain ALL nodes from successful outcomes.
  // We track per-indexer node + edge counts as we go.
  const perIndexerNodeCount = new Map<IndexerName, number>();
  const perIndexerEdgeCount = new Map<IndexerName, number>();
  const perIndexerError = new Map<IndexerName, string>();
  for (const o of outcomes) {
    perIndexerNodeCount.set(o.name, 0);
    perIndexerEdgeCount.set(o.name, 0);
    if (o.error !== undefined) perIndexerError.set(o.name, o.error);
  }

  for (const o of outcomes) {
    if (o.fragment === undefined) continue;
    const trimmed = applyMaxNodesPerIndexer(o.fragment, maxNodesPerIndexer);
    for (const node of trimmed.nodes) {
      // `addNode` is idempotent upsert (PR 2.3 store contract); safe to
      // call across indexers that share node RIDs.
      store.addNode(node as NodeRecord<TNode>);
    }
    perIndexerNodeCount.set(o.name, trimmed.nodes.length);
  }

  // Pass 2 — drain ALL edges; drop any whose endpoints are missing.
  for (const o of outcomes) {
    if (o.fragment === undefined) continue;
    let droppedEdges = 0;
    for (const edge of o.fragment.edges) {
      if (store.getNode(edge.fromRid) === undefined || store.getNode(edge.toRid) === undefined) {
        droppedEdges += 1;
        continue;
      }
      try {
        store.addEdge(edge as EdgeRecord<TEdge>);
      } catch (e) {
        // Defensive — addEdge already checked endpoints above; reaching this
        // path means an indexer emitted a duplicate edge RID or similar.
        droppedEdges += 1;
        const msg = e instanceof Error ? e.message : String(e);
        const prior = perIndexerError.get(o.name);
        perIndexerError.set(o.name, prior !== undefined ? `${prior}; ${msg}` : msg);
        continue;
      }
      perIndexerEdgeCount.set(o.name, (perIndexerEdgeCount.get(o.name) ?? 0) + 1);
    }
    if (droppedEdges > 0 && !perIndexerError.has(o.name)) {
      perIndexerError.set(
        o.name,
        `${droppedEdges} edge(s) dropped: endpoint not found in combined node set`,
      );
    } else if (droppedEdges > 0) {
      // Append drop count to existing error (e.g. an indexer that threw AND
      // had dropped edges — unlikely but handled).
      const prior = perIndexerError.get(o.name);
      perIndexerError.set(
        o.name,
        `${prior}; ${droppedEdges} edge(s) dropped: endpoint not found in combined node set`,
      );
    }
  }

  // ── Build stats ───────────────────────────────────────────────────────────

  const stats: IndexerStats[] = outcomes.map((o) => {
    const row: {
      indexerName: IndexerName;
      nodeCount: number;
      edgeCount: number;
      durationMs: number;
      error?: string;
    } = {
      indexerName: o.name,
      nodeCount: perIndexerNodeCount.get(o.name) ?? 0,
      edgeCount: perIndexerEdgeCount.get(o.name) ?? 0,
      durationMs: o.durationMs,
    };
    const errorMsg = perIndexerError.get(o.name);
    if (errorMsg !== undefined) row.error = errorMsg;
    return row;
  });

  return { store, stats };
}
