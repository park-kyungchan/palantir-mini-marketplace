// palantir-mini v3.7.0 — hooks/session-start/types.ts
// Types extracted from session-start.ts during A.1 decomposition.

export interface HookPayload {
  session_id?: string;
  cwd?:        string;
  model?:      string;
  effort?:     string;
}

export interface HookResult {
  message:             string;
  // SessionStart additionalContext is honored by Claude ONLY at
  // hookSpecificOutput.additionalContext (nested, hookEventName "SessionStart").
  // A top-level additionalContext is silently dropped by the runtime, so the
  // fold-trigger (and every other contextLines entry) MUST ride nested here.
  hookSpecificOutput?: {
    hookEventName:     "SessionStart";
    additionalContext: string;
  };
}
