// ADR-006 Kinetic write executor (Unit A) — the audit-gated atomic
// mutation sequence completing Engine-V2 §3's `ActionExecutor` concept.
// Composes Unit D's journal (`./kinetic-audit-log`) and Unit C's evaluator
// (`./kinetic-validation`) into ONE sequence:
//
//   (1) if `criteria` supplied, `evaluateKineticCriteria` — any failure
//       throws a typed `KineticValidationError` BEFORE any audit file is
//       written and BEFORE any store access.
//   (2) fetch the target instance from `deps.store`.
//   (3) `audit.appendPending` with a `pre_state` snapshot (the existing
//       instance's properties, or `null` for a create).
//   (4) inside the audited attempt: verify optimistic concurrency, apply
//       the mutation (`store.put`), `audit.appendOutcome` SUCCESS with
//       `post_state`.
//   (5) on any error raised inside step 4 (including a concurrency
//       mismatch or a `store.put` throw): `audit.appendOutcome` FAILED with
//       the SAME `log_id`, `post_state: null`, `error_message` set to the
//       caught error's message, then throw a `KineticExecutionError` (Unit
//       E) carrying that SAME `log_id` and the original error as `cause`.
//
// V2 §3's architecture diagram labels this component "2PC"; §3's own body
// never uses that term and implements only a single audited commit (a
// PENDING/SUCCESS/FAILED status journal gating one storage write), never a
// distributed prepare/commit protocol — that is the sequence implemented
// here, deliberately not a 2PC engine.
//
// CORRECTED non-bypassable optimistic concurrency: the V2 design doc's
// `apply_action` (lines 252-256) only checks the version lock
// `if instance and expected_version is not None` — a caller that simply
// omits `expected_version` skips the check entirely and the version is
// still bumped unconditionally. This module does not reproduce that
// defect: for an EXISTING target instance, `expected_version` is REQUIRED
// — its absence throws `KineticMissingExpectedVersionError` before any
// audit file exists (a malformed-request/anti-bypass class, evaluated
// alongside criteria, never a recorded "attempt"). A present-but-wrong
// `expected_version` against an existing instance IS a genuine, well-formed
// mutation attempt that conflicts at commit time, so it is checked inside
// the audited attempt (after `appendPending`) and throws
// `KineticConcurrencyError`, leaving a PENDING+FAILED audit pair behind —
// unlike V2, where the same conflict (lines 248-256 run BEFORE the audit
// row is created at lines 258-270) would leave no audit trail at all. The
// creation path (no existing instance) requires `expected_version` to be
// absent/undefined and always starts the new instance at version 1.
//
// Storage port only: `ObjectInstanceStore` is a minimal in-process
// interface; `createInMemoryObjectStore` is a reference implementation for
// build/test use only — wiring a real persistent object-instance store is
// activation territory, out of scope for this build-only unit.
//
// No side-effect trigger stage: V2's `_trigger_side_effects` (line
// 337-339) is an explicit `print(...)` simulation stub in the design doc,
// not a real integration contract (no retry/timeout/idempotency-key/
// external-system interface is named anywhere in V2 for it) — this module
// does not implement or stub a side-effect stage.
//
// No clock/RNG calls inside this module: `timestamp` and `log_id` are
// caller-supplied on every `applyAction` request, for determinism and
// testability.
//
// Standalone: this executor is a PARALLEL capability to
// `./default-write-executor.ts` (which persists commit-gate envelopes, not
// ontology object instances) — it is not wired into `./commit-gate.ts`'s
// gate effects by this unit; that wiring is a later ADR-006 unit's concern.
//
// Citation: de-2026-07-24-s19-kinetic-adr006-scope-of-record (build-only
// ADR-006 scoping row of record, home-repo PR #1101).
//
// Unit E closes two V2 defects left open by Unit A:
//
//   (1) FAILURE CORRELATION (V2 lines 320-335): V2's `except` handler writes
//       a NEW `fail_log` row (its own fresh `log_id`, since `self.db.rollback()`
//       discards the original PENDING row) and raises
//       `RuntimeError(f"...{str(e)}")` — the exception carries only the error
//       message, never the `fail_log.log_id`, so a caller cannot correlate
//       the failure back to an audit row. This module does not reproduce
//       that gap: every error surfacing after `appendPending` (i.e. from
//       inside the audited attempt) is wrapped in the exported
//       `KineticExecutionError`, which carries the SAME `log_id` written to
//       `<log_id>.pending.json`/`<log_id>.failed.json` plus `cause` (the
//       original, unwrapped error) — a caller can always open the matching
//       audit file. Pre-audit structural errors (`KineticValidationError`,
//       `KineticMissingExpectedVersionError`, `KineticUnexpectedExpectedVersionError`)
//       have no audit row yet and remain unwrapped.
//
//   (2) IDEMPOTENCY (V2 §3 gap analysis: "No idempotency-key column exists
//       on ActionAuditLogModel or elsewhere, so retried side effects ...
//       would have no dedup mechanism defined."): `applyAction` now accepts
//       an optional `idempotency_key`, threaded into both the pending and
//       outcome audit records. When a caller supplies `idempotency_key` and
//       `kinetic-audit-log.ts`'s `findOutcomeByIdempotencyKey` finds a prior
//       SUCCESS for that key, the retry short-circuits: the recorded result
//       is returned WITHOUT re-running criteria/concurrency checks and
//       WITHOUT any new audit file. A prior FAILED outcome does NOT block a
//       retry — the retry proceeds as a fresh attempt with its own
//       caller-supplied `log_id`. (Reconstructing `new_version` for a replay
//       reads the already-committed instance's version off `deps.store` —
//       a read only, never a `store.put` — since the audit record's
//       `post_state` carries merged business properties, not the object's
//       version; the REQUIRED-TESTS bar for this unit is "no store
//       mutation", which this satisfies.)

