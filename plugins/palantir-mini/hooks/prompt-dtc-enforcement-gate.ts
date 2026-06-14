// palantir-mini PR-13 — Hook enforcement level
//   enforcement: blocking-on-ontology-write (OE-1, T3)
//   rationale:   WIRED LIVE as a PreToolUse entry on the mutation tool set (hooks/hooks.json).
//                The env default mode (PALANTIR_MINI_PROMPT_DTC_GATE_MODE) is the FLOOR, but
//                resolveEffectiveGateMode raises the effective mode to `blocking` for the
//                `ontology-write` mutation class (PROJECT_GATE_POLICY_MINIMUMS), so an
//                ontology-affecting mutation is hard-gated regardless of the env default.
//                Non-mutating / read-only tools self-skip; the CLI entry (import.meta.main)
//                fails closed on any unexpected error.
// palantir-mini sprint-064 W4 - Prompt-to-DTC PreToolUse gate
// Fires on mutating PreToolUse surfaces; ontology-write mutations are blocking via the floor.
// PR 5.11 (sprint-122): adds selective-blocking mode (blocks ONLY ontology-affecting MCP tools)
// + 60-min SIC approval cache.
// sprint-138 Slice 6: additive FDE-aware skip branch.
// sprint-139 Worker 4: skip is driven by current prompt-front-door +
// FDE ontology-engineering session lookup, not raw payload.prompt text.

import * as path from "node:path";
import { emit } from "../scripts/log";
import { findProjectRoot } from "../lib/project/find-root";
import { readCurrentFDEOntologyEngineeringSession } from "../lib/fde-ontology-engineering/session-store";
import {
  PROMPT_RUNTIMES,
  PromptFrontDoorStore,
  isPromptRuntime,
  validatePromptContinuity,
} from "../lib/prompt-front-door";
import {
  validateDigitalTwinChangeContract,
  validateSemanticIntentContract,
} from "../lib/lead-intent/contracts";
import {
  verifyDtcBuildApprovalAgainstEnvelope,
  type VerifyDtcBuildApprovalResult,
} from "../lib/lead-intent/dtc-build-approval";
import { evaluateProjectScopeConformance } from "../lib/lead-intent/project-scope-policy";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../lib/lead-intent/contracts";
import type { PromptEnvelope, PromptRuntime } from "../lib/prompt-front-door";
import type { FDEOntologyEngineeringSession } from "../lib/fde-ontology-engineering/types";
import type { ProjectScopeConformanceResult } from "../lib/lead-intent/project-scope-policy";
import { preMutationGovernance } from "../lib/governance/pre-mutation-governance";
import type { PreMutationGovernanceDecision } from "../lib/governance/pre-mutation-governance";
import { evaluateFDEGovernancePolicy } from "../lib/governance/fde-governance-policy";
import type { FDEGovernancePolicyResult } from "../lib/governance/fde-governance-policy";
import {
  evaluatePreMutationImpactGate,
  type PreMutationImpactGateResult,
} from "../lib/governance/pre-mutation-impact-gate";
import {
  checkSicApprovalCache,
  recordSicApproval,
} from "../lib/prompt-front-door/sic-approval-cache";
import {
  classifyHookTool,
  isOntologyContextQueryMutation as isClassifiedOntologyContextQueryMutation,
  isReadOnlyBashCommand,
} from "../lib/hooks/tool-classifier";
import {
  gateModeFromEnv,
  resolveEffectiveGateMode,
  type ProjectGateMode,
  type ProtectedMutationClass,
} from "../lib/governance/effective-gate-mode";

type GateMode = ProjectGateMode;

interface HookPayload {
  readonly cwd?: string;
  readonly session_id?: string;
  readonly tool_name?: string;
  readonly tool_input?: {
    readonly command?: string;
    readonly file_path?: string;
    readonly notebook_path?: string;
    readonly path?: string;
    readonly promptId?: string;
    readonly promptHash?: string;
    readonly sessionId?: string;
    readonly runtime?: string;
    // Improvement #3 (ADDITIVE) — pointer to a verifiable user-approval envelope.
    // Re-verified fail-closed against the hook-captured PromptEnvelope; NEVER trusted
    // as a model-supplied blob. Absence ⇒ byte-identical legacy gate behavior.
    readonly userApprovalPromptId?: string;
    readonly userApprovalPromptHash?: string;
    readonly userApprovalQuote?: string;
  } & Record<string, unknown>;
}

interface HookResult {
  readonly message: string;
  readonly decision?: "block" | "continue";
  readonly reason?: string;
  readonly additionalContext?: string;
  readonly hookSpecificOutput?: {
    readonly hookEventName?: "PreToolUse";
    readonly permissionDecision?: "deny" | "allow";
    readonly permissionDecisionReason?: string;
    readonly additionalContext?: string;
  };
}

interface GateAssessment {
  readonly ok: boolean;
  readonly errorClass: string;
  readonly reason: string;
  readonly envelope?: PromptEnvelope;
  readonly projectScopeConformance?: ProjectScopeConformanceResult;
  readonly governanceDecision?: PreMutationGovernanceDecision;
  readonly policyResult?: FDEGovernancePolicyResult;
  readonly impactGateResult?: PreMutationImpactGateResult;
  // Improvement #3 (ADDITIVE) — true iff a fail-closed re-verified user-approval
  // envelope authorized the DTC-build dispatch in lieu of the digital_twin_approved
  // envelope state / approved-contract-record requirement. Audit-only.
  readonly userApprovalAuthorized?: boolean;
}

