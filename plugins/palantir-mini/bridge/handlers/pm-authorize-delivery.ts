// palantir-mini pm authorization-flexibility slice 3 — pm_authorize_delivery MCP tool
// Domain: SECURITY (G-DSN-E structured grant mechanism, subsumes G-ENV-B resolution)
//
// Mints a SESSION-STANDING delivery-authorization grant (24h cross-session safety-
// net expiry, revocable via a user-authored revoke phrase — see G-RPLY-M Fix 1b,
// lib/prompt-front-door/delivery-grant-store.ts) from a re-verified user-approval
// envelope, replacing the dead A2 native-tool tool_input re-issue lane (G-ENV-B:
// additionalProperties:false on native Bash/Edit/Write schemas rejects the
// plugin-invented extra fields before hooks ever run) with a plugin-owned MCP
// surface. This is a PURE surface-relocation: it re-uses
// {@link verifyDeliveryApprovalAgainstEnvelope} verbatim — the same unforgeable,
// fail-closed re-verification the existing tool_input re-issue lane already ran.
//
// Envelope resolution mirrors bridge/handlers/pm-ontology-engineering-workflow.ts's
// `drift_rebind` seam (readCurrentDriftRebindEnvelope): prefer an explicit
// (sessionId, promptId) pair; otherwise walk the current pointer per runtime in the
// LOCAL per-project store; on a local miss, fall back to the GLOBAL cross-lane
// session index (lib/prompt-front-door/global-session-index.ts, slice 2's G-ENV-A
// mechanism) so a dispatched subagent or second repo sharing the same
// (runtime, sessionId) can still resolve the envelope captured elsewhere.
//
// The minted grant is keyed by the RESOLVED envelope's (runtime, sessionId) —
// NEVER raw caller input — so a forged runtime/sessionId on the tool call cannot
// mint a grant under an identity the caller does not actually hold.
//
// No grant is ever written on a failed verification. The grant persists
// session-standing until an explicit revoke phrase in a subsequent user-authored
// turn, or the DELIVERY_GRANT_SAFETY_NET_TTL_MS cross-session safety-net expiry,
// whichever comes first.

import {
  verifyDeliveryApprovalAgainstEnvelope,
  type VerifyDtcBuildApprovalResult,
} from "../../lib/lead-intent/dtc-build-approval";
import { PromptFrontDoorStore } from "../../lib/prompt-front-door/store";
import {
  PROMPT_RUNTIMES,
  isPromptRuntime,
  type PromptEnvelope,
  type PromptRuntime,
} from "../../lib/prompt-front-door/envelope";
import { readGlobalSessionPointer } from "../../lib/prompt-front-door/global-session-index";
import {
  issueDeliveryGrant,
  DELIVERY_GRANT_SAFETY_NET_TTL_MS,
  type DeliveryGrant,
} from "../../lib/prompt-front-door/delivery-grant-store";
import { emit } from "../../scripts/log";

export interface PmAuthorizeDeliveryInput {
  readonly project?: string;
  readonly userApprovalQuote?: string;
  readonly userApprovalPromptId?: string;
  readonly userApprovalPromptHash?: string;
  readonly promptId?: string;
  readonly promptHash?: string;
  readonly sessionId?: string;
  readonly runtime?: string;
}

export interface PmAuthorizeDeliverySuccessResult {
  readonly authorized: true;
  readonly grantId: string;
  readonly scope: DeliveryGrant["scope"];
  readonly expiresAt: string;
  readonly reason: string;
}

export interface PmAuthorizeDeliveryFailureResult {
  readonly authorized: false;
  readonly reason: string;
}

export type PmAuthorizeDeliveryResult =
  | PmAuthorizeDeliverySuccessResult
  | PmAuthorizeDeliveryFailureResult;

/**
 * Local per-project resolution — mirrors `pm-ontology-engineering-workflow.ts`'s
 * `readCurrentDriftRebindEnvelope` exactly: prefer the explicit (sessionId,
 * promptId) pair; otherwise walk the current pointer per runtime (preferred
 * runtime first, then the rest of PROMPT_RUNTIMES).
 */
async function readLocalEnvelope(
  store: PromptFrontDoorStore,
  sessionId: string | undefined,
  promptId: string | undefined,
  preferredRuntime: PromptRuntime | undefined,
): Promise<PromptEnvelope | null> {
  if (typeof promptId === "string" && promptId.length > 0 && typeof sessionId === "string" && sessionId.length > 0) {
    const envelope = await store.readEnvelope(sessionId, promptId);
    if (envelope) return envelope;
  }
  if (typeof sessionId !== "string" || sessionId.length === 0) return null;

  const runtimes = preferredRuntime
    ? [preferredRuntime, ...PROMPT_RUNTIMES.filter((runtime) => runtime !== preferredRuntime)]
    : PROMPT_RUNTIMES;
  for (const runtime of runtimes) {
    const pointer = await store.readCurrentPointer(runtime, sessionId);
    if (!pointer) continue;
    const envelope = await store.readEnvelope(pointer.sessionId, pointer.promptId);
    if (envelope) return envelope;
  }
  return null;
}

/**
 * G-ENV-A cross-lane fallback (slice 2 mechanism), consulted ONLY when
 * {@link readLocalEnvelope} misses against `projectRoot`. Mirrors the gate's
 * `readCurrentEnvelopeViaGlobalFallback` exactly: looks up the GLOBAL session
 * index by (runtime, sessionId) and, when a pointer redirects to a DIFFERENT
 * project root, resolves the envelope from THAT root's own local store via the
 * same resolution logic. Fails closed (returns null) on any error.
 */
