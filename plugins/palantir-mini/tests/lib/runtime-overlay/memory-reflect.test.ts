// palantir-mini — tests/lib/runtime-overlay/memory-reflect.test.ts
// Paired tests for Stage-3 Sink-1 WRITE: reflectMemoryToCache().
//
// USER DECISION under test: the curated git-tracked Claude memory MEMORY.md is
// INDEX-ONLY and must be BYTE-UNTOUCHED. The prior-session digest is reflected
// into a DEDICATED pm-owned cache file (.palantir-mini/cache/memory-prior.md),
// auto-created (with its fence) when missing.
//
// ADR 0001 (docs/adr/0001-memory-reflect-recap-provider-inversion.md):
// memory-reflect.ts (lib/) no longer imports bridge/handlers/pm-recap.ts via
// a dynamic, module-interception-prone import. Tests inject a fake
// RecapProvider directly via `opts.recapProvider` instead — no process-global
// module mock, no file-load-order dependency, no CI/local divergence.
//
// Coverage:
//   1. resolveCachePath is importable + points at the dedicated cache file
//      (NOT MEMORY.md).
//   2. Writes the digest to the dedicated cache file, auto-creating it + its
//      fence when missing.
//   3. Any user MEMORY.md on disk is BYTE-UNTOUCHED across a reflect.
//   4. Second call with an unchanged digest → reason "unchanged", no re-write
//      (mtime + bytes stable).
//   5. PALANTIR_MINI_MEMORY_REFLECT_DISABLE=1 bypass → reason "disabled",
//      no cache file created.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  reflectMemoryToCache,
  resolveCachePath,
} from "../../../lib/runtime-overlay/memory-reflect";
import type { RecapProvider } from "../../../lib/recap/types";

const CACHE_START = "<!-- pm-recap-cache-start -->";
const CACHE_END = "<!-- pm-recap-cache-end -->";

// Deterministic fake RecapProvider so the digest is stable across calls (the
// real pm_recap handler stamps generatedAt = new Date().toISOString(), which
// would never let the hash-gate report "unchanged"). Injected directly via
// opts.recapProvider — no module mocking involved.
const FIXED_RECAP: RecapProvider = async () => ({
  project: "unused",
  scope: "current-sprint",
  generatedAt: "FIXED-TS-FOR-TEST",
  substrateHealth: { totalEvents: 7, gradeDistribution: {}, t2PlusRatio: 0.5, t3CircuitInputs: 2 },
  sprintSummary: [],
  topEvents: {},
});

// ─── Setup / teardown ────────────────────────────────────────────────────────

let TMP: string;
const SAVED_ENV = { ...process.env };

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-memory-reflect-"));
  delete process.env.PALANTIR_MINI_MEMORY_PATH;
  delete process.env.PALANTIR_MINI_MEMORY_REFLECT_DISABLE;
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
  process.env = { ...SAVED_ENV };
});

// ─── 1. resolveCachePath is importable + targets the dedicated cache file ─────

describe("resolveCachePath", () => {
  test("is an exported function returning the dedicated pm-owned cache path", () => {
    expect(typeof resolveCachePath).toBe("function");
    const p = resolveCachePath(TMP);
    expect(path.isAbsolute(p)).toBe(true);
    // Dedicated pm-owned cache file — NOT MEMORY.md.
    expect(p).toBe(
      path.join(TMP, ".palantir-mini", "cache", "memory-prior.md"),
    );
    expect(p.endsWith("MEMORY.md")).toBe(false);
  });

  test("PALANTIR_MINI_MEMORY_PATH override redirects the cache target", () => {
    const override = path.join(TMP, "custom-cache.md");
    process.env.PALANTIR_MINI_MEMORY_PATH = override;
    expect(resolveCachePath(TMP)).toBe(override);
  });
});

// ─── 2. Writes to the dedicated cache file, auto-creating it + fence ──────────

