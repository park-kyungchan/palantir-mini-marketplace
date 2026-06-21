// palantir-mini 7.23.0 — the `drift_rebind` action (composed governed RESUME):
// re-bind a PERSISTED minted approved SIC + DTC to the CURRENT prompt envelope, then
// DELEGATE to the unchanged fail-closed `rebind_registered` re-elevation in ONE call.
//
// Mirrors tests/bridge/handlers/ontology-engineering-rebind-registered.test.ts:
//   happy            — N edit_committed at HEAD, grammar UNCHANGED, audit event emitted,
//                      envelope ADVANCED to digital_twin_approved.
//   empty/unverified — distinct invalidReason (the rebind_registered "no verified re-bind rids").
//   new rid          — rejected; grammar unchanged.
//   bad DTC ref      — committed:false naming PREDICATE B; envelope NOT advanced.
//   no persisted SIC — committed:false with the OE-2 (predicate A) reason.

import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { handleOntologyEngineeringWorkflow } from "../../../bridge/handlers/pm-ontology-engineering-workflow";
import getOntology from "../../../bridge/handlers/get-ontology";
import { createUniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import {
  createFDEOntologyEngineeringSessionFromEntry,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "../../../lib/fde-ontology-engineering/session-store";
import { projectPrimitiveRid } from "../../../lib/actions/project-primitive-rid";
import { readEvents } from "../../../lib/event-log/read";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
  type PromptEnvelope,
} from "../../../lib/prompt-front-door";
import { createUserApprovalRef } from "../../../lib/prompt-front-door/approval-ref";
import { mintApprovedSemanticIntentContract } from "../../fixtures/minted-approved-sic";
import {
  ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
  writeOntologyEngineeringWorkflowState,
  type OntologyEngineeringWorkflowState,
} from "../../../lib/ontology-engineering-workflow";
import type {
  FDEOntologyEngineeringSession,
  FDEReadinessProfileEvaluation,
} from "../../../lib/fde-ontology-engineering/types";
import type { DigitalTwinChangeContract } from "../../../lib/lead-intent/contracts";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";

const tmpRoots: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-drift-rebind-${label}-`));
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  tmpRoots.push(root);
  return root;
}

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

function readinessProfile(passed: boolean): FDEReadinessProfileEvaluation {
  return {
    profileId: "mission-decision",
    score: passed ? 1 : 0,
    readyForSemanticIntent: passed,
    readyForDigitalTwin: passed,
    requirementResults: [],
    missingRequired: [],
    warnings: [],
  };
}

/** Seed an approved + graded session with object/action/function/link candidates. */
function seedSession(root: string): FDEOntologyEngineeringSession {
  const entry = createUniversalOntologyEntry({
    rawUserRequest: "implement a lesson tracker that links a Student to a Lesson",
    projectRoot: root,
  });
  const base = createFDEOntologyEngineeringSessionFromEntry({ entry });
  const session: FDEOntologyEngineeringSession = {
    ...base,
    phase: "dtc-ready",
    objectCandidates: [
      { candidateId: "obj-student", plainName: "Student", whyItMayMatter: "the learner", evidenceRefs: ["evidence:student"] },
      { candidateId: "obj-lesson", plainName: "Lesson", whyItMayMatter: "the unit", evidenceRefs: ["evidence:lesson"] },
    ],
    actionCandidates: [
      {
        candidateId: "act-record-progress",
        plainName: "Record Progress",
        operationalIntent: "write a student's progress against a lesson",
        writebackRisk: "low",
        submissionCriteria: [],
        evidenceRefs: ["evidence:progress"],
      },
    ],
    functionCandidates: [
      {
        candidateId: "fn-completion-rate",
        plainName: "Completion Rate",
        logicIntent: "compute completion ratio per student",
        deterministic: true,
        evidenceRefs: ["evidence:rate"],
      },
    ],
    linkCandidates: [
      {
        candidateId: "lnk-attends",
        plainName: "Attends",
        sourceObject: "Student",
        targetObject: "Lesson",
        businessMeaning: "a student attends a lesson",
        evidenceRefs: ["evidence:attends"],
      },
    ],
    readinessProfileId: "mission-decision",
    readinessProfile: readinessProfile(true),
  };
  writeFDEOntologyEngineeringSessionSnapshot(session);
  return session;
}

/**
 * Persist a workflow state carrying a GENUINELY-minted approved-SIC snapshot keyed
 * to `sessionId` (predicate A's source), and return the minted SIC contractId so the
 * DTC record can bind to it. Mirrors seedMintedApprovedSicWorkflowState but returns
 * the contractId the DTC must reference.
 */
function seedMintedSicState(root: string, sessionId: string): string {
  const minted = mintApprovedSemanticIntentContract();
  const now = "2026-06-21T00:00:00.000Z";
  const state: OntologyEngineeringWorkflowState = {
    schemaVersion: ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
    contractId: `ontology-engineering-workflow:${sessionId}`,
    projectRoot: root,
    fdeSessionId: sessionId,
    fdeSessionRef: `fde-ontology-engineering://session/${sessionId}`,
    semanticIntentContractRef: minted.contractId,
    semanticIntentContractStatus: "approved",
    digitalTwinChangeContractRef: "dtc:placeholder",
    digitalTwinChangeContractStatus: "approved",
    phase: "digital-twin-approved",
    allowedNextActions: ["status"],
    mutationAuthorized: false,
    sourceRefs: [`fde-ontology-engineering://session/${sessionId}`],
    turnDecisionSpecs: [],
    userDecisionRecords: [],
    decisionLedgerAuditFindings: [],
    approvedSemanticIntentContractSnapshot: minted,
    createdAt: now,
    updatedAt: now,
  };
  writeOntologyEngineeringWorkflowState(state);
  return minted.contractId;
}

