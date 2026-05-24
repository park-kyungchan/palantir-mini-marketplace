import { describe, expect, test } from "bun:test";
import {
  buildLeadOntologyTurnCardV2,
  buildLeadOntologyTurnCardV3,
} from "../../../lib/chatbot-studio/lead-ontology-turn-card";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";

function session(overrides: Partial<FDEOntologyEngineeringSession> = {}): FDEOntologyEngineeringSession {
  return {
    schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
    sessionId: "fde-session:lead-card",
    projectRoot: "/tmp/fde-lead-card",
    universalOntologyEntryRef: "universal-ontology-entry://lead-card",
    phase: "chatbot-application-state",
    turnCount: 1,
    userFacingSummary: "Review a 3D runtime surface.",
    confirmedUserGoal: "Decide whether 3D runtime state belongs in the SIC.",
    confirmedNonGoals: ["Do not authorize mutation from the card."],
    latentHypotheses: [
      {
        hypothesisId: "latent:3d-runtime",
        ruleId: "runtime.3d-surface",
        templateId: "latent-template:runtime.3d-surface",
        status: "inferred",
        family: "technology-surface",
        decisionAxis: "application-state",
        readinessRequirementIds: ["mission", "latent-intent-decision", "application-state"],
        plainLanguage: "Separate 3D runtime surface from mutation authority.",
        whyLeadInferredThis: "The prompt names 3D runtime UI.",
        whatUserMayNotHaveNoticed: "3D rendering is application state.",
        recommendedDefault: "Keep review-only.",
        riskIfWrong: "The card could imply mutation authority.",
        whatWillNotHappenIfAccepted: ["No mutation authority."],
        ontologyImplication: {
          possibleObjects: ["RuntimeSurface", "Scene3D"],
          possibleLinks: [],
          possibleActions: ["ReviewRuntimeState"],
          possibleFunctions: [],
        },
        evidenceNeeded: ["runtime screenshot"],
        sourceRefs: ["evidence://runtime"],
      },
    ],
    acceptedHypothesisIds: [],
    rejectedHypothesisIds: [],
    deferredHypothesisIds: [],
    missionModel: {
      operationalDecision: "Decide 3D runtime state boundary.",
      decisionOwnerRole: "Lead",
      successSignals: ["review remains non-authorizing"],
    },
    evidenceModel: {
      evidenceDefinition: "3D runtime evidence.",
      observableSignals: ["scene renders"],
      sourceArtifactRefs: ["evidence://runtime"],
      missingEvidenceQuestions: [],
    },
    objectCandidates: [],
    linkCandidates: [],
    actionCandidates: [],
    functionCandidates: [],
    chatbotContextCandidates: [
      {
        candidateId: "chatbot-context:runtime",
        plainName: "RuntimeSurfaceContext",
        applicationStateNeed: "Current scene and viewport state.",
        evidenceRefs: ["evidence://runtime"],
      },
    ],
    unresolvedQuestions: [],
    sourceRefs: ["evidence://runtime"],
    recentTurnSummaries: [],
    turnRecordIds: [],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("LeadOntologyTurnCardV2", () => {
  test("projects rich choice effects without mutation authority", () => {
    const card = buildLeadOntologyTurnCardV2({ session: session() });
    const accept = card.choices.find((choice) => choice.kind === "accept");

    expect(card.mutationAuthorizedFromCard).toBe(false);
    expect(card.readyForDtc).toBe(false);
    expect(accept).toMatchObject({
      ifAccepted:
        "The hypothesis can feed SIC drafting as an explicit accepted meaning; it still cannot authorize mutation.",
      ifRejected:
        "The hypothesis stays out of the SIC/DTC candidate set and should not drive ontology or runtime defaults.",
      ifDeferred:
        "The hypothesis remains visible as unresolved context for a later FDE turn and blocks silent promotion.",
      affectsSemanticIntent: true,
      affectsDtc: true,
      contextEngineeringDomain: "application-state",
    });
    expect(accept?.internalAction.sourceRef).toBe("lead-ontology-turn-card:fde-session:lead-card");
  });
});

describe("LeadOntologyTurnCardV3", () => {
  test("projects hypothesis previews and explicit non-authorizing choice effects", () => {
    const card = buildLeadOntologyTurnCardV3({
      session: session({
        latentHypotheses: [
          ...session().latentHypotheses,
          {
            hypothesisId: "latent:evidence-policy",
            ruleId: "runtime.evidence-policy",
            templateId: "latent-template:runtime.evidence-policy",
            status: "inferred",
            family: "evidence-policy-design",
            decisionAxis: "governance",
            readinessRequirementIds: ["evidence", "governance"],
            plainLanguage: "Evidence policy affects data and governance.",
            whyLeadInferredThis: "The prompt names evidence boundaries.",
            whatUserMayNotHaveNoticed: "Evidence policy can affect governance.",
            recommendedDefault: "Keep evidence reference-only.",
            riskIfWrong: "Reference evidence could be promoted silently.",
            whatWillNotHappenIfAccepted: ["No mutation authority."],
            ontologyImplication: {
              possibleObjects: ["EvidencePolicy"],
              possibleLinks: [],
              possibleActions: [],
              possibleFunctions: [],
            },
            evidenceNeeded: ["policy source"],
            sourceRefs: ["evidence://policy"],
          },
        ],
      }),
    });

    const runtimeChoices = card.choices.filter((choice) =>
      choice.targetHypothesisId === "latent:3d-runtime"
    );
    const evidencePreview = card.hypothesisPreviews.find((preview) =>
      preview.hypothesisId === "latent:evidence-policy"
    );

    expect(card.schemaVersion).toBe("palantir-mini/lead-ontology-turn-card/v3");
    expect(card.mutationAuthorizedFromCard).toBe(false);
    expect(runtimeChoices.map((choice) => choice.kind).sort()).toEqual([
      "accept",
      "defer",
      "reject",
    ]);
    expect(runtimeChoices.every((choice) =>
      choice.effect.ifAccepted.includes("mutation remains unauthorized") &&
      choice.effect.ifRejected.length > 0 &&
      choice.effect.ifDeferred.length > 0 &&
      choice.effect.affectsSemanticIntent === true &&
      choice.effect.contextEngineeringDomains.includes("TECHNOLOGY")
    )).toBe(true);
    expect(evidencePreview?.contextEngineeringDomains).toEqual(["GOVERNANCE", "DATA"]);
    expect(card.choices.some((choice) => choice.internalAction.kind === "accept")).toBe(true);
  });
});
