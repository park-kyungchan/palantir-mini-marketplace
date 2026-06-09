/**
 * palantir-mini SELF-ONTOLOGY — Function as a registered ObjectType + seeded instances
 * (self-Ontology verb/logic layer, M-SELF). Mirrors the `mcp-tool.objecttype.ts` /
 * `edit-function.objecttype.ts` idiom: ONE `Function` ObjectType (the type) modeling
 * pm's named LOGIC functions, with the identities seeded as a typed `FUNCTION_INSTANCES`
 * array. The canonical `../primitives/function.ts` is an alias-wrapper (FunctionRid +
 * FunctionKind union) with NO FUNCTION_REGISTRY — so pm models Function INSTANCES via the
 * snapshot-owned `*_INSTANCES` seed-array idiom, the same mechanism every other self-noun
 * uses. The brand + kind union come from the primitive; identity is snapshot-owned.
 *
 * 77 bound-logic Function instances (catalog §4 + O-1 structuredOutput) modeled at IDENTITY
 * level: functionName + group + sourcePath (+ kind/commits/deterministic descriptors). The 63
 * handler-backed functions trace 1:1 to `bridge/handlers/*.ts` (the SSoT the catalog commands
 * us to drive from — functional handlers 63 >> exposed tools 29); the remaining 14 are
 * lib-subsystem / recap composite LOGIC bound to `lib/**` (incl. structuredOutputFillOrFallback). CRITICAL (the under-modeling trap): the ~34
 * HIDDEN sub-mode handlers under `pm_health_audit` / `pm_substrate_query` / `pm_plugin_self_check`
 * are each their OWN Function instance — a naive 1-ObjectType-per-tool pass captures 29 and
 * silently drops ~34 real Function primitives. They are all seeded below.
 *
 * Bound logic stays as a Function over object sets (never inlined into the ActionType verb
 * — Golden-Hammer warning). The ActionType layer (`action-types.ts`) wraps a registered
 * deterministic EditFunction by NAME via `editFunctionName` (a string contract — no lib
 * import uphill), so this Function noun and the ActionType verb stay decoupled.
 *
 * @owner palantirkc-ontology
 * @purpose Self-Ontology Function noun + 76 seeded instances (M-SELF verb/logic layer)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";
import type { FunctionKind, FunctionRid } from "../primitives/function";
import { aipLogicFunctionRid } from "../primitives/function";

/** Stable RID for the self-Ontology Function ObjectType. */
export const FUNCTION_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/function",
);

/**
 * Function modeled as a Palantir ObjectType. `functionName` is the stable primary key
 * (the registered LOGIC function name); the descriptor properties record the group
 * (catalog §4 category), the bound runtime source path, the kind (FunctionKind), and
 * whether it commits / is deterministic. Instances below are snapshot-owned seeds (no lib
 * import) — the registration test cross-checks count + uniqueness + source resolution and
 * fails loud on drift.
 */
export const FUNCTION_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: FUNCTION_OBJECT_TYPE_RID,
  apiName: "Function",
  name: "Function",
  description:
    "palantir-mini LOGIC function surface modeled as an ObjectType: one instance per " +
    "named function (the runtime's callable bound logic). functionName identity plus " +
    "group (catalog category), sourcePath, kind (FunctionKind), commits, and " +
    "deterministic. Snapshot-owned seed of 76 bound-logic functions including the ~34 " +
    "hidden sub-mode handlers. An ActionType wraps a deterministic edit-function by NAME.",
  primaryKeyProperty: "functionName",
  titleProperty: "functionName",
  properties: [
    { name: "functionName", type: "string" },
    { name: "group", type: "string" },
    { name: "sourcePath", type: "string" },
    { name: "kind", type: "string" },
    { name: "commits", type: "boolean", optional: true },
    { name: "deterministic", type: "boolean", optional: true },
  ],
};

