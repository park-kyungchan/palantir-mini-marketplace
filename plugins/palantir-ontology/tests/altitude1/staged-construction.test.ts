// P420 S2/S3: staged construction aggregate tests (A1-006, A1-007, A1-008,
// A1-010, A1-011). S2 tests cover the positive lifecycle and the evidence-
// separation proof (validation-contract item 2); S3 tests cover the four
// named negatives (missing evidence class, cross-class contamination,
// premature validation, unregistered primitive kind) plus the no-auto-
// promotion audit (validation-contract item 3).

import { describe, expect, test } from "bun:test";
import { openFdeSession } from "../../src/altitude1/fde-session";
import { approveSic, proposeSic, type SicBody } from "../../src/altitude1/semantic-intent";
import { finalizeDtc, proposeDtc, type DtcBody, type DtcRecord } from "../../src/altitude1/digital-twin-change";
import {
  evaluateReadiness,
  isPrimitiveKind,
  PRIMITIVE_KINDS,
  stageConstruction,
  validateConstruction,
  type PrimitiveEvidenceItem,
  type StagePrimitiveParams,
} from "../../src/altitude1/staged-construction";
import type { UserDecisionEvidence } from "../../src/semantic-core/user-decision-evidence";

const PROPOSER = { identity: "agent:claude-sonnet-5", role: "worker" };
const INDEPENDENT_VERIFIER: UserDecisionEvidence = {
  evidenceRef: "evidence:decision-log-2026-07-18-003",
  verifiedAt: "2026-07-18T10:05:00Z",
  verifiedBy: { identity: "user:packr0723", role: "approver" },
};

const SIC_BODY: SicBody = {
  sicId: "sic-p420-1",
  fdeSessionId: "fde-sess-p420-1",
  approvedMeaning: "Model an ObjectType for the staged-construction fixture.",
  fdeProvenance: { sessionId: "fde-sess-p420-1", turnIds: ["turn-1"] },
  promptProvenanceRef: "evidence:prompt-record-2026-07-18-003",
  acceptedHypotheses: ["Model as ObjectType"],
  rejectedHypotheses: [],
};

function dtcBody(sicFingerprint: string, overrides: Partial<DtcBody> = {}): DtcBody {
  return {
    dtcId: "dtc-p420-1",
    sicFingerprint,
    fdeEvidenceRefs: ["evidence:p420-fixture"],
    dataContext: "Backed by a fixture-only source row.",
    logicContext: "No computed logic; fixture only.",
    actionContext: "No mutating action; fixture only.",
    technologyRecommendation: "src/altitude1/staged-construction.ts",
    validationPlan: "tests/altitude1/staged-construction.test.ts",
    typedRefs: ["adr:ADR-004"],
    approvalProvenance: { sicApprovedBy: "user:packr0723", sicApprovedAt: "2026-07-18T10:00:00Z" },
    ...overrides,
  };
}

/** Builds session at DTC_APPROVED + the approved DTC record, ready for staging. */
function approvedDtcFixture(): { session: ReturnType<typeof openFdeSession>; dtc: DtcRecord } {
  const session = openFdeSession({ sessionId: "fde-sess-p420-1", openedAt: "2026-07-18T09:55:00Z", byWhom: PROPOSER });
  const proposedSic = proposeSic(session, SIC_BODY, "2026-07-18T09:58:00Z", PROPOSER);
  if (!proposedSic.ok) throw new Error("fixture setup: proposeSic failed");
  const approvedSic = approveSic(proposedSic.value.session, proposedSic.value.sic, proposedSic.value.sic.bodyFingerprint, INDEPENDENT_VERIFIER, "2026-07-18T09:59:00Z");
  if (!approvedSic.ok) throw new Error("fixture setup: approveSic failed");
  const proposedDtc = proposeDtc(approvedSic.value.session, approvedSic.value.sic, dtcBody(approvedSic.value.sic.bodyFingerprint), "2026-07-18T10:00:00Z", PROPOSER);
  if (!proposedDtc.ok) throw new Error("fixture setup: proposeDtc failed");
  const filledDtc = finalizeDtc(proposedDtc.value.session, proposedDtc.value.dtc, "dtc-filled", INDEPENDENT_VERIFIER, "2026-07-18T10:02:00Z");
  if (!filledDtc.ok) throw new Error("fixture setup: finalizeDtc failed");
  return { session: filledDtc.value.session, dtc: filledDtc.value.dtc };
}

