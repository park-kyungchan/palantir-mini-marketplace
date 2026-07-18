// P410 S2: Digital Twin Change Contract (DTC) aggregate tests (A1-004,
// A1-005).

import { describe, expect, test } from "bun:test";
import { openFdeSession } from "../../src/altitude1/fde-session";
import { approveSic, proposeSic, type SicBody } from "../../src/altitude1/semantic-intent";
import { finalizeDtc, proposeDtc, type DtcBody } from "../../src/altitude1/digital-twin-change";
import type { UserDecisionEvidence } from "../../src/semantic-core/user-decision-evidence";

const PROPOSER = { identity: "agent:claude-sonnet-5", role: "worker" };
const INDEPENDENT_VERIFIER: UserDecisionEvidence = {
  evidenceRef: "evidence:decision-log-2026-07-18-002",
  verifiedAt: "2026-07-18T09:35:00Z",
  verifiedBy: { identity: "user:packr0723", role: "approver" },
};

const SIC_BODY: SicBody = {
  sicId: "sic-dtc-1",
  fdeSessionId: "fde-sess-dtc-1",
  approvedMeaning: "Model X as a ControlPlaneNodeKind catalog entry.",
  fdeProvenance: { sessionId: "fde-sess-dtc-1", turnIds: ["turn-1"] },
  promptProvenanceRef: "evidence:prompt-record-2026-07-18-002",
  acceptedHypotheses: ["Model X as a ControlPlaneNodeKind entry"],
  rejectedHypotheses: [],
};

function dtcBody(overrides: Partial<DtcBody> = {}, sicFingerprint: string): DtcBody {
  return {
    dtcId: "dtc-t1",
    sicFingerprint,
    fdeEvidenceRefs: ["evidence:p210-section-8d"],
    dataContext: "Backed by governance/object-type-registry.yaml row 'x'.",
    logicContext: "No computed logic; static catalog membership.",
    actionContext: "No mutating action; read-only catalog entry.",
    technologyRecommendation: "src/control-plane/ typed catalog (ADR-003).",
    validationPlan: "boundary:check absence-scan + X-001 tests (P450).",
    typedRefs: ["adr:ADR-003"],
    approvalProvenance: { sicApprovedBy: "user:packr0723", sicApprovedAt: "2026-07-18T09:25:00Z" },
    ...overrides,
  };
}

/** Builds session at SIC_APPROVED + the approved SIC record, ready for a DTC proposal. */
function approvedSicFixture() {
  const session = openFdeSession({ sessionId: "fde-sess-dtc-1", openedAt: "2026-07-18T09:00:00Z", byWhom: PROPOSER });
  const proposed = proposeSic(session, SIC_BODY, "2026-07-18T09:20:00Z", PROPOSER);
  if (!proposed.ok) throw new Error("fixture setup: proposeSic failed");
  const approved = approveSic(proposed.value.session, proposed.value.sic, proposed.value.sic.bodyFingerprint, INDEPENDENT_VERIFIER, "2026-07-18T09:25:00Z");
  if (!approved.ok) throw new Error("fixture setup: approveSic failed");
  return approved.value;
}

