// palantir-mini v3.7.0 — hooks/rule-audit/types.ts
// Types extracted from rule-audit.ts during A.1 decomposition.

export type RuleAuditMode = "bottleneck" | "drift" | "citation";

export interface HookPayload {
  cwd?:           string;
  session_id?:    string;
  tool_input?:    { file_path?: string };
  tool_response?: unknown;
}

export interface AuditResult {
  findings: Array<{
    kind:     string;
    severity: string;
    detail:   string;
    ruleId?:  number;
    measured?: number;
    ceiling?:  number;
  }>;
  summary: {
    totalFindings:   number;
    byKind:          Record<string, number>;
    bySeverity:      Record<string, number>;
    registeredRules: number;
  };
}

export interface KnownRule {
  ruleId:       number;
  supersededBy: number | null;
}

export interface HookResult {
  message:    string;
  decision?:  "block" | "continue";
  reason?:    string;
}
