// P410 S2: FDE session aggregate tests (A1-001, A1-002).

import { describe, expect, test } from "bun:test";
import { openFdeSession, recordTurn, transitionSession, type FdeTurn } from "../../src/altitude1/fde-session";

const ACTOR = { identity: "agent:claude-sonnet-5", role: "worker" };

describe("openFdeSession", () => {
  test("the universal entry: FDE_OPEN, no turns, no userFacingSummary yet (A1-001)", () => {
    const session = openFdeSession({ sessionId: "fde-sess-t1", openedAt: "2026-07-18T09:00:00Z", byWhom: ACTOR });
    expect(session.status).toBe("FDE_OPEN");
    expect(session.turns).toEqual([]);
    expect(session.userFacingSummary).toBeUndefined();
    expect(session.schemaVersion).toBe("1.0.0");
  });

  test("carries an optional consumerOntologyId when supplied", () => {
    const session = openFdeSession({
      sessionId: "fde-sess-t2",
      openedAt: "2026-07-18T09:00:00Z",
      byWhom: ACTOR,
      consumerOntologyId: "consumer:example-project",
    });
    expect(session.consumerOntologyId).toBe("consumer:example-project");
  });
});

describe("recordTurn", () => {
  const BASE = openFdeSession({ sessionId: "fde-sess-t3", openedAt: "2026-07-18T09:00:00Z", byWhom: ACTOR });

  test("records phase, hypothesis, candidatePrimitives, unresolvedQuestions, evidenceRefs, boundedSummary (A1-001)", () => {
    const turn: FdeTurn = {
      turnId: "turn-1",
      recordedAt: "2026-07-18T09:05:00Z",
      byWhom: ACTOR,
      phase: "FDE_OPEN",
      hypothesis: "Model X as a ControlPlaneNodeKind entry",
      rejected: false,
      boundedSummary: "Accepted: X is control-plane metadata.",
      candidatePrimitives: ["control-plane:x-entry"],
      unresolvedQuestions: ["Does X need its own retention policy?"],
      evidenceRefs: ["evidence:p210-section-8d"],
    };
    const result = recordTurn(BASE, turn, "Eliciting whether X is domain or control-plane.");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.turns).toEqual([turn]);
      expect(result.value.userFacingSummary).toBe("Eliciting whether X is domain or control-plane.");
    }
  });

  test("A1-002: preserves BOTH accepted and rejected hypotheses across turns (append-only, never deleted)", () => {
    const turn1: FdeTurn = {
      turnId: "turn-1",
      recordedAt: "2026-07-18T09:05:00Z",
      byWhom: ACTOR,
      phase: "FDE_OPEN",
      hypothesis: "Model X as a new ObjectType",
      rejected: true,
      reasonCode: "RC-STATE-EVIDENCE-MISSING",
      boundedSummary: "Rejected: looks like control-plane metadata.",
    };
    const afterFirst = recordTurn(BASE, turn1);
    expect(afterFirst.ok).toBe(true);
    if (!afterFirst.ok) return;

    const turn2: FdeTurn = {
      turnId: "turn-2",
      recordedAt: "2026-07-18T09:10:00Z",
      byWhom: ACTOR,
      phase: "FDE_OPEN",
      hypothesis: "Model X as a ControlPlaneNodeKind entry",
      rejected: false,
      boundedSummary: "Accepted per ADR-003.",
    };
    const afterSecond = recordTurn(afterFirst.value, turn2);
    expect(afterSecond.ok).toBe(true);
    if (!afterSecond.ok) return;

    expect(afterSecond.value.turns).toHaveLength(2);
    expect(afterSecond.value.turns[0]!.rejected).toBe(true);
    expect(afterSecond.value.turns[0]!.hypothesis).toBe("Model X as a new ObjectType");
    expect(afterSecond.value.turns[1]!.rejected).toBe(false);
    expect(afterSecond.value.turns[1]!.hypothesis).toBe("Model X as a ControlPlaneNodeKind entry");
    // The original session object is untouched (append-only via new-object return, not in-place mutation).
    expect(BASE.turns).toEqual([]);
  });

  test("rejects a duplicate turnId (history is append-only, never overwritten)", () => {
    const turn: FdeTurn = {
      turnId: "turn-dup",
      recordedAt: "2026-07-18T09:05:00Z",
      byWhom: ACTOR,
      phase: "FDE_OPEN",
      boundedSummary: "First.",
    };
    const first = recordTurn(BASE, turn);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = recordTurn(first.value, { ...turn, boundedSummary: "Attempted overwrite." });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("rejects a turn carrying an unregistered reasonCode (never a free-text reason)", () => {
    const turn: FdeTurn = {
      turnId: "turn-bad-code",
      recordedAt: "2026-07-18T09:05:00Z",
      byWhom: ACTOR,
      phase: "FDE_OPEN",
      rejected: true,
      reasonCode: "the user just did not like it",
      boundedSummary: "Rejected for an unregistered reason.",
    };
    const result = recordTurn(BASE, turn);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });
});

describe("transitionSession", () => {
  test("advances FDE_OPEN -> SIC_PROPOSED", () => {
    const session = openFdeSession({ sessionId: "fde-sess-t4", openedAt: "2026-07-18T09:00:00Z", byWhom: ACTOR });
    const result = transitionSession(session, "SIC_PROPOSED");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe("SIC_PROPOSED");
  });

  test("rejects skipping a state, stable reason code RC-STATE-SKIPPED-TRANSITION", () => {
    const session = openFdeSession({ sessionId: "fde-sess-t5", openedAt: "2026-07-18T09:00:00Z", byWhom: ACTOR });
    const result = transitionSession(session, "DTC_APPROVED");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });
});
