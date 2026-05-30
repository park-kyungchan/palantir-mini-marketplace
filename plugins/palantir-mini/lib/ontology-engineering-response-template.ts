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
  "Codex/Gemini runtime gap",
  "manual hook-intent mirroring",
  "MCP/tool availability",
  "skill/extension availability",
  "subagent/lifecycle evidence",
] as const;

export const PALANTIR_MINI_WORKFLOW_RESPONSE_SSOT_REQUIREMENTS = [
  "research BROWSE/INDEX",
  "palantir-official",
  "Palantir AIP Architecture",
  "Palantir AIP Chatbot Studio",
  "Chatbot Studio application state",
  "Chatbot Studio retrieval context",
  "Chatbot Studio tools",
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
  "claude/codex/gemini parity",
  "claude hook parity",
  "codex hook parity",
  "gemini hook parity",
  "native hook parity",
  "codex parity is complete",
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

const DTC_APPROVAL_CARD_CONTEXT_MARKERS = [
  "approval card",
  "turncard",
  "decision card",
  "decisionSpec",
  "recommendedChoiceId",
  "choiceId",
  "추천안 승인",
  "승인 카드",
  "선택지",
  "primitive readiness",
  "ontology primitive",
  "ObjectType",
  "LinkType",
  "ActionType",
  "Application State",
] as const;

const DTC_APPROVAL_CARD_NEGATING_MARKERS = [
  "fail closed",
  "reject",
  "rejected",
  "invalid",
  "superseded",
  "old phrase",
  "do not",
  "must not",
  "forbidden",
  "blocked",
  "bad card",
  "regression",
  "not dtc primitive readiness",
  "not dtc readiness",
  "차단",
  "거부",
  "금지",
  "무효",
  "이전 표현",
  "잘못",
  "실패",
  "회귀",
] as const;

const DTC_APPROVAL_CARD_LANE_TERMS = [
  "DATA",
  "LOGIC",
  "ACTION",
  "GOVERNANCE",
  "TECHNOLOGY",
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
  ".claude/research/browse.md",
  "research_context_select",
  "palantir-official",
  "retrieval context",
  "application state",
  "claude hook",
  "codex runtime gap",
  "chatbot studio",
  "ai fde",
] as const;

const PALANTIR_MINI_PLUGIN_DIRECT_OPT_OUT_MARKERS = [
  "do not use palantir-mini",
  "don't use palantir-mini",
  "without palantir-mini",
  "skip palantir-mini",
  "avoid palantir-mini",
  "palantir-mini plugin 사용하지 말고",
  "palantir-mini 플러그인 사용하지 말고",
  "palantir-mini 사용하지 말고",
  "palantir-mini 쓰지 말고",
  "palantir-mini plugin 쓰지 말고",
  "palantir-mini 플러그인 쓰지 말고",
  "palantir-mini 없이",
  "palantir-mini 제외하고",
  "palantir-mini 빼고",
] as const;

export interface PalantirMiniPluginOptOut {
  readonly explicit: true;
  readonly matchedMarker: string;
  readonly reason: string;
}

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
  readonly dtcApprovalCardViolations: readonly string[];
}

export function detectPalantirMiniPluginOptOut(text: string): PalantirMiniPluginOptOut | undefined {
  const lower = text.toLowerCase();
  const matchedMarker = PALANTIR_MINI_PLUGIN_DIRECT_OPT_OUT_MARKERS.find((marker) =>
    lower.includes(marker.toLowerCase()),
  );
  if (!matchedMarker) return undefined;
  return {
    explicit: true,
    matchedMarker,
    reason:
      "User prompt explicitly requested that the palantir-mini plugin not be used for this turn.",
  };
}

export function isPalantirMiniPluginExplicitlyDisabled(text: string): boolean {
  return detectPalantirMiniPluginOptOut(text) !== undefined;
}

export function isPalantirMiniWorkflowResponseRequired(text: string): boolean {
  if (isPalantirMiniPluginExplicitlyDisabled(text)) return false;
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
    `Runtime gap disclosure is mandatory: ${gapRequirements}. In Codex, Claude hooks are not native unless smoke-proven; say manual hook-intent mirroring (manually mirrored). No parity claim without evidence.`,
    "",
    `SSoT 판단 근거: include ${ssotRequirements}. Authority: research routers, palantir-official, plugin source. Chatbot Studio: app-state/retrieval/tools. plugin snapshot is not live official-doc currentness; generated mirrors are non-authority; cache/local loaders are consumer surfaces only.`,
    "",
    "Deterministic boundary: context-engineering-to-sic uses DATA/LOGIC/ACTION/GOVERNANCE. ontology-dtc-build T0..T6 requires ObjectType, LinkType, ActionType, Function, ApplicationState/Eval readiness, ready-for-DTC. Missing approval, mutationAuthorized=false, router mismatch, or blocking TurnCards blocks mutation.",
    "",
    `Plain-language explanation for non-developers must cover: ${explanationRequirements}.`,
    "",
    "Question UI boundary: do not use runtime-native question UI for palantir-mini workflow decisions; render WorkflowContract / TurnCardDecisionSpec in assistant text and interpret the user's text answer as UserDecisionRecord.",
  ].join("\n");
}

