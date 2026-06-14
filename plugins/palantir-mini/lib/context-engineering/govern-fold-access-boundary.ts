import type {
  DigitalTwinRequiredUserDecision,
  SemanticIntentContract,
} from "../lead-intent/contracts";
import { requiresPropertyAccessBoundary } from "../lead-intent/contracts";
import type { SicPropertyAccessBoundary } from "#schemas/ontology/primitives/semantic-intent-contract";

// ---------------------------------------------------------------------------
// OE-4 — GOVERN-FOLD capstone: property access-security at the DTC/register layer.
//
// DP-4 (Step 4) folded Security INTO GOVERNANCE as a typed `access-boundary` facet
// (surface + toolScope level) and wired the fail-closed `canApproveRequiredUserDecision`
// gate into the live V2 plan. Security is the GOVERNANCE access-control facet — NOT a
// 10th axis, NOT a `DigitalTwinDecisionDomain` member (the union stays EXACTLY 5).
//
// OE-4 (Step 12) is the CAPSTONE: the property column-level access-security teeth at
// the DTC/register layer. A GOVERNANCE access boundary that LACKS a property
// access-boundary (`propertyName` + non-empty `readableBy`) for a SENSITIVE property
// (e.g. `score`) on an ontology-affecting plan is FLAGGED fail-closed — the DTC/register
// REFUSES, it is NOT advisory. This is the SIC-layer projection of the descriptive
// column-level `CLSPolicy`/`PropertySecurityPolicy` (`ontology/types/types-security.ts`).
//
// Pure / additive / side-effect-free. Mirrors `success-eval-action-binding.ts` (OE-8):
// a structured enforcement helper the DTC/register layer (and the e2e) calls. A SIC
// with NO GOVERNANCE access-boundary facet, or a non-ontology-affecting plan, yields
// no violations (the gate does not fire).
// ---------------------------------------------------------------------------

export type GovernFoldAccessBoundaryViolationKind =
  | "missing-property-access-boundary";

/**
 * One flagged defect in the property access-security fold — a sensitive property whose
 * column-level read boundary is absent (or empty `readableBy`). Surfaced fail-closed so
 * the DTC/register layer REFUSES rather than silently registering an unguarded property.
 */
export interface GovernFoldAccessBoundaryViolation {
  readonly kind: GovernFoldAccessBoundaryViolationKind;
  /** The sensitive property whose access-boundary is missing. */
  readonly propertyName: string;
  readonly message: string;
}

export interface GovernFoldAccessBoundaryResult {
  /** Fail-closed flags for sensitive properties lacking a property access-boundary. */
  readonly violations: readonly GovernFoldAccessBoundaryViolation[];
  /** The resolved property access-boundaries (present + non-empty readableBy). */
  readonly resolvedPropertyAccessBoundaries: readonly SicPropertyAccessBoundary[];
}

/**
 * The GOVERNANCE access boundary the SIC carries (DP-4 fold), shaped as the
 * `accessBoundary` field the register-layer predicate reads. Returns `undefined`
 * when the GOVERNANCE axis carries no `access-boundary` facet.
 */
function governanceAccessBoundaryDecision(
  sic: SemanticIntentContract,
): Pick<DigitalTwinRequiredUserDecision, "accessBoundary"> {
  const facet = sic.axes?.governance.facet;
  return {
    accessBoundary: facet?.kind === "access-boundary" ? facet.accessBoundary : undefined,
  };
}

/**
 * Enforce the OE-4 govern-fold property access-security at the DTC/register layer.
 * For each `sensitiveProperty` on an ontology-affecting plan, the GOVERNANCE access
 * boundary MUST carry a property access-boundary (non-empty `readableBy`); a missing
 * one is FLAGGED fail-closed. On a non-ontology-affecting plan the gate does not fire.
 *
 * OE-4 govern-fold: 민감 속성(예: `score`)은 GOVERNANCE 접근 경계에 컬럼 단위
 * 접근 보안(`readableBy`)이 REQUIRED이며, 누락 시 fail-closed로 표시하여
 * DTC/register 단계가 REFUSE한다 (advisory 아님).
 */
export function assertGovernFoldPropertyAccessBoundary(
  sic: SemanticIntentContract,
  context: {
    readonly sensitiveProperties: readonly string[];
    readonly ontologyAffecting: boolean;
  },
): GovernFoldAccessBoundaryResult {
  if (!context.ontologyAffecting || context.sensitiveProperties.length === 0) {
    return { violations: [], resolvedPropertyAccessBoundaries: [] };
  }

  const decision = governanceAccessBoundaryDecision(sic);
  const violations: GovernFoldAccessBoundaryViolation[] = [];
  const resolvedPropertyAccessBoundaries: SicPropertyAccessBoundary[] = [];

  for (const propertyName of context.sensitiveProperties) {
    const resolved = requiresPropertyAccessBoundary(decision, propertyName);
    if (resolved === undefined) {
      violations.push({
        kind: "missing-property-access-boundary",
        propertyName,
        message:
          `GOVERNANCE access boundary is missing the column-level access-boundary for `
          + `the sensitive property "${propertyName}" — the DTC/register REFUSES (fail-closed): `
          + `Security is folded INTO GOVERNANCE as a required property access-boundary, not `
          + `advisory. GOVERNANCE 접근 경계에 민감 속성 "${propertyName}"의 속성 단위 `
          + `접근 보안이 없습니다.`,
      });
    } else {
      resolvedPropertyAccessBoundaries.push(resolved);
    }
  }

  return { violations, resolvedPropertyAccessBoundaries };
}
