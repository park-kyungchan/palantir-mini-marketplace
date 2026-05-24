/**
 * palantir-mini — ForwardProp / BackwardProp policy primitives
 *
 * Forward: ontology -> contracts -> codegen -> runtime -> events
 * Backward: events -> replay -> lineage -> refinement -> ontology update
 *
 * This file declares the policy shape. Runtime traversal lives in
 * palantir-mini/agents/propagation-tracer.md and
 * palantir-mini/bridge/handlers/replay-lineage.ts.
 */

export interface ForwardPropPolicy {
  readonly name: string;
  readonly description?: string;
  readonly steps: ReadonlyArray<{
    readonly step: number;
    readonly name: string;
    /** Where does this step's output live? */
    readonly outputPath: string;
    /** DDD/DRY/OCP/PECS rationale (for docs + audit) */
    readonly dc5Rationale?: string;
  }>;
}

export interface BackwardPropPolicy {
  readonly name: string;
  readonly description?: string;
  readonly steps: ReadonlyArray<{
    readonly step: number;
    readonly name: string;
    /** Where does this step read from? */
    readonly inputPath: string;
    readonly dc5Rationale?: string;
  }>;
  /** Known gaps (non-durable persistence, deferred feedback) */
  readonly gaps: ReadonlyArray<string>;
}

/** v0 reference policies — matches blueprint.json forwardProp/backwardProp */
export const FORWARD_PROP_V0: ForwardPropPolicy = Object.freeze({
  name: "palantir-mini-forward-prop-v0",
  description: "Ontology declarations -> palantir-mini codegen -> per-project generated code -> runtime -> events.jsonl -> snapshot",
  steps: [
    { step: 1, name: "ontology declarations", outputPath: "~/.claude/schemas/ontology/{primitives,functions,policies,lineage,generators}/",
      dc5Rationale: "DDD: matches Palantir OSDK 2.0 vocabulary; DRY: single schema shared across 3 projects" },
    { step: 2, name: "palantir-mini codegen", outputPath: "~/.claude/plugins/palantir-mini/lib/codegen/descender-gen.ts",
      dc5Rationale: "OCP: new primitives add generator templates, never modify existing generators" },
    { step: 3, name: "per-project generated code", outputPath: "<project>/src/generated/{objects,links,actions,functions,events}.d.ts",
      dc5Rationale: "OSDK 2.0 client/generated split; generated code never hand-edited" },
    { step: 4, name: "project runtime", outputPath: "<project>/src/** (consumers)",
      dc5Rationale: "PECS: consumers use supertypes, producers extend" },
    { step: 5, name: "events.jsonl append", outputPath: "<project>/.palantir-mini/session/events.jsonl",
      dc5Rationale: "DRY: single append path for all state changes via AtomicCommit" },
    { step: 6, name: "derived snapshot", outputPath: "<project>/.palantir-mini/session/snapshots/{ontology,manifest}.json",
      dc5Rationale: "snapshot is cache, events.jsonl is truth" },
  ],
});

/**
 * @deprecated Superseded by `BACKWARD_PROP_V1` (2026-04-19). V0 is retained
 * for back-compat only; V1 closes the two non-durable gaps documented below
 * by routing refinement proposals and ontologist reviews through dedicated
 * LEARN-domain events (`refinement_proposed`, `review_decision`). New
 * callers MUST target V1.
 */
export const BACKWARD_PROP_V0: BackwardPropPolicy = Object.freeze({
  name: "palantir-mini-backward-prop-v0",
  description: "events.jsonl -> replay_lineage -> 5-dim lineage graph -> refinement -> ontologist review -> ontology update",
  steps: [
    { step: 1, name: "runtime events", inputPath: "<project>/.palantir-mini/session/events.jsonl",
      dc5Rationale: "DDD: WHEN/ATOP_WHICH/THROUGH_WHICH/BY_WHOM/WITH_WHAT" },
    { step: 2, name: "replay_lineage MCP tool", inputPath: "~/.claude/plugins/palantir-mini/bridge/handlers/replay-lineage.ts",
      dc5Rationale: "DRY: single replay primitive serves all backward queries" },
    { step: 3, name: "decision lineage graph", inputPath: "in-memory",
      dc5Rationale: "DDD: matches Palantir Decision Lineage vocabulary" },
    { step: 4, name: "refinement proposal (non-durable in v0)", inputPath: "agent inbox via SendMessage",
      dc5Rationale: "PECS: proposal consumers use supertype" },
    { step: 5, name: "ontologist review", inputPath: "decision-log.json",
      dc5Rationale: "human-in-the-loop governance" },
    { step: 6, name: "ontology declaration update", inputPath: "~/.claude/schemas/ontology/ git commit",
      dc5Rationale: "closed loop: BackwardProp terminates at start of ForwardProp" },
  ],
  gaps: [
    "Step 4 (refinement proposal persistence): non-durable in v0 — add refinement_proposed event variant post-v0.",
    "Step 5 (ontologist review decision): should itself be a LEARN-domain event — add review_decision event variant post-v0.",
  ],
});

