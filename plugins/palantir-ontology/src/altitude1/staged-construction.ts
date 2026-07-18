// Staged construction aggregate (ledger row P420, docs/architecture.md
// ADR-003/ADR-004, execution-plan.md section 6.3's
// `CONSTRUCTION_STAGED -> VALIDATED` leg only).
//
// A1-006 ("Construction represents Object Types, Properties, Link Types,
// Interfaces/shared property constraints, Action Types, and Functions
// without collapsing them into database schemas or runtime tools"):
// `PRIMITIVE_KINDS` fixes the exact 7-value product-primitive taxonomy this
// mission names (Object Types, Properties, Shared Property Types, Links,
// Interfaces, Actions, Functions). This is a DIFFERENT, disjoint enum from
// ADR-003's `ControlPlaneNodeKind` (`tool | handler | hook | skill | agent |
// adapter | profile | generated-binding`) — `isPrimitiveKind` rejects every
// `ControlPlaneNodeKind` value, and this module never imports or references
// `src/control-plane/` (which does not exist yet at this wave; P450 owns
// building the catalog itself, per this mission's explicit charter split).
//
// A1-007 ("The construction workflow separates DATA, LOGIC, and ACTION
// evidence and makes unresolved evidence visible before primitive
// promotion"): `StagedPrimitive` carries three SEPARATE, independently
// addressable evidence collections (`dataEvidence` / `logicEvidence` /
// `actionEvidence`). `evaluateReadiness` evaluates each class by reading
// ONLY that class's own collection — a primitive with DATA evidence alone
// can never pass LOGIC or ACTION readiness, and symmetrically for the other
// two classes, because the readiness function for a class structurally has
// no path to the other two arrays. `checkEvidenceCollection` additionally
// rejects "cross-class contamination" — an evidence item that declares a
// different `evidenceClass` than the collection it was submitted under
// (e.g. a LOGIC-declared item placed in `dataEvidence`) — which a naive
// array-length-only check would silently accept as if it were case DATA
// evidence.
//
// A1-008 ("Construction has a deterministic staged lifecycle with
// readiness/grading criteria, review evidence, and explicit return-to-Lead
// conditions"): `evaluateReadiness` is the deterministic grading function —
// pure, side-effect-free, and always returns a typed `ReadinessResult` (per
// class AND overall), never a bare boolean. `validateConstruction` is the
// one and only function that may advance a session to `VALIDATED`, and it
// always calls `evaluateReadiness` first: there is no code path anywhere in
// this package that transitions a session to `VALIDATED` without an
// explicit, currently-passing readiness result — i.e. no silent
// auto-promotion path exists. Every denial (missing evidence class,
// cross-class contamination, premature validation, unregistered primitive
// kind) carries a stable code from `contracts/reason-code-registry.json`
// (P420 group), never a free-text-only reason.
//
// This aggregate calls `transitionSession` (the fde-session.ts single choke
// point for `session.status`) exactly twice: `DTC_APPROVED ->
// CONSTRUCTION_STAGED` in `stageConstruction`, and
// `CONSTRUCTION_STAGED -> VALIDATED` in `validateConstruction`. Neither this
// file nor any function in it ever calls `transitionSession` with
// `MUTATION_AUTHORITY_ISSUED` or `COMMITTED` — `VALIDATED` is the terminal
// state this task may reach; minting a mutation-authority envelope and the
// single commit gate remain exclusively P430's charter (ADR-005). Grep
// evidence for this claim is recorded in
// outputs/p420-staged-construction.md.

import { fingerprintBody } from "../semantic-core/fingerprint";
import type { CanonicalizableValue } from "../semantic-core/canonical-json";
import { isIndependentEvidence, isUserDecisionEvidence, type UserDecisionEvidence } from "../semantic-core/user-decision-evidence";
import {
  RC_CONSTRUCTION_EVIDENCE_CLASS_CONTAMINATION,
  RC_CONSTRUCTION_EVIDENCE_CLASS_MISSING,
  RC_CONSTRUCTION_PREMATURE_VALIDATION,
  RC_CONSTRUCTION_UNREGISTERED_PRIMITIVE_KIND,
  RC_SCHEMA_VALIDATION_FAILED,
  RC_STATE_EVIDENCE_MISSING,
  isRegisteredReasonCode,
  type ReasonCode,
} from "../semantic-core/reason-codes";
import { transitionSession, type FdeSession } from "./fde-session";
import type { DtcRecord } from "./digital-twin-change";
import { type AggregateResult, denied, ok, type Actor } from "./types";