import { evaluateKineticCriteria, type KineticCriteriaFailure, type KineticCriteriaNode } from "./kinetic-validation";
import type { KineticAuditLog, KineticAuditRecord } from "./kinetic-audit-log";

/** A single stored object instance, as seen through the `ObjectInstanceStore` port. */
export interface ObjectInstance {
  readonly instance_id: string;
  readonly object_type_id: string;
  readonly properties: Record<string, unknown>;
  readonly version: number;
}

/**
 * Minimal storage port the write executor mutates through. A real,
 * persistent binding (e.g. a database-backed store) is activation
 * territory — out of scope for this build-only unit; only an in-memory
 * reference implementation (`createInMemoryObjectStore`) ships here.
 */
export interface ObjectInstanceStore {
  get(instance_id: string): ObjectInstance | null;
  put(instance: ObjectInstance): void;
}

/**
 * Build-only in-memory reference `ObjectInstanceStore`. Real storage
 * binding (a persistent object-instance store) is activation territory,
 * intentionally out of scope here — this exists so the write executor and
 * its tests have a real, working port implementation to compose against.
 */
export function createInMemoryObjectStore(): ObjectInstanceStore {
  const instances = new Map<string, ObjectInstance>();
  return {
    get(instance_id: string): ObjectInstance | null {
      return instances.get(instance_id) ?? null;
    },
    put(instance: ObjectInstance): void {
      instances.set(instance.instance_id, instance);
    },
  };
}

/** Thrown when `deps.criteria` is supplied and evaluation reports 1+ failures. Thrown before any audit file exists and before any store access. */
export class KineticValidationError extends Error {
  constructor(public readonly failures: readonly KineticCriteriaFailure[]) {
    super(`kinetic-write-executor: submission-criteria validation failed with ${failures.length} failure(s): ${failures.map((f) => `${f.reason_code}@${f.path}`).join(", ")}`);
    this.name = "KineticValidationError";
  }
}

/**
 * Thrown when `applyAction` targets an EXISTING instance and
 * `expected_version` was omitted — the anti-bypass guard for the V2 defect
 * (lines 252-256) this module deliberately does not reproduce. Thrown
 * before any audit file exists.
 */
export class KineticMissingExpectedVersionError extends Error {
  constructor(target_object_id: string) {
    super(`kinetic-write-executor: applyAction against existing instance "${target_object_id}" requires expected_version — omitting it would silently bypass optimistic concurrency (the V2 design-doc defect this executor does not reproduce)`);
    this.name = "KineticMissingExpectedVersionError";
  }
}

