// palantir-mini — decision-extractor tests (W1.H sprint-037)
// Coverage: 4 cases per spec.
//   1. pairs_spawn_with_decisions
//   2. handles_unattributed
//   3. multi_correlation_aggregation
//   4. filter_by_agent

import { test, expect, describe } from "bun:test";
import {
  extractDecisionTrail,
  type AuditFilter,
} from "../../../lib/agent-audit/decision-extractor";
import type { EventEnvelope, EventId, CommitSha, SessionId } from "../../../lib/event-log/types";
import { eventId, commitSha, sessionId } from "../../../lib/event-log/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _seq = 0;
function nextSeq(): number { return ++_seq; }

function makeBase(seq: number) {
  return {
    sequence:     seq,
    eventId:      eventId(`e-${seq}`) as EventId,
    when:         `2026-05-06T10:00:${String(seq).padStart(2, "0")}.000Z`,
    atopWhich:    commitSha("abc1234") as CommitSha,
    throughWhich: { sessionId: sessionId("sess-1") as SessionId, toolName: "test", cwd: "/home/palantirkc" },
    byWhom:       { identity: "monitor" as const },
  };
}

/** Create a subagent_orchestration_audited event (W1.G). */
function makeSpawnEvent(opts: {
  correlationId: string;
  spawnedAgent:  string;
  model?:        string;
  description?:  string;
  promptDigest?: string;
  seq?:          number;
}): EventEnvelope {
  const seq = opts.seq ?? nextSeq();
  return {
    ...makeBase(seq),
    type: "validation_phase_completed",
    payload: {
      phase:       "post_write",
      passed:      true,
      errorClass:  "subagent_orchestration_audited",
      correlationId:  opts.correlationId,
      spawnedAgent:   opts.spawnedAgent,
      model:          opts.model ?? "sonnet",
      description:    opts.description ?? "test spawn",
      promptDigest:   opts.promptDigest ?? "deadbeef",
      spawnTimestamp: `2026-05-06T10:00:${String(seq).padStart(2, "0")}.000Z`,
    } as unknown as EventEnvelope["payload"],
  } as EventEnvelope;
}

/** Create an agent_decision_logged event (W1.E). */
function makeDecisionEvent(opts: {
  correlationId?: string;
  agentName:      string;
  toolName?:      string;
  reasoning?:     string;
  sprintRef?:     string;
  seq?:           number;
}): EventEnvelope {
  const seq = opts.seq ?? nextSeq();
  return {
    ...makeBase(seq),
    type: "validation_phase_completed",
    payload: {
      phase:        "post_write",
      passed:       true,
      errorClass:   "agent_decision_logged",
      correlationId: opts.correlationId ?? null,
      agentName:    opts.agentName,
      toolName:     opts.toolName ?? "mcp__palantir-mini__apply_edit_function",
      inputDigest:  "aabbccdd1234",
      reasoning:    opts.reasoning ?? "implementing the task",
      hypothesis:   null,
      sprintRef:    opts.sprintRef ?? null,
      memoryLayers: ["procedural"],
    } as unknown as EventEnvelope["payload"],
  } as EventEnvelope;
}

