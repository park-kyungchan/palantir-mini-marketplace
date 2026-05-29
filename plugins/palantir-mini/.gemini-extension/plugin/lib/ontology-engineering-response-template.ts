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
  return [
    "palantir-mini workflow response template is mandatory for this turn when the prompt is governed by palantir-mini mandatory workflow control.",
    `Template authority: ${PALANTIR_MINI_WORKFLOW_RESPONSE_TEMPLATE_DOC}`,
    `Runtime: ${runtime}`,
    `Enforcement surface: ${surface}`,
    "",
    "Every user-visible palantir-mini workflow reply must include these fields:",
    ...PALANTIR_MINI_WORKFLOW_RESPONSE_REQUIRED_FIELDS.map((field) => `- ${field}`),
    "",
    "Non-applicable workflow fields:",
    "- For non-Ontology workflows, FDE session ref and SIC/DTC status may be N/A, but the reply must say why.",
    "- For read-only work, mutationAuthorized must be false or N/A with the read-only reason.",
    "- If no matching workflow exists, state workflow/runtime gap instead of inventing behavior.",
    "",
    "Durable subagent output disclosure is mandatory:",
    "- State durable subagent .md output status for substantial palantir-mini work: paths written, N/A with reason, or runtime gap.",
    "- If runtime-native subagents cannot write files directly, state that Lead captured or must capture the output into .md before context compaction.",
    "",
    "Runtime gap disclosure is mandatory:",
    "- State whether Claude hooks are native in the current runtime.",
    "- In Codex, state that Claude hooks are not proven native and that hook intent is manually mirrored unless smoke evidence proves otherwise.",
    "- State MCP/tool availability, subagent/runtime parity, memory or managed-settings gaps when relevant.",
    "- Do not claim Claude/Codex parity without native runtime smoke evidence.",
    "",
    "SSoT decision-basis disclosure is mandatory when giving a recommendation or judgment:",
    "- Include an 'SSoT 판단 근거' section.",
    "- Name the Palantir AIP Architecture, Palantir AIP Chatbot Studio, AI FDE, Ontology, Context Engineering, plugin source, schema, hook, rule, MCP output, or research source used.",
    "- State that plugin source is workflow authority, generated mirrors are non-authority, and cache/local loaders are consumer surfaces only.",
    "- For each source, state source/ref, provenance/currentness, used-for judgment, confidence/limit, and any runtime gap.",
    "- If a source was not checked live, say so; do not imply live official-doc currentness from a plugin snapshot.",
    "",
    "Deterministic phase boundary:",
    "- DATA, LOGIC, ACTION, and GOVERNANCE are valid only through SIC/context-engineering-to-sic.",
    "- Ontology-affecting DTC must use ontology-dtc-build T0..T6: ObjectType, LinkType, ActionType, Function, Chatbot/Application State, Replay/Eval/Validation, ready-for-DTC.",
    "- mutationAuthorized=false, router domain mismatch, missing approved SIC/DTC refs, open blocking TurnCards, and missing ObjectType/LinkType/ActionType/Function/ApplicationState/Eval readiness are hard blockers.",
    "- Do not summarize a runnable CLI slice as an OntologyEngineering-complete agentic workflow without approved SIC/DTC, WorkContract, SprintContract, router binding, governed implementation, validation, and release evidence.",
    "",
    "Plain-language explanation for non-developers:",
    "- what this request means: explain the user's request in plain language.",
    "- why this source is trusted: explain the authority path or evidence.",
    "- what I am allowed to do now: name the currently allowed action.",
    "- what needs user approval: name any pending decision or mutation gate.",
    "- what gap or uncertainty remains: name the runtime, SSoT, or evidence gap.",
    "",
    "Question UI boundary:",
    "- Do not use runtime-native question UI for palantir-mini workflow decisions.",
    "- Render WorkflowContract / TurnCardDecisionSpec in ordinary assistant text and interpret the user's text answer as UserDecisionRecord.",
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
