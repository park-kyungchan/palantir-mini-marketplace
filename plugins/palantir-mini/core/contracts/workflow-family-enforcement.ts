export const WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION =
  "palantir-mini/workflow-family-enforcement-contract/v1" as const;

export const NEUTRAL_CONTRACT_TYPE_NAMES = [
  "WorkflowFamilyEnforcementContract",
  "WorkflowPhaseContract",
  "ComplexE2EScenarioDeclaration",
  "AgentSurfaceContract",
  "SkillSurfaceContract",
  "ToolSurfaceContract",
  "RetrievalContextContract",
  "ApplicationVariableContract",
  "RuntimeAdapterProjection",
] as const;

export const WORKFLOW_FAMILIES = [
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
] as const;

export type WorkflowFamily = (typeof WORKFLOW_FAMILIES)[number];

export const WORKFLOW_FAMILY_RELEASE_GATE_REQUIRED_EVIDENCE_REFS = [
  "tests/governance/effective-gate-mode.test.ts",
  "tests/runtime-boundary/runtime-parity-claims.test.ts",
  "scripts/verify-runtime-parity-claims.ts",
  "tests/integrity/no-semantic-root-fork.test.ts",
  "scripts/verify-no-semantic-root-fork.ts",
  "ci/verify-marketplace-integrity.ts",
  "tests/hooks/hook-contracts.test.ts",
  "scripts/verify-hook-contracts.ts",
  "tests/lib/semantic-consistency/promotion-gate.test.ts",
  "tests/evals/semantic-consistency-regression.test.ts",
  "tests/lib/chatbot-studio/semantic-conversation-state.test.ts",
  "tests/bridge/handlers/pm-semantic-intent-gate.test.ts",
] as const;

export const DETERMINISTIC_ENFORCEMENT_STATUSES = [
  "enforced",
  "advisory-only",
  "prompt-only",
  "schema-only",
  "missing",
] as const;

export type DeterministicEnforcementStatus =
  (typeof DETERMINISTIC_ENFORCEMENT_STATUSES)[number];

export const RUNTIME_SUPPORT_DECLARATIONS = [
  "native",
  "adapter-native",
  "manual",
  "schema-only",
  "unsupported",
] as const;

export type RuntimeSupportDeclaration =
  (typeof RUNTIME_SUPPORT_DECLARATIONS)[number];

export type RuntimeId = "claude" | "codex" | "gemini";

export const AIP_ARCHITECTURE_SURFACES = [
  "instructions-descriptions",
  "application-state-variables",
  "retrieval-context",
  "tools-action",
  "tools-object-query",
  "tools-function",
  "tools-update-application-variable",
  "tools-command",
  "tools-request-clarification",
  "chatbots-as-functions",
  "evals-observability",
  "security-governance",
  "runtime-projection",
] as const;

export type AipArchitectureSurface =
  (typeof AIP_ARCHITECTURE_SURFACES)[number];

export interface AipSurfaceRef {
  readonly surface: AipArchitectureSurface;
  readonly evidenceRefs: readonly string[];
}

export interface ContractRequirementSet {
  readonly semanticIntent: "required" | "optional" | "not-applicable";
  readonly digitalTwinChange: "required" | "optional" | "not-applicable";
  readonly workContract: "required" | "optional" | "not-applicable";
  readonly userDecisionRecord: "required" | "optional" | "not-applicable";
}

export interface HookEnforcementRef {
  readonly hookId: string;
  readonly phaseId: string;
  readonly event: string;
  readonly determinism: DeterministicEnforcementStatus;
  readonly policyRef?: string;
  readonly evidenceRefs: readonly string[];
}

export interface McpValidatorRef {
  readonly validatorId: string;
  readonly toolName?: string;
  readonly determinism: DeterministicEnforcementStatus;
  readonly requiredForMutation: boolean;
  readonly evidenceRefs: readonly string[];
}

export interface SelfCheckRef {
  readonly checkId: string;
  readonly mode: string;
  readonly determinism: DeterministicEnforcementStatus;
  readonly releaseBlocking: boolean;
  readonly evidenceRefs: readonly string[];
}

export interface EvalRef {
  readonly evalId: string;
  readonly suiteRef?: string;
  readonly replayRequired: boolean;
  readonly observabilityStateRefs: readonly string[];
  readonly evidenceRefs: readonly string[];
}

export interface ComplexE2EScenarioDeclaration {
  readonly scenarioId: string;
  readonly workflowFamily: WorkflowFamily;
  readonly title: string;
  readonly complexity: "complex";
  readonly coveredPhaseIds: readonly string[];
  readonly requiredContractRefs: readonly string[];
  readonly aipSurfaceRefs: readonly AipArchitectureSurface[];
  readonly runtimeRefs: readonly RuntimeId[];
  readonly validationRefs: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly ratchet: "required-complex-e2e-scenario";
}

export interface ReleaseGateRef {
  readonly gateId: string;
  readonly determinism: DeterministicEnforcementStatus;
  readonly requiredEvidenceRefs: readonly string[];
}

export interface WorkflowFamilyEnforcementSet {
  readonly hooks: readonly HookEnforcementRef[];
  readonly mcpValidators: readonly McpValidatorRef[];
  readonly selfChecks: readonly SelfCheckRef[];
  readonly evals: readonly EvalRef[];
  readonly releaseGates: readonly ReleaseGateRef[];
}

export interface RuntimeSupportSurface {
  readonly support: RuntimeSupportDeclaration;
  readonly evidenceRefs: readonly string[];
  readonly fallbackObligations: readonly string[];
  readonly unsupportedSurfaceRefs: readonly string[];
  readonly smokeEvidenceRefs: readonly string[];
}

export interface RuntimeProjectionSet {
  readonly claude: RuntimeSupportSurface;
  readonly codex: RuntimeSupportSurface;
  readonly gemini: RuntimeSupportSurface;
}

export interface WorkflowPhaseContract {
  readonly phaseId: string;
  readonly entryCondition: string;
  readonly exitCondition: string;
  readonly allowedTransitions: readonly string[];
  readonly blockingGates: readonly string[];
  readonly advisoryGates: readonly string[];
  readonly allowedTools: readonly string[];
  readonly forbiddenTools: readonly string[];
  readonly requiredEvidenceRefs: readonly string[];
  readonly outputStateRefs: readonly string[];
  readonly deterministicStatus: DeterministicEnforcementStatus;
}

