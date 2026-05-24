// palantir-mini v4.1.0 — memory-layer-validator hook tests (rule 26 §Axis E)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import memoryLayerValidator, {
  AUTO_TAG_HEURISTICS,
  suggestLayers,
} from "../../hooks/memory-layer-validator";

const EMIT_EVENT_TOOL = "mcp__plugin_palantir-mini_palantir-mini__emit_event";
let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-memory-layer-validator-"));
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

describe("suggestLayers", () => {
  test("returns heuristic for known event type", () => {
    expect(suggestLayers("agent_start")).toEqual(["procedural", "episodic"]);
    expect(suggestLayers("learning_captured")).toEqual(["episodic", "semantic"]);
    expect(suggestLayers("commit_edits" /* nonexistent */)).toEqual([]);
  });

  test("AUTO_TAG_HEURISTICS covers core lifecycle events", () => {
    expect(AUTO_TAG_HEURISTICS["session_started"]).toBeDefined();
    expect(AUTO_TAG_HEURISTICS["edit_committed"]).toBeDefined();
    expect(AUTO_TAG_HEURISTICS["validation_phase_completed"]).toBeDefined();
    expect(AUTO_TAG_HEURISTICS["sprint_completed"]).toBeDefined();
  });
});

describe("memoryLayerValidator", () => {
  test("skips non-emit_event tool", async () => {
    const result = await memoryLayerValidator({
      tool_name: "Bash",
      cwd: TMP,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });

  test("skips when grade is T1 (only T2+ enforced)", async () => {
    const result = await memoryLayerValidator({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "phase_completed",
          eventId: "evt-1",
          valueGrade: "T1",
          payload: {},
        },
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("only T2+ enforced");
  });

  test("ALLOWS T2 envelope with memoryLayers present", async () => {
    const result = await memoryLayerValidator({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "edit_committed",
          eventId: "evt-1",
          valueGrade: "T2",
          withWhat: { memoryLayers: ["semantic", "procedural"] },
          payload: {},
        },
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("OK");
  });

  test("ADVISORY for T2+ envelope MISSING memoryLayers + suggests auto-tag", async () => {
    const result = await memoryLayerValidator({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "agent_start",
          eventId: "evt-1",
          valueGrade: "T2",
          payload: {},
        },
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("advisory");
    expect(result.additionalContext).toContain("Suggested auto-tag");
    expect(result.additionalContext).toContain("procedural");
    expect(result.additionalContext).toContain("episodic");
  });

  test("ADVISORY for unknown event type suggests manual declaration", async () => {
    const result = await memoryLayerValidator({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "novel_event_unknown_to_heuristics",
          eventId: "evt-1",
          valueGrade: "T3",
          payload: {},
        },
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.additionalContext).toContain("declare manually");
    expect(result.additionalContext).toContain("working, episodic, semantic, procedural");
  });

  test("ALLOWS T3 envelope with memoryLayers present", async () => {
    const result = await memoryLayerValidator({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type: "learning_captured",
          eventId: "evt-1",
          valueGrade: "T3",
          withWhat: { memoryLayers: ["episodic", "semantic"] },
          payload: {},
        },
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("OK");
  });

  test("handles null payload gracefully", async () => {
    const result = await memoryLayerValidator(null);
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });

  test("handles missing envelope", async () => {
    const result = await memoryLayerValidator({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("no envelope");
  });
});
