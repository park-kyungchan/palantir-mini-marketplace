import { describe, expect, test } from "bun:test";
import { bindSuccessEvalToActionCriteria } from "../../../lib/context-engineering/success-eval-action-binding";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";
import type {
  SemanticIntentAxes,
  SicAxis,
  SicAxisFacet,
} from "#schemas/ontology/primitives/semantic-intent-contract";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";

function axis(summary: string, refs: readonly string[] = [], facet?: SicAxisFacet): SicAxis {
  return {
    summary,
    refs,
    status: summary.trim().length > 0 ? "filled" : "open",
    ...(facet ? { facet } : {}),
  };
}

function actionWritebackFacet(
  name: string,
  submissionCriteria: readonly string[],
): SicAxisFacet {
  return {
    kind: "action-writeback",
    actions: [{ name, writebackRisk: "high", submissionCriteria: [...submissionCriteria], refs: [] }],
  };
}

function axes(over: Partial<SemanticIntentAxes> = {}): SemanticIntentAxes {
  return {
    data: axis(""),
    logic: axis(""),
    action: axis(""),
    governance: axis(""),
    context: axis(""),
    successEval: axis(""),
    constraintsNonGoals: axis(""),
    actors: axis(""),
    memoryPrior: axis(""),
    ...over,
  };
}

function sic(over: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
    contractId: "semantic-intent:oe8-binding",
    status: "approved",
    rawIntent: "raw",
    confirmedIntent: "confirmed",
    nonGoals: [],
    approvedNouns: [],
    approvedVerbs: [],
    affectedSurfaces: [],
    permissionsAndProposal: "plugin-local",
    acceptedRisks: [],
    downstreamAllowed: [],
    downstreamForbidden: [],
    clarificationQuestions: [],
    ...over,
  };
}

/** The SUCCESS-EVAL axis bound to the finalizeScore action's two criteria (DP-3 shape). */
const BOUND_SUCCESS_EVAL = axis(
  "Success signals: every submission scored exactly once; "
  + "Per-action submission criteria: submission-criteria://finalizeScore/0, submission-criteria://finalizeScore/1",
  ["submission-criteria://finalizeScore/0", "submission-criteria://finalizeScore/1"],
);

const FINALIZE_ACTION = axis(
  "Write-back actions: finalizeScore",
  [],
  actionWritebackFacet("finalizeScore", ["all rubric items graded", "teacher approval"]),
);

describe("bindSuccessEvalToActionCriteria (OE-8)", () => {
  test("bound: action criteria reach requiredEvaluationRefs as typed ValidationPack refs; no violation", () => {
    const result = bindSuccessEvalToActionCriteria(
      sic({ axes: axes({ action: FINALIZE_ACTION, successEval: BOUND_SUCCESS_EVAL }) }),
    );

    expect(result.violations).toEqual([]);
    const rids = result.requiredEvaluationRefs.map((ref) => ref.rid);
    // The two bound action criteria are enforced as gate-facing ValidationPack refs.
    expect(rids).toEqual([
      "submission-criteria://finalizeScore/0",
      "submission-criteria://finalizeScore/1",
    ]);
    // Every ref is a typed ValidationPack ref.
    expect(result.requiredEvaluationRefs.every((ref) => ref.kind === "ValidationPack")).toBe(true);
  });

  test("omit: a SUCCESS-EVAL that drops one action criterion is FLAGGED (fail-closed)", () => {
    const partialSuccessEval = axis(
      "Success signals: every submission scored exactly once; "
      + "Per-action submission criteria: submission-criteria://finalizeScore/0",
      ["submission-criteria://finalizeScore/0"], // /1 omitted
    );
    const result = bindSuccessEvalToActionCriteria(
      sic({ axes: axes({ action: FINALIZE_ACTION, successEval: partialSuccessEval }) }),
    );

    expect(result.violations.length).toBe(1);
    expect(result.violations[0]!.kind).toBe("omits-action-criteria");
    expect(result.violations[0]!.ref).toBe("submission-criteria://finalizeScore/1");
    // The bound criterion that IS present still routes through.
    expect(result.requiredEvaluationRefs.map((ref) => ref.rid)).toContain(
      "submission-criteria://finalizeScore/0",
    );
  });

  test("contradict (empty SUCCESS-EVAL, ACTION declares criteria) is FLAGGED fail-closed", () => {
    const noBindingSuccessEval = axis(
      "Success signals: every submission scored exactly once",
      [], // no submission-criteria binding at all
    );
    const result = bindSuccessEvalToActionCriteria(
      sic({ axes: axes({ action: FINALIZE_ACTION, successEval: noBindingSuccessEval }) }),
    );

    expect(result.violations.length).toBe(1);
    expect(result.violations[0]!.kind).toBe("success-eval-empty-with-action-criteria");
  });

  test("Q5-preserving: a SIC with no axes / no successEval signal / no action criteria yields no refs, no violations", () => {
    const result = bindSuccessEvalToActionCriteria(sic());
    expect(result.requiredEvaluationRefs).toEqual([]);
    expect(result.violations).toEqual([]);
  });

  test("no action criteria + empty successEval ⇒ nothing to bind, no violation", () => {
    const result = bindSuccessEvalToActionCriteria(sic({ axes: axes() }));
    expect(result.requiredEvaluationRefs).toEqual([]);
    expect(result.violations).toEqual([]);
  });
});
