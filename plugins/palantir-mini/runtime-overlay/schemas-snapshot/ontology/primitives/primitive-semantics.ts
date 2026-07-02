/**
 * palantir-mini — PrimitiveSemantics + PrimitiveStatus + PrimitiveProvenance
 * shared fields (prim-meta-NN, v1.85.0)
 *
 * W2 (feat/cartography-and-model-policy): closes the candidate→registered
 * ELEVATION lossy-copy gap. Today, when a candidate primitive (proposed by
 * AI/humans, living in the ontology-engineering-workflow review queue) is
 * accepted and elevated into the registered ontology (schemas-snapshot), the
 * elevation pipeline drops the candidate's business-meaning fields (why it
 * matters, business meaning, operational intent, evidence refs, evaluator
 * kind, actor scope, ...) — they never reach the registered type record.
 *
 * Modeled on a real Foundry gap: ObjectType metadata (Description +
 * Status: active/experimental/deprecated) lives ON the type in real Foundry
 * and persists across status transitions, and every mutation leaves an audit
 * record. This file gives palantir-mini's own primitives that same shape —
 * candidate→registered becomes a STATUS TRANSITION that preserves semantics,
 * not a lossy copy that discards them.
 *
 * Three shared, optional, additive shapes — attached to ObjectTypeDeclaration,
 * LinkTypeDeclaration, ActionTypeDeclaration, FunctionDeclaration (i.e.
 * AIPLogicFunctionDeclaration, the wrapped concrete shape — see function.ts),
 * and RoleDeclaration:
 *
 *   PrimitiveSemantics  — the business-meaning payload a candidate carries
 *                         (why it may matter / business meaning / evidence).
 *   PrimitiveStatus     — the Foundry-equivalent lifecycle status. Absent ⇒
 *                         "active" (documented default; enforced wherever a
 *                         primitive's status is read — see
 *                         lib/ontology-engineering-workflow/register-accepted.ts
 *                         `primitiveStatusOrDefault()` and the
 *                         check-semantic-loss self-check axis).
 *   PrimitiveProvenance — the audit record left by a status transition: which
 *                         candidate, which SIC, when, and by whom.
 *
 * D/L/A domain: META (cross-cutting shape attached to DATA/LOGIC/ACTION/
 * SECURITY primitives alike; not itself a stored fact, derivation, or grant).
 *
 * Authority chain:
 *   plans/feat-cartography-and-model-policy.md W2 (this task)
 *     -> schemas/ontology/primitives/primitive-semantics.ts (this file)
 *     -> object-type.ts / link-type.ts / action-type.ts / aip-logic-function.ts / role.ts
 *     -> palantir-mini lib/ontology-engineering-workflow/register-accepted.ts
 *        (candidate -> registered mapping; threads these fields instead of
 *        dropping them)
 *     -> bridge/handlers/pm-plugin-self-check/check-semantic-loss.ts
 *        (behavioral regression check over the mapping functions)
 *
 * @owner palantirkc-ontology
 * @purpose Shared semantics/status/provenance fields closing the candidate→registered lossy-copy gap
 */

/**
 * Business-meaning payload a candidate carries into its registered primitive.
 * All fields optional — a primitive registered before this shape existed (or
 * a primitive with no candidate provenance at all, e.g. a hand-authored self-
 * ontology instance) simply omits `semantics` entirely.
 */
export interface PrimitiveSemantics {
  /** Business meaning of the primitive (LinkType candidates: `businessMeaning`; ActionType candidates: `operationalIntent`). */
  readonly businessMeaning?: string;
  /** Why the primitive may matter (ObjectType/Role candidates: `whyItMayMatter`). */
  readonly whyItMayMatter?: string;
  /** Evidence refs supporting the primitive's inclusion (every candidate kind carries `evidenceRefs`). */
  readonly evidenceRefs?: readonly string[];
}

/**
 * Foundry-equivalent lifecycle status. Mirrors real Foundry ObjectType
 * Status (active / experimental / deprecated), persisted ON the type and
 * surviving status transitions.
 *
 * DEFAULT: absent ⇒ "active". Every reader of a primitive's `status` field
 * MUST apply this default rather than treating `undefined` as an unknown/
 * unset state. See `primitiveStatusOrDefault()` in
 * lib/ontology-engineering-workflow/register-accepted.ts for the canonical
 * enforcement site, and check-semantic-loss.ts for the self-check axis that
 * regression-tests it.
 */
export type PrimitiveStatus = "experimental" | "active" | "deprecated";

/** Applies the documented `PrimitiveStatus` default (absent ⇒ "active"). */
export function primitiveStatusOrDefault(status: PrimitiveStatus | undefined): PrimitiveStatus {
  return status ?? "active";
}

/**
 * Audit record for a candidate→registered elevation (a status transition,
 * not a lossy copy). Populated at registration time by
 * lib/ontology-engineering-workflow/register-accepted.ts for every primitive
 * kind it registers.
 */
export interface PrimitiveProvenance {
  /** The candidateId of the *Candidate this primitive was elevated from. */
  readonly candidateId?: string;
  /** The Semantic Intent Contract ref (contractId) that authorized the elevation. */
  readonly sicRef?: string;
  /** ISO-8601 timestamp of the registration edit. */
  readonly promotedAt?: string;
  /** Identity of the actor/runtime that performed the elevation. */
  readonly byWhom?: string;
}
