/**
 * Improvement #3 — LLM-unforgeable user-approval acceptance for the
 * OntologyDtcBuildReadinessGate (DTC-build router-dispatch readiness).
 * @owner palantirkc-plugin-lead-intent
 *
 * Mirrors Improvement #2 ({@link ../ontology-engineering-workflow/source-mutation-approval})
 * but adapted to the DTC-build approval surface. When a user genuinely approves the
 * DTC build, that user IS the binding that a WorkContract + RouterBinding pair
 * mechanically reconstruct. This verifier re-loads the hook-captured PromptEnvelope
 * and, fail-closed, decides whether a verifiable user-approval envelope authorizes
 * dispatch in lieu of those two process artifacts.
 *
 * Governance invariants (identical in spirit to Improvement #2):
 *   - It is ADDITIVE. The caller passes the resulting boolean into the PURE gate
 *     (`assessOntologyDtcBuildReadinessGate`) as an OPTIONAL alternative satisfier
 *     for ONLY the four WorkContract/RouterBinding-derived checks. It NEVER relaxes
 *     DTC validity, governance evidence (eval/branch/permission), or approval-ref
 *     presence — those checks stay mandatory.
 *   - It is FAIL-CLOSED. Any missing/mismatched field ⇒ `{ authorized: false }`.
 *     Absence of the envelope at the gate ⇒ byte-identical legacy behavior.
 *
 * Trust anchor (unchanged, no new trust surface): the prompt-front-door capture
 * hook fires on the REAL user turn (UserPromptSubmit), BEFORE the model runs, and
 * is the SOLE writer of `PromptEnvelope` files. The model can neither write nor
 * alter that envelope, so anything verified against it is unforgeable. This module
 * NEVER trusts a model-supplied blob — it re-loads the captured envelope at READ
 * time and re-checks promptHash + userQuote-substring + intent co-occurrence +
 * pointer-freshness + TTL.
 */

import type { PromptEnvelope, PromptRuntime } from "../prompt-front-door/envelope";
import {
  createUserApprovalRef,
  validateApprovalRefValue,
  type StructuredApprovalRef,
} from "../prompt-front-door/approval-ref";
import { PromptFrontDoorStore } from "../prompt-front-door/store";

/** Short TTL for the DTC-build approval — mirrors the source-mutation precedent. */
export const DTC_BUILD_APPROVAL_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Approval verbs (intent lexicon). Bilingual ko/en per the project output
 * convention. Matched as whole-ish tokens inside the verbatim excerpt. Mirrors the
 * source-mutation approval-verb set; the build-surface markers below carry the
 * DTC-build-specific half of the co-occurrence requirement.
 */
const APPROVAL_VERB_PATTERNS: readonly RegExp[] = [
  /\bapprove(d|s)?\b/i,
  /\bauthoriz(e|ed|es)\b/i,
  /\bgo ahead\b/i,
  /\bproceed\b/i,
  /\bgreen[- ]?light\b/i,
  /승인/,
  /허가/,
  /동의/,
  /허락/,
  /허용/,
  /진행/,
  /착수/,
  /해도\s*(좋|돼|된다)/,
];

/**
 * DTC-build-surface markers (second half of the co-occurrence requirement). These
 * signal the user is approving the ontology / digital-twin / DTC build, not some
 * unrelated edit. Kept deliberately coarse — the gate's own DTC validity +
 * governance-evidence checks carry the precision; this is only the INTENT gate.
 */
const DTC_BUILD_SURFACE_MARKERS: readonly RegExp[] = [
  /\bdtc\b/i,
  /\bdigital[- ]?twin\b/i,
  /\bbuild\b/i,
  /\bontology\b/i,
  /빌드/,
  /온톨로지/,
  /디지털\s*트윈/,
  /디지털트윈/,
];

/**
 * Negation guard. If ANY of these fire anywhere in the excerpt, the approval verb
 * half is voided: a negated directive ("don't build", "하지 마", "안 돼", "금지")
 * must NEVER clear the gate even when a build-surface marker co-occurs. Mirrors the
 * source-mutation negation list. The 안\s*(돼|된다|됨) form requires a space so
 * 안전(safe)/안내 do not trip it.
 */
const NEGATION_PATTERNS: readonly RegExp[] = [
  /하지\s*(마|말|않)/,
  /안\s*(돼|된다|됨)/,
  /금지/,
  /건드리지\s*(마|말)/,
  /\bdon'?t\b/i,
  /\bdo not\b/i,
];

