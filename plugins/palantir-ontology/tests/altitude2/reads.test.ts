// P440 S1: named reads/search/impact (A2-003, A2-004) unit tests.

import { describe, expect, test } from "bun:test";
import { bindConsumerOntology, openReadOrQuery } from "../../src/altitude2/consumer-binding";
import { inspectImpact, queryNamedResource, searchOntology } from "../../src/altitude2/reads";
import type { OperationSession } from "../../src/altitude2/types";

function readySession(): OperationSession {
  const bound = bindConsumerOntology(
    {
      sessionId: "session:reads-1",
      consumerProjectId: "projects/example-project",
      consumerOntologyId: "consumer:example-project",
      consumerOntologyVersion: "2.1.0",
      successorVersion: "0.1.0",
      bindingScope: "read",
      byWhom: { identity: "agent:claude-sonnet-5" },
    },
    { now: () => "2026-07-18T09:00:00Z", resolveConsumerProject: () => true },
  );
  if (!bound.ok) throw new Error("fixture setup failed");
  const opened = openReadOrQuery(bound.value);
  if (!opened.ok) throw new Error("fixture setup failed");
  return opened.value;
}

describe("queryNamedResource", () => {
  test("resolves a well-formed named identifier", () => {
    const result = queryNamedResource(readySession(), { resourceId: "ObjectType:Widget" }, (id) => (id === "ObjectType:Widget" ? { kind: "ObjectType" } : undefined));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ found: true, resource: { kind: "ObjectType" } });
  });

  test("a legitimate not-found is ok(), not a denial (a read finding nothing is not a failure)", () => {
    const result = queryNamedResource(readySession(), { resourceId: "ObjectType:DoesNotExist" }, () => undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ found: false });
  });

  test("denies a free-text (whitespace-containing) resourceId with RC-SCHEMA-VALIDATION-FAILED", () => {
    const result = queryNamedResource(readySession(), { resourceId: "this is not an identifier" }, () => undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("denies a session that has not yet opened READ_OR_QUERY", () => {
    const bound = bindConsumerOntology(
      { sessionId: "s", consumerProjectId: "p", consumerOntologyId: "c", consumerOntologyVersion: "1.0.0", successorVersion: "0.1.0", bindingScope: "read", byWhom: { identity: "a" } },
      { now: () => "2026-07-18T09:00:00Z", resolveConsumerProject: () => true },
    );
    if (!bound.ok) throw new Error("fixture setup failed");
    const result = queryNamedResource(bound.value, { resourceId: "ObjectType:Widget" }, () => undefined);
    expect(result.ok).toBe(false);
  });
});

describe("searchOntology", () => {
  test("resolves a registered PrimitiveKind-scoped search", () => {
    const result = searchOntology(readySession(), { kind: "ObjectType", query: "widget" }, (kind, q) => (kind === "ObjectType" && q === "widget" ? ["ObjectType:Widget"] : []));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.matches).toEqual(["ObjectType:Widget"]);
  });

  test("denies an unregistered kind (distinct from generic search) with RC-SCHEMA-VALIDATION-FAILED", () => {
    const result = searchOntology(readySession(), { kind: "NotAKind" as any, query: "widget" }, () => []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("denies an empty query string", () => {
    const result = searchOntology(readySession(), { kind: "ObjectType", query: "" }, () => []);
    expect(result.ok).toBe(false);
  });
});

describe("inspectImpact", () => {
  test("resolves impact for a named target identity", () => {
    const result = inspectImpact(readySession(), { targetIdentity: "ObjectType:Widget" }, (id) => (id === "ObjectType:Widget" ? ["Link:WidgetOwner"] : []));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ targetIdentity: "ObjectType:Widget", affected: ["Link:WidgetOwner"] });
  });

  test("denies a free-text target identity", () => {
    const result = inspectImpact(readySession(), { targetIdentity: "not an identifier" }, () => []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });
});
