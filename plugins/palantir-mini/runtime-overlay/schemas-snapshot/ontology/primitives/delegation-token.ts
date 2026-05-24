/**
 * @stable — DelegationToken primitive (prim-action-06, v1.33.0)
 *
 * Lecturer → Student temporary control delegation model for palantir-math
 * PlayBook Live sessions. The Lecturer is the default authority; a time-bounded
 * delegation token grants specific scoped affordances to a named Student without
 * full authoring rights. Tokens are append-only; revocation is a separate event
 * preserving the 5D Decision Lineage audit trail.
 *
 * Authority:
 *   - palantir-math src/lib/playbook/controlDelegation.ts (Phase Playbook T2, 2026-05-01)
 *
 * D/L/A domain: ACTION (executable grant/revoke lifecycle — mirrors Palantir
 * ActionType semantics; token is the data payload, lifecycle is the action surface)
 * @owner palantirkc-ontology
 * @purpose Canonical delegation token primitive for W5-A consumer surface
 * @source palantir-math/src/lib/playbook/controlDelegation.ts:1-100
 * @fetched 2026-05-01
 * @version 1.33.0
 */

/** Affordance scopes a delegation token can permit. */
export type DelegationCapability =
  | "drag-free-point"
  | "drag-parameter-slider"
  | "drag-tangent-handle"
  | "explore-trial-overlay"
  | "annotate-canvas";

/**
 * Lifecycle status of a delegation token.
 *   pending  — issued but not yet accepted by Student device.
 *   active   — accepted; Student holds affordances.
 *   revoked  — explicitly revoked by Lecturer or system before expiry.
 *   expired  — wall-clock passed expiresAt.
 */
export type DelegationTokenStatus = "pending" | "active" | "revoked" | "expired";

/**
 * A single delegation grant. Authoritative source of truth on the Lecturer
 * side; replicated to Student devices via the realtime sync layer.
 *
 * Tokens are append-only — revocation is captured via DelegationTokenLifecycle
 * events rather than mutation, preserving the 5D Decision Lineage audit trail.
 */
export interface DelegationToken {
  /** Stable id, opaque from the Student's perspective. */
  readonly tokenId: string;
  /** Stable identifier of the Lecturer who issued the token. */
  readonly lecturerId: string;
  /** Stable identifier of the Student receiving the grant. */
  readonly studentId?: string;
  /** Optional human-readable label rendered on the Lecturer's status bar. */
  readonly studentLabel?: string;
  /** ISO 8601 issuance time. */
  readonly issuedAt: string;
  /** ISO 8601 expiry; token is treated as revoked after this moment. */
  readonly expiresAt: string;
  /** Current lifecycle status. */
  readonly status: DelegationTokenStatus;
  /** Scope set the token permits. */
  readonly scope?: readonly DelegationCapability[];
  /**
   * Optional element id constraint — when present the token only authorizes
   * drag on the listed scene element ids.
   */
  readonly elementIds?: readonly string[];
  /** Optional reason / pedagogical context surfaced to the audit trail. */
  readonly reason?: string;
}

/**
 * Discriminated union of token lifecycle state transitions.
 * Append-only event log pattern — each state change is a new event.
 */
export type DelegationTokenLifecycle =
  | {
      readonly kind: "grant";
      readonly token: DelegationToken;
      /** ISO 8601 timestamp of event. */
      readonly at: string;
    }
  | {
      readonly kind: "revoke";
      readonly tokenId: string;
      /** Who triggered the revocation. */
      readonly revokedBy: "lecturer" | "system";
      /** ISO 8601 timestamp of event. */
      readonly at: string;
    }
  | {
      readonly kind: "expire";
      readonly tokenId: string;
      /** ISO 8601 timestamp of event. */
      readonly at: string;
    }
  | {
      readonly kind: "accept";
      readonly tokenId: string;
      /** Student device that accepted the token. */
      readonly acceptedBy: string;
      /** ISO 8601 timestamp of event. */
      readonly at: string;
    };

/**
 * Compute the active delegation token at a given moment.
 * Implementation lives in palantir-math/src/lib/playbook/controlDelegation.ts;
 * this is the canonical signature stub for the shared ontology surface.
 *
 * Returns the most recently granted, non-expired, non-revoked token,
 * or undefined when authority resides solely with the Lecturer.
 */
export declare function resolveActiveDelegation(
  events: DelegationTokenLifecycle[] | undefined | null,
  now?: Date,
): DelegationToken | undefined;

/**
 * Decide whether a given capability is permitted under the active token.
 * Implementation lives in palantir-math/src/lib/playbook/controlDelegation.ts.
 *
 * Always returns true when no token is active and the caller is the Lecturer.
 */
export declare function isDelegationPermitted(
  capability: DelegationCapability,
  token: DelegationToken | undefined,
  callerId: string,
  lecturerId: string,
): boolean;

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "palantir-math delegation token primitive (project-promoted); domain-specific, not Foundry surface",
};
export { categoryFoundryEquivalent as delegationTokenFoundryEquivalent };
