// palantir-mini v3.7.0 — hooks/subagent-stop/types.ts
// Types extracted from subagent-stop.ts during A.1 decomposition.

export interface HookPayload {
  agent_id?:   string;
  agent_name?: string;
  exit_code?:  number;
  session_id?: string;
  cwd?:        string;
  reason?:     string;
}

export interface OutputContract {
  statePath:     string;
  requiredFields: string[];
  envelopeKind?: string;
}

export interface ValidationResult {
  passed:    boolean;
  errorClass?: string;
  message?:  string;
  wrapped?:  boolean;
}

export interface HookResult {
  message:   string;
  decision?: "block" | "continue";
  reason?:   string;
}