interface ScopedBlockingAssessment {
  readonly scoped: boolean;
  readonly reasons: string[];
}

interface FDEEngineeringSkipAssessment {
  readonly skip: boolean;
  readonly protectedMutation: boolean;
  readonly session?: FDEOntologyEngineeringSession;
  readonly envelope?: PromptEnvelope;
  readonly reason: string;
}

// v3.18.0 (foamy-giggling-kettle plan v3.18.0 chore): env default flipped from
// "advisory" to "off" — plan-level approval (ExitPlanMode) supersedes the advisory
// per-prompt DTC text on non-ontology tool calls. NOTE (OE-1, T3): this env default is
// only the FLOOR for non-protected mutation classes; once wired live, an `ontology-write`
// mutation is raised to `blocking` by resolveEffectiveGateMode regardless of this default,
// so the dead-gate hole is closed for the ontology-affecting write path.
// Opt-in (raise the floor further): set PALANTIR_MINI_PROMPT_DTC_GATE_MODE=advisory|selective-blocking|scoped-blocking|blocking.
// PR 5.11: selective-blocking mode added — blocks ONLY ontology-affecting MCP tools
// with 60-min SIC approval cache exemption.
function gateMode(): GateMode {
  return gateModeFromEnv(process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE);
}

function hasExplicitGateMode(): boolean {
  const raw = process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  return (
    raw === "off" ||
    raw === "advisory" ||
    raw === "selective-blocking" ||
    raw === "scoped-blocking" ||
    raw === "blocking"
  );
}

function detectRuntime(payload: HookPayload): PromptRuntime | undefined {
  const envRuntime = process.env.PALANTIR_MINI_HOST_RUNTIME;
  if (isPromptRuntime(envRuntime)) return envRuntime;
  const inputRuntime = payload.tool_input?.runtime;
  if (isPromptRuntime(inputRuntime)) return inputRuntime;
  return undefined;
}

function resolveProjectRoot(payload: HookPayload): string {
  const cwd = payload.cwd ?? process.cwd();
  return findProjectRoot(cwd) ?? cwd;
}

function toolName(payload: HookPayload): string {
  return payload.tool_name ?? "unknown";
}

function isAllowedWhilePending(name: string): boolean {
  const normalized = name.toLowerCase();
  if (normalized === "bash") return false;
  return classifyHookTool({ tool_name: name }).isReadOnly ||
    normalized.includes("emit_event") ||
    normalized.includes("validate_hook");
}

function isReadOnlyBash(command: string): boolean {
  return isReadOnlyBashCommand(command);
}

function isMutatingCandidate(payload: HookPayload): boolean {
  const name = toolName(payload);
  const classification = classifyHookTool(payload);
  if (classification.isReadOnly || isAllowedWhilePending(name)) return false;
  return classification.isProtectedMutation ||
    classification.normalizedName.includes("pm_intent_router") ||
    classification.normalizedName.includes("ontology_mutation") ||
    classification.normalizedName.includes("action_mutation") ||
    classification.normalizedName.includes("function_mutation");
}

function protectedMutationClassForPromptGate(
  payload: HookPayload,
  mutating: boolean,
): ProtectedMutationClass | undefined {
  const classification = classifyHookTool(payload);
  if (classification.operation === "commit_edits") return "commit";
  if (
    classification.operation === "apply_edit_function" ||
    classification.operation === "ontology_context_query" ||
    classification.isOntologyAffectingForSelectiveBlocking
  ) {
    return "ontology-write";
  }

  const normalizedName = toolName(payload).toLowerCase();
  if (normalizedName === "bash" && mutating) {
    const command = String(payload.tool_input?.command ?? "").toLowerCase();
    if (/\bgh\s+pr\s+(create|merge|close|reopen|edit|ready|review)\b/.test(command)) {
      return "pull-request";
    }
    if (/\bgit\s+commit\b/.test(command)) return "commit";
    if (/\b(git\s+push|npm\s+publish|bun\s+publish|release|deploy)\b/.test(command)) {
      return "release";
    }
    return "external-command";
  }

  if (classification.isProtectedMutation || mutating) return "generic-mutation";
  return undefined;
}

/**
 * For selective-blocking mode: ontology_context_query is only gated for mutation
 * modes. Read-only modes (no `action` or action="read") pass through.
 */
function isOntologyContextQueryMutation(payload: HookPayload): boolean {
  return isClassifiedOntologyContextQueryMutation(payload.tool_input);
}

/**
 * Determine if the current tool call is in the ontology-affecting set
 * and should be gated by selective-blocking mode.
 */
function isOntologyAffectingForSelectiveBlocking(payload: HookPayload): boolean {
  return classifyHookTool(payload).isOntologyAffectingForSelectiveBlocking;
}

function isProtectedMutationForFDEReadOnlySkip(
  payload: HookPayload,
  mode: GateMode,
  mutating: boolean,
): boolean {
  if (isOntologyAffectingForSelectiveBlocking(payload)) return true;
  if (mode === "selective-blocking") return false;
  return mutating;
}

function isReadOnlyFDEEngineeringSession(session: FDEOntologyEngineeringSession): boolean {
  return (
    session.phase !== "semantic-contract-ready" &&
    session.phase !== "dtc-ready" &&
    typeof session.digitalTwinChangeContractRef !== "string"
  );
}

