/**
 * lib/ontology-graph/types.ts — Generic typed-graph types for the
 * in-memory OntologyGraphStore (PR 2.3 sprint-080).
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/schemas/ontology/primitives/ (PR 2.1 node + PR 2.2 edge sources)
 *     → ~/ontology/shared-core/index.ts (consumer surface)
 *     → this file (generic substrate; concrete projection deferred)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer)
 *
 * D/L/A domain: LOGIC — generic typed-graph substrate; no data mutation,
 * no disk I/O, no event emission.
 *
 * IMPLEMENTATION NOTE: The runtime-overlay snapshot at
 * ./runtime-overlay/ontology-shared-core/ was generated 2026-05-08 and does
 * NOT contain the 21 PR 2.1 + 7 PR 2.2 primitives added today. Importing those
 * types via #shared-core/... fails with TS2307. Per sprint-080/spec.md decision 1,
 * this file uses GENERIC type parameters (TNode, TEdge) instead of importing the
 * 32 concrete node + 22 concrete edge primitives. The concrete typed-graph
 * projection is deferred to:
 *   - a future snapshot-refresh chore PR (runtime-overlay/ontology-shared-core/ regen), OR
 *   - PR 2.14 (ImpactGraph integrated query layer).
 * When the snapshot is refreshed, replace the generic bounds with imports from
 * #shared-core/ontology/primitives/ and narrow NodeTypeKind / EdgeKindUnion.
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.1.0 (sprint-080 PR 2.3)
 */

// ─── Branded ID types ─────────────────────────────────────────────────────────

/** Branded RID for typed graph nodes. Prevents accidental mixing with EdgeRid. */
export type NodeRid = string & { readonly __brand: "NodeRid" };

/** Branded RID for typed graph edges. Prevents accidental mixing with NodeRid. */
export type EdgeRid = string & { readonly __brand: "EdgeRid" };

// ─── Generic node / edge record types ────────────────────────────────────────

/**
 * Generic node record stored in the OntologyGraphStore.
 * TNode defaults to `unknown`; Phase 2 consumers specialize with a
 * concrete TypedGraphNode discriminated union once the shared-core snapshot
 * is refreshed to include PR 2.1 primitives.
 *
 * The `kind` field is the discriminator string (e.g. "UserPrompt", "Hook").
 */
export interface NodeRecord<TNode = unknown> {
  readonly rid: NodeRid;
  /** Discriminator string matching a NodeTypeKind literal. */
  readonly kind: string;
  readonly value: TNode;
}

/**
 * Generic edge record stored in the OntologyGraphStore.
 * TEdge defaults to `unknown`; Phase 2 consumers specialize with a
 * concrete TypedGraphEdge discriminated union once the shared-core snapshot
 * is refreshed to include PR 2.2 primitives.
 *
 * The `kind` field is the edge discriminator (e.g. "imports", "validates").
 */
export interface EdgeRecord<TEdge = unknown> {
  readonly rid: EdgeRid;
  /** Discriminator string matching an EdgeKindUnion literal. */
  readonly kind: string;
  readonly fromRid: NodeRid;
  readonly toRid: NodeRid;
  readonly value: TEdge;
}

// ─── Subgraph ─────────────────────────────────────────────────────────────────

/**
 * Subgraph returned by OntologyGraphStore.walkTransitive.
 * Rooted at a given NodeRid; contains all reachable nodes + traversed edges
 * up to the requested BFS depth. Feeds pm_impact_query consumers (PR 2.15).
 *
 * TNode and TEdge are generic stubs until the snapshot-refresh chore PR lands.
 */
export interface TypedGraphSubgraph<TNode = unknown, TEdge = unknown> {
  /** The RID of the BFS root node. */
  readonly root: NodeRid;
  /** All distinct nodes visited during the BFS walk, including root. */
  readonly nodes: ReadonlyArray<NodeRecord<TNode>>;
  /** All edges traversed during the BFS walk (deduped by EdgeRid). */
  readonly edges: ReadonlyArray<EdgeRecord<TEdge>>;
}

