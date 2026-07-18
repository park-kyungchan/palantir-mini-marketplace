#!/usr/bin/env bun
// Regenerates src/adapters/gemini/binding.generated.ts from A610's neutral
// capability registry (ledger row A640). Standalone entrypoint — NOT wired
// into the shared `bun run generate:all` (scripts/generators/run-all.ts is
// outside this row's write set; decisions/w6-write-set-adjudication.md).
// Run directly: `bun run src/adapters/gemini/generate.ts`.

import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { generateGeminiBindingSource } from "./generator";

const GEMINI_DIR = resolve(import.meta.dir);
const REGISTRY_PATH = join(GEMINI_DIR, "..", "shared", "capability-registry.json");
const OUTPUT_PATH = join(GEMINI_DIR, "binding.generated.ts");

function main(): void {
  const source = generateGeminiBindingSource(REGISTRY_PATH);
  writeFileSync(OUTPUT_PATH, source, "utf8");
  console.log("src/adapters/gemini/generate.ts — wrote src/adapters/gemini/binding.generated.ts");
}

if (import.meta.main) main();
