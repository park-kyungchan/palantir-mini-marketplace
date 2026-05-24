// palantir-mini v3.4.0 — complete-playwright-scenario sibling: outcome resolution
// Inline-arg-wins / fallback-to-evidenceDir/outcome.json reader.

import * as fs from "fs";
import * as path from "path";
import { isPlaywrightOutcomeShape } from "./failure-classify";
import type { CompletePlaywrightScenarioArgs, PlaywrightOutcome } from "./types";

/**
 * Resolve PlaywrightOutcome from inline arg or evidenceDir/outcome.json.
 * Throws descriptive error when neither source yields a valid outcome shape.
 */
export function resolveOutcome(
  args: CompletePlaywrightScenarioArgs,
  evidenceDir: string,
): PlaywrightOutcome {
  if (args.recordedOutcome !== undefined) {
    if (!isPlaywrightOutcomeShape(args.recordedOutcome)) {
      throw new Error(
        "complete_playwright_scenario: `recordedOutcome` is not a valid PlaywrightOutcome (missing required `passed: boolean`)",
      );
    }
    return args.recordedOutcome;
  }

  const outcomePath = path.join(evidenceDir, "outcome.json");
  if (!fs.existsSync(outcomePath)) {
    throw new Error(
      `complete_playwright_scenario: no inline outcome and ${outcomePath} not found — Evaluator must write outcome.json or pass recordedOutcome`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(outcomePath, "utf8"));
  } catch (e) {
    throw new Error(
      `complete_playwright_scenario: outcome.json parse error at ${outcomePath}: ${(e as Error).message}`,
    );
  }
  if (!isPlaywrightOutcomeShape(parsed)) {
    throw new Error(
      `complete_playwright_scenario: outcome.json at ${outcomePath} missing required \`passed: boolean\``,
    );
  }
  return parsed;
}

/** Best-effort recover mcpToolBinding from scenario.json (default fallback). */
export function readMcpToolBinding(evidenceDir: string): string {
  const scenarioSpecPath = path.join(evidenceDir, "scenario.json");
  if (!fs.existsSync(scenarioSpecPath)) return "mcp__playwright__*";
  try {
    const spec = JSON.parse(fs.readFileSync(scenarioSpecPath, "utf8")) as { mcpToolBinding?: string };
    if (spec.mcpToolBinding) return spec.mcpToolBinding;
  } catch {
    // Best-effort — keep default binding
  }
  return "mcp__playwright__*";
}
