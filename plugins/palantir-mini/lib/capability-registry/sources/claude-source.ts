// palantir-mini — lib/capability-registry/sources/claude-source.ts (W3e-2)
//
// CLAUDE_CAPABILITY_SOURCE: the Claude-runtime CapabilitySource. Discovers neutral
// CapabilityContracts from the Claude plugin artifact layout:
//   skills   ← <plugin-root>/skills/*/SKILL.md (via skill-ontology-parser)
//   mcpTools ← bridge/mcp-server.ts TOOLS array (file-scan + regex extraction)
//   agents   ← <plugin-root>/agents/*.md frontmatter (via agent-to-capability-contract)
//
// Moved verbatim out of capability-registry/index.ts (W3e-2 Step 2). The scanners
// previously resolved the plugin root internally; they now receive it via
// CapabilitySourceContext.pluginRoot so the registry (index.ts) owns root resolution
// and aggregates over resolveCapabilitySources() instead of hardcoding these scanners.

import * as fs from "node:fs";
import * as path from "node:path";
import { agentDefinitionToCapabilityContract } from "../../capability/agent-to-capability-contract";
import type { CapabilityContract } from "../../capability/capability-contract";
import {
  mcpToolSpecToCapabilityContract,
  skillContractToCapabilityContract,
} from "../../capability/capability-contract";
import { parseSkillOntologyContract } from "../../skills/skill-ontology-parser";
import type { AgentDefinitionDeclaration } from "#schemas/ontology/primitives/agent-definition";
import type { CapabilitySource, CapabilitySourceContext } from "../capability-source";

// ─── Skills loader (scans <plugin-root>/skills/*/SKILL.md) ───────────────────

function loadSkillContracts(pluginRoot: string): CapabilityContract[] {
  const skillsDir = path.join(pluginRoot, "skills");
  const contracts: CapabilityContract[] = [];

  if (!fs.existsSync(skillsDir)) return contracts;

  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  } catch {
    return contracts;
  }

  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith("_")) continue;
    const skillMdPath = path.join(skillsDir, ent.name, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;
    try {
      const markdown = fs.readFileSync(skillMdPath, "utf8");
      const skillContract = parseSkillOntologyContract(markdown, skillMdPath);
      contracts.push(skillContractToCapabilityContract(skillContract));
    } catch {
      // Skip malformed SKILL.md; do not surface noise
    }
  }

  return contracts;
}

// ─── MCP tools loader (regex-scan bridge/mcp-server.ts TOOLS array) ──────────

interface RawToolEntry {
  name: string;
  description: string;
  category?: string;
  audience?: string;
  lifecycle?: string;
  ownerModule?: string;
}

/**
 * Extract tool entries from mcp-server.ts TOOLS array via regex.
 * Approach: scan for { name: "...", description: "..." } blocks in the TOOLS
 * array literal. This avoids dynamic import (which would trigger MCP server
 * startup side-effects) while reliably extracting the declaration surface.
 *
 * Gap: does not capture multiline description string concatenations — those are
 * reassembled from the lines between { and the next } (best-effort).
 * Future PR may export a static TOOLS_MANIFEST.json via pm-codegen for zero-regex path.
 */
