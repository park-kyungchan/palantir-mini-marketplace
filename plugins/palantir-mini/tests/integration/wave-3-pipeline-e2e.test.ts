// palantir-mini v3.10.0 — CT-1 Wave 3 pipeline integration e2e
//
// Per ~/.claude/plans/2026-04-29-harness-base-mode-closing-tasks.md §1 CT-1
// + ~/.claude/plans/streamed-forging-kettle.md (approved 2026-04-29).
//
// Validates the full Wave 3 pipeline end-to-end via direct handler/hook calls
// in isolated tmpdirs. NO `claude -p` subprocess spawned — happy-path
// dry_run_graded(passed=true) event is synthesized via direct emit() because
// gradeModel short-circuits to `needs_human_review` (passed=false) when
// scoringPrompt is absent (bridge/handlers/grade-outcome/model.ts:43).
//
// Pipeline tested:
//   compute_edits_dry_run  → emits dry_run_computed
//   pm_grader_dispatch     → emits dry_run_graded (synthesized) or
//                              dry_run_skipped_validation_errors (real handler)
//   commit-edits-precondition → ALLOW (harness_gate_passed) or BLOCK
//   harness-analyzer-trigger → marker file + harness-analyzer-fire-pending
//   analyzer-output-injector → lead-guidance.md + analyzer-output-injected
//
// Anti-scope: NO consumer-project file reads/edits. Plugin-internal tmpdir only.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { computeEditsDryRun } from "../../bridge/handlers/compute_edits_dry_run";
import pmGraderDispatch from "../../bridge/handlers/pm-grader-dispatch";
import commitEditsPrecondition from "../../hooks/commit-edits-precondition";
import harnessAnalyzerTrigger from "../../hooks/harness-analyzer-trigger";
import analyzerOutputInjector from "../../hooks/analyzer-output-injector";
import { emit } from "../../scripts/log";
import { registerEditFunction } from "../../lib/actions/tier2-function";
import type { GradingCriterionLite } from "../../bridge/handlers/grade-outcome/types";

const COMMIT_EDITS_TOOL = "mcp__plugin_palantir-mini_palantir-mini__commit_edits";
const GRADE_RUBRIC_TOOL = "mcp__plugin_palantir-mini_palantir-mini__grade_outcome_with_rubric";

// Register a deterministic noop edit function once per file load
registerEditFunction({
  name: "test_w3_e2e_noop",
  apply: () => [],
});

interface ParsedEvent {
  type:        string;
  payload:     { phase?: string; passed?: boolean; errorClass?: string; phaseTag?: string };
  throughWhich?: { toolName?: string };
  withWhat?:   { reasoning?: string };
}

function readEventLines(eventsPath: string): ParsedEvent[] {
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as ParsedEvent);
}

function findEvent(
  events: ParsedEvent[],
  type: string,
  predicate?: (e: ParsedEvent) => boolean,
): ParsedEvent | undefined {
  return events.find((e) => e.type === type && (!predicate || predicate(e)));
}

function writeBoundContract(projectRoot: string, mode: "full" | "quick" = "full"): void {
  const sprintDir = path.join(projectRoot, ".palantir-mini", "harness", "sprints", "sprint-001");
  fs.mkdirSync(sprintDir, { recursive: true });
  fs.writeFileSync(
    path.join(sprintDir, "contract.json"),
    JSON.stringify({ status: "bound", mode, sprintNumber: 1 }, null, 2),
  );
}

let TMP: string;
let savedEventsFile: string | undefined;
let savedBypass: string | undefined;
const SESSION_ID = "test-w3-e2e-session";

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-w3-e2e-"));
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
  savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedBypass = process.env.PALANTIR_MINI_HARNESS_BYPASS;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  delete process.env.PALANTIR_MINI_HARNESS_BYPASS;
});

