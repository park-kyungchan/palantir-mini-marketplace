// palantir-mini v1.4 — AST walker tests
// Covers: lib/impact-graph/ast-walker.ts

import { test, expect, describe } from "bun:test";
import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import { walkProject } from "../../lib/impact-graph/ast-walker";

function tmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-ast-"));
}

function writeTs(dir: string, name: string, content: string): string {
  const filePath = path.join(dir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

// ── walkProject ───────────────────────────────────────────────────────────────

describe("walkProject — empty project", () => {
  test("returns zero edges and no errors for empty directory", () => {
    const dir    = tmp();
    const result = walkProject({ projectRoot: dir });
    expect(result.edges).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.fileCount).toBe(0);
  });
});

describe("walkProject — import edges", () => {
  test("detects a relative import as an import edge", () => {
    const dir = tmp();
    writeTs(dir, "a.ts", `export const X = 1;`);
    writeTs(dir, "b.ts", `import { X } from "./a";`);

    const result = walkProject({ projectRoot: dir });
    const importEdges = result.edges.filter((e) => e.edgeKind === "import");
    expect(importEdges.length).toBeGreaterThanOrEqual(1);

    const edge = importEdges.find(
      (e) => e.fromRid.includes("b.ts") && e.toRid.includes("a"),
    );
    expect(edge).toBeDefined();
    expect(edge!.confidence).toBe(1.0);
  });

  test("npm package imports get pkg: RID (no file path)", () => {
    const dir = tmp();
    writeTs(dir, "c.ts", `import { something } from "some-package";`);

    const result    = walkProject({ projectRoot: dir });
    const pkgEdges  = result.edges.filter((e) => e.toRid.startsWith("pkg:"));
    expect(pkgEdges.length).toBeGreaterThanOrEqual(1);
    expect(pkgEdges[0]!.toRid).toContain("some-package");
  });
});

describe("walkProject — export edges", () => {
  test("detects re-export from another module", () => {
    const dir = tmp();
    writeTs(dir, "orig.ts", `export const Y = 2;`);
    writeTs(dir, "barrel.ts", `export { Y } from "./orig";`);

    const result      = walkProject({ projectRoot: dir });
    const exportEdges = result.edges.filter((e) => e.edgeKind === "export");
    expect(exportEdges.length).toBeGreaterThanOrEqual(1);

    const edge = exportEdges.find(
      (e) => e.fromRid.includes("barrel") && e.toRid.includes("orig"),
    );
    expect(edge).toBeDefined();
  });

  test("plain export (no from clause) generates no export edge", () => {
    const dir = tmp();
    writeTs(dir, "d.ts", `export const Z = 3;`);

    const result      = walkProject({ projectRoot: dir });
    const exportEdges = result.edges.filter(
      (e) => e.edgeKind === "export" && e.fromRid.includes("d.ts"),
    );
    // No from-specifier → no export edge
    expect(exportEdges).toHaveLength(0);
  });
});

describe("walkProject — typeRef edges", () => {
  test("detects cross-file TypeReference with confidence 0.8", () => {
    const dir = tmp();
    writeTs(dir, "types.ts", `export interface MyInterface { x: number; }`);
    writeTs(dir, "consumer.ts", `
      import type { MyInterface } from "./types";
      const v: MyInterface = { x: 1 };
    `);

    const result       = walkProject({ projectRoot: dir });
    const typeRefEdges = result.edges.filter((e) => e.edgeKind === "typeRef");
    // typeRef edges have confidence 0.8
    for (const e of typeRefEdges) {
      expect(e.confidence).toBe(0.8);
    }
  });
});

describe("walkProject — scannedAt field", () => {
  test("all edges carry a valid ISO scannedAt timestamp", () => {
    const dir = tmp();
    writeTs(dir, "e.ts", `import { something } from "pkg";`);

    const result = walkProject({ projectRoot: dir });
    for (const edge of result.edges) {
      expect(new Date(edge.scannedAt).getTime()).not.toBeNaN();
    }
  });
});

describe("walkProject — node_modules ignored", () => {
  test("does not produce file: edges pointing into node_modules", () => {
    const dir = tmp();
    writeTs(dir, "f.ts", `import x from "node-pkg";`);

    // Simulate node_modules dir with a ts file (should be ignored)
    const nmFile = path.join(dir, "node_modules", "node-pkg", "index.ts");
    fs.mkdirSync(path.dirname(nmFile), { recursive: true });
    fs.writeFileSync(nmFile, `export default 42;`);

    const result = walkProject({ projectRoot: dir });
    const nmEdges = result.edges.filter(
      (e) => e.fromRid.includes("node_modules") || e.toRid.includes("node_modules"),
    );
    expect(nmEdges).toHaveLength(0);
  });
});

describe("walkProject — fileCount", () => {
  test("fileCount matches number of ts files found (excluding node_modules)", () => {
    const dir = tmp();
    writeTs(dir, "g.ts", `export const G = 1;`);
    writeTs(dir, "h.ts", `export const H = 2;`);
    // node_modules should not count
    const nmFile = path.join(dir, "node_modules", "x", "index.ts");
    fs.mkdirSync(path.dirname(nmFile), { recursive: true });
    fs.writeFileSync(nmFile, `export default 0;`);

    const result = walkProject({ projectRoot: dir });
    // g.ts + h.ts = 2 (node_modules excluded)
    expect(result.fileCount).toBe(2);
  });
});
