// palantir-mini P1-13 — bound D+L+A+S DecisionRecord fold.
// Verifies foldDecisionRecords binds an `edit_proposed` (Logic + staged edit) to
// its `edit_committed` (Action + Security + Data) into ONE DecisionRecord, and
// handles commit-only + proposal-only cases. Mirrors the v1.92 memory-fold
// paired-test pattern. Grounding: ssot/palantir decision-model + approval-and-lineage
// ("decision = Data + Logic + Action + Security" is the commit pipeline).

import { test, expect, describe } from "bun:test";
import {
  eventId,
  sessionId,
  commitSha,
  type EventEnvelope,
  type EditProposedEnvelope,
  type EditCommittedEnvelope,
  type OntologyEdit,
} from "../../../lib/event-log/types";
import { foldDecisionRecords } from "../../../lib/event-log/read/decision-record";

function makeBase(seq: number, sid = "s-1") {
  return {
    sequence:     seq,
    eventId:      eventId(`e-${seq}`),
    when:         "2026-06-23T00:00:00.000Z",
    atopWhich:    commitSha("abc1234"),
    throughWhich: { sessionId: sessionId(sid), toolName: "t", cwd: "/x" },
    byWhom:       { identity: "claude-code" as const },
  };
}

const EDIT_A: OntologyEdit = { kind: "object", rid: "rid-A", properties: { primitiveKind: "ObjectType" } };
const EDIT_B: OntologyEdit = { kind: "object", rid: "rid-B", properties: { primitiveKind: "ActionType" } };

function makeProposed(seq: number, edits: OntologyEdit[], reasoning?: string, sid = "s-1"): EditProposedEnvelope {
  return {
    ...makeBase(seq, sid),
    type: "edit_proposed",
    payload: { functionName: "stageEdit", params: {}, hypotheticalEdits: edits },
    ...(reasoning ? { withWhat: { reasoning } } : {}),
  };
}

function makeCommitted(seq: number, edits: OntologyEdit[], sid = "s-1"): EditCommittedEnvelope {
  return {
    ...makeBase(seq, sid),
    type: "edit_committed",
    payload: { actionTypeRid: "pm.self.ontology/action-type/executor", appliedEdits: edits, submissionCriteriaPassed: ["c1", "c2"] },
  };
}

describe("P1-13 — foldDecisionRecords binds D+L+A+S into one record", () => {
  test("proposal + commit fold into ONE bound decision (Logic⇄Action+Data+Security)", () => {
    const events: EventEnvelope[] = [
      makeProposed(1, [EDIT_A], "stage object A because the contract requires it"),
      makeCommitted(2, [EDIT_A]),
    ];
    const records = foldDecisionRecords(events);
    expect(records.length).toBe(1);
    const r = records[0]!;
    // LOGIC — staged edit + WHY-narrative.
    expect(r.logic.functionName).toBe("stageEdit");
    expect(r.logic.reasoning).toBe("stage object A because the contract requires it");
    expect(r.logic.proposedSeq).toBe(1);
    // ACTION — committed through the ActionType gate.
    expect(r.action.committed).toBe(true);
    expect(r.action.actionTypeRid).toBe("pm.self.ontology/action-type/executor");
    expect(r.action.committedSeq).toBe(2);
    // DATA — the edit set that landed.
    expect(r.data.map((e) => e.rid)).toEqual(["rid-A"]);
    // SECURITY — actor + submission-criteria gate + commit-base.
    expect(r.security.actor).toBe("claude-code");
    expect(r.security.submissionCriteriaPassed).toEqual(["c1", "c2"]);
    expect(r.security.atopWhich).toBe("abc1234");
    expect(r.sessionId).toBe("s-1");
  });

  test("uncommitted proposal ⇒ proposal-only decision (action.committed=false)", () => {
    const records = foldDecisionRecords([makeProposed(1, [EDIT_A], "staged, not yet gated")]);
    expect(records.length).toBe(1);
    expect(records[0]!.action.committed).toBe(false);
    expect(records[0]!.action.committedSeq).toBeUndefined();
    // DATA falls back to the staged edit set when no commit landed.
    expect(records[0]!.data.map((e) => e.rid)).toEqual(["rid-A"]);
  });

  test("commit with no matching proposal ⇒ commit-only decision (empty Logic)", () => {
    const records = foldDecisionRecords([makeCommitted(5, [EDIT_B])]);
    expect(records.length).toBe(1);
    expect(records[0]!.action.committed).toBe(true);
    expect(records[0]!.logic.proposedSeq).toBeUndefined();
    expect(records[0]!.data.map((e) => e.rid)).toEqual(["rid-B"]);
  });

  test("binds the matching proposal in the same session (does not cross sessions)", () => {
    const events: EventEnvelope[] = [
      makeProposed(1, [EDIT_A], "session s-1 proposal", "s-1"),
      makeProposed(2, [EDIT_A], "session s-2 proposal", "s-2"),
      makeCommitted(3, [EDIT_A], "s-2"),
    ];
    const records = foldDecisionRecords(events);
    // One bound (s-2 proposal⇄commit) + one trailing proposal-only (s-1).
    const bound = records.find((r) => r.action.committed)!;
    expect(bound.sessionId).toBe("s-2");
    expect(bound.logic.reasoning).toBe("session s-2 proposal");
    const trailing = records.find((r) => !r.action.committed)!;
    expect(trailing.sessionId).toBe("s-1");
    expect(records.length).toBe(2);
  });

  test("provable no-op: stream with no propose/commit rows yields []", () => {
    const events: EventEnvelope[] = [
      { ...makeBase(1), type: "session_started", payload: { effort: "x" } },
      { ...makeBase(2), type: "session_ended", payload: { reason: "clear", eventCount: 1 } },
    ];
    expect(foldDecisionRecords(events)).toEqual([]);
    expect(foldDecisionRecords([])).toEqual([]);
  });
});
