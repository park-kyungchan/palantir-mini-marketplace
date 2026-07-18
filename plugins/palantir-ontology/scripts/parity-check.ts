#!/usr/bin/env bun
// parity:check (ledger row P340, docs/architecture.md ADR-002/ADR-007).
//
// ADR-007: "Claude, Codex, and Gemini consume identical semantic fixtures.
// Packaging differences are adapter metadata only." At this scaffold stage
// (before Wave 6's generator exists) the checkable structural instance of
// that rule is: the three runtime-specific adapter directories
// (src/adapters/{codex,claude,gemini}/) must carry an identical set of
// relative file paths — no runtime may silently gain a file the other two
// lack. Currently all three are empty (0 == 0 == 0), which is a genuine
// pass of a genuine rule, not a hardcoded no-op: this script fails the
// moment any one of the three diverges from the other two. Run standalone:
// `bun run parity:check`.

import { join, resolve } from "node:path";
import { walkFiles } from "./lib/fs-walk";

const PACKAGE_ROOT = resolve(import.meta.dir, "..");
const ADAPTERS_DIR = join(PACKAGE_ROOT, "src", "adapters");
const RUNTIME_DIRS = ["codex", "claude", "gemini"] as const;

export interface ParityResult {
  readonly filesByRuntime: Readonly<Record<(typeof RUNTIME_DIRS)[number], readonly string[]>>;
  readonly onlyInOneOrTwo: ReadonlyArray<{ path: string; presentIn: string[]; missingFrom: string[] }>;
}

export function checkAdapterParity(adaptersDir: string): ParityResult {
  const filesByRuntime = {} as Record<(typeof RUNTIME_DIRS)[number], string[]>;
  for (const runtime of RUNTIME_DIRS) {
    filesByRuntime[runtime] = walkFiles(join(adaptersDir, runtime));
  }

  const allPaths = new Set<string>();
  for (const runtime of RUNTIME_DIRS) {
    for (const p of filesByRuntime[runtime]) allPaths.add(p);
  }

  const onlyInOneOrTwo: Array<{ path: string; presentIn: string[]; missingFrom: string[] }> = [];
  for (const p of [...allPaths].sort()) {
    const presentIn = RUNTIME_DIRS.filter((r) => filesByRuntime[r].includes(p));
    const missingFrom = RUNTIME_DIRS.filter((r) => !filesByRuntime[r].includes(p));
    if (missingFrom.length > 0) {
      onlyInOneOrTwo.push({ path: p, presentIn: [...presentIn], missingFrom: [...missingFrom] });
    }
  }

  return { filesByRuntime, onlyInOneOrTwo };
}

function main(): void {
  const result = checkAdapterParity(ADAPTERS_DIR);
  const counts = RUNTIME_DIRS.map((r) => `${r}=${result.filesByRuntime[r].length}`).join(", ");

  if (result.onlyInOneOrTwo.length > 0) {
    console.error(`parity:check FAIL — ${result.onlyInOneOrTwo.length} path(s) not present across all three runtime adapter directories (${counts}):`);
    for (const item of result.onlyInOneOrTwo) {
      console.error(`  ${item.path}: present in [${item.presentIn.join(", ")}], missing from [${item.missingFrom.join(", ")}]`);
    }
    process.exit(1);
  }

  console.log(`parity:check PASS — src/adapters/{codex,claude,gemini}/ carry an identical file-path set (${counts}).`);
}

if (import.meta.main) main();
