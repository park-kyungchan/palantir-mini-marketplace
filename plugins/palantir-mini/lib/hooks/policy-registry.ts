import {
  CODEX_SCHEMA_ONLY_HOOK_EVENTS,
  CODEX_UNSUPPORTED_HOOK_EVENTS,
  GEMINI_UNSUPPORTED_HOOK_EVENTS,
  type HookWorkflowEvent,
  type PalantirMiniRuntime,
} from "./workflow-registry";

export type HookPolicyId =
  | "hook-policy:mutation-governance"
  | "hook-policy:post-tool-lineage"
  | "hook-policy:compaction-integrity"
  | "hook-policy:task-completion"
  | "hook-policy:session-lifecycle"
  | "hook-policy:claude-agent-lifecycle"
  | "hook-policy:prompt-front-door";

export type RuntimePolicySupport = "native" | "schema-only" | "manual" | "unsupported";

export interface HookRuntimePolicySupport {
  readonly runtime: PalantirMiniRuntime;
  readonly support: RuntimePolicySupport;
  readonly evidence: string;
}

export interface HookPolicy {
  readonly policyId: HookPolicyId;
  readonly events: readonly HookWorkflowEvent[];
  readonly purpose: string;
  readonly runtimeSupport: readonly HookRuntimePolicySupport[];
}

export type WorkflowStepPolicyId =
  | "hook-step:pretool-ontology-engineering-workflow"
  | "hook-step:pretool-plugin-ownership"
  | "hook-step:pretool-edit-governance"
  | "hook-step:pretool-schema-frontmatter"
  | "hook-step:pretool-taskupdate-concurrency"
  | "hook-step:pretool-commit-edits-governance"
  | "hook-step:pretool-emit-event-value"
  | "hook-step:pretool-agent-decision-pre"
  | "hook-step:pretool-evidence-domain-coverage"
  | "hook-step:pretool-ontology-routing-dtc"
  | "hook-step:pretool-agent-dispatch"
  | "hook-step:pretool-mutating-bash"
  | "hook-step:posttool-edit-propagation"
  | "hook-step:posttool-schema-frontmatter"
  | "hook-step:posttool-hook-citation"
  | "hook-step:posttool-doc-drift"
  | "hook-step:posttool-generated-header"
  | "hook-step:posttool-manifest-validation"
  | "hook-step:posttool-grade-rubric"
  | "hook-step:posttool-commit-edits-backprop"
  | "hook-step:posttool-emit-event-value"
  | "hook-step:posttool-agent-decision-post"
  | "hook-step:posttool-router-suggestion"
  | "hook-step:posttool-edit-watch"
  | "hook-step:posttool-write-plan-dag"
  | "hook-step:posttool-git-impact-maintenance"
  | "hook-step:posttool-agent-orchestration-audit"
  | "hook-step:posttool-taskupdate-enrichment"
  | "hook-step:precompact-lineage-integrity"
  | "hook-step:taskcompleted-inbox-clean"
  | "hook-step:stop-session-closeout"
  | "hook-step:sessionstart-cold-start-governance"
  | "hook-step:taskcreated-granularity"
  | "hook-step:teammateidle-shutdown-digest"
  | "hook-step:subagentstart-briefing"
  | "hook-step:subagentstop-heartbeat"
  | "hook-step:subagentstop-analyzer-output"
  | "hook-step:subagentstop-sprint-chain"
  | "hook-step:postcompact-state-restore"
  | "hook-step:userprompt-front-door";

export interface WorkflowStepPolicy {
  readonly policyId: WorkflowStepPolicyId;
  readonly hookPolicyId: HookPolicyId;
  readonly event: HookWorkflowEvent;
  readonly matcher?: string;
  readonly purpose: string;
}

export interface HookRuntimeParityClaim {
  readonly runtime: PalantirMiniRuntime;
  readonly support: RuntimePolicySupport;
  readonly evidence?: string;
}

export interface HookPolicyReferenceIssue {
  readonly kind:
    | "missing-policy-ref"
    | "unknown-policy-ref"
    | "event-mismatch"
    | "unsupported-parity-claim";
  readonly event: string;
  readonly policyRef?: string;
  readonly runtime?: PalantirMiniRuntime;
  readonly support?: RuntimePolicySupport;
  readonly line: number;
  readonly message: string;
}

