// palantir-mini v4.8.0 — pm-grader-dispatch MCP handler (W2.1a P1 + W3.1e P3 + W3.B tier dispatch + sprint-054 W1.A2 auto-policy)
//
// Per harness-base-mode blueprint §4-P1 + 2026-04-20-managed-agents-harness-mapping.md:51
// (highest-leverage convergence step). Exposes the model-domain grader as a
// standalone MCP tool. Claude hosts use the Claude CLI adapter; non-Claude
// hosts return needs_human_review until they provide a runtime-native grader.
// This keeps model execution outside plugin workflow semantics while avoiding
// Lead-as-Evaluator self-grading bias (Prithvi 2026-03-24: "agents tend to
// confidently praise their own work").
//
// v3.9.0 W3.1e: when caller passes optional dryRunRef + validationResult from
// a prior compute_edits_dry_run, the handler emits validation_phase_completed
// errorClass="dry_run_graded" with the same dryRunRef, so commit-edits-precondition
// (W3.1c) can verify the graded dry-run was performed before allowing commit_edits.
// Validation-errors guard: when validationResult.errors present, skip the
// model-grader adapter + emit dry_run_graded(passed=false, errorClass=
// "dry_run_skipped_validation_errors") + return synthetic fail score.
//
// v4.6.0 W3.B: 5-level tier dispatch via GraderEffortLevel (schemas v1.42.0).
//   tier="none"     → synthetic needs_human_review without subprocess spawn
//                     (deterministic-only criteria — rule/shell-domain).
//   tier="low"|"normal"|undefined → call gradeModel with the default runtime adapter.
//   tier="high"     → call gradeModel with effort="high" when supported.
//   tier="critical" → call gradeModel with effort="xhigh" when supported.
//
// v4.8.0 sprint-054 W1.A2: when criterion.tier is undefined, resolveTier()
// applies an auto-policy:
//   - validationExpression length ≤ 200    → "low"
//   - scoringPrompt OR validationExpression matches /\b(correctness|semantic
//     |ontology|impact|propagation)\b/i → "critical"
//   - default                              → "normal"
// resolveTier returns {tier, autoSelected:boolean}. Both are emitted on the
// dry_run_graded validation_phase_completed envelope so pm_dispatch_cost_estimate
// can audit per-tier dispatch counts (W1.A4) without a separate event type.
//
// Architecture: thin wrapper around `bridge/handlers/grade-outcome/model.ts:gradeModel`.
// That function owns runtime gating and only spawns the Claude CLI on Claude
// hosts. This handler exposes single-criterion grading directly, adds optional
// selfAssessmentPath context, and enforces tier-based model selection.
//
// Used by:
//  - rule 16 v3.1.0 §Roles — "model-domain criteria routed through pm_grader_dispatch"
//  - bridge/handlers/grade-outcome-with-rubric.ts (W2.1b) — already routes
//    domain="model" to gradeModel; can call this handler for cross-cutting
//    enforcement/observability.
//  - Standalone MCP — Lead can invoke once per criterion when running
//    Lead-direct grading inline.
//
// Authority: ~/.claude/rules/16-3-agent-harness.md §Roles (v3.1.0+)
//            ~/.claude/plans/glistening-hugging-reddy.md §3.E W2.1a
//            ~/.claude/plans/2026-04-28-harness-base-mode-blueprint.md §4-P1
//            ~/.claude/plans/mellow-plotting-oasis.md §Wave 3 W3.B

import * as fs from "fs";
import { gradeModel } from "./grade-outcome/model";
import { emit } from "../../scripts/log";
import type { GradingCriterionLite, CriterionScore } from "./grade-outcome/types";
// GraderEffortLevel from schemas v1.42.0 — used for tier routing + Claude
// Code CLI `--effort` flag mapping. As of sprint-054 W1.A1, gradeModel
// accepts an optional `effort` arg; mapTierToClaudeCodeEffort is the
// canonical bridge from typed criterion tier to the runtime flag value.
import type { GraderEffortLevel } from "#schemas/ontology/primitives/grader-effort";
import { mapTierToClaudeCodeEffort } from "#schemas/ontology/primitives/grader-effort";

