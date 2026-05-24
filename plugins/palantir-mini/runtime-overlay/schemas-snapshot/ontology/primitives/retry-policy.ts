/**
 * @stable — RetryPolicy primitive (prim-action-09, v1.40.0)
 *
 * Discriminated union over the 3 canonical retry strategies an action /
 * automation / agent invocation may declare. Pairs with action-type.ts
 * Tier-2 (function-backed actions) and automation-declaration.ts to
 * formalize how transient failures are handled before falling back.
 *
 * D/L/A domain: ACTION (the policy is invoked at action-execution time;
 * declarative metadata about a retry behavior, not a stored data fact).
 *
 * Authority chain:
 *   research/palantir-foundry/* (action submission criteria, automation
 *     event triggers + retry semantics)
 *     ↓
 *   schemas/ontology/primitives/retry-policy.ts (this file)
 *     ↓
 *   shared-core re-export
 *
 * Rule cross-refs: rule 26 v1.0.0 §Axis C (Refining — failure-categorizable
 * runtime behavior with typed fallback).
 *
 * @owner palantirkc-ontology
 * @purpose Typed retry strategy union (constant / exponential / no-retry)
 */

/**
 * Kind discriminator. Three variants:
 *   constant-backoff    — fixed delay between attempts.
 *   exponential-backoff — delay grows multiplicatively per attempt, capped
 *                         at maxDelayMs.
 *   no-retry            — fail immediately; optional fallbackEffectId names
 *                         a downstream effect (compensating action,
 *                         dead-letter notification) to invoke instead.
 */
export type RetryPolicyKind =
  | "constant-backoff"
  | "exponential-backoff"
  | "no-retry";

export interface RetryPolicyConstantBackoff {
  readonly kind: "constant-backoff";
  /** Maximum total attempts (initial + retries). Must be ≥ 1. */
  readonly maxAttempts: number;
  /** Constant delay between attempts in ms. Must be ≥ 0. */
  readonly delayMs: number;
}

export interface RetryPolicyExponentialBackoff {
  readonly kind: "exponential-backoff";
  /** Maximum total attempts (initial + retries). Must be ≥ 1. */
  readonly maxAttempts: number;
  /** Initial delay in ms before first retry. Must be ≥ 0. */
  readonly initialDelayMs: number;
  /** Hard cap on delay between retries (ms). Must be ≥ initialDelayMs. */
  readonly maxDelayMs: number;
  /** Multiplier applied each retry (e.g. 2.0 = double). Must be > 1. */
  readonly multiplier: number;
}

export interface RetryPolicyNoRetry {
  readonly kind: "no-retry";
  /**
   * Optional fallback effect identifier. When set, callers should invoke
   * the named effect on failure instead of bubbling the error. Free-form
   * string — runtime-resolved.
   */
  readonly fallbackEffectId?: string;
}

export type RetryPolicy =
  | RetryPolicyConstantBackoff
  | RetryPolicyExponentialBackoff
  | RetryPolicyNoRetry;

export const RETRY_POLICY_KINDS: readonly RetryPolicyKind[] = [
  "constant-backoff",
  "exponential-backoff",
  "no-retry",
] as const;

export function isRetryPolicyKind(s: string): s is RetryPolicyKind {
  return (RETRY_POLICY_KINDS as readonly string[]).includes(s);
}

export function isRetryPolicyConstantBackoff(
  p: RetryPolicy,
): p is RetryPolicyConstantBackoff {
  return p.kind === "constant-backoff";
}

export function isRetryPolicyExponentialBackoff(
  p: RetryPolicy,
): p is RetryPolicyExponentialBackoff {
  return p.kind === "exponential-backoff";
}

export function isRetryPolicyNoRetry(p: RetryPolicy): p is RetryPolicyNoRetry {
  return p.kind === "no-retry";
}

export function isRetryPolicy(x: unknown): x is RetryPolicy {
  if (typeof x !== "object" || x === null) return false;
  const p = x as RetryPolicy;
  if (typeof p.kind !== "string" || !isRetryPolicyKind(p.kind)) return false;
  switch (p.kind) {
    case "constant-backoff": {
      const c = p as RetryPolicyConstantBackoff;
      return (
        typeof c.maxAttempts === "number" &&
        Number.isFinite(c.maxAttempts) &&
        c.maxAttempts >= 1 &&
        typeof c.delayMs === "number" &&
        Number.isFinite(c.delayMs) &&
        c.delayMs >= 0
      );
    }
    case "exponential-backoff": {
      const e = p as RetryPolicyExponentialBackoff;
      return (
        typeof e.maxAttempts === "number" &&
        Number.isFinite(e.maxAttempts) &&
        e.maxAttempts >= 1 &&
        typeof e.initialDelayMs === "number" &&
        Number.isFinite(e.initialDelayMs) &&
        e.initialDelayMs >= 0 &&
        typeof e.maxDelayMs === "number" &&
        Number.isFinite(e.maxDelayMs) &&
        e.maxDelayMs >= e.initialDelayMs &&
        typeof e.multiplier === "number" &&
        Number.isFinite(e.multiplier) &&
        e.multiplier > 1
      );
    }
    case "no-retry": {
      const n = p as RetryPolicyNoRetry;
      return (
        n.fallbackEffectId === undefined ||
        (typeof n.fallbackEffectId === "string" && n.fallbackEffectId.length > 0)
      );
    }
  }
}

/**
 * Convenience: compute the delay (ms) before attempt `attemptIndex` (1-based,
 * where 1 = first retry). Returns 0 when the kind is no-retry or the index
 * exceeds maxAttempts.
 */
export function retryDelayMs(policy: RetryPolicy, attemptIndex: number): number {
  if (attemptIndex < 1) return 0;
  switch (policy.kind) {
    case "no-retry":
      return 0;
    case "constant-backoff":
      return attemptIndex < policy.maxAttempts ? policy.delayMs : 0;
    case "exponential-backoff": {
      if (attemptIndex >= policy.maxAttempts) return 0;
      const raw = policy.initialDelayMs * Math.pow(policy.multiplier, attemptIndex - 1);
      return Math.min(raw, policy.maxDelayMs);
    }
  }
}

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "equivalent",
  foundryType: "RetryPolicy (constant / exponential / no-retry union)",
};
export { categoryFoundryEquivalent as retryPolicyFoundryEquivalent };
