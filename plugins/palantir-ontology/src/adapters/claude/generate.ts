#!/usr/bin/env bun
// Regenerates src/adapters/claude/binding.generated.ts from A610's neutral
// capability registry (ledger row A630). Standalone entrypoint — NOT wired
// into the shared `bun run generate:all` (scripts/generators/run-all.ts is
// outside this row's write set; decisions/w6-write-set-adjudication.md).
// Run directly: `bun run src/adapters/claude/generate.ts`.

import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { generateClaudeBindingSource } from "./generator";

const CLAUDE_DIR = resolve(import.meta.dir);
const REGISTRY_PATH = join(CLAUDE_DIR, "..", "shared", "capability-registry.json");
const OUTPUT_PATH = join(CLAUDE_DIR, "binding.generated.ts");

function main(): void {
  const source = generateClaudeBindingSource(REGISTRY_PATH);
  writeFileSync(OUTPUT_PATH, source, "utf8");
  console.log("src/adapters/claude/generate.ts — wrote src/adapters/claude/binding.generated.ts");
}

if (import.meta.main) main();
