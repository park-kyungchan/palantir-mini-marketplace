/**
 * palantir-mini v3.7.0 — lib/semantic-graph/semantic-query.ts (orchestrator)
 * @owner palantirkc-plugin-learn
 * @purpose Orchestrates Wave-2 producers, merges graphs, computes 1-hop neighborhood,
 *          builds SP-3 read-plan, returns SemanticChangePlan.
 */
// Domain: LEARN | Authority: plan §Wave 2 · W2.11
// Decomposed in v3.7.0 A.2: helpers extracted to ./semantic-query/*.

import type { ProducerContext, ProducerResult, SemanticChangePlan, SemanticRid } from "./types";
import { runProducerOntology } from "./producer-ontology";
import { runProducerCodegen } from "./producer-codegen";
import { runProducerRuntime } from "./producer-runtime";
import { runProducerAstEvidence } from "./producer-ast-evidence";
import { runProducerVerification } from "./producer-verification";
import { runProducerLineage } from "./producer-lineage";
import { writeManifest } from "./manifest-writer";
import { mergeNodes, unionEdges } from "./semantic-query/merge-helpers";
import { oneHopNeighborhood, editOrder, computeConfidence } from "./semantic-query/neighborhood";
import { buildReadPlan } from "./semantic-query/read-plan";
import type { SemanticQueryInput } from "./semantic-query/types";

// Backward-compat re-exports
export type { SemanticQueryInput } from "./semantic-query/types";
export { mergeNodes, unionEdges } from "./semantic-query/merge-helpers";
export type { NeighborhoodResult } from "./semantic-query/neighborhood";
export { oneHopNeighborhood, editOrder, computeConfidence } from "./semantic-query/neighborhood";
export { buildReadPlan } from "./semantic-query/read-plan";

/**
 * Orchestrates the Wave-2/3 producers, merges their results, computes a
 * 1-hop neighbourhood around `input.targetRids`, and returns a SemanticChangePlan.
 *
 * Never throws — producer failures surface as uncertainties in the returned plan.
 */
export async function runSemanticQuery(input: SemanticQueryInput): Promise<SemanticChangePlan> {
  const { projectRoot } = input;
  const targetRids: ReadonlyArray<SemanticRid> = input.targetRids ?? [];

  const ctx: ProducerContext = { projectRoot };

  // ── Step 1: run all producers sequentially, wrapping each in try/catch ──
  const producerResults: ProducerResult[] = [];
  const runProducers: Array<() => Promise<ProducerResult>> = [
    () => runProducerOntology(ctx),
    () => runProducerCodegen(ctx),
    () => runProducerRuntime(ctx),
    () => runProducerAstEvidence(ctx),
    () => runProducerVerification(ctx),
    () => runProducerLineage(ctx),
  ];

  for (const run of runProducers) {
    try {
      const result = await run();
      producerResults.push(result);
    } catch (e) {
      producerResults.push({
        producer: "ast-evidence", // safest fallback label
        nodes: [],
        edges: [],
        uncertainties: [`producer threw: ${(e as Error).message}`],
        durationMs: 0,
      });
    }
  }

  // ── Step 2: merge nodes (dedupe by rid) + union edges ──
  const mergedNodes = mergeNodes(producerResults);
  const mergedEdges = unionEdges(producerResults);
  const allUncertainties = producerResults.flatMap((r) => r.uncertainties);

  // ── Step 3: 1-hop neighbourhood around targetRids ──
  // Sprint-062 W6-ε: pass mergedNodes for Kind-3 input validation.
  const neighborhoodResult = oneHopNeighborhood(targetRids, mergedEdges, mergedNodes);
  const neighborhoodRids = neighborhoodResult.rids;
  const affectedSemanticRids: SemanticRid[] = neighborhoodRids;
  // Merge Kind-3 validation uncertainties into the full list.
  allUncertainties.push(...neighborhoodResult.uncertainties);

  const affectedFiles: string[] = mergedNodes
    .filter((n) =>
      (n.decl.rid as string).startsWith("file:") &&
      neighborhoodRids.some((r) => r === n.decl.rid))
    .map((n) => n.decl.value);

  const affectedGenerated: string[] = mergedNodes
    .filter((n) =>
      (n.decl.rid as string).startsWith("gen:") &&
      neighborhoodRids.some((r) => r === n.decl.rid))
    .map((n) => n.decl.value);

  const affectedTests: string[] = mergedNodes
    .filter((n) =>
      ((n.decl.rid as string).startsWith("file:") || (n.decl.rid as string).startsWith("runtime:")) &&
      /\.(test|spec)\.(ts|tsx)$/.test(n.decl.value) &&
      neighborhoodRids.some((r) => r === n.decl.rid))
    .map((n) => n.decl.value);

  // Session 4 Slice 1 (VR-1): populate from neighborhood. Producer-verification
  // (v2.11.0) emits eval-covers/doc-references/mon-scope edges, so eval:*, doc:*,
  // mon:* RIDs reachable within 1-hop of targetRids now surface here.
  const affectedEvals: SemanticRid[] = neighborhoodRids.filter((r) => (r as string).startsWith("eval:"));
  const affectedDocs: SemanticRid[] = neighborhoodRids.filter((r) => (r as string).startsWith("doc:"));
  const affectedMonitoring: SemanticRid[] = neighborhoodRids.filter((r) => (r as string).startsWith("mon:"));

  // ── Step 3.5: SP-3 read-plan (v2.13.0) ──
  const readPlan = buildReadPlan(affectedDocs, mergedNodes, projectRoot);

  const order = editOrder(affectedSemanticRids);
  const confidence = computeConfidence(producerResults, allUncertainties);

  // ── Step 4: optionally write manifest (non-fatal on failure) ──
  if (input.writeManifest !== false) {
    try {
      await writeManifest({ projectRoot, producerResults });
    } catch { /* non-fatal */ }
  }

  // ── Step 5: return SemanticChangePlan ──
  return {
    affectedSemanticRids,
    affectedFiles,
    affectedGenerated,
    affectedTests,
    affectedEvals,
    affectedDocs,
    affectedMonitoring,
    requiredResearchRefs: readPlan.requiredResearchRefs,
    recommendedReadOrder: readPlan.recommendedReadOrder,
    authorityNotes:       readPlan.authorityNotes,
    archiveBridgeRefs:    readPlan.archiveBridgeRefs,
    editOrder: order,
    uncertainties: allUncertainties,
    confidence,
    source: "fresh-scan",
  };
}
