// palantir-mini sprint-061 cleanup-D — lib/impact-graph/types.ts
// Canonical type source for the impact-graph subsystem (post-SQLite-deprecation).
// Extracted from sqlite-cache.deprecated/types.ts; now the single import surface
// for AST edge types used by ast-walker, registry-loader, incremental-updater, etc.

export type AstEdgeKind =
  | "import"
  | "export"
  | "typeRef"
  | "extends"
  | "implements"
  | "forwardProp"
  | "backwardProp"
  | "codegen"
  | "semantic"
  | "test-covers"
  | "doc-references";

export interface StoredEdge {
  fromRid:    string;
  toRid:      string;
  edgeKind:   AstEdgeKind;
  confidence: number;
  evidence?:  string;
  scannedAt:  string;
}
