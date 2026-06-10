import { describe, expect, test } from "bun:test";
import {
  buildContextEngineeringPlan,
  buildContextEngineeringPlanV2,
  buildContextEngineeringPlanV3,
} from "../../../lib/context-engineering/context-plan-builder";
import {
  draftDtcFromContextPlan,
  draftDtcFromContextPlanV2,
  draftDtcFromContextPlanV3,
} from "../../../lib/context-engineering/dtc-from-context-plan";
import {
  validateDigitalTwinChangeContract,
} from "../../../lib/lead-intent/contracts";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../../lib/lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import { evaluatePreMutationGovernanceV2 } from "../../../lib/governance/pre-mutation-governance-v2";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";

const semantic: SemanticIntentContract = {
  schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
  contractId: "semantic-intent:dtc-from-context-plan",
  status: "approved",
  rawIntent: "Draft DTC",
  confirmedIntent: "Draft a DTC from approved context plan.",
  nonGoals: ["Do not approve mutation."],
  approvedNouns: ["DigitalTwinChangeContract"],
  approvedVerbs: ["draft"],
  affectedSurfaces: ["lib/context-engineering/dtc-from-context-plan.ts"],
  permissionsAndProposal: "plugin-local",
  acceptedRisks: [],
  downstreamAllowed: ["DTC draft"],
  downstreamForbidden: ["mutation approval"],
  clarificationQuestions: [],
  approvalRef: "user:approved:dtc-plan",
};

// SIC carrying structured typed refs at 'exact' confidence (the approved-FDE-session
// shape Slice D fuses DIRECTLY into the DTC build fields — never the lossy .map(String)).
const semanticStructured: SemanticIntentContract = {
  schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
  contractId: "semantic-intent:dtc-structured",
  status: "approved",
  rawIntent: "Build Scene3D ontology",
  confirmedIntent: "Build the Scene3D object, link, author action, and render function.",
  nonGoals: ["Do not approve mutation."],
  approvedNouns: ["Scene3D"],
  approvedVerbs: ["author"],
  affectedSurfaces: ["ontology/data/scene3d.ts"],
  approvedObjectTypeRefs: [
    { kind: "ObjectType", rid: "ri.ontology.main.object-type.scene3d", confidence: "exact" },
  ],
  approvedLinkTypeRefs: [
    { kind: "LinkType", rid: "ri.ontology.main.link-type.scene-has-geometry", confidence: "exact" },
  ],
  approvedActionTypeRefs: [
    { kind: "ActionType", rid: "ri.ontology.main.action-type.author-scene3d", confidence: "exact" },
  ],
  approvedFunctionRefs: [
    { kind: "Function", rid: "ri.ontology.main.function.render-scene3d", confidence: "exact" },
  ],
  approvedCanonicalTermRefs: ["term:scene3d"],
  approvedTermMappingRefs: ["mapping:scene3d"],
  permissionsAndProposal: "plugin-local",
  acceptedRisks: [],
  downstreamAllowed: ["DTC draft"],
  downstreamForbidden: ["mutation approval"],
  clarificationQuestions: [],
  approvalRef: "user:approved:dtc-structured",
};

const fdeSession = {
  sessionId: "fde-session-dtc",
  projectRoot: "/repo",
  sourceRefs: ["research:aip"],
  confirmedUserGoal: "Draft reviewable DTC",
  objectCandidates: [],
  linkCandidates: [],
  actionCandidates: [{ candidateId: "action-1", plainName: "ApproveMutation", operationalIntent: "", writebackRisk: "medium", evidenceRefs: [] }],
  functionCandidates: [],
  chatbotContextCandidates: [],
} satisfies Pick<
  FDEOntologyEngineeringSession,
  | "sessionId"
  | "projectRoot"
  | "sourceRefs"
  | "confirmedUserGoal"
  | "objectCandidates"
  | "linkCandidates"
  | "actionCandidates"
  | "functionCandidates"
  | "chatbotContextCandidates"
>;

