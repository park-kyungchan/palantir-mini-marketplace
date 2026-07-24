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
//       caught error's message, then rethrow the ORIGINAL error unwrapped.
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
        throw err;
      }
    },
  };
}
