import { describe, expect, it } from "bun:test";
import type { SemanticIntentContract } from "../lead-intent/contracts";
import {
  answerCard,
  isSessionComplete,
  nextCard,
  nineAxisTurnCard,
  sessionContract,
  startNineAxisSession,
} from "./nine-axis-understand-session";

function makeBase(overrides: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    contractId: "semantic-intent:test-nine-axis",
    status: "draft",
    rawIntent: "",
    confirmedIntent: "",
    nonGoals: [],
    approvedNouns: [],
    approvedVerbs: [],
    affectedSurfaces: [],
    permissionsAndProposal: "",
    acceptedRisks: [],
    downstreamAllowed: [],
    downstreamForbidden: [],
    clarificationQuestions: [],
    ...overrides,
  };
}

describe("nine-axis understand session", () => {
  it("drives all 10 turns, marks governance N/A, and completes", () => {
    let session = startNineAxisSession(makeBase());

    while (nextCard(session) !== null) {
      const card = nextCard(session)!;
      if (card.decisionId.endsWith(":governance")) {
        session = answerCard(session, { notApplicable: true });
      } else if (card.decisionId.endsWith(":data")) {
        // Use a value with refs so extractRefs picks them up
        session = answerCard(session, { text: "obj-a, src/foo.ts" });
      } else {
        session = answerCard(session, { text: "x" });
      }
    }

    expect(isSessionComplete(session)).toBe(true);
    expect(nextCard(session)).toBeNull();

    const contract = sessionContract(session);
    expect(contract.axes!.governance.status).toBe("not-applicable");
    expect(contract.axes!.data.status).toBe("filled");
  });

  it("nineAxisTurnCard(1) has expected shape", () => {
    const card = nineAxisTurnCard(1);
    expect(card.plainKoreanTitle.length).toBeGreaterThan(0);
    expect(card.plainKoreanSummary.length).toBeGreaterThan(0);
    expect(card.freeTextAllowed).toBe(true);
    // T1 is an axis turn (data), so it should have answer + not-applicable choices
    expect(card.choices.length).toBe(2);
  });
});
