// palantir-mini v3.7.0 — lib/impact-graph/ast-walker/path-utils.ts
// Path → RID conversion + module specifier resolution.
// Extracted from ast-walker.ts during A.2 decomposition.

import * as path from "path";

/** Convert a possibly-absolute path to a project-relative RID string. */
export function toRid(filePath: string, projectRoot: string): string {
  if (path.isAbsolute(filePath)) {
    const rel = path.relative(projectRoot, filePath).replace(/\\/g, "/");
    return `file:${rel.startsWith("..") ? filePath : rel}`;
  }
  return `file:${filePath.replace(/\\/g, "/")}`;
}

/**
 * Resolve a module specifier from an import/export declaration to an
 * absolute path. Returns null when the specifier is an npm package or
 * cannot be resolved.
 */
export function resolveModuleSpecifier(
  specifier: string,
  sourceFilePath: string,
  projectRoot: string,
): string | null {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    return null;
  }
  const base = path.dirname(sourceFilePath);
  const candidates = [
    specifier,
    specifier + ".ts",
    specifier + ".tsx",
    specifier + "/index.ts",
    specifier + "/index.tsx",
  ];
  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate)
      ? candidate
      : path.resolve(base, candidate);
    const rel = path.relative(projectRoot, resolved).replace(/\\/g, "/");
    if (!rel.startsWith("..")) {
      return resolved;
    }
  }
  return null;
}
