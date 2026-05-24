// palantir-mini v3.8.0 — verify_codegen_headers handler tests (C.C.2 + R5-F12)
// Coverage: validation, default glob walks src/generated/, missing-fields detection,
// custom globs, no-violations clean.
// v3.8.0 (sprint-059 W2.2 R5-F12): anchored regex tests — malformed/duplicate header,
//   missing @generated anchor, palantir-math + mathcrew multi-line header formats.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import verifyCodegenHeaders from "../../../bridge/handlers/verify-codegen-headers";

const tmpDirs: string[] = [];

// Single-line header format (matches DEFAULT_CONTRACT.pattern directly with 'm' flag)
const VALID_HEADER =
  '// @generated {schemaVersion: "1.28.0", ontologyHash: "abc123", generatorVersion: "v0.1.0", timestamp: "2026-04-26T00:00:00Z"}';

// Multi-line header format as used by mathcrew (ontology-runtime-bridge.generated.ts)
const VALID_HEADER_MATHCREW = [
  "// @generated {",
  "//   schema: v1.0.0",
  "//   ontology-hash: 825455bc2ec4b6192c5d0e87c9ca82d7f5fce",
  "//   generator: pm-codegen@mathcrew-ontology-runtime-bridge-1.0.0",
  `//   schemaVersion: v1.0.0`,
  `//   ontologyHash: 825455bc2ec4b6192c5d0e87c9ca82d7f5fce`,
  `//   generatorVersion: pm-codegen@mathcrew-ontology-runtime-bridge-1.0.0`,
  `//   timestamp: 2026-05-05T07:55:22.000Z`,
  "// }",
].join("\n");

// Multi-line header format as used by palantir-math (ontology-registry.generated.ts):
// @generated block + fields repeated on separate comment lines after closing }
const VALID_HEADER_PALANTIR_MATH = [
  "// @generated {",
  "//   schema: 1.35.0",
  "//   ontology-hash: sha256:5125d338fdd7bf67849ef57dfba3773437a738a",
  "//   generator: frontend-registry@1.0.0",
  "//   timestamp: 2026-05-03T12:59:38.500Z",
  "// }",
  "// schemaVersion: 1.35.0",
  "// ontologyHash: sha256:5125d338fdd7bf67849ef57dfba3773437a738a",
  "// generatorVersion: 1.0.0",
  "// timestamp: 2026-05-03T12:59:38.500Z",
].join("\n");

