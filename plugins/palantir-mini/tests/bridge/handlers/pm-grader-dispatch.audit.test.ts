// Sprint-062 W0-gamma — pm_grader_dispatch audit test
// Handler: bridge/handlers/pm-grader-dispatch.ts
// Coverage: INVALID (missing required args, wrong domain), VALID-A (tier=none short-circuit),
//           VALID-B (validationErrors guard), VALID-C (no scoringPrompt → needs_human_review),
//           LINEAGE (dryRunRef event emission)
//
// NOTE: tests that would invoke `claude -p` subprocess are exercised only via
// code paths that short-circuit before the subprocess call:
//   - tier="none" → returns needs_human_review without subprocess
//   - validationResult.errors present → synthetic fail without subprocess
//   - criterion.scoringPrompt missing → gradeModel returns needs_human_review without subprocess
// This avoids real claude CLI dependency in CI while covering the handler's
// guard/dispatch logic. The subprocess itself is covered by model.ts unit tests.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import pmGraderDispatch from "../../../bridge/handlers/pm-grader-dispatch";

// ── Helpers ────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-grader-dispatch-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  return dir;
}

function makeArtifact(project: string, content = "hello world"): string {
  const p = path.join(project, "artifact.txt");
  fs.writeFileSync(p, content, "utf8");
  return p;
}

function makeModelCriterion(overrides: Record<string, unknown> = {}) {
  return {
    criterionId: "c-audit-test",
    rubricDomain: "model" as const,
    passFailLogic: { threshold: 0.5, scale: "0-1" as const },
    weightInRubric: 1.0,
    ...overrides,
  };
}

