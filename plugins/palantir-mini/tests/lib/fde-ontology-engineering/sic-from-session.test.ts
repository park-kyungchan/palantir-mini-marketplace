import { describe, expect, test } from "bun:test";
import {
  createSemanticIntentContractDraftFromFDEOntologySession,
  deriveDraftAxisConfirmationDebt,
} from "../../../lib/fde-ontology-engineering/sic-from-session";
import {
  advanceNineAxisSicSequence,
  NINE_AXIS_SIC_SEQUENCE,
} from "../../../lib/semantic-intent/nine-axis-sic-fill-sequence";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";
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

describe("DP-2 — LOGIC axis 'logic-block' facet + invoking-actor scope binding", () => {
  // A function that routes through an Apply-action AND a role to resolve its
  // invoking-actor scope against ⇒ a RESOLVED tool scope on GOVERNANCE.
  const RESOLVED_SESSION: FDEOntologyEngineeringSession = {
    ...BASE_SESSION,
    functionCandidates: [
      {
        candidateId: "fn:criteria",
        plainName: "submissionCriteriaCheck",
        logicIntent: "All rubric items graded + teacher approval.",
        evaluatorKind: "routes-through-apply-action",
        invokingActorScopeRef: "role:teacher",
        evidenceRefs: ["evidence://criteria"],
      },
    ],
    roleCandidates: [
      {
        candidateId: "role:teacher",
        plainName: "Teacher",
        principalKind: "agent",
        permissions: ["finalize-score"],
        evidenceRefs: ["evidence://teacher-role"],
      },
    ],
  };

  test("logic-block facet: evaluatorKind + resolved invokingActorScope", () => {
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(RESOLVED_SESSION);
    const facet = sic.axes?.logic.facet;
    if (!facet || facet.kind !== "logic-block") throw new Error("expected a logic-block facet");
    expect(facet.functions).toHaveLength(1);
    expect(facet.functions[0]).toEqual({
      name: "submissionCriteriaCheck",
      evaluatorKind: "routes-through-apply-action",
      invokingActorScope: "Teacher",
      refs: ["evidence://criteria"],
    });
    // Prose summary + status path stays byte-identical to the un-enriched axis.
    expect(sic.axes?.logic.status).toBe("draft");
    expect(sic.axes?.logic.summary).toBe("Decision logic / functions: submissionCriteriaCheck");
  });

  test("a RESOLVED routes-through-apply-action function ⇒ GOVERNANCE toolScope resolved:true", () => {
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(RESOLVED_SESSION);
    const governance = sic.axes?.governance.facet;
    if (!governance || governance.kind !== "access-boundary") {
      throw new Error("expected an access-boundary facet");
    }
    expect(governance.accessBoundary.toolScopes).toEqual([
      { toolName: "submissionCriteriaCheck", actorScope: "Teacher", resolved: true },
    ]);
  });

  test("FAIL-CLOSED (paired): an UNRESOLVED invokingActorScopeRef ⇒ toolScope resolved:false, NO default grant", () => {
    const unresolvedSession: FDEOntologyEngineeringSession = {
      ...RESOLVED_SESSION,
      // The ref points at a role that does not exist in this session.
      functionCandidates: [
        {
          ...RESOLVED_SESSION.functionCandidates[0]!,
          invokingActorScopeRef: "role:does-not-exist",
        },
      ],
    };
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(unresolvedSession);
    const logic = sic.axes?.logic.facet;
    if (!logic || logic.kind !== "logic-block") throw new Error("expected a logic-block facet");
    // The unresolved scope is ABSENT on the function (never widened/defaulted).
    expect(logic.functions[0]!.invokingActorScope).toBeUndefined();

    const governance = sic.axes?.governance.facet;
    if (!governance || governance.kind !== "access-boundary") {
      throw new Error("expected an access-boundary facet");
    }
    const scope = governance.accessBoundary.toolScopes[0]!;
    expect(scope.resolved).toBe(false);
    // The model/agent cannot mint a resolved scope by default: NONE is resolved:true.
    expect(governance.accessBoundary.toolScopes.some((s) => s.resolved === true)).toBe(false);
  });

  test("a pure-evaluator function ⇒ NO GOVERNANCE toolScope entry (it persists nothing to govern)", () => {
    const pureSession: FDEOntologyEngineeringSession = {
      ...RESOLVED_SESSION,
      functionCandidates: [
        {
          ...RESOLVED_SESSION.functionCandidates[0]!,
          evaluatorKind: "pure-evaluator",
        },
      ],
    };
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(pureSession);
    const governance = sic.axes?.governance.facet;
    if (!governance || governance.kind !== "access-boundary") {
      throw new Error("expected an access-boundary facet");
    }
    expect(governance.accessBoundary.toolScopes).toEqual([]);
  });

  test("a function with no declared evaluatorKind ⇒ facet 'unspecified', no toolScope", () => {
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(BASE_SESSION);
    const logic = sic.axes?.logic.facet;
    if (!logic || logic.kind !== "logic-block") throw new Error("expected a logic-block facet");
    expect(logic.functions[0]!.evaluatorKind).toBe("unspecified");
    const governance = sic.axes?.governance.facet;
    if (governance && governance.kind === "access-boundary") {
      expect(governance.accessBoundary.toolScopes).toEqual([]);
    }
  });

  test("empty session ⇒ no LOGIC facet and LOGIC status 'open'", () => {
    const emptySession: FDEOntologyEngineeringSession = {
      ...BASE_SESSION,
      functionCandidates: [],
    };
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(emptySession);
    expect(sic.axes?.logic.facet).toBeUndefined();
    expect(sic.axes?.logic.status).toBe("open");
  });
});

