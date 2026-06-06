// palantir-mini PR-13 — Hook enforcement level
//   enforcement: blocking
//   rationale:   permissionDecision=defer + returns deny when no bound SprintContract found; gates Edit|Write|MultiEdit on tracked-project files (B2) and commit_edits MCP calls.
// palantir-mini v3.14.0 — commit-edits-precondition hook (W1.2 P0 + W3.1c P3 + B2 file-edit gate + sprint-059 W2.8 Quick Sprint inline grader + sprint-113 PR 5.3 dry-run gate strengthening)
// Fires on: PreToolUse with matchers
//   - mcp__plugin_palantir-mini_palantir-mini__commit_edits (Blocking, full pipeline)
//   - Edit|Write|MultiEdit (Blocking, B2 file-edit gate; v3.12.0+)
//
// Per harness-base-mode blueprint §4-P0 + §4-P3 + rule 16 v3.4.0 §Default-On Policy:
//   v3.8.0 W1.2 (P0): gates commit_edits when no bound SprintContract exists.
//   v3.9.0 W3.1c (P3): EXTENDS gate — also requires a paired dry_run_graded event
//     (verdict=pass) for the same dryRunRef in events.jsonl, within the active
//     sprint window. Bypass: bound contract.mode="quick" (Quick Sprint runs
//     inline rubric per rule 16 v3.0.0 §Quick Sprint).
//   Grace period: contracts bound BEFORE W3.1c lands are exempt from second
//     check (legacy-bound recognized when no dry_run_computed event exists for
//     the current sprint).
//   v3.12.0 B2 (NEW): EXTENDS to Edit|Write|MultiEdit tools targeting tracked-
//     project files. file-edit branch checks harness dir + bound contract only
//     (no dry-run-then-grade — that pipeline is commit_edits MCP-specific).
//     Files outside tracked palantir-mini projects (e.g. ~/.claude/, /tmp/,
//     ~/.codex/) pass through unchanged.
//   v3.13.0 sprint-059 W2.8 (Quick Sprint inline grader):
//     When contract.mode="quick", commit_edits is STILL allowed (no new blocking),
//     but the hook now fires an inline grader call against the contract's inline
//     3-criterion rubric. If all criteria pass: emits quick_sprint_inline_graded.
//     If any criterion fails: emits quick_sprint_inline_grade_failed (advisory).
//     Neither outcome blocks the commit — Quick Sprint speed semantics preserved.
//     PALANTIR_MINI_HARNESS_BYPASS=1 is audit-only and cannot authorize the gate.
//   v3.14.0 sprint-113 PR 5.3 (dry-run gate strengthening; canonical plan v2 §4 row 5.3):
//     After passing existing dry-run gate, 3 new ADVISORY checks fire:
//     (1) Freshness: paired dry_run_graded event must be within last 30 min
//         (configurable: env PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN, default 30).
//         Stale → advisory errorClass="commit_gate_stale_dry_run_grade"; commit proceeds.
//     (2) Edit-shape drift: quick sha256 of candidate edit set in tool_input.edits;
//         compared against dryRunRef prefix-bytes. Drift → advisory
//         errorClass="commit_gate_edit_shape_drift"; commit proceeds.
//     (3) 4th-strike escalation: counts commit_gate_* advisories for THIS contract
//         within last 30 min. If count >= 3, 4th attempt BLOCKS with
//         permissionDecision:"deny". Bypass: PALANTIR_MINI_COMMIT_GATE_ESCALATE_BYPASS=1
//         (audited via commit_gate_escalate_bypass_invoked event).
//     Quick Sprint + grace-period paths are UNAFFECTED (checks only run for full-mode
//     commits that have already passed the existing dry-run gate).
//
// Bypass: PALANTIR_MINI_HARNESS_BYPASS=1 is audit-only and cannot authorize
// protected commit_edits or tracked file edits.
//
// Authority: rule 16 (3-agent-harness) §Default-On Policy + §Quick Sprint + §Loop steps 3-5
//            rule 12 (lead-protocol) §Lead-direct harness wrapping — gates
//            tracked-project Edit|Write|MultiEdit until a bound SprintContract
//            establishes evaluation context.
//            ~/.claude/plans/2026-04-28-harness-base-mode-blueprint.md §4-P0
//            ~/.claude/plans/dynamic-forging-globe.md §1.C (B2 escalation)

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { emit, eventsPathFor } from "../scripts/log";
import { readEvents } from "../lib/event-log/read";
import { findProjectRoot, harnessDirExists } from "./harness-base-mode-advisory";
import { findActiveBoundContractPath } from "../lib/harness/active-contract";
import type { EventEnvelope } from "../lib/event-log/types";
import type { GradingCriterionLite, CriterionScore } from "../bridge/handlers/grade-outcome/types";
import { gradeCode } from "../bridge/handlers/grade-outcome/code";
import { gradeRule } from "../bridge/handlers/grade-outcome/rule";
import { compilePreMutationPolicy } from "../lib/governance/policy-compiler";
import { preMutationGovernance } from "../lib/governance/pre-mutation-governance";
import {
  isAssignedReviewArtifactPath,
  normalizePalantirMiniMcpToolName,
} from "../lib/hooks/tool-classifier";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    project?: string;
    actionTypeRid?: string;
    edits?: unknown[];
    submissionCriteria?: unknown[];
    validateOnly?: boolean;
    /** v3.9.0 W3.1c: required when sprint mode != "quick". Generator MUST pass
     *  the dryRunRef from prior compute_edits_dry_run output. */
    dryRunRef?: string;
    /** v3.12.0 B2: present for Edit/Write/MultiEdit tools. */
    file_path?: string;
    /** v3.12.0 B2: alternate path field used by some tools (NotebookEdit, etc). */
    notebook_path?: string;
  };
}

