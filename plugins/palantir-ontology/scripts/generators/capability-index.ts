// Generator: derives scripts/generated/capability-index.generated.ts from
// src/adapters/shared/capability-registry.json (ledger row A610,
// docs/architecture.md ADR-007). Pure function of the source file's bytes
// — no wall-clock input — so two consecutive runs produce byte-identical
// output (generated:check's determinism requirement), matching
// scripts/generators/contract-index.ts's own convention exactly.
//
// Reads the JSON file directly (readFileSync + JSON.parse), not via the
// validated `src/adapters/shared/registry-loader.ts` import — generators
// are build tooling outside the src/** layer graph (the same point
// src/semantic-core/fingerprint.ts's own note makes about
// scripts/generated/**), so this generator has no dependency on src/**.

import { readFileSync } from "node:fs";
import { sha256Hex } from "../lib/hash";

export const HEADER = `// @generated
// DO NOT EDIT — produced by scripts/generators/capability-index.ts
// regenerate: bun run generate:all
// source: src/adapters/shared/capability-registry.json, read at generation time
// generator-schema-version: 1.0.0
//
// Deterministic derived index: one entry per (runtime, capability area)
// pair, flattened and sorted for byte-stable output. Byte-stable: content
// depends only on the source registry file's bytes, never on wall-clock
// time. generated:check (scripts/generated-check.ts) regenerates this in
// memory and fails the build on any drift.
`;

interface CapabilityAreaFactJson {
  readonly verdicts: Readonly<Record<string, string>>;
  readonly citation: string;
  readonly url: string;
  readonly notes: string;
  readonly facts?: Readonly<Record<string, unknown>>;
}

interface RuntimeProfileJson {
  readonly runtimeId: string;
  readonly capabilities: Readonly<Record<string, CapabilityAreaFactJson>>;
  readonly unsupportedFeatures: readonly string[];
  readonly unknownFeatures: readonly string[];
}

interface CapabilityRegistryJson {
  readonly schemaVersion: string;
  readonly sourceOfRecord: string;
  readonly profiles: Readonly<Record<string, RuntimeProfileJson>>;
}

interface CapabilityIndexEntry {
  readonly runtime: string;
  readonly area: string;
  readonly verdicts: Readonly<Record<string, string>>;
  readonly citation: string;
  readonly factSha256: string;
}

function entryLines(e: CapabilityIndexEntry): string {
  const verdictEntries = Object.entries(e.verdicts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(", ");
  return [
    "  {",
    `    runtime: ${JSON.stringify(e.runtime)},`,
    `    area: ${JSON.stringify(e.area)},`,
    `    verdicts: { ${verdictEntries} },`,
    `    citation: ${JSON.stringify(e.citation)},`,
    `    factSha256: ${JSON.stringify(e.factSha256)},`,
    "  },",
  ].join("\n");
}

export function generateCapabilityIndex(registryPath: string): string {
  const raw = readFileSync(registryPath, "utf8");
  const parsed = JSON.parse(raw) as CapabilityRegistryJson;

  const runtimes = Object.keys(parsed.profiles).sort();
  const entries: CapabilityIndexEntry[] = [];
  for (const runtime of runtimes) {
    const profile = parsed.profiles[runtime]!;
    const areas = Object.keys(profile.capabilities).sort();
    for (const area of areas) {
      const fact = profile.capabilities[area]!;
      entries.push({
        runtime,
        area,
        verdicts: fact.verdicts,
        citation: fact.citation,
        factSha256: sha256Hex(JSON.stringify(fact)),
      });
    }
  }

  const body = entries.map(entryLines).join("\n");
  const sourceSha256 = sha256Hex(raw);

  return `${HEADER}
export interface CapabilityIndexEntry {
  readonly runtime: string;
  readonly area: string;
  readonly verdicts: Readonly<Record<string, string>>;
  readonly citation: string;
  readonly factSha256: string;
}

export const CAPABILITY_INDEX: readonly CapabilityIndexEntry[] = [
${body}
];

export const CAPABILITY_REGISTRY_SOURCE_SHA256 = ${JSON.stringify(sourceSha256)};
`;
}
