// palantir-mini v3.7.0 — hooks/session-duration-alarm/policy.ts
// Limit override + agent-related tool detection.
// Extracted from session-duration-alarm.ts during A.1 decomposition.

import { DEFAULT_WARN_SEC, DEFAULT_BLOCK_SEC } from "./types";

export function getLimitSeconds(): { warnSec: number; blockSec: number } {
  const override = parseInt(process.env.CLAUDE_CODE_SESSION_DURATION_LIMIT_SEC ?? "", 10);
  if (!isNaN(override) && override > 0) {
    return { warnSec: Math.floor(override * 0.75), blockSec: override };
  }
  return { warnSec: DEFAULT_WARN_SEC, blockSec: DEFAULT_BLOCK_SEC };
}

export function isAgentRelatedTool(toolName: string | undefined): boolean {
  if (!toolName) return false;
  const lower = toolName.toLowerCase();
  return lower.includes("agent") || lower.includes("spawn") || lower === "subagentstart";
}
