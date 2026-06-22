// palantir-mini — pm-plugin-self-check skill→tool binding guard (P1-11)
//
// SYMMETRIC counterpart to check-mcp-registration.ts. That check verifies the
// server→handler direction (every public TOOLS entry has a handler module). This
// check verifies the skill→server direction: every skill `allowed-tools:
// mcp__palantir-mini__X` token must resolve to a LIVE registered MCP tool (or be
// recorded as a deliberate removal in _deprecation-map.ts). A skill allowed-tools
// token that names no registered tool is an adapter binding that resolves to
// nothing — the same hand-maintained-surface-vs-live-state drift class as the
// bd-012 hook-seed drift (reference/harness-bottlenecks/cases/bd-012-*).
//
// Grounds:
//   - rules/07-plugins-and-mcp.md (plugin manifest + MCP registration is the
//     authoritative adapter binding; per-surface refs must resolve to it).
//   - ssot/palantir/ontology-mcp/adapter-boundary-and-governance.md: the ontology
//     core is runtime-neutral and "Claude Code … are all just MCP clients — i.e.
//     adapters"; the MCP TOOLS registry is the ONE governed binding the adapter
//     resolves against. This guard keeps the adapter face (skill decls) consistent
//     with that one registry rather than letting it hand-re-derive and drift —
//     converting the invariant from prose to enforced.
//
// Pure function (no event emit): the orchestrator emits once, mirroring the other
// check-*.ts pure functions.

import * as fs from "fs";
import * as path from "path";
import { TOOLS } from "../../mcp-server";
import { DEPRECATION_MAP } from "../_deprecation-map";
import { PLUGIN_ROOT } from "./types";

export type SkillToolClass = "dangling-removed" | "dangling-unknown";

export interface SkillToolDeclarationsCheckResult {
  status: "pass" | "fail" | "skipped"; // skipped when skills/ absent
  details: string; // human summary
  skillCount: number; // SKILL.md files scanned
  danglingRefs: Array<{
    skill: string;
    tool: string;
    class: SkillToolClass;
    replacement?: string;
  }>;
}

/** mcp__palantir-mini__<token> extractor (token = [A-Za-z0-9_]+). */
const TOOL_TOKEN_RE = /mcp__palantir-mini__([a-zA-Z0-9_]+)/g;

/**
 * Pure token classifier — unit-testable without filesystem access.
 * Returns null when the tool resolves to a live registry entry; otherwise a
 * finding fragment with the dangling class and (for removed tools) the
 * dep-map replacement.
 */
export function classifySkillTool(
  tool: string,
  live: ReadonlySet<string>,
  removed: ReadonlySet<string>,
): { class: SkillToolClass; replacement?: string } | null {
  if (live.has(tool)) return null;
  if (removed.has(tool)) {
    return {
      class: "dangling-removed",
      replacement: DEPRECATION_MAP.find((e) => e.removed === tool)?.replacement,
    };
  }
  return { class: "dangling-unknown" };
}

/**
 * Self-contained frontmatter `allowed-tools` parser (no shared dependency),
 * matching the zero-extra-coupling style of the sibling checks. Tolerates BOTH
 * space- and comma-separated values (pm-orchestrate uses commas).
 */
function extractAllowedToolTokens(source: string): string[] {
  const fmMatch = source.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch || typeof fmMatch[1] !== "string") return [];
  const block = fmMatch[1];
  const tokens: string[] = [];
  for (const line of block.split("\n")) {
    const lineMatch = line.match(/^allowed-tools:\s*(.*)$/);
    if (!lineMatch || typeof lineMatch[1] !== "string") continue;
    let m: RegExpExecArray | null;
    const re = new RegExp(TOOL_TOKEN_RE.source, "g");
    while ((m = re.exec(lineMatch[1])) !== null) {
      if (typeof m[1] === "string") tokens.push(m[1]);
    }
  }
  return tokens;
}

/**
 * List skill subdirectories that contain a SKILL.md (same selector as
 * check-declarations.ts checkDeclaredSkills: skip `_shared`/`_*` and dotfiles).
 */
function listSkillMdFiles(skillsDir: string): Array<{ skill: string; file: string }> {
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const out: Array<{ skill: string; file: string }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) {
      continue;
    }
    const skillMdPath = path.join(skillsDir, entry.name, "SKILL.md");
    if (fs.existsSync(skillMdPath)) {
      out.push({ skill: entry.name, file: skillMdPath });
    }
  }
  return out.sort((a, b) => a.skill.localeCompare(b.skill));
}

/**
 * Skill→tool binding guard. Every skill `allowed-tools: mcp__palantir-mini__X`
 * must resolve to a live TOOLS entry; otherwise the ref is dangling (classified
 * `dangling-removed` when recorded in _deprecation-map.ts, else `dangling-unknown`).
 */
export function checkSkillToolDeclarations(
  pluginRoot: string = PLUGIN_ROOT,
): SkillToolDeclarationsCheckResult {
  const skillsDir = path.join(pluginRoot, "skills");
  if (!fs.existsSync(skillsDir)) {
    return {
      status: "skipped",
      details: `skills/ not found at ${pluginRoot}`,
      skillCount: 0,
      danglingRefs: [],
    };
  }

  const live = new Set(TOOLS.map((t) => t.name));
  const removed = new Set(DEPRECATION_MAP.map((e) => e.removed));

  const skillFiles = listSkillMdFiles(skillsDir);
  const danglingRefs: SkillToolDeclarationsCheckResult["danglingRefs"] = [];

  for (const { skill, file } of skillFiles) {
    let source: string;
    try {
      source = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const seen = new Set<string>();
    for (const tool of extractAllowedToolTokens(source)) {
      if (seen.has(tool)) continue;
      seen.add(tool);
      const finding = classifySkillTool(tool, live, removed);
      if (finding) {
        danglingRefs.push({
          skill,
          tool,
          class: finding.class,
          ...(finding.replacement !== undefined ? { replacement: finding.replacement } : {}),
        });
      }
    }
  }

  const status: "pass" | "fail" = danglingRefs.length > 0 ? "fail" : "pass";
  const details =
    status === "pass"
      ? `Skill→tool bindings consistent: ${skillFiles.length} SKILL.md scanned; every allowed-tools mcp__palantir-mini__X resolves to a live TOOLS entry (${live.size} live tools).`
      : `Skill→tool binding drift: ${danglingRefs.length} dangling ref(s) across ${skillFiles.length} SKILL.md — ${danglingRefs
          .map((r) => `${r.skill}:${r.tool} (${r.class}${r.replacement ? ` → ${r.replacement}` : ""})`)
          .join(", ")}.`;

  return {
    status,
    details,
    skillCount: skillFiles.length,
    danglingRefs,
  };
}