export const HOOK_POLICY_REGISTRY: readonly HookPolicy[] = [
  {
    policyId: "hook-policy:mutation-governance",
    events: ["PreToolUse"],
    purpose: "Gate mutating tools before execution using deterministic policy checks.",
    runtimeSupport: [
      { runtime: "claude", support: "native", evidence: "Claude hooks.json PreToolUse event." },
      { runtime: "codex", support: "native", evidence: "Codex PreToolUse hook adapter event." },
    ],
  },
  {
    policyId: "hook-policy:post-tool-lineage",
    events: ["PostToolUse"],
    purpose: "Record post-tool lineage, drift, and audit maintenance after execution.",
    runtimeSupport: [
      { runtime: "claude", support: "native", evidence: "Claude hooks.json PostToolUse event." },
      { runtime: "codex", support: "native", evidence: "Codex PostToolUse hook adapter event." },
    ],
  },
  {
    policyId: "hook-policy:compaction-integrity",
    events: ["PreCompact", "PostCompact"],
    purpose: "Validate event state around compaction and restore compacted session state.",
    runtimeSupport: [
      { runtime: "claude", support: "native", evidence: "Claude compaction hook events." },
      {
        runtime: "codex",
        support: "schema-only",
        evidence: "Codex keeps compaction events in schema projection but does not claim hook parity here.",
      },
    ],
  },
  {
    policyId: "hook-policy:task-completion",
    events: ["TaskCompleted"],
    purpose: "Clean completed task inbox state and synthesize task completion evidence.",
    runtimeSupport: [
      { runtime: "claude", support: "native", evidence: "Claude TaskCompleted hook event." },
      {
        runtime: "codex",
        support: "unsupported",
        evidence: "Codex does not natively observe Claude TaskCompleted lifecycle events.",
      },
    ],
  },
  {
    policyId: "hook-policy:session-lifecycle",
    events: ["SessionStart", "Stop"],
    purpose: "Run deterministic session start and closeout governance.",
    runtimeSupport: [
      { runtime: "claude", support: "native", evidence: "Claude session lifecycle hook events." },
      { runtime: "codex", support: "native", evidence: "Codex SessionStart and Stop hook adapter events." },
    ],
  },
  {
    policyId: "hook-policy:claude-agent-lifecycle",
    events: ["TaskCreated", "TeammateIdle", "SubagentStart", "SubagentStop"],
    purpose: "Track Claude-native task and subagent lifecycle events without cross-runtime parity claims.",
    runtimeSupport: [
      { runtime: "claude", support: "native", evidence: "Claude task and subagent lifecycle hook events." },
      {
        runtime: "codex",
        support: "unsupported",
        evidence: "Codex does not natively observe Claude task or subagent lifecycle events.",
      },
    ],
  },
  {
    policyId: "hook-policy:prompt-front-door",
    events: ["UserPromptSubmit"],
    purpose: "Capture prompt identity before SIC/DTC routing and downstream advisory checks.",
    runtimeSupport: [
      { runtime: "claude", support: "native", evidence: "Claude UserPromptSubmit hook event." },
      { runtime: "codex", support: "native", evidence: "Codex UserPromptSubmit hook adapter event." },
    ],
  },
];

