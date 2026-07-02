/**
 * lib/ontology-graph/indexers/registered-primitives.ts — IMPACT-1 concrete
 * indexer for the in-memory OntologyGraphStore.
 *
 * @stable
 *
 * THE headline bridge: registered ontology PRIMITIVES (those committed via the
 * elevate→register→commit loop, materialized in get_ontology's
 * snapshot.registeredPrimitives) are projected as FIRST-CLASS graph nodes so
 * impact_query / ontology_context_query.impactContext can reach them. Before
 * this indexer the events indexer projected only Event-envelope nodes, so a
 * registered primitive's rid matched NOTHING in the typed graph — impact was
 * blind to everything the Ontology actually models.
 *
 * Authority chain:
 *   lib/event-log/read/fold-snapshot.ts (foldToSnapshot — registeredPrimitives,
 *     FOLD-1 meaning-bearing { rid, declaration? } entries)
 *     → lib/event-log/read.ts (readEvents — live + archive merge)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid,
 *        NodeTypeKind literals "ObjectType"/"LinkType"/"ActionType"/"Function")
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer — NOT called here)
 *     → this file (pure fragment producer; no store mutation; no events.jsonl WRITE)
 *     → lib/ontology-graph/build-graph.ts (orchestrator wires this in)
 *     → bridge/handlers/impact-query.ts (probeTypedGraph matches node by literal rid)
 *
 * D/L/A domain: DATA — folds one canonical events.jsonl (per projectRoot) via
 * readEvents + foldToSnapshot, projects registered primitives to a flat
 * { nodes, edges } fragment. No event emission, no store mutation, no Convex.
 * NEVER writes to events.jsonl — rule 10 append-only invariant respected via
 * READ-only fold.
 *
 * Node keying (load-bearing): the node `rid` IS the registered primitive's
 * projectPrimitiveRid verbatim (e.g. "rid:pm:object/student"). impact_query's
 * probeTypedGraph does `store.getNode(rid)` on the literal queried rid, so a
 * caller passing the registered rid matches the node directly and gets its
 * incident edges as dependents.
 *
 * Node kinds emitted (one per registered primitive):
 *   - "ObjectType" / "LinkType" / "ActionType" / "Function" (canonical
 *     NodeTypeKind literals) and "Role" / "Property" (registered kinds not yet
 *     in the forward-declared union; store.kind is `string`, not narrowed).
 *
 * Edge kinds emitted:
 *   - "linkType" (one per registered LinkType: srcRid → dstRid, so querying
 *     either endpoint surfaces the other as a dependent). Endpoints are only
 *     wired when BOTH endpoint nodes exist in this fragment (the orchestrator's
 *     pass-2 drain also drops edges with missing endpoints defensively).
 *
 * @owner palantirkc-ontology
 * @since palantir-mini (IMPACT-1)
 */

import * as path from "node:path";

import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../types";
import { readEvents } from "../../event-log/read";
import { foldToSnapshot } from "../../event-log/read/fold-snapshot";
import type { RegisteredPrimitiveEntry } from "../../event-log/types";
import { primitiveStatusOrDefault } from "#schemas/ontology/primitives/primitive-semantics";

// ─── Local payload interface (Option A — no shared-core import) ───────────────

/**
 * Payload for a registered-primitive node. Carries the registered kind, the
 * meaning-bearing declaration (FOLD-1), and substrate context.
 */
interface RegisteredPrimitivePayload {
  readonly projectRoot: string;
  readonly lastIndexed: string;
  /** The registered-primitive kind: ObjectType / LinkType / ActionType / Function / Role / Property. */
  readonly primitiveKind: string;
  /**
   * The committed declaration (FOLD-1) — projected edit properties; may be
   * absent on legacy folds. `declaration.status`, when the declaration is
   * present, is normalized through `primitiveStatusOrDefault()` (F6 — absent
   * ⇒ "active") so graph consumers (impact_query / ontology_context_query)
   * never have to re-apply the default themselves.
   */
  readonly declaration?: Record<string, unknown>;
}

/** Applies the documented absent⇒"active" status default to a declaration bag. */
function withNormalizedStatus(declaration: Record<string, unknown>): Record<string, unknown> {
  const rawStatus = (declaration as { status?: unknown }).status;
  const normalized =
    rawStatus === "experimental" || rawStatus === "active" || rawStatus === "deprecated"
      ? rawStatus
      : undefined;
  return { ...declaration, status: primitiveStatusOrDefault(normalized) };
}

