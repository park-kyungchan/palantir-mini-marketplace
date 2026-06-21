// palantir-mini 7.23.0 — drift_rebind pure RE-BIND primitive
// (rebindPersistedApprovalToCurrentEnvelope).
//
// PROVES the legitimate-RESUME re-bind:
//   1. re-key writes NEW front-door records under the CURRENT envelope's promptId
//      (NOT the prior prompt's), for both the SIC and the DTC.
//   2. the minted approvalRefs are carried forward BYTE-IDENTICAL (never re-minted).
//   3. the advanced envelope reaches `digital_twin_approved`, carrying the new refs.
//   4. `contractContinuityMatches` holds for BOTH re-keyed records vs the advanced
//      envelope (the PreToolUse gate's continuity anchor passes for the current prompt).
//   5. FAIL-CLOSED: missing envelope, non-approved DTC, wrong-scope DTC, and an
//      unminted approvalRef each THROW before any write.

import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { rebindPersistedApprovalToCurrentEnvelope } from "../../../lib/prompt-front-door/rebind-persisted-approval";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
  transitionPromptEnvelope,
  type PromptContractRecord,
  type PromptEnvelope,
} from "../../../lib/prompt-front-door";
import { createUserApprovalRef } from "../../../lib/prompt-front-door/approval-ref";
import { mintApprovedSemanticIntentContract } from "../../fixtures/minted-approved-sic";
import type { ApprovedSemanticIntentContract } from "../../../lib/semantic-intent/approved-contract";
import type { DigitalTwinChangeContract } from "../../../lib/lead-intent/contracts";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";