export const WORKFLOW_STEP_POLICY_REGISTRY: readonly WorkflowStepPolicy[] = [
  {
    policyId: "hook-step:pretool-ontology-engineering-workflow",
    hookPolicyId: "hook-policy:mutation-governance",
    event: "PreToolUse",
    matcher: "*",
    purpose: "Require FDE ontology-engineering workflow provenance before workflow-control-plane mutation proceeds.",
  },
  {
    policyId: "hook-step:pretool-plugin-ownership",
    hookPolicyId: "hook-policy:mutation-governance",
    event: "PreToolUse",
    matcher: "Edit|Write|MultiEdit",
    purpose: "Plugin ownership and write-scope enforcement for direct file mutations.",
  },
  {
    policyId: "hook-step:pretool-edit-governance",
    hookPolicyId: "hook-policy:mutation-governance",
    event: "PreToolUse",
    matcher: "Edit|Write|MultiEdit|NotebookEdit",
    purpose: "Ontology, DTC, impact, import, and delegation gates before edits.",
  },
  {
    policyId: "hook-step:pretool-schema-frontmatter",
    hookPolicyId: "hook-policy:mutation-governance",
    event: "PreToolUse",
    matcher: "**/schemas/ontology/(primitives|contracts|codegen)/**/*.ts",
    purpose: "Schema semantic frontmatter validation before ontology schema writes.",
  },
  {
    policyId: "hook-step:pretool-taskupdate-concurrency",
    hookPolicyId: "hook-policy:mutation-governance",
    event: "PreToolUse",
    matcher: "TaskUpdate",
    purpose: "TaskUpdate concurrency cap enforcement through PreToolUse matcher routing.",
  },
  {
    policyId: "hook-step:pretool-commit-edits-governance",
    hookPolicyId: "hook-policy:mutation-governance",
    event: "PreToolUse",
    matcher: "mcp__plugin_palantir-mini_palantir-mini__commit_edits|mcp__palantir_mini__commit_edits",
    purpose: "Govern commit_edits calls before ontology edits are committed.",
  },
  {
    policyId: "hook-step:pretool-emit-event-value",
    hookPolicyId: "hook-policy:mutation-governance",
    event: "PreToolUse",
    matcher: "mcp__plugin_palantir-mini_palantir-mini__emit_event",
    purpose: "Assign value-grade metadata before event emission.",
  },
  {
    policyId: "hook-step:pretool-agent-decision-pre",
    hookPolicyId: "hook-policy:mutation-governance",
    event: "PreToolUse",
    matcher:
      "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function|mcp__plugin_palantir-mini_palantir-mini__commit_edits|mcp__plugin_palantir-mini_palantir-mini__emit_event",
    purpose: "Require subagent decision evidence before privileged MCP calls.",
  },
  {
    policyId: "hook-step:pretool-evidence-domain-coverage",
    hookPolicyId: "hook-policy:mutation-governance",
    event: "PreToolUse",
    matcher:
      "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function|mcp__plugin_palantir-mini_palantir-mini__commit_edits|mcp__plugin_palantir-mini_palantir-mini__ontology_context_query|mcp__palantir_mini__apply_edit_function|mcp__palantir_mini__commit_edits|mcp__palantir_mini__ontology_context_query",
    purpose: "Require evidence-domain coverage before ontology-affecting tools proceed.",
  },
  {
    policyId: "hook-step:pretool-ontology-routing-dtc",
    hookPolicyId: "hook-policy:mutation-governance",
    event: "PreToolUse",
    matcher:
      "mcp__plugin_palantir-mini_palantir-mini__pm_intent_router|mcp__plugin_palantir-mini_palantir-mini__apply_edit_function|mcp__plugin_palantir-mini_palantir-mini__ontology_context_query|mcp__palantir_mini__pm_intent_router|mcp__palantir_mini__apply_edit_function|mcp__palantir_mini__ontology_context_query",
    purpose: "Run prompt-DTC gate before routing and ontology action tools.",
  },
  {
    policyId: "hook-step:pretool-agent-dispatch",
    hookPolicyId: "hook-policy:mutation-governance",
    event: "PreToolUse",
    matcher: "Agent",
    purpose: "Apply prompt-DTC, harness, research, fan-out, and version advisories before agent dispatch.",
  },
  {
    policyId: "hook-step:pretool-mutating-bash",
    hookPolicyId: "hook-policy:mutation-governance",
    event: "PreToolUse",
    matcher: "Bash",
    purpose: "Apply prompt-DTC and git-operation watch policy before mutating Bash calls.",
  },
  {
    policyId: "hook-step:posttool-edit-propagation",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "Edit|Write|MultiEdit",
    purpose: "Propagate edit evidence and suggest verifier fan-out after edits.",
  },
  {
    policyId: "hook-step:posttool-schema-frontmatter",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "**/schemas/ontology/(primitives|contracts|codegen)/**/*.ts",
    purpose: "Re-check schema semantic frontmatter after schema edits.",
  },
  {
    policyId: "hook-step:posttool-hook-citation",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "**/plugins/palantir-mini/hooks/*.ts",
    purpose: "Audit hook rule citations after hook source edits.",
  },
  {
    policyId: "hook-step:posttool-doc-drift",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "**/MEMORY.md|**/BROWSE.md|**/INDEX.md|**/CLAUDE.md",
    purpose: "Detect drift after authority and memory document edits.",
  },
  {
    policyId: "hook-step:posttool-generated-header",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "**/src/generated/**",
    purpose: "Check generated artifact headers after generated-path writes.",
  },
  {
    policyId: "hook-step:posttool-manifest-validation",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "**/.claude-plugin/plugin.json|**/hooks.json",
    purpose: "Validate plugin manifest and hook registration drift after manifest edits.",
  },
  {
    policyId: "hook-step:posttool-grade-rubric",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "mcp__plugin_palantir-mini_palantir-mini__grade_outcome_with_rubric",
    purpose: "Trigger harness analyzer after rubric grading.",
  },
  {
    policyId: "hook-step:posttool-commit-edits-backprop",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
    purpose: "Detect terminal sprint state, synthesize learning, and snapshot passing iterations.",
  },
  {
    policyId: "hook-step:posttool-emit-event-value",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "mcp__plugin_palantir-mini_palantir-mini__emit_event",
    purpose: "Track outcome pairs, memory layer validity, T3 circuit input, and T4 promotion eligibility.",
  },
  {
    policyId: "hook-step:posttool-agent-decision-post",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher:
      "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function|mcp__plugin_palantir-mini_palantir-mini__commit_edits|mcp__plugin_palantir-mini_palantir-mini__emit_event",
    purpose: "Record subagent decision evidence after privileged MCP calls.",
  },
  {
    policyId: "hook-step:posttool-router-suggestion",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "mcp__plugin_palantir-mini_palantir-mini__pm_intent_router",
    purpose: "Emit router divergence advisory after intent routing.",
  },
  {
    policyId: "hook-step:posttool-edit-watch",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "Edit|Write|MultiEdit|NotebookEdit",
    purpose: "Watch lead-direct edit thresholds and maintain impact graph after edits.",
  },
  {
    policyId: "hook-step:posttool-write-plan-dag",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "Write",
    purpose: "Validate plan task DAG annotations after writes.",
  },
  {
    policyId: "hook-step:posttool-git-impact-maintenance",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "Bash",
    purpose: "Run post-merge cleanup, dirty gates, and impact graph maintenance after Bash.",
  },
  {
    policyId: "hook-step:posttool-agent-orchestration-audit",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "Agent",
    purpose: "Audit subagent orchestration, task context budget, and briefing count after agent dispatch.",
  },
  {
    policyId: "hook-step:posttool-taskupdate-enrichment",
    hookPolicyId: "hook-policy:post-tool-lineage",
    event: "PostToolUse",
    matcher: "TaskUpdate",
    purpose: "Enrich completed task evidence after TaskUpdate calls.",
  },
  {
    policyId: "hook-step:precompact-lineage-integrity",
    hookPolicyId: "hook-policy:compaction-integrity",
    event: "PreCompact",
    purpose: "Validate state, events, bottlenecks, harness health, orphan pairs, and workflow traces before compaction.",
  },
  {
    policyId: "hook-step:taskcompleted-inbox-clean",
    hookPolicyId: "hook-policy:task-completion",
    event: "TaskCompleted",
    purpose: "Gate task completion and clean completed-task inbox entries.",
  },
  {
    policyId: "hook-step:stop-session-closeout",
    hookPolicyId: "hook-policy:session-lifecycle",
    event: "Stop",
    purpose: "Run session closeout, impact flush, T4 promotion, bypass audit, and stop validation.",
  },
  {
    policyId: "hook-step:sessionstart-cold-start-governance",
    hookPolicyId: "hook-policy:session-lifecycle",
    event: "SessionStart",
    purpose: "Run cold-start governance, drift checks, harness advisories, and overlay injection.",
  },
  {
    policyId: "hook-step:taskcreated-granularity",
    hookPolicyId: "hook-policy:claude-agent-lifecycle",
    event: "TaskCreated",
    purpose: "Validate task creation and granularity for Claude-native task lifecycle.",
  },
  {
    policyId: "hook-step:teammateidle-shutdown-digest",
    hookPolicyId: "hook-policy:claude-agent-lifecycle",
    event: "TeammateIdle",
    purpose: "Run idle shutdown and lead digest checks for Claude-native teammate lifecycle.",
  },
  {
    policyId: "hook-step:subagentstart-briefing",
    hookPolicyId: "hook-policy:claude-agent-lifecycle",
    event: "SubagentStart",
    purpose: "Validate subagent start state and briefing template for Claude-native lifecycle.",
  },
  {
    policyId: "hook-step:subagentstop-heartbeat",
    hookPolicyId: "hook-policy:claude-agent-lifecycle",
    event: "SubagentStop",
    purpose: "Validate subagent stop state and heartbeat evidence.",
  },
  {
    policyId: "hook-step:subagentstop-analyzer-output",
    hookPolicyId: "hook-policy:claude-agent-lifecycle",
    event: "SubagentStop",
    matcher: "harness-analyzer",
    purpose: "Inject analyzer output into the next iteration briefing.",
  },
  {
    policyId: "hook-step:subagentstop-sprint-chain",
    hookPolicyId: "hook-policy:claude-agent-lifecycle",
    event: "SubagentStop",
    matcher: "harness-generator|harness-evaluator|project-implementer|implementer",
    purpose: "Suggest harness sprint chaining after implementation subagent stop.",
  },
  {
    policyId: "hook-step:postcompact-state-restore",
    hookPolicyId: "hook-policy:compaction-integrity",
    event: "PostCompact",
    purpose: "Restore post-compaction session state.",
  },
  {
    policyId: "hook-step:userprompt-front-door",
    hookPolicyId: "hook-policy:prompt-front-door",
    event: "UserPromptSubmit",
    purpose: "Capture prompt identity, initialize context capsule, and run downstream prompt advisories.",
  },
];

