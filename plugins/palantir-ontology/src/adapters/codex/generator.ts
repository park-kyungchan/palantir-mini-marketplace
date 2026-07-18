// Codex binding generator — pure function of A610's neutral capability
// registry (ledger row A620, docs/architecture.md ADR-007: per-runtime
// bindings are GENERATED, never hand-derived/hand-forked/hand-maintained).
// Every manifest field and capability verdict below is read directly from
// `CAPABILITY_REGISTRY.profiles.codex` (src/adapters/shared/registry-
// loader.ts) — this module invents no capability fact of its own.
//
// Lives inside `src/adapters/codex/` rather than `scripts/generators/`
// because this row's exact write set does not include `scripts/**` (only
// A610 holds it — decisions/w6-write-set-adjudication.md). Regenerate via
// `bun run src/adapters/codex/generate.ts`; NOT wired into the shared
// `bun run generate:all` (scripts/generators/run-all.ts) or `bun run
// generated:check` (scripts/generated-check.ts) — both out of this row's
// write set. `src/adapters/codex/drift-check.ts` + `generated-check.test.ts`
// reimplement the same recompute-and-diff discipline locally, exercised via
// `bun test`. This scope note is filed with the Lead in
// outputs/a610-runtime-adapters.md's `## A620` section.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CAPABILITY_AREAS, CAPABILITY_REGISTRY, RUNTIME_IDS } from "../shared";
import type { CodexBinding, CodexCapabilityAreaSummary, CodexManifestSkeleton, CodexMcpToolSkeleton } from "./types";

export const HEADER = `// @generated
// DO NOT EDIT — produced by src/adapters/codex/generator.ts
// regenerate: bun run src/adapters/codex/generate.ts
// source: src/adapters/shared/capability-registry.json, read at generation time
// generator-schema-version: 1.0.0
//
// Deterministic Codex runtime binding: manifest facts + a flat MCP tool
// schema skeleton, generated from A610's neutral capability registry
// (docs/architecture.md ADR-007) — never hand-derived, hand-forked, or
// hand-maintained. Byte-stable: content depends only on the source
// registry file's bytes, never on wall-clock time. Drift is detected by
// \`src/adapters/codex/drift-check.ts\` (see generated-check.test.ts).
`;

function buildCapabilitySummaries(): readonly CodexCapabilityAreaSummary[] {
  const profile = CAPABILITY_REGISTRY.profiles.codex;
  return CAPABILITY_AREAS.map((area) => {
    const fact = profile.capabilities[area];
    return { area, verdicts: fact.verdicts, citation: fact.citation };
  });
}

function buildManifest(): CodexManifestSkeleton {
  const profile = CAPABILITY_REGISTRY.profiles.codex;
  return {
    runtimeId: "codex",
    displayName: profile.provider.displayName,
    manifestPath: profile.provider.manifestPath,
    transports: profile.provider.transports,
    configPaths: profile.provider.configPaths,
    capabilities: buildCapabilitySummaries(),
    unsupportedFeatures: profile.unsupportedFeatures,
    unknownFeatures: profile.unknownFeatures,
  };
}

// One flat "capability query" MCP tool per capability area — the "public
// MCP input schema skeleton" ADR-007/execution-plan §6.2 requires: `type`,
// `properties`, `required`, `additionalProperties` only, never `anyOf`/
// `oneOf`/`allOf`/`not`. R210 records Codex's own schemaFlatLimits verdict
// as `unknown` ("no current public Codex-specific rule found") — this is
// the campaign's conservative local generation policy (docs/architecture.md
// ADR-007), not a claimed official Codex requirement.
function buildTools(): readonly CodexMcpToolSkeleton[] {
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

/** Pure function: registry file bytes in, `CodexBinding` data out. Deterministic — no wall-clock input. */
export function generateCodexBinding(registryPath: string): CodexBinding {
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
export function generateCodexBindingSource(registryPath: string): string {
  const binding = generateCodexBinding(registryPath);
  return `${HEADER}
import type { CodexBinding } from "./types";

export const CODEX_BINDING: CodexBinding = ${jsonLiteral(binding)};
`;
}
