// palantir-mini — Digital Twin Change Contract 12-criterion grading rubric.
//
// Canonical DTC GradingRubricDeclaration (dtc-rubric/v1). AIP-Evals-aligned;
// weights sum exactly 1.0. Dispatched via grade_outcome_with_rubric MCP
// (existing handler; no new handler required).
//
// Authority:
//   ~/.claude/plans/inherited-yawning-popcorn.md §6.1–§6.7
//   rule 16 v4.0.0 §GradingRubric
//   rule 26 v1.3.0 §Axis B (Verifiable)
//   research/palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md
//
// Sprint 97 W1 (2026-05-15), plan §6.1–§6.7.

import {
  GRADING_CRITERION_REGISTRY,
  gradingCriterionRid,
  type GradingCriterionDeclaration,
} from "#schemas/ontology/primitives/grading-criterion";
import {
  GRADING_RUBRIC_REGISTRY,
  gradingRubricRid,
  type GradingRubricDeclaration,
  type GradingRubricRid,
} from "#schemas/ontology/primitives/grading-rubric";
import type { DigitalTwinChangeContract } from "./contracts";

// =============================================================================
// Runtime type aliases
// =============================================================================

/** A DTC that has completed the fill-sequence (all prose fields populated). */
export type DtcWithFillFields = DigitalTwinChangeContract;

export type DtcRuntime = "claude" | "codex" | "cursor" | "gemini" | "unknown";

// =============================================================================
// Helper: is this DTC ontology-affecting?
// =============================================================================

/**
 * Returns true when the DTC declares at least one touched ontology ref.
 * Used by criterion #3 (dtc-typed-refs-presence-when-ontology-affecting).
 */
export function isOntologyAffectingDtc(dtc: DtcWithFillFields): boolean {
  return (dtc.touchedOntologyRefs?.length ?? 0) >= 1;
}

// =============================================================================
// Shared evidence schema (free-form; mirrors FDE rubric pattern)
// =============================================================================

const DTC_EVIDENCE_SCHEMA = JSON.stringify({
  type: "object",
  additionalProperties: true,
  properties: {
    reasoning: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
  },
});

const DTC_PROVENANCE =
  "sprint-WIP-DTC (2026-05-15); " +
  "rule 16 v4.0.0 §GradingRubric; rule 26 v1.3.0 §Axis B; " +
  "research/palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md";

// =============================================================================
// 12-criterion declarations (plan §6.1)
// =============================================================================

const PLACEHOLDER_PROSE = new Set([
  "tbd",
  "todo",
  "see sic",
  "none",
  "-",
  "n/a",
  "placeholder",
]);

/** C1: prose completeness — all 7 fields must be ≥40 chars and non-placeholder. */
const DTC_CRITERION_1: GradingCriterionDeclaration = {
  criterionId: gradingCriterionRid("dtc-prose-completeness-7-fields"),
  title: "DTC Prose Completeness (7 fields)",
  description:
    "Each of the 7 required prose fields must be ≥40 chars and not a placeholder value.",
  rubricDomain: "code",
  passFailLogic: { threshold: 1, scale: "pass-fail" },
  weightInRubric: 0.08,
  evidenceSchema: DTC_EVIDENCE_SCHEMA,
  validationExpression: `
    const proseFields = [
      "changeBoundary","branchProposalPolicy","permissionBoundary",
      "replayMigrationPlan","observabilityPlan","toolSurfaceReadiness","evaluationPlan"
    ];
    const PLACEHOLDER = new Set(["tbd","todo","see sic","none","-","n/a","placeholder"]);
    return proseFields.every(f => {
      const v = (dtc[f] ?? "").trim();
      return v.length >= 40 && !PLACEHOLDER.has(v.toLowerCase());
    });
  `,
  appliesToDomain: "ontology",
  tier: "none",
  provenance: DTC_PROVENANCE,
};