const HOOK_POLICIES_BY_ID = new Map(HOOK_POLICY_REGISTRY.map((policy) => [policy.policyId, policy]));
const WORKFLOW_STEP_POLICIES_BY_ID = new Map(
  WORKFLOW_STEP_POLICY_REGISTRY.map((policy) => [policy.policyId, policy]),
);
const CODEX_UNSUPPORTED_EVENTS = new Set<HookWorkflowEvent>(CODEX_UNSUPPORTED_HOOK_EVENTS);
const CODEX_SCHEMA_ONLY_EVENTS = new Set<HookWorkflowEvent>(CODEX_SCHEMA_ONLY_HOOK_EVENTS);

export function getHookPolicy(policyId: HookPolicyId): HookPolicy {
  const policy = HOOK_POLICIES_BY_ID.get(policyId);
  if (!policy) throw new Error(`Unknown HookPolicy id: ${policyId}`);
  return policy;
}

export function getWorkflowStepPolicy(policyId: string): WorkflowStepPolicy | null {
  return WORKFLOW_STEP_POLICIES_BY_ID.get(policyId as WorkflowStepPolicyId) ?? null;
}

export function validateWorkflowStepPolicyRegistry(): readonly HookPolicyReferenceIssue[] {
  const issues: HookPolicyReferenceIssue[] = [];
  const seen = new Set<string>();

  for (const step of WORKFLOW_STEP_POLICY_REGISTRY) {
    if (seen.has(step.policyId)) {
      issues.push({
        kind: "unknown-policy-ref",
        event: step.event,
        policyRef: step.policyId,
        line: -1,
        message: `Duplicate WorkflowStepPolicy id ${step.policyId}.`,
      });
    }
    seen.add(step.policyId);

    const hookPolicy = HOOK_POLICIES_BY_ID.get(step.hookPolicyId);
    if (!hookPolicy) {
      issues.push({
        kind: "unknown-policy-ref",
        event: step.event,
        policyRef: step.hookPolicyId,
        line: -1,
        message: `WorkflowStepPolicy ${step.policyId} references unknown HookPolicy ${step.hookPolicyId}.`,
      });
      continue;
    }
    if (!hookPolicy.events.includes(step.event)) {
      issues.push({
        kind: "event-mismatch",
        event: step.event,
        policyRef: step.policyId,
        line: -1,
        message: `WorkflowStepPolicy ${step.policyId} event ${step.event} is not allowed by ${step.hookPolicyId}.`,
      });
    }
  }

  return issues;
}

