#!/usr/bin/env bun
// parity:check (ledger row P340, docs/architecture.md ADR-002/ADR-007).
//
// Reshaped W6 interim-state reconciliation (post-A620, Lead ruling
// decisions/w6-interim-state-adjudication.md — see outputs/a610-runtime-
// adapters.md "### W6 interim-state reconciliation"). The original
// scaffold-stage version of this script required
// `src/adapters/{codex,claude,gemini}/` to carry an identical file-path
// set at every checkpoint, which only genuinely held while all three were
// empty (0 == 0 == 0) and broke the moment any single Wave-6 runtime row
// populated its own directory (A620/codex first).
//
// ADR-007: "Claude, Codex, and Gemini consume identical semantic fixtures.
// Packaging differences are adapter metadata only." Enforced in tiers, each
// scoped to what is actually checkable given which runtime adapter
// directories are populated right now:
//
//   1. Every EXISTING (non-empty) binding must be regeneration-identical
//      from A610's neutral capability-registry source — reusing that
//      adapter's own generate/check pair (the `{RUNTIME}_BINDING` +
//      `check{Runtime}BindingArtifact` + `generate{Runtime}BindingSource`
//      + `HEADER` convention A620 established for Codex).
//   2. Every EXISTING binding's capability surface (its capability-area
//      set and its MCP tool-name set) must match every other EXISTING
//      binding's surface — checked pairwise across whichever bindings are
//      present now, not gated on all three existing.
//   3. Once codex, claude, AND gemini are ALL populated, the original
//      strict cross-runtime file-path-set equality additionally engages
//      automatically (no separate flag/mode) — full 3-way parity.
//
// A still-empty runtime directory is reported as PENDING and never fails
// the run — that is expected mid-wave, not a defect. Run standalone:
// `bun run parity:check`.

import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { walkFiles } from "./lib/fs-walk";

const PACKAGE_ROOT = resolve(import.meta.dir, "..");
const ADAPTERS_DIR = join(PACKAGE_ROOT, "src", "adapters");
const REGISTRY_PATH = join(ADAPTERS_DIR, "shared", "capability-registry.json");

export const RUNTIME_DIRS = ["codex", "claude", "gemini"] as const;
export type RuntimeDir = (typeof RUNTIME_DIRS)[number];

export function pascalCase(runtime: string): string {
  return runtime.charAt(0).toUpperCase() + runtime.slice(1);
}

export interface ParityResult {
  readonly filesByRuntime: Readonly<Record<RuntimeDir, readonly string[]>>;
  readonly populated: readonly RuntimeDir[];
  readonly pending: readonly RuntimeDir[];
  readonly onlyInOneOrTwo: ReadonlyArray<{ path: string; presentIn: string[]; missingFrom: string[] }>;
}

/**
 * File-path-level parity. Strict cross-runtime file-path-set equality
 * (`onlyInOneOrTwo`) only ever gets populated once ALL three runtime
 * directories are non-empty — full 3-way parity engages automatically at
 * that point, matching tier 3 above.
 */
export function checkAdapterParity(adaptersDir: string): ParityResult {
  const filesByRuntime = {} as Record<RuntimeDir, string[]>;
  for (const runtime of RUNTIME_DIRS) {
    filesByRuntime[runtime] = walkFiles(join(adaptersDir, runtime));
  }
  const populated = RUNTIME_DIRS.filter((r) => filesByRuntime[r].length > 0);
  const pending = RUNTIME_DIRS.filter((r) => filesByRuntime[r].length === 0);

  const onlyInOneOrTwo: Array<{ path: string; presentIn: string[]; missingFrom: string[] }> = [];
  if (populated.length === RUNTIME_DIRS.length) {
    const allPaths = new Set<string>();
    for (const runtime of RUNTIME_DIRS) {
      for (const p of filesByRuntime[runtime]) allPaths.add(p);
    }
    for (const p of [...allPaths].sort()) {
      const presentIn = RUNTIME_DIRS.filter((r) => filesByRuntime[r].includes(p));
      const missingFrom = RUNTIME_DIRS.filter((r) => !filesByRuntime[r].includes(p));
      if (missingFrom.length > 0) {
        onlyInOneOrTwo.push({ path: p, presentIn: [...presentIn], missingFrom: [...missingFrom] });
      }
    }
  }

  return { filesByRuntime, populated: [...populated], pending: [...pending], onlyInOneOrTwo };
}

interface BindingIntrospection {
  readonly headerOk: boolean;
  readonly driftOk: boolean;
  readonly onDiskMissing: boolean;
  readonly capabilityAreas: readonly string[];
  readonly toolNames: readonly string[];
}

type BindingIntrospectionResult = BindingIntrospection | { readonly error: string };

