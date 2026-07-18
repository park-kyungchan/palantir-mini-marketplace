// Gemini binding generator — pure function of A610's neutral capability
// registry (ledger row A640, docs/architecture.md ADR-007: per-runtime
// bindings are GENERATED, never hand-derived/hand-forked/hand-maintained).
// Every manifest field and capability verdict below is read directly from
// `CAPABILITY_REGISTRY.profiles.gemini` (src/adapters/shared/registry-
// loader.ts) — this module invents no capability fact of its own, and never
// treats a Gemini hook/skill/agent mechanism as semantic or mutation
// authority (see mechanism-classification.ts).
//
// One deliberate, documented addition beyond the Codex/Claude precedent:
// `NATIVE_PACKAGING_STATUS` (below) is a fixed, hand-authored constant, not
// read from the registry — because it answers a different question than
// R210's capability facts do. R210's `packagingManifest` verdict says
// Gemini CLI's own official documentation supports extension packaging in
// the abstract (`profiles.gemini.capabilities.packagingManifest.verdicts.
// primary === "supported"`, carried forward verbatim in `buildManifest()`
// below, unmodified). `NATIVE_PACKAGING_STATUS` instead answers: does THIS
// marketplace (`/home/palantirkc/palantir-mini-marketplace`) currently ship
// a native Gemini extension packaging convention for this plugin? A
// read-only repository scan at authoring time found `.codex-plugin/` and
// `.claude-plugin/` conventions (both used by the legacy `palantir-mini`
// plugin and this successor's own `.claude-plugin/marketplace.json`) but no
// `gemini-extension.json` / `.gemini-plugin/` convention anywhere in this
// marketplace. Per execution-plan §9 row A640 / docs/architecture.md
// ADR-007 ("If Gemini has no native plugin package compatible with the
// marketplace at generation time, A640 must provide a neutral MCP/CLI
// transport, mark native packaging unsupported, and test that claim"), this
// is fixed `false` — never a claim that Gemini CLI itself lacks extension
// support, only that this marketplace has not built that packaging surface
// yet. Kept as a hardcoded literal (not a filesystem scan) so generation
// stays deterministic and wall-clock-independent, the same discipline
// `src/adapters/codex/flat-schema.ts`'s `FORBIDDEN_SCHEMA_COMBINATOR_KEYS`
// already applies to its own non-registry-derived local policy constant.
//
// Lives inside `src/adapters/gemini/` rather than `scripts/generators/`
// because this row's exact write set does not include `scripts/**` (only
// A610 holds it — decisions/w6-write-set-adjudication.md, same scope note
// A620/A630 recorded for Codex/Claude). Regenerate via `bun run
// src/adapters/gemini/generate.ts`; NOT wired into the shared `bun run
// generate:all` (scripts/generators/run-all.ts) or `bun run generated:check`
// (scripts/generated-check.ts) — both out of this row's write set.
// `src/adapters/gemini/drift-check.ts` + `generated-check.test.ts`
// reimplement the same recompute-and-diff discipline locally, exercised via
// `bun test`. This scope note is filed with the Lead in
// outputs/a610-runtime-adapters.md's `## A640` section.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CAPABILITY_AREAS, CAPABILITY_REGISTRY, RUNTIME_IDS } from "../shared";
import type { GeminiBinding, GeminiCapabilityAreaSummary, GeminiManifestSkeleton, GeminiMcpToolSkeleton, GeminiNativePackagingStatus } from "./types";

export const HEADER = `// @generated
// DO NOT EDIT — produced by src/adapters/gemini/generator.ts
// regenerate: bun run src/adapters/gemini/generate.ts
// source: src/adapters/shared/capability-registry.json, read at generation time
// generator-schema-version: 1.0.0
//
// Deterministic Gemini runtime binding: manifest facts + a flat MCP tool
// schema skeleton, generated from A610's neutral capability registry
// (docs/architecture.md ADR-007) — never hand-derived, hand-forked, or
// hand-maintained. Byte-stable: content depends only on the source
// registry file's bytes, never on wall-clock time. Drift is detected by
// \`src/adapters/gemini/drift-check.ts\` (see generated-check.test.ts).
`;