/** C2: prose semantic grounding — LLM judge; tier=critical → Opus xhigh. */
const DTC_CRITERION_2: GradingCriterionDeclaration = {
  criterionId: gradingCriterionRid("dtc-prose-semantic-grounding"),
  title: "DTC Prose Semantic Grounding",
  description:
    "Each prose field should cite real paths/terms/operations rather than being vacuously generic.",
  rubricDomain: "model",
  passFailLogic: { threshold: 7, scale: "0-10" },
  weightInRubric: 0.10,
  evidenceSchema: DTC_EVIDENCE_SCHEMA,
  scoringPrompt:
    "You are grading a DigitalTwinChangeContract's prose fields for semantic grounding. " +
    "For each of the 7 prose fields (changeBoundary, branchProposalPolicy, permissionBoundary, " +
    "replayMigrationPlan, observabilityPlan, toolSurfaceReadiness, evaluationPlan), judge whether " +
    "the content cites real paths, module names, operations, or specific terms rather than vacuous " +
    "placeholder phrases ('the system', 'standard practices', 'as needed'). " +
    "Output a score from 0-10 and per-field evidence notes.\n\n" +
    "Contract JSON: {{artifact}}",
  appliesToDomain: "ontology",
  tier: "critical",
  provenance: DTC_PROVENANCE,
};

/** C3: typed refs presence — when ontology-affecting, must have touchedOntologyRefs + requiredEvaluationRefs. */
const DTC_CRITERION_3: GradingCriterionDeclaration = {
  criterionId: gradingCriterionRid("dtc-typed-refs-presence-when-ontology-affecting"),
  title: "DTC Typed Refs Presence (when ontology-affecting)",
  description:
    "If the DTC affects the ontology (touchedOntologyRefs present), it must also declare requiredEvaluationRefs.",
  rubricDomain: "code",
  passFailLogic: { threshold: 1, scale: "pass-fail" },
  weightInRubric: 0.10,
  evidenceSchema: DTC_EVIDENCE_SCHEMA,
  validationExpression: `
    const isOntologyAffecting = (dtc.touchedOntologyRefs?.length ?? 0) >= 1;
    if (!isOntologyAffecting) return true; // vacuous pass
    return (dtc.touchedOntologyRefs?.length ?? 0) >= 1
        && (dtc.requiredEvaluationRefs?.length ?? 0) >= 1;
  `,
  appliesToDomain: "ontology",
  tier: "none",
  provenance: DTC_PROVENANCE,
};

/** C4: no open risks at approval. Mirrors validator line 599-605. */
const DTC_CRITERION_4: GradingCriterionDeclaration = {
  criterionId: gradingCriterionRid("dtc-risks-no-open-at-approval"),
  title: "DTC Risks — No Open at Approval",
  description: "No risk records with status=open may remain when the DTC is being approved.",
  rubricDomain: "code",
  passFailLogic: { threshold: 1, scale: "pass-fail" },
  weightInRubric: 0.08,
  evidenceSchema: DTC_EVIDENCE_SCHEMA,
  validationExpression: `
    return (dtc.risks ?? []).filter(r => r.status === "open").length === 0;
  `,
  appliesToDomain: "ontology",
  tier: "none",
  provenance: DTC_PROVENANCE,
};

/** C5: tool-surface risks must have designAlternative. Mirrors validator line 606-617. */
const DTC_CRITERION_5: GradingCriterionDeclaration = {
  criterionId: gradingCriterionRid("dtc-tool-surface-designAlternative"),
  title: "DTC Tool-Surface Risk Design Alternatives",
  description:
    "Tool-surface risks that are not status=not-applicable must declare a designAlternative.",
  rubricDomain: "code",
  passFailLogic: { threshold: 1, scale: "pass-fail" },
  weightInRubric: 0.06,
  evidenceSchema: DTC_EVIDENCE_SCHEMA,
  validationExpression: `
    return (dtc.risks ?? [])
      .filter(r => r.kind === "tool-surface" && r.status !== "not-applicable")
      .every(r => Boolean(r.designAlternative));
  `,
  appliesToDomain: "ontology",
  tier: "none",
  provenance: DTC_PROVENANCE,
};

