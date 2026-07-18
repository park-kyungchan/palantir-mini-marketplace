// Codex runtime binding — shape (ledger row A620, docs/architecture.md
// ADR-007). These types describe the SHAPE of the generated Codex binding
// only; every value that fills them comes from A610's neutral capability
// registry (src/adapters/shared/registry-loader.ts) via
// src/adapters/codex/generator.ts, never hand-derived here.
//
// Lives under src/adapters/codex/ — exempt from boundary-check's runtime-
// identity-literal scan and the "no file outside src/adapters/** may import
// into it" direction rule (scripts/boundary-check.ts's isAdapterFile), the
// same exemption src/adapters/shared/types.ts documents for itself.

/** One MCP tool input-schema property. Flat only — no nested combinator. */
export interface McpFlatSchemaProperty {
  readonly type: string;
  readonly description?: string;
  readonly enum?: readonly string[];
}

/**
 * A flat MCP tool input schema: `type`, `properties`, `required`,
 * `additionalProperties` only. Never `anyOf`/`oneOf`/`allOf`/`not`
 * (execution-plan.md §6.2, ADR-007's conservative posture) —
 * `src/adapters/codex/flat-schema.ts`'s `isFlatMcpInputSchema` mechanically
 * enforces this against every schema this plugin ships, not just this
 * type's own field list.
 */
export interface McpFlatInputSchema {
  readonly type: "object";
  readonly properties: Readonly<Record<string, McpFlatSchemaProperty>>;
  readonly required: readonly string[];
  readonly additionalProperties: false;
}

/** One generated Codex MCP tool skeleton — public surface, flat schema only. */
export interface CodexMcpToolSkeleton {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: McpFlatInputSchema;
}

/** One capability area's Codex fact, restated for the manifest (verdicts + citation carried forward verbatim from the registry — never rounded up, `UNKNOWN-is-not-PASS`). */
export interface CodexCapabilityAreaSummary {
  readonly area: string;
  readonly verdicts: Readonly<Record<string, string>>;
  readonly citation: string;
}

/** Codex packaging/provider facts, restated from A610's registry (never hand-derived). */
export interface CodexManifestSkeleton {
  readonly runtimeId: "codex";
  readonly displayName: string;
  readonly manifestPath: string;
  readonly transports: readonly string[];
  readonly configPaths: readonly string[];
  readonly capabilities: readonly CodexCapabilityAreaSummary[];
  readonly unsupportedFeatures: readonly string[];
  readonly unknownFeatures: readonly string[];
}

/** Top-level generated Codex binding — the one artifact `src/adapters/codex/binding.generated.ts` ships. */
export interface CodexBinding {
  readonly manifest: CodexManifestSkeleton;
  readonly tools: readonly CodexMcpToolSkeleton[];
  readonly sourceOfRecord: string;
  readonly registrySourceSha256: string;
}
