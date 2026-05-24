// palantir-mini — pm-recap §MCP-First Compliance tests (sprint-061 B.W5)
//
// Verifies:
//   1. Native mode: lead_mcp_first_compliance passed/bypassed events produce correct ratio.
//   2. Heuristic fallback: tool_invocation_completed events produce heuristic ratio.
//   3. Zero events: ratio = 0, mode = "heuristic" (no native events), no crash.
//   4. Mixed native + heuristic: native mode wins when native events present.
//   5. pm-recap handler produces mcpFirstCompliance.section containing ratio.
//   6. pm-recap handler skipMcpFirst=true omits mcpFirstCompliance field.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  computeMcpFirstCompliance,
  filterToSprint,
  filterToLastNDays,
  renderMcpFirstComplianceSection,
} from "../../../lib/recap/mcp-first-compliance";
import pmRecap from "../../../bridge/handlers/pm-recap";
import type { EventEnvelope } from "../../../lib/event-log/types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-recap-mcp-first-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  return dir;
}

type FakeEventInput = {
  type: string;
  payload?: Record<string, unknown>;
  when?: string;
  toolName?: string;
  valueGrade?: string;
};

function makeEvent(
  input: FakeEventInput,
  seq: number,
): Record<string, unknown> {
  return {
    type: input.type,
    eventId: `evt-${seq}`,
    sequence: seq,
    when: input.when ?? new Date().toISOString(),
    atopWhich: "deadbeef",
    throughWhich: {
      sessionId: "test-sess",
      toolName: input.toolName ?? "test",
      cwd: "/tmp",
    },
    byWhom: { identity: "claude-code", agentName: "test-agent" },
    withWhat: { reasoning: "test fixture" },
    payload: input.payload ?? {},
    ...(input.valueGrade ? { valueGrade: input.valueGrade } : {}),
  };
}

function writeEventsFile(project: string, events: FakeEventInput[]): void {
  const lines = events.map((e, i) => JSON.stringify(makeEvent(e, i + 1)));
  fs.writeFileSync(
    path.join(project, ".palantir-mini", "session", "events.jsonl"),
    lines.join("\n") + "\n",
  );
}

// ─── Helpers for synthetic EventEnvelope arrays ───────────────────────────

function nativePassedEvent(seq: number): EventEnvelope {
  return makeEvent(
    {
      type: "phase_completed",
      payload: { phaseTag: "lead_mcp_first_compliance_passed", taskId: "t1", validations: [] },
    },
    seq,
  ) as unknown as EventEnvelope;
}

function nativeBypassedEvent(seq: number): EventEnvelope {
  return makeEvent(
    {
      type: "phase_completed",
      payload: { phaseTag: "lead_mcp_first_compliance_bypassed", taskId: "t1", validations: [] },
    },
    seq,
  ) as unknown as EventEnvelope;
}

function heuristicMcpEvent(seq: number): EventEnvelope {
  return makeEvent(
    {
      type: "tool_invocation_completed",
      payload: {
        toolName: "mcp__plugin_palantir-mini_palantir-mini__impact_query",
        durationMs: 120,
        success: true,
      },
    },
    seq,
  ) as unknown as EventEnvelope;
}

function heuristicEditEvent(seq: number): EventEnvelope {
  return makeEvent(
    {
      type: "tool_invocation_completed",
      payload: { toolName: "Edit", durationMs: 80, success: true },
    },
    seq,
  ) as unknown as EventEnvelope;
}

