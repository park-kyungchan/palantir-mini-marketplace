// palantir-mini — MCP tool handler: grade_outcome_with_rubric (W3e-1)
//
// Thin wrapper over lib/grader/grade-outcome.ts (pure core). Validates input,
// resolves the rubric (inline or from GRADING_RUBRIC_REGISTRY), wires the two
// effectful evaluators (code → execSync shell; model → lib/grader/dispatch-adapter),
// runs the pure scorer, emits evaluator_strictness_probe per model criterion +
// grading_completed once, and returns GradeOutcomeResult.
//
// Runtime-neutral: code domain runs a shell command in the project dir; the model
// domain delegates to pm_grader_dispatch's pure dispatch fn (NOT an MCP self-call)
// whose spawn (claude -p / codex exec) is the adapter binding. Domains
// simulator/visual are not backed by a neutral backend and are skipped (score 0).

import { execSync } from "child_process";
import * as crypto from "crypto";
import { emit, projectRoot as resolveProjectRoot } from "../../scripts/log";
import {
  gradeOutcome,
  type GradeOutcomeResult,
  type OutcomeRubricInput,
  type OutcomeCriterionInput,
} from "../../lib/grader/grade-outcome";
import { dispatchGrader } from "../../lib/grader/dispatch-adapter";
import {
  GRADING_RUBRIC_REGISTRY,
  gradingRubricRid,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/grading-rubric";
import { GRADING_CRITERION_REGISTRY } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/grading-criterion";

export interface GradeOutcomeWithRubricArgs {
  projectPath?: string;
  /** Inline rubric (preferred). One of `rubric` or a registered `rubricId` is required. */
  rubric?: OutcomeRubricInput;
  /** Registered rubric id (resolved via GRADING_RUBRIC_REGISTRY + GRADING_CRITERION_REGISTRY). */
  rubricId?: string;
  /** The artifact/output being graded (required). */
  artifactPath: string;
  /** Evidence bag passed to rule-domain checks. */
  evidence?: Record<string, unknown>;
  sprintNumber?: number;
  iteration?: number;
  loopId?: string;
}

function sha256(s: string): string {
  return `sha256:${crypto.createHash("sha256").update(s).digest("hex").slice(0, 32)}`;
}

/** Resolve a rubric from inline input or the canonical registry. */
function resolveRubric(args: GradeOutcomeWithRubricArgs): OutcomeRubricInput | undefined {
  if (args.rubric && Array.isArray(args.rubric.criteria) && args.rubric.criteria.length > 0) {
    return args.rubric;
  }
  if (typeof args.rubricId === "string" && args.rubricId.length > 0) {
    const decl = GRADING_RUBRIC_REGISTRY.get(gradingRubricRid(args.rubricId));
    if (decl === undefined) return undefined;
    const criteria: OutcomeCriterionInput[] = [];
    for (const cRid of decl.criterionRids) {
      const c = GRADING_CRITERION_REGISTRY.get(cRid);
      if (c === undefined) continue;
      criteria.push({
        criterionId: String(c.criterionId),
        title: c.title,
        rubricDomain: c.rubricDomain,
        weightInRubric: c.weightInRubric,
        passFailLogic: c.passFailLogic,
        validationExpression: c.validationExpression,
        scoringPrompt: c.scoringPrompt,
        tier: c.tier,
        subCriteriaRids: c.subCriteriaRids,
      });
    }
    if (criteria.length === 0) return undefined;
    return { rubricId: String(decl.rubricId), criteria };
  }
  return undefined;
}

export default async function gradeOutcomeWithRubricHandler(
  rawArgs: unknown,
): Promise<GradeOutcomeResult> {
  const args = (rawArgs ?? {}) as GradeOutcomeWithRubricArgs;

  if (!args.artifactPath || typeof args.artifactPath !== "string") {
    throw new Error("grade_outcome_with_rubric: `artifactPath` (string) required");
  }

  const project = args.projectPath ?? resolveProjectRoot();

  const rubric = resolveRubric(args);
  if (rubric === undefined) {
    throw new Error(
      "grade_outcome_with_rubric: provide an inline `rubric` with criteria, or a `rubricId` registered in GRADING_RUBRIC_REGISTRY",
    );
  }

  const result = await gradeOutcome({
    rubric,
    evidence: args.evidence,
    // code domain: run validationExpression as a shell command in the project dir.
    codeEvaluator: (c) => {
      const expr = c.validationExpression;
      if (expr === undefined || expr.trim().length === 0) {
        return { passed: false, reasoning: "code criterion has no validationExpression." };
      }
      try {
        execSync(expr, {
          cwd: project,
          timeout: 30_000,
          stdio: ["ignore", "pipe", "pipe"],
        });
        return { passed: true, reasoning: `command exited 0: ${expr}` };
      } catch (e) {
        const err = e as { status?: number; message?: string };
        return {
          passed: false,
          reasoning: `command failed (status=${err.status ?? "?"}): ${expr}`,
        };
      }
    },
    // model domain: delegate to the pure dispatch fn (adapter selects the spawn).
    modelGrader: async (c) => {
      const r = await dispatchGrader({
        criterionId: c.criterionId,
        scoringPrompt: c.scoringPrompt ?? "",
        tier: c.tier,
        projectPath: project,
      });
      return { score: r.score, reasoning: r.reasoning, evidence: r.evidence };
    },
  });

  // Per model-criterion strictness probe (drift detection).
  for (const c of result.perCriterion) {
    if (c.rubricDomain !== "model") continue;
    await emit({
      type: "evaluator_strictness_probe",
      payload: {
        sprintNumber: args.sprintNumber ?? 0,
        iteration: args.iteration ?? 0,
        criterionHash: sha256(c.criterionId),
        score: c.score,
        evidenceCitationCount: c.evidenceUrl ? 1 : 0,
        failureClassCount: c.passed ? 0 : 1,
      } as Record<string, unknown>,
      toolName: "grade_outcome_with_rubric",
      cwd: project,
      reasoning: c.reasoning ?? `model criterion ${c.criterionId} scored ${c.score}`,
    });
  }

  await emit({
    type: "grading_completed",
    payload: {
      project,
      rubricId: result.rubricId,
      artifactPath: args.artifactPath,
      overallScore: result.overallScore,
      maxPossibleScore: result.maxPossibleScore,
      passedCriteria: result.passedCriteria,
      failedCriteria: result.failedCriteria,
      humanReviewRequired: result.humanReviewRequired,
      loopId: args.loopId,
      sprintNumber: args.sprintNumber,
      iteration: args.iteration,
    } as Record<string, unknown>,
    toolName: "grade_outcome_with_rubric",
    cwd: project,
    reasoning: result.reasoning,
  });

  return result;
}
