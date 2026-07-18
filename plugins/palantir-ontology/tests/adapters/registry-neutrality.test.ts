// Permanent regression for validation-contract item 1 ("The neutral source
// is the SINGLE authority: no runtime binding directory (codex/claude/
// gemini) contains a hand-authored capability fact at this stage") and its
// parity:check corollary (ledger row A610).
//
// Reshaped per Lead ruling (decisions/w6-interim-state-adjudication.md,
// see outputs/a610-runtime-adapters.md "### W6 interim-state
// reconciliation"): the original version of this file asserted
// codex/claude/gemini stay EMPTY, which is an A610-only, sole-authority-
// stage invariant that legitimately breaks the moment any runtime row
// populates its directory (as A620 already demonstrated for codex). That
// assertion is removed. What remains — and must hold at every wave
// checkpoint, both before and after any adapter directory populates — is:
//
//   (a) src/adapters/shared/** is the sole CAPABILITY-DATA authority: it
//       carries exactly its known file set (nothing adapter-specific), and
//       no file anywhere under src/adapters/** imports from a SIBLING
//       adapter directory (codex importing claude, etc. — boundary-check's
//       own isAdapterFile scan explicitly skips this direction: "adapters
//       may import core; not scanned").
//   (b) every POPULATED adapter directory's committed binding is
//       regeneration-identical from the neutral source — reusing that
//       adapter's own generate/check pair (the same convention A620
//       established for Codex: `{RUNTIME}_BINDING` +
//       `check{Runtime}BindingArtifact` + `generate{Runtime}BindingSource`
//       + `HEADER` exported from its `index.ts` barrel), not a hand-rolled
//       per-runtime special case here.
//
// A still-empty adapter directory is simply skipped by (b) — there is
// nothing to regenerate yet — and is not a failure.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import { RUNTIME_DIRS, checkAdapterParity, pascalCase } from "../../scripts/parity-check";
import { walkFiles } from "../../scripts/lib/fs-walk";

const ADAPTERS_DIR = resolve(import.meta.dir, "..", "..", "src", "adapters");
const SHARED_DIR = join(ADAPTERS_DIR, "shared");
const REGISTRY_PATH = join(SHARED_DIR, "capability-registry.json");

describe("src/adapters/shared/: sole capability-data authority", () => {
  test("carries exactly the 4 expected files, nothing adapter-specific", () => {
    const files = walkFiles(SHARED_DIR).sort();
    expect(files).toEqual(["capability-registry.json", "index.ts", "registry-loader.ts", "types.ts"]);
  });

  test("no file under src/adapters/** imports from a sibling adapter directory", () => {
    for (const runtime of RUNTIME_DIRS) {
      const dir = join(ADAPTERS_DIR, runtime);
      if (!existsSync(dir)) continue;
      for (const rel of walkFiles(dir, (name) => name.endsWith(".ts"))) {
        const source = readFileSync(join(dir, rel), "utf8");
        const specifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]!);
        for (const specifier of specifiers) {
          if (!specifier.startsWith(".")) continue; // only local/relative imports resolve into src/adapters/**
          for (const other of RUNTIME_DIRS) {
            if (other === runtime) continue;
            const crossesIntoSibling = specifier.includes(`/${other}/`) || specifier.includes(`/${other}"`) || specifier.endsWith(`/${other}`) || specifier.includes(`../${other}`);
            expect(crossesIntoSibling).toBe(false);
          }
        }
      }
    }
  });
});

describe("src/adapters/{codex,claude,gemini}: regeneration-identical from the neutral source", () => {
  const parity = checkAdapterParity(ADAPTERS_DIR);

  if (parity.populated.length === 0) {
    test.skip("no runtime adapter directory is populated yet", () => {});
  }

  for (const runtime of parity.populated) {
    test(`${runtime}: committed binding matches a fresh regeneration from src/adapters/shared/capability-registry.json`, async () => {
      const pascal = pascalCase(runtime);
      const dir = join(ADAPTERS_DIR, runtime);
      const mod: Record<string, unknown> = await import(join(dir, "index.ts"));

      const checkFn = mod[`check${pascal}BindingArtifact`];
      const generateFn = mod[`generate${pascal}BindingSource`];
      const header = mod.HEADER;
      expect(typeof checkFn).toBe("function");
      expect(typeof generateFn).toBe("function");
      expect(typeof header).toBe("string");

      const result = (checkFn as (outputPath: string, header: string, regenerate: () => string) => {
        headerOk: boolean;
        driftOk: boolean;
        onDiskMissing: boolean;
      })(join(dir, "binding.generated.ts"), header as string, () => (generateFn as (registryPath: string) => string)(REGISTRY_PATH));

      expect(result.onDiskMissing).toBe(false);
      expect(result.headerOk).toBe(true);
      expect(result.driftOk).toBe(true);
    });
  }
});