function loadMcpToolEntries(pluginRoot: string): RawToolEntry[] {
  const serverPath = path.join(pluginRoot, "bridge", "mcp-server.ts");
  if (!fs.existsSync(serverPath)) return [];

  let src: string;
  try {
    src = fs.readFileSync(serverPath, "utf8");
  } catch {
    return [];
  }

  const tools: RawToolEntry[] = [];

  // Find the TOOLS array: from `const TOOLS: ToolSpec[] = [` to the balanced closing `]`
  const toolsStart = src.indexOf("const TOOLS: ToolSpec[] = [");
  if (toolsStart === -1) return [];

  // The literal `const TOOLS: ToolSpec[] = [` contains a `[` in `ToolSpec[]` before the
  // actual array `[`. We want the `[` AFTER the `= ` part.
  const equalsPos = src.indexOf("= [", toolsStart);
  if (equalsPos === -1) return [];
  const openBracket = equalsPos + 2; // skip `= ` → land on `[`
  if (src[openBracket] !== "[") return [];

  // Walk character-by-character to find the matching `]`
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let toolsEnd = -1;

  for (let i = openBracket; i < src.length; i++) {
    const ch = src[i]!;
    if (inString) {
      if (ch === "\\" ) { i++; continue; } // skip escape
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "[" || ch === "{") { depth++; continue; }
    if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) { toolsEnd = i; break; }
    }
  }

  const toolsBlock = toolsEnd !== -1 ? src.slice(openBracket, toolsEnd + 1) : src.slice(openBracket);

  // Extract individual tool objects — locate each `{ name: "...", description: ...` block
  // Match `name:` followed by a string literal
  const nameRe = /name:\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;

  while ((match = nameRe.exec(toolsBlock)) !== null) {
    const toolName = match[1] ?? "";
    if (!toolName) continue;

    // Find description lines near this name occurrence
    const namePos = match.index;
    // Scan forward for `description:` within the next 2000 chars
    const lookAhead = toolsBlock.slice(namePos, namePos + 2000);

    // description may be a single-line string or multi-line string concatenation
    const descSingleRe = /description:\s*["']([^"']+)["']/;
    const descConcatRe = /description:\s*((?:"[^"]*"\s*\+?\s*)+)/;

    let description = "";
    const singleM = descSingleRe.exec(lookAhead);
    if (singleM) {
      description = singleM[1] ?? "";
    } else {
      const concatM = descConcatRe.exec(lookAhead);
      if (concatM) {
        // Remove quotes and + operators
        description = (concatM[1] ?? "")
          .replace(/"\s*\+\s*"/g, " ")
          .replace(/^"+|"+$/g, "")
          .trim();
      }
    }

    // Extract optional category, audience, lifecycle, ownerModule
    const categoryM = /category:\s*["']([^"']+)["']/.exec(lookAhead);
    const audienceM = /audience:\s*["']([^"']+)["']/.exec(lookAhead);
    const lifecycleM = /lifecycle:\s*["']([^"']+)["']/.exec(lookAhead);
    const ownerM = /ownerModule:\s*["']([^"']+)["']/.exec(lookAhead);

    tools.push({
      name: toolName,
      description: description || `MCP tool: ${toolName}`,
      category: categoryM?.[1],
      audience: audienceM?.[1],
      lifecycle: lifecycleM?.[1],
      ownerModule: ownerM?.[1],
    });
  }

  return tools;
}

function loadMcpToolContracts(tools: readonly RawToolEntry[]): CapabilityContract[] {
  return tools.map((tool) => mcpToolSpecToCapabilityContract(tool));
}

// ─── Agents loader (scans <plugin-root>/agents/*.md frontmatter) ──────────────

/**
 * Minimal frontmatter parser for agent .md files.
 * Extracts top-level YAML scalar fields: name, description, tools, model, maxTurns, etc.
 */
