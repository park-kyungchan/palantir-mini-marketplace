import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");
const LOCAL_PLUGIN_SOURCE = "~/palantir-mini-marketplace/plugins/palantir-mini";
const PRIVATE_MARKETPLACE_REPO = "park-kyungchan/palantir-mini-marketplace";
const PRIVATE_MARKETPLACE_SOURCE = `github:${PRIVATE_MARKETPLACE_REPO}:plugins/palantir-mini`;
// Bare-tilde legacy form of the pre-marketplace-restructure local checkout
// (`~/palantir-mini`, distinct from the current canonical
// `~/palantir-mini-marketplace/...` authority form). Matched with a negative
// lookahead so the canonical `~` authority value itself, which legitimately
// starts with the same characters, is never a false positive.
const REMOVED_LOCAL_MARKER_PATTERNS = [
  /\/home\/palantirkc\/palantir-mini\//,
  /~\/palantir-mini(?!-marketplace)/,
  /"\.\/palantir-mini"/,
];

const ACTIVE_RUNTIME_FILES = [
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
  path.join(PLUGIN_ROOT, "skills/pm-ship/SKILL.md"),
  path.join(PLUGIN_ROOT, "skills/pm-ship/SKILL.md.tmpl"),
  path.join(PLUGIN_ROOT, "lib/agents/inventory.ts"),
  path.join(PLUGIN_ROOT, "lib/config/root.ts"),
  path.join(PLUGIN_ROOT, "scripts/cross-project-audit.ts"),
];

// Machine-neutral runtime home files (~/.codex/**). These live OUTSIDE the
// repo in the operator's actual Codex home and are not guaranteed to exist
// on every machine that checks out this repo (e.g. CI, a fresh clone, or a
// sandbox without a real Codex install). Existence-gated: present -> must
// avoid the removed-local-source markers below; absent -> skipped, not a
// failure.
const ACTIVE_RUNTIME_HOME_FILES = [
  path.join(os.homedir(), ".codex", "AGENTS.md"),
  path.join(os.homedir(), ".codex", "config.toml"),
  path.join(os.homedir(), ".codex", "hooks.json"),
];

const OPTIONAL_RUNTIME_FILES = [
  path.join(os.homedir(), "AGENTS.md"),
];

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function readLines(filePath: string): string[] {
  return readFile(filePath).split("\n");
}

// Several checks below read the real ~/.codex/** and ~/AGENTS.md /
// ~/.agents/** installed runtime files — gated behind an explicit opt-in (not
// just existence) so a fresh clone/CI, or a developer's ordinary `bun test`,
// never even stats those real paths (a1-hermetic-plugin-tests). The
// PLUGIN_ROOT-relative checks in the same test are source-tree-internal and
// stay unconditional.
const INSTALLED_CONFORMANCE_OPT_IN = process.env.PALANTIR_MINI_INSTALLED_CONFORMANCE === "1";

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

    const runtimeFilesToInspect = [...ACTIVE_RUNTIME_FILES];

    if (INSTALLED_CONFORMANCE_OPT_IN) {
      expect(fs.existsSync(path.join(os.homedir(), ".agents/plugins/marketplace.json"))).toBe(false);

      const presentRuntimeHomeFiles = ACTIVE_RUNTIME_HOME_FILES.filter((filePath) => fs.existsSync(filePath));
      if (presentRuntimeHomeFiles.length < ACTIVE_RUNTIME_HOME_FILES.length) {
        console.log(
          `[source-root-path-sentinel] skipping ${ACTIVE_RUNTIME_HOME_FILES.length - presentRuntimeHomeFiles.length} absent ~/.codex runtime file(s) on this machine`,
        );
      }
      runtimeFilesToInspect.push(
        ...presentRuntimeHomeFiles,
        ...OPTIONAL_RUNTIME_FILES.filter((filePath) => fs.existsSync(filePath)),
      );
    }

    for (const filePath of runtimeFilesToInspect) {
      const content = readFile(filePath);
      for (const marker of REMOVED_LOCAL_MARKER_PATTERNS) {
        expect(marker.test(content), `${filePath} must not contain removed local marker ${marker}`).toBe(false);
      }
    }
  });

  test("Gemini package surfaces and legacy Claude hook registry are absent from the checkout", () => {
    expect(fs.existsSync(path.join(PLUGIN_ROOT, ".gemini-extension"))).toBe(false);
    expect(fs.existsSync(path.join(PLUGIN_ROOT, "lib/gemini"))).toBe(false);
    expect(fs.existsSync(path.join(PLUGIN_ROOT, "hooks/claude-hooks.json"))).toBe(false);
  });
});
