// palantir-mini sprint-138 — Quick Sprint single-round binding tests
// Coverage: rule 16 v4.2.0 §Quick Sprint single-round binding.
//
// Verifies that orchestrator + propose + mode="quick" + inline rubric/criteria
// binds the contract on round 1 without generator/evaluator approve calls.
// Also validates that generator/evaluator proposers do NOT auto-bind (orchestrator-only).

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import negotiateSprintContract from "../../../bridge/handlers/negotiate-sprint-contract";
import {
  cleanupTmpRoots,
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

// ── Quick auto-bind eligible paths ─────────────────────────────────────────

describe("Quick Sprint single-round binding — eligible paths", () => {
  test("orchestrator + propose + mode=quick + successCriteriaRids → bound on round 1", async () => {
    const root = setupRoot("qs-sr-criteria");
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 999,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-quick-single-criteria",
        sprintNumber: 999,
        mode: "quick",
        status: "drafting",
        iterationLimit: 1,
        timeoutMs: 60000,
        hardThreshold: { overall: 1, scale: "pass-fail" },
        successCriteriaRids: ["criterion-foo"],
      },
    });

    expect(out.status).toBe("bound");
    expect(out.round).toBe(1);
    expect(out.generatorApproved).toBe(true);
    expect(out.evaluatorApproved).toBe(true);
    expect(out.contractFile).not.toBeNull();
    expect(fs.existsSync(out.contractFile!)).toBe(true);
    expect(out.message).toContain("single-round");
    expect(out.message).toContain("rule 16 v4.2.0");
  });

  test("orchestrator + propose + mode=quick + gradingRubric.criteria → bound on round 1", async () => {
    const root = setupRoot("qs-sr-rubric");
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 998,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-quick-single-rubric",
        sprintNumber: 998,
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
        terminationHardThreshold: { perCriterion: { "code-correctness": 1 }, overall: 1, scale: "pass-fail" },
      },
    });

    expect(out.status).toBe("bound");
    expect(out.round).toBe(1);
    expect(out.generatorApproved).toBe(true);
    expect(out.evaluatorApproved).toBe(true);
    expect(out.contractFile).not.toBeNull();
    // contract.json must be written to disk
    expect(fs.existsSync(out.contractFile!)).toBe(true);
  });

  test("orchestrator + propose + mode=quick + rubricInline → bound on round 1", async () => {
    const root = setupRoot("qs-sr-inline");
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 997,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-quick-inline",
        sprintNumber: 997,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 60000,
        rubricInline: [
          { criterionId: "lint-pass", rubricDomain: "code", weight: 1, threshold: 1 },
        ],
      },
    });

    expect(out.status).toBe("bound");
    expect(out.round).toBe(1);
  });

  test("auto-bind writes contract.json with correct contractId", async () => {
    const root = setupRoot("qs-sr-json-id");
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 996,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "palantirkc-sprint-138-handler-v3-single-round-quick",
        sprintNumber: 996,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 900000,
        gradingRubric: {
          criteria: [{ criterionId: "c1", rubricDomain: "code", weight: 1, threshold: 1 }],
        },
        terminationHardThreshold: { perCriterion: { c1: 1 }, overall: 1, scale: "pass-fail" },
      },
    });

    expect(out.contractFile).not.toBeNull();
    const written = JSON.parse(fs.readFileSync(out.contractFile!, "utf8")) as Record<string, unknown>;
    expect(written["contractId"]).toBe("palantirkc-sprint-138-handler-v3-single-round-quick");
  });

  test("auto-bind writes a round entry in contract-negotiation.md", async () => {
    const root = setupRoot("qs-sr-negfile");
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 995,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-neg-file",
        sprintNumber: 995,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 60000,
        successCriteriaRids: ["bar"],
      },
    });

    expect(fs.existsSync(out.negotiationFile)).toBe(true);
    const content = fs.readFileSync(out.negotiationFile, "utf8");
    expect(content).toContain("Round 1 [orchestrator] PROPOSE");
  });
});

// ── Quick auto-bind ineligible (fallthrough) paths ─────────────────────────

describe("Quick Sprint single-round binding — ineligible paths (3-round fallback)", () => {
  test("generator + propose + mode=quick → NOT auto-bound (only orchestrator triggers)", async () => {
    const root = setupRoot("qs-gen-no-bind");
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 990,
      role: "generator",
      action: "propose",
      contract: {
        contractId: "test-gen-quick",
        sprintNumber: 990,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 60000,
        successCriteriaRids: ["c1"],
      },
    });

    // generator propose should NOT auto-bind
    expect(out.status).toBe("negotiating");
    expect(out.round).toBe(1);
    expect(out.generatorApproved).toBe(false);
    expect(out.contractFile).toBeNull();
  });

  test("evaluator + propose + mode=quick → NOT auto-bound (only orchestrator triggers)", async () => {
    const root = setupRoot("qs-eval-no-bind");
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 989,
      role: "evaluator",
      action: "propose",
      contract: {
        contractId: "test-eval-quick",
        sprintNumber: 989,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 60000,
        successCriteriaRids: ["c1"],
      },
    });

    expect(out.status).toBe("negotiating");
    expect(out.contractFile).toBeNull();
  });

  test("orchestrator + propose + mode=quick + NO rubric/criteria → NOT auto-bound", async () => {
    const root = setupRoot("qs-no-rubric-no-bind");
    const out = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 988,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-quick-no-rubric",
        sprintNumber: 988,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 60000,
        // no gradingRubric, no rubricInline, no successCriteriaRids
        successCriteriaRids: [],
      },
    });

    expect(out.status).toBe("negotiating");
    expect(out.round).toBe(1);
    expect(out.contractFile).toBeNull();
  });
});