const tmpRoots: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-rebind-persist-${label}-`));
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  tmpRoots.push(root);
  return root;
}

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

/** A genuinely-minted approved SIC (unforgeable minted approvalRef). */
function mintedSic(): ApprovedSemanticIntentContract {
  return mintApprovedSemanticIntentContract("semantic-intent:rebind-persist");
}

/** A well-formed approved DTC body bound to `sicContractId`, carrying a minted approvalRef. */
function approvedDtc(sicContractId: string): DigitalTwinChangeContract {
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
    contractId: "digital-twin-change:rebind-persist",
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
  } as DigitalTwinChangeContract;
}

/**
 * Persist a DTC record under a PRIOR envelope so the re-bind has a real
 * PromptContractRecord to carry forward, and return that record.
 */
async function persistPriorDtcRecord(
  store: PromptFrontDoorStore,
  root: string,
  dtc: DigitalTwinChangeContract,
): Promise<PromptContractRecord<DigitalTwinChangeContract>> {
  const priorEnvelope = createPromptEnvelope({
    rawPrompt: "the prior approving prompt",
    sessionId: "prior-session",
    runtime: "claude",
    projectRoot: root,
    capturedAt: "2026-06-20T00:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(priorEnvelope);
  return store.writeContractRecord(priorEnvelope, "digital-twin-change", dtc);
}

/** A fresh CURRENT captured envelope (state: captured) under a NEW promptId. */
function currentCapturedEnvelope(root: string): PromptEnvelope {
  return createPromptEnvelope({
    rawPrompt: "the current prompt that resumes the build",
    sessionId: "current-session",
    runtime: "claude",
    projectRoot: root,
    capturedAt: "2026-06-21T00:00:00.000Z",
    sequence: 1,
  });
}

function contractContinuityMatches(
  envelope: PromptEnvelope,
  record: { promptId: string; promptHash: string },
): boolean {
  return record.promptId === envelope.promptId && record.promptHash === envelope.promptHash;
}

describe("rebindPersistedApprovalToCurrentEnvelope — legitimate RESUME re-bind (7.23.0)", () => {
  test("re-keys NEW records under the CURRENT promptId; minted refs byte-identical; advanced envelope is digital_twin_approved; continuity matches both", async () => {
    const root = setupRoot("happy");
    const store = new PromptFrontDoorStore({ projectRoot: root });
    const approvedSic = mintedSic();
    const dtc = approvedDtc(approvedSic.contractId);
    const priorRecord = await persistPriorDtcRecord(store, root, dtc);
    const currentEnvelope = currentCapturedEnvelope(root);

    const result = await rebindPersistedApprovalToCurrentEnvelope({
      store,
      currentEnvelope,
      approvedSic,
      dtcRecord: priorRecord,
    });

    // (3) advanced envelope reached digital_twin_approved, carrying the new refs.
    expect(result.advancedEnvelope.state).toBe("digital_twin_approved");
    expect(result.advancedEnvelope.contractRefs.semanticIntentContractRef).toBe(
      result.semanticIntentContractRef,
    );
    expect(result.advancedEnvelope.contractRefs.digitalTwinChangeContractRef).toBe(
      result.digitalTwinChangeContractRef,
    );

    // (1) the NEW records resolve and are keyed to the CURRENT promptId — NOT the prior.
    const newSicRecord = await store.readContractRecordByRef(result.semanticIntentContractRef);
    const newDtcRecord = await store.readContractRecordByRef(result.digitalTwinChangeContractRef);
    expect(newSicRecord).not.toBeNull();
    expect(newDtcRecord).not.toBeNull();
    expect(newSicRecord!.promptId).toBe(currentEnvelope.promptId);
    expect(newDtcRecord!.promptId).toBe(currentEnvelope.promptId);
    // The new DTC ref differs from the prior record's ref (re-keyed, not reused).
    expect(result.digitalTwinChangeContractRef).not.toBe(priorRecord.ref);
    expect(newDtcRecord!.promptId).not.toBe(priorRecord.promptId);

    // (2) the minted approvalRefs are carried forward BYTE-IDENTICAL (never re-minted).
    expect(newSicRecord!.approvalRef).toEqual(approvedSic.approvalRef);
    expect(newDtcRecord!.approvalRef).toEqual(dtc.approvalRef);
    expect(newSicRecord!.contract.approvalRef).toEqual(approvedSic.approvalRef);
    expect(newDtcRecord!.contract.approvalRef).toEqual(dtc.approvalRef);
    // The DTC still binds to the SAME SIC contractId.
    expect((newDtcRecord!.contract as DigitalTwinChangeContract).semanticIntentContractRef).toBe(
      approvedSic.contractId,
    );

    // (4) continuity holds for BOTH re-keyed records vs the advanced envelope.
    expect(contractContinuityMatches(result.advancedEnvelope, newSicRecord!)).toBe(true);
    expect(contractContinuityMatches(result.advancedEnvelope, newDtcRecord!)).toBe(true);

    // The persisted advanced envelope on disk matches (saveEnvelope ran).
    const persistedEnvelope = await store.readEnvelope(
      currentEnvelope.sessionId,
      currentEnvelope.promptId,
    );
    expect(persistedEnvelope?.state).toBe("digital_twin_approved");
  });

  test("FAIL-CLOSED: a missing current envelope throws (no write)", async () => {
    const root = setupRoot("no-envelope");
    const store = new PromptFrontDoorStore({ projectRoot: root });
    const approvedSic = mintedSic();
    const dtc = approvedDtc(approvedSic.contractId);
    const priorRecord = await persistPriorDtcRecord(store, root, dtc);

    await expect(
      rebindPersistedApprovalToCurrentEnvelope({
        store,
        currentEnvelope: null,
        approvedSic,
        dtcRecord: priorRecord,
      }),
    ).rejects.toThrow(/no current captured prompt envelope/i);
  });

  test("FAIL-CLOSED: a non-approved DTC record throws", async () => {
    const root = setupRoot("dtc-not-approved");
    const store = new PromptFrontDoorStore({ projectRoot: root });
    const approvedSic = mintedSic();
    const draftDtc = { ...approvedDtc(approvedSic.contractId), status: "draft" } as DigitalTwinChangeContract;
    const priorRecord = await persistPriorDtcRecord(store, root, draftDtc);
    const currentEnvelope = currentCapturedEnvelope(root);

    await expect(
      rebindPersistedApprovalToCurrentEnvelope({
        store,
        currentEnvelope,
        approvedSic,
        dtcRecord: priorRecord,
      }),
    ).rejects.toThrow(/not approved/i);
  });

  test("FAIL-CLOSED: a wrong-scope DTC (binds to a different SIC) throws", async () => {
    const root = setupRoot("wrong-scope");
    const store = new PromptFrontDoorStore({ projectRoot: root });
    const approvedSic = mintedSic();
    // The DTC binds to a DIFFERENT SIC contractId than the approved one.
    const dtc = approvedDtc("semantic-intent:SOME-OTHER-SIC");
    const priorRecord = await persistPriorDtcRecord(store, root, dtc);
    const currentEnvelope = currentCapturedEnvelope(root);

    await expect(
      rebindPersistedApprovalToCurrentEnvelope({
        store,
        currentEnvelope,
        approvedSic,
        dtcRecord: priorRecord,
      }),
    ).rejects.toThrow(/does not bind to the approved SIC|cross-scope/i);
  });

  test("FAIL-CLOSED: an unminted (empty-string) approvalRef on the DTC throws", async () => {
    const root = setupRoot("unminted-ref");
    const store = new PromptFrontDoorStore({ projectRoot: root });
    const approvedSic = mintedSic();
    // status approved + bound to the right SIC, but approvalRef is an empty string
    // (validateApprovalRefValue returns a non-empty issue list → fail-closed).
    const dtc = { ...approvedDtc(approvedSic.contractId), approvalRef: "" } as DigitalTwinChangeContract;
    const priorRecord = await persistPriorDtcRecord(store, root, dtc);
    const currentEnvelope = currentCapturedEnvelope(root);

    await expect(
      rebindPersistedApprovalToCurrentEnvelope({
        store,
        currentEnvelope,
        approvedSic,
        dtcRecord: priorRecord,
      }),
    ).rejects.toThrow(/approvalRef is not minted/i);
  });

  test("FAIL-CLOSED: an unminted approvalRef on the approved SIC throws (no record written)", async () => {
    const root = setupRoot("unminted-sic-ref");
    const store = new PromptFrontDoorStore({ projectRoot: root });
    // Force the SIC's approvalRef to an empty string (defeats the minted check).
    const approvedSic = { ...mintedSic(), approvalRef: "" } as unknown as ApprovedSemanticIntentContract;
    const dtc = approvedDtc(approvedSic.contractId);
    const priorRecord = await persistPriorDtcRecord(store, root, dtc);
    const currentEnvelope = currentCapturedEnvelope(root);

    await expect(
      rebindPersistedApprovalToCurrentEnvelope({
        store,
        currentEnvelope,
        approvedSic,
        dtcRecord: priorRecord,
      }),
    ).rejects.toThrow(/SIC approvalRef is not minted/i);

    // No SIC record was written under the current prompt (fail-closed before any write).
    const sicRecords = path.join(
      root,
      ".palantir-mini",
      "session",
      "prompt-front-door",
      "contracts",
      "semantic-intent",
      "current-session",
    );
    expect(fs.existsSync(sicRecords)).toBe(false);
  });
});
