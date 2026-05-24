// palantir-mini v3.7.0 — hooks/session-duration-alarm/types.ts
// Types + constants extracted from session-duration-alarm.ts during A.1 decomposition.

export interface HookPayload {
  tool_name?:  string;
  session_id?: string;
  cwd?:        string;
  event?:      string; // "SessionStart" | "UserPromptSubmit" | etc.
}

export interface AlarmState {
  sessionStartedAt: string;
  broadcastSent3h:  boolean;
}

export interface HookResult {
  message:            string;
  decision?:          "block" | "continue";
  reason?:            string;
  additionalContext?: string;
}

export const DEFAULT_WARN_SEC  = 3 * 3600;  // 3 hours
export const DEFAULT_BLOCK_SEC = 4 * 3600;  // 4 hours
