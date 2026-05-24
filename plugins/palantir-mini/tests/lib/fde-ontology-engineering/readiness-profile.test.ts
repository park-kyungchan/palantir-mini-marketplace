import { describe, expect, test } from "bun:test";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";
import { gradeFDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/grade-session";

function session(overrides: Partial<FDEOntologyEngineeringSession> = {}): FDEOntologyEngineeringSession {
  return {
    schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
    sessionId: "fde-session:readiness",
    projectRoot: "/tmp/fde-readiness",
    universalOntologyEntryRef: "universal-ontology-entry://readiness",
    phase: "function-logic-discovery",
    turnCount: 1,
    userFacingSummary: "Design ontology framework.",
    confirmedUserGoal: "Decide which ontology framework is needed.",
    confirmedNonGoals: ["Do not promote reference evidence without approval."],
    latentHypotheses: [
      {
        hypothesisId: "latent-rule:generic.prompt-mission-decision:framework",
        ruleId: "generic.prompt-mission-decision",
        status: "accepted",
        family: "mission-decision",
        readinessRequirementIds: ["mission", "latent-intent-decision"],
        plainLanguage: "Confirm framework mission decision.",
        whyLeadInferredThis: "Prompt asks for framework selection.",
        whatUserMayNotHaveNoticed: "A mission decision is required.",
        recommendedDefault: "Accept mission decision.",
        riskIfWrong: "Wrong mission.",
        whatWillNotHappenIfAccepted: ["No mutation authority."],
        ontologyImplication: {
          possibleObjects: ["Framework"],
          possibleLinks: [],
          possibleActions: [],
          possibleFunctions: [],
        },
        evidenceNeeded: ["evidence://framework"],
        sourceRefs: ["evidence://framework"],
      },
    ],
    acceptedHypothesisIds: ["latent-rule:generic.prompt-mission-decision:framework"],
    rejectedHypothesisIds: [],
    deferredHypothesisIds: [],
    missionModel: {
      operationalDecision: "Decide which ontology framework is needed.",
      decisionOwnerRole: "Lead",
      successSignals: ["SIC can be drafted"],
    },
    evidenceModel: {
      evidenceDefinition: "Source evidence for ontology framework.",
      observableSignals: ["framework named"],
      sourceArtifactRefs: ["evidence://framework"],
      missingEvidenceQuestions: [],
    },
    objectCandidates: [
      { candidateId: "object:framework", plainName: "Framework", whyItMayMatter: "", evidenceRefs: [] },
    ],
    linkCandidates: [
      { candidateId: "link:framework-surface", plainName: "FrameworkSurface", businessMeaning: "", evidenceRefs: [] },
    ],
    actionCandidates: [],
    functionCandidates: [
      { candidateId: "function:select", plainName: "SelectFramework", logicIntent: "", evidenceRefs: [] },
    ],
    chatbotContextCandidates: [],
    unresolvedQuestions: [],
    sourceRefs: ["evidence://framework"],
    recentTurnSummaries: [],
    turnRecordIds: ["turn-1"],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("FDE readiness profiles", () => {
  test("framework-discovery can become SIC-ready without chatbot candidates", () => {
    const grade = gradeFDEOntologyEngineeringSession(session(), {
      readinessProfile: "framework-discovery",
    });
    expect(grade.verdict).toBe("ready-for-semantic-contract");
    expect(grade.readinessProfile?.readyForSemanticIntent).toBe(true);
    expect(grade.missing).toEqual([]);
  });

  test("framework-discovery blocks on v2 latent decision, non-goals, and evidence classification", () => {
    const grade = gradeFDEOntologyEngineeringSession(session({
      confirmedNonGoals: [],
      latentHypotheses: [],
      acceptedHypothesisIds: [],
      evidenceModel: {
        evidenceDefinition: "Source evidence for ontology framework.",
        observableSignals: ["framework named"],
        sourceArtifactRefs: [],
        missingEvidenceQuestions: [],
      },
      sourceRefs: [],
    }), {
      readinessProfile: "framework-discovery",
    });

    expect(grade.verdict).toBe("continue-turns");
    expect(grade.missing).toContain("latent intent decision");
    expect(grade.missing).toContain("non-goals");
    expect(grade.missing).toContain("evidence classification");
  });

  test("chatbot-studio-design cannot become ready without chatbot context/application state", () => {
    const grade = gradeFDEOntologyEngineeringSession(session(), {
      readinessProfile: "chatbot-studio-design",
    });
    expect(grade.verdict).toBe("continue-turns");
    expect(grade.missing).toContain("chatbot context candidates");
    expect(grade.missing).toContain("chatbot application state");
  });

  test("action-writeback-design requires action candidates and submission criteria", () => {
    const missingAction = gradeFDEOntologyEngineeringSession(session(), {
      readinessProfile: "action-writeback-design",
    });
    expect(missingAction.verdict).toBe("continue-turns");
    expect(missingAction.missing).toContain("action candidates");

    const ready = gradeFDEOntologyEngineeringSession(session({
      actionCandidates: [
        {
          candidateId: "action:writeback",
          plainName: "RecordDecision",
          operationalIntent: "Record approved decision.",
          writebackRisk: "medium",
          submissionCriteria: ["decision exists", "review card accepted"],
          evidenceRefs: ["evidence://decision"],
        },
      ],
    }), {
      readinessProfile: "action-writeback-design",
    });
    expect(ready.verdict).toBe("ready-for-semantic-contract");
  });

  test("instructional-explanation-quality ratchets non-developer education prompts", () => {
    const grade = gradeFDEOntologyEngineeringSession(session({
      readinessProfileId: "instructional-explanation-quality",
      latentHypotheses: [
        {
          hypothesisId: "latent-rule:korean-education",
          ruleId: "korean-education.instruction-quality",
          templateId: "latent-template:korean-education.instruction-quality",
          status: "accepted",
          family: "instructional-explanation-quality",
          readinessRequirementIds: ["mission", "evidence", "latent-intent-decision"],
          plainLanguage: "Clarify student explanation quality.",
          whyLeadInferredThis: "Korean education prompt.",
          whatUserMayNotHaveNoticed: "Teacher review remains explicit.",
          recommendedDefault: "Keep deferred until learner evidence is explicit.",
          riskIfWrong: "Wrong teaching target.",
          whatWillNotHappenIfAccepted: ["Accepting this hypothesis will not replace teacher judgment."],
          ontologyImplication: {
            possibleObjects: ["Learner", "Lesson", "ExplanationEvidence"],
            possibleLinks: ["LearnerUnderstandsLesson"],
            possibleActions: [],
            possibleFunctions: ["EvaluateExplanationQuality"],
          },
          evidenceNeeded: ["student-visible reasoning evidence"],
          sourceRefs: ["evidence://student-work"],
        },
      ],
      acceptedHypothesisIds: ["latent-rule:korean-education"],
      objectCandidates: [
        { candidateId: "object:learner", plainName: "Learner", whyItMayMatter: "", evidenceRefs: [] },
      ],
      functionCandidates: [
        { candidateId: "function:quality", plainName: "EvaluateExplanationQuality", logicIntent: "", evidenceRefs: [] },
      ],
    }));

    expect(grade.verdict).toBe("ready-for-semantic-contract");
    expect(grade.readinessProfile?.readyForDigitalTwin).toBe(false);
  });

  test("curriculum-reference-boundary requires non-goals and reference classification", () => {
    const blocked = gradeFDEOntologyEngineeringSession(session({
      readinessProfileId: "curriculum-reference-boundary",
      confirmedNonGoals: [],
      sourceRefs: [],
      evidenceModel: {
        evidenceDefinition: "MYP guide.",
        observableSignals: ["criterion named"],
        sourceArtifactRefs: [],
        missingEvidenceQuestions: [],
      },
    }));

    expect(blocked.verdict).toBe("continue-turns");
    expect(blocked.missing).toContain("non-goals");
    expect(blocked.missing).toContain("evidence classification");
  });

  test("technology-surface can become SIC-ready but not DTC-ready from readiness alone", () => {
    const ready = gradeFDEOntologyEngineeringSession(session({
      readinessProfileId: "technology-surface",
      semanticIntentContractRef: "semantic-intent:exists",
      chatbotContextCandidates: [
        {
          candidateId: "chatbot-context:runtime",
          plainName: "RuntimeSurfaceContext",
          applicationStateNeed: "Current 3D scene and viewport state.",
          evidenceRefs: ["evidence://runtime"],
        },
      ],
    }));

    expect(ready.verdict).toBe("ready-for-semantic-contract");
    expect(ready.readinessProfile?.readyForSemanticIntent).toBe(true);
    expect(ready.readinessProfile?.readyForDigitalTwin).toBe(false);
  });
});
