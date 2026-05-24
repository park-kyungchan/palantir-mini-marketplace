// palantir-mini v3.7.1 — lib/semantic-graph/semantic-query/neighborhood.ts
// 1-hop neighborhood + editOrder + confidence computation.
// Extracted from semantic-query.ts during A.2 decomposition.
// Sprint-062 W6-ε: validate targetRids against mergedNodes (Kind-3 fix).

import type { ProducerResult, SemanticEdge, SemanticNode, SemanticRid } from "../types";

/** Result of oneHopNeighborhood: validated neighborhood + input_validation uncertainties. */
export interface NeighborhoodResult {
  readonly rids: SemanticRid[];
  readonly uncertainties: string[];
}

/**
 * Computes the 1-hop neighbourhood of `targetRids` over the merged edge set.
 * Returns the union of targetRids + all nodes reachable in one edge hop
 * (both directions — forward fromRid→toRid and backward toRid→fromRid).
 *
 * Sprint-062 W6-ε: validates targetRids against mergedNodes.
 * Invalid targetRids (not present in scanned graph) are reported as uncertainties
 * but still seeded into the neighborhood for backward compatibility.
 *
 * @param mergedNodes  All nodes from all producers (used for Kind-3 validation).
 *                     Pass empty array to skip validation (backward-compat).
 */
export function oneHopNeighborhood(
  targetRids: ReadonlyArray<SemanticRid>,
  edges: ReadonlyArray<SemanticEdge>,
  mergedNodes: ReadonlyArray<SemanticNode> = []
): NeighborhoodResult {
  if (targetRids.length === 0) return { rids: [], uncertainties: [] };

  const uncertainties: string[] = [];

  // Sprint-062 W6-ε: validate targetRids against scanned graph (Kind-3 fix).
  // Unconditional new Set<string>(targets) was a Kind-3 "input echo" — bogus RIDs
  // would be silently included, masking the real graph coverage gap.
  if (mergedNodes.length > 0) {
    const knownRids = new Set(mergedNodes.map((n) => n.decl.rid as string));
    const invalidTargets = [...targetRids].map((t) => t as unknown as string).filter((t) => !knownRids.has(t));
    if (invalidTargets.length > 0) {
      uncertainties.push(
        `input_validation: targetRids not found in scanned graph: ${invalidTargets.join(", ")}`
      );
    }
    // Still include all targets (including invalid) for backward compatibility —
    // they simply won't expand via edges since no edges touch them.
  }

  const targets = new Set<string>([...targetRids] as string[]);
  const neighborhood = new Set<string>(targets);

  for (const edge of edges) {
    const from = edge.fromRid as string;
    const to = edge.toRid as string;
    if (targets.has(from)) neighborhood.add(to);
    if (targets.has(to)) neighborhood.add(from);
  }

  return { rids: Array.from(neighborhood) as SemanticRid[], uncertainties };
}

/**
 * Derives the edit order from the neighborhood: ontology → gen → runtime → verification.
 * Simple tier-sort: rids are prefixed with their kind (e.g. "ontology:...", "gen:...").
 */
export function editOrder(rids: ReadonlyArray<SemanticRid>): SemanticRid[] {
  const tierOf = (rid: string): number => {
    if (rid.startsWith("ontology:")) return 0;
    if (rid.startsWith("gen:")) return 1;
    if (rid.startsWith("runtime:")) return 2;
    if (rid.startsWith("eval:")) return 3;
    return 4;
  };
  return [...rids].sort((a, b) => tierOf(a as string) - tierOf(b as string));
}

/**
 * Computes aggregated confidence:
 *   max(0.2, min(0.95, 0.5 + coverageRatio * 0.4 − uncertainties.length * 0.02))
 *
 * coverageRatio = producerResultsWithNodes / totalProducers.
 */
export function computeConfidence(
  producerResults: ReadonlyArray<ProducerResult>,
  allUncertainties: ReadonlyArray<string>
): number {
  const total = producerResults.length;
  const withNodes = producerResults.filter((r) => r.nodes.length > 0).length;
  const coverageRatio = total > 0 ? withNodes / total : 0;
  const raw = 0.5 + coverageRatio * 0.4 - allUncertainties.length * 0.02;
  return Math.max(0.2, Math.min(0.95, raw));
}
