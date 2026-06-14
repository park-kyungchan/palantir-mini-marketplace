// palantir-mini — `lint` seam + register advisory-attach test (Wave-4).
//
// PROVES: (1) action:"lint" on a seeded session is UNGATED (no approval/grade
// needed) and returns construction anti-pattern findings; (2) a `register` call
// on an approved + graded session whose candidates contain a Misnomer still
// commits (committed:true) AND surfaces register.lint findings — advisory,
// non-blocking (the commit happens regardless of findings).

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
import type {
  FDEOntologyEngineeringSession,
  FDEReadinessProfileEvaluation,
} from "../../../lib/fde-ontology-engineering/types";
import { seedMintedApprovedSicWorkflowState } from "../../fixtures/seed-register-workflow-state";

const tmpRoots: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-oe-lint-${label}-`));
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

/**
 * Seed a session whose candidates contain a Misnomer (object "Data" + a vague
 * link businessMeaning "related to") alongside clean objects so register still
 * commits real primitives. `graded` toggles the register gate.
 */
function seedSession(root: string, opts: { graded: boolean }): FDEOntologyEngineeringSession {
  const entry = createUniversalOntologyEntry({
    rawUserRequest: "track a Student taking a Lesson",
    projectRoot: root,
  });
  const base = createFDEOntologyEngineeringSessionFromEntry({ entry });
  const session: FDEOntologyEngineeringSession = {
    ...base,
    phase: "dtc-ready",
    objectCandidates: [
      { candidateId: "obj-student", plainName: "Student", whyItMayMatter: "the learner", evidenceRefs: ["e:s"] },
      { candidateId: "obj-lesson", plainName: "Lesson", whyItMayMatter: "the unit taught", evidenceRefs: ["e:l"] },
      // Misnomer trigger (generic single-token name).
      { candidateId: "obj-data", plainName: "Data", whyItMayMatter: "some data blob", evidenceRefs: ["e:d"] },
    ],
    actionCandidates: [
      {
        candidateId: "act-record",
        plainName: "Record Progress",
        operationalIntent: "write a student's progress against a lesson",
        writebackRisk: "low",
        submissionCriteria: [],
        evidenceRefs: ["e:p"],
      },
    ],
    functionCandidates: [],
    linkCandidates: [
      {
        candidateId: "lnk-attends",
        plainName: "Attends",
        sourceObject: "Student",
        targetObject: "Lesson",
        businessMeaning: "a student attends a lesson",
        evidenceRefs: ["e:a"],
      },
      // Misnomer trigger (vague link meaning).
      {
        candidateId: "lnk-vague",
        plainName: "Linked",
        sourceObject: "Student",
        targetObject: "Data",
        businessMeaning: "related to the data",
        evidenceRefs: ["e:v"],
      },
    ],
    readinessProfileId: "mission-decision",
    readinessProfile: readinessProfile(opts.graded),
  };
  writeFDEOntologyEngineeringSessionSnapshot(session);
  return session;
}

describe("ontology-engineering `lint` seam", () => {
  test("action:lint is UNGATED and returns construction findings (no approval needed)", async () => {
    const P = setupRoot("ungated");
    // NOT graded, NO contract approval — lint must still run.
    const session = seedSession(P, { graded: false });

    const result = await handleOntologyEngineeringWorkflow({
      action: "lint",
      project: P,
      sessionId: session.sessionId,
    });

    const findings = result.lint?.findings ?? [];
    expect(findings.length).toBeGreaterThan(0);
    const misnomer = findings.find((f) => f.patternId === "misnomer");
    expect(misnomer?.severity).toBe("blocking");
    expect(misnomer?.candidateIds).toContain("obj-data");
    expect(misnomer?.candidateIds).toContain("lnk-vague");
    // No register/commit happened.
    expect(result.register).toBeUndefined();
  });

  test("clean session → lint returns no misnomer finding", async () => {
    const P = setupRoot("clean");
    const entry = createUniversalOntologyEntry({ rawUserRequest: "clean", projectRoot: P });
    const base = createFDEOntologyEngineeringSessionFromEntry({ entry });
    const session: FDEOntologyEngineeringSession = {
      ...base,
      phase: "dtc-ready",
      objectCandidates: [
        { candidateId: "o1", plainName: "Student", whyItMayMatter: "the learner", evidenceRefs: [] },
      ],
      actionCandidates: [],
      functionCandidates: [],
      linkCandidates: [],
      readinessProfileId: "mission-decision",
      readinessProfile: readinessProfile(true),
    };
    writeFDEOntologyEngineeringSessionSnapshot(session);

    const result = await handleOntologyEngineeringWorkflow({
      action: "lint",
      project: P,
      sessionId: session.sessionId,
    });
    const findings = result.lint?.findings ?? [];
    expect(findings.find((f) => f.patternId === "misnomer")).toBeUndefined();
  });
});

describe("register advisory lint attach (non-blocking)", () => {
  test("approved + graded session with a Misnomer → committed:true WITH register.lint findings", async () => {
    const P = setupRoot("attach");
    const session = seedSession(P, { graded: true });
    // OE-2 — seed a genuinely minted approved-SIC snapshot for the register re-verify.
    seedMintedApprovedSicWorkflowState(P, session.sessionId);

    const result = await handleOntologyEngineeringWorkflow({
      action: "register",
      project: P,
      sessionId: session.sessionId,
      semanticIntentContractRef: "sic:approved-1",
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "dtc:approved-1",
      digitalTwinChangeContractStatus: "approved",
    });

    // Commit happened despite blocking-severity findings → advisory, non-blocking.
    expect(result.register?.committed).toBe(true);
    expect(result.register?.invalidReason).toBeUndefined();

    const lint = result.register?.lint ?? [];
    expect(lint.length).toBeGreaterThan(0);
    const misnomer = lint.find((f) => f.patternId === "misnomer");
    expect(misnomer?.severity).toBe("blocking");
    expect(misnomer?.candidateIds).toContain("obj-data");
  });
});
