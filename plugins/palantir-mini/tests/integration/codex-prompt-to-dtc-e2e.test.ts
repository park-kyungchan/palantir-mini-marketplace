import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { semanticIntentGate } from "../../bridge/handlers/pm-semantic-intent-gate";
import { routeIntent } from "../../bridge/handlers/pm-intent-router";
import {
  extractPromptFrontDoorIdentityContext,
  runCodexHookAdapter,
} from "../../lib/codex/claude-hook-adapter";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../lib/lead-intent/contracts";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};
const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");

function makeTmpProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-codex-prompt-dtc-e2e-"));
  tmpDirs.push(root);
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), "{\"name\":\"codex-prompt-dtc-e2e\"}\n");
  return root;
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function semanticContract(): SemanticIntentContract {
  return {
    contractId: "semantic-intent:approved:codex-e2e",
    status: "approved",
    rawIntent: "Codex adapter Prompt-to-DTC E2E validation.",
    confirmedIntent:
      "Codex UserPromptSubmit identity should authorize ontology router continuity.",
    nonGoals: ["Do not change Prompt-DTC gate mode."],
    approvedNouns: ["PromptEnvelope", "SemanticIntentContract", "DigitalTwinChangeContract"],
    approvedVerbs: ["capture", "persist", "route"],
    affectedSurfaces: [
      ".claude/plugins/palantir-mini/lib/codex/claude-hook-adapter.ts",
      ".claude/plugins/palantir-mini/bridge/handlers/pm-intent-router.ts",
      ".claude/plugins/palantir-mini/tests/integration/codex-prompt-to-dtc-e2e.test.ts",
    ],
    permissionsAndProposal: "Codex adapter E2E test only.",
    acceptedRisks: [],
    downstreamAllowed: ["Persist prompt-local contracts and route from refs."],
    downstreamForbidden: ["Do not mutate runtime gate defaults."],
    clarificationQuestions: [],
    approvalRef: "user:approved:codex-e2e",
  };
}

