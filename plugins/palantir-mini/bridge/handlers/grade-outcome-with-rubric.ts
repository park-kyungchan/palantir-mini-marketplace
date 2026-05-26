// palantir-mini v6.21.0 — MCP tool handler: grade_outcome_with_rubric
// Domain: LEARN (prim-data-08 GradingCriterion + prim-learn-02 LEARN evaluation)
//
// Thin orchestrator after v3.3.0 N1-LARGE wave 1 decomposition (PR composed-finding-walrus).
// Per-domain graders extracted to ./grade-outcome/{rule,code,model,dispatcher}.ts.
// Public API unchanged: default export + buildGraderModelEnv named export preserved.
//
//   - rubricDomain=code   → execute validationExpression inline (shell/regex)
//   - rubricDomain=rule   → evaluate validationExpression (regex / JSONSchema)
//   - rubricDomain=model  → runtime-gated model grader; Claude hosts use the
//                            Claude CLI adapter, non-Claude hosts return
//                            needs_human_review until a native grader exists
//   - rubricDomain=human  → emit a "needs_human_review" marker; returns partial
//   - rubricDomain=hybrid → recurse into subCriteriaRids per combinator
//
// v6.21.0 (sprint-111 PR 5.1): bypass guard for non-canonical rubrics.
//   When rubric.canonicalRubricRid is set but NOT in GRADING_RUBRIC_REGISTRY,
//   OR rubric.status is not "canonical", emit advisory validation_phase_completed
//   with errorClass="non_canonical_rubric_used". Continues execution (SOFT guard).
//   Bypass: PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS=1 (audited).
//   Per canonical plan v2 §4 row 5.1.
//
// Authority: ~/.claude/schemas/ontology/primitives/grading-criterion.ts
//            ~/.claude/schemas/ontology/primitives/grading-rubric.ts (v1.61.0)
//            ~/.claude/research/palantir-foundry/aip/aip-evals-*.md
//            ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §6.3

import * as path from "path";
import { createHash } from "crypto";
import { emit, projectRoot as resolveProjectRoot } from "../../scripts/log";
import { gradeOneCriterion } from "./grade-outcome/dispatcher";
import type {
  GradingCriterionLite,
  GradeOutcomeArgs,
  CriterionScore,
  GradeOutcomeResult,
} from "./grade-outcome/types";
import { GRADING_RUBRIC_REGISTRY, type GradingRubricRid } from "#schemas/ontology/primitives/grading-rubric";

// Backward-compat re-exports — consumers import buildGraderModelEnv + types from this file.
export { buildGraderModelEnv, gradeModel, resolveModelGraderHostRuntime } from "./grade-outcome/model";
export type {
  GradeOutcomeArgs,
  CriterionScore,
  GradeOutcomeResult,
  GradingRubric,
  GradingCriterionLite,
} from "./grade-outcome/types";