export function validateHookPolicyRefsFromHooksJson(
  rawHooksJson: unknown,
  hooksJsonContent = "",
): readonly HookPolicyReferenceIssue[] {
  const issues: HookPolicyReferenceIssue[] = [...validateWorkflowStepPolicyRegistry()];
  if (typeof rawHooksJson !== "object" || rawHooksJson === null) return issues;
  const hooks = (rawHooksJson as Record<string, unknown>).hooks;
  if (typeof hooks !== "object" || hooks === null) return issues;

  for (const [event, registrations] of Object.entries(hooks as Record<string, unknown>)) {
    if (!Array.isArray(registrations)) continue;
    for (const registration of registrations) {
      if (typeof registration !== "object" || registration === null) continue;
      issues.push(...validateHookRegistrationPolicyRef(event, registration as Record<string, unknown>, hooksJsonContent));
    }
  }

  return issues;
}

function validateHookRegistrationPolicyRef(
  event: string,
  registration: Record<string, unknown>,
  hooksJsonContent: string,
): readonly HookPolicyReferenceIssue[] {
  const policyRef = registration.policyRef;
  const line = getPolicyLine(hooksJsonContent, event, typeof policyRef === "string" ? policyRef : undefined);
  const issues: HookPolicyReferenceIssue[] = [];

  if (typeof policyRef !== "string" || policyRef.trim().length === 0) {
    issues.push({
      kind: "missing-policy-ref",
      event,
      line,
      message: `Hook event registration ${event} is missing a policyRef.`,
    });
    return issues;
  }

  const stepPolicy = getWorkflowStepPolicy(policyRef);
  if (!stepPolicy) {
    issues.push({
      kind: "unknown-policy-ref",
      event,
      policyRef,
      line,
      message: `Hook event registration ${event} references unknown WorkflowStepPolicy ${policyRef}.`,
    });
    return issues;
  }

  if (stepPolicy.event !== event) {
    issues.push({
      kind: "event-mismatch",
      event,
      policyRef,
      line,
      message: `Hook event registration ${event} references ${policyRef}, but that policy is for ${stepPolicy.event}.`,
    });
  }

  for (const claim of readRuntimeParityClaims(registration)) {
    if (!isRuntimeParityClaimSupported(event, claim)) {
      issues.push({
        kind: "unsupported-parity-claim",
        event,
        policyRef,
        runtime: claim.runtime,
        support: claim.support,
        line,
        message: `${event} cannot claim ${claim.runtime} ${claim.support} hook parity.`,
      });
    }
  }

  return issues;
}

