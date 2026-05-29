import { describe, expect, test } from "bun:test";
import {
  FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION,
  type FDEOntologyEngineeringSession,
} from "../../../lib/fde-ontology-engineering/types";
import { buildFDEOntologyEngineeringReviewCard } from "../../../lib/fde-ontology-engineering/review-card";

function session(
  overrides: Partial<FDEOntologyEngineeringSession> = {},
): FDEOntologyEngineeringSession {
  return {
    schemaVersion: FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION,
    sessionId: "fde-test-session",
    projectRoot: "/tmp/palantir-mini",
    universalOntologyEntryRef: "universal-ontology-entry://test",
    phase: "semantic-contract-ready",
    turnCount: 1,
    userFacingSummary: "Review the FDE session.",
    confirmedUserGoal: "Review surface contract authority before routing.",
    missionModel: {
      useCaseName: "Surface review",
      operationalDecision: "Review authority before routing.",
      decisionOwnerRole: "Lead",
      successSignals: ["Contracts are reviewed before execution."],
    },
    evidenceModel: {
      evidenceDefinition: "Review cards and contract refs are visible.",
      observableSignals: ["review-card"],
      sourceArtifactRefs: ["source:evidence"],
      missingEvidenceQuestions: [],
    },
    confirmedNonGoals: [],
    latentHypotheses: [],
    acceptedHypothesisIds: [],
    rejectedHypothesisIds: [],
    objectCandidates: [
      {
        candidateId: "object:surface",
        plainName: "Surface",
        whyItMayMatter: "A public surface needs review.",
        evidenceRefs: ["source:object"],
      },
    ],
    linkCandidates: [
      {
        candidateId: "link:surface-to-contract",
        plainName: "Surface has contract",
        businessMeaning: "The contract records authority.",
        evidenceRefs: ["source:link"],
      },
    ],
    actionCandidates: [
      {
        candidateId: "action:review",
        plainName: "Review",
        operationalIntent: "Review before routing.",
        writebackRisk: "none",
        evidenceRefs: ["source:action"],
      },
    ],
    functionCandidates: [
      {
        candidateId: "function:derive",
        plainName: "Derive",
        logicIntent: "Derive review state.",
        evidenceRefs: ["source:function"],
      },
    ],
    chatbotContextCandidates: [
      {
        candidateId: "chatbot:context",
        plainName: "Context",
        applicationStateNeed: "Explain the next step.",
        evidenceRefs: ["source:chatbot"],
      },
    ],
    unresolvedQuestions: [],
    sourceRefs: [],
    recentTurnSummaries: [],
    turnRecordIds: [],
    createdAt: "2026-05-29T00:00:00.000Z",
    updatedAt: "2026-05-29T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildFDEOntologyEngineeringReviewCard", () => {
  test("semantic-contract verdict records SIC as FDE-approved boundary", () => {
    const card = buildFDEOntologyEngineeringReviewCard(
      session({
        acceptedHypothesisIds: ["latent:accepted-meaning"],
        latentHypotheses: [
          {
            hypothesisId: "latent:accepted-meaning",
            ruleId: "generic.prompt-mission-decision",
            status: "accepted",
            family: "mission-decision",
            readinessRequirementIds: ["latent-intent-decision"],
            plainLanguage: "Accepted FDE meaning.",
            whyLeadInferredThis: "The user accepted this meaning in FDE.",
            whatUserMayNotHaveNoticed: "This becomes contract source material only after approval.",
            recommendedDefault: "Use it for SIC drafting.",
            riskIfWrong: "SIC would record the wrong boundary.",
            whatWillNotHappenIfAccepted: ["No mutation authorization."],
            ontologyImplication: {
              possibleObjects: ["Surface"],
              possibleLinks: [],
              possibleActions: [],
              possibleFunctions: [],
            },
            evidenceNeeded: [],
            sourceRefs: [],
          },
        ],
      }),
    );

    expect(card.verdict).toBe("ready-for-semantic-contract");
    expect(card.nextAction).toContain("SIC");
    expect(card.nextAction).toContain("approved boundary");
    expect(card.nextAction).toContain("accepted FDE session state");
    expect(card.nextAction).toContain("do not treat SIC as first discovery");
  });

  test("DTC verdict names the approved source chain before routing", () => {
    const card = buildFDEOntologyEngineeringReviewCard(
      session({
        semanticIntentContractRef: "semantic-intent:approved:test",
        digitalTwinChangeContractRef: "digital-twin-change:approved:test",
      }),
    );

    expect(card.verdict).toBe("ready-for-dtc");
    expect(card.nextAction).toContain("approved SIC");
    expect(card.nextAction).toContain("FDE session");
    expect(card.nextAction).toContain("ContextEngineeringPlan DATA/LOGIC/ACTION");
    expect(card.nextAction).toContain("technology recommendation");
    expect(card.nextAction).toContain("validation plan");
    expect(card.nextAction).toContain("before routing");
  });
});
