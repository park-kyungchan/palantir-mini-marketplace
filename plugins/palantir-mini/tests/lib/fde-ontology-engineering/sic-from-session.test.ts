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
    // Session-derived axes are 'draft' (proposed, NOT user-confirmed), never 'filled'.
    expect(axes.data.status).toBe("draft");
    expect(axes.data.summary).toContain("Student");
    expect(axes.data.summary).toContain("Teacher assistant state");
    expect(axes.data.refs).toEqual(
      expect.arrayContaining(["evidence://student", "evidence://assistant-state"]),
    );

    // LOGIC ← functionCandidates
    expect(axes.logic.status).toBe("draft");
    expect(axes.logic.summary).toContain("Score answer");

    // ACTION ← actionCandidates
    expect(axes.action.status).toBe("draft");
    expect(axes.action.summary).toContain("Record intervention");

    // GOVERNANCE / ACTORS ← role state
    expect(axes.governance.status).toBe("draft");
    expect(axes.governance.summary).toContain("Teacher");
    expect(axes.actors.status).toBe("draft");
    expect(axes.actors.summary).toContain("Teacher");

    // CONTEXT ← evidenceModel / sourceRefs
    expect(axes.context.status).toBe("draft");
    expect(axes.context.summary).toContain("Student answer evidence");
    expect(axes.context.refs).toEqual(
      expect.arrayContaining(["evidence://answer-pattern", "evidence://session-source"]),
    );

    // SUCCESS-EVAL ← missionModel.successSignals
    expect(axes.successEval.status).toBe("draft");
    expect(axes.successEval.summary).toContain("teacher can act within one lesson");

    // CONSTRAINTS-NONGOALS ← confirmedNonGoals
    expect(axes.constraintsNonGoals.status).toBe("draft");
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
    expect(axes.memoryPrior.status).toBe("draft");
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

describe("DP-1 — DATA axis 'data-graph' facet (typed Palantir noun-graph)", () => {
  test("objects + folded properties + links with resolved endpoints", () => {
    const session: FDEOntologyEngineeringSession = {
      ...BASE_SESSION,
      objectCandidates: [
        {
          candidateId: "obj:submission",
          plainName: "Submission",
          whyItMayMatter: "A student's submission.",
          evidenceRefs: ["evidence://submission"],
        },
        {
          candidateId: "obj:rubric",
          plainName: "Rubric",
          whyItMayMatter: "The grading rubric.",
          evidenceRefs: ["evidence://rubric"],
        },
      ],
      propertyCandidates: [
        {
          candidateId: "prop:score",
          plainName: "score",
          ownerObjectName: "Submission",
          dataType: "number",
          evidenceRefs: ["evidence://score"],
        },
      ],
      linkCandidates: [
        {
          candidateId: "edge:belongs",
          plainName: "belongsToRubric",
          sourceObject: "Submission",
          targetObject: "Rubric",
          businessMeaning: "Each submission binds to exactly one rubric.",
          evidenceRefs: ["evidence://belongs"],
        },
      ],
      chatbotContextCandidates: [],
    };
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(session);
    const facet = sic.axes?.data.facet;
    if (!facet || facet.kind !== "data-graph") throw new Error("expected a data-graph facet");

    expect(facet.objects.map((o) => o.name)).toEqual(["Submission", "Rubric"]);
    const submission = facet.objects.find((o) => o.name === "Submission")!;
    expect(submission.properties).toEqual([{ name: "score", dataType: "number" }]);
    expect(submission.refs).toEqual(["evidence://submission"]);
    expect(facet.objects.find((o) => o.name === "Rubric")!.properties).toEqual([]);

    expect(facet.links).toHaveLength(1);
    expect(facet.links[0]).toMatchObject({
      name: "belongsToRubric",
      sourceObject: "Submission",
      targetObject: "Rubric",
      endpointsResolved: true,
    });
  });

  test("a link whose endpoints are NOT both objects ⇒ endpointsResolved false", () => {
    const session: FDEOntologyEngineeringSession = {
      ...BASE_SESSION,
      objectCandidates: [
        {
          candidateId: "obj:submission",
          plainName: "Submission",
          whyItMayMatter: "A student's submission.",
          evidenceRefs: ["evidence://submission"],
        },
      ],
      propertyCandidates: [],
      linkCandidates: [
        {
          candidateId: "edge:dangling",
          plainName: "belongsToRubric",
          sourceObject: "Submission",
          targetObject: "Rubric", // Rubric is NOT an object in this session
          businessMeaning: "Dangling endpoint — confirmation debt, not a silent link.",
          evidenceRefs: ["evidence://belongs"],
        },
      ],
      chatbotContextCandidates: [],
    };
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(session);
    const facet = sic.axes?.data.facet;
    if (!facet || facet.kind !== "data-graph") throw new Error("expected a data-graph facet");
    expect(facet.links[0]!.endpointsResolved).toBe(false);
  });

  test("empty session ⇒ no DATA facet and DATA status 'open'", () => {
    const emptySession: FDEOntologyEngineeringSession = {
      ...BASE_SESSION,
      objectCandidates: [],
      linkCandidates: [],
      propertyCandidates: [],
      chatbotContextCandidates: [],
    };
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(emptySession);
    expect(sic.axes?.data.facet).toBeUndefined();
    expect(sic.axes?.data.status).toBe("open");
  });
});

