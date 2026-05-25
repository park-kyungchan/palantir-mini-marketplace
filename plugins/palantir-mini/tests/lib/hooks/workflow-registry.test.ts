import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import {
  HOOK_POLICY_REGISTRY,
  WORKFLOW_STEP_POLICY_REGISTRY,
  validateHookPolicyRefsFromHooksJson,
  validateWorkflowStepPolicyRegistry,
} from "../../../lib/hooks/policy-registry";
import {
  CODEX_SCHEMA_ONLY_HOOK_EVENTS,
  CODEX_UNSUPPORTED_HOOK_EVENTS,
  GEMINI_UNSUPPORTED_HOOK_EVENTS,
  codexUnsupportedHookSummary,
  projectRuntimeHookMount,
} from "../../../lib/hooks/workflow-registry";

describe("runtime-neutral hook workflow registry", () => {
  test("Codex projection keeps Claude-only lifecycle gaps explicit", () => {
    const projection = projectRuntimeHookMount("codex");
    expect(projection.mountAuthority).toBe("runtime-local");
    for (const event of CODEX_UNSUPPORTED_HOOK_EVENTS) {
      expect(projection.unsupportedEvents).toContain(event);
    }
    for (const event of CODEX_SCHEMA_ONLY_HOOK_EVENTS) {
      expect(projection.schemaOnlyEvents).toContain(event);
    }
    expect(codexUnsupportedHookSummary()).toContain("TaskCreated");
    expect(codexUnsupportedHookSummary()).toContain("schemaOnly=none");
    expect(projection.supportedEvents).toContain("PreCompact");
    expect(projection.supportedEvents).toContain("SubagentStop");
  });

  test("Gemini projection maps shared workflow intent through native adapter events", () => {
    const projection = projectRuntimeHookMount("gemini");
    expect(projection.mountAuthority).toBe("runtime-local");
    for (const event of GEMINI_UNSUPPORTED_HOOK_EVENTS) {
      expect(projection.unsupportedEvents).toContain(event);
    }
    expect(projection.schemaOnlyEvents).toEqual([]);
    expect(projection.supportedEvents).toContain("PreToolUse");
    expect(projection.supportedEvents).toContain("UserPromptSubmit");
  });

  test("typed hook policy registry keeps workflow steps attached to parent policies", () => {
    expect(HOOK_POLICY_REGISTRY.length).toBeGreaterThan(0);
    expect(WORKFLOW_STEP_POLICY_REGISTRY.length).toBeGreaterThan(HOOK_POLICY_REGISTRY.length);
    expect(validateWorkflowStepPolicyRegistry()).toEqual([]);
  });

  test("current hooks.json registrations resolve to typed WorkflowStepPolicy ids", () => {
    const hooksJsonPath = path.join(process.cwd(), "hooks", "hooks.json");
    const content = fs.readFileSync(hooksJsonPath, "utf8");
    const issues = validateHookPolicyRefsFromHooksJson(JSON.parse(content), content);
    expect(issues).toEqual([]);
  });
});