function sprintBoundEvent(sprintNumber: number, seq: number): EventEnvelope {
  return makeEvent(
    {
      type: "sprint_contract_bound",
      payload: {
        project: "/tmp",
        sprintNumber,
        contractPath: null,
        roundCount: 1,
        role: "generator",
      },
    },
    seq,
  ) as unknown as EventEnvelope;
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

// ─── computeMcpFirstCompliance tests ────────────────────────────────────────

describe("computeMcpFirstCompliance — native mode", () => {
  test("3 passed + 1 bypassed → ratio 0.75 in native mode", () => {
    const events: EventEnvelope[] = [
      nativePassedEvent(1),
      nativePassedEvent(2),
      nativePassedEvent(3),
      nativeBypassedEvent(4),
    ];
    const result = computeMcpFirstCompliance(events);
    expect(result.mode).toBe("native");
    expect(result.totalPassed).toBe(3);
    expect(result.totalBypassed).toBe(1);
    expect(result.ratio).toBeCloseTo(0.75);
    expect(result.estimatedTokensSaved).toBe(3 * 25_000);
  });

  test("0 passed + 2 bypassed → ratio 0 in native mode", () => {
    const events: EventEnvelope[] = [
      nativeBypassedEvent(1),
      nativeBypassedEvent(2),
    ];
    const result = computeMcpFirstCompliance(events);
    expect(result.mode).toBe("native");
    expect(result.totalPassed).toBe(0);
    expect(result.totalBypassed).toBe(2);
    expect(result.ratio).toBe(0);
  });

  test("only passed events → ratio 1.0", () => {
    const events: EventEnvelope[] = [
      nativePassedEvent(1),
      nativePassedEvent(2),
    ];
    const result = computeMcpFirstCompliance(events);
    expect(result.ratio).toBe(1.0);
  });
});

describe("computeMcpFirstCompliance — heuristic fallback", () => {
  test("no native events → mode heuristic", () => {
    const events: EventEnvelope[] = [
      heuristicMcpEvent(1),
      heuristicEditEvent(2),
      heuristicEditEvent(3),
    ];
    const result = computeMcpFirstCompliance(events);
    expect(result.mode).toBe("heuristic");
    expect(result.totalPassed).toBe(1);
    expect(result.totalBypassed).toBe(2);
    expect(result.ratio).toBeCloseTo(1 / 3);
  });

  test("empty events → ratio 0, mode heuristic, no crash", () => {
    const result = computeMcpFirstCompliance([]);
    expect(result.mode).toBe("heuristic");
    expect(result.ratio).toBe(0);
    expect(result.totalPassed).toBe(0);
    expect(result.totalBypassed).toBe(0);
    expect(result.estimatedTokensSaved).toBe(0);
    expect(result.topRids).toEqual([]);
  });

  test("non-matching tool events → ratio 0, mode heuristic", () => {
    const events: EventEnvelope[] = [
      makeEvent({ type: "session_started", payload: { model: "opus", effort: "high" } }, 1) as unknown as EventEnvelope,
      makeEvent({ type: "phase_completed", payload: { phaseTag: "other", taskId: "t1", validations: [] } }, 2) as unknown as EventEnvelope,
    ];
    const result = computeMcpFirstCompliance(events);
    expect(result.mode).toBe("heuristic");
    expect(result.ratio).toBe(0);
  });
});

describe("computeMcpFirstCompliance — native wins over heuristic", () => {
  test("mixed: native events present → native mode, heuristic events not counted", () => {
    const events: EventEnvelope[] = [
      nativePassedEvent(1),     // native event → counted
      heuristicMcpEvent(2),    // heuristic MCP → NOT counted in native mode
      heuristicEditEvent(3),   // heuristic edit → NOT counted in native mode
      nativeBypassedEvent(4),  // native event → counted
    ];
    const result = computeMcpFirstCompliance(events);
    expect(result.mode).toBe("native");
    expect(result.totalPassed).toBe(1);    // only nativePassedEvent(1)
    expect(result.totalBypassed).toBe(1);  // only nativeBypassedEvent(4)
    expect(result.ratio).toBeCloseTo(0.5);
  });
});

describe("computeMcpFirstCompliance — N/(N+M) formula", () => {
  test("7 passed + 3 bypassed → ratio exactly 0.7", () => {
    const events: EventEnvelope[] = [
      ...Array.from({ length: 7 }, (_, i) => nativePassedEvent(i + 1)),
      ...Array.from({ length: 3 }, (_, i) => nativeBypassedEvent(i + 8)),
    ];
    const result = computeMcpFirstCompliance(events);
    expect(result.ratio).toBeCloseTo(7 / 10);
  });
});

describe("filterToSprint", () => {
  test("returns events between sprint_contract_bound for given sprint", () => {
    const events: EventEnvelope[] = [
      sprintBoundEvent(59, 1),
      nativePassedEvent(2),
      nativePassedEvent(3),
      sprintBoundEvent(60, 4),
      nativeBypassedEvent(5),
      sprintBoundEvent(61, 6),
    ];
    const sprint60Events = filterToSprint(events, 60);
    expect(sprint60Events).toHaveLength(2); // bound event + bypassed event
    expect(sprint60Events.some((e) => e.type === "sprint_contract_bound")).toBe(true);
    expect(sprint60Events.some((e) => e.type === "phase_completed")).toBe(true);
  });

  test("returns empty array for unknown sprint number", () => {
    const events: EventEnvelope[] = [
      sprintBoundEvent(59, 1),
      nativePassedEvent(2),
    ];
    const result = filterToSprint(events, 999);
    expect(result).toHaveLength(0);
  });
});

describe("renderMcpFirstComplianceSection", () => {
  test("renders ratio, tokens-saved, and target fields", () => {
    const result = computeMcpFirstCompliance([
      nativePassedEvent(1),
      nativePassedEvent(2),
      nativeBypassedEvent(3),
    ]);
    const section = renderMcpFirstComplianceSection(result);
    expect(section).toContain("§MCP-First Compliance");
    expect(section).toContain("66.7%");
    expect(section).toContain("50K");
    expect(section).toContain("≥80% per rule 12 v3.10.0");
  });

  test("heuristic mode includes qualifier in output", () => {
    const result = computeMcpFirstCompliance([heuristicMcpEvent(1)]);
    const section = renderMcpFirstComplianceSection(result);
    expect(section).toContain("heuristic");
  });
});

// ─── pm-recap handler integration tests ─────────────────────────────────────

describe("pmRecap §MCP-First Compliance", () => {
  test("handler returns mcpFirstCompliance with correct ratio from N passed + M bypassed", async () => {
    const project = makeTmpProject();
    // N=4 passed, M=1 bypassed → ratio = 4/5 = 0.8
    writeEventsFile(project, [
      { type: "phase_completed", payload: { phaseTag: "lead_mcp_first_compliance_passed", taskId: "t", validations: [] } },
      { type: "phase_completed", payload: { phaseTag: "lead_mcp_first_compliance_passed", taskId: "t", validations: [] } },
      { type: "phase_completed", payload: { phaseTag: "lead_mcp_first_compliance_passed", taskId: "t", validations: [] } },
      { type: "phase_completed", payload: { phaseTag: "lead_mcp_first_compliance_passed", taskId: "t", validations: [] } },
      { type: "phase_completed", payload: { phaseTag: "lead_mcp_first_compliance_bypassed", taskId: "t", validations: [] } },
    ]);
    const result = await pmRecap({ project, scope: "all" });
    expect(result.mcpFirstCompliance).toBeDefined();
    expect(result.mcpFirstCompliance?.passed).toBe(4);
    expect(result.mcpFirstCompliance?.bypassed).toBe(1);
    expect(result.mcpFirstCompliance?.ratio).toBeCloseTo(0.8);
    expect(result.mcpFirstCompliance?.mode).toBe("native");
    expect(result.mcpFirstCompliance?.section).toContain("80.0%");
    expect(result.mcpFirstCompliance?.section).toContain("§MCP-First Compliance");
  });

  test("handler skipMcpFirst=true omits mcpFirstCompliance field", async () => {
    const project = makeTmpProject();
    writeEventsFile(project, [
      { type: "session_started", payload: { model: "opus", effort: "high" } },
    ]);
    const result = await pmRecap({ project, scope: "all", skipMcpFirst: true });
    expect(result.mcpFirstCompliance).toBeUndefined();
  });

  test("handler returns heuristic mode when no native events", async () => {
    const project = makeTmpProject();
    writeEventsFile(project, [
      {
        type: "tool_invocation_completed",
        payload: {
          toolName: "mcp__plugin_palantir-mini_palantir-mini__impact_query",
          durationMs: 100,
          success: true,
        },
      },
      {
        type: "tool_invocation_completed",
        payload: { toolName: "Edit", durationMs: 50, success: true },
      },
    ]);
    const result = await pmRecap({ project, scope: "all" });
    expect(result.mcpFirstCompliance?.mode).toBe("heuristic");
    expect(result.mcpFirstCompliance?.section).toContain("heuristic");
  });

  test("handler empty events.jsonl → ratio 0, no crash", async () => {
    const project = makeTmpProject();
    // No events file — readEvents returns []
    const result = await pmRecap({ project, scope: "all" });
    expect(result.mcpFirstCompliance?.ratio).toBe(0);
    expect(result.substrateHealth.totalEvents).toBe(0);
  });

  test("sprint summary populated from sprint_contract_bound events", async () => {
    const project = makeTmpProject();
    writeEventsFile(project, [
      {
        type: "sprint_contract_bound",
        payload: { project, sprintNumber: 61, contractPath: null, roundCount: 1, role: "generator" },
      },
    ]);
    const result = await pmRecap({ project, scope: "all" });
    expect(result.sprintSummary).toHaveLength(1);
    expect(result.sprintSummary[0]?.sprintNumber).toBe(61);
    expect(result.sprintSummary[0]?.bound).toBe(true);
  });
});
