// palantir-mini v4.6.0 — grade-outcome visual-domain handler stub (W3.E)
//
// Pairs with RubricDomain="visual" (schemas v1.43.0 grading-criterion.ts).
// Full Playwright integration is W4+; this stub:
//   1. Returns `needs_human_review` when evidenceDir is absent or empty —
//      caller must run `run_playwright_scenario` MCP first to populate
//      screenshot evidence.
//   2. When evidenceDir contains ≥1 PNG file, returns `pass` citing the
//      first found screenshot (scaffold for W4 diff-scoring logic).
//
// Signature mirrors `gradeModel` in model.ts: same args, same CriterionScore
// return shape, no subprocess spawn.
//
// Authority: ~/.claude/plans/mellow-plotting-oasis.md §Wave 3 W3.E
//            rule 16 v4.1.0 §GradingRubric ("simulator" + visual domains)
//            run_playwright_scenario MCP (bridge/handlers/run-playwright-scenario.ts)

import * as fs from "fs";
import * as path from "path";
import type { GradingCriterionLite, CriterionScore } from "./types";

/**
 * Grade a visual criterion against Playwright-produced screenshot evidence.
 *
 * @param criterion  Must have rubricDomain="visual". scoringPrompt is optional;
 *                   when present it signals the caller intended a model-assisted
 *                   diff review — still returns needs_human_review until W4.
 * @param artifactPath  Path to the artifact under review (used for criterionId
 *                      tracing only; actual scoring uses evidenceDir screenshots).
 * @param evidenceDir   Directory produced by `run_playwright_scenario` MCP
 *                      containing PNG screenshots + optional console/network logs.
 *                      When absent or empty → needs_human_review.
 * @param specPath      Optional spec path (reserved for W4 diff-scoring context).
 */
export function gradeVisual(
  criterion: GradingCriterionLite,
  artifactPath: string,
  evidenceDir?: string,
  specPath?: string,
): CriterionScore {
  // Unused in stub — reserved for W4 diff-scoring context injection.
  void artifactPath;
  void specPath;

  // Guard: no evidenceDir provided
  if (!evidenceDir) {
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "visual",
      score: 0,
      weightedScore: 0,
      passFail: "needs_human_review",
      reasoning:
        "visual rubric requires Playwright scenario evidence — call run_playwright_scenario MCP first to populate evidenceDir, then re-grade.",
    };
  }

  // Guard: evidenceDir exists but is empty (or not accessible)
  let pngFiles: string[] = [];
  try {
    const entries = fs.readdirSync(evidenceDir);
    pngFiles = entries.filter((e) => e.toLowerCase().endsWith(".png"));
  } catch {
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "visual",
      score: 0,
      weightedScore: 0,
      passFail: "needs_human_review",
      reasoning: `visual rubric: evidenceDir not readable (${evidenceDir}) — call run_playwright_scenario MCP first to populate evidenceDir, then re-grade.`,
    };
  }

  if (pngFiles.length === 0) {
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "visual",
      score: 0,
      weightedScore: 0,
      passFail: "needs_human_review",
      reasoning:
        "visual rubric requires Playwright scenario evidence — call run_playwright_scenario MCP first to populate evidenceDir, then re-grade.",
    };
  }

  // Stub pass path: evidence present → optimistic pass scaffold for W4 diff.
  // W4 will replace this with pixel-diff / LLM-vision scoring against specPath.
  const firstScreenshot = path.join(evidenceDir, pngFiles[0]!);
  const scale = criterion.passFailLogic.scale;
  const score = scale === "0-1" ? 1 : scale === "0-10" ? 10 : 1;

  return {
    criterionId: criterion.criterionId,
    rubricDomain: "visual",
    score,
    weightedScore: score * criterion.weightInRubric,
    passFail: "pass",
    reasoning: `visual rubric stub (W3.E): screenshot evidence found at ${firstScreenshot}. Full pixel-diff scoring deferred to W4 Playwright integration.`,
    evidenceCited: pngFiles.map((f) => path.join(evidenceDir, f)),
  };
}