function makeTmpProject(files: Record<string, string>): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-verify-headers-"));
  tmpDirs.push(project);
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(project, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return project;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("verifyCodegenHeaders", () => {
  test("validation — missing project throws", async () => {
    await expect(verifyCodegenHeaders({})).rejects.toThrow(/project.*required/);
  });

  test("validation — non-string project throws", async () => {
    await expect(verifyCodegenHeaders({ project: 42 })).rejects.toThrow(/project.*required/);
  });

  test("project with no generated/ dir returns empty violations", async () => {
    const project = makeTmpProject({
      "src/code.ts": "export const x = 1;\n",
    });
    const result = await verifyCodegenHeaders({ project });
    expect(result.violations).toEqual([]);
  });

  test("generated file with valid header returns no violations", async () => {
    const project = makeTmpProject({
      "src/generated/types.ts": `${VALID_HEADER}\nexport type X = 1;\n`,
    });
    const result = await verifyCodegenHeaders({ project });
    expect(result.violations).toEqual([]);
  });

  test("generated file missing header reports all required fields missing", async () => {
    const project = makeTmpProject({
      "src/generated/types.ts": "export type X = 1;\n",
    });
    const result = await verifyCodegenHeaders({ project });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.file).toContain("generated/types.ts");
    const missing = result.violations[0]?.missingFields ?? [];
    expect(missing).toContain("schemaVersion");
    expect(missing).toContain("ontologyHash");
    expect(missing).toContain("generatorVersion");
    expect(missing).toContain("timestamp");
  });

  test("generated file with partial header reports missing fields only", async () => {
    const project = makeTmpProject({
      "src/generated/partial.ts":
        '// @generated {schemaVersion: "1.28.0"}\nexport type X = 1;\n',
    });
    const result = await verifyCodegenHeaders({ project });
    expect(result.violations).toHaveLength(1);
    const missing = result.violations[0]?.missingFields ?? [];
    expect(missing).not.toContain("schemaVersion");
    expect(missing).toContain("ontologyHash");
  });

  test("custom globs target alternate paths", async () => {
    const project = makeTmpProject({
      "out/codegen/x.ts": "export const x = 1;\n",
      "src/generated/y.ts": `${VALID_HEADER}\nexport const y = 1;\n`,
    });
    const result = await verifyCodegenHeaders({
      project,
      globs: ["**/out/codegen/**/*.ts"],
    });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.file).toContain("out/codegen/x.ts");
  });

  test("ignores .ts files outside generated/", async () => {
    const project = makeTmpProject({
      "src/regular.ts": "export const x = 1;\n",
      "src/generated/sub/g.ts": `${VALID_HEADER}\nexport const y = 1;\n`,
    });
    const result = await verifyCodegenHeaders({ project });
    expect(result.violations).toEqual([]);
  });

  test("walks nested generated directories", async () => {
    const project = makeTmpProject({
      "src/generated/a/b/c/deep.ts": "export type X = 1;\n",
    });
    const result = await verifyCodegenHeaders({ project });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.file).toContain("a/b/c/deep.ts");
  });

  // --- R5-F12: anchored regex validation tests (sprint-059 W2.2) ---

  test("R5-F12: file missing @generated anchor fails even if requiredFields appear in body", async () => {
    // This is the false-positive case body.includes() would miss:
    // requiredFields appear in the file body but NOT in a @generated header.
    const project = makeTmpProject({
      "src/generated/sneaky.ts": [
        "// This file has schemaVersion, ontologyHash, generatorVersion, timestamp",
        "// but NO @generated anchor — should be rejected.",
        "export const schemaVersion = '1.0.0';",
        "export const ontologyHash = 'abc';",
        "export const generatorVersion = 'v1';",
        "export const timestamp = '2026-01-01T00:00:00Z';",
      ].join("\n"),
    });
    const result = await verifyCodegenHeaders({ project });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.file).toContain("sneaky.ts");
    // Should report missing fields since no @generated anchor was found in header region
    expect(result.violations[0]?.missingFields.length).toBeGreaterThan(0);
  });

  test("R5-F12: duplicate header in body (fields only past line 10) fails", async () => {
    // @generated anchor is present at the top (lines 1-2) but the block is empty.
    // Required fields are duplicated in the file body past the HEADER_SCAN_LINES=10 boundary.
    // body.includes() would have passed this; anchored regex correctly rejects it.
    const anchorOnly = [
      "// @generated {",      // line 1 — anchor present
      "// }",                  // line 2 — block closes empty
      "// line 3",
      "// line 4",
      "// line 5",
      "// line 6",
      "// line 7",
      "// line 8",
      "// line 9",
      "// line 10",
      // Fields appear on lines 11+ — outside the 10-line header region
      "// schemaVersion: 1.0.0",
      "// ontologyHash: abc",
      "// generatorVersion: v1",
      "// timestamp: 2026-01-01T00:00:00Z",
      "export type X = 1;",
    ].join("\n");
    const project = makeTmpProject({
      "src/generated/duplicate.ts": anchorOnly,
    });
    const result = await verifyCodegenHeaders({ project });
    // anchor is present but requiredFields do NOT appear within first 10 lines
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.file).toContain("duplicate.ts");
    const missing = result.violations[0]?.missingFields ?? [];
    expect(missing).toContain("schemaVersion");
    expect(missing).toContain("ontologyHash");
  });

  test("R5-F12: mathcrew multi-line header format passes", async () => {
    const project = makeTmpProject({
      "src/generated/mathcrew-bridge.generated.ts": `${VALID_HEADER_MATHCREW}\nexport type X = 1;\n`,
    });
    const result = await verifyCodegenHeaders({ project });
    expect(result.violations).toEqual([]);
  });

  test("R5-F12: palantir-math multi-line header format (fields in comment lines after block) passes", async () => {
    const project = makeTmpProject({
      "src/generated/ontology-registry.generated.ts": `${VALID_HEADER_PALANTIR_MATH}\nexport type X = 1;\n`,
    });
    const result = await verifyCodegenHeaders({ project });
    expect(result.violations).toEqual([]);
  });

  test("R5-F12: requiredFields in body beyond line 10 do not satisfy validation", async () => {
    // Header anchor present but fields pushed past HEADER_SCAN_LINES
    const lines = [
      "// @generated {",
      "// }",
      "// line 3",
      "// line 4",
      "// line 5",
      "// line 6",
      "// line 7",
      "// line 8",
      "// line 9",
      "// line 10",
      // Fields appear on lines 11+ — outside header region
      "// schemaVersion: 1.0.0",
      "// ontologyHash: abc",
      "// generatorVersion: v1",
      "// timestamp: 2026-01-01T00:00:00Z",
    ];
    const project = makeTmpProject({
      "src/generated/late-fields.ts": lines.join("\n") + "\nexport type X = 1;\n",
    });
    const result = await verifyCodegenHeaders({ project });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.missingFields).toContain("schemaVersion");
  });
});
