// palantir-mini pm auth-friction closure — G-RPLY-M Fix 1a: prompt-origin
// classification.
//
// Root cause (confirmed live): hooks/prompt-front-door-capture.ts has zero
// discrimination between a real user turn and a system/task-notification-shaped
// UserPromptSubmit payload — every non-empty payload.prompt overwrites the
// `current` pointer file that coreVerify check #5 (lib/lead-intent/dtc-build-approval.ts)
// reads. This module classifies a captured raw prompt so the capture hook can
// advance a SEPARATE, narrower "last user-authored" pointer only on real user turns
// (see lib/prompt-front-door/store.ts's readLastUserAuthoredPointer /
// writeLastUserAuthoredPointer), while the general `current` pointer keeps advancing
// on every turn, origin-agnostic, unchanged.
//
// TWO-LAYER CLASSIFICATION (adversarial-lens BLOCKER ruling, 2026-07-12): this
// module's classification is used for TWO structurally different decisions with
// DIFFERENT failure postures:
//   1. Pointer advancement (UX, this file's classifyPromptOrigin): stays
//      FAIL-OPEN for genuinely unrecognized shapes (default "user") — a fully
//      fail-closed default was considered and REJECTED, since no positive
//      "this is a human" marker exists in the payload and fail-closed would
//      break every normal prompt.
//   2. Mint eligibility (trust-ELEVATING, lib/lead-intent/dtc-build-approval.ts's
//      verifyDeliveryApprovalAgainstEnvelope): STRICTER than layer 1 by design.
//      An anchor envelope is mint-eligible ONLY IF (a) it was shape-classified
//      "user" by classifyPromptOrigin AND (b) its full promptExcerpt contains
//      NONE of {@link NOTIFICATION_MARKER_SUBSTRINGS} (or a configured marker)
//      anywhere — scanned via {@link scanForNotificationMarkers}, UNANCHORED,
//      unlike classifyPromptOrigin's positional heuristics. This closes the gap
//      where a notification shape not caught by heuristics 1/1b/1c (e.g. a
//      marker appearing MID-TEXT rather than wrapping the whole prompt or
//      anchoring the start) falls open to "user" for pointer-advancement
//      purposes yet must never be trusted to anchor a delivery mint. Ambiguity
//      (marker found, or no originClass recorded) refuses the mint, fail-closed;
//      it never retroactively un-advances the pointer.
//
// RESIDUAL RISK (accepted): a hypothetical future notification shape carrying
// ZERO markers from either list while echoing the exact approval sentence would
// still slip both layers. Accepted because (i) quote-verification still
// requires the VERBATIM approval sentence to be a substring of the captured
// excerpt (coreVerify check #3 in dtc-build-approval.ts) — an attacker-shaped
// notification would need to fabricate a plausible human approval sentence
// verbatim, not merely relay one; (ii) every mint and every mint refusal is
// audited (delivery_authorization_granted / gate assessment rows), so a novel
// bypass leaves a forensic trail; (iii) both marker lists are designed to be
// extended (NOTIFICATION_WRAPPER_TAGS/BRACKET_NOTIFICATION_PREFIX/
// AUTOMATED_REPORT_PREFIX for structural shapes, PALANTIR_MINI_SYSTEM_PROMPT_MARKERS
// for operator-observed ones) as new notification shapes are observed
// empirically, per the existing extension convention below.

export type PromptOriginClass = "user" | "system-notification";

// Harness-native wrapper tags observed to carry non-user-authored content:
// <system-reminder> (out-of-band context, also appears trailing genuine user
// turns), <task-notification> (background/cron task completions), and
// <local-command-stdout>/<local-command-stderr> (captured command output).
// All four are structural (harness-emitted), not operator-configured.
const NOTIFICATION_WRAPPER_TAGS = [
  "system-reminder",
  "task-notification",
  "local-command-stdout",
  "local-command-stderr",
] as const;

function stripNotificationWrapperTags(rawPrompt: string): string {
  let stripped = rawPrompt;
  for (const tag of NOTIFICATION_WRAPPER_TAGS) {
    stripped = stripped.replace(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "g"), "");
  }
  return stripped;
}

// Some notifications are delivered as a bracket-prefixed line covering the
// WHOLE prompt (no closing tag), e.g. "[SYSTEM NOTIFICATION] background task
// finished". Matched only against the FULL trimmed prompt (anchored at the
// start), never as a substring search, so a genuine user message that merely
// mentions such a marker mid-sentence is not misclassified.
const BRACKET_NOTIFICATION_PREFIX = /^\[(SYSTEM|TASK)\s+NOTIFICATION\]/;

