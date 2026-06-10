import { describe, expect, test } from "bun:test";
import {
  approveSemanticIntentContract,
  isApprovedSemanticIntentContract,
  semanticIntentContractRefFromApproved,
} from "../../../lib/semantic-intent/approved-contract";
import { draftSemanticIntentContract } from "../../../lib/lead-intent/contracts";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";
import {
  advanceNineAxisSicSequence,
  NINE_AXIS_SIC_SEQUENCE,
  isNineAxisSicComplete,
} from "../../../lib/semantic-intent/nine-axis-sic-fill-sequence";
import type { SicWithFillFields } from "../../../lib/semantic-intent/sic-fill-types";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";

function semantic(overrides: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
    contractId: "semantic-intent:approved-shape",
    status: "approved",
    rawIntent: "Build context engineering plan",
    confirmedIntent: "Build context engineering plan from approved meaning.",
    nonGoals: [],
    approvedNouns: ["ContextEngineeringPlan"],
    approvedVerbs: ["build"],
    affectedSurfaces: ["lib/context-engineering/context-plan-builder.ts"],
    permissionsAndProposal: "plugin-local test",
    acceptedRisks: [],
    downstreamAllowed: ["draft DTC"],
    downstreamForbidden: ["unapproved writeback"],
    clarificationQuestions: [],
    approvalRef: "user:approved:context-plan",
    ...overrides,
  };
}

/** One non-empty user answer per nine-axis turn (T0 intent + 9 axes). */
const NINE_AXIS_ANSWERS = [
  "build a grading dashboard",
  "Student, Assignment, Grade",
  "weighted average per rubric",
  "publish final grades to students",
  "teacher approves before publish",
  "rubric.md, gradebook.csv",
  "every student has a final grade",
  "do not expose other students' grades",
  "teacher runs it, admin authorizes",
  "prior term's rubric decision",
] as const;

/**
 * Build a complete, USER-confirmed nine-axis SIC by driving the fill sequence
 * with `userInput` on every turn (each step's source === 'user').
 */
function completeUserConfirmedSic(): SemanticIntentContract {
  let contract: SemanticIntentContract = draftSemanticIntentContract({ intent: "nine-axis approve" });
  for (let turn = 0; turn < NINE_AXIS_ANSWERS.length; turn++) {
    contract = advanceNineAxisSicSequence(contract, turn, NINE_AXIS_ANSWERS[turn]) as SemanticIntentContract;
  }
  return contract;
}

describe("approved SemanticIntentContract shape", () => {
  test("requires status=approved, approvalRef, and contractId", () => {
    expect(isApprovedSemanticIntentContract(semantic())).toBe(true);
    expect(isApprovedSemanticIntentContract(semantic({ status: "draft" }))).toBe(false);
    expect(isApprovedSemanticIntentContract(semantic({ approvalRef: undefined }))).toBe(false);
    expect(isApprovedSemanticIntentContract(semantic({ contractId: "" }))).toBe(false);
  });

  test("uses contractId as the semanticIntentContractRef", () => {
    expect(semanticIntentContractRefFromApproved(semantic())).toBe(
      "semantic-intent:approved-shape",
    );
    expect(() => semanticIntentContractRefFromApproved(semantic({ approvalRef: undefined })))
      .toThrow(/contractId and approvalRef/);
  });
});

describe("approveSemanticIntentContract — Q2 user-confirmation write-path", () => {
  test("approves a complete, user-confirmed nine-axis SIC and the result is an approved contract", () => {
    const draft = completeUserConfirmedSic();
    expect(draft.status).toBe("draft");
    expect(isNineAxisSicComplete(draft)).toBe(true);

    const result = approveSemanticIntentContract(draft, { approverIdentity: "claude-code" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected approval to succeed");
    expect(result.contract.status).toBe("approved");
    expect(isApprovedSemanticIntentContract(result.contract)).toBe(true);
    expect(result.contract.contractId).toBe(draft.contractId);
    // The minted approvalRef is structured + semantic-intent surface.
    expect(typeof result.contract.approvalRef).toBe("object");
    // Input is not mutated (pure).
    expect(draft.status).toBe("draft");
  });

  test("refuses an incomplete nine-axis SIC (and the legacy validator also fails)", () => {
    // Only T0 + T1 answered → axes 2-9 still open → both regimes fail.
    let draft: SemanticIntentContract = draftSemanticIntentContract({ intent: "partial fill" });
    draft = advanceNineAxisSicSequence(draft, 0, NINE_AXIS_ANSWERS[0]) as SemanticIntentContract;
    draft = advanceNineAxisSicSequence(draft, 1, NINE_AXIS_ANSWERS[1]) as SemanticIntentContract;
    expect(isNineAxisSicComplete(draft)).toBe(false);

    const result = approveSemanticIntentContract(draft, { approverIdentity: "claude-code" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refusal");
    expect(result.reason).toMatch(/incomplete/i);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  test("Q2 gate refuses when an axis was filled by the AI alone, naming that axis", () => {
    // A complete fill, then mark the logic axis's step (turn 2 / step 3) as agent.
    const draft = completeUserConfirmedSic() as SicWithFillFields;
    const logicTurn = NINE_AXIS_SIC_SEQUENCE[2]!; // targetAxis === "logic"
    const withAgentStep: SemanticIntentContract = {
      ...(draft as SemanticIntentContract),
      fillSequence: (draft.fillSequence ?? []).map((step) =>
        step.step === logicTurn.step ? { ...step, source: "agent" as const } : step,
      ),
    } as SemanticIntentContract;

    const result = approveSemanticIntentContract(withAgentStep, { approverIdentity: "claude-code" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected Q2 refusal");
    expect(result.unconfirmedAxes).toContain("logic");
    // Bilingual plain-language message names the unconfirmed axis + the KO/EN cue.
    expect(result.reason).toContain("LOGIC");
    expect(result.reason).toMatch(/filled by the AI alone/i);
    expect(result.reason).toMatch(/사용자 확인/);
  });

  test("a system-sourced axis step is also unconfirmed (Q2 names it)", () => {
    // Drive every axis with user input, then append a system-sourced step that
    // re-fills the governance axis (turn 4 / step 5).
    const draft = completeUserConfirmedSic() as SicWithFillFields;
    const governanceTurn = NINE_AXIS_SIC_SEQUENCE[4]!; // targetAxis === "governance"
    const withSystemStep: SemanticIntentContract = {
      ...(draft as SemanticIntentContract),
      // Replace the governance step's source with 'system'.
      fillSequence: (draft.fillSequence ?? []).map((step) =>
        step.step === governanceTurn.step ? { ...step, source: "system" as const } : step,
      ),
    } as SemanticIntentContract;

    const result = approveSemanticIntentContract(withSystemStep, { approverIdentity: "claude-code" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected Q2 refusal");
    expect(result.unconfirmedAxes).toContain("governance");
    expect(result.reason).toContain("GOVERNANCE");
  });

  test("refuses when contractId is empty", () => {
    const draft = { ...completeUserConfirmedSic(), contractId: "" };
    const result = approveSemanticIntentContract(draft, { approverIdentity: "claude-code" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refusal");
    expect(result.issues.some((issue) => issue.field === "contractId")).toBe(true);
  });
});
