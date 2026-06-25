import { createHash } from "node:crypto";
import { isPromptRuntime } from "./envelope";
import type { PromptRuntime } from "./envelope";

export const APPROVAL_REF_SCHEMA_VERSION = "prompt-front-door/approval-ref/v1";

export type ApprovalSurface =
  | "semantic-intent"
  | "digital-twin-change"
  | "prompt-boundary-field"
  | "developer-source-mutation"
  | "technology-recommendation"
  | "authorized-delivery";

export interface StructuredApprovalRef {
  readonly schemaVersion: typeof APPROVAL_REF_SCHEMA_VERSION;
  readonly kind: "user-explicit-natural-language";
  readonly promptId: string;
  readonly promptHash: string;
  readonly sessionId: string;
  readonly runtime: PromptRuntime;
  readonly approvedAt: string;
  readonly userVisibleSummaryHash: string;
  readonly userAnswerExcerpt: string;
  readonly approvalSurface: ApprovalSurface;
}

export type ApprovalRef = string | StructuredApprovalRef;

export interface CreateUserApprovalRefInput {
  readonly promptId: string;
  readonly promptHash: string;
  readonly sessionId: string;
  readonly runtime: PromptRuntime;
  readonly userVisibleSummary: string;
  readonly userAnswer: string;
  readonly approvalSurface: ApprovalSurface;
  readonly approvedAt?: string;
  readonly excerptLength?: number;
}

export interface ApprovalRefIssue {
  readonly field: string;
  readonly message: string;
}

function excerptApprovalText(value: string, maxLength = 240): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function hashUserVisibleSummary(summary: string): string {
  return `sha256:${createHash("sha256").update(summary, "utf8").digest("hex")}`;
}

export function createUserApprovalRef(
  input: CreateUserApprovalRefInput,
): StructuredApprovalRef {
  return {
    schemaVersion: APPROVAL_REF_SCHEMA_VERSION,
    kind: "user-explicit-natural-language",
    promptId: input.promptId,
    promptHash: input.promptHash,
    sessionId: input.sessionId,
    runtime: input.runtime,
    approvedAt: input.approvedAt ?? new Date().toISOString(),
    userVisibleSummaryHash: hashUserVisibleSummary(input.userVisibleSummary),
    userAnswerExcerpt: excerptApprovalText(input.userAnswer, input.excerptLength),
    approvalSurface: input.approvalSurface,
  };
}

export function isStructuredApprovalRef(ref: ApprovalRef | undefined): ref is StructuredApprovalRef {
  return typeof ref === "object" && ref !== null;
}

export function validateApprovalRefValue(
  field: string,
  ref: ApprovalRef | undefined,
): ApprovalRefIssue[] {
  if (typeof ref === "string") {
    return ref.trim() ? [] : [{ field, message: `${field} is required` }];
  }
  if (!isStructuredApprovalRef(ref)) {
    return [{ field, message: `${field} is required` }];
  }

  const issues: ApprovalRefIssue[] = [];
  if (ref.schemaVersion !== APPROVAL_REF_SCHEMA_VERSION) {
    issues.push({ field: `${field}.schemaVersion`, message: "unsupported approvalRef schema" });
  }
  if (ref.kind !== "user-explicit-natural-language") {
    issues.push({ field: `${field}.kind`, message: "unsupported approvalRef kind" });
  }
  for (const key of [
    "promptId",
    "promptHash",
    "sessionId",
    "approvedAt",
    "userVisibleSummaryHash",
    "userAnswerExcerpt",
  ] as const) {
    if (!ref[key]?.trim()) {
      issues.push({ field: `${field}.${key}`, message: `${field}.${key} is required` });
    }
  }
  if (!isPromptRuntime(ref.runtime)) {
    issues.push({ field: `${field}.runtime`, message: "unsupported approvalRef runtime" });
  }
  if (
    ref.approvalSurface !== "semantic-intent" &&
    ref.approvalSurface !== "digital-twin-change" &&
    ref.approvalSurface !== "prompt-boundary-field" &&
    ref.approvalSurface !== "developer-source-mutation" &&
    ref.approvalSurface !== "technology-recommendation" &&
    ref.approvalSurface !== "authorized-delivery"
  ) {
    issues.push({
      field: `${field}.approvalSurface`,
      message: "unsupported approvalRef approvalSurface",
    });
  }
  if (ref.approvedAt && Number.isNaN(Date.parse(ref.approvedAt))) {
    issues.push({ field: `${field}.approvedAt`, message: "approvalRef.approvedAt is invalid" });
  }
  return issues;
}

export function hasApprovalRef(ref: ApprovalRef | undefined): boolean {
  return validateApprovalRefValue("approvalRef", ref).length === 0;
}

export function approvalRefToString(ref: ApprovalRef | undefined): string | undefined {
  if (typeof ref === "string") return ref;
  if (!isStructuredApprovalRef(ref)) return undefined;
  return [
    ref.kind,
    ref.approvalSurface,
    ref.runtime,
    ref.promptHash.slice(0, 16),
    ref.userVisibleSummaryHash.replace(/^sha256:/, "").slice(0, 16),
  ].join(":");
}
