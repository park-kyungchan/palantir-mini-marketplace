// Gemini runtime binding — shape (ledger row A640, docs/architecture.md
// ADR-007: "Per-runtime bindings for Codex, Claude, and Gemini are
// generated from one neutral capability source — never hand-derived,
// hand-forked, or hand-maintained per runtime"). These types describe the
// SHAPE of the generated Gemini binding only; every capability value that
// fills them comes from A610's neutral capability registry
// (src/adapters/shared/registry-loader.ts) via
// src/adapters/gemini/generator.ts, never hand-derived here.
//
// Lives under src/adapters/gemini/ — exempt from boundary-check's runtime-
// identity-literal scan and the "no file outside src/adapters/** may import
// into it" direction rule (scripts/boundary-check.ts's isAdapterFile), the
// same exemption src/adapters/shared/types.ts, src/adapters/codex/types.ts,
// and src/adapters/claude/types.ts document for themselves.
//
// consumer-domain-ownership (AGENT-CONTRACT.md §4): this directory carries
// only Gemini runtime/packaging/capability metadata — no math-KG or other
// consumer-domain content anywhere in this directory (math-KG-excluded).
// Mirrors src/adapters/codex/types.ts and src/adapters/claude/types.ts's
// shape (the established Wave-6 pattern), one module per runtime, never a
// shared cross-runtime type merged into src/adapters/shared/ (that module is
// neutral-source-only), plus one Gemini-specific addition below
// (`GeminiNativePackagingStatus`) this row's mission requires (execution-
// plan §9 row A640 / docs/architecture.md ADR-007: "If Gemini has no native
// plugin package compatible with the marketplace at generation time, A640
// must provide a neutral MCP/CLI transport, mark native packaging
// unsupported, and test that claim").

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
 * Gemini the same way A620/A630 applied it to Codex/Claude) —
 * `src/adapters/gemini/flat-schema.ts`'s `isFlatMcpInputSchema` mechanically
 * enforces this against every schema this plugin ships, not just this
 * type's own field list.
 */
export interface McpFlatInputSchema {
  readonly type: "object";
  readonly properties: Readonly<Record<string, McpFlatSchemaProperty>>;
  readonly required: readonly string[];
  readonly additionalProperties: false;
}

/** One generated Gemini MCP tool skeleton — public surface, flat schema only. */
export interface GeminiMcpToolSkeleton {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: McpFlatInputSchema;
}

/** One capability area's Gemini fact, restated for the manifest (verdicts + citation carried forward verbatim from the registry — never rounded up, `UNKNOWN-is-not-PASS`). */
export interface GeminiCapabilityAreaSummary {
  readonly area: string;
  readonly verdicts: Readonly<Record<string, string>>;
  readonly citation: string;
}

/**
 * Whether THIS marketplace currently ships a native Gemini extension
 * packaging convention (a `gemini-extension.json` scaffold analogous to
 * `.codex-plugin/plugin.json` and `.claude-plugin/plugin.json`) — distinct
 * from R210's own generic Gemini CLI capability fact
 * (`profiles.gemini.capabilities.packagingManifest.verdicts.primary` ===
 * `"supported"`, carried forward verbatim in `manifest.capabilities` below).
 * Those are two different claims: R210 says Gemini CLI's OWN documentation
 * supports extension packaging in the abstract; this field says whether
 * THIS marketplace (`/home/palantirkc/palantir-mini-marketplace`) has that
 * packaging convention built for THIS plugin at generation time. It does
 * not (only `.codex-plugin/` and `.claude-plugin/` exist here, confirmed by
 * a read-only repository scan at generation time), so `supported` is fixed
 * `false` and `transportMode` is fixed `"neutral-mcp-cli"` — this row ships
 * the flat MCP tool skeleton below as the neutral transport instead of a
 * fabricated native extension package (execution-plan §9 row A640, "do not
 * fabricate support" / DoD item 10).
 */
export interface GeminiNativePackagingStatus {
  readonly supported: false;
  readonly transportMode: "neutral-mcp-cli";
  readonly note: string;
}

/** Gemini packaging/provider facts, restated from A610's registry (never hand-derived), plus this row's native-packaging-status determination. */
export interface GeminiManifestSkeleton {
  readonly runtimeId: "gemini";
  readonly displayName: string;
  readonly manifestPath: string;
  readonly transports: readonly string[];
  readonly configPaths: readonly string[];
  readonly capabilities: readonly GeminiCapabilityAreaSummary[];
  readonly unsupportedFeatures: readonly string[];
  readonly unknownFeatures: readonly string[];
  readonly nativePackaging: GeminiNativePackagingStatus;
}

/** Top-level generated Gemini binding — the one artifact `src/adapters/gemini/binding.generated.ts` ships. */
export interface GeminiBinding {
  readonly manifest: GeminiManifestSkeleton;
  readonly tools: readonly GeminiMcpToolSkeleton[];
  readonly sourceOfRecord: string;
  readonly registrySourceSha256: string;
}
