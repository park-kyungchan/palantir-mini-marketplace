// Archive-before-remove retention primitive (ledger row P530, MEM-008,
// docs/architecture.md ADR-006: "single-writer mutation-authority per
// store, append-only event log with rename-only rotation,
// archive-before-remove retention, and a versioned upcaster seam"; grounded
// evidence P230 §4.1, "Archive-append FIRST... only THEN remove from
// live... under the shared manifest lock", named explicitly as "NEVER
// SILENTLY DELETES" -- "ADR-006 requires every successor store with a
// retention mechanism to follow this same archive-before-remove ordering").
//
// Mission ("Retention: archive-before-remove -- nothing is deleted from the
// authoritative store until it is archived; a removal without a prior
// archive is denied"): `requireArchiveBeforeRemove` is that denial gate. It
// performs NO I/O itself -- no real store exists yet at this wave (Wave 5's
// migration/store-population work is P550's charter, docs/migration.md) --
// it is the structural precondition a future writer must satisfy before its
// own remove-from-live step, mirroring `src/governance/commit-gate.ts`'s
// split between the gate that RESOLVES authority and the injected
// `writeExecutor` that performs the actual write.
//
// This file is deliberately generic, NOT MemoryItem-specific: it depends on
// a minimal structural `ArchivableRetention` shape only, and does not
// import anything from `src/memory/**`. `src/memory/memory-item.ts`'s
// `assertMemoryItemArchivedBeforeRemove` is the MemoryItem-specific CALLER
// of this file's primitive -- the dependency direction is
// `src/memory -> src/lineage`, never the reverse, matching ADR-002's
// "semantic core" layer being internally acyclic even though `src/memory/`
// and `src/lineage/` sit at the same layer (docs/architecture.md ADR-002:
// "semantic core: construction, operation, governance, memory, lineage").
//
// consumer-domain-ownership note (required term): a record this file
// archives-then-removes is successor-owned control/knowledge state
// (ADR-006's per-project `.palantir-mini/` storage authority), never the
// consumer domain Ontology itself -- this mirrors
// `src/memory/memory-item.ts`'s identical note.
//
// mutation-authority note (required term): `requireArchiveBeforeRemove`'s
// denial is a retention-ordering check, a DIFFERENT concept from
// `src/governance/types.ts`'s `MutationAuthorityEnvelope` -- it never mints
// or substitutes for a real mutation-authority envelope, and this file
// imports nothing from `src/governance/**`.
//
// ControlPlaneNodeKind note (required term): an archived/removed record is
// content/knowledge state, never a `src/control-plane/types.ts`
// `ControlPlaneNodeKind` lifecycle-control entry -- this file never
// constructs, reads, or references the `ControlPlaneNodeKind` catalog.
//
// UNKNOWN-is-not-PASS note (required term): `requireArchiveBeforeRemove`
// always returns `AggregateResult`'s `{ok:false, reasonCode, detail}` shape
// on denial -- never a bare `false`/`undefined` -- and an unrecorded or
// partial archive (`archived` true but `archiveRef` absent/empty) is a
// denial, never treated as an implicit pass.
//
// math-KG-excluded note (required term): no math-KG path
// (`/home/palantirkc/projects/data/curriculum-kg/**` or any other) was read
// or referenced by this file.

import { type AggregateResult, denied, ok } from "../altitude1/types";
import { isRegisteredReasonCode, RC_MEMORY_RETENTION_VIOLATION, type ReasonCode } from "../semantic-core/reason-codes";

const CITED_CODES: readonly ReasonCode[] = [RC_MEMORY_RETENTION_VIOLATION];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("retention.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

/**
 * Minimal structural shape this primitive needs from any record's
 * retention state -- deliberately NOT `MemoryItem`'s own `retention` union
 * (which is layer-conditional and lives in `src/memory/memory-item.ts`).
 * Any of the four `*MemoryRetention` shapes there structurally satisfies
 * this interface (an object lacking the optional `archiveRef` property is
 * still assignable to `{ archiveRef?: string }`).
 */
export interface ArchivableRetention {
  readonly policy: string;
  readonly archiveRef?: string;
}

export interface ArchiveProof {
  readonly recordId: string;
  readonly archiveRef: string;
}

/**
 * MEM-008: a record whose retention is not already `"archived"` WITH a
 * recorded, non-empty `archiveRef` cannot be removed from its
 * authoritative/live store -- "nothing is deleted... until it is archived"
 * (mission). Returns `ok` carrying the proven `archiveRef` a caller's
 * actual remove-from-live step may then use, or
 * `denied(RC-MEMORY-RETENTION-VIOLATION, ...)`.
 */
export function requireArchiveBeforeRemove(recordId: string, retention: ArchivableRetention): AggregateResult<ArchiveProof> {
  if (retention.policy !== "archived" || retention.archiveRef === undefined || retention.archiveRef.length === 0) {
    return denied(
      RC_MEMORY_RETENTION_VIOLATION,
      `record "${recordId}" cannot be removed from the live store: retention.policy is not "archived" with a recorded archiveRef (archive-before-remove, ADR-006)`,
    );
  }
  return ok({ recordId, archiveRef: retention.archiveRef });
}
