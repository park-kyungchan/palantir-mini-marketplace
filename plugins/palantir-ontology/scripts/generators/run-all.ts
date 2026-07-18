#!/usr/bin/env bun
// Regenerates every P340 generated artifact and writes it to disk. Not one
// of the mandatory execution-plan.md section-11.2 script names — exposed as
// `bun run generate:all`. `generated:check` (scripts/generated-check.ts)
// runs the same generator functions in memory and fails on drift; this
// script is the one that actually (re)writes scripts/generated/**.

import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { generateContractIndex } from "./contract-index";
import { generateReasonCodeIndex } from "./reason-code-index";
import { generateCapabilityIndex } from "./capability-index";

const PACKAGE_ROOT = resolve(import.meta.dir, "..", "..");
const CONTRACTS_DIR = join(PACKAGE_ROOT, "contracts");
const GENERATED_DIR = join(PACKAGE_ROOT, "scripts", "generated");
const ADAPTERS_SHARED_DIR = join(PACKAGE_ROOT, "src", "adapters", "shared");

function main(): void {
  const contractIndex = generateContractIndex(CONTRACTS_DIR);
  writeFileSync(join(GENERATED_DIR, "contract-index.generated.ts"), contractIndex, "utf8");

  const reasonCodeIndex = generateReasonCodeIndex(join(CONTRACTS_DIR, "reason-code-registry.json"));
  writeFileSync(join(GENERATED_DIR, "reason-code-index.generated.ts"), reasonCodeIndex, "utf8");

  const capabilityIndex = generateCapabilityIndex(join(ADAPTERS_SHARED_DIR, "capability-registry.json"));
  writeFileSync(join(GENERATED_DIR, "capability-index.generated.ts"), capabilityIndex, "utf8");

  console.log(
    "generate:all — wrote scripts/generated/contract-index.generated.ts, scripts/generated/reason-code-index.generated.ts, and scripts/generated/capability-index.generated.ts",
  );
}

if (import.meta.main) main();
