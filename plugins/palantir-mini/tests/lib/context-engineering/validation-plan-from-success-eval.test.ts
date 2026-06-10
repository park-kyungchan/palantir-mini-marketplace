import { describe, expect, test } from "bun:test";
import {
  deriveValidationPlan,
  FALLBACK_VALIDATION_PLAN,
} from "../../../lib/context-engineering/validation-plan-from-success-eval";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";
import type { SemanticIntentAxes, SicAxis } from "#schemas/ontology/primitives/semantic-intent-contract";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";

function axis(summary: string, refs: readonly string[] = []): SicAxis {
  return {
    summary,
    refs,
    status: summary.trim().length > 0 ? "filled" : "open",
  };
}

function axes(successEvalSummary: string): SemanticIntentAxes {
  return {
    data: axis(""),
    logic: axis(""),
    action: axis(""),
    governance: axis(""),
    context: axis(""),
    successEval: axis(successEvalSummary),
    constraintsNonGoals: axis(""),
    actors: axis(""),
    memoryPrior: axis(""),
  };
}

function sic(over: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
    contractId: "semantic-intent:validation-plan",
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

describe("deriveValidationPlan", () => {
  test("returns the fallback plan when the SIC has no axes (legacy SIC)", () => {
    const plan = deriveValidationPlan(sic());
    expect(plan).toBe(FALLBACK_VALIDATION_PLAN);
    expect(plan.map((item) => item.validationId)).toEqual([
      "fde-readiness-profile",
      "context-plan-v2",
      "workbench-review",
    ]);
  });

  test("returns the fallback plan when successEval is empty/open", () => {
    const plan = deriveValidationPlan(sic({ axes: axes("") }));
    expect(plan).toBe(FALLBACK_VALIDATION_PLAN);
  });

  test("derives one item per success signal, prefix stripped", () => {
    const plan = deriveValidationPlan(
      sic({ axes: axes("Success signals: user can approve the plan, no unapproved writeback occurs, eval passes") }),
    );
    expect(plan).toHaveLength(3);
    expect(plan.map((item) => item.reason)).toEqual([
      "user can approve the plan",
      "no unapproved writeback occurs",
      "eval passes",
    ]);
  });

  test("reason is the signal verbatim and command is the propose placeholder", () => {
    const plan = deriveValidationPlan(
      sic({ axes: axes("Success signals: Eval Passes") }),
    );
    expect(plan).toHaveLength(1);
    const item = plan[0]!;
    expect(item.reason).toBe("Eval Passes");
    expect(item.validationId).toBe("eval-passes");
    expect(item.command).toBe("propose: eval-passes");
    expect(item.required).toBe(true);
    // Never fabricate a concrete bun-test path.
    expect(item.command.startsWith("propose: ")).toBe(true);
    expect(item.command).not.toContain("bun test");
  });

  test("works without the 'Success signals:' prefix (raw comma list)", () => {
    const plan = deriveValidationPlan(sic({ axes: axes("a, b") }));
    expect(plan.map((item) => item.reason)).toEqual(["a", "b"]);
  });

  test("de-duplicates colliding slugs", () => {
    const plan = deriveValidationPlan(sic({ axes: axes("Success signals: works!, works?") }));
    expect(plan.map((item) => item.validationId)).toEqual(["works", "works-2"]);
  });

  test("an accepted custom fallback is returned when no signals", () => {
    const custom = [
      { validationId: "custom", command: "propose: custom", required: true, reason: "custom" },
    ] as const;
    expect(deriveValidationPlan(sic(), custom)).toBe(custom);
  });
});
