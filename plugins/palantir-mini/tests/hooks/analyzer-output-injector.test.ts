// palantir-mini v3.9.0 — analyzer-output-injector hook tests (W3.1b)
// Coverage: agent-name gate, no-analysis skip, find-latest by mtime,
// lead-guidance.md write, phase_completed emit.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import analyzerOutputInjector, {
  findLatestAnalysis,
  buildLeadGuidance,
  cleanupConsumedMarkers,
  parseSprintNumber,
} from "../../hooks/analyzer-output-injector";

let TMP: string;
let savedEventsFile: string | undefined;

function setupSprintTree(
  root: string,
  sprintName: string,
  iterAnalyses: Array<{ iter: number; body: string }>,
): { sprintDir: string } {
  const sprintDir = path.join(root, ".palantir-mini", "harness", "sprints", sprintName);
  for (const { iter, body } of iterAnalyses) {
    const iterDir = path.join(sprintDir, "iterations", `iteration-${String(iter).padStart(3, "0")}`);
    fs.mkdirSync(iterDir, { recursive: true });
    fs.writeFileSync(path.join(iterDir, `analysis-${String(iter).padStart(3, "0")}.md`), body);
  }
  return { sprintDir };
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-injector-w3-1b-"));
  // findProjectRoot walks up looking for .palantir-mini/ — make TMP a project root
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
  savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
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

describe("findLatestAnalysis helper", () => {
  test("returns null when no sprints dir", () => {
    expect(findLatestAnalysis(TMP)).toBeNull();
  });

  test("returns null when sprints exist but no analysis-*.md files", () => {
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001", "iterations", "iteration-001"), { recursive: true });
    expect(findLatestAnalysis(TMP)).toBeNull();
  });

  test("returns the newest analysis by mtime", async () => {
    setupSprintTree(TMP, "sprint-001", [
      { iter: 1, body: "## Analysis iter 1" },
    ]);
    // Wait briefly to ensure mtime ordering
    await new Promise((r) => setTimeout(r, 10));
    setupSprintTree(TMP, "sprint-001", [
      { iter: 2, body: "## Analysis iter 2 (newer)" },
    ]);

    const hit = findLatestAnalysis(TMP);
    expect(hit).not.toBeNull();
    expect(hit!.iteration).toBe(2);
    expect(hit!.analysisPath).toContain("iteration-002/analysis-002.md");
  });
});

describe("buildLeadGuidance helper", () => {
  test("builds Markdown with required sections", () => {
    const hit = {
      sprintDir: "/tmp/x",
      iteration: 3,
      analysisPath: "/tmp/x/iterations/iteration-003/analysis-003.md",
      mtimeMs: Date.now(),
    };
    const guidance = buildLeadGuidance(hit, "## Failure category\n[x] regression", 4);
    expect(guidance).toContain("# Lead Guidance — Iteration 4");
    expect(guidance).toContain("Source: analyzer synthesis from iteration 3");
    expect(guidance).toContain("Auto-injected by analyzer-output-injector hook");
    expect(guidance).toContain("## Analyzer Synthesis (verbatim)");
    expect(guidance).toContain("## Failure category");
    expect(guidance).toContain("[x] regression");
    expect(guidance).toContain("Generator MUST read this file before iteration 4 commits");
  });
});

describe("analyzerOutputInjector hook", () => {
  test("skips when agent_name != harness-analyzer", async () => {
    const result = await analyzerOutputInjector({
      agent_name: "some-other-agent",
      cwd: TMP,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });

  test("matches subagent_type=harness-analyzer", async () => {
    const result = await analyzerOutputInjector({
      subagent_type: "harness-analyzer",
      cwd: TMP,
    });
    // No analysis file → skipped at "no analysis-NNN.md found"
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("no analysis");
  });

  test("matches subagent_type=palantir-mini:harness-analyzer", async () => {
    const result = await analyzerOutputInjector({
      subagent_type: "palantir-mini:harness-analyzer",
      cwd: TMP,
    });
    expect(result.decision).toBe("continue");
    // No analysis file → skipped
    expect(result.message).toContain("no analysis");
  });

  test("writes lead-guidance.md for next iteration when analysis exists", async () => {
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    setupSprintTree(TMP, "sprint-001", [
      { iter: 1, body: "## Failure category\n- [x] regression\n## Root-cause\nfoo broke bar" },
    ]);

    const result = await analyzerOutputInjector({
      agent_name: "harness-analyzer",
      cwd: TMP,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("wrote lead-guidance.md for iteration 2");

    const expectedTarget = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001", "iterations", "iteration-002", "lead-guidance.md");
    expect(fs.existsSync(expectedTarget)).toBe(true);
    const body = fs.readFileSync(expectedTarget, "utf8");
    expect(body).toContain("# Lead Guidance — Iteration 2");
    expect(body).toContain("## Failure category");
    expect(body).toContain("foo broke bar");

    // Event emitted
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    const evt = lines.map((l) => JSON.parse(l)).find(
      (e: any) => e.payload?.phaseTag === "analyzer-output-injected",
    );
    expect(evt).toBeDefined();
    expect(evt.payload.taskId).toBe("iteration-2-briefing");
  });

  test("overwrites existing lead-guidance.md (never appends)", async () => {
    setupSprintTree(TMP, "sprint-001", [
      { iter: 1, body: "## Initial body" },
    ]);
    // Pre-existing lead-guidance.md from earlier injection
    const targetDir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-001", "iterations", "iteration-002");
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, "lead-guidance.md"), "## STALE PRE-EXISTING CONTENT");

    await analyzerOutputInjector({ agent_name: "harness-analyzer", cwd: TMP });

    const body = fs.readFileSync(path.join(targetDir, "lead-guidance.md"), "utf8");
    expect(body).not.toContain("STALE PRE-EXISTING CONTENT");
    expect(body).toContain("## Initial body");
  });

  test("handles null payload gracefully", async () => {
    const result = await analyzerOutputInjector(null);
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });
});

describe("CT-3 W3.1d marker cleanup", () => {
  test("parseSprintNumber extracts N from sprint-NNN", () => {
    expect(parseSprintNumber("/foo/sprint-007")).toBe(7);
    expect(parseSprintNumber("/foo/sprint-001-quick")).toBe(1);
    expect(Number.isNaN(parseSprintNumber("/foo/no-sprint"))).toBe(true);
  });

  test("cleanupConsumedMarkers deletes matching markers + leaves others", () => {
    const sid = `test-cleanup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const markerDir = path.join(os.tmpdir(), "palantir-mini-hooks", sid);
    fs.mkdirSync(markerDir, { recursive: true });
    // Markers for sprint 5 iter 2 (target) — multi-rubric
    fs.writeFileSync(path.join(markerDir, "analyzer-request-5-2-rubricA.json"), "{}");
    fs.writeFileSync(path.join(markerDir, "analyzer-request-5-2-rubricB.json"), "{}");
    // Markers for OTHER sprint/iter — must survive
    fs.writeFileSync(path.join(markerDir, "analyzer-request-5-3-rubricC.json"), "{}");
    fs.writeFileSync(path.join(markerDir, "analyzer-request-6-2-rubricD.json"), "{}");
    // Non-marker file in same dir — must survive
    fs.writeFileSync(path.join(markerDir, "unrelated.json"), "{}");

    const deleted = cleanupConsumedMarkers(sid, 5, 2);
    expect(deleted).toBe(2);
    expect(fs.existsSync(path.join(markerDir, "analyzer-request-5-2-rubricA.json"))).toBe(false);
    expect(fs.existsSync(path.join(markerDir, "analyzer-request-5-2-rubricB.json"))).toBe(false);
    expect(fs.existsSync(path.join(markerDir, "analyzer-request-5-3-rubricC.json"))).toBe(true);
    expect(fs.existsSync(path.join(markerDir, "analyzer-request-6-2-rubricD.json"))).toBe(true);
    expect(fs.existsSync(path.join(markerDir, "unrelated.json"))).toBe(true);

    fs.rmSync(markerDir, { recursive: true, force: true });
  });

  test("cleanupConsumedMarkers handles missing dir + invalid args", () => {
    expect(cleanupConsumedMarkers("", 1, 1)).toBe(0);
    expect(cleanupConsumedMarkers("nonexistent-sid-xyz", 1, 1)).toBe(0);
    expect(cleanupConsumedMarkers("sid", NaN, 1)).toBe(0);
    expect(cleanupConsumedMarkers("sid", 1, NaN)).toBe(0);
  });

  test("happy with valid enum: scope_overreach category extracted + both events emitted", async () => {
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    setupSprintTree(TMP, "sprint-002", [
      {
        iter: 1,
        body: [
          "## Analysis",
          "",
          "§ Failure category: scope_overreach",
          "§ Root-cause hypothesis: Generator modified files outside sprint scope.",
        ].join("\n"),
      },
    ]);

    const result = await analyzerOutputInjector({
      agent_name: "harness-analyzer",
      cwd: TMP,
    });
    expect(result.decision).toBe("continue");
    expect(result.additionalContext).toContain("Failure synthesized: scope_overreach");

    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    const evts = lines.map((l) => JSON.parse(l));

    const phaseEvt = evts.find((e: any) => e.payload?.phaseTag === "analyzer-output-injected");
    expect(phaseEvt).toBeDefined();

    const failureEvt = evts.find((e: any) => e.type === "failure_mode_synthesized");
    expect(failureEvt).toBeDefined();
    expect(failureEvt.payload.failureCategory).toBe("scope_overreach");
    expect(failureEvt.payload.rootCauseHypothesis).toBe("Generator modified files outside sprint scope.");
    expect(typeof failureEvt.payload.sprintNumber).toBe("number");
    expect(failureEvt.payload.iteration).toBe(1);
  });

  test("no §Failure category section falls back to 'unknown' without crash", async () => {
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    setupSprintTree(TMP, "sprint-003", [
      {
        iter: 2,
        body: "## Analysis\n\nNo structured category section here.\n",
      },
    ]);

    const result = await analyzerOutputInjector({
      agent_name: "harness-analyzer",
      cwd: TMP,
    });
    expect(result.decision).toBe("continue");
    expect(result.additionalContext).toContain("Failure synthesized: unknown");

    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    const failureEvt = lines
      .map((l) => JSON.parse(l))
      .find((e: any) => e.type === "failure_mode_synthesized");
    expect(failureEvt).toBeDefined();
    expect(failureEvt.payload.failureCategory).toBe("unknown");
    expect(failureEvt.payload.rootCauseHypothesis).toBe("(not specified in analysis)");
  });

  test("invalid enum value in §Failure category falls back to 'unknown'", async () => {
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    setupSprintTree(TMP, "sprint-004", [
      {
        iter: 1,
        body: [
          "## Analysis",
          "",
          "§ Failure category: invalid_xxx",
          "§ Root-cause hypothesis: Some hypothesis.",
        ].join("\n"),
      },
    ]);

    await analyzerOutputInjector({
      agent_name: "harness-analyzer",
      cwd: TMP,
    });

    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    const failureEvt = lines
      .map((l) => JSON.parse(l))
      .find((e: any) => e.type === "failure_mode_synthesized");
    expect(failureEvt).toBeDefined();
    expect(failureEvt.payload.failureCategory).toBe("unknown");
  });

  test("end-to-end: injector cleans matching marker after writing lead-guidance", async () => {
    const sid = `test-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setupSprintTree(TMP, "sprint-007", [
      { iter: 2, body: "## CT-3 e2e analysis" },
    ]);
    // Pre-write the marker the trigger hook would have written
    const markerDir = path.join(os.tmpdir(), "palantir-mini-hooks", sid);
    fs.mkdirSync(markerDir, { recursive: true });
    const markerPath = path.join(markerDir, "analyzer-request-7-2-rubric-X.json");
    fs.writeFileSync(markerPath, JSON.stringify({
      sprintNumber: 7, iteration: 2, rubricId: "rubric-X", project: TMP,
      failedCount: 1, requestedAt: "2026-04-29T10:00:00.000Z", sessionId: sid,
    }));
    expect(fs.existsSync(markerPath)).toBe(true);

    const result = await analyzerOutputInjector({
      agent_name: "harness-analyzer",
      cwd: TMP,
      session_id: sid,
    });
    expect(result.message).toContain("markers cleaned: 1");
    expect(fs.existsSync(markerPath)).toBe(false);
    expect(result.additionalContext).toContain("Cleaned up 1 consumed analyzer-request marker");

    fs.rmSync(markerDir, { recursive: true, force: true });
  });
});