/** C6: permission boundary aligned with mutation surfaces — tier=critical (Opus xhigh). */
const DTC_CRITERION_6: GradingCriterionDeclaration = {
  criterionId: gradingCriterionRid("dtc-permission-boundary-aligned-with-mutation-surfaces"),
  title: "DTC Permission Boundary ↔ Mutation Surfaces Alignment",
  description:
    "The permissionBoundary prose must name the same scope as permittedMutationSurfaces typed refs.",
  rubricDomain: "model",
  passFailLogic: { threshold: 7, scale: "0-10" },
  weightInRubric: 0.10,
  evidenceSchema: DTC_EVIDENCE_SCHEMA,
  scoringPrompt:
    "You are grading a DigitalTwinChangeContract for alignment between its permissionBoundary prose " +
    "and its permittedMutationSurfaces typed references. Score 0-10: " +
    "10 = boundary exactly names all mutation surfaces (neither over-permissive nor under-permissive); " +
    "7-9 = minor scope gap; 5-6 = noticeable gap; <5 = significant misalignment. " +
    "Provide per-surface evidence notes.\n\n" +
    "Contract JSON: {{artifact}}",
  appliesToDomain: "ontology",
  tier: "critical",
  provenance: DTC_PROVENANCE,
};

/** C7: evaluation plan cites eval suite or not-applicable. */
const DTC_CRITERION_7: GradingCriterionDeclaration = {
  criterionId: gradingCriterionRid("dtc-evaluation-plan-cites-eval-suite-or-not-applicable"),
  title: "DTC Evaluation Plan Cites AIP Eval Suite",
  description:
    "evaluationPlan must either reference an AIP Eval suite ID/path or provide explicit not-applicable rationale.",
  rubricDomain: "model",
  passFailLogic: { threshold: 7, scale: "0-10" },
  weightInRubric: 0.08,
  evidenceSchema: DTC_EVIDENCE_SCHEMA,
  scoringPrompt:
    "You are grading a DigitalTwinChangeContract's evaluationPlan field. Score 0-10: " +
    "10 = references at least one AIP Eval suite ID or path (e.g. 'eval-suite/dtc-v1', " +
    "'palantir-foundry/aip/eval-suite', etc.); " +
    "8-9 = references a broader eval category; " +
    "5-7 = provides explicit 'not-applicable: <reason>' rationale for read-only work; " +
    "<5 = vague or missing.\n\n" +
    "evaluationPlan value: {{artifact}}",
  appliesToDomain: "ontology",
  tier: "normal",
  provenance: DTC_PROVENANCE,
};

/** C8: branch policy alignment — when ontology-affecting, must have requiredBranchPolicyRef + non-trivial prose. */
const DTC_CRITERION_8: GradingCriterionDeclaration = {
  criterionId: gradingCriterionRid("dtc-branch-policy-alignment"),
  title: "DTC Branch Policy Alignment",
  description:
    "When the DTC is ontology-affecting, requiredBranchPolicyRef must be set and branchProposalPolicy must be non-trivial.",
  rubricDomain: "code",
  passFailLogic: { threshold: 1, scale: "pass-fail" },
  weightInRubric: 0.06,
  evidenceSchema: DTC_EVIDENCE_SCHEMA,
  validationExpression: `
    const isOntologyAffecting = (dtc.touchedOntologyRefs?.length ?? 0) >= 1;
    if (!isOntologyAffecting) return true; // vacuous pass for non-ontology DTCs
    return Boolean(dtc.requiredBranchPolicyRef)
        && (dtc.branchProposalPolicy ?? "").trim() !== "none"
        && (dtc.branchProposalPolicy ?? "").trim().length >= 40;
  `,
  appliesToDomain: "ontology",
  tier: "none",
  provenance: DTC_PROVENANCE,
};

/** C9: replay migration completeness — model judge. */
const DTC_CRITERION_9: GradingCriterionDeclaration = {
  criterionId: gradingCriterionRid("dtc-replay-migration-completeness"),
  title: "DTC Replay Migration Completeness",
  description:
    "replayMigrationPlan must describe backfill/replay plan or provide explicit not-applicable rationale.",
  rubricDomain: "model",
  passFailLogic: { threshold: 7, scale: "0-10" },
  weightInRubric: 0.08,
  evidenceSchema: DTC_EVIDENCE_SCHEMA,
  scoringPrompt:
    "You are grading a DigitalTwinChangeContract's replayMigrationPlan field. Score 0-10: " +
    "10 = describes a concrete backfill or event-log replay plan (steps, tooling, responsible party); " +
    "7-9 = references a replay strategy with partial detail; " +
    "5-6 = provides a justified 'not-applicable' for clearly read-only work; " +
    "<5 = defers with 'TBD', 'see SIC', or is empty.\n\n" +
    "replayMigrationPlan value: {{artifact}}",
  appliesToDomain: "ontology",
  tier: "normal",
  provenance: DTC_PROVENANCE,
};

