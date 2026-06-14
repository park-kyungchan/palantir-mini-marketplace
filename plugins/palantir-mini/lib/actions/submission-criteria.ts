/**
 * Submission criteria pre-flight evaluator
 * @owner palantirkc-plugin-actions
 * @purpose Submission criteria pre-flight evaluator
 */
// palantir-mini v0 — Submission criteria pre-flight evaluator
// Domain: LOGIC (prim-logic-07 SubmissionCriteria computational) +
//         SECURITY (prim-sec-02 SubmissionCriteria gate semantics)
//
// Implements the 9 Palantir constraint classes from action/mutations.md §ACTION.MU-14..17:
//   Range, ArraySize, StringLength, StringRegexMatch, OneOf,
//   ObjectQueryResult, ObjectPropertyValue, GroupMember, Unevaluable.
//
// Dual-modeled: LOGIC computation + SECURITY gate. LOGIC evaluates pass/fail;
// SECURITY uses the result to permit or deny the commit.

import type { OntologyEdit } from "../event-log/types";
// OE-6: bind the executable evaluator to the descriptive Action SSoT. This import
// closes the D6-8 split — `ontology/action/schema.ts` was imported by ZERO runtime
// files; the executable union below is now a PROJECTION of its canonical constraint
// vocabulary rather than a parallel re-derivation. `EXECUTABLE_CONSTRAINT_PROJECTION`
// maps each leaf class to its descriptive `SubmissionConstraintType`;
// `EXECUTABLE_CONDITION_CLASSES` carries the `currentUser`/`parameter` condition set.
import {
  EXECUTABLE_CONSTRAINT_PROJECTION,
  EXECUTABLE_CONDITION_CLASSES,
  type SubmissionConditionType,
} from "#schemas/ontology/action/schema";

export type SubmissionCriterion =
  | { type: "Range";               name: string; field: string; min?: number; max?: number }
  | { type: "ArraySize";            name: string; field: string; min?: number; max?: number }
  | { type: "StringLength";         name: string; field: string; min?: number; max?: number }
  | { type: "StringRegexMatch";     name: string; field: string; pattern: string }
  | { type: "OneOf";                name: string; field: string; options: string[] }
  | { type: "ObjectQueryResult";    name: string; query: string; minResults?: number; maxResults?: number }
  | { type: "ObjectPropertyValue";  name: string; field: string; expectedValue: unknown }
  | { type: "GroupMember";          name: string; group: string }
  | { type: "Unevaluable";          name: string; reason: string };

export interface CriterionResult {
  name:    string;
  type:    SubmissionCriterion["type"];
  passed:  boolean;
  reason?: string;
}

function getField(edit: OntologyEdit, field: string): unknown {
  if (edit.kind === "object") return (edit.properties as Record<string, unknown>)[field];
  return undefined;
}

/**
 * Evaluate a single criterion against the set of edits.
 * Returns a CriterionResult regardless of outcome (no throw).
 */
