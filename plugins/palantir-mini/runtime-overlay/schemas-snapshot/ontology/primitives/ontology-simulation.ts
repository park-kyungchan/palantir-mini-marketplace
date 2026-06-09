/**
 * @stable — OntologySimulation primitive (prim-data-23, v1.40.0)
 *
 * Promotes the AIP Evals "ontology simulation" pattern (verbatim, Palantir
 * docs §B): "For functions that involve Ontology edits ... each test case
 * is executed in an Ontology simulation. This ensures that the actual
 * Ontology remains unchanged during testing and evaluation." The simulation
 * is a transient graph copy that absorbs proposed Edits[] for verification
 * without mutating production state.
 *
 * D/L/A domain: DATA (the simulation is a transient stored fact — a copy
 * of the ontology graph at a point in time, plus an applied mutation set
 * and the resulting impact-radius score). It composes with the existing
 * RubricDomain="simulator" (schemas v1.31.0+) — that primitive describes
 * a *grader*; this one describes the *artifact* the grader observes.
 *
 * Authority chain:
 *   research/palantir-foundry/aip/
 *     aip-evals-overview-and-ontology-edits-2026-04-14.md §B
 *     ↓
 *   schemas/ontology/primitives/ontology-simulation.ts (this file)
 *     ↓
 *   shared-core re-export
 *     ↓
 *   palantir-mini bridge: compute_edits_dry_run + grader simulator domain
 *
 * Rule cross-refs: rule 16 v4.0.0 §GradingRubric (RubricDomain="simulator"),
 * rule 26 v1.0.0 §Axis B (Verifiable — outcome-paired evaluation).
 *
 * @owner palantirkc-ontology
 * @purpose Typed transient ontology graph copy for AIP Evals-style edit simulation
 */

import type { ActionTypeRid } from "./action-type";
import type { ObjectTypeRid } from "./object-type";
import type { OntologyVersionRef } from "./ontology-branch-proposal";

export type OntologySimulationRid = string & {
  readonly __brand: "OntologySimulationRid";
};

export const ontologySimulationRid = (s: string): OntologySimulationRid =>
  s as OntologySimulationRid;

/**
 * One mutation applied during the simulation. Mirrors the (action, target,
 * payload) shape used by Tier-2 function-backed actions; the discriminator
 * lives in `kind` so the simulation can replay create / update / delete /
 * action-invoke entries against the transient graph.
 */
export interface OntologyEdit {
  readonly editId: string;
  readonly kind: "create-object" | "update-object" | "delete-object" | "action-invoke";
  readonly objectTypeRid?: ObjectTypeRid;
  readonly actionTypeRid?: ActionTypeRid;
  /** Stringified payload (JSON) — kept opaque so this file does not import
   *  PropertyType definitions and avoid circular dep. Consumers parse
   *  per-edit. */
  readonly payload: string;
  readonly timestamp: string;
}

/**
 * Lifecycle / disposal — governs when the transient graph copy is reaped.
 *
 *   immediate    — disposed at end of grader run; default for stateless evals.
 *   "7d-archive" — retained 7 days for audit + replay, then GC'd.
 *   "on-merge"   — retained until the parent branch is merged or abandoned,
 *                  then GC'd (use when simulation backs an AI FDE proposal).
 */
export type OntologySimulationDisposalPolicy =
  | "immediate"
  | "7d-archive"
  | "on-merge";

/**
 * Top-level simulation declaration.
 */
export interface OntologySimulation {
  readonly simulationId: OntologySimulationRid;
  /**
   * Reference to the transient graph copy (e.g. opaque sandbox handle, on-
   * disk snapshot path, or Foundry scenario branch RID). Kept as a string
   * so this primitive does not depend on any specific runtime.
   */
  readonly transientGraphRef: string;
  readonly baseOntologyVersion: OntologyVersionRef;
  readonly mutationsApplied: ReadonlyArray<OntologyEdit>;
  /**
   * Normalized impact radius (count of RIDs touched, transitive reach
   * within the simulation). Lower = better. Pairs with the existing
   * simulator-domain rubric (schemas v1.31.0+) which scores LOWER radius
   * as higher pass.
   */
  readonly impactRadius: number;
  readonly verificationQueries: ReadonlyArray<string>;
  readonly disposalPolicy: OntologySimulationDisposalPolicy;
}

export function isOntologySimulationDisposalPolicy(
  s: string,
): s is OntologySimulationDisposalPolicy {
  return s === "immediate" || s === "7d-archive" || s === "on-merge";
}

export function isOntologySimulation(x: unknown): x is OntologySimulation {
  if (typeof x !== "object" || x === null) return false;
  const s = x as OntologySimulation;
  return (
    typeof s.simulationId === "string" &&
    s.simulationId.length > 0 &&
    typeof s.transientGraphRef === "string" &&
    s.transientGraphRef.length > 0 &&
    typeof s.baseOntologyVersion === "string" &&
    s.baseOntologyVersion.length > 0 &&
    Array.isArray(s.mutationsApplied) &&
    typeof s.impactRadius === "number" &&
    Number.isFinite(s.impactRadius) &&
    s.impactRadius >= 0 &&
    Array.isArray(s.verificationQueries) &&
    typeof s.disposalPolicy === "string" &&
    isOntologySimulationDisposalPolicy(s.disposalPolicy)
  );
}

export class OntologySimulationRegistry {
  private readonly sims = new Map<OntologySimulationRid, OntologySimulation>();

  register(decl: OntologySimulation): void {
    this.sims.set(decl.simulationId, decl);
  }

  get(rid: OntologySimulationRid): OntologySimulation | undefined {
    return this.sims.get(rid);
  }

  byDisposalPolicy(policy: OntologySimulationDisposalPolicy): OntologySimulation[] {
    return [...this.sims.values()].filter((s) => s.disposalPolicy === policy);
  }

  list(): OntologySimulation[] {
    return [...this.sims.values()];
  }
}

export const ONTOLOGY_SIMULATION_REGISTRY = new OntologySimulationRegistry();
