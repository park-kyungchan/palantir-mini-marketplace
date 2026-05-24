#!/usr/bin/env bun
// palantir-mini — tests-source-ratio.ts (sprint-060 W3 R6-F10)
//
// Dashboard script: counts source files vs paired test files for each major
// plugin layer (hooks, bridge/handlers, lib) and outputs a markdown table
// with coverage ratio and gap list.
//
// Architecture review §5.H.10: "scripts/tests-source-ratio.ts counts
// bridge/handlers/*.ts vs tests/bridge/**/*.test.ts (and hooks/lib similarly).
// Outputs a markdown table. Lead can invoke periodically via Bash to track
// maintainability metric."
//
// Usage:
//   bun run scripts/tests-source-ratio.ts [--plugin-root <path>] [--json]
//   bun run scripts/tests-source-ratio.ts --help
//
// Output (default): markdown table printed to stdout
// Output (--json):  JSON array of layer rows

import * as fs from "fs";
import * as path from "path";

// ─── CLI arg parsing ────────────────────────────────────────────────────────

function parseArgs(argv: string[]): {
  pluginRoot: string;
  json: boolean;
  help: boolean;
} {
  const args = argv.slice(2);
  let pluginRoot = path.resolve(path.dirname(import.meta.dir ?? process.cwd()));
  let json = false;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--plugin-root" && args[i + 1]) {
      pluginRoot = path.resolve(args[++i] ?? "");
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    }
  }
  return { pluginRoot, json, help };
}

// ─── File listing helpers ───────────────────────────────────────────────────

/** List .ts files in a directory (non-recursive). Excludes hooks.json. */
function listTsFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
      .map((f) => path.basename(f, ".ts"));
  } catch {
    return [];
  }
}

/** List .test.ts files in a directory (recursive). Returns basenames without .test.ts. */
function listTestFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...listTestFiles(full));
      } else if (entry.name.endsWith(".test.ts")) {
        results.push(path.basename(entry.name, ".test.ts"));
      }
    }
  } catch {
    // Directory may not exist yet
  }
  return results;
}

// ─── Layer definitions ──────────────────────────────────────────────────────

interface LayerRow {
  layer: string;
  sourceDir: string;
  testDir: string;
  sourceCount: number;
  testCount: number;
  ratio: number;      // testCount / sourceCount (0..1+)
  gaps: string[];     // source files with no matching test
}

function computeLayerRow(
  label: string,
  sourceDirRel: string,
  testDirRel: string,
  pluginRoot: string,
): LayerRow {
  const sourceDir = path.join(pluginRoot, sourceDirRel);
  const testDir   = path.join(pluginRoot, testDirRel);

  const sourceFiles = listTsFiles(sourceDir);
  const testFiles   = new Set(listTestFiles(testDir));

  const gaps = sourceFiles.filter((f) => !testFiles.has(f));
  const ratio = sourceFiles.length > 0 ? testFiles.size / sourceFiles.length : 0;

  return {
    layer:       label,
    sourceDir:   sourceDirRel,
    testDir:     testDirRel,
    sourceCount: sourceFiles.length,
    testCount:   testFiles.size,
    ratio,
    gaps,
  };
}

// ─── Markdown rendering ─────────────────────────────────────────────────────

function renderMarkdown(rows: LayerRow[]): string {
  const lines: string[] = [
    "# palantir-mini — Tests/Source Ratio Dashboard",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Layer | Source files | Test files | Coverage ratio | Gap count |",
    "|-------|-------------|------------|----------------|-----------|",
  ];

  for (const row of rows) {
    const pct = `${(row.ratio * 100).toFixed(1)}%`;
    lines.push(
      `| \`${row.layer}\` | ${row.sourceCount} | ${row.testCount} | ${pct} | ${row.gaps.length} |`,
    );
  }

  // Summary
  const totalSource = rows.reduce((s, r) => s + r.sourceCount, 0);
  const totalTest   = rows.reduce((s, r) => s + r.testCount, 0);
  const totalGaps   = rows.reduce((s, r) => s + r.gaps.length, 0);
  const totalRatio  = totalSource > 0 ? totalTest / totalSource : 0;

  lines.push(
    `| **Total** | **${totalSource}** | **${totalTest}** | **${(totalRatio * 100).toFixed(1)}%** | **${totalGaps}** |`,
    "",
    "## Gap details",
    "",
  );

  for (const row of rows) {
    if (row.gaps.length === 0) continue;
    lines.push(`### \`${row.layer}\` (${row.gaps.length} uncovered)`);
    lines.push("");
    for (const gap of row.gaps.slice(0, 20)) {
      lines.push(`- \`${gap}\` — no paired test in \`${row.testDir}\``);
    }
    if (row.gaps.length > 20) {
      lines.push(`- … and ${row.gaps.length - 20} more`);
    }
    lines.push("");
  }

  lines.push(
    "## How to use",
    "",
    "Run periodically to track maintainability metric. Target ratio: ≥ 0.80 for hooks and bridge/handlers.",
    "Gaps represent source files with no paired test — add tests or mark as intentionally untested.",
    "",
    "Cross-ref: architecture review §5.H.10 (sprint-060 W3 R6-F10)",
  );

  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { pluginRoot, json, help } = parseArgs(process.argv);

  if (help) {
    process.stdout.write(
      [
        "tests-source-ratio.ts — palantir-mini maintainability dashboard",
        "",
        "Usage: bun run tests-source-ratio.ts [--plugin-root <path>] [--json]",
        "",
        "  --plugin-root <path>  Path to plugin root (default: parent of scripts/)",
        "  --json                Output JSON instead of markdown",
        "  --help, -h            Show this help",
        "",
        "Output: markdown table (or JSON) of tests/source ratio per layer.",
      ].join("\n") + "\n",
    );
    return;
  }

  const layers: LayerRow[] = [
    computeLayerRow("hooks",           "hooks",           "tests/hooks",   pluginRoot),
    computeLayerRow("bridge/handlers", "bridge/handlers", "tests/bridge",  pluginRoot),
    computeLayerRow("monitors",        "monitors",        "tests/monitors", pluginRoot),
    computeLayerRow("scripts",         "scripts",         "tests/hooks",    pluginRoot),
  ];

  if (json) {
    process.stdout.write(JSON.stringify(layers, null, 2) + "\n");
  } else {
    process.stdout.write(renderMarkdown(layers) + "\n");
  }
}

await main();
