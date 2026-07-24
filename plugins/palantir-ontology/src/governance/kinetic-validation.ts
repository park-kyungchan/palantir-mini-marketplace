// ADR-006 Unit C: standalone pre-mutation submission-criteria validation
// evaluator. Closes Engine-V2 Gap 2.3 — the V2 design doc's
// `ActionExecutor.validate_action` raises `KineticValidationError` only when
// `p_def.is_required and v is None`: no data-type conformance check, no
// enum/allowed-value check, no dynamic/business-rule ("submission
// criteria") check exists anywhere in that method. This module is that
// missing pipeline: a composable criteria tree (`all`/`any`/`none` over
// typed constraint leaves) that a caller can build once and evaluate
// against any mutation-envelope-shaped input, reporting every failure
// rather than throwing on the first one.
//
// Standalone: this evaluator is NOT wired into `commit-gate.ts` by this
// unit — wiring the write path to call `evaluateKineticCriteria` before any
// mutation reaches the writer happens in a later ADR-006 unit (Unit A, the
// write executor), sequenced deliberately AFTER this one so a fail-open
// write path never exists in the tree, even transiently.
//
// Citation: de-2026-07-24-s19-kinetic-adr006-scope-of-record (build-only
// ADR-006 scoping row of record, home-repo PR #1101).

/** A single, typed pre-mutation constraint leaf. */
export type KineticConstraint =
  | { readonly kind: "required"; readonly path: string }
  | {
      readonly kind: "type_conformance";
      readonly path: string;
      readonly expectedType: "string" | "number" | "boolean" | "object" | "array";
    }
  | { readonly kind: "enum_membership"; readonly path: string; readonly allowed: readonly unknown[] }
  | { readonly kind: "version_present"; readonly path: string }
  | {
      readonly kind: "custom_predicate";
      readonly path: string;
      readonly name: string;
      readonly predicate: (value: unknown, input: Record<string, unknown>) => boolean;
    };

/** The `all`/`any`/`none` composition tree over `KineticConstraint` leaves. */
export type KineticCriteriaNode =
  | { readonly all: readonly KineticCriteriaNode[] }
  | { readonly any: readonly KineticCriteriaNode[] }
  | { readonly none: readonly KineticCriteriaNode[] }
  | KineticConstraint;

export interface KineticCriteriaFailure {
  readonly reason_code: string;
  readonly path: string;
  readonly detail: string;
}

export interface KineticCriteriaResult {
  readonly pass: boolean;
  readonly failures: readonly KineticCriteriaFailure[];
}

// Reason-code bindings, drawn ONLY from the existing
// `contracts/reason-code-registry.json` set (never added to or edited by
// this unit). `required`/`type_conformance`/`enum_membership`/
// `version_present` all bind to RC-SCHEMA-VALIDATION-FAILED — its registry
// meaning ("a payload failed validation against its bound contract schema:
// missing or malformed load-bearing field") covers all four static-shape
// failure classes exactly. `custom_predicate` binds to
// RC-AUTH-SUBMISSION-CRITERIA-FAILED — the registry code for
// "submissionCriteriaResult.passed was false at resolution time" — since a
// custom predicate is precisely the dynamic/business-rule check that field
// exists to carry (this evaluator's whole purpose is computing that field's
// value pre-mutation).
const RC_SCHEMA_VALIDATION_FAILED = "RC-SCHEMA-VALIDATION-FAILED";
const RC_AUTH_SUBMISSION_CRITERIA_FAILED = "RC-AUTH-SUBMISSION-CRITERIA-FAILED";

function getAtPath(input: Record<string, unknown>, path: string): { readonly present: boolean; readonly value: unknown } {
  const segments = path.split(".").filter((s) => s.length > 0);
  let cursor: unknown = input;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined || typeof cursor !== "object") {
      return { present: false, value: undefined };
    }
    const obj = cursor as Record<string, unknown>;
    if (!(segment in obj)) {
      return { present: false, value: undefined };
    }
    cursor = obj[segment];
  }
  return { present: true, value: cursor };
}

function actualTypeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/** Evaluates one constraint leaf against `input`, appending 0 or 1 failure to `failures`. Never throws. */
function evaluateConstraint(constraint: KineticConstraint, input: Record<string, unknown>, failures: KineticCriteriaFailure[]): boolean {
  const { path } = constraint;

  switch (constraint.kind) {
    case "required": {
      const { present, value } = getAtPath(input, path);
      if (!present || value === null || value === undefined) {
        failures.push({
          reason_code: RC_SCHEMA_VALIDATION_FAILED,
          path,
          detail: `required: "${path}" is missing or null`,
        });
        return false;
      }
      return true;
    }

    case "type_conformance": {
      const { present, value } = getAtPath(input, path);
      if (!present) {
        failures.push({
          reason_code: RC_SCHEMA_VALIDATION_FAILED,
          path,
          detail: `type_conformance: "${path}" is missing (expected ${constraint.expectedType})`,
        });
        return false;
      }
      const actual = actualTypeOf(value);
      if (actual !== constraint.expectedType) {
        failures.push({
          reason_code: RC_SCHEMA_VALIDATION_FAILED,
          path,
          detail: `type_conformance: "${path}" expected ${constraint.expectedType}, got ${actual}`,
        });
        return false;
      }
      return true;
    }

    case "enum_membership": {
      const { present, value } = getAtPath(input, path);
      if (!present) {
        failures.push({
          reason_code: RC_SCHEMA_VALIDATION_FAILED,
          path,
          detail: `enum_membership: "${path}" is missing`,
        });
        return false;
      }
      const isMember = constraint.allowed.some((a) => JSON.stringify(a) === JSON.stringify(value));
      if (!isMember) {
        failures.push({
          reason_code: RC_SCHEMA_VALIDATION_FAILED,
          path,
          detail: `enum_membership: "${path}" value ${JSON.stringify(value)} not in ${JSON.stringify(constraint.allowed)}`,
        });
        return false;
      }
      return true;
    }

    case "version_present": {
      const { present, value } = getAtPath(input, path);
      if (!present || value === null || value === undefined) {
        failures.push({
          reason_code: RC_SCHEMA_VALIDATION_FAILED,
          path,
          detail: `version_present: "${path}" (expected version) is missing or null — anti-bypass groundwork for the optimistic-concurrency defect (envelope must always carry an expected version to check against)`,
        });
        return false;
      }
      return true;
    }

    case "custom_predicate": {
      const { value } = getAtPath(input, path);
      let ok: boolean;
      try {
        ok = constraint.predicate(value, input);
      } catch (err) {
        ok = false;
        failures.push({
          reason_code: RC_AUTH_SUBMISSION_CRITERIA_FAILED,
          path,
          detail: `custom_predicate "${constraint.name}" at "${path}" threw: ${err instanceof Error ? err.message : String(err)}`,
        });
        return false;
      }
      if (!ok) {
        failures.push({
          reason_code: RC_AUTH_SUBMISSION_CRITERIA_FAILED,
          path,
          detail: `custom_predicate "${constraint.name}" at "${path}" returned false`,
        });
        return false;
      }
      return true;
    }
  }
}

function isConstraintLeaf(node: KineticCriteriaNode): node is KineticConstraint {
  return "kind" in node;
}

/** Evaluates one criteria-tree node, appending every failure found (never short-circuits on first failure within a node). */
function evaluateNode(node: KineticCriteriaNode, input: Record<string, unknown>, failures: KineticCriteriaFailure[]): boolean {
  if (isConstraintLeaf(node)) {
    return evaluateConstraint(node, input, failures);
  }

  if ("all" in node) {
    let allPass = true;
    for (const child of node.all) {
      const childPass = evaluateNode(child, input, failures);
      allPass = allPass && childPass;
    }
    return allPass;
  }

  if ("any" in node) {
    // `any` still reports every child's failures (total-evaluation, all-failures
    // discipline) even though the node itself only fails if EVERY child fails.
    const childResults: boolean[] = [];
    const localFailures: KineticCriteriaFailure[] = [];
    for (const child of node.any) {
      childResults.push(evaluateNode(child, input, localFailures));
    }
    const anyPass = childResults.some((r) => r);
    if (!anyPass) {
      failures.push(...localFailures);
    }
    return anyPass;
  }

  // "none"
  const childResults: boolean[] = [];
  const localFailures: KineticCriteriaFailure[] = [];
  for (const child of node.none) {
    childResults.push(evaluateNode(child, input, localFailures));
  }
  const nonePass = childResults.every((r) => !r);
  if (!nonePass) {
    // At least one forbidden child passed — that IS the failure for "none";
    // the child's own (non-)failures are not the reportable finding here.
    const passedPaths = node.none
      .filter((_, i) => childResults[i])
      .map((child) => (isConstraintLeaf(child) ? child.path : "$"));
    for (const p of passedPaths) {
      failures.push({
        reason_code: RC_AUTH_SUBMISSION_CRITERIA_FAILED,
        path: p,
        detail: `none: a forbidden constraint at "${p}" unexpectedly passed`,
      });
    }
  }
  return nonePass;
}

/**
 * Evaluates `criteria` against `input`. Total: never throws on a missing
 * field (a missing field is reported as a failure finding). Reports ALL
 * failures found across the tree, never only the first.
 */
export function evaluateKineticCriteria(input: Record<string, unknown>, criteria: KineticCriteriaNode): KineticCriteriaResult {
  const failures: KineticCriteriaFailure[] = [];
  let pass: boolean;
  try {
    pass = evaluateNode(criteria, input ?? {}, failures);
  } catch (err) {
    // Defense in depth: evaluation must be total. Any unexpected throw
    // becomes a failure finding, never a propagated exception.
    pass = false;
    failures.push({
      reason_code: RC_AUTH_SUBMISSION_CRITERIA_FAILED,
      path: "$",
      detail: `unexpected evaluator error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
  return { pass: pass && failures.length === 0, failures };
}