async function readEnvelopeViaGlobalFallback(
  sessionId: string | undefined,
  promptId: string | undefined,
  preferredRuntime: PromptRuntime | undefined,
  projectRoot: string,
): Promise<PromptEnvelope | null> {
  try {
    if (typeof sessionId !== "string" || sessionId.length === 0) return null;
    const runtimes = preferredRuntime
      ? [preferredRuntime, ...PROMPT_RUNTIMES.filter((runtime) => runtime !== preferredRuntime)]
      : PROMPT_RUNTIMES;
    for (const runtime of runtimes) {
      const pointer = await readGlobalSessionPointer(runtime, sessionId);
      if (!pointer || pointer.projectRoot === projectRoot) continue;
      const redirectStore = new PromptFrontDoorStore({ projectRoot: pointer.projectRoot });
      const envelope = await readLocalEnvelope(redirectStore, sessionId, promptId, runtime);
      if (envelope) return envelope;
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveCurrentEnvelope(
  input: PmAuthorizeDeliveryInput,
  projectRoot: string,
): Promise<PromptEnvelope | null> {
  const store = new PromptFrontDoorStore({ projectRoot });
  const sessionId = input.sessionId?.trim();
  const promptId = input.promptId?.trim() || input.userApprovalPromptId?.trim();
  const preferredRuntime = isPromptRuntime(input.runtime) ? input.runtime : undefined;

  const local = await readLocalEnvelope(store, sessionId, promptId, preferredRuntime);
  if (local) return local;
  return readEnvelopeViaGlobalFallback(sessionId, promptId, preferredRuntime, projectRoot);
}

export default async function pmAuthorizeDelivery(
  rawInput: unknown,
): Promise<PmAuthorizeDeliveryResult> {
  const input = (rawInput ?? {}) as PmAuthorizeDeliveryInput;
  const project = typeof input.project === "string" ? input.project.trim() : "";
  const userApprovalQuote =
    typeof input.userApprovalQuote === "string" ? input.userApprovalQuote.trim() : "";

  if (!project) {
    return { authorized: false, reason: "project is required" };
  }
  if (!userApprovalQuote) {
    return { authorized: false, reason: "userApprovalQuote is required" };
  }

  const envelope = await resolveCurrentEnvelope(input, project);
  if (!envelope) {
    return {
      authorized: false,
      reason:
        "pm_authorize_delivery: no current prompt-front-door envelope resolves for this " +
        "session (checked the local per-project store and the global cross-lane index). " +
        "Run pm_semantic_intent_gate from the captured prompt context first, or supply " +
        "promptId + sessionId explicitly.",
    };
  }

  const promptId =
    input.userApprovalPromptId?.trim() || input.promptId?.trim() || envelope.promptId;
  const promptHash =
    input.userApprovalPromptHash?.trim() || input.promptHash?.trim() || envelope.promptHash;

  // verifyDeliveryApprovalAgainstEnvelope VERBATIM — the same unforgeable,
  // fail-closed core the A2 tool_input re-issue lane already used. Resolved against
  // the ENVELOPE's own projectRoot/sessionId/runtime (which may differ from the
  // caller's `project`/`sessionId` hints on a global-fallback redirect), so the
  // verifier's internal store lookup lands where the envelope actually lives.
  const verdict: VerifyDtcBuildApprovalResult = await verifyDeliveryApprovalAgainstEnvelope({
    projectRoot: envelope.projectRoot,
    promptId,
    promptHash,
    userQuote: userApprovalQuote,
    sessionId: envelope.sessionId,
    runtime: envelope.runtime,
  });

  if (verdict.authorized !== true) {
    return { authorized: false, reason: verdict.reason };
  }

  // Grant key MUST come from the RESOLVED envelope, never raw caller input.
  const grant = await issueDeliveryGrant({
    runtime: envelope.runtime,
    sessionId: envelope.sessionId,
    projectRoot: envelope.projectRoot,
    promptId: envelope.promptId,
    promptHash: envelope.promptHash,
  });

  try {
    await emit({
      type: "delivery_authorization_granted",
      payload: {
        grantId: grant.grantId,
        scope: grant.scope,
        sessionId: grant.sessionId,
        projectRoot: grant.projectRoot,
        promptId: grant.promptId,
        promptHash: grant.promptHash,
        issuedAt: grant.issuedAt,
        expiresAt: grant.expiresAt,
      },
      toolName: "pm_authorize_delivery",
      cwd: envelope.projectRoot,
      sessionId: envelope.sessionId,
      identity: "user",
      runtime: envelope.runtime,
      reasoning:
        `pm_authorize_delivery: minted a session-standing delivery grant ` +
        `(${grant.grantId}, safety-net expiry ${DELIVERY_GRANT_SAFETY_NET_TTL_MS / 3600000}h) ` +
        `from a re-verified user-approval envelope (${verdict.reason}).`,
      memoryLayers: ["working", "episodic"],
    });
  } catch {
    // Best-effort audit; never let an audit-write failure block the grant result.
  }

  return {
    authorized: true,
    grantId: grant.grantId,
    scope: grant.scope,
    expiresAt: grant.expiresAt,
    reason: verdict.reason,
  };
}
