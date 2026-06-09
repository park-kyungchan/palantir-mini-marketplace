// palantir-mini — ENTRY-loop `register` seam: ROLE path (GOV-axis closure).
//
// PROVES the 5th register verb end-to-end for a NEW (non-pm) project: an
// approved + graded ontology-engineering session carrying a RoleCandidate →
// handleOntologyEngineeringWorkflow({action:"register"}) → mints a per-project
// namespaced role rid → single batched commit → READABLE in
// getOntology(project).snapshot.registeredPrimitives.roles. Plus per-project
// ISOLATION, IDEMPOTENCY, and the editFunction wiring PARITY for the Role verb.

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
import { getEditFunction } from "../../../lib/actions/tier2-function";
import {
  APPLY_REGISTER_ROLE_NAME,
} from "../../../lib/actions/ontology-register";
import { REGISTER_ROLE_ACTION_TYPE } from "../../../runtime-overlay/schemas-snapshot/ontology/self/action-types";
import type {
  FDEOntologyEngineeringSession,
  FDEReadinessProfileEvaluation,
} from "../../../lib/fde-ontology-engineering/types";

const tmpRoots: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-entry-register-role-${label}-`));
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
 * Seed a written FDE engineering session for `root` carrying a role candidate
 * (plus one object candidate, so the granted resource has a plausible referent),
 * graded ready-for-digital-twin.
 */
function seedSession(root: string): FDEOntologyEngineeringSession {
  const entry = createUniversalOntologyEntry({
    rawUserRequest: "grant the hook-builder agent register access over the lesson tracker",
    projectRoot: root,
  });
  const base = createFDEOntologyEngineeringSessionFromEntry({ entry });
  const session: FDEOntologyEngineeringSession = {
    ...base,
    phase: "dtc-ready",
    objectCandidates: [
      {
        candidateId: "obj-lesson-tracker",
        plainName: "Lesson Tracker",
        whyItMayMatter: "the resource the role grants access over",
        evidenceRefs: ["evidence:lesson-tracker"],
      },
    ],
    roleCandidates: [
      {
        candidateId: "role-hook-builder",
        plainName: "Hook Builder Grant",
        principalKind: "agent",
        grantedResourceRefs: ["resource:lesson-tracker"],
        permissions: ["register", "write"],
        whyItMayMatter: "hook-builder must register hooks against the tracker",
        evidenceRefs: ["evidence:hook-builder-grant"],
      },
    ],
    readinessProfileId: "mission-decision",
    readinessProfile: readinessProfile(true),
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

describe("ENTRY-loop register seam — ROLE path (5th verb, GOV-axis closure)", () => {
  test("register → commit → materialize → READABLE in get_ontology.registeredPrimitives.roles", async () => {
    const P = setupRoot("loop");
    const session = seedSession(P);

    const result = await handleOntologyEngineeringWorkflow(
      approvedRegisterInput(P, session.sessionId),
    );

    expect(result.register?.committed).toBe(true);
    expect(result.register?.invalidReason).toBeUndefined();

    const roleRidExpected = projectPrimitiveRid(P, "role", "Hook Builder Grant");
    expect(result.register?.registered.roles).toContain(roleRidExpected);

    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    expect(reg.roles).toContain(roleRidExpected);

    // The committed edit is a kind:"object" row tagged primitiveKind:"Role".
    const committedEdits = result.register?.commitResult as { appliedEdits?: Array<Record<string, unknown>> };
    const roleEdit = (committedEdits.appliedEdits ?? []).find(
      (e) => (e.properties as Record<string, unknown> | undefined)?.primitiveKind === "Role",
    );
    expect(roleEdit?.rid).toBe(roleRidExpected);
  });

  test("ISOLATION: P's role rid does NOT appear in another project's ontology", async () => {
    const P = setupRoot("iso-p");
    const Q = setupRoot("iso-q");
    const session = seedSession(P);

    await handleOntologyEngineeringWorkflow(approvedRegisterInput(P, session.sessionId));

    const roleRidP = projectPrimitiveRid(P, "role", "Hook Builder Grant");
    const regQ = (await getOntology({ project: Q })).snapshot.registeredPrimitives!;
    expect(regQ.roles).not.toContain(roleRidP);
    expect(regQ.roles.length).toBe(0);
  });

  test("IDEMPOTENCY: a second register → same role rid, no duplicate", async () => {
    const P = setupRoot("idem");
    const session = seedSession(P);

    await handleOntologyEngineeringWorkflow(approvedRegisterInput(P, session.sessionId));
    await handleOntologyEngineeringWorkflow(approvedRegisterInput(P, session.sessionId));

    const roleRidExpected = projectPrimitiveRid(P, "role", "Hook Builder Grant");
    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    expect(reg.roles.filter((r) => r === roleRidExpected).length).toBe(1);
  });

  test("PARITY: REGISTER_ROLE_ACTION_TYPE forward-names the live applyRegisterRole edit-function", () => {
    expect(REGISTER_ROLE_ACTION_TYPE.editFunctionName).toBe("pm.actions.ontology.applyRegisterRole");
    expect(REGISTER_ROLE_ACTION_TYPE.editFunctionName).toBe(APPLY_REGISTER_ROLE_NAME);
    expect(getEditFunction("pm.actions.ontology.applyRegisterRole")).not.toBeUndefined();
  });
});
