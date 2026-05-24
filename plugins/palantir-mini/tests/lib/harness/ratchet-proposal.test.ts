import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  buildBackPropagationProposals,
  createHarnessRatchetProposal,
  isBackPropagationInputEvent,
  routeBackPropagationProposalTarget,
  synthesizeRatchetProposals,
  type BackPropagationOutcomePairEvidence,
} from "../../../lib/harness/ratchet-proposal";
import type { EventEnvelope } from "../../../lib/event-log/types";

function makeProject(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-ratchet-"));
}

function eventsPath(project: string): string {
  const filePath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  return filePath;
}

describe("harness ratchet proposals", () => {
  test("proposalId is stable sha256-derived for identical inputs", () => {
    const input = {
      scope: "timeout" as const,
      reason: "Codex adapter timed out a hook",
      evidenceRefs: ["evt-1", "evt-2"],
      proposedChange: "Increase timeout for a governance hook",
      rollback: "Restore previous timeout",
    };
    const first = createHarnessRatchetProposal(input);
    const second = createHarnessRatchetProposal(input);
    expect(first.proposalId).toBe(second.proposalId);
    expect(first.proposalId).toMatch(/^harness-ratchet:timeout:[a-f0-9]{12}$/);
  });

  test("synthesizes proposal JSON and event from ratchetable events", async () => {
    const project = makeProject();
    try {
      const filePath = eventsPath(project);
      const event = {
        type: "validation_phase_completed",
        eventId: "evt-timeout-1",
        when: new Date().toISOString(),
        atopWhich: "test-sha",
        throughWhich: { sessionId: "test", toolName: "test", cwd: project },
        byWhom: { identity: "monitor" },
        payload: {
          phase: "runtime",
          passed: false,
          errorClass: "hook_timeout_observed",
          reason: "Hook timed out",
        },
        sequence: 1,
      };
      fs.writeFileSync(filePath, `${JSON.stringify(event)}\n`, "utf8");

      const proposals = await synthesizeRatchetProposals(filePath, 60_000, project);
      expect(proposals.length).toBe(1);
      expect(proposals[0]?.scope).toBe("timeout");
      expect(proposals[0]?.evidenceRefs).toEqual(["evt-timeout-1"]);

      const proposalPath = path.join(
        project,
        ".palantir-mini",
        "harness",
        "ratchets",
        `${proposals[0]?.proposalId}.json`,
      );
      expect(fs.existsSync(proposalPath)).toBe(true);
      const appended = fs.readFileSync(filePath, "utf8");
      expect(appended).toContain("harness_ratchet_proposed");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  test("repeated failure clusters upsert a known issue with lifecycle metadata", async () => {
    const project = makeProject();
    try {
      const filePath = eventsPath(project);
      const baseEvent = {
        type: "validation_phase_completed",
        when: "2026-05-12T00:00:00.000Z",
        atopWhich: "test-sha",
        throughWhich: { sessionId: "test", toolName: "test", cwd: project },
        byWhom: { identity: "monitor" },
        payload: {
          phase: "runtime",
          passed: false,
          errorClass: "project_scope_conformance_failed",
          reason: "Scope boundary rejected generated path",
        },
      };
      fs.writeFileSync(
        filePath,
        [
          { ...baseEvent, eventId: "evt-scope-1", sequence: 1 },
          { ...baseEvent, eventId: "evt-scope-2", when: "2026-05-12T00:05:00.000Z", sequence: 2 },
        ].map((event) => JSON.stringify(event)).join("\n") + "\n",
        "utf8",
      );

      const proposals = await synthesizeRatchetProposals(
        filePath,
        Date.parse("2026-05-11T00:00:00.000Z"),
        project,
      );
      expect(proposals.length).toBe(1);

      const issuePath = path.join(project, ".palantir-mini", "issues", "known-issues.json");
      expect(fs.existsSync(issuePath)).toBe(true);
      const issueStore = JSON.parse(fs.readFileSync(issuePath, "utf8")) as {
        issues: Array<Record<string, unknown>>;
      };
      const issue = issueStore.issues[0]!;

      expect(issue.source).toBe("harness-ratchet-synthesize");
      expect(issue.firstObservedAt).toBe("2026-05-12T00:00:00.000Z");
      expect(issue.lastObservedAt).toBe("2026-05-12T00:05:00.000Z");
      expect(issue.observedCount).toBe(2);
      expect(issue.mitigationStatus).toBe("unmitigated");
      expect(issue.sourceRefs).toEqual(["evt-scope-1", "evt-scope-2"]);
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  test("broad-suite failures are classified against ledger without hiding new failures", async () => {
    const project = makeProject();
    try {
      fs.mkdirSync(path.join(project, "tests"), { recursive: true });
      fs.writeFileSync(
        path.join(project, "tests", "KNOWN_BROAD_SUITE_FAILURES.md"),
        [
          "# Known Broad Suite Failures",
          "",
          "| test_path | failure_class | owner_surface | introduced | severity | blocks_release | required_fix | removal_target |",
          "|---|---|---|---|---|---|---|---|",
          "| `tests/hooks/example.test.ts::known drift` | assertion-drift | hook policy | baseline | medium | no | Refresh fixture. | sprint-001 |",
        ].join("\n") + "\n",
        "utf8",
      );
      const filePath = eventsPath(project);
      const baseEvent = {
        type: "validation_phase_completed",
        when: "2026-05-12T00:00:00.000Z",
        atopWhich: "test-sha",
        throughWhich: { sessionId: "test", toolName: "test", cwd: project },
        byWhom: { identity: "monitor" },
        payload: {
          phase: "test",
          passed: false,
          errorClass: "broad_test_failure_observed",
          reason: "broad suite failure",
          failureClass: "assertion-drift",
        },
      };
      fs.writeFileSync(
        filePath,
        [
          {
            ...baseEvent,
            eventId: "evt-known-broad",
            sequence: 1,
            payload: {
              ...baseEvent.payload,
              testPath: "tests/hooks/example.test.ts",
              testName: "known drift",
            },
          },
          {
            ...baseEvent,
            eventId: "evt-new-broad",
            sequence: 2,
            payload: {
              ...baseEvent.payload,
              testPath: "tests/hooks/new.test.ts",
              testName: "new failure",
            },
          },
        ].map((event) => JSON.stringify(event)).join("\n") + "\n",
        "utf8",
      );

      const proposals = await synthesizeRatchetProposals(
        filePath,
        Date.parse("2026-05-11T00:00:00.000Z"),
        project,
      );

      expect(proposals).toHaveLength(2);
      const known = proposals.find((proposal) =>
        proposal.evidenceRefs.includes("evt-known-broad")
      );
      const unknown = proposals.find((proposal) =>
        proposal.evidenceRefs.includes("evt-new-broad")
      );
      expect(known?.scope).toBe("broad-suite");
      expect(known?.broadSuiteClassification).toBe("known-ledgered");
      expect(known?.releaseBlocking).toBe(false);
      expect(unknown?.broadSuiteClassification).toBe("new-release-blocking");
      expect(unknown?.releaseBlocking).toBe(true);
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });
});

function makeBackPropagationEvent(opts: {
  eventId: string;
  valueGrade: "T2" | "T3" | "T4";
  kind?: string;
  filePathOrRid?: string;
  payload?: Record<string, unknown>;
  when?: string;
}): EventEnvelope {
  return {
    type: "validation_phase_completed",
    eventId: opts.eventId,
    when: opts.when ?? "2026-05-22T00:00:00.000Z",
    atopWhich: "abc123",
    throughWhich: { sessionId: "session-1", toolName: "test", cwd: "/tmp/project" },
    byWhom: { identity: "codex" },
    payload: {
      phase: "runtime",
      passed: false,
      errorClass: "backprop_test",
      ...(opts.payload ?? {}),
    },
    withWhat: {
      reasoning: "BackPropagation proposal test fixture with sufficient reasoning for routing.",
      memoryLayers: ["semantic", "procedural"],
      ...(opts.kind
        ? {
          refinementTarget: {
            kind: opts.kind,
            filePathOrRid: opts.filePathOrRid ?? "unknown-target",
            description: `Refine ${opts.kind}`,
            confidenceLevel: "high",
          },
        }
        : {}),
    },
    lineageRefs: { actionRid: `action-${opts.eventId}` },
    valueGrade: opts.valueGrade,
    sequence: 1,
  } as unknown as EventEnvelope;
}

describe("BackPropagationProposal generation", () => {
  test("identifies only T3/T4 runtime outcomes as BackPropagation inputs", () => {
    expect(isBackPropagationInputEvent(makeBackPropagationEvent({
      eventId: "evt-t2",
      valueGrade: "T2",
      kind: "other",
    }))).toBe(false);
    expect(isBackPropagationInputEvent(makeBackPropagationEvent({
      eventId: "evt-t3",
      valueGrade: "T3",
      kind: "other",
    }))).toBe(true);
    expect(isBackPropagationInputEvent(makeBackPropagationEvent({
      eventId: "evt-t4",
      valueGrade: "T4",
      kind: "other",
    }))).toBe(true);
  });

  test("generates a pending ontology-contract proposal with paired expected and actual evidence", () => {
    const event = makeBackPropagationEvent({
      eventId: "evt-backprop-ontology",
      valueGrade: "T3",
      kind: "primitive-field-add",
      filePathOrRid: "prim-data-99",
    });
    const pair: BackPropagationOutcomePairEvidence = {
      outcomePairId: "pair-ontology-1",
      sourceEventId: "evt-backprop-ontology",
      expected: {
        verdict: "pass",
        contractRef: "digital-twin-change:expected-contract",
        evalSuiteId: "eval-suite:runtime-contract",
      },
      actual: {
        verdict: "fail",
        evalRunId: "eval-run:runtime-contract-001",
        description: "Runtime failed the expected contract check.",
      },
      evidenceRefs: ["eval-run:runtime-contract-001"],
    };

    const proposals = buildBackPropagationProposals({
      events: [event],
      outcomePairs: [pair],
    });

    expect(proposals).toHaveLength(1);
    const proposal = proposals[0]!;
    expect(proposal.kind).toBe("BackPropagationProposal");
    expect(proposal.status).toBe("pending");
    expect(proposal.approvalRequired).toBe(true);
    expect(proposal.reversible).toBe(true);
    expect(proposal.mutationBoundary).toBe("proposal-only");
    expect(proposal.target).toBe("ontology-contract");
    expect(proposal.targetRef).toBe("prim-data-99");
    expect(proposal.sourceEventIds).toEqual(["evt-backprop-ontology"]);
    expect(proposal.outcomePairIds).toEqual(["pair-ontology-1"]);
    expect(proposal.evidenceRefs).toEqual([
      "eval-run:runtime-contract-001",
      "evt-backprop-ontology",
      "pair-ontology-1",
    ]);
    expect(proposal.lineage.outcomePairs[0]?.expected?.contractRef).toBe(
      "digital-twin-change:expected-contract",
    );
    expect(proposal.lineage.outcomePairs[0]?.actual?.verdict).toBe("fail");
    expect(proposal.rollback).toContain("no source, schema, rule, eval");
  });

  test("routes BackPropagation proposals by target kind and payload fallback", () => {
    const evalEvent = makeBackPropagationEvent({
      eventId: "evt-eval",
      valueGrade: "T3",
      kind: "grading-criterion-threshold",
      filePathOrRid: "eval-suite:grader-thresholds",
    });
    const ruleEvent = makeBackPropagationEvent({
      eventId: "evt-rule",
      valueGrade: "T3",
      kind: "rule-conformance-policy",
      filePathOrRid: "rule 26",
    });
    const ledgerEvent = makeBackPropagationEvent({
      eventId: "evt-ledger",
      valueGrade: "T4",
      kind: "failure-category-add",
      filePathOrRid: "FailureCategory:hook-timeout",
    });
    const harnessEvent = makeBackPropagationEvent({
      eventId: "evt-harness",
      valueGrade: "T3",
      payload: { testPath: "tests/hooks/example.test.ts" },
    });

    expect(routeBackPropagationProposalTarget(evalEvent).target).toBe("eval-suite");
    expect(routeBackPropagationProposalTarget(ruleEvent).target).toBe("rule");
    expect(routeBackPropagationProposalTarget(ledgerEvent).target).toBe("known-issue-ledger");
    expect(routeBackPropagationProposalTarget(harnessEvent).target).toBe("harness-check");
  });

  test("proposal generation is deterministic for replay regardless of input ordering", () => {
    const firstEvent = makeBackPropagationEvent({
      eventId: "evt-a",
      valueGrade: "T3",
      kind: "rule-conformance-policy",
      filePathOrRid: "rule 12",
      when: "2026-05-22T00:00:01.000Z",
    });
    const secondEvent = makeBackPropagationEvent({
      eventId: "evt-b",
      valueGrade: "T4",
      kind: "event-type-add",
      filePathOrRid: "EventType:backprop_proposal_created",
      when: "2026-05-22T00:00:02.000Z",
    });
    const firstPair: BackPropagationOutcomePairEvidence = {
      outcomePairId: "pair-a",
      actionRid: "action-evt-a",
      expected: { verdict: "pass" },
      actual: { verdict: "fail" },
      evidenceRefs: ["evidence-a"],
    };
    const secondPair: BackPropagationOutcomePairEvidence = {
      outcomePairId: "pair-b",
      actionRid: "action-evt-b",
      expected: { verdict: "pass" },
      actual: { verdict: "fail" },
      evidenceRefs: ["evidence-b"],
    };

    const proposalsA = buildBackPropagationProposals({
      events: [secondEvent, firstEvent],
      outcomePairs: [secondPair, firstPair],
    });
    const proposalsB = buildBackPropagationProposals({
      events: [firstEvent, secondEvent],
      outcomePairs: [firstPair, secondPair],
    });

    expect(proposalsA).toEqual(proposalsB);
    expect(proposalsA.map((proposal) => proposal.proposalId)).toEqual(
      proposalsB.map((proposal) => proposal.proposalId),
    );
    expect(proposalsA.every((proposal) => proposal.status === "pending")).toBe(true);
  });
});
