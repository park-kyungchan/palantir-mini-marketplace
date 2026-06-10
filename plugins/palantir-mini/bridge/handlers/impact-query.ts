// palantir-mini v6.13.0 — MCP tool handler: impact_query
// Domain: LEARN (ImpactEdge prim-learn-12 — Context Engineering substrate)
//
// Phase A-4 Day 3: SQLite-backed via registry-loader.
// Falls back to in-memory IMPACT_EDGE_REGISTRY when SQLite is not populated.
//
// Sprint-092 PR 2.15 upgrade (Sprint X3 5/5 — FINAL Phase 2 PR):
//   Additively returns 3 new fields from proposal §8 Stage 4:
//     - graphConfidence: number (0.0-1.0 heuristic)
//     - missingEdges: ReadonlyArray<{ fromRid, toRid, edgeKind, reason }>
//     - recommendedAgentUse: "lead-direct" | "targeted-verification" |
//                            "bounded-explorer" | "none"
//   Powered by buildOntologyGraph from PR 2.14 (cached 30s by default).
//
// ForwardProp/BackwardProp path query. AI agents call this BEFORE edits
// to answer "If I change X, what propagates?" deterministically.
// Authority chain: rules/03-forward-backward-propagation.md → schemas/ontology/primitives/impact-edge.ts

import {
  IMPACT_EDGE_REGISTRY,
  impactEdgeRid,
} from "#schemas/ontology/primitives/impact-edge";
import type {
  ImpactEdgeDeclaration,
  ImpactGraph,
} from "#schemas/ontology/primitives/impact-edge";
import {
  queryDirect,
  walkForward,
  walkBackward,
  getCacheForProject,
} from "../../lib/impact-graph/registry-loader";
import type { StoredEdge } from "../../lib/impact-graph/types";
import { projectScopePolicyForFiles } from "../../lib/lead-intent/project-scope-policy";
import type { ProjectScopePolicyProjection } from "../../lib/lead-intent/project-scope-policy";
import {
  computeGraphConfidence,
  recommendAgentUseFromConfidence,
  type RecommendedAgentUse,
} from "../../lib/impact-query/graph-confidence";
import {
  computeMissingEdges,
  type MissingEdgeRecord,
} from "../../lib/impact-query/missing-edges";
import { getOrBuildGraph } from "../../lib/impact-query/graph-cache";

interface ImpactQueryArgs {
  rid:          string;
  depth?:       number;
  /** Absolute project root for SQLite lookup. Defaults to CWD. */
  projectRoot?: string;
  /** PR 2.15: skip the graph-cache and force a fresh orchestrator build. */
  noCache?: boolean;
  /** PR 2.15: skip the typed-graph upgrade entirely (legacy-only mode). */
  skipTypedGraph?: boolean;
}

interface ImpactQueryResult {
  forwardProp:  ImpactEdgeDeclaration[];
  backwardProp: ImpactEdgeDeclaration[];
  transitive: {
    forward:  ImpactGraph;
    backward: ImpactGraph;
  };
  source: "sqlite" | "in-memory";
  projectScope?: ProjectScopePolicyProjection;
  /** PR 2.15: 0.0-1.0 heuristic for typed-graph coverage of the queried RID. */
  graphConfidence: number;
  /** PR 2.15: edges in SQLite/in-memory but absent from the typed graph. */
  missingEdges: ReadonlyArray<MissingEdgeRecord>;
  /** PR 2.15: recommended downstream agent-use mode derived from graphConfidence. */
  recommendedAgentUse: RecommendedAgentUse;
  /**
   * W1: which lane served the canonical edge evidence. "typed-graph" is the
   * live in-memory projection (the only non-empty branch today); "sqlite" is
   * the deferred uq-persist lane; "none" when neither has evidence.
   */
  canonicalLane: "typed-graph" | "sqlite" | "none";
  /**
   * W1: edges FROM the queried RID in the live typed graph, in their NATIVE
   * typed-graph kinds (usesTool/gates/imports/describes) — NOT coerced to the
   * legacy ImpactEdgeKind enum.
   */
  typedGraphForward: ReadonlyArray<{ fromRid: string; toRid: string; kind: string }>;
  /** W1: edges TO the queried RID in the live typed graph (native kinds). */
  typedGraphBackward: ReadonlyArray<{ fromRid: string; toRid: string; kind: string }>;
}

