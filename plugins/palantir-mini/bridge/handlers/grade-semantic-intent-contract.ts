// palantir-mini v6.32.0 — MCP tool handler: grade_semantic_intent_contract
//
// Thin wrapper over lib/semantic-intent/grade-rubric.ts.
// Validates input shape, runs the deterministic 7-criterion scorer, emits
// a sic_graded validation_phase_completed event, and returns SicGradingResult.
//
// No LLM calls — all scoring is purely deterministic heuristics.
//
// Per canonical plan v2 §4 row 5.13 (Phase 5 PR 13/16).
//
// Authority: ~/.claude/schemas/ontology/primitives/semantic-intent-contract.ts
//            lib/semantic-intent/grade-rubric.ts

import { emit, projectRoot as resolveProjectRoot } from "../../scripts/log";
import { gradeSemanticIntentContract } from "../../lib/semantic-intent/grade-rubric";
import type { SicGradingResult } from "../../lib/semantic-intent/grade-rubric";

export interface GradeSemanticIntentContractArgs {
  /** Absolute project path (defaults to CWD / PALANTIR_MINI_PROJECT env var). */
  projectPath?: string;
  /**
   * The SemanticIntentContract object to grade.
   * Must be a plain object; schemaVersion field is optional for flexibility.
   */
  semanticIntentContract: Record<string, unknown>;
}

export default async function gradeSemanticIntentContractHandler(
  rawArgs: unknown,
): Promise<SicGradingResult> {
  const args = (rawArgs ?? {}) as GradeSemanticIntentContractArgs;

  if (
    !args.semanticIntentContract ||
    typeof args.semanticIntentContract !== "object"
  ) {
    throw new Error(
      "grade_semantic_intent_contract: `semanticIntentContract` (object) required",
    );
  }

  const project = args.projectPath ?? resolveProjectRoot();

  // Cast to the internal type used by the pure scorer.
  // We don't import the schema primitive here to avoid coupling to a specific
  // snapshot version — the scorer tolerates missing fields gracefully.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sic = args.semanticIntentContract as any;

  const result = gradeSemanticIntentContract(sic);

  await emit({
    type: "validation_phase_completed",
    payload: {
      phase: "sic_graded",
      passed: result.verdict === "pass",
      errorClass: "sic_graded",
      verdict: result.verdict,
      overall: result.overall,
      perCriterion: result.perCriterion,
      contractId: typeof sic.contractId === "string" ? sic.contractId : null,
    } as Record<string, unknown>,
    toolName: "grade_semantic_intent_contract",
    cwd: project,
    // promotion-linkage wave 4 (needs-context-plumbing site 4) — additive
    // correlation-rid stamp; contractId-class, same SIC-grading purpose as
    // the wave-1/2 pm-semantic-intent-gate.ts stamps but a different handler.
    lineageRefs: {
      actionRid: typeof sic.contractId === "string" ? sic.contractId : undefined,
    },
    reasoning: result.reasoning,
  });

  return result;
}
