import { describe, expect, test } from "bun:test";
import {
  classifyHarnessFailure,
  parseHarnessFailureLedgerMarkdown,
  summarizeHarnessFailureClassifications,
} from "../../../lib/harness/failure-ledger";

const LEDGER = `
| test_path | failure_class | owner_surface | introduced | severity | blocks_release | required_fix | removal_target |
|---|---|---|---|---|---|---|---|
| \`tests/hooks/example.test.ts::known drift\` | assertion-drift | hook policy | baseline | medium | no | Refresh fixture. | sprint-001 |
| \`tests/hooks/blocking.test.ts::known blocking\` | missing-fixture | release gate | current run | high | yes | Fix before release. | immediate |
`;

describe("HarnessFailureLedger", () => {
  test("parses known broad-suite markdown into typed entries", () => {
    const ledger = parseHarnessFailureLedgerMarkdown(LEDGER, "tests/KNOWN_BROAD_SUITE_FAILURES.md");
    expect(ledger.entries).toHaveLength(2);
    expect(ledger.entries[0]).toMatchObject({
      testPath: "tests/hooks/example.test.ts::known drift",
      failureClass: "assertion-drift",
      ownerSurface: "hook policy",
      severity: "medium",
      blocksRelease: false,
    });
    expect(ledger.entries[1]?.blocksRelease).toBe(true);
  });

  test("known non-blocking broad failures remain visible but do not block release", () => {
    const ledger = parseHarnessFailureLedgerMarkdown(LEDGER);
    const result = classifyHarnessFailure({
      testPath: "tests/hooks/example.test.ts",
      testName: "known drift",
      failureClass: "assertion-drift",
    }, ledger);

    expect(result.classification).toBe("known-ledgered");
    expect(result.releaseBlocking).toBe(false);
    expect(result.ledgerEntry?.requiredFix).toBe("Refresh fixture.");
  });

  test("new and changed failures are release-blocking", () => {
    const ledger = parseHarnessFailureLedgerMarkdown(LEDGER);
    const changed = classifyHarnessFailure({
      testPath: "tests/hooks/example.test.ts::known drift",
      failureClass: "runtime-error",
    }, ledger);
    const unknown = classifyHarnessFailure({
      testPath: "tests/hooks/new.test.ts::new failure",
      failureClass: "assertion-drift",
    }, ledger);

    expect(changed.classification).toBe("changed-known");
    expect(changed.releaseBlocking).toBe(true);
    expect(unknown.classification).toBe("new-release-blocking");
    expect(unknown.releaseBlocking).toBe(true);
  });

  test("summary preserves release-blocking ratchet counts", () => {
    const ledger = parseHarnessFailureLedgerMarkdown(LEDGER);
    const results = [
      classifyHarnessFailure({
        testPath: "tests/hooks/example.test.ts::known drift",
        failureClass: "assertion-drift",
      }, ledger),
      classifyHarnessFailure({
        testPath: "tests/hooks/blocking.test.ts::known blocking",
        failureClass: "missing-fixture",
      }, ledger),
      classifyHarnessFailure({
        testPath: "tests/hooks/new.test.ts::new failure",
      }, ledger),
    ];

    expect(summarizeHarnessFailureClassifications(results)).toEqual({
      total: 3,
      releaseBlocking: 2,
      knownLedgered: 1,
      changedKnown: 0,
      newReleaseBlocking: 1,
    });
  });
});
