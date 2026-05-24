#!/usr/bin/env bun
/**
 * palantir-mini — retroactive semantic frontmatter migration script
 *
 * Phase B2: One-shot migration to add @owner + @purpose JSDoc tags to
 * ontology files under schemas/ontology/{primitives,codegen}/*.ts.
 *
 * Phase B3-C: Extended with DIR_CONFIG (9 entries covering types/ + lib/*
 * subdirs), --path CLI flag for single-directory targeting, and JSDoc-insertion
 * branch for files that have only leading // comments (lib/* files).
 *
 * Usage:
 *   bun scripts/add-semantic-frontmatter.ts --dry-run            (preview all dirs)
 *   bun scripts/add-semantic-frontmatter.ts --dry-run --path schemas/ontology/types/
 *   bun scripts/add-semantic-frontmatter.ts --path schemas/ontology/types/
 *   bun scripts/add-semantic-frontmatter.ts                       (apply all dirs)
 *
 * @owner palantirkc-ontology
 * @purpose Retroactive migration to satisfy semantic-frontmatter-validate hook
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

// ---------------------------------------------------------------------------
// Path constants
// ---------------------------------------------------------------------------
const HOME = process.env.HOME ?? "/home/palantirkc";
const SCHEMAS_ROOT = join(HOME, ".claude/schemas/ontology");
const PRIMITIVES_DIR = join(SCHEMAS_ROOT, "primitives");
const CODEGEN_DIR = join(SCHEMAS_ROOT, "codegen");
const PLUGIN_LIB_ROOT = join(HOME, ".claude/plugins/palantir-mini/lib");

// ---------------------------------------------------------------------------
// DIR_CONFIG — Phase B3-C expansion: 9 new directories beyond primitives+codegen
// ---------------------------------------------------------------------------
interface DirConfig {
  /** Absolute path to directory */
  path: string;
  /** @owner slug to inject */
  ownerSlug: string;
  /**
   * When true: file has only leading slash-slash comments; prepend a synthetic
   * JSDoc block extracting purpose from the first comment line.
   * When false: file already has a JSDoc block; append tags before closing.
   */
  insertJsdoc: boolean;
}

const DIR_CONFIG: ReadonlyArray<DirConfig> = [
  // schemas/ontology/types/ — already has /** */ blocks
  {
    path: join(SCHEMAS_ROOT, "types"),
    ownerSlug: "palantirkc-ontology",
    insertJsdoc: false,
  },
  // plugins/palantir-mini/lib/* — all use leading // comments → insertion needed
  {
    path: join(PLUGIN_LIB_ROOT, "actions"),
    ownerSlug: "palantirkc-plugin-actions",
    insertJsdoc: true,
  },
  {
    path: join(PLUGIN_LIB_ROOT, "validation"),
    ownerSlug: "palantirkc-plugin-validation",
    insertJsdoc: true,
  },
  {
    path: join(PLUGIN_LIB_ROOT, "event-log"),
    ownerSlug: "palantirkc-plugin-events",
    insertJsdoc: true,
  },
  {
    path: join(PLUGIN_LIB_ROOT, "impact-graph"),
    ownerSlug: "palantirkc-plugin-learn",
    insertJsdoc: true,
  },
  {
    path: join(PLUGIN_LIB_ROOT, "config"),
    ownerSlug: "palantirkc-plugin-config",
    insertJsdoc: true,
  },
  {
    path: join(PLUGIN_LIB_ROOT, "codegen"),
    ownerSlug: "palantirkc-plugin-codegen",
    insertJsdoc: true,
  },
  {
    path: join(PLUGIN_LIB_ROOT, "rbac"),
    ownerSlug: "palantirkc-plugin-rbac",
    insertJsdoc: true,
  },
  {
    path: join(PLUGIN_LIB_ROOT, "events"),
    ownerSlug: "palantirkc-plugin-learn",
    insertJsdoc: true,
  },
];

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const DRY_RUN = process.argv.includes("--dry-run");

/**
 * --path flag: resolve against CWD, allowing partial path matching against
 * known DIR_CONFIG entries. Accepts either absolute path or trailing segment
 * (e.g. "schemas/ontology/types/").
 */
const PATH_ARG_IDX = process.argv.findIndex((a) => a === "--path");
const PATH_ARG = PATH_ARG_IDX !== -1 ? process.argv[PATH_ARG_IDX + 1] : undefined;

// ---------------------------------------------------------------------------
// Prefix normalization — strip known leading prefixes from the purpose line
// ---------------------------------------------------------------------------
const KNOWN_PREFIXES: ReadonlyArray<string> = [
  "palantir-mini \u2014 ", // em-dash variant A
  "palantir-mini \u2013 ", // en-dash variant B
  "palantir-mini - ",      // hyphen variant
  "palantir-mini v0 \u2014 ",
  "palantir-mini v0 - ",
  "palantir-mini v1.5 \u2014 ",
  "palantir-mini v1.5 - ",
  "Ontology Codegen \u2014 ",
  "Ontology Codegen - ",
  "palantirkc \u2014 ",
  "palantirkc - ",
  "@palantirKC/claude-schemas \u2014 ",
  "@palantirKC/claude-schemas - ",
  "Ontology Types \u2014 ",
  "Ontology Types - ",
];