function readCurrentFDESessionSafe(
  projectRoot: string,
): FDEOntologyEngineeringSession | undefined {
  try {
    return readCurrentFDEOntologyEngineeringSession(projectRoot) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * PR 5.11 — Check the 60-min SIC approval cache for selective-blocking mode.
 * Returns the matched promptId if approved, or undefined for a cache miss.
 */
function checkSicCacheForSelectiveBlocking(
  projectRoot: string,
  payload: HookPayload,
): { hit: true; promptId: string } | { hit: false } {
  const promptId = payload.tool_input?.promptId;
  const entry = checkSicApprovalCache(projectRoot, typeof promptId === "string" ? promptId : undefined);
  if (entry) return { hit: true, promptId: entry.promptId };
  return { hit: false };
}

function collectTargetFiles(payload: HookPayload): string[] {
  const input = payload.tool_input ?? {};
  const files = new Set<string>();
  for (const key of ["file_path", "notebook_path", "path"] as const) {
    const value = input[key];
    if (typeof value === "string" && value.length > 0) files.add(value);
  }
  const edits = input.edits;
  if (Array.isArray(edits)) {
    for (const edit of edits) {
      if (typeof edit !== "object" || edit === null) continue;
      const filePath = (edit as { file_path?: unknown }).file_path;
      if (typeof filePath === "string" && filePath.length > 0) files.add(filePath);
    }
  }
  return [...files];
}

function normalizeSurfacePath(filePath: string, projectRoot: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (!path.isAbsolute(normalized)) return normalized.replace(/^\.\//, "");

  const relative = path.relative(projectRoot, normalized).replace(/\\/g, "/");
  if (!relative.startsWith("../") && relative !== "..") return relative.replace(/^\.\//, "");
  return normalized.replace(/^\.\//, "");
}

function scopedBlockingFileReason(filePath: string, projectRoot: string): string | undefined {
  const rel = normalizeSurfacePath(filePath, projectRoot);
  if (rel.startsWith("schemas/ontology/")) return `ontology schema surface: ${rel}`;
  if (rel.startsWith("palantir-mini/lib/lead-intent/")) {
    return `lead-intent contract surface: ${rel}`;
  }
  if (rel.startsWith("palantir-mini/lib/prompt-front-door/")) {
    return `prompt-front-door identity surface: ${rel}`;
  }
  if (rel === "palantir-mini/bridge/mcp-server.ts") {
    return `public MCP schema surface: ${rel}`;
  }
  if (
    rel === "palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts" ||
    rel === "palantir-mini/bridge/handlers/pm-intent-router.ts"
  ) {
    return `Prompt-to-DTC handler surface: ${rel}`;
  }
  if (rel.startsWith(".claude/plugins/palantir-mini/lib/lead-intent/")) {
    return `lead-intent contract surface: ${rel}`;
  }
  if (rel.startsWith(".claude/plugins/palantir-mini/lib/prompt-front-door/")) {
    return `prompt-front-door identity surface: ${rel}`;
  }
  if (rel === ".claude/plugins/palantir-mini/bridge/mcp-server.ts") {
    return `public MCP schema surface: ${rel}`;
  }
  if (
    rel === ".claude/plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts" ||
    rel === ".claude/plugins/palantir-mini/bridge/handlers/pm-intent-router.ts"
  ) {
    return `Prompt-to-DTC handler surface: ${rel}`;
  }
  if (/^projects\/[^/]+\/ontology\//.test(rel)) return `project ontology surface: ${rel}`;
  if (/^projects\/[^/]+\/src\/generated\//.test(rel)) {
    return `generated project surface: ${rel}`;
  }
  return undefined;
}

function looksOntologyAffecting(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((entry) => looksOntologyAffecting(entry));
  if (typeof value !== "string") return false;
  return /ontology|schema|semanticintentcontract|digitaltwinchangecontract|prompt-dtc|projectscope|generated|actiontype|objecttype|linktype/i.test(
    value,
  );
}

function isCrossCuttingIntentRouter(payload: HookPayload): boolean {
  const name = toolName(payload).toLowerCase();
  if (!name.includes("pm_intent_router")) return false;
  const input = payload.tool_input ?? {};
  return (
    input.complexityHint === "cross-cutting" &&
    (looksOntologyAffecting(input.intent) || looksOntologyAffecting(input.scopePaths))
  );
}

function assessScopedBlockingSurface(
  payload: HookPayload,
  projectRoot: string,
): ScopedBlockingAssessment {
  const reasons: string[] = [];
  const normalizedToolName = toolName(payload).toLowerCase();
  if (normalizedToolName.includes("commit_edits")) reasons.push("commit_edits mutation surface");
  if (normalizedToolName.includes("apply_edit_function")) {
    reasons.push("apply_edit_function mutation surface");
  }
  if (isCrossCuttingIntentRouter(payload)) {
    reasons.push("cross-cutting ontology-affecting pm_intent_router dispatch");
  }
  for (const filePath of collectTargetFiles(payload)) {
    const reason = scopedBlockingFileReason(filePath, projectRoot);
    if (reason) reasons.push(reason);
  }
  return { scoped: reasons.length > 0, reasons };
}

async function readCurrentEnvelope(
  store: PromptFrontDoorStore,
  payload: HookPayload,
): Promise<PromptEnvelope | undefined> {
  const sessionId = payload.tool_input?.sessionId ?? payload.session_id;
  const promptId = payload.tool_input?.promptId;
  if (typeof promptId === "string" && typeof sessionId === "string") {
    return (await store.readEnvelope(sessionId, promptId)) ?? undefined;
  }
  if (typeof sessionId !== "string" || sessionId.length === 0) return undefined;

  const preferred = detectRuntime(payload);
  const runtimes = preferred
    ? [preferred, ...PROMPT_RUNTIMES.filter((runtime) => runtime !== preferred)]
    : PROMPT_RUNTIMES;
  for (const runtime of runtimes) {
    const pointer = await store.readCurrentPointer(runtime, sessionId);
    if (!pointer) continue;
    const envelope = await store.readEnvelope(pointer.sessionId, pointer.promptId);
    if (envelope) return envelope;
  }
  return undefined;
}

async function assessFDEEngineeringReadOnlySkip(
  projectRoot: string,
  payload: HookPayload,
  mode: GateMode,
  mutating: boolean,
): Promise<FDEEngineeringSkipAssessment> {
  const session = readCurrentFDESessionSafe(projectRoot);
  if (!session) {
    return {
      skip: false,
      protectedMutation: isProtectedMutationForFDEReadOnlySkip(payload, mode, mutating),
      reason: "No current FDE ontology-engineering session is available.",
    };
  }

  const store = new PromptFrontDoorStore({ projectRoot });
  const envelope = await readCurrentEnvelope(store, payload);
  if (!envelope) {
    return {
      skip: false,
      protectedMutation: isProtectedMutationForFDEReadOnlySkip(payload, mode, mutating),
      session,
      reason: "No current prompt-front-door envelope is available for FDE session continuity.",
    };
  }

  const protectedMutation = isProtectedMutationForFDEReadOnlySkip(payload, mode, mutating);
  if (!isReadOnlyFDEEngineeringSession(session)) {
    return {
      skip: false,
      protectedMutation,
      session,
      envelope,
      reason: `Current FDE ontology-engineering session phase=${session.phase} is not read-only.`,
    };
  }

  if (protectedMutation) {
    return {
      skip: false,
      protectedMutation,
      session,
      envelope,
      reason: "Protected mutation must use approved SIC/DTC rather than FDE advisory skip.",
    };
  }

  return {
    skip: true,
    protectedMutation,
    session,
    envelope,
    reason: "Current FDE ontology-engineering session is read-only and tool call is not protected mutation.",
  };
}

function contractContinuityMatches(
  envelope: PromptEnvelope,
  contract: { promptId: string; promptHash: string },
): boolean {
  return contract.promptId === envelope.promptId && contract.promptHash === envelope.promptHash;
}

/**
 * Improvement #3 (ADDITIVE) — the PreToolUse mirror of the front-door gate's
 * `assessDtcBuildApprovalForGate`. Re-verifies a caller-supplied user-approval
 * envelope pointer against the hook-captured PromptEnvelope, FAIL-CLOSED, via the
 * SAME read-time verifier the readiness gate uses
 * ({@link verifyDtcBuildApprovalAgainstEnvelope}). Returns `undefined` when the
 * caller supplied NO approval inputs — so the gate behaves byte-identically to
 * legacy (no acceptance branch taken). Returns `{ authorized: false }` on any
 * verification failure (default not-authorized).
 *
 * The model can never write a PromptEnvelope (the UserPromptSubmit capture hook is
 * the sole writer), so the verdict is unforgeable. promptId/promptHash fall back to
 * the live continuity token (`tool_input.promptId`/`promptHash`); sessionId/runtime
 * reuse the gate's resolution.
 */
async function assessDtcBuildApprovalForGate(
  projectRoot: string,
  payload: HookPayload,
): Promise<VerifyDtcBuildApprovalResult | undefined> {
  const input = payload.tool_input ?? {};
  const suppliedQuote = input.userApprovalQuote?.trim();
  const suppliedPromptId = input.userApprovalPromptId?.trim();
  const suppliedPromptHash = input.userApprovalPromptHash?.trim();
  if (!suppliedQuote && !suppliedPromptId && !suppliedPromptHash) {
    return undefined;
  }
  const sessionId = input.sessionId ?? payload.session_id;
  const promptId = suppliedPromptId ?? input.promptId?.trim() ?? "";
  const promptHash = suppliedPromptHash ?? input.promptHash?.trim() ?? "";
  return verifyDtcBuildApprovalAgainstEnvelope({
    projectRoot,
    promptId,
    promptHash,
    userQuote: suppliedQuote ?? "",
    sessionId,
    runtime: detectRuntime(payload),
  });
}

async function assessPromptDtc(
  projectRoot: string,
  payload: HookPayload,
): Promise<GateAssessment> {
  const store = new PromptFrontDoorStore({ projectRoot });
  const envelope = await readCurrentEnvelope(store, payload);
  if (!envelope) {
    return {
      ok: false,
      errorClass: "prompt_front_door_missing",
      reason:
        "No current prompt-front-door envelope is available. Run pm_semantic_intent_gate from the captured prompt context before mutating tools.",
    };
  }
  if (envelope.palantirMiniPluginOptOut?.explicit) {
    return {
      ok: true,
      errorClass: "palantir_mini_plugin_opt_out",
      envelope,
      reason:
        "Current prompt explicitly opted out of palantir-mini plugin workflow enforcement.",
    };
  }

  const continuity = validatePromptContinuity({
    envelope,
    expectedPromptHash: payload.tool_input?.promptHash,
    currentPromptId: payload.tool_input?.promptId,
    runtime: detectRuntime(payload),
    sessionId: payload.tool_input?.sessionId ?? payload.session_id,
  });
  if (!continuity.valid) {
    return {
      ok: false,
      errorClass: "prompt_continuity_failed",
      envelope,
      reason:
        "Prompt-front-door continuity failed: " +
        continuity.issues.map((issue) => `${issue.field}: ${issue.message}`).join("; "),
    };
  }

  // Improvement #3 (ADDITIVE) — re-verify a caller-supplied user-approval envelope
  // against the hook-captured PromptEnvelope, FAIL-CLOSED. Computed AFTER continuity
  // so the same promptId/promptHash anchor governs both. `undefined` ⇒ no approval
  // inputs ⇒ the legacy gate runs byte-identically. A verified envelope acts as an
  // ALTERNATIVE satisfier for ONLY the digital_twin_approved envelope-state and the
  // approved-contract-record requirements — it NEVER relaxes SIC presence, record
  // resolution, record continuity, or any downstream governance gate (project-scope,
  // FDE policy, impact). The user who genuinely approved the DTC build IS the binding
  // the digital_twin_approved advance otherwise records.
  const dtcBuildApproval = await assessDtcBuildApprovalForGate(projectRoot, payload);
  const userApprovalAuthorized = dtcBuildApproval?.authorized === true;

  const semanticRef = envelope.contractRefs.semanticIntentContractRef;
  const digitalTwinRef = envelope.contractRefs.digitalTwinChangeContractRef;
  if (!semanticRef) {
    return {
      ok: false,
      errorClass: "semantic_contract_required",
      envelope,
      reason:
        "Current prompt has no SemanticIntentContract ref. Call pm_semantic_intent_gate before mutating tools.",
    };
  }
  // The DTC ref must always resolve (the downstream governance gates consume the DTC
  // body); a verified user-approval envelope substitutes ONLY for the
  // `digital_twin_approved` envelope-state requirement, never for the DTC ref itself.
  if (!digitalTwinRef || (envelope.state !== "digital_twin_approved" && !userApprovalAuthorized)) {
    return {
      ok: false,
      errorClass: "digital_twin_contract_required",
      envelope,
      userApprovalAuthorized,
      reason:
        "Current prompt is not digital_twin_approved. Complete DigitalTwinChangeContract approval before mutating tools.",
    };
  }

  const semanticRecord = await store.readContractRecordByRef<SemanticIntentContract>(semanticRef);
  const digitalTwinRecord = await store.readContractRecordByRef<DigitalTwinChangeContract>(
    digitalTwinRef,
  );
  if (!semanticRecord || !digitalTwinRecord) {
    return {
      ok: false,
      errorClass: "contract_ref_unresolved",
      envelope,
      reason: "Current prompt has contract refs, but one or more prompt-front-door records are unresolved.",
    };
  }
  if (
    !contractContinuityMatches(envelope, semanticRecord) ||
    !contractContinuityMatches(envelope, digitalTwinRecord)
  ) {
    return {
      ok: false,
      errorClass: "contract_ref_continuity_failed",
      envelope,
      reason: "Prompt contract refs do not match the current promptId/promptHash continuity token.",
    };
  }

  // The records must resolve (above) and match continuity (above) regardless — those
  // anchors are NEVER relaxed because the downstream governance gates consume the
  // contract bodies. Improvement #3 (ADDITIVE): a verified user-approval envelope
  // substitutes ONLY for the records' `status: "approved"` + approvalRef requirement
  // (the human IS that approval). It does NOT relax any other contract-validity issue
  // beyond that approval gate, and absence of the envelope ⇒ legacy behavior.
  const semanticValidation = validateSemanticIntentContract(semanticRecord.contract);
  const digitalTwinValidation = validateDigitalTwinChangeContract(digitalTwinRecord.contract);
  if ((!semanticValidation.valid || !digitalTwinValidation.valid) && !userApprovalAuthorized) {
    return {
      ok: false,
      errorClass: "contract_approval_required",
      envelope,
      userApprovalAuthorized,
      reason:
        "Prompt contract records are not approved with approvalRef: " +
        [...semanticValidation.issues, ...digitalTwinValidation.issues]
          .map((issue) => `${issue.field}: ${issue.message}`)
          .join("; "),
    };
  }

  const targetFiles = collectTargetFiles(payload);
  if (targetFiles.length > 0) {
    const projectScopeConformance = evaluateProjectScopeConformance({
      proposedFiles: targetFiles,
      projectRoot,
      semanticIntentContract: semanticRecord.contract,
      digitalTwinChangeContract: digitalTwinRecord.contract,
    });
    if (!projectScopeConformance.conformant) {
      return {
        ok: false,
        errorClass: "project_scope_conformance_failed",
        envelope,
        projectScopeConformance,
        reason:
          "ProjectScope conformance failed: " +
          projectScopeConformance.issues.map((issue) => issue.message).join("; "),
      };
    }
  }

  const policyResult = evaluateFDEGovernancePolicy({
    toolName: toolName(payload),
    targetFiles,
    toolInput: payload.tool_input,
    dtc: digitalTwinRecord.contract,
    sic: semanticRecord.contract,
    isProtectedMutation: true,
    activeWorkflowTrace: undefined,
    touchedSurfaces: semanticRecord.contract.affectedSurfaces,
  });
  const impactGateResult = evaluatePreMutationImpactGate({
    projectRoot,
    promptId: envelope.promptId,
    promptHash: envelope.promptHash,
    toolName: toolName(payload),
    toolInput: payload.tool_input ?? {},
    resolvedTargetFiles: targetFiles,
    semanticIntentContractRef: semanticRef,
    digitalTwinChangeContractRef: digitalTwinRef,
    semanticIntentContract: semanticRecord.contract,
    digitalTwinChangeContract: digitalTwinRecord.contract,
  });
  const impactDenied = impactGateResult.decision === "deny";

  const decision = preMutationGovernance({
    promptEnvelope: envelope,
    toolName: toolName(payload),
    targetFiles,
    allowed: policyResult.allowed && !impactDenied,
    reason: impactDenied ? impactGateResult.reason : policyResult.humanReason,
  });

  return {
    ok: policyResult.allowed && !impactDenied,
    errorClass: policyResult.allowed
      ? (impactDenied ? "pre_mutation_impact_gate_denied" : "prompt_dtc_gate_passed")
      : policyResult.reason,
    envelope,
    governanceDecision: decision,
    policyResult,
    impactGateResult,
    userApprovalAuthorized,
    reason: policyResult.allowed && !impactDenied
      ? (userApprovalAuthorized
          ? "Current prompt is authorized by a re-verified user-approval envelope (digital-twin-change) with resolved, continuity-matched contract refs and promptHash continuity."
          : "Current prompt envelope is digital_twin_approved with approved contract refs and promptHash continuity.")
      : (impactDenied ? impactGateResult.reason : policyResult.humanReason),
  };
}

async function emitGateAssessment(
  payload: HookPayload,
  projectRoot: string,
  mode: GateMode,
  mutating: boolean,
  assessment: GateAssessment,
  willDeny: boolean,
  scopedBlocking: ScopedBlockingAssessment,
): Promise<void> {
  const semanticIntentContractRef = assessment.envelope?.contractRefs.semanticIntentContractRef;
  const digitalTwinChangeContractRef =
    assessment.envelope?.contractRefs.digitalTwinChangeContractRef;
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: assessment.ok || !willDeny,
        errorClass: assessment.ok
          ? "prompt_dtc_gate_passed"
          : willDeny
            ? assessment.errorClass
            : "prompt_dtc_gate_advisory",
        promptId: assessment.envelope?.promptId,
        promptHash: assessment.envelope?.promptHash,
        runtime: assessment.envelope?.runtime ?? detectRuntime(payload) ?? "unknown",
        projectRoot: assessment.envelope?.projectRoot ?? projectRoot,
        promptEnvelopeState: assessment.envelope?.state,
        semanticIntentContractRef,
        digitalTwinChangeContractRef,
        approvalRef: assessment.envelope?.contractRefs.approvalRef,
        projectScopeConformance: assessment.projectScopeConformance,
        preMutationGovernance: assessment.governanceDecision,
        preMutationImpactGate: assessment.impactGateResult,
        scopedBlocking,
        userApprovalAuthorized: assessment.userApprovalAuthorized === true,
        contractRefs: {
          semanticIntentContractRef,
          digitalTwinChangeContractRef,
          approvalRef: assessment.envelope?.contractRefs.approvalRef,
        },
        memoryLayers: ["semantic", "procedural"],
      } as Record<string, unknown>,
      toolName: "prompt-dtc-enforcement-gate",
      cwd: projectRoot,
      sessionId: payload.session_id,
      identity: "monitor",
      memoryLayers: ["semantic", "procedural"],
      reasoning: [
        `prompt-dtc-enforcement-gate: mode=${mode} tool=${toolName(payload)} mutating=${mutating} ok=${assessment.ok} willDeny=${willDeny}`,
        `promptId=${assessment.envelope?.promptId ?? "none"}`,
        `promptHash=${assessment.envelope?.promptHash ?? "none"}`,
        `state=${assessment.envelope?.state ?? "none"}`,
        `reason=${assessment.reason}`,
      ].join(" "),
      refinementTarget: assessment.ok
        ? undefined
        : {
            kind: "rule-conformance-policy",
            filePathOrRid: "hooks/prompt-dtc-enforcement-gate.ts",
            description: "Prompt-to-DTC gate found a mutating tool before digital_twin_approved contract continuity was established.",
            confidenceLevel: "high",
          },
    });
  } catch {
    // best-effort only; hook decision is returned regardless of logging failure.
  }

  // PR-11: emit pre_mutation_governance_decided for audit lineage.
  if (assessment.governanceDecision && assessment.policyResult) {
    await emit({
      type: "pre_mutation_governance_decided",
      payload: {
        decisionId: assessment.governanceDecision.decisionId,
        toolName: toolName(payload),
        targetFiles: assessment.governanceDecision.targetFiles,
        allowed: assessment.policyResult.allowed,
        reason: assessment.policyResult.humanReason,
        ruleApplied: assessment.policyResult.reason,
        refs: assessment.policyResult.refs,
      } as Record<string, unknown>,
      toolName: "prompt-dtc-enforcement-gate",
      cwd: projectRoot,
      sessionId: payload.session_id,
      identity: "claude-code",
      memoryLayers: ["procedural"],
      reasoning: `prompt-dtc-enforcement-gate: rule=${assessment.policyResult.reason} allowed=${assessment.policyResult.allowed} — delegated to evaluateFDEGovernancePolicy`,
    }).catch(() => {/* best-effort */});
  }
}

async function emitOffBypass(
  payload: HookPayload,
  projectRoot: string,
  mutating: boolean,
): Promise<void> {
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: true,
        errorClass: "prompt_dtc_gate_off_bypass",
        mode: "off",
        mutating,
        runtime: detectRuntime(payload) ?? "unknown",
        projectRoot,
        memoryLayers: ["semantic", "procedural"],
      } as Record<string, unknown>,
      toolName: "prompt-dtc-enforcement-gate",
      cwd: projectRoot,
      sessionId: payload.session_id,
      identity: "monitor",
      memoryLayers: ["semantic", "procedural"],
      reasoning: `prompt-dtc-enforcement-gate: mode=off tool=${toolName(payload)} mutating=${mutating} bypass audited`,
    });
  } catch {
    // best-effort audit only.
  }
}