/** Convert a StoredEdge to the ImpactEdgeDeclaration contract. */
function storedToDecl(e: StoredEdge): ImpactEdgeDeclaration {
  return {
    rid:          impactEdgeRid(`${e.fromRid}:${e.toRid}:${e.edgeKind}`),
    fromRid:      e.fromRid,
    toRid:        e.toRid,
    edgeKind:     e.edgeKind as ImpactEdgeDeclaration["edgeKind"],
    confidence:   e.confidence,
    evidence:     e.evidence,
    registeredAt: e.scannedAt,
  };
}

/**
 * Inspect the typed-graph store for evidence of the queried RID. Matches on
 * literal `rid` AND on `value.filePath` for `file:` RIDs.
 *
 * Returns `{ matched, incidentEdgeCount, edges, forward, backward }` so the handler can:
 *   - feed (matched, incidentEdgeCount) into computeGraphConfidence
 *   - feed `edges` (combined) into computeMissingEdges
 *   - expose `forward`/`backward` as the canonical typed-graph lane fields
 */
async function probeTypedGraph(
  projectRoot: string,
  rid: string,
  opts: { noCache?: boolean },
): Promise<{
  matched: boolean;
  incidentEdgeCount: number;
  edges: ReadonlyArray<{ fromRid: string; toRid: string; kind: string }>;
  forward: ReadonlyArray<{ fromRid: string; toRid: string; kind: string }>;
  backward: ReadonlyArray<{ fromRid: string; toRid: string; kind: string }>;
}> {
  let cached;
  try {
    cached = await getOrBuildGraph(projectRoot, { noCache: opts.noCache });
  } catch {
    // If graph build fails for any reason (e.g. missing project files),
    // fall back to "no evidence" — handler returns confidence per RID
    // shape only.
    return { matched: false, incidentEdgeCount: 0, edges: [], forward: [], backward: [] };
  }
  const store = cached.store;

  // Direct RID match.
  let matchedNode = store.getNode(rid as never);
  let matchedRid = matchedNode !== undefined ? rid : undefined;

  // file:-RID match fallback: scan SourceFile/Test/Hook nodes whose
  // value.filePath equals the RID's trailing path.
  if (matchedNode === undefined && rid.startsWith("file:")) {
    const tail = rid.slice("file:".length);
    for (const kind of ["SourceFile", "Test", "Hook", "Skill", "AgentDefinition"]) {
      const candidates = store.getNodesByKind(kind);
      const hit = candidates.find((n) => {
        const v = n.value as { filePath?: string };
        return v !== undefined && v !== null && typeof v.filePath === "string" && v.filePath === tail;
      });
      if (hit !== undefined) {
        matchedNode = hit;
        matchedRid = hit.rid as unknown as string;
        break;
      }
    }
  }

  if (matchedNode === undefined || matchedRid === undefined) {
    return { matched: false, incidentEdgeCount: 0, edges: [], forward: [], backward: [] };
  }

  const out = store.getEdgesFrom(matchedRid as never);
  const inn = store.getEdgesTo(matchedRid as never);
  const toShape = (e: { fromRid: unknown; toRid: unknown; kind: string }) => ({
    fromRid: e.fromRid as unknown as string,
    toRid: e.toRid as unknown as string,
    kind: e.kind,
  });
  const forward = out.map(toShape);   // edges FROM the matched node
  const backward = inn.map(toShape);  // edges TO the matched node

  return {
    matched: true,
    incidentEdgeCount: out.length + inn.length,
    edges: [...forward, ...backward],
    forward,
    backward,
  };
}

