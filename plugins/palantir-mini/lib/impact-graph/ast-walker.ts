/**
 * palantir-mini v3.7.0 — Impact Graph AST Walker (orchestrator)
 * @owner palantirkc-plugin-learn
 * @purpose Walks TS project via ts-morph; per-AST-kind helpers in ./ast-walker/*.
 */
// Domain: LEARN (ImpactEdge prim-learn-12 — Context Engineering materialization)
// Decomposed in v3.7.0 A.2: types + path-utils + visitor-helpers extracted to ./ast-walker/*.

import { Project } from "ts-morph";
import * as path from "path";
import type { StoredEdge } from "./types";
import { toRid } from "./ast-walker/path-utils";
import {
  walkImports,
  walkExports,
  walkClassHeritage,
  walkTypeReferences,
} from "./ast-walker/visitor-helpers";
import { DEFAULT_IGNORE } from "./ast-walker/types";
import type { WalkResult, AstWalkerOptions } from "./ast-walker/types";

// Backward-compat re-exports
export type { WalkResult, AstWalkerOptions } from "./ast-walker/types";
export { DEFAULT_IGNORE } from "./ast-walker/types";
export { toRid, resolveModuleSpecifier } from "./ast-walker/path-utils";
export {
  walkImports,
  walkExports,
  walkClassHeritage,
  walkTypeReferences,
} from "./ast-walker/visitor-helpers";

/**
 * Walk a TypeScript project and return all detected dependency edges.
 * Uses ts-morph Project for accurate module resolution.
 */
export function walkProject(options: AstWalkerOptions): WalkResult {
  const { projectRoot, extraIgnore = [] } = options;
  const scannedAt = new Date().toISOString();
  const edges: StoredEdge[] = [];
  const errors: string[] = [];

  const ignore = [...DEFAULT_IGNORE, ...extraIgnore];

  // Prefer tsconfig if present; fall back to manual source discovery
  const tsConfigPath = options.tsConfigPath ?? path.join(projectRoot, "tsconfig.json");

  let project: Project;
  try {
    project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: false,
    });
  } catch {
    project = new Project({ useInMemoryFileSystem: false });
    project.addSourceFilesAtPaths(path.join(projectRoot, "**/*.{ts,tsx}"));
  }

  // Glob-to-regex conversion escapes literal regex metacharacters first, then
  // replaces glob wildcards. The escaping step is critical: without it, `.` in
  // a pattern like `**/.palantir-mini/**` becomes regex-any-char and matches
  // any `/palantir-mini/` segment, filtering the plugin against itself.
  const allFiles = project.getSourceFiles().filter((sf) => {
    const fp = sf.getFilePath();
    return !ignore.some((pat) => {
      const regexSafe = pat
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*\//g, "(.*/)?")
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*");
      return new RegExp(regexSafe).test(fp);
    });
  });

  for (const sourceFile of allFiles) {
    const filePath  = sourceFile.getFilePath();
    const fromRid   = toRid(filePath, projectRoot);

    edges.push(...walkImports(sourceFile, fromRid, projectRoot, scannedAt));
    edges.push(...walkExports(sourceFile, fromRid, projectRoot, scannedAt));
    edges.push(...walkClassHeritage(sourceFile, fromRid, projectRoot, scannedAt));
    const typeRefResult = walkTypeReferences(sourceFile, fromRid, projectRoot, scannedAt);
    edges.push(...typeRefResult.edges);
    errors.push(...typeRefResult.errors);
  }

  return { edges, fileCount: allFiles.length, errors };
}
