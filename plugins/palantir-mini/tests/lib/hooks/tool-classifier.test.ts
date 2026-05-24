import { describe, expect, test } from "bun:test";
import {
  classifyHookTool,
  isReadOnlyBashCommand,
  managedSettingsPalantirMiniMcpPattern,
  normalizePalantirMiniMcpToolName,
  palantirMiniMcpToolAliasesFor,
} from "../../../lib/hooks/tool-classifier";
import { MCP_TOOL_CAPABILITIES } from "../../../lib/capability-registry/mcp-tool-capability";

describe("classifyHookTool", () => {
  test("recognizes Claude/plugin and Codex MCP spellings for protected edit tools", () => {
    for (const toolName of [
      "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      "mcp__palantir_mini__commit_edits",
      "mcp__palantir_mini__.commit_edits",
      "mcp__palantir-mini__commit_edits",
      "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function",
      "mcp__palantir_mini__apply_edit_function",
      "mcp__palantir_mini__.apply_edit_function",
      "mcp__palantir-mini__apply_edit_function",
      "mcp_palantir-mini_apply_edit_function",
      "mcp_palantir_mini_apply_edit_function",
    ]) {
      const classification = classifyHookTool({ tool_name: toolName });
      expect(classification.isPalantirMiniMcpTool).toBe(true);
      expect(classification.isProtectedMutation).toBe(true);
      expect(classification.isDtcMutatingMcpTool).toBe(true);
      expect(classification.isOntologyAffectingForSelectiveBlocking).toBe(true);
    }
  });

  test("normalizes all supported palantir-mini MCP namespace spellings", () => {
    expect(normalizePalantirMiniMcpToolName("mcp__plugin_palantir-mini_palantir-mini__emit_event"))
      .toBe("emit_event");
    expect(normalizePalantirMiniMcpToolName("mcp__palantir_mini__emit_event"))
      .toBe("emit_event");
    expect(normalizePalantirMiniMcpToolName("mcp__palantir_mini__.emit_event"))
      .toBe("emit_event");
    expect(normalizePalantirMiniMcpToolName("mcp__palantir-mini__emit_event"))
      .toBe("emit_event");
    expect(normalizePalantirMiniMcpToolName("mcp_palantir-mini_emit_event"))
      .toBe("emit_event");
    expect(normalizePalantirMiniMcpToolName("mcp_palantir_mini_emit_event"))
      .toBe("emit_event");

    expect(palantirMiniMcpToolAliasesFor("mcp__palantir_mini__.emit_event")).toEqual([
      "mcp__plugin_palantir-mini_palantir-mini__emit_event",
      "mcp__palantir_mini__emit_event",
      "mcp__palantir_mini__.emit_event",
      "mcp__palantir-mini__emit_event",
      "mcp_palantir-mini_emit_event",
      "mcp_palantir_mini_emit_event",
    ]);
    expect(managedSettingsPalantirMiniMcpPattern("mcp__palantir_mini__.emit_event"))
      .toBe("mcp__palantir-mini__emit_event");
  });

  test("keeps ontology_context_query read mode read-only and write mode protected", () => {
    expect(
      classifyHookTool({
        tool_name: "mcp__palantir_mini__ontology_context_query",
        tool_input: { action: "read" },
      }).isProtectedMutation,
    ).toBe(false);
    expect(
      classifyHookTool({
        tool_name: "mcp__palantir_mini__ontology_context_query",
        tool_input: { action: "write" },
      }).isProtectedMutation,
    ).toBe(true);
  });

  test("classifies Bash inspection separately from publish or commit mutation", () => {
    expect(isReadOnlyBashCommand("git status --short")).toBe(true);
    expect(isReadOnlyBashCommand("gh pr view 123")).toBe(true);
    expect(isReadOnlyBashCommand("git commit -m test")).toBe(false);
    expect(isReadOnlyBashCommand("gh pr merge 123 --squash")).toBe(false);
  });

  test("attaches capability metadata for every declared palantir-mini MCP tool", () => {
    for (const capability of MCP_TOOL_CAPABILITIES) {
      const classification = classifyHookTool({
        tool_name: `mcp__palantir_mini__${capability.toolName}`,
      });
      expect(classification.isPalantirMiniMcpTool).toBe(true);
      expect(classification.classificationSource).toBe("mcp-tool-capability");
      expect(classification.mcpToolCapability?.toolName).toBe(capability.toolName);
    }
  });

  test("keeps fallback-classified MCP tools on legacy unknown behavior", () => {
    const classification = classifyHookTool({
      tool_name: "mcp__palantir_mini__get_ontology",
    });

    expect(classification.operation).toBe("unknown");
    expect(classification.isReadOnly).toBe(false);
    expect(classification.isProtectedMutation).toBe(false);
    expect(classification.isDtcMutatingMcpTool).toBe(false);
    expect(classification.mcpToolCapability?.classifierProjection.classificationMode)
      .toBe("legacy-fallback");
  });
});
