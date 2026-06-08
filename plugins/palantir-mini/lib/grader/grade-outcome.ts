// palantir-mini — lib/grader/grade-outcome.ts (W3e-1)
//
// Runtime-NEUTRAL rubric outcome grader — PURE core (no IO, no emit).
//
// Scores an artifact against a GradingRubric (AIP Evals 5-evaluator taxonomy).
// Deterministic domains (rule / hybrid / human) are scored in-process; the
// effectful domains (code shell-exec, model LLM-judge) are delegated to INJECTED
// evaluators — the bridge handler wires the real implementations (execSync for
// code, lib/grader/dispatch-adapter for model). This keeps the core pure +
// fully unit-testable with stub evaluators, mirroring lib/fde-build/rubric-grader.ts.
//
// Backs the grade_outcome_with_rubric MCP handler.
//
// Authority: runtime-overlay/schemas-snapshot/ontology/primitives/grading-criterion.ts
//            + grading-rubric.ts (GradingCriterionDeclaration / RubricDomain / PassFailLogic)

import type {
  RubricDomain,
  PassFailLogic,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/grading-criterion";
import type { GraderEffortLevel } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/grader-effort";

// ───────────────────────────────────────────────────────────────────────────
// Input shapes (a permissive subset of GradingCriterionDeclaration — only the
// fields the grader reads; accepts the `subCriteria` short-form alias).
// ───────────────────────────────────────────────────────────────────────────

export interface OutcomeCriterionInput {
  readonly criterionId: string;
  readonly title?: string;
  readonly rubricDomain: RubricDomain;
  readonly weightInRubric: number;
  readonly passFailLogic: PassFailLogic;
  /** code: shell command (exit 0 = pass); rule: regex (^…) or JSONSchema ({…}). */
  readonly validationExpression?: string;
  /** model/hybrid leaf: LLM-judge prompt. */
  readonly scoringPrompt?: string;
  readonly tier?: GraderEffortLevel;
  /** canonical hybrid sub-criterion refs (resolved by the handler when registry-backed). */
  readonly subCriteriaRids?: readonly string[];
  /** B-29 short-form alias: inline hybrid sub-criteria. */
  readonly subCriteria?: readonly OutcomeCriterionInput[];
}

export interface OutcomeRubricInput {
  readonly rubricId: string;
  readonly criteria: readonly OutcomeCriterionInput[];
}

export interface CriterionScore {
  readonly criterionId: string;
  readonly rubricDomain: RubricDomain;
  /** normalized 0..1 */
  readonly score: number;
  readonly passed: boolean;
  readonly evidenceUrl?: string;
  readonly durationMs: number;
  readonly reasoning?: string;
}

export interface GradeOutcomeResult {
  readonly rubricId: string;
  readonly overallScore: number;
  readonly maxPossibleScore: number;
  readonly passedCriteria: number;
  readonly failedCriteria: number;
  readonly humanReviewRequired: number;
  readonly perCriterion: readonly CriterionScore[];
  readonly reasoning: string;
}

/** Injected model-domain evaluator (handler delegates to dispatch-adapter). */
export type ModelGrader = (criterion: {
  criterionId: string;
  scoringPrompt?: string;
  tier?: GraderEffortLevel;
}) => Promise<{ score: number; reasoning?: string; evidence?: readonly string[] }>;

/** Injected code-domain evaluator (handler runs validationExpression as a shell command). */
export type CodeEvaluator = (criterion: {
  criterionId: string;
  validationExpression?: string;
}) =>
  | Promise<{ passed: boolean; reasoning?: string; evidence?: readonly string[] }>
  | { passed: boolean; reasoning?: string; evidence?: readonly string[] };

export interface GradeOutcomeOptions {
  readonly rubric: OutcomeRubricInput;
  /** evidence bag for rule-domain checks (regex / minimal JSONSchema). */
  readonly evidence?: Record<string, unknown>;
  readonly modelGrader?: ModelGrader;
  readonly codeEvaluator?: CodeEvaluator;
  /** injectable clock for deterministic durationMs in tests. */
  readonly now?: () => number;
}

// ───────────────────────────────────────────────────────────────────────────
// Scale helpers
// ───────────────────────────────────────────────────────────────────────────

function scaleMaxFor(scale: PassFailLogic["scale"]): number {
  return scale === "0-10" ? 10 : 1; // "0-1" and "pass-fail" max at 1
}

function clampToScale(raw: number, scale: PassFailLogic["scale"]): number {
  const max = scaleMaxFor(scale);
  if (Number.isNaN(raw)) return 0;
  return Math.max(0, Math.min(max, raw));
}

// ───────────────────────────────────────────────────────────────────────────
// Deterministic rule-domain check (regex OR minimal JSONSchema over evidence)
// ───────────────────────────────────────────────────────────────────────────

function evaluateRuleExpression(
  expression: string | undefined,
  evidence: Record<string, unknown> | undefined,
): { passed: boolean; reasoning: string } {
  if (expression === undefined || expression.trim().length === 0) {
    return { passed: false, reasoning: "rule criterion has no validationExpression." };
  }
  const expr = expression.trim();
  const evidenceText = JSON.stringify(evidence ?? {});

  if (expr.startsWith("{")) {
    // Minimal JSONSchema: honor a top-level `required: string[]` against evidence.
    try {
      const schema = JSON.parse(expr) as { required?: unknown };
      const required = Array.isArray(schema.required) ? (schema.required as unknown[]) : [];
      const obj = (evidence ?? {}) as Record<string, unknown>;
      const missing = required.filter((k) => typeof k !== "string" || !(k in obj));
      if (missing.length > 0) {
        return { passed: false, reasoning: `evidence missing required keys: ${missing.join(", ")}.` };
      }
      return { passed: true, reasoning: "evidence satisfies required-key schema." };
    } catch {
      return { passed: false, reasoning: "validationExpression is not parseable JSONSchema." };
    }
  }

  // Regex match against the serialized evidence.
  try {
    const re = new RegExp(expr);
    const passed = re.test(evidenceText);
    return {
      passed,
      reasoning: passed
        ? `evidence matches /${expr}/.`
        : `evidence does not match /${expr}/.`,
    };
  } catch {
    return { passed: false, reasoning: `validationExpression is not a valid regex: ${expr}.` };
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Hybrid combinator
// ───────────────────────────────────────────────────────────────────────────

function combineHybrid(
  subScores: readonly { normalized: number; passed: boolean; weight: number }[],
  combinator: PassFailLogic["combinator"],
): { normalized: number; passed: boolean } {
  if (subScores.length === 0) return { normalized: 0, passed: false };
  switch (combinator) {
    case "all-pass":
      return {
        normalized: subScores.every((s) => s.passed) ? 1 : 0,
        passed: subScores.every((s) => s.passed),
      };
    case "min": {
      const min = Math.min(...subScores.map((s) => s.normalized));
      return { normalized: min, passed: subScores.every((s) => s.passed) };
    }
    case "weighted": {
      const totalW = subScores.reduce((a, s) => a + s.weight, 0) || 1;
      const w = subScores.reduce((a, s) => a + s.normalized * s.weight, 0) / totalW;
      return { normalized: w, passed: w >= 0.5 };
    }
    case "avg":
    default: {
      const avg = subScores.reduce((a, s) => a + s.normalized, 0) / subScores.length;
      return { normalized: avg, passed: avg >= 0.5 };
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Per-criterion scorer
// ───────────────────────────────────────────────────────────────────────────

async function scoreCriterion(
  criterion: OutcomeCriterionInput,
  opts: GradeOutcomeOptions,
  now: () => number,
): Promise<CriterionScore> {
  const started = now();
  const scale = criterion.passFailLogic.scale;
  const max = scaleMaxFor(scale);
  const threshold = criterion.passFailLogic.threshold;

  const finish = (
    rawScore: number,
    passed: boolean,
    reasoning?: string,
    evidence?: readonly string[],
  ): CriterionScore => ({
    criterionId: criterion.criterionId,
    rubricDomain: criterion.rubricDomain,
    score: max === 0 ? 0 : clampToScale(rawScore, scale) / max,
    passed,
    evidenceUrl: evidence && evidence.length > 0 ? evidence[0] : undefined,
    durationMs: now() - started,
    reasoning,
  });

  switch (criterion.rubricDomain) {
    case "rule": {
      const r = evaluateRuleExpression(criterion.validationExpression, opts.evidence);
      return finish(r.passed ? max : 0, r.passed, r.reasoning);
    }
    case "code": {
      if (opts.codeEvaluator === undefined) {
        return finish(0, false, "codeEvaluator not provided; code-domain criterion defaults to score=0.");
      }
      const r = await opts.codeEvaluator({
        criterionId: criterion.criterionId,
        validationExpression: criterion.validationExpression,
      });
      return finish(r.passed ? max : 0, r.passed, r.reasoning, r.evidence);
    }
    case "model": {
      if (opts.modelGrader === undefined) {
        return finish(0, false, "modelGrader not provided; model-domain criterion defaults to score=0. Wire pm_grader_dispatch for real evaluation.");
      }
      const r = await opts.modelGrader({
        criterionId: criterion.criterionId,
        scoringPrompt: criterion.scoringPrompt,
        tier: criterion.tier,
      });
      const raw = clampToScale(r.score, scale);
      return finish(raw, raw >= threshold, r.reasoning, r.evidence);
    }
    case "human": {
      return finish(0, false, "human-domain criterion requires manual review.");
    }
    case "hybrid": {
      const subs = criterion.subCriteria ?? [];
      if (subs.length === 0) {
        return finish(0, false, "hybrid criterion requires inline `subCriteria` (subCriteriaRids resolution is registry-backed and not inlined).");
      }
      const subScores = await Promise.all(subs.map((s) => scoreCriterion(s, opts, now)));
      const combined = combineHybrid(
        subs.map((sub, i) => {
          const s = subScores[i];
          return { normalized: s?.score ?? 0, passed: s?.passed ?? false, weight: sub.weightInRubric };
        }),
        criterion.passFailLogic.combinator,
      );
      return finish(combined.normalized * max, combined.passed, `hybrid(${criterion.passFailLogic.combinator ?? "avg"}) over ${subs.length} sub-criteria.`);
    }
    case "simulator":
    case "visual":
    default: {
      return finish(0, false, `rubricDomain "${criterion.rubricDomain}" is not supported by the neutral grader (no backend); criterion skipped.`);
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Main grader
// ───────────────────────────────────────────────────────────────────────────

/**
 * Grade an artifact against a rubric. Pure: all effects are injected (modelGrader,
 * codeEvaluator). Aggregates weighted normalized scores; counts pass/fail and
 * human-review-required criteria separately.
 */
export async function gradeOutcome(opts: GradeOutcomeOptions): Promise<GradeOutcomeResult> {
  const now = opts.now ?? (() => Date.now());
  const { rubric } = opts;

  const perCriterion: CriterionScore[] = [];
  for (const criterion of rubric.criteria) {
    perCriterion.push(await scoreCriterion(criterion, opts, now));
  }

  let overallScore = 0;
  let maxPossibleScore = 0;
  let passedCriteria = 0;
  let failedCriteria = 0;
  let humanReviewRequired = 0;

  perCriterion.forEach((score, i) => {
    const weight = rubric.criteria[i]?.weightInRubric ?? 0;
    maxPossibleScore += weight;
    overallScore += score.score * weight;
    if (score.rubricDomain === "human") {
      humanReviewRequired += 1;
    } else if (score.passed) {
      passedCriteria += 1;
    } else {
      failedCriteria += 1;
    }
  });

  const round4 = (n: number): number => Math.round(n * 10000) / 10000;

  return {
    rubricId: rubric.rubricId,
    overallScore: round4(overallScore),
    maxPossibleScore: round4(maxPossibleScore),
    passedCriteria,
    failedCriteria,
    humanReviewRequired,
    perCriterion,
    reasoning:
      `Graded ${perCriterion.length} criteria: ${passedCriteria} passed, ${failedCriteria} failed, ` +
      `${humanReviewRequired} need human review. Overall ${round4(overallScore)} / ${round4(maxPossibleScore)}.`,
  };
}