/**
 * Emission contract: when does each BackwardProp event fire?
 * Consumed by the events-5d-gate hook + audit_events_5d_conformance handler.
 */
export interface BackwardPropEmissionContract {
  /** Event type name (matches lineage/event-types.ts) */
  readonly eventType:
    | "refinement_proposed"
    | "review_decision"
    | "impact_edge_registered";
  /** Human-readable trigger description */
  readonly firesWhen: string;
  /** Which step in the BackwardProp policy emits this event */
  readonly stepNumber: number;
  /** Required payload fields beyond the 5 Decision Lineage dimensions */
  readonly requiredPayloadFields: ReadonlyArray<string>;
}

export const BACKWARD_PROP_V1_EMISSIONS: ReadonlyArray<BackwardPropEmissionContract> =
  Object.freeze([
    {
      eventType: "refinement_proposed",
      firesWhen:
        "Step 4 — replay_lineage yields a candidate ontology/validation refinement. Persists proposal instead of inbox-only delivery.",
      stepNumber: 4,
      requiredPayloadFields: ["proposalId", "targetPrimitiveRid", "rationale"],
    },
    {
      eventType: "review_decision",
      firesWhen:
        "Step 5 — ontologist accepts, rejects, or defers a proposal. Makes the review itself part of the lineage.",
      stepNumber: 5,
      requiredPayloadFields: ["proposalId", "decision", "reviewerIdentity"],
    },
    {
      eventType: "impact_edge_registered",
      firesWhen:
        "Any step — a new ImpactEdge is added to the Context Engineering graph (cross-cuts BackwardProp traversal).",
      stepNumber: 0,
      requiredPayloadFields: ["edgeRid", "fromRid", "toRid", "edgeKind"],
    },
  ]);

/**
 * BackwardProp v1 — closes the two non-durable gaps in v0 by routing
 * refinement proposals and ontologist reviews through dedicated LEARN-domain
 * events. See BACKWARD_PROP_V1_EMISSIONS for the per-event emission contract.
 *
 * Authority chain:
 *   rules/03-forward-backward-propagation.md
 *   -> this file (BACKWARD_PROP_V1)
 *   -> bridge/handlers/replay-lineage.ts
 *   -> agents/propagation-tracer.md
 */
export const BACKWARD_PROP_V1: BackwardPropPolicy = Object.freeze({
  name: "palantir-mini-backward-prop-v1",
  description:
    "events.jsonl -> replay_lineage -> 5-dim lineage graph -> refinement_proposed event -> review_decision event -> ontology update",
  steps: [
    {
      step: 1,
      name: "runtime events",
      inputPath: "<project>/.palantir-mini/session/events.jsonl",
      dc5Rationale: "DDD: WHEN/ATOP_WHICH/THROUGH_WHICH/BY_WHOM/WITH_WHAT",
    },
    {
      step: 2,
      name: "replay_lineage MCP tool",
      inputPath:
        "~/.claude/plugins/palantir-mini/bridge/handlers/replay-lineage.ts",
      dc5Rationale: "DRY: single replay primitive serves all backward queries",
    },
    {
      step: 3,
      name: "decision lineage graph",
      inputPath: "in-memory",
      dc5Rationale: "DDD: matches Palantir Decision Lineage vocabulary",
    },
    {
      step: 4,
      name: "refinement proposal (durable via refinement_proposed event)",
      inputPath:
        "<project>/.palantir-mini/session/events.jsonl (event type: refinement_proposed)",
      dc5Rationale:
        "DRY: proposals live on the same append-only substrate as every other lineage event; inbox becomes a pointer layer, not the source of truth.",
    },
    {
      step: 5,
      name: "ontologist review (emits review_decision event)",
      inputPath:
        "<project>/.palantir-mini/session/events.jsonl (event type: review_decision)",
      dc5Rationale:
        "human-in-the-loop governance is itself lineage; downstream audits can reason over reviewer identity + decision without a parallel log.",
    },
    {
      step: 6,
      name: "ontology declaration update",
      inputPath: "~/.claude/schemas/ontology/ git commit",
      dc5Rationale:
        "closed loop: BackwardProp terminates at start of ForwardProp",
    },
  ],
  gaps: [],
});
