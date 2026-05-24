/**
 * palantir-mini — EditFunction signature primitive (prim-logic-01)
 *
 * Edit functions compute OntologyEdit[] WITHOUT committing. The authoring
 * helper returns edits, NOT mutations. Committing is the exclusive
 * responsibility of Tier-2 function-backed Actions. See Palantir
 * logic/functions.md §LOGIC.FN-04.
 *
 * Mechanical enforcement: plugin subagents running edit functions MUST have
 * `disallowedTools: [Write, Edit, Bash]` — they are structurally incapable of
 * committing. This lives in palantir-mini/agents/*.md frontmatter.
 */

/** Minimal OntologyEdit shape — matches palantir-mini/lib/event-log/types.ts */
export type OntologyEdit =
  | { kind: "object"; rid: string; properties: Record<string, unknown> }
  | { kind: "link";   rid: string; srcRid: string; dstRid: string; linkName: string }
  | { kind: "interface"; rid: string; interfaceName: string };

/**
 * Edit function signature. The body receives typed params and returns
 * OntologyEdit[]. The body MUST be pure — no filesystem, no network, no
 * mutation of shared state.
 */
export interface EditFunctionSignature<P = unknown> {
  readonly name: string;
  readonly description?: string;
  /** Optional JSON Schema for params (runtime validation hook for v1) */
  readonly paramsSchema?: unknown;
  /** Return type marker — always OntologyEdit[] for edit functions */
  readonly returnType: "OntologyEdit[]";
  /** Pure compute body */
  readonly apply: (params: P) => OntologyEdit[] | Promise<OntologyEdit[]>;
}

/** Type-level declaration utility */
export type InferEditFunctionParams<F> = F extends EditFunctionSignature<infer P> ? P : never;
