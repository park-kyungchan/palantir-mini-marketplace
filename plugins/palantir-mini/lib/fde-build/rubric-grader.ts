/**
 * palantir-mini lib/fde-build/rubric-grader.ts
 *
 * Per-criterion FDE rubric grader. Orchestrates the 17-criterion FDE Ontology
 * Build Readiness rubric (FDE_GRADING_RUBRIC from schema Slice 3.A) and
 * produces a FDECriterionScore[] scorecard.
 *
 * HARD READ-ONLY INVARIANT: this grader NEVER authorizes mutation. It only
 * scores readiness. The returned GradeFDEReadinessResult carries no
 * commitToken, applyToken, approvalToken, or authorizeMutation field.
 *
 * Per brief §10 + splendid-mapping-lemur.md Slice 3.B.
 *
 * @owner palantirkc-project-implementer
 * @sprint sprint-138 Slice 3.B
 */

import { FDE_GRADING_RUBRIC } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-grading-rubric";
import type {
  FDECriterionScore,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-gap-report";
import type { FDEOntologyBuildSession } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-ontology-build-session";
import { GRADING_CRITERION_REGISTRY } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/grading-criterion";

// =============================================================================
// Public interfaces
// =============================================================================

export interface GradeFDEReadinessInput {
  readonly session: FDEOntologyBuildSession;
  /** Optional supporting evidence file paths for downstream traceability. */
  readonly artifactPaths?: readonly string[];
  readonly nowIso?: string;
  /**
   * External grader callback for rubricDomain="model" criteria.
   * If absent, model criteria default to score=0 + passed=false —
   * the caller is responsible for wiring actual model evaluation via
   * grade_outcome_with_rubric MCP.
   */
  readonly modelGrader?: (criterion: {
    criterionId: string;
    scoringPrompt?: string;
  }) => Promise<{
    score: number;
    reasoning?: string;
    evidence?: readonly string[];
  }>;
}

export interface GradeFDEReadinessResult {
  readonly perCriterion: readonly FDECriterionScore[];
  readonly overallScore: number;
  readonly overallThreshold: number;
  readonly overallPassed: boolean;
}

// =============================================================================
// Rule-domain heuristic validators (session shape check per criterion)
// =============================================================================

/**
 * Evaluate a rule-domain criterion against the session.
 * Returns { passed, reasoning } based on heuristic field presence / logic.
 * The criterion's validationExpression describes the intent; the heuristic
 * here implements the local testable version.
 */
function evaluateRuleCriterion(
  criterionId: string,
  session: FDEOntologyBuildSession,
): { passed: boolean; reasoning: string } {
  const md = session.missionDecision;
  const actions = session.actionWriteback ?? [];
  const chatbots = session.chatbotStudio ?? [];
  const mcpBoundary = session.aiFdeMcpBoundary;
  const branchRelease = session.branchRelease;
  const evalObs = session.evalObservability;

  switch (criterionId) {
    case "criterion:submission_criteria_quality": {
      // Passed only when no action reports deferred human review items.
      const needsReview = actions.flatMap(
        (a) => a.submissionCriteriaNeedsHumanReview ?? [],
      );
      if (needsReview.length > 0) {
        return {
          passed: false,
          reasoning: `${needsReview.length} submission criteria require human review (deferred ObjectQueryResult/GroupMember).`,
        };
      }
      return {
        passed: true,
        reasoning: "No deferred submission criteria found across all action reviews.",
      };
    }

    case "criterion:application_state_determinism": {
      // Passed when at least one chatbot declares applicationStateVariables.
      const hasAppState = chatbots.some(
        (c) => (c.applicationStateVariables?.length ?? 0) > 0,
      );
      if (!hasAppState) {
        return {
          passed: false,
          reasoning: "No chatbot declares applicationStateVariables — deterministic transitions undocumented.",
        };
      }
      return {
        passed: true,
        reasoning: "At least one chatbot has applicationStateVariables declared.",
      };
    }

    case "criterion:citation_and_evidence_quality": {
      // Passed when at least one chatbot has citationPolicy ≠ "none".
      const anyRequired = chatbots.some(
        (c) => c.citationPolicy === "required" || c.citationPolicy === "optional",
      );
      if (!anyRequired) {
        return {
          passed: false,
          reasoning: "No chatbot has citationPolicy=required or optional; citation evidence not mandated.",
        };
      }
      return {
        passed: true,
        reasoning: "At least one chatbot has citationPolicy=required or optional.",
      };
    }

    case "criterion:palantir_mcp_omcp_boundary_control": {
      // Passed when palantirMcpInScope XOR ontologyMcpInScope, or both with
      // a taskKind classification that is not "mixed" (mixed requires both).
      if (mcpBoundary == null) {
        return {
          passed: false,
          reasoning: "No FDEAIFDEMcpBoundaryReview declared in session.",
        };
      }
      const p = mcpBoundary.palantirMcpInScope ?? false;
      const o = mcpBoundary.ontologyMcpInScope ?? false;
      const xor = (p && !o) || (!p && o);
      const mixed = mcpBoundary.taskKind === "mixed";
      if (xor || (p && o && mixed)) {
        return {
          passed: true,
          reasoning: `palantirMcpInScope=${p}, ontologyMcpInScope=${o}, taskKind=${mcpBoundary.taskKind ?? "(unset)"}. XOR or mixed with classification.`,
        };
      }
      return {
        passed: false,
        reasoning: `palantirMcpInScope=${p} and ontologyMcpInScope=${o} without taskKind classification meeting XOR or mixed requirements.`,
      };
    }

    case "criterion:osdk_resource_scoping": {
      // Passed when branchRelease.resourcesChanged is non-empty.
      if (
        branchRelease == null ||
        (branchRelease.resourcesChanged?.length ?? 0) === 0
      ) {
        return {
          passed: false,
          reasoning: "No branchReleaseReview or resourcesChanged list is empty.",
        };
      }
      return {
        passed: true,
        reasoning: `resourcesChanged has ${branchRelease.resourcesChanged!.length} entries.`,
      };
    }

    case "criterion:auditability_and_observability": {
      // Passed when evalObs.auditSessionTraceEvidence is non-empty AND
      // at least one chatbot has sessionTraceAvailable=true.
      const hasTrace = (evalObs?.auditSessionTraceEvidence?.length ?? 0) > 0;
      const traceAvailable = chatbots.some((c) => c.sessionTraceAvailable === true);
      if (!hasTrace || !traceAvailable) {
        return {
          passed: false,
          reasoning: `auditSessionTraceEvidence present=${hasTrace}, sessionTraceAvailable=${traceAvailable}.`,
        };
      }
      return {
        passed: true,
        reasoning: "Audit session trace evidence provided and sessionTraceAvailable=true on at least one chatbot.",
      };
    }

    case "criterion:release_and_change_management": {
      // Passed when branchName present, reviewersRequired non-empty, rollbackPlan present.
      const hasBranch = Boolean(branchRelease?.branchName);
      const hasReviewers = (branchRelease?.reviewersRequired?.length ?? 0) > 0;
      const hasRollback = Boolean(branchRelease?.rollbackPlan);
      if (!hasBranch || !hasReviewers || !hasRollback) {
        return {
          passed: false,
          reasoning: `branchName=${hasBranch}, reviewersRequired=${hasReviewers}, rollbackPlan=${hasRollback}.`,
        };
      }
      return {
        passed: true,
        reasoning: "Branch name, reviewers, and rollback plan all declared.",
      };
    }

    case "criterion:post_rename_naming_compliance": {
      // Passed when no chatbot has legacyNamingFindings.
      const legacyCount = chatbots.reduce(
        (acc, c) => acc + (c.legacyNamingFindings?.length ?? 0),
        0,
      );
      if (legacyCount > 0) {
        return {
          passed: false,
          reasoning: `${legacyCount} legacy naming findings detected across chatbot studio reviews.`,
        };
      }
      return {
        passed: true,
        reasoning: "No legacy naming findings in any chatbot studio review.",
      };
    }

    default: {
      // Unknown rule criterion — conservative default.
      return {
        passed: false,
        reasoning: `Unknown rule criterion id: ${criterionId}. Cannot evaluate.`,
      };
    }
  }
}

// =============================================================================
// Main grader
// =============================================================================

/**
 * Grade an FDEOntologyBuildSession against the 17-criterion FDE rubric.
 *
 * - rule-domain criteria → heuristic session shape check (evaluateRuleCriterion).
 * - model-domain criteria → modelGrader callback (absent → score=0, passed=false).
 *
 * Score normalization:
 *   model: normalizedScore = score / 10  (scale 0-10)
 *   rule:  normalizedScore = passed ? 1 : 0  (scale pass-fail = 0/1)
 *   weightedContribution = normalizedScore * weightInRubric  (4 decimal places)
 *
 * NEVER produces commitToken, applyToken, approvalToken, or authorizeMutation.
 */
export async function gradeFDEReadiness(
  input: GradeFDEReadinessInput,
): Promise<GradeFDEReadinessResult> {
  const { session, modelGrader } = input;
  const rubric = FDE_GRADING_RUBRIC;
  const overallThreshold = rubric.aggregator.threshold; // 0.70

  const perCriterion: FDECriterionScore[] = [];

  for (const criterionRid of rubric.criterionRids) {
    const decl = GRADING_CRITERION_REGISTRY.get(criterionRid);
    if (decl == null) {
      // Should never happen — registry is populated at module load.
      perCriterion.push({
        criterionId: String(criterionRid),
        title: String(criterionRid),
        score: 0,
        threshold: 1,
        passed: false,
        weightInRubric: 0,
        weightedContribution: 0,
        reasoning: `Criterion ${String(criterionRid)} not found in GRADING_CRITERION_REGISTRY.`,
      });
      continue;
    }

    const isModel = decl.rubricDomain === "model";
    const scaleMax = isModel ? 10 : 1;
    const threshold = decl.passFailLogic.threshold;
    const weight = decl.weightInRubric;

    let score: number;
    let reasoning: string | undefined;
    let evidence: readonly string[] | undefined;

    if (isModel) {
      if (modelGrader != null) {
        const result = await modelGrader({
          criterionId: String(criterionRid),
          scoringPrompt: decl.scoringPrompt,
        });
        score = Math.max(0, Math.min(10, result.score));
        reasoning = result.reasoning;
        evidence = result.evidence;
      } else {
        // modelGrader absent: default to 0 (caller must wire model evaluation).
        score = 0;
        reasoning =
          "modelGrader not provided; model-domain criterion defaults to score=0. Wire grade_outcome_with_rubric MCP for real evaluation.";
      }
    } else {
      // rule domain
      const evalResult = evaluateRuleCriterion(String(criterionRid), session);
      score = evalResult.passed ? 1 : 0;
      reasoning = evalResult.reasoning;
    }

    const passed = score >= threshold;
    const normalizedScore = score / scaleMax;
    const weightedContribution =
      Math.round(normalizedScore * weight * 10000) / 10000;

    perCriterion.push({
      criterionId: String(criterionRid),
      title: decl.title,
      score,
      threshold,
      passed,
      weightInRubric: weight,
      weightedContribution,
      reasoning,
      evidence,
    });
  }

  const overallScore =
    Math.round(
      perCriterion.reduce((acc, c) => acc + c.weightedContribution, 0) * 10000,
    ) / 10000;
  const overallPassed = overallScore >= overallThreshold;

  return {
    perCriterion,
    overallScore,
    overallThreshold,
    overallPassed,
  };
}
