// palantir-mini v3.7.0 — hooks/semantic-frontmatter-validate/types.ts
// Types + path-scope predicate extracted during A.1 decomposition.

export interface HookPayload {
  hook_event_name?: string;
  tool_name?:        string;
  tool_input?:       { file_path?: string; path?: string; new_string?: string; content?: string };
  cwd?:              string;
  session_id?:       string;
}

export interface FrontmatterValidationResult {
  valid:         boolean;
  form:          "jsdoc" | "yaml-comment" | "none";
  missingFields: string[];
}

export interface HookResult {
  message:            string;
  decision?:          "block" | "continue";
  reason?:            string;
  additionalContext?: string;
}

/** Paths that require semantic frontmatter — mirrors SEMANTIC_FRONTMATTER_REQUIRED_PATHS */
export const REQUIRED_PATHS: readonly string[] = [
  "schemas/ontology/primitives/",
  "schemas/ontology/contracts/",
  "schemas/ontology/codegen/",
  "schemas/ontology/types/",            // Phase B3 (2026-04-20)
  "plugins/palantir-mini/lib/",          // Phase B3 (2026-04-20)
] as const;

export function isPathRequiringFrontmatter(filePath: string): boolean {
  return REQUIRED_PATHS.some(p => filePath.includes(p));
}
