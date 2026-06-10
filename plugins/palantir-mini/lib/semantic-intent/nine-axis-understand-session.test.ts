import { describe, expect, it } from "bun:test";
import type { SemanticIntentContract } from "../lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
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
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
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

  it("no-draft axis card stays two-choice with 'answer' recommended (back-compat)", () => {
    const card = nineAxisTurnCard(1);
    expect(card.choices.length).toBe(2);
    expect(card.recommendedChoiceId).toBe("answer");
    expect(card.choices.map((c) => c.choiceId)).toEqual(["answer", "not-applicable"]);
    expect(card.choices[0]!.recommended).toBe(true);
  });

  it("no-draft intent card stays single-choice with 'answer' recommended (back-compat)", () => {
    const card = nineAxisTurnCard(0);
    expect(card.choices.length).toBe(1);
    expect(card.recommendedChoiceId).toBe("answer");
    expect(card.choices[0]!.choiceId).toBe("answer");
  });

  it("surfaces the generic worked example in the card body alongside whyItMatters", () => {
    const card = nineAxisTurnCard(1);
    expect(card.whyItMatters).toContain("좋은 답 예시");
    expect(card.whyItMatters).toContain("Example of a good answer");
  });

  it("renders a 3-choice card with confirm-draft first (recommended) when a draft is proposed", () => {
    const card = nineAxisTurnCard(1, {
      proposedDraft: {
        textKo: "회원, 책, 대출기록",
        textEn: "member, book, loan record",
        rationaleKo: "이름에서 추정",
        rationaleEn: "inferred from the title",
      },
    });
    expect(card.choices.length).toBe(3);
    expect(card.choices[0]!.choiceId).toBe("confirm-draft");
    expect(card.choices[0]!.recommended).toBe(true);
    expect(card.recommendedChoiceId).toBe("confirm-draft");
    // free-text 'answer' is demoted to a correct-it choice
    const answer = card.choices.find((c) => c.choiceId === "answer")!;
    expect(answer.recommended).toBe(false);
    // the draft text is shown in the confirm-draft consequence
    expect(card.choices[0]!.consequence).toContain("member, book, loan record");
    // 'not-applicable' is preserved
    expect(card.choices.some((c) => c.choiceId === "not-applicable")).toBe(true);
  });

  it("renders the proposed-draft rationale in the confirm-draft consequence when supplied, absent otherwise", () => {
    const withRationale = nineAxisTurnCard(1, {
      proposedDraft: {
        textKo: "회원, 책, 대출기록",
        textEn: "member, book, loan record",
        rationaleKo: "이름에서 추정",
        rationaleEn: "inferred from the title",
      },
    });
    const confirm = withRationale.choices.find((c) => c.choiceId === "confirm-draft")!;
    expect(confirm.consequence).toContain("제안 이유 / Why proposed");
    expect(confirm.consequence).toContain("이름에서 추정");
    expect(confirm.consequence).toContain("inferred from the title");

    const noRationale = nineAxisTurnCard(1, {
      proposedDraft: { textKo: "회원, 책, 대출기록", textEn: "member, book, loan record" },
    });
    const confirmNoRationale = noRationale.choices.find((c) => c.choiceId === "confirm-draft")!;
    expect(confirmNoRationale.consequence).not.toContain("제안 이유");
    expect(confirmNoRationale.consequence).not.toContain("Why proposed");
  });

  it("treats a draft with only empty text as no-draft (two-choice)", () => {
    const card = nineAxisTurnCard(1, { proposedDraft: { textKo: "", textEn: "" } });
    expect(card.choices.length).toBe(2);
    expect(card.recommendedChoiceId).toBe("answer");
  });

  it("N/A choice states it is the USER's explicit decision and renders the Lead-proposed reason", () => {
    const card = nineAxisTurnCard(4, {
      naReasonKo: "이 도서관은 승인 절차가 없음",
      naReasonEn: "this library has no approval step",
    });
    const na = card.choices.find((c) => c.choiceId === "not-applicable")!;
    expect(na.consequence).toContain("USER's explicit decision");
    expect(na.consequence).toContain("사용자가 명시적으로 선택한 결정");
    expect(na.consequence).toContain("this library has no approval step");
    expect(na.consequence).toContain("이 도서관은 승인 절차가 없음");
  });

  it("confirming a draft records the draft text as the answer with source 'user'", () => {
    let session = startNineAxisSession(makeBase());
    // T0 intent via confirmed draft
    session = answerCard(session, { confirmedDraftText: "도서관 대출 흐름을 만든다" });
    const contract = sessionContract(session);
    expect(contract.rawIntent).toBe("도서관 대출 흐름을 만든다");
    expect(contract.confirmedIntent).toBe("도서관 대출 흐름을 만든다");
    const step0 = contract.fillSequence![0]!;
    expect(step0.source).toBe("user");
    expect(step0.answer).toBe("도서관 대출 흐름을 만든다");

    // T1 data axis via confirmed draft
    session = answerCard(session, { confirmedDraftText: "회원, 책, 대출기록" });
    const c2 = sessionContract(session);
    expect(c2.axes!.data.status).toBe("filled");
    expect(c2.axes!.data.summary).toBe("회원, 책, 대출기록");
    expect(c2.fillSequence![1]!.source).toBe("user");
  });

  it("an explicit correction (text) overrides a confirmed draft", () => {
    let session = startNineAxisSession(makeBase());
    session = answerCard(session, {
      text: "사용자가 직접 고쳐 쓴 의도",
      confirmedDraftText: "제안된 초안",
    });
    const contract = sessionContract(session);
    expect(contract.rawIntent).toBe("사용자가 직접 고쳐 쓴 의도");
    expect(contract.fillSequence![0]!.source).toBe("user");
  });
});
