// palantir-ontology — stdio MCP server (raw JSON-RPC 2.0, zero-dep)
// Domain: LOGIC (Ontology capability-registry read surface — Gap B: give the
// validated-source plugin a non-zero, enumerable runtime surface over stdio).
//
// Implements the Model Context Protocol (MCP) over stdio. The live surface is
// declared by the TOOLS registry below and dispatched lazily via HANDLER_MODULES.
//
// Protocol reference: https://spec.modelcontextprotocol.io/specification/2024-11-05/
// MCP uses JSON-RPC 2.0 with these methods:
//   initialize, notifications/initialized, tools/list, tools/call
//
// The server is intentionally zero-dep — no MCP SDK anywhere in this repo.
// It reads line-delimited JSON messages from stdin and writes responses to
// stdout. Logs go to stderr.
//
// TOOLS is sourced verbatim from CLAUDE_BINDING.tools
// (src/adapters/claude/index.ts) — generated from the one neutral
// capability registry (docs/architecture.md ADR-007), never hand-authored
// or hand-re-derived here. Each tool is a read-only queryCapability_<area>
// lookup; the handler resolves the queried area from the tool name itself
// (bridge/handlers/query-capability.ts) rather than any hand-typed literal.

import * as readline from "readline";
import { CLAUDE_BINDING } from "../src/adapters/claude";
import type { ClaudeMcpToolSkeleton } from "../src/adapters/claude";
import pkg from "../package.json";

// ─── JSON-RPC 2.0 types ────────────────────────────────────────────────────
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?:     number | string | null;
  method:  string;
  params?: unknown;
}
interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id:      number | string | null;
  result:  unknown;
}
interface JsonRpcError {
  jsonrpc: "2.0";
  id:      number | string | null;
  error:   { code: number; message: string; data?: unknown };
}
type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

// ─── Tool registry — sourced from the generated Claude binding, never
// hand-authored (ADR-007: bindings are generated, never hand-re-derived) ───
type ToolSpec = ClaudeMcpToolSkeleton;

const TOOLS: readonly ToolSpec[] = CLAUDE_BINDING.tools;

// ─── Handler dispatch — one handler module serves every queryCapability_*
// tool; the module map is BUILT from TOOLS (never a hand-typed tool-name
// literal) ───────────────────────────────────────────────────────────────
const QUERY_CAPABILITY_HANDLER_MODULE = "./handlers/query-capability";

const HANDLER_MODULES: Record<string, string> = Object.fromEntries(
  TOOLS.map((tool) => [tool.name, QUERY_CAPABILITY_HANDLER_MODULE]),
);

type ToolHandler = (toolName: string, args: unknown) => Promise<unknown>;

async function loadHandler(toolName: string): Promise<ToolHandler> {
  const modulePath = HANDLER_MODULES[toolName];
  if (!modulePath) throw new Error(`unknown tool: ${toolName}`);
  const mod = (await import(modulePath)) as { default: ToolHandler };
  return mod.default;
}

// ─── Error helpers (JSON-RPC 2.0 error codes) ──────────────────────────────
const ERR = {
  PARSE:      -32700,
  INVALID:    -32600,
  METHOD_NA:  -32601,
  PARAMS:     -32602,
  INTERNAL:   -32603,
} as const;

function respondError(id: JsonRpcRequest["id"], code: number, message: string, data?: unknown): JsonRpcError {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, data } };
}

function respondSuccess(id: JsonRpcRequest["id"], result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

// ─── Method handlers ───────────────────────────────────────────────────────
async function handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  try {
    switch (req.method) {
      case "initialize": {
        return respondSuccess(req.id, {
          protocolVersion: "2024-11-05",
          capabilities:    { tools: {} },
          serverInfo:      { name: "palantir-ontology", version: pkg.version },
        });
      }

      case "notifications/initialized": {
        // Notification — no response
        return null;
      }

      case "tools/list": {
        return respondSuccess(req.id, {
          tools: TOOLS.map((tool) => ({
            name:        tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        });
      }

      case "tools/call": {
        const params = (req.params ?? {}) as { name?: string; arguments?: unknown };
        if (!params.name) return respondError(req.id, ERR.PARAMS, "tools/call: missing `name`");
        const toolName = params.name;
        if (!HANDLER_MODULES[toolName]) {
          return respondError(req.id, ERR.PARAMS, `tools/call: unknown tool \`${toolName}\``);
        }
        try {
          const handler = await loadHandler(toolName);
          const result = await handler(toolName, params.arguments ?? {});
          return respondSuccess(req.id, {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
            isError: false,
          });
        } catch (e) {
          // Unknown/invalid runtime (or any other bad input) surfaces as a
          // JSON-RPC error result — never a silent default.
          return respondError(req.id, ERR.PARAMS, (e as Error).message ?? String(e));
        }
      }

      case "ping": {
        return respondSuccess(req.id, {});
      }

      default:
        return respondError(req.id, ERR.METHOD_NA, `method not found: ${req.method}`);
    }
  } catch (e) {
    return respondError(req.id, ERR.INTERNAL, (e as Error).message ?? String(e));
  }
}

// ─── stdio loop ────────────────────────────────────────────────────────────
function send(response: JsonRpcResponse): void {
  process.stdout.write(JSON.stringify(response) + "\n");
}

async function main(): Promise<void> {
  process.stderr.write(`[palantir-ontology/mcp] ready — ${TOOLS.length} tools registered\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: undefined,
    terminal: false,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    let req: JsonRpcRequest;
    try {
      req = JSON.parse(line) as JsonRpcRequest;
    } catch (e) {
      send(respondError(null, ERR.PARSE, `parse error: ${(e as Error).message}`));
      continue;
    }

    if (req.jsonrpc !== "2.0") {
      send(respondError(req.id ?? null, ERR.INVALID, "jsonrpc must be '2.0'"));
      continue;
    }

    const res = await handleRequest(req);
    if (res !== null) send(res);
  }
}

// Export for test harness
export { HANDLER_MODULES, TOOLS, handleRequest };
export type { JsonRpcRequest, JsonRpcResponse };

// Don't run main() if imported as a module
// bun detects direct execution via import.meta.main
if (import.meta.main) {
  void main();
}
