// palantir-mini — MCP tool handler: pm_grader_dispatch (W3e-1)
//
// Thin wrapper over lib/grader/dispatch-adapter.ts. Dispatches ONE model-domain
// criterion to a FRESH grader subprocess (eliminates self-grading bias).
// The dispatch CONTRACT is runtime-neutral; the spawn (claude -p /
// codex exec) is the adapter binding selected via PALANTIR_MINI_HOST_RUNTIME.
// Never throws on grader failure — degrades to score=0 with a captured reason.

import * as crypto from "crypto";
import { emit, projectRoot as resolveProjectRoot } from "../../scripts/log";
import {
  dispatchGrader,
  type GraderDispatchInput,
  type GraderDispatchResult,
} from "../../lib/grader/dispatch-adapter";

export interface PmGraderDispatchArgs extends GraderDispatchInput {
  projectPath?: string;
}

function sha256(s: string): string {
  return `sha256:${crypto.createHash("sha256").update(s).digest("hex").slice(0, 32)}`;
}

export default async function pmGraderDispatchHandler(
  rawArgs: unknown,
): Promise<GraderDispatchResult> {
  const args = (rawArgs ?? {}) as PmGraderDispatchArgs;

  if (!args.criterionId || typeof args.criterionId !== "string") {
    throw new Error("pm_grader_dispatch: `criterionId` (string) required");
  }
  if (!args.scoringPrompt || typeof args.scoringPrompt !== "string") {
    throw new Error("pm_grader_dispatch: `scoringPrompt` (string) required");
  }

  const project = args.projectPath ?? resolveProjectRoot();

  const result = await dispatchGrader({
    criterionId: args.criterionId,
    scoringPrompt: args.scoringPrompt,
    tier: args.tier,
    scale: args.scale,
    timeoutMs: args.timeoutMs,
    projectPath: project,
  });

  await emit({
    type: "evaluator_strictness_probe",
    payload: {
      sprintNumber: 0,
      iteration: 0,
      criterionHash: sha256(`${args.criterionId}:${args.scoringPrompt}`),
      score: result.score,
      evidenceCitationCount: result.evidence?.length ?? 0,
      failureClassCount: 0,
    } as Record<string, unknown>,
    toolName: "pm_grader_dispatch",
    cwd: project,
    reasoning: result.reasoning ?? `dispatched ${args.criterionId} to ${result.runtime} grader`,
  });

  return result;
}