export interface WorkflowFamilyEnforcementContract {
  readonly schemaVersion: typeof WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION;
  readonly workflowFamily: WorkflowFamily;
  readonly phases: readonly WorkflowPhaseContract[];
  readonly aipSurfaceRefs: readonly AipSurfaceRef[];
  readonly requiredContracts: ContractRequirementSet;
  readonly enforcement: WorkflowFamilyEnforcementSet;
  readonly runtimeProjection: RuntimeProjectionSet;
  readonly complexE2EScenarios: readonly ComplexE2EScenarioDeclaration[];
  readonly unsupportedParityClaimsForbidden: true;
}

export interface RuntimeAdapterProjection {
  readonly schemaVersion: typeof WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION;
  readonly runtime: RuntimeId;
  readonly support: RuntimeSupportDeclaration;
  readonly lifecycleSurfaceRefs: readonly string[];
  readonly hookEventSurfaceRefs: readonly string[];
  readonly adapterRefs: readonly string[];
  readonly fallbackObligations: readonly string[];
  readonly smokeEvidenceRefs: readonly string[];
  readonly unsupportedParityClaimsForbidden: true;
}

export interface AgentSurfaceContract {
  readonly schemaVersion: typeof WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION;
  readonly agentId: string;
  readonly workflowFamily: WorkflowFamily;
  readonly phaseRefs: readonly string[];
  readonly runtimeRoles: Partial<Record<RuntimeId, string>>;
  readonly mutationCapability: "none" | "proposal-only" | "mutation-capable";
  readonly requiredContracts: ContractRequirementSet;
  readonly retrievalContextRefs: readonly string[];
  readonly toolSurfaceRefs: readonly string[];
  readonly applicationVariableRefs: readonly string[];
  readonly outputContractRefs: readonly string[];
  readonly lifecycleEnforcementRefs: readonly string[];
  readonly deterministicStatus: DeterministicEnforcementStatus;
}

export interface SkillSurfaceContract {
  readonly schemaVersion: typeof WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION;
  readonly skillId: string;
  readonly workflowFamily: WorkflowFamily;
  readonly phaseRefs: readonly string[];
  readonly aipSurfaceRefs: readonly AipSurfaceRef[];
  readonly allowedTools: readonly string[];
  readonly disallowedTools: readonly string[];
  readonly mutationCapability: "none" | "proposal-only" | "mutation-capable";
  readonly outputStateRefs: readonly string[];
  readonly evalRefs: readonly string[];
  readonly deterministicStatus: DeterministicEnforcementStatus;
}

export interface ToolSurfaceContract {
  readonly schemaVersion: typeof WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION;
  readonly toolName: string;
  readonly aliases: readonly string[];
  readonly workflowFamily: WorkflowFamily;
  readonly aipToolType:
    | "action"
    | "object-query"
    | "function"
    | "update-application-variable"
    | "command"
    | "request-clarification"
    | "retrieval-context";
  readonly mutationClass:
    | "read-only"
    | "state-update"
    | "ontology-write"
    | "external-command";
  readonly approvalPolicy: "not-required" | "required-before-use" | "required-before-mutation";
  readonly inputSources: readonly (
    | "llm-generated"
    | "static"
    | "application-variable"
    | "retrieval-output"
  )[];
  readonly outputStateRefs: readonly string[];
  readonly requiredContracts: ContractRequirementSet;
  readonly deterministicStatus: DeterministicEnforcementStatus;
}

export interface RetrievalContextContract {
  readonly schemaVersion: typeof WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION;
  readonly retrievalContextId: string;
  readonly workflowFamily: WorkflowFamily;
  readonly sourceClasses: readonly (
    | "ontology"
    | "document"
    | "function-backed"
    | "research-router"
    | "session-lineage"
  )[];
  readonly minimumEvidenceRefs: readonly string[];
  readonly freshnessPolicy: "current-session" | "snapshot" | "external-refresh-required";
  readonly failureBehavior: "fail-closed" | "omit-with-warning" | "not-applicable";
  readonly lineageRefs: readonly string[];
  readonly deterministicStatus: DeterministicEnforcementStatus;
}

export interface ApplicationVariableContract {
  readonly schemaVersion: typeof WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION;
  readonly variableId: string;
  readonly workflowFamily: WorkflowFamily;
  readonly valueType: "string" | "object" | "string-set" | "object-set" | "boolean" | "number";
  readonly visibility: "visible" | "hidden" | "description-only";
  readonly authoritySource: "deterministic-system" | "human-approved" | "runtime-derived" | "llm-proposed";
  readonly readers: readonly string[];
  readonly writers: readonly string[];
  readonly updateAuthority: "deterministic-only" | "approval-required" | "proposal-only";
  readonly producerRefs: readonly string[];
  readonly consumerRefs: readonly string[];
  readonly auditEventRefs: readonly string[];
  readonly deterministicStatus: DeterministicEnforcementStatus;
}

const CONTRACT_REQUIREMENTS = {
  none: {
    semanticIntent: "not-applicable",
    digitalTwinChange: "not-applicable",
    workContract: "not-applicable",
    userDecisionRecord: "not-applicable",
  },
  sicOnly: {
    semanticIntent: "required",
    digitalTwinChange: "optional",
    workContract: "optional",
    userDecisionRecord: "optional",
  },
  sicAndDtc: {
    semanticIntent: "required",
    digitalTwinChange: "required",
    workContract: "optional",
    userDecisionRecord: "required",
  },
  workContract: {
    semanticIntent: "optional",
    digitalTwinChange: "optional",
    workContract: "required",
    userDecisionRecord: "optional",
  },
  fullMutation: {
    semanticIntent: "required",
    digitalTwinChange: "required",
    workContract: "required",
    userDecisionRecord: "required",
  },
} as const satisfies Record<string, ContractRequirementSet>;

