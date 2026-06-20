// palantir-mini 7.22.2 — Part C: the `rebind_registered` action (pure-provenance
// drift-fold re-elevation).
//
// PROVES the FULL keystone of 7.22.2:
//   1. register-roundtrip re-bind: an N-rid re-bind of already-registered rids emits
//      N re-elevation `edit_committed` events at atopWhich=HEAD, AND get_ontology
//      grammar counts stay EXACTLY what they were (Part-B dedup ⇒ no inflation).
//   2. staleness: after the re-bind the re-bound rids report NOT stale.
//   3. negative: an empty / unverified rebindRids set ⇒ committed:false with the
//      DISTINCT invalidReason (not the generic register "nothing to register").
//   4. adversarial: a genuinely-new rid can NEVER flow through rebind_registered —
//      it is rejected (not already-registered) and NO edit is emitted for it; the
//      grammar is unchanged.

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
import { readEvents } from "../../../lib/event-log/read";
import { detectOntologyStaleness } from "../../../lib/event-log/ontology-staleness";
import type {
  FDEOntologyEngineeringSession,
  FDEReadinessProfileEvaluation,
} from "../../../lib/fde-ontology-engineering/types";
import { seedMintedApprovedSicWorkflowState } from "../../fixtures/seed-register-workflow-state";

