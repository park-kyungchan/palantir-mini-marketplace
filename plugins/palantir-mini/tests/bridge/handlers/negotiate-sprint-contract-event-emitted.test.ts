// palantir-mini sprint-138 — Quick auto-bind event emission tests
// Coverage: sprint_contract_bound emitted exactly once on auto-bind path.
// Also verifies event payload fields match rule 16 v4.2.0 expected shape.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import negotiateSprintContract from "../../../bridge/handlers/negotiate-sprint-contract";
import { readEvents } from "../../../lib/event-log/read";
import {
  cleanupTmpRoots,
  eventsPathFor,
  restoreEnv,
  saveEnv,
  setupRoot,
} from "./negotiate-sprint-contract/fixtures";

beforeEach(() => {
  saveEnv();
});

afterEach(() => {
  restoreEnv();
  cleanupTmpRoots();
});

describe("sprint_contract_bound event — Quick auto-bind path", () => {
  test("Quick auto-bind emits sprint_contract_bound exactly once", async () => {
    const root = setupRoot("evt-quick-once");
    const contractId = "test-quick-event-once";

    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 300,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId,
        sprintNumber: 300,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 900000,
        gradingRubric: {
          criteria: [
            {
              criterionId: "code-correctness",
              rubricDomain: "code",
              weight: 1,
              validationExpression: "bun test",
              threshold: 1,
            },
          ],
        },
        terminationHardThreshold: {
          perCriterion: { "code-correctness": 1 },
          overall: 1,
          scale: "pass-fail",
        },
      },
    });

    const events = readEvents(eventsPathFor(root));
    const boundEvents = events.filter(
      (e) => e.type === "sprint_contract_bound" &&
        (e.payload as Record<string, unknown>)?.["contractId"] === contractId,
    );

    expect(boundEvents.length).toBe(1);
  });

  test("Quick auto-bind event payload has sprintNumber + contractPath", async () => {
    const root = setupRoot("evt-quick-payload");
    const contractId = "test-quick-event-payload";

    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 301,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId,
        sprintNumber: 301,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 60000,
        successCriteriaRids: ["lint-pass"],
      },
    });

    const events = readEvents(eventsPathFor(root));
    const boundEvent = events.find(
      (e) => e.type === "sprint_contract_bound" &&
        (e.payload as Record<string, unknown>)?.["contractId"] === contractId,
    );

    expect(boundEvent).toBeDefined();
    const payload = boundEvent!.payload as Record<string, unknown>;
    expect(payload["sprintNumber"]).toBe(301);
    expect(typeof payload["contractPath"]).toBe("string");
    expect((payload["contractPath"] as string).length).toBeGreaterThan(0);
  });

  test("Quick auto-bind does NOT emit sprint_contract_negotiated (no intermediate rounds)", async () => {
    const root = setupRoot("evt-quick-no-negotiated");

    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 302,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-quick-no-negotiated",
        sprintNumber: 302,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 60000,
        successCriteriaRids: ["c1"],
      },
    });

    const events = readEvents(eventsPathFor(root));
    const negotiatedEvents = events.filter((e) => e.type === "sprint_contract_negotiated");
    // Quick auto-bind skips the intermediate negotiated events
    expect(negotiatedEvents.length).toBe(0);
  });

  test("3-round full mode emits sprint_contract_negotiated (round 1) + sprint_contract_bound (round 3)", async () => {
    const root = setupRoot("evt-full-3r");

    const contract = {
      contractId: "test-full-3r-events",
      sprintNumber: 303,
      mode: "full",
      iterationLimit: 2,
      timeboxMs: 3600000,
      gradingRubric: {
        criteria: [{ criterionId: "c1", rubricDomain: "code", weight: 1, threshold: 1 }],
      },
      terminationHardThreshold: { overall: 0.8, scale: "0-1" },
    };

    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 303,
      role: "orchestrator",
      action: "propose",
      contract,
    });
    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 303,
      role: "generator",
      action: "approve",
    });
    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 303,
      role: "evaluator",
      action: "approve",
    });

    const events = readEvents(eventsPathFor(root));
    const negotiatedCount = events.filter((e) => e.type === "sprint_contract_negotiated").length;
    const boundCount = events.filter((e) => e.type === "sprint_contract_bound").length;

    // 2 intermediate negotiating events (orchestrator propose + generator approve)
    // then 1 bound event on evaluator approve
    expect(negotiatedCount).toBeGreaterThanOrEqual(1);
    expect(boundCount).toBe(1);
  });

  test("calling Quick auto-bind twice for same sprintNumber → 2 bound events (idempotency not enforced at handler level)", async () => {
    // This test documents the current behavior: calling propose twice with different
    // contractIds on the same sprintNumber produces 2 bound events. Idempotency
    // (e.g. checking existing contract.json) is caller's responsibility.
    const root = setupRoot("evt-quick-double");

    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 304,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-quick-double-1",
        sprintNumber: 304,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 60000,
        successCriteriaRids: ["c1"],
      },
    });

    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 304,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-quick-double-2",
        sprintNumber: 304,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 60000,
        successCriteriaRids: ["c1"],
      },
    });

    const events = readEvents(eventsPathFor(root));
    const boundEvents = events.filter((e) => e.type === "sprint_contract_bound");
    // Two calls = two bound events. Collision advisory may also fire.
    expect(boundEvents.length).toBe(2);
  });
});
