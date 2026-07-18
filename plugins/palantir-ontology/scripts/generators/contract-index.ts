// Generator: derives scripts/generated/contract-index.generated.ts from
// contracts/*.contract.json (ledger row P340). Pure function of the source
// files' bytes — no wall-clock input — so two consecutive runs produce
// byte-identical output (generated:check's determinism requirement).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sha256Hex } from "../lib/hash";

export const HEADER = `// @generated
// DO NOT EDIT — produced by scripts/generators/contract-index.ts
// regenerate: bun run generate:all
// source: contracts/*.contract.json (sorted by filename), read at generation time
// generator-schema-version: 1.0.0
//
// Deterministic derived index: one entry per contracts/*.contract.json file.
// Byte-stable: content depends only on the source contract files' bytes,
// never on wall-clock time. generated:check (scripts/generated-check.ts)
// regenerates this in memory and fails the build on any drift.
`;

interface ContractIndexEntry {
  readonly file: string;
  readonly id: string;
  readonly title: string;
  readonly requiredFieldCount: number;
  readonly sha256: string;
}

function entryLines(e: ContractIndexEntry): string {
  return [
    "  {",
    `    file: ${JSON.stringify(e.file)},`,
    `    id: ${JSON.stringify(e.id)},`,
    `    title: ${JSON.stringify(e.title)},`,
    `    requiredFieldCount: ${e.requiredFieldCount},`,
    `    sha256: ${JSON.stringify(e.sha256)},`,
    "  },",
  ].join("\n");
}

export function generateContractIndex(contractsDir: string): string {
  const files = readdirSync(contractsDir)
    .filter((f) => f.endsWith(".contract.json"))
    .sort();

  const entries: ContractIndexEntry[] = files.map((file) => {
    const raw = readFileSync(join(contractsDir, file), "utf8");
    const parsed = JSON.parse(raw) as { $id?: string; title?: string; required?: unknown[] };
    return {
      file,
      id: parsed.$id ?? "",
      title: parsed.title ?? "",
      requiredFieldCount: Array.isArray(parsed.required) ? parsed.required.length : 0,
      sha256: sha256Hex(raw),
    };
  });

  const body = entries.map(entryLines).join("\n");

  return `${HEADER}
export interface ContractIndexEntry {
  readonly file: string;
  readonly id: string;
  readonly title: string;
  readonly requiredFieldCount: number;
  readonly sha256: string;
}

export const CONTRACT_INDEX: readonly ContractIndexEntry[] = [
${body}
];
`;
}