/**
 * The exact 7 product-primitive kinds this mission names (A1-006).
 * Deliberately disjoint from ADR-003's `ControlPlaneNodeKind` enum — no
 * value here is ever also a valid `ControlPlaneNodeKind`, and vice versa.
 */
export const PRIMITIVE_KINDS = [
  "ObjectType",
  "Property",
  "SharedPropertyType",
  "Link",
  "Interface",
  "Action",
  "Function",
] as const;

export type PrimitiveKind = (typeof PRIMITIVE_KINDS)[number];

const PRIMITIVE_KIND_SET: ReadonlySet<string> = new Set(PRIMITIVE_KINDS);

/** Runtime guard (not just a TS type check): is `value` one of the 7 registered product-primitive kinds? */
export function isPrimitiveKind(value: unknown): value is PrimitiveKind {
  return typeof value === "string" && PRIMITIVE_KIND_SET.has(value);
}

/** The 3 evidence classes A1-007 requires kept separate. */
export type EvidenceClass = "DATA" | "LOGIC" | "ACTION";

const EVIDENCE_CLASSES: readonly EvidenceClass[] = ["DATA", "LOGIC", "ACTION"];

function isEvidenceClass(value: unknown): value is EvidenceClass {
  return typeof value === "string" && (EVIDENCE_CLASSES as readonly string[]).includes(value);
}

/** One unresolved-or-resolved piece of evidence for exactly one class. */
export interface PrimitiveEvidenceItem {
  readonly evidenceClass: EvidenceClass;
  readonly evidenceRef: string;
  readonly recordedAt: string;
  readonly byWhom: Actor;
}

/** Runtime guard: is `value` a structurally well-formed evidence item (before checking which collection it landed in)? */
export function isWellFormedEvidenceItem(value: unknown): value is PrimitiveEvidenceItem {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!isEvidenceClass(v.evidenceClass)) return false;
  if (typeof v.evidenceRef !== "string" || v.evidenceRef.length === 0) return false;
  if (typeof v.recordedAt !== "string" || v.recordedAt.length === 0) return false;
  if (v.byWhom === null || typeof v.byWhom !== "object") return false;
  const by = v.byWhom as Record<string, unknown>;
  return typeof by.identity === "string" && by.identity.length > 0;
}

/**
 * The staging-store shape: what one staged primitive carries while it
 * occupies `CONSTRUCTION_STAGED` (or, after `validateConstruction`,
 * `VALIDATED`) on its parent `FdeSession`. Evidence is kept in THREE
 * separate arrays — never one flat array with a discriminant field only —
 * so a class's readiness has no structural path to another class's
 * evidence.
 */
export interface StagedPrimitive {
  readonly schemaVersion: string;
  readonly primitiveId: string;
  readonly kind: PrimitiveKind;
  readonly dtcId: string;
  readonly dataEvidence: readonly PrimitiveEvidenceItem[];
  readonly logicEvidence: readonly PrimitiveEvidenceItem[];
  readonly actionEvidence: readonly PrimitiveEvidenceItem[];
  readonly stagedAt: string;
  readonly byWhom: Actor;
}

const SCHEMA_VERSION = "1.0.0";

export interface StagePrimitiveParams {
  readonly primitiveId: string;
  /** Untyped at the call boundary — validated at runtime by `isPrimitiveKind`, never trusted as pre-checked. */
  readonly kind: unknown;
  readonly dtcId: string;
  readonly dataEvidence: readonly PrimitiveEvidenceItem[];
  readonly logicEvidence: readonly PrimitiveEvidenceItem[];
  readonly actionEvidence: readonly PrimitiveEvidenceItem[];
}

type CollectionCheck = { readonly ok: true } | { readonly ok: false; readonly reasonCode: ReasonCode; readonly detail: string };

/**
 * Checks one evidence collection against the class it is supposed to
 * exclusively hold: every item must be structurally well-formed AND every
 * item's own declared `evidenceClass` must equal `expectedClass` — a
 * mismatch is cross-class contamination, distinct from a merely malformed
 * item.
 */
