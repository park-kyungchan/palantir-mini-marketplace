// palantir-mini v3.7.0 — hooks/subagent-stop/agent-md.ts
// Agent definition .md lookup utilities.
// Extracted from subagent-stop.ts during A.1 decomposition.

import * as fs from "fs";
import * as path from "path";
import { resolvePalantirMiniRoot } from "../../lib/config/root";

export const AGENT_DIR_GLOBS = [
  ".claude/agents",
  path.join(process.env.HOME ?? "/home/palantirkc", ".claude/agents"),
  path.join(resolvePalantirMiniRoot(), "agents"),
];

/**
 * Finds the agent definition `.md` file for a given name.
 * Searches project-local + user-global + plugin-shipped directories.
 */
export function findAgentMd(agentName: string, cwd: string): string | null {
  if (!agentName) return null;
  const candidates = [
    path.join(cwd, ".claude/agents", `${agentName}.md`),
    path.join(process.env.HOME ?? "/home/palantirkc", ".claude/agents", `${agentName}.md`),
    path.join(resolvePalantirMiniRoot(), "agents", `${agentName}.md`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}
