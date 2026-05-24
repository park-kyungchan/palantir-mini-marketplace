// palantir-mini v3.4.0 — complete-playwright-scenario sibling: types
// Extracted during N1-LARGE wave 2 decomp.

import type { PlaywrightFailureClass } from "../../../lib/event-log/types";

export interface PlaywrightStepResult {
  stepIndex:   number;
  label?:      string;
  status:      "passed" | "failed" | "skipped";
  durationMs?: number;
  error?:      string;
}

export interface PlaywrightOutcome {
  passed:           boolean;
  failedStep?:      string;
  failureMessage?:  string;
  failureClass?:    PlaywrightFailureClass;
  stepResults?:     PlaywrightStepResult[];
  durationMs?:      number;
  retries?:         number;
  evidenceArtifacts?: {
    screenshots?:     string[];
    consoleLogPath?:  string;
    networkLogPath?:  string;
    domSnapshotPath?: string;
  };
}

export interface CompletePlaywrightScenarioArgs {
  projectPath?:     string;
  scenarioId:       string;
  evidenceDir:      string;
  /** Inline outcome from Evaluator agent. If omitted, attempts to read evidenceDir/outcome.json. */
  recordedOutcome?: PlaywrightOutcome;
  /** If provided, auto-dispatches grade_outcome_with_rubric on completion. */
  rubricPath?:      string;
  /** Artifact path passed to grading. Default: evidenceDir. */
  artifactPath?:    string;
  sprintNumber?:    number;
  iteration?:       number;
  loopId?:          string;
}

export interface CompletePlaywrightScenarioResult {
  scenarioId:               string;
  outcome:                  PlaywrightOutcome;
  outcomeCanonicalPath:     string;
  scenarioCompletedEventId: string;
  /** Present iff rubricPath was provided AND grading dispatched successfully. */
  gradingResult?: {
    rubricId:         string;
    overallScore:     number;
    maxPossibleScore: number;
    passedCriteria:   number;
    failedCriteria:   number;
  };
}
