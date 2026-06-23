/**
 * Atomic JSON write helpers + static governed-edit write-set declaration.
 * @owner palantirkc-plugin-actions
 * @purpose Shared single audited write path for all governed edit functions.
 *
 * @Edits GOVERNED_EDIT_WRITE_SET — every governed edit function (those that
 * persist ontology / project state via the atomic writers below) declares,
 * statically, that its write targets land inside the `.palantir-mini/` project
 * subtree. `assertWriteWithinDeclaredSet` checks the ACTUAL write target is a
 * subset of that declared set on every atomic write. NON-BREAKING: a violation
 * warns (and, only when PALANTIR_MINI_WRITE_SET_STRICT=1, throws) — it never
 * crashes production.
 */
import * as fs from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import * as path from "node:path";

/**
 * Static declared write-set for the governed edit functions. Every governed edit
 * (ontology/project state write through the atomic writers below, plus the
 * ActionType-gated event append in lib/event-log/append.ts) MUST land inside the
 * project's `.palantir-mini/` ontology-state subtree. This is the one invariant
 * shared by all governed write call-sites (issue-store, prompt-front-door,
 * context-capsule, fde session-store, ontology-entry lifecycle, ontology-context
 * approvals, onboarding scaffolds, the commit/event-log write-back, ...).
 *
 * `segment` is the path segment that the write target must contain; a write whose
 * resolved path has `.palantir-mini` as a path component is within the set.
 */
export const GOVERNED_EDIT_WRITE_SET = {
  /** The single ontology-state subtree segment all governed writes share. */
  segment: ".palantir-mini",
} as const;

/** Strict mode: throw instead of warn on a declared-write-set violation. Off by default (non-breaking). */
function isStrictWriteSet(): boolean {
  return process.env.PALANTIR_MINI_WRITE_SET_STRICT === "1";
}

/**
 * True iff `filePath` resolves to a target inside the declared governed write-set
 * (i.e. has `.palantir-mini` as a path component). Pure — does not touch disk.
 * Splits on the platform separator so a directory literally named with the
 * segment is matched as a component, not as a substring of some other name.
 */
export function isWithinDeclaredWriteSet(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const segments = resolved.split(path.sep);
  return segments.includes(GOVERNED_EDIT_WRITE_SET.segment);
}

/**
 * Assert (subset check) that an actual write target is inside the declared
 * write-set. NON-BREAKING by default: an out-of-set target emits a single
 * `console.error` warning and the write proceeds. Set
 * PALANTIR_MINI_WRITE_SET_STRICT=1 (tests / CI) to make a violation throw.
 * Returns true when the target is within the set, false when it warned.
 */
export function assertWriteWithinDeclaredSet(filePath: string): boolean {
  if (isWithinDeclaredWriteSet(filePath)) return true;
  const message =
    `[palantir-mini] governed write-set violation: write target "${filePath}" is ` +
    `outside the declared GOVERNED_EDIT_WRITE_SET (must be inside a ` +
    `"${GOVERNED_EDIT_WRITE_SET.segment}/" subtree).`;
  if (isStrictWriteSet()) {
    throw new Error(message);
  }
  console.error(message);
  return false;
}

/**
 * Atomic JSON write (sync): write to `<file>.<pid>.<ts>.tmp` then rename into place.
 * Shared single audited write path (audit G7.6.1). Body verbatim from the prior
 * per-module `atomicWriteJson` sync copies (fs.mkdirSync + tmp + writeFileSync + renameSync).
 */
export function atomicWriteJsonSync(filePath: string, value: unknown): void {
  assertWriteWithinDeclaredSet(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

/**
 * Atomic JSON write (async): write to `<file>.<pid>.<ts>.tmp` then rename into place.
 * Body verbatim from lib/prompt-front-door/store.ts (fs/promises mkdir/writeFile/rename).
 */
export async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
  assertWriteWithinDeclaredSet(filePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmpPath, filePath);
}
