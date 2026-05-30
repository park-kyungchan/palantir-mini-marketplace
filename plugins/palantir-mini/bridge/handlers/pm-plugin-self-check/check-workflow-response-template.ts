// palantir-mini — pm_plugin_self_check workflow response requirements axis.

import { validatePalantirMiniWorkflowResponseTemplateText } from "../../../lib/ontology-engineering-response-template";
import type { PmPluginSelfCheckStatus } from "./types";

export interface WorkflowResponseTemplateCheckResult {
  status: PmPluginSelfCheckStatus;
  details: string;
  completeSampleValid: boolean;
  forbiddenMarkerRejected: boolean;
}

export function checkWorkflowResponseTemplate(): WorkflowResponseTemplateCheckResult {
  const complete = [
    "현재 workflow phase: validation",
    "선택된 palantir-mini workflow 또는 workflow gap: pm_workflow_response_validate",
    "FDE session ref: N/A with reason",
    "SIC/DTC 상태: N/A with reason",
    "open TurnCardDecisionSpec 목록: none",
    "mutationAuthorized 여부: false",
    "다음에 허용된 action: read-only validation",
    "durable subagent .md output 상태: N/A - self-check sample does not spawn subagents.",
    "native/runtime gap 여부: Codex/Gemini runtime gap은 runtime-native smoke evidence 없이는 parity로 주장하지 않습니다. hook-intent source는 plugin hooks.json SSoT이고 Codex는 adapter automatic live-read로 반영합니다. MCP/tool availability, skill/extension availability, subagent/lifecycle evidence를 함께 보고합니다.",
    "SSoT 판단 근거:",
    "- source/ref: plugin source, ~/.claude/research/BROWSE.md, ~/.claude/research/INDEX.md, ~/.claude/research/palantir-official/foundry/chatbot-studio/application-state.md",
    "  provenance/currentness: research router BROWSE.md/INDEX.md plus palantir-official plugin snapshot; live official-doc currentness not checked. plugin source is authority and generated mirrors are non-authority.",
    "  used-for judgment: Palantir AIP Architecture, Palantir AIP Chatbot Studio application state, Chatbot Studio retrieval context, Chatbot Studio tools, AI FDE, Ontology, and Context Engineering response basis.",
    "  confidence/limit: source evidence is local; runtime gap remains.",
    "what this request means: validate response shape.",
    "why this source is trusted: plugin source is trusted.",
    "what I am allowed to do now: validation only.",
    "what needs user approval: mutation needs approval.",
    "what gap or uncertainty remains: Codex/Gemini runtime gap remains until native smoke evidence exists.",
  ].join("\n");
  const forbidden = `${complete}\n${["runtime-native", "question", "UI"].join(" ")}`;
  const completeResult = validatePalantirMiniWorkflowResponseTemplateText(complete);
  const forbiddenResult = validatePalantirMiniWorkflowResponseTemplateText(forbidden);
  const completeSampleValid = completeResult.valid;
  const forbiddenMarkerRejected = !forbiddenResult.valid &&
    forbiddenResult.forbiddenRuntimeUiMarkers.length > 0;
  const status: PmPluginSelfCheckStatus =
    completeSampleValid && forbiddenMarkerRejected ? "pass" : "fail";

  return {
    status,
    details:
      status === "pass"
        ? "Workflow response requirements validator accepts complete status blocks and rejects forbidden runtime UI markers."
        : "Workflow response requirements validator did not enforce the mandatory response contract.",
    completeSampleValid,
    forbiddenMarkerRejected,
  };
}