export function evaluateCriterion(
  edits: OntologyEdit[],
  criterion: SubmissionCriterion
): CriterionResult {
  try {
    switch (criterion.type) {
      case "Range": {
        for (const edit of edits) {
          const v = getField(edit, criterion.field);
          if (typeof v !== "number") continue;
          if (criterion.min !== undefined && v < criterion.min) return { name: criterion.name, type: criterion.type, passed: false, reason: `value ${v} < min ${criterion.min}` };
          if (criterion.max !== undefined && v > criterion.max) return { name: criterion.name, type: criterion.type, passed: false, reason: `value ${v} > max ${criterion.max}` };
        }
        return { name: criterion.name, type: criterion.type, passed: true };
      }
      case "ArraySize": {
        for (const edit of edits) {
          const v = getField(edit, criterion.field);
          if (!Array.isArray(v)) continue;
          if (criterion.min !== undefined && v.length < criterion.min) return { name: criterion.name, type: criterion.type, passed: false, reason: `array length ${v.length} < min ${criterion.min}` };
          if (criterion.max !== undefined && v.length > criterion.max) return { name: criterion.name, type: criterion.type, passed: false, reason: `array length ${v.length} > max ${criterion.max}` };
        }
        return { name: criterion.name, type: criterion.type, passed: true };
      }
      case "StringLength": {
        for (const edit of edits) {
          const v = getField(edit, criterion.field);
          if (typeof v !== "string") continue;
          if (criterion.min !== undefined && v.length < criterion.min) return { name: criterion.name, type: criterion.type, passed: false, reason: `string length ${v.length} < min ${criterion.min}` };
          if (criterion.max !== undefined && v.length > criterion.max) return { name: criterion.name, type: criterion.type, passed: false, reason: `string length ${v.length} > max ${criterion.max}` };
        }
        return { name: criterion.name, type: criterion.type, passed: true };
      }
      case "StringRegexMatch": {
        const re = new RegExp(criterion.pattern);
        for (const edit of edits) {
          const v = getField(edit, criterion.field);
          if (typeof v !== "string") continue;
          if (!re.test(v)) return { name: criterion.name, type: criterion.type, passed: false, reason: `"${v}" does not match /${criterion.pattern}/` };
        }
        return { name: criterion.name, type: criterion.type, passed: true };
      }
      case "OneOf": {
        for (const edit of edits) {
          const v = getField(edit, criterion.field);
          if (v === undefined) continue;
          if (!criterion.options.includes(String(v))) return { name: criterion.name, type: criterion.type, passed: false, reason: `"${String(v)}" not in [${criterion.options.join(",")}]` };
        }
        return { name: criterion.name, type: criterion.type, passed: true };
      }
      case "ObjectPropertyValue": {
        for (const edit of edits) {
          const v = getField(edit, criterion.field);
          if (v !== criterion.expectedValue) return { name: criterion.name, type: criterion.type, passed: false, reason: `expected ${String(criterion.expectedValue)}, got ${String(v)}` };
        }
        return { name: criterion.name, type: criterion.type, passed: true };
      }
      case "ObjectQueryResult": {
        // v0: query runner not yet wired — fail CLOSED (cannot evaluate ⇒ clarification-required, never a silent pass)
        return { name: criterion.name, type: criterion.type, passed: false, reason: "clarification-required: ObjectQueryResult cannot be evaluated (no query runner in v0)" };
      }
      case "GroupMember": {
        // v0: no identity/group system — fail CLOSED (cannot evaluate ⇒ clarification-required, never a silent pass)
        return { name: criterion.name, type: criterion.type, passed: false, reason: "clarification-required: GroupMember cannot be evaluated (no identity system in v0)" };
      }
      case "Unevaluable": {
        return { name: criterion.name, type: criterion.type, passed: false, reason: `Unevaluable: ${criterion.reason}` };
      }
      default: {
        const _exhaustive: never = criterion;
        void _exhaustive;
        return { name: "unknown", type: "Unevaluable" as const, passed: false, reason: "unknown criterion type" };
      }
    }
  } catch (e) {
    return { name: criterion.name, type: criterion.type, passed: false, reason: `criterion threw: ${(e as Error).message}` };
  }
}

/**
 * Evaluate all criteria against the edits. Returns all results and an overall verdict.
 * allPassed is true only if every criterion returned passed:true.
 */
export function evaluateCriteria(
  edits: OntologyEdit[],
  criteria: SubmissionCriterion[]
): { allPassed: boolean; results: CriterionResult[]; passedNames: string[]; failedNames: string[] } {
  const results = criteria.map((c) => evaluateCriterion(edits, c));
  const passedNames = results.filter((r) => r.passed).map((r) => r.name);
  const failedNames = results.filter((r) => !r.passed).map((r) => r.name);
  return { allPassed: failedNames.length === 0, results, passedNames, failedNames };
}

// ===========================================================================
// OE-6 — nestable all/any/none criteria tree + Current-User condition class
// ===========================================================================
//
// The 9-member `SubmissionCriterion` union above is the LEAF vocabulary — kept
// byte-stable (the self-Ontology drift guard parses it). The descriptive Action
// SSoT (`ontology/action/schema.ts` §8) also models a CONDITION dimension
// (`currentUser` | `parameter`) and a nestable boolean composition the flat
// `evaluateCriteria` could not express. OE-6 binds both here as a PROJECTION of
// that SSoT (see the import block), so the executable model mirrors Foundry's
// Validate-Action structure (all/any/none groups over leaf constraints +
// Current-User identity conditions) instead of a parallel re-derivation.
//
// FAIL-CLOSED (rebased on OE-7's default): any node that CANNOT be evaluated —
// an unwired `CurrentUserCondition`, an `Unevaluable` leaf, or the two stubbed
// identity/query leaves — yields `passed:false` + `clarification-required`. A
// group's verdict is the boolean fold of its children; an empty `all` passes
// (vacuous truth) but an empty `any` FAILS closed (no satisfied alternative).

/**
 * The Current-User condition class (descriptive `SubmissionConditionType:"currentUser"`).
 * Gates submission on the INVOKING actor's identity / group membership. There is
 * no identity system wired in v0, so it ALWAYS fails closed (clarification-required)
 * until one exists — never a silent grant. `requiredGroup`/`requiredUser` record the
 * intended gate so the obligation is explicit in the result reason.
 */
export interface CurrentUserCondition {
  readonly conditionType: "currentUser";
  name: string;
  requiredGroup?: string;
  requiredUser?: string;
}

