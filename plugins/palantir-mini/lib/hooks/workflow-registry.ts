export type PalantirMiniRuntime = "claude" | "codex" | "gemini";

export type HookWorkflowEvent =
  | "PreToolUse"
  | "PostToolUse"
  | "UserPromptSubmit"
  | "SessionStart"
  | "Stop"
  | "PreCompact"
  | "PostCompact"
  | "TaskCreated"
  | "TaskCompleted"
  | "TeammateIdle"
  | "SubagentStart"
  | "SubagentStop";

export interface HookWorkflowDeclaration {
  readonly workflowId: string;
  readonly event: HookWorkflowEvent;
  readonly ownerRuntime: "shared" | PalantirMiniRuntime;
  readonly purpose: string;
  readonly mountAuthority: "runtime-local";
}

export interface RuntimeHookMountProjection {
  readonly runtime: PalantirMiniRuntime;
  readonly supportedEvents: readonly HookWorkflowEvent[];
  readonly unsupportedEvents: readonly HookWorkflowEvent[];
  readonly schemaOnlyEvents: readonly HookWorkflowEvent[];
  readonly workflows: readonly HookWorkflowDeclaration[];
  readonly mountAuthority: "runtime-local";
}

export const CODEX_UNSUPPORTED_HOOK_EVENTS: readonly HookWorkflowEvent[] = [
  "PreToolUse",
];

export const CODEX_SCHEMA_ONLY_HOOK_EVENTS: readonly HookWorkflowEvent[] = [];

export const CLAUDE_ONLY_HOOK_EVENTS: readonly HookWorkflowEvent[] = [
  "TaskCreated",
  "TaskCompleted",
  "TeammateIdle",
];

export const GEMINI_UNSUPPORTED_HOOK_EVENTS: readonly HookWorkflowEvent[] = [
  "SubagentStart",
  "SubagentStop",
];

export const HOOK_WORKFLOW_REGISTRY: readonly HookWorkflowDeclaration[] = [
  {
    workflowId: "prompt-front-door-capture",
    event: "UserPromptSubmit",
    ownerRuntime: "shared",
    purpose: "Capture prompt identity before SIC/DTC routing.",
    mountAuthority: "runtime-local",
  },
  {
    workflowId: "pre-mutation-governance",
    event: "PreToolUse",
    ownerRuntime: "shared",
    purpose: "Check protected mutations against approved contract boundaries.",
    mountAuthority: "runtime-local",
  },
  {
    workflowId: "post-tool-lineage",
    event: "PostToolUse",
    ownerRuntime: "shared",
    purpose: "Record tool-result lineage and decision evidence.",
    mountAuthority: "runtime-local",
  },
  {
    workflowId: "session-start-brief",
    event: "SessionStart",
    ownerRuntime: "shared",
    purpose: "Surface overlay, harness, and value-grade session context.",
    mountAuthority: "runtime-local",
  },
  {
    workflowId: "session-stop-closeout",
    event: "Stop",
    ownerRuntime: "shared",
    purpose: "Run terminal session checks and closeout context.",
    mountAuthority: "runtime-local",
  },
  {
    workflowId: "precompact-integrity",
    event: "PreCompact",
    ownerRuntime: "shared",
    purpose: "Validate lineage and state before compaction.",
    mountAuthority: "runtime-local",
  },
  {
    workflowId: "postcompact-state-restore",
    event: "PostCompact",
    ownerRuntime: "shared",
    purpose: "Restore compacted state after compaction.",
    mountAuthority: "runtime-local",
  },
  {
    workflowId: "subagent-start-lifecycle",
    event: "SubagentStart",
    ownerRuntime: "shared",
    purpose: "Capture subagent start briefing where the runtime exposes a compatible event.",
    mountAuthority: "runtime-local",
  },
  {
    workflowId: "subagent-stop-lifecycle",
    event: "SubagentStop",
    ownerRuntime: "shared",
    purpose: "Capture subagent stop handoff and output-contract evidence where the runtime exposes a compatible event.",
    mountAuthority: "runtime-local",
  },
];

export const CLAUDE_ONLY_HOOK_WORKFLOW_REGISTRY: readonly HookWorkflowDeclaration[] = [
  {
    workflowId: "claude-task-created-lifecycle",
    event: "TaskCreated",
    ownerRuntime: "claude",
    purpose: "Claude-native task creation granularity and ownership gate.",
    mountAuthority: "runtime-local",
  },
  {
    workflowId: "claude-task-completed-lifecycle",
    event: "TaskCompleted",
    ownerRuntime: "claude",
    purpose: "Claude-native task completion output-contract and inbox cleanup gate.",
    mountAuthority: "runtime-local",
  },
  {
    workflowId: "claude-teammate-idle-lifecycle",
    event: "TeammateIdle",
    ownerRuntime: "claude",
    purpose: "Claude Agent Teams idle digest and auto-shutdown policy.",
    mountAuthority: "runtime-local",
  },
];

function unique<T>(values: readonly T[]): readonly T[] {
  return Array.from(new Set(values));
}

export function projectRuntimeHookMount(
  runtime: PalantirMiniRuntime,
): RuntimeHookMountProjection {
  const workflows: readonly HookWorkflowDeclaration[] = runtime === "claude"
    ? [...HOOK_WORKFLOW_REGISTRY, ...CLAUDE_ONLY_HOOK_WORKFLOW_REGISTRY]
    : HOOK_WORKFLOW_REGISTRY;
  const allEvents = unique(workflows.map((workflow) => workflow.event));
  if (runtime === "claude") {
    return {
      runtime,
      supportedEvents: allEvents,
      unsupportedEvents: [],
      schemaOnlyEvents: [],
      workflows,
      mountAuthority: "runtime-local",
    };
  }

  const runtimeUnsupported = runtime === "gemini"
    ? GEMINI_UNSUPPORTED_HOOK_EVENTS
    : CODEX_UNSUPPORTED_HOOK_EVENTS;
  const unsupported = new Set(runtimeUnsupported);
  const schemaOnly = new Set(runtime === "gemini" ? [] : CODEX_SCHEMA_ONLY_HOOK_EVENTS);
  return {
    runtime,
    supportedEvents: allEvents.filter((event) => !unsupported.has(event) && !schemaOnly.has(event)),
    unsupportedEvents: allEvents.filter((event) => unsupported.has(event)),
    schemaOnlyEvents: allEvents.filter((event) => schemaOnly.has(event)),
    workflows,
    mountAuthority: "runtime-local",
  };
}

export function codexUnsupportedHookSummary(): string {
  const projection = projectRuntimeHookMount("codex");
  return [
    `unsupported=${projection.unsupportedEvents.join(",") || "none"}`,
    `schemaOnly=${projection.schemaOnlyEvents.join(",") || "none"}`,
  ].join("; ");
}
