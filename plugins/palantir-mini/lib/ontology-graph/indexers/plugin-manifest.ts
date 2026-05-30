/**
 * lib/ontology-graph/indexers/plugin-manifest.ts — Third concrete indexer for the
 * in-memory OntologyGraphStore (PR 2.6 sprint-083).
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/plugins/<plugin-id>/.codex-plugin/plugin.json (sources walked)
 *   ~/.claude/plugins/<plugin-id>/hooks/hooks.json            (sources walked)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer — NOT called here)
 *     → this file (pure fragment producer; no live store mutation)
 *     → PR 2.7+ orchestration layer (loads fragments into a live store)
 *
 * D/L/A domain: DATA — walks filesystem .codex-plugin/plugin.json + hooks/hooks.json
 * files and emits a flat { nodes, edges } fragment. No event emission, no store
 * mutation, no Convex.
 *
 * IMPLEMENTATION NOTE: Uses generic-only emission (Option A per sprint-083/spec.md §2
 * inheriting sprint-082/spec.md §2 + sprint-081/spec.md §2.2). Local payload interfaces
 * (HookPayload / McpHandlerPayload / RuntimeEntrypointPayload) mirror the PR 2.1
 * HookDeclaration / McpHandlerDeclaration / RuntimeEntrypointDeclaration field shapes
 * but do NOT import from @palantirKC/ontology-shared-core (snapshot at
 * runtime-overlay/ predates PR 2.1+2.2; importing fails with TS2307). When snapshot is
 * refreshed, local interfaces become drop-in compatible.
 *
 * Walk targets:
 *   - {projectRoot}/palantir-mini/.codex-plugin/plugin.json                  (known-path anchor)
 *   - {projectRoot}/.claude/plugins/palantir-mini/.codex-plugin/plugin.json  (Claude compatibility anchor)
 *   - {projectRoot}/.claude/plugins/palantir-browse/.codex-plugin/plugin.json (known-path anchor)
 *   - {projectRoot}/.claude/plugins/palantir-mini/hooks/hooks.json             (Claude compatibility anchor)
 *   - {projectRoot}/.claude/plugins/STAR/.codex-plugin/plugin.json            (glob extension)
 *   - {projectRoot}/.claude/plugins/STAR/hooks/hooks.json                      (glob extension)
 *
 * Excluded:
 *   - GLOB:.codex-plugin (auto-regen mirror per rule 25 v1.1.0; counting produces duplicate bug)
 *   - GLOB:node_modules, GLOB:.git, GLOB:worktrees, etc.
 *
 * Node kinds emitted:
 *   - "RuntimeEntrypoint"  (one per .codex-plugin/plugin.json)
 *   - "McpHandler"         (one per mcpServers entry in plugin.json)
 *   - "Hook"               (one per hook command entry in hooks.json)
 *
 * Edge kinds emitted:
 *   - "describes"  (structural: RuntimeEntrypoint → McpHandler; RuntimeEntrypoint → Hook)
 *   - "gates"      (governance: Hook → self-referential; hook gates its own enforcement surface)
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.4.0 (sprint-083 PR 2.6)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../types";

// ─── Local payload interfaces (Option A — no shared-core import) ──────────────

/**
 * Payload for a RuntimeEntrypoint node.
 * Mirrors PR 2.1 RuntimeEntrypointDeclaration field shapes.
 */
interface RuntimeEntrypointPayload {
  readonly projectRoot: string;
  /** Absolute path to the .codex-plugin/plugin.json file. */
  readonly filePath: string;
  /** ISO timestamp of last indexing (injectable for test determinism). */
  readonly lastIndexed: string;
  readonly byteSize: number;
  /** Parsed from plugin.json `name` field. */
  readonly pluginName?: string;
  /** Parsed from plugin.json `version` field. */
  readonly pluginVersion?: string;
}

/**
 * Payload for a McpHandler node.
 * Mirrors PR 2.1 McpHandlerDeclaration field shapes.
 */
interface McpHandlerPayload {
  readonly projectRoot: string;
  /** Absolute path to the source plugin.json. */
  readonly filePath: string;
  /** ISO timestamp of last indexing (injectable for test determinism). */
  readonly lastIndexed: string;
  readonly byteSize: number;
  /** mcpServers entry key (server name). */
  readonly handlerName: string;
  /** e.g. "stdio" from mcpServers[key].type */
  readonly transportType?: string;
}

/**
 * Payload for a Hook node.
 * Mirrors PR 2.1 HookDeclaration field shapes.
 */