/** Edge payload for a registered LinkType (src → dst). */
interface LinkTypeEdgePayload {
  readonly linkName?: string;
}

// ─── Brand helpers (mirror sibling indexers) ──────────────────────────────────

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

/** Deterministic EdgeRid for a registered LinkType edge. */
function linkEdgeRid(linkRid: string): EdgeRid {
  return edgeRid(`registered-link:${linkRid}`);
}

// ─── Main indexer ─────────────────────────────────────────────────────────────

/**
 * Fold the project's events.jsonl into get_ontology's registeredPrimitives and
 * project each registered primitive as a graph node (keyed by its rid) plus
 * each registered LinkType's endpoints as a graph edge.
 *
 * Does NOT call store.addNode / store.addEdge — fragment emission only.
 *
 * @param projectRoot — absolute path to the project root; only this project's
 *   events.jsonl is folded.
 * @param opts.nowIso — injectable ISO timestamp for test determinism.
 */
export async function indexRegisteredPrimitives(
  projectRoot: string,
  opts?: { readonly nowIso?: string },
): Promise<{
  readonly nodes: ReadonlyArray<NodeRecord<unknown>>;
  readonly edges: ReadonlyArray<EdgeRecord<unknown>>;
}> {
  const nowIso = opts?.nowIso ?? new Date().toISOString();

  const eventsPath = path.join(
    projectRoot,
    ".palantir-mini",
    "session",
    "events.jsonl",
  );

  let snapshot;
  try {
    snapshot = foldToSnapshot(readEvents(eventsPath));
  } catch {
    // readEvents/fold are best-effort; absorb any unforeseen throw → empty fragment.
    return { nodes: [], edges: [] };
  }

  const reg = snapshot.registeredPrimitives;
  if (reg === undefined) return { nodes: [], edges: [] };

  const nodes: NodeRecord<unknown>[] = [];
  const seenRids = new Set<string>();

  const pushNodes = (bucket: ReadonlyArray<RegisteredPrimitiveEntry>, kind: string): void => {
    for (const entry of bucket) {
      if (typeof entry.rid !== "string" || entry.rid.length === 0) continue;
      // The append-only fold may carry the same rid more than once (re-register
      // without dedup). Project ONE node per rid (idempotent-upsert friendly).
      if (seenRids.has(entry.rid)) continue;
      seenRids.add(entry.rid);
      const payload: RegisteredPrimitivePayload = {
        projectRoot,
        lastIndexed: nowIso,
        primitiveKind: kind,
        ...(entry.declaration !== undefined ? { declaration: withNormalizedStatus(entry.declaration) } : {}),
      };
      nodes.push({ rid: nodeRid(entry.rid), kind, value: payload });
    }
  };

  pushNodes(reg.objectTypes, "ObjectType");
  pushNodes(reg.actionTypes, "ActionType");
  pushNodes(reg.functions, "Function");
  pushNodes(reg.roles, "Role");
  pushNodes(reg.properties, "Property");
  // LinkType nodes themselves are projected too, so a query on the link rid hits.
  pushNodes(reg.linkTypes, "LinkType");

  // Edges: each registered LinkType wires its src → dst endpoints. Only emit
  // when BOTH endpoints were projected as nodes above (else the orchestrator's
  // pass-2 drain would drop the edge anyway).
  const edges: EdgeRecord<unknown>[] = [];
  const seenEdgeRids = new Set<string>();
  for (const entry of reg.linkTypes) {
    const decl = entry.declaration as
      | { srcRid?: unknown; dstRid?: unknown; linkName?: unknown }
      | undefined;
    const srcRid = typeof decl?.srcRid === "string" ? decl.srcRid : undefined;
    const dstRid = typeof decl?.dstRid === "string" ? decl.dstRid : undefined;
    if (srcRid === undefined || dstRid === undefined) continue;
    if (!seenRids.has(srcRid) || !seenRids.has(dstRid)) continue;
    const erid = linkEdgeRid(entry.rid);
    if (seenEdgeRids.has(erid)) continue;
    seenEdgeRids.add(erid);
    const value: LinkTypeEdgePayload = {
      ...(typeof decl?.linkName === "string" ? { linkName: decl.linkName } : {}),
    };
    edges.push({
      rid: erid,
      kind: "linkType",
      fromRid: nodeRid(srcRid),
      toRid: nodeRid(dstRid),
      value,
    });
  }

  return { nodes, edges };
}