function readRuntimeParityClaims(registration: Record<string, unknown>): readonly HookRuntimeParityClaim[] {
  const rawClaims = registration.runtimeParityClaims ?? registration.parityClaims ?? registration.parityClaim;
  const values = Array.isArray(rawClaims) ? rawClaims : rawClaims ? [rawClaims] : [];
  return values.flatMap((value) => {
    if (typeof value !== "object" || value === null) return [];
    const claim = value as Record<string, unknown>;
    if (!isRuntimeId(claim.runtime) || !isRuntimePolicySupport(claim.support)) return [];
    return [{ runtime: claim.runtime, support: claim.support, evidence: readOptionalString(claim.evidence) }];
  });
}

function isRuntimeParityClaimSupported(event: string, claim: HookRuntimeParityClaim): boolean {
  if (claim.runtime === "claude") return true;
  if (claim.support !== "native") return true;
  if (!isHookWorkflowEvent(event)) return false;
  if (claim.runtime === "gemini") return !GEMINI_UNSUPPORTED_HOOK_EVENTS.includes(event);
  return !CODEX_UNSUPPORTED_EVENTS.has(event) && !CODEX_SCHEMA_ONLY_EVENTS.has(event);
}

function getPolicyLine(content: string, event: string, policyRef?: string): number {
  if (!content) return -1;
  const lines = content.split("\n");
  if (policyRef) {
    const policyNeedle = `"${policyRef}"`;
    const policyLine = lines.findIndex((line) => line.includes(policyNeedle));
    if (policyLine >= 0) return policyLine + 1;
  }
  const eventNeedle = `"${event}"`;
  const eventLine = lines.findIndex((line) => line.includes(eventNeedle));
  return eventLine >= 0 ? eventLine + 1 : -1;
}

function isRuntimeId(value: unknown): value is PalantirMiniRuntime {
  return value === "claude" || value === "codex" || value === "gemini";
}

function isRuntimePolicySupport(value: unknown): value is RuntimePolicySupport {
  return value === "native" || value === "schema-only" || value === "manual" || value === "unsupported";
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isHookWorkflowEvent(value: string): value is HookWorkflowEvent {
  return HOOK_POLICY_REGISTRY.some((policy) => policy.events.includes(value as HookWorkflowEvent));
}
