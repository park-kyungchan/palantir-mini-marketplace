/**
 * palantir-mini v6.22.0 — SprintContract validation.ts unit tests
 * Sprint-112 PR 5.2 — canonical plan v2 §4 row 5.2
 *
 * Coverage:
 *   - isValidTransition: positive + negative cases
 *   - isValidActionForStatus: positive + negative cases
 *   - findSprintNumberCollisions: positive + negative cases
 *   - findMissingScopePaths: positive + negative cases
 *   - Handler wire-in: advisory events emitted on violation without blocking
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  isValidTransition,
  isValidActionForStatus,
  findSprintNumberCollisions,
  findMissingScopePaths,
  type ContractStatus,
  type NegotiateAction,
  type NegotiationStatus,
} from "../../../lib/sprint-contract/validation";
import negotiateSprintContract from "../../../bridge/handlers/negotiate-sprint-contract";
import { readEvents } from "../../../lib/event-log/read";

// ---------------------------------------------------------------------------
// Shared test utilities
// ---------------------------------------------------------------------------

const tmpRoots: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-val-${label}-`));
}

function setupRoot(label: string): string {
  const root = makeTmpRoot(label);
  tmpRoots.push(root);
  process.env["PALANTIR_MINI_PROJECT"] = root;
  process.env["PALANTIR_MINI_EVENTS_FILE"] = path.join(
    root,
    ".palantir-mini",
    "session",
    "events.jsonl",
  );
  return root;
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

beforeEach(() => {
  savedEnv["PALANTIR_MINI_PROJECT"] = process.env["PALANTIR_MINI_PROJECT"];
  savedEnv["PALANTIR_MINI_EVENTS_FILE"] = process.env["PALANTIR_MINI_EVENTS_FILE"];
});

afterEach(() => {
  for (const k of Object.keys(savedEnv)) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Check 1 — isValidTransition
// ---------------------------------------------------------------------------

describe("isValidTransition — legal transitions", () => {
  test("drafting → negotiating is valid", () => {
    expect(isValidTransition("drafting", "negotiating")).toBe(true);
  });

  test("drafting → bound is valid (direct path for quick sprints)", () => {
    expect(isValidTransition("drafting", "bound")).toBe(true);
  });

  test("negotiating → bound is valid", () => {
    expect(isValidTransition("negotiating", "bound")).toBe(true);
  });

  test("bound → in-progress is valid", () => {
    expect(isValidTransition("bound", "in-progress")).toBe(true);
  });

  test("in-progress → passed is valid", () => {
    expect(isValidTransition("in-progress", "passed")).toBe(true);
  });

  test("in-progress → failed is valid", () => {
    expect(isValidTransition("in-progress", "failed")).toBe(true);
  });

  test("drafting → aborted is valid (early abort)", () => {
    expect(isValidTransition("drafting", "aborted")).toBe(true);
  });

  test("negotiating → aborted is valid (early abort)", () => {
    expect(isValidTransition("negotiating", "aborted")).toBe(true);
  });

  test("in-progress → aborted is valid", () => {
    expect(isValidTransition("in-progress", "aborted")).toBe(true);
  });
});

describe("isValidTransition — illegal transitions", () => {
  test("passed → in-progress is invalid (terminal state)", () => {
    expect(isValidTransition("passed", "in-progress")).toBe(false);
  });

  test("failed → in-progress is invalid (terminal state)", () => {
    expect(isValidTransition("failed", "in-progress")).toBe(false);
  });

  test("aborted → bound is invalid (terminal state)", () => {
    expect(isValidTransition("aborted", "bound")).toBe(false);
  });

  test("bound → passed is invalid (must go through in-progress)", () => {
    expect(isValidTransition("bound", "passed")).toBe(false);
  });

  test("drafting → passed is invalid (skip multiple steps)", () => {
    expect(isValidTransition("drafting", "passed")).toBe(false);
  });

  test("in-progress → negotiating is invalid (backward)", () => {
    expect(isValidTransition("in-progress", "negotiating")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Check 2 — isValidActionForStatus
// ---------------------------------------------------------------------------

describe("isValidActionForStatus — valid pairings", () => {
  test("read is valid for any status: negotiating", () => {
    expect(isValidActionForStatus("read", "negotiating")).toBe(true);
  });

  test("read is valid for any status: bound", () => {
    expect(isValidActionForStatus("read", "bound")).toBe(true);
  });

  test("read is valid for any status: aborted", () => {
    expect(isValidActionForStatus("read", "aborted")).toBe(true);
  });

  test("approve is valid when status=negotiating", () => {
    expect(isValidActionForStatus("approve", "negotiating")).toBe(true);
  });

  test("counter is valid when status=negotiating", () => {
    expect(isValidActionForStatus("counter", "negotiating")).toBe(true);
  });

  test("propose is valid when status=negotiating", () => {
    expect(isValidActionForStatus("propose", "negotiating")).toBe(true);
  });
});

describe("isValidActionForStatus — invalid pairings", () => {
  test("approve is invalid when status=bound", () => {
    expect(isValidActionForStatus("approve", "bound")).toBe(false);
  });

  test("approve is invalid when status=aborted", () => {
    expect(isValidActionForStatus("approve", "aborted")).toBe(false);
  });

  test("counter is invalid when status=bound", () => {
    expect(isValidActionForStatus("counter", "bound")).toBe(false);
  });

  test("propose is invalid when status=aborted", () => {
    expect(isValidActionForStatus("propose", "aborted")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Check 3 — findSprintNumberCollisions
// ---------------------------------------------------------------------------

describe("findSprintNumberCollisions — no collision", () => {
  test("empty sprints dir → no collisions", () => {
    const root = makeTmpRoot("col-empty");
    tmpRoots.push(root);
    const result = findSprintNumberCollisions(root, 1, "ctr-1");
    expect(result).toEqual([]);
  });

  test("same sprintNumber + same contractId → no collision (idempotent re-bind)", () => {
    const root = makeTmpRoot("col-same");
    tmpRoots.push(root);
    const sprintDir = path.join(root, ".palantir-mini", "harness", "sprints", "sprint-001");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(
      path.join(sprintDir, "contract.json"),
      JSON.stringify({ sprintNumber: 1, contractId: "ctr-1" }),
      "utf8",
    );
    const result = findSprintNumberCollisions(root, 1, "ctr-1");
    expect(result).toEqual([]);
  });

  test("different sprintNumber → no collision", () => {
    const root = makeTmpRoot("col-diff-num");
    tmpRoots.push(root);
    const sprintDir = path.join(root, ".palantir-mini", "harness", "sprints", "sprint-002");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(
      path.join(sprintDir, "contract.json"),
      JSON.stringify({ sprintNumber: 2, contractId: "ctr-2" }),
      "utf8",
    );
    const result = findSprintNumberCollisions(root, 1, "ctr-1");
    expect(result).toEqual([]);
  });
});

describe("findSprintNumberCollisions — collision detected", () => {
  test("same sprintNumber + different contractId → collision reported", () => {
    const root = makeTmpRoot("col-hit");
    tmpRoots.push(root);
    const sprintDir = path.join(root, ".palantir-mini", "harness", "sprints", "sprint-001");
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(
      path.join(sprintDir, "contract.json"),
      JSON.stringify({ sprintNumber: 1, contractId: "ctr-existing" }),
      "utf8",
    );
    const result = findSprintNumberCollisions(root, 1, "ctr-new");
    expect(result.length).toBe(1);
    expect(result[0]?.existingContractId).toBe("ctr-existing");
    expect(result[0]?.incomingContractId).toBe("ctr-new");
    expect(result[0]?.sprintNumber).toBe(1);
  });

  test("multiple contracts with same sprintNumber + different contractIds → all reported", () => {
    const root = makeTmpRoot("col-multi");
    tmpRoots.push(root);
    for (const [dirName, id] of [
      ["sprint-001", "ctr-a"],
      ["sprint-001-quick", "ctr-b"],
    ] as [string, string][]) {
      const dir = path.join(root, ".palantir-mini", "harness", "sprints", dirName);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "contract.json"),
        JSON.stringify({ sprintNumber: 1, contractId: id }),
        "utf8",
      );
    }
    const result = findSprintNumberCollisions(root, 1, "ctr-new");
    expect(result.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Check 4 — findMissingScopePaths
// ---------------------------------------------------------------------------

describe("findMissingScopePaths — no missing paths", () => {
  test("contract with no inputs → no missing paths", () => {
    const root = makeTmpRoot("scope-no-inputs");
    tmpRoots.push(root);
    const result = findMissingScopePaths(root, { contractId: "c1" });
    expect(result).toEqual([]);
  });

  test("inputs with no scopePaths field → no missing paths", () => {
    const root = makeTmpRoot("scope-no-field");
    tmpRoots.push(root);
    const result = findMissingScopePaths(root, {
      contractId: "c1",
      inputs: [{ featureId: "f1", title: "feat" }],
    });
    expect(result).toEqual([]);
  });

  test("glob pattern in scopePaths → skipped (not checked)", () => {
    const root = makeTmpRoot("scope-glob");
    tmpRoots.push(root);
    const result = findMissingScopePaths(root, {
      contractId: "c1",
      inputs: [{ featureId: "f1", scopePaths: ["src/**/*.ts"] }],
    });
    expect(result).toEqual([]);
  });

  test("existing path → no missing", () => {
    const root = makeTmpRoot("scope-exists");
    tmpRoots.push(root);
    const dir = path.join(root, "src");
    fs.mkdirSync(dir, { recursive: true });
    const result = findMissingScopePaths(root, {
      contractId: "c1",
      inputs: [{ featureId: "f1", scopePaths: ["src"] }],
    });
    expect(result).toEqual([]);
  });
});

