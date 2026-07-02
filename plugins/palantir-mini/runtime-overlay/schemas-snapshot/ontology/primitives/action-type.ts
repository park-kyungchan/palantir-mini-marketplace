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

import type { PrimitiveSemantics, PrimitiveStatus, PrimitiveProvenance } from "./primitive-semantics";

export type ActionTypeRid = string & { readonly __brand: "ActionTypeRid" };

export const actionTypeRid = (s: string): ActionTypeRid => s as ActionTypeRid;

/**
 * The mutation operation a declarative (Tier-1) action performs on its target.
 * Widened (OE-6) from the 3 CRUD verbs to the full Foundry operation set so the
 * executable Action model matches the descriptive SSoT's 8 `ActionRuleType` rule
 * families (mutations.md §2): object create/modify/upsert/delete plus M:N link
 * create/delete plus interface-level rules. `create`/`update`/`delete` are kept as
 * the canonical object-CRUD names (back-compatible); the link/upsert/interface
 * verbs are additive.
 */
export type Operation =
  | "create"
  | "update"
  | "createOrModify"
  | "delete"
  | "createLink"
  | "deleteLink"
  | "interfaceRule";

/**
 * The 8 Foundry rule families a declarative action's edit set is built from
 * (mutations.md §2). One family per simple/function rule type the executable
 * Action model can carry; the executable `Operation` union projects the object/
 * link/interface subset of these. Mirrors `ActionRuleType` in
 * `ontology/action/schema.ts` (the descriptive SSoT) so the primitive widens off
 * the canonical set rather than re-deriving it.
 */
export type ActionRuleFamily =
  | "createObject"
  | "modifyObject"
  | "createOrModify"
  | "deleteObject"
  | "createLink"
  | "deleteLink"
  | "functionRule"
  | "interfaceRule";

/** All 8 Foundry rule families (mutations.md §2). */
export const ACTION_RULE_FAMILIES: readonly ActionRuleFamily[] = [
  "createObject",
  "modifyObject",
  "createOrModify",
  "deleteObject",
  "createLink",
  "deleteLink",
  "functionRule",
  "interfaceRule",
] as const;

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
  /**
   * Business-meaning payload preserved from the candidate this ActionType was
   * elevated from (W2). ActionTypeCandidate.operationalIntent ->
   * semantics.businessMeaning; ActionTypeCandidate.evidenceRefs ->
   * semantics.evidenceRefs.
   */
  readonly semantics?: PrimitiveSemantics;
  /** Foundry-equivalent lifecycle status. Absent = "active". */
  readonly status?: PrimitiveStatus;
  /** Audit record of the candidate->registered elevation. */
  readonly provenance?: PrimitiveProvenance;
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
  /** Business-meaning payload preserved from the candidate this ActionType was elevated from (W2). See Tier1DeclarativeAction.semantics. */
  readonly semantics?: PrimitiveSemantics;
  /** Foundry-equivalent lifecycle status. Absent = "active". */
  readonly status?: PrimitiveStatus;
  /** Audit record of the candidate->registered elevation. */
  readonly provenance?: PrimitiveProvenance;
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