/** Whitespace-normalize the same way `excerptPrompt` / `excerptApprovalText` do. */
function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Intent-lexicon co-occurrence check on the VERBATIM excerpt itself. Returns true
 * iff the captured `promptExcerpt` contains BOTH an approval verb AND a DTC-build
 * surface marker AND no negation. The model-supplied `userQuote` is NOT consulted
 * here; only the hook-captured excerpt is.
 */
export function excerptExpressesDtcBuildApproval(promptExcerpt: string): boolean {
  const excerpt = promptExcerpt; // case handled per-pattern (i-flag / unicode)
  const hasApprovalVerb = APPROVAL_VERB_PATTERNS.some((re) => re.test(excerpt));
  const hasSurfaceMarker = DTC_BUILD_SURFACE_MARKERS.some((re) => re.test(excerpt));
  const hasNegation = NEGATION_PATTERNS.some((re) => re.test(excerpt));
  return hasApprovalVerb && hasSurfaceMarker && !hasNegation;
}

/**
 * The minimal read surface the verifier needs over the front-door store. A real
 * {@link PromptFrontDoorStore} satisfies it; tests can stub it. Mirrors the
 * `EnvelopeStore` shape used by the source-mutation fast-path.
 */
export interface EnvelopeStore {
  readEnvelope(sessionId: string, promptId: string): Promise<PromptEnvelope | null>;
  readCurrentPointer(
    runtime: PromptRuntime,
    sessionId: string,
  ): Promise<{ readonly promptId: string; readonly promptHash: string } | null>;
}

function defaultStore(projectRoot: string): EnvelopeStore {
  return new PromptFrontDoorStore({ projectRoot });
}

export interface VerifyDtcBuildApprovalInput {
  readonly projectRoot: string;
  /** Pointer to the captured real prompt (model-claimed; verified, never trusted). */
  readonly promptId: string;
  readonly promptHash: string;
  /** Model's quote of the user's approval sentence (substring-verified vs excerpt). */
  readonly userQuote: string;
  /** Front-door runtime; defaults to the captured envelope's runtime. */
  readonly runtime?: PromptRuntime;
  /** Front-door session; required to resolve the envelope path deterministically. */
  readonly sessionId?: string;
  /** Injectable for tests. */
  readonly nowMs?: number;
  /** Injectable for tests (defaults to a real PromptFrontDoorStore). */
  readonly envelopeStore?: EnvelopeStore;
}

export type VerifyDtcBuildApprovalResult =
  | { readonly authorized: true; readonly reason: string; readonly approvalRef: StructuredApprovalRef }
  | { readonly authorized: false; readonly reason: string; readonly approvalRef?: undefined };

interface CoreVerifyArgs {
  readonly envelope: PromptEnvelope | null;
  readonly pointer: { readonly promptId: string; readonly promptHash: string } | null;
  readonly promptHash: string;
  readonly userQuote: string;
  readonly approvedAt?: string; // present only at re-verify (TTL anchor)
  readonly nowMs: number;
}

/**
 * The shared verification core. Every check must pass; the FIRST failure's reason
 * is returned (fail-closed). `approvedAt` (record freshness) is only checked when
 * supplied (i.e. at re-verify); at the read-time verify entrypoint below the
 * caller passes the just-loaded envelope's continuity anchors and `approvedAt`
 * is unset, so TTL is enforced only against a persisted approval timestamp.
 */
