/**
 * Single WRITER that propagates one version value to the canonical field and
 * every target field across the 4 marketplace manifests.
 *
 *   bun run ci/sync-marketplace-version.ts            (drift-cleanup: read CANONICAL, propagate)
 *   bun run ci/sync-marketplace-version.ts 7.35.0     (set: write X.Y.Z everywhere)
 *
 * Properties:
 *   - FORMAT-PRESERVING: edits only the version value tokens; indentation,
 *     unicode escapes, key ordering, and trailing newline are byte-identical.
 *   - IDEMPOTENT: re-running on an already-synced repo writes nothing.
 *   - TESTABLE: syncVersion() takes a root param so a fixture root can be used
 *     without ever touching the real repo files.
 *
 * Single writer: no other module mutates these files.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_VERSION_FIELDS,
  CANONICAL,
  DEFAULT_REPOSITORY_ROOT,
  findStringValueSpan,
  getAtPath,
  isValidVersion,
} from "./marketplace-version-fields";

export interface FieldChange {
  file: string;
  jsonPath: string;
  from: string;
  to: string;
}

export interface SyncResult {
  version: string;
  changes: FieldChange[];
}

/** Read the canonical version string from CANONICAL's file. Throws if absent. */
export function readCanonicalVersion(repositoryRoot: string = DEFAULT_REPOSITORY_ROOT): string {
  const canonicalFile = join(repositoryRoot, CANONICAL.file);
  const parsed = JSON.parse(readFileSync(canonicalFile, "utf8"));
  const value = getAtPath(parsed, CANONICAL.jsonPath);
  if (typeof value !== "string") {
    throw new Error(`canonical version missing: ${CANONICAL.file}[${CANONICAL.jsonPath}]`);
  }
  return value;
}

/**
 * Propagate `version` (or the current canonical version when undefined) into
 * the canonical field + every target field. Format-preserving + idempotent.
 * Returns the resolved version and the list of fields actually changed.
 */
export function syncVersion(
  version: string | undefined,
  repositoryRoot: string = DEFAULT_REPOSITORY_ROOT,
): SyncResult {
  const target = version ?? readCanonicalVersion(repositoryRoot);
  if (!isValidVersion(target)) {
    throw new Error(`invalid version "${target}": expected X.Y.Z`);
  }

  const changes: FieldChange[] = [];

  // Group fields by file so each file is read/written at most once.
  const byFile = new Map<string, typeof ALL_VERSION_FIELDS[number][]>();
  for (const ref of ALL_VERSION_FIELDS) {
    const list = byFile.get(ref.file) ?? [];
    list.push(ref);
    byFile.set(ref.file, list);
  }

  for (const [file, refs] of byFile) {
    const absolute = join(repositoryRoot, file);
    const original = readFileSync(absolute, "utf8");
    let text = original;
    const fileChanges: FieldChange[] = [];

    // Re-resolve spans against the live text after each edit so offsets stay
    // valid even when the value length changes (e.g. 7.9.0 -> 7.10.0).
    for (const ref of refs) {
      const span = findStringValueSpan(text, ref.jsonPath);
      if (span === null) {
        throw new Error(`could not locate string value: ${file}[${ref.jsonPath}]`);
      }
      if (span.value === target) continue; // idempotent: no-op when already equal
      text = text.slice(0, span.start) + target + text.slice(span.end);
      fileChanges.push({ file, jsonPath: ref.jsonPath, from: span.value, to: target });
    }

    if (fileChanges.length > 0 && text !== original) {
      writeFileSync(absolute, text);
      changes.push(...fileChanges);
    }
  }

  return { version: target, changes };
}

function main(): void {
  const arg = process.argv[2];
  if (arg !== undefined && !isValidVersion(arg)) {
    console.error(`[sync-marketplace-version] invalid version "${arg}": expected X.Y.Z`);
    process.exit(2);
  }

  let result: SyncResult;
  try {
    result = syncVersion(arg);
  } catch (err) {
    console.error(`[sync-marketplace-version] ${(err as Error).message}`);
    process.exit(1);
    return;
  }

  const mode = arg !== undefined ? `set ${result.version}` : `propagate canonical ${result.version}`;
  if (result.changes.length === 0) {
    console.log(`[sync-marketplace-version] ${mode}: already in sync, no changes`);
    return;
  }
  console.log(`[sync-marketplace-version] ${mode}: updated ${result.changes.length} field(s)`);
  for (const c of result.changes) {
    console.log(`  ${c.file}[${c.jsonPath}] ${c.from} -> ${c.to}`);
  }
}

if (import.meta.main) main();
