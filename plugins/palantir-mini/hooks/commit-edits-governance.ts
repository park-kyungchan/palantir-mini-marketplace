// palantir-mini PR-13 — Hook enforcement level
//   enforcement: blocking
//   rationale:   permissionDecision=defer + returns deny when FDE governance blocks; single merged hook for commit_edits matcher.
//
// palantir-mini PR-13 — commit-edits-governance hook
// Fires on: PreToolUse with matcher mcp__plugin_palantir-mini_palantir-mini__commit_edits|mcp__palantir_mini__commit_edits
//
// This hook merges prompt-dtc-enforcement-gate (commit_edits path) +
// commit-edits-precondition (commit_edits pipeline) into one script.
// Result: commit_edits hook stack timeout 40s → 10s (single 15s timeout).
//
// Pipeline:
//   1. Read active SprintContract + dry-run gate (from commit-edits-precondition).
//   2. Read prompt-DTC assessment and require approved DTC continuity.
//   3. evaluateFDEGovernancePolicy({toolName, targetFiles, dtc, sic, activeWorkflowTrace}).
//   4. Emit pre_mutation_governance_decided.
//   5. Return permissionDecision: allow/deny based on combined result.
//
// Dry-run grace period: inherited from commit-edits-precondition.ts — contracts bound
// before W3.1c landed are exempt until any dry_run_computed event is emitted.
//
// Bypass: PALANTIR_MINI_HARNESS_BYPASS=1 (audited).
// Authority: rule 16 §Default-On Policy + rule 12 §Lead-direct harness wrapping.

import * as fs from "node:fs";
import * as path from "node:path";
import { emit, eventsPathFor } from "../scripts/log";
import { readEvents } from "../lib/event-log/read";
import { findProjectRoot, harnessDirExists } from "./harness-base-mode-advisory";
import { findActiveBoundContractPath } from "../lib/harness/active-contract";
import type { EventEnvelope } from "../lib/event-log/types";
import { evaluateFDEGovernancePolicy } from "../lib/governance/fde-governance-policy";
import { evaluatePreMutationImpactGate } from "../lib/governance/pre-mutation-impact-gate";
import { preMutationGovernance } from "../lib/governance/pre-mutation-governance";
import { classifyHookTool } from "../lib/hooks/tool-classifier";
import {
  PromptFrontDoorStore,
  isPromptRuntime,
  validatePromptContinuity,
} from "../lib/prompt-front-door";
import type { PromptEnvelope, PromptRuntime } from "../lib/prompt-front-door";
import {
  validateDigitalTwinChangeContract,
  validateSemanticIntentContract,
} from "../lib/lead-intent/contracts";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../lib/lead-intent/contracts";
import type { GradingCriterionLite, CriterionScore } from "../bridge/handlers/grade-outcome/types";
import { gradeCode } from "../bridge/handlers/grade-outcome/code";
import { gradeRule } from "../bridge/handlers/grade-outcome/rule";
import { PROJECT_GATE_POLICY_REASON_CODES } from "../lib/governance/effective-gate-mode";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HookPayload {
  readonly cwd?: string;
  readonly session_id?: string;
  readonly tool_name?: string;
  readonly tool_input?: {
    readonly project?: string;
    readonly edits?: unknown[];
    readonly dryRunRef?: string;
    readonly promptId?: string;
    readonly promptHash?: string;
    readonly sessionId?: string;
    readonly runtime?: string;
    readonly file_path?: string;
    readonly notebook_path?: string;
  } & Record<string, unknown>;
}

interface HookResult {
  readonly message: string;
  readonly decision?: "block" | "continue";
  readonly reason?: string;
  readonly hookSpecificOutput?: {
    readonly permissionDecision?: "deny" | "allow";
    readonly permissionDecisionReason?: string;
    readonly additionalContext?: string;
  };
}

// ─── Harness / dry-run helpers (from commit-edits-precondition) ───────────────

function readContractMode(projectRoot: string, contractRelPath: string): string | null {
  try {
    const full = path.join(projectRoot, contractRelPath);
    const obj = JSON.parse(fs.readFileSync(full, "utf8"));
    return typeof obj?.mode === "string" ? obj.mode : null;
  } catch {
    return null;
  }
}

