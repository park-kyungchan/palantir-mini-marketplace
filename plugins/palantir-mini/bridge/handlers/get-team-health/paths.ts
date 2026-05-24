// palantir-mini v3.5.0 — get-team-health sibling: path builders (no fs IO)
// Pure helpers — env reads only.

import * as os from "os";
import * as path from "path";

export function homeDir(): string {
  // Respect HOME env override for test isolation; fall back to os.homedir()
  return process.env["HOME"] ?? os.homedir();
}

export function claudeTeamsRoot(): string {
  return path.join(homeDir(), ".claude", "teams");
}

export function claudeTasksRoot(): string {
  return path.join(homeDir(), ".claude", "tasks");
}

export function currentSessionId(): string {
  return process.env.CLAUDE_SESSION_ID ?? process.env.SESSION_ID ?? "unknown-session";
}

export function idleStatePath(): string {
  return path.join("/tmp", "claude-hooks", currentSessionId(), "idle-state.json");
}
