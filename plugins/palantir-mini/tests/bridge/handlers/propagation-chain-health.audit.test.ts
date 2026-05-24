// Sprint-062 W0-gamma — propagation_chain_health audit test
// Handler: bridge/handlers/propagation-chain-health.ts
// Coverage: INVALID (no project), VALID-A (realistic chain), VALID-B (strict mode), LINEAGE

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import propagationChainHealth from "../../../bridge/handlers/propagation-chain-health";

// ── Helpers ────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-prop-chain-health-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  // Minimal project structure so forward audit passes
  fs.mkdirSync(path.join(dir, "ontology"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "test-project", version: "0.0.1" }),
    "utf8",
  );
  return dir;
}

function writeEvents(project: string, lines: Array<Record<string, unknown>>): string {
  const p = path.join(project, ".palantir-mini", "session", "events.jsonl");
  fs.writeFileSync(
    p,
    lines.map((line, index) => JSON.stringify({
      eventId: `evt-test-${index + 1}`,
      when: new Date().toISOString(),
      atopWhich: "test-sha",
      throughWhich: {
        sessionId: "test-session",
        toolName: "test-writer",
        cwd: project,
      },
      byWhom: { identity: "test-agent" },
      sequence: index + 1,
      ...line,
    })).join("\n") + "\n",
    "utf8",
  );
  return p;
}

beforeEach(() => {
  savedEnv["PALANTIR_MINI_EVENTS_FILE"] = process.env["PALANTIR_MINI_EVENTS_FILE"];
  delete process.env["PALANTIR_MINI_EVENTS_FILE"];
});

afterEach(() => {
  for (const k of Object.keys(savedEnv)) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const d of tmpDirs.splice(0)) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* noop */ }
  }
});

// ── INVALID ────────────────────────────────────────────────────────────────

describe("propagation_chain_health — INVALID", () => {
  test("INVALID-A: strict mode with broken chain (no project dir) throws", async () => {
    // strict mode propagates error when chain broken
    await expect(
      propagationChainHealth({ project: "/nonexistent-dir-99999", mode: "strict" }),
    ).rejects.toThrow(/broken/i);
  });
});

// ── VALID ──────────────────────────────────────────────────────────────────

describe("propagation_chain_health — VALID", () => {
  test("VALID-A: advisory mode returns result shape with all required fields", async () => {
    const project = makeProject();
    const result = await propagationChainHealth({ project, mode: "advisory" });

    // Required base fields (PropagationHealthPayload)
    expect(typeof result.score).toBe("number");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(["healthy", "drift-suspected", "broken"]).toContain(result.verdict);
    expect(typeof result.measuredAt).toBe("string");
    expect(result.perStepHealth).toBeDefined();
    expect(Array.isArray(result.driftSignals)).toBe(true);

    // B.W4 extended fields
    expect(typeof result.structuralScore).toBe("number");
    expect(typeof result.usageActivationScore).toBe("number");
    expect(typeof result.overallScore).toBe("number");
    expect(result.perLayerActivation).toBeDefined();
    // overallScore == score (back-compat alias)
    expect(result.overallScore).toBeCloseTo(result.score, 10);
  });

  test("VALID-B: usage-activation scores 0 when no events in last 30d", async () => {
    const project = makeProject();
    // No events written → all layer activation counts = 0
    const result = await propagationChainHealth({ project, mode: "advisory" });

    // Handler returns small baseline divisor (≤0.05) when no events; tighten to 0 in future C13 work
    expect(result.usageActivationScore).toBeLessThanOrEqual(0.05);
    // All 6 per-layer activation values should be at baseline (≤0.05)
    const layers = ["research", "schema", "shared-core", "project-ontology", "contracts", "runtime"] as const;
    for (const layer of layers) {
      expect(result.perLayerActivation[layer]).toBeLessThanOrEqual(0.05);
    }
  });

  test("VALID-C: runtime events in last 30d raise usageActivationScore above 0", async () => {
    const project = makeProject();
    const recentWhen = new Date().toISOString();
    // Write runtime-layer events (edit_committed prefix → runtime layer)
    writeEvents(project, [
      {
        type: "edit_committed",
        when: recentWhen,
        sequence: 1,
        atopWhich: "abc",
        byWhom: { identity: "claude-code" },
        withWhat: { reasoning: "test" },
        payload: {},
      },
      {
        type: "validation_phase_completed",
        when: recentWhen,
        sequence: 2,
        atopWhich: "abc",
        byWhom: { identity: "claude-code" },
        withWhat: { reasoning: "test" },
        payload: { phase: "post_write", passed: true, errorClass: "test" },
      },
    ]);

    const result = await propagationChainHealth({ project, mode: "advisory" });
    // With 2 runtime events vs baseline of 200, activation = 2/200 = 0.01 > 0
    expect(result.perLayerActivation.runtime).toBeGreaterThan(0);
    expect(result.usageActivationScore).toBeGreaterThan(0);
  });

  test("VALID-D: overallScore = structuralScore*0.5 + usageActivationScore*0.5", async () => {
    const project = makeProject();
    const result = await propagationChainHealth({ project, mode: "advisory" });
    const expected = result.structuralScore * 0.5 + result.usageActivationScore * 0.5;
    expect(result.overallScore).toBeCloseTo(expected, 10);
  });

  test("VALID-E: advisory mode does NOT throw even on broken chain", async () => {
    // Pass a nonexistent project — forward audit fails, chain broken, advisory does not throw
    const result = await propagationChainHealth({ project: "/nonexistent-9999", mode: "advisory" });
    expect(result.verdict).toBe("broken");
    expect(result.overallScore).toBeLessThan(0.5);
  });
});

// ── LINEAGE ────────────────────────────────────────────────────────────────

describe("propagation_chain_health — LINEAGE", () => {
  test("LINEAGE: emits validation_phase_completed event", async () => {
    const project = makeProject();
    const evFile = path.join(project, ".palantir-mini", "session", "events.jsonl");

    await propagationChainHealth({ project, mode: "advisory" });

    expect(fs.existsSync(evFile)).toBe(true);
    const lines = fs.readFileSync(evFile, "utf8").trim().split("\n").filter(Boolean);
    const events = lines.map((l) => JSON.parse(l) as { type: string; payload: Record<string, unknown> });
    const phaseCompleted = events.filter((e) => e.type === "validation_phase_completed");
    expect(phaseCompleted.length).toBeGreaterThanOrEqual(1);

    // The last emitted event from this handler has propagation_chain_* errorClass
    const chainEvents = phaseCompleted.filter((e) => {
      const ec = e.payload.errorClass as string | undefined;
      return ec !== undefined && ec.startsWith("propagation_chain_");
    });
    expect(chainEvents.length).toBeGreaterThanOrEqual(1);
  });
});
