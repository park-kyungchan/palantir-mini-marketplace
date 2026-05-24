// palantir-mini v4.6.0 — grade-outcome visual-domain handler tests (W3.E)
// Coverage: no evidenceDir → needs_human_review; empty evidenceDir → needs_human_review;
//           evidenceDir with screenshot.png → pass citing file.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { gradeVisual } from "../../../bridge/handlers/grade-outcome/visual";
import type { GradingCriterionLite } from "../../../bridge/handlers/grade-outcome/types";

const VISUAL_CRITERION: GradingCriterionLite = {
  criterionId: "visual-test-1",
  title: "Visual layout check",
  rubricDomain: "visual",
  passFailLogic: { threshold: 7, scale: "0-10" },
  weightInRubric: 1.0,
};

let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "grade-visual-w3e-"));
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

describe("gradeVisual — no evidenceDir", () => {
  test("returns needs_human_review when evidenceDir is undefined", () => {
    const result = gradeVisual(
      VISUAL_CRITERION,
      path.join(TMP, "artifact.html"),
      undefined,
    );
    expect(result.passFail).toBe("needs_human_review");
    expect(result.score).toBe(0);
    expect(result.weightedScore).toBe(0);
    expect(result.rubricDomain).toBe("visual");
    expect(result.reasoning).toContain("run_playwright_scenario");
  });
});

describe("gradeVisual — empty evidenceDir", () => {
  test("returns needs_human_review when evidenceDir exists but has no PNG files", () => {
    const evidenceDir = path.join(TMP, "evidence");
    fs.mkdirSync(evidenceDir, { recursive: true });
    // Write a non-PNG file to confirm the filter works correctly
    fs.writeFileSync(path.join(evidenceDir, "console.log"), "[]");

    const result = gradeVisual(
      VISUAL_CRITERION,
      path.join(TMP, "artifact.html"),
      evidenceDir,
    );
    expect(result.passFail).toBe("needs_human_review");
    expect(result.score).toBe(0);
    expect(result.reasoning).toContain("run_playwright_scenario");
  });
});

describe("gradeVisual — evidenceDir with screenshots", () => {
  test("returns pass citing screenshot.png when PNG evidence is present", () => {
    const evidenceDir = path.join(TMP, "evidence");
    fs.mkdirSync(evidenceDir, { recursive: true });
    const screenshotPath = path.join(evidenceDir, "screenshot.png");
    // Write a stub PNG file (content does not matter for the stub handler)
    fs.writeFileSync(screenshotPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const result = gradeVisual(
      VISUAL_CRITERION,
      path.join(TMP, "artifact.html"),
      evidenceDir,
    );
    expect(result.passFail).toBe("pass");
    expect(result.score).toBeGreaterThan(0);
    expect(result.weightedScore).toBeGreaterThan(0);
    expect(result.rubricDomain).toBe("visual");
    expect(result.reasoning).toContain("screenshot.png");
    expect(result.evidenceCited).toBeDefined();
    expect(result.evidenceCited!.length).toBeGreaterThan(0);
    expect(result.evidenceCited![0]).toContain("screenshot.png");
  });

  test("cites all PNG files when multiple screenshots are present", () => {
    const evidenceDir = path.join(TMP, "evidence-multi");
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, "step-1.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    fs.writeFileSync(path.join(evidenceDir, "step-2.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const result = gradeVisual(
      VISUAL_CRITERION,
      path.join(TMP, "artifact.html"),
      evidenceDir,
    );
    expect(result.passFail).toBe("pass");
    expect(result.evidenceCited!.length).toBe(2);
  });
});