afterEach(() => {
  if (savedEventsFile !== undefined) process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
  else delete process.env.PALANTIR_MINI_EVENTS_FILE;
  if (savedBypass !== undefined) process.env.PALANTIR_MINI_HARNESS_BYPASS = savedBypass;
  else delete process.env.PALANTIR_MINI_HARNESS_BYPASS;
  if (TMP && fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
  // Clean marker dir from analyzer-trigger scenarios
  const markerSession = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
  if (fs.existsSync(markerSession)) fs.rmSync(markerSession, { recursive: true, force: true });
});

// ─── Block 1: dry-run → grade → commit-gate ─────────────────────────────────

describe("CT-1 Block 1 — dry-run → grade → commit-gate", () => {
  test("happy path: dry-run + synthesized graded(pass) → commit-edits-precondition ALLOWS", async () => {
    writeBoundContract(TMP, "full");
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;

    // Step 1: dry-run computes ref + emits dry_run_computed
    const dryRunResult = await computeEditsDryRun({
      project: TMP,
      functionName: "test_w3_e2e_noop",
      params: {},
    });
    expect(dryRunResult.dryRunRef).toMatch(/^[a-f0-9]{16}$/);
    expect(dryRunResult.validationResult).toBe("ok");

    let events = readEventLines(eventsPath);
    const computedEv = findEvent(
      events,
      "validation_phase_completed",
      (e) => e.payload.errorClass === "dry_run_computed",
    );
    expect(computedEv).toBeDefined();
    expect(computedEv?.payload.passed).toBe(true);
    expect(computedEv?.withWhat?.reasoning).toContain(`dryRunRef=${dryRunResult.dryRunRef}`);

    // Step 2: synthesize dry_run_graded(passed=true) via direct emit() since
    // gradeModel without scoringPrompt would emit passed=false.
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: true,
        errorClass: "dry_run_graded",
      },
      toolName: "pm_grader_dispatch",
      cwd: TMP,
      identity: "claude-code",
      reasoning: `dry-run-graded dryRunRef=${dryRunResult.dryRunRef} verdict=pass score=10 criterion=test-c1`,
    });

    // Step 3: commit-edits-precondition allows
    const hookResult = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, dryRunRef: dryRunResult.dryRunRef, edits: [] },
    });
    expect(hookResult.decision).toBe("continue");
    expect(hookResult.message).toContain("OK");
    expect(hookResult.message).toContain(`dryRunRef=${dryRunResult.dryRunRef}`);

    // Verify harness_gate_passed event landed
    events = readEventLines(eventsPath);
    const gatePassed = findEvent(
      events,
      "validation_phase_completed",
      (e) => e.payload.errorClass === "harness_gate_passed",
    );
    expect(gatePassed).toBeDefined();
    expect(gatePassed?.payload.passed).toBe(true);
  });

  test("validation-errors path: dry-run + grader early-exit → commit-edits-precondition BLOCKS", async () => {
    writeBoundContract(TMP, "full");
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;

    // Step 1: dry-run with Unevaluable submissionCriterion produces errors
    const dryRunResult = await computeEditsDryRun({
      project: TMP,
      functionName: "test_w3_e2e_noop",
      params: {},
      submissionCriteria: [
        { type: "Unevaluable", name: "scenario_b_fail", reason: "validation-errors path" },
      ],
    });
    expect(dryRunResult.dryRunRef).toMatch(/^[a-f0-9]{16}$/);
    expect(typeof dryRunResult.validationResult).toBe("object");

    // Step 2: pm_grader_dispatch with the errors → early-exit guard skips
    // subprocess + emits dry_run_skipped_validation_errors.
    const modelCriterion: GradingCriterionLite = {
      criterionId: "scenario-b-criterion",
      title: "Scenario B model criterion",
      rubricDomain: "model",
      passFailLogic: { threshold: 7, scale: "0-10" },
      weightInRubric: 1.0,
    };
    const graderResult = await pmGraderDispatch({
      project: TMP,
      criterion: modelCriterion,
      artifactPath: TMP,
      dryRunRef: dryRunResult.dryRunRef,
      validationResult: dryRunResult.validationResult,
    });
    expect(graderResult.passFail).toBe("fail");
    expect(graderResult.reasoning).toContain("validation");

    let events = readEventLines(eventsPath);
    const skippedEv = findEvent(
      events,
      "validation_phase_completed",
      (e) =>
        e.payload.errorClass === "dry_run_skipped_validation_errors" &&
        (e.withWhat?.reasoning ?? "").includes(`dryRunRef=${dryRunResult.dryRunRef}`),
    );
    expect(skippedEv).toBeDefined();
    expect(skippedEv?.payload.passed).toBe(false);

    // Step 3: commit-edits-precondition blocks with dry-run-validation-errors
    const hookResult = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, dryRunRef: dryRunResult.dryRunRef, edits: [] },
    });
    expect(hookResult.decision).toBe("block");
    expect(hookResult.message).toContain("dry-run-validation-errors");
    expect(hookResult.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  test("missing dryRunRef after pipeline-in-use → commit-edits-precondition BLOCKS", async () => {
    writeBoundContract(TMP, "full");

    // Trigger grace-period exit by emitting any dry_run_computed event
    await computeEditsDryRun({
      project: TMP,
      functionName: "test_w3_e2e_noop",
      params: {},
    });

    // commit_edits without dryRunRef in tool_input
    const hookResult = await commitEditsPrecondition({
      tool_name: COMMIT_EDITS_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, edits: [] },
    });
    expect(hookResult.decision).toBe("block");
    expect(hookResult.message).toContain("missing-dry-run-ref");
    expect(hookResult.hookSpecificOutput?.permissionDecision).toBe("deny");
  });
});

