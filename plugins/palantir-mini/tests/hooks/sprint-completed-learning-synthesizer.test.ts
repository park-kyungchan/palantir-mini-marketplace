// palantir-mini v3.13.0 — sprint-completed-learning-synthesizer hook tests (BackProp P1)
// Coverage: happy path, idempotency, no analysis files, malformed analysis fallback.
// Pattern: tmpdir + beforeEach/afterEach (mirrors analyzer-output-injector.test.ts)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import sprintCompletedLearningSynthesizer from "../../hooks/sprint-completed-learning-synthesizer";

let TMP: string;
let savedEventsFile: string | undefined;
let eventsPath: string;

// ── helpers ──────────────────────────────────────────────────────────────────

function setupProjectRoot(root: string): void {
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
}

function writeEventsJsonl(root: string, lines: object[]): void {
  const p = path.join(root, ".palantir-mini", "session", "events.jsonl");
  fs.writeFileSync(p, lines.map((l) => JSON.stringify(l)).join("\n") + "\n", "utf8");
}

function readEmittedLearnings(eventsFilePath: string): Array<{ topic: string; content: string; confidence: number; source?: string }> {
  if (!fs.existsSync(eventsFilePath)) return [];
  const lines = fs.readFileSync(eventsFilePath, "utf8").trim().split("\n").filter(Boolean);
  return lines
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter((e): e is Record<string, unknown> => e !== null && e.type === "learning_captured")
    .map((e) => (e as { payload: { topic: string; content: string; confidence: number; source?: string } }).payload);
}

/** Minimal sprint_completed event line. */
function sprintCompletedEvent(sprintNumber: number, seq = 1): object {
  return {
    eventId: `evt-test-${seq}`,
    sequence: seq,
    type: "sprint_completed",
    when: new Date().toISOString(),
    atopWhich: "abc1234",
    throughWhich: { sessionId: "test-session", toolName: "commit_edits", cwd: "/tmp" },
    byWhom: { identity: "monitor" },
    payload: { project: "/tmp", sprintNumber, contractId: "contract-001", verdict: "passed", iterationCount: 1, bestScore: 1.0, terminationCriteria: [] },
  };
}

/** Minimal learning_captured event line (for dedup seeding). */
function learningCapturedEvent(topic: string, seq = 2): object {
  return {
    eventId: `evt-test-lc-${seq}`,
    sequence: seq,
    type: "learning_captured",
    when: new Date().toISOString(),
    atopWhich: "abc1234",
    throughWhich: { sessionId: "test-session", toolName: "sprint-completed-learning-synthesizer", cwd: "/tmp" },
    byWhom: { identity: "monitor" },
    payload: { topic, content: "previous content", confidence: 0.85, source: "analysis-001.md" },
  };
}

function setupAnalysisFile(
  root: string,
  sprintName: string,
  iter: number,
  body: string,
): string {
  const iterPad = String(iter).padStart(3, "0");
  const iterDir = path.join(root, ".palantir-mini", "harness", "sprints", sprintName, "iterations", `iteration-${iterPad}`);
  fs.mkdirSync(iterDir, { recursive: true });
  const analysisPath = path.join(iterDir, `analysis-${iterPad}.md`);
  fs.writeFileSync(analysisPath, body, "utf8");
  return analysisPath;
}

const WELL_FORMED_ANALYSIS = `# Analyzer Output — Iteration 1

§ Failure category: spec_misalignment
§ Root-cause hypothesis: spec ambiguity led generator to misinterpret the required contract shape

## Details
Further discussion here.
`;

const MALFORMED_ANALYSIS = `# Analyzer Output — Iteration 1

## Failure category
Some regression happened.

## Root-cause
Not using the expected §-prefixed format.
`;

// ── lifecycle ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-learning-synth-"));
  setupProjectRoot(TMP);
  eventsPath = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
  process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
});

