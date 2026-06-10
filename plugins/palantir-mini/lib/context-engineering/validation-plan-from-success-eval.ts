import type { SemanticIntentContract } from "../lead-intent/contracts";

/**
 * One SHOWN validation item on a ContextEngineeringPlan. This is the review-surface
 * list only — gate-facing requiredEvaluationRefs mapping lives elsewhere (Slice D).
 */
export interface ContextEngineeringValidationItem {
  readonly validationId: string;
  readonly command: string;
  readonly required: boolean;
  readonly reason: string;
}

/**
 * The fallback validation plan, used when the SIC carries no SUCCESS-EVAL signals
 * (legacy / axes-less SIC). Keeps the original hardcoded 3-item list so no plan ever
 * shows an empty validationPlan. (Moved verbatim from the inline literal that used to
 * live in buildContextEngineeringPlanV2.)
 *
 * 폴백 검증 계획: SIC에 SUCCESS-EVAL 신호가 없을 때(레거시/axes 없는 SIC) 사용. 빈
 * validationPlan이 노출되지 않도록 기존 3개 항목을 그대로 유지한다.
 */
export const FALLBACK_VALIDATION_PLAN: readonly ContextEngineeringValidationItem[] = [
  {
    validationId: "fde-readiness-profile",
    command: "bun test tests/lib/fde-ontology-engineering",
    required: true,
    reason: "Readiness profiles and sidecar integrity must remain deterministic.",
  },
  {
    validationId: "context-plan-v2",
    command: "bun test tests/lib/context-engineering",
    required: true,
    reason: "DATA/LOGIC/ACTION and mirror-only recommendations must stay stable.",
  },
  {
    validationId: "workbench-review",
    command: "bun test tests/lib/chatbot-studio",
    required: true,
    reason: "Lead cards and DTC review cards must remain non-authorizing.",
  },
] as const;

const SUCCESS_SIGNALS_PREFIX = /^success signals:\s*/i;

/**
 * Slugify one success signal into a stable validationId. Lowercase, non-alphanumeric
 * runs collapse to a single hyphen, trim leading/trailing hyphens.
 */
function slugifySignal(signal: string): string {
  return signal
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Split the SUCCESS-EVAL axis prose ("Success signals: a, b, c") into individual
 * signal strings. Strips the "Success signals:" prefix (per sic-from-session.ts) then
 * splits on commas; empty fragments are dropped.
 */
function parseSuccessSignals(summary: string): readonly string[] {
  const withoutPrefix = summary.trim().replace(SUCCESS_SIGNALS_PREFIX, "");
  return withoutPrefix
    .split(",")
    .map((signal) => signal.trim())
    .filter((signal) => signal.length > 0);
}

/**
 * Derive the SHOWN validation plan from the SIC's SUCCESS-EVAL axis. Each success
 * signal becomes one validation item:
 *   - reason     = the signal text verbatim
 *   - validationId = slug of the signal
 *   - command    = the placeholder marker `propose: <validationId>` — the turn surface
 *     / LLM fills the real command later; we NEVER fabricate a concrete bun-test path
 *   - required   = true
 *
 * When SUCCESS-EVAL is absent / empty / yields no signals, returns the fallback plan so
 * no plan ever has an empty validationPlan. Q3: this list is SHOWN (auto-derived from
 * SUCCESS-EVAL), not separately approved.
 *
 * SUCCESS-EVAL 축에서 노출용 검증 계획을 도출한다. 신호가 없으면 폴백 계획을 반환한다.
 */
export function deriveValidationPlan(
  sic: SemanticIntentContract,
  fallback: readonly ContextEngineeringValidationItem[] = FALLBACK_VALIDATION_PLAN,
): readonly ContextEngineeringValidationItem[] {
  const successEvalSummary = sic.axes?.successEval.summary ?? "";
  const signals = parseSuccessSignals(successEvalSummary);
  if (signals.length === 0) {
    return fallback;
  }

  const seen = new Set<string>();
  const derived: ContextEngineeringValidationItem[] = [];
  for (const [index, signal] of signals.entries()) {
    const baseId = slugifySignal(signal) || `success-signal-${index + 1}`;
    let validationId = baseId;
    let suffix = 2;
    while (seen.has(validationId)) {
      validationId = `${baseId}-${suffix}`;
      suffix += 1;
    }
    seen.add(validationId);
    derived.push({
      validationId,
      command: `propose: ${validationId}`,
      required: true,
      reason: signal,
    });
  }
  return derived;
}
