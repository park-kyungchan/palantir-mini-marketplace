// palantir-mini v3.7.0 — hooks/idle-auto-shutdown/paths.ts
// Path resolution helpers for idle-state + pair-tracker JSON.
// Extracted from idle-auto-shutdown.ts during A.1 decomposition.

import * as path from "path";
import type { HookPayload } from "./types";

export function resolveSessionId(p: HookPayload): string {
  return p.session_id ?? process.env.CLAUDE_SESSION_ID ?? "default";
}

export function idleStateDir(sessionId: string): string {
  return path.join("/tmp", "claude-hooks", sessionId);
}

export function idleStatePath(sessionId: string): string {
  return path.join(idleStateDir(sessionId), "idle-state.json");
}

export function pairTrackerPath(sessionId: string): string {
  return path.join(idleStateDir(sessionId), "pair-tracker.json");
}