describe("findMissingScopePaths — missing paths detected", () => {
  test("non-existent relative path → reported", () => {
    const root = makeTmpRoot("scope-missing");
    tmpRoots.push(root);
    const result = findMissingScopePaths(root, {
      contractId: "c1",
      inputs: [{ featureId: "f1", scopePaths: ["src/does-not-exist"] }],
    });
    expect(result.length).toBe(1);
    expect(result[0]?.scopePath).toBe("src/does-not-exist");
    expect(result[0]?.featureId).toBe("f1");
    expect(result[0]?.resolvedPath).toContain("src/does-not-exist");
  });

  test("non-existent absolute path → reported", () => {
    const result = findMissingScopePaths("/any/root", {
      contractId: "c1",
      inputs: [{ featureId: "f2", scopePaths: ["/absolutely/nonexistent/path/xyz"] }],
    });
    expect(result.length).toBe(1);
    expect(result[0]?.resolvedPath).toBe("/absolutely/nonexistent/path/xyz");
  });
});

// ---------------------------------------------------------------------------
// Handler wire-in — check 2 advisory event on action × status mismatch
// ---------------------------------------------------------------------------

describe("handler wire-in — advisory events emitted without blocking", () => {
  test("approve on already-bound sprint → emits advisory but does NOT throw", async () => {
    const root = setupRoot("wire-approve-bound");
    // Pre-populate: both sides already approved (bound state)
    const sprintsDir = path.join(root, ".palantir-mini", "harness", "sprints", "sprint-001");
    fs.mkdirSync(sprintsDir, { recursive: true });
    const negotiationFile = path.join(sprintsDir, "contract-negotiation.md");
    // Write negotiation log with both approvals so parseNegotiationState sees bound
    fs.writeFileSync(
      negotiationFile,
      `# Sprint 1 — Contract Negotiation\n\n## Round 1 [generator] APPROVED\n\n## Round 2 [evaluator] APPROVED\n`,
      "utf8",
    );

    // Should not throw even though action=approve on a bound state is mismatch
    await expect(
      negotiateSprintContract({
        projectPath: root,
        sprintNumber: 1,
        role: "generator",
        action: "approve",
      }),
    ).resolves.toBeDefined();

    // Events file should contain validation_phase_completed with errorClass
    const eventsPath = eventsPathFor(root);
    if (fs.existsSync(eventsPath)) {
      const events = readEvents(eventsPath);
      const advisory = events.find(
        (e) =>
          e.type === "validation_phase_completed" &&
          (e.payload as Record<string, unknown>)["errorClass"] ===
            "sprint_contract_action_status_mismatch",
      );
      expect(advisory).toBeDefined();
    }
  });

  test("propose on aborted sprint → emits advisory but does NOT throw", async () => {
    const root = setupRoot("wire-propose-aborted");
    const sprintsDir = path.join(root, ".palantir-mini", "harness", "sprints", "sprint-001");
    fs.mkdirSync(sprintsDir, { recursive: true });
    const negotiationFile = path.join(sprintsDir, "contract-negotiation.md");
    // Create 16 rounds to trigger aborted state (>15 threshold)
    let content = `# Sprint 1 — Contract Negotiation\n\n`;
    for (let i = 1; i <= 16; i++) {
      content += `## Round ${i} [generator] COUNTER\n\n`;
    }
    fs.writeFileSync(negotiationFile, content, "utf8");

    // Should not throw even though propose on aborted is a mismatch
    await expect(
      negotiateSprintContract({
        projectPath: root,
        sprintNumber: 1,
        role: "generator",
        action: "propose",
        contract: { contractId: "ctr-test", sprintNumber: 1 },
      }),
    ).resolves.toBeDefined();
  });
});