// ─── Block 2: analyzer trigger → injector ───────────────────────────────────

describe("CT-1 Block 2 — analyzer trigger → injector chain", () => {
  test("harness-analyzer-trigger writes marker + emits phase_completed + idempotent re-fire", async () => {
    writeBoundContract(TMP, "full");
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;

    const triggerPayload = {
      tool_name: GRADE_RUBRIC_TOOL,
      session_id: SESSION_ID,
      cwd: TMP,
      tool_input: {
        sprintNumber: 1,
        iteration: 1,
        rubric: { rubricId: "test-rubric" },
        projectPath: TMP,
      },
      tool_response: {
        rubricId: "test-rubric",
        failedCriteria: 1,
        perCriterion: [{ passFail: "fail" as const }],
      },
    };

    // First fire: marker + event
    const r1 = await harnessAnalyzerTrigger(triggerPayload);
    expect(r1.decision).toBe("continue");
    expect(r1.message).toContain("queued");

    const markerPath = path.join(
      os.tmpdir(),
      "claude-hooks",
      SESSION_ID,
      "analyzer-request-1-1-test-rubric.json",
    );
    expect(fs.existsSync(markerPath)).toBe(true);
    const markerJson = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    expect(markerJson.sprintNumber).toBe(1);
    expect(markerJson.iteration).toBe(1);
    expect(markerJson.rubricId).toBe("test-rubric");
    expect(markerJson.failedCount).toBe(1);

    const events = readEventLines(eventsPath);
    const firePending = findEvent(
      events,
      "phase_completed",
      (e) => e.payload.phaseTag === "harness-analyzer-fire-pending",
    );
    expect(firePending).toBeDefined();

    // Re-fire: idempotent no-op
    const r2 = await harnessAnalyzerTrigger(triggerPayload);
    expect(r2.decision).toBe("continue");
    expect(r2.message).toContain("no-op (marker exists");
  });

  test("analyzer-output-injector writes lead-guidance.md for iter+1 + emits phase_completed", async () => {
    writeBoundContract(TMP, "full");
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;

    // Pre-create iteration-001/analysis-001.md
    const iter001Dir = path.join(
      TMP,
      ".palantir-mini",
      "harness",
      "sprints",
      "sprint-001",
      "iterations",
      "iteration-001",
    );
    fs.mkdirSync(iter001Dir, { recursive: true });
    const analysisBody = [
      "# Failure Mode",
      "Root cause: synthetic CT-1 scenario",
      "Suggested patch: integration test placeholder",
      "Confidence: high",
    ].join("\n");
    fs.writeFileSync(path.join(iter001Dir, "analysis-001.md"), analysisBody);

    const result = await analyzerOutputInjector({
      agent_name: "harness-analyzer",
      cwd: TMP,
      session_id: SESSION_ID,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("iteration 2");

    const guidancePath = path.join(
      TMP,
      ".palantir-mini",
      "harness",
      "sprints",
      "sprint-001",
      "iterations",
      "iteration-002",
      "lead-guidance.md",
    );
    expect(fs.existsSync(guidancePath)).toBe(true);
    const guidanceBody = fs.readFileSync(guidancePath, "utf8");
    expect(guidanceBody).toContain("# Lead Guidance — Iteration 2");
    expect(guidanceBody).toContain("Root cause: synthetic CT-1 scenario");
    expect(guidanceBody).toContain("Suggested patch: integration test placeholder");

    const events = readEventLines(eventsPath);
    const injected = findEvent(
      events,
      "phase_completed",
      (e) => e.payload.phaseTag === "analyzer-output-injected",
    );
    expect(injected).toBeDefined();
  });
});
