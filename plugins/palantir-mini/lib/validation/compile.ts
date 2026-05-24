/**
 * Phase 2: Compile-time validation
 * @owner palantirkc-plugin-validation
 * @purpose Phase 2: Compile-time validation
 */
// palantir-mini v0 — Phase 2: Compile-time validation
// Domain: LOGIC (prim-logic-08 ValidationPhaseEvaluator — phase "compile")
// Mirrors Palantir §VAL.R-04 (Compile Time).
//
// Runs on: PostToolUse(Edit schemas/ontology/*) — bun tsc --noEmit against the
// plugin directory. Fast enough to gate every ontology edit.

import { spawnSync } from "child_process";
import * as path from "path";
import type { PhaseResult } from "./design";

export interface CompileOptions {
  projectRoot: string;
  tsconfigPath?: string;
  /** Timeout in ms — default 60_000 */
  timeoutMs?: number;
}

/**
 * Run `bunx tsc --noEmit` against the project root.
 * Returns a PhaseResult with any tsc diagnostics as errors.
 */
export async function runCompilePhase(opts: CompileOptions): Promise<PhaseResult> {
  const t0 = Date.now();
  const errors:   string[] = [];
  const warnings: string[] = [];

  const args = ["tsc", "--noEmit"];
  if (opts.tsconfigPath) args.push("-p", opts.tsconfigPath);

  const result = spawnSync("bunx", args, {
    cwd: opts.projectRoot,
    encoding: "utf8",
    timeout: opts.timeoutMs ?? 60_000,
  });

  if (result.error) {
    errors.push(`tsc spawn error: ${result.error.message}`);
  } else if (result.status !== 0) {
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    const lines = (stdout + "\n" + stderr).split("\n").filter((l) => l.trim().length > 0);
    for (const line of lines) {
      if (line.includes("error TS")) errors.push(line.trim());
      else if (line.toLowerCase().includes("warning")) warnings.push(line.trim());
    }
    if (errors.length === 0 && result.status !== 0) {
      errors.push(`tsc exited with status ${result.status}`);
    }
  }

  void path;

  return {
    phase: "compile",
    passed: errors.length === 0,
    errorClass: errors.length > 0 ? "compile_time_failure" : undefined,
    errors,
    warnings,
    durationMs: Date.now() - t0,
  };
}