afterEach(() => {
  if (savedEventsFile !== undefined) {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
  } else {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ── Case 1: happy path ────────────────────────────────────────────────────────

describe("Case 1 — happy path", () => {
  test("emits learning_captured with correct topic, content, and confidence", async () => {
    // Seed sprint_completed event
    writeEventsJsonl(TMP, [sprintCompletedEvent(1, 1)]);

    // Create analysis-001.md with well-formed content
    setupAnalysisFile(TMP, "sprint-001-quick", 1, WELL_FORMED_ANALYSIS);

    const result = await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      session_id: "test-session",
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("sprint-001");

    const learnings = readEmittedLearnings(eventsPath);
    expect(learnings).toHaveLength(1);

    const learning = learnings[0]!;
    expect(learning.topic).toBe("sprint-001-spec_misalignment");
    expect(learning.content).toContain("spec ambiguity");
    expect(learning.confidence).toBe(0.85);
    expect(learning.source).toBe("analysis-001.md");
  });

  test("additionalContext contains sprint number and emitted count", async () => {
    writeEventsJsonl(TMP, [sprintCompletedEvent(1, 1)]);
    setupAnalysisFile(TMP, "sprint-001", 1, WELL_FORMED_ANALYSIS);

    const result = await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      session_id: "test-session",
    });

    expect(result.additionalContext).toContain("001");
    expect(result.additionalContext).toContain("Learnings emitted: 1");
    expect(result.additionalContext).toContain("sprint-001-spec_misalignment");
  });

  test("skips non-target tool", async () => {
    const result = await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__something_else",
      cwd: TMP,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("tool=");
  });

  test("skips null payload gracefully", async () => {
    const result = await sprintCompletedLearningSynthesizer(null);
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });
});

// ── Case 2: idempotency ───────────────────────────────────────────────────────

describe("Case 2 — idempotency", () => {
  test("does not emit duplicate when same topic already in events.jsonl", async () => {
    const topic = "sprint-001-spec_misalignment";

    // Seed both sprint_completed AND an already-emitted learning for the same topic
    writeEventsJsonl(TMP, [
      sprintCompletedEvent(1, 1),
      learningCapturedEvent(topic, 2),
    ]);
    setupAnalysisFile(TMP, "sprint-001", 1, WELL_FORMED_ANALYSIS);

    const result = await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      session_id: "test-session",
    });

    expect(result.decision).toBe("continue");

    // Only the seeded learning exists; no new emit
    const learnings = readEmittedLearnings(eventsPath);
    // The seeded one is already there but no new one should be appended
    const newLearnings = learnings.filter((l) => l.content !== "previous content");
    expect(newLearnings).toHaveLength(0);
  });

  test("second fire after first emitted = no duplicate (reads own prior emit)", async () => {
    writeEventsJsonl(TMP, [sprintCompletedEvent(1, 1)]);
    setupAnalysisFile(TMP, "sprint-001", 1, WELL_FORMED_ANALYSIS);

    // First fire
    await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      session_id: "test-session",
    });

    // Second fire — should detect the topic already emitted and skip
    await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      session_id: "test-session",
    });

    const learnings = readEmittedLearnings(eventsPath);
    expect(learnings).toHaveLength(1); // only one, not two
  });
});

// ── Case 3: no analysis files ─────────────────────────────────────────────────

describe("Case 3 — no analysis files", () => {
  test("skips silently when sprint_completed exists but no analysis files", async () => {
    writeEventsJsonl(TMP, [sprintCompletedEvent(2, 1)]);
    // No analysis-*.md created

    const result = await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      session_id: "test-session",
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("no analysis files");

    const learnings = readEmittedLearnings(eventsPath);
    expect(learnings).toHaveLength(0);
  });

  test("skips silently when no sprint_completed event at all", async () => {
    // Write some unrelated events
    writeEventsJsonl(TMP, [
      { eventId: "x", sequence: 1, type: "edit_committed", when: new Date().toISOString(),
        atopWhich: "abc", throughWhich: { sessionId: "s", toolName: "t", cwd: "/" },
        byWhom: { identity: "monitor" }, payload: {} },
    ]);

    const result = await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      session_id: "test-session",
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("no sprint_completed event");
  });

  test("skips gracefully when events.jsonl is empty", async () => {
    fs.writeFileSync(eventsPath, "", "utf8");

    const result = await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      session_id: "test-session",
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });
});

// ── Case 4: malformed analysis (fallback) ─────────────────────────────────────

describe("Case 4 — malformed analysis fallback", () => {
  test("falls back to topic=sprint-NNN-unknown and confidence=0.5 when §Failure category missing", async () => {
    writeEventsJsonl(TMP, [sprintCompletedEvent(3, 1)]);
    setupAnalysisFile(TMP, "sprint-003", 1, MALFORMED_ANALYSIS);

    const result = await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      session_id: "test-session",
    });

    expect(result.decision).toBe("continue");

    const learnings = readEmittedLearnings(eventsPath);
    expect(learnings).toHaveLength(1);

    const learning = learnings[0]!;
    expect(learning.topic).toBe("sprint-003-unknown");
    expect(learning.confidence).toBe(0.5);
  });

  test("fallback topic still carries sprint-NNN- prefix (prefix invariant)", async () => {
    writeEventsJsonl(TMP, [sprintCompletedEvent(5, 1)]);
    setupAnalysisFile(TMP, "sprint-005", 1, MALFORMED_ANALYSIS);

    await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      session_id: "test-session",
    });

    const learnings = readEmittedLearnings(eventsPath);
    expect(learnings[0]!.topic).toMatch(/^sprint-005-/);
  });

  test("does not crash on completely empty analysis file", async () => {
    writeEventsJsonl(TMP, [sprintCompletedEvent(4, 1)]);
    setupAnalysisFile(TMP, "sprint-004", 1, "");

    const result = await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      session_id: "test-session",
    });

    // Should emit fallback or skip — must not throw
    expect(result.decision).toBe("continue");
  });

  test("multiple analysis files across iterations — emits one per unique category", async () => {
    writeEventsJsonl(TMP, [sprintCompletedEvent(6, 1)]);
    setupAnalysisFile(TMP, "sprint-006", 1, WELL_FORMED_ANALYSIS); // spec_misalignment
    setupAnalysisFile(TMP, "sprint-006", 2, `§ Failure category: regression\n§ Root-cause hypothesis: prior test broke after refactor\n`);

    await sprintCompletedLearningSynthesizer({
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      cwd: TMP,
      session_id: "test-session",
    });

    const learnings = readEmittedLearnings(eventsPath);
    expect(learnings).toHaveLength(2);
    const topics = learnings.map((l) => l.topic).sort();
    expect(topics).toContain("sprint-006-spec_misalignment");
    expect(topics).toContain("sprint-006-regression");
  });
});
