// palantir-mini v3.3.0 — grade-outcome code-domain external dispatcher (B.1)
// Extracted from grade-outcome-with-rubric.ts. Inline shell exec (30s timeout).

import { execSync } from "child_process";
import type { GradingCriterionLite, CriterionScore } from "./types";

export function gradeCode(
  criterion: GradingCriterionLite,
  _artifactPath: string,
  contextDir: string,
): CriterionScore {
  const expr = criterion.validationExpression ?? "";
  if (!expr) {
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "code",
      score: 0,
      weightedScore: 0,
      passFail: "fail",
      reasoning: "No validationExpression — cannot execute code criterion.",
    };
  }
  try {
    execSync(expr, {
      cwd: contextDir,
      timeout: 30_000,
      stdio: "pipe",
    });
    const scale = criterion.passFailLogic.scale;
    const score = scale === "0-10" ? 10 : 1;
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "code",
      score,
      weightedScore: score * criterion.weightInRubric,
      passFail: "pass",
      reasoning: `Shell passed: ${expr}`,
    };
  } catch (e) {
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "code",
      score: 0,
      weightedScore: 0,
      passFail: "fail",
      reasoning: `Shell failed: ${expr} — ${(e as Error).message.slice(0, 200)}`,
    };
  }
}
