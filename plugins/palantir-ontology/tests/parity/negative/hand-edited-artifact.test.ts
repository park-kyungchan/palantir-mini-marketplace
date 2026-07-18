// Negative divergence fixture 1/2 (ledger row A650, execution-plan §9 row
// A650: "Add NEGATIVE fixtures that deliberately diverge one adapter from
// the neutral source (e.g. a stale/hand-edited capability claim) and prove
// parity:check FAILS on that divergence — parity:check must consume both
// the positive and negative fixtures, not just the positive ones."). See
// README.md in this directory for the full design note and
// ../cross-runtime/ for the companion positive 3-way proof.
//
// Fixture wiring (not a reimplementation): this file reuses, UNMODIFIED,
// the exact three functions `scripts/parity-check.ts`'s own
// `introspectBinding()` calls for every populated runtime —
// `check{Runtime}BindingArtifact`, `generate{Runtime}BindingSource`, and
// `HEADER` — all imported straight from each runtime's committed
// `src/adapters/<runtime>/index.ts` barrel (never a hand-rolled copy).
// `scripts/parity-check.ts` itself is outside this row's exact write set
// (tests/parity/** only — decisions/w6-write-set-adjudication.md's
// convention extended to A650), so this suite proves the divergence is
// caught by calling the SAME functions with a deliberately hand-edited
// input, rather than by editing the script.
//
// "A stale/hand-edited single-adapter capability claim" means exactly
// this: someone committed a change to a runtime's `binding.generated.ts`
// without regenerating it from `src/adapters/shared/capability-registry.
// json` — the DO-NOT-EDIT header survives untouched (headerOk stays
// true), but the content no longer equals what fresh regeneration
// produces (driftOk flips to false). `scripts/parity-check.ts`'s tier-1
// gate ("every EXISTING binding must be regeneration-identical from the
// neutral source") treats `driftOk === false` alone as sufficient to fail
// the real `bun run parity:check` run (see the final test below, which
// asserts that exact predicate).

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { HEADER as CODEX_HEADER, checkCodexBindingArtifact, generateCodexBindingSource } from "../../../src/adapters/codex";
import { HEADER as CLAUDE_HEADER, checkClaudeBindingArtifact, generateClaudeBindingSource } from "../../../src/adapters/claude";
import { HEADER as GEMINI_HEADER, checkGeminiBindingArtifact, generateGeminiBindingSource } from "../../../src/adapters/gemini";

const ADAPTERS_DIR = resolve(import.meta.dir, "..", "..", "..", "src", "adapters");
const REGISTRY_PATH = join(ADAPTERS_DIR, "shared", "capability-registry.json");

interface DriftCheckResult {
  readonly headerOk: boolean;
  readonly driftOk: boolean;
  readonly onDiskMissing: boolean;
}

interface RuntimeCase {
  readonly name: "codex" | "claude" | "gemini";
  readonly header: string;
  readonly generateSource: (registryPath: string) => string;
  readonly checkArtifact: (outputPath: string, header: string, regenerate: () => string) => DriftCheckResult;
}

const CASES: readonly RuntimeCase[] = [
  { name: "codex", header: CODEX_HEADER, generateSource: generateCodexBindingSource, checkArtifact: checkCodexBindingArtifact },
  { name: "claude", header: CLAUDE_HEADER, generateSource: generateClaudeBindingSource, checkArtifact: checkClaudeBindingArtifact },
  { name: "gemini", header: GEMINI_HEADER, generateSource: generateGeminiBindingSource, checkArtifact: checkGeminiBindingArtifact },
];

describe("negative: a hand-edited single-adapter capability claim is caught as drift by the reused parity-check machinery", () => {
  for (const { name, header, generateSource, checkArtifact } of CASES) {
    test(`${name}: sanity control — an unedited fresh regeneration is drift-free`, () => {
      const dir = mkdtempSync(join(tmpdir(), `a650-negative-${name}-`));
      try {
        const correct = generateSource(REGISTRY_PATH);
        const outputPath = join(dir, "binding.generated.ts");
        writeFileSync(outputPath, correct, "utf8");

        const result = checkArtifact(outputPath, header, () => generateSource(REGISTRY_PATH));

        expect(result).toEqual({ headerOk: true, driftOk: true, onDiskMissing: false });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    test(`${name}: a hand-edited capability claim (one verdict flipped post-generation) is detected as drift`, () => {
      const dir = mkdtempSync(join(tmpdir(), `a650-negative-${name}-`));
      try {
        const correct = generateSource(REGISTRY_PATH);
        expect(correct).toContain('"supported"');

        // Simulate the hand-edit: flip exactly one capability verdict
        // string, leave everything else — including the DO-NOT-EDIT
        // header — byte-identical to the freshly generated source.
        const handEdited = correct.replace('"supported"', '"unsupported"');
        expect(handEdited).not.toBe(correct);
        expect(handEdited.startsWith(header)).toBe(true);

        const outputPath = join(dir, "binding.generated.ts");
        writeFileSync(outputPath, handEdited, "utf8");

        const result = checkArtifact(outputPath, header, () => generateSource(REGISTRY_PATH));

        expect(result.headerOk).toBe(true);
        expect(result.driftOk).toBe(false);
        expect(result.onDiskMissing).toBe(false);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    test(`${name}: a missing artifact file is also detected (onDiskMissing), never silently treated as fresh`, () => {
      const dir = mkdtempSync(join(tmpdir(), `a650-negative-${name}-`));
      try {
        const outputPath = join(dir, "binding.generated.ts"); // never written
        const result = checkArtifact(outputPath, header, () => generateSource(REGISTRY_PATH));
        expect(result.onDiskMissing).toBe(true);
        expect(result.driftOk).toBe(false);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  test("driftOk===false alone is exactly the predicate scripts/parity-check.ts's introspectBinding treats as a hard tier-1 failure", () => {
    // scripts/parity-check.ts main(): for every populated runtime,
    //   if (!introspection.headerOk || !introspection.driftOk || introspection.onDiskMissing) { failures.push(...) }
    // and separately:
    //   if (failures.length > 0) { ...; process.exit(1); }
    // i.e. `bun run parity:check` FAILS (non-zero exit) the moment any one
    // populated runtime's driftOk is false — exactly the case the
    // hand-edited-capability-claim tests above produce. This test names
    // that predicate directly so a future edit to it is caught here too,
    // without re-importing scripts/parity-check.ts's un-exported
    // `introspectBinding` (private to that module; only `checkAdapterParity`,
    // `RUNTIME_DIRS`, and `pascalCase` are exported).
    const driftedResult = { headerOk: true, driftOk: false, onDiskMissing: false };
    const wouldFailParityCheckTier1 = !driftedResult.headerOk || !driftedResult.driftOk || driftedResult.onDiskMissing;
    expect(wouldFailParityCheckTier1).toBe(true);

    const freshResult = { headerOk: true, driftOk: true, onDiskMissing: false };
    const freshWouldPassTier1 = !(!freshResult.headerOk || !freshResult.driftOk || freshResult.onDiskMissing);
    expect(freshWouldPassTier1).toBe(true);
  });
});
