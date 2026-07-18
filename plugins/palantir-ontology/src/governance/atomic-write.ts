// The ONE shared atomic write utility (ledger row P430, ADR-005's five
// named legacy gap classes, docs/architecture.md — P220 section 8.1/8.2/
// 8.3/8.4). Every protected write this package ever performs funnels
// through `atomicWriteFile` below; no other file in this package may define
// its own local tmp+rename write function (P220 section 8.1's finding,
// generalized into a structural requirement: "the successor requires the
// successor to expose exactly one governed atomic-write primitive and
// forbid any local reimplementation").
//
// This module is deliberately NOT exported from `src/governance/index.ts`
// — the writer primitive itself must not be importable from any module
// path outside `src/governance/**` (ADR-005: "the writer primitive itself
// must not be exported from a public module path any other successor
// subsystem can import"). `scripts/boundary-check.ts`'s
// `resolvesIntoGovernanceWriter` check enforces this structurally, the same
// mechanism that already enforces the adapter-import boundary.
//
// Fail-closed by construction (closes P220 gaps 1/3/4 — "warn-only by
// default" and "no production code path sets the strict-mode flag"): a
// write target outside `allowedRoots` THROWS. There is no
// environment-variable escape hatch and no non-strict mode to dormantly
// leave unset — strictness is not a mode here, it is the only behavior.

import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export class WriteScopeViolationError extends Error {
  constructor(targetPath: string, allowedRoots: readonly string[]) {
    super(`atomic-write: target "${targetPath}" is outside every allowed root [${allowedRoots.join(", ")}] — write denied (fail-closed, no override)`);
    this.name = "WriteScopeViolationError";
  }
}

/** Fail-closed assertion: throws (never warns-and-proceeds) unless `targetPath` resolves under one of `allowedRoots`. */
export function assertWithinAllowedRoots(targetPath: string, allowedRoots: readonly string[]): void {
  const resolvedTarget = resolve(targetPath);
  const withinAnyRoot = allowedRoots.some((root) => {
    const resolvedRoot = resolve(root);
    return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(resolvedRoot + "/");
  });
  if (!withinAnyRoot) {
    throw new WriteScopeViolationError(resolvedTarget, allowedRoots);
  }
}

/**
 * Atomic tmp+rename write of `content` to `targetPath`. Fail-closed: throws
 * `WriteScopeViolationError` (not a console warning) if `targetPath` falls
 * outside every entry in `allowedRoots` — there is no way to bypass this by
 * setting an environment variable.
 */
export function atomicWriteFile(targetPath: string, content: string, allowedRoots: readonly string[]): void {
  assertWithinAllowedRoots(targetPath, allowedRoots);
  const resolvedTarget = resolve(targetPath);
  mkdirSync(dirname(resolvedTarget), { recursive: true });
  const tmpPath = `${resolvedTarget}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmpPath, content, "utf8");
  renameSync(tmpPath, resolvedTarget);
}
