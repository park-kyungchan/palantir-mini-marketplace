#!/usr/bin/env bun
// generated:check (ledger row P340, docs/architecture.md ADR-007's
// generation-discipline requirement generalized to every generated
// artifact this scaffold currently has).
//
// For every registered generator: (1) recompute its output in memory, (2)
// assert the recomputed content starts with that generator's mandatory
// `@generated` / `DO NOT EDIT` header, (3) assert the recomputed content is
// byte-identical to what is currently on disk under scripts/generated/**
// (drift check — a hand-edit, or a source change nobody regenerated for,
// fails the build). Run standalone: `bun run generated:check`.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { generateContractIndex, HEADER as CONTRACT_INDEX_HEADER } from "./generators/contract-index";
import { generateReasonCodeIndex, HEADER as REASON_CODE_INDEX_HEADER } from "./generators/reason-code-index";

const PACKAGE_ROOT = resolve(import.meta.dir, "..");
const CONTRACTS_DIR = join(PACKAGE_ROOT, "contracts");
const GENERATED_DIR = join(PACKAGE_ROOT, "scripts", "generated");

interface GeneratedArtifact {
  readonly name: string;
  readonly outputPath: string;
  readonly header: string;
  readonly regenerate: () => string;
}

const ARTIFACTS: GeneratedArtifact[] = [
  {
    name: "contract-index",
    outputPath: join(GENERATED_DIR, "contract-index.generated.ts"),
    header: CONTRACT_INDEX_HEADER,
    regenerate: () => generateContractIndex(CONTRACTS_DIR),
  },
  {
    name: "reason-code-index",
    outputPath: join(GENERATED_DIR, "reason-code-index.generated.ts"),
    header: REASON_CODE_INDEX_HEADER,
    regenerate: () => generateReasonCodeIndex(join(CONTRACTS_DIR, "reason-code-registry.json")),
  },
];

export interface GeneratedCheckResult {
  readonly name: string;
  readonly headerOk: boolean;
  readonly driftOk: boolean;
  readonly onDiskMissing: boolean;
}

export function checkArtifact(a: GeneratedArtifact): GeneratedCheckResult {
  const recomputed = a.regenerate();
  const headerOk = recomputed.startsWith(a.header);

  let onDisk: string | null = null;
  let onDiskMissing = false;
  try {
    onDisk = readFileSync(a.outputPath, "utf8");
  } catch {
    onDiskMissing = true;
  }

  const driftOk = onDisk !== null && onDisk === recomputed;
  return { name: a.name, headerOk, driftOk, onDiskMissing };
}

function main(): void {
  const results = ARTIFACTS.map(checkArtifact);
  const failures = results.filter((r) => !r.headerOk || !r.driftOk || r.onDiskMissing);

  for (const r of results) {
    const status = r.headerOk && r.driftOk && !r.onDiskMissing ? "PASS" : "FAIL";
    console.log(
      `  [${status}] ${r.name}: header=${r.headerOk ? "ok" : "MISSING/MISMATCHED"} drift=${
        r.onDiskMissing ? "on-disk file MISSING" : r.driftOk ? "none" : "DETECTED"
      }`,
    );
  }

  if (failures.length > 0) {
    console.error(
      `generated:check FAIL — ${failures.length}/${results.length} artifact(s) failed header or drift check. Run "bun run generate:all" and re-diff, or fix the hand-edit.`,
    );
    process.exit(1);
  }

  console.log(`generated:check PASS — ${results.length}/${results.length} artifact(s) carry the mandatory header and are byte-stable against their source.`);
}

if (import.meta.main) main();
