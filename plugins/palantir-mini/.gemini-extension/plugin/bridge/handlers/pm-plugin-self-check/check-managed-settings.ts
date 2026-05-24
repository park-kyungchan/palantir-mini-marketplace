import * as fs from "fs";
import * as path from "path";
import { TOOLS } from "../../mcp-server";
import { PLUGIN_ROOT } from "./types";
import type { PmPluginSelfCheckResult } from "./types";
import {
  isPalantirMiniMcpToolName,
  managedSettingsPalantirMiniMcpPattern,
} from "../../../lib/hooks/tool-classifier";

function publicToolPatterns(): string[] {
  return TOOLS
    .filter((tool) => tool.audience === "public")
    .map((tool) => `mcp__palantir-mini__${tool.name}`)
    .sort((left, right) => left.localeCompare(right));
}

function pluginPatternsFromFragment(filePath: string): string[] {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
    permissions?: { allow?: string[] };
  };
  return (parsed.permissions?.allow ?? [])
    .filter((pattern) => isPalantirMiniMcpToolName(pattern))
    .map((pattern) => managedSettingsPalantirMiniMcpPattern(pattern))
    .sort((left, right) => left.localeCompare(right));
}

export function checkManagedSettings(): PmPluginSelfCheckResult["managedSettingsResult"] {
  const settingsDir = path.join(PLUGIN_ROOT, "managed-settings.d");
  if (!fs.existsSync(settingsDir)) {
    return {
      status: "skipped",
      details: `managed-settings.d not found at ${settingsDir}`,
      fragmentCount: 0,
      missingPublicTools: [],
      extraPluginTools: [],
    };
  }

  const fragments = fs.readdirSync(settingsDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));
  const allowed = new Set<string>();
  for (const fragment of fragments) {
    for (const pattern of pluginPatternsFromFragment(path.join(settingsDir, fragment))) {
      allowed.add(pattern);
    }
  }

  const expected = publicToolPatterns();
  const expectedSet = new Set(expected);
  const missingPublicTools = expected.filter((pattern) => !allowed.has(pattern));
  const extraPluginTools = [...allowed].filter((pattern) => !expectedSet.has(pattern));
  const status = missingPublicTools.length > 0 || extraPluginTools.length > 0 ? "fail" : "pass";

  return {
    status,
    details: status === "pass"
      ? `Managed settings allow all ${expected.length} public MCP tool pattern(s).`
      : `Managed settings drift: missing=${missingPublicTools.length}, extra=${extraPluginTools.length}.`,
    fragmentCount: fragments.length,
    missingPublicTools,
    extraPluginTools,
  };
}