/** A leaf node in the criteria tree — a constraint criterion OR a Current-User condition. */
export type SubmissionCriteriaLeaf = SubmissionCriterion | CurrentUserCondition;

/**
 * A nestable submission-criteria tree mirroring Foundry's all/any/none composition
 * over leaf constraints + conditions. `all` = every child must pass (AND); `any` =
 * at least one child must pass (OR); `none` = no child may pass (NOR).
 */
export type SubmissionCriteriaTree =
  | { kind: "leaf"; leaf: SubmissionCriteriaLeaf }
  | { kind: "all";  children: SubmissionCriteriaTree[] }
  | { kind: "any";  children: SubmissionCriteriaTree[] }
  | { kind: "none"; children: SubmissionCriteriaTree[] };

/** Result of evaluating a criteria tree — overall verdict + a flat trace of every leaf. */
export interface CriteriaTreeResult {
  passed: boolean;
  /** The boolean combinator chain that produced the verdict, e.g. "all(any(...), leaf)". */
  shape: string;
  /** Every leaf result encountered, in evaluation order. */
  leafResults: CriterionResult[];
  reason?: string;
}

function isCurrentUserCondition(leaf: SubmissionCriteriaLeaf): leaf is CurrentUserCondition {
  return (leaf as CurrentUserCondition).conditionType === "currentUser";
}

/**
 * Evaluate a single leaf. A constraint criterion delegates to `evaluateCriterion`;
 * a Current-User condition fails CLOSED (no identity system in v0). Projects the
 * descriptive `SubmissionConditionType` so the bind to the SSoT is exercised at
 * runtime (an unknown condition class is impossible — the union is closed).
 */
function evaluateLeaf(edits: OntologyEdit[], leaf: SubmissionCriteriaLeaf): CriterionResult {
  if (isCurrentUserCondition(leaf)) {
    const cls: SubmissionConditionType =
      EXECUTABLE_CONDITION_CLASSES.find((c) => c === "currentUser") ?? "currentUser";
    const target = leaf.requiredGroup
      ? `group "${leaf.requiredGroup}"`
      : leaf.requiredUser
        ? `user "${leaf.requiredUser}"`
        : "the invoking actor";
    return {
      name: leaf.name,
      type: "Unevaluable" as const,
      passed: false,
      reason: `clarification-required: ${cls} condition (${target}) cannot be evaluated (no identity system in v0)`,
    };
  }
  // Touch the projection so the SSoT bind is load-bearing: every leaf maps to a
  // canonical descriptive constraint type (a leaf missing from the crosswalk would
  // surface here rather than silently passing).
  void EXECUTABLE_CONSTRAINT_PROJECTION[leaf.type as keyof typeof EXECUTABLE_CONSTRAINT_PROJECTION];
  return evaluateCriterion(edits, leaf);
}

/**
 * Evaluate a nestable all/any/none criteria tree against the edits. Fail-closed:
 * any unevaluable leaf is a fail; an empty `any` fails closed (no satisfied
 * alternative); `none` passes only when every child fails. Returns the overall
 * verdict plus the flat leaf trace.
 */
export function evaluateCriteriaTree(
  edits: OntologyEdit[],
  tree: SubmissionCriteriaTree,
): CriteriaTreeResult {
  const leafResults: CriterionResult[] = [];

  function walk(node: SubmissionCriteriaTree): { passed: boolean; shape: string } {
    switch (node.kind) {
      case "leaf": {
        const r = evaluateLeaf(edits, node.leaf);
        leafResults.push(r);
        return { passed: r.passed, shape: r.name };
      }
      case "all": {
        const parts = node.children.map(walk);
        // empty all = vacuous truth (no constraint to violate)
        return { passed: parts.every((p) => p.passed), shape: `all(${parts.map((p) => p.shape).join(", ")})` };
      }
      case "any": {
        const parts = node.children.map(walk);
        // empty any FAILS closed — no satisfied alternative
        return { passed: parts.length > 0 && parts.some((p) => p.passed), shape: `any(${parts.map((p) => p.shape).join(", ")})` };
      }
      case "none": {
        const parts = node.children.map(walk);
        return { passed: parts.every((p) => !p.passed), shape: `none(${parts.map((p) => p.shape).join(", ")})` };
      }
      default: {
        const _exhaustive: never = node;
        void _exhaustive;
        return { passed: false, shape: "unknown" };
      }
    }
  }

  const { passed, shape } = walk(tree);
  const failed = leafResults.filter((r) => !r.passed);
  return {
    passed,
    shape,
    leafResults,
    reason: passed ? undefined : `${failed.length} leaf criterion(s) failed: ${failed.map((r) => r.name).join(", ") || "empty any-group"}`,
  };
}
