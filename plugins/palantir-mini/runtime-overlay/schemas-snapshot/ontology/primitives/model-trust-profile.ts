/**
 * @stable — ModelTrustProfile primitive (prim-trust-01, v1.57.0)
 *
 * Declares per-model trust posture for governance-sensitive operations.
 * The 5 bypass flags are ALL false by invariant — no high-effort model
 * may bypass ontology context retrieval, DTC approval, validation packs,
 * workflow trace lifecycle, or project-scope boundaries. Only
 * mayReduceClarificationQuestions is operator-tunable.
 *
 * Plan: ~/.claude/plans/foamy-giggling-kettle.md lines 905-947 (PR-14 deliverable C).
 *
 * Promoted at: v1.57.0 (foamy-giggling-kettle PR-14).
 *
 * @owner palantirkc-ontology
 */


export const MODEL_TRUST_PROFILE_SCHEMA_VERSION = "palantir-mini/model-trust-profile/v1" as const;

export interface ModelTrustProfile {
  readonly schemaVersion: typeof MODEL_TRUST_PROFILE_SCHEMA_VERSION;
  /** e.g. "claude-opus-4-7", "claude-sonnet-4-6". */
  readonly modelId: string;
  /** When true, the model may reduce clarification verbosity in interactive flows. */
  readonly mayReduceClarificationQuestions: boolean;
  /** Invariant: false. The model may NOT skip ontology_context_query before mutation. */
  readonly mayBypassOntologyContextQuery: false;
  /** Invariant: false. The model may NOT skip the DigitalTwinChangeContract gate. */
  readonly mayBypassDtcForMutation: false;
  /** Invariant: false. The model may NOT skip required validation packs before commit. */
  readonly mayBypassValidationForCommit: false;
  /** Invariant: false. The model may NOT skip OntologyWorkflowTrace open/close. */
  readonly mayBypassWorkflowTrace: false;
  /** Invariant: false. The model may NOT mutate outside ProjectScope.writableRoot. */
  readonly mayBypassProjectScopeBoundary: false;
}

/**
 * Default trust profile for any modelId — strict (no bypasses, may reduce clarification).
 * Consumers may override `mayReduceClarificationQuestions` per operator policy.
 */
export const DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE = {
  schemaVersion: MODEL_TRUST_PROFILE_SCHEMA_VERSION,
  mayReduceClarificationQuestions: false,
  mayBypassOntologyContextQuery: false as const,
  mayBypassDtcForMutation: false as const,
  mayBypassValidationForCommit: false as const,
  mayBypassWorkflowTrace: false as const,
  mayBypassProjectScopeBoundary: false as const,
} satisfies Omit<ModelTrustProfile, "modelId">;
