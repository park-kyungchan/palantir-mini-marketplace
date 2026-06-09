/**
 * @stable — OntologyBranchProposal primitives (prim-learn-19, v1.37.0)
 *
 * Foundry Global Branching / proposal review lets AI FDEs and agents work on
 * ontology changes without mutating production state directly. These primitives
 * make "ATOP_WHICH version" concrete for schema, app, and agent changes.
 *
 * D/L/A domain: LEARN + OPS. Branches and proposals are reviewable workflow
 * state used to validate, compare, and promote ontology changes.
 *
 * @owner palantirkc-ontology
 * @purpose Typed branch/proposal lifecycle for AI FDE-style ontology edits
 */

export type OntologyBranchRid = string & { readonly __brand: "OntologyBranchRid" };
export type OntologyProposalRid = string & { readonly __brand: "OntologyProposalRid" };
export type OntologyVersionRef = string & { readonly __brand: "OntologyVersionRef" };

export const ontologyBranchRid = (s: string): OntologyBranchRid => s as OntologyBranchRid;
export const ontologyProposalRid = (s: string): OntologyProposalRid =>
  s as OntologyProposalRid;
export const ontologyVersionRef = (s: string): OntologyVersionRef => s as OntologyVersionRef;

export type OntologyResourceKind =
  | "object-type"
  | "link-type"
  | "interface-type"
  | "action-type"
  | "object-view"
  | "aip-logic-function"
  | "aip-agent"
  | "evaluation-suite"
  | "osdk-application";

export interface OntologyResourceRef {
  readonly kind: OntologyResourceKind;
  readonly rid: string;
}

export interface OntologyBranchDeclaration {
  readonly branchId: OntologyBranchRid;
  readonly kind: "global-branch" | "ai-fde-working-branch" | "scenario-branch";
  readonly baseOntologyVersion: OntologyVersionRef;
  readonly parentBranchId?: OntologyBranchRid;
  readonly purpose: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly isolation: "ontology-only" | "app-preview" | "full-sandbox";
  readonly affectedResources: readonly OntologyResourceRef[];
}

export type OntologyProposalStatus =
  | "draft"
  | "ready-for-review"
  | "approved"
  | "rejected"
  | "merged"
  | "abandoned";

export interface OntologyProposalDeclaration {
  readonly proposalId: OntologyProposalRid;
  readonly sourceBranchId: OntologyBranchRid;
  readonly targetBranchId?: OntologyBranchRid;
  readonly title: string;
  readonly status: OntologyProposalStatus;
  readonly affectedResources: readonly OntologyResourceRef[];
  readonly reviewerIds?: readonly string[];
  readonly validationSummary?: {
    readonly evalRunIds?: readonly string[];
    readonly testsPassed?: boolean;
    readonly impactRadius?: number;
    readonly notes?: string;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class OntologyBranchProposalRegistry {
  private readonly branches = new Map<OntologyBranchRid, OntologyBranchDeclaration>();
  private readonly proposals = new Map<OntologyProposalRid, OntologyProposalDeclaration>();

  registerBranch(decl: OntologyBranchDeclaration): void {
    this.branches.set(decl.branchId, decl);
  }

  registerProposal(decl: OntologyProposalDeclaration): void {
    this.proposals.set(decl.proposalId, decl);
  }

  getBranch(rid: OntologyBranchRid): OntologyBranchDeclaration | undefined {
    return this.branches.get(rid);
  }

  getProposal(rid: OntologyProposalRid): OntologyProposalDeclaration | undefined {
    return this.proposals.get(rid);
  }

  listBranches(): OntologyBranchDeclaration[] {
    return [...this.branches.values()];
  }

  listProposals(): OntologyProposalDeclaration[] {
    return [...this.proposals.values()];
  }
}

export const ONTOLOGY_BRANCH_PROPOSAL_REGISTRY = new OntologyBranchProposalRegistry();
