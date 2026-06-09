/**
 * Improvement #2 — LLM-unforgeable developer/source-mutation fast-path.
 * @owner palantirkc-plugin-ontology-engineering-workflow
 *
 * Mints + (re-)verifies a {@link SourceMutationApprovalRecord} that authorizes a
 * source/developer edit to pm's own PROTECTED surfaces (hooks, gate/router
 * handlers, workflow libs, skills, managed-settings) WITHOUT the SIC/DTC
 * ceremony — while remaining provably from the user, scoped, expiring, audited,
 * and ADDITIVE (it never touches `deriveMutationAuthorized` / SIC / DTC / elevate).
 *
 * Trust anchor (identical to pm's SIC/DTC StructuredApprovalRef): the
 * prompt-front-door capture hook fires on the REAL user turn (UserPromptSubmit),
 * BEFORE the model runs, and is the SOLE writer of `PromptEnvelope` files. The
 * model can neither write nor alter that envelope, so anything verified against
 * it is unforgeable.
 *
 *   HOLE-1 closure: `reverifySourceMutationApprovalAgainstEnvelope` re-loads the
 *   captured envelope and re-checks promptHash + userQuote-substring +
 *   pointer-freshness + TTL + scope at READ time. The gate calls THIS — it never
 *   trusts the persisted record on its own.
 *
 *   HOLE-2 closure: the intent-lexicon check evaluates approval-verb AND
 *   protected-surface-marker CO-OCCURRENCE inside `envelope.promptExcerpt` ITSELF
 *   (the hook's verbatim capture) — NOT inside the model-supplied `userQuote`. A
 *   prompt that merely mentions a path (no approval verb) is rejected.
 */

import type { PromptEnvelope, PromptRuntime } from "../prompt-front-door/envelope";
import {
  createUserApprovalRef,
  type StructuredApprovalRef,
} from "../prompt-front-door/approval-ref";
import { PromptFrontDoorStore } from "../prompt-front-door/store";
import type { SourceMutationApprovalRecord } from "./types";

/** Short TTL for source edits — tighter than the 60-min SIC cache precedent. */
export const SOURCE_MUTATION_APPROVAL_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** User-only secondary authorizer (scoped). The LLM cannot set session env. */
export const USER_MUTATION_APPROVED_ENV = "PALANTIR_MINI_USER_MUTATION_APPROVED";

/**
 * Approval verbs (intent lexicon). Bilingual ko/en per the project output
 * convention. Matched as whole-ish tokens inside the verbatim excerpt.
 */
const APPROVAL_VERB_PATTERNS: readonly RegExp[] = [
  /\bapprove(d|s)?\b/i,
  /\bauthoriz(e|ed|es)\b/i,
  /\bgo ahead\b/i,
  /\bdo it\b/i,
  /\bgreen[- ]?light\b/i,
  /승인/,
  /허가/,
  /진행해/,
  /해도\s*(좋|돼|된다)/,
];

/**
 * Protected-surface markers (intent lexicon, second half of the co-occurrence
 * requirement). These signal the user is talking about a developer/source edit
 * to a protected surface, not an ontology-data mutation. Kept deliberately
 * coarse — the SCOPE precision lives in `approvedSourcePaths` + the gate's own
 * `targetsProtectedSurface`; this is only the INTENT gate.
 */
const PROTECTED_SURFACE_INTENT_MARKERS: readonly RegExp[] = [
  /\bhotfix\b/i,
  /\bsource\b/i,
  /\bsource[- ]?edit\b/i,
  /\bhook(s)?\b/i,
  /\bgate\b/i,
  /\bhandler(s)?\b/i,
  /\bworkflow lib\b/i,
  /\bskill(s)?\b/i,
  /\bmanaged[- ]?settings\b/i,
  /\bplugin source\b/i,
  /\bpalantir-mini\b/i,
];

