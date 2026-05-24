/**
 * @stable — GeneratedArtifact primitive (prim-data-22, v1.0.0)
 *
 * Alias-wrapper representing the produced FILE NODE for a code-generated
 * artifact. CodegenHeaderContract (codegen-header-contract.ts) describes
 * the header CONTRACT — what MUST appear in a generated file header.
 * GeneratedArtifact is the graph-node identity of the PRODUCED FILE itself,
 * referencing the contract that governs it.
 *
 * This separation allows the ImpactGraph to answer:
 *   "which generated files exist under this contract?"
 *   "when was this generated file last produced, and from what source hash?"
 *
 * Decision: alias-wrapper (b1) per spec.md §4 row 6.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/codegen-header-contract.ts (contractRef)
 *     -> ~/.claude/schemas/ontology/primitives/generated-artifact.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *
 * D/L/A domain: DATA (produced file node — immutable snapshot at generation time)
 * @owner palantirkc-ontology
 * @purpose GeneratedArtifact graph-node identity (Phase 2 ImpactGraph node-type)
 */

import type { CodegenHeaderContractRid } from "./codegen-header-contract";

export type { CodegenHeaderContractRid } from "./codegen-header-contract";

export type GeneratedArtifactRid = string & { readonly __brand: "GeneratedArtifactRid" };
export const generatedArtifactRid = (s: string): GeneratedArtifactRid =>
  s as GeneratedArtifactRid;

export interface GeneratedArtifactDeclaration {
  readonly artifactId: GeneratedArtifactRid;
  /** Absolute path to the generated file. */
  readonly filePath: string;
  /** RID of the CodegenHeaderContract that governs this generated file. */
  readonly contractRef: CodegenHeaderContractRid;
  /** ISO 8601 timestamp when the file was last generated. */
  readonly generatedAt: string;
  /** SHA-256 hex digest of the source ontology/schema inputs at generation time. */
  readonly sourceHash: string;
}

export function isGeneratedArtifactDeclaration(x: unknown): x is GeneratedArtifactDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as GeneratedArtifactDeclaration;
  return (
    typeof d.artifactId === "string" &&
    d.artifactId.length > 0 &&
    typeof d.filePath === "string" &&
    typeof d.contractRef === "string" &&
    typeof d.generatedAt === "string" &&
    typeof d.sourceHash === "string"
  );
}