function readContractRubricCriteria(projectRoot: string, contractRelPath: string): GradingCriterionLite[] {
  try {
    const full = path.join(projectRoot, contractRelPath);
    const obj = JSON.parse(fs.readFileSync(full, "utf8"));
    const criteria = obj?.gradingRubric?.criteria;
    if (!Array.isArray(criteria)) return [];
    return criteria as GradingCriterionLite[];
  } catch {
    return [];
  }
}

function runQuickSprintInlineGrader(
  projectRoot: string,
  criteria: GradingCriterionLite[],
): { scores: CriterionScore[]; anyFailed: boolean; anySkipped: boolean } {
  if (criteria.length === 0) return { scores: [], anyFailed: false, anySkipped: false };
  const scores: CriterionScore[] = [];
  let anyFailed = false;
  let anySkipped = false;
  for (const criterion of criteria) {
    let score: CriterionScore;
    if (criterion.rubricDomain === "code") {
      score = gradeCode(criterion, projectRoot, projectRoot);
    } else if (criterion.rubricDomain === "rule") {
      score = gradeRule(criterion, projectRoot);
    } else {
      score = {
        criterionId: criterion.criterionId,
        rubricDomain: criterion.rubricDomain,
        score: 0,
        weightedScore: 0,
        passFail: "needs_human_review",
        reasoning: `commit-edits-governance quick-sprint-inline-grader: ${criterion.rubricDomain}-domain criterion skipped in hook context.`,
      };
      anySkipped = true;
    }
    scores.push(score);
    if (score.passFail === "fail") anyFailed = true;
  }
  return { scores, anyFailed, anySkipped };
}

function anyDryRunComputedEverEmitted(events: EventEnvelope[]): boolean {
  for (const ev of events) {
    if (
      ev.type === "validation_phase_completed" &&
      (ev.payload as { errorClass?: string }).errorClass === "dry_run_computed"
    ) {
      return true;
    }
  }
  return false;
}

function findDryRunEvent(
  events: EventEnvelope[],
  errorClass: "dry_run_computed" | "dry_run_graded" | "dry_run_skipped_validation_errors",
  dryRunRef: string,
): EventEnvelope | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]!;
    if (ev.type !== "validation_phase_completed") continue;
    const payload = ev.payload as { errorClass?: string };
    if (payload.errorClass !== errorClass) continue;
    const reasoning = ev.withWhat?.reasoning ?? "";
    if (reasoning.includes(`dryRunRef=${dryRunRef}`)) return ev;
  }
  return null;
}

function collectTargetFiles(payload: HookPayload): string[] {
  const input = payload.tool_input ?? {};
  const files = new Set<string>();
  const targetFiles = input.targetFiles;
  if (Array.isArray(targetFiles)) {
    for (const target of targetFiles) {
      if (typeof target === "string" && target.length > 0) files.add(target);
    }
  }
  const edits = input.edits;
  if (Array.isArray(edits)) {
    for (const edit of edits) {
      if (typeof edit !== "object" || edit === null) continue;
      const fp = (edit as { file_path?: unknown }).file_path;
      if (typeof fp === "string" && fp.length > 0) files.add(fp);
    }
  }
  if (typeof input.file_path === "string" && input.file_path.length > 0) files.add(input.file_path);
  return [...files];
}

// ─── DTC helpers (from prompt-dtc-enforcement-gate) ──────────────────────────

function detectRuntime(payload: HookPayload): PromptRuntime | undefined {
  const envRuntime = process.env.PALANTIR_MINI_HOST_RUNTIME;
  if (isPromptRuntime(envRuntime)) return envRuntime;
  const inputRuntime = payload.tool_input?.runtime;
  if (isPromptRuntime(inputRuntime)) return inputRuntime;
  return undefined;
}

function contractContinuityMatches(
  envelope: PromptEnvelope,
  contract: { promptId: string; promptHash: string },
): boolean {
  return contract.promptId === envelope.promptId && contract.promptHash === envelope.promptHash;
}

