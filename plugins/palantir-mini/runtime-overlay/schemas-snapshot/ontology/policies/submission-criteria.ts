/**
 * palantir-mini — SubmissionCriteria primitive (prim-logic-07 + prim-sec-02)
 *
 * Pre-flight business-logic evaluator. 9 constraint classes from Palantir
 * action/mutations.md §ACTION.MU-14..17:
 *
 *   Range, ArraySize, StringLength, StringRegexMatch, OneOf,
 *   ObjectQueryResult, ObjectPropertyValue, GroupMember, Unevaluable
 *
 * Dual-modeled: LOGIC (computation) + SECURITY (gate semantics). LOGIC
 * evaluates pass/fail; SECURITY is the gate that USES the evaluation to
 * permit or deny the commit.
 *
 * Runtime evaluator: palantir-mini/lib/actions/submission-criteria.ts
 */

export type SubmissionCriterionType =
  | "Range"
  | "ArraySize"
  | "StringLength"
  | "StringRegexMatch"
  | "OneOf"
  | "ObjectQueryResult"
  | "ObjectPropertyValue"
  | "GroupMember"
  | "Unevaluable";

export interface SubmissionCriterionSpec {
  readonly name: string;
  readonly type: SubmissionCriterionType;
  readonly description?: string;
  /** Type-specific configuration */
  readonly config: Record<string, unknown>;
}

/** Declaration of a reusable submission criterion library */
export class SubmissionCriteriaLibrary {
  private readonly criteria = new Map<string, SubmissionCriterionSpec>();
  register(spec: SubmissionCriterionSpec): void { this.criteria.set(spec.name, spec); }
  get(name: string): SubmissionCriterionSpec | undefined { return this.criteria.get(name); }
  list(): SubmissionCriterionSpec[] { return [...this.criteria.values()]; }
}

export const SUBMISSION_CRITERIA_LIBRARY = new SubmissionCriteriaLibrary();
