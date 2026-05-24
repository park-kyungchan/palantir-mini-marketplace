// palantir-mini v3.4.0 — research_library_prune sibling: collect (read-only fs walk + citation index)
// Pure functions — no fs mutations, no event emit.

import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import type { PruneCandidate, PruneReason } from "./types";

/** Resolve the research library root — caller override or ~/.claude/research/palantir-vision */
export function resolveLibraryRoot(override?: string): string {
  if (override && override.trim().length > 0) return path.resolve(override.trim());
  return path.join(os.homedir(), ".claude", "research", "palantir-vision");
}

/**
 * Recursively collect all .md files under a directory, excluding:
 *   - filenames starting with _ (e.g. _manifest.json, _changelog.md)
 *   - BROWSE.md, INDEX.md, README.md (structural/index docs)
 *   - files inside the archive directory
 */
export function collectMdFiles(dir: string, archiveDir: string): string[] {
  const EXCLUDED_NAMES = new Set(["BROWSE.md", "INDEX.md", "README.md"]);
  const results: string[] = [];

  function walk(current: string): void {
    if (path.resolve(current) === path.resolve(archiveDir)) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && !entry.name.startsWith("_")) {
          walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        if (entry.name.startsWith("_")) continue;
        if (EXCLUDED_NAMES.has(entry.name)) continue;
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

/** Return file mtime in milliseconds, or 0 on error. */
export function fileMtimeMs(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Build a citation index: for each .md file, collect all paths/filenames that
 * it mentions in its content. A file is "cited" if its relative path or its
 * basename appears in any other doc's text.
 */
export function buildCitationIndex(allFiles: string[]): Set<string> {
  const cited = new Set<string>();

  for (const filePath of allFiles) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const fileRefRe = /[\w.\-/]+(?:\.md)?/g;
    const matches = content.match(fileRefRe) ?? [];

    for (const match of matches) {
      const trimmed = match.trim();
      if (!trimmed || trimmed.length < 3) continue;
      cited.add(trimmed);
      const base = path.basename(trimmed, ".md");
      if (base.length >= 3) cited.add(base);
    }
  }

  return cited;
}

/** Return true when `filePath` is cited by at least one other doc. */
export function isCited(filePath: string, libraryRoot: string, citationIndex: Set<string>): boolean {
  const rel = path.relative(libraryRoot, filePath);
  const base = path.basename(filePath, ".md");

  if (citationIndex.has(rel)) return true;
  if (citationIndex.has(rel.replace(/\.md$/, ""))) return true;
  if (citationIndex.has(base)) return true;
  if (citationIndex.has(path.basename(filePath))) return true;

  return false;
}

/**
 * Evaluate a single file against staleness + citation rules. Returns a
 * PruneCandidate when at least one reason fires; null otherwise.
 */
export function evaluateCandidate(
  filePath: string,
  libraryRoot: string,
  archiveDir: string,
  staleThresholdMs: number,
  citationIndex: Set<string>,
  nowMs: number,
): PruneCandidate | null {
  const reasons: PruneReason[] = [];
  const mtimeMs = fileMtimeMs(filePath);
  const ageMs = nowMs - mtimeMs;
  const ageInDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const mtimeISO = mtimeMs > 0 ? new Date(mtimeMs).toISOString() : "unknown";

  if (ageMs > staleThresholdMs) reasons.push("stale-by-age");

  const base = path.basename(filePath, ".md");
  const isCommonWord = base.length <= 4;
  if (!isCommonWord && !isCited(filePath, libraryRoot, citationIndex)) {
    reasons.push("no-citation");
  }

  if (reasons.length === 0) return null;

  const relativePath = path.relative(libraryRoot, filePath);
  const archivePath = path.join(archiveDir, relativePath);

  return {
    path: filePath,
    relativePath,
    mtimeISO,
    ageInDays,
    reasons,
    archivePath,
    moved: false,
  };
}
