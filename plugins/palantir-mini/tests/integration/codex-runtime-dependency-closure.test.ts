import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");
const ROOT_WORKSPACE_NODE_MODULES = "/home/palantirkc/node_modules";

function resolvedFilePath(specifier: string): string {
  const resolved = import.meta.resolve(specifier);
  expect(resolved.startsWith("file://")).toBe(true);
  return fileURLToPath(resolved);
}

function expectInsidePlugin(filePath: string): void {
  const relative = path.relative(PLUGIN_ROOT, filePath);
  expect(relative.startsWith(".."), `${filePath} should resolve inside plugin root`).toBe(false);
  expect(path.isAbsolute(relative), `${filePath} should resolve inside plugin root`).toBe(false);
}

function expectNotRootWorkspaceNodeModules(filePath: string): void {
  const relative = path.relative(ROOT_WORKSPACE_NODE_MODULES, filePath);
  expect(
    relative.startsWith("..") || path.isAbsolute(relative),
    `${filePath} must not resolve through ${ROOT_WORKSPACE_NODE_MODULES}`,
  ).toBe(true);
}

function expectDependencyClosed(specifier: string, packageDir: string): void {
  const filePath = resolvedFilePath(specifier);
  expectInsidePlugin(filePath);
  expectNotRootWorkspaceNodeModules(filePath);
  expect(filePath).toContain(`${path.sep}node_modules${path.sep}${packageDir}${path.sep}`);
}

function expectPluginFile(specifier: string, expectedRelativePath: string): void {
  const filePath = resolvedFilePath(specifier);
  expectInsidePlugin(filePath);
  expectNotRootWorkspaceNodeModules(filePath);
  const relativePath = path.relative(PLUGIN_ROOT, filePath);
  const backedByTsFile = relativePath.endsWith(".ts") ? relativePath : `${relativePath}.ts`;
  expect(backedByTsFile).toBe(expectedRelativePath);
  expect(fs.existsSync(path.join(PLUGIN_ROOT, backedByTsFile))).toBe(true);
}

describe("Codex runtime dependency closure", () => {
  test("runtime imports resolve from the plugin payload, not the root workspace", async () => {
    expectDependencyClosed("typescript", "typescript");
    expectDependencyClosed("ts-morph", "ts-morph");

    expectPluginFile(
      "#schemas/ontology/primitives/project-ontology-index",
      path.join("runtime-overlay", "schemas-snapshot", "ontology", "primitives", "project-ontology-index.ts"),
    );
    expectPluginFile(
      "#schemas/ontology/primitives/document-corpus",
      path.join("runtime-overlay", "schemas-snapshot", "ontology", "primitives", "document-corpus.ts"),
    );
    expectPluginFile(
      "../../bridge/handlers/impact-query",
      path.join("bridge", "handlers", "impact-query.ts"),
    );
    expectPluginFile(
      "../../bridge/handlers/ontology-context-query",
      path.join("bridge", "handlers", "ontology-context-query.ts"),
    );
    expectPluginFile(
      "../../bridge/handlers/pm-health-audit",
      path.join("bridge", "handlers", "pm-health-audit.ts"),
    );

    const typescript = await import("typescript");
    const tsMorph = await import("ts-morph");
    const projectOntologyIndex = await import("#schemas/ontology/primitives/project-ontology-index");
    const documentCorpus = await import("#schemas/ontology/primitives/document-corpus");
    const impactQuery = await import("../../bridge/handlers/impact-query");
    const ontologyContextQuery = await import("../../bridge/handlers/ontology-context-query");
    const pmHealthAudit = await import("../../bridge/handlers/pm-health-audit");

    expect(typeof typescript.version).toBe("string");
    expect(typeof tsMorph.Project).toBe("function");
    expect(projectOntologyIndex.PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION).toBe(
      "palantir-mini/project-ontology-index/v1",
    );
    expect(documentCorpus.DOCUMENT_CORPUS_SCHEMA_VERSION).toBe("palantir-mini/document-corpus/v1");
    expect(typeof impactQuery.default).toBe("function");
    expect(typeof ontologyContextQuery.default).toBe("function");
    expect(typeof pmHealthAudit.default).toBe("function");
  });
});