function checkEvidenceCollection(expectedClass: EvidenceClass, items: readonly PrimitiveEvidenceItem[]): CollectionCheck {
  for (const item of items) {
    if (!isWellFormedEvidenceItem(item)) {
      return { ok: false, reasonCode: RC_SCHEMA_VALIDATION_FAILED, detail: `${expectedClass} evidence collection contains a malformed item` };
    }
    if (item.evidenceClass !== expectedClass) {
      return {
        ok: false,
        reasonCode: RC_CONSTRUCTION_EVIDENCE_CLASS_CONTAMINATION,
        detail: `an evidence item declaring evidenceClass "${item.evidenceClass}" was placed in the ${expectedClass} evidence collection — cross-class contamination`,
      };
    }
  }
  return { ok: true };
}

/**
 * Stages a primitive against an approved DTC. Transitions the session
 * `DTC_APPROVED -> CONSTRUCTION_STAGED` (execution-plan.md section 6.3).
 * Fails closed on: an unregistered `kind` (never a `ControlPlaneNodeKind`
 * value, ADR-003); a `dtcId` that does not match an approved DTC; an
 * illegal session-state transition; or cross-class-contaminated /
 * malformed evidence in any of the three collections.
 */
export function stageConstruction(
  session: FdeSession,
  dtc: DtcRecord,
  params: StagePrimitiveParams,
  stagedAt: string,
  byWhom: Actor,
): AggregateResult<{ session: FdeSession; primitive: StagedPrimitive }> {
  if (!isPrimitiveKind(params.kind)) {
    return denied(
      RC_CONSTRUCTION_UNREGISTERED_PRIMITIVE_KIND,
      `"${String(params.kind)}" is not one of the 7 registered product-primitive kinds; ADR-003 ControlPlaneNodeKind surfaces are never a valid value here`,
    );
  }
  if (dtc.dtcId !== params.dtcId || dtc.status !== "approved") {
    return denied(RC_SCHEMA_VALIDATION_FAILED, `staged primitive "${params.primitiveId}" does not reference an approved DTC "${params.dtcId}"`);
  }

  const transitioned = transitionSession(session, "CONSTRUCTION_STAGED");
  if (!transitioned.ok) return transitioned;

  const checks = [
    checkEvidenceCollection("DATA", params.dataEvidence),
    checkEvidenceCollection("LOGIC", params.logicEvidence),
    checkEvidenceCollection("ACTION", params.actionEvidence),
  ];
  const failed = checks.find((c): c is Extract<CollectionCheck, { ok: false }> => !c.ok);
  if (failed !== undefined) {
    return denied(failed.reasonCode, `staged primitive "${params.primitiveId}": ${failed.detail}`);
  }

  const primitive: StagedPrimitive = {
    schemaVersion: SCHEMA_VERSION,
    primitiveId: params.primitiveId,
    kind: params.kind,
    dtcId: params.dtcId,
    dataEvidence: params.dataEvidence,
    logicEvidence: params.logicEvidence,
    actionEvidence: params.actionEvidence,
    stagedAt,
    byWhom,
  };
  return ok({ session: transitioned.value, primitive });
}

/** Per-class grading result — always typed, never a bare boolean (A1-008). */
export interface ClassReadiness {
  readonly evidenceClass: EvidenceClass;
  readonly ready: boolean;
  readonly reasonCode?: ReasonCode;
  readonly detail: string;
}

/** The full return-to-Lead readiness result: per-class plus overall (A1-008). */
export interface ReadinessResult {
  readonly primitiveId: string;
  readonly overallReady: boolean;
  readonly data: ClassReadiness;
  readonly logic: ClassReadiness;
  readonly action: ClassReadiness;
}

function evaluateClassReadiness(evidenceClass: EvidenceClass, items: readonly PrimitiveEvidenceItem[]): ClassReadiness {
  // Deliberately re-filters by the item's OWN declared evidenceClass rather
  // than trusting `items.length` — a defense-in-depth re-check of the same
  // invariant `checkEvidenceCollection` enforces at staging time, so
  // readiness stays correct even if a `StagedPrimitive` reaches this
  // function via a path other than `stageConstruction` (e.g. deserialized
  // state).
  const matching = items.filter((item) => isWellFormedEvidenceItem(item) && item.evidenceClass === evidenceClass);
  if (matching.length === 0) {
    return {
      evidenceClass,
      ready: false,
      reasonCode: RC_CONSTRUCTION_EVIDENCE_CLASS_MISSING,
      detail: `no ${evidenceClass} evidence item found in the ${evidenceClass} collection; readiness for ${evidenceClass} cannot be satisfied by evidence of another class`,
    };
  }
  return { evidenceClass, ready: true, detail: `${matching.length} ${evidenceClass} evidence item(s) present` };
}

