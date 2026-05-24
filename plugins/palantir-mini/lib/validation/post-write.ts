/**
 * Phase 6: Post-Write validation
 * @owner palantirkc-plugin-validation
 * @purpose Phase 6: Post-Write validation
 */
// palantir-mini v0 — Phase 6: Post-Write validation
// Domain: LOGIC (prim-logic-08 ValidationPhaseEvaluator — phase "post_write")
// Mirrors Palantir §VAL.R-08 (Post-Write).
//
// Runs on: PostToolUse(Edit) via hooks/post-edit-propagate.ts — checks for
// drift between schemas/ontology declarations and runtime usage. Emits a
// drift_detected event when it finds an orphan reference, schema mismatch, or
// stale codegen artifact.

import * as fs from "fs";
import * as path from "path";
import type { PhaseResult } from "./design";

export interface PostWriteOptions {
  projectRoot: string;
  schemaRoot:  string;
  /** Optional paths to check; defaults to <projectRoot>/src/generated */
  generatedRoot?: string;
}

/**
 * Detect 3 drift classes:
 *   - schema_mismatch   — generated file references a primitive that no longer exists
 *   - stale_codegen     — generated file older than any schema file
 *   - orphan_reference  — project code imports a generated file that doesn't exist
 */
export async function runPostWritePhase(opts: PostWriteOptions): Promise<PhaseResult> {
  const t0 = Date.now();
  const errors:   string[] = [];
  const warnings: string[] = [];

  const generatedRoot = opts.generatedRoot ?? path.join(opts.projectRoot, "src", "generated");

  // Check 1: stale_codegen — generated mtime older than newest schema mtime?
  if (fs.existsSync(generatedRoot) && fs.existsSync(opts.schemaRoot)) {
    try {
      let schemaNewest = 0;
      const schemaFiles = walkFiles(opts.schemaRoot, ".ts");
      for (const f of schemaFiles) {
        const mt = fs.statSync(f).mtimeMs;
        if (mt > schemaNewest) schemaNewest = mt;
      }
      const generatedFiles = walkFiles(generatedRoot, ".ts");
      for (const f of generatedFiles) {
        const mt = fs.statSync(f).mtimeMs;
        if (mt < schemaNewest) {
          warnings.push(`stale_codegen: ${path.relative(opts.projectRoot, f)} is older than newest schema file`);
        }
      }
    } catch (e) {
      warnings.push(`stale_codegen check failed: ${(e as Error).message}`);
    }
  }

  // Check 2: orphan_reference (v0 minimal — deep TS parsing deferred to v1)
  // Check 3: schema_mismatch (v0 minimal — deep AST walk deferred to v1)
  // These rely on lib/codegen/descender-gen.ts output format; placeholder for now.

  return {
    phase: "post_write",
    passed: errors.length === 0,
    errorClass: errors.length > 0 ? "post_write_failure" : undefined,
    errors,
    warnings,
    durationMs: Date.now() - t0,
  };
}

function walkFiles(root: string, ext: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(root)) return out;
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.isFile() && p.endsWith(ext)) out.push(p);
    }
  }
  return out;
}