/** Read SprintContract.mode field from bound contract path. Returns null if unreadable. */
function readContractMode(projectRoot: string, contractRelPath: string): string | null {
  try {
    const full = path.join(projectRoot, contractRelPath);
    const obj = JSON.parse(fs.readFileSync(full, "utf8"));
    return typeof obj?.mode === "string" ? obj.mode : null;
  } catch {
    return null;
  }
}

/**
 * Read the gradingRubric.criteria array from a Quick Sprint contract.
 * Returns empty array when the contract has no inline rubric (sprint-059 W2.8).
 */
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

/**
 * sprint-059 W2.8 — Run the Quick Sprint inline grader against the contract's
 * inline 3-criterion rubric. Calls synchronous code/rule domain graders only;
 * model-domain criteria are marked needs_human_review (avoid 120s subprocess
 * in a PreToolUse hook). Returns {scores, anyFailed, anySkipped}.
 */
function runQuickSprintInlineGrader(
  projectRoot: string,
  criteria: GradingCriterionLite[],
): {
  scores: CriterionScore[];
  anyFailed: boolean;
  anySkipped: boolean;
} {
  if (criteria.length === 0) {
    // No inline rubric — treat as vacuous pass (substrate only; audit trail preserved).
    return { scores: [], anyFailed: false, anySkipped: false };
  }

  const scores: CriterionScore[] = [];
  let anyFailed = false;
  let anySkipped = false;

  for (const criterion of criteria) {
    let score: CriterionScore;
    if (criterion.rubricDomain === "code") {
      // Synchronous shell execution (30s timeout per gradeCode).
      score = gradeCode(criterion, projectRoot, projectRoot);
    } else if (criterion.rubricDomain === "rule") {
      // Synchronous file read + regex/JSONSchema check.
      // For rule-domain, artifactPath = projectRoot (rubric typically checks the project tree).
      score = gradeRule(criterion, projectRoot);
    } else {
      // model/hybrid/human/simulator/visual: skip in hook context (no subprocess).
      score = {
        criterionId: criterion.criterionId,
        rubricDomain: criterion.rubricDomain,
        score: 0,
        weightedScore: 0,
        passFail: "needs_human_review",
        reasoning: `quick-sprint-inline-grader: ${criterion.rubricDomain}-domain criterion skipped in hook context (no subprocess). Requires pm_grader_dispatch in full-mode pipeline.`,
      };
      anySkipped = true;
    }
    scores.push(score);
    if (score.passFail === "fail") anyFailed = true;
  }

  return { scores, anyFailed, anySkipped };
}

/**
 * sprint-059 W2.8 — emit the Quick Sprint inline grade result (advisory only;
 * never blocks). Emits quick_sprint_inline_graded (all pass) or
 * quick_sprint_inline_grade_failed (any fail). Fire-and-forget (void).
 */
function emitQuickSprintInlineGradeResult(
  p: HookPayload,
  projectRoot: string,
  boundContract: string,
  scores: CriterionScore[],
  anyFailed: boolean,
  anySkipped: boolean,
): void {
  const verdict = anyFailed ? "fail" : "pass";
  const eventType = anyFailed ? "quick_sprint_inline_grade_failed" : "quick_sprint_inline_graded";
  const perCriterionSummary = scores.map(s => `${s.criterionId}=${s.passFail}`).join(", ");

  void emit({
    type: "validation_phase_completed",
    payload: {
      phase: "design",
      passed: !anyFailed,
      errorClass: eventType,
      verdict,
      perCriterionScore: scores.map(s => ({
        criterionId: s.criterionId,
        rubricDomain: s.rubricDomain,
        passFail: s.passFail,
        score: s.score,
      })),
      skippedModelDomain: anySkipped,
    } as Record<string, unknown>,
    toolName: "PreToolUse",
    cwd: projectRoot,
    sessionId: p.session_id,
    identity: "monitor",
    reasoning: `commit-edits-precondition quick-sprint-inline-grader: verdict=${verdict} contract=${boundContract} criteria=[${perCriterionSummary}]${anySkipped ? " (some model-domain criteria skipped)" : ""}`,
    memoryLayers: ["procedural", "semantic"],
  }).catch(() => {});
}

