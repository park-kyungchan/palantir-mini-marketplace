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

  test("forceRequired rejects forbidden runtime UI marker", async () => {
    const result = await workflowResponseValidate({
      text: ["현재 workflow phase: draft", ["runtime-native", "question", "UI"].join(" ")].join("\n"),
      forceRequired: true,
    });

    expect(result.required).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.validation.forbiddenRuntimeUiMarkers.length).toBeGreaterThan(0);
  });
});