/**
 * Loads a populated adapter's own barrel (`src/adapters/<runtime>/index.ts`)
 * and reuses ITS generate/check pair — never a hand-rolled per-runtime
 * regeneration here — to prove regeneration-identity, plus reads its
 * capability-area and tool-name sets for the cross-binding surface check.
 */
async function introspectBinding(runtime: RuntimeDir): Promise<BindingIntrospectionResult> {
  const dir = join(ADAPTERS_DIR, runtime);
  const pascal = pascalCase(runtime);
  let mod: Record<string, unknown>;
  try {
    mod = await import(pathToFileURL(join(dir, "index.ts")).href);
  } catch (err) {
    return { error: `failed to import src/adapters/${runtime}/index.ts: ${(err as Error).message}` };
  }

  const checkFn = mod[`check${pascal}BindingArtifact`];
  const generateFn = mod[`generate${pascal}BindingSource`];
  const header = mod.HEADER;
  const binding = mod[`${runtime.toUpperCase()}_BINDING`] as
    | { manifest: { capabilities: ReadonlyArray<{ area: string }> }; tools: ReadonlyArray<{ name: string }> }
    | undefined;

  if (typeof checkFn !== "function" || typeof generateFn !== "function" || typeof header !== "string" || !binding) {
    return {
      error:
        `src/adapters/${runtime}/index.ts does not export the expected check${pascal}BindingArtifact/` +
        `generate${pascal}BindingSource/HEADER/${runtime.toUpperCase()}_BINDING contract`,
    };
  }

  const result = (
    checkFn as (outputPath: string, header: string, regenerate: () => string) => { headerOk: boolean; driftOk: boolean; onDiskMissing: boolean }
  )(join(dir, "binding.generated.ts"), header, () => (generateFn as (registryPath: string) => string)(REGISTRY_PATH));

  return {
    headerOk: result.headerOk,
    driftOk: result.driftOk,
    onDiskMissing: result.onDiskMissing,
    capabilityAreas: [...binding.manifest.capabilities.map((c) => c.area)].sort(),
    toolNames: [...binding.tools.map((t) => t.name)].sort(),
  };
}

async function main(): Promise<void> {
  const result = checkAdapterParity(ADAPTERS_DIR);
  const counts = RUNTIME_DIRS.map((r) => `${r}=${result.filesByRuntime[r].length}`).join(", ");
  const failures: string[] = [];

  const introspections = new Map<RuntimeDir, BindingIntrospection>();
  for (const runtime of result.populated) {
    const introspection = await introspectBinding(runtime);
    if ("error" in introspection) {
      failures.push(`${runtime}: ${introspection.error}`);
      continue;
    }
    introspections.set(runtime, introspection);
    if (!introspection.headerOk || !introspection.driftOk || introspection.onDiskMissing) {
      failures.push(
        `${runtime}: NOT regeneration-identical from the neutral source (headerOk=${introspection.headerOk}, driftOk=${introspection.driftOk}, onDiskMissing=${introspection.onDiskMissing})`,
      );
    }
  }

  const present = [...introspections.keys()];
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const a = introspections.get(present[i]!)!;
      const b = introspections.get(present[j]!)!;
      if (JSON.stringify(a.capabilityAreas) !== JSON.stringify(b.capabilityAreas)) {
        failures.push(`${present[i]} vs ${present[j]}: capability-area set differs ([${a.capabilityAreas.join(", ")}] vs [${b.capabilityAreas.join(", ")}])`);
      }
      if (JSON.stringify(a.toolNames) !== JSON.stringify(b.toolNames)) {
        failures.push(`${present[i]} vs ${present[j]}: tool-name set differs ([${a.toolNames.join(", ")}] vs [${b.toolNames.join(", ")}])`);
      }
    }
  }

  if (result.onlyInOneOrTwo.length > 0) {
    failures.push(
      `${result.onlyInOneOrTwo.length} path(s) not present across all three runtime adapter directories: ` +
        result.onlyInOneOrTwo.map((item) => `${item.path} present in [${item.presentIn.join(", ")}], missing from [${item.missingFrom.join(", ")}]`).join("; "),
    );
  }

  if (failures.length > 0) {
    console.error(`parity:check FAIL — ${counts}:`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }

  if (result.pending.length > 0) {
    console.log(`parity:check PASS — ${result.populated.length}/3 runtime(s) present (${counts}); pending: ${result.pending.join(", ")} (expected mid-wave, not a failure).`);
  } else {
    console.log(`parity:check PASS — full 3-way parity (${counts}); every binding regeneration-identical, capability surfaces and file-path sets match across all three.`);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(`parity:check FAIL — unexpected error: ${(err as Error).message}`);
    process.exit(1);
  });
}
