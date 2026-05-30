import { describe, expect, test } from "bun:test";
import {
  ONTOLOGY_ENGINEERING_RESPONSE_REQUIRED_FIELDS,
  ONTOLOGY_ENGINEERING_RESPONSE_SSOT_REQUIREMENTS,
  PALANTIR_MINI_WORKFLOW_RESPONSE_EXPLANATION_REQUIREMENTS,
  buildPalantirMiniWorkflowResponseTemplateContext,
  buildOntologyEngineeringResponseTemplateContext,
  assertDtcApprovalCardTextBeforeDisplay,
  detectPalantirMiniPluginOptOut,
  isPalantirMiniPluginExplicitlyDisabled,
  isPalantirMiniWorkflowResponseRequired,
  isOntologyEngineeringResponseRequired,
  validateDtcApprovalCardText,
  validatePalantirMiniWorkflowResponseTemplateText,
  validateOntologyEngineeringResponseTemplateText,
} from "../../lib/ontology-engineering-response-template";

describe("palantir-mini workflow response template", () => {
  test("detects generic workflow and ontology-engineering prompts", () => {
    expect(
      isPalantirMiniWorkflowResponseRequired(
        "Use palantir-mini mandatory workflow instructions for any user request.",
      ),
    ).toBe(true);
    expect(
      isOntologyEngineeringResponseRequired(
        "Start Ontology Engineering with WorkflowContract and TurnCardDecisionSpec.",
      ),
    ).toBe(true);
    expect(isOntologyEngineeringResponseRequired("Summarize this plain text note.")).toBe(false);
  });

  test("honors explicit user opt-out for palantir-mini plugin workflow enforcement", () => {
    const optOutPrompt =
      "Do not use palantir-mini for this turn. Start Ontology Engineering with WorkflowContract.";

    expect(detectPalantirMiniPluginOptOut(optOutPrompt)?.explicit).toBe(true);
    expect(isPalantirMiniPluginExplicitlyDisabled(optOutPrompt)).toBe(true);
    expect(isPalantirMiniWorkflowResponseRequired(optOutPrompt)).toBe(false);
    expect(isOntologyEngineeringResponseRequired(optOutPrompt)).toBe(false);

    const metaPrompt =
      "palantir-mini plugin을 사용하지 말라고 할 경우에는 opt-out을 감지해야 한다.";
    expect(detectPalantirMiniPluginOptOut(metaPrompt)).toBeUndefined();
  });

  test("builds mandatory context with runtime gap disclosure", () => {
    const context = buildOntologyEngineeringResponseTemplateContext({
      runtime: "codex",
      enforcementSurface: "UserPromptSubmit",
    });

    expect(context.length).toBeLessThanOrEqual(3200);
    for (const field of ONTOLOGY_ENGINEERING_RESPONSE_REQUIRED_FIELDS) {
      expect(context).toContain(field);
    }
    expect(context).toContain("Codex/Gemini runtime gap");
    expect(context).toContain("manually mirrored");
    expect(context).toContain("runtime-native question UI");
    expect(context).toContain("MCP/tool availability");
    expect(context).toContain("skill/extension availability");
    expect(context).toContain("subagent/lifecycle evidence");
  });

  test("builds mandatory context with SSoT decision-basis disclosure", () => {
    const context = buildPalantirMiniWorkflowResponseTemplateContext({
      runtime: "codex",
      enforcementSurface: "UserPromptSubmit",
    });

    expect(context).toContain("SSoT 판단 근거");
    for (const requirement of ONTOLOGY_ENGINEERING_RESPONSE_SSOT_REQUIREMENTS) {
      expect(context).toContain(requirement);
    }
    expect(context).toContain("plugin snapshot");
    expect(context).toContain("live official-doc currentness");
    expect(context).toContain("generated mirrors are non-authority");
    expect(context).toContain("cache/local loaders are consumer surfaces only");
    expect(context).toContain("context-engineering-to-sic");
    expect(context).toContain("ontology-dtc-build");
    expect(context).toContain("ObjectType, LinkType, ActionType, Function");
    expect(context).toContain("ApplicationState/Eval readiness");
  });

  test("builds mandatory context with non-developer explanation requirements", () => {
    const context = buildPalantirMiniWorkflowResponseTemplateContext({
      runtime: "codex",
      enforcementSurface: "UserPromptSubmit",
    });

    for (const requirement of PALANTIR_MINI_WORKFLOW_RESPONSE_EXPLANATION_REQUIREMENTS) {
      expect(context).toContain(requirement);
    }
  });

  test("validates complete and incomplete response text", () => {
    const complete = [
      "현재 workflow phase: mutation-authorized",
      "선택된 palantir-mini workflow 또는 workflow gap: pm_ontology_engineering_workflow",
      "FDE session ref: fde-ontology-engineering://session/test",
      "SIC/DTC 상태: approved; approved DTC ref: digital-twin-change://contract/test; approvalRef: user-decision://approval/test",
      "DTC approval card: ontology-dtc-build",
      "T0 ObjectType readiness accepted.",
      "T1 LinkType readiness accepted.",
      "T2 ActionType readiness accepted.",
      "T3 Function readiness accepted.",
      "T4 Chatbot/Application State readiness accepted.",
      "T5 Replay/Eval/Validation readiness accepted.",
      "T6 ready-for-DTC verdict accepted.",
      "open TurnCardDecisionSpec 목록: none",
      "mutationAuthorized 여부: true",
      "다음에 허용된 action: route-with-approved-contracts",
      "durable subagent .md output 상태: N/A - 이 단위 테스트 응답은 subagent를 사용하지 않았습니다.",
      "native/runtime gap 여부: Codex/Gemini runtime gap은 runtime-native smoke evidence 없이는 parity로 주장하지 않습니다. 필요한 경우 manual hook-intent mirroring으로 처리합니다. MCP/tool availability, skill/extension availability, subagent/lifecycle evidence를 함께 보고합니다.",
      "SSoT 판단 근거:",
      "- source/ref: /home/palantirkc/.claude/research/BROWSE.md, /home/palantirkc/.claude/research/INDEX.md, /home/palantirkc/.claude/research/palantir-official/foundry/chatbot-studio/application-state.md",
      "  provenance/currentness: research router BROWSE.md/INDEX.md와 palantir-official plugin snapshot 기준이며 live official-doc currentness는 별도 확인이 필요합니다. plugin source가 workflow authority이고 generated mirrors are non-authority입니다.",
      "  used-for judgment: Palantir AIP Architecture, Palantir AIP Chatbot Studio application state, Chatbot Studio retrieval context, Chatbot Studio tools, AI FDE turn evidence를 Ontology 및 Context Engineering 판단에 연결합니다.",
      "  confidence/limit: source evidence는 확인되었지만 Codex runtime gap과 live refresh 한계가 남아 있습니다.",
      "전후맥락 요약:",
      "what this request means: 사용자의 요청은 template을 범용 workflow 답변 형식으로 바꾸는 것입니다.",
      "why this source is trusted: plugin source가 권위 경로이므로 신뢰합니다.",
      "what I am allowed to do now: 승인된 단일 문서/helper 범위만 수정할 수 있습니다.",
      "what needs user approval: 범위를 넓히려면 추가 approval이 필요합니다.",
      "what gap or uncertainty remains: Codex/Gemini runtime gap은 native smoke evidence 전까지 남아 있습니다.",
    ].join("\n");

    expect(validateOntologyEngineeringResponseTemplateText(complete).valid).toBe(true);
    expect(validatePalantirMiniWorkflowResponseTemplateText(complete).valid).toBe(true);

    const incomplete = "현재 workflow phase: draft";
    const result = validateOntologyEngineeringResponseTemplateText(incomplete);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain("FDE session ref");
    expect(result.missingGapRequirements.length).toBeGreaterThan(0);
    expect(result.missingSsotRequirements.length).toBeGreaterThan(0);
    expect(result.missingExplanationRequirements.length).toBeGreaterThan(0);
  });

  test("rejects forbidden runtime UI markers and unsupported parity claims", () => {
    const forbiddenText = [
      "현재 workflow phase: mutation-authorized",
      "선택된 palantir-mini workflow 또는 workflow gap: pm_ontology_engineering_workflow",
      "FDE session ref: fde-ontology-engineering://session/test",
      "SIC/DTC 상태: approved",
      "open TurnCardDecisionSpec 목록: none",
      "mutationAuthorized 여부: true",
      "다음에 허용된 action: route-with-approved-contracts",
      "native/runtime gap 여부: Claude hooks are native. MCP/tool availability, skill/extension availability, and subagent/lifecycle evidence confirmed.",
      "SSoT 판단 근거:",
      "- source/ref: plugin source",
      "  provenance/currentness: plugin snapshot. plugin source is authority and generated mirrors are non-authority.",
      "  used-for judgment: Palantir AIP Chatbot Studio, AI FDE, Ontology, Context Engineering.",
      "  confidence/limit: source evidence only.",
      "what this request means: validate response.",
      "why this source is trusted: plugin source.",
      "what I am allowed to do now: validation.",
      "what needs user approval: mutation approval.",
      "what gap or uncertainty remains: none.",
      ["runtime-native", "question", "UI"].join(" "),
      "Codex parity is complete.",
    ].join("\n");

    const result = validatePalantirMiniWorkflowResponseTemplateText(forbiddenText);
    expect(result.valid).toBe(false);
    expect(result.forbiddenRuntimeUiMarkers.length).toBeGreaterThan(0);
    const parityOnly = validatePalantirMiniWorkflowResponseTemplateText(
      "Codex parity is complete.",
    );
    expect(parityOnly.falseParityClaimMarkers.length).toBeGreaterThan(0);
  });

  test("rejects malformed DTC approval cards before display", () => {
    const badCard = [
      "DigitalTwinChangeContract approval card",
      "SIC/DTC 상태: approved",
      "mutationAuthorized 여부: false",
      "DTC 5개 추천안 승인",
      "DTC primitive readiness: DATA, LOGIC, ACTION, GOVERNANCE, TECHNOLOGY",
      "generated mirror cache proposal is authority",
    ].join("\n");

    const violations = validateDtcApprovalCardText(badCard);
    expect(violations).toContain(
      "legacy DTC approval phrase `DTC 5개 추천안 승인` is not allowed",
    );
    expect(violations).toContain(
      "DATA/LOGIC/ACTION/GOVERNANCE/TECHNOLOGY must not be presented as DTC primitive readiness",
    );
    expect(violations).toContain(
      "ontology-affecting DTC approval cards must name ontology-dtc-build",
    );
    expect(violations).toContain(
      "DTC approval card asks for approval while mutationAuthorized=false",
    );
    expect(violations).toContain(
      "approved-DTC wording must include an approved DTC ref or approvalRef",
    );
    expect(violations).toContain(
      "generated/cache/proposal artifacts must not be presented as authority",
    );

    const result = validatePalantirMiniWorkflowResponseTemplateText([
      badCard,
      "현재 workflow phase: digital-twin-change",
      "선택된 palantir-mini workflow 또는 workflow gap: pm_semantic_intent_gate",
      "FDE session ref: fde-ontology-engineering://session/test",
      "open TurnCardDecisionSpec 목록: semantic-intent.confirm-operational-meaning",
      "다음에 허용된 action: do-not-route",
      "durable subagent .md output 상태: N/A - subagent not used",
      "native/runtime gap 여부: Codex/Gemini runtime gap handled by manual hook-intent mirroring. MCP/tool availability, skill/extension availability, and subagent/lifecycle evidence are stated.",
      "SSoT 판단 근거: source/ref .claude/research/BROWSE.md and .claude/research/INDEX.md. provenance/currentness palantir-official plugin source, generated mirrors are non-authority. used-for judgment: Palantir AIP Architecture, Palantir AIP Chatbot Studio application state, Chatbot Studio retrieval context, Chatbot Studio tools, AI FDE, Ontology, Context Engineering. confidence/limit: validator evidence only.",
      "what this request means: validate a DTC approval card.",
      "why this source is trusted: plugin source.",
      "what I am allowed to do now: reject bad card text.",
      "what needs user approval: approved DTC ref.",
      "what gap or uncertainty remains: Codex runtime gap.",
    ].join("\n"));
    expect(result.valid).toBe(false);
    expect(result.dtcApprovalCardViolations.length).toBeGreaterThan(0);
    expect(() =>
      assertDtcApprovalCardTextBeforeDisplay({
        surface: "unit-test.bad-card",
        text: badCard,
      }),
    ).toThrow("DTC approval-card display blocked on unit-test.bad-card");
  });

  test("accepts ontology-dtc-build approval cards with primitive readiness and refs", () => {
    const goodCard = [
      "DigitalTwinChangeContract approval card",
      "SIC/DTC 상태: approved",
      "approved DTC ref: digital-twin-change://contract/test",
      "approvalRef: user-decision://approval/test",
      "fillPolicy: ontology-dtc-build",
      "mutationAuthorized 여부: true",
      "T0 ObjectType readiness accepted.",
      "T1 LinkType readiness accepted.",
      "T2 ActionType readiness accepted.",
      "T3 Function readiness accepted.",
      "T4 Chatbot/Application State readiness accepted.",
      "T5 Replay/Eval/Validation readiness accepted.",
      "T6 ready-for-DTC verdict accepted.",
      "Ontology DTC T0-T6 추천안 승인",
      "generated mirrors are non-authority.",
    ].join("\n");

    expect(validateDtcApprovalCardText(goodCard)).toEqual([]);
    expect(() =>
      assertDtcApprovalCardTextBeforeDisplay({
        surface: "unit-test.good-card",
        text: goodCard,
      }),
    ).not.toThrow();
  });
});
