// palantir-mini v3.3.0 — grade-outcome dispatcher + hybrid + human (B.1)
// Extracted from grade-outcome-with-rubric.ts. Internal cycle (gradeOneCriterion ↔ gradeHybrid)
// is contained within this file to avoid cross-file circular imports.

import { gradeCode } from "./code";
import { gradeRule } from "./rule";
import { gradeModel } from "./model";
import { gradeVisual } from "./visual";
import { gradeWithSimulator } from "../grade-with-simulator";
import { resolveSubCriteriaRids } from "./types";
import type { GradingCriterionLite, CriterionScore } from "./types";

function gradeHuman(criterion: GradingCriterionLite): CriterionScore {
  return {
    criterionId: criterion.criterionId,
    rubricDomain: "human",
    score: 0,
    weightedScore: 0,
    passFail: "needs_human_review",
    reasoning: "human-domain criterion — out-of-band review required.",
  };
}

function gradeHybrid(
  criterion: GradingCriterionLite,
  criteriaMap: Map<string, GradingCriterionLite>,
  artifactPath: string,
  contextDir: string,
  evidenceDir: string | undefined,
  specPath: string | undefined,
  visited: Set<string>,
): CriterionScore {
  if (visited.has(criterion.criterionId)) {
    throw new Error(`grade_hybrid: cycle detected at ${criterion.criterionId}`);
  }

  const rids = resolveSubCriteriaRids(criterion);
  const subResults: CriterionScore[] = [];

  for (const rid of rids) {
    const sub = criteriaMap.get(rid);
    if (!sub) {
      subResults.push({
        criterionId: rid,
        rubricDomain: "hybrid",
        score: 0,
        weightedScore: 0,
        passFail: "needs_human_review",
        reasoning: `sub-criterion ${rid} not found in rubric.criteria`,
      });
      continue;
    }
    const childVisited = new Set(visited);
    childVisited.add(criterion.criterionId);
    subResults.push(
      gradeOneCriterion(sub, criteriaMap, artifactPath, contextDir, evidenceDir, specPath, childVisited),
    );
  }

  const combinator = criterion.passFailLogic.combinator ?? "weighted";
  const subScores = subResults.map((s) => s.score);
  const anyHumanReview = subResults.some((s) => s.passFail === "needs_human_review");
  const anyFail = subResults.some((s) => s.passFail === "fail");

  let score: number;
  let passFail: "pass" | "fail" | "needs_human_review";

  switch (combinator) {
    case "min": {
      score = subScores.length > 0 ? Math.min(...subScores) : 0;
      if (anyHumanReview) passFail = "needs_human_review";
      else if (anyFail) passFail = "fail";
      else passFail = "pass";
      break;
    }
    case "avg": {
      score = subScores.length > 0 ? subScores.reduce((s, x) => s + x, 0) / subScores.length : 0;
      if (anyHumanReview) passFail = "needs_human_review";
      else passFail = score >= criterion.passFailLogic.threshold ? "pass" : "fail";
      break;
    }
    case "weighted": {
      const totalWeight = subResults.reduce((s, r) => {
        const sub = criteriaMap.get(r.criterionId);
        return s + (sub?.weightInRubric ?? 0);
      }, 0);
      if (totalWeight === 0) {
        score = subScores.length > 0 ? subScores.reduce((s, x) => s + x, 0) / subScores.length : 0;
      } else {
        score = subResults.reduce((s, r) => {
          const sub = criteriaMap.get(r.criterionId);
          return s + r.score * (sub?.weightInRubric ?? 0);
        }, 0) / totalWeight;
      }
      if (anyHumanReview) passFail = "needs_human_review";
      else passFail = score >= criterion.passFailLogic.threshold ? "pass" : "fail";
      break;
    }
    case "all-pass": {
      const maxForScale = criterion.passFailLogic.scale === "0-10" ? 10 : 1;
      const allPass = subResults.length > 0 && subResults.every((s) => s.passFail === "pass");
      score = allPass ? maxForScale : 0;
      if (anyHumanReview) passFail = "needs_human_review";
      else passFail = allPass ? "pass" : "fail";
      break;
    }
    default: {
      score = subScores.length > 0 ? subScores.reduce((s, x) => s + x, 0) / subScores.length : 0;
      if (anyHumanReview) passFail = "needs_human_review";
      else passFail = score >= criterion.passFailLogic.threshold ? "pass" : "fail";
    }
  }

  const evidenceCited = Array.from(new Set(subResults.flatMap((s) => s.evidenceCited ?? [])));
  const passes = subResults.filter((s) => s.passFail === "pass").length;

  return {
    criterionId: criterion.criterionId,
    rubricDomain: "hybrid",
    score,
    weightedScore: score * criterion.weightInRubric,
    passFail,
    reasoning: `hybrid combinator=${combinator} over ${subResults.length} subs; score=${score.toFixed(2)}; passes=${passes}/${subResults.length}`,
    evidenceCited: evidenceCited.length > 0 ? evidenceCited : undefined,
  };
}

export function gradeOneCriterion(
  criterion: GradingCriterionLite,
  criteriaMap: Map<string, GradingCriterionLite>,
  artifactPath: string,
  contextDir: string,
  evidenceDir: string | undefined,
  specPath: string | undefined,
  visited: Set<string>,
): CriterionScore {
  switch (criterion.rubricDomain) {
    case "code":
      return gradeCode(criterion, artifactPath, contextDir);
    case "rule":
      return gradeRule(criterion, artifactPath);
    case "model":
      return gradeModel(criterion, artifactPath, evidenceDir, specPath);
    case "human":
      return gradeHuman(criterion);
    case "hybrid":
      return gradeHybrid(criterion, criteriaMap, artifactPath, contextDir, evidenceDir, specPath, visited);
    // v3.9.1 W4.2 (P4) — simulator routing. Schemas v1.31.0 RubricDomain
    // enum extension. gradeWithSimulator reads dry-run artifact + queries
    // impact-graph for affected RIDs + returns impact-radius normalized score.
    case "simulator":
      return gradeWithSimulator(criterion, artifactPath, contextDir, evidenceDir, specPath);
    // sprint-049 Wave 3 W3.E — visual rubric (schemas v1.43.0 RubricDomain
    // extension). Stub wraps run_playwright_scenario screenshot evidence;
    // full Playwright integration deferred to Wave 4+.
    case "visual":
      return gradeVisual(criterion, artifactPath, evidenceDir, specPath);
  }
}
