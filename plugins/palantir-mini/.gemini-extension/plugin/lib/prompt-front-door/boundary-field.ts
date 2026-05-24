import type { ApprovalRef } from "./approval-ref";
import { hasApprovalRef } from "./approval-ref";

export type BoundaryFieldStatus =
  | "draft"
  | "approved"
  | "accepted-risk"
  | "mitigated"
  | "not-applicable";

export interface BoundaryField {
  readonly value: string;
  readonly status: BoundaryFieldStatus;
  readonly rationale: string;
  readonly approvalRef?: ApprovalRef;
  readonly evidenceRefs?: readonly string[];
  readonly designAlternative?: string;
}

export interface DigitalTwinChangeBoundary {
  readonly changeBoundary: BoundaryField;
  readonly branchProposalPolicy: BoundaryField;
  readonly permissionBoundary: BoundaryField;
  readonly replayMigrationPlan: BoundaryField;
  readonly observabilityPlan: BoundaryField;
  readonly toolSurfaceReadiness: BoundaryField;
  readonly evaluationPlan: BoundaryField;
}

export interface BoundaryFieldIssue {
  readonly field: string;
  readonly message: string;
}

const CLOSED_STATUSES = new Set<BoundaryFieldStatus>([
  "approved",
  "accepted-risk",
  "mitigated",
  "not-applicable",
]);

const REQUIRED_BOUNDARY_FIELDS = [
  "changeBoundary",
  "branchProposalPolicy",
  "permissionBoundary",
  "replayMigrationPlan",
  "observabilityPlan",
  "toolSurfaceReadiness",
  "evaluationPlan",
] as const;

export type DigitalTwinBoundaryFieldName = (typeof REQUIRED_BOUNDARY_FIELDS)[number];

export function isClosedBoundaryField(field: BoundaryField): boolean {
  return CLOSED_STATUSES.has(field.status);
}

export function validateBoundaryField(
  name: string,
  field: BoundaryField | undefined,
  options: { requireDesignAlternative?: boolean } = {},
): BoundaryFieldIssue[] {
  const issues: BoundaryFieldIssue[] = [];
  if (!field) {
    return [{ field: name, message: `${name} is required` }];
  }

  if (!field.value.trim()) {
    issues.push({ field: `${name}.value`, message: `${name}.value is required` });
  }
  if (!field.rationale.trim()) {
    issues.push({ field: `${name}.rationale`, message: `${name}.rationale is required` });
  }
  if (!isClosedBoundaryField(field)) {
    issues.push({ field: `${name}.status`, message: `${name}.status is not closed` });
  }
  if (field.status === "approved" && !hasApprovalRef(field.approvalRef)) {
    issues.push({
      field: `${name}.approvalRef`,
      message: `${name}.approvalRef is required when approved`,
    });
  }
  if (options.requireDesignAlternative && !field.designAlternative?.trim()) {
    issues.push({
      field: `${name}.designAlternative`,
      message: `${name}.designAlternative is required`,
    });
  }

  return issues;
}

export function validateDigitalTwinBoundaryFields(
  boundary: DigitalTwinChangeBoundary | undefined,
): BoundaryFieldIssue[] {
  if (!boundary) {
    return [{ field: "structuredBoundary", message: "structuredBoundary is required" }];
  }

  const issues: BoundaryFieldIssue[] = [];
  for (const fieldName of REQUIRED_BOUNDARY_FIELDS) {
    issues.push(
      ...validateBoundaryField(fieldName, boundary[fieldName], {
        requireDesignAlternative: fieldName === "toolSurfaceReadiness",
      }),
    );
  }
  return issues;
}