function digitalTwinContract(): DigitalTwinChangeContract {
  return {
    contractId: "digital-twin-change:approved:codex-e2e",
    status: "approved",
    semanticIntentContractRef: "semantic-intent:approved:codex-e2e",
    affectedSurfaces: [
      ".claude/plugins/palantir-mini/lib/codex/claude-hook-adapter.ts",
      ".claude/plugins/palantir-mini/bridge/handlers/pm-intent-router.ts",
      ".claude/plugins/palantir-mini/tests/integration/codex-prompt-to-dtc-e2e.test.ts",
    ],
    changeBoundary: "Codex prompt identity E2E proof only.",
    branchProposalPolicy: "Ship as Wave 11 after eval suite lands.",
    permissionBoundary: "Only Codex adapter parser and integration test surfaces may change.",
    replayMigrationPlan: "No replay migration.",
    observabilityPlan: "Assert prompt identity and contract refs in gate/router outputs.",
    toolSurfaceReadiness:
      "Codex adapter UserPromptSubmit output supplies fields exposed by MCP schemas.",
    evaluationPlan: "Run Codex adapter, semantic gate, router, schema, and Prompt-to-DTC tests.",
    touchedOntologyRefs: [{
      kind: "ObjectType",
      rid: "ontology://palantir-mini/object/PromptEnvelope",
      displayName: "PromptEnvelope",
      project: "palantir-mini",
      sourcePath: "lib/prompt-front-door/index.ts",
      confidence: "exact",
    }],
    requiredEvaluationRefs: [{
      kind: "ValidationPack",
      rid: "project://palantir-mini/validation-pack/codex-prompt-to-dtc-e2e",
      displayName: "codex-prompt-to-dtc-e2e",
      project: "palantir-mini",
      sourcePath: "tests/integration/codex-prompt-to-dtc-e2e.test.ts",
      confidence: "exact",
    }],
    requiredUserDecisions: [{
      decisionId: "decision-codex-e2e-contract-boundary",
      domain: "TECHNOLOGY",
      label: "Codex prompt identity E2E contract boundary approved",
      status: "approved",
      blocking: true,
      evidenceRefs: ["test://codex-prompt-to-dtc-e2e"],
      approvalRef: "user:approved:codex-e2e-technology",
    }],
    risks: [],
    approvalRef: "user:approved:codex-e2e",
  };
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEnv.PALANTIR_MINI_HOST_RUNTIME = process.env.PALANTIR_MINI_HOST_RUNTIME;
  delete process.env.PALANTIR_MINI_PROJECT;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_HOST_RUNTIME;
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("Codex Prompt-to-DTC E2E", () => {
  test("Codex UserPromptSubmit identity flows through semantic gate and router", async () => {
    const project = makeTmpProject();
    const prompt =
      "Implement ontology router continuity for Codex Prompt-to-DTC approved contracts.";
    const adapterResult = await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: project,
        session_id: "codex-e2e-session",
        turn_id: "turn-codex-e2e",
        prompt,
      },
      {
        home: os.tmpdir(),
        pluginRoot: PLUGIN_ROOT,
        hooksJsonPath: path.join(PLUGIN_ROOT, "hooks", "hooks.json"),
        bunPath: process.execPath,
        cwd: project,
        env: {
          ...process.env,
          PALANTIR_MINI_PROJECT: project,
          PALANTIR_MINI_EVENTS_FILE: eventsPathFor(project),
          PALANTIR_MINI_HOST_RUNTIME: "codex",
        },
      },
    );

    const hookSpecificOutput = adapterResult.response.hookSpecificOutput;
    const additionalContext =
      typeof hookSpecificOutput === "object" &&
      hookSpecificOutput !== null &&
      !Array.isArray(hookSpecificOutput)
        ? (hookSpecificOutput as Record<string, unknown>).additionalContext
        : undefined;
    expect(typeof additionalContext).toBe("string");

    const identity = extractPromptFrontDoorIdentityContext(additionalContext as string);
    expect(identity).toBeDefined();
    expect(identity?.runtime).toBe("codex");
    expect(identity?.sessionId).toBe("codex-e2e-session");

    const gate = await semanticIntentGate({
      project,
      rawIntent: prompt,
      scopePaths: [
        ".claude/plugins/palantir-mini/lib/codex/claude-hook-adapter.ts",
        ".claude/plugins/palantir-mini/bridge/handlers/pm-intent-router.ts",
        ".claude/plugins/palantir-mini/tests/integration/codex-prompt-to-dtc-e2e.test.ts",
      ],
      complexityHint: "multi-file",
      ...identity,
      semanticIntentContract: semanticContract(),
      digitalTwinChangeContract: digitalTwinContract(),
    });

    expect(gate.status).toBe("pass");
    expect(gate.promptEnvelope?.state).toBe("digital_twin_approved");
    expect(gate.contractRefs?.semanticIntentContractRef).toContain(
      "prompt-front-door://contract/semantic-intent/",
    );
    expect(gate.contractRefs?.digitalTwinChangeContractRef).toContain(
      "prompt-front-door://contract/digital-twin-change/",
    );

    const route = await routeIntent({
      project,
      intent: prompt,
      scopePaths: [
        ".claude/plugins/palantir-mini/lib/codex/claude-hook-adapter.ts",
        ".claude/plugins/palantir-mini/bridge/handlers/pm-intent-router.ts",
        ".claude/plugins/palantir-mini/tests/integration/codex-prompt-to-dtc-e2e.test.ts",
      ],
      complexityHint: "multi-file",
      ...identity,
    });

    expect(route.contractGate.status).toBe("pass");
    expect(route.promptEnvelope?.promptId).toBe(identity?.promptId);
    expect(route.promptEnvelope?.promptHash).toBe(identity?.promptHash);
    expect(route.contractRefs?.semanticIntentContractRef).toBe(
      gate.contractRefs?.semanticIntentContractRef,
    );
    expect(route.contractRefs?.digitalTwinChangeContractRef).toBe(
      gate.contractRefs?.digitalTwinChangeContractRef,
    );
    expect(route.routingProjection.basis).toBe("approved-inline-contracts");
    expect(route.routingProjection.hasContractFields).toBe(true);
  });
});
