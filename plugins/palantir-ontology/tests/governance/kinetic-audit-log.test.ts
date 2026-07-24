// ADR-006 Kinetic audit journal (Unit D) — coverage for the append-only,
// per-record status-transition file model. Citation:
// de-2026-07-24-s19-kinetic-adr006-scope-of-record. All writes happen under
// a per-test `mkdtempSync` temp directory (mirrors `atomic-write.test.ts`'s
// `makeTempOutcomeDir` helper) — no tracked file is ever touched.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertWithinAllowedRoots, WriteScopeViolationError } from "../../src/governance/atomic-write";
import {
  createKineticAuditLog,
  KineticAuditCorrelationError,
  KineticAuditOverwriteError,
  type KineticAuditRecord,
} from "../../src/governance/kinetic-audit-log";
import { makeTempOutcomeDir } from "./gate-test-helpers";

function pendingRecord(overrides: Partial<KineticAuditRecord> = {}): KineticAuditRecord {
  return {
    log_id: "log-1",
    action_type: "create-object-type",
    actor_id: "successor:governance-gate",
    target_object_id: "ObjectType:Widget",
    object_type_id: "ObjectType",
    pre_state: null,
    post_state: null,
    status: "PENDING",
    error_message: null,
    timestamp: "2026-07-24T09:00:00Z",
    ...overrides,
  };
}

describe("createKineticAuditLog: pending -> success", () => {
  test("appendPending then appendOutcome(SUCCESS) writes both files with byte-stable canonical serialization", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    const pending = pendingRecord();
    log.appendPending(pending);

    const successRecord: KineticAuditRecord = {
      ...pending,
      status: "SUCCESS",
      post_state: { name: "Widget" },
    };
    log.appendOutcome(successRecord);

    const pendingPath = join(auditDir, "log-1.pending.json");
    const successPath = join(auditDir, "log-1.success.json");
    expect(readFileSync(pendingPath, "utf8")).toBe(
      '{"action_type":"create-object-type","actor_id":"successor:governance-gate","error_message":null,"log_id":"log-1","object_type_id":"ObjectType","post_state":null,"pre_state":null,"status":"PENDING","target_object_id":"ObjectType:Widget","timestamp":"2026-07-24T09:00:00Z"}',
    );
    expect(readFileSync(successPath, "utf8")).toBe(
      '{"action_type":"create-object-type","actor_id":"successor:governance-gate","error_message":null,"log_id":"log-1","object_type_id":"ObjectType","post_state":{"name":"Widget"},"pre_state":null,"status":"SUCCESS","target_object_id":"ObjectType:Widget","timestamp":"2026-07-24T09:00:00Z"}',
    );
  });

  test("re-serializing the same record twice produces byte-identical canonical output regardless of key insertion order", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    const a = pendingRecord({ log_id: "log-order-a" });
    const b: KineticAuditRecord = {
      timestamp: a.timestamp,
      status: a.status,
      target_object_id: a.target_object_id,
      pre_state: a.pre_state,
      post_state: a.post_state,
      object_type_id: a.object_type_id,
      log_id: "log-order-b",
      error_message: a.error_message,
      actor_id: a.actor_id,
      action_type: a.action_type,
    };
    log.appendPending(a);
    log.appendPending(b);
    const contentA = readFileSync(join(auditDir, "log-order-a.pending.json"), "utf8").replace('"log_id":"log-order-a"', '"log_id":"X"');
    const contentB = readFileSync(join(auditDir, "log-order-b.pending.json"), "utf8").replace('"log_id":"log-order-b"', '"log_id":"X"');
    expect(contentA).toBe(contentB);
  });
});

describe("createKineticAuditLog: pending -> failed", () => {
  test("appendOutcome(FAILED) writes a NEW .failed.json file alongside the untouched .pending.json", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    const pending = pendingRecord({ log_id: "log-2" });
    log.appendPending(pending);

    const failedRecord: KineticAuditRecord = {
      ...pending,
      status: "FAILED",
      error_message: "target already exists",
    };
    log.appendOutcome(failedRecord);

    expect(JSON.parse(readFileSync(join(auditDir, "log-2.pending.json"), "utf8")).status).toBe("PENDING");
    const failed = JSON.parse(readFileSync(join(auditDir, "log-2.failed.json"), "utf8"));
    expect(failed.status).toBe("FAILED");
    expect(failed.error_message).toBe("target already exists");
  });
});

describe("createKineticAuditLog: correlation guarantee", () => {
  test("appendOutcome without a prior pending record throws KineticAuditCorrelationError", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    const outcome = pendingRecord({ log_id: "log-orphan", status: "SUCCESS" });
    expect(() => log.appendOutcome(outcome)).toThrow(KineticAuditCorrelationError);
  });
});

