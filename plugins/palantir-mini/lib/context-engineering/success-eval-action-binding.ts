import type { SemanticIntentContract } from "../lead-intent/contracts";
import type { ValidationPackRef } from "#schemas/ontology/primitives/ontology-engineering-ref";

// ---------------------------------------------------------------------------
// OE-8 — SUCCESS-EVAL <-> ACTION enforced cross-axis binding (D2-2).
//
// DP-3 wired the ELICITATION-side proposal: each ACTION submission criterion
// becomes a typed `submission-criteria://<action>/<idx>` ref on the SUCCESS-EVAL
// axis (`axes.successEval.refs`) + a summary mention. DP-3 was forbidden to touch
// `requiredEvaluationRefs` / the DTC synthesis gate — that is THIS (OE-8) line.
//
// OE-8 is the ENFORCEMENT side: the binding is now CHECKED, not advisory.
//   - every ACTION submission criterion expected as a `submission-criteria://` ref
//     MUST appear on the SUCCESS-EVAL axis; an OMITTED criterion is FLAGGED
//     (fail-closed violation), never silently dropped;
//   - the BOUND action criteria (the SUCCESS-EVAL <-> ACTION cross-axis relation)
//     are routed into gate-facing `requiredEvaluationRefs` (typed ValidationPack
//     refs), so success-criteria are ENFORCED as submission criteria instead of
//     staying review/risk prose only. The success-signal PROSE stays on the SHOWN
//     validation plan (`deriveValidationPlan`); only the typed cross-axis criteria
//     bind to the gate (a free-text signal is not a forgeable gate ref).
//
// Pure / additive / side-effect-free. When the SIC carries NO `axes` (legacy SIC),
// no SUCCESS-EVAL signal AND no ACTION submission criteria, this returns
// `{ requiredEvaluationRefs: [], violations: [] }` — preserving the Q5 fallback
// invariant (`requiredEvaluationRefs === []`; we NEVER mint a pack ref).
// ---------------------------------------------------------------------------

const SUBMISSION_CRITERIA_REF_PREFIX = "submission-criteria://";

export type SuccessEvalActionBindingViolationKind =
  | "omits-action-criteria"
  | "success-eval-empty-with-action-criteria";

/**
 * One flagged defect in the SUCCESS-EVAL <-> ACTION binding. Surfaced (not silently
 * dropped) so a SUCCESS-EVAL that omits / contradicts the ACTION submission criteria
 * is caught fail-closed at the DTC synthesis gate.
 */
export interface SuccessEvalActionBindingViolation {
  readonly kind: SuccessEvalActionBindingViolationKind;
  /** The specific action-criteria ref (or action name) the violation concerns. */
  readonly ref: string;
  readonly message: string;
}

export interface SuccessEvalActionBindingResult {
  /** Gate-facing ValidationPack refs derived from the SUCCESS-EVAL <-> ACTION binding. */
  readonly requiredEvaluationRefs: readonly ValidationPackRef[];
  /** Fail-closed flags for omitted / contradicted action criteria. */
  readonly violations: readonly SuccessEvalActionBindingViolation[];
}

/**
 * The set of `submission-criteria://<action>/<idx>` refs the ACTION axis EXPECTS,
 * derived from the action-writeback facet's per-action `submissionCriteria`. This is
 * the SAME derivation DP-3 applies on the elicitation side, so the enforced relation
 * compares like for like.
 */
function expectedActionCriteriaRefs(sic: SemanticIntentContract): readonly string[] {
  const actionFacet = sic.axes?.action.facet;
  if (!actionFacet || actionFacet.kind !== "action-writeback") return [];
  return actionFacet.actions.flatMap((action) =>
    action.submissionCriteria.map(
      (_criterion, index) => `${SUBMISSION_CRITERIA_REF_PREFIX}${action.name}/${index}`,
    ),
  );
}

/** The `submission-criteria://` refs actually carried by the SUCCESS-EVAL axis. */
function successEvalCriteriaRefs(sic: SemanticIntentContract): readonly string[] {
  return (sic.axes?.successEval.refs ?? []).filter((ref) =>
    ref.startsWith(SUBMISSION_CRITERIA_REF_PREFIX),
  );
}

/**
 * Enforce the SUCCESS-EVAL <-> ACTION cross-axis binding for a SIC, returning the
 * gate-facing ValidationPack refs to fold into `requiredEvaluationRefs` and the
 * fail-closed violations for any omitted / contradicted action criteria.
 *
 * SUCCESS-EVAL <-> ACTION 교차축 바인딩을 강제한다: 누락/모순된 액션 제출 기준은
 * fail-closed 위반으로 표시하고, 바인딩된 기준은 gate-facing requiredEvaluationRefs로
 * 라우팅한다.
 */
export function bindSuccessEvalToActionCriteria(
  sic: SemanticIntentContract,
): SuccessEvalActionBindingResult {
  const expectedRefs = expectedActionCriteriaRefs(sic);
  const successEvalRefs = new Set(successEvalCriteriaRefs(sic));

  const violations: SuccessEvalActionBindingViolation[] = [];

  // (1) every expected ACTION criterion ref MUST appear on SUCCESS-EVAL — fail-closed.
  if (expectedRefs.length > 0 && successEvalRefs.size === 0) {
    violations.push({
      kind: "success-eval-empty-with-action-criteria",
      ref: expectedRefs[0]!,
      message:
        "SUCCESS-EVAL axis carries no submission-criteria binding while the ACTION axis "
        + `declares ${expectedRefs.length} submission criteria — success cannot be evaluated `
        + "against the action gate (fail-closed). SUCCESS-EVAL 축이 ACTION 제출 기준과 "
        + "바인딩되지 않았습니다.",
    });
  } else {
    for (const ref of expectedRefs) {
      if (!successEvalRefs.has(ref)) {
        violations.push({
          kind: "omits-action-criteria",
          ref,
          message:
            `SUCCESS-EVAL omits the ACTION submission criterion ${ref} — `
            + "a success definition that contradicts/omits the action gate is flagged "
            + "(fail-closed). SUCCESS-EVAL이 ACTION 제출 기준을 누락했습니다.",
        });
      }
    }
  }

  // (2) route the BOUND criteria (expected ∩ successEval) into gate-facing refs.
  //     Deterministic, de-duped, no fabricated rids.
  const boundCriteriaRefs = expectedRefs.filter((ref) => successEvalRefs.has(ref));

  const seen = new Set<string>();
  const requiredEvaluationRefs: ValidationPackRef[] = [];
  for (const rid of boundCriteriaRefs) {
    if (seen.has(rid)) continue;
    seen.add(rid);
    // `exact`: the criterion is the user-confirmed ACTION submission criterion bound
    // on the SUCCESS-EVAL axis — not inferred / resolved.
    requiredEvaluationRefs.push({ kind: "ValidationPack", rid, confidence: "exact" });
  }

  return { requiredEvaluationRefs, violations };
}
