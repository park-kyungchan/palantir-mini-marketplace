/**
 * lib/ontology-graph/indexers/self-instance-edges.ts — Twelfth concrete indexer
 * for the in-memory OntologyGraphStore (PR-I S2 — the self-instance-edge indexer
 * + namespace bridge).
 *
 * @stable
 *
 * THE bridge slice (closes G4+G5+G6). pm's OWN wiring surface — the live Agent /
 * Skill / McpTool / Hook / Rule / McpHandler / ManagedSettingsFragment instances
 * that make pm run — is projected onto the CANONICAL self-ontology namespace
 * (`pm.self.ontology/object-type/<type>/<instanceId>`, the roles.ts:182 idiom),
 * the SAME namespace the 174 folded self-ontology primitives live under in
 * events.jsonl. So a query on a folded canonical rid surfaces these wiring edges,
 * and the file-hash nodes the sibling indexers (agents-rules / plugin-manifest)
 * mint are stitched to the canonical nodes via low-confidence `describes` ALIAS
 * edges.
 *
 * Authority chain:
 *   pluginRoot/agents/<name>.md                 (Agent instances + skill refs)
 *   pluginRoot/hooks/hooks.json                 (Hook command steps)
 *   pluginRoot/.mcp.json                        (McpTool transport surface)
 *   pluginRoot/managed-settings.d/*.json        (granted McpTool names)
 *   pluginRoot/runtime-overlay/rules/*.md       (Rule frontmatter + hookCitations)
 *   bridge/mcp-server.ts HANDLER_MODULES        (McpTool → McpHandler binding)
 *     → lib/ontology-graph/indexers/agents-rules.ts (ridFromPath — file-hash alias source)
 *     → lib/ontology-graph/indexers/plugin-manifest.ts (ridFromPathAndDiscriminator — file-hash alias source)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer — NOT called here)
 *     → this file (pure fragment producer; no live store mutation; no events.jsonl WRITE)
 *     → lib/ontology-graph/build-graph.ts (orchestrator wires this in as slot 12)
 *
 * D/L/A domain: DATA — reads pm's own wiring files (best-effort, partial-on-missing
 * like registered-primitives.ts) and emits a flat { nodes, edges } fragment. No
 * event emission, no store mutation, no Convex. NEVER writes events.jsonl.
 *
 * Node keying (load-bearing): canonical instance rids follow roles.ts:182's idiom
 * `pm.self.ontology/object-type/<objectType>/<slug(instanceId)>`, so they join the
 * folded self-ontology nodes already in the graph. BOTH endpoints of every edge are
 * always emitted (the orchestrator's pass-2 drain drops dangling edges otherwise).
 *
 * Node kinds emitted: "Agent" / "Skill" / "McpTool" / "Hook" / "Rule" /
 *   "McpHandler" / "ManagedSettingsFragment" (canonical instance nodes).
 *
 * Edge kinds emitted:
 *   - "usesTool"  (Agent → Skill — agent body references skills/<slug>)
 *   - "gates"     (Hook → Rule — rule frontmatter hookCitations names the hook)
 *   - "imports"   (McpTool → McpHandler — HANDLER_MODULES binds tool to handler)
 *   - "gates"     (ManagedSettingsFragment → McpTool — fragment allow-lists the tool)
 *   - "describes" (file-hash rid → canonical rid; confidence 0.6 ALIAS — recomputed
 *                  EXACTLY as agents-rules.ts / plugin-manifest.ts mint them)
 *
 * @owner palantirkc-ontology
 * @since palantir-mini (PR-I S2)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../types";
import { ridFromPath as agentFileHashRid } from "./agents-rules";
import { ridFromPathAndDiscriminator as manifestFileHashRid } from "./plugin-manifest";

// ─── Brand helpers (mirror sibling indexers) ──────────────────────────────────

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

// ─── Canonical-namespace rid bridge ───────────────────────────────────────────

/**
 * Slug an instance id for the canonical namespace (kebab; matches the folded
 * self-ontology rids, which are all lowercase-kebab).
 */
function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Canonical self-ontology instance rid (the roles.ts:182 idiom generalized):
 * `pm.self.ontology/object-type/<objectType>/<slug(instanceId)>`.
 */
function selfInstanceRid(objectType: string, instanceId: string): NodeRid {
  return nodeRid(`pm.self.ontology/object-type/${objectType}/${slug(instanceId)}`);
}

/** Deterministic EdgeRid from fromRid + toRid + kind (mirrors sibling indexers). */
function edgeRidFromEndpoints(from: NodeRid, to: NodeRid, kind: string): EdgeRid {
  const hash = createHash("sha256").update(`${from}:${kind}:${to}`).digest("hex");
  return edgeRid(`self-instance-edge:${hash}`);
}

