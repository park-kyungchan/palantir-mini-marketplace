import { describe, expect, test } from "bun:test";
import { deriveImplicitIntentPatch } from "../../../lib/fde-ontology-engineering/implicit-intent";

describe("latent hypothesis rules", () => {
  test("derive domain-aware PR #529 templates for education, MYP, runtime, action, student-facing, and Chatbot Studio prompts", () => {
    const cases = [
      {
        prompt: "학생이 어디서 막히는지 보고 싶다.",
        ruleId: "thinking-step-evidence-before-mastery",
        templateId: "latent-template:thinking-step-evidence-before-mastery",
        object: "ProblemSolvingMove",
        nonEffect: "will not grade the student",
      },
      {
        prompt: "AI가 좋은 설명을 만들게 하고 싶다. 판서 흐름도 포함한다.",
        ruleId: "explanation-label-before-generation",
        templateId: "latent-template:explanation-label-before-generation",
        object: "ExplanationMove",
        nonEffect: "will not publish student-facing material",
      },
      {
        prompt: "MYP objective criteria A-D guide를 참고하고 싶다.",
        ruleId: "MYP-objective-alignment-is-reference-not-SSoT",
        templateId: "latent-template:MYP-objective-alignment-is-reference-not-SSoT",
        object: "MYPObjective",
        nonEffect: "will not promote MYP docs to SSoT",
      },
      {
        prompt: "실생활 맥락을 가진 3D activity runtime scene으로 만들고 싶다.",
        ruleId: "real-life-context-before-3D-runtime",
        templateId: "latent-template:real-life-context-before-3D-runtime",
        object: "RealLifeContext",
        nonEffect: "will not implement a 3D runtime",
      },
      {
        prompt: "communication criterion을 정한 뒤 video output으로 만들고 싶다.",
        ruleId: "communication-criterion-before-video-output",
        templateId: "latent-template:communication-criterion-before-video-output",
        object: "CommunicationCriterion",
        nonEffect: "will not generate video",
      },
      {
        prompt: "student answer update writeback action에는 submission criteria 기준이 필요하다.",
        ruleId: "action-writeback-requires-submission-criteria",
        templateId: "latent-template:action-writeback-requires-submission-criteria",
        object: "SubmissionCriterion",
        nonEffect: "will not execute writeback",
      },
      {
        prompt: "학생에게 제공할 student-facing material output은 approval과 eval이 필요하다.",
        ruleId: "student-facing-output-requires-approval-and-eval",
        templateId: "latent-template:student-facing-output-requires-approval-and-eval",
        object: "StudentFacingOutput",
        nonEffect: "will not publish student-facing output",
      },
      {
        prompt: "Chatbot Studio에서 학생 상태 application state와 retrieval context에 맞게 안내하게 하고 싶다.",
        ruleId: "chatbot-studio.application-state-first",
        templateId: "latent-template:chatbot-studio.application-state-first",
        object: "ChatbotApplicationState",
        nonEffect: "will not publish chatbot behavior",
      },
    ] as const;

    for (const item of cases) {
      const patch = deriveImplicitIntentPatch({
        sanitizedTurnSummary: item.prompt,
        sourceRefs: [`evidence://${item.ruleId}`],
      });
      const hypothesis = patch.latentHypotheses.find((candidate) =>
        candidate.ruleId === item.ruleId
      );

      expect(hypothesis).toBeDefined();
      expect(hypothesis?.templateId).toBe(item.templateId);
      expect(hypothesis?.ontologyImplication.possibleObjects).toContain(item.object);
      expect(hypothesis?.whatUserMayNotHaveNoticed.length).toBeGreaterThan(20);
      expect(hypothesis?.whatWillNotHappenIfAccepted.join("\n")).toContain(item.nonEffect);
    }
  });

  test("derive deterministic rule matches for Korean education, MYP, runtime, materials, and generic prompts", () => {
    const cases = [
      {
        prompt: "한국 수학 수업에서 학생 설명 품질을 평가하고 싶다.",
        ruleId: "korean-education.instruction-quality",
        family: "instructional-explanation-quality",
        templateId: "latent-template:korean-education.instruction-quality",
      },
      {
        prompt: "MYP criterion rubric 자료는 reference로만 두고 싶다.",
        ruleId: "myp.curriculum-reference-boundary",
        family: "curriculum-reference-boundary",
        templateId: "latent-template:myp.curriculum-reference-boundary",
      },
      {
        prompt: "frontend workbench runtime card 상태를 보여줘.",
        ruleId: "frontend.runtime-surface",
        family: "technology-surface",
        templateId: "latent-template:frontend.runtime-surface",
      },
      {
        prompt: "3D canvas scene renderer surface는 review-only로 남겨야 한다.",
        ruleId: "runtime.3d-surface",
        family: "technology-surface",
        templateId: "latent-template:runtime.3d-surface",
      },
      {
        prompt: "source material document authority를 분류해줘.",
        ruleId: "materials.data-authority",
        family: "data-authority",
        templateId: "latent-template:materials.data-authority",
      },
      {
        prompt: "Prompt meaning and mission decision need clarification.",
        ruleId: "generic.prompt-mission-decision",
        family: "mission-decision",
        templateId: "latent-template:generic.prompt-mission-decision",
      },
    ] as const;

    for (const item of cases) {
      const patch = deriveImplicitIntentPatch({
        sanitizedTurnSummary: item.prompt,
        sourceRefs: [`evidence://${item.ruleId}`],
      });
      const hypothesis = patch.latentHypotheses.find((candidate) =>
        candidate.ruleId === item.ruleId && candidate.family === item.family
      );
      expect(hypothesis).toBeDefined();
      expect(hypothesis?.templateId).toBe(item.templateId);
      expect(hypothesis?.whyLeadInferredThis).not.toBe(
        "Derived from structured FDE ontology engineering signals.",
      );
      expect(hypothesis?.whatWillNotHappenIfAccepted.join("\n")).toContain("not");
    }
  });

  test("dedupes rule matches by family and rule id before fallback", () => {
    const patch = deriveImplicitIntentPatch({
      sanitizedTurnSummary: "MYP MYP criterion rubric curriculum reference",
      sourceRefs: ["evidence://myp"],
    });
    const ids = patch.latentHypotheses.map((hypothesis) =>
      `${hypothesis.family}:${hypothesis.ruleId}`
    );
    expect(ids.length).toBe(new Set(ids).size);
    expect(ids).toContain("curriculum-reference-boundary:myp.curriculum-reference-boundary");
    expect(ids.some((id) => id.includes("fallback.structured-signal"))).toBe(false);
  });

  test("Korean education template preserves non-developer teaching boundaries", () => {
    const patch = deriveImplicitIntentPatch({
      sanitizedTurnSummary: "한국 중학교 수업에서 학생 풀이 설명의 질을 보고 교사 피드백을 준비한다.",
      sourceRefs: ["evidence://student-work"],
    });
    const hypothesis = patch.latentHypotheses.find((candidate) =>
      candidate.ruleId === "korean-education.instruction-quality"
    );

    expect(hypothesis?.recommendedDefault).toContain("learner evidence");
    expect(hypothesis?.whatWillNotHappenIfAccepted).toContain(
      "Accepting this hypothesis will not replace teacher judgment.",
    );
    expect(hypothesis?.ontologyImplication.possibleFunctions).toContain("EvaluateExplanationQuality");
  });

  test("MYP/curriculum template keeps evidence reference-only until promoted", () => {
    const patch = deriveImplicitIntentPatch({
      sanitizedTurnSummary: "MYP criterion rubric curriculum guide는 not_promoted reference evidence로 남긴다.",
      sourceRefs: ["reference_only://myp-guide"],
    });
    const hypothesis = patch.latentHypotheses.find((candidate) =>
      candidate.ruleId === "myp.curriculum-reference-boundary"
    );

    expect(hypothesis?.recommendedDefault).toContain("reference_only/not_promoted");
    expect(hypothesis?.whatWillNotHappenIfAccepted).toContain(
      "Accepting this hypothesis will not promote MYP or curriculum docs to authority.",
    );
    expect(hypothesis?.readinessRequirementIds).toContain("evidence-classification");
  });

  test("UI and 3D runtime prompts produce review-only technology-surface defaults", () => {
    const patch = deriveImplicitIntentPatch({
      sanitizedTurnSummary: "UI 3D canvas runtime surface와 renderer validation을 카드에서 보여준다.",
      sourceRefs: ["evidence://runtime-screenshot"],
    });
    const ids = patch.latentHypotheses.map((hypothesis) => hypothesis.ruleId);
    const threeD = patch.latentHypotheses.find((hypothesis) =>
      hypothesis.ruleId === "runtime.3d-surface"
    );

    expect(ids).toContain("frontend.runtime-surface");
    expect(ids).toContain("runtime.3d-surface");
    expect(threeD?.templateId).toBe("latent-template:runtime.3d-surface");
    expect(threeD?.whatWillNotHappenIfAccepted).toContain(
      "Accepting this hypothesis will not add a renderer dependency.",
    );
  });
});
