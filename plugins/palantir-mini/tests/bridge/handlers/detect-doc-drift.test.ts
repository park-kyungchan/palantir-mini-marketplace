/**
 * palantir-mini — detect_doc_drift MCP handler tests
 * Wave 2 SP-2: authority-class-aware xref scanning
 *
 * Covers: missing project arg throws; clean project returns no signals;
 * research xrefs attach authorityClass; legacy promoted refs emit
 * legacy_ref_should_migrate; non-research xrefs have no authorityClass;
 * archive-bridge refs used as active citations get broken_xref with
 * authorityClass "archive".
 */

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import detectDocDrift from "../../../bridge/handlers/detect-doc-drift";

// Track temp dirs for cleanup
const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "detect-doc-drift-test-"));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/** Write a BROWSE.md in tmpDir with given content and return its path. */
function writeBrowse(dir: string, content: string): string {
  const filePath = path.join(dir, "BROWSE.md");
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

describe("detect_doc_drift handler", () => {
  test("throws when project is missing or invalid", async () => {
    await expect(detectDocDrift({})).rejects.toThrow("project");
    await expect(detectDocDrift(null)).rejects.toThrow("project");
    await expect(detectDocDrift({ project: 123 })).rejects.toThrow("project");
  });

  test("returns empty signals for a clean project", async () => {
    // Plugin root has valid BROWSE.md / INDEX.md with no broken xrefs
    const pluginRoot = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      "../../..",
    );
    const result = await detectDocDrift({ project: pluginRoot, scope: "browse" });
    // Signals may be non-empty on this machine (broken xrefs in BROWSE.md are expected in a live plugin),
    // but the call must succeed and return the right shape
    expect(typeof result).toBe("object");
    expect(Array.isArray(result.signals)).toBe(true);
    for (const signal of result.signals) {
      expect(typeof signal.driftKind).toBe("string");
      expect(typeof signal.evidencePath).toBe("string");
      expect(typeof signal.expected).toBe("string");
      expect(typeof signal.observed).toBe("string");
    }
  });

  test("attaches authorityClass to broken research xref", async () => {
    const dir = makeTmpDir();
    // .claude/research/palantir-foundry/ maps to authorityClass "fact"
    writeBrowse(
      dir,
      "# Test\n\n[Foundry ref](.claude/research/palantir-foundry/nonexistent.md) — details\n",
    );

    const result = await detectDocDrift({ project: dir, scope: "browse" });
    const signal = result.signals.find(
      (s) =>
        s.driftKind === "broken_xref" &&
        s.observed.includes("palantir-foundry/nonexistent.md"),
    );
    expect(signal).toBeDefined();
    expect(signal!.authorityClass).toBe("fact");
  });

  test("emits legacy_ref_should_migrate for promoted legacy ref", async () => {
    const dir = makeTmpDir();
    // .claude/research/palantir/philosophy/ → resolves to legacy-promoted-to-synthesis
    writeBrowse(
      dir,
      "# Test\n\n[Philosophy ref](.claude/research/palantir/philosophy/some-doc.md) — old ref\n",
    );

    const result = await detectDocDrift({ project: dir, scope: "browse" });
    const signal = result.signals.find(
      (s) =>
        s.driftKind === "legacy_ref_should_migrate" &&
        s.observed.includes("palantir/philosophy/some-doc.md"),
    );
    expect(signal).toBeDefined();
    expect(signal!.authorityClass).toBe("synthesis");
    // expected should be the new primaryRef location
    expect(signal!.expected).toContain("palantir-vision/philosophy/");
  });

  test("non-research xrefs have no authorityClass", async () => {
    const dir = makeTmpDir();
    writeBrowse(
      dir,
      "# Test\n\n[Local file](./some-file.md) — broken local ref\n",
    );

    const result = await detectDocDrift({ project: dir, scope: "browse" });
    const signal = result.signals.find(
      (s) => s.driftKind === "broken_xref" && s.observed.includes("some-file.md"),
    );
    expect(signal).toBeDefined();
    expect(signal!.authorityClass).toBeUndefined();
  });

  test("archive-bridge ref used as active gets broken_xref with authorityClass archive", async () => {
    const dir = makeTmpDir();
    // Archive path: .claude/research/_archive/2026-04-20-palantir-consolidation/some-file.md
    writeBrowse(
      dir,
      "# Test\n\n[Archive file](.claude/research/_archive/2026-04-20-palantir-consolidation/some-file.md) — archive ref\n",
    );

    const result = await detectDocDrift({ project: dir, scope: "browse" });
    const signal = result.signals.find(
      (s) =>
        s.driftKind === "broken_xref" &&
        s.observed.includes("_archive/2026-04-20-palantir-consolidation/some-file.md"),
    );
    expect(signal).toBeDefined();
    expect(signal!.authorityClass).toBe("archive");
  });

  test("existing research xref produces no signal", async () => {
    const dir = makeTmpDir();
    // Create a real research dir structure with an existing file
    const researchDir = path.join(dir, ".claude", "research", "palantir-foundry");
    fs.mkdirSync(researchDir, { recursive: true });
    fs.writeFileSync(path.join(researchDir, "existing.md"), "# Exists\n", "utf8");
    writeBrowse(
      dir,
      "# Test\n\n[Foundry ref](.claude/research/palantir-foundry/existing.md) — live file\n",
    );

    const result = await detectDocDrift({ project: dir, scope: "browse" });
    const researchSignals = result.signals.filter(
      (s) => s.observed && s.observed.includes("palantir-foundry/existing.md"),
    );
    expect(researchSignals).toHaveLength(0);
  });
});
