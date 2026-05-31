import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  appendChatbotStudioExchange,
  buildChatbotStudioDeclarationFromConversation,
  buildChatbotStudioSessionState,
  CHATBOT_STUDIO_EXCHANGE_STATE_SCHEMA_VERSION,
  validateChatbotStudioDeclaration,
  validateChatbotStudioSessionState,
  type ChatbotStudioExchangeState,
} from "../../../lib/chatbot-studio/data-core";
import {
  buildSemanticConversationState,
} from "../../../lib/chatbot-studio/semantic-conversation-state";
import { buildLayer0IntentBridge } from "../../../lib/context-engineering/intent-bridge";
import type {
  ContractGateResult,
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../../lib/lead-intent/contracts";

const PLUGIN_ROOT = join(import.meta.dir, "../../..");

function gate(overrides: Partial<ContractGateResult> = {}): ContractGateResult {
  return {
    status: "contract_required",
    allowsRouting: false,
    reason: "Contract required",
    contractPolicy: "approval-required",
    riskClass: "digital-twin",
    requiredContracts: ["SemanticIntentContract", "DigitalTwinChangeContract"],
    recommendedContracts: ["SemanticIntentContract", "DigitalTwinChangeContract"],
    questions: [],
    semanticIntent: { valid: false, issues: [] },
    digitalTwin: { valid: false, issues: [] },
    ...overrides,
  };
}

function conversation(approved = false) {
  const semanticIntent: SemanticIntentContract | undefined = approved
    ? {
        contractId: "sic:test",
        status: "approved",
        confirmedIntent: "Build local Chatbot Studio data core",
        approvedObjectTypeRefs: ["ObjectType:ChatbotStudioDeclaration"],
        approvedLinkTypeRefs: ["LinkType:chatbot-studio-declares-context"],
        approvedSurfaceRefs: ["lib/chatbot-studio/data-core.ts"],
        approvedLaneRefs: ["DATA"],
        approvedNouns: ["ChatbotStudioDeclaration"],
        approvedVerbs: ["build"],
        nonGoals: ["Foundry SaaS parity"],
        downstreamAllowed: [],
        downstreamForbidden: ["runtime publish"],
        supportingEvidenceRefs: [],
        approvalRef: "approval:sic",
      } as unknown as SemanticIntentContract
    : undefined;
  const dtc: DigitalTwinChangeContract | undefined = approved
    ? {
        contractId: "dtc:test",
        status: "approved",
        theme: "chatbot-studio-data-core",
        changeBoundary: { affectedSurfaces: ["lib/chatbot-studio/data-core.ts"] },
        approvedNouns: ["ChatbotStudioDeclaration"],
        approvedVerbs: ["build"],
        nonGoals: ["runtime publish"],
        downstreamAllowed: [],
        downstreamForbidden: ["protected mutation without approval"],
        supportingResearchRefs: [],
        approvalRef: "approval:dtc",
      } as unknown as DigitalTwinChangeContract
    : undefined;

  return buildSemanticConversationState({
    gateInput: {
      project: "/tmp/palantir-mini",
      rawIntent: "Build local Chatbot Studio data core",
      runtime: "codex",
      preferredLanguage: "en",
      userExpertise: "developer",
    },
    gate: gate(approved
      ? {
          status: "pass",
          allowsRouting: true,
          semanticIntent: { valid: true, issues: [] },
          digitalTwin: { valid: true, issues: [] },
        }
      : {}),
    bridge: buildLayer0IntentBridge({
      rawIntent: "Build local Chatbot Studio data core",
      projectRoot: "/tmp/palantir-mini",
      scopePaths: ["lib/chatbot-studio/data-core.ts"],
    }),
    turnCardDecisionQueue: [],
    contractRefs: approved
      ? {
          semanticIntentContractRef: "sic:test",
          digitalTwinChangeContractRef: "dtc:test",
          approvalRef: "approval:dtc",
        }
      : undefined,
    semanticIntentContract: semanticIntent,
    digitalTwinChangeContract: dtc,
    validationFacing: {
      requiredValidationPacks: ["chatbot-studio-local-regression"],
      suggestedCommands: ["bun test tests/lib/chatbot-studio/data-core.test.ts"],
    },
  });
}

describe("Chatbot Studio local data core", () => {
  test("builds a local declaration from SemanticConversationState projections", () => {
    const declaration = buildChatbotStudioDeclarationFromConversation({
      conversation: conversation(),
      title: "Local Chatbot Studio Core",
    });

    expect(declaration.sourceKind).toBe("local-aip-chatbot-studio-analogue");
    expect(declaration.scope).toBe("one-developer-local-analogue");
    expect(declaration.nonParityClaims.join("\n")).toContain("Not Foundry SaaS parity");
    expect(declaration.applicationState.variables.length).toBeGreaterThan(0);
    expect(declaration.retrievalContext.retrievedPrompt).toContain("Control state source");
    expect(declaration.retrievalContext.retrievedPrompt).toContain(
      "Context Engineering refs are not Ontology primitive declarations",
    );
    expect(declaration.toolSurfaces.map((tool) => tool.kind)).toContain("retrieval-context");
    expect(declaration.evalSurfaces.map((surface) => surface.evalKind)).toEqual([
      "application-state",
      "retrieval-context",
      "semantic-boundary",
      "action-approval",
    ]);
    expect(validateChatbotStudioDeclaration(declaration)).toEqual({
      status: "pass",
      issues: [],
    });
  });

  test("keeps runtime projections separated and unsupported runtimes explicit", () => {
    const declaration = buildChatbotStudioDeclarationFromConversation({
      conversation: conversation(),
    });
    const byRuntime = new Map(declaration.runtimeProjections.map((projection) => [
      projection.runtime,
      projection,
    ]));

    expect(byRuntime.get("codex")).toMatchObject({
      support: "adapter-native",
      adapterContractRef: "runtime-adapters/codex/contract.json",
      packageSurface: "codex-plugin",
    });
    expect(byRuntime.get("claude")).toMatchObject({
      support: "unsupported",
      adapterContractRef: "runtime-adapters/claude/contract.json",
      packageSurface: "absent",
    });
    expect(byRuntime.get("gemini")?.runtimeGapRefs).toContain("gemini:runtime-gap-unsupported");
  });

  test("blocks protected actions until approved DTC evidence exists", () => {
    const draft = buildChatbotStudioDeclarationFromConversation({ conversation: conversation() });
    const approved = buildChatbotStudioDeclarationFromConversation({
      conversation: conversation(true),
    });

    expect(draft.actionSurfaces.find((action) => action.actionKind === "protected-mutation"))
      .toMatchObject({
        enabled: false,
        approvalPolicy: "dtc-approval-required",
        blockedReason: "Protected actions require approved DTC evidence.",
      });
    expect(approved.actionSurfaces.find((action) => action.actionKind === "protected-mutation"))
      .toMatchObject({
        enabled: true,
        approvalEvidenceRefs: ["dtc:test", "approval:dtc"],
      });
    expect(approved.toolSurfaces.find((tool) => tool.kind === "route-with-approved-dtc"))
      .toMatchObject({ enabled: true });
  });

  test("separates Context Engineering refs from Ontology primitive refs", () => {
    const declaration = buildChatbotStudioDeclarationFromConversation({
      conversation: conversation(true),
    });

    expect(declaration.retrievalContext.ontologyPrimitiveRefs).toEqual([
      "ObjectType:ChatbotStudioDeclaration",
      "LinkType:chatbot-studio-declares-context",
    ]);
    expect(declaration.retrievalContext.ontologyRefs).toEqual(
      declaration.retrievalContext.ontologyPrimitiveRefs,
    );
    expect(declaration.retrievalContext.contextEngineeringRefs).toEqual(
      expect.arrayContaining([
        "lib/chatbot-studio/data-core.ts",
        "DATA",
      ]),
    );
    expect(declaration.retrievalContext.validationRefs).toContain(
      "chatbot-studio-local-regression",
    );
    expect(declaration.retrievalContext.ontologyPrimitiveRefs).not.toContain(
      "chatbot-studio-local-regression",
    );
  });

  test("grounds the semantic boundary in Palantir research SSoT without claiming parity", () => {
    const declaration = buildChatbotStudioDeclarationFromConversation({
      conversation: conversation(true),
    });
    const warningText = declaration.semanticBoundary.nonInterchangeabilityWarnings.join("\n");
    const sourceText = declaration.semanticBoundary.sourceAuthorityRefs.join("\n");

    expect(declaration.semanticBoundary.localAnalogueOnly).toBe(true);
    expect(declaration.semanticBoundary.foundryParityClaimed).toBe(false);
    expect(declaration.semanticBoundary.providerIdentityAuthority).toBe("metadata-only");
    expect(declaration.semanticBoundary.mutationAuthority).toBe("approved-dtc-only");
    expect(sourceText).toContain(
      "/home/palantirkc/.claude/research/palantir-official/foundry/architecture-center/aip-architecture.md",
    );
    expect(sourceText).toContain(
      "/home/palantirkc/.claude/research/palantir-official/foundry/ontology/core-concepts.md",
    );
    expect(warningText).toContain("Context Engineering");
    expect(warningText).toContain("ObjectType");
    expect(warningText).toContain("ActionType");
    expect(warningText).toContain("Provider/runtime identity is metadata only");
    expect(declaration.semanticBoundary.noReferenceNoConfusionRules.join("\n")).toContain(
      "Public Codex MCP input schemas must stay flat",
    );
  });

  test("builds session and exchange state without enabling publish analogue", () => {
    const declaration = buildChatbotStudioDeclarationFromConversation({
      conversation: conversation(true),
    });
    const session = buildChatbotStudioSessionState({
      declaration,
      userInput: "Route this approved DTC",
      responseMarkdown: "Ready for bounded implementation.",
      now: new Date("2026-05-31T12:00:00Z"),
    });
    const extraExchange: ChatbotStudioExchangeState = {
      schemaVersion: CHATBOT_STUDIO_EXCHANGE_STATE_SCHEMA_VERSION,
      exchangeId: "chatbot-studio-exchange:manual",
      userInput: "Run eval",
      responseMarkdown: "Eval trace recorded.",
      plannedToolSurfaceRefs: ["tool:chatbot-studio:retrieval-context"],
      blockedActionSurfaceRefs: ["action:chatbot-studio:publish-analogue"],
      variableUpdateRefs: [],
      evalTraceRefs: ["chatbot-studio-local-regression:traceability"],
      createdAt: "2026-05-31T12:05:00.000Z",
    };
    const appended = appendChatbotStudioExchange(session, extraExchange);

    expect(session.lifecycle).toBe("approved-boundary");
    expect(session.applicationVariableSnapshot["semantic.lifecycle"]).toBe("dtc-approved");
    expect(session.exchanges[0]?.plannedToolSurfaceRefs).toContain(
      "tool:chatbot-studio:route-with-approved-dtc",
    );
    expect(declaration.actionSurfaces.find((action) => action.actionKind === "publish-analogue"))
      .toMatchObject({ enabled: false });
    expect(validateChatbotStudioSessionState(appended, declaration)).toEqual({
      status: "pass",
      issues: [],
    });
    expect(appended.traceRefs).toContain("chatbot-studio-local-regression:traceability");
  });

  test("fails validation when unsupported runtime gaps disappear", () => {
    const declaration = buildChatbotStudioDeclarationFromConversation({
      conversation: conversation(),
    });
    const result = validateChatbotStudioDeclaration({
      ...declaration,
      runtimeProjections: declaration.runtimeProjections.filter((projection) =>
        projection.runtime !== "gemini"
      ),
    });

    expect(result.status).toBe("fail");
    expect(result.issues.map((issue) => issue.issueId)).toContain("chatbot-studio.runtime-count");
  });

  test("local regression fixture covers the PR6 core boundaries", () => {
    const fixture = JSON.parse(
      readFileSync(join(PLUGIN_ROOT, "tests/evals/chatbot-studio-local-regression.json"), "utf8"),
    ) as {
      targetSchemaRef?: string;
      testCases?: { testCaseId: string; category: string }[];
      fixtureDeclaration?: { validators?: { requiredChecks?: string[] } };
    };

    expect(fixture.targetSchemaRef).toBe("schemas/chatbot-studio-local-core.schema.json");
    expect(fixture.testCases?.map((entry) => entry.category)).toEqual([
      "application_state",
      "retrieval_context",
      "semantic_boundary",
      "tool_planning",
      "action_approval",
      "eval_traceability",
      "runtime_gaps",
    ]);
    expect(fixture.fixtureDeclaration?.validators?.requiredChecks).toContain(
      "claude_gemini_runtime_gap",
    );
  });

  test("local core schema covers declaration, session, and exchange state versions", () => {
    const schema = JSON.parse(
      readFileSync(join(PLUGIN_ROOT, "schemas/chatbot-studio-local-core.schema.json"), "utf8"),
    ) as { properties?: { schemaVersion?: { enum?: string[] } } };

    expect(schema.properties?.schemaVersion?.enum).toEqual(
      expect.arrayContaining([
        "palantir-mini/chatbot-studio-declaration/v1",
        "palantir-mini/chatbot-studio-session-state/v1",
        "palantir-mini/chatbot-studio-exchange-state/v1",
      ]),
    );
  });
});
