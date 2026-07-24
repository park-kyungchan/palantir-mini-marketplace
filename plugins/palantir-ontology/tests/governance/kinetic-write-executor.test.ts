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
  KineticExecutionError,
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
  test("a present-but-wrong expected_version throws KineticExecutionError (cause: KineticConcurrencyError) AND writes a pending+failed audit pair sharing the same log_id", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const store = createInMemoryObjectStore();
    store.put({ instance_id: "Widget:widget-1", object_type_id: "ObjectType:Widget", properties: { name: "Old" }, version: 5 });
    const executor = createKineticWriteExecutor({ store, audit });

    expect(() => executor.applyAction(baseRequest({ log_id: "log-4", expected_version: 2 }))).toThrow(KineticExecutionError);
    let thrown: unknown;
    try {
      executor.applyAction(baseRequest({ log_id: "log-4b", expected_version: 2 }));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(KineticExecutionError);
    expect((thrown as KineticExecutionError).log_id).toBe("log-4b");
    expect((thrown as KineticExecutionError).cause).toBeInstanceOf(KineticConcurrencyError);

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
  test("a store.put throw writes a FAILED outcome with the same log_id and throws KineticExecutionError whose log_id matches the on-disk failed record and whose cause is the original error", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const originalError = new Error("disk full");
    const throwingStore: ObjectInstanceStore = {
      get: () => null,
      put: () => {
        throw originalError;
      },
    };
    const executor = createKineticWriteExecutor({ store: throwingStore, audit });

    let thrown: unknown;
    try {
      executor.applyAction(baseRequest({ log_id: "log-7" }));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(KineticExecutionError);
    expect((thrown as KineticExecutionError).log_id).toBe("log-7");
    expect((thrown as KineticExecutionError).cause).toBe(originalError);

    const pending = JSON.parse(readFileSync(join(auditDir, "log-7.pending.json"), "utf8"));
    expect(pending.status).toBe("PENDING");
    const failed = JSON.parse(readFileSync(join(auditDir, "log-7.failed.json"), "utf8"));
    expect(failed.status).toBe("FAILED");
    expect(failed.log_id).toBe("log-7");
    expect(failed.error_message).toBe("disk full");
    expect(failed.post_state).toBeNull();
  });
});

describe("createKineticWriteExecutor: pre-audit errors remain unwrapped (negative test)", () => {
  test("KineticMissingExpectedVersionError is NOT wrapped in KineticExecutionError — no audit row exists to correlate", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const store = createInMemoryObjectStore();
    store.put({ instance_id: "Widget:widget-1", object_type_id: "ObjectType:Widget", properties: { name: "Old" }, version: 1 });
    const executor = createKineticWriteExecutor({ store, audit });

    let thrown: unknown;
    try {
      executor.applyAction(baseRequest({ log_id: "log-9" }));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(KineticMissingExpectedVersionError);
    expect(thrown).not.toBeInstanceOf(KineticExecutionError);
    expect(readdirSync(auditDir)).toEqual([]);
  });
});

describe("createKineticWriteExecutor: idempotent replay", () => {
  test("a repeated idempotency_key with a recorded SUCCESS returns the recorded result without touching the store or writing a new audit file", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const store = createInMemoryObjectStore();
    const executor = createKineticWriteExecutor({ store, audit });

    const first = executor.applyAction(baseRequest({ log_id: "log-10", idempotency_key: "idem-a" }));
    expect(first).toEqual({ log_id: "log-10", target_object_id: "Widget:widget-1", new_version: 1 });

    const filesAfterFirst = readdirSync(auditDir).sort();

    // A retry with a DIFFERENT log_id but the SAME idempotency_key must
    // return the ORIGINAL recorded result, untouched.
    const retry = executor.applyAction(
      baseRequest({ log_id: "log-10-retry", idempotency_key: "idem-a", mutation_properties: { name: "Should Not Apply" } }),
    );
    expect(retry).toEqual({ log_id: "log-10", target_object_id: "Widget:widget-1", new_version: 1 });

    // No new audit file was written for the replay.
    expect(readdirSync(auditDir).sort()).toEqual(filesAfterFirst);
    // No store mutation happened on replay — properties are still the original.
    expect(store.get("Widget:widget-1")?.properties).toEqual({ name: "Widget One" });
    expect(store.get("Widget:widget-1")?.version).toBe(1);

    // Both the pending and success records carry the idempotency_key.
    const pending = JSON.parse(readFileSync(join(auditDir, "log-10.pending.json"), "utf8"));
    expect(pending.idempotency_key).toBe("idem-a");
    const success = JSON.parse(readFileSync(join(auditDir, "log-10.success.json"), "utf8"));
    expect(success.idempotency_key).toBe("idem-a");
  });

  test("a FAILED prior outcome for the same idempotency_key does NOT block a retry — the retry proceeds as a fresh attempt", () => {
    const auditDir = makeTempOutcomeDir();
    const audit = createKineticAuditLog({ auditDir });
    const store = createInMemoryObjectStore();
    store.put({ instance_id: "Widget:widget-1", object_type_id: "ObjectType:Widget", properties: { name: "Old" }, version: 5 });
    const executor = createKineticWriteExecutor({ store, audit });

    // First attempt fails on a concurrency conflict, recorded under idem-b.
    expect(() =>
      executor.applyAction(baseRequest({ log_id: "log-11", expected_version: 2, idempotency_key: "idem-b" })),
    ).toThrow(KineticExecutionError);
    const failed = JSON.parse(readFileSync(join(auditDir, "log-11.failed.json"), "utf8"));
    expect(failed.idempotency_key).toBe("idem-b");

    // Retry with the same idempotency_key and the CORRECT expected_version
    // must proceed as a fresh attempt (not short-circuited by the FAILED
    // outcome) and succeed, using its own caller-supplied log_id.
    const retryResult = executor.applyAction(
      baseRequest({ log_id: "log-11-retry", expected_version: 5, idempotency_key: "idem-b" }),
    );
    expect(retryResult).toEqual({ log_id: "log-11-retry", target_object_id: "Widget:widget-1", new_version: 6 });
    expect(store.get("Widget:widget-1")?.version).toBe(6);
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
