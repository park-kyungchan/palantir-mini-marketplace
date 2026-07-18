// Claude binding generator — pure function of A610's neutral capability
// registry (ledger row A630, docs/architecture.md ADR-007: per-runtime
// bindings are GENERATED, never hand-derived/hand-forked/hand-maintained).
// Every manifest field and capability verdict below is read directly from
// `CAPABILITY_REGISTRY.profiles.claude` (src/adapters/shared/registry-
// loader.ts) — this module invents no capability fact of its own, and never
// treats a Claude hook/skill/agent mechanism as semantic or mutation
// authority (see mechanism-classification.ts).
//
// Lives inside `src/adapters/claude/` rather than `scripts/generators/`
// because this row's exact write set does not include `scripts/**` (only
// A610 holds it — decisions/w6-write-set-adjudication.md, same scope note
// A620 recorded for Codex). Regenerate via `bun run
// src/adapters/claude/generate.ts`; NOT wired into the shared `bun run
// generate:all` (scripts/generators/run-all.ts) or `bun run generated:check`
// (scripts/generated-check.ts) — both out of this row's write set.
// `src/adapters/claude/drift-check.ts` + `generated-check.test.ts`
// reimplement the same recompute-and-diff discipline locally, exercised via
// `bun test`. This scope note is filed with the Lead in
// outputs/a610-runtime-adapters.md's `## A630` section.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CAPABILITY_AREAS, CAPABILITY_REGISTRY, RUNTIME_IDS } from "../shared";
import type { ClaudeBinding, ClaudeCapabilityAreaSummary, ClaudeManifestSkeleton, ClaudeMcpToolSkeleton } from "./types";

export const HEADER = `// @generated
// DO NOT EDIT — produced by src/adapters/claude/generator.ts
// regenerate: bun run src/adapters/claude/generate.ts
// source: src/adapters/shared/capability-registry.json, read at generation time
// generator-schema-version: 1.0.0
//
// Deterministic Claude runtime binding: manifest facts + a flat MCP tool
// schema skeleton, generated from A610's neutral capability registry
// (docs/architecture.md ADR-007) — never hand-derived, hand-forked, or
// hand-maintained. Byte-stable: content depends only on the source
// registry file's bytes, never on wall-clock time. Drift is detected by
// \`src/adapters/claude/drift-check.ts\` (see generated-check.test.ts).
`;

function buildCapabilitySummaries(): readonly ClaudeCapabilityAreaSummary[] {
  const profile = CAPABILITY_REGISTRY.profiles.claude;
  return CAPABILITY_AREAS.map((area) => {
    const fact = profile.capabilities[area];
    return { area, verdicts: fact.verdicts, citation: fact.citation };
  });
}

function buildManifest(): ClaudeManifestSkeleton {
  const profile = CAPABILITY_REGISTRY.profiles.claude;
  return {
    runtimeId: "claude",
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
// `oneOf`/`allOf`/`not`. R210 records Claude's own schemaFlatLimits verdict
// as `unknown` ("no Claude-specific flat-schema or combinator restriction
// found") — the campaign's conservative local generation policy
// (docs/architecture.md ADR-007), not a claimed official Claude
// requirement, mirroring A620's own treatment of Codex's identical
// `unknown` verdict on this area.
function buildTools(): readonly ClaudeMcpToolSkeleton[] {
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

/** Pure function: registry file bytes in, `ClaudeBinding` data out. Deterministic — no wall-clock input. */
export function generateClaudeBinding(registryPath: string): ClaudeBinding {
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
export function generateClaudeBindingSource(registryPath: string): string {
  const binding = generateClaudeBinding(registryPath);
  return `${HEADER}
import type { ClaudeBinding } from "./types";

export const CLAUDE_BINDING: ClaudeBinding = ${jsonLiteral(binding)};
`;
}