function phase(input: {
  readonly phaseId: string;
  readonly entryCondition: string;
  readonly exitCondition: string;
  readonly allowedTransitions?: readonly string[];
  readonly blockingGates?: readonly string[];
  readonly advisoryGates?: readonly string[];
  readonly allowedTools?: readonly string[];
  readonly forbiddenTools?: readonly string[];
  readonly requiredEvidenceRefs?: readonly string[];
  readonly outputStateRefs?: readonly string[];
  readonly deterministicStatus?: DeterministicEnforcementStatus;
}): WorkflowPhaseContract {
  return {
    phaseId: input.phaseId,
    entryCondition: input.entryCondition,
    exitCondition: input.exitCondition,
    allowedTransitions: input.allowedTransitions ?? [],
    blockingGates: input.blockingGates ?? [],
    advisoryGates: input.advisoryGates ?? [],
    allowedTools: input.allowedTools ?? [],
    forbiddenTools: input.forbiddenTools ?? [],
    requiredEvidenceRefs: input.requiredEvidenceRefs ?? [],
    outputStateRefs: input.outputStateRefs ?? [],
    deterministicStatus: input.deterministicStatus ?? "advisory-only",
  };
}

function aipRef(
  surface: AipArchitectureSurface,
  evidenceRefs: readonly string[],
): AipSurfaceRef {
  return { surface, evidenceRefs };
}

function enforcement(
  input: Partial<WorkflowFamilyEnforcementSet>,
): WorkflowFamilyEnforcementSet {
  return {
    hooks: input.hooks ?? [],
    mcpValidators: input.mcpValidators ?? [],
    selfChecks: input.selfChecks ?? [],
    evals: input.evals ?? [],
    releaseGates: input.releaseGates ?? [],
  };
}

function runtimeProjection(input: {
  readonly codexSupport: RuntimeSupportDeclaration;
  readonly codexFallbackObligations: readonly string[];
  readonly unsupportedCodexSurfaceRefs?: readonly string[];
  readonly smokeEvidenceRefs?: readonly string[];
}): RuntimeProjectionSet {
  return {
    claude: {
      support: "unsupported",
      evidenceRefs: [],
      fallbackObligations: [
        "No Claude palantir-mini install, package, hook, or MCP surface is active in this checkout.",
      ],
      unsupportedSurfaceRefs: ["claude:palantir-mini-runtime-package-absent"],
      smokeEvidenceRefs: [],
    },
    codex: {
      support: input.codexSupport,
      evidenceRefs: ["contracts/runtime-evidence/codex.json"],
      fallbackObligations: input.codexFallbackObligations,
      unsupportedSurfaceRefs: input.unsupportedCodexSurfaceRefs ?? [],
      smokeEvidenceRefs: input.smokeEvidenceRefs ?? [],
    },
    gemini: {
      support: "unsupported",
      evidenceRefs: [],
      fallbackObligations: [
        "No Gemini palantir-mini extension, package, hook, or MCP surface is active in this checkout.",
      ],
      unsupportedSurfaceRefs: ["gemini:palantir-mini-runtime-package-absent"],
      smokeEvidenceRefs: [],
    },
  };
}

function complexE2EScenario(
  input: Omit<ComplexE2EScenarioDeclaration, "complexity" | "ratchet">,
): ComplexE2EScenarioDeclaration {
  return {
    ...input,
    runtimeRefs: Array.from(
      new Set(input.runtimeRefs.filter((runtime) => runtime === "codex")),
    ) as RuntimeId[],
    complexity: "complex",
    ratchet: "required-complex-e2e-scenario",
  };
}

function familyContract(input: {
  readonly workflowFamily: WorkflowFamily;
  readonly phases: readonly WorkflowPhaseContract[];
  readonly aipSurfaceRefs: readonly AipSurfaceRef[];
  readonly requiredContracts: ContractRequirementSet;
  readonly enforcement: WorkflowFamilyEnforcementSet;
  readonly runtimeProjection: RuntimeProjectionSet;
  readonly complexE2EScenarios: readonly ComplexE2EScenarioDeclaration[];
}): WorkflowFamilyEnforcementContract {
  return {
    schemaVersion: WORKFLOW_FAMILY_CONTRACT_SCHEMA_VERSION,
    workflowFamily: input.workflowFamily,
    phases: input.phases,
    aipSurfaceRefs: input.aipSurfaceRefs,
    requiredContracts: input.requiredContracts,
    enforcement: input.enforcement,
    runtimeProjection: input.runtimeProjection,
    complexE2EScenarios: input.complexE2EScenarios,
    unsupportedParityClaimsForbidden: true,
  };
}

