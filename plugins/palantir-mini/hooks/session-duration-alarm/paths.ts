// palantir-mini v3.7.0 — hooks/session-duration-alarm/paths.ts
// Path resolution helpers for alarm-state + broadcasts.
// Extracted from session-duration-alarm.ts during A.1 decomposition.

import * as path from "path";
import type { HookPayload } from "./types";

export function resolveSessionId(p: HookPayload): string {
  return p.session_id ?? process.env.CLAUDE_SESSION_ID ?? "default";
}

export function alarmDir(sessionId: string): string {
  return path.join("/tmp", "palantir-mini-hooks", sessionId);
}

export function alarmStatePath(sessionId: string): string {
  return path.join(alarmDir(sessionId), "session-alarm.json");
}

export function broadcastsPath(sessionId: string): string {
  return path.join(alarmDir(sessionId), "lead-broadcasts.jsonl");
}
