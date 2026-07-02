// palantir-mini 7.23.0 — drift_rebind WHOLE-ALTITUDE replay e2e (MANDATORY).
//
// Proves the composed governed RESUME end-to-end through the REAL surfaces:
//   1. register + commit a small ontology (grammar materializes at HEAD-1).
//   2. persist an approved SIC + approved DTC bound to a PRIOR prompt (the genuine
//      prior approval) — and a workflow-state minted approved-SIC snapshot.
//   3. ADVANCE git HEAD (simulate new commits landing after the prior approval).
//   4. write a FRESH captured prompt envelope (no contract refs yet).
//   5. run the REAL PreToolUse gate (prompt-dtc-enforcement-gate, blocking) on a
//      mutating call for the fresh prompt → assert it BLOCKS (drift: not digital_twin_approved).
//   6. call `drift_rebind` ONCE → assert the re-elevation commits at the NEW HEAD,
//      grammar UNCHANGED, and the fresh envelope is advanced to digital_twin_approved.
//   7. re-run the SAME gate for the SAME fresh prompt → assert it now PASSES, and that
//      NO prompt_dtc_gate_off_bypass event was emitted (the gate was never disabled).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import promptDtcEnforcementGate from "../../hooks/gates/prompt-dtc-enforcement-gate.impl";
import { handleOntologyEngineeringWorkflow } from "../../bridge/handlers/pm-ontology-engineering-workflow";
import getOntology from "../../bridge/handlers/get-ontology";
import { readEvents } from "../../lib/event-log/read";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
  type PromptEnvelope,
} from "../../lib/prompt-front-door";
import {
  createUniversalOntologyEntry,
} from "../../lib/ontology-entry/universal-entry";
import {
  createFDEOntologyEngineeringSessionFromEntry,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "../../lib/fde-ontology-engineering/session-store";
import {
  ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
  writeOntologyEngineeringWorkflowState,
  type OntologyEngineeringWorkflowState,
} from "../../lib/ontology-engineering-workflow";
import type {
  FDEOntologyEngineeringSession,
  FDEReadinessProfileEvaluation,
} from "../../lib/fde-ontology-engineering/types";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../lib/lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";

const tmpRoots: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function setupRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-drift-rebind-e2e-"));
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), "{\"name\":\"drift-rebind-e2e\"}\n");
  tmpRoots.push(root);
  return root;
}

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

/**
 * Initialize a REAL throwaway git repo in `root` with one commit, and return its
 * HEAD SHA. The code under test resolves `atopWhich` via the shared `gitHeadSha`
 * (`git rev-parse HEAD`), which consults packed-refs and rejects a fabricated
 * `.git` with no objects — so the fixture must be a real repo. (Replaces the old
 * fs-fabricated `.git/HEAD` + loose ref, which `git rev-parse` returned "no-git" for.)
 */
function initGitHead(root: string): string {
  git(root, "init", "-q");
  git(root, "config", "user.email", "t@t.test");
  git(root, "config", "user.name", "test");
  fs.writeFileSync(path.join(root, "anchor.txt"), "v1\n");
  git(root, "add", "anchor.txt");
  git(root, "commit", "-q", "-m", "base");
  return git(root, "rev-parse", "HEAD");
}

/** Make a fresh real commit to advance HEAD (new commits landing after approval); return the new SHA. */
function advanceGitHead(root: string): string {
  fs.writeFileSync(path.join(root, "anchor.txt"), "v2\n");
  git(root, "add", "anchor.txt");
  git(root, "commit", "-q", "-m", "advance");
  return git(root, "rev-parse", "HEAD");
}

function gitHead(root: string): string {
  return git(root, "rev-parse", "HEAD");
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  savedEnv.PALANTIR_MINI_HOST_RUNTIME = process.env.PALANTIR_MINI_HOST_RUNTIME;
  delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  delete process.env.PALANTIR_MINI_HOST_RUNTIME;
});

afterEach(() => {
  for (const key of ["PALANTIR_MINI_PROMPT_DTC_GATE_MODE", "PALANTIR_MINI_HOST_RUNTIME"] as const) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

function readinessProfile(): FDEReadinessProfileEvaluation {
  return {
    profileId: "mission-decision",
    score: 1,
    readyForSemanticIntent: true,
    readyForDigitalTwin: true,
    requirementResults: [],
    missingRequired: [],
    warnings: [],
  };
}

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
    readinessProfile: readinessProfile(),
  };
  writeFDEOntologyEngineeringSessionSnapshot(session);
  return session;
}

