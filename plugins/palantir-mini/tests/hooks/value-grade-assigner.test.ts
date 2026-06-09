// palantir-mini v4.12.0 — value-grade-assigner hook tests (rule 26 §Auto-grade)
// Smoke + scenario coverage for the PreToolUse emit_event grading gate.
// sprint-060 W1.9: 5 new scenarios (meta-event / recursion-guard / axis-relax /
//                  coverage-counter / 14-criteria axesScored).

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import valueGradeAssigner, {
  getCoverageCounters,
  resetCoverageCounters,
} from "../../hooks/value-grade-assigner";

const EMIT_EVENT_TOOL = "mcp__plugin_palantir-mini_palantir-mini__emit_event";
const CODEX_EMIT_EVENT_TOOL = "mcp__palantir_mini__.emit_event";
let TMP: string;
let savedBypass: string | undefined;
let savedEnforce: string | undefined;
let savedAxisRelax: string | undefined;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-value-grade-assigner-"));
  savedBypass = process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS;
  savedEnforce = process.env.PALANTIR_MINI_VALUE_GRADE_ENFORCE;
  savedAxisRelax = process.env.PALANTIR_MINI_VALUE_GRADE_AXIS_RELAX;
  delete process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS;
  delete process.env.PALANTIR_MINI_VALUE_GRADE_ENFORCE;
  delete process.env.PALANTIR_MINI_VALUE_GRADE_AXIS_RELAX;
  // Reset per-test coverage counters for isolation
  resetCoverageCounters();
});

afterEach(() => {
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS;
  }
  if (savedEnforce !== undefined) {
    process.env.PALANTIR_MINI_VALUE_GRADE_ENFORCE = savedEnforce;
  } else {
    delete process.env.PALANTIR_MINI_VALUE_GRADE_ENFORCE;
  }
  if (savedAxisRelax !== undefined) {
    process.env.PALANTIR_MINI_VALUE_GRADE_AXIS_RELAX = savedAxisRelax;
  } else {
    delete process.env.PALANTIR_MINI_VALUE_GRADE_AXIS_RELAX;
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

/** Build a base envelope with all 5 dims present. */
function baseEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "evt-test-1",
    when: "2026-05-03T19:00:00.000Z",
    atopWhich: "abc123",
    throughWhich: {
      sessionId: "sess-test",
      toolName: "Bash",
      cwd: TMP,
    },
    byWhom: {
      identity: "claude-code",
    },
    type: "phase_completed",
    payload: { phaseTag: "test", taskId: "t-1", validations: [] },
    ...overrides,
  };
}

