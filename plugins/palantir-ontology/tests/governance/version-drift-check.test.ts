// pm-absorption validation-port Unit K1: schema/package version-drift validator unit tests.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  evaluateVersionDrift,
  readInstalledVersion,
  readLockedVersion,
} from "../../src/governance/version-drift-check";

describe("evaluateVersionDrift", () => {
  test("major mismatch fails with VD-MAJOR-MISMATCH", () => {
    const result = evaluateVersionDrift({ lockedVersion: "2.0.0", installedVersion: "1.4.0" });
    expect(result.ok).toBe(false);
    expect(result.failures).toEqual([
      { code: "VD-MAJOR-MISMATCH", severity: "error", detail: expect.any(String) },
    ]);
  });

  test("matching majors pass with zero failures", () => {
    const result = evaluateVersionDrift({ lockedVersion: "1.2.0", installedVersion: "1.9.3" });
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });

  test("caret-range lock vs plain installed version: matching majors pass", () => {
    const result = evaluateVersionDrift({ lockedVersion: "^0.14.0", installedVersion: "0.15.2" });
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });

  test("lock absent yields ok:true with one VD-LOCK-ABSENT warning", () => {
    const result = evaluateVersionDrift({ lockedVersion: null, installedVersion: "1.0.0" });
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([
      { code: "VD-LOCK-ABSENT", severity: "warning", detail: expect.any(String) },
    ]);
  });

  test("installed absent (lock present) yields ok:true with one VD-INSTALLED-ABSENT warning", () => {
    const result = evaluateVersionDrift({ lockedVersion: "1.0.0", installedVersion: null });
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([
      { code: "VD-INSTALLED-ABSENT", severity: "warning", detail: expect.any(String) },
    ]);
  });

  test("both absent yields ok:true with only VD-LOCK-ABSENT (lock check takes precedence)", () => {
    const result = evaluateVersionDrift({ lockedVersion: null, installedVersion: null });
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([
      { code: "VD-LOCK-ABSENT", severity: "warning", detail: expect.any(String) },
    ]);
  });

  test("empty extractable major on either side skips the comparison (no fabricated failure)", () => {
    const result = evaluateVersionDrift({ lockedVersion: "latest", installedVersion: "1.0.0" });
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });
});

describe("readLockedVersion", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "version-drift-check-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("reads version from schemas.lock JSON", () => {
    fs.writeFileSync(path.join(dir, "schemas.lock"), JSON.stringify({ version: "2.3.1" }));
    expect(readLockedVersion(dir, "@palantirKC/claude-schemas")).toBe("2.3.1");
  });

  test("falls back to package.json peerDependencies when schemas.lock is absent", () => {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ peerDependencies: { "@palantirKC/claude-schemas": "^1.5.0" } }),
    );
    expect(readLockedVersion(dir, "@palantirKC/claude-schemas")).toBe("^1.5.0");
  });

  test("malformed schemas.lock JSON returns null, then falls to peerDep if present", () => {
    fs.writeFileSync(path.join(dir, "schemas.lock"), "{ not valid json");
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ peerDependencies: { "@palantirKC/claude-schemas": "^3.0.0" } }),
    );
    expect(readLockedVersion(dir, "@palantirKC/claude-schemas")).toBe("^3.0.0");
  });

  test("malformed schemas.lock JSON and no package.json returns null", () => {
    fs.writeFileSync(path.join(dir, "schemas.lock"), "{ not valid json");
    expect(readLockedVersion(dir, "@palantirKC/claude-schemas")).toBeNull();
  });

  test("neither schemas.lock nor package.json present returns null", () => {
    expect(readLockedVersion(dir, "@palantirKC/claude-schemas")).toBeNull();
  });

  test("package name is parameterized: a different peerDependency key resolves correctly", () => {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ peerDependencies: { "@some-org/other-schemas": "4.0.0" } }),
    );
    expect(readLockedVersion(dir, "@some-org/other-schemas")).toBe("4.0.0");
  });
});

describe("readInstalledVersion", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "version-drift-check-installed-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("picks the first candidate with a version, skipping missing/malformed/versionless ones", () => {
    const missing = path.join(dir, "missing", "package.json");
    const malformed = path.join(dir, "malformed", "package.json");
    const versionless = path.join(dir, "versionless", "package.json");
    const valid = path.join(dir, "valid", "package.json");

    fs.mkdirSync(path.dirname(malformed), { recursive: true });
    fs.writeFileSync(malformed, "{ not valid json");
    fs.mkdirSync(path.dirname(versionless), { recursive: true });
    fs.writeFileSync(versionless, JSON.stringify({ name: "no-version-here" }));
    fs.mkdirSync(path.dirname(valid), { recursive: true });
    fs.writeFileSync(valid, JSON.stringify({ version: "5.1.0" }));

    expect(readInstalledVersion([missing, malformed, versionless, valid])).toBe("5.1.0");
  });

  test("returns null when no candidate has a version", () => {
    const versionless = path.join(dir, "package.json");
    fs.writeFileSync(versionless, JSON.stringify({ name: "no-version-here" }));
    expect(readInstalledVersion([versionless])).toBeNull();
  });

  test("returns null for an empty candidate list", () => {
    expect(readInstalledVersion([])).toBeNull();
  });
});
