/**
 * @stable — AIPEvaluation primitives (prim-learn-20, v1.37.0)
 *
 * AIP Evals are not just rubrics. They bind a target (agent/function/action),
 * test cases, evaluator policy, model/version comparison, and run results.
 * This primitive layer gives agents a typed loop for "try, measure, compare,
 * promote or roll back" before changes become runtime authority.
 *
 * D/L/A domain: LEARN. Evaluation artifacts feed BackPropagation and release
 * gating; they are not application state or direct mutations.
 *
 * @owner palantirkc-ontology
 * @purpose AIP Evals-style suite, test case, run, and experiment declarations
 */

import type { GradingCriterionRid, RubricDomain } from "./grading-criterion";

export type AIPEvaluationSuiteRid = string & { readonly __brand: "AIPEvaluationSuiteRid" };
export type AIPEvaluationTestCaseRid = string & {
  readonly __brand: "AIPEvaluationTestCaseRid";
};
export type AIPEvaluationRunRid = string & { readonly __brand: "AIPEvaluationRunRid" };
export type AIPExperimentRid = string & { readonly __brand: "AIPExperimentRid" };

export const aipEvaluationSuiteRid = (s: string): AIPEvaluationSuiteRid =>
  s as AIPEvaluationSuiteRid;
export const aipEvaluationTestCaseRid = (s: string): AIPEvaluationTestCaseRid =>
  s as AIPEvaluationTestCaseRid;
export const aipEvaluationRunRid = (s: string): AIPEvaluationRunRid =>
  s as AIPEvaluationRunRid;
export const aipExperimentRid = (s: string): AIPExperimentRid => s as AIPExperimentRid;

export type AIPEvaluationTargetKind =
  | "aip-agent"
  | "aip-logic-function"
  | "action-type"
  | "osdk-application"
  | "mcp-tool"
  | "prompt-template";

export interface AIPEvaluationTargetRef {
  readonly kind: AIPEvaluationTargetKind;
  readonly rid: string;
  readonly versionRef?: string;
}

export interface AIPEvaluationTestCaseDeclaration {
  readonly testCaseId: AIPEvaluationTestCaseRid;
  readonly title: string;
  readonly input: Record<string, unknown>;
  readonly expectedOutputSchema?: string;
  readonly expectedBehavior?: string;
  readonly tags?: readonly string[];
  readonly sourceEvidenceUrls?: readonly string[];
}

export interface AIPEvaluationSuiteDeclaration {
  readonly suiteId: AIPEvaluationSuiteRid;
  readonly name: string;
  readonly target: AIPEvaluationTargetRef;
  readonly testCaseIds: readonly AIPEvaluationTestCaseRid[];
  readonly criteria: readonly GradingCriterionRid[];
  readonly evaluatorPolicy: {
    readonly allowedDomains: readonly RubricDomain[];
    readonly requireHumanReviewForMutation?: boolean;
    readonly minimumPassingScore: number;
  };
  readonly baselineRunId?: AIPEvaluationRunRid;
}

export interface AIPEvaluationRunDeclaration {
  readonly runId: AIPEvaluationRunRid;
  readonly suiteId: AIPEvaluationSuiteRid;
  readonly target: AIPEvaluationTargetRef;
  readonly status: "queued" | "running" | "passed" | "failed" | "inconclusive";
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly modelRef?: string;
  readonly ontologyVersionRef?: string;
  readonly codeVersionRef?: string;
  readonly aggregateScore?: number;
  readonly criterionScores?: readonly {
    readonly criterionId: GradingCriterionRid;
    readonly score: number;
    readonly evidenceUrl?: string;
  }[];
}

export interface AIPExperimentDeclaration {
  readonly experimentId: AIPExperimentRid;
  readonly suiteId: AIPEvaluationSuiteRid;
  readonly baselineRunId: AIPEvaluationRunRid;
  readonly candidateRunIds: readonly AIPEvaluationRunRid[];
  readonly decision: "promote" | "hold" | "rollback" | "needs-human-review";
  readonly rationale: string;
  readonly decidedAt: string;
}

export class AIPEvaluationRegistry {
  private readonly suites = new Map<AIPEvaluationSuiteRid, AIPEvaluationSuiteDeclaration>();
  private readonly testCases = new Map<
    AIPEvaluationTestCaseRid,
    AIPEvaluationTestCaseDeclaration
  >();
  private readonly runs = new Map<AIPEvaluationRunRid, AIPEvaluationRunDeclaration>();

  registerSuite(decl: AIPEvaluationSuiteDeclaration): void {
    this.suites.set(decl.suiteId, decl);
  }

  registerTestCase(decl: AIPEvaluationTestCaseDeclaration): void {
    this.testCases.set(decl.testCaseId, decl);
  }

  registerRun(decl: AIPEvaluationRunDeclaration): void {
    this.runs.set(decl.runId, decl);
  }

  listSuites(): AIPEvaluationSuiteDeclaration[] {
    return [...this.suites.values()];
  }

  listRunsForSuite(suiteId: AIPEvaluationSuiteRid): AIPEvaluationRunDeclaration[] {
    return [...this.runs.values()].filter((r) => r.suiteId === suiteId);
  }
}

export const AIP_EVALUATION_REGISTRY = new AIPEvaluationRegistry();

// --- Convex-aligned row shapes (sprint-114 PR 5.4a — schemas v1.67.0) ---
// Narrower than Declaration interfaces; maps 1-to-1 to evalSuites / evalRuns Convex tables.

export interface AIPEvaluationSuiteConvexRow {
  readonly suiteId: string;
  readonly suiteName: string;
  readonly criterionRids: readonly string[];
  readonly createdAt: number;
  readonly projectSlug: string;
}

export type AIPEvaluationRunVerdict = "pass" | "revise" | "reject";

export interface AIPEvaluationRunConvexRow {
  readonly runId: string;
  readonly suiteId: string;
  readonly targetArtifactRef: string;
  readonly scoreOverall: number;
  readonly scoreCriteria: Record<string, number>;
  readonly verdict: AIPEvaluationRunVerdict;
  readonly ranAt: number;
  readonly runner: string;
}

export function isAIPEvaluationSuiteConvexRow(
  value: unknown,
): value is AIPEvaluationSuiteConvexRow {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["suiteId"] === "string" &&
    typeof v["suiteName"] === "string" &&
    Array.isArray(v["criterionRids"]) &&
    typeof v["createdAt"] === "number" &&
    typeof v["projectSlug"] === "string"
  );
}

export function isAIPEvaluationRunConvexRow(
  value: unknown,
): value is AIPEvaluationRunConvexRow {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["runId"] === "string" &&
    typeof v["suiteId"] === "string" &&
    typeof v["targetArtifactRef"] === "string" &&
    typeof v["scoreOverall"] === "number" &&
    typeof v["scoreCriteria"] === "object" &&
    v["scoreCriteria"] !== null &&
    (v["verdict"] === "pass" || v["verdict"] === "revise" || v["verdict"] === "reject") &&
    typeof v["ranAt"] === "number" &&
    typeof v["runner"] === "string"
  );
}