export default async function impactQuery(
  rawArgs: unknown,
): Promise<ImpactQueryResult> {
  const args = (rawArgs ?? {}) as ImpactQueryArgs;
  if (!args.rid || typeof args.rid !== "string") {
    throw new Error("impact_query: `rid` is required");
  }

  const depth       = typeof args.depth === "number" && args.depth > 0 ? args.depth : 3;
  const rid         = args.rid;
  const projectRoot = args.projectRoot ?? process.cwd();
  const noCache     = args.noCache === true;
  const skipTypedGraph = args.skipTypedGraph === true;
  const fileRid = rid.startsWith("file:") ? rid.slice("file:".length) : undefined;
  const projectScope = fileRid
    ? projectScopePolicyForFiles([fileRid], projectRoot)
    : undefined;

  // ── Phase A: legacy SQLite/in-memory query (preserved verbatim) ─────────
  const cache = getCacheForProject(projectRoot);

  let legacyForwardDecl: ImpactEdgeDeclaration[] = [];
  let legacyBackwardDecl: ImpactEdgeDeclaration[] = [];
  let transitiveForward: ImpactGraph;
  let transitiveBackward: ImpactGraph;
  let source: "sqlite" | "in-memory";

  if (cache) {
    const direct      = queryDirect(projectRoot, rid);
    const fwdResult   = walkForward(projectRoot, rid, depth);
    const bwdResult   = walkBackward(projectRoot, rid, depth);

    legacyForwardDecl  = direct.forward.map(storedToDecl);
    legacyBackwardDecl = direct.backward.map(storedToDecl);

    transitiveForward = {
      root:  rid,
      nodes: fwdResult.nodes,
      edges: fwdResult.edges.map(storedToDecl),
    };
    transitiveBackward = {
      root:  rid,
      nodes: bwdResult.nodes,
      edges: bwdResult.edges.map(storedToDecl),
    };
    source = "sqlite";
  } else {
    legacyForwardDecl  = [...IMPACT_EDGE_REGISTRY.queryForward(rid)];
    legacyBackwardDecl = [...IMPACT_EDGE_REGISTRY.queryBackward(rid)];
    transitiveForward = IMPACT_EDGE_REGISTRY.walkTransitive(rid, depth);

    // Backward transitive walk
    const backwardNodes: Array<{ rid: string; depth: number }> = [{ rid, depth: 0 }];
    const backwardEdges: ImpactEdgeDeclaration[] = [];
    const visited = new Set<string>([rid]);

    const processBackward = (
      edges: ImpactEdgeDeclaration[],
      currentDepth: number,
    ) => {
      if (currentDepth >= depth) return;
      for (const edge of edges) {
        backwardEdges.push(edge);
        if (!visited.has(edge.fromRid)) {
          visited.add(edge.fromRid);
          backwardNodes.push({ rid: edge.fromRid, depth: currentDepth + 1 });
          processBackward(
            [...IMPACT_EDGE_REGISTRY.queryBackward(edge.fromRid)],
            currentDepth + 1,
          );
        }
      }
    };
    processBackward(legacyBackwardDecl, 0);

    transitiveBackward = {
      root:  rid,
      nodes: backwardNodes,
      edges: backwardEdges,
    };
    source = "in-memory";
  }

  // ── Phase B (PR 2.15): typed-graph probe + 3 new fields ─────────────────
  let typedProbe: {
    matched: boolean;
    incidentEdgeCount: number;
    edges: ReadonlyArray<{ fromRid: string; toRid: string; kind: string }>;
    forward: ReadonlyArray<{ fromRid: string; toRid: string; kind: string }>;
    backward: ReadonlyArray<{ fromRid: string; toRid: string; kind: string }>;
  } = { matched: false, incidentEdgeCount: 0, edges: [], forward: [], backward: [] };

  if (!skipTypedGraph) {
    typedProbe = await probeTypedGraph(projectRoot, rid, { noCache });
  }

  const sqliteHadEvidence =
    legacyForwardDecl.length > 0 || legacyBackwardDecl.length > 0;

  const graphConfidence = computeGraphConfidence({
    rid,
    typedGraphRootMatched: typedProbe.matched,
    typedGraphIncidentEdgeCount: typedProbe.incidentEdgeCount,
    sqliteHadEvidence,
  });

  const recommendedAgentUse = recommendAgentUseFromConfidence(graphConfidence);

  // missingEdges: compare legacy direct edges against typed-graph incident
  // edges of the matched node.
  const legacyShape = [...legacyForwardDecl, ...legacyBackwardDecl].map((d) => ({
    fromRid: d.fromRid,
    toRid: d.toRid,
    edgeKind: d.edgeKind,
  }));
  const missingEdges = computeMissingEdges(legacyShape, typedProbe.edges);

  // ── Compose result ──────────────────────────────────────────────────────
  return {
    forwardProp: legacyForwardDecl,
    backwardProp: legacyBackwardDecl,
    transitive: {
      forward: transitiveForward,
      backward: transitiveBackward,
    },
    source,
    ...(projectScope && projectScope.matches.length > 0 ? { projectScope } : {}),
    graphConfidence,
    missingEdges,
    recommendedAgentUse,
    // W1: canonical edge lane. Typed-graph-first — it is the only reachable
    // non-empty branch today (SQLite uq-persist lane is deferred/empty).
    canonicalLane: typedProbe.matched
      ? "typed-graph"
      : source === "sqlite" && sqliteHadEvidence
        ? "sqlite"
        : "none",
    typedGraphForward: typedProbe.forward,
    typedGraphBackward: typedProbe.backward,
  };
}
