/**
 * palantir-mini v3.6.0 — complete_playwright_scenario sibling: auto-grade dispatch (A3 split).
 * Sibling of complete-playwright-scenario.test.ts (which retains arg validation + outcome resolution).
 *
 * Covers: auto-grade dispatch with rubricPath, rubric file errors, rule-domain criterion.
 */

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import completePlaywrightScenario from "../../../bridge/handlers/complete-playwright-scenario";
import { cleanupTmpDirs, makeEvidenceDir } from "./complete-playwright-scenario/fixtures";

afterEach(() => {
  cleanupTmpDirs();
});

describe("complete_playwright_scenario — auto-grade dispatch", () => {
  test("throws when rubricPath does not exist", async () => {
    const { project, evidenceDir } = makeEvidenceDir("rubric-missing");
    await expect(
      completePlaywrightScenario({
        projectPath: project,
        scenarioId: "scenario-rubric-missing",
        evidenceDir,
        recordedOutcome: { passed: true },
        rubricPath: "/nonexistent/path/rubric.json",
      }),
    ).rejects.toThrow("not found");
  });

  test("throws when rubric file lacks rubricId or criteria", async () => {
    const { project, evidenceDir } = makeEvidenceDir("rubric-malformed");
    const rubricPath = path.join(project, "bad-rubric.json");
    fs.writeFileSync(rubricPath, JSON.stringify({ description: "no id, no criteria" }));
    await expect(
      completePlaywrightScenario({
        projectPath: project,
        scenarioId: "scenario-malformed-rubric",
        evidenceDir,
        recordedOutcome: { passed: true },
        rubricPath,
      }),
    ).rejects.toThrow("rubricId or criteria");
  });

  test("auto-grade dispatch happy path with rule-domain criterion", async () => {
    const { project, evidenceDir } = makeEvidenceDir("rubric-happy");
    const artifactPath = path.join(project, "artifact.txt");
    fs.writeFileSync(artifactPath, "MARKER passes");

    const rubricPath = path.join(project, "rubric.json");
    fs.writeFileSync(
      rubricPath,
      JSON.stringify({
        rubricId: "rubric-test-happy",
        criteria: [
          {
            criterionId: "c-marker-present",
            title: "Marker token present",
            rubricDomain: "rule",
            weightInRubric: 1.0,
            passFailLogic: { threshold: 1, scale: "pass-fail" },
            validationExpression: "^MARKER",
          },
        ],
      }),
    );

    const result = await completePlaywrightScenario({
      projectPath: project,
      scenarioId: "scenario-rubric-happy",
      evidenceDir,
      recordedOutcome: { passed: true },
      rubricPath,
      artifactPath,
    });

    expect(result.gradingResult).toBeDefined();
    expect(result.gradingResult!.rubricId).toBe("rubric-test-happy");
    expect(result.gradingResult!.passedCriteria).toBe(1);
    expect(result.gradingResult!.failedCriteria).toBe(0);
  });
});
