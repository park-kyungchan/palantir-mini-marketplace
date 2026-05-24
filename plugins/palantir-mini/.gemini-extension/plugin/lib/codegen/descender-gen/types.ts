// palantir-mini v3.7.0 — lib/codegen/descender-gen/types.ts
// Codegen options + result types extracted from descender-gen.ts during A.2 decomposition.

export interface CodegenOptions {
  projectRoot: string;
  schemaRoot?: string;  // default: runtime-overlay/schemas-snapshot/ontology
  dryRun?: boolean;
}

export interface CodegenResult {
  targetProject:  string;
  generatedFiles: string[];
  durationMs:     number;
  startedSequence?:   number;
  completedSequence?: number;
  errors:         string[];
}
