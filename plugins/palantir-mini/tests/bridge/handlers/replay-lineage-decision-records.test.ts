// palantir-mini P1-13-wire — replay_lineage is the PRODUCTION consumer of
// foldDecisionRecords. Before this wiring foldDecisionRecords was exported only for
// its own unit test (zero production consumers). The replay path is the BackwardProp
// lineage read, so a lineage replay must surface each decision as ONE bound
// D+L+A+S DecisionRecord (Logic⇄Action+Data+Security), not the raw unlinked
// propose/commit rows. This suite asserts the handler actually folds a real
// propose→commit pair into a bound record, and that the field is additive
// (empty [] on a propose/commit-free window — pure read, non-breaking).
// Grounding: ssot/palantir decision-model + approval-and-lineage.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import replayLineageHandler from "../../../bridge/handlers/replay-lineage";

const tmpDirs: string[] = [];

function makeTmpProject(): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-replay-lineage-dr-"));
  tmpDirs.push(project);
  fs.mkdirSync(path.join(project, ".palantir-mini", "session"), { recursive: true });
  return project;
}

const EXECUTOR_ACTION_TYPE_RID = "pm.self.ontology/action-type/executor";

function writeEvents(project: string, events: unknown[]): void {
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  const lines = events
    .map((e, i) => ({
      sequence: i + 1,
      eventId: `evt-${i + 1}`,
      when: new Date(Date.UTC(2026, 5, 23, 0, 0, i)).toISOString(),
      atopWhich: "abc1234def567",
      byWhom: { identity: "claude-code", agentName: "test-agent" },
      throughWhich: { surface: "cli", toolName: "test", cwd: "/x", sessionId: "sess-001" },
      ...(e as object),
    }))
    .map((e) => JSON.stringify(e))
    .join("\n");
  fs.writeFileSync(eventsPath, lines + "\n");
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

describe("P1-13-wire — replay_lineage folds bound D+L+A+S DecisionRecords", () => {
  test("propose→commit pair surfaces ONE bound DecisionRecord (committed, Logic⇄Action+Data+Security)", async () => {
    const project = makeTmpProject();
    writeEvents(project, [
      {
        type: "edit_proposed",
        payload: {
          functionName: "stageEdit",
          params: {},
          hypotheticalEdits: [{ kind: "object", rid: "rid-A", properties: { primitiveKind: "ObjectType" } }],
        },
        withWhat: { reasoning: "stage object A because the contract requires it" },
      },
      {
        type: "edit_committed",
        payload: {
          actionTypeRid: EXECUTOR_ACTION_TYPE_RID,
          appliedEdits: [{ kind: "object", rid: "rid-A", properties: { primitiveKind: "ObjectType" } }],
          submissionCriteriaPassed: ["c1", "c2"],
        },
      },
    ]);

    // includeLegacyRaw=true → deterministic full raw scan (skip promoted-index path).
    const result = await replayLineageHandler({ project, includeLegacyRaw: true });

    // Additive field is present and is the bound projection — NOT the raw rows.
    expect(Array.isArray(result.decisionRecords)).toBe(true);
    expect(result.decisionRecords.length).toBe(1);
    const dr = result.decisionRecords[0]!;
    // LOGIC — staged edit + WHY.
    expect(dr.logic.functionName).toBe("stageEdit");
    expect(dr.logic.reasoning).toBe("stage object A because the contract requires it");
    // ACTION — committed through the ActionType gate.
    expect(dr.action.committed).toBe(true);
    expect(dr.action.actionTypeRid).toBe(EXECUTOR_ACTION_TYPE_RID);
    // DATA — the edit set that landed.
    expect(dr.data.map((e) => e.rid)).toEqual(["rid-A"]);
    // SECURITY — actor + submission-criteria gate.
    expect(dr.security.actor).toBe("claude-code");
    expect(dr.security.submissionCriteriaPassed).toEqual(["c1", "c2"]);

    // Existing outputs are unchanged (additive, non-breaking).
    expect(Array.isArray(result.lineageGraph)).toBe(true);
    expect(result.derivedState).toBeDefined();
    // EFFORT-A (b) — single record is well under the default cap ⇒ not truncated.
    expect(result.decisionRecordsTruncated).toBe(false);
  });

  test("propose/commit-free window ⇒ decisionRecords is [] (pure read, non-breaking)", async () => {
    const project = makeTmpProject();
    writeEvents(project, [
      { type: "session_started", payload: { effort: "x" } },
      { type: "phase_completed", payload: { phaseTag: "test" } },
    ]);

    const result = await replayLineageHandler({ project, includeLegacyRaw: true });

    expect(result.decisionRecords).toEqual([]);
    // Existing outputs still present.
    expect(Array.isArray(result.lineageGraph)).toBe(true);
    expect(result.derivedState).toBeDefined();
    // EFFORT-A (b) — empty fold is never truncated.
    expect(result.decisionRecordsTruncated).toBe(false);
  });
});

describe("EFFORT-A (b) — decisionRecords is bounded by decisionRecordsLimit", () => {
  // Build N independent propose→commit pairs (each pair folds into ONE
  // DecisionRecord). distinct rids keep each pair its own decision.
  function proposeCommitPairs(n: number): unknown[] {
    const events: unknown[] = [];
    for (let i = 0; i < n; i++) {
      events.push({
        type: "edit_proposed",
        payload: {
          functionName: "stageEdit",
          params: {},
          hypotheticalEdits: [{ kind: "object", rid: `rid-${i}`, properties: { primitiveKind: "ObjectType" } }],
        },
        withWhat: { reasoning: `stage object ${i} because the contract requires it` },
      });
      events.push({
        type: "edit_committed",
        payload: {
          actionTypeRid: EXECUTOR_ACTION_TYPE_RID,
          appliedEdits: [{ kind: "object", rid: `rid-${i}`, properties: { primitiveKind: "ObjectType" } }],
          submissionCriteriaPassed: ["c1"],
        },
      });
    }
    return events;
  }

  test(">limit window ⇒ decisionRecords capped to limit + decisionRecordsTruncated true", async () => {
    const project = makeTmpProject();
    // 5 pairs ⇒ 5 folded records; cap at 3.
    writeEvents(project, proposeCommitPairs(5));

    const result = await replayLineageHandler({ project, includeLegacyRaw: true, decisionRecordsLimit: 3 });

    expect(result.decisionRecords.length).toBe(3);
    expect(result.decisionRecordsTruncated).toBe(true);
    // The slice is the head of the folded stream (first 3 decisions).
    expect(result.decisionRecords.map((dr) => dr.data.map((e) => e.rid)[0])).toEqual([
      "rid-0",
      "rid-1",
      "rid-2",
    ]);
  });

  test("<=limit window ⇒ all records returned + decisionRecordsTruncated false (complete)", async () => {
    const project = makeTmpProject();
    // 3 pairs ⇒ 3 folded records; limit 3 (boundary: equal, not exceeded).
    writeEvents(project, proposeCommitPairs(3));

    const result = await replayLineageHandler({ project, includeLegacyRaw: true, decisionRecordsLimit: 3 });

    expect(result.decisionRecords.length).toBe(3);
    expect(result.decisionRecordsTruncated).toBe(false);
  });

  test("absent decisionRecordsLimit ⇒ default 200 cap (small window is complete, not truncated)", async () => {
    const project = makeTmpProject();
    writeEvents(project, proposeCommitPairs(4));

    const result = await replayLineageHandler({ project, includeLegacyRaw: true });

    expect(result.decisionRecords.length).toBe(4);
    expect(result.decisionRecordsTruncated).toBe(false);
  });
});
