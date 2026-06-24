/**
 * Tests for the marketplace version sync writer.
 *
 * Every assertion runs against a TEMP FIXTURE root copied from the real
 * manifests; the real repo files are never mutated. (syncVersion / the
 * version-field module both take a root param expressly so this is possible.)
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  ALL_VERSION_FIELDS,
  CANONICAL,
  DEFAULT_REPOSITORY_ROOT,
  TARGETS,
  getAtPath,
} from "./marketplace-version-fields";
import { syncVersion } from "./sync-marketplace-version";

const REAL_ROOT = DEFAULT_REPOSITORY_ROOT;

/** Files that hold a version field (canonical file + every target file). */
const FIXTURE_FILES = [...new Set(ALL_VERSION_FIELDS.map((f) => f.file))];

function buildFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "mv-sync-fixture-"));
  for (const rel of FIXTURE_FILES) {
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(REAL_ROOT, rel), dest);
  }
  return root;
}

/** Replicates verify-marketplace-integrity's version-block, parameterized by root. */
function versionFieldsAllEqualCanonical(root: string): boolean {
  const canonical = getAtPath(
    JSON.parse(readFileSync(join(root, CANONICAL.file), "utf8")),
    CANONICAL.jsonPath,
  );
  if (typeof canonical !== "string") return false;
  return TARGETS.every((ref) => {
    const found = getAtPath(
      JSON.parse(readFileSync(join(root, ref.file), "utf8")),
      ref.jsonPath,
    );
    return found === canonical;
  });
}

function fieldValue(root: string, file: string, jsonPath: string): unknown {
  return getAtPath(JSON.parse(readFileSync(join(root, file), "utf8")), jsonPath);
}

/** Lines that differ between two texts (used to prove format-preservation). */
function changedLines(before: string, after: string): { before: string; after: string }[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const out: { before: string; after: string }[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if ((a[i] ?? "") !== (b[i] ?? "")) out.push({ before: a[i] ?? "", after: b[i] ?? "" });
  }
  return out;
}

describe("sync-marketplace-version", () => {
  let root: string;
  const originals = new Map<string, string>();

  beforeEach(() => {
    root = buildFixture();
    for (const rel of FIXTURE_FILES) {
      originals.set(rel, readFileSync(join(root, rel), "utf8"));
    }
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("(a) set 9.9.9 makes ALL 8 target fields + canonical == 9.9.9", () => {
    const result = syncVersion("9.9.9", root);
    expect(result.version).toBe("9.9.9");
    for (const ref of ALL_VERSION_FIELDS) {
      expect(fieldValue(root, ref.file, ref.jsonPath)).toBe("9.9.9");
    }
    // 8 targets all flipped from 7.34.0 -> 9.9.9 (canonical was 7.34.0 too).
    expect(result.changes.length).toBe(ALL_VERSION_FIELDS.length);
  });

  test("(b) verify version-block passes against the fixture after a set", () => {
    syncVersion("9.9.9", root);
    expect(versionFieldsAllEqualCanonical(root)).toBe(true);
  });

  test("(c) idempotent: a second sync after set yields no changes", () => {
    syncVersion("9.9.9", root);
    const second = syncVersion("9.9.9", root);
    expect(second.changes.length).toBe(0);
  });

  test("(c2) idempotent: propagate-mode (no arg) on an in-sync fixture is a no-op", () => {
    const result = syncVersion(undefined, root);
    expect(result.version).toBe("7.34.0");
    expect(result.changes.length).toBe(0);
    for (const rel of FIXTURE_FILES) {
      expect(readFileSync(join(root, rel), "utf8")).toBe(originals.get(rel)!);
    }
  });

  test("(d) format-preserving: only version lines differ from the fixture original", () => {
    syncVersion("9.9.9", root);
    for (const rel of FIXTURE_FILES) {
      const before = originals.get(rel)!;
      const after = readFileSync(join(root, rel), "utf8");
      // trailing newline preserved
      expect(after.endsWith("\n")).toBe(before.endsWith("\n"));
      // every differing line must be a version line: old token gone, new token in
      for (const { before: lb, after: la } of changedLines(before, after)) {
        expect(lb).toContain("7.34.0");
        expect(la).toContain("9.9.9");
        // the ONLY change on the line is the version token
        expect(la).toBe(lb.replace("7.34.0", "9.9.9"));
      }
    }
  });

  test("(d2) format-preserving: unicode escapes in plugin marketplace.json survive", () => {
    const rel = "plugins/palantir-mini/.claude-plugin/marketplace.json";
    syncVersion("9.9.9", root);
    const after = readFileSync(join(root, rel), "utf8");
    // The — em-dash escapes must remain literal escapes, not be decoded.
    expect(after).toContain("\\u2014");
  });

  test("propagate-mode (no arg) repairs drift to the canonical value", () => {
    // Simulate drift: bump ONLY canonical, leave targets at 7.34.0.
    syncCanonicalOnly(root, "8.0.0");
    expect(versionFieldsAllEqualCanonical(root)).toBe(false);
    const result = syncVersion(undefined, root);
    expect(result.version).toBe("8.0.0");
    expect(versionFieldsAllEqualCanonical(root)).toBe(true);
  });

  test("rejects a malformed version", () => {
    expect(() => syncVersion("9.9", root)).toThrow();
    expect(() => syncVersion("v9.9.9", root)).toThrow();
  });

  test("does not mutate the real PMR files (sanity: fixture root != real root)", () => {
    expect(root).not.toBe(REAL_ROOT);
    expect(root.startsWith(tmpdir())).toBe(true);
  });
});

/** Writes ONLY the canonical field to a new value (test helper to induce drift). */
function syncCanonicalOnly(root: string, version: string): void {
  const file = join(root, CANONICAL.file);
  const text = readFileSync(file, "utf8");
  // canonical is the first/top-level .version on its own line in plugin.json
  const replaced = text.replace(/("version":\s*")7\.34\.0(")/, `$1${version}$2`);
  if (replaced === text) throw new Error("test helper failed to bump canonical");
  writeFileSync(file, replaced);
}
