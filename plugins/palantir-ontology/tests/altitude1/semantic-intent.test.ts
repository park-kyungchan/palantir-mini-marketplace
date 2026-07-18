// P410 S2: Semantic Intent Contract (SIC) aggregate tests (A1-003).

import { describe, expect, test } from "bun:test";
import { openFdeSession } from "../../src/altitude1/fde-session";
import { approveSic, proposeSic, type SicBody } from "../../src/altitude1/semantic-intent";
import { fingerprintBody } from "../../src/semantic-core/fingerprint";
import type { UserDecisionEvidence } from "../../src/semantic-core/user-decision-evidence";

const PROPOSER = { identity: "agent:claude-sonnet-5", role: "worker" };
const INDEPENDENT_VERIFIER: UserDecisionEvidence = {
  evidenceRef: "evidence:decision-log-2026-07-18-001",
  verifiedAt: "2026-07-18T09:25:00Z",
  verifiedBy: { identity: "user:packr0723", role: "approver" },
};

function freshSession() {
  return openFdeSession({ sessionId: "fde-sess-sic-1", openedAt: "2026-07-18T09:00:00Z", byWhom: PROPOSER });
}

function sicBody(overrides: Partial<SicBody> = {}): SicBody {
  return {
    sicId: "sic-t1",
    fdeSessionId: "fde-sess-sic-1",
    approvedMeaning: "Model X as a ControlPlaneNodeKind catalog entry, not a product ObjectType.",
    fdeProvenance: { sessionId: "fde-sess-sic-1", turnIds: ["turn-1", "turn-2"] },
    promptProvenanceRef: "evidence:prompt-record-2026-07-18-001",
    acceptedHypotheses: ["Model X as a ControlPlaneNodeKind entry"],
    rejectedHypotheses: ["Model X as a new ObjectType"],
    ...overrides,
  };
}

describe("proposeSic", () => {
  test("A1-003: traceable FDE provenance (fdeProvenance) + typed prompt-provenance pointer (promptProvenanceRef), never raw prompt text", () => {
    const result = proposeSic(freshSession(), sicBody(), "2026-07-18T09:20:00Z", PROPOSER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.session.status).toBe("SIC_PROPOSED");
    expect(result.value.sic.status).toBe("draft");
    expect(result.value.sic.bodyFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.value.sic.bodyFingerprint).toBe(fingerprintBody(sicBody() as unknown as any));
  });

  test("A1-005: fails closed when the body's fdeSessionId is inconsistent with the session", () => {
    const result = proposeSic(freshSession(), sicBody({ fdeSessionId: "some-other-session" }), "2026-07-18T09:20:00Z", PROPOSER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("fails closed when the session is not at FDE_OPEN (e.g. already SIC_PROPOSED)", () => {
    const first = proposeSic(freshSession(), sicBody(), "2026-07-18T09:20:00Z", PROPOSER);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = proposeSic(first.value.session, sicBody({ sicId: "sic-t1-again" }), "2026-07-18T09:21:00Z", PROPOSER);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });
});

describe("approveSic", () => {
  function proposedFixture() {
    const proposed = proposeSic(freshSession(), sicBody(), "2026-07-18T09:20:00Z", PROPOSER);
    if (!proposed.ok) throw new Error("fixture setup failed");
    return proposed.value;
  }

  test("A1-003: approves with independently verified user-decision evidence and the exact matching fingerprint", () => {
    const { session, sic } = proposedFixture();
    const result = approveSic(session, sic, sic.bodyFingerprint, INDEPENDENT_VERIFIER, "2026-07-18T09:25:00Z");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.session.status).toBe("SIC_APPROVED");
    expect(result.value.sic.status).toBe("approved");
    expect(result.value.sic.approvedAt).toBe("2026-07-18T09:25:00Z");
  });

  test("A1-003: fails closed when evidence is self-derived from the proposing actor (never derived from the proposer)", () => {
    const { session, sic } = proposedFixture();
    const selfAttested: UserDecisionEvidence = { ...INDEPENDENT_VERIFIER, verifiedBy: { identity: PROPOSER.identity } };
    const result = approveSic(session, sic, sic.bodyFingerprint, selfAttested, "2026-07-18T09:25:00Z");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-EVIDENCE-MISSING");
  });

  test("A1-003: fails closed when evidence is absent/malformed (a bare tool-success boolean cannot approve it)", () => {
    const { session, sic } = proposedFixture();
    const result = approveSic(session, sic, sic.bodyFingerprint, true as unknown as UserDecisionEvidence, "2026-07-18T09:25:00Z");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-EVIDENCE-MISSING");
  });

  test("A1-005: fails closed on a forged/mismatched presented fingerprint", () => {
    const { session, sic } = proposedFixture();
    const forged = "0".repeat(64);
    const result = approveSic(session, sic, forged, INDEPENDENT_VERIFIER, "2026-07-18T09:25:00Z");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-STALE-FINGERPRINT");
  });

  test("A1-005: fails closed when the presented fingerprint is merely referenced by free text, not an exact hash", () => {
    const { session, sic } = proposedFixture();
    const result = approveSic(session, sic, "see the SIC proposed above", INDEPENDENT_VERIFIER, "2026-07-18T09:25:00Z");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-STALE-FINGERPRINT");
  });

  test("fails closed when the session is not at SIC_PROPOSED", () => {
    const result = approveSic(
      freshSession(),
      { schemaVersion: "1.0.0", sicId: "sic-x", fdeSessionId: "fde-sess-sic-1", status: "draft", bodyFingerprint: "0".repeat(64), proposedAt: "2026-07-18T09:20:00Z", byWhom: PROPOSER },
      "0".repeat(64),
      INDEPENDENT_VERIFIER,
      "2026-07-18T09:25:00Z",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });
});
