import { describe, expect, test } from "bun:test";
import {
  createSemanticIntentContractDraftFromFDEOntologySession,
} from "../../../lib/fde-ontology-engineering/sic-from-session";
import {
  FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION,
} from "../../../lib/fde-ontology-engineering/types";
import type {
  FDEOntologyEngineeringSession,
  ObjectTypeCandidate,
} from "../../../lib/fde-ontology-engineering/types";

const BASE_SESSION: FDEOntologyEngineeringSession = {
  schemaVersion: FDE_ONTOLOGY_ENGINEERING_SESSION_SCHEMA_VERSION,
  sessionId: "fde-session:sic-axes",
  projectRoot: "/tmp/pm-fde-sic-axes",
  universalOntologyEntryRef: "universal-ontology-entry:sic-axes",
  phase: "semantic-contract-ready",
  turnCount: 3,
  userFacingSummary: "Track student misconception intervention.",
  confirmedUserGoal: "Decide the next teacher intervention.",
  confirmedNonGoals: ["Do not notify parents automatically."],
  latentHypotheses: [],
  acceptedHypothesisIds: [],
  rejectedHypothesisIds: [],
  missionModel: {
    operationalDecision: "Decide next teacher intervention.",
    decisionOwnerRole: "teacher",
    successSignals: ["teacher can act within one lesson"],
  },
  evidenceModel: {
    evidenceDefinition: "Student answer evidence drives the decision.",
    observableSignals: ["answer pattern"],
    sourceArtifactRefs: ["evidence://answer-pattern"],
    missingEvidenceQuestions: [],
  },
  objectCandidates: [
    {
      candidateId: "obj:student",
      plainName: "Student",
      whyItMayMatter: "Subject of the intervention decision.",
      evidenceRefs: ["evidence://student"],
    },
  ],
  linkCandidates: [
    {
      candidateId: "link:student-answer",
      plainName: "Student has answer",
      businessMeaning: "Connects a student to their submitted answer.",
      evidenceRefs: ["evidence://student-answer"],
    },
  ],
  actionCandidates: [
    {
      candidateId: "act:record-intervention",
      plainName: "Record intervention",
      operationalIntent: "Persist the chosen intervention.",
      writebackRisk: "medium",
      evidenceRefs: ["evidence://record"],
    },
  ],
  functionCandidates: [
    {
      candidateId: "fn:score-answer",
      plainName: "Score answer",
      logicIntent: "Compute a correctness score for an answer.",
      evidenceRefs: ["evidence://score"],
    },
  ],
  roleCandidates: [
    {
      candidateId: "role:teacher",
      plainName: "Teacher",
      principalKind: "agent",
      permissions: ["record-intervention"],
      evidenceRefs: ["evidence://teacher-role"],
    },
  ],
  chatbotContextCandidates: [
    {
      candidateId: "ctx:teacher-assistant",
      plainName: "Teacher assistant state",
      applicationStateNeed: "Hold the in-progress intervention draft.",
      evidenceRefs: ["evidence://assistant-state"],
    },
  ],
  unresolvedQuestions: [],
  sourceRefs: ["evidence://session-source"],
  recentTurnSummaries: [],
  turnRecordIds: [],
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-10T00:00:00.000Z",
};