// ─── Local payloads ───────────────────────────────────────────────────────────

interface SelfInstancePayload {
  readonly lastIndexed: string;
  /** The canonical objectType segment (agent / skill / hook / rule / …). */
  readonly objectType: string;
  /** The pre-slug instance id (the friendly name as authored). */
  readonly instanceId: string;
}

interface SelfEdgePayload {
  /** 0.6 for low-confidence file-hash → canonical ALIAS; 1.0 for wiring-derived edges. */
  readonly confidence: number;
}

// ─── Frontmatter parsing (simple regex; mirrors skills.ts; no js-yaml) ────────

/** Extracts a single scalar frontmatter field from the leading `---` block. */
function frontmatterScalar(content: string, key: string): string | undefined {
  const block = content.slice(0, 4096).match(/^---\n([\s\S]*?)\n---/);
  if (block?.[1] === undefined) return undefined;
  for (const line of block[1].split("\n")) {
    const m = line.match(new RegExp(`^${key}:\\s*(.+)$`));
    if (m?.[1] !== undefined) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return undefined;
}

/**
 * Extracts a flow-list frontmatter field (`key: [a, b, c]`) from the leading
 * `---` block. Returns [] when absent or empty. Strips quotes/brackets.
 */
function frontmatterList(content: string, key: string): string[] {
  const block = content.slice(0, 4096).match(/^---\n([\s\S]*?)\n---/);
  if (block?.[1] === undefined) return [];
  for (const line of block[1].split("\n")) {
    const m = line.match(new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`));
    if (m?.[1] !== undefined) {
      return m[1]
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter((s) => s.length > 0);
    }
  }
  return [];
}

// ─── Directory reads (best-effort; partial-on-missing) ────────────────────────

/** Lists files in a directory, returning [] when it does not exist. */
async function listDir(dir: string): Promise<fs.Dirent[]> {
  try {
    return await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Reads a file as utf-8, returning undefined when it does not exist. */
async function readFileOpt(absPath: string): Promise<string | undefined> {
  try {
    return await fs.promises.readFile(absPath, "utf-8");
  } catch {
    return undefined;
  }
}

// ─── HANDLER_MODULES bridge (McpTool → McpHandler) ────────────────────────────
//
// Mirror of bridge/mcp-server.ts HANDLER_MODULES. The handler instance id is the
// module basename (e.g. "emit-event" from "./handlers/emit-event"). Read at index
// time from the bundled bridge file so a tool's handler binding stays derived
// rather than re-listed — falls back to the empty map if the file is unreadable.

/** Parse `toolName: "./handlers/<basename>"` pairs out of HANDLER_MODULES. */
function parseHandlerModules(bridgeSource: string): Map<string, string> {
  const map = new Map<string, string>();
  const block = bridgeSource.match(/HANDLER_MODULES\s*:\s*Record<[^>]*>\s*=\s*\{([\s\S]*?)\n\};/);
  if (block?.[1] === undefined) return map;
  for (const line of block[1].split("\n")) {
    const m = line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*"\.\/handlers\/([a-z0-9-]+)"/);
    if (m?.[1] !== undefined && m[2] !== undefined) map.set(m[1], m[2]);
  }
  return map;
}

// ─── Main indexer ─────────────────────────────────────────────────────────────

/**
 * Project pm's own wiring surface onto the canonical self-ontology namespace and
 * emit the instance-edge fragment. Pure fragment producer — no store mutation,
 * no events.jsonl write.
 *
 * @param projectRoot — absolute project root (accepted per the locked indexer
 *   signature; the self-ontology wiring sources are resolved from `pluginRoot`).
 * @param opts.pluginRoot — absolute plugin root holding agents/ hooks/ .mcp.json
 *   managed-settings.d/ runtime-overlay/rules/ bridge/. Defaults to the plugin
 *   root three levels above this file. Tests pass a tmpdir fixture here.
 * @param opts.nowIso — injectable ISO timestamp for test determinism.
 */
export async function indexSelfInstanceEdges(
  projectRoot: string,
  opts?: { readonly nowIso?: string; readonly pluginRoot?: string },
): Promise<{
  readonly nodes: ReadonlyArray<NodeRecord<unknown>>;
  readonly edges: ReadonlyArray<EdgeRecord<unknown>>;
}> {
  void projectRoot; // signature-locked; wiring sources live under pluginRoot.
  const nowIso = opts?.nowIso ?? new Date().toISOString();
  const pluginRoot =
    opts?.pluginRoot ?? path.resolve(import.meta.dir, "..", "..", "..");

  const nodes: NodeRecord<unknown>[] = [];
  const edges: EdgeRecord<unknown>[] = [];
  const seenNodeRids = new Set<string>();
  const seenEdgeRids = new Set<string>();

  /** Emit a canonical instance node once (idempotent by rid). */
  const pushNode = (objectType: string, instanceId: string): NodeRid => {
    const rid = selfInstanceRid(objectType, instanceId);
    if (!seenNodeRids.has(rid)) {
      seenNodeRids.add(rid);
      const value: SelfInstancePayload = { lastIndexed: nowIso, objectType, instanceId };
      nodes.push({ rid, kind: capitalize(objectType), value });
    }
    return rid;
  };

  /**
   * Emit the file-hash ALIAS-source anchor node once (idempotent by rid).
   *
   * The sibling indexers (agents-rules / plugin-manifest) walk a DIFFERENT path
   * basis (`projectRoot/.claude/plugins/...`, which does not exist in this repo),
   * so the file-hash node this bridge's `describes` ALIAS edge points FROM is
   * never minted by them — and pass-2 would drop the edge as dangling. Minting
   * the anchor here makes BOTH endpoints of every ALIAS edge always present, so
   * the ALIAS describes edges SURVIVE the combined-store drain. `addNode` is an
   * idempotent upsert (store contract), so if a sibling ever converges on the
   * SAME absolute path it simply re-keys the same rid harmlessly.
   *
   * `kind` mirrors the home indexer's discriminator ("AgentDefinition" for
   * agents-rules, "Hook" for plugin-manifest) so a converged upsert stays kind-
   * consistent.
   */
  const pushFileHashNode = (rid: NodeRid, kind: string, sourcePath: string): NodeRid => {
    if (!seenNodeRids.has(rid)) {
      seenNodeRids.add(rid);
      const value = { lastIndexed: nowIso, aliasOf: sourcePath } as const;
      nodes.push({ rid, kind, value });
    }
    return rid;
  };

  /** Emit an edge once (idempotent by rid). Both endpoint nodes assumed present. */
  const pushEdge = (from: NodeRid, to: NodeRid, kind: string, confidence: number): void => {
    const rid = edgeRidFromEndpoints(from, to, kind);
    if (seenEdgeRids.has(rid)) return;
    seenEdgeRids.add(rid);
    const value: SelfEdgePayload = { confidence };
    edges.push({ rid, kind, fromRid: from, toRid: to, value });
  };

  // ── 1. Agents → Skills (usesTool) + Agent ALIAS edges ───────────────────────
  const agentsDir = path.join(pluginRoot, "agents");
  for (const entry of await listDir(agentsDir)) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const absPath = path.join(agentsDir, entry.name);
    const content = await readFileOpt(absPath);
    if (content === undefined) continue;

    const agentName = frontmatterScalar(content, "name") ?? entry.name.replace(/\.md$/, "");
    const agentRid = pushNode("agent", agentName);

    // ALIAS: file-hash rid (as agents-rules.ts mints it) → canonical agent rid.
    // Mint the file-hash anchor node here so the ALIAS edge's FROM endpoint is
    // always present (the sibling walks a non-existent path basis and never
    // mints it), keeping the describes ALIAS alive through pass-2.
    const agentAliasRid = pushFileHashNode(agentFileHashRid(absPath), "AgentDefinition", absPath);
    pushEdge(agentAliasRid, agentRid, "describes", 0.6);

    // Agent body references to skills/<slug> → Skill instances + usesTool edge.
    const skillRefs = new Set<string>();
    for (const m of content.matchAll(/skills\/([a-z0-9-]+)/g)) {
      if (m[1] !== undefined) skillRefs.add(m[1]);
    }
    for (const skillSlug of skillRefs) {
      const skillRid = pushNode("skill", skillSlug);
      pushEdge(agentRid, skillRid, "usesTool", 1.0);
    }
  }

  // ── 2. Rules → Hooks (Hook gates Rule) ──────────────────────────────────────
  const rulesDir = path.join(pluginRoot, "runtime-overlay", "rules");
  for (const entry of await listDir(rulesDir)) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const content = await readFileOpt(path.join(rulesDir, entry.name));
    if (content === undefined) continue;

    const ruleSlug =
      frontmatterScalar(content, "slug") ?? entry.name.replace(/\.md$/, "");
    const ruleRid = pushNode("rule", ruleSlug);

    // Each cited hook gates this rule (both endpoints emitted).
    for (const hookName of frontmatterList(content, "hookCitations")) {
      const hookRid = pushNode("hook", hookName);
      pushEdge(hookRid, ruleRid, "gates", 1.0);
    }
  }

  // ── 3. Hooks (hooks.json command steps) + Hook ALIAS edges ──────────────────
  const hooksJsonPath = path.join(pluginRoot, "hooks", "hooks.json");
  const hooksRaw = await readFileOpt(hooksJsonPath);
  if (hooksRaw !== undefined) {
    try {
      const parsed = JSON.parse(hooksRaw) as {
        hooks?: Record<string, Array<{ matcher?: string; policyRef?: string; hooks?: Array<{ command?: string }> }>>;
      };
      const eventGroups = parsed.hooks ?? {};
      for (const [eventKey, groups] of Object.entries(eventGroups)) {
        if (!Array.isArray(groups)) continue;
        for (const group of groups) {
          const policyRef = typeof group.policyRef === "string" ? group.policyRef : undefined;
          // Canonical hook instance id = policyRef slug (strip "hook-step:" prefix).
          const hookId = policyRef !== undefined
            ? policyRef.replace(/^hook-step:/, "")
            : undefined;
          if (hookId === undefined) continue;
          const hookRid = pushNode("hook", hookId);

          // ALIAS: each command step's file-hash rid (as plugin-manifest.ts mints
          // it) → canonical hook rid. Discriminator mirrors plugin-manifest.ts.
          const matcher = typeof group.matcher === "string" ? group.matcher : "";
          for (const step of group.hooks ?? []) {
            const cmd = typeof step.command === "string" ? step.command : "";
            if (cmd.length === 0) continue;
            const discriminator = `Hook:${eventKey}:${matcher}:${cmd.slice(0, 80)}`;
            // Mint the file-hash anchor node here (same rationale as the agent
            // ALIAS above) so the Hook describes ALIAS survives pass-2.
            const hookAliasRid = pushFileHashNode(
              manifestFileHashRid(hooksJsonPath, discriminator),
              "Hook",
              hooksJsonPath,
            );
            pushEdge(hookAliasRid, hookRid, "describes", 0.6);
          }
        }
      }
    } catch {
      // Malformed hooks.json — partial-on-missing; skip hook wiring.
    }
  }

  // ── 4. McpTools (.mcp.json + managed-settings allow) → McpHandlers (imports) ─
  const handlerModules = parseHandlerModules(
    (await readFileOpt(path.join(pluginRoot, "bridge", "mcp-server.ts"))) ?? "",
  );

  // The McpServer instance (from .mcp.json mcpServers keys) — its handler basename.
  const mcpRaw = await readFileOpt(path.join(pluginRoot, ".mcp.json"));
  const serverNames = new Set<string>();
  if (mcpRaw !== undefined) {
    try {
      const parsed = JSON.parse(mcpRaw) as { mcpServers?: Record<string, unknown> };
      for (const name of Object.keys(parsed.mcpServers ?? {})) serverNames.add(name);
    } catch {
      // Malformed .mcp.json — skip server surface.
    }
  }

  // Granted McpTool names come from managed-settings.d/*.json allow entries shaped
  // `mcp__<server>__<tool>`. Each granted tool → McpTool node; HANDLER_MODULES
  // binds it to an McpHandler (imports); the fragment gates it (ManagedSettings →
  // McpTool, gates).
  const settingsDir = path.join(pluginRoot, "managed-settings.d");
  for (const entry of await listDir(settingsDir)) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const content = await readFileOpt(path.join(settingsDir, entry.name));
    if (content === undefined) continue;

    let parsed: { permissions?: { allow?: unknown[] } };
    try {
      parsed = JSON.parse(content) as { permissions?: { allow?: unknown[] } };
    } catch {
      continue;
    }

    const fragmentRid = pushNode("managed-settings-fragment", entry.name.replace(/\.json$/, ""));
    const allow = Array.isArray(parsed.permissions?.allow) ? parsed.permissions.allow : [];
    for (const grant of allow) {
      if (typeof grant !== "string") continue;
      const m = grant.match(/^mcp__([a-z0-9-]+)__([a-z0-9_]+)$/);
      if (m?.[2] === undefined) continue;
      const toolName = m[2];
      const toolRid = pushNode("mcp-tool", toolName);

      // ManagedSettingsFragment gates the McpTool it allow-lists.
      pushEdge(fragmentRid, toolRid, "gates", 1.0);

      // McpTool imports its McpHandler (HANDLER_MODULES basename).
      const handlerBasename = handlerModules.get(toolName);
      if (handlerBasename !== undefined) {
        const handlerRid = pushNode("mcp-handler", handlerBasename);
        pushEdge(toolRid, handlerRid, "imports", 1.0);
      }
    }
  }
  void serverNames; // server surface reserved; tool bindings come from grants.

  return { nodes, edges };
}

/** Capitalize a kebab objectType segment into a PascalCase node-kind discriminator. */
function capitalize(objectType: string): string {
  return objectType
    .split("-")
    .map((s) => (s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)))
    .join("");
}
