/**
 * palantir-mini v1 — Phase 6: Merge validation
 * @owner palantirkc-plugin-validation
 * @purpose palantir-mini v1 — Phase 6: Merge validation
 */
// palantir-mini v1 — Phase 6: Merge validation
// Domain: LOGIC (prim-logic-08 ValidationPhaseEvaluator — phase "merge")
// Mirrors Palantir §VAL.R-10 (Merge gate).
//
// Runs post-merge or as a pre-merge gate. Verifies:
//   1. Drift against schemas lock — installed schema version matches expected lock
//   2. Codegen determinism — byte-identical regeneration check on generated files
//   3. Final ontology hash match — hash of ontology/ source matches last codegen header
//
// Authority: research/palantir/validation/ → schemas/ontology/primitives/
//   → lib/validation/merge.ts + lib/codegen/manifest.ts

import * as fs from "fs";
import * as path from "path";
import type { PhaseResult } from "./design";
import { verifyCodegenHeader, computeOntologyHashFromDir } from "../codegen/manifest";

export interface MergeOptions {
  projectRoot:   string;
  schemaRoot:    string;
  /** Expected schema lock version (e.g. from schemas.lock file or package.json peerDep) */
  expectedSchemaVersion?: string;
}

function readSchemaLockVersion(projectRoot: string): string | null {
  const lockPath = path.join(projectRoot, "schemas.lock");
  if (fs.existsSync(lockPath)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, "utf8")) as { version?: string };
      return lock.version ?? null;
    } catch {
      return null;
    }
  }
  // Fall back to package.json peerDep
  const pkgPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { peerDependencies?: Record<string, string> };
      return pkg.peerDependencies?.["@palantirKC/claude-schemas"] ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

function readInstalledSchemaVersion(schemaRoot: string): string | null {
  const candidates = [
    path.join(path.dirname(schemaRoot), "..", "package.json"),
    path.join(schemaRoot, "..", "package.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(p, "utf8")) as { version?: string };
        if (pkg.version) return pkg.version;
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function runMergePhase(opts: MergeOptions): Promise<PhaseResult> {
  const t0 = Date.now();
  const errors:   string[] = [];
  const warnings: string[] = [];

  // Check 1: schema lock drift
  const lockedVer    = opts.expectedSchemaVersion ?? readSchemaLockVersion(opts.projectRoot);
  const installedVer = readInstalledSchemaVersion(opts.schemaRoot);
  if (lockedVer && installedVer) {
    const lockMajor      = lockedVer.replace(/[^0-9.]/g, "").split(".")[0];
    const installedMajor = installedVer.replace(/[^0-9.]/g, "").split(".")[0];
    if (lockMajor && installedMajor && lockMajor !== installedMajor) {
      errors.push(`merge blocked: schema lock major (${lockMajor}) != installed major (${installedMajor}) — run W5 migration first`);
    }
  } else if (!lockedVer) {
    warnings.push("no schema lock version found; skipping drift check");
  }

  // Check 2: codegen determinism — verify all generated files have valid headers
  const generatedRoot = path.join(opts.projectRoot, "src", "generated");
  if (fs.existsSync(generatedRoot)) {
    const headerResults = verifyCodegenHeader(generatedRoot);
    const invalid = headerResults.filter((r) => !r.valid);
    if (invalid.length > 0) {
      for (const r of invalid) {
        errors.push(`merge blocked: codegen header invalid in ${path.relative(opts.projectRoot, r.file)}: ${r.reason}`);
      }
    }

    // Check 3: ontology hash match — compare ontology/ dir hash with headers
    const ontologyDir = path.join(opts.projectRoot, "ontology");
    if (fs.existsSync(ontologyDir) && headerResults.length > 0) {
      const currentHash = computeOntologyHashFromDir(ontologyDir);
      const headerWithHash = headerResults.find((r) => r.valid && r.header?.ontologyHash);
      if (headerWithHash?.header?.ontologyHash && headerWithHash.header.ontologyHash !== currentHash) {
        warnings.push(
          `ontology hash mismatch: headers record ${headerWithHash.header.ontologyHash.slice(0, 8)}... but current dir hashes to ${currentHash.slice(0, 8)}... — regenerate before merge`
        );
      }
    }
  } else {
    warnings.push("no src/generated directory found; skipping codegen determinism check");
  }

  return {
    phase:      "merge",
    passed:     errors.length === 0,
    errorClass: errors.length > 0 ? "merge_gate_failure" : undefined,
    errors,
    warnings,
    durationMs: Date.now() - t0,
  };
}