/** A well-formed approved DTC body bound to `sicContractId`, carrying a minted approvalRef. */
function approvedDtc(sicContractId: string, overrides: Partial<DigitalTwinChangeContract> = {}): DigitalTwinChangeContract {
  const approvalRef = createUserApprovalRef({
    promptId: "prior-approval-prompt",
    promptHash: "prior-approval-hash",
    sessionId: "prior-approval-session",
    runtime: "claude",
    userVisibleSummary: "approve the DTC build",
    userAnswer: "approve the DTC build",
    approvalSurface: "digital-twin-change",
  });
  return {
    schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
    contractId: "digital-twin-change:drift-rebind",
    status: "approved",
    semanticIntentContractRef: sicContractId,
    affectedSurfaces: ["ontology/data/thing.ts"],
    changeBoundary: "Add Thing.",
    branchProposalPolicy: "Proposal PR before merge.",
    permissionBoundary: "Owner only.",
    replayMigrationPlan: "Additive only.",
    observabilityPlan: "Emit events.",
    toolSurfaceReadiness: "Refs threaded.",
    evaluationPlan: "Targeted tests.",
    risks: [],
    approvalRef,
    ...overrides,
  } as DigitalTwinChangeContract;
}

/** Write a CURRENT captured envelope + a prior DTC record; return refs the handler needs. */
async function seedFrontDoor(
  root: string,
  sicContractId: string,
  dtcOverrides: Partial<DigitalTwinChangeContract> = {},
): Promise<{ envelope: PromptEnvelope; dtcRef: string }> {
  const store = new PromptFrontDoorStore({ projectRoot: root });
  // The PRIOR envelope the approved DTC record was minted under.
  const priorEnvelope = createPromptEnvelope({
    rawPrompt: "the prior approving prompt",
    sessionId: "current-session",
    runtime: "claude",
    projectRoot: root,
    capturedAt: "2026-06-20T00:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(priorEnvelope);
  const dtcRecord = await store.writeContractRecord(
    priorEnvelope,
    "digital-twin-change",
    approvedDtc(sicContractId, dtcOverrides),
  );
  // The CURRENT captured envelope (a FRESH prompt, state: captured) under the SAME session.
  const currentEnvelope = createPromptEnvelope({
    rawPrompt: "resume the build on the current prompt",
    sessionId: "current-session",
    runtime: "claude",
    projectRoot: root,
    capturedAt: "2026-06-21T00:00:00.000Z",
    sequence: 2,
  });
  await store.saveEnvelope(currentEnvelope);
  return { envelope: currentEnvelope, dtcRef: dtcRecord.ref };
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function editCommittedCount(root: string): number {
  return readEvents(eventsPathFor(root)).filter((e) => e.type === "edit_committed").length;
}

function driftAdvancedCount(root: string): number {
  return readEvents(eventsPathFor(root)).filter((e) => e.type === "drift_rebind_envelope_advanced").length;
}

async function counts(root: string) {
  const r = (await getOntology({ project: root })).snapshot.registeredPrimitives!;
  return {
    objectTypes: r.objectTypes.length,
    actionTypes: r.actionTypes.length,
    functions: r.functions.length,
    linkTypes: r.linkTypes.length,
    roles: r.roles.length,
    properties: r.properties.length,
  };
}

async function registeredRids(root: string): Promise<string[]> {
  const r = (await getOntology({ project: root })).snapshot.registeredPrimitives!;
  return [...r.objectTypes, ...r.actionTypes, ...r.functions, ...r.linkTypes, ...r.roles, ...r.properties].map((e) => e.rid);
}

async function envelopeState(root: string, sessionId: string, promptId: string): Promise<string | undefined> {
  const store = new PromptFrontDoorStore({ projectRoot: root });
  return (await store.readEnvelope(sessionId, promptId))?.state;
}

describe("drift_rebind action — composed governed RESUME (7.23.0)", () => {
  test("HAPPY: re-binds persisted approval to current prompt, re-elevates N rids at HEAD, grammar UNCHANGED, audit event emitted, envelope ADVANCED", async () => {
    const P = setupRoot("happy");
    const session = seedSession(P);
    const sicContractId = seedMintedSicState(P, session.sessionId);

    // (1) Normal register materializes the grammar (the already-registered set).
    const reg = await handleOntologyEngineeringWorkflow({
      action: "register",
      project: P,
      sessionId: session.sessionId,
      semanticIntentContractRef: sicContractId,
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "dtc:placeholder",
      digitalTwinChangeContractStatus: "approved",
    });
    expect(reg.register?.committed).toBe(true);

    const beforeCounts = await counts(P);
    const beforeRids = await registeredRids(P);
    const commitsBefore = editCommittedCount(P);
    expect(beforeRids.length).toBeGreaterThan(0);

    // (2) Seed the front-door: a persisted approved DTC record bound to the SIC, plus
    //     a FRESH current captured envelope. Then drift_rebind in ONE call.
    const { envelope, dtcRef } = await seedFrontDoor(P, sicContractId);

    const result = await handleOntologyEngineeringWorkflow({
      action: "drift_rebind",
      project: P,
      sessionId: session.sessionId,
      digitalTwinChangeContractRef: dtcRef,
      rebindRids: beforeRids,
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      frontDoorSessionId: envelope.sessionId,
      frontDoorRuntime: "claude",
    });

    // Delegated re-elevation committed.
    expect(result.register?.committed).toBe(true);
    expect(result.register?.invalidReason).toBeUndefined();

    // Exactly ONE new edit_committed (the single re-elevation commit — single boundary).
    expect(editCommittedCount(P)).toBe(commitsBefore + 1);

    // The DISTINCT audit event was emitted exactly once.
    expect(driftAdvancedCount(P)).toBe(1);

    // GRAMMAR UNCHANGED — Part-B dedup collapses the re-elevation.
    expect(await counts(P)).toEqual(beforeCounts);
    expect((await registeredRids(P)).sort()).toEqual([...beforeRids].sort());

    // The CURRENT envelope was ADVANCED to digital_twin_approved (the gate-advance step).
    expect(await envelopeState(P, envelope.sessionId, envelope.promptId)).toBe("digital_twin_approved");
  });

  test("NEGATIVE: empty rebindRids ⇒ committed:false with the DISTINCT rebind invalidReason", async () => {
    const P = setupRoot("empty");
    const session = seedSession(P);
    const sicContractId = seedMintedSicState(P, session.sessionId);
    await handleOntologyEngineeringWorkflow({
      action: "register",
      project: P,
      sessionId: session.sessionId,
      semanticIntentContractRef: sicContractId,
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "dtc:placeholder",
      digitalTwinChangeContractStatus: "approved",
    });
    const { envelope, dtcRef } = await seedFrontDoor(P, sicContractId);

    const result = await handleOntologyEngineeringWorkflow({
      action: "drift_rebind",
      project: P,
      sessionId: session.sessionId,
      digitalTwinChangeContractRef: dtcRef,
      rebindRids: [],
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      frontDoorSessionId: envelope.sessionId,
    });
    expect(result.register?.committed).toBe(false);
    // The re-bind SUCCEEDED (envelope advanced) but the delegated re-elevation found no rids.
    expect(result.register?.invalidReason).toContain("no verified re-bind rids");
    expect(await envelopeState(P, envelope.sessionId, envelope.promptId)).toBe("digital_twin_approved");
  });

  test("ADVERSARIAL: a genuinely-NEW rid can NEVER flow through drift_rebind (rejected, grammar unchanged)", async () => {
    const P = setupRoot("new-rid");
    const session = seedSession(P);
    const sicContractId = seedMintedSicState(P, session.sessionId);
    await handleOntologyEngineeringWorkflow({
      action: "register",
      project: P,
      sessionId: session.sessionId,
      semanticIntentContractRef: sicContractId,
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "dtc:placeholder",
      digitalTwinChangeContractStatus: "approved",
    });
    const beforeCounts = await counts(P);
    const commitsBefore = editCommittedCount(P);
    const newRid = projectPrimitiveRid(P, "object-type", "NeverRegisteredGhost");
    const { envelope, dtcRef } = await seedFrontDoor(P, sicContractId);

    const result = await handleOntologyEngineeringWorkflow({
      action: "drift_rebind",
      project: P,
      sessionId: session.sessionId,
      digitalTwinChangeContractRef: dtcRef,
      rebindRids: [newRid],
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      frontDoorSessionId: envelope.sessionId,
    });
    expect(result.register?.committed).toBe(false);
    expect(result.register?.invalidReason).toContain("no verified re-bind rids");
    // No NEW edit_committed; grammar unchanged; ghost never registers.
    expect(editCommittedCount(P)).toBe(commitsBefore);
    expect(await counts(P)).toEqual(beforeCounts);
    expect(await registeredRids(P)).not.toContain(newRid);
  });

  test("PREDICATE B: a non-approved (draft) DTC record ⇒ committed:false naming predicate B; envelope NOT advanced", async () => {
    const P = setupRoot("dtc-draft");
    const session = seedSession(P);
    const sicContractId = seedMintedSicState(P, session.sessionId);
    await handleOntologyEngineeringWorkflow({
      action: "register",
      project: P,
      sessionId: session.sessionId,
      semanticIntentContractRef: sicContractId,
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "dtc:placeholder",
      digitalTwinChangeContractStatus: "approved",
    });
    const rids = await registeredRids(P);
    // A DTC record with status draft (predicate B fails on status).
    const { envelope, dtcRef } = await seedFrontDoor(P, sicContractId, { status: "draft" });

    const result = await handleOntologyEngineeringWorkflow({
      action: "drift_rebind",
      project: P,
      sessionId: session.sessionId,
      digitalTwinChangeContractRef: dtcRef,
      rebindRids: rids,
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      frontDoorSessionId: envelope.sessionId,
    });
    expect(result.register?.committed).toBe(false);
    expect(result.register?.invalidReason).toContain("predicate B");
    expect(result.register?.invalidReason).toContain("not approved");
    // The current envelope was NOT advanced (still captured).
    expect(await envelopeState(P, envelope.sessionId, envelope.promptId)).toBe("captured");
  });

  test("PREDICATE B: an ABSENT/unresolvable DTC ref ⇒ committed:false naming predicate B; envelope NOT advanced", async () => {
    const P = setupRoot("dtc-absent");
    const session = seedSession(P);
    const sicContractId = seedMintedSicState(P, session.sessionId);
    await handleOntologyEngineeringWorkflow({
      action: "register",
      project: P,
      sessionId: session.sessionId,
      semanticIntentContractRef: sicContractId,
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "dtc:placeholder",
      digitalTwinChangeContractStatus: "approved",
    });
    const rids = await registeredRids(P);
    // A current envelope, but pass a bogus (unresolvable) DTC ref.
    const { envelope } = await seedFrontDoor(P, sicContractId);

    const result = await handleOntologyEngineeringWorkflow({
      action: "drift_rebind",
      project: P,
      sessionId: session.sessionId,
      digitalTwinChangeContractRef: "prompt-front-door://contract/digital-twin-change/x/y/z",
      rebindRids: rids,
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      frontDoorSessionId: envelope.sessionId,
    });
    expect(result.register?.committed).toBe(false);
    expect(result.register?.invalidReason).toContain("predicate B");
    expect(await envelopeState(P, envelope.sessionId, envelope.promptId)).toBe("captured");
  });

  test("PREDICATE A: no persisted minted approved SIC ⇒ committed:false with the OE-2 reason", async () => {
    const P = setupRoot("no-sic");
    const session = seedSession(P);
    // NOTE: seedSession does NOT persist a minted approved-SIC snapshot (no seedMintedSicState).
    const { envelope, dtcRef } = await seedFrontDoor(P, "semantic-intent:unbacked");
    const rids: string[] = [];

    const result = await handleOntologyEngineeringWorkflow({
      action: "drift_rebind",
      project: P,
      sessionId: session.sessionId,
      digitalTwinChangeContractRef: dtcRef,
      rebindRids: rids,
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      frontDoorSessionId: envelope.sessionId,
    });
    expect(result.register?.committed).toBe(false);
    expect(result.register?.invalidReason).toContain("predicate A");
    expect(result.register?.invalidReason).toContain("OE-2");
    // Envelope NOT advanced (predicate A fails before the re-bind).
    expect(await envelopeState(P, envelope.sessionId, envelope.promptId)).toBe("captured");
  });
});
