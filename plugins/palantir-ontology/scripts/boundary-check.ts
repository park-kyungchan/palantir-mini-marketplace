#!/usr/bin/env bun
// boundary:check (ledger row P340, docs/architecture.md ADR-002).
//
// Enforces the one-way dependency direction: no file under `src/**` OTHER
// THAN `src/adapters/**` may import anything that resolves into
// `src/adapters/**`, and no such file may branch on runtime identity via a
// literal `claude`/`codex`/`gemini`/`anthropic`/`openai`/`google` mention
// (ADR-002: "No semantic-core file may branch on runtime identity... a
// boundary violation, not a style issue."). Adapters ARE allowed to import
// semantic-core/public contracts (the reverse direction), so only
// non-adapter files are scanned.
//
// Deliberately a regex-based import-specifier scan, not a full TS/AST
// parse — sufficient for this scaffold's import shapes (`import ... from
// "..."`, `import("...")`, `require("...")`) and consistent with this
// package's existing hand-rolled-checker precedent
// (tests/support/schema-validate.ts). Run standalone: `bun run boundary:check`.

import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { walkFiles } from "./lib/fs-walk";

const PACKAGE_ROOT = resolve(import.meta.dir, "..");
const SRC_DIR = join(PACKAGE_ROOT, "src");
const IMPORT_SPECIFIER_RE =
  /(?:import\s+(?:[^'";]*?\bfrom\s+)?|import\s*\(|require\s*\()\s*["']([^"']+)["']/g;
const RUNTIME_TERM_RE = /\b(claude|codex|gemini|anthropic|openai|google)\b/i;

export interface BoundaryViolation {
  readonly file: string;
  readonly kind: "adapter-import" | "runtime-identity-literal";
  readonly detail: string;
}

/** Pure predicate: does this import specifier, resolved from `fromFileDir`, land inside src/adapters/**? */
export function resolvesIntoAdapters(specifier: string, fromFileDir: string, srcDir: string): boolean {
  if (!specifier.startsWith(".")) return false; // bare/package specifiers are never src-internal here
  const resolved = resolve(fromFileDir, specifier);
  const relFromSrc = relative(srcDir, resolved);
  return relFromSrc === "adapters" || relFromSrc.startsWith(`adapters${"/"}`) || relFromSrc.startsWith("adapters\\");
}

function isAdapterFile(relFromSrc: string): boolean {
  return relFromSrc === "adapters" || relFromSrc.startsWith("adapters/") || relFromSrc.startsWith("adapters\\");
}

export function scanBoundaries(srcDir: string): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];
  const files = walkFiles(srcDir, (name) => name.endsWith(".ts") || name.endsWith(".tsx"));

  for (const relPath of files) {
    if (isAdapterFile(relPath)) continue; // adapters may import core; not scanned
    const fullPath = join(srcDir, relPath);
    const text = readFileSync(fullPath, "utf8");

    for (const match of text.matchAll(IMPORT_SPECIFIER_RE)) {
      const specifier = match[1]!;
      if (resolvesIntoAdapters(specifier, dirname(fullPath), srcDir)) {
        violations.push({
          file: relPath,
          kind: "adapter-import",
          detail: `imports "${specifier}" which resolves under src/adapters/**`,
        });
      }
    }

    const runtimeMatch = RUNTIME_TERM_RE.exec(text);
    if (runtimeMatch) {
      violations.push({
        file: relPath,
        kind: "runtime-identity-literal",
        detail: `contains runtime-identity literal "${runtimeMatch[1]}" (ADR-002: no branching on runtime identity outside src/adapters/**)`,
      });
    }
  }

  return violations;
}

function main(): void {
  const violations = scanBoundaries(SRC_DIR);
  const filesScanned = walkFiles(SRC_DIR, (n) => n.endsWith(".ts") || n.endsWith(".tsx")).length;

  if (violations.length > 0) {
    console.error(`boundary:check FAIL — ${violations.length} violation(s) across ${filesScanned} scanned file(s):`);
    for (const v of violations) {
      console.error(`  [${v.kind}] ${v.file}: ${v.detail}`);
    }
    process.exit(1);
  }

  console.log(`boundary:check PASS — 0 violations across ${filesScanned} scanned file(s) under src/** (excluding src/adapters/**).`);
}

if (import.meta.main) main();
