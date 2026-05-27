import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  assessContractGate,
  createUserApprovalRef,
  deriveWorkContractFromContracts,
  draftDigitalTwinChangeContract,
  draftSemanticIntentContract,
  isOntologyAffectingDtc,
  isReadOnlyIntent,
  projectRoutingFromContracts,
  validateDigitalTwinChangeContract,
  validateRouterBinding,
  validateSemanticIntentContract,
  validateWorkContract,
} from "../../../lib/lead-intent/contracts";
import type {
  DigitalTwinChangeContract,
  RouterBinding,
  SemanticIntentContract,
  WorkContract,
} from "../../../lib/lead-intent/contracts";
import {
  CONTEXT_ENGINEERING_TO_SIC_POLICY,
  advanceContextEngineeringToSicSequence,
} from "../../../lib/semantic-intent/context-engineering-sic-fill-sequence";
import {
  ONTOLOGY_DTC_BUILD_POLICY,
  advanceOntologyDTCBuildSequence,
} from "../../../lib/semantic-intent/ontology-dtc-build-sequence";

function approvedSemantic(): SemanticIntentContract {
  return {
    contractId: "semantic-intent:test",
    status: "approved",
    rawIntent: "Implement Scene3D ontology and runtime support",
    confirmedIntent: "Add Scene3D as an additive 3D primitive path.",
    nonGoals: ["Do not widen SceneV4."],
    approvedNouns: ["Scene3D", "geometry3D"],
    approvedVerbs: ["author", "render", "evaluate"],
    affectedSurfaces: ["ontology/data/visual3D.ts", "src/lib/jsxGraph3D"],
    permissionsAndProposal: "Use a separate PR proposal before runtime edits.",
    acceptedRisks: [],
    downstreamAllowed: ["Route implementation after DigitalTwinChangeContract approval."],
    downstreamForbidden: ["Do not add R3F in the first proof slice."],
    clarificationQuestions: [],
    approvalRef: "user:approved:test",
  };
}

function baseApprovedDigitalTwin(): DigitalTwinChangeContract {
  return {
    contractId: "digital-twin:test",
    status: "approved",
    semanticIntentContractRef: "semantic-intent:test",
    affectedSurfaces: ["ontology/data/visual3D.ts", "src/lib/jsxGraph3D"],
    changeBoundary: "Scene3D and renderer proof only.",
    branchProposalPolicy: "Use proposal PR before merge.",
    permissionBoundary: "No production publish without QA signoff.",
    replayMigrationPlan: "No data migration in first proof; replay fixtures are additive.",
    observabilityPlan: "Emit contract gate and QA events.",
    toolSurfaceReadiness: "Codex uses Playwright MCP here; Playwright QA is a follow-up gate.",
    evaluationPlan: "TypeScript, router tests, runtime smoke, visual QA.",
    // typed refs required: affectedSurfaces includes ontology/ → isOntologyAffectingDtc() = true
    touchedOntologyRefs: [
      { kind: "ObjectType", rid: "ri.ontology.main.object-type.scene3d", confidence: "exact" },
    ],
    requiredEvaluationRefs: [
      {
        kind: "ValidationPack",
        rid: "ri.ontology.main.validation-pack.scene3d-v1",
        confidence: "exact",
      },
    ],
    risks: [
      {
        riskId: "risk.tool-surface",
        kind: "tool-surface",
        status: "accepted",
        description: "Playwright MCP tools may need lazy-loading in the current runtime.",
        mitigation: "Use Playwright MCP tools or repo Playwright scripts.",
        designAlternative: "Repo QA scripts plus headed browser pass.",
      },
    ],
    approvalRef: "user:approved:test",
  };
}

function completeOntologyDtc(contract: DigitalTwinChangeContract): DigitalTwinChangeContract {
  const originalAffectedSurfaces = contract.affectedSurfaces;
  let next = contract;
  next = advanceOntologyDTCBuildSequence(
    next,
    0,
    "ObjectType:PluginCapability,ObjectType:WorkflowContract",
  ).dtcDraft;
  next = advanceOntologyDTCBuildSequence(
    next,
    1,
    "LinkType:contract-authorizes-route,LinkType:evidence-supports-authority",
  ).dtcDraft;
  next = advanceOntologyDTCBuildSequence(
    next,
    2,
    "ActionType:start-workflow,ActionType:approve-dtc",
  ).dtcDraft;
  next = advanceOntologyDTCBuildSequence(
    next,
    3,
    "Function:validate-release,Function:route-after-approval",
  ).dtcDraft;
  next = advanceOntologyDTCBuildSequence(
    next,
    4,
    "ApplicationState:workflow-review,ChatbotSurface:turn-card-rendering",
  ).dtcDraft;
  next = advanceOntologyDTCBuildSequence(
    next,
    5,
    "Replay additive fixtures | Observe workflow lineage | Eval release gate || ValidationPack:meta-ontology-completion",
  ).dtcDraft;
  next = advanceOntologyDTCBuildSequence(next, 6, "ready-for-dtc").dtcDraft;
  return {
    ...next,
    affectedSurfaces: originalAffectedSurfaces,
  };
}

