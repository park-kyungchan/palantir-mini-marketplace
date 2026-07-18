// Shared Altitude-2 (operation) types (ledger row P440). Mirrors
// `src/altitude1/types.ts`'s role for the construction lane: the uniform
// result shape and the small set of types every altitude2 module shares.
// `AggregateResult`/`ok`/`denied`/`Actor` are intentionally re-imported from
// `../altitude1/types` rather than re-declared here — `src/governance/
// commit-gate.ts` already sets this precedent (imports the same three
// symbols from `../altitude1/types` for its own result shape), so this is a
// second, sanctioned reuse of one shared result convention, not a new
// cross-altitude dependency this task invented.

import type { OperationState } from "./operation-state-machine";
import type { EnvelopeResult, SubmissionCriteriaResult } from "../governance";

export type { AggregateResult, Actor } from "../altitude1/types";
export { ok, denied } from "../altitude1/types";
export type { OperationState };
export type { EnvelopeResult, SubmissionCriteriaResult };

/** The exact 3 values `contracts/ontology-binding.contract.json`'s `bindingScope` enum fixes. */
export const BINDING_SCOPES = ["read", "proposal", "commit"] as const;
export type BindingScope = (typeof BINDING_SCOPES)[number];

const BINDING_SCOPE_SET: ReadonlySet<string> = new Set(BINDING_SCOPES);

/** Runtime guard: is `value` one of the 3 registered binding-scope values? */
export function isBindingScope(value: unknown): value is BindingScope {
  return typeof value === "string" && BINDING_SCOPE_SET.has(value);
}

export interface BindingActor {
  readonly identity: string;
  readonly role?: string;
}

/**
 * Mirrors `contracts/ontology-binding.contract.json` field-for-field
 * (ADR-001: identity/version pointer only — never a consumer domain body).
 */
export interface OntologyBinding {
  readonly schemaVersion: string;
  readonly consumerProjectId: string;
  readonly consumerOntologyId: string;
  readonly consumerOntologyVersion: string;
  readonly successorVersion: string;
  readonly bindingScope: BindingScope;
  readonly boundAt: string; // ISO-8601 date-time
  readonly byWhom: BindingActor;
}

/**
 * A typed, scoped mutation proposal (A2-005: "mutation is typed, scoped,
 * reviewable"). Consumer-domain-neutral: `targetIdentities`/`writeScope`
 * are opaque identifier strings the caller supplies — this type never
 * encodes what a consumer's own Object Types or Properties are (ADR-001).
 */
export interface Proposal {
  readonly targetIdentities: readonly string[];
  readonly allowedAction: string;
  readonly writeScope: readonly string[];
  readonly description: string;
}

/**
 * The whole Altitude-2 operation session: `binding` plus every field the
 * chain accumulates as it advances (`proposal`, `dryRunFingerprint`,
 * `submissionCriteriaResult`, `permissionDecisionRef`, `envelopeNonce`).
 * Every altitude2 module receives and returns this record rather than
 * mutating shared state — the same immutable-record discipline
 * `src/altitude1/fde-session.ts`'s `FdeSession` already sets.
 */
export interface OperationSession {
  readonly sessionId: string;
  readonly state: OperationState;
  readonly binding: OntologyBinding;
  readonly proposal?: Proposal;
  readonly dryRunFingerprint?: string;
  readonly submissionCriteriaResult?: SubmissionCriteriaResult;
  readonly permissionDecisionRef?: string;
  readonly envelopeNonce?: string;
  readonly commitResult?: EnvelopeResult;
}

/** A single named-resource identifier (A2-004: never a free-text/generic-search blob). */
export const NAMED_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/** Runtime guard: does `value` look like a well-formed named Ontology resource identifier (no whitespace, non-empty)? */
export function isNamedIdentifier(value: unknown): value is string {
  return typeof value === "string" && NAMED_IDENTIFIER_PATTERN.test(value);
}

export interface NamedResourceQuery {
  readonly resourceId: string;
}

export interface ImpactQuery {
  readonly targetIdentity: string;
}

export interface SearchQuery {
  readonly query: string;
  readonly kind: import("../altitude1/staged-construction").PrimitiveKind;
}