/**
 * Deterministic, side-effect-free readiness grading (A1-008): reads each
 * evidence class from its own collection only and never cross-reads. The
 * primitive is `overallReady` only when all 3 per-class readiness checks
 * pass.
 */
export function evaluateReadiness(primitive: StagedPrimitive): ReadinessResult {
  const data = evaluateClassReadiness("DATA", primitive.dataEvidence);
  const logic = evaluateClassReadiness("LOGIC", primitive.logicEvidence);
  const action = evaluateClassReadiness("ACTION", primitive.actionEvidence);
  return {
    primitiveId: primitive.primitiveId,
    overallReady: data.ready && logic.ready && action.ready,
    data,
    logic,
    action,
  };
}

/**
 * The ONE function that may advance a session `CONSTRUCTION_STAGED ->
 * VALIDATED`. Always calls `evaluateReadiness` first and fails closed
 * (`RC-CONSTRUCTION-PREMATURE-VALIDATION`) unless all 3 evidence classes
 * are ready — no auto-promotion path exists anywhere else in this package.
 * Also requires independently verified user-decision evidence (same
 * discipline as `semantic-intent.ts`'s `approveSic` /
 * `digital-twin-change.ts`'s `finalizeDtc`). Never mints a
 * mutation-authority envelope and never commits — `VALIDATED` is terminal
 * for this function; P430 owns everything past it.
 */
export function validateConstruction(
  session: FdeSession,
  primitive: StagedPrimitive,
  evidence: UserDecisionEvidence,
  validatedAt: string,
): AggregateResult<{ session: FdeSession; readiness: ReadinessResult }> {
  const readiness = evaluateReadiness(primitive);
  if (!readiness.overallReady) {
    const failing = [readiness.data, readiness.logic, readiness.action].find((c) => !c.ready)!;
    return denied(
      RC_CONSTRUCTION_PREMATURE_VALIDATION,
      `staged primitive "${primitive.primitiveId}" is not ready for VALIDATED: ${failing.evidenceClass} readiness failed — ${failing.detail}`,
    );
  }

  if (!isUserDecisionEvidence(evidence)) {
    return denied(RC_STATE_EVIDENCE_MISSING, "construction validation requires independently verified user-decision evidence; none or malformed evidence was provided");
  }
  if (!isIndependentEvidence(evidence, primitive.byWhom.identity)) {
    return denied(
      RC_STATE_EVIDENCE_MISSING,
      `construction validation evidence was verified by "${evidence.verifiedBy.identity}", the same identity that staged the primitive — not independently verified`,
    );
  }

  const transitioned = transitionSession(session, "VALIDATED");
  if (!transitioned.ok) return transitioned;

  return ok({ session: transitioned.value, readiness });
}

/**
 * Deterministic fingerprint of a staged primitive's evidence state — a
 * convenience for callers/tests that need to detect whether evidence
 * changed between two readiness evaluations. Not itself part of any
 * approved-body binding (that remains SIC/DTC's `bodyFingerprint`, ADR-004).
 */
export function fingerprintStagedPrimitive(primitive: StagedPrimitive): string {
  return fingerprintBody(primitive as unknown as CanonicalizableValue);
}

// Compile-time + runtime self-check that this module's bound reason codes
// are actually registered in contracts/reason-code-registry.json (same
// belt-and-suspenders guard construction-state-machine.ts uses).
if (
  !isRegisteredReasonCode(RC_CONSTRUCTION_EVIDENCE_CLASS_MISSING) ||
  !isRegisteredReasonCode(RC_CONSTRUCTION_EVIDENCE_CLASS_CONTAMINATION) ||
  !isRegisteredReasonCode(RC_CONSTRUCTION_PREMATURE_VALIDATION) ||
  !isRegisteredReasonCode(RC_CONSTRUCTION_UNREGISTERED_PRIMITIVE_KIND)
) {
  throw new Error("staged-construction.ts: a bound reason code is not registered in contracts/reason-code-registry.json");
}
