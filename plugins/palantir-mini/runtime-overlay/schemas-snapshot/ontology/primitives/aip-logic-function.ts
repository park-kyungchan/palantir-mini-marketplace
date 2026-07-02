/**
 * @stable — AIPLogicFunction primitive (prim-logic-03, v1.0)
 *
 * LLM-backed logic function (Palantir AIP Logic analog). Distinct from
 * deterministic EditFunctions — an AIPLogicFunction wraps a model call with a
 * prompt template and output schema. `deterministic` is always false for
 * LLM-backed functions; the field exists as an explicit contract signal.
 *
 * Authority chain:
 *   research/palantir/logic/ → schemas/ontology/primitives/aip-logic-function.ts (this file)
 *   → home-ontology/shared-core → per-project ontology/ → codegen
 *
 * D/L/A domain: LOGIC (LLM-backed function enables reasoning over ontology data;
 * not a stored fact, not a direct mutation — produces derived reasoning outputs)
  * @owner palantirkc-ontology
 * @purpose @stable — AIPLogicFunction primitive (prim-logic-03, v1.0)
 */

import type { PrimitiveSemantics, PrimitiveStatus, PrimitiveProvenance } from "./primitive-semantics";

export type AIPLogicFunctionRid = string & { readonly __brand: "AIPLogicFunctionRid" };

export const aipLogicFunctionRid = (s: string): AIPLogicFunctionRid => s as AIPLogicFunctionRid;

export interface AIPLogicFunctionDeclaration {
  readonly functionId: AIPLogicFunctionRid;
  /** Model identifier (e.g. "claude-sonnet-4-6", "claude-opus-4-7") */
  readonly modelRef: string;
  /** Prompt template — may reference ontology properties via {{property.name}} tokens */
  readonly promptTemplate: string;
  /** RID or JSON-schema reference for the expected structured output */
  readonly outputSchema: string;
  /**
   * Always false for LLM-backed functions. Declared explicitly as a contract
   * signal: consumers must not assume deterministic re-invocation behavior.
   */
  readonly deterministic: false;
  readonly description?: string;
  /**
   * Ontology context intentionally exposed to the model. Keep this narrower
   * than the enrollment/project when possible.
   */
  readonly ontologyContext?: {
    readonly objectTypeRids?: readonly string[];
    readonly objectViewRids?: readonly string[];
    readonly actionTypeRids?: readonly string[];
    readonly branchPolicy?: "live-read" | "branch-read" | "branch-write";
  };
  /** Tool binding IDs exposed to this function/agent call. */
  readonly toolBindingIds?: readonly string[];
  /** AIP Eval suites that must pass before promotion. */
  readonly evaluationSuiteIds?: readonly string[];
  /** Candidate models used for A/B or upgrade comparison. */
  readonly modelComparison?: {
    readonly baselineModelRef?: string;
    readonly candidateModelRefs: readonly string[];
  };
  readonly observability?: {
    readonly capturePrompt: boolean;
    readonly captureOutput: boolean;
    readonly captureToolCalls?: boolean;
    readonly lineageRefsRequired?: boolean;
  };
  /**
   * Business-meaning payload preserved from the candidate this Function was
   * elevated from (W2). FunctionCandidate.logicIntent -> semantics.
   * businessMeaning; FunctionCandidate.evidenceRefs -> semantics.evidenceRefs.
   */
  readonly semantics?: PrimitiveSemantics;
  /** Foundry-equivalent lifecycle status. Absent = "active". */
  readonly status?: PrimitiveStatus;
  /** Audit record of the candidate->registered elevation. */
  readonly provenance?: PrimitiveProvenance;
  /**
   * AIP-Logic block model (DP-2), preserved from FunctionCandidate.evaluatorKind
   * (W2 — least-lossy home decision: dedicated field alongside semantics/
   * provenance rather than folding into the free-form `semantics.businessMeaning`
   * string, since evaluatorKind is a closed literal union the registered
   * declaration should keep machine-readable, not prose-flattened).
   * `pure-evaluator` persists nothing; `routes-through-apply-action` writes
   * back ONLY via an ActionType (never a side door).
   */
  readonly evaluatorKind?: "pure-evaluator" | "routes-through-apply-action";
  /**
   * Preserved from FunctionCandidate.invokingActorScopeRef (W2): a RoleRid (or
   * unresolved candidateId ref) whose GOVERNANCE scope this function's tool
   * calls inherit. Kept as a dedicated field (not folded into `semantics`) for
   * the same machine-readability reason as `evaluatorKind` — governance
   * tooling resolves this ref against ROLE_REGISTRY, which a free-form string
   * blob would make brittle.
   */
  readonly invokingActorScopeRef?: string;
}

export class AIPLogicFunctionRegistry {
  private readonly items = new Map<AIPLogicFunctionRid, AIPLogicFunctionDeclaration>();

  register(decl: AIPLogicFunctionDeclaration): void {
    this.items.set(decl.functionId, decl);
  }

  get(rid: AIPLogicFunctionRid): AIPLogicFunctionDeclaration | undefined {
    return this.items.get(rid);
  }

  keys(): IterableIterator<AIPLogicFunctionRid> {
    return this.items.keys();
  }

  list(): AIPLogicFunctionDeclaration[] {
    return [...this.items.values()];
  }
}

export const AIP_LOGIC_FUNCTION_REGISTRY = new AIPLogicFunctionRegistry();
