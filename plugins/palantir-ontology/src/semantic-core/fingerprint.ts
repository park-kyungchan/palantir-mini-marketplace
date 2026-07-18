// Canonical fingerprint (ledger row P410, docs/architecture.md ADR-004).
//
// "Every aggregate ... binds to its approved body by canonical fingerprint
// (a content hash of the exact approved SIC or DTC body, not a mutable
// pointer to 'the current SIC')." A fingerprint is `sha256(canonicalize(body))`
// as lowercase hex, matching the `^[a-f0-9]{64}$` pattern fixed by
// `contracts/semantic-intent.contract.json`'s `bodyFingerprint` and
// `contracts/digital-twin-change.contract.json`'s `bodyFingerprint`/
// `sicFingerprint` fields (P330). `sha256Hex` below is deliberately a local
// `node:crypto` one-liner rather than an import of `scripts/lib/hash.ts`:
// `scripts/` is build/generator tooling, outside the ADR-002 layer graph
// (`consumer -> contracts -> src/semantic-core,... -> src/adapters/*`), and
// `src/**` importing from `scripts/**` would be a cross-layer dependency
// even though today's `boundary:check` (which only scans imports resolving
// under `src/adapters/**`) would not flag it structurally.

import { createHash } from "node:crypto";
import { canonicalize, type CanonicalizableValue } from "./canonical-json";

function sha256Hex(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Matches the `bodyFingerprint`/`sicFingerprint`/`dtcFingerprint` pattern fixed by contracts/*.contract.json (P330). */
export const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;

export type Fingerprint = string;

/** sha256 hex digest of `canonicalize(body)`. Deterministic: identical body -> identical fingerprint. */
export function fingerprintBody(body: CanonicalizableValue): Fingerprint {
  return sha256Hex(canonicalize(body));
}

/** Runtime guard: does `value` look like a well-formed fingerprint string (not necessarily a currently-known one)? */
export function isFingerprintShaped(value: unknown): value is Fingerprint {
  return typeof value === "string" && FINGERPRINT_PATTERN.test(value);
}
