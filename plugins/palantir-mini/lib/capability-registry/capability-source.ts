// palantir-mini — lib/capability-registry/capability-source.ts (W3e-2)
//
// Runtime-NEUTRAL capability-discovery adapter seam. A CapabilitySource yields
// neutral CapabilityContracts from some runtime's artifact layout; the registry
// (index.ts) aggregates over the resolved sources instead of hardcoding Claude
// paths (skills/*/SKILL.md, agents/*.md, bridge/mcp-server.ts). The Claude
// discovery moves to CLAUDE_CAPABILITY_SOURCE (sources/claude-source.ts);
// Codex/Gemini adapters supply their own equivalents later.
//
// Mirrors the lib/runtime/tool-profile.ts seam pattern (CLAUDE_* default +
// resolve-by-runtime + W4 stubs), but for capability SOURCE discovery rather
// than tool-name classification.

import type { CapabilityContract } from "../capability/capability-contract";
import { resolveHostRuntimeIdentity } from "../runtime/identity";

export interface CapabilitySourceContext {
  /** Plugin root the source scans (resolvePalantirMiniRoot()). */
  readonly pluginRoot: string;
}

export interface CapabilitySource {
  /** Stable id (e.g. "claude"). */
  readonly id: string;
  /** Absolute paths whose mtime invalidates the cache for this source. */
  watchedPaths(ctx: CapabilitySourceContext): readonly string[];
  /** Discover neutral CapabilityContracts from this runtime's artifact layout. */
  discover(ctx: CapabilitySourceContext): readonly CapabilityContract[];
}

/**
 * Resolve the active capability sources for a runtime identity. Wired to the
 * Claude source in Step 3 (sources/claude-source.ts registers via
 * registerCapabilitySource); returns [] until then so this declaration is inert.
 */
const REGISTERED_SOURCES = new Map<string, CapabilitySource>();

export function registerCapabilitySource(runtime: string, source: CapabilitySource): void {
  REGISTERED_SOURCES.set(runtime, source);
}

export function resolveCapabilitySources(
  identity: string = resolveHostRuntimeIdentity(undefined, "claude-code"),
): readonly CapabilitySource[] {
  const source = REGISTERED_SOURCES.get(identity);
  return source ? [source] : [];
}
