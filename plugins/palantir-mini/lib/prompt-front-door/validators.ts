import type {
  ContractValidationIssue,
  ContractValidationResult,
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../lead-intent/contracts";
import type { ApprovalRef } from "./approval-ref";
import { validateApprovalRefValue } from "./approval-ref";
import { validateDigitalTwinBoundaryFields } from "./boundary-field";
import type { PromptEnvelope, PromptRuntime } from "./envelope";

export interface PromptContinuityInput {
  readonly envelope: PromptEnvelope;
  readonly expectedPromptHash?: string;
  readonly currentPromptId?: string;
  readonly runtime?: PromptRuntime;
  readonly sessionId?: string;
}

export function validatePromptContinuity(input: PromptContinuityInput): ContractValidationResult {
  const issues: ContractValidationIssue[] = [];
  const { envelope } = input;

  if (input.expectedPromptHash && envelope.promptHash !== input.expectedPromptHash) {
    issues.push({ field: "promptHash", message: "promptHash does not match expected prompt" });
  }
  if (input.currentPromptId && envelope.promptId !== input.currentPromptId) {
    issues.push({ field: "promptId", message: "promptId is not the current prompt pointer" });
  }
  if (input.runtime && envelope.runtime !== input.runtime) {
    issues.push({ field: "runtime", message: "runtime does not match current hook runtime" });
  }
  if (input.sessionId && envelope.sessionId !== input.sessionId) {
    issues.push({ field: "sessionId", message: "sessionId does not match current session" });
  }
  if (envelope.state === "superseded" && !envelope.supersededByPromptId) {
    issues.push({
      field: "supersededByPromptId",
      message: "superseded prompt must point to replacement promptId",
    });
  }

  return { valid: issues.length === 0, issues };
}

export function validateApprovalRef(
  field: string,
  approvalRef: ApprovalRef | undefined,
): ContractValidationResult {
  const issues = validateApprovalRefValue(field, approvalRef);
  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateClarificationClosure(
  contract: SemanticIntentContract,
): ContractValidationResult {
  const openBlocking = contract.clarificationQuestions.filter(
    (q) => q.materiality === "blocking" && q.status === "open",
  );
  return {
    valid: openBlocking.length === 0,
    issues:
      openBlocking.length === 0
        ? []
        : [
            {
              field: "clarificationQuestions",
              message: `${openBlocking.length} blocking clarification question(s) remain open`,
            },
          ],
  };
}

export function validateDigitalTwinStructuredBoundary(
  contract: DigitalTwinChangeContract,
): ContractValidationResult {
  const issues = validateDigitalTwinBoundaryFields(contract.structuredBoundary).map((issue) => ({
    field: issue.field,
    message: issue.message,
  }));
  return { valid: issues.length === 0, issues };
}

export function validateDigitalTwinRiskClosure(
  contract: DigitalTwinChangeContract,
): ContractValidationResult {
  const issues: ContractValidationIssue[] = [];
  const openRisks = contract.risks.filter((risk) => risk.status === "open");
  if (openRisks.length > 0) {
    issues.push({
      field: "risks",
      message: `${openRisks.length} Digital Twin risk(s) remain open`,
    });
  }

  const toolSurfaceWithoutAlternative = contract.risks.filter(
    (risk) =>
      risk.kind === "tool-surface" &&
      risk.status !== "not-applicable" &&
      !risk.designAlternative?.trim(),
  );
  if (toolSurfaceWithoutAlternative.length > 0) {
    issues.push({
      field: "risks.tool-surface",
      message: "tool-surface risks require a designAlternative",
    });
  }

  return { valid: issues.length === 0, issues };
}
