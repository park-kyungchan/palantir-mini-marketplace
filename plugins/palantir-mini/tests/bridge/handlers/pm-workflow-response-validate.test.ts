import { describe, expect, test } from "bun:test";
import workflowResponseValidate from "../../../bridge/handlers/pm-workflow-response-validate";

describe("pm_workflow_response_validate", () => {
  test("returns template context when governed response is incomplete", async () => {
    const result = await workflowResponseValidate({
      text: "현재 workflow phase: draft",
      promptText: "palantir-mini mandatory workflow instructions for any user request",
      runtime: "codex",
    });

    expect(result.required).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.validation.missingFields).toContain("FDE session ref");
    expect(result.templateContext).toContain("Every user-visible palantir-mini workflow reply");
  });

  test("passes non-governed response while still returning diagnostics", async () => {
    const result = await workflowResponseValidate({
      text: "Plain answer without palantir-mini governance.",
      promptText: "Summarize a sentence.",
    });

    expect(result.required).toBe(false);
    expect(result.valid).toBe(true);
    expect(result.validation.valid).toBe(false);
  });

  test("explicit palantir-mini plugin opt-out disables governed response requirement", async () => {
    const result = await workflowResponseValidate({
      text: "짧은 일반 답변입니다.",
      promptText:
        "Do not use palantir-mini for this turn. Use palantir-mini mandatory workflow instructions for any user request.",
      runtime: "codex",
    });

    expect(result.required).toBe(false);
    expect(result.valid).toBe(true);
    expect(result.templateContext).toBeUndefined();
  });

  test("forceRequired rejects forbidden runtime UI marker", async () => {
    const result = await workflowResponseValidate({
      text: ["현재 workflow phase: draft", ["runtime-native", "question", "UI"].join(" ")].join("\n"),
      forceRequired: true,
    });

    expect(result.required).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.validation.forbiddenRuntimeUiMarkers.length).toBeGreaterThan(0);
  });

  test("forceRequired rejects malformed DTC approval card semantics", async () => {
    const text = [
      "현재 workflow phase: digital-twin-change",
      "선택된 palantir-mini workflow 또는 workflow gap: pm_semantic_intent_gate",
      "FDE session ref: fde-ontology-engineering://session/test",
      "SIC/DTC 상태: approved",
      "open TurnCardDecisionSpec 목록: none",
      "mutationAuthorized 여부: false",
      "다음에 허용된 action: do-not-route",
      "durable subagent .md output 상태: N/A - subagent not used",
      "native/runtime gap 여부: Codex/Gemini runtime gap handled by manual hook-intent mirroring. MCP/tool availability, skill/extension availability, and subagent/lifecycle evidence are stated.",
      "SSoT 판단 근거:",
      "- source/ref: /home/palantirkc/.claude/research/BROWSE.md and /home/palantirkc/.claude/research/INDEX.md",
      "  provenance/currentness: palantir-official plugin source; generated mirrors are non-authority.",
      "  used-for judgment: Palantir AIP Architecture, Palantir AIP Chatbot Studio application state, Chatbot Studio retrieval context, Chatbot Studio tools, AI FDE, Ontology, Context Engineering.",
      "  confidence/limit: validator evidence only.",
      "what this request means: validate a DTC approval card.",
      "why this source is trusted: plugin source.",
      "what I am allowed to do now: reject malformed approval-card text.",
      "what needs user approval: approved DTC ref.",
      "what gap or uncertainty remains: Codex runtime gap.",
      "DigitalTwinChangeContract approval card",
      "DTC 5개 추천안 승인",
      "DTC primitive readiness: DATA, LOGIC, ACTION, GOVERNANCE, TECHNOLOGY",
    ].join("\n");

    const result = await workflowResponseValidate({
      text,
      forceRequired: true,
      runtime: "codex",
      enforcementSurface: "MCP",
    });

    expect(result.required).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.validation.missingFields).toEqual([]);
    expect(result.validation.dtcApprovalCardViolations.length).toBeGreaterThan(0);
    expect(result.templateContext).toContain("ontology-dtc-build");
  });
});