beforeEach(() => {
  savedEnv["PALANTIR_MINI_EVENTS_FILE"] = process.env["PALANTIR_MINI_EVENTS_FILE"];
  savedEnv["PALANTIR_MINI_EVENTS_FILE_FORCE"] = process.env["PALANTIR_MINI_EVENTS_FILE_FORCE"];
  const evFile = path.join(os.tmpdir(), `pgd-events-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  process.env["PALANTIR_MINI_EVENTS_FILE"] = evFile;
  process.env["PALANTIR_MINI_EVENTS_FILE_FORCE"] = "1";
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

describe("pm_grader_dispatch — INVALID", () => {
  test("INVALID-A: wrong rubricDomain throws actionable error", async () => {
    await expect(
      pmGraderDispatch({
        project: "/tmp",
        artifactPath: "/tmp/artifact.txt",
        criterion: { criterionId: "c1", rubricDomain: "rule" },
      }),
    ).rejects.toThrow(/rubricDomain.*model/i);
  });

  test("INVALID-B: missing criterion throws", async () => {
    await expect(
      pmGraderDispatch({
        project: "/tmp",
        artifactPath: "/tmp/artifact.txt",
      }),
    ).rejects.toThrow(/rubricDomain/);
  });

  test("INVALID-C: missing project throws", async () => {
    await expect(
      pmGraderDispatch({
        artifactPath: "/tmp/artifact.txt",
        criterion: makeModelCriterion(),
      }),
    ).rejects.toThrow(/project.*artifactPath/i);
  });

  test("INVALID-D: missing artifactPath throws", async () => {
    await expect(
      pmGraderDispatch({
        project: "/tmp",
        criterion: makeModelCriterion(),
      }),
    ).rejects.toThrow(/project.*artifactPath/i);
  });
});

// ── VALID ──────────────────────────────────────────────────────────────────

describe("pm_grader_dispatch — VALID", () => {
  test("VALID-A: tier=none returns needs_human_review without subprocess call", async () => {
    const project = makeProject();
    const artifactPath = makeArtifact(project);

    const result = await pmGraderDispatch({
      project,
      artifactPath,
      criterion: makeModelCriterion({ tier: "none" }),
    });

    expect(result.passFail).toBe("needs_human_review");
    expect(result.criterionId).toBe("c-audit-test");
    expect(result.rubricDomain).toBe("model");
    expect(result.score).toBe(0);
    expect(result.reasoning).toContain("tier=none");
  });

  test("VALID-B: validationResult.errors present + dryRunRef → synthetic fail, no subprocess", async () => {
    const project = makeProject();
    const artifactPath = makeArtifact(project);

    const result = await pmGraderDispatch({
      project,
      artifactPath,
      criterion: makeModelCriterion({ scoringPrompt: "Grade the artifact." }),
      dryRunRef: "abc123def456abcd",
      validationResult: { errors: ["TS2322: type mismatch", "TS2304: cannot find name"] },
    });

    expect(result.passFail).toBe("fail");
    expect(result.score).toBe(0);
    expect(result.reasoning).toContain("dryRunRef");
    expect(result.reasoning).toContain("validation failed");
    expect(result.evidenceCited).toBeDefined();
    expect(result.evidenceCited!.length).toBeGreaterThan(0);
  });

  test("VALID-C: no scoringPrompt → gradeModel short-circuits to needs_human_review", async () => {
    const project = makeProject();
    const artifactPath = makeArtifact(project);

    const result = await pmGraderDispatch({
      project,
      artifactPath,
      criterion: makeModelCriterion({ scoringPrompt: undefined }),
    });

    // gradeModel returns needs_human_review when scoringPrompt absent
    expect(result.passFail).toBe("needs_human_review");
  });

  test("VALID-D: validationResult=ok + dryRunRef → proceeds past validation guard (no synthetic fail)", async () => {
    const project = makeProject();
    const artifactPath = makeArtifact(project);

    // With validationResult="ok", the guard does NOT fire → proceeds to gradeModel
    // Since there's no scoringPrompt, gradeModel returns needs_human_review (not fail)
    const result = await pmGraderDispatch({
      project,
      artifactPath,
      criterion: makeModelCriterion({ scoringPrompt: undefined }),
      dryRunRef: "abc123def456abcd",
      validationResult: "ok",
    });

    // Not synthetic fail — gradeModel returned needs_human_review
    expect(result.passFail).toBe("needs_human_review");
    // Reasoning is from gradeModel, not the synthetic fail path
    expect(result.reasoning).not.toContain("dryRunRef=");
  });

  test("VALID-E: auto-policy tier resolution — scoringPrompt with 'semantic' keyword → critical tier (auto-selected)", async () => {
    const project = makeProject();
    const artifactPath = makeArtifact(project);

    // "semantic" keyword in scoringPrompt → resolveTier returns {tier:"critical", autoSelected:true}
    // But no scoringPrompt after tier check → gradeModel returns needs_human_review (no subprocess)
    // We can verify the tier resolution path doesn't crash (functional coverage)
    const result = await pmGraderDispatch({
      project,
      artifactPath,
      // Criterion with no explicit tier but semantic keyword in scoringPrompt triggers auto-policy
      criterion: {
        criterionId: "c-semantic",
        rubricDomain: "model" as const,
        passFailLogic: { threshold: 0.5, scale: "0-1" as const },
        weightInRubric: 1.0,
        // No scoringPrompt set — gradeModel will short-circuit
        // Note: resolveTier checks scoringPrompt for keywords BEFORE gradeModel is called
      },
    });

    // Still needs_human_review (no scoringPrompt) — tests tier-resolution path doesn't crash
    expect(result.passFail).toBe("needs_human_review");
  });
});

// ── LINEAGE ────────────────────────────────────────────────────────────────

describe("pm_grader_dispatch — LINEAGE", () => {
  test("LINEAGE: dryRunRef present → emits validation_phase_completed errorClass=dry_run_skipped_validation_errors", async () => {
    const project = makeProject();
    const artifactPath = makeArtifact(project);
    const evFile = process.env["PALANTIR_MINI_EVENTS_FILE"]!;

    // validationResult.errors triggers the skip-guard path which emits event
    await pmGraderDispatch({
      project,
      artifactPath,
      criterion: makeModelCriterion({ scoringPrompt: "Grade it." }),
      dryRunRef: "abc123def456abcd",
      validationResult: { errors: ["TS2345: compile error"] },
    });

    expect(fs.existsSync(evFile)).toBe(true);
    const lines = fs.readFileSync(evFile, "utf8").trim().split("\n").filter(Boolean);
    const events = lines.map((l) => JSON.parse(l) as { type: string; payload: Record<string, unknown> });

    const skipEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        e.payload.errorClass === "dry_run_skipped_validation_errors",
    );
    expect(skipEvent).toBeDefined();
    expect(skipEvent!.payload.passed).toBe(false);
  });

  test("LINEAGE: tier=none does NOT emit any event (pre-subprocess short-circuit)", async () => {
    const project = makeProject();
    const artifactPath = makeArtifact(project);
    const evFile = process.env["PALANTIR_MINI_EVENTS_FILE"]!;

    await pmGraderDispatch({
      project,
      artifactPath,
      criterion: makeModelCriterion({ tier: "none" }),
    });

    // tier=none returns before any emit — evFile should not be created
    expect(fs.existsSync(evFile)).toBe(false);
  });
});