interface DtcAssessment {
  readonly ok: boolean;
  readonly errorClass: string;
  readonly reason: string;
  readonly dtc?: DigitalTwinChangeContract;
  readonly sic?: SemanticIntentContract;
  readonly envelope?: PromptEnvelope;
}

async function assessDtc(projectRoot: string, payload: HookPayload): Promise<DtcAssessment> {
  const sessionId = payload.tool_input?.sessionId ?? payload.session_id;
  const store = new PromptFrontDoorStore({ projectRoot });
  // Attempt to locate the current envelope.
  let envelope: PromptEnvelope | undefined;
  const promptId = payload.tool_input?.promptId;
  if (typeof promptId === "string" && typeof sessionId === "string") {
    envelope = (await store.readEnvelope(sessionId, promptId)) ?? undefined;
  } else if (typeof sessionId === "string" && sessionId.length > 0) {
    const runtime = detectRuntime(payload);
    const PROMPT_RUNTIMES: PromptRuntime[] = ["claude", "codex", "gemini"];
    const runtimes = runtime
      ? [runtime, ...PROMPT_RUNTIMES.filter((r) => r !== runtime)]
      : PROMPT_RUNTIMES;
    for (const rt of runtimes) {
      const pointer = await store.readCurrentPointer(rt, sessionId);
      if (!pointer) continue;
      envelope = (await store.readEnvelope(pointer.sessionId, pointer.promptId)) ?? undefined;
      if (envelope) break;
    }
  }

  if (!envelope) {
    return { ok: false, errorClass: "prompt_front_door_missing", reason: "No current prompt-front-door envelope." };
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
      reason: "Prompt-front-door continuity failed: " + continuity.issues.map((i) => `${i.field}: ${i.message}`).join("; "),
    };
  }

  const semanticRef = envelope.contractRefs.semanticIntentContractRef;
  const digitalTwinRef = envelope.contractRefs.digitalTwinChangeContractRef;
  if (!semanticRef) {
    return { ok: false, errorClass: "semantic_contract_required", envelope, reason: "No SemanticIntentContract ref. Call pm_semantic_intent_gate first." };
  }
  if (!digitalTwinRef || envelope.state !== "digital_twin_approved") {
    return { ok: false, errorClass: "digital_twin_contract_required", envelope, reason: "Prompt not digital_twin_approved." };
  }

  const semanticRecord = await store.readContractRecordByRef<SemanticIntentContract>(semanticRef);
  const digitalTwinRecord = await store.readContractRecordByRef<DigitalTwinChangeContract>(digitalTwinRef);
  if (!semanticRecord || !digitalTwinRecord) {
    return { ok: false, errorClass: "contract_ref_unresolved", envelope, reason: "Contract refs unresolved." };
  }
  if (!contractContinuityMatches(envelope, semanticRecord) || !contractContinuityMatches(envelope, digitalTwinRecord)) {
    return { ok: false, errorClass: "contract_ref_continuity_failed", envelope, reason: "Contract refs do not match current promptId/promptHash." };
  }

  const semanticValidation = validateSemanticIntentContract(semanticRecord.contract);
  const digitalTwinValidation = validateDigitalTwinChangeContract(digitalTwinRecord.contract);
  if (!semanticValidation.valid || !digitalTwinValidation.valid) {
    return {
      ok: false,
      errorClass: "contract_approval_required",
      envelope,
      reason: "Contract records not approved: " + [...semanticValidation.issues, ...digitalTwinValidation.issues].map((i) => `${i.field}: ${i.message}`).join("; "),
    };
  }

  return {
    ok: true,
    errorClass: "dtc_gate_passed",
    envelope,
    dtc: digitalTwinRecord.contract,
    sic: semanticRecord.contract,
    reason: "Prompt is digital_twin_approved with valid contracts.",
  };
}

// ─── Emit helpers ────────────────────────────────────────────────────────────

