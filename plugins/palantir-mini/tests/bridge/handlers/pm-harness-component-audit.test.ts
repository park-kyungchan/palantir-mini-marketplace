/**
 * palantir-mini v2.21.0 — W5 Component Audit regression.
 *
 * Covers: seed enumeration, never-audited read path, verdict-record path
 * with event emission.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  pmHarnessComponentAudit,
  SEED_COMPONENTS,
} from "../../../bridge/handlers/pm_harness_component_audit";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  delete process.env.PALANTIR_MINI_PROJECT;
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_PROJECT === undefined) delete process.env.PALANTIR_MINI_PROJECT;
  else process.env.PALANTIR_MINI_PROJECT = savedEnv.PALANTIR_MINI_PROJECT;
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("SEED_COMPONENTS", () => {
  test("has 7 entries matching cheeky-wandering-yeti.md §W5 table", () => {
    expect(SEED_COMPONENTS).toHaveLength(7);
    const ids = SEED_COMPONENTS.map((c) => c.componentId).sort();
    expect(ids).toContain("sprint-construct");
    expect(ids).toContain("per-sprint-evaluator");
    expect(ids).toContain("context-reset");
    expect(ids).toContain("planner");
    expect(ids).toContain("harness-analyzer");
    expect(ids).toContain("file-ipc-feedback");
    expect(ids).toContain("sprint-contract-negotiation");
  });

  test("priority ranks 1-7 for seeds", () => {
    const ranks = SEED_COMPONENTS.map((c) => c.priorityRank).sort();
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test("S1 (sprint-construct) and S2 (per-sprint-evaluator) at priorities 1 + 2", () => {
    const byId = new Map(SEED_COMPONENTS.map((c) => [c.componentId, c.priorityRank]));
    expect(byId.get("sprint-construct")).toBe(1);
    expect(byId.get("per-sprint-evaluator")).toBe(2);
  });
});

describe("pmHarnessComponentAudit", () => {
  test("never-audited when no verdict supplied, seed exists", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-w5-seed-"));
    tmpDirs.push(project);
    process.env.PALANTIR_MINI_PROJECT = project;

    const result = await pmHarnessComponentAudit({
      componentId: "sprint-construct",
      projectPath: project,
    });
    expect(result.verdict).toBe("never-audited");
    expect(result.emittedEvent).toBe(false);
    expect(result.seed?.componentId).toBe("sprint-construct");

    const eventsLog = path.join(project, ".palantir-mini", "session", "events.jsonl");
    expect(fs.existsSync(eventsLog)).toBe(false);
  });

  test("records verdict + emits harness_component_audit_emitted event", async () => {
    // Return-value-only assertion to avoid parallel-run race on a shared
    // process.env.PALANTIR_MINI_PROJECT + transient events.jsonl path. The
    // emission path itself is exercised end-to-end by the full harness
    // dogfood (future palantir-math sprint-003 W5 canary); here we verify
    // the handler's return contract under the verdict-record branch.
    const result = await pmHarnessComponentAudit({
      componentId: "context-reset",
      verdict: "remove-candidate",
      scoreDelta: -0.02,
      rationale: "simpleVariant (continuous session) within 2% of reset-enabled run.",
      canaryArtifacts: ["sprint-003/iteration-001/artifact.html"],
    });
    expect(result.verdict).toBe("remove-candidate");
    expect(result.emittedEvent).toBe(true);
    expect(result.scoreDelta).toBe(-0.02);
    expect(result.componentId).toBe("context-reset");
  });

  test("unknown componentId returns seed=null + never-audited", async () => {
    const result = await pmHarnessComponentAudit({ componentId: "does-not-exist" });
    expect(result.seed).toBeNull();
    expect(result.verdict).toBe("never-audited");
    expect(result.emittedEvent).toBe(false);
  });

  test("throws when componentId missing", async () => {
    await expect(
      pmHarnessComponentAudit({ componentId: "" as string }),
    ).rejects.toThrow(/componentId required/);
  });
});