// Unwrapped automated-report shape: several harness-native tools in THIS
// environment (Monitor, CronCreate one-shot reminders, PushNotification,
// task-completion pushes) surface their result as a THIRD-PERSON status
// clause — "Background job completed: ...", "Task finished - ...", "Build
// succeeded: ..." — before any wrapper tag is applied, or from a source that
// fails to apply one. A genuine human turn does not open with this
// report-generator phrasing, so this is a low-false-positive signal that
// does NOT require a closing tag or configured marker. Matched only against
// the START of the trimmed prompt (anchored), immediately followed by `:`/`-`,
// so a user message that merely discusses a completed job mid-sentence
// ("the build finished, can you check it?") is not misclassified.
const AUTOMATED_REPORT_PREFIX =
  /^\[?(background\s+)?(job|task|build|deploy(?:ment)?|workflow|pipeline|process|run)\s+(completed|finished|succeeded|failed|done)\b\s*[:\-]/i;

/**
 * Classifies a captured raw prompt as user-authored or system/notification-
 * originated. FAIL-OPEN only for genuinely UNRECOGNIZED shapes: any prompt not
 * matching a known structural notification shape (heuristics 1/1b/1c below) or
 * an operator-configured marker classifies as "user" (today's behavior,
 * unchanged for freeform approval text). This module is the SOLE layer
 * distinguishing a human-typed turn from a same-event-shaped (UserPromptSubmit)
 * notification/task push in this harness — it is heuristic, not a claim of
 * exhaustive coverage; extend NOTIFICATION_WRAPPER_TAGS/
 * BRACKET_NOTIFICATION_PREFIX/AUTOMATED_REPORT_PREFIX (structural,
 * harness-native shapes) or PALANTIR_MINI_SYSTEM_PROMPT_MARKERS
 * (operator-configured) as new notification shapes are observed empirically.
 */
export function classifyPromptOrigin(rawPrompt: string): PromptOriginClass {
  const trimmed = rawPrompt.trim();
  if (trimmed.length === 0) return "user";

  // Heuristic 1 (structural, tag-wrapped): strip every known harness-native
  // notification wrapper tag. These ALSO appear on genuine user turns (as a
  // trailing/interleaved block), so presence alone is not a signal — but a
  // prompt whose content is ENTIRELY such blocks (nothing else survives
  // stripping) has no human-authored content.
  const stripped = stripNotificationWrapperTags(rawPrompt).trim();
  if (stripped.length === 0) {
    return "system-notification";
  }

  // Heuristic 1b (structural, bracket-prefixed): see BRACKET_NOTIFICATION_PREFIX.
  if (BRACKET_NOTIFICATION_PREFIX.test(trimmed)) {
    return "system-notification";
  }

  // Heuristic 1c (structural, unwrapped report shape): see AUTOMATED_REPORT_PREFIX.
  if (AUTOMATED_REPORT_PREFIX.test(trimmed)) {
    return "system-notification";
  }

  // Heuristic 2 (operator-configured): exact-substring markers for shapes
  // observed in live sessions but not covered by heuristics 1/1b/1c.
  const configured = (process.env.PALANTIR_MINI_SYSTEM_PROMPT_MARKERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (configured.some((marker) => rawPrompt.includes(marker))) {
    return "system-notification";
  }
  return "user";
}

// Bracket-notification literal forms, kept in sync with (but not derived from,
// since that regex carries \s+ flexibility a plain substring list cannot
// express) BRACKET_NOTIFICATION_PREFIX's alternation.
const BRACKET_NOTIFICATION_MARKERS = ["[SYSTEM NOTIFICATION", "[TASK NOTIFICATION"] as const;

/**
 * Known notification-marker substrings for {@link scanForNotificationMarkers}
 * (mint-eligibility use, see the two-layer classification note above). Derived
 * from {@link NOTIFICATION_WRAPPER_TAGS} (as opening-tag substrings) plus
 * {@link BRACKET_NOTIFICATION_MARKERS}, so a future addition to either source
 * list automatically extends this scan without a second hand-maintained copy.
 */
export const NOTIFICATION_MARKER_SUBSTRINGS: readonly string[] = [
  ...NOTIFICATION_WRAPPER_TAGS.map((tag) => `<${tag}`),
  ...BRACKET_NOTIFICATION_MARKERS,
];

export interface NotificationMarkerScanResult {
  readonly found: boolean;
  readonly marker?: string;
}

/**
 * UNANCHORED substring scan for known notification markers anywhere in `text`
 * (mint-eligibility use only — see the two-layer classification note above
 * this file's header). Unlike classifyPromptOrigin's heuristics, which are
 * deliberately POSITIONAL (an entirely-wrapped block, or a start-anchored
 * bracket prefix) so a genuine user turn that merely mentions a marker
 * mid-sentence is not misclassified for pointer-advancement purposes, this
 * scan is intentionally broader: a false positive here only refuses a
 * delivery-mint attempt (fail-closed; the user can simply re-approve in a
 * clean turn) — it never blocks pointer advancement or any other decision.
 */
export function scanForNotificationMarkers(text: string): NotificationMarkerScanResult {
  for (const marker of NOTIFICATION_MARKER_SUBSTRINGS) {
    if (text.includes(marker)) return { found: true, marker };
  }
  const configured = (process.env.PALANTIR_MINI_SYSTEM_PROMPT_MARKERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const marker of configured) {
    if (text.includes(marker)) return { found: true, marker };
  }
  return { found: false };
}

const REVOKE_DELIVERY_PATTERNS: readonly RegExp[] = [
  /\brevoke\b[^.!?\n]{0,60}\b(delivery|deploy(ment)?|authoriz\w+|approval|grant)\b/i,
  /\b(delivery|deploy(ment)?|authoriz\w+|approval|grant)\b[^.!?\n]{0,60}\brevoke\b/i,
  /\bcancel\b[^.!?\n]{0,60}\b(delivery|deploy(ment)?|authoriz\w+|approval|grant)\b/i,
  /배포\s*승인\s*(철회|취소)/,
  /(철회|취소)[^.!?\n]{0,20}배포\s*승인/,
  /권한\s*(철회|취소)/,
];

/**
 * True iff a USER-authored prompt (caller must pre-filter via
 * classifyPromptOrigin) expresses intent to revoke a standing delivery
 * grant. Bilingual ko/en, mirrors APPROVAL_VERB_PATTERNS's convention in
 * lib/lead-intent/dtc-build-approval.ts. Kept deliberately simple (fixed
 * marker list, no NLP) — this is a convenience revocation path, not the
 * grant's fail-closed trust boundary.
 */
export function excerptRequestsDeliveryGrantRevocation(rawPrompt: string): boolean {
  return REVOKE_DELIVERY_PATTERNS.some((re) => re.test(rawPrompt));
}
