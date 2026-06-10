/**
 * lib/ontology-graph/indexers/agents-rules.ts — Second concrete indexer for the
 * in-memory OntologyGraphStore (PR 2.5 sprint-082).
 *
 * @stable
 *
 * Authority chain:
 *   ~/AGENTS.md + ~/.codex/AGENTS.md + ~/.claude/rules/*.md + plugin/agents/*.md (sources walked)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer — NOT called here)
 *     → this file (pure fragment producer; no live store mutation)
 *     → PR 2.6+ orchestration layer (loads fragments into a live store)
 *
 * D/L/A domain: DATA — walks filesystem AGENTS.md + rule .md + agent definition .md
 * files and emits a flat { nodes, edges } fragment. No event emission, no store
 * mutation, no Convex.
 *
 * IMPLEMENTATION NOTE: Uses generic-only emission (Option A per sprint-082/spec.md §2
 * inheriting sprint-081/spec.md §2.2). Local payload interfaces (RulePayload /
 * AgentDefinitionPayload) mirror the PR 2.1 RuleDeclaration / AgentDefinitionDeclaration
 * field shapes but do NOT import from @palantirKC/ontology-shared-core (snapshot at
 * runtime-overlay/ predates PR 2.1+2.2; importing fails with TS2307). When snapshot is
 * refreshed, local interfaces become drop-in compatible.
 *
 * Walk targets:
 *   - ${projectRoot}/AGENTS.md                          (universal agent file)
 *   - ${projectRoot}/.codex/AGENTS.md                   (Codex runtime overlay)
 *   - ${projectRoot}/.claude/rules/*.md                 (16+ rule files including BROWSE/CORE/CONTEXT)
 *   - ${projectRoot}/.claude/agents/*.md                (user-scope Claude agents; may be empty)
 *   - ${projectRoot}/.claude/plugins/palantir-mini/agents/*.md  (plugin-scope Claude agents)
 *
 * Edge kinds emitted:
 *   - "describes"            (structural: AGENTS.md co-located with BROWSE.md)
 *   - "gates"                (governance: rule containing gate/block/PreToolUse/PostToolUse/SessionStart)
 *   - "requiresApprovalFrom" (governance: agent with approval/Lead-only phrases)
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.3.0 (sprint-082 PR 2.5)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../types";

// ─── Local payload interfaces (Option A — no shared-core import) ──────────────

/**
 * Payload for a Rule node.
 * Mirrors PR 2.1 RuleDeclaration field shapes.
 */
interface RulePayload {
  readonly projectRoot: string;
  /** Absolute path to the rule .md file. */
  readonly filePath: string;
  /** ISO timestamp of last indexing (injectable for test determinism). */
  readonly lastIndexed: string;
  readonly byteSize: number;
  /**
   * Parsed from the leading 2-digit prefix when present.
   * e.g. "10" from "10-events-jsonl.md".
   */
  readonly ruleNumber?: number;
}

/**
 * Payload for an AgentDefinition node.
 * Mirrors PR 2.1 AgentDefinitionDeclaration field shapes.
 */
interface AgentDefinitionPayload {
  readonly projectRoot: string;
  /** Absolute path to the agent .md (or AGENTS.md). */
  readonly filePath: string;
  /** ISO timestamp of last indexing (injectable for test determinism). */
  readonly lastIndexed: string;
  readonly byteSize: number;
  /** Parsed from frontmatter `name:` field when present (simple line-regex). */
  readonly agentName?: string;
  /** Derived from path. */
  readonly scope: "universal" | "codex" | "claude-user" | "claude-plugin" | "claude-project";
}

/** Edge payload carrying a confidence score. */
interface AgentRuleEdgePayload {
  /** confidence: 0.9 for structural "describes", 0.7 for governance "gates"/"requiresApprovalFrom" */
  readonly confidence: number;
}

// ─── Brand helpers (local; mirrors browse-index.ts pattern) ───────────────────

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

// ─── RID derivation ───────────────────────────────────────────────────────────

/**
 * Deterministic NodeRid from an absolute file path.
 * sha256(absolutePath) — consistent across runs (same input → same output).
 *
 * Exported so the self-instance-edge bridge indexer (S2) can recompute the
 * file-hash rid this indexer mints for an AgentDefinition node and emit a
 * `describes` ALIAS edge from it to the canonical pm.self.ontology rid —
 * replicating the algorithm instead of forking it.
 */
export function ridFromPath(absolutePath: string): NodeRid {
  const hash = createHash("sha256").update(absolutePath).digest("hex");
  return nodeRid(`agents-rules:${hash}`);
}

