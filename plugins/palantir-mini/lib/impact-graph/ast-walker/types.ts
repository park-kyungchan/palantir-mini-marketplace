// palantir-mini v3.7.0 — lib/impact-graph/ast-walker/types.ts
// Types + default ignore list extracted from ast-walker.ts during A.2 decomposition.

import type { StoredEdge } from "../types";

export interface WalkResult {
  edges:     StoredEdge[];
  fileCount: number;
  errors:    string[];
}

export interface AstWalkerOptions {
  /** Absolute path to project root. */
  projectRoot:   string;
  /** Optional tsconfig.json path (defaults to <projectRoot>/tsconfig.json). */
  tsConfigPath?: string;
  /** Additional glob patterns to ignore on top of defaults. */
  extraIgnore?:  string[];
}

export const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.palantir-mini/**",
  "**/generated/**",
  "**/*.d.ts",
];
