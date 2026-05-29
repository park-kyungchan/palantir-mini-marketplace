// palantir-mini - workflow response template contract.
//
// This file owns the plugin-visible text contract for palantir-mini mandatory
// workflow replies. The filename is retained for compatibility with the first
// Ontology Engineering enforcement slice. Generic exports below are preferred.

export const PALANTIR_MINI_WORKFLOW_RESPONSE_TEMPLATE_DOC =
  "docs/ONTOLOGY_ENGINEERING_RESPONSE_TEMPLATE.md";

export const PALANTIR_MINI_WORKFLOW_RESPONSE_REQUIRED_FIELDS = [
  "현재 workflow phase",
  "선택된 palantir-mini workflow 또는 workflow gap",
  "FDE session ref",
  "SIC/DTC 상태",
  "open TurnCardDecisionSpec 목록",
  "mutationAuthorized 여부",
  "다음에 허용된 action",
  "durable subagent .md output 상태",
  "native/runtime gap 여부",
  "SSoT 판단 근거",
] as const;

export const PALANTIR_MINI_WORKFLOW_RESPONSE_GAP_REQUIREMENTS = [
  "Claude hook native 여부",
  "Codex runtime gap",
  "manual hook-intent mirroring",
  "MCP/tool availability",
  "subagent/runtime parity",
] as const;

export const PALANTIR_MINI_WORKFLOW_RESPONSE_SSOT_REQUIREMENTS = [
  "Palantir AIP Architecture",
  "Palantir AIP Chatbot Studio",
  "AI FDE",
  "Ontology",
  "Context Engineering",
  "plugin source",
  "generated mirrors are non-authority",
  "source/ref",
  "provenance/currentness",
  "used-for judgment",
  "confidence/limit",
] as const;

export const PALANTIR_MINI_WORKFLOW_RESPONSE_EXPLANATION_REQUIREMENTS = [
  "what this request means",
  "why this source is trusted",
  "what I am allowed to do now",
  "what needs user approval",
  "what gap or uncertainty remains",
] as const;

const LEGACY_QUESTION_UI_MARKERS = [
  ["ask", "user", "question"].join(""),
  ["request", "user", "input"].join("_"),
  ["manual", "review", "card"].join("-"),
  ["runtime", "question", "ui"].join(""),
] as const;

const FORBIDDEN_RUNTIME_UI_MARKERS = [
  ["request", "user", "input"].join("_"),
  ["Ask", "User", "Question"].join(""),
  ["manual", "review", "card"].join("-"),
  ["runtime", "Question", "Ui"].join(""),
  ["runtime-native", "question", "UI"].join(" "),
] as const;

const FALSE_PARITY_CLAIM_MARKERS = [
  "claude/codex parity",
  "claude hook parity",
  "codex hook parity",
  "native hook parity",
] as const;

const PARITY_LIMIT_MARKERS = [
  "not proven",
  "not native",
  "runtime gap",
  "smoke evidence",
  "증명되지",
  "gap",
  "한계",
] as const;

const PALANTIR_MINI_WORKFLOW_RESPONSE_MARKERS = [
  "palantir-mini mandatory workflow",
  "mandatory workflow instructions for any user request",
  "palantir-mini workflow",
  "selected palantir-mini workflow",
  "workflow/runtime gap",
  "prompt-front-door",
  "semantic gate",
  "pm_semantic_intent_gate",
  "pm_intent_router",
  "mutationauthorized",
  "ssot decision basis",
  "source/ref",
  "provenance/currentness",
  "native/runtime gap",
  "workflowcontract",
  "turncarddecisionspec",
  "userdecisionrecord",
  ...LEGACY_QUESTION_UI_MARKERS,
  "ontology engineering",
  "ontology-engineering",
  "ontologyengineering",
  "fdeontologyengineering",
  "fde-ontology-engineering",
  "semanticintentcontract",
  "digitaltwinchangecontract",
  "context-engineering-to-sic",
  "ontology-dtc-build",
  "objecttype",
  "linktype",
  "actiontype",
  "function",
  "applicationstate",
  "eval",
  "chatbot/application context",
  "claude hook",
  "codex runtime gap",
  "chatbot studio",
  "ai fde",
] as const;

export interface PalantirMiniWorkflowResponseTemplateContextInput {
  readonly runtime?: string;
  readonly enforcementSurface?: string;
}

export interface PalantirMiniWorkflowResponseTemplateValidation {
  readonly valid: boolean;
  readonly missingFields: readonly string[];
  readonly missingGapRequirements: readonly string[];
  readonly missingSsotRequirements: readonly string[];
  readonly missingExplanationRequirements: readonly string[];
  readonly forbiddenRuntimeUiMarkers: readonly string[];
  readonly falseParityClaimMarkers: readonly string[];
  readonly authorityOverclaimMarkers: readonly string[];
}