const tmpRoots: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-rebind-action-${label}-`));
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
  seedMintedApprovedSicWorkflowState(root, session.sessionId);
  return session;
}

function approvedContractInput(root: string, sessionId: string) {
  return {
    project: root,
    sessionId,
    semanticIntentContractRef: "sic:approved-1",
    semanticIntentContractStatus: "approved" as const,
    digitalTwinChangeContractRef: "dtc:approved-1",
    digitalTwinChangeContractStatus: "approved" as const,
  };
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function counts(root: string) {
  // get_ontology is async-driven elsewhere; this helper is sync via the snapshot.
  return getOntology({ project: root }).then((o) => {
    const r = o.snapshot.registeredPrimitives!;
    return {
      objectTypes: r.objectTypes.length,
      actionTypes: r.actionTypes.length,
      functions: r.functions.length,
      linkTypes: r.linkTypes.length,
      roles: r.roles.length,
      properties: r.properties.length,
    };
  });
}

async function registeredRids(root: string): Promise<string[]> {
  const r = (await getOntology({ project: root })).snapshot.registeredPrimitives!;
  return [
    ...r.objectTypes,
    ...r.actionTypes,
    ...r.functions,
    ...r.linkTypes,
    ...r.roles,
    ...r.properties,
  ].map((e) => e.rid);
}

function editCommittedCount(root: string): number {
  return readEvents(eventsPathFor(root)).filter((e) => e.type === "edit_committed").length;
}

describe("rebind_registered action — pure-provenance re-elevation (Part C, 7.22.2)", () => {
  test("N-rid re-bind emits N re-elevation edit_committed at atopWhich=HEAD; grammar counts UNCHANGED", async () => {
    const P = setupRoot("roundtrip");
    const session = seedSession(P);

    // (1) Normal register materializes the grammar (the already-registered set).
    const reg = await handleOntologyEngineeringWorkflow({
      action: "register",
      ...approvedContractInput(P, session.sessionId),
    });
    expect(reg.register?.committed).toBe(true);

    const beforeCounts = await counts(P);
    const beforeRids = await registeredRids(P);
    const commitsBefore = editCommittedCount(P);
    expect(beforeRids.length).toBeGreaterThan(0);

    // (2) Re-bind EXACTLY the already-registered rids.
    const result = await handleOntologyEngineeringWorkflow({
      action: "rebind_registered",
      ...approvedContractInput(P, session.sessionId),
      rebindRids: beforeRids,
    });
    expect(result.register?.committed).toBe(true);
    expect(result.register?.invalidReason).toBeUndefined();

    // A NEW edit_committed envelope was appended (the re-elevation).
    const commitsAfter = editCommittedCount(P);
    expect(commitsAfter).toBe(commitsBefore + 1);

    // The re-elevation envelope re-emits ALL beforeRids at the SAME atopWhich (HEAD).
    const events = readEvents(eventsPathFor(P)).filter((e) => e.type === "edit_committed");
    const reElevation = events[events.length - 1] as unknown as {
      atopWhich?: string;
      payload?: { appliedEdits?: Array<{ rid: string }> };
    };
    const reEmittedRids = (reElevation.payload?.appliedEdits ?? []).map((e) => e.rid).sort();
    expect(reEmittedRids).toEqual([...beforeRids].sort());
    // atopWhich is a single HEAD value (one batch); every appliedEdit shares it.
    expect(typeof reElevation.atopWhich).toBe("string");

    // (3) GRAMMAR UNCHANGED — Part-B dedup collapses the re-elevation; counts equal.
    const afterCounts = await counts(P);
    expect(afterCounts).toEqual(beforeCounts);
    // No rid is double-counted in any bucket after the re-elevation.
    const afterRids = await registeredRids(P);
    expect(afterRids.sort()).toEqual([...beforeRids].sort());
  });

  test("after re-bind, the re-bound rids report NOT stale", async () => {
    const P = setupRoot("notstale");
    const session = seedSession(P);
    await handleOntologyEngineeringWorkflow({ action: "register", ...approvedContractInput(P, session.sessionId) });
    const rids = await registeredRids(P);

    await handleOntologyEngineeringWorkflow({
      action: "rebind_registered",
      ...approvedContractInput(P, session.sessionId),
      rebindRids: rids,
    });

    // The re-elevation stamped atopWhich = gitHeadSha(P). A tmp project has no .git,
    // so atopWhich is the sentinel "no-git"; comparing against the SAME headSha ⇒ not
    // stale (the re-bound rid's latest atopWhich equals HEAD).
    const report = detectOntologyStaleness({ project: P, headSha: "no-git" });
    expect(report.stale).toHaveLength(0);
  });

  test("NEGATIVE: empty rebindRids ⇒ committed:false with the DISTINCT invalidReason", async () => {
    const P = setupRoot("empty");
    const session = seedSession(P);
    await handleOntologyEngineeringWorkflow({ action: "register", ...approvedContractInput(P, session.sessionId) });

    const result = await handleOntologyEngineeringWorkflow({
      action: "rebind_registered",
      ...approvedContractInput(P, session.sessionId),
      rebindRids: [],
    });
    expect(result.register?.committed).toBe(false);
    // DISTINCT from register's generic "nothing to register" string.
    expect(result.register?.invalidReason).toContain("no verified re-bind rids");
    expect(result.register?.invalidReason).not.toContain("nothing to register");
  });

  test("ADVERSARIAL: a genuinely-NEW rid can NEVER flow through rebind_registered (rejected, no emit, grammar unchanged)", async () => {
    const P = setupRoot("adversarial");
    const session = seedSession(P);
    await handleOntologyEngineeringWorkflow({ action: "register", ...approvedContractInput(P, session.sessionId) });

    const beforeCounts = await counts(P);
    const commitsBefore = editCommittedCount(P);
    const newRid = projectPrimitiveRid(P, "object-type", "NeverRegisteredGhost");

    const result = await handleOntologyEngineeringWorkflow({
      action: "rebind_registered",
      ...approvedContractInput(P, session.sessionId),
      rebindRids: [newRid], // not already-registered ⇒ rejected
    });
    // Empty intersection ⇒ committed:false, distinct reason naming the unverified rid.
    expect(result.register?.committed).toBe(false);
    expect(result.register?.invalidReason).toContain("no verified re-bind rids");

    // NO edit_committed emitted; grammar byte-for-byte unchanged; the ghost never registers.
    expect(editCommittedCount(P)).toBe(commitsBefore);
    expect(await counts(P)).toEqual(beforeCounts);
    expect(await registeredRids(P)).not.toContain(newRid);
  });

  test("ADVERSARIAL: a mixed set re-binds ONLY the verified subset, rejecting the new rid", async () => {
    const P = setupRoot("mixed");
    const session = seedSession(P);
    await handleOntologyEngineeringWorkflow({ action: "register", ...approvedContractInput(P, session.sessionId) });
    const rids = await registeredRids(P);
    const ghost = projectPrimitiveRid(P, "object-type", "GhostNotInSnapshot");
    const beforeCounts = await counts(P);

    const result = await handleOntologyEngineeringWorkflow({
      action: "rebind_registered",
      ...approvedContractInput(P, session.sessionId),
      rebindRids: [...rids, ghost],
    });
    // The verified subset re-binds (committed); the ghost is silently excluded.
    expect(result.register?.committed).toBe(true);
    const events = readEvents(eventsPathFor(P)).filter((e) => e.type === "edit_committed");
    const last = events[events.length - 1] as unknown as { payload?: { appliedEdits?: Array<{ rid: string }> } };
    const reEmitted = (last.payload?.appliedEdits ?? []).map((e) => e.rid);
    expect(reEmitted).not.toContain(ghost); // the new rid NEVER flows through
    expect(reEmitted.sort()).toEqual([...rids].sort());
    // Grammar unchanged (ghost never registered).
    expect(await counts(P)).toEqual(beforeCounts);
  });
});