/** Has ANY dry_run_computed event ever been emitted in this project's events.jsonl?
 *  Used to detect "grace period" — legacy sprints bound before W3.1c landed
 *  are exempt from the second check until the dry-run pipeline is in use. */
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

/** Find the most-recent validation_phase_completed event with the given errorClass
 *  whose payload.reasoning contains `dryRunRef=<ref>`. Returns the event or null. */
function findDryRunEvent(
  events: EventEnvelope[],
  errorClass: "dry_run_computed" | "dry_run_graded" | "dry_run_skipped_validation_errors",
  dryRunRef: string,
): EventEnvelope | null {
  // Walk backwards (newest first) for early-exit
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]!;
    if (ev.type !== "validation_phase_completed") continue;
    const payload = ev.payload as { errorClass?: string };
    if (payload.errorClass !== errorClass) continue;
    const reasoning = ev.withWhat?.reasoning ?? "";
    if (reasoning.includes(`dryRunRef=${dryRunRef}`)) {
      return ev;
    }
  }
  return null;
}

// ─── v3.14.0 PR 5.3 helpers ─────────────────────────────────────────────────

/** Default freshness window in minutes for dry-run grade verdicts. */
const DEFAULT_FRESHNESS_MINUTES = 30;

/**
 * PR 5.3 check (1): Freshness check — returns age of graded event in ms, or null if unparseable.
 * Returns true (fresh) when age < freshnessMs; false (stale) otherwise.
 */
function isDryRunGradeFresh(
  gradedEvent: EventEnvelope,
  freshnessMs: number,
): boolean {
  const whenStr = gradedEvent.when;
  if (!whenStr || typeof whenStr !== "string") return true; // can't determine → optimistic
  const gradedAt = Date.parse(whenStr);
  if (isNaN(gradedAt)) return true;
  return (Date.now() - gradedAt) < freshnessMs;
}

/**
 * PR 5.3 check (2): Edit-shape drift — compute a fast sha256 over the candidate
 * edit set from tool_input.edits + edits count. Compare first 16 chars against
 * the dryRunRef. If the tool input doesn't expose edits (undefined/null), skip
 * (no advisory). Returns the computed shape hash for reference.
 *
 * Note: dryRunRef is an opaque sha256 of generator inputs; we cannot fully
 * reconstruct it here (we lack compute_edits_dry_run context). Instead we
 * compute a shape-hash of the current tool_input.edits and compare against
 * the last 16 chars of dryRunRef (a soft heuristic: if edits changed size/body
 * substantially, the hash suffix differs and we emit advisory).
 */
function computeEditShapeHash(edits: unknown): string | null {
  if (!Array.isArray(edits)) return null;
  try {
    const serialized = JSON.stringify(edits);
    return crypto.createHash("sha256").update(serialized).digest("hex");
  } catch {
    return null;
  }
}

/**
 * PR 5.3 check (3): Count commit_gate_* advisory events for this contract
 * within the last N minutes. Uses events.jsonl entries whose reasoning contains
 * the contractRef and whose type is "validation_phase_completed" with an
 * errorClass starting with "commit_gate_".
 */
function countCommitGateAdvisories(
  events: EventEnvelope[],
  boundContract: string,
  windowMs: number,
): number {
  const cutoff = Date.now() - windowMs;
  let count = 0;
  for (const ev of events) {
    if (ev.type !== "validation_phase_completed") continue;
    const payload = ev.payload as { errorClass?: string };
    if (typeof payload.errorClass !== "string") continue;
    if (!payload.errorClass.startsWith("commit_gate_")) continue;
    // Check recency
    const whenStr = ev.when;
    if (!whenStr || typeof whenStr !== "string") continue;
    const ts = Date.parse(whenStr);
    if (isNaN(ts) || ts < cutoff) continue;
    // Check contract ref — reasoning or payload should mention the contract path
    const reasoning = ev.withWhat?.reasoning ?? "";
    if (!reasoning.includes(boundContract) && !(ev.payload as Record<string, unknown>).contract) continue;
    count++;
  }
  return count;
}

interface HookResult {
  message:   string;
  decision?: "block" | "continue";
  reason?:   string;
  hookSpecificOutput?: {
    permissionDecision?:       "deny" | "allow";
    permissionDecisionReason?: string;
    additionalContext?:        string;
  };
}

