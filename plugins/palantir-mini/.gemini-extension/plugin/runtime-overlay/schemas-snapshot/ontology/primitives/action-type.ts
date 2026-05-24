/**
 * palantir-mini — ActionType primitive (prim-action-01, prim-action-02)
 *
 * Two-tier action architecture per Palantir action/mutations.md §ACTION.MU-09..11:
 *
 *   Tier-1 Declarative Action:
 *     Pure CRUD rule. Given ObjectType X and field Y, on operation Z, apply
 *     rule R. No custom code path. Compiled into the commit_edits fast path.
 *
 *   Tier-2 Function-Backed Action:
 *     Wraps an EditFunction (LOGIC) with an atomic commit. EditFunction
 *     computes Edits[] without committing; Tier-2 Action takes those Edits[]
 *     and commits them atomically with submission criteria pre-flight.
 *
 * Tier-1 and Tier-2 are MUTUALLY EXCLUSIVE.
  * @owner palantirkc-ontology
 * @purpose ActionType primitive (prim-action-01, prim-action-02)
 */

export type ActionTypeRid = string & { readonly __brand: "ActionTypeRid" };

export const actionTypeRid = (s: string): ActionTypeRid => s as ActionTypeRid;

export type Operation = "create" | "update" | "delete";

export type ActionApprovalPolicy = "none" | "user-confirmation" | "policy-approval";

export interface ActionParameterDeclaration {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly defaultValue?: unknown;
  readonly description?: string;
}

export interface Tier1DeclarativeAction {
  readonly rid: ActionTypeRid;
  readonly tier: "tier-1";
  /** Stable API slug used by OSDK Action APIs. */
  readonly apiName?: string;
  readonly name: string;
  readonly description?: string;
  readonly objectType: string;
  readonly field: string;
  readonly operation: Operation;
  readonly parameters?: readonly ActionParameterDeclaration[];
  readonly approvalPolicy?: ActionApprovalPolicy;
  readonly objectSetConstraint?: string;
  readonly branchPolicy?: "live-only" | "branch-required" | "branch-optional";
  readonly validateOnlySupported?: boolean;
}

export interface Tier2FunctionBackedAction {
  readonly rid: ActionTypeRid;
  readonly tier: "tier-2";
  /** Stable API slug used by OSDK Action APIs. */
  readonly apiName?: string;
  readonly name: string;
  readonly description?: string;
  /** Name of the registered edit function this action wraps */
  readonly editFunctionName: string;
  readonly parameters?: readonly ActionParameterDeclaration[];
  /** Optional submission criteria attached at declaration time */
  readonly submissionCriteriaNames?: ReadonlyArray<string>;
  readonly approvalPolicy?: ActionApprovalPolicy;
  readonly objectSetConstraint?: string;
  readonly branchPolicy?: "live-only" | "branch-required" | "branch-optional";
  readonly validateOnlySupported?: boolean;
  readonly sideEffects?: readonly ("webhook" | "notification" | "external-api" | "dataset-write")[];
}

export type ActionTypeDeclaration =
  | Tier1DeclarativeAction
  | Tier2FunctionBackedAction;

export class ActionTypeRegistry {
  private readonly actions = new Map<ActionTypeRid, ActionTypeDeclaration>();
  register(decl: ActionTypeDeclaration): void {
    // Mutual exclusion is structural — the discriminated union already enforces it
    this.actions.set(decl.rid, decl);
  }
  get(rid: ActionTypeRid): ActionTypeDeclaration | undefined { return this.actions.get(rid); }
  list(): ActionTypeDeclaration[] { return [...this.actions.values()]; }
  listTier1(): Tier1DeclarativeAction[]     { return this.list().filter((a): a is Tier1DeclarativeAction     => a.tier === "tier-1"); }
  listTier2(): Tier2FunctionBackedAction[]  { return this.list().filter((a): a is Tier2FunctionBackedAction  => a.tier === "tier-2"); }
}

export const ACTION_TYPE_REGISTRY = new ActionTypeRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "equivalent",
  foundryType: "ActionType (Tier-1 Declarative + Tier-2 Function-Backed)",
};
export { categoryFoundryEquivalent as actionTypeFoundryEquivalent };
