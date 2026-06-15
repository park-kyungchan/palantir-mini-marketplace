// palantir-mini — ENTRY-loop `register` seam test (O-2 closure keystone).
//
// PROVES the operative loop for a NEW (non-pm) project: an approved + graded
// ontology-engineering session's accepted candidate set →
// handleOntologyEngineeringWorkflow({action:"register"}) → mints per-project
// namespaced rids → single batched commit → READABLE in
// getOntology(project).snapshot.registeredPrimitives. Plus: per-project
// ISOLATION, the NEGATIVE precondition gate (D5), and IDEMPOTENCY.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { handleOntologyEngineeringWorkflow } from "../../../bridge/handlers/pm-ontology-engineering-workflow";
import getOntology from "../../../bridge/handlers/get-ontology";
import { createUniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import {
  createFDEOntologyEngineeringSessionFromEntry,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "../../../lib/fde-ontology-engineering/session-store";
import { projectPrimitiveRid } from "../../../lib/actions/project-primitive-rid";
import type {
  FDEOntologyEngineeringSession,
  FDEReadinessProfileEvaluation,
} from "../../../lib/fde-ontology-engineering/types";
import { seedMintedApprovedSicWorkflowState } from "../../fixtures/seed-register-workflow-state";

const tmpRoots: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-entry-register-${label}-`));
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  tmpRoots.push(root);
  return root;
}

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
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
 * the written session.
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
  // OE-2 — seed a workflow state carrying a GENUINELY minted approved-SIC snapshot so
  // the register seam re-verify (isApprovedSemanticIntentContract) passes for the
  // AUTHORIZED path. The NEGATIVE tests override the contract refs/status at call time
  // (un-approved DTC) or use graded:false, so they still fail on their intended gate.
  seedMintedApprovedSicWorkflowState(root, session.sessionId);
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

describe("ENTRY-loop register seam — full loop closure for a NEW project", () => {
  test("register → commit → materialize → READABLE in get_ontology.registeredPrimitives", async () => {
    const P = setupRoot("loop");
    const session = seedSession(P, { graded: true });

    const result = await handleOntologyEngineeringWorkflow(
      approvedRegisterInput(P, session.sessionId),
    );

    expect(result.register?.committed).toBe(true);
    expect(result.register?.invalidReason).toBeUndefined();

    // expected per-project namespaced rids
    const objStudent = projectPrimitiveRid(P, "object-type", "Student");
    const objLesson = projectPrimitiveRid(P, "object-type", "Lesson");
    const actRid = projectPrimitiveRid(P, "action-type", "Record Progress");
    const fnRid = projectPrimitiveRid(P, "function", "Completion Rate");
    const linkRid = projectPrimitiveRid(P, "link-type", "Attends");

    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    expect(reg.objectTypes.map((e) => e.rid)).toContain(objStudent);
    expect(reg.objectTypes.map((e) => e.rid)).toContain(objLesson);
    expect(reg.actionTypes.map((e) => e.rid)).toContain(actRid);
    expect(reg.functions.map((e) => e.rid)).toContain(fnRid);
    expect(reg.linkTypes.map((e) => e.rid)).toContain(linkRid);

    // FOLD-1: the canonical fold is MEANING-bearing — the registered Student
    // ObjectType bucket entry carries the committed declaration (plainName),
    // not just the bare rid. The old rid-only `.toContain` could not catch a
    // lossy fold; this declaration-survival assertion can.
    const studentEntry = reg.objectTypes.find((e) => e.rid === objStudent);
    expect(studentEntry?.declaration?.plainName).toBe("Student");

    // The link's endpoints equal the committed object rids.
    const committedEdits = result.register?.commitResult as { appliedEdits?: Array<Record<string, unknown>> };
    const linkEdit = (committedEdits.appliedEdits ?? []).find((e) => e.kind === "link");
    expect(linkEdit?.srcRid).toBe(objStudent);
    expect(linkEdit?.dstRid).toBe(objLesson);
  });

  test("ISOLATION: P's rids do NOT appear in another project's ontology", async () => {
    const P = setupRoot("iso-p");
    const Q = setupRoot("iso-q");
    const session = seedSession(P, { graded: true });

    await handleOntologyEngineeringWorkflow(approvedRegisterInput(P, session.sessionId));

    const objStudentP = projectPrimitiveRid(P, "object-type", "Student");
    const regQ = (await getOntology({ project: Q })).snapshot.registeredPrimitives!;
    expect(regQ.objectTypes).not.toContain(objStudentP);
    // Q has registered nothing.
    expect(regQ.objectTypes.length).toBe(0);
    expect(regQ.linkTypes.length).toBe(0);
  });

  test("NEGATIVE (D5 gate): un-approved DTC → INVALID no-op, NO edits committed", async () => {
    const P = setupRoot("neg");
    const session = seedSession(P, { graded: true });

    // Drive ONLY SIC approved; DTC stays draft → phase is not digital-twin-approved.
    const result = await handleOntologyEngineeringWorkflow({
      action: "register",
      project: P,
      sessionId: session.sessionId,
      semanticIntentContractRef: "sic:approved-1",
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "dtc:draft-1",
      digitalTwinChangeContractStatus: "draft",
    });

    expect(result.register?.committed).toBe(false);
    expect(result.register?.invalidReason).toContain("not approved");

    const objStudent = projectPrimitiveRid(P, "object-type", "Student");
    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    expect(reg.objectTypes).not.toContain(objStudent);
    expect(reg.objectTypes.length).toBe(0);
  });

  test("NEGATIVE (D5 gate): minted approved SIC present BUT zero objectCandidates → INVALID no-op (no empty-ontology register)", async () => {
    // OE-2 (dead-gate repair): the FDE readinessProfile flag can never be true via
    // a sanctioned path, so register's grade now derives from the GENUINE,
    // UNFORGEABLE minted approved-SIC snapshot + ingested candidates
    // (sicBackedDigitalTwinReady). The legitimate "not ready" case is therefore an
    // EMPTY ontology: a minted approved SIC is persisted (so the approval re-verify
    // passes) but the session has ZERO objectCandidates → the empty-ontology guard
    // blocks register. This stays a TRUE negative under the new semantics.
    const P = setupRoot("neg-empty");
    const entry = createUniversalOntologyEntry({
      rawUserRequest: "register with no ingested candidates",
      projectRoot: P,
    });
    const base = createFDEOntologyEngineeringSessionFromEntry({ entry });
    const session: FDEOntologyEngineeringSession = {
      ...base,
      phase: "dtc-ready",
      // ZERO objectCandidates (and no other candidates) — empty ontology.
      readinessProfileId: "mission-decision",
      readinessProfile: readinessProfile(false),
    };
    writeFDEOntologyEngineeringSessionSnapshot(session);
    // Persist a GENUINELY minted approved-SIC snapshot so the failure is ABOUT the
    // empty-ontology grade gate, not a missing approval.
    seedMintedApprovedSicWorkflowState(P, session.sessionId);

    const result = await handleOntologyEngineeringWorkflow(
      approvedRegisterInput(P, session.sessionId),
    );

    expect(result.register?.committed).toBe(false);
    expect(result.register?.invalidReason).toContain("grade not passed");
    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    expect(reg.objectTypes.length).toBe(0);
  });

  test("IDEMPOTENCY: a second register → same rids, no duplicate primitives", async () => {
    const P = setupRoot("idem");
    const session = seedSession(P, { graded: true });

    await handleOntologyEngineeringWorkflow(approvedRegisterInput(P, session.sessionId));
    await handleOntologyEngineeringWorkflow(approvedRegisterInput(P, session.sessionId));

    const objStudent = projectPrimitiveRid(P, "object-type", "Student");
    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    // Same rid is materialized; the fold dedups by rid → exactly one occurrence.
    expect(reg.objectTypes.filter((e) => e.rid === objStudent).length).toBe(1);
  });
});
