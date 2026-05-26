export type RuntimeIdentity = "claude-code" | "codex" | "gemini" | "user" | "monitor" | "test-agent";

export function normalizeRuntimeIdentity(value: string | undefined): RuntimeIdentity | undefined {
  switch (value?.trim()) {
    case "claude":
    case "claude-code":
      return "claude-code";
    case "codex":
    case "codex-cli":
      return "codex";
    case "gemini":
    case "gemini-cli":
      return "gemini";
    case "user":
    case "monitor":
    case "test-agent":
      return value.trim() as RuntimeIdentity;
    default:
      return undefined;
  }
}

export function resolveHostRuntimeIdentity(
  value = process.env.PALANTIR_MINI_HOST_RUNTIME,
  fallback: RuntimeIdentity = "claude-code",
): RuntimeIdentity {
  return normalizeRuntimeIdentity(value) ?? fallback;
}
