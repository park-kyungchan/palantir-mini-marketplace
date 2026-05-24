/**
 * @stable — McpHandler primitive (prim-ops-25, v1.0.0)
 *
 * Typed mirror of one entry exported from
 * `~/.claude/plugins/palantir-mini/bridge/handlers/*.ts`. Complements
 * MCPToolDeclaration (mcp-tool-declaration.ts) — MCPToolDeclaration describes
 * the tool CONTRACT (input/output JSON schema, Application Scopes); this
 * primitive describes the HANDLER IMPLEMENTATION node (the TypeScript file
 * that services the MCP call). The PR 2.7 indexer populates instances by
 * scanning bridge/handlers/. This enables impact_query to answer "which
 * handler implements tool X?" and "which handlers read primitive Y?".
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/mcp-handler.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: OPS (handler implementation node — bridges MCP contract → runtime)
 * @owner palantirkc-ontology
 * @purpose McpHandler graph-node identity (Phase 2 ImpactGraph node-type)
 */

export type McpHandlerRid = string & { readonly __brand: "McpHandlerRid" };
export const mcpHandlerRid = (s: string): McpHandlerRid => s as McpHandlerRid;

export interface McpHandlerDeclaration {
  readonly handlerId: McpHandlerRid;
  /** Kebab-case slug (e.g. "pm-rule-query", "impact-query"). */
  readonly slug: string;
  /** MCP server name as registered in plugin.json mcpServers. */
  readonly mcpServerName: string;
  /** Absolute path to the handler TypeScript source file. */
  readonly filePath: string;
  /** Name of the exported function that handles the MCP call. */
  readonly exportedFnName: string;
  /**
   * RID of the schema input declaration for this handler's input type.
   * Absent when input is untyped or uses inline zod/manual validation.
   */
  readonly schemaInputRef?: string;
  /**
   * RID of the schema output declaration for this handler's output type.
   * Absent when output is untyped.
   */
  readonly schemaOutputRef?: string;
}

export function isMcpHandlerDeclaration(x: unknown): x is McpHandlerDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as McpHandlerDeclaration;
  return (
    typeof d.handlerId === "string" &&
    d.handlerId.length > 0 &&
    typeof d.slug === "string" &&
    typeof d.mcpServerName === "string" &&
    typeof d.filePath === "string" &&
    typeof d.exportedFnName === "string"
  );
}