// ─── NodeTypeKind + EdgeKindUnion (forward-declaring for store consumers) ─────

/**
 * Discriminant literal union over all 32 typed graph node kinds.
 * Listed here as string constants for exhaustiveness checking once
 * the concrete TypedGraphNode union is wired up in a future PR.
 *
 * NOTE: Until the snapshot-refresh lands, store.ts uses `string` for the
 * `kind` parameter rather than narrowing to this union, to avoid requiring
 * the caller to import the union just to call getNodesByType("Hook").
 */
export type NodeTypeKind =
  // 12 PR 2.1 missing node primitives
  | "UserPrompt"
  | "ContextCapsule"
  | "AIPArchitectureAxis"
  | "ProjectBrowseDoc"
  | "ProjectIndexDoc"
  | "Hook"
  | "McpHandler"
  | "RuntimeEntrypoint"
  | "SourceFile"
  | "Test"
  | "Commit"
  | "PullRequest"
  // 9 PR 2.1 wrapper node primitives
  | "OfficialResearchDoc"
  | "Skill"
  | "Function"
  | "Tool"
  | "Grader"
  | "GeneratedArtifact"
  | "Event"
  | "FailureMode"
  | "Learning"
  // 11 pre-existing node primitives
  | "PromptEnvelope"
  | "SemanticIntentContract"
  | "DigitalTwinChangeContract"
  | "SprintContract"
  | "Rule"
  | "AgentDefinition"
  | "ObjectType"
  | "LinkType"
  | "ActionType"
  | "AIPEvaluationSuite"
  | "AIPEvaluationRun";

/**
 * Union of all 22 edge kind literals (across 6 cluster files, PR 2.2).
 * Forward-declared here for store consumers and tests.
 */
export type EdgeKindUnion =
  // structural (6)
  | "describes" | "implements" | "imports" | "reads" | "writes" | "emits"
  // governance (3)
  | "validates" | "gates" | "requiresApprovalFrom"
  // routing (4)
  | "routesTo" | "usesTool" | "delegatesTo" | "spawnsAgent"
  // lineage (3)
  | "correlatesWith" | "evaluates" | "failedBecause"
  // refinement (4)
  | "mitigates" | "refines" | "supersedes" | "conflictsWith"
  // taxonomy (2)
  | "belongsToAipAxis" | "safeToPruneAfterPromotion";

// ─── TypedGraphNode + TypedGraphEdge (generic stubs) ─────────────────────────

/**
 * TypedGraphNode — generic stub pending snapshot-refresh chore PR.
 *
 * The concrete form is a discriminated union over 32 NodeDeclaration types
 * intersected with { readonly nodeKind: NodeTypeKind }. Deferred because the
 * runtime-overlay snapshot does not yet include PR 2.1 primitives.
 *
 * Concrete form (once snapshot refreshed):
 *   export type TypedGraphNode =
 *     | (UserPromptDeclaration & { readonly nodeKind: "UserPrompt" })
 *     | (ContextCapsuleDeclaration & { readonly nodeKind: "ContextCapsule" })
 *     | ... (32 variants)
 */
export type TypedGraphNode = NodeRecord<unknown>;

/**
 * TypedGraphEdge — generic stub pending snapshot-refresh chore PR.
 *
 * The concrete form is a discriminated union over 6 cluster EdgeDeclarations
 * each carrying their own edgeKind discriminant. Deferred because the
 * runtime-overlay snapshot does not yet include PR 2.2 primitives.
 *
 * Concrete form (once snapshot refreshed):
 *   export type TypedGraphEdge =
 *     | StructuralEdgeDeclaration
 *     | GovernanceEdgeDeclaration
 *     | RoutingEdgeDeclaration
 *     | LineageEdgeDeclaration
 *     | RefinementEdgeDeclaration
 *     | TaxonomyEdgeDeclaration;
 */
export type TypedGraphEdge = EdgeRecord<unknown>;