function coreVerify(args: CoreVerifyArgs): { ok: true } | { ok: false; reason: string } {
  // 1. Envelope EXISTS (only the UserPromptSubmit hook writes it; LLM cannot).
  if (args.envelope === null) {
    return {
      ok: false,
      reason: "captured PromptEnvelope not found for promptId (LLM cannot create one)",
    };
  }
  // 2. promptHash binds to the exact captured turn.
  if (args.envelope.promptHash !== args.promptHash) {
    return { ok: false, reason: "promptHash does not match the captured envelope" };
  }
  // 3. userQuote is a substring of the verbatim excerpt (the user actually said it).
  const excerpt = collapseWhitespace(args.envelope.promptExcerpt);
  const quote = collapseWhitespace(args.userQuote);
  if (quote.length === 0) {
    return { ok: false, reason: "userQuote is empty" };
  }
  if (!excerpt.includes(quote)) {
    return {
      ok: false,
      reason:
        "userQuote is not a substring of envelope.promptExcerpt (quote past the 240-char cut fails closed)",
    };
  }
  // 4. approval-verb + DTC-build-surface CO-OCCUR in the excerpt itself, no negation.
  if (!excerptExpressesDtcBuildApproval(args.envelope.promptExcerpt)) {
    return {
      ok: false,
      reason:
        "envelope.promptExcerpt lacks approval-verb + DTC-build-surface co-occurrence (or carries a negation)",
    };
  }
  // 5. Turn binding — promptId is the CURRENT pointer, or the immediately-previous
  //    turn whose `supersededByPromptId` points forward at the current pointer.
  if (args.pointer === null) {
    return { ok: false, reason: "no current front-door pointer for (runtime, sessionId)" };
  }
  const isCurrent = args.pointer.promptId === args.envelope.promptId;
  const isJustPrior =
    !isCurrent && args.envelope.supersededByPromptId === args.pointer.promptId;
  if (!isCurrent && !isJustPrior) {
    return {
      ok: false,
      reason:
        "approval promptId is neither the current nor the immediately-previous front-door pointer (stale/replay)",
    };
  }
  // 6. Freshness / TTL (only when an approvedAt anchor is supplied — re-verify path).
  if (args.approvedAt !== undefined) {
    const approvedMs = Date.parse(args.approvedAt);
    if (Number.isNaN(approvedMs)) {
      return { ok: false, reason: "approvedAt is not a valid timestamp" };
    }
    if (args.nowMs - approvedMs > DTC_BUILD_APPROVAL_TTL_MS) {
      return { ok: false, reason: "approval expired (outside 15-min TTL)" };
    }
  }
  return { ok: true };
}

/**
 * READ-TIME verifier the gate handler calls. Re-loads the hook-captured envelope
 * for `(sessionId, promptId)` and runs `coreVerify` against it (never trusting a
 * model-supplied blob). On success, mints a {@link StructuredApprovalRef} bound to
 * the captured envelope with `approvalSurface: "digital-twin-change"`, which the
 * caller may pass to the gate as the alternative satisfier.
 *
 * Any failure ⇒ `{ authorized: false, reason }` and the gate stays blocked
 * (default = not authorized).
 */
export async function verifyDtcBuildApprovalAgainstEnvelope(
  input: VerifyDtcBuildApprovalInput,
): Promise<VerifyDtcBuildApprovalResult> {
  const nowMs = input.nowMs ?? Date.now();
  const store = input.envelopeStore ?? defaultStore(input.projectRoot);

  if (!input.promptId?.trim()) return { authorized: false, reason: "promptId is required" };
  if (!input.promptHash?.trim()) return { authorized: false, reason: "promptHash is required" };

  // The front-door store keys envelopes by (sessionId, promptId), so sessionId is
  // required to resolve the envelope path deterministically. Fail closed.
  const sessionId = input.sessionId?.trim();
  if (!sessionId) {
    return { authorized: false, reason: "sessionId is required to locate the captured envelope" };
  }

  const envelope = await store.readEnvelope(sessionId, input.promptId);
  if (envelope === null) {
    return {
      authorized: false,
      reason: "captured PromptEnvelope not found for promptId (LLM cannot create one)",
    };
  }

  const runtime = input.runtime ?? envelope.runtime;
  const pointer = await store.readCurrentPointer(runtime, sessionId);

  const verdict = coreVerify({
    envelope,
    pointer,
    promptHash: input.promptHash,
    userQuote: input.userQuote,
    nowMs,
  });
  if (!verdict.ok) return { authorized: false, reason: verdict.reason };

  const approvedAt = new Date(nowMs).toISOString();
  const approvalRef: StructuredApprovalRef = createUserApprovalRef({
    promptId: envelope.promptId,
    promptHash: envelope.promptHash,
    sessionId,
    runtime,
    userVisibleSummary: "digital-twin-change DTC-build dispatch authorization",
    userAnswer: input.userQuote,
    approvalSurface: "digital-twin-change",
    approvedAt,
  });

  // Defense in depth: the minted ref must itself pass the fail-closed validator
  // (never hand the gate a malformed ref). A failure here is treated as not
  // authorized rather than throwing.
  const refIssues = validateApprovalRefValue("dtcBuildApprovalRef", approvalRef);
  if (refIssues.length > 0) {
    return {
      authorized: false,
      reason: `minted approvalRef failed validation: ${refIssues
        .map((issue) => issue.message)
        .join("; ")}`,
    };
  }

  return {
    authorized: true,
    reason: "re-verified against captured envelope (fresh, on-current-turn, build-approved)",
    approvalRef,
  };
}