/**
 * MCP tool names exempted from this hook by virtue of matcher specificity.
 * This hook is registered with matcher `mcp__plugin_palantir-mini_palantir-mini__commit_edits`,
 * so the following read-only tools never trigger it:
 *   pm_rule_query, pm_rule_audit, pm_recap, pm_retro_query, pm_learn_query,
 *   pm_substrate_query, pm_health_audit, pm_lead_brief, get_ontology,
 *   ontology_schema_get, impact_query, ontology_context_query,
 *   pm_plugin_self_check.
 * Listed here for documentation alignment with rule 16 v3.0.0 §Default-On Policy.
 */

const COMMIT_EDITS_TOOL = "commit_edits";
/** v3.12.0 B2: file-edit tools also gated when targeting tracked-project files.
 *  v3.12.0 F2 patch: NotebookEdit added per verifier-adversarial F2 finding. */
const FILE_EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

export default async function commitEditsPrecondition(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "";
  const normalizedToolName = normalizePalantirMiniMcpToolName(toolName);

  const isCommitEdits = normalizedToolName === COMMIT_EDITS_TOOL;
  const isFileEdit = FILE_EDIT_TOOLS.has(toolName);

  // Only intercept commit_edits MCP or file-edit tools (B2). Other tools pass through.
  if (!isCommitEdits && !isFileEdit) {
    return { message: `palantir-mini: commit-edits-precondition skipped (tool=${toolName})`, decision: "continue" };
  }

  // ─── B2 file-edit branch (v3.12.0) ───
  // For Edit|Write|MultiEdit, gate only when targeting a tracked palantir-mini project file.
  if (isFileEdit) {
    return await handleFileEditBranch(p, toolName);
  }

  // ─── commit_edits MCP branch (existing W1.2 + W3.1c pipeline) ───
  // Resolve project root — payload.tool_input.project takes precedence; else walk up from cwd.
  const projectFromInput = p.tool_input?.project;
  const projectRoot = projectFromInput && projectFromInput.length > 0
    ? projectFromInput
    : findProjectRoot(cwd);

  if (!projectRoot) {
    // No palantir-mini project context — let it through.
    return { message: "palantir-mini: commit-edits-precondition skipped (no project root)", decision: "continue" };
  }

  if (process.env.PALANTIR_MINI_HARNESS_BYPASS === "1") {
    return blockReason(p, projectRoot, "harness-bypass-denied",
      "PALANTIR_MINI_HARNESS_BYPASS=1 is audit-only and cannot authorize commit_edits. Use an approved SprintContract, SIC/DTC evidence, and the dry-run/grade pipeline.");
  }

  // Soft default-on (B1): require harness dir + bound contract.
  if (!harnessDirExists(projectRoot)) {
    return blockReason(p, projectRoot, "no-harness-dir",
      "Project has no .palantir-mini/harness/ directory. Run /palantir-mini:pm-harness-init then /palantir-mini:pm-harness-plan, OR /palantir-mini:pm-quick-sprint for a 1-iter wrapper.");
  }

  const boundContract = findActiveBoundContractPath(projectRoot);
  if (!boundContract) {
    return blockReason(p, projectRoot, "no-bound-contract",
      "No active SprintContract with status=bound. Run /palantir-mini:pm-quick-sprint \"<brief>\" <scope> for a 1-iter wrapper, OR /palantir-mini:pm-harness-sprint N for a full sprint.");
  }

  // ─── v3.9.0 W3.1c (P3) — second check: dry-run-then-grade gate ───
  //
  // Quick Sprint path (sprint-059 W2.8): contract.mode="quick" runs inline rubric
  // per rule 16 §Quick Sprint. commit_edits is STILL allowed (not blocked), but we
  // now also fire an inline grader call against the contract's inline 3-criterion
  // rubric to close the Generator/Evaluator separation gap (Theme B, M17/E.2).
  // Grader result is advisory only — emits quick_sprint_inline_graded or
  // quick_sprint_inline_grade_failed but never blocks the commit.
  // PALANTIR_MINI_HARNESS_BYPASS=1 was already handled above (early return) so
  // reaching here means bypass is NOT active.
  const contractMode = readContractMode(projectRoot, boundContract);
  if (contractMode === "quick") {
    // Read the contract's inline rubric (may be empty for legacy contracts without one).
    const rubricCriteria = readContractRubricCriteria(projectRoot, boundContract);
    const { scores, anyFailed, anySkipped } = runQuickSprintInlineGrader(projectRoot, rubricCriteria);
    // Emit advisory event (fire-and-forget; commit continues regardless of verdict).
    emitQuickSprintInlineGradeResult(p, projectRoot, boundContract, scores, anyFailed, anySkipped);
    // Allow the commit even if inline grade failed (Quick Sprint speed semantics preserved).
    return allowResult(p, projectRoot, boundContract, "quick-sprint-inline-graded");
  }

  // Read events.jsonl (auto-merges archive/ per rule 10 G3)
  const eventsPath = eventsPathFor(projectRoot);
  const events = readEvents(eventsPath);

  // Grace period: contracts bound BEFORE W3.1c landed get exempt from second
  // check until the dry-run pipeline is in actual use. Once any sprint emits
  // a dry_run_computed event, all subsequent commit_edits in this project
  // require the paired graded dry-run.
  if (!anyDryRunComputedEverEmitted(events)) {
    return allowResult(p, projectRoot, boundContract, "grace-period-no-dry-run-pipeline-yet");
  }

  // Dry-run pipeline IS in use → require dryRunRef + paired graded event
  const dryRunRef = p.tool_input?.dryRunRef;
  if (!dryRunRef || typeof dryRunRef !== "string" || dryRunRef.length === 0) {
    return blockReason(p, projectRoot, "missing-dry-run-ref",
      "Generator MUST pass dryRunRef in commit_edits args. Workflow: compute_edits_dry_run → pm_grader_dispatch (with dryRunRef + validationResult) → commit_edits (with same dryRunRef). Rule 16 v3.2.0 §Loop steps 3-5.");
  }

  // Find paired computed event
  const computedEvent = findDryRunEvent(events, "dry_run_computed", dryRunRef);
  if (!computedEvent) {
    return blockReason(p, projectRoot, "dry-run-not-computed",
      `No dry_run_computed event for dryRunRef=${dryRunRef}. Run compute_edits_dry_run first; it emits the event with this ref.`);
  }

  // Find paired graded event (or skipped-due-to-validation-errors)
  const gradedEvent = findDryRunEvent(events, "dry_run_graded", dryRunRef);
  const skippedEvent = findDryRunEvent(events, "dry_run_skipped_validation_errors", dryRunRef);

  if (skippedEvent) {
    return blockReason(p, projectRoot, "dry-run-validation-errors",
      `Dry-run for dryRunRef=${dryRunRef} was skipped because validation found errors. Fix the validation errors + re-run the pipeline.`);
  }

  if (!gradedEvent) {
    return blockReason(p, projectRoot, "dry-run-not-graded",
      `dry_run_computed exists for dryRunRef=${dryRunRef}, but no paired dry_run_graded event found. Run pm_grader_dispatch with dryRunRef={ref} on the dry-run output.`);
  }

  // Verify graded verdict = pass
  const gradedPassed = (gradedEvent.payload as { passed?: boolean }).passed === true;
  if (!gradedPassed) {
    return blockReason(p, projectRoot, "dry-run-graded-fail",
      `Paired dry_run_graded event exists for dryRunRef=${dryRunRef} but verdict=fail. Address grader feedback + re-run the pipeline.`);
  }

  // ─── v3.14.0 PR 5.3 — advisory checks (purely additive; never block on 1st-3rd strike) ───
  //
  // These checks only run for full-mode commits that have already PASSED the existing
  // dry-run gate above. Quick Sprint + grace-period paths returned early and never reach here.
  // Per canonical plan v2 §4 row 5.3 + rule 16 v3.2.0 §Loop steps 3-5.
  //
  // Freshness window (configurable): PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN env override.
  const freshnessMin = (() => {
    const envVal = process.env.PALANTIR_MINI_COMMIT_GATE_FRESHNESS_MIN;
    if (envVal && !isNaN(parseInt(envVal, 10))) return parseInt(envVal, 10);
    return DEFAULT_FRESHNESS_MINUTES;
  })();
  const freshnessMs = freshnessMin * 60 * 1000;
  // Escalation window — same 30-min window as freshness by default.
  const escalationWindowMs = freshnessMs;

  const advisoryErrorClasses: string[] = [];

  // Check (1): Freshness of graded verdict.
  const isFresh = isDryRunGradeFresh(gradedEvent, freshnessMs);
  if (!isFresh) {
    advisoryErrorClasses.push("commit_gate_stale_dry_run_grade");
  }

  // Check (2): Edit-shape drift — soft heuristic comparing current edits shape hash
  // against dryRunRef suffix (last 16 chars). Only advisory; no block here.
  const currentEdits = p.tool_input?.edits;
  const shapeHash = computeEditShapeHash(currentEdits);
  if (shapeHash !== null && dryRunRef.length >= 16) {
    // Compare last 16 hex chars of dryRunRef vs first 16 of current shape hash.
    // Mismatch signals that edit set changed substantially since dry-run was graded.
    const dryRunSuffix = dryRunRef.slice(-16);
    const shapeSuffix = shapeHash.slice(0, 16);
    if (dryRunSuffix !== shapeSuffix) {
      // Only emit advisory if there were actually edits to compare (non-empty array).
      if (Array.isArray(currentEdits) && currentEdits.length > 0) {
        advisoryErrorClasses.push("commit_gate_edit_shape_drift");
      }
    }
  }

  // Emit advisories (fire-and-forget); they feed the 4th-strike escalation counter.
  for (const errorClass of advisoryErrorClasses) {
    void emit({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: true,  // advisory only — does NOT indicate failure
        errorClass,
        advisory: true,
        contract: boundContract,
        dryRunRef,
      } as Record<string, unknown>,
      toolName: "PreToolUse",
      cwd: projectRoot,
      sessionId: p.session_id,
      identity: "monitor",
      reasoning: `commit-edits-precondition PR5.3 advisory: ${errorClass} contract=${boundContract} dryRunRef=${dryRunRef} (canonical plan v2 §4 row 5.3 + rule 16 v3.2.0 §Loop steps 3-5)`,
      memoryLayers: ["procedural"],
    }).catch(() => {});
  }

  // Check (3): 4th-strike escalation — count advisories including just-emitted ones.
  // Re-read events to include advisories emitted by prior attempts in this session.
  // (Current emit is fire-and-forget so may not yet be in events.jsonl; add local count.)
  const priorAdvisoryCount = countCommitGateAdvisories(events, boundContract, escalationWindowMs);
  const totalAdvisoryCount = priorAdvisoryCount + advisoryErrorClasses.length;

  if (totalAdvisoryCount >= 3) {
    // 4th-strike condition met: prior 3+ advisories for this contract → block.
    // Check escalation bypass first.
    if (process.env.PALANTIR_MINI_COMMIT_GATE_ESCALATE_BYPASS === "1") {
      void emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: true,
          errorClass: "commit_gate_escalate_bypass_invoked",
          advisory: true,
          contract: boundContract,
          priorAdvisoryCount,
          totalAdvisoryCount,
        } as Record<string, unknown>,
        toolName: "PreToolUse",
        cwd: projectRoot,
        sessionId: p.session_id,
        identity: "monitor",
        reasoning: `commit-edits-precondition PR5.3: 4th-strike escalation BYPASSED via PALANTIR_MINI_COMMIT_GATE_ESCALATE_BYPASS=1 (advisory count=${totalAdvisoryCount} for contract=${boundContract})`,
        memoryLayers: ["procedural"],
      }).catch(() => {});
    } else {
      // Block: return deny with escalation context.
      const escalationHint = [
        `4th-strike commit gate escalation: ${totalAdvisoryCount} advisory events (commit_gate_*) accumulated for contract ${boundContract} within the last ${freshnessMin} min.`,
        `Prior advisory classes: ${advisoryErrorClasses.join(", ") || "(none new this attempt)"}`,
        `This means the dry-run grade is either stale (>${freshnessMin} min old) or the edit shape has drifted from what was scored.`,
        `To resolve: re-run compute_edits_dry_run → pm_grader_dispatch → commit_edits with a fresh dryRunRef.`,
        `Emergency bypass: PALANTIR_MINI_COMMIT_GATE_ESCALATE_BYPASS=1 (audited).`,
      ].join("\n");
      return blockReason(p, projectRoot, "commit_gate_4th_strike_escalation", escalationHint);
    }
  }

  // Build advisory context for the allow result (if any advisories fired).
  const advisoryContext = advisoryErrorClasses.length > 0
    ? `\n[PR 5.3 ADVISORY] commit_gate checks: ${advisoryErrorClasses.join(", ")}. Strike count=${totalAdvisoryCount}/3 before escalation. Re-run dry-run pipeline if edits changed or grade is stale.`
    : undefined;

  // All gates passed (advisory may have fired, but <4 strikes) — allow.
  const allowBase = allowResult(p, projectRoot, boundContract, `harness_gate_passed dryRunRef=${dryRunRef}`);
  if (advisoryContext) {
    allowBase.hookSpecificOutput = {
      ...(allowBase.hookSpecificOutput ?? {}),
      additionalContext: ((allowBase.hookSpecificOutput?.additionalContext ?? "") + advisoryContext).trim(),
    };
  }
  return allowBase;
}

