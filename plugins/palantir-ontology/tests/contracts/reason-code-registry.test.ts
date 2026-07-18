// P330: reason-code registry uniqueness + stability test, plus a coherence
// check that every reasonCode literal used in a fixture is a registered code.
// Run scoped with `bun test tests/contracts` (package.json "test:contracts").

import { describe, expect, test } from "bun:test";
import registry from "../../contracts/reason-code-registry.json";
import { loadFixtures } from "../support/fixture-loader";
import { join } from "node:path";

type ReasonCode = {
  code: string;
  owner: string;
  meaning: string;
  retryable: boolean;
  category: string;
  appliesTo: string[];
};

const codes = registry.codes as ReasonCode[];

const ALLOWED_CATEGORIES = new Set([
  "state-transition",
  "mutation-authority",
  "schema",
  "binding",
  "memory",
  "migration",
  "construction-staging",
  "control-plane",
]);

// Stable snapshot of every code this registry is expected to carry, sorted.
// Adding, renaming, or removing a code is a deliberate registry change — this
// list must be updated in the same change, not silently drift. The
// RC-CONSTRUCTION-* group was added by ledger row P420 (staged
// construction's DATA/LOGIC/ACTION evidence separation).
// RC-CONTROL-PLANE-PRODUCT-PRIMITIVE-COLLISION was added by ledger row P450
// (the ADR-003 control-plane/product-primitive boundary validator).
const EXPECTED_CODES_SORTED = [
  "RC-AUTH-CONCURRENCY-CONFLICT",
  "RC-AUTH-DRY-RUN-MISMATCH",
  "RC-AUTH-EXPIRED",
  "RC-AUTH-FINGERPRINT-MISMATCH",
  "RC-AUTH-NONCE-REUSED",
  "RC-AUTH-PERMISSION-DENIED",
  "RC-AUTH-SCOPE-VIOLATION",
  "RC-AUTH-SUBMISSION-CRITERIA-FAILED",
  "RC-BINDING-CONSUMER-UNKNOWN",
  "RC-BINDING-SCOPE-INSUFFICIENT",
  "RC-COMMIT-SUCCEEDED",
  "RC-CONSTRUCTION-EVIDENCE-CLASS-CONTAMINATION",
  "RC-CONSTRUCTION-EVIDENCE-CLASS-MISSING",
  "RC-CONSTRUCTION-PREMATURE-VALIDATION",
  "RC-CONSTRUCTION-UNREGISTERED-PRIMITIVE-KIND",
  "RC-CONTROL-PLANE-PRODUCT-PRIMITIVE-COLLISION",
  "RC-MEMORY-RETENTION-VIOLATION",
  "RC-MIGRATION-COUNT-MISMATCH",
  "RC-MIGRATION-HASH-MISMATCH",
  "RC-MIGRATION-ROLLBACK-REQUIRED",
  "RC-SCHEMA-VALIDATION-FAILED",
  "RC-SCHEMA-VERSION-UNSUPPORTED",
  "RC-STATE-EVIDENCE-MISSING",
  "RC-STATE-SKIPPED-TRANSITION",
  "RC-STATE-STALE-FINGERPRINT",
];

describe("reason-code registry", () => {
  test("carries exactly the expected stable code set (stability)", () => {
    const actualSorted = [...codes.map((c) => c.code)].sort();
    expect(actualSorted).toEqual(EXPECTED_CODES_SORTED);
  });

  test("every code is unique (uniqueness)", () => {
    const seen = new Set<string>();
    for (const entry of codes) {
      expect(seen.has(entry.code)).toBe(false);
      seen.add(entry.code);
    }
    expect(seen.size).toBe(codes.length);
  });

  test("every code matches the RC-<UPPER-KEBAB> pattern", () => {
    for (const entry of codes) {
      expect(entry.code).toMatch(/^RC-[A-Z0-9-]+$/);
    }
  });

  test("every code has a non-empty owner, meaning, boolean retryable, valid category, and non-empty appliesTo", () => {
    for (const entry of codes) {
      expect(typeof entry.owner).toBe("string");
      expect(entry.owner.length).toBeGreaterThan(0);
      expect(typeof entry.meaning).toBe("string");
      expect(entry.meaning.length).toBeGreaterThan(0);
      expect(typeof entry.retryable).toBe("boolean");
      expect(ALLOWED_CATEGORIES.has(entry.category)).toBe(true);
      expect(Array.isArray(entry.appliesTo)).toBe(true);
      expect(entry.appliesTo.length).toBeGreaterThan(0);
    }
  });

  test("every reasonCode literal used in a positive fixture is a registered code", () => {
    const registered = new Set(codes.map((c) => c.code));
    const slugs = [
      "fde-session",
      "semantic-intent",
      "digital-twin-change",
      "mutation-authority",
      "ontology-binding",
      "memory-item",
      "event-envelope",
      "migration-manifest",
    ];
    const found: string[] = [];

    function collectReasonCodes(node: unknown): void {
      if (Array.isArray(node)) {
        node.forEach(collectReasonCodes);
        return;
      }
      if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
          if (key === "reasonCode" && typeof value === "string") {
            found.push(value);
          }
          collectReasonCodes(value);
        }
      }
    }

    for (const slug of slugs) {
      const fixturesDir = join(import.meta.dir, "..", "fixtures", slug);
      for (const { data } of loadFixtures(fixturesDir)) {
        collectReasonCodes(data);
      }
    }

    expect(found.length).toBeGreaterThan(0);
    for (const code of found) {
      expect(registered.has(code)).toBe(true);
    }
  });
});