export function isPalantirMiniWorkflowResponseRequired(text: string): boolean {
  const normalized = text.toLowerCase();
  return PALANTIR_MINI_WORKFLOW_RESPONSE_MARKERS.some((marker) =>
    normalized.includes(marker),
  );
}

export function buildPalantirMiniWorkflowResponseTemplateContext(
  input: PalantirMiniWorkflowResponseTemplateContextInput = {},
): string {
  const runtime = input.runtime ?? "unknown";
  const surface = input.enforcementSurface ?? "unknown";
  const requiredFields = PALANTIR_MINI_WORKFLOW_RESPONSE_REQUIRED_FIELDS.join("; ");
  const gapRequirements = PALANTIR_MINI_WORKFLOW_RESPONSE_GAP_REQUIREMENTS.join("; ");
  const ssotRequirements = PALANTIR_MINI_WORKFLOW_RESPONSE_SSOT_REQUIREMENTS.join("; ");
  const explanationRequirements =
    PALANTIR_MINI_WORKFLOW_RESPONSE_EXPLANATION_REQUIREMENTS.join("; ");
  return [
    "palantir-mini workflow response template is mandatory for governed palantir-mini turns.",
    `Template authority=${PALANTIR_MINI_WORKFLOW_RESPONSE_TEMPLATE_DOC}; Runtime=${runtime}; Enforcement surface=${surface}`,
    "",
    `Every user-visible palantir-mini workflow reply must include these fields: ${requiredFields}.`,
    "",
    "N/A rule: say why; if no workflow fits, state workflow/runtime gap.",
    "",
    "Durable subagent disclosure: state .md output status, paths or N/A reason, and Lead-capture/runtime gap before context compaction.",
    "",
    `Runtime gap disclosure is mandatory: ${gapRequirements}. In Codex, Claude hooks are not proven native without smoke evidence; say manual hook-intent mirroring or manually mirrored when applicable. No Claude/Codex parity claim without evidence.`,
    "",
    `SSoT 판단 근거: include ${ssotRequirements}; use schema, hook, rule, MCP output, or research source as applicable. plugin source is workflow authority; cache/local loaders are consumer surfaces only. plugin snapshot is not live official-doc currentness.`,
    "",
    "Deterministic boundary: DATA/LOGIC/ACTION/GOVERNANCE uses context-engineering-to-sic. Ontology DTC uses ontology-dtc-build T0..T6: ObjectType, LinkType, ActionType, Function, Chatbot/Application State, Replay/Eval/Validation, ready-for-DTC. Missing approval, mutationAuthorized=false, router mismatch, blocking TurnCards, or missing ObjectType/LinkType/ActionType/Function/ApplicationState/Eval readiness blocks mutation.",
    "",
    `Plain-language explanation for non-developers must cover: ${explanationRequirements}.`,
    "",
    "Question UI boundary: do not use runtime-native question UI for palantir-mini workflow decisions; render WorkflowContract / TurnCardDecisionSpec in assistant text and interpret the user's text answer as UserDecisionRecord.",
  ].join("\n");
}

