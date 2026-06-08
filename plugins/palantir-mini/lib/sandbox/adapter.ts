/**
 * Neutral Hands adapter contract (Executor dispatch) — W3e-3b.
 *
 * An `ExecAdapter` is the per-runtime Hands binding the Executor composes with.
 * Its two jobs:
 *   1. Declare the exec capabilities the runtime can serve (`supportedStepKinds`)
 *      — the capability check that drives the executor's fallback/gap path.
 *   2. Project the neutral RuntimeDecision into the runtime's decision. A CORRECT
 *      adapter preserves all 12 semantic fields and varies only runtime-specific
 *      fields (runtime, unsupportedSurfaceRefs); the pre-spawn parity gate
 *      (compareRuntimeDecisionParity) BLOCKS a spawn if a runtime diverges on a
 *      compared field.
 * Optional ingress: `normalizeNativeStep` turns a runtime-native exec payload
 * into neutral ExecStep[] (codex implements it; the executor's own steps are
 * already neutral).
 *
 * @owner palantirkc-plugin-actions
 * @purpose Neutral Hands adapter contract for the Executor (W3e-3b)
 */

import type { RuntimeDecision } from "../../core/contracts/aip-fde-local-surface";
import type { ExecRequest, ExecStep, ExecStepKind, RuntimeAdapterId } from "./contract";

export interface RuntimeDecisionProjectionInput {
  readonly request: ExecRequest;
  readonly neutral: RuntimeDecision;
}

export interface ExecAdapter {
  readonly runtimeId: RuntimeAdapterId;
  /** Exec-step kinds this adapter can serve in v1. */
  readonly supportedStepKinds: ReadonlySet<ExecStepKind>;
  /** Project the neutral decision into this runtime's decision (semantic fields
   *  preserved; only runtime-specific fields vary). */
  projectRuntimeDecision(input: RuntimeDecisionProjectionInput): RuntimeDecision;
  /** Optional ingress: normalize a runtime-native exec payload into neutral
   *  ExecStep(s). Returns null when the payload is not a v1-supported exec. */
  normalizeNativeStep?(
    nativeToolName: string,
    toolInput: Readonly<Record<string, unknown>>,
  ): ExecStep[] | null;
}

/**
 * DTC-gate-strict required-contract set the neutral Executor decision declares
 * (the Hands layer never self-authorizes a mutation — it requires the approved
 * contracts upstream).
 */
const EXECUTOR_REQUIRED_CONTRACTS = {
  semanticIntent: "required",
  digitalTwinChange: "required",
  workContract: "required",
  userDecisionRecord: "required",
} as const;

/**
 * The canonical neutral RuntimeDecision the executor compares each adapter
 * against. v1 is deterministic + runtime-agnostic (DTC-gate-strict regardless of
 * the step list): decision="contract_required", the DTC gate is blocking, and the
 * Hands layer exposes no tools of its own. `request` is reserved for future
 * step-aware projection.
 */
export function neutralExecDecision(request: ExecRequest): RuntimeDecision {
  void request;
  return {
    runtime: "neutral",
    workflowFamily: "runtimeAdapterAndParity",
    phaseId: "executor:exec-sequence",
    requiredContracts: EXECUTOR_REQUIRED_CONTRACTS,
    allowedTools: [],
    forbiddenTools: ["direct-ontology-fs-write"],
    blockingGates: ["approved-dtc"],
    advisoryGates: [],
    decision: "contract_required",
    unsupportedSurfaceRefs: [],
    evalRequirementRefs: [],
    replayRequirementRefs: [],
    lineageRequirementRefs: [],
    outputContractRefs: [],
  };
}