/** Thrown when `applyAction` creates a NEW instance (no existing instance) but `expected_version` was supplied — there is nothing to lock yet. Thrown before any audit file exists. */
export class KineticUnexpectedExpectedVersionError extends Error {
  constructor(target_object_id: string) {
    super(`kinetic-write-executor: applyAction creating new instance "${target_object_id}" must not supply expected_version — there is no existing version to lock against`);
    this.name = "KineticUnexpectedExpectedVersionError";
  }
}

/** Thrown when an EXISTING instance's stored version does not match the caller-supplied `expected_version`. Raised inside the audited attempt: a PENDING+FAILED audit pair with the same `log_id` is written before this is thrown. */
export class KineticConcurrencyError extends Error {
  constructor(target_object_id: string, currentVersion: number, expectedVersion: number) {
    super(`kinetic-write-executor: concurrency conflict on "${target_object_id}" — current version ${currentVersion} != expected ${expectedVersion}`);
    this.name = "KineticConcurrencyError";
  }
}

/**
 * Thrown for any error surfacing AFTER `appendPending` (i.e. inside the
 * audited attempt) — closes the V2 lines 320-335 defect where the raised
 * `RuntimeError` never carried the audit row's `log_id`. `log_id` matches
 * the `<log_id>.pending.json`/`<log_id>.failed.json` audit pair on disk;
 * `cause` (native `Error` cause chaining) preserves the original,
 * unwrapped error. Pre-audit structural errors (`KineticValidationError`,
 * `KineticMissingExpectedVersionError`, `KineticUnexpectedExpectedVersionError`)
 * have no audit row to correlate and are never wrapped in this.
 */
export class KineticExecutionError extends Error {
  constructor(public readonly log_id: string, cause: unknown) {
    super(
      `kinetic-write-executor: applyAction(log_id="${log_id}") failed after the audit row was opened — see "${log_id}.failed.json" for the recorded failure detail`,
      { cause },
    );
    this.name = "KineticExecutionError";
  }
}

/** `applyAction` request fields, aligned to the V2 `apply_action` model. No clock/RNG calls inside this module: `timestamp` and `log_id` are always caller-supplied. */
export interface ApplyActionRequest {
  readonly log_id: string;
  readonly action_type: string;
  readonly actor_id: string;
  readonly target_object_id: string;
  readonly object_type_id: string;
  readonly mutation_properties: Record<string, unknown>;
  readonly expected_version?: number;
  readonly timestamp: string;
  /**
   * Optional idempotency key for retry deduplication. When supplied and a
   * SUCCESS outcome already exists for this key (per
   * `KineticAuditLog.findOutcomeByIdempotencyKey`), `applyAction`
   * short-circuits and returns the recorded result instead of re-running
   * the mutation. A prior FAILED outcome for the same key does NOT block a
   * retry.
   */
  readonly idempotency_key?: string;
}

export interface ApplyActionResult {
  readonly log_id: string;
  readonly target_object_id: string;
  readonly new_version: number;
}

export interface KineticWriteExecutorDeps {
  readonly store: ObjectInstanceStore;
  readonly audit: KineticAuditLog;
  readonly criteria?: KineticCriteriaNode;
}

export interface KineticWriteExecutor {
  applyAction(request: ApplyActionRequest): ApplyActionResult;
}

/**
 * Builds a `KineticWriteExecutor` composing a caller-supplied
 * `ObjectInstanceStore`, Unit D's `KineticAuditLog`, and (optionally) Unit
 * C's `KineticCriteriaNode` evaluator into the audit-gated atomic mutation
 * sequence documented in this module's header comment.
 */