describe("DP-4 — GOVERNANCE axis 'access-boundary' facet (govern-fold, fail-closed default-deny)", () => {
  test("access-boundary facet: failClosed===true + DEFAULT-DENY accessibleSurfaces (a surface with no signal is ABSENT)", () => {
    // BASE_SESSION carries object + function + action signal, but NO function
    // routes through an Apply-action ⇒ no toolScope ⇒ no "tools" surface.
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(BASE_SESSION);
    const facet = sic.axes?.governance.facet;
    if (!facet || facet.kind !== "access-boundary") throw new Error("expected an access-boundary facet");
    expect(facet.accessBoundary.failClosed).toBe(true);
    // default-deny: only surfaces with session signal appear; "tools" is ABSENT.
    expect(facet.accessBoundary.accessibleSurfaces).toEqual(["data", "logic", "action"]);
    expect(facet.accessBoundary.accessibleSurfaces).not.toContain("tools");
    expect(facet.accessBoundary.accessibleSurfaces).not.toContain("memory");
  });

  test("policyMarkings fold role permissions + governance summary", () => {
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(BASE_SESSION);
    const facet = sic.axes?.governance.facet;
    if (!facet || facet.kind !== "access-boundary") throw new Error("expected an access-boundary facet");
    // BASE_SESSION's Teacher role carries the "record-intervention" permission.
    expect(facet.accessBoundary.policyMarkings).toContain("record-intervention");
  });

  test("a session with NO governance signal ⇒ no GOVERNANCE access-boundary facet", () => {
    const noGovSession: FDEOntologyEngineeringSession = {
      ...BASE_SESSION,
      stableSummary: undefined,
      roleCandidates: [],
      functionCandidates: [],
    };
    const sic = createSemanticIntentContractDraftFromFDEOntologySession(noGovSession);
    expect(sic.axes?.governance.facet).toBeUndefined();
  });
});

