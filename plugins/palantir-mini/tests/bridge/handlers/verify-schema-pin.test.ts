// palantir-mini v3.7.0 — verify_schema_pin handler tests (C.C.1)
// Coverage: parseSemver + semverSatisfies pure helpers, missing pin, compatible
// pin, incompatible pin, recommendedPin fallback, package.json detection.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import verifySchemaPin from "../../../bridge/handlers/verify-schema-pin";
import {
  parseSemver,
  semverSatisfies,
  resolveInstalledSchemaVersion,
  resolvePluginCompatibleRange,
} from "../../../bridge/handlers/verify-schema-pin";

const tmpDirs: string[] = [];

function makeTmpProject(pkg: Record<string, unknown> | null): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-verify-pin-"));
  tmpDirs.push(project);
  if (pkg !== null) {
    fs.writeFileSync(path.join(project, "package.json"), JSON.stringify(pkg, null, 2));
  }
  return project;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("parseSemver", () => {
  test("parses bare X.Y.Z", () => {
    expect(parseSemver("1.17.2")).toEqual([1, 17, 2]);
  });

  test("strips ^ and ~ prefixes", () => {
    expect(parseSemver("^1.17.0")).toEqual([1, 17, 0]);
    expect(parseSemver("~2.3.4")).toEqual([2, 3, 4]);
  });

  test("strips >= prefix + whitespace", () => {
    expect(parseSemver(">= 1.15.0")).toEqual([1, 15, 0]);
  });

  test("missing parts default to 0", () => {
    expect(parseSemver("3")).toEqual([3, 0, 0]);
    expect(parseSemver("4.2")).toEqual([4, 2, 0]);
  });
});

describe("semverSatisfies", () => {
  test("bare pin matches bare range exactly", () => {
    expect(semverSatisfies("1.17.0", "1.17.0")).toBe(true);
    expect(semverSatisfies("1.17.0", "1.17.1")).toBe(false);
  });

  test("caret pin within caret range", () => {
    expect(semverSatisfies("^1.17.0", "^1.15.0")).toBe(true);
    expect(semverSatisfies("^1.10.0", "^1.15.0")).toBe(false);
  });

  test("tilde pin requires same minor", () => {
    expect(semverSatisfies("~1.17.0", "~1.17.0")).toBe(true);
    expect(semverSatisfies("~1.17.0", "~1.18.0")).toBe(false);
  });

  test("compound range >=X <Y", () => {
    expect(semverSatisfies("^1.17.0", ">=1.15.0 <2.0.0")).toBe(true);
    expect(semverSatisfies("^2.0.0", ">=1.15.0 <2.0.0")).toBe(false);
    expect(semverSatisfies("^1.10.0", ">=1.15.0 <2.0.0")).toBe(false);
  });
});

describe("resolveInstalledSchemaVersion + resolvePluginCompatibleRange", () => {
  test("installed version resolves to a non-empty string", () => {
    const v = resolveInstalledSchemaVersion();
    expect(typeof v).toBe("string");
    expect(v.length).toBeGreaterThan(0);
    expect(v).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("plugin compat range resolves to a non-empty string", () => {
    const r = resolvePluginCompatibleRange();
    expect(typeof r).toBe("string");
    expect(r.length).toBeGreaterThan(0);
  });
});

describe("verifySchemaPin handler", () => {
  test("validation — missing project throws", async () => {
    await expect(verifySchemaPin({})).rejects.toThrow(/project.*required/);
  });

  test("missing pin returns incompatible + recommendedPin", async () => {
    const project = makeTmpProject(null);
    const result = await verifySchemaPin({
      project,
      pluginCompatibleSchemaRange: ">=1.15.0 <2.0.0",
    });
    expect(result.compatible).toBe(false);
    expect(result.pinnedSchema).toBe("not-found");
    expect(result.recommendedPin).toBe(">=1.15.0 <2.0.0");
    expect(result.reason).toContain("No @palantirKC/claude-schemas pin");
  });

  test("compatible pin returns compatible: true", async () => {
    const project = makeTmpProject({
      name: "consumer",
      peerDependencies: { "@palantirKC/claude-schemas": "^1.17.0" },
    });
    const result = await verifySchemaPin({
      project,
      pluginCompatibleSchemaRange: ">=1.15.0 <2.0.0",
    });
    expect(result.compatible).toBe(true);
    expect(result.pinnedSchema).toBe("^1.17.0");
    expect(result.reason).toContain("satisfies");
  });

  test("incompatible pin returns compatible: false + recommendedPin", async () => {
    const project = makeTmpProject({
      name: "consumer",
      peerDependencies: { "@palantirKC/claude-schemas": "^1.10.0" },
    });
    const result = await verifySchemaPin({
      project,
      pluginCompatibleSchemaRange: ">=1.15.0 <2.0.0",
    });
    expect(result.compatible).toBe(false);
    expect(result.pinnedSchema).toBe("^1.10.0");
    expect(result.recommendedPin).toBe(">=1.15.0 <2.0.0");
    expect(result.reason).toContain("does not satisfy");
  });

  test("falls back to dependencies if no peerDependencies", async () => {
    const project = makeTmpProject({
      name: "consumer",
      dependencies: { "@palantirKC/claude-schemas": "^1.17.0" },
    });
    const result = await verifySchemaPin({
      project,
      pluginCompatibleSchemaRange: ">=1.15.0 <2.0.0",
    });
    expect(result.pinnedSchema).toBe("^1.17.0");
    expect(result.compatible).toBe(true);
  });

  test("malformed package.json treated as missing pin", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-verify-pin-malformed-"));
    tmpDirs.push(project);
    fs.writeFileSync(path.join(project, "package.json"), "{not-json}");
    const result = await verifySchemaPin({ project, pluginCompatibleSchemaRange: ">=1.15.0 <2.0.0" });
    expect(result.pinnedSchema).toBe("not-found");
    expect(result.compatible).toBe(false);
  });

  // sprint-055 W1.B — workspace-root awareness
  test("workspace-root (workspaces array) returns compatible: true", async () => {
    const project = makeTmpProject({
      name: "monorepo-root",
      workspaces: ["projects/*", "packages/*"],
    });
    const result = await verifySchemaPin({
      project,
      pluginCompatibleSchemaRange: ">=1.15.0 <2.0.0",
    });
    expect(result.compatible).toBe(true);
    expect(result.pinnedSchema).toBe("workspace-root");
    expect(result.reason).toContain("workspace-root");
  });

  test("workspace-root (workspaces.packages object) returns compatible: true", async () => {
    const project = makeTmpProject({
      name: "monorepo-root",
      workspaces: { packages: ["projects/*"] },
    });
    const result = await verifySchemaPin({
      project,
      pluginCompatibleSchemaRange: ">=1.15.0 <2.0.0",
    });
    expect(result.compatible).toBe(true);
    expect(result.pinnedSchema).toBe("workspace-root");
  });

  test("workspace-root with explicit peerDep prefers peerDep (not workspace-root)", async () => {
    const project = makeTmpProject({
      name: "monorepo-root",
      workspaces: ["projects/*"],
      peerDependencies: { "@palantirKC/claude-schemas": "^1.17.0" },
    });
    const result = await verifySchemaPin({
      project,
      pluginCompatibleSchemaRange: ">=1.15.0 <2.0.0",
    });
    expect(result.pinnedSchema).toBe("^1.17.0");
    expect(result.compatible).toBe(true);
  });
});
