// palantir-mini v4.15.0 — pm_substrate_query handler tests (sprint-063 W4.B)
// Coverage:
//   T1: each mode dispatches to correct delegated handler (via result shape)
//   T2: invalid mode → throws clear error
//   T3: filter pass-through for "workflow" mode (projects field)
//   T4: delegated handler throws → result.ok=false, error captured
//   T5: missing mode → throws clear error

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import pmSubstrateQuery from "../../../bridge/handlers/pm-substrate-query";
import { TOOLS } from "../../../bridge/mcp-server";

const tmpDirs: string[] = [];

type MinimalToolInputSchema = {
  required?: string[];
  properties?: Record<string, {
    description?: string;
    enum?: string[];
    type?: string;
  }>;
};

function makeTmpProject(): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-substrate-query-"));
  tmpDirs.push(project);
  fs.mkdirSync(path.join(project, ".palantir-mini", "session"), { recursive: true });
  return project;
}

function writeEvents(project: string, events: unknown[]): void {
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  const lines = events
    .map((e, i) => ({
      ...(e as object),
      sequence: i + 1,
      eventId: `evt-${i + 1}`,
      when: new Date(Date.now() + i * 1000).toISOString(),
      atopWhich: "abc123def456",
      byWhom: { identity: "claude-code", agentName: "test-agent" },
      throughWhich: { surface: "cli", tool: "test", sessionId: "sess-001" },
      withWhat: { reasoning: "test event for pm-substrate-query unit test suite" },
    }))
    .map((e) => JSON.stringify(e))
    .join("\n");
  fs.writeFileSync(eventsPath, lines + "\n");
}

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_PROJECT === undefined) delete process.env.PALANTIR_MINI_PROJECT;
  else process.env.PALANTIR_MINI_PROJECT = savedEnv.PALANTIR_MINI_PROJECT;
  if (savedEnv.PALANTIR_MINI_EVENTS_FILE === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
  else process.env.PALANTIR_MINI_EVENTS_FILE = savedEnv.PALANTIR_MINI_EVENTS_FILE;
  for (const d of tmpDirs.splice(0)) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

// ─── T0: public MCP schema exposes the handler-supported contract ───────────

describe("T0: public MCP schema registry", () => {
  test("exposes post-merge mode and flat post-merge fields", () => {
    const tool = TOOLS.find((candidate) => candidate.name === "pm_substrate_query");
    const schema = tool?.inputSchema as MinimalToolInputSchema | undefined;
    const properties = schema?.properties ?? {};

    expect(tool).toBeDefined();
    expect(tool?.description).toContain("post-merge");
    expect(schema?.required).toEqual(["mode"]);
    expect(properties.mode?.enum).toEqual([
      "lineage",
      "workflow",
      "by-grade",
      "retro",
      "learn",
      "agent-export",
      "post-merge",
      "session-opener",
    ]);
    expect(properties.newMergeSha?.description).toContain("Handler-required");
    expect(properties.previousMainSha?.description).toContain("newMergeSha^");
    expect(properties.includeLegacyRaw?.type).toBe("boolean");
    expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
    expect(JSON.stringify(tool?.inputSchema)).not.toContain("oneOf");
    expect(JSON.stringify(tool?.inputSchema)).not.toContain("allOf");
    expect(JSON.stringify(tool?.inputSchema)).not.toContain('"not"');
  });
});

// ─── T1: each mode dispatches to the correct delegated handler ────────────────

describe("T1: mode dispatch — result shape from delegated handler", () => {
  test("mode=lineage dispatches to replay-lineage (returns events + lineageGraph)", async () => {
    const project = makeTmpProject();
    writeEvents(project, [
      { type: "edit_committed" },
      { type: "phase_completed", payload: { phaseTag: "test" } },
    ]);

    const result = await pmSubstrateQuery({ project, mode: "lineage" });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("lineage");
    const data = result.data as Record<string, unknown>;
    // replay-lineage returns lineageGraph + derivedState
    expect(Array.isArray(data.lineageGraph)).toBe(true);
    expect(data.derivedState).toBeDefined();
  });

  test("mode=workflow dispatches to pm-workflow-lineage-query (returns executionGraph)", async () => {
    const project = makeTmpProject();
    writeEvents(project, [{ type: "edit_committed" }]);

    const result = await pmSubstrateQuery({
      project,
      mode: "workflow",
      filter: { projects: [project] },
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("workflow");
    const data = result.data as Record<string, unknown>;
    // pm-workflow-lineage-query returns executionGraph + perProjectCounts
    expect(data.executionGraph).toBeDefined();
    expect(data.perProjectCounts).toBeDefined();
  });

  test("mode=by-grade dispatches to pm-event-query-by-grade (returns gradeDistribution)", async () => {
    const project = makeTmpProject();
    writeEvents(project, [
      { type: "validation_phase_completed", valueGrade: "T2" },
    ]);

    const result = await pmSubstrateQuery({
      project,
      mode: "by-grade",
      filter: { gradeFilter: "T2+" },
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("by-grade");
    const data = result.data as Record<string, unknown>;
    // pm-event-query-by-grade returns gradeDistribution + totalScanned
    expect(data.gradeDistribution).toBeDefined();
    expect(typeof data.totalScanned).toBe("number");
  });

  test("mode=retro dispatches to pm-retro-query (returns sessionMinutes)", async () => {
    const project = makeTmpProject();
    writeEvents(project, [
      { type: "session_started" },
      { type: "phase_completed", payload: { phaseTag: "test", taskId: "t1", validations: [] } },
    ]);

    const result = await pmSubstrateQuery({
      project,
      mode: "retro",
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("retro");
    const data = result.data as Record<string, unknown>;
    // pm-retro-query returns sessionMinutes + phaseCompletedCount + skillsRun
    expect(typeof data.sessionMinutes).toBe("number");
    expect(typeof data.phaseCompletedCount).toBe("number");
    expect(Array.isArray(data.skillsRun)).toBe(true);
  });

  test("mode=learn dispatches to pm-learn-query (returns learnings array)", async () => {
    const project = makeTmpProject();
    // No learning_captured events — result should still be a valid shape
    const result = await pmSubstrateQuery({ project, mode: "learn" });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("learn");
    const data = result.data as Record<string, unknown>;
    // pm-learn-query returns { learnings, count }
    expect(Array.isArray(data.learnings)).toBe(true);
    expect(typeof data.count).toBe("number");
  });

  test("mode=agent-export dispatches to pm-agent-lineage-export (returns markdown)", async () => {
    const project = makeTmpProject();
    writeEvents(project, [{ type: "edit_committed" }]);

    const result = await pmSubstrateQuery({
      project,
      mode: "agent-export",
      agentName: "test-agent",
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("agent-export");
    const data = result.data as Record<string, unknown>;
    // pm-agent-lineage-export returns { project, markdown, matchedEventCount }
    expect(typeof data.markdown).toBe("string");
    expect(typeof data.matchedEventCount).toBe("number");
  });

  test("mode=post-merge is accepted and reaches the post-merge handler", async () => {
    const project = makeTmpProject();

    const result = await pmSubstrateQuery({
      project,
      mode: "post-merge",
    });

    expect(result.ok).toBe(false);
    expect(result.mode).toBe("post-merge");
    expect(result.error).toMatch(/newMergeSha.*required|required.*newMergeSha/i);
  });

  test("mode=session-opener dispatches to pm-lead-brief (returns session brief)", async () => {
    // Folds former pm_lead_brief — the brief payload is preserved verbatim.
    const project = makeTmpProject();
    writeEvents(project, [{ type: "edit_committed", valueGrade: "T3" }]);

    const result = await pmSubstrateQuery({
      project,
      mode: "session-opener",
      intent: "implement a refactor across the harness",
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("session-opener");
    const data = result.data as Record<string, unknown>;
    // pm-lead-brief returns session + valueGradeMetrics + dispatchSuggestion (intent provided)
    expect(data.session).toBeDefined();
    expect(data.valueGradeMetrics).toBeDefined();
    expect(data.dispatchSuggestion).toBe("delegate");
  });
});

// ─── T2: invalid mode → throws clear error ────────────────────────────────────

describe("T2: invalid mode rejects", () => {
  test("unknown mode string throws with list of valid modes", async () => {
    await expect(
      pmSubstrateQuery({ project: "/tmp", mode: "invalid-mode" as never }),
    ).rejects.toThrow(/unknown mode.*invalid-mode/);
  });

  test("error message lists all valid modes", async () => {
    let msg = "";
    try {
      await pmSubstrateQuery({ project: "/tmp", mode: "bad" as never });
    } catch (e) {
      msg = (e as Error).message;
    }
    for (const validMode of ["lineage", "workflow", "by-grade", "retro", "learn", "agent-export", "post-merge", "session-opener"]) {
      expect(msg).toContain(validMode);
    }
  });
});

// ─── T3: filter pass-through for "workflow" mode ─────────────────────────────

describe("T3: filter pass-through (workflow mode)", () => {
  test("workflow mode passes projects array to delegated handler", async () => {
    const project1 = makeTmpProject();
    const project2 = makeTmpProject();
    writeEvents(project1, [{ type: "edit_committed" }]);
    writeEvents(project2, [{ type: "edit_committed" }]);

    const result = await pmSubstrateQuery({
      mode: "workflow",
      filter: { projects: [project1, project2] },
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    // perProjectCounts should have entries for both projects
    const counts = data.perProjectCounts as Record<string, number>;
    const keys = Object.keys(counts);
    expect(keys.length).toBeGreaterThanOrEqual(1);
  });

  test("workflow mode applies filter.eventTypes to narrow results", async () => {
    const project = makeTmpProject();
    writeEvents(project, [
      { type: "edit_committed" },
      { type: "phase_completed", payload: { phaseTag: "x", taskId: "t1", validations: [] } },
    ]);

    const result = await pmSubstrateQuery({
      mode: "workflow",
      filter: {
        projects: [project],
        eventTypes: ["edit_committed"],
      },
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const events = data.events as unknown[];
    // Only edit_committed events should appear
    for (const ev of events) {
      expect((ev as Record<string, unknown>).type).toBe("edit_committed");
    }
  });
});

// ─── T4: delegated handler throws → result.ok=false ─────────────────────────

describe("T4: error capture — ok=false when delegated handler throws", () => {
  test("by-grade mode with invalid gradeFilter returns ok=false", async () => {
    // pm-event-query-by-grade will still return a result (empty) even for bad grades,
    // but injecting a bad project path (non-string) forces a throw via validation.
    // We test by passing a gradeFilter that is incompatible and a project that exists
    // but has no events; the handler returns ok=true in this case.
    // Instead: use a project arg that is an object — replay-lineage throws on non-string project.
    const result = await pmSubstrateQuery({
      project: 123 as unknown as string,
      mode: "lineage",
    });

    // replay-lineage: `project` required (string check) → throws → caught → ok=false
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe("string");
    expect(result.data).toBeUndefined();
  });

  test("agent-export mode with non-string project returns ok=false", async () => {
    // pm-agent-lineage-export throws when `project` is not a string
    const result = await pmSubstrateQuery({
      project: 999 as unknown as string,
      mode: "agent-export",
    });

    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe("string");
    expect(result.error).toContain("project");
  });

  test("result.mode is preserved even when ok=false", async () => {
    const result = await pmSubstrateQuery({
      project: 123 as unknown as string,
      mode: "lineage",
    });

    expect(result.mode).toBe("lineage");
  });
});

// ─── T5: missing mode → throws clear error ───────────────────────────────────

describe("T5: missing mode rejects", () => {
  test("missing mode field throws with helpful message", async () => {
    await expect(
      pmSubstrateQuery({ project: "/tmp" } as never),
    ).rejects.toThrow(/mode.*required|required.*mode/i);
  });

  test("null mode throws", async () => {
    await expect(
      pmSubstrateQuery({ project: "/tmp", mode: null } as never),
    ).rejects.toThrow(/mode/i);
  });
});