/**
 * A FULL gate-valid approved SIC (passes BOTH isApprovedSemanticIntentContract and
 * validateSemanticIntentContract), with a string approvalRef. This is the persisted
 * snapshot drift_rebind carries forward AND re-keys; the PreToolUse gate validates the
 * re-keyed body, so it must be gate-valid.
 */
function gateValidApprovedSic(contractId: string): SemanticIntentContract {
  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
    contractId,
    status: "approved",
    rawIntent: "Add prompt-DTC enforcement gates",
    confirmedIntent: "Gate mutating tools until prompt-local DTC approval exists.",
    nonGoals: ["Do not promote schemas."],
    approvedNouns: ["PromptEnvelope", "SemanticIntentContract", "DigitalTwinChangeContract"],
    approvedVerbs: ["gate", "validate", "deny"],
    affectedSurfaces: [
      ".claude/plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts",
      ".claude/plugins/palantir-mini/hooks/hooks.json",
    ],
    permissionsAndProposal: "Approved for plugin-local PreToolUse enforcement only.",
    acceptedRisks: [],
    downstreamAllowed: ["Add advisory and blocking prompt-DTC gate behavior."],
    downstreamForbidden: ["Do not change default mode away from advisory."],
    clarificationQuestions: [],
    approvedCanonicalTermRefs: ["term:prompt-dtc-gate"],
    approvedTermMappingRefs: ["mapping:prompt-dtc-gate"],
    semanticConsistencyResultRef: "semantic-resolver-run:prompt-dtc-gate",
    approvalRef: "user:approved:wave4",
  } as SemanticIntentContract;
}

/** A FULL gate-valid approved DTC bound to `sicContractId` (fillPolicy bypasses typed-ref reqs). */
function gateValidApprovedDtc(sicContractId: string): DigitalTwinChangeContract {
  return {
    schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
    contractId: "digital-twin-change:approved:drift-e2e",
    status: "approved",
    semanticIntentContractRef: sicContractId,
    affectedSurfaces: [
      ".claude/plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts",
      ".claude/plugins/palantir-mini/hooks/hooks.json",
    ],
    changeBoundary: "Plugin-local PreToolUse prompt-DTC enforcement only.",
    branchProposalPolicy: "Ship as a wave after persistence lands.",
    permissionBoundary: "No direct home plugin sync.",
    replayMigrationPlan: "No replay migration; gate reads prompt-front-door records.",
    observabilityPlan: "Emit failed gate events with refinementTarget.",
    toolSurfaceReadiness: "PreToolUse payloads use existing tool fields.",
    evaluationPlan: "Targeted hook tests, typecheck, hook manifest validation.",
    requiredEvaluationRefs: [{
      kind: "ValidationPack",
      rid: "project://palantir-mini/validation-pack/prompt-dtc-gate",
      displayName: "prompt-dtc-gate",
      project: "palantir-mini",
      confidence: "exact",
    }],
    fillPolicy: "ontology-dtc-build",
    semanticConsistencyRefs: ["semantic-resolver-run:prompt-dtc-gate"],
    // The ontology-dtc-build fillPolicy requires a complete T0-T6 build sequence + a
    // readiness block (mirrors the passing prompt-dtc-enforcement-gate fixture). All
    // primitive kinds are explicitly non-applicable with evidence (this DTC governs the
    // plugin gate surface, not new ontology primitives).
    ontologyDtcBuildSequence: Array.from({ length: 7 }, (_, index) => ({
      step: index + 1,
      question: `T${index}`,
      filledAt: "2026-06-20T00:00:00.000Z",
      source: "agent" as const,
    })),
    ontologyDtcBuildReadiness: {
      objectTypeRefs: [],
      linkTypeRefs: [],
      actionTypeRefs: [],
      functionRefs: [],
      applicationStateRefs: [],
      evaluationRefs: ["project://palantir-mini/validation-pack/prompt-dtc-gate"],
      semanticTermRefs: ["semantic-resolver-run:prompt-dtc-gate"],
      nonApplicablePrimitiveKinds: [
        "ObjectType",
        "LinkType",
        "ActionType",
        "Function",
        "ApplicationState",
      ],
      nonApplicableEvidenceRefs: ["test://drift-rebind-non-applicable"],
      readinessVerdict: "ready-for-dtc",
    },
    risks: [],
    requiredUserDecisions: [{
      decisionId: "decision-technology-review",
      domain: "TECHNOLOGY",
      label: "Technology review closed for drift-rebind e2e",
      status: "approved",
      blocking: true,
      evidenceRefs: ["test://technology-review"],
      approvalRef: "user:approved:technology-review",
    }],
    approvalRef: "user:approved:wave4",
  } as DigitalTwinChangeContract;
}