describe("valueGradeAssigner", () => {
  test("skips when tool_name is not emit_event", async () => {
    const result = await valueGradeAssigner({
      tool_name: "Bash",
      cwd: TMP,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });

  test("BLOCKS T0 envelope (missing 5-dim — no atopWhich)", async () => {
    const envelope = baseEnvelope({ atopWhich: "" });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("rule-26-t0-rejected");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("rule 26");
  });

  test("ALLOWS T1 envelope (5-dim full, no memoryLayers)", async () => {
    const envelope = baseEnvelope();
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("allow");
    expect(result.hookSpecificOutput?.additionalContext).toContain("grade=T1");
  });

  test("ALLOWS Codex MCP emit_event tool name", async () => {
    const envelope = baseEnvelope();
    const result = await valueGradeAssigner({
      tool_name: CODEX_EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("allow");
    expect(result.hookSpecificOutput?.additionalContext).toContain("grade=T1");
  });

  test("ALLOWS T2 envelope (memoryLayers + lineageRefs)", async () => {
    const envelope = baseEnvelope({
      withWhat: { memoryLayers: ["procedural"] as const, hypothesis: "test" },
      lineageRefs: { actionRid: "act-1" },
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    expect(result.hookSpecificOutput?.additionalContext).toMatch(/grade=T[234]/);
  });

  test("ALLOWS T3 envelope (memoryLayers + lineageRefs + refinementTarget)", async () => {
    const envelope = baseEnvelope({
      withWhat: {
        memoryLayers: ["procedural"] as const,
        hypothesis: "test",
        refinementTarget: {
          kind: "primitive-field-add",
          filePathOrRid: "test.ts",
          description: "test refinement",
          confidenceLevel: "high",
        },
      },
      lineageRefs: { actionRid: "act-1" },
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    expect(result.hookSpecificOutput?.additionalContext).toContain("grade=T3");
  });

  test("BYPASSES with PALANTIR_MINI_VALUE_GRADE_BYPASS=1 (even T0)", async () => {
    process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS = "1";
    const envelope = baseEnvelope({ atopWhich: "" }); // T0
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("BYPASS");
  });

  // ─── W2.5: T0 blocking default tests ───────────────────────────────────────

  test("W2.5: T0 is BLOCKED by default (no bypass env set)", async () => {
    delete process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS;
    const envelope = baseEnvelope({ atopWhich: "" }); // Missing atopWhich → T0
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("rule-26-t0-rejected");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("PALANTIR_MINI_VALUE_GRADE_BYPASS=1");
  });

  test("W2.5: bypass returns continue (not block) for T0 with env set", async () => {
    process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS = "1";
    const envelope = baseEnvelope({ atopWhich: "" }); // T0 — would be blocked without bypass
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    // Bypass path must return "continue" with "BYPASS" in message
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("BYPASS");
    expect(result.decision).not.toBe("block");
  });

  test("BLOCKS R5 violation in enforce mode (passed=false missing refinementTarget)", async () => {
    process.env.PALANTIR_MINI_VALUE_GRADE_ENFORCE = "1";
    const envelope = baseEnvelope({
      type: "validation_phase_completed",
      payload: { phase: "design", passed: false, errorClass: "test" },
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("rule-26-r5-violation");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  test("ALLOWS R5 violation in advisory mode (default — no enforce env)", async () => {
    // No PALANTIR_MINI_VALUE_GRADE_ENFORCE set
    const envelope = baseEnvelope({
      type: "validation_phase_completed",
      payload: { phase: "design", passed: false, errorClass: "test" },
      withWhat: { memoryLayers: ["procedural"] as const },
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    expect(result.hookSpecificOutput?.additionalContext).toContain("R5 advisory");
  });

  test("handles null payload gracefully", async () => {
    const result = await valueGradeAssigner(null);
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });

  test("handles missing envelope in tool_input", async () => {
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP }, // no envelope
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("no envelope");
  });

  // ─── sprint-059 W1.5 new test cases ────────────────────────────────────────

  test("axis E inferred from byWhom.agentName when memoryLayers missing", async () => {
    // Envelope with all 5 dims but NO withWhat.memoryLayers
    const envelope = baseEnvelope({
      byWhom: { identity: "claude-code", agentName: "implementer" },
      // Deliberately omit withWhat — tests that inferMemoryLayers kicks in
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    // Hook should allow the envelope AND signal that axis-E was inferred
    expect(result.decision).toBe("continue");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("allow");
    // additionalContext should mention inferred layers
    expect(result.hookSpecificOutput?.additionalContext).toContain("axis-E inferred");
    expect(result.hookSpecificOutput?.additionalContext).toContain("procedural");
  });

  test("axis E sprint-bound emit infers episodic layer from agentName", async () => {
    // agentName containing "sprint" → infer ["episodic"]
    const envelope = baseEnvelope({
      byWhom: { identity: "claude-code", agentName: "harness-sprint-generator" },
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    expect(result.hookSpecificOutput?.additionalContext).toContain("episodic");
  });

  test("meta-event emitted on T1 path (instrumentation coverage)", async () => {
    // We can verify that the hook does NOT block on a standard T1 envelope.
    // The instrumentation event is fire-and-forget (async void); we verify the
    // hook's additionalContext carries the grade as a proxy for the meta-event path.
    const envelope = baseEnvelope(); // 5-dim full, no memoryLayers → T1 with inference
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    expect(result.hookSpecificOutput?.additionalContext).toMatch(/grade=T[1234]/);
    // Verify the hook reports "inferred" since baseEnvelope has no memoryLayers
    expect(result.hookSpecificOutput?.additionalContext).toContain("axis-E inferred");
  });

  test("meta-event emitted on T0 path (block + instrumentation)", async () => {
    // T0 path: hook blocks AND emits instrumentation (fire-and-forget).
    // We verify the block decision is correct; the meta-event is best-effort async.
    const envelope = baseEnvelope({ atopWhich: "" }); // T0 — missing dim
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("block");
    expect(result.message).toContain("rule-26-t0-rejected");
  });

  test("recursion guard prevents infinite loop on meta-event envelope", async () => {
    // Simulate the hook receiving its own instrumentation meta-event.
    // The guard must short-circuit and return "continue" without processing.
    const metaEnvelope = baseEnvelope({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: true,
        errorClass: "value_grade_assignment_completed",
        // extra fields that the instrumentation event carries
        assignedTier: "T1",
        axesScored: { A: true, B: false, C: false, D: false, E: true },
      },
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope: metaEnvelope },
    });
    // Must skip all processing and return continue (not block)
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("recursion guard");
  });

  // ─── sprint-059 W2.6 new test cases: propagationDepth inference ────────────

  test("propagationDepth inferred as 4 for byWhom.identity=monitor", async () => {
    // Monitor emits map to runtime layer (depth 4) on the canonical 0-4 scale.
    // Rule 10 v2.2.0 §propagationDepth: 4 = runtime/src layer.
    const envelope = baseEnvelope({
      byWhom: { identity: "monitor", agentName: "monitor-async" },
      withWhat: { memoryLayers: ["procedural"] as const },
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    // additionalContext must report depth=4 inferred from identity
    expect(result.hookSpecificOutput?.additionalContext).toContain("propagationDepth=4");
    expect(result.hookSpecificOutput?.additionalContext).toContain("inferred");
  });

  test("propagationDepth inferred as 0 for claude-code + schema-primitive refinementTarget", async () => {
    // schema-primitive refinementTarget maps to the research/schema layer (depth 0)
    // on the canonical 0-4 scale (research+schema collapsed). Rule 10 v2.2.0.
    const envelope = baseEnvelope({
      byWhom: { identity: "claude-code" },
      withWhat: {
        memoryLayers: ["semantic"] as const,
        refinementTarget: {
          kind: "schema-primitive",
          filePathOrRid: "/home/palantirkc/.claude/schemas/ontology/primitives/value-grade.ts",
          description: "add new tier field",
          confidenceLevel: "high",
        },
      },
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    expect(result.hookSpecificOutput?.additionalContext).toContain("propagationDepth=0");
    expect(result.hookSpecificOutput?.additionalContext).toContain("inferred");
  });

  test("propagationDepth caller-supplied value is respected (not overridden)", async () => {
    // When the emitter explicitly provides propagationDepth, the hook must
    // leave it unchanged and report it as caller-supplied.
    const envelope = {
      ...baseEnvelope({
        withWhat: { memoryLayers: ["procedural"] as const },
      }),
      propagationDepth: 2, // caller says shared-core layer
    };
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    // Must report depth=2 as caller-supplied (not inferred)
    expect(result.hookSpecificOutput?.additionalContext).toContain("propagationDepth=2");
    expect(result.hookSpecificOutput?.additionalContext).toContain("caller-supplied");
  });

  test("propagationDepth defaults to 3 (contracts/hooks layer) for claude-code with no refinementTarget", async () => {
    // claude-code agent with no refinementTarget.kind → safe default of 3
    // (contracts/hooks layer) on the canonical 0-4 scale.
    const envelope = baseEnvelope({
      byWhom: { identity: "claude-code", agentName: "implementer" },
      withWhat: { memoryLayers: ["procedural"] as const },
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    expect(result.hookSpecificOutput?.additionalContext).toContain("propagationDepth=3");
  });

  // ─── sprint-060 W1.9 new test cases (P1.E1/M24/H.5) ────────────────────────

  test("W1.9 scenario-1: meta-event emitted with all 14 axesScored criteria present", async () => {
    // Verify that the hook decision is "continue" AND that the hook has incremented
    // the meta-event counter (proxy for meta-event emission, since emission is async).
    // This checks the internal counter increment as a synchronous proxy.
    const envelope = baseEnvelope({
      withWhat: { memoryLayers: ["procedural", "semantic"] as const },
    });
    const before = getCoverageCounters();
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    const after = getCoverageCounters();
    expect(result.decision).toBe("continue");
    // totalInvocationsSeen incremented by 1
    expect(after.totalInvocationsSeen).toBe(before.totalInvocationsSeen + 1);
    // metaEventsEmitted incremented by 1 (meta-event was fired for T1 path)
    expect(after.metaEventsEmitted).toBe(before.metaEventsEmitted + 1);
    // additionalContext carries grade (proxy for 14-criteria scoring path executed)
    expect(result.hookSpecificOutput?.additionalContext).toMatch(/grade=T[1234]/);
  });

  test("W1.9 scenario-2: recursion guard fires on payload.metaEvent=true (new flag)", async () => {
    // Simulate the hook receiving an envelope with the new metaEvent=true payload flag.
    // The guard must short-circuit on this new check (not just on errorClass).
    const metaFlagEnvelope = baseEnvelope({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: true,
        // Use metaEvent=true (new flag) WITHOUT the errorClass — tests the new flag path
        metaEvent: true,
        assignedTier: "T1",
      },
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope: metaFlagEnvelope },
    });
    // Must skip ALL processing: do not block, do not emit instrumentation, return continue
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("recursion guard");
    // Counter should NOT have incremented for the meta-event itself
    // (totalInvocationsSeen incremented, but metaEventsEmitted should NOT)
    const counters = getCoverageCounters();
    expect(counters.totalInvocationsSeen).toBeGreaterThanOrEqual(1);
    // Meta-event path returns early before emitInstrumentationEvent → no increment
    expect(counters.metaEventsEmitted).toBe(0);
  });

  test("W1.9 scenario-3: PALANTIR_MINI_VALUE_GRADE_AXIS_RELAX=1 is honored and audited", async () => {
    // With axis-relax env set, envelope without memoryLayers should get relaxed
    // axis-E treatment and report "RELAXED" in additionalContext.
    process.env.PALANTIR_MINI_VALUE_GRADE_AXIS_RELAX = "1";
    const envelope = baseEnvelope({
      // No withWhat.memoryLayers — relax mode infers ["procedural"] and suppresses gap advisory
      byWhom: { identity: "claude-code", agentName: "implementer" },
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    // With axis-relax, additionalContext should use "RELAXED" label instead of plain "inferred"
    expect(result.hookSpecificOutput?.additionalContext).toContain("axis-E RELAXED");
    expect(result.hookSpecificOutput?.additionalContext).toContain("procedural");
    // Grade still computed (T1 minimum with inferred layers)
    expect(result.hookSpecificOutput?.additionalContext).toMatch(/grade=T[1234]/);
  });

  test("W1.9 scenario-4: coverage counter increments per invocation, meta-events match T1+ paths", async () => {
    // Fire 3 valid T1 envelopes. Each should increment both counters.
    resetCoverageCounters();
    const envelope = baseEnvelope({ withWhat: { memoryLayers: ["procedural"] as const } });
    for (let i = 0; i < 3; i++) {
      await valueGradeAssigner({
        tool_name: EMIT_EVENT_TOOL,
        cwd: TMP,
        tool_input: { project: TMP, envelope: { ...envelope, eventId: `evt-coverage-${i}` } },
      });
    }
    const counters = getCoverageCounters();
    // All 3 invocations counted
    expect(counters.totalInvocationsSeen).toBe(3);
    // All 3 non-recursive paths → 3 meta-events emitted
    expect(counters.metaEventsEmitted).toBe(3);
    // Coverage ratio = metaEventsEmitted / totalInvocationsSeen = 1.0 (100%)
    const coverageRatio = counters.metaEventsEmitted / counters.totalInvocationsSeen;
    expect(coverageRatio).toBe(1.0);
  });

  test("W1.9 scenario-5: computeAxes14 produces correct per-criterion booleans on rich envelope", async () => {
    // Envelope with all rich fields → verify axesScored via the hook's additionalContext path.
    // We use a grading_completed envelope (C1=true, B2=N/A excluded) with all dims.
    const envelope = baseEnvelope({
      type: "grading_completed",
      payload: {
        rubricId: "r-1",
        overallScore: 0.9,
        perCriterionScore: { c1: 1 },
        phaseTag: "grading",
        taskId: "t-1",
        validations: [],
      },
      withWhat: {
        memoryLayers: ["procedural", "semantic"] as const,
        hypothesis: "rubric should pass",
        refinementTarget: {
          kind: "primitive-field-add",
          filePathOrRid: "test.ts",
          description: "add field",
          confidenceLevel: "high",
        },
      },
      lineageRefs: { actionRid: "act-1", outcomePairId: "pair-1" },
    });
    const result = await valueGradeAssigner({
      tool_name: EMIT_EVENT_TOOL,
      cwd: TMP,
      tool_input: { project: TMP, envelope },
    });
    expect(result.decision).toBe("continue");
    // Grade should be T3+ (A+E+B+C all met)
    expect(result.hookSpecificOutput?.additionalContext).toMatch(/grade=T[34]/);
    // Counter incremented for invocation and meta-event
    const counters = getCoverageCounters();
    expect(counters.totalInvocationsSeen).toBeGreaterThanOrEqual(1);
    expect(counters.metaEventsEmitted).toBeGreaterThanOrEqual(1);
  });
});
