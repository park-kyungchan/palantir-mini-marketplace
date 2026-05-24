/**
 * Phase 1: Design-time validation
 * @owner palantirkc-plugin-validation
 * @purpose Phase 1: Design-time validation
 */
// palantir-mini v0 — Phase 1: Design-time validation
// Domain: LOGIC (prim-logic-08 ValidationPhaseEvaluator — phase "design")
// Mirrors Palantir §VAL.R-03 (Design Time).
//
// Runs on: SessionStart + on ontology file load.
// Checks that ontology declarations are structurally valid JSON/TS without
// requiring a full TS compile. This is the cheapest gate — it catches obvious
// schema problems before they reach compile.

import * as fs from "fs";
import * as path from "path";

export interface PhaseResult {
  phase:       "design" | "compile" | "runtime" | "post_write" | "deploy" | "merge";
  passed:      boolean;
  errorClass?: string;
  errors:      string[];
  warnings:    string[];
  durationMs:  number;
}

/**
 * Run design-time validation across the plugin's schemas directory.
 * Checks: each *.ts under schemas/ontology/{primitives,functions,policies,lineage,generators}
 *         parses without obvious structural issues.
 * v0 minimal: checks file readability + non-emptiness. Full AST parsing is compile phase.
 */
export async function runDesignPhase(schemaRoot: string): Promise<PhaseResult> {
  const t0 = Date.now();
  const errors:   string[] = [];
  const warnings: string[] = [];

  const requiredSubdirs = ["primitives", "functions", "policies", "lineage", "generators"];
  for (const sub of requiredSubdirs) {
    const dir = path.join(schemaRoot, sub);
    if (!fs.existsSync(dir)) {
      warnings.push(`schema subdirectory missing: ${sub} (not required in v0 if unused)`);
      continue;
    }
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(dir);
    } catch (e) {
      errors.push(`cannot read schema subdirectory ${sub}: ${(e as Error).message}`);
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".ts")) continue;
      const filePath = path.join(dir, entry);
      try {
        const content = fs.readFileSync(filePath, "utf8");
        if (content.trim().length === 0) {
          errors.push(`empty schema file: ${sub}/${entry}`);
          continue;
        }
        if (!/export\s+/.test(content)) {
          warnings.push(`schema file has no exports (possibly unused): ${sub}/${entry}`);
        }
      } catch (e) {
        errors.push(`cannot read schema file ${sub}/${entry}: ${(e as Error).message}`);
      }
    }
  }

  return {
    phase: "design",
    passed: errors.length === 0,
    errorClass: errors.length > 0 ? "design_time_failure" : undefined,
    errors,
    warnings,
    durationMs: Date.now() - t0,
  };
}
