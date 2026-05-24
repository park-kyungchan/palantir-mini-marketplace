import { describe, expect, test } from "bun:test";
import {
  classifyHarnessFailure,
  parseHarnessFailureLedgerMarkdown,
} from "../../../lib/harness/failure-ledger";
import {
  planHarnessRatchet,
  planClassification,
  planHarnessRatchets,
  summarizePlannerClassifications,
} from "../../../lib/harness/ratchet-planner";

const LEDGER = `
| test_path | failure_class | owner_surface | introduced | severity | blocks_release | required_fix | removal_target |
|---|---|---|---|---|---|---|---|
| \`tests/hooks/example.test.ts::known drift\` | assertion-drift | hook policy | baseline | medium | no | Refresh fixture. | sprint-001 |
| \`tests/hooks/blocking.test.ts::known blocking\` | missing-fixture | release gate | current run | high | yes | Fix before release. | immediate |
`;

describe("HarnessRatchetPlanner", () => {
  test("keeps known ledgered failures non-ratcheting while preserving ledger metadata", () => {
    const ledger = parseHarnessFailureLedgerMarkdown(LEDGER);
    const classification = classifyHarnessFailure({
      testPath: "tests/hooks/example.test.ts",
      testName: "known drift",
      failureClass: "assertion-drift",
    }, ledger);

    const decision = planClassification(classification);

    expect(decision).toMatchObject({
      classification: "known-ledgered",
      releaseBlocking: false,
      action: "monitor-ledgered",
      priority: "low",
      plan: {
        ownerSurface: "hook policy",
        failureClass: "assertion-drift",
        requiredPermanentFix: "Refresh fixture.",
        recommendedHarnessChange: "hook",
        releaseBlocking: false,
      },
    });
  });

  test("marks changed and new failures as critical ratchet candidates", () => {
    const ledger = parseHarnessFailureLedgerMarkdown(LEDGER);
    const changed = classifyHarnessFailure({
      testPath: "tests/hooks/example.test.ts",
      testName: "known drift",
      failureClass: "runtime-error",
    }, ledger);
    const unknown = classifyHarnessFailure({
      testPath: "tests/hooks/new.test.ts",
      testName: "new failure",
      failureClass: "assertion-drift",
    }, ledger);

    const plan = planHarnessRatchets({ classifications: [changed, unknown] });

    expect(plan.shouldRatchet).toBe(true);
    expect(plan.releaseBlocking).toBe(true);
    expect(plan.highestPriority).toBe("critical");
    expect(plan.ratchetClassifications).toEqual(["changed-known", "new-release-blocking"]);
    expect(plan.decisions.map((decision) => decision.action)).toEqual([
      "ratchet-changed-failure",
      "ratchet-new-failure",
    ]);
    expect(plan.plans.every((item) => item.releaseBlocking)).toBe(true);
  });

  test("tracks known release blockers as release-failing repair plans", () => {
    const ledger = parseHarnessFailureLedgerMarkdown(LEDGER);
    const knownBlocking = classifyHarnessFailure({
      testPath: "tests/hooks/blocking.test.ts",
      testName: "known blocking",
      failureClass: "missing-fixture",
    }, ledger);

    const plan = planHarnessRatchets({ classifications: [knownBlocking] });

    expect(plan.shouldRatchet).toBe(true);
    expect(plan.releaseBlocking).toBe(true);
    expect(plan.highestPriority).toBe("high");
    expect(plan.ratchetClassifications).toEqual(["known-release-blocking"]);
    expect(plan.decisions[0]).toMatchObject({
      classification: "known-release-blocking",
      action: "repair-known-blocker",
      priority: "high",
      plan: {
        requiredPermanentFix: "Fix before release.",
        releaseBlocking: true,
      },
    });
  });

  test("fails accepted known baseline when permanent-fix metadata is missing", () => {
    const ledger = parseHarnessFailureLedgerMarkdown(`
| test_path | failure_class | owner_surface | introduced | severity | blocks_release | required_fix | removal_target |
|---|---|---|---|---|---|---|---|
| \`tests/hooks/incomplete.test.ts::known drift\` | assertion-drift | hook policy | baseline | medium | no |  |  |
`);
    const classification = classifyHarnessFailure({
      testPath: "tests/hooks/incomplete.test.ts",
      testName: "known drift",
      failureClass: "assertion-drift",
    }, ledger);

    const plan = planHarnessRatchet(classification);

    expect(classification.classification).toBe("known-ledgered");
    expect(plan.releaseBlocking).toBe(true);
    expect(plan.requiredPermanentFix).toContain("required_fix");
    expect(plan.acceptanceCriteria).toContain(
      "Ledger entry includes non-empty required_fix and removal_target metadata.",
    );
  });

  test("summary includes all failure-ledger classifications", () => {
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
        testPath: "tests/hooks/example.test.ts::known drift",
        failureClass: "runtime-error",
      }, ledger),
      classifyHarnessFailure({
        testPath: "tests/hooks/new.test.ts::new failure",
      }, ledger),
    ];

    expect(summarizePlannerClassifications(results)).toEqual({
      total: 4,
      releaseBlocking: 3,
      knownLedgered: 1,
      knownReleaseBlocking: 1,
      changedKnown: 1,
      newReleaseBlocking: 1,
    });
  });
});
