// palantir-mini — pm-plugin-self-check agent model-policy check
//
// Owner directive: "subagents are ALWAYS spawned as Sonnet with maximum
// reasoning effort and must be given the clearest possible briefs." This axis
// enforces the Sonnet half of that directive at the frontmatter layer: every
// active agent definition under agents/*.md (excluding agents/.archived/) must
// declare `model: sonnet`. A missing frontmatter `model:` field, or any value
// other than "sonnet" (e.g. a stale "opus" or "inherit" left over from a prior
// per-agent model policy), fails loud with an actionable per-file message so
// drift is caught at release time instead of silently re-introducing a
// non-Sonnet subagent.
//
// Authority:
//   - owner directive (Sonnet-only subagent model policy, this PR)
//   - rules/07-plugins-and-mcp.md (file-ownership: hook-builder writes handlers/)

import * as fs from "fs";
import * as path from "path";
import { PLUGIN_ROOT } from "./types";

export interface AgentModelPolicyCheckResult {
  status: "pass" | "fail";
  details: string;
  total: number;
  compliant: string[];
  violations: string[];
}

const EXPECTED_MODEL = "sonnet";
const MODEL_FRONTMATTER_RE = /^model:\s*(.+?)\s*$/m;

/**
 * Extracts the raw YAML frontmatter block (between the first pair of `---`
 * lines) from an agent Markdown source. Returns null when no frontmatter
 * block is present.
 */
function extractFrontmatter(source: string): string | null {
  if (!source.startsWith("---\n") && !source.startsWith("---\r\n")) return null;
  const end = source.indexOf("\n---", 4);
  if (end === -1) return null;
  return source.slice(4, end);
}

export function checkAgentModelPolicy(): AgentModelPolicyCheckResult {
  try {
    const agentsDir = path.join(PLUGIN_ROOT, "agents");
    if (!fs.existsSync(agentsDir)) {
      return {
        status: "fail",
        details: `agents/ directory not found at ${agentsDir}`,
        total: 0,
        compliant: [],
        violations: [],
      };
    }

    // Active agents only — exclude .archived/ and any other dotfile/dir.
    const files = fs
      .readdirSync(agentsDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();

    const compliant: string[] = [];
    const violations: string[] = [];

    for (const file of files) {
      const source = fs.readFileSync(path.join(agentsDir, file), "utf8");
      const frontmatter = extractFrontmatter(source);
      if (frontmatter === null) {
        violations.push(`${file}: no frontmatter block found — cannot verify model policy`);
        continue;
      }
      const match = frontmatter.match(MODEL_FRONTMATTER_RE);
      if (!match) {
        violations.push(
          `${file}: missing \`model:\` frontmatter field (expected "${EXPECTED_MODEL}")`,
        );
        continue;
      }
      const value = (match[1] ?? "").trim();
      if (value !== EXPECTED_MODEL) {
        violations.push(
          `${file}: model is "${value}", expected "${EXPECTED_MODEL}" — Sonnet-only subagent model policy violation`,
        );
        continue;
      }
      compliant.push(file);
    }

    const total = files.length;
    const isPass = total > 0 && violations.length === 0;

    return {
      status: isPass ? "pass" : "fail",
      details: isPass
        ? `all ${total} active agent(s) declare model: ${EXPECTED_MODEL}`
        : `${violations.length}/${total} active agent(s) violate the Sonnet-only subagent model policy: ` +
          violations.join("; ") +
          ` — fix by setting \`model: ${EXPECTED_MODEL}\` in each listed agent's frontmatter`,
      total,
      compliant,
      violations,
    };
  } catch (err) {
    return {
      status: "fail",
      details: `agent model-policy check error: ${err instanceof Error ? err.message : String(err)}`,
      total: 0,
      compliant: [],
      violations: [],
    };
  }
}
