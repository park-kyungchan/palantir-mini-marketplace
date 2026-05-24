/**
 * @stable — AIPArchitectureAxis primitive (prim-data-14, v1.0.0)
 *
 * One of the 7 AIP architecture axes that structure the alignment between
 * Palantir AIP and this local control plane. Each axis node records the
 * Palantir anchor (official product/layer name) and our local counterpart
 * (the palantir-mini equivalent). Enables PR 2.15 impact_query upgrade to
 * surface per-axis alignment coverage.
 *
 * The 7 canonical axis names:
 *   Ontology | Logic | Foundry-Data | Pipelines | Modules | Workshop | Evals
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/aip-architecture-axis.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: DATA (declarative alignment mapping — not a state machine)
 * @owner palantirkc-ontology
 * @purpose AIPArchitectureAxis graph-node identity (Phase 2 ImpactGraph node-type)
 */

/** Canonical 7-axis literal union for Palantir AIP alignment. */
export type AIPAxisName =
  | "Ontology"
  | "Logic"
  | "Foundry-Data"
  | "Pipelines"
  | "Modules"
  | "Workshop"
  | "Evals";

export const AIP_AXIS_NAMES: ReadonlyArray<AIPAxisName> = [
  "Ontology",
  "Logic",
  "Foundry-Data",
  "Pipelines",
  "Modules",
  "Workshop",
  "Evals",
];

export type AIPArchitectureAxisRid = string & { readonly __brand: "AIPArchitectureAxisRid" };
export const aipArchitectureAxisRid = (s: string): AIPArchitectureAxisRid =>
  s as AIPArchitectureAxisRid;

export interface AIPArchitectureAxisDeclaration {
  readonly axisId: AIPArchitectureAxisRid;
  /** One of the 7 canonical AIP axis names. */
  readonly axisName: AIPAxisName;
  /**
   * Official Palantir product / layer name that anchors this axis.
   * E.g. "Palantir Ontology (OSDK v2)" for the Ontology axis.
   */
  readonly palantirAnchor: string;
  /**
   * Our local control-plane counterpart for this axis.
   * E.g. "~/.claude/schemas/ontology/primitives/ + shared-core" for Ontology.
   * Absent when no local counterpart exists yet.
   */
  readonly ourCounterpart?: string;
}

export function isAIPArchitectureAxisDeclaration(x: unknown): x is AIPArchitectureAxisDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as AIPArchitectureAxisDeclaration;
  return (
    typeof d.axisId === "string" &&
    d.axisId.length > 0 &&
    typeof d.axisName === "string" &&
    (AIP_AXIS_NAMES as ReadonlyArray<string>).includes(d.axisName) &&
    typeof d.palantirAnchor === "string"
  );
}
