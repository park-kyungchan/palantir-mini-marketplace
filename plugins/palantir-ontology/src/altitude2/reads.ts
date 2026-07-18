// Named reads / search / impact inspection (ledger row P440, A2-003,
// A2-004).
//
// A2-004 ("Query, search, impact, and state-inspection paths operate on
// named Ontology resources and preserve the distinction between Ontology
// semantics and generic database/vector/runtime search"): every function
// here requires either a well-formed named identifier
// (`isNamedIdentifier` — no whitespace, non-empty; rejects a raw
// transcript/prose blob standing in for a resource reference, the same
// discipline `src/altitude1/fde-session.ts`'s `evidenceRefs` pattern
// applies) or a registered `PrimitiveKind` (the 7-value product-primitive
// taxonomy `src/altitude1/staged-construction.ts` fixes) — never an
// unqualified free-text query. A2-003 ("without bulk-loading the entire
// graph or confusing retrieval output with authority"): every result is a
// bounded, single-resource/single-query projection through a
// caller-injected resolver; nothing here traverses or caches the whole
// consumer graph, and a found-or-not-found result is explicitly never
// treated as approval or authority (it is a read, not a governance
// decision — see `governance-check.ts`/`commit-routing.ts` for those).
//
// These three functions require `session.state` to have already reached
// `READ_OR_QUERY` (via `consumer-binding.ts#openReadOrQuery`) — a session
// still at `BOUND_CONSUMER_ONTOLOGY` has not yet opened its read lane.
// Every `bindingScope` (`read`/`proposal`/`commit`) authorizes at least
// `READ_OR_QUERY` (`binding-scope.ts`'s `MAX_STATE_FOR_SCOPE`), so reads
// never fail on scope grounds — only on session state or malformed input.

import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED, type ReasonCode } from "../semantic-core/reason-codes";
import { isPrimitiveKind } from "../altitude1/staged-construction";
import {
  type AggregateResult,
  denied,
  ok,
  isNamedIdentifier,
  type ImpactQuery,
  type NamedResourceQuery,
  type OperationSession,
  type SearchQuery,
} from "./types";

const CITED_CODES: readonly ReasonCode[] = [RC_SCHEMA_VALIDATION_FAILED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("reads.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

function requireReadOrQuery(session: OperationSession): { readonly ok: true } | { readonly ok: false; readonly reasonCode: ReasonCode; readonly detail: string } {
  if (session.state === "READ_OR_QUERY") return { ok: true };
  return {
    ok: false,
    reasonCode: RC_SCHEMA_VALIDATION_FAILED,
    detail: `session "${session.sessionId}": reads require state "READ_OR_QUERY", got "${session.state}" (call openReadOrQuery first)`,
  };
}

export interface ResourceResult {
  readonly found: boolean;
  readonly resource?: unknown;
}

/** Named-resource lookup (A2-004). `deps.resolveResource` is caller-injected and Wave-5-storage-owned; this module never bulk-scans a store. */
export function queryNamedResource(session: OperationSession, query: NamedResourceQuery, resolveResource: (resourceId: string) => unknown): AggregateResult<ResourceResult> {
  const gate = requireReadOrQuery(session);
  if (!gate.ok) return denied(gate.reasonCode, gate.detail);
  if (!isNamedIdentifier(query.resourceId)) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, `queryNamedResource: "${JSON.stringify(query.resourceId)}" is not a well-formed named resource identifier`);
  }
  const resource = resolveResource(query.resourceId);
  return ok(resource === undefined ? { found: false } : { found: true, resource });
}

export interface SearchResult {
  readonly matches: readonly string[];
}

/** Kind-scoped Ontology search (A2-004): `kind` must be a registered `PrimitiveKind`, keeping this distinct from a generic/unscoped vector or database search. */
export function searchOntology(session: OperationSession, query: SearchQuery, search: (kind: string, queryText: string) => readonly string[]): AggregateResult<SearchResult> {
  const gate = requireReadOrQuery(session);
  if (!gate.ok) return denied(gate.reasonCode, gate.detail);
  if (!isPrimitiveKind(query.kind)) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, `searchOntology: "${JSON.stringify(query.kind)}" is not a registered PrimitiveKind`);
  }
  if (typeof query.query !== "string" || query.query.length === 0) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, "searchOntology: query text must be a non-empty string");
  }
  return ok({ matches: search(query.kind, query.query) });
}

export interface ImpactResult {
  readonly targetIdentity: string;
  readonly affected: readonly string[];
}

/** Impact inspection on a named target identity (A2-004). */
export function inspectImpact(session: OperationSession, query: ImpactQuery, computeImpact: (targetIdentity: string) => readonly string[]): AggregateResult<ImpactResult> {
  const gate = requireReadOrQuery(session);
  if (!gate.ok) return denied(gate.reasonCode, gate.detail);
  if (!isNamedIdentifier(query.targetIdentity)) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, `inspectImpact: "${JSON.stringify(query.targetIdentity)}" is not a well-formed named target identity`);
  }
  return ok({ targetIdentity: query.targetIdentity, affected: computeImpact(query.targetIdentity) });
}
