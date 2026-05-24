// palantir-mini v3.5.0 — research_library_diff sibling: read-only fs helpers
// Pure read-only — no fs mutations, no events, no HTTP.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { ChangelogEntry } from "./types";

/** Resolve the research library root — caller override or ~/.claude/research */
export function resolveLibraryRoot(override?: string): string {
  if (override && override.trim().length > 0) return override.trim();
  return path.join(os.homedir(), ".claude", "research");
}

/** Recursively count .md files in a directory. */
export function countMdFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        count += countMdFiles(path.join(dir, entry.name));
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        count++;
      }
    }
  } catch {
    // Permission or read error — return what we have
  }
  return count;
}

/**
 * Parse _changelog.md lines into ChangelogEntry[].
 * Handles lines like:
 *   - 2026-04-20: added 5 files on foundry architecture
 *   - ## 2026-04-15 — bulk fetch
 *   - * 2026-04-10 some description
 * Returns [] for empty or non-parseable files.
 */
export function parseChangelogEntries(changelogPath: string): ChangelogEntry[] {
  if (!fs.existsSync(changelogPath)) return [];
  let content: string;
  try {
    content = fs.readFileSync(changelogPath, "utf8");
  } catch {
    return [];
  }

  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("//"));

  return lines.map((raw): ChangelogEntry => {
    // Try to extract a leading ISO date (YYYY-MM-DD)
    const dateMatch = raw.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) {
      return { raw, date: null, description: raw };
    }
    const date = dateMatch[1] as string;
    const rest = raw
      .slice(raw.indexOf(date) + date.length)
      .replace(/^[\s:—-]+/, "")
      .trim();
    return { raw, date, description: rest };
  });
}

/** List first-level subdirectories of a directory. */
export function listSectionDirs(libraryRoot: string): string[] {
  if (!fs.existsSync(libraryRoot)) return [];
  try {
    return fs
      .readdirSync(libraryRoot, { withFileTypes: true })
      .filter(
        (e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_"),
      )
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}
