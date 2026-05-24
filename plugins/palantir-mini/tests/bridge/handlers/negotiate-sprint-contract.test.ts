// palantir-mini v3.5.0 — negotiate_sprint_contract MCP handler tests (B3 split orchestrator)
// Coverage (Phase 1 base flow): arg validation, read snapshot, propose/counter/approve flow,
// sprint_contract_bound. Phase H3 arbitration + dissent moved to sibling
// negotiate-sprint-contract-h3-arbitration.test.ts.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
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

describe("negotiate_sprint_contract — arg validation", () => {
  test("missing sprintNumber → throws", async () => {
    setupRoot("v-no-sprint");
    await expect(
      negotiateSprintContract({ role: "generator", action: "read" }),
    ).rejects.toThrow(/sprintNumber/);
  });

  test("invalid role → throws", async () => {
    setupRoot("v-bad-role");
    await expect(
      negotiateSprintContract({ sprintNumber: 1, role: "alien", action: "read" }),
    ).rejects.toThrow(/role/);
  });

  test("invalid action → throws", async () => {
    setupRoot("v-bad-action");
    await expect(
      negotiateSprintContract({ sprintNumber: 1, role: "generator", action: "delete" }),
    ).rejects.toThrow(/action/);
  });

  test("sprintNumber=0 → throws", async () => {
    setupRoot("v-zero");
    await expect(
      negotiateSprintContract({ sprintNumber: 0, role: "generator", action: "read" }),
    ).rejects.toThrow(/sprintNumber/);
  });
});

describe("negotiate_sprint_contract — read snapshot", () => {
  test("read on virgin sprint → negotiating, round=0, no approvals, null proposal", async () => {
    const root = setupRoot("read-virgin");
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "orchestrator",
      action: "read",
    });
    expect(out.status).toBe("negotiating");
    expect(out.round).toBe(0);
    expect(out.generatorApproved).toBe(false);
    expect(out.evaluatorApproved).toBe(false);
    expect(out.latestProposal).toBeNull();
    expect(out.contractFile).toBeNull();
  });

  test("read after a propose round → round=1, latestProposal returned", async () => {
    const root = setupRoot("read-after-propose");
    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "generator",
      action: "propose",
      contract: baseContract,
    });
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "evaluator",
      action: "read",
    });
    expect(out.round).toBe(1);
    expect((out.latestProposal as { contractId: string }).contractId).toBe("ctr-1");
  });
});

describe("negotiate_sprint_contract — propose + counter + approve flow", () => {
  test("propose by generator → file written, sprint_contract_negotiated event", async () => {
    const root = setupRoot("propose-flow");
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 2,
      role: "generator",
      action: "propose",
      contract: baseContract,
      rationale: "first proposal",
    });
    expect(out.status).toBe("negotiating");
    expect(out.round).toBe(1);
    expect(fs.existsSync(out.negotiationFile)).toBe(true);
    const content = fs.readFileSync(out.negotiationFile, "utf8");
    expect(content).toContain("Round 1 [generator] PROPOSE");
    expect(content).toContain("first proposal");
    const events = readEvents(eventsPathFor(root));
    expect(events.some((e) => e.type === "sprint_contract_negotiated")).toBe(true);
  });

  test("counter by evaluator after propose → round=2, status=negotiating", async () => {
    const root = setupRoot("counter-flow");
    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "generator",
      action: "propose",
      contract: baseContract,
    });
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "evaluator",
      action: "counter",
      contract: { ...baseContract, contractId: "ctr-1-counter" },
    });
    expect(out.status).toBe("negotiating");
    expect(out.round).toBe(2);
    expect(out.evaluatorApproved).toBe(false);
  });

  test("single approve does NOT bind (needs both sides)", async () => {
    const root = setupRoot("single-approve");
    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "generator",
      action: "propose",
      contract: baseContract,
    });
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 1,
      role: "generator",
      action: "approve",
    });
    expect(out.status).toBe("negotiating");
    expect(out.generatorApproved).toBe(true);
    expect(out.evaluatorApproved).toBe(false);
    expect(out.contractFile).toBeNull();
  });

  test("dual approve → bound, contract.json written, sprint_contract_bound emitted", async () => {
    const root = setupRoot("dual-approve");
    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 5,
      role: "generator",
      action: "propose",
      contract: baseContract,
    });
    await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 5,
      role: "generator",
      action: "approve",
    });
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 5,
      role: "evaluator",
      action: "approve",
    });
    expect(out.status).toBe("bound");
    expect(out.generatorApproved).toBe(true);
    expect(out.evaluatorApproved).toBe(true);
    expect(out.contractFile).not.toBeNull();
    expect(fs.existsSync(out.contractFile!)).toBe(true);
    const written = JSON.parse(fs.readFileSync(out.contractFile!, "utf8")) as {
      contractId: string;
    };
    expect(written.contractId).toBe("ctr-1");
    const events = readEvents(eventsPathFor(root));
    expect(events.some((e) => e.type === "sprint_contract_bound")).toBe(true);
  });
});