export function createKineticWriteExecutor(deps: KineticWriteExecutorDeps): KineticWriteExecutor {
  return {
    applyAction(request: ApplyActionRequest): ApplyActionResult {
      // (0) IDEMPOTENT REPLAY: short-circuits BEFORE criteria evaluation,
      // BEFORE the structural guards, and BEFORE any new audit file — a
      // recorded SUCCESS for this idempotency_key means the mutation
      // already happened; a FAILED outcome does NOT short-circuit (the
      // retry falls through to a fresh attempt with its own log_id below).
      if (request.idempotency_key !== undefined) {
        const priorOutcome = deps.audit.findOutcomeByIdempotencyKey(request.idempotency_key);
        if (priorOutcome !== null && priorOutcome.status === "SUCCESS") {
          // Reconstruct new_version from the already-committed instance's
          // version — a store.get READ only, never a store.put; the audit
          // record's post_state carries merged business properties, not
          // the object's version field.
          const committedInstance = deps.store.get(priorOutcome.target_object_id);
          if (committedInstance === null) {
            throw new Error(
              `kinetic-write-executor: idempotent replay for idempotency_key "${request.idempotency_key}" found a recorded SUCCESS (log_id "${priorOutcome.log_id}") but target instance "${priorOutcome.target_object_id}" no longer exists in the store`,
            );
          }
          return {
            log_id: priorOutcome.log_id,
            target_object_id: priorOutcome.target_object_id,
            new_version: committedInstance.version,
          };
        }
      }

      // (1) Pre-mutation submission-criteria validation — before any audit
      // file exists and before any store access.
      if (deps.criteria !== undefined) {
        const result = evaluateKineticCriteria(request as unknown as Record<string, unknown>, deps.criteria);
        if (!result.pass) {
          throw new KineticValidationError(result.failures);
        }
      }

      // (2) Fetch the target instance.
      const existing = deps.store.get(request.target_object_id);

      // Anti-bypass structural guards — malformed requests, never a
      // recorded "attempt": thrown before any audit file exists.
      if (existing !== null && request.expected_version === undefined) {
        throw new KineticMissingExpectedVersionError(request.target_object_id);
      }
      if (existing === null && request.expected_version !== undefined) {
        throw new KineticUnexpectedExpectedVersionError(request.target_object_id);
      }

      // (3) Open the audited attempt: appendPending with a pre_state
      // snapshot of the instance as fetched above.
      const preState: Record<string, unknown> | null = existing !== null ? existing.properties : null;
      const pendingRecord: KineticAuditRecord = {
        log_id: request.log_id,
        action_type: request.action_type,
        actor_id: request.actor_id,
        target_object_id: request.target_object_id,
        object_type_id: request.object_type_id,
        pre_state: preState,
        post_state: null,
        status: "PENDING",
        error_message: null,
        timestamp: request.timestamp,
        ...(request.idempotency_key !== undefined ? { idempotency_key: request.idempotency_key } : {}),
      };
      deps.audit.appendPending(pendingRecord);

      try {
        // (4) Verify optimistic concurrency for an existing instance (a
        // well-formed attempt that conflicts at commit time — audited,
        // unlike the structural guards above).
        if (existing !== null) {
          // request.expected_version is guaranteed defined here by the
          // structural guard above.
          const expectedVersion = request.expected_version as number;
          if (existing.version !== expectedVersion) {
            throw new KineticConcurrencyError(request.target_object_id, existing.version, expectedVersion);
          }
        }

        // Construct the merged instance BEFORE the single store.put call
        // (the commit point) — partial application is impossible by
        // construction: either the fully-merged instance is put, or
        // nothing is.
        const newVersion = existing !== null ? existing.version + 1 : 1;
        const mergedProperties: Record<string, unknown> = {
          ...(existing !== null ? existing.properties : {}),
          ...request.mutation_properties,
        };
        const newInstance: ObjectInstance = {
          instance_id: request.target_object_id,
          object_type_id: request.object_type_id,
          properties: mergedProperties,
          version: newVersion,
        };

        deps.store.put(newInstance);

        // (5) Same log_id — Unit D's appendOutcome enforces pending-first
        // correlation.
        deps.audit.appendOutcome({
          ...pendingRecord,
          status: "SUCCESS",
          post_state: mergedProperties,
        });

        return { log_id: request.log_id, target_object_id: request.target_object_id, new_version: newVersion };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        deps.audit.appendOutcome({
          ...pendingRecord,
          status: "FAILED",
          post_state: null,
          error_message: message,
        });
        // TYPED FAILURE CORRELATION (closes V2 lines 320-335): wrap in
        // KineticExecutionError carrying the SAME log_id as the just-written
        // "<log_id>.failed.json", and the original error as `cause`.
        throw new KineticExecutionError(request.log_id, err);
      }
    },
  };
}
