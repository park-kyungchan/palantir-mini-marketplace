import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  buildChatbotStudioLedgerEntry,
  buildChatbotStudioPublishAnalogue,
  readChatbotStudioLedger,
  runLocalChatbotStudioTurn,
  serializeChatbotStudioLedgerEntry,
} from "../../../lib/chatbot-studio/local-workbench";
import {
  buildChatbotStudioDeclarationFromConversation,
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

const TEMP_ROOTS: string[] = [];
const PLUGIN_ROOT = path.join(import.meta.dir, "../../..");

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

function tempLedgerPath(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-chatbot-studio-ledger-"));
  TEMP_ROOTS.push(root);
  return path.join(root, "session-ledger.jsonl");
}

function conversation(approved = false) {
  const semanticIntent: SemanticIntentContract | undefined = approved
    ? {
        contractId: "sic:workbench",
        status: "approved",
        confirmedIntent: "Run local Chatbot Studio workbench",
        approvedObjectTypeRefs: ["ObjectType:LocalChatbotStudioSession"],
        approvedLinkTypeRefs: ["LinkType:session-records-exchange"],
        approvedSurfaceRefs: ["lib/chatbot-studio/local-workbench.ts"],
        approvedLaneRefs: ["ACTION"],
        approvedNouns: ["ChatbotStudioLocalWorkbench"],
        approvedVerbs: ["run"],
        nonGoals: ["external publish"],
        downstreamAllowed: [],
        downstreamForbidden: ["runtime cache mutation"],
        supportingEvidenceRefs: [],
        approvalRef: "approval:sic",
      } as unknown as SemanticIntentContract
    : undefined;
  const dtc: DigitalTwinChangeContract | undefined = approved
    ? {
        contractId: "dtc:workbench",
        status: "approved",
        theme: "chatbot-studio-local-workbench",
        changeBoundary: { affectedSurfaces: ["lib/chatbot-studio/local-workbench.ts"] },
        approvedNouns: ["ChatbotStudioLocalWorkbench"],
        approvedVerbs: ["run"],
        nonGoals: ["external publish"],
        downstreamAllowed: [],
        downstreamForbidden: ["runtime cache mutation", "Foundry publish"],
        supportingResearchRefs: [],
        approvalRef: "approval:dtc",
      } as unknown as DigitalTwinChangeContract
    : undefined;

  return buildSemanticConversationState({
    gateInput: {
      project: "/tmp/palantir-mini",
      rawIntent: "Run local Chatbot Studio workbench",
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
      rawIntent: "Run local Chatbot Studio workbench",
      projectRoot: "/tmp/palantir-mini",
      scopePaths: ["lib/chatbot-studio/local-workbench.ts"],
    }),
    turnCardDecisionQueue: [],
    contractRefs: approved
      ? {
          semanticIntentContractRef: "sic:workbench",
          digitalTwinChangeContractRef: "dtc:workbench",
          approvalRef: "approval:dtc",
        }
      : undefined,
    semanticIntentContract: semanticIntent,
    digitalTwinChangeContract: dtc,
  });
}

