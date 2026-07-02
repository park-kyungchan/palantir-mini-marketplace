#!/usr/bin/env bun
/**
 * palantir-mini — gen-cartography (auto-generated cartography pages)
 *
 * Regenerates the source-derived half of the CartoGraphy documentation set:
 *   - cartography/SKILLS.md  <- skills/<name>/SKILL.md frontmatter
 *   - cartography/AGENTS.md  <- agents/<name>.md frontmatter
 *   - cartography/HOOKS.md   <- hooks/hooks.json
 *   - cartography/TOOLS.md   <- bridge/mcp-server.ts TOOLS[] + HANDLER_MODULES,
 *                               cross-referenced against
 *                               lib/capability-registry/mcp-tool-capability.ts
 *
 * cartography/CARTOGRAPHY.md and cartography/DATAFLOW.md are hand-written and
 * are NOT touched by this script.
 *
 * Determinism: every generator below sorts its rows by a stable key (or, for
 * HOOKS.md, preserves the source hooks.json order verbatim) and emits no
 * timestamps or other non-deterministic content, so `--check` diffing is
 * meaningful run over run.
 *
 * Flags:
 *   (none)     regenerate and write all 4 files under cartography/
 *   --check    regenerate in memory, diff against the committed files, print
 *              a per-file OK/DRIFT status line, exit 1 if any file differs or
 *              is missing (exit 0 if all match)
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(import.meta.dir, "..");
const CARTOGRAPHY_DIR = path.join(ROOT, "cartography");
const SKILLS_DIR = path.join(ROOT, "skills");
const AGENTS_DIR = path.join(ROOT, "agents");
const HOOKS_JSON_PATH = path.join(ROOT, "hooks", "hooks.json");
const MCP_SERVER_PATH = path.join(ROOT, "bridge", "mcp-server.ts");

const CHECK = process.argv.includes("--check");

function header(fileName: string, sources: readonly string[]): string {
  return `<!-- GENERATED FILE — do not edit. Regenerate: bun run gen:cartography (source: ${sources.join(", ")}) -->\n\n`;
}

// ─── shared frontmatter parsing ─────────────────────────────────────────────

/**
 * Extract the YAML frontmatter block (between the first two `---` lines) as
 * raw text. Returns "" when no frontmatter block is present.
 */
function extractFrontmatterBlock(content: string): string {
  if (!content.startsWith("---")) return "";
  const firstBreak = content.indexOf("\n");
  if (firstBreak === -1) return "";
  const closeIdx = content.indexOf("\n---", firstBreak);
  if (closeIdx === -1) return "";
  return content.slice(firstBreak + 1, closeIdx);
}

/**
 * Extract a single scalar frontmatter field's raw value (handles both
 * `field: value` and `field: "value"` forms; does not attempt full YAML —
 * good enough for the flat scalar fields used across SKILL.md/agents/*.md).
 * Returns undefined when the field is absent or spans multiple lines (block
 * scalars like `description: >` are handled separately by callers that need
 * them).
 */
function extractScalarField(frontmatter: string, field: string): string | undefined {
  const re = new RegExp(`^${field}:[ \\t]*(.*)$`, "m");
  const m = frontmatter.match(re);
  if (!m) return undefined;
  const raw = (m[1] ?? "").trim();
  if (raw === "" || raw === ">" || raw === "|" || raw === ">-" || raw === "|-") {
    // Block scalar — caller must use extractBlockField for the folded text.
    return undefined;
  }
  return stripQuotes(raw);
}

function stripQuotes(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Extract a YAML ">"/"|" folded or literal block scalar field's rendered text
 * (joins continuation lines with a single space, mirroring YAML folded-scalar
 * semantics closely enough for a 1-line description summary).
 */
function extractBlockField(frontmatter: string, field: string): string | undefined {
  const lines = frontmatter.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const m = line.match(new RegExp(`^${field}:[ \\t]*([>|][-+]?)[ \\t]*$`));
    if (!m) continue;
    const bodyLines: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const cur = lines[j] ?? "";
      if (cur.trim() === "") continue;
      if (!/^\s/.test(cur)) break; // dedented -> next top-level key
      bodyLines.push(cur.trim());
    }
    return bodyLines.join(" ").trim();
  }
  return undefined;
}

