// P440 S2: lineage append hook (A2-009) unit tests.
//
// P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
// Lead Selection — Option 1+"): `routeCommit`'s deps no longer carry the
// security-trust predicates or a clock — `committedSession()` builds a
// trusted test gate (`buildGate`) and passes it as `routeCommit`'s fourth
// argument. No install/reset — the gate is self-contained.

import { describe, expect, test } from "bun:test";
import { appendOperationLineage, type LineageEntry } from "../../src/altitude2/lineage";
import { createMintLedger, routeCommit } from "../../src/altitude2/commit-routing";
import { buildGate, sessionAtGovernanceCheck } from "./session-test-helpers";

function committedSession() {
  const session = sessionAtGovernanceCheck();
  const gate = buildGate({ actualDryRunFingerprint: () => session.dryRunFingerprint! });
  const result = routeCommit(
    session,
    createMintLedger(),
    {
      writeExecutor: () => {},
      userDecisionEvidence: { evidenceRef: "transcript:2026-07-18-turn-9", verifiedAt: "2026-07-18T09:00:45Z", verifiedBy: { identity: "user:palantirkc" } },
      issuingActor: { identity: "successor:altitude2-gate" },
      issuingDecision: "gate-decision:2026-07-18T09:01:00Z",
      ttlSeconds: 300,
    },
    gate,
  );
  if (!result.ok) throw new Error("fixture setup failed: routeCommit");
  return result.value.session;
}

describe("appendOperationLineage", () => {
  test("appends a typed actor/target/route/evidence/outcome entry and advances to LINEAGE_APPENDED", () => {
    const session = committedSession();
    const entries: LineageEntry[] = [];
    const result = appendOperationLineage(session, { now: () => "2026-07-18T09:01:05Z", appendLineage: (e) => entries.push(e) });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.state).toBe("LINEAGE_APPENDED");
    expect(entries).toHaveLength(1);
    expect(entries[0]!.sessionId).toBe(session.sessionId);
    expect(entries[0]!.target).toEqual(["ObjectType:Widget"]);
    expect(entries[0]!.route).toBe("altitude2.operation");
    expect(entries[0]!.outcome).toEqual({ outcome: "committed", reasonCode: "RC-COMMIT-SUCCEEDED" });
    expect(entries[0]!.recordedAt).toBe("2026-07-18T09:01:05Z");
  });

  test("denies a session with no successful commit (no empty success)", () => {
    const uncommitted = sessionAtGovernanceCheck();
    const entries: LineageEntry[] = [];
    const result = appendOperationLineage(uncommitted, { now: () => "2026-07-18T09:01:05Z", appendLineage: (e) => entries.push(e) });
    expect(result.ok).toBe(false);
    expect(entries).toEqual([]);
  });
});
