/**
 * SecondBrainGraph primitive — governed NDJSON interchange contract for the
 * second-brain fold (W3 workstream B; schemas v1.87.0)
 *
 * Promotes the Layer-2 graph contract the palantir-mini plugin actually
 * CONSUMES from the out-of-repo fold engine (`second-brain/scripts/fold.ts`,
 * which lives in the CONSUMER project, not this plugin repo) into a typed
 * schema-level primitive. The engine PRINTS this NDJSON contract to stdout;
 * the `second-brain-fold` agent STREAMS it and governed-emits each verdict +
 * the terminal summary via `lib/second-brain/foldedsessions-emit-cli.ts`.
 *
 * SCOPE DECISION (load-bearing — read before extending this file): the engine
 * + `graph.json` (the actual Layer-2 node/edge persistence) are OUT-OF-REPO.
 * No test, fixture, or doc IN THIS REPO recovers graph.json's concrete node/edge
 * field shape (only its EXISTENCE + path + aggregate nodeCount/edgeCount are
 * referenced — see MemoryFoldCommittedEnvelope.payload.graphPath in
 * lib/event-log/types.ts and foldedsessions-unstick-cli.ts's defensive
 * `{ nodes?: Array<{ source?: { sessionId?: string } }> }` read, which is a
 * best-effort probe, not a governed contract). Inventing a full graph.json
 * envelope shape here would NOT be derived from real evidence — rule: don't
 * invent a wire contract wholesale. So this primitive governs ONLY what the
 * plugin can actually observe end-to-end and validate before it emits events:
 * the per-batch NDJSON verdict/summary interchange
 * (`SecondBrainFoldBatchLine` / `SecondBrainFoldSummaryLine`) printed by the
 * engine and consumed by `graph-contract.ts`'s runtime validators. A best-effort
 * `SecondBrainGraphEnvelope` type is ALSO declared below for the `{nodes, edges,
 * meta}` shape that WOULD back graph.json, sourced only from the concrete
 * evidence above (node.source.sessionId) plus the EmitObj verdict shape
 * (targetId/derivedFrom) — it is explicitly marked best-effort/non-governing;
 * `graph-contract.ts` does NOT validate against it as a hard gate.
 *
 * Authority chain:
 *   agents/second-brain-fold.md §"Resolve the CLI paths" + §Step 1 (engine
 *     NDJSON contract: FoldLine — batch/summary lines)
 *     ↓
 *   lib/second-brain/foldedsessions-emit-cli.ts (EngineEmitObj — the verdict/
 *     summary shape this CLI forwards verbatim into events.jsonl)
 *     ↓
 *   schemas/ontology/primitives/second-brain-graph.ts (this file)
 *     ↓
 *   palantir-mini lib/second-brain/graph-contract.ts (runtime validation,
 *     wired into foldedsessions-emit-cli.ts's validate-before-commit gate)
 *
 * @owner palantirkc-plugin-events
 * @purpose Typed governed contract for the second-brain fold's NDJSON verdict
 *          batch/summary interchange (graph.json content itself is out-of-repo).
 */

import type { AgenticMemoryLayer } from "./agentic-memory-layer";
import type { RefinementTarget } from "./refinement-target";

// ---------------------------------------------------------------------------
// RID + branded type
// ---------------------------------------------------------------------------

export type SecondBrainFoldBatchRid = string & { readonly __brand: "SecondBrainFoldBatchRid" };

export const secondBrainFoldBatchRid = (s: string): SecondBrainFoldBatchRid =>
  s as SecondBrainFoldBatchRid;

// ---------------------------------------------------------------------------
// Verdict — one governed resolution decision the engine printed for a batch
// ---------------------------------------------------------------------------

/** The four entity-resolution verdict kinds the engine's fold loop can emit. */
export type SecondBrainVerdictKind = "ADD" | "UPDATE" | "DELETE" | "NONE";

