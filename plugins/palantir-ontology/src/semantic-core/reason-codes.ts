// Reason-code binding (ledger row P410, execution-plan.md section 6.3:
// "Every transition must be an explicit decision with stable reason
// codes"). Reads `contracts/reason-code-registry.json` directly (one layer
// up, per the ADR-002 graph: contracts -> semantic core) so the registry
// stays the single source of truth — no duplicated code list, no
// generated-index dependency (`scripts/generated/**` is build tooling,
// outside the layer graph; see `fingerprint.ts`'s note on the same point).

import registry from "../../contracts/reason-code-registry.json";

interface ReasonCodeEntry {
  readonly code: string;
  readonly owner: string;
  readonly meaning: string;
  readonly retryable: boolean;
  readonly category: string;
  readonly appliesTo: readonly string[];
}

const REGISTERED_CODES: readonly ReasonCodeEntry[] = registry.codes as ReasonCodeEntry[];
const CODE_SET: ReadonlySet<string> = new Set(REGISTERED_CODES.map((c) => c.code));
const CODE_BY_VALUE: ReadonlyMap<string, ReasonCodeEntry> = new Map(REGISTERED_CODES.map((c) => [c.code, c]));

export type ReasonCode = string;

/** A construction-lane transition may only ever cite a code registered in contracts/reason-code-registry.json. */
export function isRegisteredReasonCode(value: unknown): value is ReasonCode {
  return typeof value === "string" && CODE_SET.has(value);
}

/** True when the registered code's `appliesTo` explicitly names `aggregateSlug` (e.g. "fde-session", "semantic-intent", "digital-twin-change"). */
export function reasonCodeAppliesTo(code: ReasonCode, aggregateSlug: string): boolean {
  const entry = CODE_BY_VALUE.get(code);
  return entry !== undefined && entry.appliesTo.includes(aggregateSlug);
}

export function getReasonCodeEntry(code: ReasonCode): ReasonCodeEntry | undefined {
  return CODE_BY_VALUE.get(code);
}

// Named exports for the specific codes the construction state machine and
// the FDE/SIC/DTC aggregates (src/altitude1/) bind by literal reference, so
// a typo is a compile error, not a silent runtime mismatch. Each of these
// MUST already exist in contracts/reason-code-registry.json (P330 or, for
// the RC-CONSTRUCTION-* group, P420); this file never invents a code value
// that is not also registered — that invariant is asserted by
// tests/semantic-core/reason-codes.test.ts.
export const RC_STATE_SKIPPED_TRANSITION: ReasonCode = "RC-STATE-SKIPPED-TRANSITION";
export const RC_STATE_EVIDENCE_MISSING: ReasonCode = "RC-STATE-EVIDENCE-MISSING";
export const RC_STATE_STALE_FINGERPRINT: ReasonCode = "RC-STATE-STALE-FINGERPRINT";
export const RC_SCHEMA_VALIDATION_FAILED: ReasonCode = "RC-SCHEMA-VALIDATION-FAILED";
// P540 addition: named export for the already-registered
// RC-SCHEMA-VERSION-UNSUPPORTED code, bound for
// src/lineage/upcaster-chain.ts's unregistered-envelopeRev-gap denial
// (ADR-006 "fail loud on an unregistered rev gap", translated into this
// codebase's typed-denial idiom -- see that file's module doc).
export const RC_SCHEMA_VERSION_UNSUPPORTED: ReasonCode = "RC-SCHEMA-VERSION-UNSUPPORTED";

// P420 staged-construction codes (ledger row P420, docs/architecture.md
// ADR-003/ADR-004): DATA/LOGIC/ACTION evidence-class separation and the
// primitive-kind boundary. See src/altitude1/staged-construction.ts.
export const RC_CONSTRUCTION_EVIDENCE_CLASS_MISSING: ReasonCode = "RC-CONSTRUCTION-EVIDENCE-CLASS-MISSING";
export const RC_CONSTRUCTION_EVIDENCE_CLASS_CONTAMINATION: ReasonCode = "RC-CONSTRUCTION-EVIDENCE-CLASS-CONTAMINATION";
export const RC_CONSTRUCTION_PREMATURE_VALIDATION: ReasonCode = "RC-CONSTRUCTION-PREMATURE-VALIDATION";
export const RC_CONSTRUCTION_UNREGISTERED_PRIMITIVE_KIND: ReasonCode = "RC-CONSTRUCTION-UNREGISTERED-PRIMITIVE-KIND";

// P450 control-plane boundary code (docs/architecture.md ADR-003). See
// src/control-plane/boundary-validator.ts.
export const RC_CONTROL_PLANE_PRODUCT_PRIMITIVE_COLLISION: ReasonCode = "RC-CONTROL-PLANE-PRODUCT-PRIMITIVE-COLLISION";

// P530 archive-before-remove retention code (docs/architecture.md ADR-006,
// MEM-008). Already registered by P510's contract delta; this named export
// binds the literal for src/lineage/retention.ts. See
// src/lineage/retention.ts and src/memory/memory-item.ts.
export const RC_MEMORY_RETENTION_VIOLATION: ReasonCode = "RC-MEMORY-RETENTION-VIOLATION";

// P550 copy-only migration manifest codes (docs/architecture.md ADR-006/
// ADR-008, A1-012, MEM-012, X-010). Already registered in
// contracts/reason-code-registry.json's `migration` category; these named
// exports bind the literals for src/migration/reconciliation.ts and
// src/migration/rollback.ts.
export const RC_MIGRATION_HASH_MISMATCH: ReasonCode = "RC-MIGRATION-HASH-MISMATCH";
export const RC_MIGRATION_COUNT_MISMATCH: ReasonCode = "RC-MIGRATION-COUNT-MISMATCH";
export const RC_MIGRATION_ROLLBACK_REQUIRED: ReasonCode = "RC-MIGRATION-ROLLBACK-REQUIRED";