export function validatePalantirMiniWorkflowResponseTemplateText(
  text: string,
): PalantirMiniWorkflowResponseTemplateValidation {
  const missingFields = PALANTIR_MINI_WORKFLOW_RESPONSE_REQUIRED_FIELDS.filter(
    (field) => !text.includes(field),
  );
  const lower = text.toLowerCase();
  const missingGapRequirements =
    PALANTIR_MINI_WORKFLOW_RESPONSE_GAP_REQUIREMENTS.filter((requirement) => {
      if (requirement === "Claude hook native 여부") {
        return !text.includes("Claude hook") && !text.includes("Claude hooks");
      }
      if (requirement === "Codex runtime gap") {
        return !(lower.includes("codex") && lower.includes("runtime gap"));
      }
      if (requirement === "manual hook-intent mirroring") {
        return !lower.includes("manual") && !text.includes("수동");
      }
      if (requirement === "MCP/tool availability") {
        return !lower.includes("mcp") && !lower.includes("tool");
      }
      return !lower.includes("subagent") && !lower.includes("parity");
    });
  const missingSsotRequirements =
    PALANTIR_MINI_WORKFLOW_RESPONSE_SSOT_REQUIREMENTS.filter((requirement) => {
      if (requirement === "Palantir AIP Architecture") {
        return !lower.includes("aip architecture");
      }
      if (requirement === "Palantir AIP Chatbot Studio") {
        return !lower.includes("chatbot studio") && !lower.includes("chatbot-studio");
      }
      if (requirement === "AI FDE") {
        return !text.includes("FDE");
      }
      if (requirement === "plugin source") {
        return !lower.includes("plugin source") && !text.includes("plugin-owned");
      }
      if (requirement === "generated mirrors are non-authority") {
        return (
          !lower.includes("generated mirror") &&
          !lower.includes("mirrors") &&
          !lower.includes("non-authority")
        );
      }
      if (requirement === "source/ref") {
        return !lower.includes("source") && !lower.includes("ref") && !text.includes("출처");
      }
      if (requirement === "provenance/currentness") {
        return (
          !lower.includes("provenance") &&
          !lower.includes("currentness") &&
          !text.includes("최신성") &&
          !text.includes("근거")
        );
      }
      if (requirement === "used-for judgment") {
        return !lower.includes("used-for") && !text.includes("판단");
      }
      if (requirement === "confidence/limit") {
        return !lower.includes("confidence") && !lower.includes("limit") && !text.includes("한계");
      }
      return !text.includes(requirement);
    });
  const missingExplanationRequirements =
    PALANTIR_MINI_WORKFLOW_RESPONSE_EXPLANATION_REQUIREMENTS.filter((requirement) => {
      if (text.includes(requirement)) return false;
      if (requirement === "what this request means") {
        return !text.includes("요청") && !lower.includes("request means");
      }
      if (requirement === "why this source is trusted") {
        return !text.includes("trusted") && !text.includes("신뢰");
      }
      if (requirement === "what I am allowed to do now") {
        return !text.includes("allowed") && !text.includes("허용");
      }
      if (requirement === "what needs user approval") {
        return !text.includes("approval") && !text.includes("승인");
      }
      return !text.includes("gap") && !text.includes("uncertainty") && !text.includes("불확실");
    });
  const forbiddenRuntimeUiMarkers = FORBIDDEN_RUNTIME_UI_MARKERS.filter((marker) =>
    lower.includes(marker.toLowerCase()),
  );
  const hasParityLimit = PARITY_LIMIT_MARKERS.some((marker) =>
    lower.includes(marker.toLowerCase()),
  );
  const falseParityClaimMarkers = hasParityLimit
    ? []
    : FALSE_PARITY_CLAIM_MARKERS.filter((marker) => lower.includes(marker));
  const authorityOverclaimMarkers = [
    ...(lower.includes("generated mirror") &&
    lower.includes("authority") &&
    !lower.includes("non-authority")
      ? ["generated mirror authority overclaim"]
      : []),
    ...((lower.includes(".codex") || lower.includes("cache") || lower.includes("local loader")) &&
    lower.includes("semantic authority")
      ? ["runtime-local semantic authority overclaim"]
      : []),
  ];

  return {
    valid:
      missingFields.length === 0 &&
      missingGapRequirements.length === 0 &&
      missingSsotRequirements.length === 0 &&
      missingExplanationRequirements.length === 0 &&
      forbiddenRuntimeUiMarkers.length === 0 &&
      falseParityClaimMarkers.length === 0 &&
      authorityOverclaimMarkers.length === 0,
    missingFields,
    missingGapRequirements,
    missingSsotRequirements,
    missingExplanationRequirements,
    forbiddenRuntimeUiMarkers,
    falseParityClaimMarkers,
    authorityOverclaimMarkers,
  };
}

// Backward-compatible exports for the Ontology Engineering enforcement slice.
export const ONTOLOGY_ENGINEERING_RESPONSE_TEMPLATE_DOC =
  PALANTIR_MINI_WORKFLOW_RESPONSE_TEMPLATE_DOC;
export const ONTOLOGY_ENGINEERING_RESPONSE_REQUIRED_FIELDS =
  PALANTIR_MINI_WORKFLOW_RESPONSE_REQUIRED_FIELDS;
export const ONTOLOGY_ENGINEERING_RESPONSE_GAP_REQUIREMENTS =
  PALANTIR_MINI_WORKFLOW_RESPONSE_GAP_REQUIREMENTS;
export const ONTOLOGY_ENGINEERING_RESPONSE_SSOT_REQUIREMENTS =
  PALANTIR_MINI_WORKFLOW_RESPONSE_SSOT_REQUIREMENTS;

export interface OntologyEngineeringResponseTemplateContextInput
  extends PalantirMiniWorkflowResponseTemplateContextInput {}

export interface OntologyEngineeringResponseTemplateValidation
  extends PalantirMiniWorkflowResponseTemplateValidation {}

export function isOntologyEngineeringResponseRequired(text: string): boolean {
  return isPalantirMiniWorkflowResponseRequired(text);
}

export function buildOntologyEngineeringResponseTemplateContext(
  input: OntologyEngineeringResponseTemplateContextInput = {},
): string {
  return buildPalantirMiniWorkflowResponseTemplateContext(input);
}

export function validateOntologyEngineeringResponseTemplateText(
  text: string,
): OntologyEngineeringResponseTemplateValidation {
  return validatePalantirMiniWorkflowResponseTemplateText(text);
}