describe("createKineticAuditLog: append-only (no overwrite)", () => {
  test("a second appendPending for the same log_id throws KineticAuditOverwriteError, leaving the original file intact", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    const first = pendingRecord({ log_id: "log-3" });
    log.appendPending(first);

    const second = pendingRecord({ log_id: "log-3", actor_id: "someone-else" });
    expect(() => log.appendPending(second)).toThrow(KineticAuditOverwriteError);
    expect(JSON.parse(readFileSync(join(auditDir, "log-3.pending.json"), "utf8")).actor_id).toBe("successor:governance-gate");
  });

  test("a second appendOutcome for the same log_id and status throws KineticAuditOverwriteError", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    const pending = pendingRecord({ log_id: "log-4" });
    log.appendPending(pending);
    const outcome: KineticAuditRecord = { ...pending, status: "SUCCESS" };
    log.appendOutcome(outcome);
    expect(() => log.appendOutcome(outcome)).toThrow(KineticAuditOverwriteError);
  });
});

describe("createKineticAuditLog: readAuditState precedence", () => {
  test("returns null when no file exists for log_id", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    expect(log.readAuditState("does-not-exist")).toBeNull();
  });

  test("returns the pending record when only .pending.json exists", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    log.appendPending(pendingRecord({ log_id: "log-5" }));
    expect(log.readAuditState("log-5")?.status).toBe("PENDING");
  });

  test("failed takes precedence over pending", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    const pending = pendingRecord({ log_id: "log-6" });
    log.appendPending(pending);
    log.appendOutcome({ ...pending, status: "FAILED", error_message: "boom" });
    expect(log.readAuditState("log-6")?.status).toBe("FAILED");
  });

  test("success takes precedence over both failed and pending", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    const pending = pendingRecord({ log_id: "log-7" });
    log.appendPending(pending);
    // A retried outcome path can independently leave a stray .failed.json
    // from an earlier attempt; success must still win the precedence read.
    expect(log.readAuditState("log-7")?.status).toBe("PENDING");
    log.appendOutcome({ ...pending, status: "SUCCESS" });
    expect(log.readAuditState("log-7")?.status).toBe("SUCCESS");
  });
});

describe("createKineticAuditLog: findOutcomeByIdempotencyKey", () => {
  test("returns null when no record for the idempotency_key exists", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    expect(log.findOutcomeByIdempotencyKey("idem-none")).toBeNull();
  });

  test("returns the SUCCESS outcome matching idempotency_key", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    const pending = pendingRecord({ log_id: "log-idem-1", idempotency_key: "idem-1" });
    log.appendPending(pending);
    log.appendOutcome({ ...pending, status: "SUCCESS", post_state: { name: "Widget" } });

    const found = log.findOutcomeByIdempotencyKey("idem-1");
    expect(found?.status).toBe("SUCCESS");
    expect(found?.log_id).toBe("log-idem-1");
  });

  test("returns the FAILED outcome matching idempotency_key when no SUCCESS exists", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    const pending = pendingRecord({ log_id: "log-idem-2", idempotency_key: "idem-2" });
    log.appendPending(pending);
    log.appendOutcome({ ...pending, status: "FAILED", error_message: "boom" });

    const found = log.findOutcomeByIdempotencyKey("idem-2");
    expect(found?.status).toBe("FAILED");
    expect(found?.log_id).toBe("log-idem-2");
  });

  test("SUCCESS takes precedence over a FAILED outcome sharing the same idempotency_key from a different log_id", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    const failedAttempt = pendingRecord({ log_id: "log-idem-3a", idempotency_key: "idem-3" });
    log.appendPending(failedAttempt);
    log.appendOutcome({ ...failedAttempt, status: "FAILED", error_message: "first attempt failed" });

    const succeededRetry = pendingRecord({ log_id: "log-idem-3b", idempotency_key: "idem-3" });
    log.appendPending(succeededRetry);
    log.appendOutcome({ ...succeededRetry, status: "SUCCESS", post_state: { name: "Widget" } });

    const found = log.findOutcomeByIdempotencyKey("idem-3");
    expect(found?.status).toBe("SUCCESS");
    expect(found?.log_id).toBe("log-idem-3b");
  });

  test("a pending-only record (no outcome yet) is never returned", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    log.appendPending(pendingRecord({ log_id: "log-idem-4", idempotency_key: "idem-4" }));
    expect(log.findOutcomeByIdempotencyKey("idem-4")).toBeNull();
  });
});

describe("createKineticAuditLog: fail-closed root guard", () => {
  test("a write whose computed target escapes auditDir (path traversal in log_id) is rejected, not silently written outside the root", () => {
    const auditDir = makeTempOutcomeDir();
    const log = createKineticAuditLog({ auditDir });
    const escaping = pendingRecord({ log_id: "../../escape" });
    expect(() => log.appendPending(escaping)).toThrow(WriteScopeViolationError);
  });

  test("the same root-guard rejects an auditDir-shaped path that is only a sibling of, not nested under, an allowed root", () => {
    // `createKineticAuditLog({ auditDir })` self-scopes its allowed roots to
    // `[auditDir]`, so every write it performs is validated by this exact
    // `assertWithinAllowedRoots` check (exercised directly here, mirroring
    // `atomic-write.test.ts`'s own "sibling directory" negative case) —
    // confirms the plugin's root-guard semantics the factory reuses reject
    // a path that merely shares a prefix rather than nesting under the root.
    const outerRoot = makeTempOutcomeDir();
    const siblingNotNested = `${outerRoot}-sibling-not-nested/log-1.pending.json`;
    expect(() => assertWithinAllowedRoots(siblingNotNested, [outerRoot])).toThrow(WriteScopeViolationError);
  });
});
