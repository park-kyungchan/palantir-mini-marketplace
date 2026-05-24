// palantir-mini v3.3.0 — grade-outcome shared types + helpers (B.1 decomposition)
// Extracted from grade-outcome-with-rubric.ts (606 LOC) per N1-LARGE wave 1.

export interface GradingCriterionLite {
  criterionId: string;
  title: string;
  /** v3.9.1 W4.2 (P4): + "simulator" — schemas v1.31.0 RubricDomain extension.
   *  v4.6.0 W3.E: + "visual" — W3.E visual rubric domain for screenshot-diff scoring. */
  rubricDomain: "code" | "rule" | "model" | "human" | "hybrid" | "simulator" | "visual";
  passFailLogic: { threshold: number; scale: "0-1" | "0-10" | "pass-fail"; combinator?: "min" | "avg" | "weighted" | "all-pass" };
  weightInRubric: number;
  evidenceSchema?: string;
  scoringPrompt?: string;
  validationExpression?: string;
  subCriteriaRids?: string[];
  /** B-29 (harness-h4 canary): compatibility alias — authored rubrics often
   *  use the shorter field name. `resolveSubCriteriaRids()` reads either. */
  subCriteria?: string[];
  /**
   * v4.6.0 W3.B: 5-level grader-effort tier — drives pm_grader_dispatch
   * model selection + Claude Code CLI /effort flag mapping.
   * Absent / undefined → treated as "normal" (Sonnet 4.6 default).
   * Maps to GraderEffortLevel from schemas v1.42.0 grader-effort.ts.
   */
  tier?: "none" | "low" | "normal" | "high" | "critical";
}

export interface GradingRubric {
  rubricId: string;
  criteria: GradingCriterionLite[];
  /** v6.21.0 (sprint-111 PR 5.1): optional canonical-rubric fields mirrored from GradingRubricDeclaration.
   *  When canonicalRubricRid is set but NOT in GRADING_RUBRIC_REGISTRY, an advisory is emitted.
   *  When status === "canonical" the rubric is accepted without advisory.
   */
  canonicalRubricRid?: string;
  status?: "draft" | "canonical" | "deprecated";
}

export interface GradeOutcomeArgs {
  projectPath?: string;
  /** Absolute or project-relative path to the artifact(s) being graded */
  artifactPath: string;
  /** Rubric JSON — ordered Set<GradingCriterion> */
  rubric: GradingRubric;
  /** Optional evidence bundle directory (from run_playwright_scenario output) */
  evidenceDir?: string;
  /** Optional spec path (for model graders to ground judgment) */
  specPath?: string;
  /** Optional loop + iteration context for event cross-reference */
  loopId?: string;
  sprintNumber?: number;
  iteration?: number;
}

export interface CriterionScore {
  criterionId: string;
  rubricDomain: string;
  score: number;
  weightedScore: number;
  passFail: "pass" | "fail" | "needs_human_review";
  reasoning: string;
  evidenceCited?: string[];
}

export interface GradeOutcomeResult {
  rubricId: string;
  artifactPath: string;
  overallScore: number;
  maxPossibleScore: number;
  perCriterion: CriterionScore[];
  passedCriteria: number;
  /**
   * Count of individual criteria where passFail === "fail".
   * v4.5.0 W2.A1: also see failedCriteriaIds for the ordered list of failing
   * criterionIds — the hook (harness-analyzer-trigger) reads failedCriteria
   * (number) first, then falls back to perCriterion[].passFail.
   */
  failedCriteria: number;
  /**
   * v4.5.0 W2.A1: ordered array of criterionIds where passFail === "fail".
   * Companion to failedCriteria (number). Populated on every fail-verdict path
   * so the harness-analyzer-trigger hook has a robust signal even when the
   * numeric count is ambiguous (e.g. all-human-review rubric edge case).
   */
  failedCriteriaIds: string[];
  humanReviewRequired: number;
  weightSumCheck: number;
}

/** B-29 (harness-h4 canary): accept `subCriteriaRids` (canonical) OR
 *  `subCriteria` (alias) on hybrid criteria. Planner-authored rubrics in the
 *  wild use the shorter form; pre-patch handler read only the canonical name
 *  and reported `hybrid combinator=weighted over 0 subs` (score 0.00). */
export function resolveSubCriteriaRids(c: GradingCriterionLite): string[] {
  return c.subCriteriaRids ?? c.subCriteria ?? [];
}
