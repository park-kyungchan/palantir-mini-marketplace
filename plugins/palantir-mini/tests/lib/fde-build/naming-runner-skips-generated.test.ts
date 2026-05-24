/**
 * palantir-mini sprint-138 Slice 2.B — naming-runner deny-list tests
 *
 * Verifies that runNamingAudit:
 *   1. Scans allowed files (lib/**) and finds terms there.
 *   2. Does NOT scan generated/** or node_modules/** files.
 *   3. DENY_GLOBS constants include the required entries.
 */
import { describe, test, expect, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  runNamingAudit,
  NAMING_AUDIT_DENY_GLOBS,
  NAMING_AUDIT_ALLOW_GLOBS,
} from "../../../lib/fde-build/naming-audit-runner";

// =============================================================================
// Tmp fixture helpers
// =============================================================================

let tmpDir: string | null = null;

function createTmpFixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-naming-runner-test-"));
  return dir;
}

function writeTmpFile(dir: string, relPath: string, content: string): void {
  const absPath = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, "utf-8");
}

afterEach(() => {
  if (tmpDir) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  }
});

// =============================================================================
// DENY_GLOBS constant assertions
// =============================================================================

describe("NAMING_AUDIT_DENY_GLOBS", () => {
  test("includes **/src/generated/**", () => {
    expect(NAMING_AUDIT_DENY_GLOBS).toContain("**/src/generated/**");
  });

  test("includes **/node_modules/**", () => {
    expect(NAMING_AUDIT_DENY_GLOBS).toContain("**/node_modules/**");
  });

  test("includes **/.git/**", () => {
    expect(NAMING_AUDIT_DENY_GLOBS).toContain("**/.git/**");
  });

  test("includes **/dist/**", () => {
    expect(NAMING_AUDIT_DENY_GLOBS).toContain("**/dist/**");
  });

  test("includes **/build/**", () => {
    expect(NAMING_AUDIT_DENY_GLOBS).toContain("**/build/**");
  });

  test("has at least 5 entries", () => {
    expect(NAMING_AUDIT_DENY_GLOBS.length).toBeGreaterThanOrEqual(5);
  });
});

// =============================================================================
// ALLOW_GLOBS constant assertions
// =============================================================================

describe("NAMING_AUDIT_ALLOW_GLOBS", () => {
  test("includes **/*.md", () => {
    expect(NAMING_AUDIT_ALLOW_GLOBS).toContain("**/*.md");
  });

  test("includes lib/**/*.ts", () => {
    expect(NAMING_AUDIT_ALLOW_GLOBS).toContain("lib/**/*.ts");
  });
});

// =============================================================================
// Fixture scan: generated/** skipped, lib/** scanned
// =============================================================================

describe("runNamingAudit deny-list enforcement", () => {
  test("scans lib/ but NOT src/generated/", async () => {
    tmpDir = createTmpFixture();

    // This file should be DENIED (src/generated/ path)
    writeTmpFile(
      tmpDir,
      "src/generated/foo.ts",
      `// generated
// AIP Agent Studio is here
const x = "AIP Agent Studio";
`,
    );

    // This file should be ALLOWED (lib/ path)
    writeTmpFile(
      tmpDir,
      "lib/baz.ts",
      `// lib file
// AIP Agent Studio mention here
export const NAME = "AIP Agent Studio";
`,
    );

    const report = await runNamingAudit({
      projectRoot: tmpDir,
      maxFindings: 50,
      nowIso: "2026-05-14T00:00:00.000Z",
    });

    // Should have at least one finding from lib/baz.ts
    const libFindings = report.findings.filter((f) =>
      f.location.startsWith("lib/"),
    );
    expect(libFindings.length).toBeGreaterThan(0);

    // Should have ZERO findings from src/generated/
    const generatedFindings = report.findings.filter((f) =>
      f.location.includes("generated"),
    );
    expect(generatedFindings.length).toBe(0);
  });

  test("does not scan node_modules/", async () => {
    tmpDir = createTmpFixture();

    // node_modules file — should be DENIED
    writeTmpFile(
      tmpDir,
      "node_modules/some-pkg/index.js",
      `// AIP Agent Studio in node_modules`,
    );

    // lib file — should be ALLOWED
    writeTmpFile(
      tmpDir,
      "lib/index.ts",
      `// no matching terms here`,
    );

    const report = await runNamingAudit({
      projectRoot: tmpDir,
      maxFindings: 50,
      nowIso: "2026-05-14T00:00:00.000Z",
    });

    const nodeModulesFindings = report.findings.filter((f) =>
      f.location.includes("node_modules"),
    );
    expect(nodeModulesFindings.length).toBe(0);
  });

  test("report.readOnly is true", async () => {
    tmpDir = createTmpFixture();
    writeTmpFile(tmpDir, "README.md", "# Hello");

    const report = await runNamingAudit({
      projectRoot: tmpDir,
      maxFindings: 10,
    });
    expect(report.readOnly).toBe(true);
  });

  test("report.compatibilityIdentifiersPreserved is true", async () => {
    tmpDir = createTmpFixture();
    writeTmpFile(tmpDir, "lib/a.ts", "// nothing");

    const report = await runNamingAudit({
      projectRoot: tmpDir,
      maxFindings: 10,
    });
    expect(report.compatibilityIdentifiersPreserved).toBe(true);
  });

  test("report.deniedGlobs includes **/src/generated/**", async () => {
    tmpDir = createTmpFixture();
    writeTmpFile(tmpDir, "lib/a.ts", "// nothing");

    const report = await runNamingAudit({
      projectRoot: tmpDir,
      maxFindings: 10,
    });
    expect(report.deniedGlobs).toContain("**/src/generated/**");
    expect(report.deniedGlobs).toContain("**/node_modules/**");
  });

  test("maxFindings cap limits report.findings length", async () => {
    tmpDir = createTmpFixture();

    // Write many lines each with a known term
    const manyLines = Array.from({ length: 30 }, (_, i) => `// AIP Agent Studio line ${i}`).join("\n");
    writeTmpFile(tmpDir, "lib/many.ts", manyLines);

    const report = await runNamingAudit({
      projectRoot: tmpDir,
      maxFindings: 5,
      nowIso: "2026-05-14T00:00:00.000Z",
    });

    expect(report.findings.length).toBeLessThanOrEqual(5);
    expect(report.maxFindings).toBe(5);
  });

  test("termCounts has 11 entries (one per baseline term)", async () => {
    tmpDir = createTmpFixture();
    writeTmpFile(tmpDir, "lib/a.ts", "// empty");

    const report = await runNamingAudit({
      projectRoot: tmpDir,
      maxFindings: 100,
    });
    expect(report.termCounts.length).toBe(11);
  });
});