/**
 * v3.12.0 B2: file-edit branch for Edit|Write|MultiEdit tools.
 * - Extracts file_path from tool_input.
 * - Walks up to find tracked palantir-mini project; if none → continue.
 * - If file is inside ~/.claude/ or ~/.codex/ (Codex runtime overlays)
 *   → continue regardless of ambient palantir-mini ancestor.
 * - Else require harness dir + bound contract (no dry-run check; that's commit_edits-only).
 *
 * Note: /tmp/, /var/tmp/, /etc/ NOT in exempt list — tests + CI use /tmp paths
 * and need to exercise the gate. Files under /tmp without a tracked palantir-mini
 * ancestor pass through naturally via "no project root" branch.
 */
async function handleFileEditBranch(
  p: HookPayload,
  toolName: string,
): Promise<HookResult> {
  const filePath = p.tool_input?.file_path ?? p.tool_input?.notebook_path;
  if (!filePath || typeof filePath !== "string" || filePath.length === 0) {
    // No file_path in payload — can't determine tracked status; let it through.
    return { message: `palantir-mini: commit-edits-precondition skipped (file_path missing for tool=${toolName})`, decision: "continue" };
  }

  // Resolve absolute path; expand ~ to home if present.
  const home = process.env.HOME ?? "";
  const rawAbsPath = filePath.startsWith("~/") && home.length > 0
    ? path.resolve(home, filePath.slice(2))
    : path.resolve(filePath);

  // F1 patch: resolve symlinks via fs.realpathSync to defeat symlink-bypass attack
  // (verifier-adversarial S1). For files that don't yet exist (Write to new file),
  // resolve the deepest existing ancestor directory and re-attach the basename.
  let absPath: string;
  try {
    absPath = fs.realpathSync(rawAbsPath);
  } catch {
    // File doesn't exist (Write to new path); resolve dirname instead.
    let dir = path.dirname(rawAbsPath);
    let basename = path.basename(rawAbsPath);
    // Walk up until we find an existing ancestor.
    while (dir !== path.parse(dir).root) {
      try {
        const realDir = fs.realpathSync(dir);
        absPath = path.join(realDir, basename);
        break;
      } catch {
        basename = path.join(path.basename(dir), basename);
        dir = path.dirname(dir);
      }
    }
    absPath = absPath! ?? rawAbsPath; // fallback if walk failed
  }

  // Walk up from file's (resolved) directory to find tracked palantir-mini project.
  const fileDir = path.dirname(absPath);
  const projectRoot = findProjectRoot(fileDir);
  if (!projectRoot) {
    // File outside any tracked palantir-mini project — let it through.
    return { message: `palantir-mini: commit-edits-precondition file-edit skipped (no project root for ${absPath})`, decision: "continue" };
  }

  // Path-based exemption AFTER project resolution: ~/.claude/ and ~/.codex/ are
  // runtime overlay namespaces — even if an ambient palantir-mini ancestor exists
  // (e.g. user's home repo with .palantir-mini), edits to overlay files are
  // always exempt. This preserves Codex hook + skill + memory authoring.
  const overlayExempt = [
    home + "/.claude/",
    home + "/.codex/",
  ].filter(prefix => prefix.length > 1);
  for (const prefix of overlayExempt) {
    if (absPath.startsWith(prefix)) {
      return { message: `palantir-mini: commit-edits-precondition file-edit skipped (overlay exempt prefix=${prefix})`, decision: "continue" };
    }
  }

  if (isAssignedReviewArtifactPath(absPath)) {
    return {
      message: `palantir-mini: commit-edits-precondition file-edit skipped (assigned review artifact path: ${absPath})`,
      decision: "continue",
    };
  }

  if (process.env.PALANTIR_MINI_HARNESS_BYPASS === "1") {
    return blockReason(p, projectRoot, "harness-bypass-denied",
      `PALANTIR_MINI_HARNESS_BYPASS=1 is audit-only and cannot authorize tracked file edits (${absPath}). Use an approved bound SprintContract instead.`);
  }

  // Inside tracked project — require harness dir + bound contract (no dry-run check).
  if (!harnessDirExists(projectRoot)) {
    return blockReason(p, projectRoot, "no-harness-dir",
      `Project ${projectRoot} has no .palantir-mini/harness/ directory but tool=${toolName} targets a tracked file (${absPath}). Run /palantir-mini:pm-harness-init then /palantir-mini:pm-quick-sprint for a 1-iter wrapper. SessionStart auto-bootstrap should have done this — check PALANTIR_MINI_AUTO_SPRINT_DISABLE env var.`);
  }

  const boundContract = findActiveBoundContractPath(projectRoot);
  if (!boundContract) {
    return blockReason(p, projectRoot, "no-bound-contract",
      `Project ${projectRoot} has harness/ but no SprintContract with status=bound (tool=${toolName} on ${absPath}). Run /palantir-mini:pm-quick-sprint "<brief>" <scope> for a 1-iter wrapper, OR /palantir-mini:pm-harness-sprint N for a full sprint.`);
  }

  // === sprint-005 learning #8 follow-up: ontology:drift advisory ===
  // Non-blocking — best-effort check; any exit/stdout anomaly appended to additionalContext only.
  // Block never happens here. Will become blocking in sprint-007 after 1-week shakedown.
  let driftAdvisory = "";
  try {
    const { execSync } = await import("child_process");
    const out = execSync("bun run ontology:drift 2>&1", {
      cwd: projectRoot,
      timeout: 5000,
      encoding: "utf8",
    });
    if (/drift|stale|mismatch/i.test(out)) {
      driftAdvisory = `\n[ADVISORY] ontology:drift detected — run 'bun run ontology:gen' before next commit. Non-blocking in v3.13.0; will become blocking in sprint-007 if shakedown clean.`;
    }
  } catch {
    // best-effort — script absent, timeout, or non-zero exit with no matching output → silent
  }

  // Bound contract exists — file-edit branch ALLOWS without dry-run check (Quick Sprint always exempt; full mode dry-run is commit_edits-only).
  const allowBase = allowResult(p, projectRoot, boundContract, `b2-file-edit-allow tool=${toolName}`);
  if (driftAdvisory.length > 0) {
    allowBase.hookSpecificOutput = {
      ...(allowBase.hookSpecificOutput ?? {}),
      additionalContext: ((allowBase.hookSpecificOutput?.additionalContext ?? "") + driftAdvisory).trim(),
    };
  }
  return allowBase;
}

