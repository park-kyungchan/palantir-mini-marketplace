// Canonical JSON serialization (ledger row P410, docs/architecture.md
// ADR-004: "SHA-256 over a documented canonical JSON serialization").
//
// Documented algorithm (this comment IS the documentation the P410
// validation contract requires — "canonical serialization documented"):
//
//   1. `undefined`, functions, and symbols are not representable in JSON;
//      passing them (directly or as an object property value) throws.
//   2. Object keys are sorted lexicographically (UTF-16 code-unit order,
//      i.e. plain `Array.prototype.sort()` on the key strings) at every
//      nesting depth, recursively — this is the load-bearing step that
//      makes two structurally-identical-but-differently-key-ordered
//      objects hash identically.
//   3. Arrays preserve their original element order (order is semantic
//      content for an array; only object-key order is normalized away).
//   4. No insignificant whitespace: the output has no spaces, newlines, or
//      indentation — `JSON.stringify`'s default compact form once keys are
//      pre-sorted.
//   5. Numbers, strings, booleans, and `null` serialize exactly as
//      `JSON.stringify` would serialize them (this function does not
//      reimplement JSON number/string escaping; it only reorders keys
//      before delegating to `JSON.stringify`).
//   6. The result is a single-line UTF-8 string; callers pass it to
//      `fingerprint.ts`'s `fingerprintBody` for the SHA-256 hex digest.
//
// This is deliberately NOT a general RFC 8785 (JCS) implementation — it
// covers exactly the plain-data shapes (objects/arrays/strings/numbers/
// booleans/null) that SIC/DTC body types in `src/altitude1/` use, matching
// this package's existing hand-rolled-checker precedent
// (tests/support/schema-validate.ts, scripts/boundary-check.ts).

export type CanonicalizableValue =
  | string
  | number
  | boolean
  | null
  | readonly CanonicalizableValue[]
  | { readonly [key: string]: CanonicalizableValue };

function sortKeysDeep(value: CanonicalizableValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysDeep(item as CanonicalizableValue));
  }
  if (value !== null && typeof value === "object") {
    const sortedKeys = Object.keys(value).sort();
    const out: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      out[key] = sortKeysDeep((value as Record<string, CanonicalizableValue>)[key]!);
    }
    return out;
  }
  return value;
}

/**
 * Serialize `value` to a canonical, key-sorted, whitespace-free JSON string.
 * Two values that are structurally equal (same keys/values at every depth,
 * regardless of original key insertion order) always produce the identical
 * output string. See the module doc comment above for the full algorithm.
 */
export function canonicalize(value: CanonicalizableValue): string {
  const sorted = sortKeysDeep(value);
  const out = JSON.stringify(sorted);
  if (out === undefined) {
    throw new TypeError("canonicalize: value is not JSON-representable (undefined/function/symbol present)");
  }
  return out;
}
