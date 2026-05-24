// palantir-mini v1.3 — MCP tool handler: validate_managed_settings_fragments
// Domain: LEARN (ManagedSettingsFragment prim-learn-10)
//
// Audits managed-settings.d/*.json fragments against expected plugin MCP tool list.
// Authority chain: rules/07-plugins-and-mcp.md → schemas/ontology/primitives/managed-settings-fragment.ts

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  MANAGED_SETTINGS_FRAGMENT_REGISTRY,
  managedSettingsFragmentRid,
} from "#schemas/ontology/primitives/managed-settings-fragment";
import type {
  ManagedSettingsFragmentDeclaration,
  ManagedSettingsDriftEntry,
} from "#schemas/ontology/primitives/managed-settings-fragment";
import { TOOLS } from "../mcp-server";
import {
  isPalantirMiniMcpToolName,
  managedSettingsPalantirMiniMcpPattern,
} from "../../lib/hooks/tool-classifier";

export function pluginMcpToolPatterns(): string[] {
  return TOOLS
    .map((tool) => `mcp__palantir-mini__${tool.name}`)
    .sort((left, right) => left.localeCompare(right));
}

function isPluginMcpPattern(pattern: string): boolean {
  return isPalantirMiniMcpToolName(pattern);
}

function normalizeManagedSettingsPattern(pattern: string): string {
  return isPluginMcpPattern(pattern)
    ? managedSettingsPalantirMiniMcpPattern(pattern)
    : pattern;
}

interface ValidateManagedSettingsFragmentsArgs {
  project: string;
  expectedTools?: string[];
}

interface DriftReport {
  fragmentId: string;
  missing: string[];
  extra: string[];
}

interface ValidateManagedSettingsFragmentsResult {
  fragments: ManagedSettingsFragmentDeclaration[];
  drift: DriftReport[];
  unknownKeys: string[];
}

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function loadFragment(fragPath: string): ManagedSettingsFragmentDeclaration {
  const content = fs.readFileSync(fragPath, "utf8");
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const checksum = sha256(content);

  // Claude Code managed-settings.d/*.json uses a top-level `permissions` object
  // with `allow: string[]` and `deny: string[]` (not an array of objects).
  const permsObj =
    parsed.permissions !== null &&
    typeof parsed.permissions === "object" &&
    !Array.isArray(parsed.permissions)
      ? (parsed.permissions as { allow?: string[]; deny?: string[] })
      : {};

  const permissionRules = [
    ...(permsObj.allow ?? []).map((pattern) => ({ kind: "allow" as const, pattern })),
    ...(permsObj.deny ?? []).map((pattern) => ({ kind: "deny" as const, pattern })),
  ];

  const fragmentId = path.basename(fragPath, ".json");
  return {
    rid: managedSettingsFragmentRid(`fragment:${fragPath}`),
    fragmentId,
    projectRid: path.dirname(path.dirname(fragPath)),
    permissionRules,
    checksum,
    lastMigratedAt: new Date().toISOString(),
  };
}

export default async function validateManagedSettingsFragments(
  rawArgs: unknown,
): Promise<ValidateManagedSettingsFragmentsResult> {
  const args = (rawArgs ?? {}) as ValidateManagedSettingsFragmentsArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("validate_managed_settings_fragments: `project` is required");
  }

  const expectedTools = (args.expectedTools ?? pluginMcpToolPatterns())
    .map(normalizeManagedSettingsPattern)
    .sort((left, right) => left.localeCompare(right));
  const settingsDir = path.join(args.project, ".claude", "managed-settings.d");

  const fragments: ManagedSettingsFragmentDeclaration[] = [];
  const drift: DriftReport[] = [];
  const unknownKeys: string[] = [];

  if (!fs.existsSync(settingsDir)) {
    return { fragments: [], drift: [], unknownKeys: [] };
  }

  for (const entry of fs.readdirSync(settingsDir)) {
    if (!entry.endsWith(".json")) continue;
    const fragPath = path.join(settingsDir, entry);
    try {
      const decl = loadFragment(fragPath);
      MANAGED_SETTINGS_FRAGMENT_REGISTRY.register(decl);
      fragments.push(decl);

      const mcpOnlyRid = managedSettingsFragmentRid(`${decl.rid}:mcp-only`);
      MANAGED_SETTINGS_FRAGMENT_REGISTRY.register({
        ...decl,
        rid: mcpOnlyRid,
        permissionRules: decl.permissionRules
          .filter((rule) => isPluginMcpPattern(rule.pattern))
          .map((rule) => ({
            ...rule,
            pattern: normalizeManagedSettingsPattern(rule.pattern),
          })),
      });

      const report = MANAGED_SETTINGS_FRAGMENT_REGISTRY.audit(mcpOnlyRid, expectedTools);
      const missing = report.drift
        .filter((d: ManagedSettingsDriftEntry) => d.kind === "missing-tool")
        .map((d: ManagedSettingsDriftEntry) => d.detail);
      const extra = report.drift
        .filter((d: ManagedSettingsDriftEntry) => d.kind === "unexpected-tool")
        .map((d: ManagedSettingsDriftEntry) => d.detail);

      if (missing.length > 0 || extra.length > 0) {
        drift.push({ fragmentId: decl.fragmentId, missing, extra });
      }

      // Check for unknown top-level keys
      const content = fs.readFileSync(fragPath, "utf8");
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const knownKeys = new Set(["permissions", "mcpServers", "version", "$schema", "description", "env"]);
      for (const key of Object.keys(parsed)) {
        if (!knownKeys.has(key)) unknownKeys.push(`${entry}:${key}`);
      }
    } catch (e) {
      unknownKeys.push(`${entry}: parse error — ${(e as Error).message}`);
    }
  }

  return { fragments, drift, unknownKeys };
}
