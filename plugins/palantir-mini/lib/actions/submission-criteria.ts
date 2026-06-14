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