function emitGovernanceDecided(
  p: HookPayload,
  projectRoot: string,
  toolName: string,
  targetFiles: string[],
  allowed: boolean,
  ruleTag: string,
  humanReason: string,
  dtc?: DigitalTwinChangeContract,
  sic?: SemanticIntentContract,
): void {
  const policyResult = evaluateFDEGovernancePolicy({ toolName, targetFiles, dtc, sic, isProtectedMutation: true });
  const governanceDecision = preMutationGovernance({ toolName, targetFiles, allowed, reason: humanReason });
  void emit({
    type: "pre_mutation_governance_decided",
    payload: {
      decisionId: governanceDecision.decisionId,
      toolName,
      targetFiles,
      allowed,
      reason: humanReason,
      ruleApplied: ruleTag,
      refs: policyResult.refs,
    } as Record<string, unknown>,
    toolName: "commit-edits-governance",
    cwd: projectRoot,
    sessionId: p.session_id,
    identity: "claude-code",
    memoryLayers: ["procedural"],
    reasoning: `commit-edits-governance: rule=${ruleTag} allowed=${allowed} tool=${toolName} targetFiles=${targetFiles.join(",")} — unified governance hook calling evaluateFDEGovernancePolicy (${humanReason})`,
  }).catch(() => {});
}

function blockResult(p: HookPayload, projectRoot: string, errorClass: string, hint: string, targetFiles: string[]): HookResult {
  const reason = [
    `palantir-mini commit-edits-governance BLOCK in ${projectRoot}`,
    `Cause: ${errorClass}`,
    ``,
    hint,
    ``,
    `Bypass for emergency only: PALANTIR_MINI_HARNESS_BYPASS=1 (audited).`,
    `For full text: pm_rule_query({ byId: 16 })`,
  ].join("\n");
  process.stderr.write(`[palantir-mini/commit-edits-governance] ${reason}\n`);
  void emit({
    type: "validation_phase_completed",
    payload: { phase: "design", passed: false, errorClass },
    toolName: "PreToolUse",
    cwd: projectRoot,
    sessionId: p.session_id,
    identity: "monitor",
    reasoning: `commit-edits-governance BLOCK: ${errorClass} in ${projectRoot}`,
  }).catch(() => {});
  emitGovernanceDecided(p, projectRoot, p.tool_name ?? "commit_edits", targetFiles, false, errorClass, hint);
  return {
    message: `palantir-mini: commit-edits-governance BLOCK (${errorClass})`,
    decision: "block",
    reason,
    hookSpecificOutput: { permissionDecision: "deny", permissionDecisionReason: reason, additionalContext: hint },
  };
}

function failClosedResult(errorClass: string, reason: string): HookResult {
  return {
    message: `palantir-mini: commit-edits-governance BLOCK (${errorClass})`,
    decision: "block",
    reason,
    hookSpecificOutput: {
      permissionDecision: "deny",
      permissionDecisionReason: reason,
      additionalContext: reason,
    },
  };
}

function allowResult(p: HookPayload, projectRoot: string, reasonTag: string, targetFiles: string[], dtc?: DigitalTwinChangeContract, sic?: SemanticIntentContract): HookResult {
  void emit({
    type: "validation_phase_completed",
    payload: { phase: "design", passed: true, errorClass: "harness_gate_passed" },
    toolName: "PreToolUse",
    cwd: projectRoot,
    sessionId: p.session_id,
    identity: "monitor",
    reasoning: `commit-edits-governance OK — ${reasonTag}`,
  }).catch(() => {});
  emitGovernanceDecided(p, projectRoot, p.tool_name ?? "commit_edits", targetFiles, true, "default-allow", `harness gate passed — ${reasonTag}`, dtc, sic);
  return { message: `palantir-mini: commit-edits-governance OK (${reasonTag})`, decision: "continue" };
}

// ─── Main handler ────────────────────────────────────────────────────────────

