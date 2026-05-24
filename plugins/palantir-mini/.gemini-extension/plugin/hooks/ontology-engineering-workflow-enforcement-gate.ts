// palantir-mini — PreToolUse hook: ontology-engineering-workflow-enforcement-gate
//
// Blocking policy for Ontology Engineering control-plane work:
// 1. Runtime-native question widgets are forbidden in the Ontology Engineering path.
// 2. SIC/DTC authoring and routing for Ontology Engineering require prior FDE workflow provenance.
// 3. Mutations to Ontology Engineering workflow surfaces require mutationAuthorized=true.
//
// Authority: rule 28 v1.0.0, rule 12 lead protocol, rule 16 work contract binding.

import * as fs from "node:fs";
import * as path from "node:path";
import { classifyHookTool } from "../lib/hooks/tool-classifier";
import { readCurrentFDEOntologyEngineeringSession } from "../lib/fde-ontology-engineering/session-store";
import { readCurrentOntologyEngineeringWorkflowState } from "../lib/ontology-engineering-workflow";
import { buildOntologyEngineeringResponseTemplateContext } from "../lib/ontology-engineering-response-template";

interface HookPayload {
  readonly cwd?: string;
  readonly session_id?: string;
  readonly tool_name?: string;
  readonly tool_input?: Record<string, unknown>;
}

interface HookResult {
  readonly message: string;
  readonly decision?: "continue" | "block";
  readonly permissionDecision?: "allow" | "deny";
  readonly reason?: string;
  readonly additionalContext?: string;
  readonly hookSpecificOutput?: {
    readonly hookEventName?: "PreToolUse";
    readonly permissionDecision?: "allow" | "deny";
    readonly permissionDecisionReason?: string;
    readonly additionalContext?: string;
  };
}

interface WorkflowProbe {
  readonly projectRoot: string;
  readonly hasFdeProvenance: boolean;
  readonly mutationAuthorized: boolean;
  readonly provenanceReason: string;
}

const LEGACY_RUNTIME_UI_TOKENS = [
  ["Ask", "User", "Question"].join(""),
  ["request", "user", "input"].join("_"),
  ["manual", "review", "card"].join("-"),
  ["ask", "UserQuestionQueue"].join(""),
  ["ask", "UserQuestionPayload"].join(""),
  ["runtime", "QuestionUi"].join(""),
] as const;

const ONTOLOGY_ENGINEERING_MARKERS = [
  "ontology engineering",
  "ontology-engineering",
  "ontologyengineering",
  "fdeontologyengineering",
  "fde-ontology-engineering",
  "workflowcontract",
  "turncarddecisionspec",
  "userdecisionrecord",
  "pm_ontology_engineering_workflow",
  "ontology-engineering-workflow",
  "semanticintentcontract",
  "digitaltwinchangecontract",
] as const;

const PROTECTED_SURFACE_MARKERS = [
  "palantir-mini/hooks/",
  "palantir-mini/hooks/hooks.json",
  "palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts",
  "palantir-mini/bridge/handlers/pm-intent-router.ts",
  "palantir-mini/bridge/handlers/pm-ontology-engineering-workflow.ts",
  "palantir-mini/bridge/handlers/pm-plugin-self-check/",
  "palantir-mini/lib/ontology-engineering-workflow/",
  "palantir-mini/lib/fde-ontology-engineering/",
  "palantir-mini/lib/lead-intent/",
  "palantir-mini/lib/context-engineering/",
  "palantir-mini/skills/",
  "palantir-mini/managed-settings.d/",
  ".claude/plugins/palantir-mini/hooks/",
  ".claude/plugins/palantir-mini/hooks/hooks.json",
  ".claude/plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts",
  ".claude/plugins/palantir-mini/bridge/handlers/pm-intent-router.ts",
  ".claude/plugins/palantir-mini/bridge/handlers/pm-ontology-engineering-workflow.ts",
  ".claude/plugins/palantir-mini/bridge/handlers/pm-plugin-self-check/",
  ".claude/plugins/palantir-mini/lib/ontology-engineering-workflow/",
  ".claude/plugins/palantir-mini/lib/fde-ontology-engineering/",
  ".claude/plugins/palantir-mini/lib/lead-intent/",
  ".claude/plugins/palantir-mini/lib/context-engineering/",
  ".claude/plugins/palantir-mini/skills/",
  ".claude/plugins/palantir-mini/managed-settings.d/",
  ".claude/managed-settings.d/50-palantir-mini.json",
] as const;

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of process.stdin) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
    }
  } catch {
    return "";
  }
  return Buffer.concat(chunks).toString("utf8");
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "";
  }
}