describe("createSemanticIntentContractDraftFromFDEOntologySession — nine-axis + typed refs", () => {
  test("populates each axis from session signal", () => {
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(BASE_SESSION);
    const axes = sic.axes;
    expect(axes).toBeDefined();
    if (!axes) throw new Error("axes missing");

    // DATA ← objectCandidates + chatbotContextCandidates
    expect(axes.data.status).toBe("filled");
    expect(axes.data.summary).toContain("Student");
    expect(axes.data.summary).toContain("Teacher assistant state");
    expect(axes.data.refs).toEqual(
      expect.arrayContaining(["evidence://student", "evidence://assistant-state"]),
    );

    // LOGIC ← functionCandidates
    expect(axes.logic.status).toBe("filled");
    expect(axes.logic.summary).toContain("Score answer");

    // ACTION ← actionCandidates
    expect(axes.action.status).toBe("filled");
    expect(axes.action.summary).toContain("Record intervention");

    // GOVERNANCE / ACTORS ← role state
    expect(axes.governance.status).toBe("filled");
    expect(axes.governance.summary).toContain("Teacher");
    expect(axes.actors.status).toBe("filled");
    expect(axes.actors.summary).toContain("Teacher");

    // CONTEXT ← evidenceModel / sourceRefs
    expect(axes.context.status).toBe("filled");
    expect(axes.context.summary).toContain("Student answer evidence");
    expect(axes.context.refs).toEqual(
      expect.arrayContaining(["evidence://answer-pattern", "evidence://session-source"]),
    );

    // SUCCESS-EVAL ← missionModel.successSignals
    expect(axes.successEval.status).toBe("filled");
    expect(axes.successEval.summary).toContain("teacher can act within one lesson");

    // CONSTRAINTS-NONGOALS ← confirmedNonGoals
    expect(axes.constraintsNonGoals.status).toBe("filled");
    expect(axes.constraintsNonGoals.summary).toContain("Do not notify parents automatically.");
  });

  test("axes with no session signal are 'open', never 'not-applicable'", () => {
    const emptySession: FDEOntologyEngineeringSession = {
      ...BASE_SESSION,
      confirmedNonGoals: [],
      missionModel: undefined,
      evidenceModel: undefined,
      objectCandidates: [],
      linkCandidates: [],
      actionCandidates: [],
      functionCandidates: [],
      roleCandidates: [],
      chatbotContextCandidates: [],
      sourceRefs: [],
      semanticIntentContextRef: undefined,
      semanticIntentContractRef: undefined,
      digitalTwinChangeContractRef: undefined,
    };
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(emptySession);
    const axes = sic.axes;
    if (!axes) throw new Error("axes missing");

    for (const key of [
      "data",
      "logic",
      "action",
      "governance",
      "context",
      "successEval",
      "constraintsNonGoals",
      "actors",
      "memoryPrior",
    ] as const) {
      expect(axes[key].status).toBe("open");
      expect(axes[key].status).not.toBe("not-applicable");
      expect(axes[key].summary).toBe("");
    }
  });

  test("memoryPrior axis fills from prior-session contract refs when present", () => {
    const sessionWithPriors: FDEOntologyEngineeringSession = {
      ...BASE_SESSION,
      semanticIntentContractRef: "semantic-intent:prior",
      digitalTwinChangeContractRef: "dtc:prior",
    };
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(sessionWithPriors);
    const axes = sic.axes;
    if (!axes) throw new Error("axes missing");
    expect(axes.memoryPrior.status).toBe("filled");
    expect(axes.memoryPrior.refs).toEqual(
      expect.arrayContaining(["semantic-intent:prior", "dtc:prior"]),
    );
  });

  test("approvedNouns / approvedVerbs / affectedSurfaces are unchanged by the axes wiring", () => {
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(BASE_SESSION, {
      affectedSurfaces: ["lib/fde-ontology-engineering/**"],
    });
    expect(sic.approvedNouns).toEqual([
      "Student",
      "Student has answer",
      "Teacher assistant state",
    ]);
    expect(sic.approvedVerbs).toEqual(["Record intervention", "Score answer"]);
    expect(sic.affectedSurfaces).toEqual([
      "lib/fde-ontology-engineering/**",
      "evidence://session-source",
    ]);
  });

  test("typed refs fill only for candidates that carry a declared rid", () => {
    const ridBearing: ObjectTypeCandidate = {
      candidateId: "obj:student",
      plainName: "Student",
      whyItMayMatter: "Subject of the intervention decision.",
      evidenceRefs: ["evidence://student"],
      declaredRid: "ri.ontology.main.object-type.student",
    };
    const noRid: ObjectTypeCandidate = {
      candidateId: "obj:lesson",
      plainName: "Lesson",
      whyItMayMatter: "Container of student answers.",
      evidenceRefs: [],
    };
    const session: FDEOntologyEngineeringSession = {
      ...BASE_SESSION,
      objectCandidates: [ridBearing, noRid],
    };
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(session);
    expect(sic.approvedObjectTypeRefs).toEqual([
      {
        kind: "ObjectType",
        rid: "ri.ontology.main.object-type.student",
        displayName: "Student",
        confidence: "exact",
      },
    ]);
  });

  test("emits no typed-ref arrays when no candidate carries a rid", () => {
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(BASE_SESSION);
    expect(sic.approvedObjectTypeRefs).toBeUndefined();
    expect(sic.approvedActionTypeRefs).toBeUndefined();
    expect(sic.approvedFunctionRefs).toBeUndefined();
    expect(sic.approvedLinkTypeRefs).toBeUndefined();
  });
});