/** C10: change boundary specificity — tier=critical (Opus xhigh). */
const DTC_CRITERION_10: GradingCriterionDeclaration = {
  criterionId: gradingCriterionRid("dtc-change-boundary-specificity"),
  title: "DTC Change Boundary Specificity",
  description:
    "changeBoundary must name at least one specific path/module/surface matching affectedSurfaces.",
  rubricDomain: "model",
  passFailLogic: { threshold: 7, scale: "0-10" },
  weightInRubric: 0.08,
  evidenceSchema: DTC_EVIDENCE_SCHEMA,
  scoringPrompt:
    "You are grading a DigitalTwinChangeContract's changeBoundary field for specificity. Score 0-10: " +
    "10 = names at least one specific path, module, or surface that can be cross-referenced " +
    "with affectedSurfaces (e.g. 'lib/lead-intent/contracts.ts', 'bridge/handlers/pm-semantic-intent-gate.ts'); " +
    "7-9 = names a component or subsystem by name; " +
    "4-6 = names a general area ('the frontend', 'the hooks layer'); " +
    "<4 = purely generic noun-phrase ('the system', 'the codebase', 'this project').\n\n" +
    "changeBoundary value: {{artifact}}\naffectedSurfaces: {{spec}}",
  appliesToDomain: "ontology",
  tier: "critical",
  provenance: DTC_PROVENANCE,
};

/**
 * C11: simulator impact-radius — dispatched via gradeWithSimulator.
 * validationExpression is a JSON config blob per rule 16 §GradingRubric simulator domain.
 * Pass when totalAffected < 5 (LOWER radius = better; aligns with AIP Evals §OntologyEditSimulation).
 */
const DTC_CRITERION_11: GradingCriterionDeclaration = {
  criterionId: gradingCriterionRid("dtc-simulator-impact-radius"),
  title: "DTC Simulator Impact Radius",
  description:
    "Simulate ontology edits from touchedOntologyRefs; total affected RIDs must be < 5 for low blast-radius.",
  rubricDomain: "simulator",
  passFailLogic: { threshold: 5, scale: "0-1" },
  weightInRubric: 0.12,
  evidenceSchema: DTC_EVIDENCE_SCHEMA,
  validationExpression: JSON.stringify({
    dryRunHandlerArgs: { editsFromTouchedOntologyRefs: true },
    impactRadiusScale: "raw-affected-count",
  }),
  appliesToDomain: "ontology",
  tier: "none",
  provenance: DTC_PROVENANCE,
};

/** C12: approval continuity — approvalRef must be present and valid. */
const DTC_CRITERION_12: GradingCriterionDeclaration = {
  criterionId: gradingCriterionRid("dtc-approval-continuity"),
  title: "DTC Approval Continuity",
  description:
    "approvalRef must be set and validatePromptContinuity for the associated envelope must return valid=true.",
  rubricDomain: "code",
  passFailLogic: { threshold: 1, scale: "pass-fail" },
  weightInRubric: 0.06,
  evidenceSchema: DTC_EVIDENCE_SCHEMA,
  validationExpression: `
    return dtc.approvalRef !== undefined && dtc.approvalRef !== null;
  `,
  appliesToDomain: "ontology",
  tier: "none",
  provenance: DTC_PROVENANCE,
};

// =============================================================================
// All 12 criteria as an ordered array
// =============================================================================

const DTC_CRITERIA: readonly GradingCriterionDeclaration[] = [
  DTC_CRITERION_1,
  DTC_CRITERION_2,
  DTC_CRITERION_3,
  DTC_CRITERION_4,
  DTC_CRITERION_5,
  DTC_CRITERION_6,
  DTC_CRITERION_7,
  DTC_CRITERION_8,
  DTC_CRITERION_9,
  DTC_CRITERION_10,
  DTC_CRITERION_11,
  DTC_CRITERION_12,
];

// =============================================================================
// Weight invariant assertion (caught at module-load time)
// =============================================================================

