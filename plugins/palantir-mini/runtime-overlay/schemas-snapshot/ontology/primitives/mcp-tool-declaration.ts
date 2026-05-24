/**
 * @stable — MCPToolDeclaration primitive (prim-action-07, v1.40.0)
 *
 * Typed mirror of Palantir's split MCP architecture: Palantir MCP (builder)
 * vs Ontology MCP / OMCP (consumer). The split governs whether an external
 * AI agent may modify ontology *types* (builder) or merely read/write
 * ontology *data* through Application Scopes (consumer).
 *
 * D/L/A domain: ACTION + OPS. The declaration is the registration record
 * for an MCP server's tool surface, the permissions it consumes, and the
 * actions it is allowed (or forbidden) to perform.
 *
 * Authority chain:
 *   research/palantir-foundry/dev-toolchain/
 *     palantir-mcp-and-ontology-mcp-2026-03-26.md (builder vs consumer split,
 *     Application Scopes, Copilot Studio integration)
 *     ↓
 *   schemas/ontology/primitives/mcp-tool-declaration.ts (this file)
 *     ↓
 *   shared-core re-export
 *     ↓
 *   per-project ontology / palantir-mini bridge handlers
 *
 * Rule cross-refs: rule 07 v1.2.0 §Multi-plugin precedence (palantir-mini's
 * MCP server is a runtime-side cousin to Palantir MCP), rule 19
 * (collision policy at same scope).
 *
 * @owner palantirkc-ontology
 * @purpose MCP server / tool registration record with Application Scope governance
 */

/**
 * Branded RID for an MCP tool declaration (one declaration per tool, NOT per
 * server — a server may host many tools each with its own RID).
 */
export type MCPToolDeclarationRid = string & {
  readonly __brand: "MCPToolDeclarationRid";
};

export const mcpToolDeclarationRid = (s: string): MCPToolDeclarationRid =>
  s as MCPToolDeclarationRid;

/**
 * Architectural split (Palantir docs verbatim):
 *   builder  — modifies ontology types (object/action/link types). Cannot
 *              write ontology data. Developer-IDE focus.
 *   consumer — reads/writes ontology data via Application Scopes. Cannot
 *              modify ontology types. External-AI / Copilot Studio focus.
 */
export type MCPArchitectureKind = "builder" | "consumer";

/**
 * Permission scopes. Each scope is a coarse-grained capability bucket;
 * Application Scopes attach the fine-grained action allowlist.
 *
 *   readScopes   — what the agent may read (object types, datasets,
 *                  metadata, function definitions, etc.).
 *   writeScopes  — what the agent may write (ontology data via consumer,
 *                  ontology types via builder; mutation surface).
 *   deployScopes — what the agent may promote (branch merge, action
 *                  publish, function deploy).
 */
export interface MCPPermissionsMatrix {
  readonly readScopes: ReadonlyArray<string>;
  readonly writeScopes: ReadonlyArray<string>;
  readonly deployScopes: ReadonlyArray<string>;
}

/**
 * Restricted-action declaration — actions the MCP server explicitly refuses
 * to expose, regardless of the underlying scope. Intended as a defense-in-
 * depth complement to Application Scopes. Each entry is the canonical action
 * apiName (e.g. "deleteObjectType", "promoteBranchToProduction").
 */
export type MCPRestrictedAction = string;

/**
 * Top-level declaration. One record per MCP-exposed tool.
 */
export interface MCPToolDeclaration {
  readonly toolDeclarationId: MCPToolDeclarationRid;
  readonly kind: MCPArchitectureKind;
  /** MCP server identifier (matches plugin.json mcpServers entry name). */
  readonly serverId: string;
  /** MCP tool name advertised by the server (matches the JSON-RPC tool registry). */
  readonly toolName: string;
  /**
   * Optional Application Scope reference (Foundry concept). When kind is
   * "consumer", this is the canonical scope governing which actions the
   * agent may invoke against the ontology.
   */
  readonly applicationScope?: string;
  readonly permissionsMatrix: MCPPermissionsMatrix;
  readonly restrictedActions: ReadonlyArray<MCPRestrictedAction>;
}

export function isMCPArchitectureKind(s: string): s is MCPArchitectureKind {
  return s === "builder" || s === "consumer";
}

export function isMCPToolDeclaration(x: unknown): x is MCPToolDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as MCPToolDeclaration;
  return (
    typeof d.toolDeclarationId === "string" &&
    d.toolDeclarationId.length > 0 &&
    typeof d.kind === "string" &&
    isMCPArchitectureKind(d.kind) &&
    typeof d.serverId === "string" &&
    d.serverId.length > 0 &&
    typeof d.toolName === "string" &&
    d.toolName.length > 0 &&
    typeof d.permissionsMatrix === "object" &&
    d.permissionsMatrix !== null &&
    Array.isArray(d.permissionsMatrix.readScopes) &&
    Array.isArray(d.permissionsMatrix.writeScopes) &&
    Array.isArray(d.permissionsMatrix.deployScopes) &&
    Array.isArray(d.restrictedActions)
  );
}

export class MCPToolDeclarationRegistry {
  private readonly tools = new Map<MCPToolDeclarationRid, MCPToolDeclaration>();

  register(decl: MCPToolDeclaration): void {
    this.tools.set(decl.toolDeclarationId, decl);
  }

  get(rid: MCPToolDeclarationRid): MCPToolDeclaration | undefined {
    return this.tools.get(rid);
  }

  byKind(kind: MCPArchitectureKind): MCPToolDeclaration[] {
    return [...this.tools.values()].filter((t) => t.kind === kind);
  }

  byServer(serverId: string): MCPToolDeclaration[] {
    return [...this.tools.values()].filter((t) => t.serverId === serverId);
  }

  list(): MCPToolDeclaration[] {
    return [...this.tools.values()];
  }
}

export const MCP_TOOL_DECLARATION_REGISTRY = new MCPToolDeclarationRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "equivalent",
  foundryType: "MCPTool (builder vs consumer split + Application Scopes)",
};
export { categoryFoundryEquivalent as mcpToolDeclarationFoundryEquivalent };
