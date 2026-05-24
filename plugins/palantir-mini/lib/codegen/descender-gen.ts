/**
 * palantir-mini v3.7.0 — Descender regeneration entry point (orchestrator)
 * @owner palantirkc-plugin-codegen
 * @purpose Reads the plugin-contained schema snapshot + writes <project>/src/generated/.
 */
// palantir-mini v3.7.0 — Descender regeneration entry point
// Domain: ACTION (prim-action-05 CodegenRun)
// Decomposed in v3.7.0 A.2: types + helpers extracted to ./descender-gen/*.

import * as fs from "fs";
import * as path from "path";
import { wrapGeneratedFile } from "./osdk-template";
import { checkSplit, defaultPolicy } from "./client-generated-split";
import {
  defaultSchemaRoot,
  listSchemaFiles,
  emitCodegenEvent,
} from "./descender-gen/helpers";
import type { CodegenOptions, CodegenResult } from "./descender-gen/types";

// Backward-compat re-exports
export type { CodegenOptions, CodegenResult } from "./descender-gen/types";

/**
 * Run a full codegen pass against the target project.
 */
export async function runCodegen(opts: CodegenOptions): Promise<CodegenResult> {
  const t0 = Date.now();
  const schemaRoot = opts.schemaRoot ?? defaultSchemaRoot();
  const project    = opts.projectRoot;
  const errors: string[] = [];
  const generatedFiles: string[] = [];

  let startedSeq: number | undefined;
  try {
    startedSeq = await emitCodegenEvent(project, "codegen_started", {
      targetProject: project,
      ontologyVersion: "0.1.0",
    });
  } catch (e) {
    errors.push(`failed to emit codegen_started: ${(e as Error).message}`);
    return { targetProject: project, generatedFiles, durationMs: Date.now() - t0, errors };
  }

  const schemaFiles = listSchemaFiles(schemaRoot);
  if (schemaFiles.length === 0) {
    errors.push(`no schema files under ${schemaRoot}`);
  }

  const generatedRoot = path.join(project, "src", "generated");
  if (!opts.dryRun) {
    try {
      fs.mkdirSync(generatedRoot, { recursive: true });
    } catch (e) {
      errors.push(`cannot create generatedRoot ${generatedRoot}: ${(e as Error).message}`);
    }
  }

  const indexContent = wrapGeneratedFile([
    `// Generated ontology index — v0 minimum viable artifact`,
    `// Enumerates schema sources so consumers can validate availability at startup.`,
    ``,
    `export const SCHEMA_SOURCES = ${JSON.stringify(
      schemaFiles.map((f) => path.relative(schemaRoot, f)),
      null,
      2
    )} as const;`,
    ``,
    `export const ONTOLOGY_VERSION = "0.1.0";`,
    `export const SCHEMA_ROOT = ${JSON.stringify(schemaRoot)};`,
    `export const GENERATED_AT = ${JSON.stringify(new Date().toISOString())};`,
  ]);

  const indexPath = path.join(generatedRoot, "ontology-index.ts");
  const policy = defaultPolicy(project);
  const splitCheck = checkSplit(policy, indexPath, indexContent);
  if (!splitCheck.passed) {
    errors.push(...splitCheck.violations);
  } else if (!opts.dryRun) {
    try {
      fs.writeFileSync(indexPath, indexContent, "utf8");
      generatedFiles.push(indexPath);
    } catch (e) {
      errors.push(`write failed for ${indexPath}: ${(e as Error).message}`);
    }
  } else {
    generatedFiles.push(`(dry-run) ${indexPath}`);
  }

  const durationMs = Date.now() - t0;

  let completedSeq: number | undefined;
  try {
    completedSeq = await emitCodegenEvent(project, "codegen_completed", {
      targetProject: project,
      generatedFiles,
      durationMs,
    });
  } catch (e) {
    errors.push(`failed to emit codegen_completed: ${(e as Error).message}`);
  }

  return {
    targetProject: project,
    generatedFiles,
    durationMs,
    startedSequence: startedSeq,
    completedSequence: completedSeq,
    errors,
  };
}

// ─── CLI entry point ───────────────────────────────────────────────────────
if (import.meta.main) {
  const project = process.argv[2];
  if (!project) {
    console.error("usage: bun run descender-gen.ts <project-root>");
    process.exit(1);
  }
  runCodegen({ projectRoot: path.resolve(project) })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (result.errors.length > 0) process.exit(2);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