function denyResult(reason: string): HookResult {
  return {
    message: "palantir-mini: prompt-DTC gate BLOCKED",
    decision: "block",
    reason,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
      additionalContext: reason,
    },
  };
}

async function promptDtcEnforcementGateImpl(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const requestedMode = gateMode();
  const mutating = isMutatingCandidate(p);
  const mutationClass = protectedMutationClassForPromptGate(p, mutating);
  const effectiveGateMode = resolveEffectiveGateMode({
    requestedMode,
    mutationClass,
  });
  const mode = effectiveGateMode.effectiveMode;
  const projectRoot = resolveProjectRoot(p);
  const explicitMode = hasExplicitGateMode();
  const cwdProjectRoot = findProjectRoot(p.cwd ?? process.cwd());
  const tmpRoot = path.resolve(process.env.TMPDIR ?? "/tmp");
  const cwdProjectRootIsTempRoot =
    cwdProjectRoot !== null &&
    cwdProjectRoot !== undefined &&
    path.resolve(cwdProjectRoot) === tmpRoot;

  if (!mutationClass && !explicitMode && (!cwdProjectRoot || cwdProjectRootIsTempRoot)) {
    await emitOffBypass(p, projectRoot, mutating);
    return { message: "palantir-mini: prompt-DTC gate off" };
  }

  // Bypass: PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS=1 honored in all modes except off
  // (off already exits early below, so bypass applies to advisory/selective-blocking/scoped-blocking/blocking).
  const bypassEnv = process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS;
  if (bypassEnv === "1" && mode !== "off" && !mutationClass) {
    await emitOffBypass(p, projectRoot, mutating);
    return { message: "palantir-mini: prompt-DTC gate bypassed (PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS=1)" };
  }

  if (mode === "off") {
    await emitOffBypass(p, projectRoot, mutating);
    return { message: "palantir-mini: prompt-DTC gate off" };
  }

  const fdeSkip = await assessFDEEngineeringReadOnlySkip(projectRoot, p, mode, mutating);
  if (fdeSkip.skip) {
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: true,
          errorClass: "fde_readonly_skip_contract_required",
          advisory: true,
          source: "prompt-front-door+fde-session",
          fdeEngineeringSessionId: fdeSkip.session?.sessionId,
          fdeEngineeringPhase: fdeSkip.session?.phase,
          promptId: fdeSkip.envelope?.promptId,
          promptHash: fdeSkip.envelope?.promptHash,
          promptEnvelopeState: fdeSkip.envelope?.state,
          protectedMutation: fdeSkip.protectedMutation,
          reason: fdeSkip.reason,
        } as Record<string, unknown>,
        toolName: "prompt-dtc-enforcement-gate",
        cwd: projectRoot,
        sessionId: p.session_id,
        identity: "monitor",
        memoryLayers: ["working", "procedural"],
        reasoning: [
          `prompt-dtc-enforcement-gate: FDE read-only session skip`,
          `session=${fdeSkip.session?.sessionId ?? "none"}`,
          `phase=${fdeSkip.session?.phase ?? "none"}`,
          `promptId=${fdeSkip.envelope?.promptId ?? "none"}`,
          `mode=${mode} tool=${toolName(p)}`,
          `reason=${fdeSkip.reason}`,
        ].join(" "),
      });
    } catch {
      // best-effort only — never let emit failure bubble.
    }
    return {
      message:
        "palantir-mini: prompt-DTC gate skipped (FDE ontology-engineering read-only session; advisory skip)",
      additionalContext:
        `FDE ontology-engineering session ${fdeSkip.session?.sessionId} is in read-only phase ` +
        `${fdeSkip.session?.phase}; promptId=${fdeSkip.envelope?.promptId}. ` +
        "Protected mutation still requires approved SIC/DTC.",
    };
  }

  // PR 5.11: selective-blocking mode — only gate ontology-affecting MCP tools.
  if (mode === "selective-blocking") {
    const isOntologyAffecting = isOntologyAffectingForSelectiveBlocking(p);
    const scopedBlocking = assessScopedBlockingSurface(p, projectRoot);
    if (!isOntologyAffecting) {
      if (mutating && scopedBlocking.scoped) {
        const assessment = await assessPromptDtc(projectRoot, p);
        await emitGateAssessment(p, projectRoot, mode, mutating, assessment, false, scopedBlocking);
        if (assessment.ok) {
          return { message: "palantir-mini: prompt-DTC gate OK (selective-blocking scoped advisory)" };
        }
        const reason = [
          `Prompt-DTC gate ADVISORY for ${toolName(p)} in ${projectRoot}.`,
          `Scoped blocking surface: ${scopedBlocking.reasons.join("; ")}.`,
          assessment.reason,
          "",
          "Default selective-blocking gates ontology-affecting MCP tools; scoped file surfaces remain advisory unless scoped-blocking/blocking is explicitly enabled.",
          "Escape: PALANTIR_MINI_PROMPT_DTC_GATE_MODE=off disables only this prompt-DTC gate.",
        ].join("\n");
        return {
          message: "palantir-mini: prompt-DTC gate advisory",
          additionalContext: reason,
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            additionalContext: reason,
          },
        };
      }
      return {
        message: `palantir-mini: prompt-DTC gate skipped (${toolName(p)} is not ontology-affecting; selective-blocking mode)`,
      };
    }
    // Check 60-min SIC approval cache
    const cacheResult = checkSicCacheForSelectiveBlocking(projectRoot, p);
    if (cacheResult.hit && !classifyHookTool(p).isProtectedMutation) {
      return {
        message: `palantir-mini: prompt-DTC gate OK (selective-blocking: SIC approval cache hit for promptId=${cacheResult.promptId})`,
      };
    }
    // Cache miss — run full gate assessment and block
    const assessment = await assessPromptDtc(projectRoot, p);
    await emitGateAssessment(p, projectRoot, mode, mutating, assessment, true, scopedBlocking);

    if (assessment.ok) {
      // Gate passed — record in SIC approval cache for subsequent calls
      const promptId = p.tool_input?.promptId;
      const approvalRef = assessment.envelope?.contractRefs.approvalRef;
      if (typeof promptId === "string") {
        recordSicApproval(projectRoot, promptId, typeof approvalRef === "string" ? approvalRef : undefined);
      }
      return { message: "palantir-mini: prompt-DTC gate OK (selective-blocking)" };
    }

    const reason = [
      `Prompt-DTC gate SELECTIVE-BLOCKING for ${toolName(p)} in ${projectRoot}.`,
      `Tool is ontology-affecting and no SIC approval found within last 60 min.`,
      assessment.reason,
      "",
      "Allowed while pending: read-only inspection, pm_semantic_intent_gate, contract approval/completion tools, and emit_event.",
      "Pass condition: SemanticIntentContract approved within last 60 min OR current prompt envelope state digital_twin_approved + approved contract refs + promptHash continuity.",
      "Escape: PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS=1 bypasses this gate. PALANTIR_MINI_PROMPT_DTC_GATE_MODE=off disables it entirely.",
    ].join("\n");
    return denyResult(reason);
  }

  if (!mutating) {
    return { message: `palantir-mini: prompt-DTC gate skipped (${toolName(p)} is read-only or allowed)` };
  }

  const scopedBlocking = assessScopedBlockingSurface(p, projectRoot);
  const assessment = await assessPromptDtc(projectRoot, p);
  const willDeny =
    mode === "blocking" || (mode === "scoped-blocking" && scopedBlocking.scoped);
  await emitGateAssessment(p, projectRoot, mode, mutating, assessment, willDeny, scopedBlocking);

  if (assessment.ok) {
    return { message: "palantir-mini: prompt-DTC gate OK" };
  }

  const reason = [
    `Prompt-DTC gate ${mode.toUpperCase()} for ${toolName(p)} in ${projectRoot}.`,
    scopedBlocking.scoped
      ? `Scoped blocking surface: ${scopedBlocking.reasons.join("; ")}.`
      : "Scoped blocking surface: none; advisory-only unless full blocking mode is enabled.",
    assessment.reason,
    "",
    "Allowed while pending: read-only inspection, pm_semantic_intent_gate, contract approval/completion tools, and emit_event.",
    "Pass condition: current prompt envelope state digital_twin_approved + approved prompt-local contract refs + promptHash continuity.",
    "Escape: PALANTIR_MINI_PROMPT_DTC_GATE_MODE=off disables only this prompt-DTC gate.",
  ].join("\n");

  if (willDeny) return denyResult(reason);
  return {
    message: "palantir-mini: prompt-DTC gate advisory",
    additionalContext: reason,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: reason,
    },
  };
}

