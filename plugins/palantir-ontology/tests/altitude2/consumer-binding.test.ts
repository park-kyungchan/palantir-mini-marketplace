// P440 S1: consumer binding (A2-001, A2-011) unit tests.

import { describe, expect, test } from "bun:test";
import { bindConsumerOntology, openReadOrQuery, type BindConsumerOntologyRequest, type ConsumerBindingDeps } from "../../src/altitude2/consumer-binding";

function baseRequest(overrides: Partial<BindConsumerOntologyRequest> = {}): BindConsumerOntologyRequest {
  return {
    sessionId: "session:2026-07-18-001",
    consumerProjectId: "projects/example-project",
    consumerOntologyId: "consumer:example-project",
    consumerOntologyVersion: "2.1.0",
    successorVersion: "0.1.0",
    bindingScope: "read",
    byWhom: { identity: "agent:claude-sonnet-5", role: "worker" },
    ...overrides,
  };
}

const REGISTERED_DEPS: ConsumerBindingDeps = {
  now: () => "2026-07-18T09:00:00Z",
  resolveConsumerProject: (projectId) => projectId === "projects/example-project",
};

describe("bindConsumerOntology: A2-001 universal entry", () => {
  test("binds to an already-registered consumer project and starts BOUND_CONSUMER_ONTOLOGY", () => {
    const result = bindConsumerOntology(baseRequest(), REGISTERED_DEPS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state).toBe("BOUND_CONSUMER_ONTOLOGY");
    expect(result.value.binding.consumerProjectId).toBe("projects/example-project");
    expect(result.value.binding.boundAt).toBe("2026-07-18T09:00:00Z");
  });

  test("denies with RC-BINDING-CONSUMER-UNKNOWN when the consumer project does not resolve", () => {
    const result = bindConsumerOntology(baseRequest({ consumerProjectId: "projects/never-registered" }), REGISTERED_DEPS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-BINDING-CONSUMER-UNKNOWN");
  });

  test("denies with RC-SCHEMA-VALIDATION-FAILED on a structurally malformed binding (bad version pattern)", () => {
    const result = bindConsumerOntology(baseRequest({ consumerOntologyVersion: "not-a-semver" }), REGISTERED_DEPS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("never returns an empty success: resolveConsumerProject is always consulted before ok()", () => {
    let called = false;
    const deps: ConsumerBindingDeps = {
      now: () => "2026-07-18T09:00:00Z",
      resolveConsumerProject: () => {
        called = true;
        return false;
      },
    };
    const result = bindConsumerOntology(baseRequest(), deps);
    expect(called).toBe(true);
    expect(result.ok).toBe(false);
  });
});

describe("openReadOrQuery", () => {
  test("advances a freshly-bound session to READ_OR_QUERY", () => {
    const bound = bindConsumerOntology(baseRequest(), REGISTERED_DEPS);
    if (!bound.ok) throw new Error("fixture setup failed");
    const opened = openReadOrQuery(bound.value);
    expect(opened.ok).toBe(true);
    if (opened.ok) expect(opened.value.state).toBe("READ_OR_QUERY");
  });

  test("is idempotent when already at READ_OR_QUERY", () => {
    const bound = bindConsumerOntology(baseRequest(), REGISTERED_DEPS);
    if (!bound.ok) throw new Error("fixture setup failed");
    const opened = openReadOrQuery(bound.value);
    if (!opened.ok) throw new Error("fixture setup failed");
    const openedAgain = openReadOrQuery(opened.value);
    expect(openedAgain).toEqual(opened);
  });

  test("denies advancing past READ_OR_QUERY (e.g. from PROPOSAL) with RC-STATE-SKIPPED-TRANSITION", () => {
    const bound = bindConsumerOntology(baseRequest(), REGISTERED_DEPS);
    if (!bound.ok) throw new Error("fixture setup failed");
    const proposalState = { ...bound.value, state: "PROPOSAL" as const };
    const result = openReadOrQuery(proposalState);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-STATE-SKIPPED-TRANSITION");
  });
});