/**
 * PR-11: emit pre_mutation_governance_decided for commit-edits-precondition decisions.
 * Fire-and-forget; never blocks.
 */
function emitGovernanceDecided(
  p: HookPayload,
  projectRoot: string,
  toolName: string,
  filePath: string | undefined,
  allowed: boolean,
  ruleTag: string,
  humanReason: string,
): void {
  const targetFiles = filePath ? [filePath] : [];
  const policyResult = compilePreMutationPolicy({
    toolName,
    targetFiles,
    isProtectedMutation: true,
  });
  const governanceDecision = preMutationGovernance({
    toolName,
    targetFiles,
    allowed,
    reason: humanReason,
  });
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
    toolName: "commit-edits-precondition",
    cwd: projectRoot,
    sessionId: p.session_id,
    identity: "claude-code",
    memoryLayers: ["procedural"],
    reasoning: `commit-edits-precondition: rule=${ruleTag} allowed=${allowed} — delegated to compilePreMutationPolicy per PR-11 policy compiler migration (${humanReason})`,
  }).catch(() => {});
}

/** Build allow result + emit harness_gate_passed event. */
function allowResult(
  p: HookPayload,
  projectRoot: string,
  boundContract: string,
  reasonTag: string,
): HookResult {
  const toolName = p.tool_name ?? "";
  const filePath = p.tool_input?.file_path ?? p.tool_input?.notebook_path;
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase: "design",
      passed: true,
      errorClass: "harness_gate_passed",
    },
    toolName: "PreToolUse",
    cwd: projectRoot,
    sessionId: p.session_id,
    identity: "monitor",
    reasoning: `commit-edits-precondition OK (bound: ${boundContract}) — ${reasonTag}`,
  }).catch(() => {});
  emitGovernanceDecided(p, projectRoot, toolName, filePath, true, "default-allow", `harness gate passed — ${reasonTag}`);
  return { message: `palantir-mini: commit-edits-precondition OK (bound: ${boundContract}; ${reasonTag})`, decision: "continue" };
}