function parseAgentFrontmatter(markdown: string): Record<string, unknown> | null {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) return null;

  const block = normalized.slice(4, end);
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let arrayBuf: string[] = [];

  const flushArray = (): void => {
    if (currentKey !== null && arrayBuf.length > 0) {
      result[currentKey] = arrayBuf;
      arrayBuf = [];
      currentKey = null;
    }
  };

  for (const line of block.split("\n")) {
    if (line.trim() === "") continue;

    const listItem = /^\s*-\s+(.+)$/.exec(line);
    if (currentKey !== null && listItem) {
      arrayBuf.push((listItem[1] ?? "").replace(/^["']|["']$/g, "").trim());
      continue;
    }

    flushArray();

    const kvMatch = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!kvMatch) continue;
    const key = kvMatch[1] ?? "";
    const rawValue = (kvMatch[2] ?? "").trim();

    if (rawValue === "") {
      currentKey = key;
      continue;
    }

    if (rawValue === "true") { result[key] = true; continue; }
    if (rawValue === "false") { result[key] = false; continue; }
    const num = Number(rawValue);
    if (!isNaN(num) && rawValue.length > 0) { result[key] = num; continue; }

    // Inline array [a, b, c] or ["a", "b"]
    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      const inside = rawValue.slice(1, -1).trim();
      if (inside.length === 0) { result[key] = []; continue; }
      result[key] = inside.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      continue;
    }

    result[key] = rawValue.replace(/^["']|["']$/g, "");
  }

  flushArray();
  return result;
}

function loadAgentContracts(pluginRoot: string): CapabilityContract[] {
  const agentsDir = path.join(pluginRoot, "agents");
  const contracts: CapabilityContract[] = [];

  if (!fs.existsSync(agentsDir)) return contracts;

  let entries: string[] = [];
  try {
    entries = fs.readdirSync(agentsDir);
  } catch {
    return contracts;
  }

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const agentPath = path.join(agentsDir, entry);
    try {
      const markdown = fs.readFileSync(agentPath, "utf8");
      const fm = parseAgentFrontmatter(markdown);
      if (!fm) continue;

      const slug = entry.replace(/\.md$/, "");
      const name = typeof fm["name"] === "string" ? fm["name"] : slug;
      const description =
        typeof fm["description"] === "string"
          ? fm["description"]
          : `Agent: ${name}`;
      const tools = Array.isArray(fm["tools"]) ? fm["tools"].map(String) : [];
      const model = typeof fm["model"] === "string" ? fm["model"] : "sonnet";
      const maxTurns = typeof fm["maxTurns"] === "number" ? fm["maxTurns"] : 30;

      // Construct a minimal AgentDefinitionDeclaration
      const decl: AgentDefinitionDeclaration = {
        agentId: `agent:${slug}` as ReturnType<typeof import("#schemas/ontology/primitives/agent-definition").agentDefinitionRid>,
        slug,
        description,
        scope: "plugin",
        model: model as "haiku" | "sonnet" | "opus" | "inherit",
        maxTurns,
        tools,
        filePath: agentPath,
        memory: typeof fm["memory"] === "string" ? fm["memory"] as "user" | "project" | "local" | "none" : undefined,
        isolation: typeof fm["isolation"] === "string" ? fm["isolation"] as "worktree" | "none" : undefined,
      };

      // Attach extended fields that agentDefinitionToCapabilityContract reads via `as unknown`
      const extDecl = decl as unknown as Record<string, unknown>;
      if (typeof fm["requiresDtcForMutation"] === "boolean") {
        extDecl["requiresDtcForMutation"] = fm["requiresDtcForMutation"];
      }
      if (Array.isArray(fm["writable_paths"])) {
        extDecl["writable_paths"] = fm["writable_paths"];
      }
      if (Array.isArray(fm["read_paths"])) {
        extDecl["read_paths"] = fm["read_paths"];
      }
      if (typeof fm["deprecated"] === "boolean") {
        extDecl["deprecated"] = fm["deprecated"];
      }
      if (typeof fm["supersededBy"] === "string") {
        extDecl["supersededBy"] = fm["supersededBy"];
      }

      contracts.push(agentDefinitionToCapabilityContract(decl));
    } catch {
      // Skip malformed agent .md
    }
  }

  return contracts;
}

// ─── The Claude capability source ─────────────────────────────────────────────

/**
 * Claude-runtime capability discovery: skills + MCP tools + agents from the
 * plugin's Claude artifact layout. discover() returns a flat CapabilityContract[]
 * tagged by sourceKind ("skill" / "mcp-tool" / "agent"); the registry partitions.
 */
export const CLAUDE_CAPABILITY_SOURCE: CapabilitySource = {
  id: "claude",

  watchedPaths(ctx: CapabilitySourceContext): readonly string[] {
    return [
      path.join(ctx.pluginRoot, "skills"),
      path.join(ctx.pluginRoot, "agents"),
      path.join(ctx.pluginRoot, "bridge", "mcp-server.ts"),
    ];
  },

  discover(ctx: CapabilitySourceContext): readonly CapabilityContract[] {
    const skills = loadSkillContracts(ctx.pluginRoot);
    const mcpToolEntries = loadMcpToolEntries(ctx.pluginRoot);
    const mcpTools = loadMcpToolContracts(mcpToolEntries);
    const agents = loadAgentContracts(ctx.pluginRoot);
    return [...skills, ...mcpTools, ...agents];
  },
};