function normalize(value: string): string {
  return value.replace(/\\/g, "/").toLowerCase();
}

function stringField(input: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = input?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function walkProjectRoot(start: string): string | null {
  let cur = path.resolve(start);
  const root = path.parse(cur).root;
  while (cur !== root) {
    if (fs.existsSync(path.join(cur, ".palantir-mini"))) return cur;
    cur = path.dirname(cur);
  }
  return null;
}

function resolveProjectRoot(payload: HookPayload): string {
  const input = payload.tool_input;
  const explicit =
    stringField(input, "project") ??
    stringField(input, "projectRoot") ??
    stringField(input, "cwd");
  if (explicit !== undefined) return path.resolve(explicit);
  const cwd = payload.cwd ?? process.cwd();
  return walkProjectRoot(cwd) ?? path.resolve(cwd);
}

function isWorkflowStartOrStatus(payload: HookPayload): boolean {
  const toolName = normalize(payload.tool_name ?? "");
  if (!toolName.includes("pm_ontology_engineering_workflow")) return false;
  const action = stringField(payload.tool_input, "action")?.toLowerCase();
  return action === undefined || action === "start" || action === "status";
}

function hasLegacyRuntimeUi(payload: HookPayload): boolean {
  const haystack = `${payload.tool_name ?? ""}\n${safeJson(payload.tool_input)}`;
  return LEGACY_RUNTIME_UI_TOKENS.some((token) => haystack.includes(token));
}

function toolNameIsLegacyRuntimeUi(payload: HookPayload): boolean {
  const toolName = payload.tool_name ?? "";
  return LEGACY_RUNTIME_UI_TOKENS.some((token) => toolName.includes(token));
}

function containsOntologyEngineeringMarker(payload: HookPayload): boolean {
  const haystack = normalize(`${payload.tool_name ?? ""}\n${safeJson(payload.tool_input)}`);
  return ONTOLOGY_ENGINEERING_MARKERS.some((marker) => haystack.includes(marker));
}

function collectPathLikeValues(input: unknown, values: string[] = []): string[] {
  if (typeof input === "string") {
    values.push(input);
    return values;
  }
  if (Array.isArray(input)) {
    for (const item of input) collectPathLikeValues(item, values);
    return values;
  }
  if (input !== null && typeof input === "object") {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (/path|file|surface|scope|target|command|prompt|intent|content/i.test(key)) {
        collectPathLikeValues(value, values);
      }
    }
  }
  return values;
}

function targetsProtectedSurface(payload: HookPayload): boolean {
  const haystack = normalize(collectPathLikeValues(payload.tool_input).join("\n"));
  return PROTECTED_SURFACE_MARKERS.some((marker) => haystack.includes(marker));
}

function isSemanticOrRouterTool(payload: HookPayload): boolean {
  const name = normalize(payload.tool_name ?? "");
  return name.includes("pm_semantic_intent_gate") || name.includes("pm_intent_router");
}

function hasInlineFdeRef(payload: HookPayload): boolean {
  const input = payload.tool_input ?? {};
  const directRefs = [
    stringField(input, "fdeOntologyEngineeringSessionRef"),
    stringField(input, "fdeSessionRef"),
    stringField(input, "workflowContractRef"),
  ];
  return directRefs.some((value) => value !== undefined);
}

function readWorkflowProbe(projectRoot: string, payload: HookPayload): WorkflowProbe {
  let workflowState: ReturnType<typeof readCurrentOntologyEngineeringWorkflowState> = null;
  let fdeSession: ReturnType<typeof readCurrentFDEOntologyEngineeringSession> = null;

  try {
    workflowState = readCurrentOntologyEngineeringWorkflowState(projectRoot);
  } catch {
    workflowState = null;
  }
  try {
    fdeSession = readCurrentFDEOntologyEngineeringSession(projectRoot);
  } catch {
    fdeSession = null;
  }

  const inlineFde = hasInlineFdeRef(payload);
  const hasFdeProvenance =
    inlineFde ||
    typeof workflowState?.fdeSessionRef === "string" ||
    typeof workflowState?.fdeSessionId === "string" ||
    fdeSession !== null;

  const mutationAuthorized = workflowState?.mutationAuthorized === true;
  let provenanceReason = "missing";
  if (inlineFde) provenanceReason = "inline-fde-ref";
  else if (workflowState?.fdeSessionRef || workflowState?.fdeSessionId) provenanceReason = "workflow-state";
  else if (fdeSession !== null) provenanceReason = "current-fde-session";

  return {
    projectRoot,
    hasFdeProvenance,
    mutationAuthorized,
    provenanceReason,
  };
}