// See module doc above: fixed, not registry-derived — this marketplace has
// no gemini-extension.json / .gemini-plugin/ packaging convention at
// generation time, so this row ships the neutral MCP/CLI transport (the
// `tools` skeleton below) instead of a fabricated native extension package.
export const NATIVE_PACKAGING_STATUS: GeminiNativePackagingStatus = {
  supported: false,
  transportMode: "neutral-mcp-cli",
  note:
    "This marketplace (/home/palantirkc/palantir-mini-marketplace) ships no gemini-extension.json / .gemini-plugin/ native packaging convention at generation time (only .codex-plugin/ and .claude-plugin/ exist here). Per execution-plan §9 row A640 / docs/architecture.md ADR-007, this row ships a neutral MCP/CLI transport (this binding's flat queryCapability_<area> tool skeleton) and records native packaging unsupported rather than fabricating native-support. This is a marketplace-packaging determination, not a claim about Gemini CLI's own documented capability — contrast with manifest.capabilities.packagingManifest below, whose verdict/citation is carried forward verbatim from R210 and records Gemini CLI's own documentation as supporting extension packaging in the abstract.",
};

function buildCapabilitySummaries(): readonly GeminiCapabilityAreaSummary[] {
  const profile = CAPABILITY_REGISTRY.profiles.gemini;
  return CAPABILITY_AREAS.map((area) => {
    const fact = profile.capabilities[area];
    return { area, verdicts: fact.verdicts, citation: fact.citation };
  });
}

function buildManifest(): GeminiManifestSkeleton {
  const profile = CAPABILITY_REGISTRY.profiles.gemini;
  return {
    runtimeId: "gemini",
    displayName: profile.provider.displayName,
    manifestPath: profile.provider.manifestPath,
    transports: profile.provider.transports,
    configPaths: profile.provider.configPaths,
    capabilities: buildCapabilitySummaries(),
    unsupportedFeatures: profile.unsupportedFeatures,
    unknownFeatures: profile.unknownFeatures,
    nativePackaging: NATIVE_PACKAGING_STATUS,
  };
}

// One flat "capability query" MCP tool per capability area — the "public
// MCP input schema skeleton" ADR-007/execution-plan §6.2 requires: `type`,
// `properties`, `required`, `additionalProperties` only, never `anyOf`/
// `oneOf`/`allOf`/`not`. This IS the neutral MCP/CLI transport execution-plan
// §9 row A640 requires when native packaging is unsupported (see
// `NATIVE_PACKAGING_STATUS` above) — MCP registration itself is a Gemini CLI
// capability R210 records as `supported`
// (`profiles.gemini.capabilities.mcpRegistration.verdicts.primary`), so
// shipping these flat tool schemas is not a native-packaging claim, only use
// of an already-evidenced transport.
function buildTools(): readonly GeminiMcpToolSkeleton[] {
  return CAPABILITY_AREAS.map((area) => ({
    name: `queryCapability_${area}`,
    description: `Query the "${area}" capability fact for a runtime, sourced from A610's neutral capability registry (never hand-derived).`,
    inputSchema: {
      type: "object" as const,
      properties: {
        runtime: {
          type: "string",
          description: "Which runtime's fact to query.",
          enum: [...RUNTIME_IDS],
        },
      },
      required: ["runtime"] as const,
      additionalProperties: false as const,
    },
  }));
}

/** Pure function: registry file bytes in, `GeminiBinding` data out. Deterministic — no wall-clock input. */
export function generateGeminiBinding(registryPath: string): GeminiBinding {
  const raw = readFileSync(registryPath, "utf8");
  const registrySourceSha256 = createHash("sha256").update(raw).digest("hex");
  return {
    manifest: buildManifest(),
    tools: buildTools(),
    sourceOfRecord: CAPABILITY_REGISTRY.sourceOfRecord,
    registrySourceSha256,
  };
}

function jsonLiteral(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/** Pure function: registry file path in, full generated TS module source text out (header + typed data literal). */
export function generateGeminiBindingSource(registryPath: string): string {
  const binding = generateGeminiBinding(registryPath);
  return `${HEADER}
import type { GeminiBinding } from "./types";

export const GEMINI_BINDING: GeminiBinding = ${jsonLiteral(binding)};
`;
}