export default async function promptDtcEnforcementGate(payload: unknown): Promise<HookResult> {
  try {
    return await promptDtcEnforcementGateImpl(payload);
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    const reason = `prompt-DTC gate failed closed on unexpected error: ${msg}`;
    try {
      process.stderr.write(`[palantir-mini/prompt-dtc-enforcement-gate] ${reason}\n`);
    } catch {
      // no-op: fail-closed result is returned even if stderr is unavailable.
    }
    return denyResult(reason);
  }
}

export const __test__ = {
  classifyHookTool,
  isMutatingCandidate,
  isReadOnlyBash,
  assessPromptDtc,
  collectTargetFiles,
  assessScopedBlockingSurface,
  scopedBlockingFileReason,
  isOntologyAffectingForSelectiveBlocking,
  isOntologyContextQueryMutation,
  assessFDEEngineeringReadOnlySkip,
  evaluatePreMutationImpactGate,
};

// OE-1 (T3): CLI entry — makes this gate runnable as a live hooks.json PreToolUse
// command (mirrors ontology-engineering-workflow-enforcement-gate.ts). The gate is
// wired LIVE on the mutation tool set; resolveEffectiveGateMode floors the
// `ontology-write` mutation class to `blocking`, so an ontology-affecting mutation is
// gated regardless of the env default mode. Reads the hook payload from stdin and
// writes the HookResult (incl. hookSpecificOutput.permissionDecision) to stdout; any
// failure fails closed via the default-export wrapper.
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

async function main(): Promise<void> {
  const raw = await readStdin();
  let payload: unknown = {};
  if (raw.trim().length > 0) {
    try {
      payload = JSON.parse(raw);
    } catch {
      process.stdout.write(
        JSON.stringify({
          message: "palantir-mini: prompt-DTC gate skipped - malformed hook payload",
          decision: "continue",
        }) + "\n",
      );
      return;
    }
  }
  const result = await promptDtcEnforcementGate(payload);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.main) {
  void main();
}
