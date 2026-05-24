// palantir-mini — MCP handler: pm_workflow_response_validate
// Validates user-visible palantir-mini workflow response text against the
// plugin-owned mandatory response template.

import {
  PALANTIR_MINI_WORKFLOW_RESPONSE_TEMPLATE_DOC,
  buildPalantirMiniWorkflowResponseTemplateContext,
  isPalantirMiniWorkflowResponseRequired,
  validatePalantirMiniWorkflowResponseTemplateText,
  type PalantirMiniWorkflowResponseTemplateValidation,
} from "../../lib/ontology-engineering-response-template";

export interface WorkflowResponseValidateInput {
  readonly text?: string;
  readonly promptText?: string;
  readonly runtime?: string;
  readonly enforcementSurface?: string;
  readonly forceRequired?: boolean;
}

export interface WorkflowResponseValidateResult {
  readonly required: boolean;
  readonly valid: boolean;
  readonly templateDoc: string;
  readonly runtime: string;
  readonly enforcementSurface: string;
  readonly validation: PalantirMiniWorkflowResponseTemplateValidation;
  readonly templateContext?: string;
}

export default async function workflowResponseValidate(
  rawArgs: unknown,
): Promise<WorkflowResponseValidateResult> {
  const args = (rawArgs ?? {}) as WorkflowResponseValidateInput;
  const text = args.text ?? "";
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("pm_workflow_response_validate: `text` is required");
  }

  const promptText = args.promptText ?? text;
  const required =
    Boolean(args.forceRequired) || isPalantirMiniWorkflowResponseRequired(promptText);
  const validation = validatePalantirMiniWorkflowResponseTemplateText(text);
  const runtime = args.runtime ?? "unknown";
  const enforcementSurface = args.enforcementSurface ?? "MCP";

  return {
    required,
    valid: required ? validation.valid : true,
    templateDoc: PALANTIR_MINI_WORKFLOW_RESPONSE_TEMPLATE_DOC,
    runtime,
    enforcementSurface,
    validation,
    ...(required && !validation.valid
      ? {
          templateContext: buildPalantirMiniWorkflowResponseTemplateContext({
            runtime,
            enforcementSurface,
          }),
        }
      : {}),
  };
}
