// palantir-mini v3.7.0 — hooks/session-start/types.ts
// Types extracted from session-start.ts during A.1 decomposition.

export interface HookPayload {
  session_id?: string;
  cwd?:        string;
  model?:      string;
  effort?:     string;
}

export interface HookResult {
  additionalContext?: string;
  message:            string;
}
