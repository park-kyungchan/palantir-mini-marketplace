// palantir-mini — ENTRY-loop `register` seam: PROPERTY path (DATA-axis completion).
//
// PROVES the 6th register verb end-to-end for a NEW (non-pm) project: an approved
// + graded ontology-engineering session carrying a PropertyCandidate (owned by an
// objectCandidate) → handleOntologyEngineeringWorkflow({action:"register"}) → mints
// a per-project namespaced property rid → single batched commit → READABLE in
// getOntology(project).snapshot.registeredPrimitives.properties. Plus per-project
// ISOLATION, IDEMPOTENCY, the editFunction wiring PARITY for the Property verb, and
// (T2) the cross-layer link resolution widening: a link whose endpoints are an
// object name + a FUNCTION name resolves and REGISTERS (not skipped).

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
  APPLY_REGISTER_PROPERTY_NAME,
} from "../../../lib/actions/ontology-register";
import { REGISTER_PROPERTY_ACTION_TYPE } from "../../../runtime-overlay/schemas-snapshot/ontology/self/action-types";
import type {
  FDEOntologyEngineeringSession,
  FDEReadinessProfileEvaluation,
} from "../../../lib/fde-ontology-engineering/types";

const tmpRoots: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-entry-register-property-${label}-`));
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
 * Seed a written FDE engineering session for `root` carrying a property candidate
 * (whose ownerObjectName matches a seeded object candidate's plainName), graded
 * ready-for-digital-twin.
 */
function seedSession(root: string): FDEOntologyEngineeringSession {
  const entry = createUniversalOntologyEntry({
    rawUserRequest: "model the slope property of a linear function",
    projectRoot: root,
  });
  const base = createFDEOntologyEngineeringSessionFromEntry({ entry });
  const session: FDEOntologyEngineeringSession = {
    ...base,
    phase: "dtc-ready",
    objectCandidates: [
      {
        candidateId: "obj-linear-function",
        plainName: "Linear Function",
        whyItMayMatter: "the object the property is a stored field of",
        evidenceRefs: ["evidence:linear-function"],
      },
    ],
    propertyCandidates: [
      {
        candidateId: "prop-slope",
        plainName: "Slope",
        ownerObjectName: "Linear Function",
        dataType: "Double",
        whyItMayMatter: "the rate of change of the line",
        evidenceRefs: ["evidence:slope"],
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

describe("ENTRY-loop register seam — PROPERTY path (6th verb, DATA-axis completion)", () => {
  test("register → commit → materialize → READABLE in get_ontology.registeredPrimitives.properties", async () => {
    const P = setupRoot("loop");
    const session = seedSession(P);

    const result = await handleOntologyEngineeringWorkflow(
      approvedRegisterInput(P, session.sessionId),
    );

    expect(result.register?.committed).toBe(true);
    expect(result.register?.invalidReason).toBeUndefined();

    const propRidExpected = projectPrimitiveRid(P, "property", "Slope");
    expect(result.register?.registered.properties).toContain(propRidExpected);

    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    // FOLD-1: buckets now hold { rid, declaration? } — project to rids to assert.
    expect(reg.properties.map((e) => e.rid)).toContain(propRidExpected);

    // The committed edit is a kind:"object" row tagged primitiveKind:"Property",
    // carrying the resolved owner rid in its declaration.
    const committedEdits = result.register?.commitResult as { appliedEdits?: Array<Record<string, unknown>> };
    const propEdit = (committedEdits.appliedEdits ?? []).find(
      (e) => (e.properties as Record<string, unknown> | undefined)?.primitiveKind === "Property",
    );
    expect(propEdit?.rid).toBe(propRidExpected);
    const ownerRidExpected = projectPrimitiveRid(P, "object-type", "Linear Function");
    expect((propEdit?.properties as Record<string, unknown>)?.ownerRid).toBe(ownerRidExpected);

    // The property rid is DISTINCT from the owner object rid (slug namespacing).
    expect(propRidExpected).not.toBe(ownerRidExpected);
  });

  test("ISOLATION: P's property rid does NOT appear in another project's ontology", async () => {
    const P = setupRoot("iso-p");
    const Q = setupRoot("iso-q");
    const session = seedSession(P);

    await handleOntologyEngineeringWorkflow(approvedRegisterInput(P, session.sessionId));

    const propRidP = projectPrimitiveRid(P, "property", "Slope");
    const regQ = (await getOntology({ project: Q })).snapshot.registeredPrimitives!;
    expect(regQ.properties.map((e) => e.rid)).not.toContain(propRidP);
    expect(regQ.properties.length).toBe(0);
  });

  test("IDEMPOTENCY: a second register → same property rid, no duplicate", async () => {
    const P = setupRoot("idem");
    const session = seedSession(P);

    await handleOntologyEngineeringWorkflow(approvedRegisterInput(P, session.sessionId));
    await handleOntologyEngineeringWorkflow(approvedRegisterInput(P, session.sessionId));

    const propRidExpected = projectPrimitiveRid(P, "property", "Slope");
    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    expect(reg.properties.filter((e) => e.rid === propRidExpected).length).toBe(1);
  });

  test("PARITY: REGISTER_PROPERTY_ACTION_TYPE forward-names the live applyRegisterProperty edit-function", () => {
    expect(REGISTER_PROPERTY_ACTION_TYPE.editFunctionName).toBe("pm.actions.ontology.applyRegisterProperty");
    expect(REGISTER_PROPERTY_ACTION_TYPE.editFunctionName).toBe(APPLY_REGISTER_PROPERTY_NAME);
    expect(getEditFunction("pm.actions.ontology.applyRegisterProperty")).not.toBeUndefined();
  });
});

/**
 * Seed a session whose linkCandidate connects an OBJECT name to a FUNCTION name —
 * a DATA↔LOGIC cross-layer edge that the prior objects-only resolver would have
 * skipped. Proves the C1 combined name→rid map.
 */
function seedCrossLayerSession(root: string): FDEOntologyEngineeringSession {
  const entry = createUniversalOntologyEntry({
    rawUserRequest: "linear function object computed by a slope function",
    projectRoot: root,
  });
  const base = createFDEOntologyEngineeringSessionFromEntry({ entry });
  const session: FDEOntologyEngineeringSession = {
    ...base,
    phase: "dtc-ready",
    objectCandidates: [
      {
        candidateId: "obj-linear-function",
        plainName: "Linear Function",
        whyItMayMatter: "the data object",
        evidenceRefs: ["evidence:lf"],
      },
    ],
    functionCandidates: [
      {
        candidateId: "fn-compute-slope",
        plainName: "Compute Slope",
        logicIntent: "derive slope from two points",
        deterministic: true,
        evidenceRefs: ["evidence:compute-slope"],
      },
    ],
    linkCandidates: [
      {
        candidateId: "link-lf-computed-by-slope",
        plainName: "computed-by",
        sourceObject: "Linear Function", // object name
        targetObject: "Compute Slope", // FUNCTION name (cross-layer)
        businessMeaning: "the object's slope is computed by this function",
        evidenceRefs: ["evidence:lf-computed-by"],
      },
    ],
    readinessProfileId: "mission-decision",
    readinessProfile: readinessProfile(true),
  };
  writeFDEOntologyEngineeringSessionSnapshot(session);
  return session;
}

describe("ENTRY-loop register seam — CROSS-LAYER link resolution (C1 widening)", () => {
  test("a link whose endpoints are object + FUNCTION names RESOLVES and is REGISTERED (not skipped)", async () => {
    const P = setupRoot("xlayer");
    const session = seedCrossLayerSession(P);

    const result = await handleOntologyEngineeringWorkflow(
      approvedRegisterInput(P, session.sessionId),
    );

    expect(result.register?.committed).toBe(true);

    const linkRidExpected = projectPrimitiveRid(P, "link-type", "computed-by");
    // REGISTERED, not skipped — the cross-layer endpoint (a function) resolved.
    expect(result.register?.registered.linkTypes).toContain(linkRidExpected);
    expect(result.register?.skipped.links).toHaveLength(0);

    const reg = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    expect(reg.linkTypes.map((e) => e.rid)).toContain(linkRidExpected);

    // The committed link edit's endpoints are the object rid and the function rid.
    const committedEdits = result.register?.commitResult as { appliedEdits?: Array<Record<string, unknown>> };
    const linkEdit = (committedEdits.appliedEdits ?? []).find(
      (e) => e.kind === "link" && e.rid === linkRidExpected,
    );
    expect(linkEdit?.srcRid).toBe(projectPrimitiveRid(P, "object-type", "Linear Function"));
    expect(linkEdit?.dstRid).toBe(projectPrimitiveRid(P, "function", "Compute Slope"));
  });
});