describe("DP-3 — ACTION axis 'action-writeback' facet + SUCCESS-EVAL proposal binding", () => {
  const ACTION_SESSION: FDEOntologyEngineeringSession = {
    ...BASE_SESSION,
    actionCandidates: [
      {
        candidateId: "act:finalize-score",
        plainName: "finalizeScore",
        operationalIntent: "Write the finalized score back to the student record.",
        writebackRisk: "high",
        submissionCriteria: ["all rubric items graded", "teacher approval"],
        evidenceRefs: ["evidence://finalize"],
      },
    ],
  };

  test("writebackRisk + submissionCriteria projected onto the action-writeback facet", () => {
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(ACTION_SESSION);
    const facet = sic.axes?.action.facet;
    if (!facet || facet.kind !== "action-writeback") throw new Error("expected an action-writeback facet");

    expect(facet.actions).toHaveLength(1);
    expect(facet.actions[0]).toEqual({
      name: "finalizeScore",
      writebackRisk: "high",
      submissionCriteria: ["all rubric items graded", "teacher approval"],
      refs: ["evidence://finalize"],
    });
    // The prose summary + status path is byte-identical to the un-enriched axis.
    expect(sic.axes?.action.status).toBe("draft");
    expect(sic.axes?.action.summary).toBe("Write-back actions: finalizeScore");
  });

  test("each submission criterion threads into the SUCCESS-EVAL axis as a typed proposal ref + summary mention", () => {
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(ACTION_SESSION);
    const successEval = sic.axes?.successEval;
    if (!successEval) throw new Error("successEval axis missing");

    // One submission-criteria:// ref per (action, criterion-index).
    expect(successEval.refs).toEqual([
      "submission-criteria://finalizeScore/0",
      "submission-criteria://finalizeScore/1",
    ]);
    // The success signals AND the per-action criteria are surfaced as one proposal.
    expect(successEval.summary).toContain("teacher can act within one lesson");
    expect(successEval.summary).toContain("Per-action submission criteria:");
    expect(successEval.summary).toContain("submission-criteria://finalizeScore/0");
  });

  test("an action with NO submission criteria ⇒ facet action with submissionCriteria [] and NO success-eval criteria refs", () => {
    const noCriteriaSession: FDEOntologyEngineeringSession = {
      ...BASE_SESSION,
      actionCandidates: [
        {
          candidateId: "act:finalize-score",
          plainName: "finalizeScore",
          operationalIntent: "Write the finalized score back to the student record.",
          writebackRisk: "high",
          evidenceRefs: ["evidence://finalize"],
        },
      ],
    };
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(noCriteriaSession);
    const facet = sic.axes?.action.facet;
    if (!facet || facet.kind !== "action-writeback") throw new Error("expected an action-writeback facet");
    expect(facet.actions[0]!.submissionCriteria).toEqual([]);
    // No criteria ⇒ SUCCESS-EVAL carries no submission-criteria:// refs (only signals).
    expect(sic.axes?.successEval.refs).toEqual([]);
    expect(sic.axes?.successEval.summary).not.toContain("Per-action submission criteria:");
  });

  test("empty session ⇒ no ACTION facet and ACTION status 'open'", () => {
    const emptySession: FDEOntologyEngineeringSession = {
      ...BASE_SESSION,
      actionCandidates: [],
    };
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(emptySession);
    expect(sic.axes?.action.facet).toBeUndefined();
    expect(sic.axes?.action.status).toBe("open");
  });

  test("BOUNDARY GUARD (front-half scope): the elicitation binding never sets requiredEvaluationRefs (back-half / OE-8 stays UNTOUCHED)", () => {
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(ACTION_SESSION);
    // DP-3 binds submission criteria as a SUCCESS-EVAL *proposal* only; the
    // enforcement-side requiredEvaluationRefs (the DTC synthesis gate, OE-8) is
    // NOT populated here. The draft must carry no requiredEvaluationRefs.
    expect((sic as { requiredEvaluationRefs?: unknown }).requiredEvaluationRefs).toBeUndefined();
  });
});