/** Create a subagent_stop event. */
function makeStopEvent(opts: { correlationId?: string; seq?: number }): EventEnvelope {
  const seq = opts.seq ?? nextSeq();
  return {
    ...makeBase(seq),
    type: "subagent_stop",
    payload: {
      agentId:       "agent-123",
      exitCode:      0,
      reason:        "completed",
      correlationId: opts.correlationId,
    } as unknown as EventEnvelope["payload"],
  } as EventEnvelope;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("extractDecisionTrail", () => {
  test("pairs_spawn_with_decisions", () => {
    // 1 spawn (correlationId=A), 3 decisions (correlationId=A), 1 stop → 1 group
    const CID = "corr-aaa-111";
    const events: EventEnvelope[] = [
      makeSpawnEvent({ correlationId: CID, spawnedAgent: "implementer" }),
      makeDecisionEvent({ correlationId: CID, agentName: "implementer", reasoning: "edit file 1" }),
      makeDecisionEvent({ correlationId: CID, agentName: "implementer", reasoning: "edit file 2" }),
      makeDecisionEvent({ correlationId: CID, agentName: "implementer", reasoning: "emit event" }),
      makeStopEvent({ correlationId: CID }),
    ];

    const trail = extractDecisionTrail(events, {});

    expect(trail.byCorrelation).toHaveLength(1);
    const grp = trail.byCorrelation[0]!;

    // Spawn is present
    expect(grp.spawn).not.toBeNull();
    expect(grp.spawn!.correlationId).toBe(CID);
    expect(grp.spawn!.spawnedAgent).toBe("implementer");

    // 3 decisions
    expect(grp.decisions).toHaveLength(3);
    expect(grp.decisions[0]!.reasoning).toBe("edit file 1");
    expect(grp.decisions[2]!.reasoning).toBe("emit event");

    // Terminal record present
    expect(grp.terminalEvent).not.toBeNull();
    expect(grp.terminalEvent!.type).toBe("subagent_stop");

    // Duration computable (stop after spawn)
    expect(grp.durationMs).not.toBeNull();

    // Summary
    expect(trail.summary.totalCorrelations).toBe(1);
    expect(trail.summary.totalDecisions).toBe(3);
    expect(trail.summary.totalSpawns).toBe(1);
    expect(trail.summary.perAgent["implementer"]).toEqual({ spawnCount: 1, decisionCount: 3 });
    expect(trail.unattributed).toHaveLength(0);
  });

  test("handles_unattributed", () => {
    // decisions with no correlationId go to unattributed
    const events: EventEnvelope[] = [
      makeDecisionEvent({ agentName: "orphan-agent", reasoning: "no spawn recorded" }),
      makeDecisionEvent({ agentName: "orphan-agent", reasoning: "second orphan" }),
    ];

    const trail = extractDecisionTrail(events, {});

    expect(trail.byCorrelation).toHaveLength(0);
    expect(trail.unattributed).toHaveLength(2);
    expect(trail.unattributed[0]!.reasoning).toBe("no spawn recorded");
    expect(trail.unattributed[1]!.reasoning).toBe("second orphan");

    expect(trail.summary.totalCorrelations).toBe(0);
    expect(trail.summary.totalDecisions).toBe(2);
    expect(trail.summary.totalSpawns).toBe(0);
    // perAgent populated even for unattributed
    expect(trail.summary.perAgent["orphan-agent"]).toBeDefined();
    expect(trail.summary.perAgent["orphan-agent"]!.decisionCount).toBe(2);
  });

  test("multi_correlation_aggregation", () => {
    // 2 spawns (A + B) + 5 decisions (3 for A, 2 for B) + 2 stops
    const CID_A = "corr-aaa-222";
    const CID_B = "corr-bbb-333";

    const events: EventEnvelope[] = [
      makeSpawnEvent({ correlationId: CID_A, spawnedAgent: "implementer-1" }),
      makeSpawnEvent({ correlationId: CID_B, spawnedAgent: "implementer-2" }),
      makeDecisionEvent({ correlationId: CID_A, agentName: "implementer-1" }),
      makeDecisionEvent({ correlationId: CID_A, agentName: "implementer-1" }),
      makeDecisionEvent({ correlationId: CID_A, agentName: "implementer-1" }),
      makeDecisionEvent({ correlationId: CID_B, agentName: "implementer-2" }),
      makeDecisionEvent({ correlationId: CID_B, agentName: "implementer-2" }),
      makeStopEvent({ correlationId: CID_A }),
      makeStopEvent({ correlationId: CID_B }),
    ];

    const trail = extractDecisionTrail(events, {});

    expect(trail.summary.totalCorrelations).toBe(2);
    expect(trail.summary.totalDecisions).toBe(5);
    expect(trail.summary.totalSpawns).toBe(2);

    // Both correlationIds present
    const cids = trail.byCorrelation.map((g) => g.correlationId);
    expect(cids).toContain(CID_A);
    expect(cids).toContain(CID_B);

    // Check decision counts per group
    const grpA = trail.byCorrelation.find((g) => g.correlationId === CID_A)!;
    const grpB = trail.byCorrelation.find((g) => g.correlationId === CID_B)!;
    expect(grpA.decisions).toHaveLength(3);
    expect(grpB.decisions).toHaveLength(2);

    // Both have terminals
    expect(grpA.terminalEvent?.type).toBe("subagent_stop");
    expect(grpB.terminalEvent?.type).toBe("subagent_stop");
  });

  test("filter_by_agent", () => {
    // 2 spawns by different agents; filter agentName=foo → only foo's group returned
    const CID_FOO = "corr-foo-444";
    const CID_BAR = "corr-bar-555";

    const events: EventEnvelope[] = [
      makeSpawnEvent({ correlationId: CID_FOO, spawnedAgent: "foo-agent" }),
      makeSpawnEvent({ correlationId: CID_BAR, spawnedAgent: "bar-agent" }),
      makeDecisionEvent({ correlationId: CID_FOO, agentName: "foo-agent", reasoning: "foo decision" }),
      makeDecisionEvent({ correlationId: CID_FOO, agentName: "foo-agent", reasoning: "foo decision 2" }),
      makeDecisionEvent({ correlationId: CID_BAR, agentName: "bar-agent", reasoning: "bar decision" }),
      makeStopEvent({ correlationId: CID_FOO }),
      makeStopEvent({ correlationId: CID_BAR }),
    ];

    const filter: AuditFilter = { agentName: "foo-agent" };
    const trail = extractDecisionTrail(events, filter);

    // Only foo's correlation returned
    expect(trail.byCorrelation).toHaveLength(1);
    expect(trail.byCorrelation[0]!.correlationId).toBe(CID_FOO);
    expect(trail.byCorrelation[0]!.spawn!.spawnedAgent).toBe("foo-agent");
    expect(trail.byCorrelation[0]!.decisions).toHaveLength(2);

    // bar is absent
    const cids = trail.byCorrelation.map((g) => g.correlationId);
    expect(cids).not.toContain(CID_BAR);
  });
});
