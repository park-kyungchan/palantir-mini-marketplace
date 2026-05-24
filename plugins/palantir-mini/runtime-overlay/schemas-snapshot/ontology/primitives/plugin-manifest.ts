/**
 * palantir-mini — PluginManifest primitive (prim-plugin-01)
 *
 * Typed mirror of a Claude Code plugin's `.claude-plugin/plugin.json`.
 * Lets us validate MCP server registrations, hook event names, and
 * managed-settings fragment references without re-parsing ad-hoc JSON
 * in every consumer.
 *
 * Authority chain:
 *   rules/07-plugins-and-mcp.md + research/claude-code/plugin-system.md
 *   -> schemas/ontology/primitives/plugin-manifest.ts (this file)
 *   -> palantir-mini/mcp handlers: manifest validation
 *   -> plugin hooks: manifest-validate
 *
 * Branded RID pattern (zero runtime cost):
 *   type PluginManifestRid = string & { __brand: "PluginManifestRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose PluginManifest primitive (prim-plugin-01)
 */

import {
  HookEventAllowlistRegistry,
  type HookEventAllowlistValidationContext,
  type HookEventAllowlistValidationResult,
} from "./hook-event-allowlist.ts";
import type { AgentDefinitionRid } from "./agent-definition";
import type { SkillDefinitionRid } from "./skill-definition";

export type PluginManifestRid = string & { readonly __brand: "PluginManifestRid" };

export const pluginManifestRid = (s: string): PluginManifestRid => s as PluginManifestRid;

export interface MCPServerDeclaration {
  readonly type: string;
  readonly command: string;
  readonly args: ReadonlyArray<string>;
}

export interface PluginHookDeclaration {
  readonly event: string;
  readonly handler: string;
  readonly matcher?: string;
  /** Hook timeout in seconds (per rule 06 hook field v2 conventions) */
  readonly timeout?: number;
  readonly decision?: "block";
}

export interface PluginManifestDeclaration {
  readonly rid: PluginManifestRid;
  readonly name: string;
  /** Semver string for the plugin itself */
  readonly version: string;
  /** Semver range the plugin requires of the Claude Code runtime */
  readonly requiresClaudeCodeVersion: string;
  /** Semver range of @palantirKC/claude-schemas the plugin is compatible with */
  readonly compatibleSchemaVersions: string;
  readonly mcpServers: Readonly<Record<string, MCPServerDeclaration>>;
  readonly hooks: ReadonlyArray<PluginHookDeclaration>;
  readonly managedSettingsFragments?: ReadonlyArray<string>;
  readonly monitors?: ReadonlyArray<string>;
  /**
   * v1.27.0 (Phase 2d) additive — list of AgentDefinitionRid the plugin
   * declares. Cross-checked against AgentDefinitionRegistry by
   * pm_plugin_self_check (advisory only this version; authoritative later).
   */
  readonly declaredAgents?: ReadonlyArray<AgentDefinitionRid>;
  /**
   * v1.27.0 (Phase 2d) additive — list of SkillDefinitionRid the plugin
   * declares. Cross-checked against SkillDefinitionRegistry by
   * pm_plugin_self_check (advisory only this version).
   */
  readonly declaredSkills?: ReadonlyArray<SkillDefinitionRid>;
}

export interface PluginManifestLoader {
  readonly readFile: (absolutePath: string) => string;
}

export interface PluginManifestValidationResult {
  readonly hookEvents: HookEventAllowlistValidationResult;
  readonly structural: ReadonlyArray<{
    readonly kind: "duplicate_mcp_server" | "missing_required_field" | "invalid_semver";
    readonly detail: string;
  }>;
}

/** Registry helper — v0 minimal registry via plain Map */
export class PluginManifestRegistry {
  private readonly manifests = new Map<PluginManifestRid, PluginManifestDeclaration>();

  register(decl: PluginManifestDeclaration): void {
    this.manifests.set(decl.rid, decl);
  }

  get(rid: PluginManifestRid): PluginManifestDeclaration | undefined {
    return this.manifests.get(rid);
  }

  list(): PluginManifestDeclaration[] {
    return [...this.manifests.values()];
  }

  /**
   * Parses a plugin.json from disk via the injected loader and returns a
   * declaration. Does not auto-register — callers decide whether to keep
   * partial/malformed manifests in the registry.
   */
  loadFromDisk(absolutePath: string, loader: PluginManifestLoader): PluginManifestDeclaration {
    const raw = loader.readFile(absolutePath);
    const parsed = JSON.parse(raw) as Partial<PluginManifestDeclaration> & {
      rid?: string;
      name?: string;
    };
    const name = parsed.name ?? absolutePath;
    const rid = pluginManifestRid(parsed.rid ?? `plugin:${name}`);
    return {
      rid,
      name,
      version: parsed.version ?? "0.0.0",
      requiresClaudeCodeVersion: parsed.requiresClaudeCodeVersion ?? "*",
      compatibleSchemaVersions: parsed.compatibleSchemaVersions ?? "*",
      mcpServers: parsed.mcpServers ?? {},
      hooks: parsed.hooks ?? [],
      managedSettingsFragments: parsed.managedSettingsFragments,
      monitors: parsed.monitors,
    };
  }

  /**
   * Validates a registered manifest against its declared allowlist and
   * basic structural invariants (unique MCP server IDs, semver shape).
   */
  validate(
    rid: PluginManifestRid,
    ccVersion: string,
    allowlistRegistry: HookEventAllowlistRegistry,
    hookLoader: HookEventAllowlistValidationContext,
  ): PluginManifestValidationResult {
    const decl = this.manifests.get(rid);
    const structural: Array<PluginManifestValidationResult["structural"][number]> = [];
    if (decl === undefined) {
      structural.push({
        kind: "missing_required_field",
        detail: `unknown manifest rid: ${rid}`,
      });
      return {
        hookEvents: { invalidEvents: [], deprecatedEvents: [] },
        structural,
      };
    }

    if (!/^\d+\.\d+\.\d+/.test(decl.version)) {
      structural.push({
        kind: "invalid_semver",
        detail: `plugin version is not semver: ${decl.version}`,
      });
    }

    const seenServers = new Set<string>();
    for (const id of Object.keys(decl.mcpServers)) {
      if (seenServers.has(id)) {
        structural.push({
          kind: "duplicate_mcp_server",
          detail: `duplicate MCP server id: ${id}`,
        });
      }
      seenServers.add(id);
    }

    const hookFiles = decl.hooks.map((_, idx) => `${decl.rid}#hooks[${idx}]`);
    const hookEvents = allowlistRegistry.validate(hookFiles, ccVersion, {
      readEvents: (file: string) => {
        const match = /#hooks\[(\d+)\]$/.exec(file);
        if (match === null) return [];
        const idx = Number.parseInt(match[1] ?? "", 10);
        const hook = decl.hooks[idx];
        return hook === undefined ? [] : [hook.event];
      },
    });
    void hookLoader;

    return { hookEvents, structural };
  }
}

export const PLUGIN_MANIFEST_REGISTRY = new PluginManifestRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "Claude Code plugin .claude-plugin/plugin.json schema; no Foundry equivalent",
};
export { categoryFoundryEquivalent as pluginManifestFoundryEquivalent };
