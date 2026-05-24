/**
 * palantir-mini v2.6.0 — Producer: ast-evidence
 * @owner palantirkc-plugin-learn
 * @purpose Wraps lib/impact-graph/ast-walker.ts; all edges carry evidenceKind: "ast" — NEVER primary identity.
 */
// Domain: LEARN | Authority: plan §Wave 2 · W2.9 | Demotes file:* RIDs to evidence.

import { walkProject } from "../impact-graph/ast-walker";
import { semanticRid } from "#schemas/ontology/primitives/semantic-rid";
import type {
  ProducerContext, ProducerResult, SemanticEdge, SemanticNode,
} from "./types";

export async function runProducerAstEvidence(ctx: ProducerContext): Promise<ProducerResult> {
  const t0 = Date.now();
  const nodes: SemanticNode[] = [];
  const edges: SemanticEdge[] = [];
  const uncertainties: string[] = [];
  const scannedAt = new Date().toISOString();

  let walk: ReturnType<typeof walkProject>;
  try {
    walk = walkProject({ projectRoot: ctx.projectRoot });
  } catch (e) {
    uncertainties.push(`ast walker failed: ${(e as Error).message}`);
    return { producer: "ast-evidence", nodes, edges, uncertainties, durationMs: Date.now() - t0 };
  }

  const seen = new Set<string>();
  for (const edge of walk.edges) {
    const fromVal = edge.fromRid.replace(/^file:/, "");
    const toVal = edge.toRid.replace(/^(?:file|pkg):/, "");
    const fromRid = semanticRid("file", fromVal);
    const toRid = semanticRid("file", toVal);

    for (const [rid, value] of [[fromRid, fromVal], [toRid, toVal]] as const) {
      const key = rid as string;
      if (seen.has(key)) continue;
      seen.add(key);
      nodes.push({
        decl: { rid, kind: "file", value, label: value, registeredAt: scannedAt },
        discoveredBy: ["ast-evidence"],
      });
    }

    const astEdgeKind: SemanticEdge["edgeKind"] =
      edge.edgeKind === "typeRef" ? "ast-type-ref" : "ast-import";

    edges.push({
      fromRid, toRid,
      edgeKind: astEdgeKind,
      confidence: edge.confidence,
      evidenceKind: "ast", // EVIDENCE ONLY
      evidence: edge.evidence?.slice(0, 180),
      producer: "ast-evidence",
    });
  }

  if (walk.errors.length > 0) {
    for (const err of walk.errors.slice(0, 3)) uncertainties.push(err);
  }

  return { producer: "ast-evidence", nodes, edges, uncertainties, durationMs: Date.now() - t0 };
}
