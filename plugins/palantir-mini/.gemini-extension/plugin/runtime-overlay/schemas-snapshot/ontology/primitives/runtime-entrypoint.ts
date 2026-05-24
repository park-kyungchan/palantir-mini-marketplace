/**
 * @stable — RuntimeEntrypoint primitive (prim-ops-26, v1.0.0)
 *
 * One runtime-side mount point — the specific file or registration point where
 * a given runtime (Claude / Codex / Gemini / Cursor) loads a plugin, hook,
 * MCP server, or skill. Enables the Phase 2 ImpactGraph to map
 * "which runtimes does hook H run in?" or "which MCP server is Codex using?".
 *
 * `runtime` ∈ "claude" | "codex" | "gemini" | "cursor"
 * `kind`    ∈ "plugin" | "hook" | "mcp-server" | "skill"
 *
 * The PR 2.8 indexer scans runtime config files (plugin.json, AGENTS.md, etc.)
 * to populate instances. This primitive is the graph-node identity only.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/runtime-entrypoint.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: OPS (cross-runtime mount-point registry; CONTEXT.md §13.5 governs)
 * @owner palantirkc-ontology
 * @purpose RuntimeEntrypoint graph-node identity (Phase 2 ImpactGraph node-type)
 */

/** Known runtimes in the cross-runtime substrate (CONTEXT.md §13.5). */
export type EntrypointRuntime = "claude" | "codex" | "gemini" | "cursor";

/** Kind of entrypoint registered at this mount point. */
export type EntrypointKind = "plugin" | "hook" | "mcp-server" | "skill";

export type RuntimeEntrypointRid = string & { readonly __brand: "RuntimeEntrypointRid" };
export const runtimeEntrypointRid = (s: string): RuntimeEntrypointRid =>
  s as RuntimeEntrypointRid;

export interface RuntimeEntrypointDeclaration {
  readonly entrypointId: RuntimeEntrypointRid;
  /** Runtime that loads this entrypoint. */
  readonly runtime: EntrypointRuntime;
  /** Absolute path to the file loaded at this entrypoint (e.g. plugin.json, hook .ts). */
  readonly filePath: string;
  /** What kind of artifact this entrypoint registers. */
  readonly kind: EntrypointKind;
}

export function isRuntimeEntrypointDeclaration(x: unknown): x is RuntimeEntrypointDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as RuntimeEntrypointDeclaration;
  return (
    typeof d.entrypointId === "string" &&
    d.entrypointId.length > 0 &&
    typeof d.runtime === "string" &&
    typeof d.filePath === "string" &&
    typeof d.kind === "string"
  );
}
