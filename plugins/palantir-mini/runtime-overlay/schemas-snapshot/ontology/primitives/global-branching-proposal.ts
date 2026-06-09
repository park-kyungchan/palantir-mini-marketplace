/**
 * @stable — GlobalBranchingProposal primitive (prim-learn-21, v1.40.0)
 *
 * Extends the v1.37 OntologyProposalDeclaration (prim-learn-19) with the
 * GA-week (2026-05-18) Global Branching capabilities: cross-application
 * unified branching, project-owner approval policies, branch-cost / resource-
 * checks, and review lifecycle including doNotMerge gating. Captured as
 * additive composition (not edit) so prim-learn-19 stays a stable surface.
 *
 * D/L/A domain: LEARN + OPS. The proposal is reviewable workflow state
 * carrying who-may-approve and what-checks-passed, used to validate +
 * promote ontology / app changes across applications atomically.
 *
 * Authority chain:
 *   research/palantir-foundry/ontology/global-branching-overview-2026-05-05.md
 *   (GA week 2026-05-18 announcement extends the overview with supported
 *    applications + approval policies + protect-resources + resource-cost)
 *     ↓
 *   schemas/ontology/primitives/ontology-branch-proposal.ts (prim-learn-19; existing)
 *     ↓
 *   schemas/ontology/primitives/global-branching-proposal.ts (this file; extends)
 *     ↓
 *   shared-core re-export
 *
 * Rule cross-refs: rule 16 v4.0.0 §Loop (the harness commit/merge phase
 * parallels Global Branching's proposal model), rule 26 v1.0.0 §Axis C
 * (Refining — proposal carries refinementTarget pointer to DH/HC/spec).
 *
 * @owner palantirkc-ontology
 * @purpose AI-FDE / Global Branching proposal lifecycle with approval policy + resource checks
 */

import type {
  OntologyProposalDeclaration,
  OntologyProposalRid,
} from "./ontology-branch-proposal";

/**
 * Lifecycle states. Strict superset of OntologyProposalStatus from
 * prim-learn-19 — adds "deferred" for proposals held pending dependency
 * (e.g. waiting on a parent branch merge).
 */
export type GlobalBranchingProposalLifecycleState =
  | "draft"
  | "in-review"
  | "approved"
  | "merged"
  | "rejected"
  | "deferred";

/**
 * Project-owner-defined approval policy (Palantir docs verbatim — eligible
 * reviewers, required approvals, allowSelfApprove). See research/palantir-
 * foundry/ontology/global-branching-overview-2026-05-05.md "Define
 * approval policies" §GA delta.
 */
export interface GlobalBranchingApprovalPolicy {
  readonly eligibleReviewers: ReadonlyArray<string>;
  /** Number of approvals required from eligibleReviewers before merge. */
  readonly requiredApprovals: number;
  /**
   * Whether the proposal author may self-approve (Palantir docs explicit
   * field; many enterprises set this false to enforce four-eyes).
   */
  readonly allowSelfApprove: boolean;
}

/**
 * Resource-check entry — one record per gate (e.g. "compute-cost-budget",
 * "downstream-dependents-pass-tests", "ontology-edit-not-protected"). The
 * full check set is open-ended; the structure is fixed.
 */
export interface GlobalBranchingResourceCheckResult {
  readonly check: string;
  readonly passed: boolean;
  readonly message?: string;
}

/**
 * Top-level declaration. Composes (does NOT extend) OntologyProposalDeclaration
 * via embedded `baseProposal` so consumers can keep prim-learn-19 references
 * intact.
 *
 * Field rationale:
 *   - applicationsAffected — 7 supported applications per GA: transforms,
 *     TS-v1 functions, Pipeline Builder, Ontology, Workshop, AIP Logic,
 *     Object Views. Free-form strings keep this open for extension.
 *   - doNotMerge — explicit hold flag; even when approvalPolicy passes,
 *     true here blocks merge. Useful for "approved but waiting for
 *     dependency" workflows.
 */
export interface GlobalBranchingProposal {
  readonly proposalId: OntologyProposalRid;
  readonly baseProposal: OntologyProposalDeclaration;
  readonly applicationsAffected: ReadonlyArray<string>;
  readonly approvalPolicy: GlobalBranchingApprovalPolicy;
  readonly doNotMerge: boolean;
  readonly lifecycleState: GlobalBranchingProposalLifecycleState;
  readonly resourceCheckResults: ReadonlyArray<GlobalBranchingResourceCheckResult>;
}

export function isGlobalBranchingProposalLifecycleState(
  s: string,
): s is GlobalBranchingProposalLifecycleState {
  return (
    s === "draft" ||
    s === "in-review" ||
    s === "approved" ||
    s === "merged" ||
    s === "rejected" ||
    s === "deferred"
  );
}

export function isGlobalBranchingProposal(x: unknown): x is GlobalBranchingProposal {
  if (typeof x !== "object" || x === null) return false;
  const p = x as GlobalBranchingProposal;
  return (
    typeof p.proposalId === "string" &&
    p.proposalId.length > 0 &&
    typeof p.baseProposal === "object" &&
    p.baseProposal !== null &&
    Array.isArray(p.applicationsAffected) &&
    typeof p.approvalPolicy === "object" &&
    p.approvalPolicy !== null &&
    Array.isArray(p.approvalPolicy.eligibleReviewers) &&
    typeof p.approvalPolicy.requiredApprovals === "number" &&
    Number.isFinite(p.approvalPolicy.requiredApprovals) &&
    p.approvalPolicy.requiredApprovals >= 0 &&
    typeof p.approvalPolicy.allowSelfApprove === "boolean" &&
    typeof p.doNotMerge === "boolean" &&
    typeof p.lifecycleState === "string" &&
    isGlobalBranchingProposalLifecycleState(p.lifecycleState) &&
    Array.isArray(p.resourceCheckResults)
  );
}

export class GlobalBranchingProposalRegistry {
  private readonly proposals = new Map<OntologyProposalRid, GlobalBranchingProposal>();

  register(decl: GlobalBranchingProposal): void {
    this.proposals.set(decl.proposalId, decl);
  }

  get(rid: OntologyProposalRid): GlobalBranchingProposal | undefined {
    return this.proposals.get(rid);
  }

  byLifecycleState(state: GlobalBranchingProposalLifecycleState): GlobalBranchingProposal[] {
    return [...this.proposals.values()].filter((p) => p.lifecycleState === state);
  }

  list(): GlobalBranchingProposal[] {
    return [...this.proposals.values()];
  }
}

export const GLOBAL_BRANCHING_PROPOSAL_REGISTRY = new GlobalBranchingProposalRegistry();