export const WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_REGISTRY = {
  ontologyEngineering: familyContract({
    workflowFamily: "ontologyEngineering",
    phases: [
      phase({
        phaseId: "ontology-engineering:context-load",
        entryCondition: "User intent may alter ontology, schema, workflow, or governance meaning.",
        exitCondition: "Relevant ontology context and current contract boundary are known.",
        allowedTransitions: ["ontology-engineering:dtc-authoring"],
        blockingGates: ["pm_semantic_intent_gate"],
        allowedTools: ["ontology_context_query", "pm_semantic_intent_gate"],
        forbiddenTools: ["commit_edits"],
        requiredEvidenceRefs: ["prompt-front-door", "ontology-context-query"],
        outputStateRefs: ["semanticIntentContractRef", "ontologyContextSeedRef"],
        deterministicStatus: "enforced",
      }),
      phase({
        phaseId: "ontology-engineering:dtc-authoring",
        entryCondition: "SIC draft exists and ontology context has been loaded.",
        exitCondition: "Approved DTC or explicit non-mutation decision exists.",
        blockingGates: ["dtc-turn-fill", "user-decision-record"],
        allowedTools: ["pm_semantic_intent_gate", "pm_ontology_engineering_workflow"],
        forbiddenTools: ["generated-file-direct-edit"],
        requiredEvidenceRefs: ["digitalTwinChangeContractRef", "UserDecisionRecord"],
        outputStateRefs: ["approvedDtcRef", "workflowContractRef"],
        deterministicStatus: "enforced",
      }),
    ],
    aipSurfaceRefs: [
      aipRef("retrieval-context", ["skills/pm-ontology-engineering-lead/SKILL.md"]),
      aipRef("security-governance", ["hooks/prompt-dtc-enforcement-gate.ts"]),
    ],
    requiredContracts: CONTRACT_REQUIREMENTS.sicAndDtc,
    enforcement: enforcement({
      mcpValidators: [
        {
          validatorId: "validator:pm-semantic-intent-gate",
          toolName: "pm_semantic_intent_gate",
          determinism: "enforced",
          requiredForMutation: true,
          evidenceRefs: ["bridge/handlers/pm-semantic-intent-gate.ts"],
        },
      ],
      evals: [
        {
          evalId: "eval:fde-ontology-engineering-session-core",
          replayRequired: true,
          observabilityStateRefs: ["fdeOntologyEngineeringSession"],
          evidenceRefs: ["tests/lib/fde-ontology-engineering/session-core.test.ts"],
        },
      ],
    }),
    runtimeProjection: runtimeProjection({
      codexSupport: "manual",
      codexFallbackObligations: ["Record pm_semantic_intent_gate MCP unavailability before mutation."],
      unsupportedCodexSurfaceRefs: ["codex:mcp-palantir-mini-unavailable"],
    }),
    complexE2EScenarios: [
      complexE2EScenario({
        scenarioId: "complex-e2e:ontology-engineering-context-to-approved-dtc",
        workflowFamily: "ontologyEngineering",
        title: "Context-loaded ontology change reaches an approved DTC boundary before mutation.",
        coveredPhaseIds: [
          "ontology-engineering:context-load",
          "ontology-engineering:dtc-authoring",
        ],
        requiredContractRefs: ["SemanticIntentContract", "DigitalTwinChangeContract"],
        aipSurfaceRefs: ["retrieval-context", "security-governance"],
        runtimeRefs: ["claude", "codex"],
        validationRefs: ["tests/lib/fde-ontology-engineering/session-core.test.ts"],
        evidenceRefs: ["tests/skills/pm-ontology-engineering-lead.test.ts"],
      }),
    ],
  }),
  semanticIntentAndRouting: familyContract({
    workflowFamily: "semanticIntentAndRouting",
    phases: [
      phase({
        phaseId: "semantic-routing:prompt-contract",
        entryCondition: "Prompt-front-door identity is available or its absence is recorded.",
        exitCondition: "SIC/DTC requirement decision is produced.",
        allowedTransitions: ["semantic-routing:router-dispatch"],
        blockingGates: ["prompt-front-door", "pm_semantic_intent_gate"],
        allowedTools: ["pm_semantic_intent_gate"],
        forbiddenTools: ["pm_intent_router-without-approved-contracts"],
        requiredEvidenceRefs: ["promptId", "promptHash"],
        outputStateRefs: ["semanticIntentContractRef", "digitalTwinChangeContractRef"],
        deterministicStatus: "enforced",
      }),
      phase({
        phaseId: "semantic-routing:router-dispatch",
        entryCondition: "Approved refs or not-required verdict are available.",
        exitCondition: "RouterBinding selects lead-direct, delegation, or contract_required.",
        blockingGates: ["approved-inline-contracts"],
        allowedTools: ["pm_intent_router"],
        forbiddenTools: ["ad-hoc-routing"],
        requiredEvidenceRefs: ["RouterBinding"],
        outputStateRefs: ["dispatchDecision", "delegationRecipe"],
        deterministicStatus: "enforced",
      }),
    ],
    aipSurfaceRefs: [
      aipRef("instructions-descriptions", ["skills/pm-semantic-intent-gate/SKILL.md"]),
      aipRef("tools-function", ["bridge/handlers/pm-intent-router.ts"]),
    ],
    requiredContracts: CONTRACT_REQUIREMENTS.sicOnly,
    enforcement: enforcement({
      mcpValidators: [
        {
          validatorId: "validator:pm-intent-router-contract-gate",
          toolName: "pm_intent_router",
          determinism: "enforced",
          requiredForMutation: true,
          evidenceRefs: ["tests/bridge/handlers/pm-intent-router-fail-closed.test.ts"],
        },
      ],
      evals: [
        {
          evalId: "eval:prompt-to-dtc-regression",
          suiteRef: "eval-suites/prompt-to-dtc-regression.json",
          replayRequired: true,
          observabilityStateRefs: ["semanticIntentContract", "RouterBinding"],
          evidenceRefs: ["eval-suites/prompt-to-dtc-regression.json"],
        },
      ],
    }),
    runtimeProjection: runtimeProjection({
      codexSupport: "adapter-native",
      codexFallbackObligations: ["Preserve prompt identity fields when native prompt hooks are partial."],
      unsupportedCodexSurfaceRefs: ["codex:user-prompt-submit-full-parity"],
    }),
    complexE2EScenarios: [
      complexE2EScenario({
        scenarioId: "complex-e2e:semantic-intent-to-router-binding",
        workflowFamily: "semanticIntentAndRouting",
        title: "Prompt-to-contract authoring flows into fail-closed router dispatch.",
        coveredPhaseIds: [
          "semantic-routing:prompt-contract",
          "semantic-routing:router-dispatch",
        ],
        requiredContractRefs: ["SemanticIntentContract", "RouterBinding"],
        aipSurfaceRefs: ["instructions-descriptions", "tools-function"],
        runtimeRefs: ["claude", "codex"],
        validationRefs: [
          "tests/bridge/handlers/pm-semantic-intent-gate.test.ts",
          "tests/bridge/handlers/pm-intent-router.test.ts",
        ],
        evidenceRefs: ["tests/integration/dtc-end-to-end-smoke.test.ts"],
      }),
    ],
  }),
  researchAndContextEngineering: familyContract({
    workflowFamily: "researchAndContextEngineering",
    phases: [
      phase({
        phaseId: "research-context:source-selection",
        entryCondition: "Intent needs evidence, current docs, ontology graph, or research source selection.",
        exitCondition: "Minimal read set and freshness policy are selected.",
        allowedTransitions: ["research-context:retrieval-pack"],
        advisoryGates: ["research-staleness"],
        allowedTools: ["ontology_context_query", "research_context_select"],
        requiredEvidenceRefs: ["BROWSE.md", "INDEX.md"],
        outputStateRefs: ["retrievalContext"],
        deterministicStatus: "advisory-only",
      }),
      phase({
        phaseId: "research-context:retrieval-pack",
        entryCondition: "Read set has been selected.",
        exitCondition: "Context pack carries source refs and confidence warnings.",
        blockingGates: ["citation-validation"],
        allowedTools: ["ontology_context_query", "pm_research_citation_validate"],
        requiredEvidenceRefs: ["sourceRefs"],
        outputStateRefs: ["contextCapsuleRef"],
        deterministicStatus: "enforced",
      }),
    ],
    aipSurfaceRefs: [
      aipRef("retrieval-context", ["tests/golden/ontology-context-query/README.md"]),
      aipRef("evals-observability", ["tests/golden/ontology-context-query/golden.test.ts"]),
    ],
    requiredContracts: CONTRACT_REQUIREMENTS.sicOnly,
    enforcement: enforcement({
      mcpValidators: [
        {
          validatorId: "validator:ontology-context-query-golden",
          toolName: "ontology_context_query",
          determinism: "enforced",
          requiredForMutation: false,
          evidenceRefs: ["tests/golden/ontology-context-query/golden.test.ts"],
        },
      ],
    }),
    runtimeProjection: runtimeProjection({
      codexSupport: "manual",
      codexFallbackObligations: ["Use local source routers when MCP context tools are unavailable."],
      unsupportedCodexSurfaceRefs: ["codex:context-tool-discovery"],
    }),
    complexE2EScenarios: [
      complexE2EScenario({
        scenarioId: "complex-e2e:research-context-to-context-capsule",
        workflowFamily: "researchAndContextEngineering",
        title: "Minimal source selection produces a retrievable context capsule with freshness warnings.",
        coveredPhaseIds: [
          "research-context:source-selection",
          "research-context:retrieval-pack",
        ],
        requiredContractRefs: ["RetrievalContextContract", "SemanticIntentContract"],
        aipSurfaceRefs: ["retrieval-context", "evals-observability"],
        runtimeRefs: ["claude", "codex"],
        validationRefs: ["tests/golden/ontology-context-query/golden.test.ts"],
        evidenceRefs: ["tests/lib/context/context-capsule.test.ts"],
      }),
    ],
  }),
  leadOrchestrationAndDelegation: familyContract({
    workflowFamily: "leadOrchestrationAndDelegation",
    phases: [
      phase({
        phaseId: "lead-orchestration:dispatch-analysis",
        entryCondition: "A nontrivial task needs lead-direct, quick sprint, or delegated execution selection.",
        exitCondition: "Dispatch mode and ownership boundary are selected.",
        allowedTransitions: ["lead-orchestration:handoff-contract"],
        blockingGates: ["pre-delegation-hard-gate"],
        allowedTools: ["pm_intent_router", "pm_lead_brief"],
        requiredEvidenceRefs: ["scopePaths", "complexityHint"],
        outputStateRefs: ["dispatchMode", "ownerAgent"],
        deterministicStatus: "enforced",
      }),
      phase({
        phaseId: "lead-orchestration:handoff-contract",
        entryCondition: "Delegation or lead-direct mode has been selected.",
        exitCondition: "Worker prompt or lead-direct contract includes scope, validation, and output contract.",
        blockingGates: ["write-scope-disjointness"],
        allowedTools: ["spawn_agent", "pm_intent_router"],
        forbiddenTools: ["unbounded-subagent"],
        requiredEvidenceRefs: ["Approved boundary", "Write scope", "Validation"],
        outputStateRefs: ["workerOutputContract"],
        deterministicStatus: "enforced",
      }),
    ],
    aipSurfaceRefs: [
      aipRef("instructions-descriptions", ["agents/lead-orchestrator.md"]),
      aipRef("tools-command", ["skills/pm-delegate-or-direct/SKILL.md"]),
    ],
    requiredContracts: CONTRACT_REQUIREMENTS.workContract,
    enforcement: enforcement({
      hooks: [],
    }),
    runtimeProjection: runtimeProjection({
      codexSupport: "manual",
      codexFallbackObligations: ["Use Codex-native delegation constraints and record plugin recipe gaps."],
      unsupportedCodexSurfaceRefs: ["codex:plugin-agent-recipe-native-parity"],
    }),
    complexE2EScenarios: [
      complexE2EScenario({
        scenarioId: "complex-e2e:lead-router-to-scoped-worker-handoff",
        workflowFamily: "leadOrchestrationAndDelegation",
        title: "Lead dispatch produces a scoped worker handoff with validation and forbidden paths.",
        coveredPhaseIds: [
          "lead-orchestration:dispatch-analysis",
          "lead-orchestration:handoff-contract",
        ],
        requiredContractRefs: ["WorkContract", "RouterBinding"],
        aipSurfaceRefs: ["instructions-descriptions", "tools-command"],
        runtimeRefs: ["claude", "codex"],
        validationRefs: ["tests/lib/lead-intent/contracts.test.ts"],
        evidenceRefs: ["tests/lib/lead-intent/contracts.test.ts"],
      }),
    ],
  }),
  hookAndPolicyEnforcement: familyContract({
    workflowFamily: "hookAndPolicyEnforcement",
    phases: [
      phase({
        phaseId: "hook-policy:pretool-gate",
        entryCondition: "A tool invocation may mutate code, contracts, runtime files, or release state.",
        exitCondition: "Hook policy allows, blocks, or records a gap.",
        allowedTransitions: ["hook-policy:posttool-audit"],
        blockingGates: ["prompt-dtc-enforcement-gate"],
        allowedTools: ["PreToolUse"],
        forbiddenTools: ["hook-bypass-without-audit"],
        requiredEvidenceRefs: ["tool_name", "scopePath"],
        outputStateRefs: ["hookDecision"],
        deterministicStatus: "enforced",
      }),
      phase({
        phaseId: "hook-policy:posttool-audit",
        entryCondition: "A guarded action completed or was blocked.",
        exitCondition: "Post-action audit records evidence or runtime gap.",
        advisoryGates: ["posttool-gap-report"],
        allowedTools: ["PostToolUse", "emit_event"],
        requiredEvidenceRefs: ["hookDecision", "toolResult"],
        outputStateRefs: ["auditEventRef"],
        deterministicStatus: "advisory-only",
      }),
    ],
    aipSurfaceRefs: [
      aipRef("security-governance", ["hooks/hooks.json"]),
      aipRef("tools-action", ["hooks/prompt-dtc-enforcement-gate.ts"]),
    ],
    requiredContracts: CONTRACT_REQUIREMENTS.fullMutation,
    enforcement: enforcement({
      hooks: [
        {
          hookId: "hook:prompt-dtc-enforcement-gate",
          phaseId: "hook-policy:pretool-gate",
          event: "PreToolUse",
          determinism: "enforced",
          evidenceRefs: ["tests/hooks/prompt-dtc-enforcement-gate.test.ts"],
        },
      ],
      selfChecks: [
        {
          checkId: "self-check:hooks",
          mode: "pm_plugin_self_check",
          determinism: "enforced",
          releaseBlocking: true,
          evidenceRefs: ["bridge/handlers/pm-plugin-self-check/check-hooks.ts"],
        },
      ],
    }),
    runtimeProjection: runtimeProjection({
      codexSupport: "adapter-native",
      codexFallbackObligations: ["Manually apply hook policy intent when Codex native lifecycle lacks parity."],
      unsupportedCodexSurfaceRefs: ["codex:claude-hook-lifecycle-parity"],
    }),
    complexE2EScenarios: [
      complexE2EScenario({
        scenarioId: "complex-e2e:prompt-dtc-pretool-to-posttool-audit",
        workflowFamily: "hookAndPolicyEnforcement",
        title: "Prompt/DTC hook gate blocks unsafe mutation and records the audit path.",
        coveredPhaseIds: ["hook-policy:pretool-gate", "hook-policy:posttool-audit"],
        requiredContractRefs: ["SemanticIntentContract", "DigitalTwinChangeContract"],
        aipSurfaceRefs: ["security-governance", "tools-action"],
        runtimeRefs: ["claude", "codex"],
        validationRefs: ["tests/hooks/prompt-dtc-enforcement-gate.test.ts"],
        evidenceRefs: ["tests/hooks/ontology-engineering-workflow-enforcement-gate.test.ts"],
      }),
    ],
  }),
  runtimeAdapterAndParity: familyContract({
    workflowFamily: "runtimeAdapterAndParity",
    phases: [
      phase({
        phaseId: "runtime-parity:capability-declare",
        entryCondition: "Runtime support or parity claim is introduced.",
        exitCondition: "Capability support and unsupported surfaces are declared.",
        allowedTransitions: ["runtime-parity:smoke-evidence"],
        blockingGates: ["unsupported-parity-claims-forbidden"],
        allowedTools: ["capability-matrix", "runtime-boundary-test"],
        requiredEvidenceRefs: ["RuntimeAdapterProjection"],
        outputStateRefs: ["capabilityMatrix"],
        deterministicStatus: "enforced",
      }),
      phase({
        phaseId: "runtime-parity:smoke-evidence",
        entryCondition: "Runtime support declaration exists.",
        exitCondition: "Smoke evidence or explicit gap is linked.",
        blockingGates: ["smoke-evidence-required"],
        allowedTools: ["bun test"],
        requiredEvidenceRefs: ["smokeEvidenceRefs"],
        outputStateRefs: ["runtimeGapReport"],
        deterministicStatus: "enforced",
      }),
    ],
    aipSurfaceRefs: [
      aipRef("runtime-projection", ["docs/RUNTIME_LAYER_BOUNDARY.md"]),
      aipRef("evals-observability", ["tests/runtime-boundary/codex-plugin-hooks.test.ts"]),
    ],
    requiredContracts: CONTRACT_REQUIREMENTS.workContract,
    enforcement: enforcement({
      selfChecks: [
        {
          checkId: "self-check:runtime-boundary",
          mode: "targeted-runtime-tests",
          determinism: "enforced",
          releaseBlocking: true,
          evidenceRefs: ["tests/runtime-boundary/runtime-boundary.test.ts"],
        },
      ],
    }),
    runtimeProjection: runtimeProjection({
      codexSupport: "adapter-native",
      codexFallbackObligations: ["State native gaps before claiming Codex parity."],
      unsupportedCodexSurfaceRefs: ["codex:full-thread-hook-lifecycle"],
      smokeEvidenceRefs: ["tests/runtime-boundary/codex-plugin-hooks.test.ts"],
    }),
    complexE2EScenarios: [
      complexE2EScenario({
        scenarioId: "complex-e2e:runtime-capability-to-parity-smoke",
        workflowFamily: "runtimeAdapterAndParity",
        title: "Runtime capability declaration links unsupported surfaces to parity smoke evidence.",
        coveredPhaseIds: [
          "runtime-parity:capability-declare",
          "runtime-parity:smoke-evidence",
        ],
        requiredContractRefs: ["RuntimeAdapterProjection", "WorkflowFamilyEnforcementContract"],
        aipSurfaceRefs: ["runtime-projection", "evals-observability"],
        runtimeRefs: ["claude", "codex"],
        validationRefs: ["tests/runtime-boundary/runtime-boundary.test.ts"],
        evidenceRefs: ["tests/runtime-boundary/codex-plugin-hooks.test.ts"],
      }),
    ],
  }),
  validationEvalAndHarness: familyContract({
    workflowFamily: "validationEvalAndHarness",
    phases: [
      phase({
        phaseId: "validation-harness:ratchet-plan",
        entryCondition: "A behavior change needs verification coverage or eval ratchet planning.",
        exitCondition: "Validation pack, eval suite, or ratchet proposal is selected.",
        allowedTransitions: ["validation-harness:execution"],
        advisoryGates: ["ratchet-proposal"],
        allowedTools: ["harness-ratchet-synthesize", "bun test"],
        requiredEvidenceRefs: ["changedSurfaceRefs"],
        outputStateRefs: ["validationPlan"],
        deterministicStatus: "advisory-only",
      }),
      phase({
        phaseId: "validation-harness:execution",
        entryCondition: "Validation plan exists.",
        exitCondition: "Targeted validation results are linked to the changed behavior.",
        blockingGates: ["targeted-test-result"],
        allowedTools: ["bun test", "pm_harness_strictness_audit"],
        requiredEvidenceRefs: ["testCommand", "testResult"],
        outputStateRefs: ["validationResultRef"],
        deterministicStatus: "enforced",
      }),
    ],
    aipSurfaceRefs: [
      aipRef("evals-observability", ["tests/lib/chatbot-studio/semantic-conversation-state.test.ts"]),
      aipRef("tools-command", ["tests/lib/chatbot-studio/semantic-conversation-state.test.ts"]),
    ],
    requiredContracts: CONTRACT_REQUIREMENTS.workContract,
    enforcement: enforcement({
      selfChecks: [],
      evals: [
        {
          evalId: "eval:harness-ratchet-planner",
          replayRequired: false,
          observabilityStateRefs: ["validationPlan"],
          evidenceRefs: ["tests/lib/chatbot-studio/semantic-conversation-state.test.ts"],
        },
      ],
    }),
    runtimeProjection: runtimeProjection({
      codexSupport: "native",
      codexFallbackObligations: ["Report broad-suite failures separately from targeted validation."],
      smokeEvidenceRefs: ["tests/lib/chatbot-studio/semantic-conversation-state.test.ts"],
    }),
    complexE2EScenarios: [
      complexE2EScenario({
        scenarioId: "complex-e2e:ratchet-plan-to-targeted-validation",
        workflowFamily: "validationEvalAndHarness",
        title: "Ratchet proposal selects targeted tests and records focused validation evidence.",
        coveredPhaseIds: ["validation-harness:ratchet-plan", "validation-harness:execution"],
        requiredContractRefs: ["SelfCheckRef", "EvalRef"],
        aipSurfaceRefs: ["evals-observability", "tools-command"],
        runtimeRefs: ["claude", "codex"],
        validationRefs: ["tests/lib/chatbot-studio/semantic-conversation-state.test.ts"],
        evidenceRefs: ["tests/integration/dtc-end-to-end-smoke.test.ts"],
      }),
    ],
  }),
  releaseAndShipping: familyContract({
    workflowFamily: "releaseAndShipping",
    phases: [
      phase({
        phaseId: "release-shipping:preflight",
        entryCondition: "A scoped change is ready to ship.",
        exitCondition: "Release gates, excluded scope, and recovery plan are known.",
        allowedTransitions: ["release-shipping:pr-closeout"],
        blockingGates: ["git-status-pathscope"],
        allowedTools: ["pm_plugin_self_check", "git status"],
        forbiddenTools: ["direct-main-push"],
        requiredEvidenceRefs: ["verificationCommands", "excludedScope"],
        outputStateRefs: ["releaseGateResult"],
        deterministicStatus: "enforced",
      }),
      phase({
        phaseId: "release-shipping:pr-closeout",
        entryCondition: "Preflight gates passed for the approved scope.",
        exitCondition: "Commit, push, PR, merge, and cleanup evidence are linked or gap is recorded.",
        blockingGates: ["pr-body-contract", "auto-merge-policy"],
        allowedTools: ["git commit", "git push", "gh pr create"],
        forbiddenTools: ["git push origin main"],
        requiredEvidenceRefs: ["PR URL", "merge status"],
        outputStateRefs: ["releaseLineageRef"],
        deterministicStatus: "enforced",
      }),
    ],
    aipSurfaceRefs: [
      aipRef("security-governance", ["tests/scripts/validate-pr-contract-boundary.test.ts"]),
      aipRef("tools-command", ["tests/scripts/validate-pr-contract-boundary.test.ts"]),
    ],
    requiredContracts: CONTRACT_REQUIREMENTS.workContract,
    enforcement: enforcement({
      releaseGates: [
        {
          gateId: "release-gate:pr-contract-boundary",
          determinism: "enforced",
          requiredEvidenceRefs: ["PR body: why, scope, verification, recovery"],
        },
        {
          gateId: "release-gate:workflow-family-final-aggregator",
          determinism: "enforced",
          requiredEvidenceRefs: WORKFLOW_FAMILY_RELEASE_GATE_REQUIRED_EVIDENCE_REFS,
        },
      ],
      selfChecks: [
        {
          checkId: "self-check:workflow-family-release-gate",
          mode: "release",
          determinism: "enforced",
          releaseBlocking: true,
          evidenceRefs: ["lib/release/workflow-family-release-gate.ts"],
        },
      ],
    }),
    runtimeProjection: runtimeProjection({
      codexSupport: "native",
      codexFallbackObligations: ["Keep unrelated branch dirt out of staged pathspecs."],
      smokeEvidenceRefs: ["tests/scripts/validate-pr-contract-boundary.test.ts"],
    }),
    complexE2EScenarios: [
      complexE2EScenario({
        scenarioId: "complex-e2e:release-preflight-to-pr-closeout",
        workflowFamily: "releaseAndShipping",
        title: "Scoped release preflight carries evidence into PR closeout without widening scope.",
        coveredPhaseIds: ["release-shipping:preflight", "release-shipping:pr-closeout"],
        requiredContractRefs: ["ReleaseGateRef", "WorkContract"],
        aipSurfaceRefs: ["security-governance", "tools-command"],
        runtimeRefs: ["claude", "codex"],
        validationRefs: ["tests/core/workflow-family-release-gate.test.ts"],
        evidenceRefs: ["tests/scripts/validate-pr-contract-boundary.test.ts"],
      }),
    ],
  }),
  lineageReplayAndLearning: familyContract({
    workflowFamily: "lineageReplayAndLearning",
    phases: [
      phase({
        phaseId: "lineage-learning:event-capture",
        entryCondition: "A decision, tool action, validation result, or outcome pair is available.",
        exitCondition: "Append-only event envelope has value grade and lineage refs.",
        allowedTransitions: ["lineage-learning:replay-query"],
        blockingGates: ["append-only-events", "value-grade"],
        allowedTools: ["emit_event"],
        forbiddenTools: ["manual-events-jsonl-rewrite"],
        requiredEvidenceRefs: ["DecisionLineage5Dim"],
        outputStateRefs: ["eventRef"],
        deterministicStatus: "enforced",
      }),
      phase({
        phaseId: "lineage-learning:replay-query",
        entryCondition: "Lineage or outcome event exists.",
        exitCondition: "Replay query links before/after evidence to refinement target.",
        advisoryGates: ["outcome-pairing"],
        allowedTools: ["pm_workflow_lineage_query", "pm_outcome_pair_audit"],
        requiredEvidenceRefs: ["eventRef", "outcomePairId"],
        outputStateRefs: ["refinementTargetRef"],
        deterministicStatus: "advisory-only",
      }),
    ],
    aipSurfaceRefs: [
      aipRef("evals-observability", ["lib/event-log/types.ts"]),
      aipRef("security-governance", ["lib/outcome-pairing/track.ts"]),
    ],
    requiredContracts: CONTRACT_REQUIREMENTS.none,
    enforcement: enforcement({
      hooks: [
        {
          hookId: "hook:value-grade-assigner",
          phaseId: "lineage-learning:event-capture",
          event: "PreToolUse",
          determinism: "enforced",
          evidenceRefs: ["tests/hooks/value-grade-assigner.test.ts"],
        },
      ],
      evals: [
        {
          evalId: "eval:outcome-pairing-track",
          replayRequired: true,
          observabilityStateRefs: ["outcomePairId"],
          evidenceRefs: ["tests/lib/outcome-pairing/track.test.ts"],
        },
      ],
    }),
    runtimeProjection: runtimeProjection({
      codexSupport: "adapter-native",
      codexFallbackObligations: ["Use emit_event rather than direct event-log append."],
      unsupportedCodexSurfaceRefs: ["codex:native-append-only-hook-enforcement"],
    }),
    complexE2EScenarios: [
      complexE2EScenario({
        scenarioId: "complex-e2e:lineage-event-to-replay-learning",
        workflowFamily: "lineageReplayAndLearning",
        title: "Event capture and outcome pairing produce replayable learning evidence.",
        coveredPhaseIds: ["lineage-learning:event-capture", "lineage-learning:replay-query"],
        requiredContractRefs: ["DecisionLineage5Dim", "OutcomePairingDeclaration"],
        aipSurfaceRefs: ["evals-observability", "security-governance"],
        runtimeRefs: ["claude", "codex"],
        validationRefs: ["tests/lib/event-log/grade-promotion.test.ts"],
        evidenceRefs: ["tests/lib/outcome-pairing/track.test.ts"],
      }),
    ],
  }),
  applicationAndChatbotAuthoring: familyContract({
    workflowFamily: "applicationAndChatbotAuthoring",
    phases: [
      phase({
        phaseId: "app-chatbot:application-state-design",
        entryCondition: "A chatbot, workbench, or app-facing authoring surface is requested.",
        exitCondition: "Application variables, retrieval context, and user-visible state are declared.",
        allowedTransitions: ["app-chatbot:authoring-validation"],
        blockingGates: ["application-state-authority"],
        allowedTools: ["pm_semantic_workbench_state", "ontology_context_query"],
        requiredEvidenceRefs: ["ApplicationVariableContract", "RetrievalContextContract"],
        outputStateRefs: ["applicationStateProjection"],
        deterministicStatus: "enforced",
      }),
      phase({
        phaseId: "app-chatbot:authoring-validation",
        entryCondition: "Application state and retrieval context projection exist.",
        exitCondition: "Authoring output is validated against eval, skill, or workbench contract.",
        blockingGates: ["authoring-eval-suite"],
        allowedTools: ["bun test", "pm_semantic_workbench_state"],
        requiredEvidenceRefs: ["validationPack", "evalSuite"],
        outputStateRefs: ["authoringValidationResult"],
        deterministicStatus: "enforced",
      }),
    ],
    aipSurfaceRefs: [
      aipRef("application-state-variables", ["lib/chatbot-studio/application-state.ts"]),
      aipRef("chatbots-as-functions", ["lib/chatbot-studio/semantic-conversation-state.ts"]),
      aipRef("retrieval-context", ["lib/ontology-context/retrieval-context.ts"]),
    ],
    requiredContracts: CONTRACT_REQUIREMENTS.sicAndDtc,
    enforcement: enforcement({
      evals: [],
    }),
    runtimeProjection: runtimeProjection({
      codexSupport: "manual",
      codexFallbackObligations: ["Validate chatbot/application state projections without claiming native UI parity."],
      unsupportedCodexSurfaceRefs: ["codex:runtime-native-chatbot-studio-ui"],
    }),
    complexE2EScenarios: [
      complexE2EScenario({
        scenarioId: "complex-e2e:application-state-to-chatbot-authoring-validation",
        workflowFamily: "applicationAndChatbotAuthoring",
        title: "Application state and retrieval context flow into chatbot authoring validation.",
        coveredPhaseIds: [
          "app-chatbot:application-state-design",
          "app-chatbot:authoring-validation",
        ],
        requiredContractRefs: ["ApplicationVariableContract", "RetrievalContextContract"],
        aipSurfaceRefs: [
          "application-state-variables",
          "chatbots-as-functions",
          "retrieval-context",
        ],
        runtimeRefs: ["claude", "codex"],
        validationRefs: ["tests/lib/chatbot-studio/semantic-conversation-state.test.ts"],
        evidenceRefs: ["tests/lib/chatbot-studio/semantic-conversation-state.test.ts"],
      }),
    ],
  }),
} satisfies Record<WorkflowFamily, WorkflowFamilyEnforcementContract>;

