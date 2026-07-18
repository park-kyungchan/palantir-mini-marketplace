// Consumer Ontology binding (ledger row P440, A2-001, A2-011, ADR-001,
// AGENT-CONTRACT.md section 4).
//
// A2-001 ("Everyday operation begins from an already built consumer
// Ontology and does not silently enter construction or redefine domain
// meaning"): `bindConsumerOntology` is the universal Altitude-2 entry —
// every operation session starts here, `state: BOUND_CONSUMER_ONTOLOGY`,
// and reaching this state requires `deps.resolveConsumerProject` to
// independently confirm the named consumer project/Ontology is already
// registered. There is no path in this file that constructs, stages, or
// approves a NEW Ontology primitive — `src/altitude1/` owns that lane
// exclusively; this module only binds to one that already exists.
//
// A2-011 ("The consumer project's Ontology remains separate from
// palantir-mini's control-plane machinery, caches, mirrors, and
// runtime-local state"): the `OntologyBinding` this function produces
// carries only identity/version/scope fields (matching
// `contracts/ontology-binding.contract.json` exactly, ADR-001) — never a
// consumer domain body. `deps.resolveConsumerProject` is caller-injected
// precisely so this module never itself reaches into a consumer's actual
// Ontology store to decide whether it is "registered" (consumer-domain-
// ownership: that judgment belongs to whichever subsystem owns the
// consumer-project registry, not to the successor's own binding code).

import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED, type ReasonCode } from "../semantic-core/reason-codes";
import { validateBindingShape } from "./binding-validate";
import { assertLegalTransition } from "./operation-state-machine";
import { type AggregateResult, denied, ok, type BindingActor, type OntologyBinding, type OperationSession } from "./types";

const RC_BINDING_CONSUMER_UNKNOWN: ReasonCode = "RC-BINDING-CONSUMER-UNKNOWN";

// Belt-and-suspenders: every code this file cites must actually be
// registered in contracts/reason-code-registry.json (same discipline
// commit-gate.ts and construction-state-machine.ts already apply).
const CITED_CODES: readonly ReasonCode[] = [RC_BINDING_CONSUMER_UNKNOWN, RC_SCHEMA_VALIDATION_FAILED];
if (CITED_CODES.some((c) => !isRegisteredReasonCode(c))) {
  throw new Error("consumer-binding.ts: a cited reason code is not registered in contracts/reason-code-registry.json");
}

export interface BindConsumerOntologyRequest {
  readonly sessionId: string;
  readonly consumerProjectId: string;
  readonly consumerOntologyId: string;
  readonly consumerOntologyVersion: string;
  readonly successorVersion: string;
  readonly bindingScope: OntologyBinding["bindingScope"];
  readonly byWhom: BindingActor;
}

export interface ConsumerBindingDeps {
  readonly now: () => string;
  /**
   * Consumer-domain-neutral registration check (ADR-001): does
   * `consumerProjectId`/`consumerOntologyId` resolve to a currently
   * registered consumer project? This module never decides that itself.
   */
  readonly resolveConsumerProject: (consumerProjectId: string, consumerOntologyId: string) => boolean;
}

/**
 * The universal Altitude-2 entry (A2-001): every operation session starts
 * here. Fails closed with `RC-SCHEMA-VALIDATION-FAILED` on a structurally
 * malformed binding, and with `RC-BINDING-CONSUMER-UNKNOWN` when the named
 * consumer project/Ontology does not independently resolve — never a
 * silent empty-success bind.
 */
export function bindConsumerOntology(request: BindConsumerOntologyRequest, deps: ConsumerBindingDeps): AggregateResult<OperationSession> {
  const binding: OntologyBinding = {
    schemaVersion: "1.0.0",
    consumerProjectId: request.consumerProjectId,
    consumerOntologyId: request.consumerOntologyId,
    consumerOntologyVersion: request.consumerOntologyVersion,
    successorVersion: request.successorVersion,
    bindingScope: request.bindingScope,
    boundAt: deps.now(),
    byWhom: request.byWhom,
  };

  const shape = validateBindingShape(binding);
  if (!shape.valid) {
    return denied(RC_SCHEMA_VALIDATION_FAILED, `bindConsumerOntology: binding failed shape validation: ${shape.errors.join("; ")}`);
  }

  if (!deps.resolveConsumerProject(binding.consumerProjectId, binding.consumerOntologyId)) {
    return denied(
      RC_BINDING_CONSUMER_UNKNOWN,
      `bindConsumerOntology: consumerProjectId "${binding.consumerProjectId}" / consumerOntologyId "${binding.consumerOntologyId}" does not resolve to a registered consumer project`,
    );
  }

  return ok({ sessionId: request.sessionId, state: "BOUND_CONSUMER_ONTOLOGY", binding });
}

/**
 * Advances a freshly-bound session into `READ_OR_QUERY` — the state named
 * reads/search/impact inspection operate at (`reads.ts`). This is the ONE
 * choke point that advances `session.state` off `BOUND_CONSUMER_ONTOLOGY`,
 * the same role `fde-session.ts#transitionSession` plays for the
 * construction chain.
 */
export function openReadOrQuery(session: OperationSession): AggregateResult<OperationSession> {
  if (session.state === "READ_OR_QUERY") return ok(session); // idempotent: already open for reads
  const check = assertLegalTransition(session.state, "READ_OR_QUERY");
  if (!check.ok) {
    return denied(check.reasonCode, `session "${session.sessionId}": ${check.detail}`);
  }
  return ok({ ...session, state: "READ_OR_QUERY" });
}