/**
 * Canonical self-ontology RID for the Lead runtime adapter (Claude).
 * The "Lead" approval target is the orchestrating runtime adapter itself, not a
 * phantom `agents/lead-orchestrator.md` file (which does not exist on disk). The
 * `requiresApprovalFrom` edge therefore points at this folded self-ontology node.
 */
const RUNTIME_ADAPTER_CLAUDE_RID = nodeRid(
  "pm.self.ontology/object-type/runtime-adapter/claude",
);

/**
 * Deterministic EdgeRid from fromRid + toRid + kind.
 */
function edgeRidFromEndpoints(from: NodeRid, to: NodeRid, kind: string): EdgeRid {
  const hash = createHash("sha256").update(`${from}:${kind}:${to}`).digest("hex");
  return edgeRid(`agents-rules-edge:${hash}`);
}

// ─── Glob helpers (mirrors browse-index.ts) ───────────────────────────────────

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

// ─── Node-kind discriminator (spec §3.2) ─────────────────────────────────────

type NodeKindResult = "AgentDefinition" | "Rule" | "skip";

function discriminateNodeKind(absolutePath: string): NodeKindResult {
  const basename = path.basename(absolutePath);
  const parentDir = path.basename(path.dirname(absolutePath));

  // AGENTS.md at any depth → AgentDefinition
  if (basename === "AGENTS.md") return "AgentDefinition";

  // Parent dir is "agents" AND extension is .md AND not .archived/ → AgentDefinition
  if (parentDir === "agents" && basename.endsWith(".md") && !absolutePath.includes("/.archived/")) {
    return "AgentDefinition";
  }

  // Path contains .claude/rules/ AND extension is .md → Rule
  if (absolutePath.includes("/.claude/rules/") && basename.endsWith(".md")) return "Rule";

  return "skip";
}

// ─── Scope derivation for AgentDefinition nodes ───────────────────────────────

function deriveScope(
  absolutePath: string,
): "universal" | "codex" | "claude-user" | "claude-plugin" | "claude-project" {
  if (absolutePath.includes("/.codex/")) return "codex";
  if (absolutePath.includes("/plugins/palantir-mini/agents/")) return "claude-plugin";
  if (absolutePath.includes("/.claude/agents/")) return "claude-user";
  // AGENTS.md at project root or home root → universal
  const basename = path.basename(absolutePath);
  if (basename === "AGENTS.md") return "universal";
  return "claude-project";
}

// ─── Rule number extraction ───────────────────────────────────────────────────

/**
 * Parses the leading 2-digit prefix from a rule filename.
 * e.g. "10-events-jsonl.md" → 10; "BROWSE.md" → undefined.
 */
function extractRuleNumber(filename: string): number | undefined {
  const match = filename.match(/^(\d{2})-/);
  if (match?.[1] === undefined) return undefined;
  const n = parseInt(match[1], 10);
  return isNaN(n) ? undefined : n;
}

// ─── Agent name extraction (simple line-regex) ────────────────────────────────

/**
 * Extracts `name:` from the first 30 lines of file content (frontmatter region).
 * Returns undefined when not found.
 */
function extractAgentName(content: string): string | undefined {
  const lines = content.split("\n").slice(0, 30);
  for (const line of lines) {
    const match = line.match(/^name:\s*(.+)$/);
    if (match?.[1] !== undefined) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return undefined;
}

// ─── Governance edge detectors ────────────────────────────────────────────────

/**
 * Returns true if a rule .md content contains governance gate phrases.
 * Spec §4.2: "gate", "blocks", "PreToolUse", "PostToolUse", "SessionStart".
 */
const GATES_REGEX = /\b(gate|gates|blocks|block|PreToolUse|PostToolUse|SessionStart)\b/i;

function contentHasGatesPhrase(content: string): boolean {
  return GATES_REGEX.test(content);
}

/**
 * Returns true if an agent .md content/frontmatter contains approval phrases.
 * Spec §4.3: "requires approval from", "Lead-only", "Lead authority", "plan-mode", "opus-only".
 */
const APPROVAL_REGEX =
  /\b(requires\s+approval\s+from|Lead-only|Lead\s+authority|plan-mode|opus-only)\b/i;

function contentHasApprovalPhrase(content: string): boolean {
  return APPROVAL_REGEX.test(content);
}

// ─── File collection helpers ──────────────────────────────────────────────────

/**
 * Collects .md files from a directory pattern (non-recursive, single level).
 * Returns empty array when the directory does not exist.
 */
async function collectMdInDir(
  dirPath: string,
  excludeGlobs: ReadonlyArray<string>,
): Promise<string[]> {
  if (matchesAnyGlob(dirPath, excludeGlobs)) return [];

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    // Directory does not exist — degenerate case; return empty
    return [];
  }

  const results: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".md")) continue;
    const absPath = path.join(dirPath, entry.name);
    if (matchesAnyGlob(absPath, excludeGlobs)) continue;
    results.push(absPath);
  }
  return results;
}

