import { createHash } from "node:crypto";
import {
  summarizeHarnessFailureClassifications,
  type HarnessFailureClassification,
  type HarnessFailureClassificationResult,
} from "./failure-ledger";

export type HarnessRatchetRecommendedChange =
  | "hook"
  | "self-check"
  | "eval-suite"
  | "known-issue"
  | "tool-schema"
  | "agent-skill-rule"
  | "test";

export interface HarnessRatchetPlan {
  readonly planId: string;
  readonly sourceFailureId: string;
  readonly ownerSurface: string;
  readonly failureClass: string;
  readonly requiredPermanentFix: string;
  readonly recommendedHarnessChange: HarnessRatchetRecommendedChange;
  readonly acceptanceCriteria: readonly string[];
  readonly releaseBlocking: boolean;
}

export type HarnessRatchetPlannerAction =
  | "monitor-ledgered"
  | "repair-known-blocker"
  | "ratchet-new-failure"
  | "ratchet-changed-failure";

export type HarnessRatchetPlannerPriority = "none" | "low" | "high" | "critical";

export interface HarnessRatchetPlannerDecision {
  readonly classification: HarnessFailureClassification;
  readonly releaseBlocking: boolean;
  readonly action: HarnessRatchetPlannerAction;
  readonly priority: HarnessRatchetPlannerPriority;
  readonly reason: string;
  readonly plan: HarnessRatchetPlan;
}

export interface HarnessRatchetPlannerInput {
  readonly classifications: readonly HarnessFailureClassificationResult[];
}

export interface HarnessRatchetPlannerSummary {
  readonly total: number;
  readonly releaseBlocking: number;
  readonly knownLedgered: number;
  readonly knownReleaseBlocking: number;
  readonly changedKnown: number;
  readonly newReleaseBlocking: number;
}

export interface HarnessRatchetPlannerPlan {
  readonly shouldRatchet: boolean;
  readonly releaseBlocking: boolean;
  readonly highestPriority: HarnessRatchetPlannerPriority;
  readonly summary: HarnessRatchetPlannerSummary;
  readonly decisions: readonly HarnessRatchetPlannerDecision[];
  readonly plans: readonly HarnessRatchetPlan[];
  readonly ratchetClassifications: readonly HarnessFailureClassification[];
}

const PRIORITY_RANK: Record<HarnessRatchetPlannerPriority, number> = {
  none: 0,
  low: 1,
  high: 2,
  critical: 3,
};

export function planHarnessRatchet(
  classification: HarnessFailureClassificationResult,
): HarnessRatchetPlan {
  const sourceFailureId = sourceFailureIdFor(classification);
  const ownerSurface = classification.ledgerEntry?.ownerSurface.trim() ||
    "unledgered broad-suite failure";
  const failureClass = classification.ledgerEntry?.failureClass.trim() ||
    classFallbackFor(classification);
  const requiredPermanentFix = permanentFixFor(classification, ownerSurface, failureClass);

  return {
    planId: planIdFor(classification.classification, sourceFailureId, failureClass),
    sourceFailureId,
    ownerSurface,
    failureClass,
    requiredPermanentFix,
    recommendedHarnessChange: recommendedHarnessChangeFor(ownerSurface, failureClass),
    acceptanceCriteria: acceptanceCriteriaFor(classification, requiredPermanentFix),
    releaseBlocking: releaseBlockingFor(classification),
  };
}

export function planClassification(
  result: HarnessFailureClassificationResult,
): HarnessRatchetPlannerDecision {
  const plan = planHarnessRatchet(result);

  switch (result.classification) {
    case "known-ledgered":
      return {
        classification: result.classification,
        releaseBlocking: plan.releaseBlocking,
        action: "monitor-ledgered",
        priority: plan.releaseBlocking ? "high" : "low",
        reason: result.reason,
        plan,
      };
    case "known-release-blocking":
      return {
        classification: result.classification,
        releaseBlocking: plan.releaseBlocking,
        action: "repair-known-blocker",
        priority: "high",
        reason: result.reason,
        plan,
      };
    case "changed-known":
      return {
        classification: result.classification,
        releaseBlocking: plan.releaseBlocking,
        action: "ratchet-changed-failure",
        priority: "critical",
        reason: result.reason,
        plan,
      };
    case "new-release-blocking":
      return {
        classification: result.classification,
        releaseBlocking: plan.releaseBlocking,
        action: "ratchet-new-failure",
        priority: "critical",
        reason: result.reason,
        plan,
      };
  }
}

export function planHarnessRatchets(
  input: HarnessRatchetPlannerInput,
): HarnessRatchetPlannerPlan {
  const decisions = input.classifications.map(planClassification);
  const summary = summarizePlannerClassifications(decisions);
  const plans = decisions.map((decision) => decision.plan);
  const ratchetClassifications = uniqueClassifications(
    decisions
      .filter((decision) => shouldRatchetDecision(decision))
      .map((decision) => decision.classification),
  );

  return {
    shouldRatchet: ratchetClassifications.length > 0,
    releaseBlocking: decisions.some((decision) => decision.releaseBlocking),
    highestPriority: highestPriority(decisions),
    summary,
    decisions,
    plans,
    ratchetClassifications,
  };
}

