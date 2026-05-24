// palantir-mini v3.6.0 — complete_playwright_scenario MCP handler tests (A3 split orchestrator).
// Covers: arg validation, outcome resolution + canonicalization. Auto-grade dispatch in
// sibling complete-playwright-scenario-grade-dispatch.test.ts; pure classify tests in -classify.test.ts.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import completePlaywrightScenario, {
  type CompletePlaywrightScenarioArgs,
} from "../../../bridge/handlers/complete-playwright-scenario";
import { cleanupTmpDirs, makeEvidenceDir } from "./complete-playwright-scenario/fixtures";

afterEach(() => {
  cleanupTmpDirs();
});

describe("complete_playwright_scenario — arg validation", () => {
  test("throws when scenarioId missing", async () => {
    await expect(
      completePlaywrightScenario({ evidenceDir: "/tmp/x" } as CompletePlaywrightScenarioArgs),
    ).rejects.toThrow("scenarioId");
  });

  test("throws when evidenceDir missing", async () => {
    await expect(
      completePlaywrightScenario({ scenarioId: "s1" } as CompletePlaywrightScenarioArgs),
    ).rejects.toThrow("evidenceDir");
  });
});

describe("complete_playwright_scenario — outcome resolution", () => {
  test("inline recordedOutcome path: success → state completed + outcome populated + canonicalized on disk", async () => {
    const { project, evidenceDir } = makeEvidenceDir("success-inline");
    const result = await completePlaywrightScenario({
      projectPath: project,
      scenarioId: "scenario-success",
      evidenceDir,
      recordedOutcome: {
        passed: true,
        durationMs: 1234.7,
        retries: 0,
        stepResults: [
          { stepIndex: 0, status: "passed", durationMs: 100 },
          { stepIndex: 1, status: "passed", durationMs: 1100 },
        ],
      },
    });

    expect(result.scenarioId).toBe("scenario-success");
    expect(result.outcome.passed).toBe(true);
    expect(result.outcome.durationMs).toBe(1235);
    expect(result.outcome.retries).toBe(0);
    expect(result.outcome.failureClass).toBeUndefined();
    expect(result.scenarioCompletedEventId.startsWith("evt-pwc-")).toBe(true);
    expect(result.gradingResult).toBeUndefined();

    const onDisk = JSON.parse(fs.readFileSync(result.outcomeCanonicalPath, "utf8"));
    expect(onDisk.passed).toBe(true);
    expect(onDisk.durationMs).toBe(1235);
  });

  test("inline recordedOutcome path: failure → state failed + failureClass auto-classified", async () => {
    const { project, evidenceDir } = makeEvidenceDir("failure-inline");
    const result = await completePlaywrightScenario({
      projectPath: project,
      scenarioId: "scenario-fail-timeout",
      evidenceDir,
      recordedOutcome: {
        passed: false,
        failedStep: "wait for #login-form",
        failureMessage: "Timeout 30000ms exceeded waiting for selector",
        durationMs: 30000,
      },
    });

    expect(result.outcome.passed).toBe(false);
    expect(result.outcome.failureClass).toBe("timeout");
    expect(result.outcome.failedStep).toBe("wait for #login-form");
  });

  test("explicit failureClass preserved over auto-classification", async () => {
    const { project, evidenceDir } = makeEvidenceDir("explicit-class");
    const result = await completePlaywrightScenario({
      projectPath: project,
      scenarioId: "scenario-explicit",
      evidenceDir,
      recordedOutcome: {
        passed: false,
        failedStep: "click #submit",
        failureMessage: "browser disconnected unexpectedly",
        failureClass: "transient_network",
      },
    });
    expect(result.outcome.failureClass).toBe("transient_network");
  });

  test("reads outcome.json when recordedOutcome absent", async () => {
    const { project, evidenceDir } = makeEvidenceDir("file-read");
    fs.writeFileSync(
      path.join(evidenceDir, "outcome.json"),
      JSON.stringify({
        passed: false,
        failedStep: "expect-text",
        failureMessage: "expected 'A' but received 'B'",
      }),
    );

    const result = await completePlaywrightScenario({
      projectPath: project,
      scenarioId: "scenario-from-file",
      evidenceDir,
    });

    expect(result.outcome.passed).toBe(false);
    expect(result.outcome.failureClass).toBe("assertion_failed");
  });

  test("throws when no inline outcome and no outcome.json on disk", async () => {
    const { project, evidenceDir } = makeEvidenceDir("missing");
    await expect(
      completePlaywrightScenario({
        projectPath: project,
        scenarioId: "scenario-missing",
        evidenceDir,
      }),
    ).rejects.toThrow("outcome.json not found");
  });

  test("throws when outcome shape invalid (missing passed)", async () => {
    const { project, evidenceDir } = makeEvidenceDir("invalid-shape");
    await expect(
      completePlaywrightScenario({
        projectPath: project,
        scenarioId: "scenario-invalid",
        evidenceDir,
        recordedOutcome: { failedStep: "no passed field" } as any,
      }),
    ).rejects.toThrow("recordedOutcome");
  });

  test("accepts outcome with failedStep: null and failureMessage: null (B-27 regression)", async () => {
    const { project, evidenceDir } = makeEvidenceDir("null-optional");
    fs.writeFileSync(
      path.join(evidenceDir, "scenario.json"),
      JSON.stringify({
        scenarioId: "null-optional",
        mcpToolBinding: "mcp__playwright__*",
        url: "http://localhost:8765/x",
        steps: [{ action: "navigate", selector: "", expected: "load" }],
      }),
    );
    const result = await completePlaywrightScenario({
      projectPath: project,
      scenarioId: "null-optional",
      evidenceDir,
      recordedOutcome: { passed: true, failedStep: null, failureMessage: null } as any,
    });
    expect(result.outcome.passed).toBe(true);
    expect(result.outcome.failedStep).toBeUndefined();
    expect(result.outcome.failureMessage).toBeUndefined();
  });

  test("throws when outcome.json on disk is invalid JSON", async () => {
    const { project, evidenceDir } = makeEvidenceDir("bad-json");
    fs.writeFileSync(path.join(evidenceDir, "outcome.json"), "{not valid json");
    await expect(
      completePlaywrightScenario({
        projectPath: project,
        scenarioId: "scenario-bad-json",
        evidenceDir,
      }),
    ).rejects.toThrow("parse error");
  });

  test("recovers mcpToolBinding from scenario.json when present", async () => {
    const { project, evidenceDir } = makeEvidenceDir("binding-recover");
    fs.writeFileSync(
      path.join(evidenceDir, "scenario.json"),
      JSON.stringify({
        scenarioId: "x",
        mcpToolBinding: "mcp__claude-in-chrome__*",
        url: "http://x",
        steps: [],
      }),
    );
    const result = await completePlaywrightScenario({
      projectPath: project,
      scenarioId: "binding-recover",
      evidenceDir,
      recordedOutcome: { passed: true },
    });
    expect(result.outcome.passed).toBe(true);
  });
});
