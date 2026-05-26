export type RuntimeId = "claude" | "codex" | "gemini";

export interface RuntimeCapabilityFacts {
  readonly runtime: RuntimeId;
  readonly nativeEvents: readonly string[];
  readonly schemaOnlyEvents: readonly string[];
  readonly nativeGaps: readonly string[];
  readonly fallbackFacts: readonly RuntimeFallbackFact[];
}

export interface RuntimeFallbackFact {
  readonly event: string;
  readonly fact: string;
  readonly fallback: string;
}

export const CLAUDE_NATIVE_EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "UserPromptSubmit",
  "Stop",
  "SubagentStop",
  "SubagentStart",
  "SessionStart",
  "SessionStop",
  "PreCompact",
  "PostCompact",
  "Notification",
  "TaskCompleted",
  "TaskCreated",
  "TeammateIdle",
] as const;

export const CODEX_NATIVE_EVENTS = [
  "SessionStart",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "UserPromptSubmit",
  "SubagentStart",
  "SubagentStop",
  "Stop",
] as const;

export const CODEX_SCHEMA_ONLY_EVENTS = [] as const;

export const CODEX_NATIVE_GAPS = [
  "TaskCreated",
  "TaskCompleted",
  "TeammateIdle",
] as const;

export const GEMINI_NATIVE_EVENTS = [
  "SessionStart",
  "SessionEnd",
  "BeforeAgent",
  "AfterAgent",
  "BeforeModel",
  "AfterModel",
  "BeforeToolSelection",
  "BeforeTool",
  "AfterTool",
  "PreCompress",
  "Notification",
] as const;

export const GEMINI_NATIVE_GAPS = [
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "Stop",
  "PreCompact",
  "PostCompact",
  "TaskCreated",
  "TaskCompleted",
  "TeammateIdle",
  "SubagentStart",
  "SubagentStop",
] as const;

export const RUNTIME_CAPABILITY_MATRIX: Record<RuntimeId, RuntimeCapabilityFacts> = {
  claude: {
    runtime: "claude",
    nativeEvents: CLAUDE_NATIVE_EVENTS,
    schemaOnlyEvents: [],
    nativeGaps: [],
    fallbackFacts: [],
  },
  codex: {
    runtime: "codex",
    nativeEvents: CODEX_NATIVE_EVENTS,
    schemaOnlyEvents: CODEX_SCHEMA_ONLY_EVENTS,
    nativeGaps: CODEX_NATIVE_GAPS,
    fallbackFacts: [
      ...CODEX_SCHEMA_ONLY_EVENTS.map((event) => ({
        event,
        fact: `Codex has hook schema/config for ${event}, but native lifecycle firing is not smoke-proven.`,
        fallback: "Treat this as schema-only evidence; do not claim parity or rely on hook side effects until a native smoke test proves firing.",
      })),
      ...CODEX_NATIVE_GAPS.map((event) => ({
        event,
        fact: `Codex does not natively observe Claude ${event} lifecycle events.`,
        fallback: "Use explicit handoff/capsule evidence or adapter inspection; do not claim parity from live-read hook config alone.",
      })),
    ],
  },
  gemini: {
    runtime: "gemini",
    nativeEvents: GEMINI_NATIVE_EVENTS,
    schemaOnlyEvents: [],
    nativeGaps: GEMINI_NATIVE_GAPS,
    fallbackFacts: [
      ...GEMINI_NATIVE_GAPS.map((event) => ({
        event,
        fact: `Gemini CLI does not expose Claude/Codex ${event} lifecycle events under that name.`,
        fallback: "Use the palantir-mini Gemini extension adapter event map and record unsupported parity claims explicitly.",
      })),
    ],
  },
};

export function runtimeCanObserveEvent(runtime: RuntimeId, event: string): boolean {
  return RUNTIME_CAPABILITY_MATRIX[runtime].nativeEvents.includes(event);
}

export function runtimeHasSchemaOnlyEvent(runtime: RuntimeId, event: string): boolean {
  return RUNTIME_CAPABILITY_MATRIX[runtime].schemaOnlyEvents.includes(event);
}

export function codexFallbackFactForEvent(event: string): RuntimeFallbackFact | null {
  return RUNTIME_CAPABILITY_MATRIX.codex.fallbackFacts.find((fact) => fact.event === event) ?? null;
}

export function geminiFallbackFactForEvent(event: string): RuntimeFallbackFact | null {
  return RUNTIME_CAPABILITY_MATRIX.gemini.fallbackFacts.find((fact) => fact.event === event) ?? null;
}
