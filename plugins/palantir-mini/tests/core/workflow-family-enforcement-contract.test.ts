import { describe, expect, test } from "bun:test";

import {
  AIP_ARCHITECTURE_SURFACES,
  DETERMINISTIC_ENFORCEMENT_STATUSES,
  NEUTRAL_CONTRACT_TYPE_NAMES,
  RUNTIME_SUPPORT_DECLARATIONS,
  WORKFLOW_FAMILIES,
  WORKFLOW_FAMILY_COMPLEX_E2E_SCENARIO_DECLARATIONS,
  WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION,
  WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY,
  WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_REGISTRY,
  getWorkflowFamilyEnforcementContract,
  listWorkflowFamiliesMissingComplexE2EScenarioDeclarations,
  type AgentSurfaceContract,
  type ApplicationVariableContract,
  type RetrievalContextContract,
  type RuntimeAdapterProjection,
  type SkillSurfaceContract,
  type ToolSurfaceContract,
  type WorkflowFamilyEnforcementContract,
} from "../../core/contracts";

describe("neutral workflow family contract surface", () => {
  test("publishes the required neutral contract type names", () => {
    expect(NEUTRAL_CONTRACT_TYPE_NAMES).toEqual([
      "WorkflowFamilyEnforcementContract",
      "WorkflowPhaseContract",
      "ComplexE2EScenarioDeclaration",
      "AgentSurfaceContract",
      "SkillSurfaceContract",
      "ToolSurfaceContract",
      "RetrievalContextContract",
      "ApplicationVariableContract",
      "RuntimeAdapterProjection",
    ]);
  });

  test("encodes all approved workflow families", () => {
    expect(WORKFLOW_FAMILIES).toEqual([
      "ontologyEngineering",
      "semanticIntentAndRouting",
      "researchAndContextEngineering",
      "leadOrchestrationAndDelegation",
      "hookAndPolicyEnforcement",
      "runtimeAdapterAndParity",
      "validationEvalAndHarness",
      "releaseAndShipping",
      "lineageReplayAndLearning",
      "applicationAndChatbotAuthoring",
    ]);
  });

  test("encodes deterministic enforcement statuses and runtime support declarations", () => {
    expect(DETERMINISTIC_ENFORCEMENT_STATUSES).toEqual([
      "enforced",
      "advisory-only",
      "prompt-only",
      "schema-only",
      "missing",
    ]);

    expect(RUNTIME_SUPPORT_DECLARATIONS).toEqual([
      "native",
      "adapter-native",
      "manual",
      "schema-only",
      "unsupported",
    ]);
  });

  test("keeps AIP surface vocabulary available to downstream projections", () => {
    expect(AIP_ARCHITECTURE_SURFACES).toContain("retrieval-context");
    expect(AIP_ARCHITECTURE_SURFACES).toContain("tools-action");
    expect(AIP_ARCHITECTURE_SURFACES).toContain("application-state-variables");
    expect(AIP_ARCHITECTURE_SURFACES).toContain("runtime-projection");
  });

  test("type-checks representative contracts with required parity guard fields", () => {
    const workflowContract = {
      schemaVersion: WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION,
      workflowFamily: "semanticIntentAndRouting",
      phases: [
        {
          phaseId: "prompt-entry",
          entryCondition: "prompt captured",
          exitCondition: "semantic intent routed",
          allowedTransitions: ["contract-validation"],
          blockingGates: ["prompt-front-door"],
          advisoryGates: [],
          allowedTools: ["pm_semantic_intent_gate"],
          forbiddenTools: ["commit_edits"],
          requiredEvidenceRefs: ["promptHash"],
          outputStateRefs: ["semanticIntentRef"],
          deterministicStatus: "enforced",
        },
      ],
      aipSurfaceRefs: [
        {
          surface: "security-governance",
          evidenceRefs: ["core/contracts/workflow-family-enforcement.ts"],
        },
      ],
      requiredContracts: {
        semanticIntent: "required",
        digitalTwinChange: "optional",
        workContract: "optional",
        userDecisionRecord: "optional",
      },
      enforcement: {
        hooks: [],
        mcpValidators: [],
        selfChecks: [],
        evals: [],
        releaseGates: [],
      },
      runtimeProjection: {
        claude: {
          support: "native",
          evidenceRefs: ["runtime-evidence:claude"],
          fallbackObligations: [],
          unsupportedSurfaceRefs: [],
          smokeEvidenceRefs: [],
        },
        codex: {
          support: "adapter-native",
          evidenceRefs: ["runtime-evidence:codex"],
          fallbackObligations: ["record unsupported lifecycle gaps"],
          unsupportedSurfaceRefs: ["runtime-lifecycle:task-agent-events"],
          smokeEvidenceRefs: [],
        },
        gemini: {
          support: "adapter-native",
          evidenceRefs: ["runtime-evidence:gemini"],
          fallbackObligations: ["use Gemini extension adapter and record event-name gaps"],
          unsupportedSurfaceRefs: ["runtime-lifecycle:claude-codex-event-name-parity"],
          smokeEvidenceRefs: [],
        },
      },
      complexE2EScenarios: [
        {
          scenarioId: "complex-e2e:semantic-routing-typecheck",
          workflowFamily: "semanticIntentAndRouting",
          title: "Semantic intent flows into router dispatch with parity guard fields.",
          complexity: "complex",
          coveredPhaseIds: ["prompt-entry"],
          requiredContractRefs: ["SemanticIntentContract", "RouterBinding"],
          aipSurfaceRefs: ["security-governance"],
          runtimeRefs: ["claude", "codex", "gemini"],
          validationRefs: ["tests/core/workflow-family-enforcement-contract.test.ts"],
          evidenceRefs: ["core/contracts/workflow-family-enforcement.ts"],
          ratchet: "required-complex-e2e-scenario",
        },
      ],
      unsupportedParityClaimsForbidden: true,
    } satisfies WorkflowFamilyEnforcementContract;

    const runtimeProjection = {
      schemaVersion: WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION,
      runtime: "gemini",
      support: "manual",
      lifecycleSurfaceRefs: ["runtime-lifecycle:gemini-extension"],
      hookEventSurfaceRefs: ["hook-event:beforetool"],
      adapterRefs: ["runtime-adapter:gemini"],
      fallbackObligations: ["manual output contract validation"],
      smokeEvidenceRefs: [],
      unsupportedParityClaimsForbidden: true,
    } satisfies RuntimeAdapterProjection;

    const agentContract = {
      schemaVersion: WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION,
      agentId: "agent:neutral-contract-worker",
      workflowFamily: "runtimeAdapterAndParity",
      phaseRefs: ["contract-authoring"],
      runtimeRoles: { codex: "implementation-worker", gemini: "implementation-worker" },
      mutationCapability: "proposal-only",
      requiredContracts: workflowContract.requiredContracts,
      retrievalContextRefs: [],
      toolSurfaceRefs: [],
      applicationVariableRefs: [],
      outputContractRefs: ["worker-output-contract"],
      lifecycleEnforcementRefs: ["manual-briefing"],
      deterministicStatus: "advisory-only",
    } satisfies AgentSurfaceContract;

    const skillContract = {
      schemaVersion: WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION,
      skillId: "skill:contract-audit",
      workflowFamily: "validationEvalAndHarness",
      phaseRefs: ["contract-validation"],
      aipSurfaceRefs: workflowContract.aipSurfaceRefs,
      allowedTools: ["bun test"],
      disallowedTools: ["commit_edits"],
      mutationCapability: "none",
      outputStateRefs: ["validationResult"],
      evalRefs: ["eval:contract-surface"],
      deterministicStatus: "schema-only",
    } satisfies SkillSurfaceContract;

    const toolContract = {
      schemaVersion: WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION,
      toolName: "pm_semantic_intent_gate",
      aliases: [],
      workflowFamily: "semanticIntentAndRouting",
      aipToolType: "function",
      mutationClass: "read-only",
      approvalPolicy: "not-required",
      inputSources: ["llm-generated", "static"],
      outputStateRefs: ["semanticIntentRef"],
      requiredContracts: workflowContract.requiredContracts,
      deterministicStatus: "enforced",
    } satisfies ToolSurfaceContract;

    const retrievalContract = {
      schemaVersion: WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION,
      retrievalContextId: "retrieval:research-router",
      workflowFamily: "researchAndContextEngineering",
      sourceClasses: ["research-router", "document"],
      minimumEvidenceRefs: ["official-docs"],
      freshnessPolicy: "snapshot",
      failureBehavior: "omit-with-warning",
      lineageRefs: [],
      deterministicStatus: "advisory-only",
    } satisfies RetrievalContextContract;

    const variableContract = {
      schemaVersion: WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION,
      variableId: "application-variable:workflow-state",
      workflowFamily: "applicationAndChatbotAuthoring",
      valueType: "object",
      visibility: "description-only",
      authoritySource: "deterministic-system",
      readers: ["chatbot-projection"],
      writers: ["workflow-contract-builder"],
      updateAuthority: "deterministic-only",
      producerRefs: ["workflowFamilyState"],
      consumerRefs: ["chatbotEvalSuite"],
      auditEventRefs: [],
      deterministicStatus: "schema-only",
    } satisfies ApplicationVariableContract;

    expect(workflowContract.unsupportedParityClaimsForbidden).toBe(true);
    expect(runtimeProjection.unsupportedParityClaimsForbidden).toBe(true);
    expect(agentContract.workflowFamily).toBe("runtimeAdapterAndParity");
    expect(skillContract.deterministicStatus).toBe("schema-only");
    expect(toolContract.aipToolType).toBe("function");
    expect(retrievalContract.failureBehavior).toBe("omit-with-warning");
    expect(variableContract.visibility).toBe("description-only");
  });

  test("publishes a typed enforcement contract inventory for every workflow family", () => {
    expect(Object.keys(WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_REGISTRY).sort()).toEqual(
      [...WORKFLOW_FAMILIES].sort(),
    );
    expect(WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY).toHaveLength(
      WORKFLOW_FAMILIES.length,
    );

    for (const workflowFamily of WORKFLOW_FAMILIES) {
      const contract = getWorkflowFamilyEnforcementContract(workflowFamily);
      expect(contract.schemaVersion).toBe(WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION);
      expect(contract.workflowFamily).toBe(workflowFamily);
      expect(contract.phases.length).toBeGreaterThan(0);
      expect(contract.aipSurfaceRefs.length).toBeGreaterThan(0);
      expect(contract.unsupportedParityClaimsForbidden).toBe(true);
    }
  });

  test("ratchets complex E2E scenario declarations for every workflow family", () => {
    expect(listWorkflowFamiliesMissingComplexE2EScenarioDeclarations()).toEqual([]);
    expect(WORKFLOW_FAMILY_COMPLEX_E2E_SCENARIO_DECLARATIONS.length).toBeGreaterThanOrEqual(
      WORKFLOW_FAMILIES.length,
    );

    for (const scenario of WORKFLOW_FAMILY_COMPLEX_E2E_SCENARIO_DECLARATIONS) {
      const contract = getWorkflowFamilyEnforcementContract(scenario.workflowFamily);
      const phaseIds = new Set(contract.phases.map((phase) => phase.phaseId));

      expect(scenario.complexity).toBe("complex");
      expect(scenario.ratchet).toBe("required-complex-e2e-scenario");
      expect(scenario.coveredPhaseIds.length).toBeGreaterThanOrEqual(2);
      expect(scenario.validationRefs.length).toBeGreaterThan(0);
      expect(scenario.evidenceRefs.length).toBeGreaterThan(0);
      expect(scenario.runtimeRefs).toContain("claude");
      expect(scenario.runtimeRefs).toContain("codex");

      for (const coveredPhaseId of scenario.coveredPhaseIds) {
        expect(phaseIds.has(coveredPhaseId)).toBe(true);
      }
    }

    const missingScenarioFixture = WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY.map(
      (contract) =>
        contract.workflowFamily === "ontologyEngineering"
          ? { ...contract, complexE2EScenarios: [] }
          : contract,
    );
    expect(
      listWorkflowFamiliesMissingComplexE2EScenarioDeclarations(missingScenarioFixture),
    ).toEqual(["ontologyEngineering"]);
  });
});