export interface VerifyAndMintSourceMutationApprovalInput {
  readonly projectRoot: string;
  /** Pointer to the captured real prompt (model-claimed; verified, never trusted). */
  readonly promptId: string;
  readonly promptHash: string;
  /** Model's quote of the user's approval sentence (substring-verified vs excerpt). */
  readonly userQuote: string;
  /** SCOPE — the surface globs/paths the user named. */
  readonly approvedSourcePaths: readonly string[];
  /** Front-door runtime; defaults to the host runtime identity mapping. */
  readonly runtime?: PromptRuntime;
  /** Front-door session; defaults to the captured envelope's sessionId. */
  readonly sessionId?: string;
  /** Injectable for tests. */
  readonly nowMs?: number;
  /** Injectable for tests (defaults to a real PromptFrontDoorStore). */
  readonly envelopeStore?: EnvelopeStore;
}

export type VerifyAndMintSourceMutationApprovalResult =
  | { readonly record: SourceMutationApprovalRecord; readonly invalidReason?: undefined }
  | { readonly record?: undefined; readonly invalidReason: string };

/**
 * The minimal read surface the verifier + re-verifier need over the front-door
 * store. A real {@link PromptFrontDoorStore} satisfies it; tests can stub it.
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

/** Normalize exactly the way the enforcement gate normalizes path-like values. */
export function normalizeSourcePath(value: string): string {
  return value.replace(/\\/g, "/").toLowerCase().trim();
}

/** A scope entry is valid iff it is non-empty and NOT a global wildcard. */
function isValidScopeEntry(entry: string): boolean {
  const n = normalizeSourcePath(entry);
  if (n.length === 0) return false;
  if (n === "*" || n === "**" || n === "**/*" || n === "/" || n === "./") return false;
  return true;
}

/** Whitespace-normalize the same way `excerptPrompt` / `excerptApprovalText` do. */
function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * HOLE-2 — intent-lexicon co-occurrence check on the VERBATIM excerpt itself.
 * Returns true iff the captured `promptExcerpt` contains BOTH an approval verb
 * AND a protected-surface marker. The model-supplied `userQuote` is NOT consulted
 * here; only the hook-captured excerpt is.
 */
export function excerptExpressesSourceMutationApproval(promptExcerpt: string): boolean {
  const excerpt = promptExcerpt; // case handled per-pattern (i-flag / unicode)
  const hasApprovalVerb = APPROVAL_VERB_PATTERNS.some((re) => re.test(excerpt));
  const hasSurfaceMarker = PROTECTED_SURFACE_INTENT_MARKERS.some((re) => re.test(excerpt));
  return hasApprovalVerb && hasSurfaceMarker;
}

interface CoreVerifyArgs {
  readonly envelope: PromptEnvelope | null;
  readonly pointer: { readonly promptId: string; readonly promptHash: string } | null;
  readonly promptHash: string;
  readonly userQuote: string;
  readonly approvedSourcePaths: readonly string[];
  readonly approvedAt?: string; // present only at re-verify (TTL anchor)
  readonly nowMs: number;
}

/**
 * The shared verification core used by BOTH mint-time and read-time
 * (re-)verification. Every check must pass; the FIRST failure's reason is
 * returned. `approvedAt` (record freshness) is only checked when supplied (i.e.
 * at re-verify); at mint, `approvedAt` is `now` by construction.
 */