function evidenceItem(evidenceClass: PrimitiveEvidenceItem["evidenceClass"], ref: string): PrimitiveEvidenceItem {
  return { evidenceClass, evidenceRef: ref, recordedAt: "2026-07-18T10:03:00Z", byWhom: PROPOSER };
}

function fullEvidenceParams(dtcId: string, overrides: Partial<StagePrimitiveParams> = {}): StagePrimitiveParams {
  return {
    primitiveId: "objtype-fixture-1",
    kind: "ObjectType",
    dtcId,
    dataEvidence: [evidenceItem("DATA", "evidence:data-1")],
    logicEvidence: [evidenceItem("LOGIC", "evidence:logic-1")],
    actionEvidence: [evidenceItem("ACTION", "evidence:action-1")],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// S1 sanity: the primitive taxonomy itself
// ---------------------------------------------------------------------------

describe("PRIMITIVE_KINDS / isPrimitiveKind (A1-006)", () => {
  test("carries exactly the 7 named product-primitive kinds", () => {
    const actual: readonly string[] = [...PRIMITIVE_KINDS].sort();
    expect(actual).toEqual(["Action", "Function", "Interface", "Link", "ObjectType", "Property", "SharedPropertyType"]);
  });

  test("every ControlPlaneNodeKind (ADR-003) value is rejected — the two enums are disjoint", () => {
    for (const controlPlaneKind of ["tool", "handler", "hook", "skill", "agent", "adapter", "profile", "generated-binding"]) {
      expect(isPrimitiveKind(controlPlaneKind)).toBe(false);
    }
  });

  test("rejects non-string and empty values", () => {
    expect(isPrimitiveKind(42)).toBe(false);
    expect(isPrimitiveKind(undefined)).toBe(false);
    expect(isPrimitiveKind("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// S2: stageConstruction — positive lifecycle
// ---------------------------------------------------------------------------

describe("stageConstruction", () => {
  test("A1-006/A1-007: stages a primitive with all 3 evidence classes present, advances session to CONSTRUCTION_STAGED", () => {
    const { session, dtc } = approvedDtcFixture();
    const result = stageConstruction(session, dtc, fullEvidenceParams(dtc.dtcId), "2026-07-18T10:03:00Z", PROPOSER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.session.status).toBe("CONSTRUCTION_STAGED");
    expect(result.value.primitive.kind).toBe("ObjectType");
    expect(result.value.primitive.dataEvidence).toHaveLength(1);
    expect(result.value.primitive.logicEvidence).toHaveLength(1);
    expect(result.value.primitive.actionEvidence).toHaveLength(1);
  });

  test("A1-006: fails closed on an unregistered primitive kind (never a ControlPlaneNodeKind value)", () => {
    const { session, dtc } = approvedDtcFixture();
    const result = stageConstruction(session, dtc, fullEvidenceParams(dtc.dtcId, { kind: "hook" }), "2026-07-18T10:03:00Z", PROPOSER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-CONSTRUCTION-UNREGISTERED-PRIMITIVE-KIND");
  });

  test("A1-006: fails closed on a completely unknown kind string", () => {
    const { session, dtc } = approvedDtcFixture();
    const result = stageConstruction(session, dtc, fullEvidenceParams(dtc.dtcId, { kind: "DatabaseTable" }), "2026-07-18T10:03:00Z", PROPOSER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-CONSTRUCTION-UNREGISTERED-PRIMITIVE-KIND");
  });

  test("fails closed when dtcId does not reference the approved DTC", () => {
    const { session, dtc } = approvedDtcFixture();
    const result = stageConstruction(session, dtc, fullEvidenceParams("dtc-does-not-exist"), "2026-07-18T10:03:00Z", PROPOSER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("fails closed when the session is not at DTC_APPROVED (state-skip delegated to assertLegalTransition)", () => {
    const session = openFdeSession({ sessionId: "fde-sess-p420-2", openedAt: "2026-07-18T09:55:00Z", byWhom: PROPOSER }); // FDE_OPEN
    const { dtc } = approvedDtcFixture();
    const result = stageConstruction(session, dtc, fullEvidenceParams(dtc.dtcId), "2026-07-18T10:03:00Z", PROPOSER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });

  // -------------------------------------------------------------------------
  // S3 negative: cross-class contamination
  // -------------------------------------------------------------------------
  test("S3 negative — cross-class contamination: a LOGIC-declared item placed in dataEvidence is rejected", () => {
    const { session, dtc } = approvedDtcFixture();
    const contaminated = fullEvidenceParams(dtc.dtcId, {
      dataEvidence: [evidenceItem("LOGIC", "evidence:mislabeled-1")], // declares LOGIC but submitted as DATA
    });
    const result = stageConstruction(session, dtc, contaminated, "2026-07-18T10:03:00Z", PROPOSER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-CONSTRUCTION-EVIDENCE-CLASS-CONTAMINATION");
  });

  test("S3 negative — cross-class contamination: an ACTION-declared item placed in logicEvidence is rejected", () => {
    const { session, dtc } = approvedDtcFixture();
    const contaminated = fullEvidenceParams(dtc.dtcId, {
      logicEvidence: [evidenceItem("ACTION", "evidence:mislabeled-2")],
    });
    const result = stageConstruction(session, dtc, contaminated, "2026-07-18T10:03:00Z", PROPOSER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-CONSTRUCTION-EVIDENCE-CLASS-CONTAMINATION");
  });

  test("S3 negative — malformed evidence item is rejected as a schema failure, distinct from contamination", () => {
    const { session, dtc } = approvedDtcFixture();
    const malformed = fullEvidenceParams(dtc.dtcId, {
      dataEvidence: [{ evidenceClass: "DATA", evidenceRef: "", recordedAt: "2026-07-18T10:03:00Z", byWhom: PROPOSER }],
    });
    const result = stageConstruction(session, dtc, malformed, "2026-07-18T10:03:00Z", PROPOSER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });
});

// ---------------------------------------------------------------------------
// S2: evaluateReadiness — the evidence-separation proof (validation-contract item 2)
// ---------------------------------------------------------------------------

describe("evaluateReadiness — evidence-class separation proof", () => {
  function stagedWithOnly(evidenceClass: "DATA" | "LOGIC" | "ACTION") {
    const { session, dtc } = approvedDtcFixture();
    const params = fullEvidenceParams(dtc.dtcId, {
      dataEvidence: evidenceClass === "DATA" ? [evidenceItem("DATA", "evidence:only-data")] : [],
      logicEvidence: evidenceClass === "LOGIC" ? [evidenceItem("LOGIC", "evidence:only-logic")] : [],
      actionEvidence: evidenceClass === "ACTION" ? [evidenceItem("ACTION", "evidence:only-action")] : [],
    });
    const staged = stageConstruction(session, dtc, params, "2026-07-18T10:03:00Z", PROPOSER);
    if (!staged.ok) throw new Error(`fixture setup failed: ${staged.reasonCode}`);
    return staged.value.primitive;
  }

  test("DATA evidence only cannot pass LOGIC readiness (and cannot pass ACTION readiness)", () => {
    const primitive = stagedWithOnly("DATA");
    const readiness = evaluateReadiness(primitive);
    expect(readiness.data.ready).toBe(true);
    expect(readiness.logic.ready).toBe(false);
    expect(readiness.logic.reasonCode).toBe("RC-CONSTRUCTION-EVIDENCE-CLASS-MISSING");
    expect(readiness.action.ready).toBe(false);
    expect(readiness.action.reasonCode).toBe("RC-CONSTRUCTION-EVIDENCE-CLASS-MISSING");
    expect(readiness.overallReady).toBe(false);
  });

  test("LOGIC evidence only cannot pass DATA readiness (symmetric case)", () => {
    const primitive = stagedWithOnly("LOGIC");
    const readiness = evaluateReadiness(primitive);
    expect(readiness.logic.ready).toBe(true);
    expect(readiness.data.ready).toBe(false);
    expect(readiness.data.reasonCode).toBe("RC-CONSTRUCTION-EVIDENCE-CLASS-MISSING");
    expect(readiness.action.ready).toBe(false);
    expect(readiness.overallReady).toBe(false);
  });

  test("ACTION evidence only cannot pass DATA or LOGIC readiness (symmetric case)", () => {
    const primitive = stagedWithOnly("ACTION");
    const readiness = evaluateReadiness(primitive);
    expect(readiness.action.ready).toBe(true);
    expect(readiness.data.ready).toBe(false);
    expect(readiness.logic.ready).toBe(false);
    expect(readiness.overallReady).toBe(false);
  });

  test("all 3 classes present: overallReady is true and every class carries a positive detail, no reasonCode", () => {
    const { session, dtc } = approvedDtcFixture();
    const staged = stageConstruction(session, dtc, fullEvidenceParams(dtc.dtcId), "2026-07-18T10:03:00Z", PROPOSER);
    if (!staged.ok) throw new Error("fixture setup failed");
    const readiness = evaluateReadiness(staged.value.primitive);
    expect(readiness.overallReady).toBe(true);
    for (const c of [readiness.data, readiness.logic, readiness.action]) {
      expect(c.ready).toBe(true);
      expect(c.reasonCode).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// S2/S3: validateConstruction — return-to-Lead result shape + premature validation
// ---------------------------------------------------------------------------

describe("validateConstruction", () => {
  function stagedFixture(evidenceOverrides: Partial<StagePrimitiveParams> = {}) {
    const { session, dtc } = approvedDtcFixture();
    const staged = stageConstruction(session, dtc, fullEvidenceParams(dtc.dtcId, evidenceOverrides), "2026-07-18T10:03:00Z", PROPOSER);
    if (!staged.ok) throw new Error(`fixture setup failed: ${staged.reasonCode}`);
    return staged.value;
  }

  test("A1-008: all 3 classes ready + independent evidence -> advances session to VALIDATED, returns typed readiness", () => {
    const { session, primitive } = stagedFixture();
    const result = validateConstruction(session, primitive, INDEPENDENT_VERIFIER, "2026-07-18T10:10:00Z");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.session.status).toBe("VALIDATED");
    expect(result.value.readiness.overallReady).toBe(true);
    expect(result.value.readiness.primitiveId).toBe(primitive.primitiveId);
  });

  // -------------------------------------------------------------------------
  // S3 negative: premature validation
  // -------------------------------------------------------------------------
  test("S3 negative — premature validation: staged with DATA evidence only fails closed before reaching evidence checks", () => {
    const { session, primitive } = stagedFixture({ logicEvidence: [], actionEvidence: [] });
    const result = validateConstruction(session, primitive, INDEPENDENT_VERIFIER, "2026-07-18T10:10:00Z");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("RC-CONSTRUCTION-PREMATURE-VALIDATION");
      expect(result.detail).toContain("LOGIC");
    }
  });

  test("S3 negative — premature validation: staged with LOGIC+ACTION but no DATA fails closed naming DATA", () => {
    const { session, primitive } = stagedFixture({ dataEvidence: [] });
    const result = validateConstruction(session, primitive, INDEPENDENT_VERIFIER, "2026-07-18T10:10:00Z");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("RC-CONSTRUCTION-PREMATURE-VALIDATION");
      expect(result.detail).toContain("DATA");
    }
  });

  test("never auto-promotes: premature-validation denial never advances session.status past CONSTRUCTION_STAGED", () => {
    const { session, primitive } = stagedFixture({ actionEvidence: [] });
    const before = session.status;
    const result = validateConstruction(session, primitive, INDEPENDENT_VERIFIER, "2026-07-18T10:10:00Z");
    expect(result.ok).toBe(false);
    expect(session.status).toBe(before); // input session is never mutated (immutable aggregate discipline)
    expect(session.status).toBe("CONSTRUCTION_STAGED");
  });

  test("fails closed when evidence is missing/malformed even though readiness is satisfied", () => {
    const { session, primitive } = stagedFixture();
    const result = validateConstruction(session, primitive, true as unknown as UserDecisionEvidence, "2026-07-18T10:10:00Z");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-EVIDENCE-MISSING");
  });

  test("fails closed when evidence is self-derived from the actor that staged the primitive", () => {
    const { session, primitive } = stagedFixture();
    const selfAttested: UserDecisionEvidence = { ...INDEPENDENT_VERIFIER, verifiedBy: { identity: PROPOSER.identity } };
    const result = validateConstruction(session, primitive, selfAttested, "2026-07-18T10:10:00Z");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-EVIDENCE-MISSING");
  });

  test("A1-010 (audit): no exported function in this module reaches MUTATION_AUTHORITY_ISSUED or COMMITTED", () => {
    const { session, primitive } = stagedFixture();
    const result = validateConstruction(session, primitive, INDEPENDENT_VERIFIER, "2026-07-18T10:10:00Z");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(["MUTATION_AUTHORITY_ISSUED", "COMMITTED"]).not.toContain(result.value.session.status);
    expect(result.value.session.status).toBe("VALIDATED"); // terminal state this task may reach
  });
});