describe("reflect writes to dedicated cache file", () => {
  test("auto-creates the cache file with a fence and the digest inside it", async () => {
    const cachePath = resolveCachePath(TMP);
    expect(fs.existsSync(cachePath)).toBe(false);

    const result = await reflectMemoryToCache(TMP, { recapProvider: FIXED_RECAP });

    expect(result.written).toBe(true);
    expect(result.reason).toBe("hash changed");
    expect(fs.existsSync(cachePath)).toBe(true);

    const content = fs.readFileSync(cachePath, "utf8");
    expect(content.includes(CACHE_START)).toBe(true);
    expect(content.includes(CACHE_END)).toBe(true);
    // The digest text lives between the fence markers.
    const inner = content.slice(
      content.indexOf(CACHE_START) + CACHE_START.length,
      content.indexOf(CACHE_END),
    );
    expect(inner).toContain(result.digest!);
    expect(result.digest).toContain("Generated: FIXED-TS-FOR-TEST");
  });

  test("a subsequent CHANGED digest rewrites only the fenced block", async () => {
    const cachePath = resolveCachePath(TMP);
    await reflectMemoryToCache(TMP, { recapProvider: FIXED_RECAP });
    const firstContent = fs.readFileSync(cachePath, "utf8");

    // Swap the provider to one yielding a different digest → hash changes →
    // rewrite. No re-mocking needed — just pass a different function.
    const CHANGED_RECAP: RecapProvider = async () => ({
      project: "unused",
      scope: "current-sprint",
      generatedAt: "SECOND-TS",
      substrateHealth: { totalEvents: 99, gradeDistribution: {}, t2PlusRatio: 0.9, t3CircuitInputs: 9 },
      sprintSummary: [],
      topEvents: {},
    });

    const result = await reflectMemoryToCache(TMP, { recapProvider: CHANGED_RECAP });
    expect(result.written).toBe(true);
    const secondContent = fs.readFileSync(cachePath, "utf8");
    expect(secondContent).not.toBe(firstContent);
    // The non-fence scaffold header is preserved across rewrites.
    expect(secondContent.startsWith("# palantir-mini")).toBe(true);
    expect(secondContent).toContain("SECOND-TS");
  });
});

// ─── 3. User MEMORY.md is BYTE-UNTOUCHED ──────────────────────────────────────

describe("MEMORY.md is never written", () => {
  test("a user MEMORY.md on disk is byte-identical after reflect", async () => {
    // Simulate a curated, index-only MEMORY.md inside the project tree.
    const memoryDir = path.join(TMP, "memory");
    fs.mkdirSync(memoryDir, { recursive: true });
    const memoryPath = path.join(memoryDir, "MEMORY.md");
    const ORIGINAL = "# MEMORY.md\n\nindex-only — do not autofence.\n";
    fs.writeFileSync(memoryPath, ORIGINAL, "utf8");
    const beforeBytes = fs.readFileSync(memoryPath);

    const result = await reflectMemoryToCache(TMP, { recapProvider: FIXED_RECAP });
    expect(result.written).toBe(true);

    const afterBytes = fs.readFileSync(memoryPath);
    expect(afterBytes.equals(beforeBytes)).toBe(true);
    expect(fs.readFileSync(memoryPath, "utf8")).toBe(ORIGINAL);
    // The digest landed in the dedicated cache file instead.
    expect(fs.existsSync(resolveCachePath(TMP))).toBe(true);
  });
});

// ─── 4. Unchanged digest → "unchanged", no re-write ───────────────────────────

describe("hash-gated skip on unchanged digest", () => {
  test("second call with same digest returns 'unchanged' and does not re-write", async () => {
    const cachePath = resolveCachePath(TMP);

    const r1 = await reflectMemoryToCache(TMP, { recapProvider: FIXED_RECAP });
    expect(r1.reason).toBe("hash changed");
    const mtime1 = fs.statSync(cachePath).mtimeMs;
    const bytes1 = fs.readFileSync(cachePath);

    const r2 = await reflectMemoryToCache(TMP, { recapProvider: FIXED_RECAP });
    expect(r2.written).toBe(false);
    expect(r2.reason).toBe("unchanged");

    const mtime2 = fs.statSync(cachePath).mtimeMs;
    const bytes2 = fs.readFileSync(cachePath);
    expect(bytes2.equals(bytes1)).toBe(true);
    expect(mtime2).toBe(mtime1);
  });
});

// ─── 5. DISABLE bypass ────────────────────────────────────────────────────────

describe("PALANTIR_MINI_MEMORY_REFLECT_DISABLE bypass", () => {
  test("when set to 1, returns 'disabled' and touches no disk", async () => {
    process.env.PALANTIR_MINI_MEMORY_REFLECT_DISABLE = "1";
    const cachePath = resolveCachePath(TMP);

    const result = await reflectMemoryToCache(TMP, { recapProvider: FIXED_RECAP });
    expect(result.written).toBe(false);
    expect(result.reason).toBe("disabled");
    expect(fs.existsSync(cachePath)).toBe(false);
  });
});
