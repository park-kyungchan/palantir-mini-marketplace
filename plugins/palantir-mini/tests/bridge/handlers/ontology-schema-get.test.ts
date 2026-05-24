// palantir-mini v3.7.0 — ontology_schema_get handler tests (C.D.5)
// Coverage: validation, found by exact name, found by camelCase normalization,
// not found, custom schemaRoot.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import ontologySchemaGet from "../../../bridge/handlers/ontology-schema-get";

const tmpDirs: string[] = [];

function makeTmpSchemas(primitives: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-ontology-schema-"));
  tmpDirs.push(root);
  const dir = path.join(root, "ontology", "primitives");
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, source] of Object.entries(primitives)) {
    fs.writeFileSync(path.join(dir, name), source);
  }
  return root;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("ontologySchemaGet", () => {
  test("validation — missing primitiveRid throws", async () => {
    await expect(ontologySchemaGet({})).rejects.toThrow(/primitiveRid.*required/);
  });

  test("validation — non-string primitiveRid throws", async () => {
    await expect(ontologySchemaGet({ primitiveRid: 42 })).rejects.toThrow(
      /primitiveRid.*required/,
    );
  });

  test("found by exact kebab-case file name", async () => {
    const schemaRoot = makeTmpSchemas({
      "capability-token.ts": "// stub primitive\nexport const x = 1;\n",
    });
    const result = await ontologySchemaGet({ primitiveRid: "capability-token", schemaRoot });
    expect(result.found).toBe(true);
    expect(result.filePath).toContain("capability-token.ts");
    expect(result.source).toContain("stub primitive");
  });

  test("found by CamelCase normalization to kebab-case", async () => {
    const schemaRoot = makeTmpSchemas({
      "capability-token.ts": "// stub\n",
    });
    const result = await ontologySchemaGet({ primitiveRid: "CapabilityToken", schemaRoot });
    expect(result.found).toBe(true);
    expect(result.filePath).toContain("capability-token.ts");
  });

  test("not found returns found: false + no source", async () => {
    const schemaRoot = makeTmpSchemas({});
    const result = await ontologySchemaGet({ primitiveRid: "no-such-prim", schemaRoot });
    expect(result.found).toBe(false);
    expect(result.source).toBeUndefined();
    expect(result.filePath).toBeUndefined();
  });

  test("preserves primitiveRid arg in result", async () => {
    const schemaRoot = makeTmpSchemas({});
    const result = await ontologySchemaGet({ primitiveRid: "some-rid", schemaRoot });
    expect(result.primitiveRid).toBe("some-rid");
  });

  test("returns generatedAt as ISO8601 timestamp", async () => {
    const schemaRoot = makeTmpSchemas({});
    const result = await ontologySchemaGet({ primitiveRid: "x", schemaRoot });
    expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