function includesAnyCaseInsensitive(text: string, markers: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return markers.some((marker) => lower.includes(marker.toLowerCase()));
}

function indexOfCaseInsensitive(text: string, marker: string): number {
  return text.toLowerCase().indexOf(marker.toLowerCase());
}

function hasNegatingContext(text: string, index: number): boolean {
  if (index < 0) return false;
  const lower = text.toLowerCase();
  const start = Math.max(0, index - 140);
  const end = Math.min(lower.length, index + 140);
  const window = lower.slice(start, end);
  return DTC_APPROVAL_CARD_NEGATING_MARKERS.some((marker) =>
    window.includes(marker.toLowerCase()),
  );
}

function hasNonNegatedMarker(text: string, markers: readonly string[]): boolean {
  return markers.some((marker) => {
    const index = indexOfCaseInsensitive(text, marker);
    return index >= 0 && !hasNegatingContext(text, index);
  });
}

function hasDtcSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\bdtc\b/i.test(text) ||
    lower.includes("digitaltwinchangecontract") ||
    lower.includes("digital twin change") ||
    lower.includes("digital-twin-change")
  );
}

function hasDtcApprovalSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("approval") ||
    lower.includes("approve") ||
    lower.includes("approved") ||
    text.includes("승인")
  );
}

function hasDtcApprovalCardContext(text: string): boolean {
  return hasNonNegatedMarker(text, DTC_APPROVAL_CARD_CONTEXT_MARKERS);
}

function hasExplicitDtcApprovalCardContext(text: string): boolean {
  return hasNonNegatedMarker(text, [
    "DigitalTwinChangeContract approval card",
    "DTC approval card",
    "approval card",
    "승인 카드",
  ]);
}

function hasDtcPrimitiveLaneMisuse(text: string): boolean {
  const lower = text.toLowerCase();
  const hasLaneCluster = DTC_APPROVAL_CARD_LANE_TERMS.filter((term) =>
    lower.includes(term.toLowerCase()),
  ).length >= 3;
  if (!hasLaneCluster) return false;
  const readinessIndex = [
    "dtc primitive",
    "dtc readiness",
    "primitive readiness",
    "ontology primitive",
    "ready-for-dtc",
  ]
    .map((marker) => indexOfCaseInsensitive(text, marker))
    .find((index) => index >= 0);
  return readinessIndex !== undefined && !hasNegatingContext(text, readinessIndex);
}

function hasApprovedDtcClaim(text: string): boolean {
  const lower = text.toLowerCase();
  const markers = [
    "sic/dtc 상태: approved",
    "dtc 상태: approved",
    "approved dtc",
    "dtc approved",
    "approved-dtc",
    "dtc 승인",
    "dtc가 승인",
  ];
  return markers.some((marker) => {
    const index = lower.indexOf(marker);
    return index >= 0 && !hasNegatingContext(text, index);
  });
}

function hasActualDtcApprovalRequest(text: string): boolean {
  const approvalRequestMarkers = [
    "DTC 5개 추천안 승인",
    "Ontology DTC T0-T6 추천안 승인",
    "추천안 승인",
    "approve this DTC",
    "approve the DTC",
    "select approval",
    "승인하려면",
    "승인 문구",
  ] as const;
  return hasNonNegatedMarker(text, approvalRequestMarkers);
}

function missingOntologyDtcBuildLabels(text: string): readonly string[] {
  const lower = text.toLowerCase();
  const requiredLabels = ["T0", "T1", "T2", "T3", "T4", "T5", "T6"] as const;
  return requiredLabels.filter((label) => !lower.includes(label.toLowerCase()));
}