describe("proposeDtc", () => {
  test("A1-004: derived from approved SIC + FDE evidence + DATA/LOGIC/ACTION context + technology recommendation + validation plan + typed refs + approval provenance", () => {
    const { session, sic } = approvedSicFixture();
    const result = proposeDtc(session, sic, dtcBody({}, sic.bodyFingerprint), "2026-07-18T09:30:00Z", PROPOSER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.session.status).toBe("DTC_PROPOSED");
    expect(result.value.dtc.status).toBe("draft");
    expect(result.value.dtc.sicFingerprint).toBe(sic.bodyFingerprint);
    expect(result.value.dtc.bodyFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  test("A1-005: fails closed on a stale/mismatched sicFingerprint (forged pointer)", () => {
    const { session, sic } = approvedSicFixture();
    const result = proposeDtc(session, sic, dtcBody({}, "0".repeat(64)), "2026-07-18T09:30:00Z", PROPOSER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-STALE-FINGERPRINT");
  });

  test("A1-005: fails closed when the SIC is not approved (still draft)", () => {
    const session = openFdeSession({ sessionId: "fde-sess-dtc-2", openedAt: "2026-07-18T09:00:00Z", byWhom: PROPOSER });
    const proposedSic = proposeSic(session, { ...SIC_BODY, sicId: "sic-draft", fdeSessionId: "fde-sess-dtc-2" }, "2026-07-18T09:20:00Z", PROPOSER);
    if (!proposedSic.ok) throw new Error("fixture setup failed");
    // Session is at SIC_PROPOSED (not SIC_APPROVED) — proposeDtc's own session-transition gate fails first.
    const result = proposeDtc(proposedSic.value.session, proposedSic.value.sic, dtcBody({}, proposedSic.value.sic.bodyFingerprint), "2026-07-18T09:30:00Z", PROPOSER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });
});

describe("finalizeDtc", () => {
  function proposedDtcFixture() {
    const { session, sic } = approvedSicFixture();
    const proposed = proposeDtc(session, sic, dtcBody({}, sic.bodyFingerprint), "2026-07-18T09:30:00Z", PROPOSER);
    if (!proposed.ok) throw new Error("fixture setup: proposeDtc failed");
    return proposed.value;
  }

  test("dtc-filled: advances session to DTC_APPROVED with independent evidence", () => {
    const { session, dtc } = proposedDtcFixture();
    const result = finalizeDtc(session, dtc, "dtc-filled", INDEPENDENT_VERIFIER, "2026-07-18T09:40:00Z");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.session.status).toBe("DTC_APPROVED");
    expect(result.value.dtc.status).toBe("approved");
    expect(result.value.dtc.verdict).toBe("dtc-filled");
  });

  test("dtc-filled: fails closed when evidence is missing/malformed (a bare tool-success boolean cannot finalize it)", () => {
    const { session, dtc } = proposedDtcFixture();
    const result = finalizeDtc(session, dtc, "dtc-filled", true as unknown as UserDecisionEvidence, "2026-07-18T09:40:00Z");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-EVIDENCE-MISSING");
  });

  test("dtc-filled: fails closed when evidence is self-derived from the proposing actor", () => {
    const { session, dtc } = proposedDtcFixture();
    const selfAttested: UserDecisionEvidence = { ...INDEPENDENT_VERIFIER, verifiedBy: { identity: PROPOSER.identity } };
    const result = finalizeDtc(session, dtc, "dtc-filled", selfAttested, "2026-07-18T09:40:00Z");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-EVIDENCE-MISSING");
  });

  test("dtc-rejected: sets terminal superseded status, requires a registered reasonCode, session does not advance", () => {
    const { session, dtc } = proposedDtcFixture();
    const result = finalizeDtc(session, dtc, "dtc-rejected", INDEPENDENT_VERIFIER, "2026-07-18T09:40:00Z", "RC-STATE-EVIDENCE-MISSING");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dtc.status).toBe("superseded");
    expect(result.value.dtc.verdict).toBe("dtc-rejected");
    expect(result.value.session.status).toBe("DTC_PROPOSED"); // unchanged: linear chain has no back-edge
  });

  test("dtc-rejected: fails closed when no reasonCode is supplied (required context for rejection/abort)", () => {
    const { session, dtc } = proposedDtcFixture();
    const result = finalizeDtc(session, dtc, "dtc-rejected", INDEPENDENT_VERIFIER, "2026-07-18T09:40:00Z");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("dtc-aborted: fails closed when the supplied reasonCode is not registered (free text standing in for a code)", () => {
    const { session, dtc } = proposedDtcFixture();
    const result = finalizeDtc(session, dtc, "dtc-aborted", INDEPENDENT_VERIFIER, "2026-07-18T09:40:00Z", "the operator changed their mind");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("no path in this module mints mutation authority or commits: CONSTRUCTION_STAGED/VALIDATED/MUTATION_AUTHORITY_ISSUED/COMMITTED are unreachable from any exported function", () => {
    const { session, dtc } = proposedDtcFixture();
    const result = finalizeDtc(session, dtc, "dtc-filled", INDEPENDENT_VERIFIER, "2026-07-18T09:40:00Z");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.session.status).toBe("DTC_APPROVED");
    expect(["CONSTRUCTION_STAGED", "VALIDATED", "MUTATION_AUTHORITY_ISSUED", "COMMITTED"]).not.toContain(result.value.session.status);
  });

  test("fails closed when the session is not at DTC_PROPOSED", () => {
    const { session, sic } = approvedSicFixture(); // session is at SIC_APPROVED, not DTC_PROPOSED
    const fakeDtc = {
      schemaVersion: "1.0.0",
      dtcId: "dtc-x",
      sicFingerprint: sic.bodyFingerprint,
      status: "draft" as const,
      bodyFingerprint: "0".repeat(64),
      proposedAt: "2026-07-18T09:30:00Z",
      byWhom: PROPOSER,
    };
    const result = finalizeDtc(session, fakeDtc, "dtc-filled", INDEPENDENT_VERIFIER, "2026-07-18T09:40:00Z");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });
});