/**
 * Single-criterion model-domain grading request.
 * `selfAssessmentPath` is appended to the scoringPrompt context — when present,
 * grader MUST cite divergence between Generator self-claim + grader verdict
 * (transparency-only artifact per rule 16 v3.1.0 §Roles).
 */
export interface PmGraderDispatchArgs {
  /** Project absolute path. Used only for events.jsonl emission scope. */
  project: string;
  /** Single GradingCriterion to evaluate (must have rubricDomain="model"). */
  criterion: GradingCriterionLite;
  /** Path to the artifact Generator produced (file or directory). */
  artifactPath: string;
  /** Optional spec.md path for grader context. */
  specPath?: string;
  /** Optional evidence dir (Playwright snapshots / console logs / etc.). */
  evidenceDir?: string;
  /**
   * Path to Generator's self-assessment-NNN.md (rule 16 v3.1.0 §Roles).
   * When provided, grader includes it in scoringPrompt and MUST cite
   * divergence in output `evidenceCited`.
   */
  selfAssessmentPath?: string;
  /**
   * Sprint identification — surfaces in events.jsonl + grading_completed event.
   * Optional but recommended for substrate replay.
   */
  sprintNumber?: number;
  iteration?: number;
  /**
   * v3.9.0 W3.1e: when present, marks this dispatch as the graded leg of a
   * compute_edits_dry_run pair. Handler emits validation_phase_completed
   * errorClass="dry_run_graded" with this exact ref + the verdict so
   * commit-edits-precondition (W3.1c) can verify the pair before allowing
   * commit_edits. Hash format: 16-char hex from compute_edits_dry_run.
   */
  dryRunRef?: string;
  /**
   * v3.9.0 W3.1e: when caller passes the prior dry-run's validationResult
   * AND it contains errors, this handler skips the model-grader adapter
   * (no point grading a known-failing dry-run) and emits dry_run_graded with
   * passed=false + errorClass="dry_run_skipped_validation_errors". Returns
   * synthetic fail CriterionScore.
   */
  validationResult?: "ok" | { errors: string[] };
}

export interface PmGraderDispatchResult {
  /** Single-criterion result mirrors CriterionScore shape. */
  criterionId: string;
  rubricDomain: "model";
  score: number;
  weightedScore: number;
  passFail: "pass" | "fail" | "needs_human_review";
  reasoning: string;
  evidenceCited?: string[];
  /** When selfAssessmentPath was provided, grader's stance on divergence. */
  selfAssessmentDivergence?: "aligned" | "generator-overconfident" | "generator-underconfident" | "uncomparable";
}

/**
 * Augment criterion.scoringPrompt with self-assessment context when present.
 * The grader sees the Generator's own claims as "transparency context" but
 * is instructed to grade the artifact independently and cite divergence.
 */
function buildAugmentedCriterion(
  base: GradingCriterionLite,
  selfAssessmentPath: string | undefined,
): GradingCriterionLite {
  if (!selfAssessmentPath || !fs.existsSync(selfAssessmentPath)) return base;
  let selfAssessmentBody = "";
  try {
    selfAssessmentBody = fs.readFileSync(selfAssessmentPath, "utf8");
  } catch {
    return base; // unreadable; fall back to base
  }

  const augmentedPrompt = [
    base.scoringPrompt ?? "",
    "",
    "=== GENERATOR SELF-ASSESSMENT (transparency context only — NEVER let it influence your independent verdict) ===",
    selfAssessmentBody.length > 4000 ? selfAssessmentBody.slice(0, 4000) + "\n[truncated]" : selfAssessmentBody,
    "=== END GENERATOR SELF-ASSESSMENT ===",
    "",
    "Your task: grade the artifact INDEPENDENTLY against the criterion. Then in `evidenceCited`, INCLUDE one or more entries that explicitly cite divergence between your verdict and the Generator's self-claim:",
    "  - 'aligned' — Generator's self-claim matches your verdict",
    "  - 'generator-overconfident' — Generator claimed pass; you score fail",
    "  - 'generator-underconfident' — Generator claimed fail/uncertain; you score pass",
    "  - 'uncomparable' — Generator's self-claim is non-specific or covers different criteria",
    "Surface a single evidence entry tagged `[selfAssessmentDivergence:<verdict>]` so the harness can replay your judgment.",
  ].join("\n");

  return { ...base, scoringPrompt: augmentedPrompt };
}

