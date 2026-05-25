import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  configPath,
  resolvePalantirMiniRoot,
} from "../../../lib/config";
import { CANONICAL_PALANTIR_MINI_ROOT } from "../../../lib/config/root";

describe("resolvePalantirMiniRoot", () => {
  test("prefers runtime-independent env vars before runtime plugin env vars", () => {
    const root = resolvePalantirMiniRoot({
      PALANTIR_MINI_ROOT: "/tmp/pm-root",
      PALANTIR_MINI_PLUGIN_ROOT: "/tmp/pm-plugin-root",
      PLUGIN_ROOT: "/tmp/plugin-root",
      CLAUDE_PLUGIN_ROOT: "/tmp/claude-plugin-root",
    });

    expect(root).toBe("/tmp/pm-root");
  });

  test("falls back through plugin env vars in deterministic order", () => {
    expect(
      resolvePalantirMiniRoot({
        PALANTIR_MINI_PLUGIN_ROOT: "/tmp/pm-plugin-root",
        PLUGIN_ROOT: "/tmp/plugin-root",
        CLAUDE_PLUGIN_ROOT: "/tmp/claude-plugin-root",
      }),
    ).toBe("/tmp/pm-plugin-root");

    expect(
      resolvePalantirMiniRoot({
        PLUGIN_ROOT: "/tmp/plugin-root",
        CLAUDE_PLUGIN_ROOT: "/tmp/claude-plugin-root",
      }),
    ).toBe("/tmp/plugin-root");

    expect(
      resolvePalantirMiniRoot({
        CLAUDE_PLUGIN_ROOT: "/tmp/claude-plugin-root",
      }),
    ).toBe("/tmp/claude-plugin-root");
  });

  test("uses the package-relative palantir-mini source root when env is absent", () => {
    expect(resolvePalantirMiniRoot({})).toBe(
      path.resolve(import.meta.dir, "../../.."),
    );
  });

  test("does not use caller cwd when env is absent", () => {
    const savedCwd = process.cwd();
    try {
      process.chdir("/home/palantirkc");

      expect(resolvePalantirMiniRoot({})).toBe(
        path.resolve(import.meta.dir, "../../.."),
      );
    } finally {
      process.chdir(savedCwd);
    }
  });
});

describe("Codex MCP startup config", () => {
  const pluginRoot = path.resolve(import.meta.dir, "../../..");
  const mcpPath = path.join(pluginRoot, ".mcp.json");
  const codexPluginPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");

  test("launches the MCP server from the installed plugin payload", () => {
    const mcp = JSON.parse(fs.readFileSync(mcpPath, "utf8")) as {
      mcpServers: {
        "palantir-mini": {
          args: string[];
          cwd: string;
          env: Record<string, string>;
        };
      };
    };

    const server = mcp.mcpServers["palantir-mini"];
    expect(server.cwd).toBe(".");
    expect(server.args).toEqual(["run", "./bridge/mcp-server.ts"]);
    expect(server.env["PALANTIR_MINI_HOST_RUNTIME"]).toBe("codex");
  });

  test("does not resolve MCP servers through the Codex cache cwd", () => {
    const plugin = JSON.parse(fs.readFileSync(codexPluginPath, "utf8")) as {
      mcpServers: string;
    };

    expect(plugin.mcpServers).toBe("./.mcp.json");
    expect(path.isAbsolute(plugin.mcpServers)).toBe(false);
  });
});

describe("configPath", () => {
  test("keeps explicit config path override authoritative", () => {
    const savedConfigPath = process.env["PALANTIR_MINI_CONFIG_PATH"];
    const savedRoot = process.env["PALANTIR_MINI_ROOT"];
    try {
      process.env["PALANTIR_MINI_CONFIG_PATH"] = "/tmp/custom-config.json";
      process.env["PALANTIR_MINI_ROOT"] = "/tmp/pm-root";

      expect(configPath()).toBe("/tmp/custom-config.json");
    } finally {
      if (savedConfigPath === undefined) delete process.env["PALANTIR_MINI_CONFIG_PATH"];
      else process.env["PALANTIR_MINI_CONFIG_PATH"] = savedConfigPath;
      if (savedRoot === undefined) delete process.env["PALANTIR_MINI_ROOT"];
      else process.env["PALANTIR_MINI_ROOT"] = savedRoot;
    }
  });

  test("uses PALANTIR_MINI_ROOT for default config.json location", () => {
    const savedConfigPath = process.env["PALANTIR_MINI_CONFIG_PATH"];
    const savedRoot = process.env["PALANTIR_MINI_ROOT"];
    try {
      delete process.env["PALANTIR_MINI_CONFIG_PATH"];
      process.env["PALANTIR_MINI_ROOT"] = "/tmp/pm-root";

      expect(configPath()).toBe("/tmp/pm-root/config.json");
    } finally {
      if (savedConfigPath === undefined) delete process.env["PALANTIR_MINI_CONFIG_PATH"];
      else process.env["PALANTIR_MINI_CONFIG_PATH"] = savedConfigPath;
      if (savedRoot === undefined) delete process.env["PALANTIR_MINI_ROOT"];
      else process.env["PALANTIR_MINI_ROOT"] = savedRoot;
    }
  });
});
