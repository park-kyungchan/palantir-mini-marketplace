/**
 * @stable — Test primitive (prim-data-18, v1.0.0)
 *
 * Graph-node identity for a single test file or test suite. Enables the
 * ImpactGraph to answer "which tests cover source file X?" via PR 2.2 edges.
 * The PR 2.11 indexer scans test files and populates instances.
 *
 * `framework` ∈ "bun" | "vitest" | "playwright"
 * `kind`      ∈ "unit" | "integration" | "e2e" | "eval"
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/test.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *     -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: DATA (test-file metadata node — no logic, no action)
 * @owner palantirkc-ontology
 * @purpose Test graph-node identity (Phase 2 ImpactGraph node-type)
 */

/** Test runner framework. */
export type TestFramework = "bun" | "vitest" | "playwright";

/** Test granularity kind. */
export type TestKind = "unit" | "integration" | "e2e" | "eval";

export type TestRid = string & { readonly __brand: "TestRid" };
export const testRid = (s: string): TestRid => s as TestRid;

export interface TestDeclaration {
  readonly testId: TestRid;
  /** Absolute path to the test file. */
  readonly filePath: string;
  /** Test runner framework used by this test file. */
  readonly framework: TestFramework;
  /** Granularity / purpose of this test. */
  readonly kind: TestKind;
}

export function isTestDeclaration(x: unknown): x is TestDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as TestDeclaration;
  return (
    typeof d.testId === "string" &&
    d.testId.length > 0 &&
    typeof d.filePath === "string" &&
    typeof d.framework === "string" &&
    typeof d.kind === "string"
  );
}
