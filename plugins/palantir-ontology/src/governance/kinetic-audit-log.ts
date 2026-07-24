// ADR-006 Kinetic audit journal (Unit D). Every later ADR-006 write-path
// unit (Units C/A/E/B) records into this substrate: an append-only,
// per-record status-transition journal reusing this package's ONE shared
// atomic-write primitive (`./atomic-write`'s `atomicWriteFile`/
// `assertWithinAllowedRoots`) rather than any local reimplementation.
//
// Storage model (append-only, no mutation of an existing file): a record
// with `log_id` L first writes `<auditDir>/L.pending.json`. Completion
// writes a NEW file — `<auditDir>/L.success.json` or `<auditDir>/L.failed.json`
// — it never edits the `.pending.json` file in place. Readers derive the
// final state by precedence: success > failed > pending. This reuses the
// plugin's own atomic tmp+rename primitive and its fail-closed root guard;
// there is no lock/append race because no file is ever opened for append.
//
// NON-CANONICAL: this journal is NOT the home repo's canonical governance
// record. It mirrors the R10 §9 palantir-mini clause — it is a build-only,
// non-canonical audit substrate relative to the home repo's
// `projects/governance` jsonl ledgers, until a user ruling says otherwise.
//
// Citation: de-2026-07-24-s19-kinetic-adr006-scope-of-record (build-only
// ADR-006 scoping row of record).
//
// Unit E closes a V2 defect named in the design doc's own gap analysis: "No
// idempotency-key column exists on ActionAuditLogModel or elsewhere, so
// retried side effects ... would have no dedup mechanism defined." This
// module (which owns the file-layout knowledge) adds
// `findOutcomeByIdempotencyKey` — a pure read over the existing
// `idempotency_key` record field (no schema change) that lets
// `kinetic-write-executor.ts`'s Unit E idempotent-replay path deduplicate a
// retried `applyAction` call without scanning audit files itself.

import { canonicalize, type CanonicalizableValue } from "../semantic-core/canonical-json";
import { assertWithinAllowedRoots, atomicWriteFile } from "./atomic-write";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type KineticAuditStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface KineticAuditRecord {
  readonly log_id: string;
  readonly action_type: string;
  readonly actor_id: string;
  readonly target_object_id: string;
  readonly object_type_id: string;
  readonly pre_state: unknown | null;
  readonly post_state: unknown | null;
  readonly status: KineticAuditStatus;
  readonly error_message: string | null;
  readonly idempotency_key?: string;
  readonly timestamp: string;
}

export class KineticAuditCorrelationError extends Error {
  constructor(logId: string) {
    super(`kinetic-audit-log: appendOutcome(${logId}) has no prior "${logId}.pending.json" — an outcome must correlate to a pending record`);
    this.name = "KineticAuditCorrelationError";
  }
}

export class KineticAuditOverwriteError extends Error {
  constructor(targetPath: string) {
    super(`kinetic-audit-log: "${targetPath}" already exists — append-only journal, writes never overwrite`);
    this.name = "KineticAuditOverwriteError";
  }
}

export interface KineticAuditLog {
  /** Writes `<auditDir>/<log_id>.pending.json`. Throws unless `record.status === "PENDING"`. Throws if the file already exists. */
  appendPending(record: KineticAuditRecord): void;
  /** Writes `<auditDir>/<log_id>.<status>.json` for a SUCCESS/FAILED record. Throws unless the matching `.pending.json` file already exists, and throws if the outcome file already exists. */
  appendOutcome(record: KineticAuditRecord): void;
  /** Returns the precedence-resolved record for `log_id` (success > failed > pending), or `null` if no file for `log_id` exists. */
  readAuditState(log_id: string): KineticAuditRecord | null;
  /**
   * Returns the precedence-resolved (success > failed) outcome record whose
   * `idempotency_key` matches, or `null` if none. Scans only outcome files
   * (`.success.json`/`.failed.json`) — never pending-only records, so an
   * in-flight (never-completed) attempt never satisfies a replay lookup.
   */
  findOutcomeByIdempotencyKey(idempotency_key: string): KineticAuditRecord | null;
}

function statusFileName(logId: string, status: KineticAuditStatus): string {
  const suffix = status === "PENDING" ? "pending" : status === "SUCCESS" ? "success" : "failed";
  return `${logId}.${suffix}.json`;
}

/**
 * Builds a `KineticAuditLog` writing/reading per-record status-transition
 * files under `auditDir`. `auditDir` is validated via `assertWithinAllowedRoots`
 * (this package's own fail-closed root guard) on every write — there is no
 * separate opt-in check and no way to bypass it.
 */
export function createKineticAuditLog({ auditDir }: { auditDir: string }): KineticAuditLog {
  const allowedRoots = [auditDir];
  assertWithinAllowedRoots(auditDir, allowedRoots);

  function writeStatusFile(record: KineticAuditRecord, status: KineticAuditStatus): void {
    const targetPath = join(auditDir, statusFileName(record.log_id, status));
    if (existsSync(targetPath)) {
      throw new KineticAuditOverwriteError(targetPath);
    }
    atomicWriteFile(targetPath, canonicalize(record as unknown as CanonicalizableValue), allowedRoots);
  }

  return {
    appendPending(record: KineticAuditRecord): void {
      if (record.status !== "PENDING") {
        throw new Error(`kinetic-audit-log: appendPending(${record.log_id}) requires status "PENDING", got "${record.status}"`);
      }
      writeStatusFile(record, "PENDING");
    },

    appendOutcome(record: KineticAuditRecord): void {
      if (record.status !== "SUCCESS" && record.status !== "FAILED") {
        throw new Error(`kinetic-audit-log: appendOutcome(${record.log_id}) requires status "SUCCESS" or "FAILED", got "${record.status}"`);
      }
      const pendingPath = join(auditDir, statusFileName(record.log_id, "PENDING"));
      if (!existsSync(pendingPath)) {
        throw new KineticAuditCorrelationError(record.log_id);
      }
      writeStatusFile(record, record.status);
    },

    readAuditState(log_id: string): KineticAuditRecord | null {
      for (const status of ["SUCCESS", "FAILED", "PENDING"] as const) {
        const targetPath = join(auditDir, statusFileName(log_id, status));
        if (existsSync(targetPath)) {
          return JSON.parse(readFileSync(targetPath, "utf8")) as KineticAuditRecord;
        }
      }
      return null;
    },

    findOutcomeByIdempotencyKey(idempotency_key: string): KineticAuditRecord | null {
      const files = readdirSync(auditDir);
      // Precedence: success > failed. Pending-only files are never
      // considered — an in-flight attempt has no dedup-able outcome yet.
      for (const suffix of [".success.json", ".failed.json"] as const) {
        for (const file of files) {
          if (!file.endsWith(suffix)) continue;
          const record = JSON.parse(readFileSync(join(auditDir, file), "utf8")) as KineticAuditRecord;
          if (record.idempotency_key === idempotency_key) {
            return record;
          }
        }
      }
      return null;
    },
  };
}
