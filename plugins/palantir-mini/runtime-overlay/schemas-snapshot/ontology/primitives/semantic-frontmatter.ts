/**
 * palantir-mini — SemanticFrontmatter primitive (prim-learn-13)
 *
 * Schema for per-file semantic frontmatter enforced on hand-written
 * ontology primitives, contracts, and codegen files. Provides authority
 * context (owner, purpose, upstream/downstream deps) and lineage refs.
 *
 * Authority chain:
 *   research/palantir/ -> rules/11-codegen-authority.md
 *   -> schemas/ontology/primitives/semantic-frontmatter.ts
 *   -> palantir-mini/hooks/semantic-frontmatter-validate.ts
 *
 * Branded RID pattern (zero runtime cost):
 *   type SemanticFrontmatterRid = string & { __brand: "SemanticFrontmatter" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose SemanticFrontmatter primitive (prim-learn-13)
 */

/** Semver or commit-SHA pin to the @palantirKC/claude-schemas version. */
export type SchemaVersionPin = string & { readonly __brand: "SchemaVersionPin" };

export type SemanticFrontmatterRid = string & { readonly __brand: "SemanticFrontmatter" };

export interface SemanticFrontmatter {
  readonly owner: string;                     // path to CODEOWNERS entry or contributor slug
  readonly purpose: string;                   // one-line "what this file does semantically"
  readonly upstream?: readonly string[];      // path(s) to files this depends on
  readonly downstream?: readonly string[];    // path(s) of files that depend on this
  readonly schema_version?: SchemaVersionPin; // pin to schemas version
  readonly decision_lineage_ref?: string;     // event_seq or commit SHA
  readonly frozen_since?: string;             // ISO date — if file is semantically frozen
}

export const SEMANTIC_FRONTMATTER_REQUIRED_PATHS: readonly string[] = [
  "schemas/ontology/primitives/",
  "schemas/ontology/contracts/",
  "schemas/ontology/codegen/",
] as const;

export function isPathRequiringFrontmatter(filePath: string): boolean {
  return SEMANTIC_FRONTMATTER_REQUIRED_PATHS.some(p => filePath.includes(p));
}
