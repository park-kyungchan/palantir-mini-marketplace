import { describe, expect, test } from "bun:test";
import {
  approveTechnologyRecommendation,
  buildTechnologyApprovalCard,
  isApprovedTechnologyRecommendation,
} from "../../../lib/semantic-intent/approve-technology-recommendation";
import {
  buildConvexOnlyTechnologyRecommendation,
  type TechnologyRecommendation,
} from "../../../lib/context-engineering/context-plan-builder";
import {
  isStructuredApprovalRef,
  validateApprovalRefValue,
} from "../../../lib/prompt-front-door/approval-ref";

function recommendation(
  overrides: Partial<TechnologyRecommendation> = {},
): TechnologyRecommendation {
  return { ...buildConvexOnlyTechnologyRecommendation("context-plan:test"), ...overrides };
}

describe("approveTechnologyRecommendation", () => {
  test("approves a proposed recommendation and mints a valid StructuredApprovalRef", () => {
    const rec = recommendation();
    const result = approveTechnologyRecommendation(rec, {
      approverIdentity: "claude-code",
      capturedAt: "2026-06-10T00:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ref = result.recommendation.approvalRef;
    expect(isStructuredApprovalRef(ref)).toBe(true);
    expect(validateApprovalRefValue("approvalRef", ref)).toEqual([]);
    if (isStructuredApprovalRef(ref)) {
      expect(ref.approvalSurface).toBe("technology-recommendation");
      expect(ref.runtime).toBe("claude");
      expect(ref.promptId).toBe(rec.recommendationId);
      expect(ref.approvedAt).toBe("2026-06-10T00:00:00.000Z");
    }
    // The approved recommendation is the input rec + an attached approvalRef.
    expect(result.recommendation.policy).toBe(rec.policy);
    expect(result.recommendation.recommendationId).toBe(rec.recommendationId);
    expect(isApprovedTechnologyRecommendation(result.recommendation)).toBe(true);
  });

  test("does not mutate the input recommendation (pure)", () => {
    const rec = recommendation();
    approveTechnologyRecommendation(rec, { approverIdentity: "codex" });
    expect("approvalRef" in rec).toBe(false);
    expect(isApprovedTechnologyRecommendation(rec)).toBe(false);
  });

  test("identity is env-driven — the approval runtime is never a literal 'claude-code'", () => {
    const approvedAsCodex = approveTechnologyRecommendation(recommendation(), {
      approverIdentity: "codex",
    });
    const approvedAsUnknown = approveTechnologyRecommendation(recommendation(), {
      approverIdentity: "some-future-runtime",
    });

    expect(approvedAsCodex.ok).toBe(true);
    expect(approvedAsUnknown.ok).toBe(true);
    if (approvedAsCodex.ok && isStructuredApprovalRef(approvedAsCodex.recommendation.approvalRef)) {
      expect(approvedAsCodex.recommendation.approvalRef.runtime).toBe("codex");
    }
    // An unrecognized identity maps to 'unknown', never silently to 'claude'.
    if (approvedAsUnknown.ok && isStructuredApprovalRef(approvedAsUnknown.recommendation.approvalRef)) {
      expect(approvedAsUnknown.recommendation.approvalRef.runtime).toBe("unknown");
    }
  });

  test("refuses with a typed result when recommendationId is missing", () => {
    const result = approveTechnologyRecommendation(
      recommendation({ recommendationId: "" }),
      { approverIdentity: "claude-code" },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual([
      { field: "recommendationId", message: "recommendationId is required" },
    ]);
    expect(result.reason).toContain("recommendationId");
  });

  test("refuses when recommendationId is blank whitespace", () => {
    const result = approveTechnologyRecommendation(
      recommendation({ recommendationId: "   " }),
      { approverIdentity: "claude-code" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.field).toBe("recommendationId");
    }
  });
});

describe("buildTechnologyApprovalCard", () => {
  test("emits a confirm-draft-recommended, bilingual TurnCardDecisionSpec", () => {
    const card = buildTechnologyApprovalCard(recommendation());

    expect(card.recommendedChoiceId).toBe("confirm-draft");
    expect(card.phase).toBe("TECHNOLOGY");
    expect(card.blocking).toBe(false);
    expect(card.freeTextAllowed).toBe(true);

    const choiceIds = card.choices.map((choice) => choice.choiceId);
    expect(choiceIds).toEqual(["confirm-draft", "answer"]);

    const confirmDraft = card.choices.find((choice) => choice.choiceId === "confirm-draft");
    const answer = card.choices.find((choice) => choice.choiceId === "answer");
    expect(confirmDraft?.recommended).toBe(true);
    expect(answer?.recommended).toBe(false);

    // Bilingual KO / EN on the title, summary, and why.
    expect(card.plainKoreanTitle).toContain("승인");
    expect(card.plainKoreanSummary).toContain("Approve");
    expect(card.whyItMatters).toContain("/");
  });

  test("renders the optional proposal note bilingually on the confirm-draft choice", () => {
    const card = buildTechnologyApprovalCard(recommendation(), {
      proposalNoteKo: "미러 전용이라 권한을 침해하지 않습니다",
      proposalNoteEn: "mirror-only, so it cannot violate authority",
    });
    const confirmDraft = card.choices.find((choice) => choice.choiceId === "confirm-draft");
    expect(confirmDraft?.consequence).toContain("미러 전용");
    expect(confirmDraft?.consequence).toContain("mirror-only");
  });
});
