// Read-only capability-registry lookup handler backing every generated
// `queryCapability_<area>` MCP tool (bridge/mcp-server.ts). One handler
// module serves all 8 tools: the queried CapabilityArea is derived from the
// caller's tool name (never independently retyped as a string literal), and
// the runtime whose fact to return is the caller-supplied `{runtime}` input.
//
// Source of truth: src/adapters/shared/index.ts's CAPABILITY_REGISTRY
// (A610's neutral capability source, docs/architecture.md ADR-007) — this
// handler never derives, mutates, or hand-restates a capability fact; it
// only looks one up. Read-only: no write/mutating tool is implemented here.

import {
  CAPABILITY_AREAS,
  CAPABILITY_REGISTRY,
  RUNTIME_IDS,
  isCapabilityArea,
  isRuntimeId,
  type CapabilityArea,
  type CapabilityAreaFact,
  type RuntimeId,
} from "../../src/adapters/shared";

const TOOL_PREFIX = "queryCapability_";

/** Derive the CapabilityArea a generated `queryCapability_<area>` tool name queries, or undefined if the name doesn't match that shape. */
export function areaForTool(toolName: string): CapabilityArea | undefined {
  if (!toolName.startsWith(TOOL_PREFIX)) return undefined;
  const area = toolName.slice(TOOL_PREFIX.length);
  return isCapabilityArea(area) ? area : undefined;
}

export interface QueryCapabilityResult {
  readonly runtime: RuntimeId;
  readonly area:    CapabilityArea;
  readonly fact:    CapabilityAreaFact;
}

export default async function queryCapability(
  toolName: string,
  args: unknown,
): Promise<QueryCapabilityResult> {
  const area = areaForTool(toolName);
  if (area === undefined) {
    throw new Error(
      `unknown capability-query tool "${toolName}" — expected one of ` +
        CAPABILITY_AREAS.map((a) => `${TOOL_PREFIX}${a}`).join(", "),
    );
  }

  const runtime = (args as { runtime?: unknown } | null | undefined)?.runtime;
  if (!isRuntimeId(runtime)) {
    throw new Error(
      `invalid or missing "runtime" for ${toolName} — expected one of ` +
        `${RUNTIME_IDS.join(", ")}, got ${JSON.stringify(runtime)}`,
    );
  }

  const fact = CAPABILITY_REGISTRY.profiles[runtime].capabilities[area];
  return { runtime, area, fact };
}