const DTC_WEIGHT_SUM = DTC_CRITERIA.reduce((acc, c) => acc + c.weightInRubric, 0);
if (Math.abs(DTC_WEIGHT_SUM - 1.0) > 1e-9) {
  throw new Error(
    `[dtc-grading-rubric] DTC criterion weights must sum to 1.0; got ${DTC_WEIGHT_SUM}`,
  );
}

// =============================================================================
// Register all 12 criteria with the canonical GradingCriterionRegistry
// =============================================================================

for (const c of DTC_CRITERIA) {
  GRADING_CRITERION_REGISTRY.register(c);
}

// =============================================================================
// DTC_RUBRIC_V1 declaration
// =============================================================================

export const DTC_RUBRIC_RID: GradingRubricRid = gradingRubricRid("dtc-rubric/v1");

export const DTC_RUBRIC_V1: GradingRubricDeclaration = {
  rubricId: DTC_RUBRIC_RID,
  canonicalRubricRid: DTC_RUBRIC_RID,
  title: "Digital Twin Change Contract — 12-criterion rubric (dtc-rubric/v1)",
  description:
    "Canonical DTC grading rubric. Weights sum=1.0. " +
    "code/model/simulator/rule domains. " +
    "Criteria #2/#6/#10 tier=critical (Opus xhigh dispatch). " +
    "Codex deterministic-only fallback uses criteria 1/3/4/5/8/11/12 (weight=0.56).",
  criterionRids: DTC_CRITERIA.map((c) => c.criterionId),
  aggregator: {
    combinator: "weighted",
    threshold: 0.7,
    scale: "0-1",
  },
  appliesToDomain: "ontology",
  status: "canonical",
  registeredAt: "2026-05-15T00:00:00.000Z",
  provenance: DTC_PROVENANCE,
};

// =============================================================================
// registerDtcRubric — idempotent boot registration
// =============================================================================

/**
 * Register DTC_RUBRIC_V1 with a GradingRubricRegistry.
 * Called at MCP server boot (bridge/mcp-server.ts) so the canonical-rubric
 * bypass guard at grade-outcome-with-rubric.ts:86-106 finds the rubric.
 *
 * Passing a custom registry is for testing only. Production code calls
 * `registerDtcRubric()` (no arg → uses GRADING_RUBRIC_REGISTRY).
 */
export function registerDtcRubric(
  registry: typeof GRADING_RUBRIC_REGISTRY = GRADING_RUBRIC_REGISTRY,
): GradingRubricDeclaration {
  registry.register(DTC_RUBRIC_V1);
  return DTC_RUBRIC_V1;
}

// =============================================================================
// Grading context + result types
// =============================================================================

export interface DtcGradingContext {
  readonly projectPath: string;
  readonly promptId?: string;
  readonly sessionId?: string;
  readonly runtime?: DtcRuntime;
}

export interface DtcCriterionResult {
  readonly criterionId: string;
  readonly score: number;
  readonly pass: boolean;
  readonly reasoning?: string;
}

export interface DtcGradingVerdict {
  readonly verdict: "pass" | "revise" | "reject";
  readonly overall: number;
  readonly perCriterion: readonly DtcCriterionResult[];
  readonly rubricId: string;
  readonly skippedCriteria?: readonly string[];
}

// =============================================================================
// Deterministic-only criteria (Codex fallback path — plan §6.6 + §7.2)
// Weight sum of these 7 criteria = 0.08+0.10+0.08+0.06+0.06+0.12+0.06 = 0.56
// =============================================================================

/** Criterion IDs that can be evaluated deterministically (code/simulator domains). */
const DETERMINISTIC_CRITERION_IDS = new Set<string>([
  "dtc-prose-completeness-7-fields",         // C1 code 0.08
  "dtc-typed-refs-presence-when-ontology-affecting", // C3 code 0.10
  "dtc-risks-no-open-at-approval",           // C4 code 0.08
  "dtc-tool-surface-designAlternative",       // C5 code 0.06
  "dtc-branch-policy-alignment",             // C8 code 0.06
  "dtc-simulator-impact-radius",             // C11 simulator 0.12
  "dtc-approval-continuity",                 // C12 code 0.06
]);

