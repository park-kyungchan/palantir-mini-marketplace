/**
 * lib/ontology-graph/index.ts — Public API surface barrel for the typed
 * ontology graph subsystem (PR 2.3 → PR 2.13 substrate + PR 2.14 orchestrator).
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/schemas/ontology/primitives/ (PR 2.1 node + PR 2.2 edge sources)
 *     → ~/ontology/shared-core/index.ts (consumer surface)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, etc.)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore factory)
 *     → lib/ontology-graph/indexers/*.ts (10 concrete indexers)
 *     → lib/ontology-graph/build-graph.ts (orchestrator)
 *     → this barrel (single entry-point for external consumers)
 *     → PR 2.15 (pm_impact_query MCP handler — wraps `buildOntologyGraph`)
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.12.0 (sprint-091 PR 2.14; Sprint X3 PR 4/5)
 */

// ─── Substrate types (PR 2.3 sprint-080) ──────────────────────────────────────

export type {
  NodeRid,
  EdgeRid,
  NodeRecord,
  EdgeRecord,
  TypedGraphSubgraph,
  NodeTypeKind,
  EdgeKindUnion,
  TypedGraphNode,
  TypedGraphEdge,
} from "./types";

// ─── In-memory store (PR 2.3 sprint-080) ──────────────────────────────────────

export {
  createOntologyGraphStore,
  type OntologyGraphStore,
} from "./store";

// ─── Concrete indexers (PR 2.4 - PR 2.13) ─────────────────────────────────────

export { indexBrowseAndIndexDocs } from "./indexers/browse-index";
export { indexAgentsAndRules } from "./indexers/agents-rules";
export { indexPluginManifestAndHooks } from "./indexers/plugin-manifest";
export { indexSkillFrontmatter } from "./indexers/skills";
export { indexHandlerExports } from "./indexers/handlers";
export { indexSchemaPrimitives } from "./indexers/schema-primitives";
export { indexSourceFilesImports } from "./indexers/source-files";
export { indexTestsAndEvals } from "./indexers/tests-evals";
export { indexEventsT2Plus } from "./indexers/events";
export { indexGitHistory } from "./indexers/git-history";

// ─── Orchestrator (PR 2.14 sprint-091) ────────────────────────────────────────

export {
  buildOntologyGraph,
  ALL_INDEXER_NAMES,
  type IndexerName,
  type IndexerStats,
  type BuildOntologyGraphOpts,
} from "./build-graph";
