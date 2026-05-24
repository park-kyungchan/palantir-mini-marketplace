import { describe, expect, test } from "bun:test";
import suiteDeclaration from "../../eval-suites/fde-turn-quality-semantic.json";
import { deriveLatentHypothesisRuleMatches } from "../../lib/fde-ontology-engineering/latent-hypothesis-rules";
import type {
  FDEImplicitIntentSignal,
} from "../../lib/fde-ontology-engineering/implicit-intent";
import type {
  LatentIntentHypothesis,
} from "../../lib/fde-ontology-engineering/types";

type ContextDomain = "DATA" | "LOGIC" | "ACTION" | "TECHNOLOGY" | "GOVERNANCE";

interface SemanticTurnMetrics {
  readonly has_relevant_latent_hypothesis: boolean;
  readonly has_what_user_may_not_have_noticed: boolean;
  readonly has_specific_recommended_default: boolean;
  readonly has_specific_what_will_not_happen: boolean;
  readonly maps_to_context_domains: boolean;
  readonly no_mutation_authority: boolean;
}

interface SemanticTurnEvalCase {
  readonly testCaseId: string;
  readonly signal: FDEImplicitIntentSignal;
  readonly expectedRuleId: string;
  readonly expectedObjects: readonly string[];
  readonly expectedDomains: readonly ContextDomain[];
  readonly expectedNonEffectTerms: readonly RegExp[];
  readonly noMutationAuthority: true;
}

interface SemanticTurnEvalResult {
  readonly passed: boolean;
  readonly hypothesis?: LatentIntentHypothesis;
  readonly metrics: SemanticTurnMetrics;
  readonly failedMetrics: readonly string[];
}

const CASES: readonly SemanticTurnEvalCase[] = [
  {
    testCaseId: "testcase:fde-semantic-thinking-step-evidence",
    signal: {
      sanitizedTurnSummary: "학생이 어디서 막히는지 보고 싶다",
      evidence: {
        evidenceDefinition: "학생의 풀이 과정과 reasoning evidence",
        observableSignals: ["observable student solving step"],
      },
      objectNames: ["ProblemSolvingMove", "ReasoningEvidence", "StudentMastery"],
    },
    expectedRuleId: "thinking-step-evidence-before-mastery",
    expectedObjects: ["ProblemSolvingMove", "ReasoningEvidence", "StudentMastery"],
    expectedDomains: ["DATA", "LOGIC", "GOVERNANCE"],
    expectedNonEffectTerms: [/grade/i, /student-facing|publish|published/i],
    noMutationAuthority: true,
  },
  {
    testCaseId: "testcase:fde-semantic-explanation-label-before-generation",
    signal: {
      sanitizedTurnSummary: "AI가 좋은 설명을 만들게 하고 싶다",
      evidence: {
        evidenceDefinition: "sample explanation and boardwork sequence",
        observableSignals: ["teacher intended learning point"],
      },
      objectNames: ["ExplanationMove", "BoardworkMove", "LabelSpec", "ValidationPack"],
    },
    expectedRuleId: "explanation-label-before-generation",
    expectedObjects: ["ExplanationMove", "BoardworkMove", "LabelSpec", "ValidationPack"],
    expectedDomains: ["DATA", "LOGIC", "GOVERNANCE"],
    expectedNonEffectTerms: [/student-facing|published/i, /video/i, /frontend|backend/i],
    noMutationAuthority: true,
  },
  {
    testCaseId: "testcase:fde-semantic-myp-reference-boundary",
    signal: {
      sanitizedTurnSummary: "MYP objective criteria A-D guide를 참고하고 싶다",
      evidence: {
        evidenceDefinition: "MYP guide reference_only/not_promoted curriculum evidence",
        sourceArtifactRefs: ["/home/palantirkc/docs/myp-guide.md"],
      },
      objectNames: ["CurriculumReference", "MYPObjective", "AssessmentCriterion"],
    },
    expectedRuleId: "MYP-objective-alignment-is-reference-not-SSoT",
    expectedObjects: ["CurriculumReference", "MYPObjective", "AssessmentCriterion"],
    expectedDomains: ["DATA", "LOGIC", "GOVERNANCE"],
    expectedNonEffectTerms: [/authority/i, /ontology/i],
    noMutationAuthority: true,
  },
  {
    testCaseId: "testcase:fde-semantic-3d-runtime-boundary",
    signal: {
      sanitizedTurnSummary: "실생활 맥락을 3D 활동으로 만들고 싶다",
      evidence: {
        evidenceDefinition: "real-life context definition and evidence capture surface",
        observableSignals: ["3D runtime validation"],
      },
      chatbotContextNames: ["RuntimeSurfaceContext"],
    },
    expectedRuleId: "real-life-context-before-3D-runtime",
    expectedObjects: ["RealLifeContext", "ActivityScenario", "Scene3D"],
    expectedDomains: ["DATA", "ACTION", "TECHNOLOGY", "GOVERNANCE"],
    expectedNonEffectTerms: [/3D runtime/i, /renderer/i],
    noMutationAuthority: true,
  },
  {
    testCaseId: "testcase:fde-semantic-student-facing-approval",
    signal: {
      sanitizedTurnSummary: "학생에게 제공할 자료로 만들고 싶다",
      evidence: {
        evidenceDefinition: "student-facing risk checklist and validation pack",
        observableSignals: ["human approval"],
      },
      actionNames: ["PublishStudentMaterial"],
    },
    expectedRuleId: "student-facing-output-requires-approval-and-eval",
    expectedObjects: ["StudentFacingOutput", "ApprovalRecord", "ValidationPack"],
    expectedDomains: ["ACTION", "GOVERNANCE"],
    expectedNonEffectTerms: [/publish/i, /approval/i],
    noMutationAuthority: true,
  },
  {
    testCaseId: "testcase:fde-semantic-chatbot-studio-application-state",
    signal: {
      sanitizedTurnSummary: "Chatbot Studio에서 학생 상태에 맞게 안내하게 하고 싶다",
      evidence: {
        evidenceDefinition: "Chatbot Studio application state and retrieval context",
        observableSignals: ["application state variable"],
      },
      chatbotContextNames: ["StudentStateApplicationContext", "RetrievalContext"],
    },
    expectedRuleId: "chatbot-studio.application-state-first",
    expectedObjects: ["ChatbotApplicationState", "RetrievalContext", "UserDecision"],
    expectedDomains: ["DATA", "TECHNOLOGY", "GOVERNANCE"],
    expectedNonEffectTerms: [/publish/i, /writeback/i],
    noMutationAuthority: true,
  },
];

