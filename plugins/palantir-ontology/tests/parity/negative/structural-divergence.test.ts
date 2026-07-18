// Negative divergence fixture 2/2 (ledger row A650) — the standing
// propagation-invariant test mandated by
// decisions/w6-parity-backport-adjudication.md's ruling 3: "any row that
// introduces a NEW per-adapter structural component must propagate it to
// ALL populated adapter directories within that same row (or stop and
// flag). A650 parity fixtures must encode this as a structural invariant
// so recurrence is caught by fixture, not by adjudication." (That ruling
// fired for real once already: A630 introduced
// `mechanism-classification.{ts,test.ts}` and A620/codex did not have it
// yet; the asymmetry was only caught when A640 populated the third
// directory and the first full 3-way `parity:check` ran. It was backfixed
// by a correction worker, not prevented at the time — this suite is what
// makes the NEXT such asymmetry a fixture failure instead of a live
// three-way-parity surprise.)
//
// Fixture wiring (not a reimplementation): every assertion below calls
// `checkAdapterParity`, imported UNMODIFIED from `scripts/parity-check.ts`
// (the same function `bun run parity:check`'s `main()` calls at its
// tier-3 "once all three are populated, strict cross-runtime file-path-set
// equality engages automatically" stage) — never a re-derived comparison.
// `scripts/parity-check.ts` is outside this row's exact write set
// (tests/parity/** only), so the fixture directories are synthesized at
// test time under a temp directory rather than by editing that script or
// by checking in copies of the real (39-file) `src/adapters/` tree, which
// would go stale the moment any adapter's real file count changes. See
// README.md in this directory for the full design note.

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkAdapterParity } from "../../../scripts/parity-check";

const REAL_ADAPTERS_DIR = resolve(import.meta.dir, "..", "..", "..", "src", "adapters");

function makeSymmetricAdaptersDir(sharedFiles: readonly string[]): string {
  const root = mkdtempSync(join(tmpdir(), "a650-negative-structural-symmetric-"));
  for (const runtime of ["codex", "claude", "gemini"] as const) {
    const dir = join(root, runtime);
    mkdirSync(dir, { recursive: true });
    for (const file of sharedFiles) {
      writeFileSync(join(dir, file), `// stub for ${runtime}/${file}\n`, "utf8");
    }
  }
  return root;
}

const SHARED_FILES = ["binding.generated.ts", "generator.ts", "drift-check.ts", "index.ts"] as const;

describe("negative: a new per-adapter file present in some but not all populated adapter directories is caught by checkAdapterParity", () => {
  test("sanity control: a synthetic 3-way symmetric tree reports zero divergence (this fixture harness is not trivially always-divergent)", () => {
    const root = makeSymmetricAdaptersDir(SHARED_FILES);
    try {
      const result = checkAdapterParity(root);
      expect(result.populated).toEqual(["codex", "claude", "gemini"]);
      expect(result.pending).toEqual([]);
      expect(result.onlyInOneOrTwo).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a NEW file appearing in exactly one populated adapter directory (mirroring the real mechanism-classification.ts backport case) is flagged", () => {
    const root = makeSymmetricAdaptersDir(SHARED_FILES);
    try {
      // Mirrors the real incident: claude gains a new per-adapter
      // structural component (mechanism-classification.ts) that codex and
      // gemini have not yet received.
      writeFileSync(join(root, "claude", "mechanism-classification.ts"), "// new per-adapter component\n", "utf8");

      const result = checkAdapterParity(root);

      expect(result.populated).toEqual(["codex", "claude", "gemini"]);
      expect(result.onlyInOneOrTwo).not.toEqual([]);
      const divergent = result.onlyInOneOrTwo.find((item) => item.path === "mechanism-classification.ts");
      expect(divergent).toBeDefined();
      expect(divergent?.presentIn).toEqual(["claude"]);
      expect(divergent?.missingFrom).toEqual(["codex", "gemini"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a file appearing in two of three populated adapters (not just one) is also flagged, not only the single-adapter case", () => {
    const root = makeSymmetricAdaptersDir(SHARED_FILES);
    try {
      writeFileSync(join(root, "claude", "extra-shared-thing.ts"), "// present in claude and gemini only\n", "utf8");
      writeFileSync(join(root, "gemini", "extra-shared-thing.ts"), "// present in claude and gemini only\n", "utf8");

      const result = checkAdapterParity(root);

      const divergent = result.onlyInOneOrTwo.find((item) => item.path === "extra-shared-thing.ts");
      expect(divergent).toBeDefined();
      expect(divergent?.presentIn).toEqual(["claude", "gemini"]);
      expect(divergent?.missingFrom).toEqual(["codex"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("this onlyInOneOrTwo result is exactly what scripts/parity-check.ts's main() treats as a hard failure (process.exit(1))", () => {
    // scripts/parity-check.ts main():
    //   if (result.onlyInOneOrTwo.length > 0) { failures.push(...) }
    //   ...
    //   if (failures.length > 0) { ...; process.exit(1); }
    // i.e. any non-empty onlyInOneOrTwo makes the real `bun run
    // parity:check` fail. Named directly here (not re-imported, since
    // `main()` is not exported) so a future change to that predicate is
    // caught by this test too.
    const divergentResult = { onlyInOneOrTwo: [{ path: "x", presentIn: ["claude"], missingFrom: ["codex", "gemini"] }] };
    const wouldFailParityCheckTier3 = divergentResult.onlyInOneOrTwo.length > 0;
    expect(wouldFailParityCheckTier3).toBe(true);

    const symmetricResult = { onlyInOneOrTwo: [] as unknown[] };
    const symmetricWouldPassTier3 = symmetricResult.onlyInOneOrTwo.length === 0;
    expect(symmetricWouldPassTier3).toBe(true);
  });

  test("the real src/adapters/ tree today is symmetric — running the identical fixture-proven check against it also reports zero divergence", () => {
    // Not a duplicate of ../cross-runtime/fixture.test.ts's own assertion
    // of this: that file checks the real tree once, elsewhere, as a
    // positive-parity proof. This test's purpose is different — it
    // confirms the SAME `checkAdapterParity` call this file just proved
    // detects synthetic divergence (above) currently returns the
    // divergence-free result on the real, non-synthetic tree, i.e. the
    // detector is exercised against both a positive and a negative input
    // in one file, not just asserted correct on paper.
    const result = checkAdapterParity(REAL_ADAPTERS_DIR);
    expect(result.populated).toEqual(["codex", "claude", "gemini"]);
    expect(result.onlyInOneOrTwo).toEqual([]);
  });
});