function deny(reason: string, additionalContext: string): HookResult {
  return {
    message: `palantir-mini: ontology-engineering workflow gate BLOCKED - ${reason}`,
    decision: "block",
    permissionDecision: "deny",
    reason,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
      additionalContext,
    },
  };
}

function responseTemplateContext(payload: HookPayload): string {
  return buildOntologyEngineeringResponseTemplateContext({
    runtime: process.env.PALANTIR_MINI_HOST_RUNTIME ?? "unknown",
    enforcementSurface: `PreToolUse:${payload.tool_name ?? "unknown"}`,
  });
}

export function assessOntologyEngineeringWorkflowHook(payload: HookPayload): HookResult {
  const classification = classifyHookTool(payload);
  const legacyRuntimeUi = hasLegacyRuntimeUi(payload);

  if (legacyRuntimeUi && (toolNameIsLegacyRuntimeUi(payload) || !classification.isReadOnly)) {
    return deny(
      "runtime-native question UI is forbidden for Ontology Engineering workflow turns",
      "Use the plugin-owned WorkflowContract turn-card decision queue and UserDecisionRecord path. Do not route clarification through runtime-specific UI widgets or legacy question payload fields.",
    );
  }

  if (isWorkflowStartOrStatus(payload)) {
    return {
      message: "palantir-mini: ontology-engineering workflow gate OK - workflow start/status allowed",
      decision: "continue",
      additionalContext: responseTemplateContext(payload),
    };
  }

  const ontologyEngineeringContext = containsOntologyEngineeringMarker(payload);
  const protectedSurfaceMutation =
    classification.isProtectedMutation && targetsProtectedSurface(payload);
  const semanticOrRouterOntologyCall =
    isSemanticOrRouterTool(payload) && ontologyEngineeringContext;
  const workflowToolCall = normalize(payload.tool_name ?? "").includes("pm_ontology_engineering_workflow");

  if (!ontologyEngineeringContext && !protectedSurfaceMutation && !workflowToolCall) {
    return {
      message: "palantir-mini: ontology-engineering workflow gate skipped",
      decision: "continue",
    };
  }

  const probe = readWorkflowProbe(resolveProjectRoot(payload), payload);

  if ((semanticOrRouterOntologyCall || workflowToolCall || protectedSurfaceMutation) && !probe.hasFdeProvenance) {
    return deny(
      "FDE workflow provenance is required before Ontology Engineering SIC/DTC authoring, routing, or mutation",
      "Start the plugin-owned Ontology Engineering workflow first, then carry the FDE session reference into SIC/DTC and routing calls. This removes model-specific interpretation before contracts exist.",
    );
  }

  if (protectedSurfaceMutation && !probe.mutationAuthorized) {
    return deny(
      "Ontology Engineering workflow mutation requires approved SIC and DTC workflow state",
      "The current workflow state must have mutationAuthorized=true before edits to hooks, gate/router handlers, workflow libraries, skills, or managed-settings surfaces proceed.",
    );
  }

  return {
    message: `palantir-mini: ontology-engineering workflow gate OK - ${probe.provenanceReason}`,
    decision: "continue",
    additionalContext: [
      `projectRoot=${probe.projectRoot}; mutationAuthorized=${String(probe.mutationAuthorized)}`,
      responseTemplateContext(payload),
    ].join("\n\n"),
  };
}

async function main(): Promise<void> {
  const raw = await readStdin();
  let payload: HookPayload = {};
  if (raw.trim().length > 0) {
    try {
      payload = JSON.parse(raw) as HookPayload;
    } catch {
      process.stdout.write(JSON.stringify({
        message: "palantir-mini: ontology-engineering workflow gate skipped - malformed hook payload",
        decision: "continue",
      }) + "\n");
      return;
    }
  }
  process.stdout.write(`${JSON.stringify(assessOntologyEngineeringWorkflowHook(payload))}\n`);
}

if (import.meta.main) {
  void main();
}
