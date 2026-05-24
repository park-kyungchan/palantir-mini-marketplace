// palantir-mini v3.4.0 — complete-playwright-scenario sibling: optional auto-grade dispatch.

import * as fs from "fs";
import gradeOutcomeWithRubric from "../grade-outcome-with-rubric";
import type {
  CompletePlaywrightScenarioArgs,
  CompletePlaywrightScenarioResult,
} from "./types";

/**
 * If args.rubricPath is provided, dispatch grade_outcome_with_rubric inline.
 * Returns the grading summary or undefined when no rubric.
 */
export async function dispatchGrading(
  args: CompletePlaywrightScenarioArgs,
  project: string,
  evidenceDir: string,
): Promise<CompletePlaywrightScenarioResult["gradingResult"]> {
  if (!args.rubricPath || typeof args.rubricPath !== "string") return undefined;

  if (!fs.existsSync(args.rubricPath)) {
    throw new Error(`complete_playwright_scenario: rubricPath ${args.rubricPath} not found`);
  }
  let rubric: { rubricId: string; criteria: unknown[] };
  try {
    rubric = JSON.parse(fs.readFileSync(args.rubricPath, "utf8"));
  } catch (e) {
    throw new Error(
      `complete_playwright_scenario: rubric parse error at ${args.rubricPath}: ${(e as Error).message}`,
    );
  }
  if (!rubric.rubricId || !Array.isArray(rubric.criteria)) {
    throw new Error(
      `complete_playwright_scenario: rubric at ${args.rubricPath} missing rubricId or criteria array`,
    );
  }

  const grade = (await gradeOutcomeWithRubric({
    projectPath:  project,
    artifactPath: args.artifactPath ?? evidenceDir,
    rubric,
    evidenceDir,
    loopId:       args.loopId,
    sprintNumber: args.sprintNumber,
    iteration:    args.iteration,
  })) as {
    rubricId:         string;
    overallScore:     number;
    maxPossibleScore: number;
    passedCriteria:   number;
    failedCriteria:   number;
  };

  return {
    rubricId:         grade.rubricId,
    overallScore:     grade.overallScore,
    maxPossibleScore: grade.maxPossibleScore,
    passedCriteria:   grade.passedCriteria,
    failedCriteria:   grade.failedCriteria,
  };
}