/**
 * A registered Function instance — stable function identity (functionName), the catalog
 * group it belongs to, the bound runtime source path, its FunctionKind, and optional
 * commit/determinism facts. The branded FunctionRid comes from the canonical primitive's
 * `aipLogicFunctionRid` helper (FunctionRid IS AIPLogicFunctionRid per
 * `../primitives/function.ts`).
 */
export interface FunctionInstance {
  readonly functionName: string;
  readonly functionRid: FunctionRid;
  readonly group: string;
  readonly sourcePath: string;
  readonly kind: FunctionKind;
  readonly commits?: boolean;
  readonly deterministic?: boolean;
}

/** Branded-RID helper local to this seed: `pm.self.ontology/function/<slug>`. */
const fnRid = (slug: string): FunctionRid =>
  aipLogicFunctionRid(`pm.self.ontology/function/${slug}`) as FunctionRid;

/**
 * Function instances — snapshot-owned seed of 76 bound-logic functions (catalog §4).
 * Grouped exactly as the catalog: core ontology-write+lineage, understand/front-door/
 * governance, the pm_health_audit dispatcher + 7 hidden sub-modes, the pm_substrate_query
 * dispatcher + 7 hidden sub-modes, grading/readiness, propagation audit, verify/recover
 * heuristics, self-check + validators (pm_plugin_self_check dispatcher + 6 hidden
 * validators), rules/research/scenario, and lib-subsystem composites. Paths repo-relative
 * to `plugins/palantir-mini/`.
 */