function evaluateCase(evalCase: SemanticTurnEvalCase): SemanticTurnEvalResult {
  const hypotheses = deriveLatentHypothesisRuleMatches(evalCase.signal);
  const hypothesis = hypotheses.find((item) => item.ruleId === evalCase.expectedRuleId);
  const nonEffects = hypothesis?.whatWillNotHappenIfAccepted ?? [];
  const objectNames = hypothesis?.ontologyImplication.possibleObjects ?? [];
  const failedMetrics: string[] = [];
  const metrics: SemanticTurnMetrics = {
    has_relevant_latent_hypothesis:
      hypothesis !== undefined &&
      evalCase.expectedObjects.every((objectName) => objectNames.includes(objectName)),
    has_what_user_may_not_have_noticed:
      (hypothesis?.whatUserMayNotHaveNoticed.trim().length ?? 0) >= 40,
    has_specific_recommended_default:
      (hypothesis?.recommendedDefault.trim().length ?? 0) >= 40,
    has_specific_what_will_not_happen:
      nonEffects.length >= 2 &&
      evalCase.expectedNonEffectTerms.every((term) =>
        nonEffects.some((item) => term.test(item))
      ),
    maps_to_context_domains:
      evalCase.expectedDomains.length > 0 &&
      evalCase.expectedDomains.every((domain) =>
        ["DATA", "LOGIC", "ACTION", "TECHNOLOGY", "GOVERNANCE"].includes(domain)
      ),
    no_mutation_authority:
      evalCase.noMutationAuthority &&
      nonEffects.some((item) =>
        /No|not|will not|approval|DTC|DigitalTwinChangeContract/i.test(item)
      ),
  };

  for (const [metric, passed] of Object.entries(metrics)) {
    if (!passed) failedMetrics.push(metric);
  }

  return {
    passed: failedMetrics.length === 0,
    hypothesis,
    metrics,
    failedMetrics,
  };
}

describe("FDE Turn Quality Semantic eval suite", () => {
  test("suite declaration matches executable cases and metrics", () => {
    expect(CASES.map((item) => item.testCaseId)).toEqual(suiteDeclaration.suite.testCaseIds);
    expect(suiteDeclaration.suite.evaluatorPolicy.allowedDomains).toEqual([
      "DATA",
      "LOGIC",
      "ACTION",
      "TECHNOLOGY",
      "GOVERNANCE",
    ]);
    expect(suiteDeclaration.suite.evaluatorPolicy.requiredMetrics).toEqual([
      "has_relevant_latent_hypothesis",
      "has_what_user_may_not_have_noticed",
      "has_specific_recommended_default",
      "has_specific_what_will_not_happen",
      "maps_to_context_domains",
      "no_mutation_authority",
    ]);
  });

  test("semantic cases derive the expected latent hypothesis quality", () => {
    const results = CASES.map((evalCase) => ({
      evalCase,
      result: evaluateCase(evalCase),
    }));
    const failed = results.filter(({ result }) => !result.passed);
    if (failed.length > 0) {
      console.error(
        failed.map(({ evalCase, result }) =>
          `${evalCase.testCaseId}: ${result.failedMetrics.join(", ")}`
        ).join("\n"),
      );
    }

    expect(failed).toHaveLength(0);
    for (const { evalCase, result } of results) {
      expect(result.hypothesis?.ruleId).toBe(evalCase.expectedRuleId);
      expect(result.metrics).toEqual({
        has_relevant_latent_hypothesis: true,
        has_what_user_may_not_have_noticed: true,
        has_specific_recommended_default: true,
        has_specific_what_will_not_happen: true,
        maps_to_context_domains: true,
        no_mutation_authority: true,
      });
    }
  });
});
