import { createHash } from "node:crypto";

export interface SafeSegmentOptions {
  readonly fallback?: string;
  readonly maxLen?: number;
  readonly allowColon?: boolean;
}

/**
 * Filesystem-safe path-segment normalizer (audit G7.6.1 — parameterized merge of 5 copies).
 *
 * Behavior, in order: normalize backslashes to `/`, split on `/`, drop empty parts,
 * rejoin with `-`, replace disallowed chars with `-`, strip leading/trailing `-`,
 * truncate to `maxLen` (only when finite), and fall back to `fallback` when empty.
 *
 * The disallowed-char class is `[^a-zA-Z0-9._:-]+` when `allowColon` (default), else
 * `[^a-zA-Z0-9._-]+`. Pass `maxLen: Infinity` to skip truncation (the activation-policy /
 * prompt-front-door variants have no slice).
 */
export function safeSegment(value: string, opts: SafeSegmentOptions = {}): string {
  const { fallback = "segment", maxLen = 128, allowColon = true } = opts;
  const disallowed = allowColon ? /[^a-zA-Z0-9._:-]+/g : /[^a-zA-Z0-9._-]+/g;
  let result = value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(disallowed, "-")
    .replace(/^-+|-+$/g, "");
  if (Number.isFinite(maxLen)) {
    result = result.slice(0, maxLen);
  }
  return result || fallback;
}

/**
 * Sorted-key JSON canonicalization — object insertion-order independent.
 * Copied verbatim from lib/semantic-consistency/normalize.ts so that `stableHash`
 * stays byte-identical for its existing consumers.
 */
function stableJson(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== "object") return value;
  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input).sort()) {
    if (input[key] === undefined) continue;
    out[key] = sortJsonValue(input[key]);
  }
  return out;
}

/**
 * Prefixed stable hash over sorted-key canonical JSON. Returns `${prefix}:${sha256hex}`.
 * Verbatim behavior from lib/semantic-consistency/normalize.ts:stableHash.
 */
export function stableHash(value: unknown, prefix = "sha256"): string {
  const digest = createHash("sha256").update(stableJson(value)).digest("hex");
  return `${prefix}:${digest}`;
}

/**
 * Short, unprefixed digest (16 hex chars) over plain `JSON.stringify(value)`.
 * Verbatim behavior from lib/fde-ontology-engineering/session-store.ts:stableDigest.
 *
 * NOTE: distinct from `stableHash` — no prefix, plain (non-sorted) JSON, 16-char slice.
 */
export function stableDigest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);
}
