import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");
const LOCAL_PLUGIN_SOURCE = "/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini";
const PRIVATE_MARKETPLACE_REPO = "park-kyungchan/palantir-mini-marketplace";
const PRIVATE_MARKETPLACE_SOURCE = `github:${PRIVATE_MARKETPLACE_REPO}:plugins/palantir-mini`;
const REMOVED_LOCAL_MARKERS = [
  "/home/palantirkc/palantir-mini/",
  "~/palantir-mini",
  "\"./palantir-mini\"",
];

const ACTIVE_RUNTIME_FILES = [
  "/home/palantirkc/AGENTS.md",
  "/home/palantirkc/.codex/AGENTS.md",
  "/home/palantirkc/.codex/config.toml",
  "/home/palantirkc/.codex/hooks.json",
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
    expect(mcpConfig.mcpServers["palantir-mini"].env.PALANTIR_MINI_HOST_RUNTIME).toBe("codex");

    const codexPluginConfig = JSON.parse(readFile(path.join(PLUGIN_ROOT, ".codex-plugin/plugin.json")));
    expect(codexPluginConfig.mcpServers).toBe("./.mcp.json");

    const ssotMarker = JSON.parse(readFile(path.join(PLUGIN_ROOT, ".ssot-authority.json")));
    expect(ssotMarker.authority).toBe(LOCAL_PLUGIN_SOURCE);
    expect(ssotMarker.upstreamAuthority).toBe(PRIVATE_MARKETPLACE_SOURCE);

    expect(fs.existsSync("/home/palantirkc/.agents/plugins/marketplace.json")).toBe(false);

    for (const filePath of ACTIVE_RUNTIME_FILES) {
      const content = readFile(filePath);
      for (const marker of REMOVED_LOCAL_MARKERS) {
        expect(content.includes(marker), `${filePath} must not contain removed local marker ${marker}`).toBe(false);
      }
    }
  });

  test("Claude and Gemini package surfaces are absent from the Codex-only checkout", () => {
    expect(fs.existsSync(path.join(PLUGIN_ROOT, ".claude-plugin"))).toBe(false);
    expect(fs.existsSync(path.join(PLUGIN_ROOT, ".gemini-extension"))).toBe(false);
    expect(fs.existsSync(path.join(PLUGIN_ROOT, "lib/gemini"))).toBe(false);
    expect(fs.existsSync(path.join(PLUGIN_ROOT, "hooks/claude-hooks.json"))).toBe(false);
  });
});
