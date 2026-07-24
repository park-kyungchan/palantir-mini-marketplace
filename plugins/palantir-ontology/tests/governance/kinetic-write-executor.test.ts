// ADR-006 kinetic write executor (Unit A) coverage — the audit-gated
// atomic mutation sequence composing Unit D's audit log
// (`kinetic-audit-log.ts`) and Unit C's criteria evaluator
// (`kinetic-validation.ts`). Citation:
// de-2026-07-24-s19-kinetic-adr006-scope-of-record. All audit writes happen
// under a per-test `mkdtempSync` temp directory (mirrors
// `kinetic-audit-log.test.ts`'s own use of `makeTempOutcomeDir`) — no
// tracked file is ever touched.

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createKineticAuditLog } from "../../src/governance/kinetic-audit-log";
import {
  createInMemoryObjectStore,
  createKineticWriteExecutor,
  KineticConcurrencyError,
  KineticMissingExpectedVersionError,
  KineticValidationError,
  type ApplyActionRequest,
  type ObjectInstanceStore,
} from "../../src/governance/kinetic-write-executor";
import { makeTempOutcomeDir } from "./gate-test-helpers";

function baseRequest(overrides: Partial<ApplyActionRequest> = {}): ApplyActionRequest {
  return {
    log_id: "log-1",
    action_type: "update-object",
    actor_id: "successor:governance-gate",
    target_object_id: "Widget:widget-1",
    object_type_id: "ObjectType:Widget",
    mutation_properties: { name: "Widget One" },
    timestamp: "2026-07-24T09:00:00Z",
    ...overrides,
  };
}

describe("createKineticWriteExecutor: happy path create", () => {
  test("creating a new instance starts at version 1 and writes a pending+success audit pair", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const store = createInMemoryObjectStore();
    const executor = createKineticWriteExecutor({ store, audit });

    const result = executor.applyAction(baseRequest());

    expect(result).toEqual({ log_id: "log-1", target_object_id: "Widget:widget-1", new_version: 1 });
    expect(store.get("Widget:widget-1")).toEqual({
      instance_id: "Widget:widget-1",
      object_type_id: "ObjectType:Widget",
      properties: { name: "Widget One" },
      version: 1,
    });

    const pending = JSON.parse(readFileSync(join(auditDir, "log-1.pending.json"), "utf8"));
    expect(pending.status).toBe("PENDING");
    expect(pending.pre_state).toBeNull();

    const success = JSON.parse(readFileSync(join(auditDir, "log-1.success.json"), "utf8"));
    expect(success.status).toBe("SUCCESS");
    expect(success.post_state).toEqual({ name: "Widget One" });
  });
});

describe("createKineticWriteExecutor: happy path update", () => {
  test("updating with the correct expected_version increments the version and records the merged post_state", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const store = createInMemoryObjectStore();
    store.put({ instance_id: "Widget:widget-1", object_type_id: "ObjectType:Widget", properties: { name: "Old", color: "red" }, version: 3 });
    const executor = createKineticWriteExecutor({ store, audit });

    const result = executor.applyAction(
      baseRequest({ log_id: "log-2", mutation_properties: { name: "New" }, expected_version: 3 }),
    );

    expect(result).toEqual({ log_id: "log-2", target_object_id: "Widget:widget-1", new_version: 4 });
    expect(store.get("Widget:widget-1")).toEqual({
      instance_id: "Widget:widget-1",
      object_type_id: "ObjectType:Widget",
      properties: { name: "New", color: "red" },
      version: 4,
    });

    const pending = JSON.parse(readFileSync(join(auditDir, "log-2.pending.json"), "utf8"));
    expect(pending.pre_state).toEqual({ name: "Old", color: "red" });
    const success = JSON.parse(readFileSync(join(auditDir, "log-2.success.json"), "utf8"));
    expect(success.post_state).toEqual({ name: "New", color: "red" });
  });
});

describe("createKineticWriteExecutor: anti-bypass concurrency guard", () => {
  test("omitting expected_version against an existing instance throws KineticMissingExpectedVersionError, before any audit file exists", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const store = createInMemoryObjectStore();
    store.put({ instance_id: "Widget:widget-1", object_type_id: "ObjectType:Widget", properties: { name: "Old" }, version: 1 });
    const executor = createKineticWriteExecutor({ store, audit });

    expect(() => executor.applyAction(baseRequest({ log_id: "log-3" }))).toThrow(KineticMissingExpectedVersionError);
    expect(readdirSync(auditDir)).toEqual([]);
    // The store must be untouched — no bypass of the concurrency check.
    expect(store.get("Widget:widget-1")).toEqual({ instance_id: "Widget:widget-1", object_type_id: "ObjectType:Widget", properties: { name: "Old" }, version: 1 });
  });
});