function coreVerify(args: CoreVerifyArgs): { ok: true } | { ok: false; reason: string } {
  // 1. Envelope EXISTS (only the UserPromptSubmit hook writes it; LLM cannot).
  if (args.envelope === null) {
    return { ok: false, reason: "captured PromptEnvelope not found for promptId (LLM cannot create one)" };
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
  // 4. HOLE-2 — approval-verb + protected-surface-marker CO-OCCUR in the excerpt itself.
  if (!excerptExpressesSourceMutationApproval(args.envelope.promptExcerpt)) {
    return {
      ok: false,
      reason:
        "envelope.promptExcerpt lacks approval-verb + protected-surface co-occurrence (path mention without approval verb is rejected)",
    };
  }
  // 5. SCOPE — non-empty, no global wildcard.
  const scope = args.approvedSourcePaths.filter(isValidScopeEntry);
  if (scope.length === 0) {
    return { ok: false, reason: "approvedSourcePaths is empty or wildcard-only (no global grant)" };
  }
  // 6. Turn binding — promptId is the CURRENT pointer, or the immediately-previous
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
      reason: "approval promptId is neither the current nor the immediately-previous front-door pointer (stale/replay)",
    };
  }
  // 7. Freshness / TTL (only when an approvedAt anchor is supplied — re-verify path).
  if (args.approvedAt !== undefined) {
    const approvedMs = Date.parse(args.approvedAt);
    if (Number.isNaN(approvedMs)) {
      return { ok: false, reason: "record.approvedAt is not a valid timestamp" };
    }
    if (args.nowMs - approvedMs > SOURCE_MUTATION_APPROVAL_TTL_MS) {
      return { ok: false, reason: "approval expired (outside 15-min TTL)" };
    }
  }
  return { ok: true };
}

/**
 * Verify a model-claimed approval against the INDEPENDENTLY hook-captured
 * PromptEnvelope, then mint a scoped, single-use, short-TTL approval record.
 * Returns `{ record }` on success or `{ invalidReason }` on any failure — no
 * record is written on failure (the gate stays blocked).
 */
export async function verifyAndMintSourceMutationApproval(
  input: VerifyAndMintSourceMutationApprovalInput,
): Promise<VerifyAndMintSourceMutationApprovalResult> {
  const nowMs = input.nowMs ?? Date.now();
  const store = input.envelopeStore ?? defaultStore(input.projectRoot);

  if (!input.promptId?.trim()) return { invalidReason: "promptId is required" };
  if (!input.promptHash?.trim()) return { invalidReason: "promptHash is required" };

  // The front-door store keys envelopes by (sessionId, promptId), so sessionId
  // is required to resolve the envelope path deterministically. Fail closed.
  const sessionId = input.sessionId?.trim();
  if (!sessionId) {
    return { invalidReason: "sessionId is required to locate the captured envelope" };
  }
  const envelope = await store.readEnvelope(sessionId, input.promptId);
  if (envelope === null) {
    return { invalidReason: "captured PromptEnvelope not found for promptId (LLM cannot create one)" };
  }

  const runtime = input.runtime ?? envelope.runtime;
  const pointer = await store.readCurrentPointer(runtime, sessionId);

  const verdict = coreVerify({
    envelope,
    pointer,
    promptHash: input.promptHash,
    userQuote: input.userQuote,
    approvedSourcePaths: input.approvedSourcePaths,
    nowMs,
  });
  if (!verdict.ok) return { invalidReason: verdict.reason };

  const approvedAt = new Date(nowMs).toISOString();
  const approvalRef: StructuredApprovalRef = createUserApprovalRef({
    promptId: envelope.promptId,
    promptHash: envelope.promptHash,
    sessionId,
    runtime,
    userVisibleSummary: `developer-source-mutation scope: ${input.approvedSourcePaths.join(", ")}`,
    userAnswer: input.userQuote,
    approvalSurface: "developer-source-mutation",
    approvedAt,
  });

  const record: SourceMutationApprovalRecord = {
    kind: "developer-source-mutation",
    approvalRef,
    approvedSourcePaths: input.approvedSourcePaths
      .filter(isValidScopeEntry)
      .map(normalizeSourcePath),
    approvedAtPromptId: envelope.promptId,
    approvedPromptHash: envelope.promptHash,
    runtime,
    sessionId,
    approvedAt,
    userQuote: input.userQuote,
  };
  return { record };
}

/**
 * SCOPE check — true iff EVERY touched protected path is prefix-covered by the
 * record's `approvedSourcePaths` (no partial grants). Paths are normalized the
 * same way the enforcement gate normalizes path-like values. An empty
 * `touchedPaths` is NOT authorized (fail closed — nothing to authorize means the
 * caller could not establish coverage).
 */
