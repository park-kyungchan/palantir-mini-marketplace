import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";

const CANONICAL_ROOT = "/home/palantirkc/palantir-mini";
const OLD_CLAUDE_PLUGIN_PATH = ".claude/plugins/palantir-mini";

const ACTIVE_RUNTIME_FILES = [
  "/home/palantirkc/AGENTS.md",
  "/home/palantirkc/CLAUDE.md",
  "/home/palantirkc/.codex/AGENTS.md",
  "/home/palantirkc/.claude/rules/CONTEXT.md",
  "/home/palantirkc/.claude/hooks/BROWSE.md",
  "/home/palantirkc/.claude/settings.json",
  "/home/palantirkc/.claude/settings.local.json",
  "/home/palantirkc/.claude/plugins/known_marketplaces.json",
  "/home/palantirkc/.agents/plugins/marketplace.json",
  `${CANONICAL_ROOT}/agents/hook-builder.md`,
  `${CANONICAL_ROOT}/agents/plugin-maintainer.md`,
  `${CANONICAL_ROOT}/runtime-overlay/rules/07-plugins-and-mcp.md`,
  `${CANONICAL_ROOT}/runtime-overlay/rules/CONTEXT.md`,
  `${CANONICAL_ROOT}/.mcp.json`,
  `${CANONICAL_ROOT}/.codex-plugin/plugin.json`,
  `${CANONICAL_ROOT}/docs/CONVEX_CLOUD_AUTHORITY.md`,
  `${CANONICAL_ROOT}/docs/CONVEX_CLOUD_CUTOVER.md`,
  `${CANONICAL_ROOT}/skills/pm-mcp-reload/SKILL.md`,
  `${CANONICAL_ROOT}/skills/pm-portable-bundle/SKILL.md`,
  `${CANONICAL_ROOT}/skills/pm-restore/SKILL.md`,
  `${CANONICAL_ROOT}/skills/pm-ship/SKILL.md`,
  `${CANONICAL_ROOT}/skills/pm-ship/SKILL.md.tmpl`,
  `${CANONICAL_ROOT}/lib/agents/inventory.ts`,
  `${CANONICAL_ROOT}/scripts/cross-project-audit.ts`,
  "/home/palantirkc/.codex/scripts/sync-claude-palantir-mini.ts",
];

function readLines(filePath: string): string[] {
  return fs.readFileSync(filePath, "utf8").split("\n");
}

describe("source-root path sentinel", () => {
  test("active runtime loaders point at the canonical palantir-mini source root", () => {
    for (const filePath of ACTIVE_RUNTIME_FILES) {
      expect(fs.existsSync(filePath)).toBe(true);
    }

    expect(fs.readFileSync(`${CANONICAL_ROOT}/.mcp.json`, "utf8")).toContain(CANONICAL_ROOT);
    expect(fs.readFileSync(`${CANONICAL_ROOT}/.codex-plugin/plugin.json`, "utf8")).toContain(
      `${CANONICAL_ROOT}/.mcp.json`,
    );
    expect(fs.readFileSync("/home/palantirkc/.claude/settings.json", "utf8")).toContain(
      CANONICAL_ROOT,
    );
    expect(fs.readFileSync("/home/palantirkc/.agents/plugins/marketplace.json", "utf8")).toContain(
      CANONICAL_ROOT,
    );
  });

  test("old Claude plugin path is mentioned only as compatibility, never authority", () => {
    const compatibilityTerms = [
      "compatibility",
      "install target",
      "not semantic authority",
      "not semantic source",
      "temporary",
    ];

    for (const filePath of ACTIVE_RUNTIME_FILES) {
      const lines = readLines(filePath);
      lines.forEach((line, index) => {
        if (!line.includes(OLD_CLAUDE_PLUGIN_PATH)) return;
        expect(
          compatibilityTerms.some((term) => line.toLowerCase().includes(term)),
          `${filePath}:${index + 1} must describe ${OLD_CLAUDE_PLUGIN_PATH} as compatibility only`,
        ).toBe(true);
      });
    }
  });
});
