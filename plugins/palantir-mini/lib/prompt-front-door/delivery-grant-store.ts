// palantir-mini pm authorization-flexibility slice 3 — G-DSN-E structured grant
// mechanism (subsumes G-ENV-B resolution).
//
// A SESSION-scoped delivery-authorization GRANT, minted by the `pm_authorize_delivery`
// MCP tool after a fresh re-verification against the hook-captured PromptEnvelope
// (lib/lead-intent/dtc-build-approval.ts verifyDeliveryApprovalAgainstEnvelope). The
// grant persists at the SAME GLOBAL (home-level) path convention as slice 2's
// global-session-index (lib/prompt-front-door/global-session-index.ts), keyed purely
// by (runtime, sessionId) — NOT per-project — so a dispatched subagent or a second
// repo sharing the same (runtime, sessionId) can consume a grant minted from ANY
// project root (spike-confirmed: a subagent's PreToolUse `payload.session_id` equals
// the parent session's, see
// _workspace/2026-07-12-pmflex/reports/spike-session-id.json). The grant's VALIDITY
// was already established ONCE at issuance (re-verified against the captured
// envelope); WHERE it is subsequently consumed is a caching/reachability concern, not
// a fresh trust decision — mirroring slice 2's G-ENV-A rationale exactly.
//
// TTL/revocation (G-RPLY-M Fix 1b, supersedes the 30-min absolute TTL ruling in
// g12 de-2026-07-12-pm-flex-slices-2-3-policy-answers-locked per the superseding
// USER directive g12 de-2026-07-12-authorization-friction-corrective-user-2026-07-12-
// recurring-per-delivery): the grant is now SESSION-STANDING — a brand-new Claude
// Code session mints a brand-new sessionId and therefore a brand-new grant file
// (cross-session isolation is already structural, independent of any TTL value), so
// the expiry below is a generous CROSS-SESSION SAFETY NET only, not the primary
// end-of-grant mechanism. The real "end this grant early" control is explicit
// revocation (revokeDeliveryGrant/revokeDeliveryGrantSync below), driven by a
// user-authored revoke phrase (see lib/prompt-front-door/prompt-origin-classifier.ts's
// excerptRequestsDeliveryGrantRevocation, wired in hooks/prompt-front-door-capture.ts).
// Distinct from and does not alter DTC_BUILD_APPROVAL_TTL_MS in
// lib/lead-intent/dtc-build-approval.ts, which stays 15 minutes for its own lane.
//
// Path is overridable via PALANTIR_MINI_GLOBAL_STATE_DIR (same override as
// global-session-index.ts) so tests never read or write the real user home
// directory (hard hermeticity requirement).
import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { unlinkSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { atomicWriteJson, atomicWriteJsonSync } from "../fs-atomic";
import { safeSegment } from "../id-segment";
import type { PromptRuntime } from "./envelope";

export const DELIVERY_GRANT_SCHEMA_VERSION = "prompt-front-door/delivery-grant/v1";

/**
 * 24 hours — a cross-session safety net, not the primary expiry mechanism. See
 * the file header: the grant is session-standing until revoked; this bound only
 * catches a grant file that outlives any plausible single session.
 */
export const DELIVERY_GRANT_SAFETY_NET_TTL_MS = 24 * 60 * 60 * 1000;

export type DeliveryGrantScope = "authorized-delivery";

export interface DeliveryGrant {
  readonly schemaVersion: typeof DELIVERY_GRANT_SCHEMA_VERSION;
  readonly grantId: string;
  readonly scope: DeliveryGrantScope;
  readonly runtime: PromptRuntime;
  readonly sessionId: string;
  readonly projectRoot: string;
  readonly promptId: string;
  readonly promptHash: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

const SEGMENT_OPTS = { fallback: "unknown", maxLen: Infinity, allowColon: false } as const;

/**
 * Root directory for the global delivery-grant store. Default:
 * `<os.homedir()>/.palantir-mini/session/delivery-grants`. Honors the SAME
 * PALANTIR_MINI_GLOBAL_STATE_DIR override as global-session-index.ts (replaces the
 * home-directory base, not the trailing suffix).
 */
export function deliveryGrantStoreRootDir(): string {
  const override = process.env.PALANTIR_MINI_GLOBAL_STATE_DIR;
  const base = override && override.trim().length > 0 ? override : os.homedir();
  return path.join(base, ".palantir-mini", "session", "delivery-grants");
}

function deliveryGrantPath(runtime: PromptRuntime, sessionId: string): string {
  return path.join(
    deliveryGrantStoreRootDir(),
    `${safeSegment(runtime, SEGMENT_OPTS)}-${safeSegment(sessionId, SEGMENT_OPTS)}.json`,
  );
}

export interface IssueDeliveryGrantInput {
  /** MUST come from the RESOLVED envelope, never raw caller input (issuance trust anchor). */
  readonly runtime: PromptRuntime;
  readonly sessionId: string;
  readonly projectRoot: string;
  readonly promptId: string;
  readonly promptHash: string;
  /** Injectable for tests. */
  readonly nowMs?: number;
}

function grantRecordFor(input: IssueDeliveryGrantInput): DeliveryGrant {
  const nowMs = input.nowMs ?? Date.now();
  return {
    schemaVersion: DELIVERY_GRANT_SCHEMA_VERSION,
    grantId: `dg-${nowMs.toString(36)}-${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    scope: "authorized-delivery",
    runtime: input.runtime,
    sessionId: input.sessionId,
    projectRoot: input.projectRoot,
    promptId: input.promptId,
    promptHash: input.promptHash,
    issuedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + DELIVERY_GRANT_SAFETY_NET_TTL_MS).toISOString(),
  };
}

/**
 * Upsert (mint/overwrite) the delivery grant for `(runtime, sessionId)`. Async —
 * used by the `pm_authorize_delivery` MCP handler. Callers MUST have already
 * re-verified the approval (e.g. via verifyDeliveryApprovalAgainstEnvelope) before
 * calling this — this module performs no verification of its own.
 */
export async function issueDeliveryGrant(input: IssueDeliveryGrantInput): Promise<DeliveryGrant> {
  const grant = grantRecordFor(input);
  await atomicWriteJson(deliveryGrantPath(grant.runtime, grant.sessionId), grant);
  return grant;
}

/** Sync upsert variant — parity with global-session-index.ts's sync/async pair. */
export function issueDeliveryGrantSync(input: IssueDeliveryGrantInput): DeliveryGrant {
  const grant = grantRecordFor(input);
  atomicWriteJsonSync(deliveryGrantPath(grant.runtime, grant.sessionId), grant);
  return grant;
}

/** True iff `grant` is still live at `nowMs`. Exported so the gate can share the expiry check. */
export function isDeliveryGrantLive(grant: DeliveryGrant, nowMs: number = Date.now()): boolean {
  const expiresMs = Date.parse(grant.expiresAt);
  if (Number.isNaN(expiresMs)) return false;
  return nowMs < expiresMs;
}

/**
 * Read the delivery grant for `(runtime, sessionId)`. Returns null when no grant
 * file exists, and ALSO treats an expired-at-read grant as a miss (callers never
 * need a second TTL check). Any non-ENOENT read/parse error is rethrown — mirrors
 * {@link "./global-session-index".readGlobalSessionPointer}'s error handling;
 * consumption call sites must wrap this in try/catch to fail closed on store
 * errors (grant CONSUMPTION security posture — never let a store error grant
 * access).
 *
 * Fail-closed integrity check: the grant file's OWN embedded `(runtime, sessionId)`
 * must match the key it was looked up by. Trust must never rest solely on the
 * filename (derived via the same lossy `safeSegment` normalization used to key
 * every other prompt-front-door store) — a grant file copied to, or otherwise
 * placed at, another session's path is treated identically to "never granted",
 * closing the cross-session-transfer gap where a filename alone could smuggle a
 * grant into an unrelated session.
 */
export async function readDeliveryGrant(
  runtime: PromptRuntime,
  sessionId: string,
  nowMs: number = Date.now(),
): Promise<DeliveryGrant | null> {
  let raw: string;
  try {
    raw = await readFile(deliveryGrantPath(runtime, sessionId), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const grant = JSON.parse(raw) as DeliveryGrant;
  if (grant.runtime !== runtime || grant.sessionId !== sessionId) return null;
  if (!isDeliveryGrantLive(grant, nowMs)) return null;
  return grant;
}

/**
 * Revoke (delete) the live grant for (runtime, sessionId), if any. Idempotent
 * — a miss is not an error. Returns true iff a grant existed and was removed.
 * No tombstone/history: a subsequent readDeliveryGrant is a plain miss,
 * identical to "never granted" (matches the existing fail-closed consumption
 * contract — callers never need a revoked-vs-never-granted distinction).
 */
export async function revokeDeliveryGrant(runtime: PromptRuntime, sessionId: string): Promise<boolean> {
  try {
    await unlink(deliveryGrantPath(runtime, sessionId));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

/** Sync revoke variant — parity with issueDeliveryGrant/issueDeliveryGrantSync. */
export function revokeDeliveryGrantSync(runtime: PromptRuntime, sessionId: string): boolean {
  try {
    unlinkSync(deliveryGrantPath(runtime, sessionId));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