export const FUNCTION_INSTANCES: readonly FunctionInstance[] = [
  // ── Core ontology-write + lineage (10) ──────────────────────────────────────
  { functionName: "applyEditFunctionHandler", functionRid: fnRid("apply-edit-function-handler"), group: "core-ontology-write-lineage", sourcePath: "bridge/handlers/apply-edit-function.ts", kind: "edit-function", deterministic: true },
  { functionName: "commitEdits", functionRid: fnRid("commit-edits"), group: "core-ontology-write-lineage", sourcePath: "bridge/handlers/commit-edits.ts", kind: "edit-function", commits: true, deterministic: true },
  { functionName: "emitEvent", functionRid: fnRid("emit-event"), group: "core-ontology-write-lineage", sourcePath: "bridge/handlers/emit-event.ts", kind: "edit-function", commits: true, deterministic: true },
  { functionName: "eventsLogRotate", functionRid: fnRid("events-log-rotate"), group: "core-ontology-write-lineage", sourcePath: "bridge/handlers/events-log-rotate.ts", kind: "edit-function", deterministic: true },
  { functionName: "getOntology", functionRid: fnRid("get-ontology"), group: "core-ontology-write-lineage", sourcePath: "bridge/handlers/get-ontology.ts", kind: "edit-function", deterministic: true },
  { functionName: "ontologySchemaGet", functionRid: fnRid("ontology-schema-get"), group: "core-ontology-write-lineage", sourcePath: "bridge/handlers/ontology-schema-get.ts", kind: "edit-function", deterministic: true },
  { functionName: "impactQuery", functionRid: fnRid("impact-query"), group: "core-ontology-write-lineage", sourcePath: "bridge/handlers/impact-query.ts", kind: "edit-function", deterministic: true },
  { functionName: "preEditImpact", functionRid: fnRid("pre-edit-impact"), group: "core-ontology-write-lineage", sourcePath: "bridge/handlers/pre-edit-impact.ts", kind: "edit-function", deterministic: true },
  { functionName: "ontologyContextQuery", functionRid: fnRid("ontology-context-query"), group: "core-ontology-write-lineage", sourcePath: "bridge/handlers/ontology-context-query.ts", kind: "edit-function", deterministic: true },
  { functionName: "preEditImpactGate", functionRid: fnRid("pre-edit-impact-gate"), group: "core-ontology-write-lineage", sourcePath: "lib/impact-query/graph-confidence.ts", kind: "edit-function", deterministic: true },

  // ── Understand / front-door / governance (7) ────────────────────────────────
  { functionName: "ontologyEngineeringWorkflow", functionRid: fnRid("ontology-engineering-workflow"), group: "understand-front-door-governance", sourcePath: "bridge/handlers/pm-ontology-engineering-workflow.ts", kind: "aip-logic" },
  { functionName: "fdeOntologyTurn", functionRid: fnRid("fde-ontology-turn"), group: "understand-front-door-governance", sourcePath: "bridge/handlers/fde-ontology-turn.ts", kind: "aip-logic" },
  { functionName: "pmSemanticIntentGate", functionRid: fnRid("pm-semantic-intent-gate"), group: "understand-front-door-governance", sourcePath: "bridge/handlers/pm-semantic-intent-gate.ts", kind: "aip-logic" },
  { functionName: "pmSemanticConsistencyGate", functionRid: fnRid("pm-semantic-consistency-gate"), group: "understand-front-door-governance", sourcePath: "bridge/handlers/pm-semantic-consistency-gate.ts", kind: "aip-logic" },
  { functionName: "pmPreMutationGovernance", functionRid: fnRid("pm-pre-mutation-governance"), group: "understand-front-door-governance", sourcePath: "bridge/handlers/pm-pre-mutation-governance.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmIntentRouter", functionRid: fnRid("pm-intent-router"), group: "understand-front-door-governance", sourcePath: "bridge/handlers/pm-intent-router.ts", kind: "aip-logic" },
  { functionName: "pmLeadBrief", functionRid: fnRid("pm-lead-brief"), group: "understand-front-door-governance", sourcePath: "bridge/handlers/pm-lead-brief.ts", kind: "aip-logic" },

  // ── pm_health_audit mode-dispatcher + 7 HIDDEN sub-modes (8) ────────────────
  { functionName: "pmHealthAudit", functionRid: fnRid("pm-health-audit"), group: "pm-health-audit-dispatcher", sourcePath: "bridge/handlers/pm-health-audit.ts", kind: "aip-logic" },
  { functionName: "auditEvents5dConformance", functionRid: fnRid("audit-events-5d-conformance"), group: "pm-health-audit-submode", sourcePath: "bridge/handlers/audit-events-5d-conformance.ts", kind: "edit-function", deterministic: true },
  { functionName: "detectDocDrift", functionRid: fnRid("detect-doc-drift"), group: "pm-health-audit-submode", sourcePath: "bridge/handlers/detect-doc-drift.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmHandlerUsageAudit", functionRid: fnRid("pm-handler-usage-audit"), group: "pm-health-audit-submode", sourcePath: "bridge/handlers/pm-handler-usage-audit.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmMemoryLayerAudit", functionRid: fnRid("pm-memory-layer-audit"), group: "pm-health-audit-submode", sourcePath: "bridge/handlers/pm-memory-layer-audit.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmOutcomePairAudit", functionRid: fnRid("pm-outcome-pair-audit"), group: "pm-health-audit-submode", sourcePath: "bridge/handlers/pm-outcome-pair-audit.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmResearchCitationValidate", functionRid: fnRid("pm-research-citation-validate"), group: "pm-health-audit-submode", sourcePath: "bridge/handlers/pm-research-citation-validate.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmHarnessStrictnessAudit", functionRid: fnRid("pm-harness-strictness-audit"), group: "pm-health-audit-submode", sourcePath: "bridge/handlers/pm_harness_strictness_audit.ts", kind: "edit-function", deterministic: true },

  // ── pm_substrate_query mode-dispatcher + 7 HIDDEN sub-modes (8) ──────────────
  { functionName: "pmSubstrateQuery", functionRid: fnRid("pm-substrate-query"), group: "pm-substrate-query-dispatcher", sourcePath: "bridge/handlers/pm-substrate-query.ts", kind: "aip-logic" },
  { functionName: "replayLineage", functionRid: fnRid("replay-lineage"), group: "pm-substrate-query-submode", sourcePath: "bridge/handlers/replay-lineage.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmWorkflowLineageQuery", functionRid: fnRid("pm-workflow-lineage-query"), group: "pm-substrate-query-submode", sourcePath: "bridge/handlers/pm-workflow-lineage-query.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmEventQueryByGrade", functionRid: fnRid("pm-event-query-by-grade"), group: "pm-substrate-query-submode", sourcePath: "bridge/handlers/pm-event-query-by-grade.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmRetroQuery", functionRid: fnRid("pm-retro-query"), group: "pm-substrate-query-submode", sourcePath: "bridge/handlers/pm-retro-query.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmLearnQuery", functionRid: fnRid("pm-learn-query"), group: "pm-substrate-query-submode", sourcePath: "bridge/handlers/pm-learn-query.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmAgentLineageExport", functionRid: fnRid("pm-agent-lineage-export"), group: "pm-substrate-query-submode", sourcePath: "bridge/handlers/pm-agent-lineage-export.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmSubstrateQueryPostMerge", functionRid: fnRid("pm-substrate-query-post-merge"), group: "pm-substrate-query-submode", sourcePath: "bridge/handlers/pm-substrate-query-post-merge.ts", kind: "edit-function", deterministic: true },

  // ── Grading / readiness (5) ─────────────────────────────────────────────────
  { functionName: "gradeFdeReadiness", functionRid: fnRid("grade-fde-readiness"), group: "grading-readiness", sourcePath: "bridge/handlers/grade-fde-readiness.ts", kind: "aip-logic" },
  { functionName: "gradeOutcomeWithRubric", functionRid: fnRid("grade-outcome-with-rubric"), group: "grading-readiness", sourcePath: "bridge/handlers/grade-outcome-with-rubric.ts", kind: "aip-logic" },
  { functionName: "gradeSemanticIntentContract", functionRid: fnRid("grade-semantic-intent-contract"), group: "grading-readiness", sourcePath: "bridge/handlers/grade-semantic-intent-contract.ts", kind: "aip-logic" },
  { functionName: "pmGraderDispatch", functionRid: fnRid("pm-grader-dispatch"), group: "grading-readiness", sourcePath: "bridge/handlers/pm-grader-dispatch.ts", kind: "aip-logic" },
  { functionName: "pmValueGradeMetrics", functionRid: fnRid("pm-value-grade-metrics"), group: "grading-readiness", sourcePath: "bridge/handlers/pm-value-grade-metrics.ts", kind: "edit-function", deterministic: true },

  // ── Propagation audit (3) ───────────────────────────────────────────────────
  { functionName: "propagationAuditForward", functionRid: fnRid("propagation-audit-forward"), group: "propagation-audit", sourcePath: "bridge/handlers/propagation-audit-forward.ts", kind: "edit-function", deterministic: true },
  { functionName: "propagationAuditBackward", functionRid: fnRid("propagation-audit-backward"), group: "propagation-audit", sourcePath: "bridge/handlers/propagation-audit-backward.ts", kind: "edit-function", deterministic: true },
  { functionName: "propagationChainHealth", functionRid: fnRid("propagation-chain-health"), group: "propagation-audit", sourcePath: "bridge/handlers/propagation-chain-health.ts", kind: "edit-function", deterministic: true },

  // ── Verify / recover heuristics (9) ─────────────────────────────────────────
  { functionName: "pmRecap", functionRid: fnRid("pm-recap"), group: "verify-recover", sourcePath: "bridge/handlers/pm-recap.ts", kind: "aip-logic" },
  { functionName: "recapAccuracy", functionRid: fnRid("recap-accuracy"), group: "verify-recover", sourcePath: "lib/recap/classification-accuracy.ts", kind: "edit-function", deterministic: true },
  { functionName: "semanticDriftAudit", functionRid: fnRid("semantic-drift-audit"), group: "verify-recover", sourcePath: "bridge/handlers/semantic-drift-audit.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmRuntimeDecisionParity", functionRid: fnRid("pm-runtime-decision-parity"), group: "verify-recover", sourcePath: "bridge/handlers/pm-runtime-decision-parity.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmSurfaceContractAudit", functionRid: fnRid("pm-surface-contract-audit"), group: "verify-recover", sourcePath: "bridge/handlers/pm-surface-contract-audit.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmAipSourceAuthorityValidate", functionRid: fnRid("pm-aip-source-authority-validate"), group: "verify-recover", sourcePath: "bridge/handlers/pm-aip-source-authority-validate.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmWorkflowResponseValidate", functionRid: fnRid("pm-workflow-response-validate"), group: "verify-recover", sourcePath: "bridge/handlers/pm-workflow-response-validate.ts", kind: "edit-function", deterministic: true },
  { functionName: "sessionResume", functionRid: fnRid("session-resume"), group: "verify-recover", sourcePath: "bridge/handlers/session_resume.ts", kind: "aip-logic" },
  { functionName: "structuredOutputFillOrFallback", functionRid: fnRid("structured-output-fill-or-fallback"), group: "verify-recover", sourcePath: "lib/structured-output/index.ts", kind: "edit-function", deterministic: true },

  // ── Self-check + validators: pm_plugin_self_check dispatcher + 6 HIDDEN validators + workbench (8) ──
  { functionName: "pmPluginSelfCheck", functionRid: fnRid("pm-plugin-self-check"), group: "self-check-dispatcher", sourcePath: "bridge/handlers/pm-plugin-self-check.ts", kind: "aip-logic" },
  { functionName: "verifySchemaPin", functionRid: fnRid("verify-schema-pin"), group: "self-check-validator", sourcePath: "bridge/handlers/verify-schema-pin.ts", kind: "edit-function", deterministic: true },
  { functionName: "verifyCodegenHeaders", functionRid: fnRid("verify-codegen-headers"), group: "self-check-validator", sourcePath: "bridge/handlers/verify-codegen-headers.ts", kind: "edit-function", deterministic: true },
  { functionName: "validateHookCitations", functionRid: fnRid("validate-hook-citations"), group: "self-check-validator", sourcePath: "bridge/handlers/validate-hook-citations.ts", kind: "edit-function", deterministic: true },
  { functionName: "validateHookEventAllowlist", functionRid: fnRid("validate-hook-event-allowlist"), group: "self-check-validator", sourcePath: "bridge/handlers/validate-hook-event-allowlist.ts", kind: "edit-function", deterministic: true },
  { functionName: "validateSubstrateFiring", functionRid: fnRid("validate-substrate-firing"), group: "self-check-validator", sourcePath: "bridge/handlers/validate-substrate-firing.ts", kind: "edit-function", deterministic: true },
  { functionName: "validateManagedSettingsFragments", functionRid: fnRid("validate-managed-settings-fragments"), group: "self-check-validator", sourcePath: "bridge/handlers/validate-managed-settings-fragments.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmSemanticWorkbenchState", functionRid: fnRid("pm-semantic-workbench-state"), group: "self-check-validator", sourcePath: "bridge/handlers/pm-semantic-workbench-state.ts", kind: "edit-function", deterministic: true },

  // ── Rules + research + scenario (8) ─────────────────────────────────────────
  { functionName: "pmRuleQuery", functionRid: fnRid("pm-rule-query"), group: "rules-research-scenario", sourcePath: "bridge/handlers/pm-rule-query.ts", kind: "edit-function", deterministic: true },
  { functionName: "pmRuleAudit", functionRid: fnRid("pm-rule-audit"), group: "rules-research-scenario", sourcePath: "bridge/handlers/pm-rule-audit.ts", kind: "edit-function", deterministic: true },
  { functionName: "ruleCounts", functionRid: fnRid("rule-counts"), group: "rules-research-scenario", sourcePath: "bridge/handlers/rule-counts.ts", kind: "edit-function", deterministic: true },
  { functionName: "researchContextSelect", functionRid: fnRid("research-context-select"), group: "rules-research-scenario", sourcePath: "bridge/handlers/research-context-select.ts", kind: "aip-logic" },
  { functionName: "researchLibraryRefresh", functionRid: fnRid("research-library-refresh"), group: "rules-research-scenario", sourcePath: "bridge/handlers/research-library-refresh.ts", kind: "edit-function", deterministic: true },
  { functionName: "researchLibraryDiff", functionRid: fnRid("research-library-diff"), group: "rules-research-scenario", sourcePath: "bridge/handlers/research_library_diff.ts", kind: "edit-function", deterministic: true },
  { functionName: "runPlaywrightScenario", functionRid: fnRid("run-playwright-scenario"), group: "rules-research-scenario", sourcePath: "bridge/handlers/run-playwright-scenario.ts", kind: "edit-function", deterministic: true },
  { functionName: "completePlaywrightScenario", functionRid: fnRid("complete-playwright-scenario"), group: "rules-research-scenario", sourcePath: "bridge/handlers/complete-playwright-scenario.ts", kind: "edit-function", deterministic: true },

  // ── Lib-subsystem composite LOGIC (11) — composites bound to lib/** (never inlined) ──
  { functionName: "ontologyGraphIndexers", functionRid: fnRid("ontology-graph-indexers"), group: "lib-subsystem-composite", sourcePath: "lib/ontology-graph/index.ts", kind: "edit-function", deterministic: true },
  { functionName: "semanticGraphProducers", functionRid: fnRid("semantic-graph-producers"), group: "lib-subsystem-composite", sourcePath: "lib/semantic-graph/semantic-query.ts", kind: "edit-function", deterministic: true },
  { functionName: "memoryLayerAutoTag", functionRid: fnRid("memory-layer-auto-tag"), group: "lib-subsystem-composite", sourcePath: "lib/memory-layer/heuristics.ts", kind: "edit-function", deterministic: true },
  { functionName: "dirtyClassify", functionRid: fnRid("dirty-classify"), group: "lib-subsystem-composite", sourcePath: "lib/dirty-classify/index.ts", kind: "edit-function", deterministic: true },
  { functionName: "outcomePairing", functionRid: fnRid("outcome-pairing"), group: "lib-subsystem-composite", sourcePath: "lib/outcome-pairing/track.ts", kind: "edit-function", deterministic: true },
  { functionName: "delegationRecipeBuild", functionRid: fnRid("delegation-recipe-build"), group: "lib-subsystem-composite", sourcePath: "lib/delegation-recipe/recipe-builder.ts", kind: "edit-function", deterministic: true },
  { functionName: "validationPhaseEvaluators", functionRid: fnRid("validation-phase-evaluators"), group: "lib-subsystem-composite", sourcePath: "lib/validation/pipeline.ts", kind: "edit-function", deterministic: true },
  { functionName: "codegenGenerate", functionRid: fnRid("codegen-generate"), group: "lib-subsystem-composite", sourcePath: "lib/codegen/manifest.ts", kind: "edit-function", deterministic: true },
  { functionName: "capabilityRegistryResolve", functionRid: fnRid("capability-registry-resolve"), group: "lib-subsystem-composite", sourcePath: "lib/capability-registry/index.ts", kind: "edit-function", deterministic: true },
  { functionName: "promptFrontDoorMint", functionRid: fnRid("prompt-front-door-mint"), group: "lib-subsystem-composite", sourcePath: "lib/prompt-front-door/index.ts", kind: "edit-function", deterministic: true },
  { functionName: "fdeBuildLevelBuilders", functionRid: fnRid("fde-build-level-builders"), group: "lib-subsystem-composite", sourcePath: "lib/fde-build/index.ts", kind: "edit-function", deterministic: true },
];

// Register the Function ObjectType (the type). The instances above are snapshot-owned data
// the self-model exposes + the registration test cross-checks; instances are not
// type-registered (the canonical Function primitive is an alias-wrapper, no FUNCTION_REGISTRY).
OBJECT_TYPE_REGISTRY.register(FUNCTION_OBJECT_TYPE);
