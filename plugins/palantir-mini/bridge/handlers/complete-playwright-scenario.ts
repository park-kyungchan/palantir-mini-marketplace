// palantir-mini v3.4.0 — MCP tool handler: complete_playwright_scenario
// Domain: LEARN (prim-learn-04 PlaywrightScenario completion side)
//
// Thin orchestrator after v3.4.0 N1-LARGE wave 2 decomposition. Logic extracted
// to ./complete-playwright-scenario/{types, failure-classify, resolve-outcome, grading}.ts.
//
// Closes harness production loop (Session 3 Slice 2 / B-14): accepts the
// Evaluator agent's recorded outcome (inline or read from evidenceDir/outcome.json),
// validates + classifies failure mode, canonicalizes outcome.json on disk,
// emits playwright_scenario_executed{state}, optionally auto-dispatches
// grade_outcome_with_rubric so the Evaluator score lands in the same chain.
//
// MCP-handler architectural constraint: this handler does NOT itself invoke
// browser MCP tools. The Evaluator agent stays responsible for browser dispatch.
//
// Authority: ~/.claude/schemas/ontology/primitives/playwright-scenario.ts
// Rules: 07 (file-ownership), 10 (5-dim emit)

import * as fs from "fs";
import * as path from "path";
import { emit, projectRoot as resolveProjectRoot } from "../../scripts/log";
import { canonicalize } from "./complete-playwright-scenario/failure-classify";
import { readMcpToolBinding, resolveOutcome } from "./complete-playwright-scenario/resolve-outcome";
import { dispatchGrading } from "./complete-playwright-scenario/grading";
import type {
  CompletePlaywrightScenarioArgs,
  CompletePlaywrightScenarioResult,
} from "./complete-playwright-scenario/types";

// Backward-compat re-exports
export type {
  CompletePlaywrightScenarioArgs,
  CompletePlaywrightScenarioResult,
  PlaywrightOutcome,
  PlaywrightStepResult,
} from "./complete-playwright-scenario/types";
export {
  classifyPlaywrightFailure,
  isPlaywrightOutcomeShape,
} from "./complete-playwright-scenario/failure-classify";

export default async function completePlaywrightScenario(
  rawArgs: unknown,
): Promise<CompletePlaywrightScenarioResult> {
  const args = (rawArgs ?? {}) as CompletePlaywrightScenarioArgs;
  if (!args.scenarioId || typeof args.scenarioId !== "string") {
    throw new Error("complete_playwright_scenario: `scenarioId` required");
  }
  if (!args.evidenceDir || typeof args.evidenceDir !== "string") {
    throw new Error("complete_playwright_scenario: `evidenceDir` required");
  }

  const project = args.projectPath ?? resolveProjectRoot();
  const evidenceDir = path.isAbsolute(args.evidenceDir)
    ? args.evidenceDir
    : path.join(project, args.evidenceDir);

  const outcome = canonicalize(resolveOutcome(args, evidenceDir));

  fs.mkdirSync(evidenceDir, { recursive: true });
  const outcomeCanonicalPath = path.join(evidenceDir, "outcome.json");
  fs.writeFileSync(outcomeCanonicalPath, JSON.stringify(outcome, null, 2) + "\n", "utf8");

  const stepCount = outcome.stepResults?.length ?? 0;
  const mcpToolBinding = readMcpToolBinding(evidenceDir);
  const eventId = `evt-pwc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  await emit({
    type: "playwright_scenario_executed",
    payload: {
      project,
      scenarioId:    args.scenarioId,
      evidenceDir,
      mcpToolBinding,
      sprintNumber:  args.sprintNumber,
      iteration:     args.iteration,
      loopId:        args.loopId,
      stepCount,
      state:         outcome.passed ? "completed" : "failed",
      outcome: {
        passed:       outcome.passed,
        ...(outcome.failedStep   ? { failedStep:   outcome.failedStep }   : {}),
        ...(outcome.failureClass ? { failureClass: outcome.failureClass } : {}),
        ...(typeof outcome.durationMs === "number" ? { durationMs: outcome.durationMs } : {}),
        ...(typeof outcome.retries    === "number" ? { retries:    outcome.retries    } : {}),
      },
    },
    toolName: "complete_playwright_scenario",
    cwd:      project,
    reasoning: outcome.passed
      ? `Scenario ${args.scenarioId} completed PASS in ${outcome.durationMs ?? "?"}ms (${stepCount} steps)`
      : `Scenario ${args.scenarioId} completed FAIL — ${outcome.failureClass ?? "other"} at "${outcome.failedStep ?? "unknown step"}"`,
  });

  await dispatchGrading(args as unknown as Record<string, unknown>);
  const gradingResult = undefined;

  return {
    scenarioId:               args.scenarioId,
    outcome,
    outcomeCanonicalPath,
    scenarioCompletedEventId: eventId,
    gradingResult,
  };
}
