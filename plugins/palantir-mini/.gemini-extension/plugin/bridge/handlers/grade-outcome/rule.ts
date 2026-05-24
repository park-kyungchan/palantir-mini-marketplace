// palantir-mini v3.3.0 — grade-outcome rule-domain inline evaluator (B.1)
// Extracted from grade-outcome-with-rubric.ts. No agent spawn; regex / JSONSchema-lite.

import * as fs from "fs";
import type { GradingCriterionLite, CriterionScore } from "./types";

export function gradeRule(
  criterion: GradingCriterionLite,
  artifactPath: string,
): CriterionScore {
  const expr = criterion.validationExpression ?? "";
  try {
    const content = fs.readFileSync(artifactPath, "utf8");
    let passed = false;
    if (expr.startsWith("^")) {
      passed = new RegExp(expr).test(content);
    } else if (expr.startsWith("{")) {
      // JSONSchema-lite: very naive check — presence of required top-level keys
      const schema = JSON.parse(expr) as { required?: string[] };
      const parsed = JSON.parse(content);
      passed = (schema.required ?? []).every(
        (k) => parsed[k] !== undefined,
      );
    } else {
      passed = content.includes(expr);
    }
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "rule",
      score: passed ? 1 : 0,
      weightedScore: (passed ? 1 : 0) * criterion.weightInRubric,
      passFail: passed ? "pass" : "fail",
      reasoning: `Rule check (${expr}) on ${artifactPath}: ${passed ? "match" : "no match"}`,
    };
  } catch (e) {
    return {
      criterionId: criterion.criterionId,
      rubricDomain: "rule",
      score: 0,
      weightedScore: 0,
      passFail: "fail",
      reasoning: `Rule evaluation error: ${(e as Error).message}`,
    };
  }
}
