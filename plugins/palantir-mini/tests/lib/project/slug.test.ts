// palantir-mini v3.13.0+ — slug helper tests (crystalline-resilient-narwhal P-EXTRA)
// Coverage: deriveProjectSlug + composeSlugContractId + isSlugPrefixedContractId.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  deriveProjectSlug,
  composeSlugContractId,
  isSlugPrefixedContractId,
} from "../../../lib/project/slug";

const tmpDirs: string[] = [];

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

function mkTmpProject(label: string, packageName?: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-slug-${label}-`));
  tmpDirs.push(root);
  if (packageName !== undefined) {
    fs.writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: packageName }, null, 2),
      "utf8",
    );
  }
  return root;
}

describe("deriveProjectSlug", () => {
  test("scoped package.json#name → strips @scope/", () => {
    const root = mkTmpProject("scoped", "@palantirkc/monorepo-root");
    expect(deriveProjectSlug(root)).toBe("monorepo-root");
  });

  test("simple package.json#name → returned verbatim (sanitized)", () => {
    const root = mkTmpProject("simple", "palantir-math");
    expect(deriveProjectSlug(root)).toBe("palantir-math");
  });

  test("no package.json → fallback to path basename", () => {
    const root = mkTmpProject("nopkg");
    const expected = path.basename(root)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);
    expect(deriveProjectSlug(root)).toBe(expected);
  });

  test("malformed package.json → fallback to basename", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-slug-malformed-`));
    tmpDirs.push(root);
    fs.writeFileSync(path.join(root, "package.json"), "{not-json}", "utf8");
    const expected = path.basename(root)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);
    expect(deriveProjectSlug(root)).toBe(expected);
  });

  test("package.json without name field → fallback to basename", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-slug-noname-`));
    tmpDirs.push(root);
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ version: "1.0.0" }), "utf8");
    expect(deriveProjectSlug(root).length).toBeGreaterThan(0);
    expect(deriveProjectSlug(root)).not.toBe("unknown");
  });

  test("name with weird chars → sanitized to alphanumeric + dashes", () => {
    const root = mkTmpProject("weird", "Weird Name!@#$ Mixed 2026");
    expect(deriveProjectSlug(root)).toBe("weird-name-mixed-2026");
  });

  test("very long name → capped at 32 chars", () => {
    const root = mkTmpProject("long", "a".repeat(50));
    expect(deriveProjectSlug(root).length).toBeLessThanOrEqual(32);
  });

  test("empty string → 'unknown' sentinel", () => {
    expect(deriveProjectSlug("")).toBe("unknown");
  });

  test("non-string → 'unknown' sentinel", () => {
    expect(deriveProjectSlug(undefined as unknown as string)).toBe("unknown");
    expect(deriveProjectSlug(null as unknown as string)).toBe("unknown");
  });

  test("name that sanitizes to empty → falls back to basename then 'unknown'", () => {
    const root = mkTmpProject("badname", "!!!---!!!");
    // Sanitization strips all → falls back to basename of tmpdir (which has chars)
    const slug = deriveProjectSlug(root);
    expect(slug.length).toBeGreaterThan(0);
  });
});

describe("composeSlugContractId", () => {
  test("standard slug + number + mode suffix", () => {
    expect(composeSlugContractId("palantirkc", 19, "quick")).toBe("palantirkc-sprint-019-quick");
  });

  test("no mode suffix → bare", () => {
    expect(composeSlugContractId("palantir-math", 18, null)).toBe("palantir-math-sprint-018");
    expect(composeSlugContractId("palantir-math", 18)).toBe("palantir-math-sprint-018");
  });

  test("default mode suffix", () => {
    expect(composeSlugContractId("mathcrew", 1, "default")).toBe("mathcrew-sprint-001-default");
  });

  test("zero-pads sprint number to 3 digits", () => {
    expect(composeSlugContractId("foo", 1, null)).toBe("foo-sprint-001");
    expect(composeSlugContractId("foo", 999, null)).toBe("foo-sprint-999");
    expect(composeSlugContractId("foo", 1000, null)).toBe("foo-sprint-1000"); // doesn't truncate
  });

  test("empty slug → 'unknown' sentinel", () => {
    expect(composeSlugContractId("", 1, "quick")).toBe("unknown-sprint-001-quick");
  });
});

describe("isSlugPrefixedContractId", () => {
  test("legacy unprefixed → false", () => {
    expect(isSlugPrefixedContractId("sprint-018")).toBe(false);
    expect(isSlugPrefixedContractId("sprint-018-quick")).toBe(false);
    expect(isSlugPrefixedContractId("sprint-001-default")).toBe(false);
  });

  test("slug-prefixed → true", () => {
    expect(isSlugPrefixedContractId("palantir-math-sprint-018")).toBe(true);
    expect(isSlugPrefixedContractId("palantirkc-sprint-019-quick")).toBe(true);
    expect(isSlugPrefixedContractId("mathcrew-sprint-001-default")).toBe(true);
  });

  test("non-conforming strings → false", () => {
    expect(isSlugPrefixedContractId("")).toBe(false);
    expect(isSlugPrefixedContractId("ctr-1")).toBe(false);
    expect(isSlugPrefixedContractId("random")).toBe(false);
    expect(isSlugPrefixedContractId("sprint-")).toBe(false);
  });
});
