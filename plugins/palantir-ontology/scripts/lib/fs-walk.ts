// Shared recursive file-walk helper for P340's checkers/generators. Not a
// generated file itself (no mandatory header) — this is hand-authored
// library code the checkers import.

import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Recursively lists files under `dir` whose name passes `filter`, returning
 * paths relative to `baseDir` (defaults to `dir`), sorted for deterministic
 * output. Symlinks are never followed (cycle/escape safety, matching the
 * legacy plugin's `verify-real-home-untouched.ts` precedent).
 */
export function walkFiles(
  dir: string,
  filter: (name: string) => boolean = () => true,
  baseDir: string = dir,
): string[] {
  const out: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      out.push(...walkFiles(fullPath, filter, baseDir));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!filter(entry.name)) continue;
    out.push(relative(baseDir, fullPath));
  }
  return out.sort();
}

export interface FileStat {
  readonly size: number;
  readonly mtimeMs: number;
}

/** Full recursive snapshot of {size, mtimeMs} per file, keyed by path relative to `dir`. */
export function snapshotDir(dir: string): { exists: boolean; files: Readonly<Record<string, FileStat>> } {
  let entries;
  try {
    entries = statSync(dir);
  } catch {
    return { exists: false, files: {} };
  }
  if (!entries.isDirectory()) return { exists: false, files: {} };
  const files: Record<string, FileStat> = {};
  for (const relPath of walkFiles(dir)) {
    const st = statSync(join(dir, relPath));
    files[relPath] = { size: st.size, mtimeMs: st.mtimeMs };
  }
  return { exists: true, files };
}

export function diffSnapshots(
  before: { exists: boolean; files: Readonly<Record<string, FileStat>> },
  after: { exists: boolean; files: Readonly<Record<string, FileStat>> },
  label: string,
): string[] {
  const diffs: string[] = [];
  if (!before.exists && after.exists) {
    diffs.push(`${label} was CREATED during the run`);
    return diffs;
  }
  if (!before.exists) return diffs;

  const beforePaths = new Set(Object.keys(before.files));
  const afterPaths = new Set(Object.keys(after.files));

  for (const relPath of afterPaths) {
    if (!beforePaths.has(relPath)) diffs.push(`${label}: new file appeared: ${relPath}`);
  }
  for (const relPath of beforePaths) {
    if (!afterPaths.has(relPath)) diffs.push(`${label}: file disappeared: ${relPath}`);
  }
  for (const relPath of beforePaths) {
    if (!afterPaths.has(relPath)) continue;
    const b = before.files[relPath]!;
    const a = after.files[relPath]!;
    if (b.size !== a.size || b.mtimeMs !== a.mtimeMs) {
      diffs.push(`${label}: file changed: ${relPath} (size ${b.size}->${a.size}, mtime ${b.mtimeMs}->${a.mtimeMs})`);
    }
  }
  return diffs;
}