function normalizePurpose(raw: string): string {
  let s = raw.trim();
  for (const prefix of KNOWN_PREFIXES) {
    if (s.startsWith(prefix)) {
      s = s.slice(prefix.length).trim();
      break; // only strip one prefix
    }
  }
  // Truncate to 80 chars
  if (s.length > 80) {
    s = s.slice(0, 77) + "...";
  }
  return s;
}

// ---------------------------------------------------------------------------
// Core: attempt to annotate a single file
// Returns: "annotated" | "skipped-has-tags" | "skipped-no-jsdoc"
// ---------------------------------------------------------------------------
type AnnotationResult = "annotated" | "skipped-has-tags" | "skipped-no-jsdoc";

/**
 * Append owner and purpose tags into an existing leading JSDoc block.
 * Used when insertJsdoc === false (types/ dir).
 */
function annotateExistingJsdoc(filePath: string, ownerSlug: string): AnnotationResult {
  const content = readFileSync(filePath, "utf-8");

  // Idempotency guard — already has both tags
  if (content.includes("@owner ") && content.includes("@purpose ")) {
    return "skipped-has-tags";
  }

  // Guard: must start with a JSDoc block
  const leadingJsdocMatch = content.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (!leadingJsdocMatch) {
    console.warn(`  [WARN] ${filePath} — no leading JSDoc block; skipping`);
    return "skipped-no-jsdoc";
  }

  const jsdocBlock = leadingJsdocMatch[0]; // the full /** ... */ block
  const jsdocInner = leadingJsdocMatch[1]; // content between /** and */

  // Extract the first non-empty content line (strips " * " prefix)
  const firstContentLine = jsdocInner
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .find((line) => line.length > 0) ?? "";

  const purpose = normalizePurpose(firstContentLine);

  // Build the two new lines to insert before closing */
  const insertLines = [
    ` * @owner ${ownerSlug}`,
    ` * @purpose ${purpose}`,
  ].join("\n");

  // Replace the first occurrence of the closing */ inside the leading JSDoc
  // We replace only the first `*/` to avoid touching code-level JSDoc comments
  const annotatedJsdoc = jsdocBlock.replace(/\*\//, `${insertLines}\n */`);
  const newContent = content.replace(jsdocBlock, annotatedJsdoc);

  if (DRY_RUN) {
    console.log(`  [dry-run] would annotate: ${filePath}`);
    console.log(`    @owner ${ownerSlug}`);
    console.log(`    @purpose ${purpose}`);
  } else {
    writeFileSync(filePath, newContent, "utf-8");
  }

  return "annotated";
}

/**
 * Prepend a synthetic JSDoc block for files that have only leading // comments.
 * Used when insertJsdoc === true (lib/* dirs).
 *
 * The synthetic block is prepended BEFORE the existing // comments so the file
 * structure becomes:
 *   /**
 *    * <purpose derived from first // comment>
 *    * @owner <ownerSlug>
 *    * @purpose <purpose>
 *    *\/
 *   // original comments...
 *   ...rest of file
 */
function insertSyntheticJsdoc(filePath: string, ownerSlug: string): AnnotationResult {
  const content = readFileSync(filePath, "utf-8");

  // Idempotency guard — already has both tags (either /** */ or via earlier run)
  if (content.includes("@owner ") && content.includes("@purpose ")) {
    return "skipped-has-tags";
  }

  // If there's already a leading /** */ block, fall back to append behavior
  // (defensive: some lib files might have been manually annotated with /** */)
  const leadingJsdocMatch = content.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (leadingJsdocMatch) {
    // Delegate to existing-jsdoc path
    return annotateExistingJsdoc(filePath, ownerSlug);
  }

  // Find leading // comment lines to derive purpose
  const lines = content.split("\n");
  const firstCommentLine = lines
    .map((line) => line.replace(/^\/\/\s?/, "").trim())
    .find((line) => line.length > 0) ?? "";

  if (!firstCommentLine) {
    // No leading // comment either — cannot derive purpose
    console.warn(`  [WARN] ${filePath} — no leading // comment or /** */ block; skipping`);
    return "skipped-no-jsdoc";
  }

  const purpose = normalizePurpose(firstCommentLine);

  // Build the synthetic JSDoc block to prepend
  const syntheticJsdoc = [
    "/**",
    ` * ${purpose}`,
    ` * @owner ${ownerSlug}`,
    ` * @purpose ${purpose}`,
    " */",
  ].join("\n");

  const newContent = `${syntheticJsdoc}\n${content}`;

  if (DRY_RUN) {
    console.log(`  [dry-run] would insert JSDoc + annotate: ${filePath}`);
    console.log(`    @owner ${ownerSlug}`);
    console.log(`    @purpose ${purpose}`);
  } else {
    writeFileSync(filePath, newContent, "utf-8");
  }

  return "annotated";
}

/**
 * Dispatch to the correct annotation strategy based on DirConfig.insertJsdoc.
 */
function annotateFile(filePath: string, ownerSlug: string, insertJsdoc: boolean): AnnotationResult {
  if (insertJsdoc) {
    return insertSyntheticJsdoc(filePath, ownerSlug);
  }
  return annotateExistingJsdoc(filePath, ownerSlug);
}

// ---------------------------------------------------------------------------
// Process a directory (top-level .ts files only — no recursion)
// ---------------------------------------------------------------------------
interface DirStats {
  annotated: number;
  skippedHasTags: number;
  skippedNoJsdoc: number;
}

function processDir(dir: string, ownerSlug: string, insertJsdoc: boolean): DirStats {
  const stats: DirStats = { annotated: 0, skippedHasTags: 0, skippedNoJsdoc: 0 };

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    console.warn(`  [WARN] Cannot read directory: ${dir}`);
    return stats;
  }

  for (const entry of entries) {
    // Top-level .ts files only — no subdirectory recursion
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;

    const filePath = join(dir, entry.name);
    const result = annotateFile(filePath, ownerSlug, insertJsdoc);

    if (result === "annotated") stats.annotated++;
    else if (result === "skipped-has-tags") stats.skippedHasTags++;
    else stats.skippedNoJsdoc++;
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Resolve --path argument to one or more DirConfig entries to process
// ---------------------------------------------------------------------------
type RunTarget =
  | { mode: "legacy" }   // original primitives + codegen only (no --path, no DIR_CONFIG match)
  | { mode: "all" }      // all dirs (legacy + DIR_CONFIG), no --path given
  | { mode: "single"; config: DirConfig };  // --path matched a single DirConfig entry

function resolveTarget(): RunTarget {
  if (PATH_ARG !== undefined) {
    // Normalize the user-provided path for matching
    const resolved = resolve(process.cwd(), PATH_ARG).replace(/\/$/, "");

    // Match against DIR_CONFIG entries
    const match = DIR_CONFIG.find((c) => c.path.replace(/\/$/, "") === resolved);
    if (match) {
      return { mode: "single", config: match };
    }

    // Also allow matching against legacy primitives/codegen dirs
    if (resolved === PRIMITIVES_DIR.replace(/\/$/, "") || resolved === CODEGEN_DIR.replace(/\/$/, "")) {
      // Return a synthetic DirConfig-compatible target using legacy behavior
      const legacyConfig: DirConfig = {
        path: resolved,
        ownerSlug: "palantirkc-ontology",
        insertJsdoc: false,
      };
      return { mode: "single", config: legacyConfig };
    }

    console.error(
      `  [ERROR] --path "${PATH_ARG}" resolved to "${resolved}" — not found in DIR_CONFIG or legacy dirs.`,
    );
    console.error(`  Known paths:`);
    console.error(`    ${PRIMITIVES_DIR}`);
    console.error(`    ${CODEGEN_DIR}`);
    for (const c of DIR_CONFIG) {
      console.error(`    ${c.path}`);
    }
    process.exit(1);
  }

  return { mode: "all" };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const mode = DRY_RUN ? "dry-run" : "applied";
console.log(`add-semantic-frontmatter [${mode}]:`);

const target = resolveTarget();

interface RunStats {
  label: string;
  stats: DirStats;
}

const results: RunStats[] = [];

if (target.mode === "all") {
  // Legacy: primitives + codegen
  const primStats = processDir(PRIMITIVES_DIR, "palantirkc-ontology", false);
  const codegenStats = processDir(CODEGEN_DIR, "palantirkc-ontology", false);
  results.push({ label: "primitives/", stats: primStats });
  results.push({ label: "codegen/", stats: codegenStats });

  // Phase B3-C: DIR_CONFIG entries
  for (const config of DIR_CONFIG) {
    const dirLabel = config.path.replace(HOME, "~");
    const stats = processDir(config.path, config.ownerSlug, config.insertJsdoc);
    results.push({ label: dirLabel, stats });
  }
} else if (target.mode === "single") {
  const { config } = target;
  const dirLabel = config.path.replace(HOME, "~");
  const stats = processDir(config.path, config.ownerSlug, config.insertJsdoc);
  results.push({ label: dirLabel, stats });
} else {
  // Legacy-only (should not be reached in current flow, but kept for safety)
  const primStats = processDir(PRIMITIVES_DIR, "palantirkc-ontology", false);
  const codegenStats = processDir(CODEGEN_DIR, "palantirkc-ontology", false);
  results.push({ label: "primitives/", stats: primStats });
  results.push({ label: "codegen/", stats: codegenStats });
}

let totalChanged = 0;
for (const { label, stats } of results) {
  console.log(
    `  ${label} — ${stats.annotated} annotated, ${stats.skippedHasTags} skipped (already had tags), ${stats.skippedNoJsdoc} skipped (no leading JSDoc)`,
  );
  totalChanged += stats.annotated;
}

console.log(`Total: ${totalChanged} files changed`);
