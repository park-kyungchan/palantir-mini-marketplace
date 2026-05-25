import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");
const PRIVATE_MARKETPLACE_REPO = "park-kyungchan/palantir-mini-marketplace";
const PRIVATE_MARKETPLACE_SOURCE = `github:${PRIVATE_MARKETPLACE_REPO}:plugins/palantir-mini`;
const OLD_CLAUDE_PLUGIN_PATH = ".claude/plugins/palantir-mini";
const REMOVED_LOCAL_MARKERS = [
  "/home/palantirkc/palantir-mini",
  "~/palantir-mini",
  "\"./palantir-mini\"",
  "source\": \"local\"",
];

const ACTIVE_RUNTIME_FILES = [
  "/home/palantirkc/AGENTS.md",
  "/home/palantirkc/CLAUDE.md",
  "/home/palantirkc/GEMINI.md",
  "/home/palantirkc/.codex/AGENTS.md",
  "/home/palantirkc/.codex/config.toml",
  "/home/palantirkc/.codex/hooks.json",
  "/home/palantirkc/.codex/scripts/sync-claude-palantir-mini.ts",
  "/home/palantirkc/.claude/rules/CONTEXT.md",
  "/home/palantirkc/.claude/hooks/BROWSE.md",
  "/home/palantirkc/.claude/settings.json",
  "/home/palantirkc/.claude/settings.local.json",
  "/home/palantirkc/.claude/plugins/known_marketplaces.json",
  "/home/palantirkc/.gemini/GEMINI.md",
  "/home/palantirkc/.gemini/trustedFolders.json",
  path.join(PLUGIN_ROOT, "agents/hook-builder.md"),
  path.join(PLUGIN_ROOT, "agents/plugin-maintainer.md"),
  path.join(PLUGIN_ROOT, "runtime-overlay/rules/07-plugins-and-mcp.md"),
  path.join(PLUGIN_ROOT, "runtime-overlay/rules/CONTEXT.md"),
  path.join(PLUGIN_ROOT, ".mcp.json"),
  path.join(PLUGIN_ROOT, ".codex-plugin/plugin.json"),
  path.join(PLUGIN_ROOT, ".ssot-authority.json"),
  path.join(PLUGIN_ROOT, "docs/CONVEX_CLOUD_AUTHORITY.md"),
  path.join(PLUGIN_ROOT, "docs/CONVEX_CLOUD_CUTOVER.md"),
  path.join(PLUGIN_ROOT, "skills/pm-mcp-reload/SKILL.md"),
  path.join(PLUGIN_ROOT, "skills/pm-portable-bundle/SKILL.md"),
  path.join(PLUGIN_ROOT, "skills/pm-restore/SKILL.md"),
  path.join(PLUGIN_ROOT, "skills/pm-ship/SKILL.md"),
  path.join(PLUGIN_ROOT, "skills/pm-ship/SKILL.md.tmpl"),
  path.join(PLUGIN_ROOT, "lib/agents/inventory.ts"),
  path.join(PLUGIN_ROOT, "lib/config/root.ts"),
  path.join(PLUGIN_ROOT, "scripts/cross-project-audit.ts"),
  path.join(PLUGIN_ROOT, ".gemini-extension/plugin/.mcp.json"),
  path.join(PLUGIN_ROOT, ".gemini-extension/plugin/.ssot-authority.json"),
  path.join(PLUGIN_ROOT, ".gemini-extension/plugin/lib/config/root.ts"),
];

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function readLines(filePath: string): string[] {
  return readFile(filePath).split("\n");
}

describe("source-root path sentinel", () => {
  test("active runtime loaders use the private marketplace source, not the removed local source tree", () => {
    for (const filePath of ACTIVE_RUNTIME_FILES) {
      expect(fs.existsSync(filePath), `${filePath} should exist`).toBe(true);
    }

    const mcpConfig = JSON.parse(readFile(path.join(PLUGIN_ROOT, ".mcp.json")));
    expect(mcpConfig.mcpServers["palantir-mini"].cwd).toBe(".");
    expect(mcpConfig.mcpServers["palantir-mini"].args).toEqual(["run", "./bridge/mcp-server.ts"]);

    const codexPluginConfig = JSON.parse(readFile(path.join(PLUGIN_ROOT, ".codex-plugin/plugin.json")));
    expect(codexPluginConfig.mcpServers).toBe("./.mcp.json");

    const ssotMarker = JSON.parse(readFile(path.join(PLUGIN_ROOT, ".ssot-authority.json")));
    expect(ssotMarker.authority).toBe(PRIVATE_MARKETPLACE_SOURCE);

    expect(readFile("/home/palantirkc/.claude/settings.json")).toContain(PRIVATE_MARKETPLACE_REPO);
    expect(readFile("/home/palantirkc/.claude/plugins/known_marketplaces.json")).toContain(PRIVATE_MARKETPLACE_REPO);

    expect(fs.existsSync("/home/palantirkc/.agents/plugins/marketplace.json")).toBe(false);

    for (const filePath of ACTIVE_RUNTIME_FILES) {
      const content = readFile(filePath);
      for (const marker of REMOVED_LOCAL_MARKERS) {
        expect(content.includes(marker), `${filePath} must not contain removed local marker ${marker}`).toBe(false);
      }
    }
  });

  test("Gemini extension payload declares Gemini runtime explicitly", () => {
    const geminiMcpConfig = JSON.parse(readFile(path.join(PLUGIN_ROOT, ".gemini-extension/plugin/.mcp.json")));
    expect(geminiMcpConfig.mcpServers["palantir-mini"].cwd).toBe(".");
    expect(geminiMcpConfig.mcpServers["palantir-mini"].args).toEqual(["run", "./bridge/mcp-server.ts"]);
    expect(geminiMcpConfig.mcpServers["palantir-mini"].env.PALANTIR_MINI_HOST_RUNTIME).toBe("gemini");
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