export function summarizePlannerClassifications(
  input: readonly HarnessFailureClassificationResult[] | readonly HarnessRatchetPlannerDecision[],
): HarnessRatchetPlannerSummary {
  if (isDecisionArray(input)) {
    return {
      total: input.length,
      releaseBlocking: input.filter((decision) => decision.releaseBlocking).length,
      knownLedgered: input.filter((decision) => decision.classification === "known-ledgered").length,
      knownReleaseBlocking: input.filter((decision) =>
        decision.classification === "known-release-blocking"
      ).length,
      changedKnown: input.filter((decision) => decision.classification === "changed-known").length,
      newReleaseBlocking: input.filter((decision) =>
        decision.classification === "new-release-blocking"
      ).length,
    };
  }

  const summary = summarizeHarnessFailureClassifications(input);
  return {
    ...summary,
    knownReleaseBlocking: input.filter((result) =>
      result.classification === "known-release-blocking"
    ).length,
  };
}

function releaseBlockingFor(result: HarnessFailureClassificationResult): boolean {
  if (result.releaseBlocking) return true;
  if (result.classification !== "known-ledgered") return false;
  const entry = result.ledgerEntry;
  return !entry ||
    entry.requiredFix.trim().length === 0 ||
    entry.removalTarget.trim().length === 0;
}

function permanentFixFor(
  result: HarnessFailureClassificationResult,
  ownerSurface: string,
  failureClass: string,
): string {
  const requiredFix = result.ledgerEntry?.requiredFix.trim();
  if (requiredFix) return requiredFix;
  switch (result.classification) {
    case "known-ledgered":
      return `Add required_fix and removal_target metadata for ${ownerSurface} before accepting this baseline.`;
    case "known-release-blocking":
      return `Repair ${ownerSurface} broad-suite blocker and keep the ledger entry only until the fix lands.`;
    case "changed-known":
      return `Investigate the changed ${failureClass} behavior and convert the outcome into a hook, self-check, eval, or test regression.`;
    case "new-release-blocking":
      return `Classify the new ${failureClass} failure, assign an owner surface, and land a permanent harness regression or ledgered known issue.`;
  }
}

function acceptanceCriteriaFor(
  result: HarnessFailureClassificationResult,
  requiredPermanentFix: string,
): string[] {
  const base = [
    requiredPermanentFix,
    "Focused regression test or self-check demonstrates the failure class is now governed.",
  ];
  switch (result.classification) {
    case "known-ledgered":
      return releaseBlockingFor(result)
        ? [...base, "Ledger entry includes non-empty required_fix and removal_target metadata."]
        : [
          "Failure remains exact-match ledgered and non-release-blocking.",
          "Ledger entry retains owner_surface, required_fix, and removal_target metadata.",
        ];
    case "known-release-blocking":
      return [...base, "Release self-check fails until the ledgered blocker is removed or fixed."];
    case "changed-known":
      return [...base, "Changed failure class is either fixed or re-ledgered with explicit owner approval."];
    case "new-release-blocking":
      return [...base, "New broad-suite failure has a ratchet proposal, known issue, or code/test fix before release."];
  }
}

function recommendedHarnessChangeFor(
  ownerSurface: string,
  failureClass: string,
): HarnessRatchetRecommendedChange {
  const signal = `${ownerSurface} ${failureClass}`.toLowerCase();
  if (signal.includes("hook")) return "hook";
  if (signal.includes("self-check") || signal.includes("release")) return "self-check";
  if (signal.includes("eval")) return "eval-suite";
  if (signal.includes("schema") || signal.includes("tool")) return "tool-schema";
  if (signal.includes("skill") || signal.includes("agent")) return "agent-skill-rule";
  if (signal.includes("known issue") || signal.includes("baseline")) return "known-issue";
  return "test";
}

function sourceFailureIdFor(result: HarnessFailureClassificationResult): string {
  const source = result.ledgerEntry?.testPath.trim();
  if (source) return source;
  return result.reason.replace(/\s+/g, " ").slice(0, 160);
}

function classFallbackFor(result: HarnessFailureClassificationResult): string {
  switch (result.classification) {
    case "known-ledgered":
    case "known-release-blocking":
    case "changed-known":
      return result.classification;
    case "new-release-blocking":
      return "unledgered-broad-suite-failure";
  }
}

function planIdFor(
  classification: HarnessFailureClassification,
  sourceFailureId: string,
  failureClass: string,
): string {
  const digest = createHash("sha256")
    .update(`${classification}::${sourceFailureId}::${failureClass}`)
    .digest("hex")
    .slice(0, 12);
  return `harness-ratchet-plan:${classification}:${digest}`;
}

function shouldRatchetDecision(decision: HarnessRatchetPlannerDecision): boolean {
  return decision.action === "ratchet-new-failure" ||
    decision.action === "ratchet-changed-failure" ||
    decision.releaseBlocking;
}

function highestPriority(
  decisions: readonly HarnessRatchetPlannerDecision[],
): HarnessRatchetPlannerPriority {
  return decisions.reduce<HarnessRatchetPlannerPriority>(
    (highest, decision) =>
      PRIORITY_RANK[decision.priority] > PRIORITY_RANK[highest]
        ? decision.priority
        : highest,
    "none",
  );
}

function uniqueClassifications(
  classifications: readonly HarnessFailureClassification[],
): HarnessFailureClassification[] {
  return Array.from(new Set(classifications)).sort();
}

function isDecisionArray(
  input: readonly HarnessFailureClassificationResult[] | readonly HarnessRatchetPlannerDecision[],
): input is readonly HarnessRatchetPlannerDecision[] {
  return input.some((item) => "plan" in item);
}
