/**
 * lib/impact-query/missing-edges.ts — Pure helper computing the
 * `missingEdges` field on impact_query result. Detects legacy SQLite/in-memory
 * impact-edges that are absent from the freshly-built typed graph.
 *
 * @stable
 *
 * Authority chain:
 *   sprint-092 spec.md §3.2 (missingEdges heuristic)
 *     → bridge/handlers/impact-query.ts (consumer)
 *
 * D/L/A domain: LOGIC — pure function, no I/O.
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.13.0 (sprint-092 PR 2.15; Sprint X3 PR 5/5)
 */

/** Single missing-edge record returned in the `missingEdges` field. */
export interface MissingEdgeRecord {
  readonly fromRid: string;
  readonly toRid: string;
  readonly edgeKind: string;
  readonly reason: string;
}

/** Options for `computeMissingEdges`. */
export interface MissingEdgesOpts {
  /** Maximum entries to emit. Default 50. */
  readonly cap?: number;
}

/** Minimal shape used to identify a legacy edge. */
interface LegacyEdgeShape {
  readonly fromRid: string;
  readonly toRid: string;
  readonly edgeKind: string;
}

/** Minimal shape used to identify a typed-graph edge. */
interface TypedGraphEdgeShape {
  readonly fromRid: string;
  readonly toRid: string;
  readonly kind: string;
}

/**
 * Stable string key for edge dedup (`from→to:kind`). Lowercases the kind so
 * legacy `IMPORTS` matches typed-graph `imports`.
 */
function edgeKey(from: string, to: string, kind: string): string {
  return `${from}→${to}:${kind.toLowerCase()}`;
}

/**
 * Compute `missingEdges` per sprint-092 spec.md §3.2.
 *
 * Returns legacy edges whose `(fromRid, toRid, edgeKind)` triple does NOT have
 * a corresponding edge in the typed graph (kind matched case-insensitively).
 * Output is capped at `opts.cap ?? 50` entries; when the cap fires, the last
 * entry carries `reason: "capped-50-additional-omitted"` (or the configured
 * cap value if non-default).
 */
export function computeMissingEdges(
  legacyEdges: ReadonlyArray<LegacyEdgeShape>,
  typedGraphEdges: ReadonlyArray<TypedGraphEdgeShape>,
  opts?: MissingEdgesOpts,
): ReadonlyArray<MissingEdgeRecord> {
  const cap = opts?.cap ?? 50;
  if (cap <= 0) return [];

  const typedSet = new Set<string>();
  for (const e of typedGraphEdges) {
    typedSet.add(edgeKey(e.fromRid, e.toRid, e.kind));
  }

  const result: MissingEdgeRecord[] = [];
  let omittedCount = 0;
  for (const e of legacyEdges) {
    const key = edgeKey(e.fromRid, e.toRid, e.edgeKind);
    if (typedSet.has(key)) continue;

    if (result.length < cap - 1) {
      result.push({
        fromRid: e.fromRid,
        toRid: e.toRid,
        edgeKind: e.edgeKind,
        reason: "legacy-edge-not-in-typed-graph",
      });
    } else if (result.length === cap - 1) {
      // Reserve last slot for cap-marker; count remaining
      result.push({
        fromRid: e.fromRid,
        toRid: e.toRid,
        edgeKind: e.edgeKind,
        reason: "legacy-edge-not-in-typed-graph",
      });
    } else {
      omittedCount += 1;
    }
  }

  if (omittedCount > 0) {
    // Replace last slot with capped marker. The cap policy says the LAST
    // entry carries the marker, so we overwrite slot cap-1.
    result[cap - 1] = {
      fromRid: "(cap)",
      toRid: "(cap)",
      edgeKind: "(cap)",
      reason: `capped-${cap}-additional-omitted`,
    };
  }

  return result;
}