describe("draftDtcFromContextPlan", () => {
  test("drafts DTC from approved SIC and exposes DATA/LOGIC/ACTION review", () => {
    const projectIndex = {
      projectRoot: "/repo",
      indexRef: "INDEX.md",
      authorityRefs: ["ontology/shared-core"],
      runtimeSurfaceRefs: ["bridge/handlers/pm-semantic-intent-gate.ts"],
      validationRefs: ["tests/lib/context-engineering/dtc-from-context-plan.test.ts"],
      sourceRefs: ["BROWSE.md"],
    };
    const contextEngineeringPlan = buildContextEngineeringPlan({
      semanticIntentContract: semantic,
      fdeSession,
      projectIndex,
    });

    const result = draftDtcFromContextPlan({
      semanticIntentContract: semantic,
      fdeSession,
      contextEngineeringPlan,
      projectIndex,
    });

    expect(result.digitalTwinChangeContract.status).toBe("draft");
    expect(result.digitalTwinChangeContract.semanticIntentContractRef).toBe(semantic.contractId);
    expect(result.reviewBeforeMutationApproval.data).toContain("DATA:");
    expect(result.reviewBeforeMutationApproval.logic).toContain("LOGIC:");
    expect(result.reviewBeforeMutationApproval.action).toContain("ACTION:");
    expect(result.reviewBeforeMutationApproval.approvalInstruction).toContain(
      "not approval for ontology/schema/reference-pack writeback",
    );
    expect(result.digitalTwinChangeContract.toolSurfaceReadiness).toContain(
      "DATA, LOGIC, and ACTION",
    );
  });

  test("drafts V2 DTC with structured boundary, runtime recommendations, validation, and decisions", () => {
    const projectIndex = {
      projectRoot: "/repo",
      indexRef: "INDEX.md",
      authorityRefs: ["ontology/shared-core"],
      runtimeSurfaceRefs: ["bridge/handlers/pm-semantic-intent-gate.ts"],
      validationRefs: ["tests/lib/context-engineering/dtc-from-context-plan.test.ts"],
      sourceRefs: ["BROWSE.md"],
    };
    const contextEngineeringPlan = buildContextEngineeringPlanV2({
      semanticIntentContract: semantic,
      fdeSession: {
        ...fdeSession,
        objectCandidates: [
          { candidateId: "object-1", plainName: "Decision", whyItMayMatter: "", evidenceRefs: [] },
        ],
        functionCandidates: [
          { candidateId: "fn-1", plainName: "ComputeDecision", logicIntent: "", evidenceRefs: [] },
        ],
      },
      projectIndex,
    });

    const result = draftDtcFromContextPlanV2({
      semanticIntentContract: semantic,
      fdeSession,
      contextEngineeringPlan,
      projectIndex,
    });

    expect(result.digitalTwinChangeContract.status).toBe("draft");
    expect(result.digitalTwinChangeContract.changeBoundary).toContain("Decision");
    expect(result.digitalTwinChangeContract.changeBoundary).toContain("ComputeDecision");
    expect(result.digitalTwinChangeContract.toolSurfaceReadiness).toContain("convex-only-backend");
    expect(result.digitalTwinChangeContract.toolSurfaceReadiness).toContain("chatbot-studio-workbench");
    expect(result.digitalTwinChangeContract.evaluationPlan).toContain("context-plan-v2");
    expect(result.digitalTwinChangeContract.structuredBoundary).toBeDefined();
    expect(Object.keys(result.digitalTwinChangeContract.structuredBoundary ?? {})).toEqual([
      "changeBoundary",
      "branchProposalPolicy",
      "permissionBoundary",
      "replayMigrationPlan",
      "observabilityPlan",
      "toolSurfaceReadiness",
      "evaluationPlan",
    ]);
    expect(result.digitalTwinChangeContract.risks.map((risk) => risk.riskId)).toContain(
      "context-plan-v2.required-user-decisions",
    );
    expect(result.digitalTwinChangeContract.requiredUserDecisions?.map((decision) => decision.domain)).toEqual([
      "DATA",
      "LOGIC",
      "ACTION",
      "TECHNOLOGY",
      "GOVERNANCE",
    ]);
    expect(result.digitalTwinChangeContract.requiredUserDecisions?.every((decision) => decision.status === "open")).toBe(true);
    expect(result.reviewBeforeMutationApproval.requiredUserDecisions.map((decision) => decision.label)).toContain(
      "Approve GOVERNANCE and validation boundary",
    );
    expect(result.reviewBeforeMutationApproval.approvalInstruction).toContain(
      "not approval for ontology/schema/reference-pack writeback",
    );
  });

  test("drafts V3 DTC with SECURITY lane evidence while staying advisory-only", () => {
    const projectIndex = {
      projectRoot: "/repo",
      indexRef: "INDEX.md",
      authorityRefs: ["ontology/shared-core"],
      runtimeSurfaceRefs: ["bridge/handlers/pm-semantic-intent-gate.ts"],
      validationRefs: ["tests/lib/context-engineering/dtc-from-context-plan.test.ts"],
      sourceRefs: ["BROWSE.md"],
    };
    const contextEngineeringPlan = buildContextEngineeringPlanV3({
      semanticIntentContract: semantic,
      fdeSession: {
        ...fdeSession,
        objectCandidates: [
          { candidateId: "object-1", plainName: "Decision", whyItMayMatter: "", evidenceRefs: [] },
        ],
        functionCandidates: [
          { candidateId: "fn-1", plainName: "ComputeDecision", logicIntent: "", evidenceRefs: [] },
        ],
      },
      projectIndex,
    });

    const result = draftDtcFromContextPlanV3({
      semanticIntentContract: semantic,
      fdeSession,
      contextEngineeringPlan,
      projectIndex,
    });

    expect(result.digitalTwinChangeContract.status).toBe("draft");
    expect(result.digitalTwinChangeContract.changeBoundary).toContain("SECURITY");
    expect(result.digitalTwinChangeContract.permissionBoundary).toContain(
      "No review card, lane, mirror, or DTC draft grants mutation authority",
    );
    expect(result.digitalTwinChangeContract.structuredBoundary?.changeBoundary.evidenceRefs).toContain(
      "INDEX.md",
    );
    expect(result.digitalTwinChangeContract.requiredUserDecisions?.map((decision) => String(decision.domain))).toContain(
      "SECURITY",
    );
    expect(result.digitalTwinChangeContract.risks.map((risk) => risk.riskId)).toContain(
      "context-plan-v3.security-lane-advisory-only",
    );
    expect(result.reviewBeforeMutationApproval.laneBoundaries.map((lane) => lane.lane)).toEqual([
      "DATA",
      "LOGIC",
      "ACTION",
      "SECURITY",
    ]);
    expect(result.reviewBeforeMutationApproval.laneBoundaries.every((lane) => lane.advisoryOnly)).toBe(true);
    expect(
      result.reviewBeforeMutationApproval.laneBoundaries.every(
        (lane) => lane.mutationAuthorizedFromCard === false,
      ),
    ).toBe(true);
    expect(result.reviewBeforeMutationApproval.approvalInstruction).toContain(
      "not approval for ontology/schema/reference-pack writeback",
    );
  });
});