describe("createKineticWriteExecutor: concurrency mismatch", () => {
  test("a present-but-wrong expected_version throws KineticConcurrencyError AND writes a pending+failed audit pair sharing the same log_id", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const store = createInMemoryObjectStore();
    store.put({ instance_id: "Widget:widget-1", object_type_id: "ObjectType:Widget", properties: { name: "Old" }, version: 5 });
    const executor = createKineticWriteExecutor({ store, audit });

    expect(() => executor.applyAction(baseRequest({ log_id: "log-4", expected_version: 2 }))).toThrow(KineticConcurrencyError);

    const pending = JSON.parse(readFileSync(join(auditDir, "log-4.pending.json"), "utf8"));
    expect(pending.status).toBe("PENDING");
    const failed = JSON.parse(readFileSync(join(auditDir, "log-4.failed.json"), "utf8"));
    expect(failed.status).toBe("FAILED");
    expect(failed.log_id).toBe("log-4");
    expect(failed.post_state).toBeNull();
    expect(failed.error_message).toContain("concurrency conflict");
    // The store must be untouched on a rejected mutation.
    expect(store.get("Widget:widget-1")?.version).toBe(5);
  });
});

describe("createKineticWriteExecutor: submission-criteria validation", () => {
  test("a criteria failure throws KineticValidationError BEFORE any audit file exists", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const store = createInMemoryObjectStore();
    const executor = createKineticWriteExecutor({
      store,
      audit,
      criteria: { kind: "required", path: "mutation_properties.name" },
    });

    expect(() =>
      executor.applyAction(baseRequest({ log_id: "log-5", mutation_properties: {} })),
    ).toThrow(KineticValidationError);
    expect(readdirSync(auditDir)).toEqual([]);
  });

  test("a passing criteria check proceeds through the normal sequence", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const store = createInMemoryObjectStore();
    const executor = createKineticWriteExecutor({
      store,
      audit,
      criteria: { kind: "required", path: "mutation_properties.name" },
    });

    const result = executor.applyAction(baseRequest({ log_id: "log-6" }));
    expect(result.new_version).toBe(1);
  });
});

describe("createKineticWriteExecutor: store.put failure path", () => {
  test("a store.put throw writes a FAILED outcome with the same log_id and rethrows the original error", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const throwingStore: ObjectInstanceStore = {
      get: () => null,
      put: () => {
        throw new Error("disk full");
      },
    };
    const executor = createKineticWriteExecutor({ store: throwingStore, audit });

    expect(() => executor.applyAction(baseRequest({ log_id: "log-7" }))).toThrow("disk full");

    const pending = JSON.parse(readFileSync(join(auditDir, "log-7.pending.json"), "utf8"));
    expect(pending.status).toBe("PENDING");
    const failed = JSON.parse(readFileSync(join(auditDir, "log-7.failed.json"), "utf8"));
    expect(failed.status).toBe("FAILED");
    expect(failed.log_id).toBe("log-7");
    expect(failed.error_message).toBe("disk full");
    expect(failed.post_state).toBeNull();
  });
});

describe("createKineticWriteExecutor: audit files are canonical-serialized and append-only", () => {
  test("the pending and success files for one log_id never get overwritten by a second call reusing the same id", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const store = createInMemoryObjectStore();
    const executor = createKineticWriteExecutor({ store, audit });

    executor.applyAction(baseRequest({ log_id: "log-8" }));

    // Re-using the same log_id for a second, unrelated action must throw
    // (Unit D's append-only guarantee), leaving the original pair intact.
    expect(() =>
      executor.applyAction(baseRequest({ log_id: "log-8", target_object_id: "Widget:widget-2" })),
    ).toThrow();

    const pending = readFileSync(join(auditDir, "log-8.pending.json"), "utf8");
    // Canonical serialization: keys are alphabetically sorted regardless of
    // construction order.
    const keys = Object.keys(JSON.parse(pending));
    expect(keys).toEqual([...keys].sort());
    expect(store.get("Widget:widget-1")).not.toBeNull();
  });
});