export function validateDtcApprovalCardText(text: string): readonly string[] {
  if (!hasDtcSignal(text) || !hasDtcApprovalSignal(text)) return [];

  const legacyPhraseIndex = indexOfCaseInsensitive(text, "DTC 5개 추천안 승인");
  const primitiveLaneMisuse = hasDtcPrimitiveLaneMisuse(text);
  const approvalRequest = hasActualDtcApprovalRequest(text);
  const approvedDtcClaim = hasApprovedDtcClaim(text);
  const explicitApprovalCardContext = hasExplicitDtcApprovalCardContext(text);
  const requiresApprovalCardContract =
    approvalRequest ||
    legacyPhraseIndex >= 0 ||
    primitiveLaneMisuse ||
    explicitApprovalCardContext;
  const cardCandidate =
    hasDtcApprovalCardContext(text) ||
    legacyPhraseIndex >= 0 ||
    primitiveLaneMisuse ||
    approvalRequest;

  if (!cardCandidate) return [];

  const violations: string[] = [];
  if (legacyPhraseIndex >= 0 && !hasNegatingContext(text, legacyPhraseIndex)) {
    violations.push("legacy DTC approval phrase `DTC 5개 추천안 승인` is not allowed");
  }
  if (primitiveLaneMisuse) {
    violations.push(
      "DATA/LOGIC/ACTION/GOVERNANCE/TECHNOLOGY must not be presented as DTC primitive readiness",
    );
  }

  if (requiresApprovalCardContract) {
    if (!text.toLowerCase().includes("ontology-dtc-build")) {
      violations.push("ontology-affecting DTC approval cards must name ontology-dtc-build");
    }
    const missingLabels = missingOntologyDtcBuildLabels(text);
    if (missingLabels.length > 0) {
      violations.push(
        `ontology-affecting DTC approval cards must include T0-T6 labels; missing ${missingLabels.join(", ")}`,
      );
    }
  }

  if (
    /mutationauthorized\s*(?:여부)?\s*[:=]\s*false/i.test(text) &&
    requiresApprovalCardContract &&
    !includesAnyCaseInsensitive(text, ["mutation is blocked", "mutation blocked", "mutation 차단"])
  ) {
    violations.push("DTC approval card asks for approval while mutationAuthorized=false");
  }

  const lower = text.toLowerCase();
  if (
    approvedDtcClaim &&
    requiresApprovalCardContract &&
    !lower.includes("approvalref") &&
    !lower.includes("approval ref") &&
    !lower.includes("approved dtc ref") &&
    !lower.includes("dtc ref")
  ) {
    violations.push("approved-DTC wording must include an approved DTC ref or approvalRef");
  }

  if (
    requiresApprovalCardContract &&
    (lower.includes("generated") || lower.includes("cache") || lower.includes("proposal")) &&
    lower.includes("authority") &&
    !lower.includes("non-authority") &&
    !lower.includes("proposal-only")
  ) {
    violations.push("generated/cache/proposal artifacts must not be presented as authority");
  }

  return violations;
}

export function assertDtcApprovalCardTextBeforeDisplay(input: {
  readonly text: string;
  readonly surface: string;
}): void {
  const violations = validateDtcApprovalCardText(input.text);
  if (violations.length === 0) return;
  throw new Error(
    [
      `DTC approval-card display blocked on ${input.surface}.`,
      ...violations.map((violation) => `- ${violation}`),
    ].join("\n"),
  );
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
      if (requirement === "Codex/Gemini runtime gap") {
        return !(
          lower.includes("claude") &&
          lower.includes("codex") &&
          lower.includes("gemini") &&
          lower.includes("runtime gap")
        );
      }
      if (requirement === "manual hook-intent mirroring") {
        return !lower.includes("manual") && !text.includes("수동");
      }
      if (requirement === "MCP/tool availability") {
        return !lower.includes("mcp") && !lower.includes("tool");
      }
      if (requirement === "skill/extension availability") {
        return !lower.includes("skill") && !lower.includes("extension");
      }
      return !lower.includes("subagent") && !lower.includes("lifecycle");
    });
  const missingSsotRequirements =
    PALANTIR_MINI_WORKFLOW_RESPONSE_SSOT_REQUIREMENTS.filter((requirement) => {
      if (requirement === "research BROWSE/INDEX") {
        const hasResearchRoot =
          lower.includes(".claude/research") || lower.includes("research router");
        return !(
          hasResearchRoot &&
          (lower.includes("browse.md") || lower.includes("browse/index")) &&
          (lower.includes("index.md") || lower.includes("browse/index"))
        );
      }
      if (requirement === "palantir-official") {
        return !lower.includes("palantir-official");
      }
      if (requirement === "Palantir AIP Architecture") {
        return !lower.includes("aip architecture");
      }
      if (requirement === "Palantir AIP Chatbot Studio") {
        return !lower.includes("chatbot studio") && !lower.includes("chatbot-studio");
      }
      if (requirement === "Chatbot Studio application state") {
        return !(lower.includes("chatbot studio") && lower.includes("application state"));
      }
      if (requirement === "Chatbot Studio retrieval context") {
        return !(lower.includes("chatbot studio") && lower.includes("retrieval context"));
      }
      if (requirement === "Chatbot Studio tools") {
        return !(lower.includes("chatbot studio") && lower.includes("tools"));
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
  const dtcApprovalCardViolations = validateDtcApprovalCardText(text);

  return {
    valid:
      missingFields.length === 0 &&
      missingGapRequirements.length === 0 &&
      missingSsotRequirements.length === 0 &&
      missingExplanationRequirements.length === 0 &&
      forbiddenRuntimeUiMarkers.length === 0 &&
      falseParityClaimMarkers.length === 0 &&
      authorityOverclaimMarkers.length === 0 &&
      dtcApprovalCardViolations.length === 0,
    missingFields,
    missingGapRequirements,
    missingSsotRequirements,
    missingExplanationRequirements,
    forbiddenRuntimeUiMarkers,
    falseParityClaimMarkers,
    authorityOverclaimMarkers,
    dtcApprovalCardViolations,
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
