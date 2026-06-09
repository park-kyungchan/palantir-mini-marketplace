// palantir-mini — OE-workflow STATE-SYNC closure test (S1).
//
// PROVES the S1 fix: after the register/elevate seam COMMITS, the returned AND
// persisted top-level `state.phase` advances to the terminal `registered`
// (previously stale at `digital-twin-approved`), allowedNextActions becomes
// `["status"]`, and the nested `elevate.phase: "elevated"` namespace is
// reconciled with the top-level phase. GOVERNANCE INVARIANT: a register does
// NOT flip `mutationAuthorized` (the protected-surface gate signal stays tied to
// SIC/DTC approval), so registration cannot open a protected-surface mutation
// hole. Plus: persistence, idempotent re-register, and sourceMutationApprovals
// preservation across the register write.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { handleOntologyEngineeringWorkflow } from "../../../bridge/handlers/pm-ontology-engineering-workflow";
import { createUniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import {
  createFDEOntologyEngineeringSessionFromEntry,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "../../../lib/fde-ontology-engineering/session-store";
import {
  deriveOntologyEngineeringWorkflowState,
  readCurrentOntologyEngineeringWorkflowState,
  writeOntologyEngineeringWorkflowState,
  type SourceMutationApprovalRecord,
} from "../../../lib/ontology-engineering-workflow";
import type {
  FDEOntologyEngineeringSession,
  FDEReadinessProfileEvaluation,
} from "../../../lib/fde-ontology-engineering/types";

const tmpRoots: string[] = [];
const tmpFiles: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-state-sync-${label}-`));
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  tmpRoots.push(root);
  return root;
}

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
  for (const f of tmpFiles.splice(0)) fs.rmSync(f, { force: true });
});

/** Grade signal reachable in the handler: readyForDigitalTwin gates register (D5). */
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

/**
 * Seed a written FDE engineering session for `root` with object + action + link
 * candidates (the link names two seeded objects), and the given grade. Returns
 * the written session. (Mirrors the register-seam test fixture.)
 */
function seedSession(root: string, opts: { graded: boolean }): FDEOntologyEngineeringSession {
  const entry = createUniversalOntologyEntry({
    rawUserRequest: "implement a lesson tracker that links a Student to a Lesson",
    projectRoot: root,
  });
  const base = createFDEOntologyEngineeringSessionFromEntry({ entry });
  const session: FDEOntologyEngineeringSession = {
    ...base,
    phase: "dtc-ready",
    objectCandidates: [
      {
        candidateId: "obj-student",
        plainName: "Student",
        whyItMayMatter: "the learner the lesson tracker is about",
        evidenceRefs: ["evidence:student"],
      },
      {
        candidateId: "obj-lesson",
        plainName: "Lesson",
        whyItMayMatter: "the unit of instruction tracked",
        evidenceRefs: ["evidence:lesson"],
      },
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
    readinessProfile: readinessProfile(opts.graded),
  };
  writeFDEOntologyEngineeringSessionSnapshot(session);
  return session;
}

/** Handler input that drives the workflow phase to digital-twin-approved. */
function approvedRegisterInput(root: string, sessionId: string) {
  return {
    action: "register" as const,
    project: root,
    sessionId,
    semanticIntentContractRef: "sic:approved-1",
    semanticIntentContractStatus: "approved" as const,
    digitalTwinChangeContractRef: "dtc:approved-1",
    digitalTwinChangeContractStatus: "approved" as const,
  };
}

/**
 * EDGE-resolving 3-record SOURCE fixture for the `elevate` flow (object +
 * function + cross-layer edge), identical in shape to the elevate-seam test.
 */
function writeElevateFixture(): string {
  const records = [
    {
      kg_layer: "DATA",
      record_type: "kg_linear_function_data_atom_candidate",
      candidate_id: "lfa-dt-001",
      label_ko: "선형함수",
      description_ko: "y = ax + b 형태의 함수",
      atom_kind: "entity",
      source_basis_refs: ["ref:lf-entity"],
    },
    {
      kg_layer: "LOGIC",
      record_type: "kg_linear_function_logic_atom_candidate",
      candidate_id: "lfa-lg-010",
      label_ko: "기울기 계산",
      description_ko: "두 점으로 기울기를 계산한다",
      logic_kind: "computation",
      source_basis_refs: ["ref:slope-1"],
    },
    {
      kg_layer: "EDGE",
      record_type: "kg_linear_function_composition_edge_candidate",
      candidate_id: "lfe-001",
      source_candidate_id: "lfa-dt-001",
      target_candidate_id: "lfa-lg-010",
      edge_kind: "computes",
    },
  ];
  const file = path.join(
    os.tmpdir(),
    `pm-state-sync-fixture-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
  );
  fs.writeFileSync(file, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  tmpFiles.push(file);
  return file;
}

describe("OE-workflow state-sync closure (S1)", () => {
  test("post-register: top-level state.phase advances to terminal 'registered'", async () => {
    const P = setupRoot("phase");
    const session = seedSession(P, { graded: true });

    const result = await handleOntologyEngineeringWorkflow(
      approvedRegisterInput(P, session.sessionId),
    );

    expect(result.register?.committed).toBe(true);
    expect(result.state.phase).toBe("registered");
    expect(result.state.allowedNextActions).toEqual(["status"]);
  });

  test("post-register: terminal phase is PERSISTED (not just returned)", async () => {
    const P = setupRoot("persist");
    const session = seedSession(P, { graded: true });

    await handleOntologyEngineeringWorkflow(approvedRegisterInput(P, session.sessionId));

    expect(readCurrentOntologyEngineeringWorkflowState(P)?.phase).toBe("registered");
  });

  test("GOVERNANCE: register does NOT flip mutationAuthorized (no protected-surface hole)", async () => {
    const P = setupRoot("gov");
    const session = seedSession(P, { graded: true });

    // Register-gate path: SIC+DTC approved, NO workContractRef, NO decision record.
    const result = await handleOntologyEngineeringWorkflow(
      approvedRegisterInput(P, session.sessionId),
    );

    expect(result.register?.committed).toBe(true);
    expect(result.state.mutationAuthorized).toBe(false);
    expect(readCurrentOntologyEngineeringWorkflowState(P)?.mutationAuthorized).toBe(false);
  });

  test("idempotent re-register stays terminal", async () => {
    const P = setupRoot("idem");
    const session = seedSession(P, { graded: true });

    await handleOntologyEngineeringWorkflow(approvedRegisterInput(P, session.sessionId));
    const result2 = await handleOntologyEngineeringWorkflow(
      approvedRegisterInput(P, session.sessionId),
    );

    // Second call must not throw; phase stays terminal even though the second
    // register is a 'nothing to register' noop (committed may be false).
    expect(result2.state.phase).toBe("registered");
  });

  test("sourceMutationApprovals preserved across register write", async () => {
    const P = setupRoot("approvals");
    const session = seedSession(P, { graded: true });

    // Seed a current.json carrying a synthetic sourceMutationApprovals record on
    // the session's workflow contract (so writeRegisteredState reads it back).
    const synthetic = {
      kind: "developer-source-mutation",
      approvedSourcePaths: ["hooks/**"],
      approvedAtPromptId: "prompt:synthetic-1",
      approvedPromptHash: "sha256:synthetic",
      sessionId: "front-door:synthetic",
      approvedAt: new Date().toISOString(),
      userQuote: "go ahead and edit the hooks",
    } as unknown as SourceMutationApprovalRecord;
    const seededState = {
      ...deriveOntologyEngineeringWorkflowState({ projectRoot: P, fdeSession: session }),
      sourceMutationApprovals: [synthetic],
    };
    writeOntologyEngineeringWorkflowState(seededState);

    await handleOntologyEngineeringWorkflow(approvedRegisterInput(P, session.sessionId));

    const persisted = readCurrentOntologyEngineeringWorkflowState(P);
    expect(persisted?.phase).toBe("registered");
    expect(persisted?.sourceMutationApprovals?.length).toBe(1);
  });

  test("elevate commit reconciles namespaces", async () => {
    const P = setupRoot("elevate");
    const fixture = writeElevateFixture();

    const result = await handleOntologyEngineeringWorkflow({
      action: "elevate",
      project: P,
      sourceJsonlPath: fixture,
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractStatus: "approved",
      readyForDigitalTwin: true,
    });

    // Nested namespace says elevated; top-level phase now reconciled to registered.
    expect(result.elevate?.phase).toBe("elevated");
    expect(result.state.phase).toBe("registered");
    expect(result.state.mutationAuthorized).toBe(false);
    expect(readCurrentOntologyEngineeringWorkflowState(P)?.mutationAuthorized).toBe(false);
  });
});
