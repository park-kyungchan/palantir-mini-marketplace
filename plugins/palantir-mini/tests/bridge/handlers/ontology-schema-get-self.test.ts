// palantir-mini — ontology_schema_get self/ tree resolution tests (PR-I S5, closes G10)
// Coverage: self/ ObjectType (.objecttype.ts), plain .ts, ActionType (.actiontype.ts),
// and the regression pin that primitives/ still wins over self/ for a shared RID.
// Fixtures are TMPDIR-only — never the live substrate.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import ontologySchemaGet from "../../../bridge/handlers/ontology-schema-get";

const tmpDirs: string[] = [];

function makeTmpSchemas(opts: {
  primitives?: Record<string, string>;
  self?: Record<string, string>;
}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-ontology-schema-self-"));
  tmpDirs.push(root);
  const primDir = path.join(root, "ontology", "primitives");
  const selfDir = path.join(root, "ontology", "self");
  fs.mkdirSync(primDir, { recursive: true });
  fs.mkdirSync(selfDir, { recursive: true });
  for (const [name, source] of Object.entries(opts.primitives ?? {})) {
    fs.writeFileSync(path.join(primDir, name), source);
  }
  for (const [name, source] of Object.entries(opts.self ?? {})) {
    fs.writeFileSync(path.join(selfDir, name), source);
  }
  return root;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("ontologySchemaGet — self/ tree resolution", () => {
  test("resolves a self/ ObjectType (.objecttype.ts)", async () => {
    const schemaRoot = makeTmpSchemas({
      self: { "runtime-adapter.objecttype.ts": "// runtime-adapter self ObjectType\n" },
    });
    const result = await ontologySchemaGet({ primitiveRid: "runtime-adapter", schemaRoot });
    expect(result.found).toBe(true);
    expect(result.filePath).toContain(
      path.join("ontology", "self", "runtime-adapter.objecttype.ts"),
    );
  });

  test("resolves a self/ plain module (.ts)", async () => {
    const schemaRoot = makeTmpSchemas({
      self: { "action-types.ts": "// action-types self registry\n" },
    });
    const result = await ontologySchemaGet({ primitiveRid: "action-types", schemaRoot });
    expect(result.found).toBe(true);
    expect(result.filePath?.endsWith("action-types.ts")).toBe(true);
  });

  test("resolves a self/ ActionType (.actiontype.ts) — agent ObjectType case", async () => {
    const schemaRoot = makeTmpSchemas({
      self: { "agent.objecttype.ts": "// agent self ObjectType\n" },
    });
    const result = await ontologySchemaGet({ primitiveRid: "agent", schemaRoot });
    expect(result.found).toBe(true);
    expect(result.filePath).toContain(path.join("ontology", "self", "agent.objecttype.ts"));
  });

  test("resolves a self/ ActionType via .actiontype.ts suffix", async () => {
    const schemaRoot = makeTmpSchemas({
      self: { "executor.actiontype.ts": "// executor self ActionType\n" },
    });
    const result = await ontologySchemaGet({ primitiveRid: "executor", schemaRoot });
    expect(result.found).toBe(true);
    expect(result.filePath?.endsWith("executor.actiontype.ts")).toBe(true);
  });

  test("regression — primitives/ wins over self/ for a shared RID (semantic-intent-contract)", async () => {
    const schemaRoot = makeTmpSchemas({
      primitives: { "semantic-intent-contract.ts": "// PRIMITIVE sic\n" },
      self: { "semantic-intent-contract.objecttype.ts": "// SELF sic ObjectType\n" },
    });
    const result = await ontologySchemaGet({
      primitiveRid: "semantic-intent-contract",
      schemaRoot,
    });
    expect(result.found).toBe(true);
    expect(result.filePath).toContain(path.join("ontology", "primitives"));
    expect(result.filePath).not.toContain(path.join("ontology", "self"));
    expect(result.source).toContain("PRIMITIVE sic");
  });
});
