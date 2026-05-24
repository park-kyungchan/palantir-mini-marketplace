/**
 * _seed-manifest.ts
 * One-shot seeder: walks palantir-foundry/ research docs, parses YAML frontmatter,
 * and writes _manifest.json with one entry per doc file.
 *
 * Usage: bun /home/palantirkc/.claude/research/palantir-foundry/_seed-manifest.ts
 *
 * GENERATED: do not edit _manifest.json by hand — re-run this script.
 */

import { readdir, readFile, writeFile } from "fs/promises";
import { join, relative, basename } from "path";

const ROOT = "/home/palantirkc/.claude/research/palantir-foundry";
const OUTPUT = join(ROOT, "_manifest.json");

/** Files to skip — meta-routing docs, not content docs */
const SKIP_NAMES = new Set(["BROWSE.md", "INDEX.md", "_seed-manifest.ts"]);

interface ManifestEntry {
  /** Path relative to ROOT */
  path: string;
  /** Filename (basename) */
  filename: string;
  /** Subdirectory (subdir name, empty string if at root) */
  subdir: string;
  /** Frontmatter: source URL */
  source: string;
  /** Frontmatter: fetched date */
  fetched: string;
  /** Frontmatter: section slug */
  section: string;
  /** Frontmatter: doc_title from H1 */
  doc_title: string;
}

/**
 * Minimal YAML frontmatter parser.
 * Handles `key: value` lines within `---` delimiters.
 * Returns null if no frontmatter found.
 */
function parseFrontmatter(
  content: string
): Record<string, string> | null {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") return null;

  const fields: Record<string, string> = {};
  let i = 1;
  while (i < lines.length) {
    const line = lines[i];
    if (line?.trim() === "---") break;
    // Match "key: value" — value may contain colons (URLs)
    const match = line?.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (match) {
      const key = match[1]!.trim();
      // Strip inline YAML comments from value (# after whitespace)
      const rawVal = match[2]!.trim();
      fields[key] = rawVal;
    }
    i++;
  }
  return fields;
}

/** Recursively collect all .md files under dir, excluding SKIP_NAMES */
async function collectDocs(dir: string): Promise<string[]> {
  const paths: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip hidden dirs and non-doc dirs
      if (!entry.name.startsWith("_") && !entry.name.startsWith(".")) {
        const nested = await collectDocs(fullPath);
        paths.push(...nested);
      }
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      !SKIP_NAMES.has(entry.name)
    ) {
      paths.push(fullPath);
    }
  }

  return paths;
}

async function main(): Promise<void> {
  console.log(`[seed-manifest] Scanning ${ROOT} ...`);

  const docPaths = await collectDocs(ROOT);
  console.log(`[seed-manifest] Found ${docPaths.length} doc files`);

  const entries: ManifestEntry[] = [];
  const errors: string[] = [];

  for (const absPath of docPaths) {
    const relPath = relative(ROOT, absPath);
    const fname = basename(absPath);
    // Subdir = first path segment if nested, empty if at root
    const parts = relPath.split("/");
    const subdir = parts.length > 1 ? parts[0]! : "";

    let content: string;
    try {
      content = await readFile(absPath, "utf-8");
    } catch (err) {
      errors.push(`READ_ERROR: ${relPath} — ${String(err)}`);
      continue;
    }

    const fm = parseFrontmatter(content);

    if (!fm) {
      // No frontmatter — record with empty fields, don't skip
      errors.push(`NO_FRONTMATTER: ${relPath}`);
      entries.push({
        path: relPath,
        filename: fname,
        subdir,
        source: "",
        fetched: "",
        section: "",
        doc_title: "",
      });
      continue;
    }

    entries.push({
      path: relPath,
      filename: fname,
      subdir,
      source: fm["source"] ?? "",
      fetched: fm["fetched"] ?? "",
      section: fm["section"] ?? "",
      doc_title: fm["doc_title"] ?? "",
    });
  }

  // Sort deterministically: by subdir then filename
  entries.sort((a, b) => {
    if (a.subdir !== b.subdir) return a.subdir.localeCompare(b.subdir);
    return a.filename.localeCompare(b.filename);
  });

  const manifest = {
    generated: new Date().toISOString(),
    generator: "_seed-manifest.ts",
    root: ROOT,
    total: entries.length,
    errors: errors.length > 0 ? errors : undefined,
    entries,
  };

  await writeFile(OUTPUT, JSON.stringify(manifest, null, 2) + "\n", "utf-8");

  console.log(`[seed-manifest] Written ${entries.length} entries → ${OUTPUT}`);
  if (errors.length > 0) {
    console.warn(`[seed-manifest] ${errors.length} warnings:`);
    for (const e of errors) console.warn(`  ${e}`);
  }
  console.log("[seed-manifest] Done.");
}

main().catch((err) => {
  console.error("[seed-manifest] FATAL:", err);
  process.exit(1);
});
