// palantir-mini v3.5.0 — negotiate_sprint_contract Phase H3 arbitration tests (B3 split sibling)
// Coverage: arbitration policies (abort-on-disagreement / priority-criterion / lead-arbitrated)
// + dissent record emission. Extracted from negotiate-sprint-contract.test.ts.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import negotiateSprintContract from "../../../bridge/handlers/negotiate-sprint-contract";
import { readEvents } from "../../../lib/event-log/read";
import {
  baseContract,
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

describe("negotiate_sprint_contract — arbitration policies (Phase H3)", () => {
  test("abort-on-disagreement: counter past round 2 → aborted", async () => {
    const root = setupRoot("abort-policy");
    const c = { ...baseContract, disagreementResolution: "abort-on-disagreement" };
    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "generator",
      action: "propose",
      contract: c,
    });
    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "evaluator",
      action: "counter",
      contract: c,
    });
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "generator",
      action: "counter",
      contract: c,
    });
    expect(out.status).toBe("aborted");
    expect(out.arbitrationSignal?.policy).toBe("abort-on-disagreement");
    expect(out.arbitrationSignal?.triggerRound).toBe(3);
  });

  test("priority-criterion: round 6 with policy → arbitrationSignal set, status still negotiating", async () => {
    const root = setupRoot("priority-policy");
    const c = { ...baseContract, disagreementResolution: "priority-criterion" };
    for (let i = 0; i < 5; i++) {
      await negotiateSprintContract({
        projectPath: root,
        sprintNumber: 1,
        role: i % 2 === 0 ? "generator" : "evaluator",
        action: i === 0 ? "propose" : "counter",
        contract: c,
      });
    }
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "evaluator",
      action: "counter",
      contract: c,
    });
    expect(out.arbitrationSignal?.policy).toBe("priority-criterion");
    expect(out.status).toBe("negotiating");
    expect(out.arbitrationSignal?.triggerRound).toBe(6);
  });

  test("lead-arbitrated: round 6 with policy → arbitrationSignal set", async () => {
    const root = setupRoot("lead-arb-policy");
    const c = { ...baseContract, disagreementResolution: "lead-arbitrated" };
    for (let i = 0; i < 5; i++) {
      await negotiateSprintContract({
        projectPath: root,
        sprintNumber: 1,
        role: i % 2 === 0 ? "generator" : "evaluator",
        action: i === 0 ? "propose" : "counter",
        contract: c,
      });
    }
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "generator",
      action: "counter",
      contract: c,
    });
    expect(out.arbitrationSignal?.policy).toBe("lead-arbitrated");
  });
});

describe("negotiate_sprint_contract — dissent record + safety net", () => {
  test("contract with negotiationHistory acceptedInFinal=false → sprint_contract_dissent_preserved emitted on bind", async () => {
    const root = setupRoot("dissent");
    const dissentContract = {
      ...baseContract,
      negotiationHistory: [
        { round: 1, role: "evaluator", proposedRubric: { x: 1 }, acceptedInFinal: false },
        { round: 2, role: "generator", proposedRubric: { y: 2 }, acceptedInFinal: true },
      ],
    };
    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "generator",
      action: "propose",
      contract: dissentContract,
    });
    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "generator",
      action: "approve",
    });
    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "evaluator",
      action: "approve",
    });
    const events = readEvents(eventsPathFor(root));
    const dissentEvt = events.find((e) => e.type === "sprint_contract_dissent_preserved");
    expect(dissentEvt).toBeDefined();
    const payload = dissentEvt!.payload as { disputedRounds: unknown[]; totalRounds: number };
    expect(payload.disputedRounds.length).toBe(1);
    expect(payload.totalRounds).toBe(2);
  });
});