// Verify weight sum of deterministic criteria = 0.56 (within tolerance)
const DETERMINISTIC_WEIGHT_SUM = DTC_CRITERIA
  .filter((c) => DETERMINISTIC_CRITERION_IDS.has(c.criterionId as string))
  .reduce((acc, c) => acc + c.weightInRubric, 0);
if (Math.abs(DETERMINISTIC_WEIGHT_SUM - 0.56) > 1e-9) {
  throw new Error(
    `[dtc-grading-rubric] Deterministic criteria weight sum must be 0.56; got ${DETERMINISTIC_WEIGHT_SUM}`,
  );
}

// =============================================================================
// Internal scorer type (for gradeDigitalTwinChangeContract + tests)
// =============================================================================

/**
 * PerCriterionScorer is injectable for tests. Production code (Wave 4 bridge
 * handler integration) replaces the per-criterion scoring with actual
 * grade_outcome_with_rubric dispatch. For now the orchestrator calls this
 * injectable scorer for each criterion.
 */
export type PerCriterionScorer = (
  criterionId: string,
  dtc: DtcWithFillFields,
  context: DtcGradingContext,
) => Promise<DtcCriterionResult> | DtcCriterionResult;

/**
 * Default scorer — evaluates code-domain criteria deterministically;
 * model/simulator criteria return a neutral score of 0 (caller must inject
 * a real scorer or wire grade_outcome_with_rubric MCP for production use).
 */
function defaultScorer(
  criterionId: string,
  dtc: DtcWithFillFields,
): DtcCriterionResult {
  const proseFields = [
    "changeBoundary",
    "branchProposalPolicy",
    "permissionBoundary",
    "replayMigrationPlan",
    "observabilityPlan",
    "toolSurfaceReadiness",
    "evaluationPlan",
  ] as const;

  switch (criterionId) {
    case "dtc-prose-completeness-7-fields": {
      const pass = proseFields.every((f) => {
        const v = (dtc[f] ?? "").trim();
        return v.length >= 40 && !PLACEHOLDER_PROSE.has(v.toLowerCase());
      });
      return { criterionId, score: pass ? 1 : 0, pass };
    }
    case "dtc-typed-refs-presence-when-ontology-affecting": {
      const ontologyAffecting = isOntologyAffectingDtc(dtc);
      const pass = !ontologyAffecting
        || ((dtc.touchedOntologyRefs?.length ?? 0) >= 1
            && (dtc.requiredEvaluationRefs?.length ?? 0) >= 1);
      return { criterionId, score: pass ? 1 : 0, pass };
    }
    case "dtc-risks-no-open-at-approval": {
      const pass = (dtc.risks ?? []).filter((r) => r.status === "open").length === 0;
      return { criterionId, score: pass ? 1 : 0, pass };
    }
    case "dtc-tool-surface-designAlternative": {
      const pass = (dtc.risks ?? [])
        .filter((r) => r.kind === "tool-surface" && r.status !== "not-applicable")
        .every((r) => Boolean(r.designAlternative));
      return { criterionId, score: pass ? 1 : 0, pass };
    }
    case "dtc-branch-policy-alignment": {
      const ontologyAffecting = isOntologyAffectingDtc(dtc);
      const pass = !ontologyAffecting
        || (Boolean(dtc.requiredBranchPolicyRef)
            && (dtc.branchProposalPolicy ?? "").trim() !== "none"
            && (dtc.branchProposalPolicy ?? "").trim().length >= 40);
      return { criterionId, score: pass ? 1 : 0, pass };
    }
    case "dtc-approval-continuity": {
      const pass = dtc.approvalRef !== undefined && dtc.approvalRef !== null;
      return { criterionId, score: pass ? 1 : 0, pass };
    }
    default:
      // model / simulator criteria — return neutral pass=false, score=0 in default path
      return { criterionId, score: 0, pass: false, reasoning: "model/simulator criterion requires injected scorer" };
  }
}

// =============================================================================
// gradeDigitalTwinChangeContract — main orchestrator
// =============================================================================