describe("DP-5 — per-'draft'-axis confirmation-debt LatentIntentHypothesis", () => {
  test("emits one typed debt hypothesis per 'draft' axis; an 'open' axis emits NO debt", () => {
    // A session with DATA + ACTION signal but NO GOVERNANCE/ACTORS signal ⇒ those
    // axes are "open" (nothing proposed) and emit no debt.
    const session: FDEOntologyEngineeringSession = {
      ...BASE_SESSION,
      stableSummary: undefined,
      roleCandidates: [],
    };
    const draft = createSemanticIntentContractDraftFromFDEOntologySession(session);
    const axes = draft.axes;
    if (!axes) throw new Error("axes missing");
    expect(axes.governance.status).toBe("open");
    expect(axes.actors.status).toBe("open");

    const debt = deriveDraftAxisConfirmationDebt(draft);
    const draftKeys = (Object.keys(axes) as (keyof typeof axes)[]).filter(
      (k) => axes[k].status === "draft",
    );
    // exactly one debt hypothesis per "draft" axis; none for "open" axes.
    expect(debt).toHaveLength(draftKeys.length);
    expect(debt.every((h) => h.status === "inferred")).toBe(true);
    expect(debt.map((h) => h.decisionAxis)).not.toContain("governance");

    // each debt names the axis turn + carries a non-empty riskIfWrong.
    const dataDebt = debt.find((h) => h.decisionAxis === "data")!;
    expect(dataDebt.readinessRequirementIds).toEqual(["axes.data"]);
    expect(dataDebt.riskIfWrong.length).toBeGreaterThan(0);
    expect(dataDebt.family).toBe("data-authority");
    const actionDebt = debt.find((h) => h.decisionAxis === "action")!;
    expect(actionDebt.readinessRequirementIds).toEqual(["axes.action"]);
    expect(actionDebt.family).toBe("action-writeback-risk");
  });

  test("reuses existing LatentIntentFamily / decisionAxis members (adds none) and the draft-axis-confirmation-debt template", () => {
    const draft = createSemanticIntentContractDraftFromFDEOntologySession(BASE_SESSION);
    const debt = deriveDraftAxisConfirmationDebt(draft);
    const allowedFamilies = new Set([
      "data-authority",
      "logic-authority",
      "action-writeback-risk",
      "governance-boundary",
      "framework-discovery",
    ]);
    const allowedAxes = new Set([undefined, "data", "logic", "action", "governance"]);
    for (const h of debt) {
      expect(allowedFamilies.has(h.family as string)).toBe(true);
      expect(allowedAxes.has(h.decisionAxis)).toBe(true);
      expect(h.templateId).toBe("latent-template:draft-axis-confirmation-debt");
    }
    // axes OUTSIDE the latent decisionAxis union (context/successEval/...) carry NO decisionAxis.
    const contextDebt = debt.find((h) => h.readinessRequirementIds?.[0] === "axes.context");
    if (contextDebt) expect(contextDebt.decisionAxis).toBeUndefined();
  });

  test("facet-bound riskIfWrong: an unresolved DATA endpoint + a no-criteria write-back surface their specific risks", () => {
    const session: FDEOntologyEngineeringSession = {
      ...BASE_SESSION,
      linkCandidates: [
        {
          candidateId: "link:dangling",
          plainName: "Student has ghost",
          sourceObject: "Student",
          targetObject: "Ghost", // not an object ⇒ endpointsResolved:false
          businessMeaning: "Dangling endpoint.",
          evidenceRefs: ["evidence://dangling"],
        },
      ],
      actionCandidates: [
        {
          candidateId: "act:no-criteria",
          plainName: "commitRaw",
          operationalIntent: "Write back with no submission gate.",
          writebackRisk: "high",
          submissionCriteria: [],
          evidenceRefs: ["evidence://no-criteria"],
        },
      ],
    };
    const draft = createSemanticIntentContractDraftFromFDEOntologySession(session);
    const debt = deriveDraftAxisConfirmationDebt(draft);
    expect(debt.find((h) => h.decisionAxis === "data")!.riskIfWrong).toContain("unresolved endpoint");
    expect(debt.find((h) => h.decisionAxis === "action")!.riskIfWrong).toContain("no submission criteria");
  });

  test("SELF-CLEAR: after the turn engine confirms an axis (status→filled), re-deriving yields NO debt for it", () => {
    const draft = createSemanticIntentContractDraftFromFDEOntologySession(BASE_SESSION);
    expect(draft.axes?.data.status).toBe("draft");
    expect(deriveDraftAxisConfirmationDebt(draft).some((h) => h.decisionAxis === "data")).toBe(true);

    const dataTurnIndex = NINE_AXIS_SIC_SEQUENCE.findIndex((d) => d.targetAxis === "data");
    const confirmed = advanceNineAxisSicSequence(
      draft as SemanticIntentContract,
      dataTurnIndex,
      "Student, answer",
    );
    expect(confirmed.axes?.data.status).toBe("filled");
    // The confirmed axis no longer matches the "draft" predicate ⇒ no debt for it.
    expect(deriveDraftAxisConfirmationDebt(confirmed).some((h) => h.decisionAxis === "data")).toBe(false);
    // LOGIC is still draft ⇒ its debt persists (debt tracks LIVE draft status).
    expect(deriveDraftAxisConfirmationDebt(confirmed).some((h) => h.decisionAxis === "logic")).toBe(true);
  });
});