// ---------------------------------------------------------------------------
// Slice D: the synthesized DTC must pass validateDigitalTwinChangeContract for
// ontology-affecting changes (closing G11). The draft stays 'draft'; we flip to
// 'approved' here ONLY to exercise the validator's approval gates (the real flip
// is gated by the TECHNOLOGY decision + grading, out of this slice's scope).
// ---------------------------------------------------------------------------

const projectIndexBase = {
  projectRoot: "/repo",
  indexRef: "INDEX.md",
  authorityRefs: ["ontology/shared-core"],
  runtimeSurfaceRefs: ["bridge/handlers/pm-semantic-intent-gate.ts"],
  validationRefs: ["tests/lib/context-engineering/dtc-from-context-plan.test.ts"],
  sourceRefs: ["BROWSE.md"],
};

/** Flip a draft DTC to approved with stub approvals — the only build-field-independent gates. */
function approveForValidation(draft: DigitalTwinChangeContract): DigitalTwinChangeContract {
  return {
    ...draft,
    status: "approved",
    approvalRef: "user:approved:dtc-build-stub",
    requiredUserDecisions: (draft.requiredUserDecisions ?? []).map((decision) => ({
      ...decision,
      status: "approved" as const,
      approvalRef: `user:approved:${decision.decisionId}`,
    })),
  };
}

/** Issue fields that are legitimately the user's job (approval/open decisions), NOT this slice's. */
const ALLOWED_OPEN_FIELDS = new Set([
  "status",
  "approvalRef",
  "requiredUserDecisions",
  "semanticConsistencyRefs",
]);

/** Build-field issue prefixes this slice MUST never produce. */
const FORBIDDEN_ISSUE_PREFIXES = [
  "touchedOntologyRefs",
  "requiredEvaluationRefs",
  "fillPolicy",
  "ontologyDtcBuildReadiness",
  "ontologyDtcBuildSequence",
];

function blockingIssueFields(contract: DigitalTwinChangeContract): readonly string[] {
  return validateDigitalTwinChangeContract(contract)
    .issues.filter((issue) => issue.severity !== "advisory")
    .map((issue) => issue.field);
}