/**
 * One `EmitObj` as printed by the engine's NDJSON contract (mirrors
 * `foldedsessions-emit-cli.ts`'s `EngineEmitObj`, promoted to schema level).
 * `type` is intentionally `string` (not a literal union) here — the engine may
 * print either `"resolution_verdict"` or the terminal `"memory_fold_committed"`
 * summary shape through the SAME EmitObj envelope; the discriminator lives one
 * level up, in `SecondBrainFoldBatchLine`/`SecondBrainFoldSummaryLine`.
 */
export interface SecondBrainFoldEmitObj {
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly memoryLayers?: readonly AgenticMemoryLayer[];
  readonly hypothesis?: string;
  readonly refinementTarget?: RefinementTarget;
}

/** The `resolution_verdict` EmitObj payload shape (per lib/event-log/types.ts ResolutionVerdictEnvelope). */
export interface SecondBrainResolutionVerdictPayload {
  readonly verdict: SecondBrainVerdictKind;
  readonly targetId?: string;
  readonly derivedFrom?: readonly string[];
}

/** The `memory_fold_committed` EmitObj payload shape (per lib/event-log/types.ts MemoryFoldCommittedEnvelope). */
export interface SecondBrainMemoryFoldCommittedPayload {
  readonly graphPath: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly sessionId: string;
}

// ---------------------------------------------------------------------------
// NDJSON line contract (fold.ts FoldLine — the actual interchange boundary)
// ---------------------------------------------------------------------------

/**
 * ONE `{"kind":"batch",...}` NDJSON line. `batchIndex` is monotone (0,1,2,...);
 * `verdicts` is that batch's NEW de-duped verdicts and MAY be empty (a batch
 * with 0 new verdicts still advances the persist cadence — see
 * agents/second-brain-fold.md §Step 2).
 */
export interface SecondBrainFoldBatchLine {
  readonly kind: "batch";
  readonly batchIndex: number;
  readonly verdicts: readonly SecondBrainFoldEmitObj[];
}

/**
 * The ONE terminal `{"kind":"summary",...}` NDJSON line. `totalBatches` lets the
 * agent confirm every batch `0..totalBatches-1` was governed-emitted + bumped.
 */
export interface SecondBrainFoldSummaryLine {
  readonly kind: "summary";
  readonly summary: SecondBrainFoldEmitObj;
  readonly totalBatches: number;
}

/** Either NDJSON line kind the engine may print. */
export type SecondBrainFoldLine = SecondBrainFoldBatchLine | SecondBrainFoldSummaryLine;

// ---------------------------------------------------------------------------
// Best-effort graph.json envelope (NON-GOVERNING — see file header §SCOPE DECISION)
// ---------------------------------------------------------------------------

/**
 * BEST-EFFORT, NON-GOVERNING shape for what `graph.json` (Layer-2, out-of-repo)
 * likely contains, sourced ONLY from concrete in-repo evidence:
 *   - `foldedsessions-unstick-cli.ts`'s defensive read of
 *     `{ nodes?: Array<{ source?: { sessionId?: string } }> }`
 *   - `SecondBrainResolutionVerdictPayload.targetId` (a node/edge id the verdict
 *     resolves to) + `derivedFrom` (source event/turn ids — provenance)
 * `graph-contract.ts` does NOT hard-validate emitted events against this type —
 * it exists so a future in-repo caller that DOES read graph.json has a documented
 * starting point, not so this file can claim graph.json's shape is governed.
 */
export interface SecondBrainGraphNodeBestEffort {
  readonly id: string;
  readonly type?: string;
  readonly text?: string;
  readonly canonicalKey?: string;
  readonly derived_from?: readonly string[];
  readonly source?: {
    readonly sourceId?: string;
    readonly sessionId?: string;
    readonly turnUuid?: string;
  };
}

export interface SecondBrainGraphEdgeBestEffort {
  readonly id?: string;
  readonly from?: string;
  readonly to?: string;
  readonly type?: string;
}

/** BEST-EFFORT graph.json envelope — see interface-level doc comments above. */
export interface SecondBrainGraphEnvelope {
  readonly nodes: readonly SecondBrainGraphNodeBestEffort[];
  readonly edges: readonly SecondBrainGraphEdgeBestEffort[];
  readonly meta?: Readonly<Record<string, unknown>>;
}
