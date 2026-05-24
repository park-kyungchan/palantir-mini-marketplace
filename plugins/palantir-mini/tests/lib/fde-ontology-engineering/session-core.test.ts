import { describe, expect, test } from "bun:test";
import type { UniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import {
  UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION,
} from "../../../lib/ontology-entry/universal-entry";
import {
  createFDEOntologyEngineeringSessionFromEntry,
} from "../../../lib/fde-ontology-engineering/session-store";
import {
  processFDEOntologyEngineeringTurn,
} from "../../../lib/fde-ontology-engineering/turn-engine";
import {
  gradeFDEOntologyEngineeringSession,
} from "../../../lib/fde-ontology-engineering/grade-session";
import {
  buildFDEOntologyEngineeringReviewCard,
} from "../../../lib/fde-ontology-engineering/review-card";
import {
  createSemanticIntentContractDraftFromFDEOntologySession,
} from "../../../lib/fde-ontology-engineering/sic-from-session";

function entry(projectRoot = "/tmp/pm-fde-core-test"): UniversalOntologyEntry {
  return {
    entryId: "universal-ontology-entry:session-core",
    schemaVersion: UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION,
    createdAt: "2026-05-21T00:00:00.000Z",
    prompt: {
      promptId: "prompt-session-core",
      promptHash: "hash-session-core",
      sessionId: "session-core",
      runtime: "codex",
      excerpt: "Raw entry prompt excerpt is only the starting point.",
    },
    project: {
      projectRoot,
      candidateProjectIds: ["palantir-mini"],
    },
    classification: {
      requestKind: "implementation",
      mutationExpected: false,
      learnerVisible: true,
      requiresDtc: true,
      canProceedReadOnly: true,
    },
    ontologySeed: {
      nouns: ["student"],
      verbs: ["intervene"],
      surfaceHints: [],
      capabilityHints: ["ontology"],
    },
    status: "captured",
  };
}

describe("FDE ontology engineering session core", () => {
  test("turn engine updates session state, stable summary, and phase history without storing raw prompt text", () => {
    const session = createFDEOntologyEngineeringSessionFromEntry({
      entry: entry(),
      sessionId: "fde-session:core",
      createdAt: "2026-05-21T00:00:00.000Z",
    });
    const rawUserMessage = "RAW SECRET PROMPT: 학생 A의 오답 전문을 그대로 저장하지 말 것";

    const result = processFDEOntologyEngineeringTurn({
      session,
      rawUserMessage,
      sanitizedTurnSummary: "Track student misconception intervention",
      acceptedHypothesisIds: ["latent:track-student-misconception-intervention"],
      signal: {
        mission: {
          useCaseName: "Misconception intervention",
          operationalDecision: "Decide which misconception intervention a teacher should take next.",
          decisionOwnerRole: "teacher",
          successSignals: ["teacher can select next intervention"],
        },
        evidence: {
          evidenceDefinition: "Student answer evidence with misconception markers.",
          observableSignals: ["wrong answer pattern"],
          sourceArtifactRefs: ["evidence://student-answer"],
          missingEvidenceQuestions: [],
        },
        objectNames: ["Student", "Misconception Evidence"],
        linkNames: ["Student has misconception evidence"],
        actionNames: ["Record intervention"],
        functionNames: ["Score misconception"],
        chatbotContextNames: ["Teacher intervention assistant state"],
        sourceRefs: ["evidence://student-answer"],
      },
      emittedAt: "2026-05-21T00:01:00.000Z",
    });

    const serializedSession = JSON.stringify(result.session);
    expect(serializedSession).not.toContain(rawUserMessage);
    expect(result.record.userMessageHash).toMatch(/^sha256:/);
    expect(result.session.acceptedHypothesisIds).toContain(
      "latent:track-student-misconception-intervention",
    );
    expect(result.session.latentHypotheses[0]?.status).toBe("accepted");
    expect(result.session.phase).toBe("semantic-contract-ready");
    expect(result.session.stableSummary?.confirmedIntent).toBe(
      "Decide which misconception intervention a teacher should take next.",
    );
    expect(result.session.stableSummary?.sourceTurnIds).toEqual([result.record.turnId]);
    expect(result.session.phaseHistory?.at(-1)?.phase).toBe("semantic-contract-ready");
  });

  test("grade session returns the four approved verdict classes", () => {
    const emptySession = createFDEOntologyEngineeringSessionFromEntry({
      entry: entry(),
      sessionId: "fde-session:empty",
    });
    expect(gradeFDEOntologyEngineeringSession(emptySession).verdict).toBe("continue-turns");

    const rejected = {
      ...emptySession,
      rejectedHypothesisIds: ["latent:wrong"],
    };
    expect(gradeFDEOntologyEngineeringSession(rejected).verdict).toBe("reject");

    const readyForSemantic = processFDEOntologyEngineeringTurn({
      session: emptySession,
      sanitizedTurnSummary: "Track student misconception intervention",
      acceptedHypothesisIds: ["latent:track-student-misconception-intervention"],
      signal: {
        mission: {
          operationalDecision: "Decide next teacher intervention.",
          decisionOwnerRole: "teacher",
          successSignals: ["teacher can act"],
        },
        evidence: {
          evidenceDefinition: "Student answer evidence.",
          observableSignals: ["answer pattern"],
          sourceArtifactRefs: ["evidence://answer"],
          missingEvidenceQuestions: [],
        },
        objectNames: ["Student"],
        linkNames: ["Student has answer"],
        actionNames: ["Record intervention"],
        functionNames: ["Score answer"],
        chatbotContextNames: ["Teacher assistant state"],
      },
    }).session;
    expect(gradeFDEOntologyEngineeringSession(readyForSemantic).verdict).toBe(
      "ready-for-semantic-contract",
    );

    const readyForDtc = {
      ...readyForSemantic,
      semanticIntentContractRef: "semantic-intent:test",
      digitalTwinChangeContractRef: "digital-twin-change:test",
    };
    expect(gradeFDEOntologyEngineeringSession(readyForDtc).verdict).toBe("ready-for-dtc");
  });

  test("choice applications accept, reject, and defer hypotheses into turn record and session", () => {
    const baseSession = {
      ...createFDEOntologyEngineeringSessionFromEntry({
        entry: entry(),
        sessionId: "fde-session:choices",
      }),
      latentHypotheses: [
        {
          hypothesisId: "latent:accept-me",
          ruleId: "generic.prompt-mission-decision",
          status: "inferred" as const,
          family: "mission-decision" as const,
          readinessRequirementIds: ["latent-intent-decision"],
          plainLanguage: "Accept mission decision.",
          whyLeadInferredThis: "Choice test.",
          whatUserMayNotHaveNoticed: "Decision state changes.",
          recommendedDefault: "Accept.",
          riskIfWrong: "Wrong choice.",
          whatWillNotHappenIfAccepted: ["No mutation authority."],
          ontologyImplication: {
            possibleObjects: ["MissionDecision"],
            possibleLinks: [],
            possibleActions: [],
            possibleFunctions: [],
          },
          evidenceNeeded: [],
          sourceRefs: [],
        },
        {
          hypothesisId: "latent:reject-me",
          status: "inferred" as const,
          plainLanguage: "Reject wrong decision.",
          whyLeadInferredThis: "Choice test.",
          whatUserMayNotHaveNoticed: "Decision state changes.",
          recommendedDefault: "Reject.",
          riskIfWrong: "Wrong choice.",
          whatWillNotHappenIfAccepted: ["No mutation authority."],
          ontologyImplication: {
            possibleObjects: [],
            possibleLinks: [],
            possibleActions: [],
            possibleFunctions: [],
          },
          evidenceNeeded: [],
          sourceRefs: [],
        },
        {
          hypothesisId: "latent:defer-me",
          status: "inferred" as const,
          plainLanguage: "Defer uncertain decision.",
          whyLeadInferredThis: "Choice test.",
          whatUserMayNotHaveNoticed: "Decision state changes.",
          recommendedDefault: "Defer.",
          riskIfWrong: "Wrong choice.",
          whatWillNotHappenIfAccepted: ["No mutation authority."],
          ontologyImplication: {
            possibleObjects: [],
            possibleLinks: [],
            possibleActions: [],
            possibleFunctions: [],
          },
          evidenceNeeded: [],
          sourceRefs: [],
        },
      ],
    };

    const result = processFDEOntologyEngineeringTurn({
      session: baseSession,
      sanitizedTurnSummary: "Apply lead card choices.",
      choiceApplications: [
        { kind: "accept", targetHypothesisId: "latent:accept-me", choiceId: "choice:accept" },
        { kind: "reject", targetHypothesisId: "latent:reject-me", choiceId: "choice:reject" },
        {
          kind: "defer",
          targetHypothesisId: "latent:defer-me",
          choiceId: "choice:defer",
          freeTextAnswer: "Need one more evidence turn.",
        },
      ],
    });

    expect(result.record.acceptedHypothesisIds).toContain("latent:accept-me");
    expect(result.record.rejectedHypothesisIds).toContain("latent:reject-me");
    expect(result.record.deferredHypothesisIds).toContain("latent:defer-me");
    expect(result.record.leadSummary).toContain("Need one more evidence turn.");
    expect(result.session.latentHypotheses.find((item) => item.hypothesisId === "latent:accept-me")?.status).toBe("accepted");
    expect(result.session.latentHypotheses.find((item) => item.hypothesisId === "latent:reject-me")?.status).toBe("rejected");
    expect(result.session.latentHypotheses.find((item) => item.hypothesisId === "latent:defer-me")?.status).toBe("deferred");
  });

  test("review card and SIC draft are derived from accepted session state", () => {
    const rawUserMessage = "RAW SIC SOURCE SHOULD NOT APPEAR";
    const baseSession = createFDEOntologyEngineeringSessionFromEntry({
      entry: entry(),
      sessionId: "fde-session:sic",
    });
    const session = processFDEOntologyEngineeringTurn({
      session: baseSession,
      rawUserMessage,
      sanitizedTurnSummary: "Track student misconception intervention",
      acceptedHypothesisIds: ["latent:track-student-misconception-intervention"],
      deferredHypothesisIds: ["latent:future-parent-notification"],
      signal: {
        mission: {
          operationalDecision: "Decide next teacher intervention.",
          decisionOwnerRole: "teacher",
          successSignals: ["teacher can act"],
        },
        evidence: {
          evidenceDefinition: "Student answer evidence.",
          observableSignals: ["answer pattern"],
          sourceArtifactRefs: ["evidence://answer"],
          missingEvidenceQuestions: [],
        },
        objectNames: ["Student"],
        linkNames: ["Student has answer"],
        actionNames: ["Record intervention"],
        functionNames: ["Score answer"],
        chatbotContextNames: ["Teacher assistant state"],
      },
    }).session;

    const card = buildFDEOntologyEngineeringReviewCard(session);
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(session, {
      contractId: "semantic-intent:test-sic",
      affectedSurfaces: ["lib/fde-ontology-engineering/**"],
    });

    expect(card.verdict).toBe("ready-for-semantic-contract");
    expect(card.accepted).toContain("Track student misconception intervention");
    expect(card.deferred).toContain("latent:future-parent-notification");
    expect(sic.contractId).toBe("semantic-intent:test-sic");
    expect(sic.rawIntent).toBe("Decide next teacher intervention.");
    expect(sic.approvedNouns).toEqual([
      "Student",
      "Student has answer",
      "Teacher assistant state",
    ]);
    expect(sic.approvedVerbs).toEqual(["Record intervention", "Score answer"]);
    expect(JSON.stringify(sic)).not.toContain(rawUserMessage);
  });
});
