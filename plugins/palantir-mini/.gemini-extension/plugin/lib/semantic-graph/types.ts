/**
 * palantir-mini v2.6.0 — lib/semantic-graph/types.ts
 * Shared shapes for the ontology-first semantic impact subsystem.
 *
 * @owner palantirkc-plugin-learn
 * @purpose Shared types used by all 6 producers + manifest-writer + semantic-query + semantic-change-plan handler.
 */
// Domain: LEARN (SemanticRid prim-learn-13 — ontology-first impact substrate)
// Authority chain:
//   research/palantir-vision/synthesis/2026-04-23-palantir-mini-ontology-first-rebuild-proposal.md §L2 Edge Producers
//   → ontology/primitives/semantic-rid.ts (prim-learn-13)
//   → this file (shared types for lib/semantic-graph/*)

import type {
  SemanticRid,
  SemanticRidKind,
  SemanticRidDeclaration,
} from "#schemas/ontology/primitives/semantic-rid";

/** Evidence source marker. "ast" is Wave 1+; "semantic" is Wave 2+. */
export type EvidenceKind = "ast" | "semantic";

/** A single semantic-graph edge between two SemanticRids. */
export interface SemanticEdge {
  readonly fromRid: SemanticRid;
  readonly toRid: SemanticRid;
  readonly edgeKind:
    | "ontology-defines"
    | "ontology-depends-on"
    | "gen-from-ontology"
    | "runtime-consumes-gen"
    | "eval-covers"
    | "doc-references"
    | "mon-scope"
    | "lineage-cochange"
    | "artifact-version"
    | "ast-import"
    | "ast-type-ref";
  readonly confidence: number; // 0..1
  readonly evidenceKind: EvidenceKind;
  readonly evidence?: string; // short excerpt, ≤200 chars
  readonly producer: ProducerId;
}

/** Identifier for the 6 Wave 2 producers + the AST-evidence adapter. */
export type ProducerId =
  | "ontology"
  | "codegen"
  | "runtime"
  | "verification"
  | "lineage"
  | "ast-evidence";

/** Node in the semantic graph. Wraps a SemanticRidDeclaration with derived metadata. */
export interface SemanticNode {
  readonly decl: SemanticRidDeclaration;
  readonly discoveredBy: ReadonlyArray<ProducerId>;
}

/** Context passed to every producer. Describes the project scope being walked. */
export interface ProducerContext {
  readonly projectRoot: string;
  readonly sharedCorePath?: string; // defaults to plugin runtime-overlay/ontology-shared-core
  readonly schemasPath?: string;    // defaults to plugin runtime-overlay/schemas-snapshot
  readonly maxDepth?: number;       // transitive walk depth, default 3
}

/** Result a single producer returns to the orchestrator. */
export interface ProducerResult {
  readonly producer: ProducerId;
  readonly nodes: ReadonlyArray<SemanticNode>;
  readonly edges: ReadonlyArray<SemanticEdge>;
  readonly uncertainties: ReadonlyArray<string>; // human-readable gaps
  readonly durationMs: number;
}

/**
 * One entry in SemanticChangePlan.authorityNotes. Pairs a research ref with its
 * authority class (from schemas/ontology/research-source-map.ts live union) and
 * the agent directive that explains *how* to read that ref.
 */
export interface AuthorityNote {
  readonly ref: string;
  readonly authorityClass:
    | "builder"
    | "fact"
    | "synthesis"
    | "capability"
    | "archive";
  readonly note: string;
}

/** Output of semantic_change_plan MCP handler (plan proposal §L4). */
export interface SemanticChangePlan {
  readonly affectedSemanticRids: ReadonlyArray<SemanticRid>;
  readonly affectedFiles: ReadonlyArray<string>;
  readonly affectedGenerated: ReadonlyArray<string>;
  readonly affectedTests: ReadonlyArray<string>;
  readonly affectedEvals: ReadonlyArray<SemanticRid>;       // eval:* RIDs, populated in Wave 3
  readonly affectedDocs: ReadonlyArray<SemanticRid>;         // doc:*, Wave 3
  readonly affectedMonitoring: ReadonlyArray<SemanticRid>;   // mon:*, Wave 3
  // --- SP-3 read-plan extension (v2.13.0 — next-direction.md §3) ----------
  // Research refs derived from doc-references edges on affectedDocs. Empty
  // arrays when the 1-hop neighborhood touches no doc:* RIDs.
  readonly requiredResearchRefs: ReadonlyArray<string>;      // normalized primaryRefs (exists=true)
  readonly recommendedReadOrder: ReadonlyArray<string>;      // sorted builder→fact→synthesis→capability→archive
  readonly authorityNotes: ReadonlyArray<AuthorityNote>;
  readonly archiveBridgeRefs: ReadonlyArray<string>;         // authorityClass==="archive" || archived
  // ------------------------------------------------------------------------
  readonly editOrder: ReadonlyArray<SemanticRid>;            // ontology → gen → runtime → verification
  readonly uncertainties: ReadonlyArray<string>;
  readonly confidence: number;                               // 0..1, aggregated
  readonly source: "fresh-scan" | "cached-manifest";
}

/** Re-export for convenient use by producer modules. */
export type { SemanticRid, SemanticRidKind, SemanticRidDeclaration };