// ─── Main indexer function ────────────────────────────────────────────────────

/**
 * Walk AGENTS.md + Claude rules/*.md + agent definition .md files and produce
 * a flat { nodes, edges } fragment consumable by OntologyGraphStore.
 *
 * Does NOT call store.addNode / store.addEdge — fragment emission only.
 * Cross-indexer edges (e.g. "describes" targeting a BROWSE.md node owned by
 * PR 2.4's browse-index indexer) are emitted as dangling edges; the orchestration
 * layer reconciles endpoints across indexers.
 *
 * @param projectRoot — absolute path to the project root to walk.
 * @param opts.includeGlobs — additional include globs (currently unused; walk targets are fixed).
 * @param opts.excludeGlobs — paths matching these globs are skipped.
 * @param opts.nowIso — injectable ISO timestamp for test determinism (defaults to current time).
 */
export async function indexAgentsAndRules(
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
    "**/.codex/reset-backup-*/**",
    "**/.codex/.tmp/**",
    "**/.codex/plugins/cache/**",
  ];

  // ── Pass 1: Build known-path list (spec §3.1 root anchors) ──────────────────

  // Known single-file paths (always-included root anchors)
  const knownPaths: string[] = [
    path.join(projectRoot, "AGENTS.md"),
    path.join(projectRoot, ".codex", "AGENTS.md"),
  ];

  // ── Pass 2: Glob directories for .md files ───────────────────────────────────

  const rulesDir = path.join(projectRoot, ".claude", "rules");
  const claudeAgentsDir = path.join(projectRoot, ".claude", "agents");
  const pluginAgentsDir = path.join(
    projectRoot,
    ".claude",
    "plugins",
    "palantir-mini",
    "agents",
  );

  const [rulesFiles, claudeAgentFiles, pluginAgentFiles] = await Promise.all([
    collectMdInDir(rulesDir, excludeGlobs),
    collectMdInDir(claudeAgentsDir, excludeGlobs),
    collectMdInDir(pluginAgentsDir, excludeGlobs),
  ]);

  const candidatePaths = [
    ...knownPaths,
    ...rulesFiles,
    ...claudeAgentFiles,
    ...pluginAgentFiles,
  ];

  // ── Deduplicate candidate paths ───────────────────────────────────────────

  const deduped = [...new Set(candidatePaths)];

  // ── Stat + read each candidate; build node records ────────────────────────

  const nodes: NodeRecord<unknown>[] = [];
  const nodeByPath = new Map<string, NodeRecord<unknown>>();

  // Track directories containing AgentDefinition nodes for "describes" edge derivation
  // (co-located AGENTS.md + BROWSE.md in the same directory)
  const agentNodeByDir = new Map<string, NodeRecord<unknown>>();

  for (const filePath of deduped) {
    // Skip files matching excludeGlobs
    if (matchesAnyGlob(filePath, excludeGlobs)) continue;

    const kind = discriminateNodeKind(filePath);
    if (kind === "skip") continue;

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      // File does not exist — skip silently (known-path list may over-enumerate)
      continue;
    }

    const rid = ridFromPath(filePath);
    const dir = path.dirname(filePath);

    if (kind === "Rule") {
      const payload: RulePayload = {
        projectRoot,
        filePath,
        lastIndexed: nowIso,
        byteSize: stat.size,
        ruleNumber: extractRuleNumber(path.basename(filePath)),
      };
      const node: NodeRecord<RulePayload> = {
        rid,
        kind: "Rule",
        value: payload,
      };
      nodes.push(node);
      nodeByPath.set(filePath, node);
    } else {
      // AgentDefinition
      // Read up to 100 lines for name extraction
      let content = "";
      try {
        const buf = await fs.promises.readFile(filePath, "utf-8");
        content = buf.split("\n").slice(0, 100).join("\n");
      } catch {
        // Readable failed — continue with empty content
      }

      const payload: AgentDefinitionPayload = {
        projectRoot,
        filePath,
        lastIndexed: nowIso,
        byteSize: stat.size,
        agentName: extractAgentName(content),
        scope: deriveScope(filePath),
      };
      const node: NodeRecord<AgentDefinitionPayload> = {
        rid,
        kind: "AgentDefinition",
        value: payload,
      };
      nodes.push(node);
      nodeByPath.set(filePath, node);
      agentNodeByDir.set(dir, node);
    }
  }

  // ── Edge derivation ───────────────────────────────────────────────────────

  const edges: EdgeRecord<unknown>[] = [];

  // §4.1 "describes" edges: AGENTS.md co-located with BROWSE.md in same directory
  for (const [dir, agentNode] of agentNodeByDir.entries()) {
    const colocatedBrowse = path.join(dir, "BROWSE.md");
    // Emit the edge regardless of whether BROWSE.md exists on disk
    // (dangling edges are acceptable per spec §4.1 + PR 2.4 §4.2 dangling-edge policy)
    let browseExists = false;
    try {
      await fs.promises.lstat(colocatedBrowse);
      browseExists = true;
    } catch {
      browseExists = false;
    }

    if (!browseExists) continue;

    const browseRid = ridFromPath(colocatedBrowse);
    const payload: AgentRuleEdgePayload = { confidence: 0.9 };
    const edge: EdgeRecord<AgentRuleEdgePayload> = {
      rid: edgeRidFromEndpoints(agentNode.rid, browseRid, "describes"),
      kind: "describes",
      fromRid: agentNode.rid,
      toRid: browseRid,
      value: payload,
    };
    edges.push(edge);
  }

  // §4.2 "gates" edges: rule .md content containing governance gate phrases
  for (const [filePath, node] of nodeByPath.entries()) {
    if (node.kind !== "Rule") continue;

    let content = "";
    try {
      const buf = await fs.promises.readFile(filePath, "utf-8");
      content = buf.split("\n").slice(0, 100).join("\n");
    } catch {
      continue;
    }

    if (!contentHasGatesPhrase(content)) continue;

    // Self-referential "gates" edge: the rule gates its own enforcement surface
    const selfRid = node.rid;
    const payload: AgentRuleEdgePayload = { confidence: 0.7 };
    const edge: EdgeRecord<AgentRuleEdgePayload> = {
      rid: edgeRidFromEndpoints(selfRid, selfRid, "gates"),
      kind: "gates",
      fromRid: selfRid,
      toRid: selfRid,
      value: payload,
    };
    edges.push(edge);
  }

  // §4.3 "requiresApprovalFrom" edges: agent .md containing approval phrases
  // Tracks whether the canonical Lead runtime-adapter node has been emitted yet
  // (emit once across the loop, not per matching agent file).
  let leadAdapterNodeEmitted = false;
  for (const [filePath, node] of nodeByPath.entries()) {
    if (node.kind !== "AgentDefinition") continue;

    let content = "";
    try {
      const buf = await fs.promises.readFile(filePath, "utf-8");
      content = buf.split("\n").slice(0, 100).join("\n");
    } catch {
      continue;
    }

    if (!contentHasApprovalPhrase(content)) continue;

    // Target: the orchestrating runtime adapter (Claude) folded self-ontology node.
    // Previously pointed at a phantom agents/lead-orchestrator.md path; the Lead IS
    // the runtime adapter, so the approval target is the canonical self-ontology RID.
    const leadRid = RUNTIME_ADAPTER_CLAUDE_RID;

    // Emit the Lead runtime-adapter node once (seen-set guard).
    if (!leadAdapterNodeEmitted) {
      const adapterNode: NodeRecord<{
        readonly projectRoot: string;
        readonly lastIndexed: string;
        readonly runtime: "claude";
        readonly note: string;
      }> = {
        rid: RUNTIME_ADAPTER_CLAUDE_RID,
        kind: "ObjectType",
        value: {
          projectRoot,
          lastIndexed: nowIso,
          runtime: "claude",
          note: "Lead = the orchestrating runtime adapter",
        },
      };
      nodes.push(adapterNode);
      leadAdapterNodeEmitted = true;
    }

    const payload: AgentRuleEdgePayload = { confidence: 0.7 };
    const edge: EdgeRecord<AgentRuleEdgePayload> = {
      rid: edgeRidFromEndpoints(node.rid, leadRid, "requiresApprovalFrom"),
      kind: "requiresApprovalFrom",
      fromRid: node.rid,
      toRid: leadRid,
      value: payload,
    };
    edges.push(edge);
  }

  return { nodes, edges };
}