/**
 * v4.8.0 sprint-054 W1.A2 — auto-policy keywords. Word-bounded match against
 * scoringPrompt OR validationExpression to escalate a criterion to "critical"
 * (Opus 4.7 + xhigh) when the criterion's prose mentions semantics-laden
 * concepts where mis-grading produces durable consequence (rule violations,
 * architectural breaks, ontology drift). Keywords drawn from rule 26 §Axis
 * C2 (typed refinement targets) — these terms reliably mark high-stakes
 * criteria. False positives ("no impact on UX") are accepted: routing one
 * criterion to Opus per sprint at worst (~$0.30 extra); explicit `tier:
 * "normal"` override is the documented escape per harness-planner.md.
 */
const AUTO_POLICY_KEYWORDS = /\b(correctness|semantic|ontology|impact|propagation)\b/i;

/**
 * v4.8.0 sprint-054 W1.A2 — resolve effective tier for a criterion. When
 * `criterion.tier` is set, honor it verbatim. When undefined, apply auto-
 * policy:
 *   1. AUTO_POLICY_KEYWORDS matches scoringPrompt OR validationExpression → "critical"
 *   2. validationExpression length ∈ (0, 200] → "low"
 *   3. default → "normal"
 *
 * Returns `{tier, autoSelected}` so the caller can persist the choice in the
 * dry_run_graded envelope payload (drives W1.A4 per-tier dispatch counts).
 *
 * Note: rubricDomain="model" is enforced by the handler caller before this
 * runs, so deterministic shell/rule criteria never reach here. tier="none"
 * short-circuit happens AFTER this resolve — explicit tier=none honored.
 */
function resolveTier(criterion: GradingCriterionLite): {
  tier: GraderEffortLevel;
  autoSelected: boolean;
} {
  if (criterion.tier) return { tier: criterion.tier, autoSelected: false };
  const valExpr = criterion.validationExpression ?? "";
  const prompt = criterion.scoringPrompt ?? "";
  if (AUTO_POLICY_KEYWORDS.test(prompt) || AUTO_POLICY_KEYWORDS.test(valExpr)) {
    return { tier: "critical", autoSelected: true };
  }
  if (valExpr.length > 0 && valExpr.length <= 200) {
    return { tier: "low", autoSelected: true };
  }
  return { tier: "normal", autoSelected: true };
}