interface HookPayload {
  readonly projectRoot: string;
  /** Absolute path to hooks.json. */
  readonly filePath: string;
  /** ISO timestamp of last indexing (injectable for test determinism). */
  readonly lastIndexed: string;
  readonly byteSize: number;
  /** e.g. "PreToolUse", "SessionStart" */
  readonly hookEvent: string;
  /** Optional tool matcher (e.g. "Edit|Write|MultiEdit"). */
  readonly matcher?: string;
  /** First 200 chars of the hook command for audit. */
  readonly commandFragment: string;
}

/** Edge payload carrying a confidence score. */
interface ManifestEdgePayload {
  /** confidence: 1.0 for structural "describes" (manifest→handler), 0.95 for sibling-dir "describes" (manifest→hook), 0.7 for self-referential "gates" */
  readonly confidence: number;
}

// ─── Brand helpers (local; mirrors browse-index.ts + agents-rules.ts pattern) ──

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

// ─── RID derivation ───────────────────────────────────────────────────────────

/**
 * Deterministic NodeRid from an absolute file path + discriminator string.
 * sha256(absolutePath + "#" + discriminator) — consistent across runs.
 * discriminator distinguishes RuntimeEntrypoint (plugin.json itself) vs
 * McpHandler (server-key within same plugin.json).
 */
function ridFromPathAndDiscriminator(absolutePath: string, discriminator: string): NodeRid {
  const hash = createHash("sha256")
    .update(`${absolutePath}#${discriminator}`)
    .digest("hex");
  return nodeRid(`plugin-manifest:${hash}`);
}

/**
 * Deterministic EdgeRid from fromRid + toRid + kind.
 */
function edgeRidFromEndpoints(from: NodeRid, to: NodeRid, kind: string): EdgeRid {
  const hash = createHash("sha256").update(`${from}:${kind}:${to}`).digest("hex");
  return edgeRid(`plugin-manifest-edge:${hash}`);
}

// ─── Glob helpers (mirrors agents-rules.ts) ───────────────────────────────────

/**
 * Returns true if any exclude glob pattern matches the given absolute path.
 */
function matchesAnyGlob(absolutePath: string, globs: ReadonlyArray<string>): boolean {
  for (const glob of globs) {
    if (globMatches(glob, absolutePath)) return true;
  }
  return false;
}

/**
 * Lightweight glob → regex conversion.
 * Supports `*` (any segment char, not `/`) and `**` (any chars including `/`).
 */
function globMatches(glob: string, target: string): boolean {
  const regexStr = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape special regex chars (not * or ?)
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__\//g, "(?:.+/)?")
    .replace(/__DOUBLE_STAR__/g, ".*");
  const regex = new RegExp(`(^|/)${regexStr}(/|$)`, "i");
  return regex.test(target);
}

// ─── Plugin JSON shape (permissive; malformed JSON throws naturally) ───────────

interface PluginJsonShape {
  name?: string;
  version?: string;
  description?: string;
  mcpServers?: Record<string, { type?: string; command?: string; args?: string[] }>;
}

// ─── Hooks JSON shape (permissive) ────────────────────────────────────────────

interface HookEntry {
  type?: string;
  command?: string;
  matcher?: string;
  hooks?: Array<{ type?: string; command?: string; matcher?: string }>;
}

interface HooksGroupEntry {
  matcher?: string;
  hooks?: HookEntry[];
}

type HooksJsonShape = Record<string, HooksGroupEntry[] | HookEntry[]>;

// ─── File collection helpers ──────────────────────────────────────────────────

/**
 * Collects all .codex-plugin/plugin.json paths one level below a base directory.
 * Pattern: {baseDir}/STAR/.codex-plugin/plugin.json
 * Returns empty array when the base directory does not exist.
 */