export function authorizesProtectedPaths(
  record: SourceMutationApprovalRecord,
  touchedPaths: readonly string[],
): boolean {
  if (record.consumedByToolCallId !== undefined) return false; // single-use
  const scope = record.approvedSourcePaths.map(normalizeSourcePath).filter((s) => s.length > 0);
  if (scope.length === 0) return false;
  const touched = touchedPaths.map(normalizeSourcePath).filter((p) => p.length > 0);
  if (touched.length === 0) return false;
  return touched.every((p) => scope.some((s) => p.includes(s) || p.startsWith(s)));
}

/**
 * Secondary, USER-ONLY env-var authorizer. Honored only as an ADDITIONAL channel.
 * A blank / `1` / `*` / `**` value is treated as NOT authorizing (no global
 * bypass). The LLM cannot set session env mid-turn, so this is user-only.
 */
export function envVarAuthorizesProtectedPaths(
  touchedPaths: readonly string[],
  envValue = process.env[USER_MUTATION_APPROVED_ENV],
): boolean {
  const raw = (envValue ?? "").trim();
  if (raw.length === 0 || raw === "1" || raw === "*" || raw === "**") return false;
  const scope = raw
    .split(",")
    .map(normalizeSourcePath)
    .filter(isValidScopeEntry)
    .map(normalizeSourcePath);
  if (scope.length === 0) return false;
  const touched = touchedPaths.map(normalizeSourcePath).filter((p) => p.length > 0);
  if (touched.length === 0) return false;
  return touched.every((p) => scope.some((s) => p.includes(s) || p.startsWith(s)));
}

export interface ReverifyResult {
  readonly authorized: boolean;
  readonly reason: string;
}

/**
 * HOLE-1 closure — READ-TIME re-verification the GATE calls.
 *
 * The gate NEVER trusts the persisted {@link SourceMutationApprovalRecord}. This
 * re-loads the hook-captured envelope for the record's `(sessionId,
 * approvedAtPromptId)` and re-checks, at read time:
 *   - the envelope still EXISTS,
 *   - `envelope.promptHash === record.approvedPromptHash`,
 *   - `record.userQuote` is a substring of the verbatim `promptExcerpt`,
 *   - the approval-verb + protected-surface co-occurrence still holds (HOLE-2),
 *   - the record's `approvedAtPromptId` is still the current / just-prior pointer,
 *   - the record is within the 15-min TTL,
 *   - the record is unconsumed, and
 *   - the record's scope covers EVERY touched protected path.
 *
 * Any failure ⇒ `{ authorized: false, reason }`; the gate stays blocked.
 */
export async function reverifySourceMutationApprovalAgainstEnvelope(
  record: SourceMutationApprovalRecord,
  envelopeStore: EnvelopeStore,
  touchedPaths: readonly string[],
  nowMs: number = Date.now(),
): Promise<ReverifyResult> {
  if (record.consumedByToolCallId !== undefined) {
    return { authorized: false, reason: "approval already consumed (single-use)" };
  }
  const envelope = await envelopeStore.readEnvelope(record.sessionId, record.approvedAtPromptId);
  const pointer = await envelopeStore.readCurrentPointer(record.runtime, record.sessionId);

  const verdict = coreVerify({
    envelope,
    pointer,
    promptHash: record.approvedPromptHash,
    userQuote: record.userQuote,
    approvedSourcePaths: record.approvedSourcePaths,
    approvedAt: record.approvedAt,
    nowMs,
  });
  if (!verdict.ok) return { authorized: false, reason: verdict.reason };

  if (!authorizesProtectedPaths(record, touchedPaths)) {
    return {
      authorized: false,
      reason: "record scope does not cover every touched protected path (no partial grant)",
    };
  }
  return { authorized: true, reason: "re-verified against captured envelope (fresh, in-scope, unconsumed)" };
}
