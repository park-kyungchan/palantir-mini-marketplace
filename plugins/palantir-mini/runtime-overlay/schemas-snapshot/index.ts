/**
 * @palantirKC/claude-schemas — root aggregator
 *
 * Preferred usage: import from an axis subpath:
 *   import type { OntologyExports } from "@palantirKC/claude-schemas/ontology";
 *   import type { RenderingExports } from "@palantirKC/claude-schemas/rendering";
 *   import type { InteractionExports } from "@palantirKC/claude-schemas/interaction";
 *
 * This root re-exports axis entrypoints for consumers that want a single
 * import surface — not recommended for large codebases; prefer the subpath form.
 */

export * as Ontology from "./ontology/types";
export * as Rendering from "./rendering/index";
export * as Interaction from "./interaction/index";
export * as Meta from "./meta/index";

// v1.0 primitives — re-exported under Ontology namespace subpaths
export * from "./ontology/primitives/struct";
export * from "./ontology/primitives/value-type";
export * from "./ontology/primitives/shared-property-type";
export * from "./ontology/primitives/capability-token";
export * from "./ontology/primitives/marking-declaration";
export * from "./ontology/primitives/automation-declaration";
export * from "./ontology/primitives/webhook-declaration";
export * from "./ontology/primitives/scenario-sandbox";
export * from "./ontology/primitives/aip-logic-function";

// v1.13 governance primitives (A1.1 - A1.12)
export * from "./ontology/primitives/research-document";
export * from "./ontology/primitives/memory-index-entry";
export * from "./ontology/primitives/hook-event-allowlist";
export * from "./ontology/primitives/plugin-manifest";
export * from "./ontology/primitives/project-schema-pin";
export * from "./ontology/primitives/file-complexity-budget";
export * from "./ontology/primitives/dead-code-marker";
export * from "./ontology/primitives/lineage-conformance-policy";
export * from "./ontology/primitives/managed-settings-fragment";
export * from "./ontology/primitives/codegen-header-contract";
export * from "./ontology/primitives/impact-edge";
export * from "./ontology/research-source-map";

// v1.46 sprint-059 W2.1 — DerivedPropertyDeclaration (prim-data-26)
// Foundry-equivalent typed compute-binding primitive; closes the long-
// standing forward reference in object-type.ts:5-6. See PR #329 §5.G.2.
export * from "./ontology/primitives/derived-property";