export default async function commitEditsGovernance(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "mcp__plugin_palantir-mini_palantir-mini__commit_edits";
  const classification = classifyHookTool({ tool_name: toolName, tool_input: p.tool_input });

  // Resolve project root.
  const projectFromInput = p.tool_input?.project;
  const projectRoot = (projectFromInput && projectFromInput.length > 0)
    ? projectFromInput
    : findProjectRoot(cwd);

  if (!projectRoot) {
    return { message: "palantir-mini: commit-edits-governance skipped (no project root)", decision: "continue" };
  }

  const targetFiles = collectTargetFiles(p);

  // Project gate policy is strengthen-only for commit mutations. The legacy
  // emergency env remains audited, but it can no longer authorize commit_edits.
  if (process.env.PALANTIR_MINI_HARNESS_BYPASS === "1") {
    return blockResult(
      p,
      projectRoot,
      PROJECT_GATE_POLICY_REASON_CODES.bypassDenied,
      "PALANTIR_MINI_HARNESS_BYPASS=1 cannot weaken the project gate policy for commit_edits. Use approved SIC/DTC plus the dry-run/grade pipeline.",
      targetFiles,
    );
  }

  // ─── Gate 1: harness dir + bound contract ────────────────────────────────
  if (!harnessDirExists(projectRoot)) {
    return blockResult(p, projectRoot, "no-harness-dir",
      "Project has no .palantir-mini/harness/ directory. Run /palantir-mini:pm-quick-sprint \"<brief>\" <scope>.",
      targetFiles);
  }

  const boundContract = findActiveBoundContractPath(projectRoot);
  if (!boundContract) {
    return blockResult(p, projectRoot, "no-bound-contract",
      "No active SprintContract with status=bound. Run /palantir-mini:pm-quick-sprint \"<brief>\" <scope> or /palantir-mini:pm-harness-sprint N.",
      targetFiles);
  }

  const dtcAssessment = await assessDtc(projectRoot, p);
  if (!dtcAssessment.ok) {
    return blockResult(p, projectRoot, dtcAssessment.errorClass, dtcAssessment.reason, targetFiles);
  }

  const policyResult = evaluateFDEGovernancePolicy({
    toolName,
    targetFiles,
    toolInput: p.tool_input,
    dtc: dtcAssessment.dtc,
    sic: dtcAssessment.sic,
    isProtectedMutation: classification.isProtectedMutation || classification.operation === "commit_edits",
    touchedSurfaces: dtcAssessment.sic?.affectedSurfaces,
  });
  const impactGateResult = evaluatePreMutationImpactGate({
    projectRoot,
    promptId: dtcAssessment.envelope?.promptId,
    promptHash: dtcAssessment.envelope?.promptHash,
    toolName,
    toolInput: p.tool_input ?? {},
    resolvedTargetFiles: targetFiles,
    semanticIntentContractRef: dtcAssessment.envelope?.contractRefs.semanticIntentContractRef,
    digitalTwinChangeContractRef: dtcAssessment.envelope?.contractRefs.digitalTwinChangeContractRef,
    workContractRef: boundContract,
    semanticIntentContract: dtcAssessment.sic,
    digitalTwinChangeContract: dtcAssessment.dtc,
  });
  if (impactGateResult.decision === "deny") {
    return blockResult(p, projectRoot, "pre-mutation-impact-gate-denied", impactGateResult.reason, targetFiles);
  }

  if (!policyResult.allowed) {
    return blockResult(p, projectRoot, policyResult.reason, policyResult.humanReason, targetFiles);
  }

  // ─── Gate 2: Quick Sprint inline grader (advisory only) ──────────────────
  const contractMode = readContractMode(projectRoot, boundContract);
  if (contractMode === "quick") {
    const rubricCriteria = readContractRubricCriteria(projectRoot, boundContract);
    const { scores, anyFailed, anySkipped } = runQuickSprintInlineGrader(projectRoot, rubricCriteria);
    const verdict = anyFailed ? "fail" : "pass";
    const eventType = anyFailed ? "quick_sprint_inline_grade_failed" : "quick_sprint_inline_graded";
    void emit({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: !anyFailed,
        errorClass: eventType,
        verdict,
        perCriterionScore: scores.map((s) => ({ criterionId: s.criterionId, rubricDomain: s.rubricDomain, passFail: s.passFail, score: s.score })),
        skippedModelDomain: anySkipped,
      } as Record<string, unknown>,
      toolName: "PreToolUse",
      cwd: projectRoot,
      sessionId: p.session_id,
      identity: "monitor",
      reasoning: `commit-edits-governance quick-sprint-inline-grader: verdict=${verdict} contract=${boundContract}`,
      memoryLayers: ["procedural", "semantic"],
    }).catch(() => {});
    // Quick Sprint: allow regardless of inline grade verdict (speed semantics preserved).
    return allowResult(p, projectRoot, "quick-sprint-inline-graded", targetFiles, dtcAssessment.dtc, dtcAssessment.sic);
  }

  // ─── Gate 3: dry-run-then-grade (full pipeline) ───────────────────────────
  const eventsPath = eventsPathFor(projectRoot);
  const events = readEvents(eventsPath);

  if (!anyDryRunComputedEverEmitted(events)) {
    // Grace period — allow.
    return allowResult(p, projectRoot, "grace-period-no-dry-run-pipeline-yet", targetFiles, dtcAssessment.dtc, dtcAssessment.sic);
  }

  const dryRunRef = p.tool_input?.dryRunRef;
  if (!dryRunRef || typeof dryRunRef !== "string" || dryRunRef.length === 0) {
    return blockResult(p, projectRoot, "missing-dry-run-ref",
      "Generator MUST pass dryRunRef in commit_edits args. Workflow: compute_edits_dry_run → pm_grader_dispatch → commit_edits (with same dryRunRef). Rule 16 v3.2.0 §Loop steps 3-5.",
      targetFiles);
  }

  const computedEvent = findDryRunEvent(events, "dry_run_computed", dryRunRef);
  if (!computedEvent) {
    return blockResult(p, projectRoot, "dry-run-not-computed",
      `No dry_run_computed event for dryRunRef=${dryRunRef}. Run compute_edits_dry_run first.`,
      targetFiles);
  }

  const skippedEvent = findDryRunEvent(events, "dry_run_skipped_validation_errors", dryRunRef);
  if (skippedEvent) {
    return blockResult(p, projectRoot, "dry-run-validation-errors",
      `Dry-run for dryRunRef=${dryRunRef} was skipped due to validation errors. Fix errors + re-run pipeline.`,
      targetFiles);
  }

  const gradedEvent = findDryRunEvent(events, "dry_run_graded", dryRunRef);
  if (!gradedEvent) {
    return blockResult(p, projectRoot, "dry-run-not-graded",
      `dry_run_computed exists for dryRunRef=${dryRunRef}, but no paired dry_run_graded event. Run pm_grader_dispatch.`,
      targetFiles);
  }

  const gradedPassed = (gradedEvent.payload as { passed?: boolean }).passed === true;
  if (!gradedPassed) {
    return blockResult(p, projectRoot, "dry-run-graded-fail",
      `Paired dry_run_graded for dryRunRef=${dryRunRef} has verdict=fail. Address grader feedback + re-run pipeline.`,
      targetFiles);
  }

  return allowResult(p, projectRoot, `harness_gate_passed dryRunRef=${dryRunRef}`, targetFiles, dtcAssessment.dtc, dtcAssessment.sic);
}

// ─── Script entrypoint (invoked directly via bun run hooks/commit-edits-governance.ts) ─

/** Read all of stdin as UTF-8. Returns empty string on TTY or error. */
async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();
  let payload: unknown = null;
  if (raw.trim().length > 0) {
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      const reason = `commit-edits-governance failed closed because stdin is not valid JSON: ${msg}`;
      process.stderr.write(`[commit-edits-governance] ${reason}\n`);
      process.stdout.write(JSON.stringify(failClosedResult("invalid-stdin", reason)) + "\n");
      process.exit(0);
    }
  }

  let result: HookResult;
  try {
    result = await commitEditsGovernance(payload);
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    const reason = `commit-edits-governance failed closed on unhandled error: ${msg}`;
    process.stderr.write(`[commit-edits-governance] ${reason}\n`);
    result = failClosedResult("unhandled-exception", reason);
  }

  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(0);
}

void main();