/** Persist the workflow-state minted approved-SIC snapshot keyed to the session. */
function seedSicSnapshotState(root: string, sessionId: string, sic: SemanticIntentContract): void {
  const now = "2026-06-21T00:00:00.000Z";
  const state: OntologyEngineeringWorkflowState = {
    schemaVersion: ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
    contractId: `ontology-engineering-workflow:${sessionId}`,
    projectRoot: root,
    fdeSessionId: sessionId,
    fdeSessionRef: `fde-ontology-engineering://session/${sessionId}`,
    semanticIntentContractRef: sic.contractId,
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
    approvedSemanticIntentContractSnapshot: sic,
    createdAt: now,
    updatedAt: now,
  };
  writeOntologyEngineeringWorkflowState(state);
}

/** The prior approving envelope + persisted approved DTC record (the genuine prior approval). */
async function seedPriorApproval(
  store: PromptFrontDoorStore,
  root: string,
  sessionId: string,
  dtc: DigitalTwinChangeContract,
): Promise<string> {
  const priorEnvelope = createPromptEnvelope({
    rawPrompt: "the prior prompt that approved the DTC build",
    sessionId,
    runtime: "claude",
    projectRoot: root,
    capturedAt: "2026-06-20T00:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(priorEnvelope);
  const record = await store.writeContractRecord(priorEnvelope, "digital-twin-change", dtc);
  return record.ref;
}

/** A FRESH captured envelope (new prompt, state: captured) the gate evaluates. */
async function seedFreshEnvelope(
  store: PromptFrontDoorStore,
  root: string,
  sessionId: string,
): Promise<PromptEnvelope> {
  const fresh = createPromptEnvelope({
    rawPrompt: "resume the build on this fresh prompt after HEAD advanced",
    sessionId,
    runtime: "claude",
    projectRoot: root,
    capturedAt: "2026-06-21T12:00:00.000Z",
    sequence: 2,
  });
  await store.saveEnvelope(fresh);
  return fresh;
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function allEvents(root: string) {
  return readEvents(eventsPathFor(root));
}

/** The mutating PreToolUse call for the fresh prompt (a protected plugin surface). */
function mutatingGatePayload(root: string, envelope: PromptEnvelope) {
  return {
    cwd: root,
    session_id: envelope.sessionId,
    tool_name: "Edit",
    tool_input: {
      file_path: ".claude/plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
    },
  };
}

describe("drift_rebind whole-Altitude replay e2e (7.23.0)", () => {
  test("BLOCK before re-bind → drift_rebind commits at NEW HEAD (grammar unchanged) → PASS after, no off-bypass", async () => {
    const root = setupRoot();
    // Real throwaway git repo: SHA_OLD is the genuine HEAD commit (a 40-hex SHA),
    // not a fabricated ref. SHA_NEW is captured later when we advance HEAD.
    const SHA_OLD = initGitHead(root);
    expect(SHA_OLD).toMatch(/^[0-9a-f]{40}$/);
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";
    process.env.PALANTIR_MINI_HOST_RUNTIME = "claude";

    const session = seedSession(root);
    const sic = gateValidApprovedSic("semantic-intent:approved:drift-e2e");
    seedSicSnapshotState(root, session.sessionId, sic);

    // (1) register + commit the small ontology at HEAD-1 (SHA_OLD).
    const reg = await handleOntologyEngineeringWorkflow({
      action: "register",
      project: root,
      sessionId: session.sessionId,
      semanticIntentContractRef: sic.contractId,
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "dtc:placeholder",
      digitalTwinChangeContractStatus: "approved",
    });
    expect(reg.register?.committed).toBe(true);

    const beforeCounts = (await getOntology({ project: root })).snapshot.registeredPrimitives!;
    const beforeRids = [
      ...beforeCounts.objectTypes,
      ...beforeCounts.actionTypes,
      ...beforeCounts.functions,
      ...beforeCounts.linkTypes,
      ...beforeCounts.roles,
      ...beforeCounts.properties,
    ].map((e) => e.rid);
    expect(beforeRids.length).toBeGreaterThan(0);

    // The first commit stamped atopWhich = SHA_OLD (a real 40-hex commit SHA, not a ref name).
    const firstCommit = allEvents(root).filter((e) => e.type === "edit_committed").at(-1) as unknown as { atopWhich?: string };
    expect(firstCommit.atopWhich).toBe(SHA_OLD);
    expect(firstCommit.atopWhich).toMatch(/^[0-9a-f]{40}$/);

    // (2) persist the genuine prior approval (DTC record bound to the SIC, on a PRIOR prompt).
    const store = new PromptFrontDoorStore({ projectRoot: root });
    const dtc = gateValidApprovedDtc(sic.contractId);
    const priorDtcRef = await seedPriorApproval(store, root, session.sessionId, dtc);

    // (3) ADVANCE git HEAD — new commits landed after the prior approval (drift).
    const SHA_NEW = advanceGitHead(root);
    expect(SHA_NEW).toMatch(/^[0-9a-f]{40}$/);
    expect(SHA_NEW).not.toBe(SHA_OLD);
    expect(gitHead(root)).toBe(SHA_NEW);

    // (4) write a FRESH captured envelope (no contract refs yet).
    const fresh = await seedFreshEnvelope(store, root, session.sessionId);
    expect(fresh.state).toBe("captured");

    // (5) REAL gate on a mutating call for the fresh prompt → BLOCKS. The fresh prompt
    //     carries NO contract refs yet (state: captured), so the gate fails closed at the
    //     contract requirement (the drift state: an approved build exists on a PRIOR prompt,
    //     but THIS prompt is not bound to it). The block proves the gate is engaged + denying.
    const blocked = await promptDtcEnforcementGate(mutatingGatePayload(root, fresh));
    expect(blocked.decision).toBe("block");
    expect(blocked.reason).toMatch(/SemanticIntentContract ref|not digital_twin_approved/);

    const commitsBeforeRebind = allEvents(root).filter((e) => e.type === "edit_committed").length;

    // (6) drift_rebind ONCE — re-bind persisted approval to the fresh prompt + re-elevate.
    const result = await handleOntologyEngineeringWorkflow({
      action: "drift_rebind",
      project: root,
      sessionId: session.sessionId,
      digitalTwinChangeContractRef: priorDtcRef,
      rebindRids: beforeRids,
      promptId: fresh.promptId,
      promptHash: fresh.promptHash,
      frontDoorSessionId: fresh.sessionId,
      frontDoorRuntime: "claude",
    });
    expect(result.register?.committed).toBe(true);

    // The re-elevation committed at the NEW HEAD (SHA_NEW), and grammar is unchanged.
    const events = allEvents(root).filter((e) => e.type === "edit_committed");
    expect(events.length).toBe(commitsBeforeRebind + 1); // single commit boundary
    const reElevation = events.at(-1) as unknown as { atopWhich?: string; payload?: { appliedEdits?: Array<{ rid: string }> } };
    expect(reElevation.atopWhich).toBe(SHA_NEW);
    expect(reElevation.atopWhich).toMatch(/^[0-9a-f]{40}$/);
    const reEmitted = (reElevation.payload?.appliedEdits ?? []).map((e) => e.rid).sort();
    expect(reEmitted).toEqual([...beforeRids].sort());

    const afterCounts = (await getOntology({ project: root })).snapshot.registeredPrimitives!;
    const afterRids = [
      ...afterCounts.objectTypes,
      ...afterCounts.actionTypes,
      ...afterCounts.functions,
      ...afterCounts.linkTypes,
      ...afterCounts.roles,
      ...afterCounts.properties,
    ].map((e) => e.rid);
    expect(afterRids.sort()).toEqual([...beforeRids].sort()); // grammar unchanged

    // The fresh envelope was advanced to digital_twin_approved (the re-bind step).
    const advancedFresh = await store.readEnvelope(fresh.sessionId, fresh.promptId);
    expect(advancedFresh?.state).toBe("digital_twin_approved");

    // (7) re-run the SAME gate for the SAME fresh prompt → now PASSES.
    const passed = await promptDtcEnforcementGate(mutatingGatePayload(root, fresh));
    expect(passed.decision).toBeUndefined();
    expect(passed.message).toBe("palantir-mini: prompt-DTC gate OK");

    // The gate was NEVER disabled: no prompt_dtc_gate_off_bypass event was emitted.
    const offBypass = allEvents(root).filter(
      (e) => e.type === "validation_phase_completed" &&
        (e as unknown as { payload?: { errorClass?: string } }).payload?.errorClass === "prompt_dtc_gate_off_bypass",
    );
    expect(offBypass.length).toBe(0);

    // The DISTINCT drift_rebind audit event was emitted (the legitimate RESUME).
    const driftAudit = allEvents(root).filter((e) => e.type === "drift_rebind_envelope_advanced");
    expect(driftAudit.length).toBe(1);
  });
});
