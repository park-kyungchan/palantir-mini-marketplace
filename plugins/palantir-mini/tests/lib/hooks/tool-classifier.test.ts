import { describe, expect, test } from "bun:test";
import {
  classifyHookTool,
  isMcpFirstEvidenceToolName,
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

  test("does not substring-match spoofed palantir-mini operation names", () => {
    for (const toolName of [
      "mcp__palantir_mini__not_commit_edits",
      "mcp__palantir_mini__commit_edits_extra",
      "mcp__palantir_mini__impact_query_backup",
      "my_commit_edits_wrapper",
    ]) {
      const classification = classifyHookTool({ tool_name: toolName });
      expect(classification.operation).toBe("unknown");
      expect(classification.isReadOnly).toBe(false);
      expect(classification.isProtectedMutation).toBe(false);
      expect(classification.isDtcMutatingMcpTool).toBe(false);
      expect(classification.isOntologyAffectingForSelectiveBlocking).toBe(false);
      expect(isMcpFirstEvidenceToolName(toolName)).toBe(false);
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

  test("preserves exact read-only evidence operation aliases", () => {
    for (const { operation, toolNames } of [
      {
        operation: "impact_query",
        toolNames: [
          "impact_query",
          "mcp__plugin_palantir-mini_palantir-mini__impact_query",
          "mcp__palantir_mini__impact_query",
          "mcp__palantir_mini__.impact_query",
          "mcp__palantir-mini__impact_query",
          "mcp_palantir-mini_impact_query",
          "mcp_palantir_mini_impact_query",
        ],
      },
      {
        operation: "pre_edit_impact",
        toolNames: [
          "pre_edit_impact",
          "mcp__plugin_palantir-mini_palantir-mini__pre_edit_impact",
          "mcp__palantir_mini__pre_edit_impact",
          "mcp__palantir_mini__.pre_edit_impact",
          "mcp__palantir-mini__pre_edit_impact",
          "mcp_palantir-mini_pre_edit_impact",
          "mcp_palantir_mini_pre_edit_impact",
        ],
      },
      {
        operation: "get_ontology",
        toolNames: [
          "get_ontology",
          "mcp__plugin_palantir-mini_palantir-mini__get_ontology",
          "mcp__palantir_mini__get_ontology",
          "mcp__palantir_mini__.get_ontology",
          "mcp__palantir-mini__get_ontology",
          "mcp_palantir-mini_get_ontology",
          "mcp_palantir_mini_get_ontology",
        ],
      },
    ] as const) {
      for (const toolName of toolNames) {
        const classification = classifyHookTool({ tool_name: toolName });
        expect(classification.operation).toBe(operation);
        expect(classification.isReadOnly).toBe(true);
        expect(classification.isProtectedMutation).toBe(false);
        expect(isMcpFirstEvidenceToolName(toolName)).toBe(true);
      }
    }
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

    expect(classification.operation).toBe("get_ontology");
    expect(classification.isReadOnly).toBe(true);
    expect(classification.isProtectedMutation).toBe(false);
    expect(classification.isDtcMutatingMcpTool).toBe(false);
    expect(classification.mcpToolCapability?.classifierProjection.classificationMode)
      .toBe("legacy-fallback");
  });

  test("centralizes MCP-first evidence tool namespace aliases", () => {
    for (const toolName of [
      "impact_query",
      "pre_edit_impact",
      "get_ontology",
      "mcp__plugin_palantir-mini_palantir-mini__impact_query",
      "mcp__palantir_mini__pre_edit_impact",
      "mcp__palantir_mini__.get_ontology",
      "mcp__palantir-mini__impact_query",
      "mcp_palantir-mini_pre_edit_impact",
      "mcp_palantir_mini_get_ontology",
    ]) {
      expect(isMcpFirstEvidenceToolName(toolName)).toBe(true);
    }

    for (const toolName of [
      "pm_workflow_lineage_query",
      "propagation_audit_forward",
      "mcp__palantir_mini__pm_workflow_lineage_query",
      "mcp__palantir_mini__.propagation_audit_forward",
      "mcp__palantir_mini__commit_edits",
    ]) {
      expect(isMcpFirstEvidenceToolName(toolName)).toBe(false);
    }
  });
});