export default async function gradeOutcomeWithRubric(
  rawArgs: unknown,
): Promise<GradeOutcomeResult> {
  const args = (rawArgs ?? {}) as GradeOutcomeArgs;
  if (!args.artifactPath || !args.rubric) {
    throw new Error(
      "grade_outcome_with_rubric: `artifactPath` and `rubric` required",
    );
  }

  const project = args.projectPath ?? resolveProjectRoot();
  const contextDir = path.dirname(
    path.isAbsolute(args.artifactPath)
      ? args.artifactPath
      : path.join(project, args.artifactPath),
  );

  // v6.21.0 canonical-rubric bypass guard (sprint-111 PR 5.1).
  // When rubric.canonicalRubricRid is set but NOT registered (or status != "canonical"),
  // emit advisory validation_phase_completed. Execution CONTINUES (soft guard).
  // Bypass: PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS=1 (audited).
  const bypassActive = process.env["PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS"] === "1";
  if (bypassActive) {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "runtime",
        passed: true,
        errorClass: "canonical_rubric_bypass_invoked",
        rubricId: args.rubric.rubricId,
        canonicalRubricRid: args.rubric.canonicalRubricRid ?? null,
        bypassEnvVar: "PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS",
      } as Record<string, unknown>,
      toolName: "grade_outcome_with_rubric",
      cwd: project,
      reasoning: "Sprint-111 PR 5.1 — canonical-rubric-rid bypass guard invoked; PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS=1 set; skipping advisory per canonical plan v2 §4 row 5.1.",
    });
  } else {
    const canonicalRid = args.rubric.canonicalRubricRid;
    const isNonCanonical =
      canonicalRid !== undefined && !GRADING_RUBRIC_REGISTRY.isCanonical(canonicalRid as GradingRubricRid)
      || (canonicalRid === undefined && args.rubric.status !== undefined && args.rubric.status !== "canonical");
    if (isNonCanonical) {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "runtime",
          passed: false,
          errorClass: "non_canonical_rubric_used",
          rubricId: args.rubric.rubricId,
          canonicalRubricRid: canonicalRid ?? null,
          status: args.rubric.status ?? null,
          advisory: "Rubric is not registered as canonical; results may not be stable. Register via GRADING_RUBRIC_REGISTRY or set PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS=1 to silence.",
        } as Record<string, unknown>,
        toolName: "grade_outcome_with_rubric",
        cwd: project,
        reasoning: "Sprint-111 PR 5.1 — non-canonical rubric detected; emitting advisory per canonical plan v2 §4 row 5.1 + rule 16 §GradingRubric.",
      });
    }
  }

  const criteriaMap = new Map<string, GradingCriterionLite>();
  for (const c of args.rubric.criteria) {
    criteriaMap.set(c.criterionId, c);
  }

  const perCriterion: CriterionScore[] = [];
  const failedCriteriaIds: string[] = [];
  let overallScore = 0;
  let maxPossible = 0;
  let passed = 0;
  let failed = 0;
  let humanReview = 0;
  let weightSum = 0;

  for (const criterion of args.rubric.criteria) {
    weightSum += criterion.weightInRubric;
    const result = gradeOneCriterion(
      criterion,
      criteriaMap,
      args.artifactPath,
      contextDir,
      args.evidenceDir,
      args.specPath,
      new Set<string>(),
    );
    perCriterion.push(result);
    overallScore += result.weightedScore;
    const maxForThis =
      criterion.passFailLogic.scale === "0-10"
        ? 10
        : criterion.passFailLogic.scale === "0-1"
          ? 1
          : 1;
    maxPossible += maxForThis * criterion.weightInRubric;
    if (result.passFail === "pass") passed++;
    else if (result.passFail === "fail") {
      failed++;
      failedCriteriaIds.push(criterion.criterionId);
    }
    else humanReview++;

    // v2.18.0 W2 Evaluator Strictness Probe — per-criterion emission.
    if (args.sprintNumber !== undefined && args.iteration !== undefined) {
      const criterionHash = createHash("sha256")
        .update(criterion.criterionId)
        .update("|")
        .update(criterion.scoringPrompt ?? "")
        .digest("hex")
        .slice(0, 16);
      const evidenceCitationCount = Array.isArray(result.evidenceCited)
        ? result.evidenceCited.length
        : 0;
      const reasoningText = typeof result.reasoning === "string" ? result.reasoning : "";
      const failureClassCount = [
        /critical/i.test(reasoningText) ? 1 : 0,
        /major/i.test(reasoningText) ? 1 : 0,
        /minor/i.test(reasoningText) ? 1 : 0,
      ].reduce((acc, v) => acc + v, 0);
      await emit({
        type: "evaluator_strictness_probe",
        payload: {
          sprintNumber: args.sprintNumber,
          iteration: args.iteration,
          criterionHash,
          score: result.score,
          evidenceCitationCount,
          failureClassCount,
        },
        toolName: "grade_outcome_with_rubric",
        cwd: project,
        reasoning: `strictness-probe ${criterion.criterionId} iter ${args.iteration} sprint ${args.sprintNumber}`,
        hypothesis: "Per-criterion probes enable strictness drift audit across iterations.",
      });
    }
  }

  await emit({
    type: "grading_completed",
    payload: {
      project,
      rubricId: args.rubric.rubricId,
      artifactPath: args.artifactPath,
      overallScore,
      maxPossibleScore: maxPossible,
      passedCriteria: passed,
      failedCriteria: failed,
      humanReviewRequired: humanReview,
      loopId: args.loopId,
      sprintNumber: args.sprintNumber,
      iteration: args.iteration,
    },
    toolName: "grade_outcome_with_rubric",
    cwd: project,
    reasoning: `Rubric ${args.rubric.rubricId} scored: ${passed}/${args.rubric.criteria.length} pass, ${failed} fail, ${humanReview} human-review. Weighted ${overallScore.toFixed(2)}/${maxPossible.toFixed(2)}.`,
  });

  return {
    rubricId: args.rubric.rubricId,
    artifactPath: args.artifactPath,
    overallScore,
    maxPossibleScore: maxPossible,
    perCriterion,
    passedCriteria: passed,
    failedCriteria: failed,
    failedCriteriaIds,
    humanReviewRequired: humanReview,
    weightSumCheck: weightSum,
  };
}
