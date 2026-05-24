export type HookTimeoutPolicy =
  | "fast"
  | "front-door"
  | "governance"
  | "compact"
  | "stop"
  | "heavy-audit-forbidden";

export interface HookTimeoutClassification {
  readonly policy: HookTimeoutPolicy;
  readonly event: string;
  readonly command: string;
  readonly timeoutMs: number;
}

const HEAVY_AUDIT_PATTERNS = [
  "pm_plugin_self_check",
  "pm_health_audit",
  "pm_rule_audit --full",
  "pm_substrate_query --full",
] as const;

export function classifyHookTimeout(input: {
  readonly event: string;
  readonly command: string;
  readonly timeoutSeconds?: number;
}): HookTimeoutClassification {
  const timeoutMs = Math.max(1, input.timeoutSeconds ?? 3000) * 1000;
  const command = input.command;
  let policy: HookTimeoutPolicy = "governance";
  if (HEAVY_AUDIT_PATTERNS.some((pattern) => command.includes(pattern))) {
    policy = "heavy-audit-forbidden";
  } else if (command.includes("prompt-front-door") || input.event === "UserPromptSubmit") {
    policy = "front-door";
  } else if (input.event.includes("Compact")) {
    policy = "compact";
  } else if (input.event === "Stop" || input.event === "SessionStop") {
    policy = "stop";
  } else if (timeoutMs <= 5000) {
    policy = "fast";
  }
  return {
    policy,
    event: input.event,
    command,
    timeoutMs,
  };
}
