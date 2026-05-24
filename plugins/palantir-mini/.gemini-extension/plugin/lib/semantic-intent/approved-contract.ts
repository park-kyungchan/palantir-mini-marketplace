import {
  hasApprovalRef,
  type ApprovalRef,
  type SemanticIntentContract,
} from "../lead-intent/contracts";

export type ApprovedSemanticIntentContract = SemanticIntentContract & {
  readonly status: "approved";
  readonly approvalRef: ApprovalRef;
  readonly contractId: string;
};

export function isApprovedSemanticIntentContract(
  contract: SemanticIntentContract | undefined,
): contract is ApprovedSemanticIntentContract {
  return Boolean(
    contract &&
      contract.status === "approved" &&
      typeof contract.contractId === "string" &&
      contract.contractId.trim().length > 0 &&
      hasApprovalRef(contract.approvalRef),
  );
}

export function semanticIntentContractRefFromApproved(
  contract: SemanticIntentContract,
): string {
  if (!isApprovedSemanticIntentContract(contract)) {
    throw new Error(
      "semanticIntentContractRef requires an approved SemanticIntentContract with contractId and approvalRef.",
    );
  }
  return contract.contractId;
}
