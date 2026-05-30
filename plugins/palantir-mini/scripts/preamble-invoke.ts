#!/usr/bin/env bun
/**
 * preamble-invoke — thin CLI wrapper that prints skill-preamble JSON.
 *
 * Replaces gstack's ~300-500ms bash chain (gstack-config get + gstack-slug
 * + gstack-repo-mode + gstack-learnings-search + timeline-log) with a single
 * direct call into the same preamble handler the MCP server uses.
 * Target: ~5-10ms inside an MCP session, ~20-50ms here (invoked as Bash).
 *
 * Usage (from SKILL templates):
 *   bun run "${PALANTIR_MINI_PLUGIN_ROOT}/scripts/preamble-invoke.ts" <skill-name>
 *
 * Behavior:
 *   - Calls the same default export that bridge/handlers/pm-preamble.ts exposes.
 *   - Prints JSON to stdout.
 *   - On any failure: prints a one-line note to stderr and exits 0 (non-blocking).
 */

import * as path from "path";

async function main() {
  const skillName = process.argv[2] ?? "unknown-skill";
  const projectRoot = process.env.PALANTIR_MINI_PROJECT ?? process.cwd();

  try {
    const handlerPath = path.resolve(
      import.meta.dir,
      "../bridge/handlers/pm-preamble.ts",
    );
    const mod: { default: (args: unknown) => Promise<unknown> } = await import(handlerPath);
    const result = await mod.default({ skillName, projectRoot });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(
      `preamble-invoke: ${(e as Error).message} — skipping (non-blocking).`,
    );
    // Exit 0 so the SKILL's bash block continues even when preamble fails.
  }
}

main();
