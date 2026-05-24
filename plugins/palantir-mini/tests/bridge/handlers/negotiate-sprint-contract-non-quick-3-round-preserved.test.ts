// palantir-mini sprint-138 — Non-Quick mode 3-round handshake preservation tests
// Coverage: HARD INVARIANT — non-quick modes (full/lite/strict/undefined) MUST
// still require 3 separate rounds (orchestrator propose → generator approve →
// evaluator approve) after handler-v3.X Quick single-round binding is added.
//
// Also verifies that Quick mode WITHOUT inline rubric/criteria falls back to
// the 3-round path (rubric gate is a safety check, not just a hint).

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

// ── Non-Quick modes: 3-round handshake PRESERVED ────────────────────────────

describe("Non-Quick modes — 3-round handshake preserved", () => {
  test("mode=full: propose → no auto-bind (round 1 stays negotiating)", async () => {
    const root = setupRoot("full-r1");
    const r1 = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 200,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-full",
        sprintNumber: 200,
        mode: "full",
        iterationLimit: 3,
        timeboxMs: 3600000,
        gradingRubric: {
          criteria: [{ criterionId: "c1", rubricDomain: "code", weight: 1, threshold: 1 }],
        },
        terminationHardThreshold: { perCriterion: { c1: 0.8 }, overall: 0.8, scale: "0-1" },
      },
    });

    expect(r1.status).toBe("negotiating");
    expect(r1.round).toBe(1);
    expect(r1.contractFile).toBeNull();
  });

  test("mode=full: full 3-round handshake (orchestrator + generator + evaluator) → bound", async () => {
    const root = setupRoot("full-3round");
    const contract = {
      contractId: "test-full-3r",
      sprintNumber: 201,
      mode: "full",
      iterationLimit: 2,
      timeboxMs: 3600000,
      gradingRubric: {
        criteria: [{ criterionId: "c1", rubricDomain: "code", weight: 1, threshold: 1 }],
      },
      terminationHardThreshold: { perCriterion: { c1: 0.8 }, overall: 0.8, scale: "0-1" },
    };

    // Round 1: orchestrator propose
    const r1 = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 201,
      role: "orchestrator",
      action: "propose",
      contract,
    });
    expect(r1.status).toBe("negotiating");
    expect(r1.round).toBe(1);
    expect(r1.contractFile).toBeNull();

    // Round 2: generator approve
    const r2 = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 201,
      role: "generator",
      action: "approve",
    });
    expect(r2.status).toBe("negotiating");
    expect(r2.round).toBe(2);
    expect(r2.generatorApproved).toBe(true);
    expect(r2.evaluatorApproved).toBe(false);
    expect(r2.contractFile).toBeNull();

    // Round 3: evaluator approve → bound
    const r3 = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 201,
      role: "evaluator",
      action: "approve",
    });
    expect(r3.status).toBe("bound");
    expect(r3.generatorApproved).toBe(true);
    expect(r3.evaluatorApproved).toBe(true);
    expect(r3.contractFile).not.toBeNull();
    expect(fs.existsSync(r3.contractFile!)).toBe(true);
  });

  test("mode=lite: propose → stays negotiating (not auto-bound)", async () => {
    const root = setupRoot("lite-r1");
    const r1 = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 202,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-lite",
        sprintNumber: 202,
        mode: "lite",
        iterationLimit: 1,
        timeboxMs: 900000,
        gradingRubric: {
          criteria: [{ criterionId: "c1", rubricDomain: "code", weight: 1, threshold: 1 }],
        },
        terminationHardThreshold: { overall: 0.8, scale: "0-1" },
      },
    });

    expect(r1.status).toBe("negotiating");
    expect(r1.contractFile).toBeNull();
  });

  test("mode=strict: propose → stays negotiating (not auto-bound)", async () => {
    const root = setupRoot("strict-r1");
    const r1 = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 203,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-strict",
        sprintNumber: 203,
        mode: "strict",
        iterationLimit: 4,
        timeboxMs: 7200000,
        gradingRubric: {
          criteria: [{ criterionId: "c1", rubricDomain: "code", weight: 1, threshold: 1 }],
        },
        terminationHardThreshold: { overall: 0.95, scale: "0-1" },
      },
    });

    expect(r1.status).toBe("negotiating");
    expect(r1.contractFile).toBeNull();
  });

  test("mode=undefined: propose → stays negotiating (not auto-bound)", async () => {
    const root = setupRoot("nomode-r1");
    const r1 = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 204,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-nomode",
        sprintNumber: 204,
        // no mode field
        iterationLimit: 1,
        timeboxMs: 900000,
        gradingRubric: {
          criteria: [{ criterionId: "c1", rubricDomain: "code", weight: 1, threshold: 1 }],
        },
      },
    });

    expect(r1.status).toBe("negotiating");
    expect(r1.contractFile).toBeNull();
  });
});

// ── Quick mode WITHOUT rubric/criteria → 3-round fallback ──────────────────

describe("Quick mode without rubric/criteria — 3-round fallback", () => {
  test("mode=quick + empty successCriteriaRids + no rubric → negotiating (not auto-bound)", async () => {
    const root = setupRoot("qs-empty-criteria");
    const r1 = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 210,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-quick-empty",
        sprintNumber: 210,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 60000,
        successCriteriaRids: [],  // empty — no auto-bind
      },
    });

    expect(r1.status).toBe("negotiating");
    expect(r1.round).toBe(1);
    expect(r1.contractFile).toBeNull();
  });

  test("mode=quick + no contract → negotiating (not auto-bound)", async () => {
    const root = setupRoot("qs-null-contract");
    const r1 = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 211,
      role: "orchestrator",
      action: "propose",
      // no contract field at all
    });

    expect(r1.status).toBe("negotiating");
    expect(r1.contractFile).toBeNull();
  });

  test("mode=quick with empty rubricInline array → negotiating (not auto-bound)", async () => {
    const root = setupRoot("qs-empty-inline");
    const r1 = await negotiateSprintContract({
      projectPath: root,
      sprintNumber: 212,
      role: "orchestrator",
      action: "propose",
      contract: {
        contractId: "test-quick-empty-inline",
        sprintNumber: 212,
        mode: "quick",
        iterationLimit: 1,
        timeboxMs: 60000,
        rubricInline: [],  // empty array — no auto-bind
      },
    });

    expect(r1.status).toBe("negotiating");
    expect(r1.contractFile).toBeNull();
  });
});
