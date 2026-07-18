// Independently verified user-decision evidence (ledger row P410,
// execution-plan.md section 6.3: "No state may be inferred from tool
// success or a free-text reference"; section 6.4 field 3; mission bullet:
// "Independent user-decision evidence is a required, typed input for
// approval transitions (never derived from the proposing actor)."). Shape
// mirrors `contracts/mutation-authority.contract.json`'s
// `userDecisionEvidence` object exactly (P330; ADR-004's Consequences:
// "The two ADRs share one evidence object, not two independently-sourced
// ones") so the same evidence class ADR-005's envelope later revalidates
// at commit time is the one ADR-004's SIC/DTC approval transitions capture
// now.

export interface UserDecisionEvidence {
  readonly evidenceRef: string;
  readonly verifiedAt: string; // ISO-8601 date-time
  readonly verifiedBy: {
    readonly identity: string;
    readonly role?: string;
  };
}

export function isUserDecisionEvidence(value: unknown): value is UserDecisionEvidence {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.evidenceRef !== "string" || v.evidenceRef.length === 0) return false;
  if (typeof v.verifiedAt !== "string" || v.verifiedAt.length === 0) return false;
  if (v.verifiedBy === null || typeof v.verifiedBy !== "object") return false;
  const by = v.verifiedBy as Record<string, unknown>;
  return typeof by.identity === "string" && by.identity.length > 0;
}

/**
 * "Never derived from the proposing actor": evidence is independent only
 * when the identity that verified it differs from the identity that
 * proposed the thing being approved. Self-attested evidence — the same
 * actor "approving" their own proposal — does not satisfy the
 * independence requirement even though it is structurally well-formed.
 */
export function isIndependentEvidence(evidence: UserDecisionEvidence, proposingActorIdentity: string): boolean {
  return evidence.verifiedBy.identity !== proposingActorIdentity;
}
