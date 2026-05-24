/**
 * @stable — Tool primitive (prim-action-08, v1.0.0)
 *
 * Alias-wrapper for MCPToolDeclarationRid under the canonical Phase 2 node
 * name, extended with a `ToolKind` literal-union that reserves scope for
 * skills, native Claude tools, and shell tools — kinds that the existing
 * MCPToolDeclaration primitive does NOT cover (it is MCP-only by design).
 *
 * Same reasoning as function.ts wrapper — the broader `Tool` concept is wider
 * than MCP alone; the `ToolKind` literal-union reserves the union for later
 * edges. mcp-tool-declaration.ts is NOT extended.
 *
 * Decision: alias-wrapper + scope note (b1) per spec.md §4 row 4.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/mcp-tool-declaration.ts (wrapped)
 *     -> ~/.claude/schemas/ontology/primitives/tool.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *
 * D/L/A domain: ACTION (alias + kind reservation; delegates to mcp-tool-declaration.ts)
 * @owner palantirkc-ontology
 * @purpose Tool canonical alias for MCPToolDeclarationRid + ToolKind union (Phase 2 ImpactGraph node)
 */

export type {
  MCPToolDeclarationRid,
  MCPToolDeclaration,
} from "./mcp-tool-declaration";

export { mcpToolDeclarationRid } from "./mcp-tool-declaration";

/** Canonical alias — ToolRid IS MCPToolDeclarationRid. */
export type ToolRid = import("./mcp-tool-declaration").MCPToolDeclarationRid;

/**
 * Broader tool kind taxonomy. `"mcp"` maps to the wrapped MCPToolDeclaration.
 * The remaining kinds are reserved for later indexers and edges.
 */
export type ToolKind = "mcp" | "skill" | "claude-native" | "shell";
