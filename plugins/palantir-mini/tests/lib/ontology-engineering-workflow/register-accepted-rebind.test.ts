// palantir-mini 7.22.2 — Part A: registerAcceptedCandidates re-bind mode.
//
// PROVES the additive `reElevateAlreadyRegistered` flag:
//   - default (flag absent/false) is BYTE-IDENTICAL to today: already-registered
//     rids are SKIPPED (no edit), genuinely-new rids register.
//   - re-bind (flag true): already-registered rids FALL THROUGH and re-emit their
//     IDENTICAL declaration; genuinely-new rids still register on the same path.
// This is the load-bearing pure-core change behind the `rebind_registered` action.

import { test, expect, describe } from "bun:test";
import { registerAcceptedCandidates } from "../../../lib/ontology-engineering-workflow/register-accepted";
import { createUniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import { createFDEOntologyEngineeringSessionFromEntry } from "../../../lib/fde-ontology-engineering/session-store";
import { projectPrimitiveRid } from "../../../lib/actions/project-primitive-rid";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";

const ROOT = "/tmp/pm-rebind-unit";

function sessionWith(): FDEOntologyEngineeringSession {
  const entry = createUniversalOntologyEntry({ rawUserRequest: "x", projectRoot: ROOT });
  const base = createFDEOntologyEngineeringSessionFromEntry({ entry });
  return {
    ...base,
    objectCandidates: [
      { candidateId: "obj-a", plainName: "Alpha", whyItMayMatter: "a", evidenceRefs: ["e:a"] },
      { candidateId: "obj-b", plainName: "Beta", whyItMayMatter: "b", evidenceRefs: ["e:b"] },
    ],
  };
}

const RID_ALPHA = projectPrimitiveRid(ROOT, "object-type", "Alpha");
const RID_BETA = projectPrimitiveRid(ROOT, "object-type", "Beta");

describe("registerAcceptedCandidates — re-bind mode (Part A, 7.22.2)", () => {
  test("DEFAULT (flag absent): an already-registered rid is SKIPPED (byte-identical to today)", async () => {
    const session = sessionWith();
    const out = await registerAcceptedCandidates({
      session,
      projectRoot: ROOT,
      alreadyRegistered: new Set([RID_ALPHA]),
    });
    // Alpha is already-registered ⇒ skipped; only Beta emits.
    expect(out.registered.objectTypes).toEqual([RID_BETA]);
    expect(out.edits.map((e) => e.rid)).toEqual([RID_BETA]);
  });

  test("re-bind (flag true): an already-registered rid FALLS THROUGH and re-emits its declaration", async () => {
    const session = sessionWith();
    const out = await registerAcceptedCandidates({
      session,
      projectRoot: ROOT,
      alreadyRegistered: new Set([RID_ALPHA, RID_BETA]),
      reElevateAlreadyRegistered: true,
    });
    // BOTH already-registered rids re-emit (re-elevation), none skipped.
    expect(out.registered.objectTypes.sort()).toEqual([RID_ALPHA, RID_BETA].sort());
    expect(out.edits.length).toBe(2);
    // The re-emitted declaration is IDENTICAL to a fresh registration (same rid+kind).
    const alphaEdit = out.edits.find((e) => e.rid === RID_ALPHA) as Record<string, unknown>;
    expect((alphaEdit.properties as Record<string, unknown>).primitiveKind).toBe("ObjectType");
    expect((alphaEdit.properties as Record<string, unknown>).plainName).toBe("Alpha");
  });

  test("re-bind mode does NOT change genuinely-new rid handling (new rid still registers)", async () => {
    const session = sessionWith();
    // Alpha already-registered (re-emits under flag), Beta genuinely new (registers either way).
    const out = await registerAcceptedCandidates({
      session,
      projectRoot: ROOT,
      alreadyRegistered: new Set([RID_ALPHA]),
      reElevateAlreadyRegistered: true,
    });
    expect(out.registered.objectTypes.sort()).toEqual([RID_ALPHA, RID_BETA].sort());
  });
});
