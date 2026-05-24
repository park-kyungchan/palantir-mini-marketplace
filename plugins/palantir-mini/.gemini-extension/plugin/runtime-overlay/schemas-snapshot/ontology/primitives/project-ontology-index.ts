/**
 * ProjectOntologyIndex — generic shape for a per-project capability + surface
 * + validation-pack + known-issue + project-scope index.
 *
 * Promoted to schemas/ at v1.53.0 (foamy-giggling-kettle PR-1).
 * Extended at v1.60.0 (sprint-080 PR 2.3) with optional typed-graph
 * persistence fields (`nodes` + `edges`), adding two new generic parameters
 * TNode + TEdge (both defaulted to `unknown` for backward compatibility).
 * Consumers using the 3-parameter form `ProjectOntologyIndex<A, B, C>`
 * continue to compile unchanged.
 *
 * Parametrized over five plugin-resident primitive types:
 *   - TCapability — typically the plugin's CapabilityContract
 *   - TKnownIssue — typically the plugin's KnownIssue
 *   - TProjectScope — typically the plugin's ProjectScopeDefinition
 *   - TNode — typed graph node union (Phase 2 PR 2.3); defaults to `unknown`
 *   - TEdge — typed graph edge union (Phase 2 PR 2.3); defaults to `unknown`
 *
 * The plugin specializes the generic; schemas defines the SHAPE only.
 * This keeps schemas dependency-free while letting cross-project consumers
 * type-check index instances without reaching into plugin internals.
 *
 * Authority chain: research/ → schemas/ (this file) → shared-core/ →
 * plugin lib (specialization + loader + lib/ontology-graph/store.ts) →
 * project ontology index fragments under
 * `<project>/.palantir-mini/ontology-index/*.json`.
 *
 * @owner palantirkc-ontology
 * @since v1.53.0
 * @since v1.60.0 — TNode/TEdge generics + nodes?/edges? optional fields
 */

export const PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION =
  "palantir-mini/project-ontology-index/v1" as const;

/**
 * A single surface declared by a project's ontology index.
 * Concrete paths typically resolve under the project root, e.g.
 *   `<project>/src/sequencer/*.ts` for a writer surface.
 */
export interface ProjectOntologySurface {
  readonly surfaceId: string;
  readonly kind: "read" | "write" | "mutation" | "authority" | "validation";
  readonly path: string;
  readonly sourceRef: string;
  readonly laneRefs: readonly string[];
}

/**
 * A validation pack registered as part of the project ontology index.
 * `command` is an optional shell command the runtime may run to satisfy
 * the pack (e.g. `bun test tests/learningTraceProblem15.test.ts`).
 */
export interface ValidationPackContract {
  readonly validationPackId: string;
  readonly command?: string;
  readonly sourceRef: string;
  readonly required: boolean;
}

/**
 * Generic shape for a project ontology index.
 * Plugins specialize the five type parameters with their concrete
 * capability / known-issue / project-scope / node / edge types.
 *
 * TNode and TEdge default to `unknown` for backward compatibility —
 * existing consumers using the 3-parameter form compile unchanged.
 * Phase 2 consumers supply TypedGraphNode / TypedGraphEdge from
 * `lib/ontology-graph/types.ts` to enable typed-graph traversal.
 */
export interface ProjectOntologyIndex<
  TCapability,
  TKnownIssue,
  TProjectScope,
  TNode = unknown,
  TEdge = unknown,
> {
  readonly schemaVersion: typeof PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION;
  readonly projectId: string;
  readonly projectRoot: string;
  readonly loadedAt: string;
  readonly sourceRefs: readonly string[];
  readonly capabilities: readonly TCapability[];
  readonly surfaces: readonly ProjectOntologySurface[];
  readonly validationPacks: readonly ValidationPackContract[];
  readonly knownIssues: readonly TKnownIssue[];
  readonly projectScope: TProjectScope;
  readonly warnings: readonly string[];

  // NEW: typed graph persistence (Phase 2 PR 2.3 sprint-080)
  // Populated by lib/ontology-graph/store.ts consumers when serializing
  // the in-memory graph back to a ProjectOntologyIndex snapshot.
  readonly nodes?: readonly TNode[];
  readonly edges?: readonly TEdge[];
}

/**
 * Generic shape for a single fragment file under
 * `<project>/.palantir-mini/ontology-index/*.json`. Fragments are loaded
 * by the plugin and merged into a `ProjectOntologyIndex` instance.
 *
 * TNode and TEdge default to `unknown` for backward compatibility.
 * Phase 2 consumers supply TypedGraphNode / TypedGraphEdge to enable
 * typed-graph node/edge fragments to be merged into the full index.
 */
export interface ProjectOntologyIndexFragment<
  TCapability,
  TNode = unknown,
  TEdge = unknown,
> {
  readonly schemaVersion?: string;
  readonly projectId?: string;
  readonly capabilities?: readonly TCapability[];
  readonly surfaces?: readonly ProjectOntologySurface[];
  readonly validationPacks?: readonly ValidationPackContract[];
  readonly warnings?: readonly string[];

  // NEW: typed graph persistence (Phase 2 PR 2.3 sprint-080)
  readonly nodes?: readonly TNode[];
  readonly edges?: readonly TEdge[];
}

/**
 * Type guard for the schemaVersion literal. Useful for upgrade scripts
 * that need to gate behavior on a known primitive version.
 */
export function isProjectOntologyIndexSchemaVersionV1(
  candidate: unknown,
): candidate is typeof PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION {
  return candidate === PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION;
}