/**
 * Grades a filled DTC against the 12-criterion DTC_RUBRIC_V1.
 *
 * For Claude runtime (default): evaluates all 12 criteria using the provided
 * `scorer` function (injected per caller; production caller should wire
 * `grade_outcome_with_rubric` MCP dispatch for model/simulator criteria).
 *
 * For Codex runtime (or unknown without Claude): evaluates only the 7
 * deterministic-code criteria (C1/C3/C4/C5/C8/C11/C12; weight sum=0.56) and
 * emits a `dtc_grader_runtime_gap` event indicating the model criteria were
 * skipped. The normalised weighted score is adjusted to the deterministic
 * weight budget.
 *
 * Verdict tiers (match gradeSemanticIntentContract precedent):
 *   ≥ 0.70 → pass
 *   ≥ 0.50 → revise
 *   < 0.50 → reject
 */
export async function gradeDigitalTwinChangeContract(
  dtc: DtcWithFillFields,
  context: DtcGradingContext,
  scorer: PerCriterionScorer = defaultScorer,
): Promise<DtcGradingVerdict> {
  const runtime = context.runtime
    ?? (process.env["PALANTIR_MINI_HOST_RUNTIME"] as DtcRuntime | undefined)
    ?? "claude";

  const isCodexRuntime = runtime === "codex";

  const activeCriteria = isCodexRuntime
    ? DTC_CRITERIA.filter((c) => DETERMINISTIC_CRITERION_IDS.has(c.criterionId as string))
    : DTC_CRITERIA;

  const skippedCriteriaIds: string[] = isCodexRuntime
    ? DTC_CRITERIA
        .filter((c) => !DETERMINISTIC_CRITERION_IDS.has(c.criterionId as string))
        .map((c) => c.criterionId as string)
    : [];

  // Score all active criteria
  const perCriterion: DtcCriterionResult[] = [];
  for (const criterion of activeCriteria) {
    const result = await scorer(criterion.criterionId as string, dtc, context);
    perCriterion.push(result);
  }

  // Normalise per-criterion score to [0,1] range based on scale
  function normalisedScore(raw: number, criterionId: string): number {
    const criterion = DTC_CRITERIA.find((c) => (c.criterionId as string) === criterionId);
    if (!criterion) return 0;
    const { scale } = criterion.passFailLogic;
    if (scale === "0-10") return raw / 10;
    if (scale === "0-1") return raw;
    // pass-fail: score is already 0 or 1
    return raw;
  }

  // Weighted sum over active criteria; normalise by active weight budget
  const activeWeightBudget = activeCriteria.reduce((s, c) => s + c.weightInRubric, 0);
  let weightedSum = 0;
  for (const result of perCriterion) {
    const criterion = activeCriteria.find((c) => (c.criterionId as string) === result.criterionId);
    if (!criterion) continue;
    weightedSum += normalisedScore(result.score, result.criterionId) * criterion.weightInRubric;
  }

  const overall = activeWeightBudget > 0 ? weightedSum / activeWeightBudget : 0;

  const verdict: DtcGradingVerdict["verdict"] =
    overall >= 0.70 ? "pass" : overall >= 0.50 ? "revise" : "reject";

  if (isCodexRuntime && skippedCriteriaIds.length > 0) {
    // Emit runtime-gap advisory (plain string literal — T1-lib-emit-event registers canonical type)
    // This is a best-effort emit; failure should not block grading result.
    try {
      const { emit } = await import("../../scripts/log");
      // dtc_grader_runtime_gap type is registered by T1-lib-emit-event in a later wave.
      // Until then, use a type cast to allow the plain string literal event type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await emit({
        type: "dtc_grader_runtime_gap" as any,
        toolName: "gradeDigitalTwinChangeContract",
        cwd: context.projectPath,
        sessionId: context.sessionId,
        identity: "claude-code",
        reasoning:
          "Codex runtime cannot dispatch model/simulator criteria; deterministic-only path used. " +
          `Skipped: ${skippedCriteriaIds.join(", ")}`,
        payload: {
          runtime,
          skippedCriteria: skippedCriteriaIds,
          rubricId: DTC_RUBRIC_RID as string,
          projectPath: context.projectPath,
          promptId: context.promptId,
          sessionId: context.sessionId,
        } as any,
      });
    } catch {
      // Silently ignore emit failure — grading result is still valid
    }
  }

  return {
    verdict,
    overall,
    perCriterion,
    rubricId: DTC_RUBRIC_RID as string,
    skippedCriteria: skippedCriteriaIds.length > 0 ? skippedCriteriaIds : undefined,
  };
}
