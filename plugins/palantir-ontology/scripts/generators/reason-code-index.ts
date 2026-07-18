// Generator: derives scripts/generated/reason-code-index.generated.ts from
// contracts/reason-code-registry.json (ledger row P340). Pure function of
// the source file's bytes — byte-stable across consecutive runs.

import { readFileSync } from "node:fs";
import { sha256Hex } from "../lib/hash";

export const HEADER = `// @generated
// DO NOT EDIT — produced by scripts/generators/reason-code-index.ts
// regenerate: bun run generate:all
// source: contracts/reason-code-registry.json, read at generation time
// generator-schema-version: 1.0.0
//
// Deterministic derived index: reason codes grouped by category, sorted.
// Byte-stable: content depends only on the source registry file's bytes,
// never on wall-clock time. generated:check (scripts/generated-check.ts)
// regenerates this in memory and fails the build on any drift.
`;

interface ReasonCode {
  code: string;
  category: string;
}

interface CategorySummary {
  readonly category: string;
  readonly count: number;
  readonly codes: readonly string[];
}

function categoryLines(c: CategorySummary): string {
  const codeList = c.codes.map((code) => JSON.stringify(code)).join(", ");
  return [
    "  {",
    `    category: ${JSON.stringify(c.category)},`,
    `    count: ${c.count},`,
    `    codes: [${codeList}],`,
    "  },",
  ].join("\n");
}

export function generateReasonCodeIndex(registryPath: string): string {
  const raw = readFileSync(registryPath, "utf8");
  const parsed = JSON.parse(raw) as { codes: ReasonCode[] };

  const byCategory = new Map<string, string[]>();
  for (const entry of parsed.codes) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry.code);
    byCategory.set(entry.category, list);
  }

  const categories: CategorySummary[] = [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, codes]) => ({
      category,
      count: codes.length,
      codes: [...codes].sort(),
    }));

  const body = categories.map(categoryLines).join("\n");
  const totalCount = parsed.codes.length;
  const sourceSha256 = sha256Hex(raw);

  return `${HEADER}
export interface ReasonCodeCategorySummary {
  readonly category: string;
  readonly count: number;
  readonly codes: readonly string[];
}

export const REASON_CODE_INDEX: readonly ReasonCodeCategorySummary[] = [
${body}
];

export const REASON_CODE_TOTAL_COUNT = ${totalCount};
export const REASON_CODE_REGISTRY_SHA256 = ${JSON.stringify(sourceSha256)};
`;
}
