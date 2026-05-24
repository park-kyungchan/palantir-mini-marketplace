import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  handleOntologyEngineeringWorkflow,
} from "../../../bridge/handlers/pm-ontology-engineering-workflow";
import {
  readCurrentOntologyEngineeringWorkflowState,
  readOntologyEngineeringWorkflowState,
} from "../../../lib/ontology-engineering-workflow";
import {
  createUniversalOntologyEntry,
} from "../../../lib/ontology-entry/universal-entry";
import {
  writeUniversalOntologyEntry,
} from "../../../lib/ontology-entry/entry-store";

let projectRoot: string;

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-ontology-workflow-"));
});

afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

function writeEntry(): string {
  const entry = createUniversalOntologyEntry({
    rawUserRequest: "Implement an ontology engineering workflow for teacher intervention decisions.",
    projectRoot,
    promptId: "prompt-workflow",
    promptHash: "hash-workflow",
    sessionId: "runtime-session",
    runtime: "codex",
    createdAt: "2026-05-22T00:00:00.000Z",
  });
  return writeUniversalOntologyEntry(entry).entryRef;
}

describe("pm-ontology-engineering-workflow handler", () => {
  test("starts workflow state from a UniversalOntologyEntry and FDE session", async () => {
    const entryRef = writeEntry();
    const result = await handleOntologyEngineeringWorkflow({
      action: "start",
      projectRoot,
      universalOntologyEntryRef: entryRef,
      sessionId: "fde-session:workflow",
      createdAt: "2026-05-22T00:01:00.000Z",
    });

    expect(result.session?.sessionId).toBe("fde-session:workflow");
    expect(result.sessionRef).toBe("fde-ontology-engineering://session/fde-session:workflow");
    expect(result.state.schemaVersion).toBe("palantir-mini/ontology-engineering-workflow/v1");
    expect(result.state.phase).toBe("fde-active");
    expect(result.state.allowedNextActions).toContain("turn");
    expect(result.state.mutationAuthorized).toBe(false);
    expect(fs.existsSync(result.statePath)).toBe(true);
    expect(result.statePath).toContain(".palantir-mini/session/ontology-engineering-workflow");
    expect(readCurrentOntologyEngineeringWorkflowState(projectRoot)?.fdeSessionId)
      .toBe("fde-session:workflow");
  });

  test("status is read-only and does not rewrite workflow state", async () => {
    const entryRef = writeEntry();
    const started = await handleOntologyEngineeringWorkflow({
      action: "start",
      projectRoot,
      universalOntologyEntryRef: entryRef,
      sessionId: "fde-session:workflow",
      createdAt: "2026-05-22T00:01:00.000Z",
      emittedAt: "2026-05-22T00:01:00.000Z",
    });
    const previousCurrent = fs.readFileSync(started.currentPath, "utf8");
    const previousState = fs.readFileSync(started.statePath, "utf8");

    const status = await handleOntologyEngineeringWorkflow({
      action: "status",
      projectRoot,
      sessionId: "fde-session:workflow",
      semanticIntentContractRef: "semantic-intent:approved:test",
      digitalTwinChangeContractRef: "digital-twin-change:approved:test",
      emittedAt: "2026-05-22T00:09:00.000Z",
    });

    expect(status.state.mutationAuthorized).toBe(false);
    expect(status.state.updatedAt).toBe(started.state.updatedAt);
    expect(fs.readFileSync(started.currentPath, "utf8")).toBe(previousCurrent);
    expect(fs.readFileSync(started.statePath, "utf8")).toBe(previousState);
    expect(readCurrentOntologyEngineeringWorkflowState(projectRoot)?.mutationAuthorized)
      .toBe(false);
  });

  test("status does not create an FDE session or workflow state from an entry", async () => {
    const entryRef = writeEntry();

    const status = await handleOntologyEngineeringWorkflow({
      action: "status",
      projectRoot,
      universalOntologyEntryRef: entryRef,
      sessionId: "fde-session:new",
      emittedAt: "2026-05-22T00:01:00.000Z",
    });

    expect(status.session).toBeUndefined();
    expect(status.state.phase).toBe("not-started");
    expect(fs.existsSync(status.currentPath)).toBe(false);
    expect(fs.existsSync(status.statePath)).toBe(false);
    expect(fs.existsSync(path.join(
      projectRoot,
      ".palantir-mini/session/fde-ontology-engineering/current.json",
    ))).toBe(false);
  });

  test("routes turn through the internal FDE handler and drafts SIC without mutation authority", async () => {
    const entryRef = writeEntry();
    await handleOntologyEngineeringWorkflow({
      action: "start",
      projectRoot,
      universalOntologyEntryRef: entryRef,
      sessionId: "fde-session:workflow",
      createdAt: "2026-05-22T00:01:00.000Z",
    });

    const rawUserMessage = "RAW USER PROMPT SHOULD NOT BE IN WORKFLOW STATE";
    const turn = await handleOntologyEngineeringWorkflow({
      action: "turn",
      projectRoot,
      sessionId: "fde-session:workflow",
      rawUserMessage,
      sanitizedTurnSummary: "Track teacher intervention readiness.",
      signal: {
        mission: {
          operationalDecision: "Decide teacher intervention readiness.",
          decisionOwnerRole: "teacher",
          successSignals: ["teacher can choose next intervention"],
        },
        evidence: {
          evidenceDefinition: "Student answer and explanation evidence.",
          observableSignals: ["answer pattern"],
          sourceArtifactRefs: ["evidence://student-answer"],
          missingEvidenceQuestions: [],
        },
        objectNames: ["Student"],
        linkNames: ["Student has answer"],
        actionNames: ["Record intervention"],
        functionNames: ["Score explanation"],
        chatbotContextNames: ["Teacher assistant state"],
        sourceRefs: ["evidence://student-answer"],
      },
      emittedAt: "2026-05-22T00:02:00.000Z",
    });

    expect(turn.turn?.session.phase).toBe("semantic-contract-ready");
    expect(turn.state.allowedNextActions).toContain("draft_sic");
    expect(turn.state.turnDecisionSpecs.length).toBeGreaterThan(0);
    expect(turn.state.mutationAuthorized).toBe(false);
    expect(turn.state.userDecisionRecords).toEqual([]);
    expect(turn.state.decisionLedgerAuditFindings).toEqual([
      expect.objectContaining({
        findingId: "decision-ledger.forward-only-existing-gap",
        severity: "warn",
        policy: "forward-only-plus-audit",
        turnCount: 1,
        userDecisionRecordCount: 0,
        expectedMinimumRecordCount: 1,
        backfillApplied: false,
      }),
    ]);

    const draft = await handleOntologyEngineeringWorkflow({
      action: "draft_sic",
      projectRoot,
      sessionId: "fde-session:workflow",
      affectedSurfaces: ["lib/ontology-engineering-workflow/**"],
      emittedAt: "2026-05-22T00:03:00.000Z",
    });

    expect(draft.semanticIntentContract?.status).toBe("draft");
    expect(draft.semanticIntentContract?.approvedNouns).toContain("Student");
    expect(draft.semanticIntentContract?.approvedVerbs).toContain("Record intervention");
    expect(draft.state.phase).toBe("semantic-contract-drafted");
    expect(draft.state.mutationAuthorized).toBe(false);

    const status = await handleOntologyEngineeringWorkflow({
      action: "status",
      projectRoot,
      sessionId: "fde-session:workflow",
    });
    expect(status.state.semanticIntentContractRef).toBe(draft.semanticIntentContract?.contractId);
    expect(status.state.phase).toBe("semantic-contract-drafted");

    const rawWorkflowState = fs.readFileSync(draft.statePath, "utf8");
    expect(rawWorkflowState).not.toContain(rawUserMessage);
  });

  test("mutation authorization requires explicit contract statuses and an approved decision record", async () => {
    const entryRef = writeEntry();
    await handleOntologyEngineeringWorkflow({
      action: "start",
      projectRoot,
      universalOntologyEntryRef: entryRef,
      sessionId: "fde-session:workflow",
    });

    const draftOnly = await handleOntologyEngineeringWorkflow({
      action: "status",
      projectRoot,
      sessionId: "fde-session:workflow",
      semanticIntentContractRef: "semantic-intent:draft:test",
      semanticIntentContractStatus: "draft",
      digitalTwinChangeContractRef: "digital-twin-change:approved:test",
      digitalTwinChangeContractStatus: "approved",
    });
    expect(draftOnly.state.mutationAuthorized).toBe(false);

    const refOnly = await handleOntologyEngineeringWorkflow({
      action: "status",
      projectRoot,
      sessionId: "fde-session:workflow",
      semanticIntentContractRef: "semantic-intent:approved:test",
      digitalTwinChangeContractRef: "digital-twin-change:approved:test",
    });
    expect(refOnly.state.mutationAuthorized).toBe(false);

    const contractsOnly = await handleOntologyEngineeringWorkflow({
      action: "status",
      projectRoot,
      sessionId: "fde-session:workflow",
      semanticIntentContractRef: "semantic-intent:test",
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "digital-twin-change:test",
      digitalTwinChangeContractStatus: "approved",
      workContractRef: "work-contract:test",
    });
    expect(contractsOnly.state.mutationAuthorized).toBe(false);

    const approved = await handleOntologyEngineeringWorkflow({
      action: "turn",
      projectRoot,
      sessionId: "fde-session:workflow",
      sanitizedTurnSummary: "Approve the mutation authorization dereference policy.",
      semanticIntentContractRef: "semantic-intent:test",
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "digital-twin-change:test",
      digitalTwinChangeContractStatus: "approved",
      workContractRef: "work-contract:test",
      choiceApplications: [
        {
          decisionId: "mutationAuthorization-dereference-policy",
          choiceId: "mutationAuthorization-dereference-policy.recommended-approved-records-only",
          kind: "accept",
          decision: "accepted",
          approvedMutationBoundary:
            "plugin-source-tests-only:pm-ontology-engineering-workflow-mutation-auth-dereference",
          fdeSessionRef: "fde-ontology-engineering://session/fde-session:workflow",
        },
      ],
      emittedAt: "2026-05-22T00:04:00.000Z",
    });

    expect(approved.state.phase).toBe("mutation-authorized");
    expect(approved.state.allowedNextActions).toEqual(["status"]);
    expect(approved.state.mutationAuthorized).toBe(true);
    expect(approved.state.userDecisionRecords).toContainEqual(expect.objectContaining({
      decisionId: "mutationAuthorization-dereference-policy",
      source: "handler-input",
      kind: "accept",
      approvedMutationBoundary:
        "plugin-source-tests-only:pm-ontology-engineering-workflow-mutation-auth-dereference",
    }));
    expect(approved.state.decisionLedgerAuditFindings).toEqual([]);

    const status = await handleOntologyEngineeringWorkflow({
      action: "status",
      projectRoot,
      sessionId: "fde-session:workflow",
    });
    expect(status.state.mutationAuthorized).toBe(true);
  });

  test("turn uses fdeSessionRef over runtime sessionId and does not copy current records across sessions", async () => {
    const entryRef = writeEntry();
    await handleOntologyEngineeringWorkflow({
      action: "start",
      projectRoot,
      universalOntologyEntryRef: entryRef,
      sessionId: "fde-session:target",
      createdAt: "2026-05-22T00:01:00.000Z",
    });

    await handleOntologyEngineeringWorkflow({
      action: "start",
      projectRoot,
      universalOntologyEntryRef: entryRef,
      sessionId: "runtime-prompt-session",
      createdAt: "2026-05-22T00:02:00.000Z",
    });
    await handleOntologyEngineeringWorkflow({
      action: "turn",
      projectRoot,
      sessionId: "runtime-prompt-session",
      sanitizedTurnSummary: "Approve a different prompt-local workflow.",
      semanticIntentContractRef: "semantic-intent:prompt",
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "digital-twin-change:prompt",
      digitalTwinChangeContractStatus: "approved",
      workContractRef: "work-contract:prompt",
      choiceApplications: [
        {
          decisionId: "prompt-session-policy",
          choiceId: "prompt-session-policy.recommended",
          kind: "accept",
          approvedMutationBoundary: "runtime-only:prompt-session",
        },
      ],
      emittedAt: "2026-05-22T00:03:00.000Z",
    });

    const target = await handleOntologyEngineeringWorkflow({
      action: "turn",
      projectRoot,
      fdeSessionRef: "fde-ontology-engineering://session/fde-session:target",
      sessionId: "runtime-prompt-session",
      sanitizedTurnSummary: "Continue the target FDE workflow.",
      signal: {
        mission: {
          operationalDecision: "Decide target workflow readiness.",
          decisionOwnerRole: "workflow owner",
          successSignals: ["target workflow advances without prompt-session leakage"],
        },
      },
      emittedAt: "2026-05-22T00:04:00.000Z",
    });

    expect(target.sessionRef).toBe("fde-ontology-engineering://session/fde-session:target");
    expect(target.state.fdeSessionId).toBe("fde-session:target");
    expect(target.state.userDecisionRecords).toEqual([]);
    expect(target.state.decisionLedgerAuditFindings).toEqual([
      expect.objectContaining({
        turnCount: 1,
        userDecisionRecordCount: 0,
        backfillApplied: false,
      }),
    ]);
    expect(readOntologyEngineeringWorkflowState(
      projectRoot,
      "ontology-engineering-workflow:runtime-prompt-session",
    )?.userDecisionRecords).toHaveLength(1);
    expect(readCurrentOntologyEngineeringWorkflowState(projectRoot)?.fdeSessionId)
      .toBe("fde-session:target");
  });
});
