/**
 * palantir-mini v1 — 6-phase validation pipeline orchestrator
 * @owner palantirkc-plugin-validation
 * @purpose palantir-mini v1 — 6-phase validation pipeline orchestrator
 */
// palantir-mini v1 — 6-phase validation pipeline orchestrator
// Domain: LOGIC (prim-logic-08 ValidationPhaseEvaluator — full pipeline)
//
// v1: Design + Compile + Runtime + Post-Write + Deploy + Merge.
// Full Palantir 6-phase validation set.
//
// Orchestrates the phase sequence and aggregates results. Each phase runs
// independently; failure in one phase surfaces in the aggregate verdict but
// does not abort later phases (configurable via failFast option).

import type { OntologyEdit } from "../event-log/types";
import type { SubmissionCriterion } from "../actions/submission-criteria";
import { runDesignPhase, type PhaseResult } from "./design";
import { runCompilePhase } from "./compile";
import { runRuntimePhase } from "./runtime";
import { runPostWritePhase } from "./post-write";
import { runDeployPhase } from "./deploy";
import { runMergePhase } from "./merge";

export type PhaseName = "design" | "compile" | "runtime" | "post_write" | "deploy" | "merge";

export interface PipelineOptions {
  projectRoot: string;
  schemaRoot:  string;
  tsconfigPath?: string;
  edits?:      OntologyEdit[];
  criteria?:   SubmissionCriterion[];
  /** Which phases to run — default: all 6 */
  phases?: PhaseName[];
  /** If true, stop pipeline on first phase failure (default: false) */
  failFast?: boolean;
  /** Expected schema lock version for merge phase */
  expectedSchemaVersion?: string;
}

export interface PipelineResult {
  passed:    boolean;
  phases:    PhaseResult[];
  durationMs: number;
}

export async function runPipeline(opts: PipelineOptions): Promise<PipelineResult> {
  const t0 = Date.now();
  const toRun = new Set<PhaseName>(opts.phases ?? ["design", "compile", "runtime", "post_write", "deploy", "merge"]);
  const phases: PhaseResult[] = [];

  if (toRun.has("design")) {
    const result = await runDesignPhase(opts.schemaRoot);
    phases.push(result);
    if (opts.failFast && !result.passed) return { passed: false, phases, durationMs: Date.now() - t0 };
  }
  if (toRun.has("compile")) {
    const result = await runCompilePhase({ projectRoot: opts.projectRoot, tsconfigPath: opts.tsconfigPath });
    phases.push(result);
    if (opts.failFast && !result.passed) return { passed: false, phases, durationMs: Date.now() - t0 };
  }
  if (toRun.has("runtime")) {
    const result = await runRuntimePhase({
      edits:    opts.edits    ?? [],
      criteria: opts.criteria ?? [],
    });
    phases.push(result);
    if (opts.failFast && !result.passed) return { passed: false, phases, durationMs: Date.now() - t0 };
  }
  if (toRun.has("post_write")) {
    const result = await runPostWritePhase({ projectRoot: opts.projectRoot, schemaRoot: opts.schemaRoot });
    phases.push(result);
    if (opts.failFast && !result.passed) return { passed: false, phases, durationMs: Date.now() - t0 };
  }
  if (toRun.has("deploy")) {
    const result = await runDeployPhase({ projectRoot: opts.projectRoot, schemaRoot: opts.schemaRoot });
    phases.push(result);
    if (opts.failFast && !result.passed) return { passed: false, phases, durationMs: Date.now() - t0 };
  }
  if (toRun.has("merge")) {
    const result = await runMergePhase({
      projectRoot:            opts.projectRoot,
      schemaRoot:             opts.schemaRoot,
      expectedSchemaVersion:  opts.expectedSchemaVersion,
    });
    phases.push(result);
  }

  return {
    passed: phases.every((p) => p.passed),
    phases,
    durationMs: Date.now() - t0,
  };
}

// Re-export phase runners for direct use
export { runDeployPhase, runMergePhase };