afterEach(() => {
  for (const root of TEMP_ROOTS.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("local Chatbot Studio workbench", () => {
  test("returns the local callable shape with markdown, session id, updates, and trace refs", () => {
    const result = runLocalChatbotStudioTurn({
      conversation: conversation(true),
      userInput: "Plan the next approved action",
      sessionId: "chatbot-studio-session:test",
      variableInputs: {
        "semantic.lifecycle": "dtc-approved",
        "semantic.validation.requiredPacks": ["chatbot-studio-local-workbench"],
      },
      now: new Date("2026-05-31T13:00:00Z"),
    });

    expect(result.schemaVersion).toBe("palantir-mini/chatbot-studio-local-workbench/v1");
    expect(result.sessionId).toBe("chatbot-studio-session:test");
    expect(result.responseMarkdown).toContain("## Semantic Boundary");
    expect(result.responseMarkdown).toContain("### Context Engineering Layer");
    expect(result.responseMarkdown).toContain("### Ontology Modeling Layer");
    expect(result.responseMarkdown).toContain("Context Engineering DATA/LOGIC/ACTION");
    expect(result.responseMarkdown).toContain("## Planned Tools");
    expect(result.variableUpdates.map((update) => update.variableId)).toEqual([
      "semantic.lifecycle",
      "semantic.validation.requiredPacks",
    ]);
    expect(result.plannedToolSurfaceRefs).toContain("tool:chatbot-studio:route-with-approved-dtc");
    expect(result.traceRefs).toContain("chatbot-studio-local-regression:action-approval");
    expect(result.traceRefs).toContain("chatbot-studio-local-regression:semantic-boundary");
  });

  test("shows runtime gaps while keeping source-complete separate from active runtime", () => {
    const result = runLocalChatbotStudioTurn({
      conversation: conversation(true),
      userInput: "Show runtime gaps",
    });

    expect(result.runtimeGaps.map((gap) => gap.runtime)).toEqual(["codex", "claude", "gemini"]);
    expect(result.runtimeGaps.find((gap) => gap.runtime === "codex")?.runtimeGapRefs)
      .toContain("codex:requires-plugin-reinstall-reload-and-process-restart");
    expect(result.runtimeGaps.find((gap) => gap.runtime === "gemini")?.support)
      .toBe("unsupported");
    expect(result.responseMarkdown).toContain("codex:source-complete-is-not-active-runtime-complete");
  });

  test("blocks protected actions until approval evidence exists", () => {
    const result = runLocalChatbotStudioTurn({
      conversation: conversation(false),
      userInput: "Try to mutate without approval",
    });

    expect(result.blockedActionSurfaceRefs).toContain("action:chatbot-studio:protected-mutation");
    expect(result.publishAnalogue.status).toBe("blocked");
    expect(result.publishAnalogue.externalPublishAuthorized).toBe(false);
    expect(result.responseMarkdown).toContain("Protected actions require approved DTC evidence");
  });

  test("publish analogue can become ready for local review but never external publish", () => {
    const declaration = buildChatbotStudioDeclarationFromConversation({
      conversation: conversation(true),
    });
    const publish = buildChatbotStudioPublishAnalogue(declaration);

    expect(publish.status).toBe("ready-for-local-review");
    expect(publish.externalPublishAuthorized).toBe(false);
    expect(publish.blockedActionSurfaceRefs).toContain("action:chatbot-studio:publish-analogue");
    expect(publish.nonParityClaims.join("\n")).toContain("No Foundry SaaS");
  });

  test("appends and reads JSONL ledger entries when an explicit ledger path is supplied", () => {
    const ledgerPath = tempLedgerPath();
    const result = runLocalChatbotStudioTurn({
      conversation: conversation(true),
      userInput: "Record this turn",
      ledgerPath,
      now: new Date("2026-05-31T13:05:00Z"),
    });
    const entries = readChatbotStudioLedger(ledgerPath);
    const entry = buildChatbotStudioLedgerEntry(result, "2026-05-31T13:05:00.000Z");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      schemaVersion: "palantir-mini/chatbot-studio-ledger-entry/v1",
      sessionId: result.sessionId,
      userInput: "Record this turn",
      publishStatus: "ready-for-local-review",
    });
    expect(JSON.parse(serializeChatbotStudioLedgerEntry(entry))).toMatchObject({
      entryId: entry.entryId,
      runtimeGapRefs: expect.arrayContaining(["gemini:runtime-gap-unsupported"]),
    });
  });

  test("PR7 regression fixture names every local workbench boundary", () => {
    const fixture = JSON.parse(
      fs.readFileSync(
        path.join(PLUGIN_ROOT, "tests/evals/chatbot-studio-local-workbench-regression.json"),
        "utf8",
      ),
    ) as { testCases?: { category: string }[] };

    expect(fixture.testCases?.map((entry) => entry.category)).toEqual([
      "callable_shape",
      "variable_pin_update",
      "tool_planning",
      "protected_action_block",
      "runtime_gap_display",
      "jsonl_ledger",
      "publish_analogue",
    ]);
  });
});