export default async function pmGraderDispatch(
  payload: unknown,
): Promise<PmGraderDispatchResult> {
  const args = (payload ?? {}) as PmGraderDispatchArgs;

  if (!args.criterion || args.criterion.rubricDomain !== "model") {
    throw new Error(
      `pm_grader_dispatch: criterion.rubricDomain must be "model" (got ${args.criterion?.rubricDomain ?? "undefined"})`,
    );
  }
  if (!args.artifactPath || !args.project) {
    throw new Error(`pm_grader_dispatch: project + artifactPath are required`);
  }

  // v4.8.0 sprint-054 W1.A2 — resolve tier (explicit OR auto-policy).
  // resolveTier returns {tier, autoSelected}; tier=none short-circuits below
  // (only reachable via explicit declaration since auto-policy never selects
  // none). Otherwise, mapTierToClaudeCodeEffort yields the runtime --effort
  // flag value to forward to gradeModel.
  const { tier: resolvedTier, autoSelected } = resolveTier(args.criterion);
  if (resolvedTier === "none") {
    return {
      criterionId: args.criterion.criterionId,
      rubricDomain: "model",
      score: 0,
      weightedScore: 0,
      passFail: "needs_human_review",
      reasoning: `tier=none — no model call (rule/shell-domain criterion; evaluate validationExpression directly). pm_grader_dispatch short-circuited.`,
    };
  }
  const effort = mapTierToClaudeCodeEffort(resolvedTier);

  // v3.9.0 W3.1e — validation-errors guard. When the prior dry-run failed
  // validation, skip the model-grader adapter (~$0.05 saved per skip) and
  // emit dry_run_graded with synthetic fail. commit-edits-precondition
  // (W3.1c) will see the fail and block commit with a clear hint.
  if (
    args.dryRunRef &&
    args.validationResult &&
    typeof args.validationResult === "object" &&
    "errors" in args.validationResult &&
    args.validationResult.errors.length > 0
  ) {
    const errorSummary = args.validationResult.errors.slice(0, 3).join("; ");
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: false,
          errorClass: "dry_run_skipped_validation_errors",
        },
        toolName: "pm_grader_dispatch",
        cwd: args.project,
        runtime: process.env.PALANTIR_MINI_HOST_RUNTIME,
        reasoning: `dry-run-graded dryRunRef=${args.dryRunRef} verdict=fail (skipped grading — validation errors: ${errorSummary})`,
      });
    } catch {
      // best-effort
    }
    return {
      criterionId: args.criterion.criterionId,
      rubricDomain: "model",
      score: 0,
      weightedScore: 0,
      passFail: "fail",
      reasoning: `pm_grader_dispatch skipped subprocess: prior dry-run validation failed (${errorSummary}). dryRunRef=${args.dryRunRef}.`,
      evidenceCited: [`dryRunValidationErrors:${args.validationResult.errors.length}`],
    };
  }

  // Augment scoringPrompt with self-assessment context if provided.
  const augmentedCriterion = buildAugmentedCriterion(args.criterion, args.selfAssessmentPath);

  // Delegate to existing gradeModel. v4.8.0 W1.A1: forward `effort` (mapped
  // from resolvedTier) so runtime adapters that support effort can honor the
  // requested reasoning depth.
  const result: CriterionScore = gradeModel(
    augmentedCriterion,
    args.artifactPath,
    args.evidenceDir,
    args.specPath,
    effort,
  );

  // Parse selfAssessmentDivergence from evidenceCited if present.
  let selfAssessmentDivergence: PmGraderDispatchResult["selfAssessmentDivergence"];
  if (args.selfAssessmentPath && Array.isArray(result.evidenceCited)) {
    for (const ev of result.evidenceCited) {
      const m = /\[selfAssessmentDivergence:(aligned|generator-overconfident|generator-underconfident|uncomparable)\]/.exec(ev);
      if (m) {
        selfAssessmentDivergence = m[1] as PmGraderDispatchResult["selfAssessmentDivergence"];
        break;
      }
    }
  }

  // Per-criterion observability: caller (grade-outcome-with-rubric) emits the
  // aggregated `grading_completed` event after collecting all criterion scores.
  // pm-grader-dispatch stays pure — single-criterion subprocess grader without
  // aggregated-event side effects. If standalone observability is needed,
  // wrap this handler with an evaluator_strictness_probe emit at the call site.

  // v3.9.0 W3.1e — when dryRunRef present, emit the paired dry_run_graded
  // event so commit-edits-precondition (W3.1c) can verify the graded leg
  // exists for the same dryRunRef.
  if (args.dryRunRef) {
    try {
      // v4.8.0 W1.A2 — payload widened to Record<string, unknown> so per-
      // dispatch tier metadata (tierUsed + autoSelected) rides on the same
      // dry_run_graded envelope. pm_dispatch_cost_estimate (W1.A4) reads
      // these fields to compute per-tier dispatch counts. Same pattern as
      // pm-dispatch-cost-estimate.ts:260 (canonical Record<string, unknown>
      // widening for audit-style payload extension).
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: result.passFail === "pass",
          errorClass: "dry_run_graded",
          tierUsed: resolvedTier,
          autoSelected,
        } as Record<string, unknown>,
        toolName: "pm_grader_dispatch",
        cwd: args.project,
        runtime: process.env.PALANTIR_MINI_HOST_RUNTIME,
        reasoning: `dry-run-graded dryRunRef=${args.dryRunRef} verdict=${result.passFail} score=${result.score ?? 0} criterion=${result.criterionId} tier=${resolvedTier}${autoSelected ? "(auto)" : "(explicit)"}`,
      });
    } catch {
      // best-effort — emission failure must not block the grading result
    }
  }

  return {
    criterionId: result.criterionId,
    rubricDomain: "model",
    score: result.score ?? 0,
    weightedScore: result.weightedScore ?? 0,
    passFail: result.passFail,
    reasoning: result.reasoning,
    evidenceCited: result.evidenceCited,
    selfAssessmentDivergence,
  };
}
