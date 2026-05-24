// palantir-mini v4.11.0 — t3-circuit-feeder hook tests (rule 26 §Substrate routing T3)
// Sprint-059 W1.2 — T-W1.2

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import t3CircuitFeeder, { sanitizeKind } from "../../hooks/t3-circuit-feeder";

const EMIT_EVENT_TOOL = "mcp__plugin_palantir-mini_palantir-mini__emit_event";
let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-t3-circuit-feeder-"));
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

function decisionsDir(): string {
  return path.join(TMP, ".palantir-mini", "session", "decisions");
}

function readDecisionFile(kind: string, eventId: string): Record<string, unknown> {
  const filePath = path.join(decisionsDir(), sanitizeKind(kind), `${eventId}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function decisionFileExists(kind: string, eventId: string): boolean {
  return fs.existsSync(
    path.join(decisionsDir(), sanitizeKind(kind), `${eventId}.json`),
  );
}

// ─── sanitizeKind ──────────────────────────────────────────────────────────

describe("sanitizeKind", () => {
  test("kebab-case kind passes through unchanged", () => {
    expect(sanitizeKind("primitive-field-add")).toBe("primitive-field-add");
    expect(sanitizeKind("rule-conformance-policy")).toBe("rule-conformance-policy");
    expect(sanitizeKind("other")).toBe("other");
  });

  test("uppercased kind is lowercased", () => {
    expect(sanitizeKind("Primitive-Field-Add")).toBe("primitive-field-add");
  });

  test("spaces and underscores replaced with hyphens", () => {
    expect(sanitizeKind("event_type_add")).toBe("event-type-add");
    expect(sanitizeKind("failure category add")).toBe("failure-category-add");
  });

  test("multiple consecutive hyphens collapsed", () => {
    expect(sanitizeKind("a--b---c")).toBe("a-b-c");
  });

  test("leading/trailing hyphens stripped", () => {
    expect(sanitizeKind("-primitive-")).toBe("primitive");
  });

  test("empty string or all-special-chars falls back to 'other'", () => {
    expect(sanitizeKind("")).toBe("other");
    expect(sanitizeKind("---")).toBe("other");
  });
});

// ─── t3CircuitFeeder ───────────────────────────────────────────────────────

describe("t3CircuitFeeder", () => {
  // Case 1: T3 + well-formed refinementTarget → routes decision file
  test("T3 + well-formed refinementTarget routes file to decisions/<kind>/<eventId>.json", async () => {
    const result = await t3CircuitFeeder({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type:       "validation_phase_completed",
          eventId:    "evt-t3-001",
          when:       "2026-05-08T00:00:00.000Z",
          valueGrade: "T3",
          payload:    { phase: "design", passed: false, errorClass: "criterion_threshold_too_low" },
          withWhat: {
            reasoning: "Grading rubric threshold of 0.6 too low for production safety.",
            memoryLayers: ["procedural", "semantic"],
            refinementTarget: {
              kind:            "grading-criterion-threshold",
              filePathOrRid:   "rule 16 §GradingRubric",
              description:     "Raise passFailLogic.threshold from 0.6 to 0.75 for critical criteria.",
              confidenceLevel: "high",
            },
          },
        },
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("routed");
    expect(result.message).toContain("evt-t3-001");
    expect(result.message).toContain("grading-criterion-threshold");

    // File written at correct path
    expect(decisionFileExists("grading-criterion-threshold", "evt-t3-001")).toBe(true);

    const content = readDecisionFile("grading-criterion-threshold", "evt-t3-001");
    expect(content.eventId).toBe("evt-t3-001");
    expect(content.valueGrade).toBe("T3");
    expect(content.type).toBe("validation_phase_completed");
    expect((content.refinementTarget as Record<string, unknown>).kind).toBe("grading-criterion-threshold");
    expect(content._routedBy).toBe("t3-circuit-feeder");
    expect(content._routedAt).toBeDefined();
  });

  // Case 2: T3 WITHOUT well-formed refinementTarget → skipped (no file written)
  test("T3 envelope without refinementTarget is skipped (no file written)", async () => {
    const result = await t3CircuitFeeder({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type:       "validation_phase_completed",
          eventId:    "evt-t3-002",
          when:       "2026-05-08T00:00:00.000Z",
          valueGrade: "T3",
          payload:    { phase: "design", passed: false },
          withWhat: {
            reasoning: "Something failed, but no typed refinementTarget provided.",
            memoryLayers: ["procedural"],
          },
        },
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("refinementTarget missing or malformed");

    // No file should be written
    expect(fs.existsSync(decisionsDir())).toBe(false);
  });

  // Case 3a: T1 envelope → skipped
  test("T1 envelope is skipped (only T3 routed)", async () => {
    const result = await t3CircuitFeeder({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type:       "session_started",
          eventId:    "evt-t1-001",
          when:       "2026-05-08T00:00:00.000Z",
          valueGrade: "T1",
          payload:    { model: "sonnet", effort: "max" },
          withWhat: {
            reasoning:    "Session started.",
            memoryLayers: ["working", "episodic"],
          },
        },
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("T1");
    expect(fs.existsSync(decisionsDir())).toBe(false);
  });

  // Case 3b: T2 envelope → skipped
  test("T2 envelope is skipped (only T3 routed)", async () => {
    const result = await t3CircuitFeeder({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type:       "edit_proposed",
          eventId:    "evt-t2-001",
          when:       "2026-05-08T00:00:00.000Z",
          valueGrade: "T2",
          payload:    { functionName: "applyHook" },
          withWhat: {
            reasoning:    "Proposing edit.",
            memoryLayers: ["semantic", "procedural"],
          },
        },
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("T2");
    expect(fs.existsSync(decisionsDir())).toBe(false);
  });

  // Case 4: Idempotent re-emit — same eventId written twice = no-op on second call
  test("idempotent: second call with same eventId is a no-op (file not overwritten)", async () => {
    const callPayload = {
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type:       "validation_phase_completed",
          eventId:    "evt-t3-idem",
          when:       "2026-05-08T00:00:00.000Z",
          valueGrade: "T3",
          payload:    { phase: "design", passed: false, errorClass: "field_missing" },
          withWhat: {
            reasoning: "A primitive field is missing.",
            memoryLayers: ["semantic"],
            refinementTarget: {
              kind:            "primitive-field-add",
              filePathOrRid:   "/home/palantirkc/.claude/schemas/ontology/primitives/grading-criterion.ts",
              description:     "Add optional `metadata` field to GradingCriterion.",
              confidenceLevel: "medium",
            },
          },
        },
      },
    };

    // First call — should write the file
    const first = await t3CircuitFeeder(callPayload);
    expect(first.message).toContain("routed");
    expect(decisionFileExists("primitive-field-add", "evt-t3-idem")).toBe(true);

    // Read mtime of first write
    const firstStat = fs.statSync(
      path.join(decisionsDir(), "primitive-field-add", "evt-t3-idem.json"),
    );

    // Small delay to ensure mtime would differ if file were re-written
    await new Promise((r) => setTimeout(r, 50));

    // Second call — should be no-op
    const second = await t3CircuitFeeder(callPayload);
    expect(second.message).toContain("no-op");
    expect(second.message).toContain("evt-t3-idem");

    // File mtime unchanged (no overwrite)
    const secondStat = fs.statSync(
      path.join(decisionsDir(), "primitive-field-add", "evt-t3-idem.json"),
    );
    expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs);
  });

  // Non-emit_event tool → skipped
  test("non-emit_event tool is skipped immediately", async () => {
    const result = await t3CircuitFeeder({
      tool_name: "Bash",
      cwd: TMP,
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("tool=Bash");
    expect(fs.existsSync(decisionsDir())).toBe(false);
  });

  // Missing envelope → skipped
  test("missing envelope is skipped gracefully", async () => {
    const result = await t3CircuitFeeder({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("no envelope");
  });

  // null/undefined payload → skipped gracefully
  test("null payload is handled gracefully", async () => {
    const result = await t3CircuitFeeder(null);
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });

  // T4 envelope → skipped (only T3 is the BackProp entry point; T4 goes to shared-core)
  test("T4 envelope is skipped (only T3 is the BackProp decisions entry; T4 routed to shared-core separately)", async () => {
    const result = await t3CircuitFeeder({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type:       "validation_phase_completed",
          eventId:    "evt-t4-001",
          when:       "2026-05-08T00:00:00.000Z",
          valueGrade: "T4",
          payload:    { phase: "design", passed: false },
          withWhat: {
            reasoning: "K-LLM consensus T4.",
            memoryLayers: ["semantic", "procedural"],
            refinementTarget: {
              kind:            "rule-conformance-policy",
              filePathOrRid:   "rule 26 §R5",
              description:     "Policy tightening.",
              confidenceLevel: "high",
            },
          },
        },
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("T4");
    expect(fs.existsSync(decisionsDir())).toBe(false);
  });

  // refinementTarget with invalid kind → isRefinementTarget returns false → skipped
  test("T3 envelope with invalid refinementTarget kind is skipped", async () => {
    const result = await t3CircuitFeeder({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type:       "validation_phase_completed",
          eventId:    "evt-t3-badkind",
          when:       "2026-05-08T00:00:00.000Z",
          valueGrade: "T3",
          payload:    { phase: "design", passed: false },
          withWhat: {
            reasoning: "Bad kind.",
            memoryLayers: ["procedural"],
            refinementTarget: {
              kind:            "not-a-valid-kind",  // invalid
              filePathOrRid:   "rule 26",
              description:     "Some description.",
              confidenceLevel: "high",
            },
          },
        },
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
    expect(fs.existsSync(decisionsDir())).toBe(false);
  });

  // Correct nested directory structure created
  test("creates correct nested directory decisions/<kind>/ on first write", async () => {
    const result = await t3CircuitFeeder({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: {
        project: TMP,
        envelope: {
          type:       "validation_phase_completed",
          eventId:    "evt-t3-dir-check",
          when:       "2026-05-08T00:00:00.000Z",
          valueGrade: "T3",
          payload:    { phase: "design", passed: false, errorClass: "enum_gap" },
          withWhat: {
            reasoning: "Missing enum variant.",
            memoryLayers: ["semantic"],
            refinementTarget: {
              kind:            "primitive-field-extend-enum",
              filePathOrRid:   "/home/palantirkc/.claude/schemas/ontology/primitives/event-type.ts",
              description:     "Add t3_circuit_routed to EventTypeName enum.",
              confidenceLevel: "medium",
            },
          },
        },
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("routed");

    const kindDir = path.join(decisionsDir(), "primitive-field-extend-enum");
    expect(fs.existsSync(kindDir)).toBe(true);
    expect(fs.statSync(kindDir).isDirectory()).toBe(true);

    const files = fs.readdirSync(kindDir);
    expect(files).toContain("evt-t3-dir-check.json");
  });
});
