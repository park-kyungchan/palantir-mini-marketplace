/**
 * @stable — Function primitive (prim-logic-04, v1.0.0)
 *
 * Alias-wrapper for AIPLogicFunctionRid under the canonical Phase 2 node name,
 * extended with a `FunctionKind` literal-union that reserves scope for
 * deterministic edit functions, Convex mutations, and Convex queries — kinds
 * that the existing AIPLogicFunction primitive does NOT cover (it is
 * intentionally LLM-backed only).
 *
 * The wrapper deliberately points to the existing primitive for the LLM case.
 * The `FunctionKind` literal-union is reserved for later edges (PR 2.2+).
 * aip-logic-function.ts is NOT extended — per rule 08 backcompat discipline.
 *
 * Decision: alias-wrapper + scope note (b1) per spec.md §4 row 3.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/aip-logic-function.ts (wrapped)
 *     -> ~/.claude/schemas/ontology/primitives/function.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *
 * D/L/A domain: LOGIC (alias + kind reservation; no new runtime logic)
 * @owner palantirkc-ontology
 * @purpose Function canonical alias for AIPLogicFunctionRid + FunctionKind union (Phase 2 ImpactGraph node)
 */

export type {
  AIPLogicFunctionRid,
  AIPLogicFunctionDeclaration,
} from "./aip-logic-function";

export { aipLogicFunctionRid } from "./aip-logic-function";

/** Canonical alias — FunctionRid IS AIPLogicFunctionRid. */
export type FunctionRid = import("./aip-logic-function").AIPLogicFunctionRid;

/**
 * Broader function kind taxonomy. `"aip-logic"` maps to the wrapped
 * AIPLogicFunction (LLM-backed). The remaining kinds are reserved for
 * later indexers (PR 2.10+ for edit-function; Sprint X5 PRs for Convex).
 */
export type FunctionKind =
  | "aip-logic"
  | "edit-function"
  | "convex-mutation"
  | "convex-query";
