// palantir-mini v3.9.0 — pm-grader-dispatch tests (W3.1e)
// Coverage: arg validation + dryRunRef event emission + validation-errors guard.
// Note: tests do NOT spawn `claude -p` subprocess — gradeModel is mocked at the
// module level via Bun's import-resolution by skipping the real spawn path.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import pmGraderDispatch from "../../../bridge/handlers/pm-grader-dispatch";
import type { GradingCriterionLite } from "../../../bridge/handlers/grade-outcome/types";

const MODEL_CRITERION: GradingCriterionLite = {
  criterionId: "test-model-1",
  title: "Test model criterion",
  rubricDomain: "model",
  passFailLogic: { threshold: 7, scale: "0-10" },
  weightInRubric: 1.0,
  scoringPrompt: "Score the artifact 0-10. Return JSON.",
};

let TMP: string;
let savedEventsFile: string | undefined;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-grader-w3-1e-"));
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
  savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
});

afterEach(() => {
  if (savedEventsFile !== undefined) {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
  } else {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

describe("pm_grader_dispatch — arg validation", () => {
  test("throws when criterion.rubricDomain != 'model'", async () => {
    const codeCriterion = { ...MODEL_CRITERION, rubricDomain: "code" as const };
    await expect(
      pmGraderDispatch({
        project: TMP,
        criterion: codeCriterion,
        artifactPath: path.join(TMP, "artifact.txt"),
      }),
    ).rejects.toThrow(/rubricDomain must be "model"/i);
  });

  test("throws when project missing", async () => {
    await expect(
      pmGraderDispatch({
        criterion: MODEL_CRITERION,
        artifactPath: path.join(TMP, "artifact.txt"),
      }),
    ).rejects.toThrow(/project.*artifactPath.*required/i);
  });

  test("throws when artifactPath missing", async () => {
    await expect(
      pmGraderDispatch({
        project: TMP,
        criterion: MODEL_CRITERION,
      }),
    ).rejects.toThrow(/project.*artifactPath.*required/i);
  });
});

describe("pm_grader_dispatch — W3.B 5-level tier dispatch", () => {
  test("tier=none returns needs_human_review without subprocess spawn", async () => {
    const noneCriterion: GradingCriterionLite = {
      ...MODEL_CRITERION,
      tier: "none",
    };
    const result = await pmGraderDispatch({
      project: TMP,
      criterion: noneCriterion,
      artifactPath: path.join(TMP, "artifact.txt"),
    });
    expect(result.passFail).toBe("needs_human_review");
    expect(result.score).toBe(0);
    expect(result.reasoning).toContain("tier=none");
    expect(result.reasoning).toContain("no model call");
    // No events.jsonl written (no dryRunRef, no subprocess, no emit)
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    expect(fs.existsSync(eventsPath)).toBe(false);
  });

  test("tier=low falls through to gradeModel (no scoringPrompt → needs_human_review)", async () => {
    const lowCriterion: GradingCriterionLite = {
      criterionId: "test-low",
      title: "Low tier criterion",
      rubricDomain: "model",
      passFailLogic: { threshold: 7, scale: "0-10" },
      weightInRubric: 1.0,
      tier: "low",
      // no scoringPrompt → gradeModel returns needs_human_review without spawn
    };
    const result = await pmGraderDispatch({
      project: TMP,
      criterion: lowCriterion,
      artifactPath: path.join(TMP, "artifact.txt"),
    });
    // tier=low goes through gradeModel; no scoringPrompt → short-circuit in gradeModel
    expect(result.passFail).toBe("needs_human_review");
    expect(result.reasoning).not.toContain("tier=none");
  });

  test("tier=critical falls through to gradeModel (no scoringPrompt → needs_human_review)", async () => {
    const criticalCriterion: GradingCriterionLite = {
      criterionId: "test-critical",
      title: "Critical tier criterion",
      rubricDomain: "model",
      passFailLogic: { threshold: 7, scale: "0-10" },
      weightInRubric: 1.0,
      tier: "critical",
      // no scoringPrompt → gradeModel returns needs_human_review without spawn
    };
    const result = await pmGraderDispatch({
      project: TMP,
      criterion: criticalCriterion,
      artifactPath: path.join(TMP, "artifact.txt"),
    });
    expect(result.passFail).toBe("needs_human_review");
    expect(result.reasoning).not.toContain("tier=none");
  });
});

describe("pm_grader_dispatch — W3.1e validation-errors guard", () => {
  test("skips subprocess + emits dry_run_skipped event when validationResult has errors", async () => {
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    const result = await pmGraderDispatch({
      project: TMP,
      criterion: MODEL_CRITERION,
      artifactPath: path.join(TMP, "artifact.txt"),
      dryRunRef: "abc123def456beef",
      validationResult: { errors: ["[Range] foo: out of bounds", "[StringLength] bar: too short"] },
    });

    expect(result.passFail).toBe("fail");
    expect(result.score).toBe(0);
    expect(result.reasoning).toContain("dryRunRef=abc123def456beef");
    expect(result.reasoning).toContain("validation failed");
    expect(result.evidenceCited).toEqual(["dryRunValidationErrors:2"]);

    // Event emitted with errorClass=dry_run_skipped_validation_errors
    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    const event = JSON.parse(lines[lines.length - 1]!);
    expect(event.type).toBe("validation_phase_completed");
    expect(event.payload.passed).toBe(false);
    expect(event.payload.errorClass).toBe("dry_run_skipped_validation_errors");
    expect(event.withWhat?.reasoning).toContain("dryRunRef=abc123def456beef");
    expect(event.withWhat?.reasoning).toContain("verdict=fail");
  });

  // Use a criterion WITHOUT scoringPrompt so gradeModel returns immediately
  // (`needs_human_review`) without spawning the `claude -p` subprocess. Tests
  // verify pm-grader-dispatch's emit pathway, not gradeModel's subprocess.
  const NO_PROMPT_CRITERION: GradingCriterionLite = {
    criterionId: "test-no-prompt",
    title: "Test no scoringPrompt",
    rubricDomain: "model",
    passFailLogic: { threshold: 7, scale: "0-10" },
    weightInRubric: 1.0,
    // scoringPrompt intentionally omitted → gradeModel short-circuits
  };

  test("does NOT skip subprocess path when validationResult is 'ok' (validation guard inactive)", async () => {
    const result = await pmGraderDispatch({
      project: TMP,
      criterion: NO_PROMPT_CRITERION,
      artifactPath: path.join(TMP, "artifact.txt"),
      dryRunRef: "noSkipTestRef",
      validationResult: "ok",
    });
    // The synthetic-skip path was NOT taken (reasoning doesn't mention "skipped subprocess").
    expect(result.reasoning).not.toContain("skipped subprocess");
    // gradeModel returned needs_human_review (no scoringPrompt) — that's expected.
    expect(result.passFail).toBe("needs_human_review");
  });

  test("emits dry_run_graded(passed=false) when grading completes via subprocess path with dryRunRef", async () => {
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    await pmGraderDispatch({
      project: TMP,
      criterion: NO_PROMPT_CRITERION,
      artifactPath: path.join(TMP, "artifact.txt"),
      dryRunRef: "graded-pair-ref",
      // NO validationResult passed → guard inactive
    });

    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    const gradedEvents = lines.map((l) => JSON.parse(l)).filter(
      (e: any) => e.payload?.errorClass === "dry_run_graded",
    );
    expect(gradedEvents.length).toBe(1);
    expect(gradedEvents[0].payload.passed).toBe(false); // needs_human_review !== "pass"
    expect(gradedEvents[0].withWhat?.reasoning).toContain("dryRunRef=graded-pair-ref");
    expect(gradedEvents[0].withWhat?.reasoning).toContain("verdict=needs_human_review");
  });

  test("does NOT emit dry_run_graded when dryRunRef absent", async () => {
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    await pmGraderDispatch({
      project: TMP,
      criterion: NO_PROMPT_CRITERION,
      artifactPath: path.join(TMP, "artifact.txt"),
      // NO dryRunRef
    });

    if (fs.existsSync(eventsPath)) {
      const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
      for (const ln of lines) {
        const ev = JSON.parse(ln);
        expect(ev.payload?.errorClass).not.toBe("dry_run_graded");
        expect(ev.payload?.errorClass).not.toBe("dry_run_skipped_validation_errors");
      }
    }
  });
});
