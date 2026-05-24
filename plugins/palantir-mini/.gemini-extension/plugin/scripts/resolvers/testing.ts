// Testing resolver — Claude-slim of gstack testing.ts (573 LOC).
// Keeps only TEST_BOOTSTRAP + TEST_FAILURE_TRIAGE (in preamble.ts); drops
// TEST_COVERAGE_AUDIT_{PLAN,SHIP,REVIEW} — project-specific coverage gates
// belong in per-project ship skills, not a shared resolver.

import type { TemplateContext } from "./types";

export function generateTestBootstrap(_ctx: TemplateContext): string {
  return `## Test bootstrap

Detect the project's test command before running tests:

1. **Read project CLAUDE.md** for a \`Commands\` section; look for \`bun test\`, \`npm test\`, \`pytest\`, \`go test\`, etc.
2. **Inspect package.json \`scripts.test\`** if CLAUDE.md is absent.
3. **Fall back to language defaults**: \`bun test\` for .ts projects with \`bun.lockb\`; \`npm test\` for .js with \`package-lock.json\`; \`pytest\` for .py with \`pyproject.toml\`; \`go test ./...\` for .go.
4. **If still ambiguous**: with the detected candidates. Persist the chosen command to CLAUDE.md so future sessions skip this detection.

Run the detected command. If it exits 0, tests pass. If non-zero, follow the Test Failure Triage section.`;
}