async function collectPluginJsonsInBase(
  baseDir: string,
  excludeGlobs: ReadonlyArray<string>,
): Promise<string[]> {
  if (matchesAnyGlob(baseDir, excludeGlobs)) return [];

  let pluginDirs: fs.Dirent[];
  try {
    pluginDirs = await fs.promises.readdir(baseDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: string[] = [];
  for (const entry of pluginDirs) {
    if (!entry.isDirectory()) continue;
    const pluginDir = path.join(baseDir, entry.name);
    if (matchesAnyGlob(pluginDir, excludeGlobs)) continue;

    const candidatePluginJson = path.join(pluginDir, ".codex-plugin", "plugin.json");
    if (matchesAnyGlob(candidatePluginJson, excludeGlobs)) continue;

    try {
      await fs.promises.stat(candidatePluginJson);
      results.push(candidatePluginJson);
    } catch {
      // Not present — skip
    }
  }
  return results;
}

/**
 * Collects all hooks/hooks.json paths one level below a base directory.
 * Pattern: {baseDir}/STAR/hooks/hooks.json
 * Returns empty array when the base directory does not exist.
 */
async function collectHooksJsonsInBase(
  baseDir: string,
  excludeGlobs: ReadonlyArray<string>,
): Promise<string[]> {
  if (matchesAnyGlob(baseDir, excludeGlobs)) return [];

  let pluginDirs: fs.Dirent[];
  try {
    pluginDirs = await fs.promises.readdir(baseDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: string[] = [];
  for (const entry of pluginDirs) {
    if (!entry.isDirectory()) continue;
    const pluginDir = path.join(baseDir, entry.name);
    if (matchesAnyGlob(pluginDir, excludeGlobs)) continue;

    const candidateHooksJson = path.join(pluginDir, "hooks", "hooks.json");
    if (matchesAnyGlob(candidateHooksJson, excludeGlobs)) continue;

    try {
      await fs.promises.stat(candidateHooksJson);
      results.push(candidateHooksJson);
    } catch {
      // Not present — skip
    }
  }
  return results;
}

// ─── Main indexer function ────────────────────────────────────────────────────

/**
 * Walk .codex-plugin/plugin.json + hooks/hooks.json files and produce
 * a flat { nodes, edges } fragment consumable by OntologyGraphStore.
 *
 * Does NOT call store.addNode / store.addEdge — fragment emission only.
 * Cross-indexer edges are emitted as dangling edges; the orchestration
 * layer reconciles endpoints across indexers.
 *
 * @param projectRoot — absolute path to the project root to walk.
 * @param opts.includeGlobs — additional include globs (currently unused; walk targets are fixed).
 * @param opts.excludeGlobs — paths matching these globs are skipped.
 * @param opts.nowIso — injectable ISO timestamp for test determinism (defaults to current time).
 */
export async function indexPluginManifestAndHooks(
  projectRoot: string,
  opts?: {
    readonly includeGlobs?: ReadonlyArray<string>;
    readonly excludeGlobs?: ReadonlyArray<string>;
    readonly nowIso?: string;
  },
): Promise<{
  readonly nodes: ReadonlyArray<NodeRecord<unknown>>;
  readonly edges: ReadonlyArray<EdgeRecord<unknown>>;
}> {
  const nowIso = opts?.nowIso ?? new Date().toISOString();
  const excludeGlobs = opts?.excludeGlobs ?? [
    "**/node_modules/**",
    "**/.git/**",
    "**/worktrees/**",
    "**/runtime-overlay/**",
    "**/.archived/**",
    "**/cache/**",
    "**/marketplaces/**",
  ];

  // ── Pass 1: Build known-path list (spec §3.1 root anchors) ──────────────────

  const palantirMiniRoot = path.join(projectRoot, "palantir-mini");
  const pluginsBaseDir = path.join(projectRoot, ".claude", "plugins");

  // Known single-file paths (always-included root anchors)
  const knownPluginJsonPaths: string[] = [
    path.join(palantirMiniRoot, ".codex-plugin", "plugin.json"),
    path.join(pluginsBaseDir, "palantir-mini", ".codex-plugin", "plugin.json"),
    path.join(pluginsBaseDir, "palantir-browse", ".codex-plugin", "plugin.json"),
  ];
  const knownHooksJsonPaths: string[] = [
    path.join(palantirMiniRoot, "hooks", "hooks.json"),
    path.join(pluginsBaseDir, "palantir-mini", "hooks", "hooks.json"),
  ];

  // ── Pass 2: One-level glob extension (spec §3.1 scope-extension glob) ─────────

  const [globbedPluginJsons, globbedHooksJsons] = await Promise.all([
    collectPluginJsonsInBase(pluginsBaseDir, excludeGlobs),
    collectHooksJsonsInBase(pluginsBaseDir, excludeGlobs),
  ]);

  // ── Merge + deduplicate paths ─────────────────────────────────────────────

  const allPluginJsonPaths = [...new Set([...knownPluginJsonPaths, ...globbedPluginJsons])].filter(
    (p) => !matchesAnyGlob(p, excludeGlobs),
  );
  const allHooksJsonPaths = [...new Set([...knownHooksJsonPaths, ...globbedHooksJsons])].filter(
    (p) => !matchesAnyGlob(p, excludeGlobs),
  );

  // ── Emit RuntimeEntrypoint + McpHandler nodes from plugin.json files ──────────

  const nodes: NodeRecord<unknown>[] = [];
  const edges: EdgeRecord<unknown>[] = [];

  // Map: absolute plugin dir → RuntimeEntrypoint NodeRid
  // Used for "describes" edge derivation: plugin dir → co-located hooks dir
  const pluginDirToEntrypointRid = new Map<string, NodeRid>();

  // Map: hooks.json absolute path → Hook NodeRids
  // Used to emit "describes" edges from RuntimeEntrypoint → Hook after both are collected
  const hooksJsonPathToHookRids = new Map<string, NodeRid[]>();

  for (const pluginJsonPath of allPluginJsonPaths) {
    // Skip files matching excludeGlobs
    if (matchesAnyGlob(pluginJsonPath, excludeGlobs)) continue;

    // Stat
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(pluginJsonPath);
    } catch {
      continue;
    }

    // Parse JSON (permissive — malformed throws naturally)
    let parsed: PluginJsonShape = {};
    try {
      const raw = await fs.promises.readFile(pluginJsonPath, "utf-8");
      parsed = JSON.parse(raw) as PluginJsonShape;
    } catch {
      // Unparseable — emit RuntimeEntrypoint node with minimal payload; skip mcpServers
    }

    // Emit RuntimeEntrypoint node (one per plugin.json)
    const entrypointRid = ridFromPathAndDiscriminator(pluginJsonPath, "RuntimeEntrypoint");
    const entrypointPayload: RuntimeEntrypointPayload = {
      projectRoot,
      filePath: pluginJsonPath,
      lastIndexed: nowIso,
      byteSize: stat.size,
      pluginName: parsed.name,
      pluginVersion: parsed.version,
    };
    const entrypointNode: NodeRecord<RuntimeEntrypointPayload> = {
      rid: entrypointRid,
      kind: "RuntimeEntrypoint",
      value: entrypointPayload,
    };
    nodes.push(entrypointNode);

    // Derive plugin directory for co-location lookups
    // plugin.json lives at <pluginDir>/.codex-plugin/plugin.json → pluginDir = two levels up
    const pluginDir = path.dirname(path.dirname(pluginJsonPath));
    pluginDirToEntrypointRid.set(pluginDir, entrypointRid);

    // Emit McpHandler nodes (one per mcpServers entry)
    const mcpServers = parsed.mcpServers ?? {};
    for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
      const handlerRid = ridFromPathAndDiscriminator(pluginJsonPath, `McpHandler:${serverName}`);
      const handlerPayload: McpHandlerPayload = {
        projectRoot,
        filePath: pluginJsonPath,
        lastIndexed: nowIso,
        byteSize: stat.size,
        handlerName: serverName,
        transportType: serverConfig.type,
      };
      const handlerNode: NodeRecord<McpHandlerPayload> = {
        rid: handlerRid,
        kind: "McpHandler",
        value: handlerPayload,
      };
      nodes.push(handlerNode);

      // §4.1 "describes" edge: RuntimeEntrypoint → McpHandler (confidence 1.0 — manifest literally declares it)
      const describesHandlerEdge: EdgeRecord<ManifestEdgePayload> = {
        rid: edgeRidFromEndpoints(entrypointRid, handlerRid, "describes"),
        kind: "describes",
        fromRid: entrypointRid,
        toRid: handlerRid,
        value: { confidence: 1.0 },
      };
      edges.push(describesHandlerEdge);
    }
  }

  // ── Emit Hook nodes from hooks.json files ─────────────────────────────────────

  for (const hooksJsonPath of allHooksJsonPaths) {
    if (matchesAnyGlob(hooksJsonPath, excludeGlobs)) continue;

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(hooksJsonPath);
    } catch {
      continue;
    }

    let parsed: HooksJsonShape = {};
    try {
      const raw = await fs.promises.readFile(hooksJsonPath, "utf-8");
      parsed = JSON.parse(raw) as HooksJsonShape;
    } catch {
      continue;
    }

    const hookRidsForThisFile: NodeRid[] = [];

    // Iterate all event keys (PreToolUse / PostToolUse / SessionStart / etc.)
    for (const [eventKey, eventGroups] of Object.entries(parsed)) {
      if (!Array.isArray(eventGroups)) continue;

      for (const group of eventGroups) {
        if (typeof group !== "object" || group === null) continue;

        // Support two shapes:
        // 1. { matcher, hooks: [{ type, command }] }  (grouped shape — most hooks.json entries)
        // 2. { type, command }                          (flat shape)
        const groupObj = group as HooksGroupEntry;
        const groupMatcher = groupObj.matcher;

        if (Array.isArray(groupObj.hooks)) {
          // Grouped shape: iterate inner hooks array
          for (const hookEntry of groupObj.hooks) {
            if (typeof hookEntry !== "object" || hookEntry === null) continue;
            const cmd = typeof hookEntry.command === "string" ? hookEntry.command : "";
            if (!cmd) continue;

            // Derive a unique discriminator: eventKey + matcher + first 80 chars of command
            const discriminator = `Hook:${eventKey}:${groupMatcher ?? ""}:${cmd.slice(0, 80)}`;
            const hookRid = ridFromPathAndDiscriminator(hooksJsonPath, discriminator);

            const hookPayload: HookPayload = {
              projectRoot,
              filePath: hooksJsonPath,
              lastIndexed: nowIso,
              byteSize: stat.size,
              hookEvent: eventKey,
              matcher: groupMatcher,
              commandFragment: cmd.slice(0, 200),
            };
            const hookNode: NodeRecord<HookPayload> = {
              rid: hookRid,
              kind: "Hook",
              value: hookPayload,
            };
            nodes.push(hookNode);
            hookRidsForThisFile.push(hookRid);

            // §4.2 "gates" edge: Hook → self (hook gates its own enforcement surface)
            const gatesEdge: EdgeRecord<ManifestEdgePayload> = {
              rid: edgeRidFromEndpoints(hookRid, hookRid, "gates"),
              kind: "gates",
              fromRid: hookRid,
              toRid: hookRid,
              value: { confidence: 0.7 },
            };
            edges.push(gatesEdge);
          }
        } else {
          // Flat shape: group itself is the hook entry
          const flatEntry = group as HookEntry;
          const cmd = typeof flatEntry.command === "string" ? flatEntry.command : "";
          if (!cmd) continue;

          const discriminator = `Hook:${eventKey}::${cmd.slice(0, 80)}`;
          const hookRid = ridFromPathAndDiscriminator(hooksJsonPath, discriminator);

          const hookPayload: HookPayload = {
            projectRoot,
            filePath: hooksJsonPath,
            lastIndexed: nowIso,
            byteSize: stat.size,
            hookEvent: eventKey,
            matcher: flatEntry.matcher,
            commandFragment: cmd.slice(0, 200),
          };
          const hookNode: NodeRecord<HookPayload> = {
            rid: hookRid,
            kind: "Hook",
            value: hookPayload,
          };
          nodes.push(hookNode);
          hookRidsForThisFile.push(hookRid);

          // §4.2 "gates" edge: Hook → self
          const gatesEdge: EdgeRecord<ManifestEdgePayload> = {
            rid: edgeRidFromEndpoints(hookRid, hookRid, "gates"),
            kind: "gates",
            fromRid: hookRid,
            toRid: hookRid,
            value: { confidence: 0.7 },
          };
          edges.push(gatesEdge);
        }
      }
    }

    hooksJsonPathToHookRids.set(hooksJsonPath, hookRidsForThisFile);
  }

  // ── §4.1 "describes" edges: RuntimeEntrypoint → Hook (sibling co-location) ────
  //
  // For each hooks.json, look up whether its parent plugin dir has a known
  // RuntimeEntrypoint. hooks.json lives at <pluginDir>/hooks/hooks.json → pluginDir = two levels up.

  for (const [hooksJsonPath, hookRids] of hooksJsonPathToHookRids.entries()) {
    const pluginDir = path.dirname(path.dirname(hooksJsonPath));
    const entrypointRid = pluginDirToEntrypointRid.get(pluginDir);
    if (entrypointRid === undefined) continue;

    for (const hookRid of hookRids) {
      const describesHookEdge: EdgeRecord<ManifestEdgePayload> = {
        rid: edgeRidFromEndpoints(entrypointRid, hookRid, "describes"),
        kind: "describes",
        fromRid: entrypointRid,
        toRid: hookRid,
        value: { confidence: 0.95 },
      };
      edges.push(describesHookEdge);
    }
  }

  return { nodes, edges };
}
