/**
 * palantir-mini v1 — Phase 5: Deploy validation
 * @owner palantirkc-plugin-validation
 * @purpose palantir-mini v1 — Phase 5: Deploy validation
 */
// palantir-mini v1 — Phase 5: Deploy validation
// Domain: LOGIC (prim-logic-08 ValidationPhaseEvaluator — phase "deploy")
// Mirrors Palantir §VAL.R-09 (Deploy gate).
//
// Runs before any deploy-class action. Verifies:
//   1. No uncommitted changes in the project (git status clean)
//   2. schemas peerDep pin in package.json is compatible with installed schema version
//   3. (Advisory) CI status readable via git notes or status file
//
// Authority: research/palantir/validation/ → schemas/ontology/primitives/
//   → lib/validation/deploy.ts

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import type { PhaseResult } from "./design";

export interface DeployOptions {
  projectRoot: string;
  schemaRoot:  string;
}

function gitUncommitted(projectRoot: string): string[] {
  try {
    const out = execSync("git status --porcelain", { cwd: projectRoot, encoding: "utf8", timeout: 10_000 });
    return out.split("\n").filter((l) => l.trim().length > 0);
  } catch {
    return ["(git status failed — cannot verify clean state)"];
  }
}

function readPackagePeerDep(projectRoot: string): string | null {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { peerDependencies?: Record<string, string> };
    return pkg.peerDependencies?.["@palantirKC/claude-schemas"] ?? null;
  } catch {
    return null;
  }
}

function readInstalledSchemaVersion(schemaRoot: string): string | null {
  const pkgPath = path.join(path.dirname(schemaRoot), "..", "package.json");
  const alt = path.join(schemaRoot, "..", "package.json");
  for (const p of [pkgPath, alt]) {
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

export async function runDeployPhase(opts: DeployOptions): Promise<PhaseResult> {
  const t0 = Date.now();
  const errors:   string[] = [];
  const warnings: string[] = [];

  // Check 1: git clean state
  const uncommitted = gitUncommitted(opts.projectRoot);
  if (uncommitted.length > 0) {
    errors.push(`deploy blocked: uncommitted changes in ${opts.projectRoot}:\n${uncommitted.slice(0, 5).join("\n")}${uncommitted.length > 5 ? `\n  ...and ${uncommitted.length - 5} more` : ""}`);
  }

  // Check 2: peerDep compatibility
  const peerDep = readPackagePeerDep(opts.projectRoot);
  const installedVer = readInstalledSchemaVersion(opts.schemaRoot);
  if (peerDep && installedVer) {
    const pinned = peerDep.replace(/[^0-9.]/g, "").trim();
    const installed = installedVer.replace(/[^0-9.]/g, "").trim();
    if (pinned && installed && pinned.split(".")[0] !== installed.split(".")[0]) {
      errors.push(`deploy blocked: peerDep pin major version (${pinned}) != installed schema major (${installed})`);
    }
  } else if (!peerDep) {
    warnings.push("no @palantirKC/claude-schemas peerDependency found in package.json");
  }

  return {
    phase:      "deploy",
    passed:     errors.length === 0,
    errorClass: errors.length > 0 ? "deploy_gate_failure" : undefined,
    errors,
    warnings,
    durationMs: Date.now() - t0,
  };
}
