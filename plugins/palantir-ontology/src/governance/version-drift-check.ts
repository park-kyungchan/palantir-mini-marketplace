// Schema/package version-drift validator (pm-absorption validation-port Unit K1).
//
// Ports palantir-mini `lib/validation/merge.ts` Check 1 (schema lock drift,
// lines ~30-87 of that module): the only genuinely novel leaf in the pm
// validation-pipeline surface. `runPipeline` and all six phase runners in
// that module (`runDesignPhase`, `runCompilePhase`, `runMergePhase`,
// `runPostWritePhase`, `runDeployPhase`, `runRuntimePhase`) have zero
// external call sites — this port carries only the drift-check semantics
// forward, standalone, with no wiring back into any pipeline.
//
// Local failure codes: the `code` values below (`VD-MAJOR-MISMATCH`,
// `VD-LOCK-ABSENT`, `VD-INSTALLED-ABSENT`) are short identifiers scoped to
// THIS module only. They are deliberately NOT drawn from — and must never be
// registered against — the governance reason-code registry
// (`contracts/reason-code-registry.json` / `src/semantic-core/reason-codes.ts`):
// this is build-only enforcement (ADR-006 scoping), not a governed-path
// denial surface. This module has zero import sites outside its own test and
// is never wired into `commit-gate.ts` or any script.
//
// DTC citation: de-2026-07-24-s19-kinetic-adr006-scope-of-record.

import * as fs from "fs";
import * as path from "path";

export type VersionDriftSeverity = "error" | "warning";

export interface VersionDriftFailure {
  readonly code: "VD-MAJOR-MISMATCH" | "VD-LOCK-ABSENT" | "VD-INSTALLED-ABSENT";
  readonly severity: VersionDriftSeverity;
  readonly detail: string;
}

export interface VersionDriftInput {
  readonly lockedVersion: string | null;
  readonly installedVersion: string | null;
}

export interface VersionDriftResult {
  readonly ok: boolean;
  readonly failures: readonly VersionDriftFailure[];
}

/** Strips everything but digits and dots, then returns the first dot-segment (mirrors pm's semantics). */
function extractMajor(version: string): string {
  return version.replace(/[^0-9.]/g, "").split(".")[0] ?? "";
}

/**
 * Total-evaluation core: never throws, always returns every applicable
 * failure. A missing locked or installed version is an advisory
 * (`severity: "warning"`) entry that does NOT flip `ok` to `false`; only a
 * genuine major-version mismatch does.
 */
export function evaluateVersionDrift(input: VersionDriftInput): VersionDriftResult {
  const { lockedVersion, installedVersion } = input;
  const failures: VersionDriftFailure[] = [];

  if (lockedVersion === null) {
    failures.push({
      code: "VD-LOCK-ABSENT",
      severity: "warning",
      detail: "no schema lock version found; skipping drift check",
    });
  } else if (installedVersion === null) {
    failures.push({
      code: "VD-INSTALLED-ABSENT",
      severity: "warning",
      detail: "no installed schema version found; skipping drift check",
    });
  } else {
    const lockMajor = extractMajor(lockedVersion);
    const installedMajor = extractMajor(installedVersion);
    if (lockMajor.length > 0 && installedMajor.length > 0 && lockMajor !== installedMajor) {
      failures.push({
        code: "VD-MAJOR-MISMATCH",
        severity: "error",
        detail: `schema lock major (${lockMajor}) != installed major (${installedMajor}) — run migration first`,
      });
    }
  }

  const ok = !failures.some((f) => f.severity === "error");
  return { ok, failures };
}

/**
 * Reads the locked schema version: `schemas.lock` JSON `{version}` first,
 * falling back to `package.json` `peerDependencies[packageName]`. Malformed
 * JSON at either path yields `null`, never a throw.
 */
export function readLockedVersion(projectRoot: string, packageName: string): string | null {
  const lockPath = path.join(projectRoot, "schemas.lock");
  if (fs.existsSync(lockPath)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, "utf8")) as { version?: string };
      if (lock.version) return lock.version;
    } catch {
      // fall through to package.json
    }
  }

  const pkgPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { peerDependencies?: Record<string, string> };
      return pkg.peerDependencies?.[packageName] ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Reads the installed version from the first candidate `package.json` path
 * whose JSON parses and has a `version` field. Malformed JSON at a candidate
 * is skipped (never thrown), moving on to the next candidate.
 */
export function readInstalledVersion(candidatePackageJsonPaths: readonly string[]): string | null {
  for (const p of candidatePackageJsonPaths) {
    if (!fs.existsSync(p)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(p, "utf8")) as { version?: string };
      if (pkg.version) return pkg.version;
    } catch {
      continue;
    }
  }
  return null;
}
