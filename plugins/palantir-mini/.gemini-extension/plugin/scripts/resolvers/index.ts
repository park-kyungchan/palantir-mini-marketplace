// RESOLVERS registry — Claude-slim of gstack.
// Maps {{PLACEHOLDER}} names to generator functions. Every resolver
// registered here is Claude-safe and palantir-mini-substrate-aligned.
//
// Ported from gstack (5,095 LOC → ~1,100 LOC here):
// - Kept: PREAMBLE, TEST_FAILURE_TRIAGE, CONFIDENCE_CALIBRATION, INVOKE_SKILL,
//   LEARNINGS_SEARCH/LOG, REVIEW_DASHBOARD, PLAN_FILE_REVIEW_REPORT,
//   ADVERSARIAL_STEP, SCOPE_DRIFT, BENEFITS_FROM, SPEC_REVIEW_LOOP,
//   PLAN_COMPLETION_AUDIT_{SHIP,REVIEW}, PLAN_VERIFICATION_EXEC,
//   CROSS_REVIEW_DEDUP, REVIEW_ARMY, BASE_BRANCH_DETECT, CO_AUTHOR_TRAILER,
//   CHANGELOG_WORKFLOW, QA_METHODOLOGY, TEST_BOOTSTRAP,
//   QUESTION_PREFERENCE_CHECK, QUESTION_LOG, INLINE_TUNE_FEEDBACK.
// - Dropped: GBRAIN_*, CODEX_*, DESIGN_*, BROWSE_SETUP, UX_PRINCIPLES,
//   SLUG_*, DEPLOY_BOOTSTRAP, DX_FRAMEWORK, COMMAND_REFERENCE,
//   SNAPSHOT_FLAGS, TEST_COVERAGE_AUDIT_*.
//
// If a template references a dropped placeholder, gen-skill-docs will
// raise "Unknown placeholder" — intentional to surface stale references.

import type { ResolverFn } from "./types";

import { generatePreamble, generateTestFailureTriage } from "./preamble";
import { generateLearningsSearch, generateLearningsLog } from "./learnings";
import { generateInvokeSkill } from "./composition";
import { generateConfidenceCalibration } from "./confidence";
import {
  generateBaseBranchDetect,
  generateCoAuthorTrailer,
  generateChangelogWorkflow,
  generateQAMethodology,
} from "./utility";
import { generateTestBootstrap } from "./testing";
import {
  generateReviewDashboard,
  generatePlanFileReviewReport,
  generateAdversarialStep,
  generateScopeDrift,
  generateBenefitsFrom,
  generateSpecReviewLoop,
  generatePlanCompletionAuditShip,
  generatePlanCompletionAuditReview,
  generatePlanVerificationExec,
  generateCrossReviewDedup,
} from "./review";
import { generateReviewArmy } from "./review-army";
import {
  generateQuestionPreferenceCheck,
  generateQuestionLog,
  generateInlineTuneFeedback,
} from "./question-tuning";

export const RESOLVERS: Record<string, ResolverFn> = {
  PREAMBLE: generatePreamble,
  TEST_FAILURE_TRIAGE: generateTestFailureTriage,
  LEARNINGS_SEARCH: generateLearningsSearch,
  LEARNINGS_LOG: generateLearningsLog,
  INVOKE_SKILL: generateInvokeSkill,
  CONFIDENCE_CALIBRATION: generateConfidenceCalibration,
  BASE_BRANCH_DETECT: generateBaseBranchDetect,
  CO_AUTHOR_TRAILER: generateCoAuthorTrailer,
  CHANGELOG_WORKFLOW: generateChangelogWorkflow,
  QA_METHODOLOGY: generateQAMethodology,
  TEST_BOOTSTRAP: generateTestBootstrap,
  REVIEW_DASHBOARD: generateReviewDashboard,
  PLAN_FILE_REVIEW_REPORT: generatePlanFileReviewReport,
  ADVERSARIAL_STEP: generateAdversarialStep,
  SCOPE_DRIFT: generateScopeDrift,
  BENEFITS_FROM: generateBenefitsFrom,
  SPEC_REVIEW_LOOP: generateSpecReviewLoop,
  PLAN_COMPLETION_AUDIT_SHIP: generatePlanCompletionAuditShip,
  PLAN_COMPLETION_AUDIT_REVIEW: generatePlanCompletionAuditReview,
  PLAN_VERIFICATION_EXEC: generatePlanVerificationExec,
  CROSS_REVIEW_DEDUP: generateCrossReviewDedup,
  REVIEW_ARMY: generateReviewArmy,
  QUESTION_PREFERENCE_CHECK: generateQuestionPreferenceCheck,
  QUESTION_LOG: generateQuestionLog,
  INLINE_TUNE_FEEDBACK: generateInlineTuneFeedback,
};