function approvedDigitalTwin(): DigitalTwinChangeContract {
  return completeOntologyDtc(baseApprovedDigitalTwin());
}

describe("Lead Intent -> Digital Twin contracts", () => {
  test("no edits and no mutation phrases remain read-only", () => {
    expect(isReadOnlyIntent("Review the prompt-to-DTC plan. No edits. Wait.")).toBe(true);
    expect(isReadOnlyIntent("Audit the runtime state; no mutation, no code edits.")).toBe(true);
    expect(
      isReadOnlyIntent("Implement the prompt-front-door store. Do not edit hook wiring."),
    ).toBe(false);
  });

  test("read-only 3D triage does not require contracts", () => {
    const result = assessContractGate({
      intent: "Read-only triage of the palantir-math 3D swift-spinning-teapot plan and wait",
      scopePaths: ["ontology/data/visual3D.ts", "docs/proposals/runtime-blueprint.md"],
      complexityHint: "cross-cutting",
    });

    expect(result.status).toBe("not_required");
    expect(result.allowsRouting).toBe(true);
    expect(result.contractPolicy).toBe("ambient");
    expect(result.riskClass).toBe("semantic");
    expect(result.requiredContracts).toEqual([]);
    expect(result.recommendedContracts).toEqual([
      "SemanticIntentContract",
      "DigitalTwinChangeContract",
    ]);
  });

  test("complex ontology-affecting 3D implementation requires both contracts", () => {
    const result = assessContractGate({
      intent: "Implement Scene3D ontology, geometry3D, renderer, and Visual Editor migration",
      scopePaths: [
        "ontology/data/visual3D.ts",
        "ontology/changeContracts.ts",
        "src/lib/jsxGraph3D/scene3DCompiler.ts",
      ],
      complexityHint: "cross-cutting",
    });

    expect(result.status).toBe("contract_required");
    expect(result.allowsRouting).toBe(false);
    expect(result.requiredContracts).toEqual([
      "SemanticIntentContract",
      "DigitalTwinChangeContract",
    ]);
    expect(result.questions.map((q) => q.questionId)).toContain(
      "digital-twin.confirm-3d-primitive-path",
    );
  });

  test("single-file ontology-affecting execution still requires approval contracts", () => {
    const result = assessContractGate({
      intent: "Edit the SemanticIntentContract gate for ontology execution",
      scopePaths: [".claude/plugins/palantir-mini/lib/lead-intent/contracts.ts"],
      complexityHint: "single-file",
    });

    expect(result.status).toBe("contract_required");
    expect(result.allowsRouting).toBe(false);
    expect(result.contractPolicy).toBe("approval-required");
    expect(result.requiredContracts).toEqual([
      "SemanticIntentContract",
      "DigitalTwinChangeContract",
    ]);
  });

  test("approved inline contracts allow routing", () => {
    const result = assessContractGate({
      intent: "Implement Scene3D ontology, geometry3D, renderer, and Visual Editor migration",
      scopePaths: [
        "ontology/data/visual3D.ts",
        "ontology/changeContracts.ts",
        "src/lib/jsxGraph3D/scene3DCompiler.ts",
      ],
      complexityHint: "cross-cutting",
      semanticIntentContract: approvedSemantic(),
      digitalTwinChangeContract: approvedDigitalTwin(),
    });

    expect(result.status).toBe("pass");
    expect(result.allowsRouting).toBe(true);
  });

  test("approved SIC with context-engineering-to-sic policy fails before T0-T5 readiness", () => {
    const contract = {
      ...approvedSemantic(),
      fillPolicy: CONTEXT_ENGINEERING_TO_SIC_POLICY,
    } as unknown as SemanticIntentContract;

    const result = validateSemanticIntentContract(contract);
    const fields = result.issues.map((issue) => issue.field);

    expect(result.valid).toBe(false);
    expect(fields).toContain("fillSequence");
    expect(fields).toContain("contextEngineeringReadiness.dataEvidenceRefs");
    expect(fields).toContain("contextEngineeringReadiness.logicRefs");
    expect(fields).toContain("contextEngineeringReadiness.actionRefs");
    expect(fields).toContain("contextEngineeringReadiness.governanceRefs");
    expect(fields).toContain("contextEngineeringReadiness.readinessVerdict");
  });

  test("approved SIC with completed context-engineering-to-sic readiness validates", () => {
    let contract = approvedSemantic();
    contract = advanceContextEngineeringToSicSequence(
      contract,
      0,
      "Complete Meta Ontology deterministic enforcement || Do not edit generated mirrors",
    );
    contract = advanceContextEngineeringToSicSequence(
      contract,
      1,
      "EvidenceSource:palantir-official, .claude/plugins/palantir-mini",
    );
    contract = advanceContextEngineeringToSicSequence(
      contract,
      2,
      "pm_semantic_intent_gate, pm_workflow_response_validate",
    );
    contract = advanceContextEngineeringToSicSequence(
      contract,
      3,
      "pm_intent_router, pm_plugin_self_check | generated mirror direct edits",
    );
    contract = advanceContextEngineeringToSicSequence(
      contract,
      4,
      "permission:approved-boundary, provenance:events.jsonl, eval:release-self-check",
    );
    contract = advanceContextEngineeringToSicSequence(contract, 5, "ready-for-sic");

    expect(validateSemanticIntentContract(contract).valid).toBe(true);
  });

  test("approved DTC with ontology-dtc-build policy fails before T0-T6 readiness", () => {
    const contract = {
      ...baseApprovedDigitalTwin(),
      fillPolicy: ONTOLOGY_DTC_BUILD_POLICY,
    } as unknown as DigitalTwinChangeContract;

    const result = validateDigitalTwinChangeContract(contract);
    const fields = result.issues.map((issue) => issue.field);

    expect(result.valid).toBe(false);
    expect(fields).toContain("ontologyDtcBuildSequence");
    expect(fields).toContain("ontologyDtcBuildReadiness.linkTypeRefs");
    expect(fields).toContain("ontologyDtcBuildReadiness.actionTypeRefs");
    expect(fields).toContain("ontologyDtcBuildReadiness.functionRefs");
    expect(fields).toContain("ontologyDtcBuildReadiness.applicationStateRefs");
    expect(fields).toContain("ontologyDtcBuildReadiness.evaluationRefs");
    expect(fields).toContain("ontologyDtcBuildReadiness.readinessVerdict");
  });

  test("approved DTC with completed ontology-dtc-build readiness validates", () => {
    let contract = {
      ...baseApprovedDigitalTwin(),
      touchedOntologyRefs: [],
      requiredEvaluationRefs: [],
    } as DigitalTwinChangeContract;
    contract = completeOntologyDtc(contract);

    expect(validateDigitalTwinChangeContract(contract).valid).toBe(true);
  });

  test("approved ontology-affecting DTC with legacy/default fill fails closed before ontology-dtc-build", () => {
    const contract = baseApprovedDigitalTwin();
    const result = validateDigitalTwinChangeContract(contract);
    const fields = result.issues.map((issue) => issue.field);

    expect(result.valid).toBe(false);
    expect(fields).toContain("fillPolicy");
  });

  test("explicit non-applicable evidence can close primitive readiness fields", () => {
    const contract = {
      ...baseApprovedDigitalTwin(),
      fillPolicy: ONTOLOGY_DTC_BUILD_POLICY,
      touchedOntologyRefs: [],
      requiredEvaluationRefs: [],
      ontologyDtcBuildSequence: Array.from({ length: 7 }, (_, index) => ({
        step: index + 1,
        question: `T${index}`,
        filledAt: "2026-05-27T00:00:00.000Z",
        source: "agent" as const,
      })),
      ontologyDtcBuildReadiness: {
        objectTypeRefs: [],
        linkTypeRefs: [],
        actionTypeRefs: [],
        functionRefs: [],
        applicationStateRefs: [],
        evaluationRefs: [],
        nonApplicablePrimitiveKinds: [
          "ObjectType",
          "LinkType",
          "ActionType",
          "Function",
          "ApplicationState",
          "Eval",
        ],
        nonApplicableEvidenceRefs: ["evidence:non-applicable:docs-only-dtc"],
        readinessVerdict: "ready-for-dtc" as const,
      },
    } as unknown as DigitalTwinChangeContract;

    expect(validateDigitalTwinChangeContract(contract).valid).toBe(true);
  });

  test("structured approval refs validate while legacy string refs stay valid", () => {
    const approvalRef = createUserApprovalRef({
      promptId: "prompt:test",
      promptHash: "abc123def4567890",
      sessionId: "session:test",
      runtime: "codex",
      userVisibleSummary: "Approve the semantic meaning but do not execute mutation.",
      userAnswer: "Yes, approve this meaning. Keep runtime blocking out of scope.",
      approvalSurface: "semantic-intent",
      approvedAt: "2026-05-10T11:00:00.000Z",
    });

    const structured = approvedSemantic();
    structured.approvalRef = approvalRef;
    const legacy = approvedSemantic();
    legacy.approvalRef = "user:approved:test";

    expect(approvalRef.userVisibleSummaryHash).toMatch(/^sha256:/);
    expect(approvalRef.userAnswerExcerpt).toContain("approve this meaning");
    expect(validateSemanticIntentContract(structured).valid).toBe(true);
    expect(validateSemanticIntentContract(legacy).valid).toBe(true);
  });

  test("structured approval refs require prompt identity and user-visible summary hash", () => {
    const approvalRef = createUserApprovalRef({
      promptId: "prompt:test",
      promptHash: "abc123def4567890",
      sessionId: "session:test",
      runtime: "codex",
      userVisibleSummary: "Approve the Digital Twin boundary.",
      userAnswer: "Approved.",
      approvalSurface: "digital-twin-change",
      approvedAt: "2026-05-10T11:00:00.000Z",
    });

    const digitalTwin = approvedDigitalTwin();
    digitalTwin.approvalRef = {
      ...approvalRef,
      promptId: "",
      userVisibleSummaryHash: "",
    };
    const result = validateDigitalTwinChangeContract(digitalTwin);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.field)).toContain("approvalRef.promptId");
    expect(result.issues.map((issue) => issue.field)).toContain(
      "approvalRef.userVisibleSummaryHash",
    );
  });

  test("structured Digital Twin boundary is validated when present", () => {
    const contract = approvedDigitalTwin();
    contract.structuredBoundary = {
      changeBoundary: {
        value: "Wave 1 library only.",
        status: "approved",
        rationale: "User approved Wave 1 scope.",
        approvalRef: "user:approved:test",
      },
      branchProposalPolicy: {
        value: "Separate PR.",
        status: "approved",
        rationale: "Rollbackable slice.",
        approvalRef: "user:approved:test",
      },
      permissionBoundary: {
        value: "No direct home plugin writes.",
        status: "approved",
        rationale: "Worktree-only edits.",
        approvalRef: "user:approved:test",
      },
      replayMigrationPlan: {
        value: "No migration.",
        status: "not-applicable",
        rationale: "Additive library only.",
      },
      observabilityPlan: {
        value: "Unit test verification.",
        status: "mitigated",
        rationale: "No hook emissions in Wave 1.",
      },
      toolSurfaceReadiness: {
        value: "Bun tests cover Wave 1.",
        status: "accepted-risk",
        rationale: "No runtime hook surface yet.",
        designAlternative: "Defer hook smoke to Wave 2.",
      },
      evaluationPlan: {
        value: "Targeted unit tests.",
        status: "approved",
        rationale: "Covers structured boundary validation.",
        approvalRef: "user:approved:test",
      },
    };

    expect(validateDigitalTwinChangeContract(contract).valid).toBe(true);
  });

  test("approved DTC with blocking required user decisions open fails validation", () => {
    const contract = approvedDigitalTwin();
    contract.requiredUserDecisions = [
      {
        decisionId: "decision:data",
        domain: "DATA",
        label: "Approve DATA boundary",
        status: "open",
        blocking: true,
        evidenceRefs: ["context-plan:data"],
      },
    ];

    const result = validateDigitalTwinChangeContract(contract);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      field: "requiredUserDecisions",
      message: "1 blocking required user decision(s) remain open: DATA",
    });
  });

  test("approved DTC passes required decision validation when blocking decisions are closed", () => {
    const contract = approvedDigitalTwin();
    contract.requiredUserDecisions = [
      {
        decisionId: "decision:data",
        domain: "DATA",
        label: "Approve DATA boundary",
        status: "approved",
        blocking: true,
        evidenceRefs: ["context-plan:data"],
        approvalRef: "user:approved:data",
      },
      {
        decisionId: "decision:technology",
        domain: "TECHNOLOGY",
        label: "Accept TECHNOLOGY mirror-only risk",
        status: "accepted-risk",
        blocking: true,
        evidenceRefs: ["context-plan:technology"],
        acceptedRiskRef: "user:accepted-risk:technology",
      },
    ];

    expect(validateDigitalTwinChangeContract(contract).valid).toBe(true);
  });

  test("approved inline contracts project routing from semantic fields", () => {
    const projection = projectRoutingFromContracts({
      intent: "Research docs and plan for a palantir-math 3D migration",
      scopePaths: ["docs/proposals/3d-plan.md"],
      complexityHint: "cross-cutting",
      semanticIntentContract: approvedSemantic(),
      digitalTwinChangeContract: approvedDigitalTwin(),
    });

    expect(projection.basis).toBe("approved-inline-contracts");
    expect(projection.hasContractFields).toBe(true);
    expect(projection.intent).toContain("Approved nouns: Scene3D, geometry3D");
    expect(projection.intent).toContain("Do not widen SceneV4");
    expect(projection.scopePaths).toContain("ontology/data/visual3D.ts");
    expect(projection.scopePaths).not.toContain("docs/proposals/3d-plan.md");
  });

  test("unresolved refs do not provide routing authority until dereferenced", () => {
    const projection = projectRoutingFromContracts({
      intent: "Implement the approved palantir-math ontology migration",
      scopePaths: ["ontology/changeContracts.ts"],
      complexityHint: "cross-cutting",
      semanticIntentContractRef: "semantic-intent:approved:test",
      digitalTwinChangeContractRef: "digital-twin-change:approved:test",
    });

    expect(projection.basis).toBe("unresolved-contract-refs");
    expect(projection.hasContractFields).toBe(false);
    expect(projection.rationale).toContain("no approved contract fields");
  });

  test("draft inline contracts block for clarification", () => {
    const semantic = draftSemanticIntentContract({
      intent: "Implement Scene3D ontology and renderer",
      scopePaths: ["ontology/data/visual3D.ts", "src/lib/jsxGraph3D"],
      complexityHint: "cross-cutting",
    });
    const digitalTwin = draftDigitalTwinChangeContract(
      {
        intent: "Implement Scene3D ontology and renderer",
        scopePaths: ["ontology/data/visual3D.ts", "src/lib/jsxGraph3D"],
        complexityHint: "cross-cutting",
      },
      semantic.contractId,
    );

    const result = assessContractGate({
      intent: "Implement Scene3D ontology and renderer",
      scopePaths: ["ontology/data/visual3D.ts", "src/lib/jsxGraph3D"],
      complexityHint: "cross-cutting",
      semanticIntentContract: semantic,
      digitalTwinChangeContract: digitalTwin,
    });

    expect(result.status).toBe("blocked_for_clarification");
    expect(result.semanticIntent.valid).toBe(false);
    expect(result.digitalTwin.valid).toBe(false);
  });

  test("ambient drafts carry semantic evidence without blocking questions", () => {
    const semantic = draftSemanticIntentContract({
      intent: "Read-only triage of the palantir-math 3D plan and wait",
      scopePaths: ["ontology/data/visual3D.ts"],
      complexityHint: "cross-cutting",
    });
    const digitalTwin = draftDigitalTwinChangeContract(
      {
        intent: "Read-only triage of the palantir-math 3D plan and wait",
        scopePaths: ["ontology/data/visual3D.ts"],
        complexityHint: "cross-cutting",
      },
      semantic.contractId,
    );

    expect(semantic.clarificationQuestions).toEqual([]);
    expect(semantic.downstreamForbidden).toContain(
      "Do not treat this ambient draft as user-approved meaning.",
    );
    expect(digitalTwin.changeBoundary).toContain("Ambient prompt capture only");
    expect(digitalTwin.risks).toEqual([
      {
        riskId: "risk.ambient-capture",
        kind: "evaluation",
        status: "not-applicable",
        description:
          "Ambient prompt capture records future semantic evidence without approving runtime change.",
      },
    ]);
  });

  test("WorkContract derives from approved SIC/DTC without becoming approval authority", () => {
    const semantic = approvedSemantic();
    const digitalTwin = approvedDigitalTwin();
    const work = deriveWorkContractFromContracts({
      contractId: "work-contract:test",
      semanticIntentContract: semantic,
      digitalTwinChangeContract: digitalTwin,
      workSummary: "Implement the approved Scene3D proof slice.",
    });

    expect(work.status).toBe("bound");
    expect(work.bindingMode).toBe("derived-from-approved-contracts");
    expect(work.semanticIntentContractRef).toBe(semantic.contractId);
    expect(work.digitalTwinChangeContractRef).toBe(digitalTwin.contractId);
    expect(work.scopePaths).toEqual([
      "ontology/data/visual3D.ts",
      "src/lib/jsxGraph3D",
    ]);
    expect(validateWorkContract(work, {
      semanticIntentContract: semantic,
      digitalTwinChangeContract: digitalTwin,
    }).valid).toBe(true);
  });

  test("WorkContract validation rejects mismatched refs and scope outside SIC/DTC", () => {
    const semantic = approvedSemantic();
    const digitalTwin = approvedDigitalTwin();
    const work: WorkContract = {
      ...deriveWorkContractFromContracts({
        contractId: "work-contract:test",
        semanticIntentContract: semantic,
        digitalTwinChangeContract: digitalTwin,
      }),
      semanticIntentContractRef: "semantic-intent:other",
      scopePaths: ["ontology/data/visual3D.ts", "src/runtime/out-of-scope.ts"],
    };

    const result = validateWorkContract(work, {
      semanticIntentContract: semantic,
      digitalTwinChangeContract: digitalTwin,
    });
    const fields = result.issues.map((issue) => issue.field);

    expect(result.valid).toBe(false);
    expect(fields).toContain("semanticIntentContractRef");
    expect(fields).toContain("scopePaths");
  });

  test("RouterBinding attaches router output refs to contract refs", () => {
    const binding: RouterBinding = {
      bindingId: "router-binding:test",
      status: "attached",
      source: "pm_intent_router",
      delegationMode: "lead-direct",
      semanticIntentContractRef: "semantic-intent:test",
      digitalTwinChangeContractRef: "digital-twin:test",
      workContractRef: "work-contract:test",
      routerBasis: "approved-inline-contracts",
      routerOutputRef: "pm-intent-router-output:test",
      attachedOutputRefs: ["contract-routing-projection:test"],
      rationale: "Attach router projection without replacing DelegationRecipe compatibility.",
    };

    expect(validateRouterBinding(binding, {
      semanticIntentContractRef: "semantic-intent:test",
      digitalTwinChangeContractRef: "digital-twin:test",
      workContractRef: "work-contract:test",
    }).valid).toBe(true);
  });

  test("RouterBinding delegated mode requires DelegationRecipe compatibility ref", () => {
    const binding: RouterBinding = {
      bindingId: "router-binding:test",
      status: "attached",
      source: "delegation-recipe",
      delegationMode: "delegated",
      semanticIntentContractRef: "semantic-intent:test",
      digitalTwinChangeContractRef: "digital-twin:test",
      attachedOutputRefs: [],
      rationale: "",
    };

    const result = validateRouterBinding(binding, {
      semanticIntentContractRef: "semantic-intent:test",
      digitalTwinChangeContractRef: "digital-twin:test",
    });
    const fields = result.issues.map((issue) => issue.field);

    expect(result.valid).toBe(false);
    expect(fields).toContain("attachedOutputRefs");
    expect(fields).toContain("delegationRecipeRef");
    expect(fields).toContain("rationale");
  });

  // ---------------------------------------------------------------------------
  // isOntologyAffectingDtc tests
  // ---------------------------------------------------------------------------
  describe("isOntologyAffectingDtc", () => {
    function baseDtc(): DigitalTwinChangeContract {
      return {
        contractId: "dtc:test-affecting",
        status: "approved",
        semanticIntentContractRef: "semantic-intent:test",
        affectedSurfaces: ["docs/proposals/spec.md"],
        changeBoundary: "Update documentation only.",
        branchProposalPolicy: "Standard PR.",
        permissionBoundary: "No production publish.",
        replayMigrationPlan: "No migration.",
        observabilityPlan: "No observability changes.",
        toolSurfaceReadiness: "N/A.",
        evaluationPlan: "Manual review.",
        risks: [],
        approvalRef: "user:approved:test",
      };
    }

    test("DTC with touchedOntologyRefs.length > 0 returns true", () => {
      const dtc = baseDtc();
      dtc.touchedOntologyRefs = [
        { kind: "ObjectType", rid: "ri.ontology.main.object-type.1", confidence: "exact" },
      ];
      expect(isOntologyAffectingDtc(dtc)).toBe(true);
    });

    test("DTC with permittedMutationSurfaces.length > 0 returns true", () => {
      const dtc = baseDtc();
      dtc.permittedMutationSurfaces = [
        {
          surfaceRef: {
            kind: "ProjectSurface",
            rid: "ri.ontology.main.project-surface.1",
            confidence: "exact",
          },
          mutationKind: "write",
        },
      ];
      expect(isOntologyAffectingDtc(dtc)).toBe(true);
    });

    test("DTC with changeBoundary matching SEMANTIC_INTENT_MARKERS returns true", () => {
      const dtc = baseDtc();
      dtc.changeBoundary = "Add new ObjectType for Scene3D geometry primitives.";
      expect(isOntologyAffectingDtc(dtc)).toBe(true);
    });

    test("DTC with affectedSurfaces matching SEMANTIC_SCOPE_MARKERS returns true", () => {
      const dtc = baseDtc();
      dtc.affectedSurfaces = ["ontology/data/visual3D.ts"];
      expect(isOntologyAffectingDtc(dtc)).toBe(true);
    });

    test("DTC purely touching docs/ with no semantic markers returns false", () => {
      const dtc = baseDtc();
      // affectedSurfaces = ["docs/proposals/spec.md"], changeBoundary = "Update documentation only."
      // no touchedOntologyRefs, no permittedMutationSurfaces, no structuredBoundary
      expect(isOntologyAffectingDtc(dtc)).toBe(false);
    });

    test("DTC with structuredBoundary.changeBoundary.value matching SEMANTIC_INTENT_MARKERS returns true", () => {
      const dtc = baseDtc();
      dtc.structuredBoundary = {
        changeBoundary: {
          value: "Extend ActionType surface for new replay migration flow.",
          status: "approved",
          rationale: "Needed for replay support.",
          approvalRef: "user:approved:test",
        },
        branchProposalPolicy: {
          value: "Standard PR.",
          status: "approved",
          rationale: "Default policy.",
          approvalRef: "user:approved:test",
        },
        permissionBoundary: {
          value: "No direct writes.",
          status: "approved",
          rationale: "Worktree isolation.",
          approvalRef: "user:approved:test",
        },
        replayMigrationPlan: {
          value: "No migration.",
          status: "not-applicable",
          rationale: "Additive only.",
        },
        observabilityPlan: {
          value: "Unit test coverage.",
          status: "mitigated",
          rationale: "Hook emissions in Wave 2.",
        },
        toolSurfaceReadiness: {
          value: "Bun tests cover Wave 1.",
          status: "accepted-risk",
          rationale: "No runtime hook surface yet.",
          designAlternative: "Defer hook smoke to Wave 2.",
        },
        evaluationPlan: {
          value: "Targeted unit tests.",
          status: "approved",
          rationale: "Covers structured boundary validation.",
          approvalRef: "user:approved:test",
        },
      };
      expect(isOntologyAffectingDtc(dtc)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // validateDigitalTwinChangeContract typed-ref enforcement tests
  // ---------------------------------------------------------------------------
  describe("validateDigitalTwinChangeContract — typed-ref enforcement", () => {
    let savedBypass: string | undefined;

    beforeEach(() => {
      savedBypass = process.env["PALANTIR_MINI_DTC_EVAL_REFS_BYPASS"];
      delete process.env["PALANTIR_MINI_DTC_EVAL_REFS_BYPASS"];
    });

    afterEach(() => {
      if (savedBypass === undefined) {
        delete process.env["PALANTIR_MINI_DTC_EVAL_REFS_BYPASS"];
      } else {
        process.env["PALANTIR_MINI_DTC_EVAL_REFS_BYPASS"] = savedBypass;
      }
    });

    function ontologyAffectingDtc(): DigitalTwinChangeContract {
      return {
        contractId: "dtc:ontology-affecting",
        status: "approved",
        semanticIntentContractRef: "semantic-intent:test",
        affectedSurfaces: ["ontology/data/visual3D.ts"],
        changeBoundary: "Add ObjectType for 3D scene primitives.",
        branchProposalPolicy: "Use proposal PR before merge.",
        permissionBoundary: "No production publish without QA signoff.",
        replayMigrationPlan: "No data migration in first proof.",
        observabilityPlan: "Emit contract gate and QA events.",
        toolSurfaceReadiness: "Codex uses Playwright MCP; Playwright QA is a follow-up gate.",
        evaluationPlan: "TypeScript, router tests, runtime smoke, visual QA.",
        risks: [
          {
            riskId: "risk.tool-surface",
            kind: "tool-surface",
            status: "accepted",
            description: "Playwright MCP tools may need lazy-loading in the current runtime.",
            mitigation: "Use Playwright MCP tools or repo Playwright scripts.",
            designAlternative: "Repo QA scripts plus headed browser pass.",
          },
        ],
        approvalRef: "user:approved:test",
      };
    }

    test("ontology-affecting DTC without touchedOntologyRefs and requiredEvaluationRefs flags both fields", () => {
      const dtc = ontologyAffectingDtc();
      // no touchedOntologyRefs, no requiredEvaluationRefs
      const result = validateDigitalTwinChangeContract(dtc);
      const fields = result.issues.map((i) => i.field);
      expect(fields).toContain("fillPolicy");
      expect(fields).toContain("touchedOntologyRefs");
      expect(fields).toContain("requiredEvaluationRefs");
    });

    test("ontology-affecting DTC with touchedOntologyRefs only flags requiredEvaluationRefs", () => {
      const dtc = ontologyAffectingDtc();
      dtc.touchedOntologyRefs = [
        { kind: "ObjectType", rid: "ri.ontology.main.object-type.1", confidence: "exact" },
      ];
      // no requiredEvaluationRefs
      const result = validateDigitalTwinChangeContract(dtc);
      const fields = result.issues.map((i) => i.field);
      expect(fields).not.toContain("touchedOntologyRefs");
      expect(fields).toContain("requiredEvaluationRefs");
      expect(fields).toContain("fillPolicy");
    });

    test("ontology-affecting DTC with both typed refs populated still requires ontology-dtc-build policy", () => {
      const dtc = ontologyAffectingDtc();
      dtc.touchedOntologyRefs = [
        { kind: "ObjectType", rid: "ri.ontology.main.object-type.1", confidence: "exact" },
      ];
      dtc.requiredEvaluationRefs = [
        { kind: "ValidationPack", rid: "ri.ontology.main.validation-pack.scene3d-v1", confidence: "exact" },
      ];
      const result = validateDigitalTwinChangeContract(dtc);
      const fields = result.issues.map((i) => i.field);
      expect(fields).not.toContain("touchedOntologyRefs");
      expect(fields).not.toContain("requiredEvaluationRefs");
      expect(fields).toContain("fillPolicy");
    });

    test("non-ontology-affecting DTC with no typed refs has no enforcement triggered", () => {
      const dtc: DigitalTwinChangeContract = {
        contractId: "dtc:docs-only",
        status: "approved",
        semanticIntentContractRef: "semantic-intent:test",
        affectedSurfaces: ["docs/proposals/spec.md"],
        changeBoundary: "Update documentation only.",
        branchProposalPolicy: "Standard PR.",
        permissionBoundary: "No production publish.",
        replayMigrationPlan: "No migration.",
        observabilityPlan: "No observability changes.",
        toolSurfaceReadiness: "N/A.",
        evaluationPlan: "Manual review.",
        risks: [],
        approvalRef: "user:approved:test",
      };
      const result = validateDigitalTwinChangeContract(dtc);
      const fields = result.issues.map((i) => i.field);
      expect(fields).not.toContain("touchedOntologyRefs");
      expect(fields).not.toContain("requiredEvaluationRefs");
      expect(result.valid).toBe(true);
    });

    test("PALANTIR_MINI_DTC_EVAL_REFS_BYPASS=1 skips typed-ref minimums but not ontology-dtc-build policy", () => {
      process.env["PALANTIR_MINI_DTC_EVAL_REFS_BYPASS"] = "1";
      const dtc = ontologyAffectingDtc();
      // no touchedOntologyRefs, no requiredEvaluationRefs — but bypass is set
      const result = validateDigitalTwinChangeContract(dtc);
      const fields = result.issues.map((i) => i.field);
      expect(fields).not.toContain("touchedOntologyRefs");
      expect(fields).not.toContain("requiredEvaluationRefs");
      expect(fields).toContain("fillPolicy");
    });
  });
});
