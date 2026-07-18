// @generated
// DO NOT EDIT — produced by scripts/generators/reason-code-index.ts
// regenerate: bun run generate:all
// source: contracts/reason-code-registry.json, read at generation time
// generator-schema-version: 1.0.0
//
// Deterministic derived index: reason codes grouped by category, sorted.
// Byte-stable: content depends only on the source registry file's bytes,
// never on wall-clock time. generated:check (scripts/generated-check.ts)
// regenerates this in memory and fails the build on any drift.

export interface ReasonCodeCategorySummary {
  readonly category: string;
  readonly count: number;
  readonly codes: readonly string[];
}

export const REASON_CODE_INDEX: readonly ReasonCodeCategorySummary[] = [
  {
    category: "binding",
    count: 2,
    codes: ["RC-BINDING-CONSUMER-UNKNOWN", "RC-BINDING-SCOPE-INSUFFICIENT"],
  },
  {
    category: "memory",
    count: 1,
    codes: ["RC-MEMORY-RETENTION-VIOLATION"],
  },
  {
    category: "migration",
    count: 3,
    codes: ["RC-MIGRATION-COUNT-MISMATCH", "RC-MIGRATION-HASH-MISMATCH", "RC-MIGRATION-ROLLBACK-REQUIRED"],
  },
  {
    category: "mutation-authority",
    count: 9,
    codes: ["RC-AUTH-CONCURRENCY-CONFLICT", "RC-AUTH-DRY-RUN-MISMATCH", "RC-AUTH-EXPIRED", "RC-AUTH-FINGERPRINT-MISMATCH", "RC-AUTH-NONCE-REUSED", "RC-AUTH-PERMISSION-DENIED", "RC-AUTH-SCOPE-VIOLATION", "RC-AUTH-SUBMISSION-CRITERIA-FAILED", "RC-COMMIT-SUCCEEDED"],
  },
  {
    category: "schema",
    count: 2,
    codes: ["RC-SCHEMA-VALIDATION-FAILED", "RC-SCHEMA-VERSION-UNSUPPORTED"],
  },
  {
    category: "state-transition",
    count: 3,
    codes: ["RC-STATE-EVIDENCE-MISSING", "RC-STATE-SKIPPED-TRANSITION", "RC-STATE-STALE-FINGERPRINT"],
  },
];

export const REASON_CODE_TOTAL_COUNT = 20;
export const REASON_CODE_REGISTRY_SHA256 = "1d88297294a07767614a617dfbc3d6d6f84ed7fea643fcee4dafc8753dd00f3b";
