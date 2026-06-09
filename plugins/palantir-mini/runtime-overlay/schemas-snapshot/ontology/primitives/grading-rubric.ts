/**
 * @stable — GradingRubric primitive (prim-data-NN, v1.61.0 — schemas 1.60→1.61)
 *
 * Ordered Set<GradingCriterion> with sum of weights = 1.
 * Formalizes the previously conceptual "rubric" so handlers can:
 *   - reference a canonical rubric by RID (canonicalRubricRid)
 *   - reject contracts that cite an unregistered/mutated rubric (bypass guard)
 *   - aggregate criterion scores with declarative combinator policy
 *
 * Authority:
 *   - rule 16 v4.0.0 §GradingRubric
 *   - rule 26 v1.0.0 §Axis B (Verifiable)
 *   - research/palantir-foundry/aip/aip-evals-create-suite.md
 *
 * D/L/A domain: DATA (declarative composition; immutable once registered).
 * @owner palantirkc-ontology
 */

import type {
  GradingCriterionRid,
  PassFailLogic,
} from "./grading-criterion";

export type GradingRubricRid = string & { readonly __brand: "GradingRubricRid" };

export const gradingRubricRid = (s: string): GradingRubricRid =>
  s as GradingRubricRid;

/** Authoritative canonical-rubric registry status. */
export type RubricRegistrationStatus =
  | "draft"
  | "canonical"   // registered + frozen; safe to cite from contracts
  | "deprecated"; // legacy; should not be cited by new contracts

export interface GradingRubricDeclaration {
  readonly rubricId: GradingRubricRid;
  /** Optional self-pointer when this is the canonical version. */
  readonly canonicalRubricRid?: GradingRubricRid;
  readonly title: string;
  readonly description: string;
  /** Ordered set of criterion RIDs (composition). */
  readonly criterionRids: readonly GradingCriterionRid[];
  readonly aggregator: PassFailLogic;
  /**
   * Domain scope inherited from criteria (e.g. "frontend" / "backend" / "3d-scene" / "ontology" / "teaching" / "any").
   */
  readonly appliesToDomain: string;
  readonly status: RubricRegistrationStatus;
  readonly registeredAt?: string; // ISO8601
  /** Optional provenance — cites AIP Evals doc/path or Prithvi original. */
  readonly provenance?: string;
  /** Schema version when this rubric was registered (immutability guard). */
  readonly schemaVersionAtRegistration?: string;
}

export class GradingRubricRegistry {
  private readonly items = new Map<GradingRubricRid, GradingRubricDeclaration>();
  register(decl: GradingRubricDeclaration): void {
    if (decl.status === "canonical" && this.items.has(decl.rubricId)) {
      // canonical rubrics are immutable; reject re-register
      const existing = this.items.get(decl.rubricId)!;
      if (JSON.stringify(existing) !== JSON.stringify(decl)) {
        throw new Error(
          `[GradingRubricRegistry] cannot mutate canonical rubric ${decl.rubricId}: register a new rubric with a different RID.`,
        );
      }
    }
    this.items.set(decl.rubricId, decl);
  }
  get(rid: GradingRubricRid): GradingRubricDeclaration | undefined {
    return this.items.get(rid);
  }
  isCanonical(rid: GradingRubricRid): boolean {
    const r = this.items.get(rid);
    return r !== undefined && r.status === "canonical";
  }
  list(): GradingRubricDeclaration[] {
    return [...this.items.values()];
  }
}

export const GRADING_RUBRIC_REGISTRY = new GradingRubricRegistry();
