// palantir-mini v3.9.0 — MCP tool handler: compute_edits_dry_run
// Domain: LOGIC (EditFunction — prim-logic-01) + ACTION (dry-run path)
//
// Wraps applyEditFunction (Tier-2) to compute OntologyEdit[] WITHOUT committing.
// This is the dry-run path: it DOES NOT call commit_edits / commitEdits.
//
// Mirrors Palantir OSDK 2.0 `$validateOnly` / `$returnEdits` semantics for the
// pre-commit inspection surface. Useful for UI previews and pre-flight checks.
//
// v3.9.0 (W3.1d) — emits validation_phase_completed errorClass="dry_run_computed"
// with a deterministic dryRunRef (sha256 of inputs) so commit-edits-precondition
// (W3.1c) can verify the matching graded dry-run ran before allowing commit_edits.
// Reference: ~/.claude/plans/glowing-frolicking-raven.md §1 W3.1d.
//
// See: apply-edit-function.ts (which also calls applyEditFunction but emits an
// edit_proposed event). compute_edits_dry_run is now also event-emitting (was
// silent pre-W3.1d) — pairs with pm-grader-dispatch's dry_run_graded emission.

import { createHash } from "crypto";
import { applyEditFunction } from "../../lib/actions/tier2-function";
import { evaluateCriteria } from "../../lib/actions/submission-criteria";
import { emit } from "../../scripts/log";
import type { OntologyEdit } from "../../lib/event-log/types";
import type { SubmissionCriterion } from "../../lib/actions/submission-criteria";

export interface ComputeEditsDryRunArgs {
  project: string;
  functionName: string;
  params: Record<string, unknown>;
  /** Optional submission criteria to validate against (dry-run only — no commit) */
  submissionCriteria?: SubmissionCriterion[];
}

export interface ComputeEditsDryRunResult {
  edits: unknown[];
  validationResult: "ok" | { errors: string[] };
  /**
   * v3.9.0 (W3.1d): deterministic sha256 hash of {project, edit RIDs sorted,
   * functionName, param keys sorted} truncated to 16 hex chars.
   *
   * Used by:
   *   - pm-grader-dispatch (W3.1e) to emit a paired dry_run_graded event with
   *     the same ref;
   *   - commit-edits-precondition (W3.1c) to verify the graded dry-run was
   *     performed before allowing commit_edits.
   *
   * Stable input-only hash — does NOT include validationResult so re-runs with
   * identical inputs produce the same ref regardless of ephemeral validation
   * outcome details.
   */
  dryRunRef: string;
}

/**
 * Compute deterministic dryRunRef from inputs only (per plan §1 W3.1d + Plan
 * agent §3 — input-only stable hash). Hash inputs:
 *   - project (absolute path)
 *   - edit RIDs (sorted ascending, joined with `|`)
 *   - functionName
 *   - sorted param keys (joined with `,`)
 */
export function computeDryRunRef(
  project: string,
  edits: unknown[],
  functionName: string,
  params: Record<string, unknown>,
): string {
  const paths = (edits as Array<{ rid?: string }>)
    .map((e) => e.rid ?? "no-rid")
    .sort()
    .join("|");
  const paramsKeys = Object.keys(params).sort().join(",");
  return createHash("sha256")
    .update(project)
    .update("|")
    .update(paths)
    .update("|")
    .update(functionName)
    .update("|")
    .update(paramsKeys)
    .digest("hex")
    .slice(0, 16);
}

export async function computeEditsDryRun(
  args: ComputeEditsDryRunArgs,
): Promise<ComputeEditsDryRunResult> {
  if (!args.project || typeof args.project !== "string") {
    throw new Error("compute_edits_dry_run: `project` required");
  }
  if (!args.functionName || typeof args.functionName !== "string") {
    throw new Error("compute_edits_dry_run: `functionName` required");
  }
  if (args.params === null || typeof args.params !== "object" || Array.isArray(args.params)) {
    throw new Error("compute_edits_dry_run: `params` must be a plain object");
  }

  // Execute the edit function — pure computation, NO commit
  const { edits } = await applyEditFunction(args.functionName, args.params);

  // v3.9.0 W3.1d: deterministic input-only hash. Computed before validation so
  // re-runs with identical inputs produce the same ref regardless of validation
  // outcome.
  const dryRunRef = computeDryRunRef(args.project, edits, args.functionName, args.params);

  // Evaluate submission criteria if provided (dry-run validation only)
  let validationResult: "ok" | { errors: string[] } = "ok";
  if (args.submissionCriteria && args.submissionCriteria.length > 0) {
    const evalResult = evaluateCriteria(
      edits as OntologyEdit[],
      args.submissionCriteria,
    );
    if (!evalResult.allPassed) {
      validationResult = {
        errors: evalResult.results
          .filter((r) => !r.passed)
          .map((r) => `[${r.type}] ${r.name}: ${r.reason ?? "failed"}`),
      };
    }
  }

  // v3.9.0 W3.1d — emit dry_run_computed event so commit-edits-precondition
  // (W3.1c) can verify the matching graded dry-run ran. Best-effort: failures
  // are non-fatal (handler still returns the result).
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: validationResult === "ok",
        errorClass: "dry_run_computed",
      },
      toolName: "compute_edits_dry_run",
      cwd: args.project,
      identity: "claude-code",
      reasoning: `dry-run-computed dryRunRef=${dryRunRef} fn=${args.functionName} editCount=${edits.length} validation=${validationResult === "ok" ? "ok" : "errors"}`,
    });
  } catch {
    // best-effort — emission failure must not block the dry-run result
  }

  return {
    edits,
    validationResult,
    dryRunRef,
  };
}

export default async function computeEditsDryRunHandler(
  rawArgs: unknown,
): Promise<ComputeEditsDryRunResult> {
  const args = (rawArgs ?? {}) as ComputeEditsDryRunArgs;
  return computeEditsDryRun(args);
}