export const WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY =
  WORKFLOW_FAMILIES.map(
    (workflowFamily) => WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_REGISTRY[workflowFamily],
  ) satisfies readonly WorkflowFamilyEnforcementContract[];

export const WORKFLOW_FAMILY_COMPLEX_E2E_SCENARIO_DECLARATIONS =
  WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY.flatMap(
    (contract) => contract.complexE2EScenarios,
  ) satisfies readonly ComplexE2EScenarioDeclaration[];

export function getWorkflowFamilyEnforcementContract(
  workflowFamily: WorkflowFamily,
): WorkflowFamilyEnforcementContract {
  return WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_REGISTRY[workflowFamily];
}

export function listWorkflowFamiliesMissingComplexE2EScenarioDeclarations(
  contracts: readonly WorkflowFamilyEnforcementContract[] =
    WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY,
): WorkflowFamily[] {
  const coveredFamilies = new Set(
    contracts.flatMap((contract) =>
      contract.complexE2EScenarios
        .filter(
          (scenario) =>
            scenario.workflowFamily === contract.workflowFamily &&
            scenario.complexity === "complex" &&
            scenario.ratchet === "required-complex-e2e-scenario",
        )
        .map((scenario) => scenario.workflowFamily),
    ),
  );

  return WORKFLOW_FAMILIES.filter((workflowFamily) => !coveredFamilies.has(workflowFamily));
}