describe("draftDtcFromContextPlan: synthesized DTC passes validateDigitalTwinChangeContract (Slice D)", () => {
  test("V2 with structured SIC refs: fused build fields satisfy both validators", () => {
    const plan = buildContextEngineeringPlanV2({
      semanticIntentContract: semanticStructured,
      fdeSession,
      projectIndex: projectIndexBase,
    });
    const draft = draftDtcFromContextPlanV2({
      semanticIntentContract: semanticStructured,
      fdeSession,
      contextEngineeringPlan: plan,
      projectIndex: projectIndexBase,
    }).digitalTwinChangeContract;

    // Draft stays 'draft' — never auto-approved by the producer.
    expect(draft.status).toBe("draft");
    // fillPolicy clears the contracts.ts typed-ref block + the readiness requirePolicy push.
    expect(draft.fillPolicy).toBe("ontology-dtc-build");

    // (a) touchedOntologyRefs are STRUCTURED objects (not .map(String) strings), and carry
    //     all four required kinds from the approved SIC refs directly.
    const touched = draft.touchedOntologyRefs ?? [];
    expect(touched.length).toBeGreaterThan(0);
    expect(touched.every((ref) => typeof ref === "object" && ref !== null)).toBe(true);
    const kinds = new Set(touched.map((ref) => ref.kind));
    for (const kind of ["ObjectType", "LinkType", "ActionType", "Function"]) {
      expect(kinds.has(kind as never)).toBe(true);
    }
    // The SIC's exact rid survives the fusion unchanged.
    expect(touched.some((ref) => ref.rid === "ri.ontology.main.object-type.scene3d")).toBe(true);

    // (e) 7-entry sequence, all synthesized-from-SIC.
    const sequence = draft.ontologyDtcBuildSequence ?? [];
    expect(sequence.length).toBe(7);

    // (d) synthetic readiness ready-for-dtc with per-kind arrays from the SIC refs.
    const readiness = draft.ontologyDtcBuildReadiness as Record<string, unknown>;
    expect(readiness["readinessVerdict"]).toBe("ready-for-dtc");
    expect(readiness["objectTypeRefs"]).toEqual(["ri.ontology.main.object-type.scene3d"]);
    expect(readiness["semanticTermRefs"]).toEqual(["term:scene3d", "mapping:scene3d"]);

    // SUB-GATE 1: contracts validator passes once user-job approvals are stubbed.
    const approved = approveForValidation(draft);
    expect(validateDigitalTwinChangeContract(approved).valid).toBe(true);

    // SUB-GATE 1 (governance side): isDtcFillIncomplete (reached via the public entry)
    // must NOT block — readinessVerdict 'ready-for-dtc' satisfies it.
    const governance = evaluatePreMutationGovernanceV2({
      toolName: "Write",
      toolInput: { file_path: "ontology/data/scene3d.ts" },
      targetFiles: ["ontology/data/scene3d.ts"],
      digitalTwinChangeContract: approved,
      digitalTwinChangeContractRef: approved.contractId,
    });
    expect(governance.reasonCode).not.toBe("protected_mutation_dtc_fill_incomplete");
    expect(governance.decision).toBe("allow");
  });

  test("V3 with structured SIC refs: synthesized DTC validates", () => {
    const plan = buildContextEngineeringPlanV3({
      semanticIntentContract: semanticStructured,
      fdeSession,
      projectIndex: projectIndexBase,
    });
    const draft = draftDtcFromContextPlanV3({
      semanticIntentContract: semanticStructured,
      fdeSession,
      contextEngineeringPlan: plan,
      projectIndex: projectIndexBase,
    }).digitalTwinChangeContract;

    expect(draft.status).toBe("draft");
    expect(draft.fillPolicy).toBe("ontology-dtc-build");
    expect((draft.touchedOntologyRefs ?? []).every((ref) => typeof ref === "object")).toBe(true);
    expect((draft.ontologyDtcBuildSequence ?? []).length).toBe(7);

    expect(validateDigitalTwinChangeContract(approveForValidation(draft)).valid).toBe(true);
  });

  test("Q5 fallback: no resolver packs -> non-applicable-with-evidence, NO invented rids", () => {
    // `semantic` carries no structured refs and no project-scope validation pack matches,
    // so the resolver yields zero requiredEvaluationRefs. Q5: record honestly, never mint a pack.
    const plan = buildContextEngineeringPlanV2({
      semanticIntentContract: semantic,
      fdeSession,
      projectIndex: projectIndexBase,
    });
    const draft = draftDtcFromContextPlanV2({
      semanticIntentContract: semantic,
      fdeSession,
      contextEngineeringPlan: plan,
      projectIndex: projectIndexBase,
    }).digitalTwinChangeContract;

    // No invented ValidationPack rids anywhere.
    expect(draft.requiredEvaluationRefs ?? []).toEqual([]);
    const readiness = draft.ontologyDtcBuildReadiness as Record<string, unknown>;
    expect(readiness["evaluationRefs"]).toEqual([]);

    // Eval (and the absent typed kinds) are explicitly non-applicable WITH evidence.
    const nonApplicableKinds = readiness["nonApplicablePrimitiveKinds"] as readonly string[];
    const evidence = readiness["nonApplicableEvidenceRefs"] as readonly string[];
    expect(nonApplicableKinds).toContain("Eval");
    expect(nonApplicableKinds).toContain("ObjectType");
    expect(evidence.length).toBeGreaterThan(0);
    // The evidence marker references the SIC, not a fabricated pack rid.
    expect(evidence.every((ref) => !ref.startsWith("ri.ontology.main.validation-pack."))).toBe(true);

    // Still validates via the non-applicable bypass (fillPolicy clears the typed-ref + eval blocks).
    expect(validateDigitalTwinChangeContract(approveForValidation(draft)).valid).toBe(true);
  });

  test("any remaining blocking issues are user-job approvals only, never build fields", () => {
    // Approve the DTC fully — the ONLY blocking issues that may remain must be in the
    // allow-list (approval/open-decision/semantic), NEVER touchedOntologyRefs / requiredEvaluationRefs
    // / fillPolicy / readiness / sequence (those are this slice's responsibility and must be clean).
    const plan = buildContextEngineeringPlanV2({
      semanticIntentContract: semanticStructured,
      fdeSession,
      projectIndex: projectIndexBase,
    });
    const draft = draftDtcFromContextPlanV2({
      semanticIntentContract: semanticStructured,
      fdeSession,
      contextEngineeringPlan: plan,
      projectIndex: projectIndexBase,
    }).digitalTwinChangeContract;

    // Before approval the only blocker is the open-decision/approval gate — assert no build-field blocker.
    const draftBlockers = blockingIssueFields(draft);
    for (const field of draftBlockers) {
      const isForbidden = FORBIDDEN_ISSUE_PREFIXES.some((prefix) => field.startsWith(prefix));
      expect(isForbidden).toBe(false);
      expect(ALLOWED_OPEN_FIELDS.has(field)).toBe(true);
    }

    // After stub approval, zero blocking issues remain.
    expect(blockingIssueFields(approveForValidation(draft))).toEqual([]);
  });

  test("blocking gate: synthesized DTC carries semanticConsistencyRefs so the blocking-mode validator agrees", () => {
    const prev = process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE;
    process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE = "blocking";
    try {
      const plan = buildContextEngineeringPlanV2({
        semanticIntentContract: semanticStructured,
        fdeSession,
        projectIndex: projectIndexBase,
      });
      const draft = draftDtcFromContextPlanV2({
        semanticIntentContract: semanticStructured,
        fdeSession,
        contextEngineeringPlan: plan,
        projectIndex: projectIndexBase,
      }).digitalTwinChangeContract;

      // The producer sets the top-level field validateDigitalTwinChangeContract reads —
      // mirroring the readiness semanticTermRefs (term:/mapping: from the SIC).
      expect(draft.semanticConsistencyRefs).toEqual(["term:scene3d", "mapping:scene3d"]);

      // In blocking mode the semanticConsistencyRefs issue is BLOCKING, not advisory — yet the
      // synthesized+approved DTC produces no such blocker (both validators now agree).
      const blockers = blockingIssueFields(approveForValidation(draft));
      expect(blockers).not.toContain("semanticConsistencyRefs");
      expect(validateDigitalTwinChangeContract(approveForValidation(draft)).valid).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE;
      else process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE = prev;
    }
  });

  test("blocking gate, Q5 fallback: non-applicable evidence marker satisfies the blocking-mode validator", () => {
    const prev = process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE;
    process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE = "blocking";
    try {
      // `semantic` has no canonical-term / term-mapping refs, so semanticTermRefs is empty —
      // the producer falls back to the SemanticConsistency non-applicable evidence marker.
      const plan = buildContextEngineeringPlanV2({
        semanticIntentContract: semantic,
        fdeSession,
        projectIndex: projectIndexBase,
      });
      const draft = draftDtcFromContextPlanV2({
        semanticIntentContract: semantic,
        fdeSession,
        contextEngineeringPlan: plan,
        projectIndex: projectIndexBase,
      }).digitalTwinChangeContract;

      expect(draft.semanticConsistencyRefs).toEqual([
        `evidence:non-applicable:synthesized-from-sic:${semantic.contractId}`,
      ]);
      expect(blockingIssueFields(approveForValidation(draft))).not.toContain(
        "semanticConsistencyRefs",
      );
      expect(validateDigitalTwinChangeContract(approveForValidation(draft)).valid).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE;
      else process.env.PALANTIR_MINI_SEMANTIC_CONSISTENCY_GATE = prev;
    }
  });
});
