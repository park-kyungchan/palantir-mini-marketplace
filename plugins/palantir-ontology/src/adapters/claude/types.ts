// Claude runtime binding — shape (ledger row A630, docs/architecture.md
// ADR-007: "Per-runtime bindings for Codex, Claude, and Gemini are
// generated from one neutral capability source — never hand-derived,
// hand-forked, or hand-maintained per runtime"). These types describe the
// SHAPE of the generated Claude binding only; every value that fills them
// comes from A610's neutral capability registry
// (src/adapters/shared/registry-loader.ts) via
// src/adapters/claude/generator.ts, never hand-derived here.
//
// Lives under src/adapters/claude/ — exempt from boundary-check's runtime-
// identity-literal scan and the "no file outside src/adapters/** may import
// into it" direction rule (scripts/boundary-check.ts's isAdapterFile), the
// same exemption src/adapters/shared/types.ts and src/adapters/codex/
// types.ts document for themselves.
//
// consumer-domain-ownership (AGENT-CONTRACT.md §4): this directory carries
// only Claude runtime/packaging/capability metadata — no math-KG or other
// consumer-domain content anywhere in this directory (math-KG-excluded).
// Mirrors src/adapters/codex/types.ts's exact shape (the established Wave-6
// pattern), one module per runtime, never a shared cross-runtime type
// merged into src/adapters/shared/ (that module is neutral-source-only).

/** One MCP tool input-schema property. Flat only — no nested combinator. */
export interface McpFlatSchemaProperty {
  readonly type: string;
  readonly description?: string;
  readonly enum?: readonly string[];
}

/**
 * A flat MCP tool input schema: `type`, `properties`, `required`,
 * `additionalProperties` only. Never `anyOf`/`oneOf`/`allOf`/`not`
 * (execution-plan.md §6.2, ADR-007's conservative posture, applied to
 * Claude the same way A620 applied it to Codex) —
 * `src/adapters/claude/flat-schema.ts`'s `isFlatMcpInputSchema` mechanically
 * enforces this against every schema this plugin ships, not just this
 * type's own field list.
 */
export interface McpFlatInputSchema {
  readonly type: "object";
  readonly properties: Readonly<Record<string, McpFlatSchemaProperty>>;
  readonly required: readonly string[];
  readonly additionalProperties: false;
}

/** One generated Claude MCP tool skeleton — public surface, flat schema only. */
export interface ClaudeMcpToolSkeleton {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: McpFlatInputSchema;
}

/** One capability area's Claude fact, restated for the manifest (verdicts + citation carried forward verbatim from the registry — never rounded up, `UNKNOWN-is-not-PASS`). */
export interface ClaudeCapabilityAreaSummary {
  readonly area: string;
  readonly verdicts: Readonly<Record<string, string>>;
  readonly citation: string;
}

/** Claude packaging/provider facts, restated from A610's registry (never hand-derived). */
export interface ClaudeManifestSkeleton {
  readonly runtimeId: "claude";
  readonly displayName: string;
  readonly manifestPath: string;
  readonly transports: readonly string[];
  readonly configPaths: readonly string[];
  readonly capabilities: readonly ClaudeCapabilityAreaSummary[];
  readonly unsupportedFeatures: readonly string[];
  readonly unknownFeatures: readonly string[];
}

/** Top-level generated Claude binding — the one artifact `src/adapters/claude/binding.generated.ts` ships. */
export interface ClaudeBinding {
  readonly manifest: ClaudeManifestSkeleton;
  readonly tools: readonly ClaudeMcpToolSkeleton[];
  readonly sourceOfRecord: string;
  readonly registrySourceSha256: string;
}