/** Read a field that may be a scalar or a YAML block scalar. */
function extractField(frontmatter: string, field: string): string | undefined {
  return extractScalarField(frontmatter, field) ?? extractBlockField(frontmatter, field);
}

function truncate(text: string, maxLen: number): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLen) return singleLine;
  return singleLine.slice(0, maxLen - 1).trimEnd() + "…";
}

function escapeTableCell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

// ─── 1. cartography/SKILLS.md ───────────────────────────────────────────────

interface SkillRow {
  name: string;
  model?: string;
  effort?: string;
  category?: string;
  surfaceStatus?: string;
  description: string;
}

function discoverSkillDirs(): string[] {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_shared")
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function parseSkillRow(skillName: string): SkillRow | undefined {
  const mdPath = path.join(SKILLS_DIR, skillName, "SKILL.md");
  if (!fs.existsSync(mdPath)) return undefined;
  const content = fs.readFileSync(mdPath, "utf-8");
  const fm = extractFrontmatterBlock(content);
  const name = extractField(fm, "name") ?? skillName;
  const description = extractField(fm, "description") ?? "";
  return {
    name,
    model: extractField(fm, "model"),
    effort: extractField(fm, "effort"),
    category: extractField(fm, "category"),
    surfaceStatus: extractField(fm, "surfaceStatus"),
    description,
  };
}

function isDeprecatedStatus(status: string | undefined): boolean {
  return status === "deprecated-candidate" || status === "delete-candidate";
}

function generateSkillsMd(): string {
  const rows = discoverSkillDirs()
    .map((name) => parseSkillRow(name))
    .filter((r): r is SkillRow => r !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));

  const lines: string[] = [];
  lines.push(header("SKILLS.md", ["skills/*/SKILL.md"]));
  lines.push("# SKILLS — generated skill map");
  lines.push("");
  lines.push(
    "One row per `skills/<name>/SKILL.md`, parsed from frontmatter. See `CARTOGRAPHY.md` " +
      "routing table (\"Add/modify a skill\") for the source-of-truth rule.",
  );
  lines.push("");
  lines.push("| Name | Model | Effort | Category / Status | Description |");
  lines.push("|---|---|---|---|---|");
  for (const row of rows) {
    const flag = isDeprecatedStatus(row.surfaceStatus) ? " ⚠️" : "";
    const categoryStatus = [row.category, row.surfaceStatus].filter((v) => v !== undefined).join(" / ");
    lines.push(
      `| ${escapeTableCell(row.name)}${flag} | ${row.model ?? "—"} | ${row.effort ?? "—"} | ${escapeTableCell(categoryStatus || "—")} | ${escapeTableCell(truncate(row.description, 110))} |`,
    );
  }

  const deprecated = rows.filter((r) => isDeprecatedStatus(r.surfaceStatus));
  if (deprecated.length > 0) {
    lines.push("");
    lines.push("## Deprecated / Delete candidates");
    lines.push("");
    lines.push("| Name | Status | Description |");
    lines.push("|---|---|---|");
    for (const row of deprecated) {
      lines.push(
        `| ${escapeTableCell(row.name)} | ${row.surfaceStatus ?? "—"} | ${escapeTableCell(truncate(row.description, 110))} |`,
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}

// ─── 2. cartography/AGENTS.md ───────────────────────────────────────────────

interface AgentRow {
  name: string;
  model?: string;
  maxTurns?: string;
  tools: string[];
  description: string;
}

function discoverAgentFiles(): string[] {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  return fs
    .readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".md"))
    .map((d) => d.name.replace(/\.md$/, ""))
    .sort((a, b) => a.localeCompare(b));
}

function parseToolsField(frontmatter: string): string[] {
  const raw = extractScalarField(frontmatter, "tools");
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function parseAgentRow(agentName: string): AgentRow | undefined {
  const mdPath = path.join(AGENTS_DIR, `${agentName}.md`);
  if (!fs.existsSync(mdPath)) return undefined;
  const content = fs.readFileSync(mdPath, "utf-8");
  const fm = extractFrontmatterBlock(content);
  const name = extractField(fm, "name") ?? agentName;
  const description = extractField(fm, "description") ?? "";
  return {
    name,
    model: extractField(fm, "model"),
    maxTurns: extractField(fm, "maxTurns"),
    tools: parseToolsField(fm),
    description,
  };
}

function condensedToolList(tools: string[]): string {
  if (tools.length === 0) return "(none)";
  const MAX_SHOWN = 4;
  const shown = tools.slice(0, MAX_SHOWN);
  const suffix = tools.length > MAX_SHOWN ? `, +${tools.length - MAX_SHOWN} more` : "";
  return `${tools.length} — ${shown.join(", ")}${suffix}`;
}

function generateAgentsMd(): string {
  const rows = discoverAgentFiles()
    .map((name) => parseAgentRow(name))
    .filter((r): r is AgentRow => r !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));

  const lines: string[] = [];
  lines.push(header("AGENTS.md", ["agents/*.md"]));
  lines.push("# AGENTS — generated agent map");
  lines.push("");
  lines.push(
    "One row per `agents/<name>.md` (excluding `agents/.archived/`), parsed from frontmatter. " +
      "See `CARTOGRAPHY.md` routing table (\"Add/modify an agent\") for the source-of-truth rule.",
  );
  lines.push("");
  lines.push("| Name | Model | maxTurns | Tools | Description |");
  lines.push("|---|---|---|---|---|");
  for (const row of rows) {
    lines.push(
      `| ${escapeTableCell(row.name)} | ${row.model ?? "—"} | ${row.maxTurns ?? "—"} | ${escapeTableCell(condensedToolList(row.tools))} | ${escapeTableCell(truncate(row.description, 110))} |`,
    );
  }

  lines.push("");
  lines.push(
    "Policy: all agents MUST be model: sonnet — enforced by pm_plugin_self_check mode=agent-model-policy.",
  );
  lines.push("");
  return lines.join("\n");
}

// ─── 3. cartography/HOOKS.md ────────────────────────────────────────────────

interface HooksJson {
  hooks: Record<string, HookGroupEntry[]>;
}

interface HookGroupEntry {
  matcher?: string;
  policyRef?: string;
  hooks?: RawHookCommand[];
  surfaceStatus?: string;
}

interface RawHookCommand {
  type?: string;
  command?: string;
  matcher?: string;
  timeout?: number;
  async?: boolean;
  decision?: string;
  permissionDecision?: string;
  failureMode?: string;
  statusMessage?: string;
}

function loadHooksJson(): HooksJson {
  const raw = fs.readFileSync(HOOKS_JSON_PATH, "utf-8");
  return JSON.parse(raw) as HooksJson;
}

function isBlockingEntry(cmd: RawHookCommand): boolean {
  // "Blocking" = the hook can halt the calling flow: either it runs
  // synchronously with a fail-closed failureMode, or it carries an explicit
  // blocking decision/permissionDecision. Async advisory hooks never block.
  if (cmd.async === true) return false;
  if (cmd.failureMode === "fail-closed") return true;
  if (cmd.decision === "block") return true;
  if (cmd.permissionDecision === "defer" || cmd.permissionDecision === "deny") return true;
  return false;
}

function renderHookEntryLine(cmd: RawHookCommand, groupEntry: HookGroupEntry): string {
  const parts: string[] = [];
  const policy = groupEntry.policyRef ?? groupEntry.matcher ?? "(ungrouped)";
  parts.push(`\`${policy}\``);
  parts.push(`command: \`${cmd.command ?? "—"}\``);
  const matcher = cmd.matcher ?? groupEntry.matcher;
  if (matcher !== undefined) parts.push(`matcher: \`${matcher}\``);
  parts.push(cmd.async === true ? "async" : "sync");
  if (cmd.failureMode !== undefined) parts.push(`failureMode: ${cmd.failureMode}`);
  if (cmd.timeout !== undefined) parts.push(`timeout: ${cmd.timeout}ms`);
  if (cmd.decision !== undefined) parts.push(`decision: ${cmd.decision}`);
  if (cmd.permissionDecision !== undefined) parts.push(`permissionDecision: ${cmd.permissionDecision}`);
  return `- ${parts.join(" — ")}`;
}

function generateHooksMd(): string {
  const hooksJson = loadHooksJson();
  const lines: string[] = [];
  lines.push(header("HOOKS.md", ["hooks/hooks.json"]));
  lines.push("# HOOKS — generated hook-event map");
  lines.push("");
  lines.push(
    "Mirrors `hooks/hooks.json`, grouped by lifecycle event in source (JSON key) order; " +
      "entries within a group preserve the original array order (not re-sorted). " +
      "See `CARTOGRAPHY.md` routing table (\"Add/modify a hook\") for the source-of-truth rule.",
  );
  lines.push("");

  // Preserve JSON key order for events (Object.entries preserves insertion
  // order for string keys, which is exactly what JSON.parse produces here).
  for (const [event, groupEntries] of Object.entries(hooksJson.hooks)) {
    lines.push(`## ${event}`);
    lines.push("");

    let total = 0;
    let blocking = 0;
    for (const groupEntry of groupEntries) {
      const cmds = groupEntry.hooks ?? [];
      for (const cmd of cmds) {
        total++;
        if (isBlockingEntry(cmd)) blocking++;
        lines.push(renderHookEntryLine(cmd, groupEntry));
      }
    }

    lines.push("");
    lines.push(`_${total} entr${total === 1 ? "y" : "ies"}, ${blocking} blocking._`);
    lines.push("");
  }

  return lines.join("\n");
}

// ─── 4. cartography/TOOLS.md ────────────────────────────────────────────────
//
// Extraction strategy: DIRECT IMPORT (strategy (a) from the generator spec).
//
// bridge/mcp-server.ts guards its only top-level side effect — the stdio
// JSON-RPC loop, which reads process.stdin via readline.createInterface — behind
// `if (import.meta.main) { void main(); }` at the bottom of the file. The module
// already explicitly exports `{ HANDLER_MODULES, TOOLS, handleRequest }` with the
// comment "Export for test harness", confirming import-without-execution is a
// supported, intentional use of the module. The only other module-scope code is
// a `for (const tool of TOOLS) { ... }` loop that annotates each ToolSpec with
// category/audience/ownerModule/surface metadata — pure data computation with no
// I/O, so it is safe to run at import time. We therefore import TOOLS and
// HANDLER_MODULES directly instead of parsing the file as text, which keeps this
// generator honest (it re-derives from the live module on every run, never a
// hand-copied literal) while staying simple and robust to reordering.

import type { ToolSpec } from "../bridge/mcp-server";
import {
  MCP_TOOL_SURFACE_PROFILES,
  getMcpToolCapability,
  isMcpToolVisibleInProfile,
  type McpToolSurfaceProfile,
} from "../lib/capability-registry/mcp-tool-capability";

async function loadMcpServerExports(): Promise<{
  TOOLS: ToolSpec[];
  HANDLER_MODULES: Record<string, string>;
}> {
  const mod = (await import(MCP_SERVER_PATH)) as {
    TOOLS: ToolSpec[];
    HANDLER_MODULES: Record<string, string>;
  };
  return { TOOLS: mod.TOOLS, HANDLER_MODULES: mod.HANDLER_MODULES };
}

function renderProfileCell(toolName: string, profile: McpToolSurfaceProfile): string {
  const capability = getMcpToolCapability(toolName);
  return isMcpToolVisibleInProfile(capability, profile) ? "✓" : "";
}

async function generateToolsMd(): Promise<string> {
  const { TOOLS, HANDLER_MODULES } = await loadMcpServerExports();
  const sortedTools = [...TOOLS].sort((a, b) => a.name.localeCompare(b.name));

  const lines: string[] = [];
  lines.push(header("TOOLS.md", ["bridge/mcp-server.ts", "lib/capability-registry/mcp-tool-capability.ts"]));
  lines.push("# TOOLS — generated MCP tool surface map");
  lines.push("");
  lines.push(
    `All ${sortedTools.length} MCP tools declared in \`bridge/mcp-server.ts\` TOOLS[], with ` +
      "per-profile visibility from `lib/capability-registry/mcp-tool-capability.ts` and the owning " +
      "handler module from `HANDLER_MODULES`. See `CARTOGRAPHY.md` routing table " +
      '("Add/modify an MCP handler") and `cartography/DATAFLOW.md` ("Write paths") for context.',
  );
  lines.push("");

  const profileHeaders = MCP_TOOL_SURFACE_PROFILES.map((p) => p).join(" | ");
  lines.push(`| Tool | ${profileHeaders} | Handler module | Description |`);
  lines.push(`|---|${MCP_TOOL_SURFACE_PROFILES.map(() => "---").join("|")}|---|---|`);

  for (const tool of sortedTools) {
    const profileCells = MCP_TOOL_SURFACE_PROFILES.map((p) => renderProfileCell(tool.name, p)).join(" | ");
    const handlerModule = HANDLER_MODULES[tool.name] ?? "—";
    lines.push(
      `| ${escapeTableCell(tool.name)} | ${profileCells} | \`${handlerModule}\` | ${escapeTableCell(truncate(tool.description, 110))} |`,
    );
  }

  lines.push("");
  lines.push(`_Tool count: ${sortedTools.length}._`);
  lines.push("");
  return lines.join("\n");
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

interface GeneratedFile {
  relPath: string;
  content: string;
}

async function generateAll(): Promise<GeneratedFile[]> {
  const toolsMd = await generateToolsMd();
  return [
    { relPath: "SKILLS.md", content: generateSkillsMd() },
    { relPath: "AGENTS.md", content: generateAgentsMd() },
    { relPath: "HOOKS.md", content: generateHooksMd() },
    { relPath: "TOOLS.md", content: toolsMd },
  ];
}

async function main(): Promise<void> {
  const files = await generateAll();

  if (!CHECK) {
    if (!fs.existsSync(CARTOGRAPHY_DIR)) {
      fs.mkdirSync(CARTOGRAPHY_DIR, { recursive: true });
    }
    for (const file of files) {
      fs.writeFileSync(path.join(CARTOGRAPHY_DIR, file.relPath), file.content, "utf-8");
      console.log(`WROTE cartography/${file.relPath}`);
    }
    return;
  }

  let driftCount = 0;
  for (const file of files) {
    const committedPath = path.join(CARTOGRAPHY_DIR, file.relPath);
    if (!fs.existsSync(committedPath)) {
      console.log(`${file.relPath}: MISSING`);
      driftCount++;
      continue;
    }
    const committed = fs.readFileSync(committedPath, "utf-8");
    if (committed === file.content) {
      console.log(`${file.relPath}: OK`);
    } else {
      console.log(`${file.relPath}: DRIFT`);
      driftCount++;
    }
  }

  if (driftCount > 0) {
    console.error(
      `\n${driftCount} cartography file(s) missing or stale. Run: bun run gen:cartography`,
    );
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((e) => {
    console.error("[gen-cartography] fatal:", e);
    process.exit(1);
  });
}

export {
  generateAll,
  generateSkillsMd,
  generateAgentsMd,
  generateHooksMd,
  generateToolsMd,
  discoverSkillDirs,
  discoverAgentFiles,
};