/** Build a block result with structured permission decision + advisory text. */
function blockReason(
  p: HookPayload,
  projectRoot: string,
  errorClass: string,
  hint: string,
): HookResult {
  const reason = [
    `palantir-mini commit-edits-precondition BLOCK in ${projectRoot}`,
    `Cause: ${errorClass}`,
    ``,
    `Harness B2 hard default-on (rule 16 v3.4.0 §Default-On Policy) requires a bound SprintContract before commit_edits OR file-edit on tracked files.`,
    ``,
    hint,
    ``,
    `Bypass env vars are audit-only and cannot authorize protected/tracked mutations.`,
    `For full text: pm_rule_query({ byId: 16 }) (or /palantir-mini:pm-rule 16)`,
  ].join("\n");

  process.stderr.write(`[palantir-mini/commit-edits-precondition] ${reason}\n`);

  const toolName = p.tool_name ?? "";
  const filePath = p.tool_input?.file_path ?? p.tool_input?.notebook_path;

  // best-effort emit (don't block on emit failure)
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase: "design",
      passed: false,
      errorClass,
    },
    toolName: "PreToolUse",
    cwd: projectRoot,
    sessionId: p.session_id,
    identity: "monitor",
    reasoning: `commit-edits-precondition BLOCK: ${errorClass} in ${projectRoot}`,
  }).catch(() => {});
  emitGovernanceDecided(p, projectRoot, toolName, filePath, false, "missing-digital-twin-change-contract", `commit-edits-precondition BLOCK: ${errorClass}`);

  return {
    message: `palantir-mini: commit-edits-precondition BLOCK (${errorClass})`,
    decision: "block",
    reason,
    hookSpecificOutput: {
      permissionDecision: "deny",
      permissionDecisionReason: reason,
      additionalContext: hint,
    },
  };
}
