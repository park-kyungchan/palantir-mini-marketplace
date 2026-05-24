/**
 * palantir-mini v2.18.0 — W1 Planner Output Meta-Rubric regression.
 *
 * Covers: scoring math (featureCount / designSpecificity / antiPatternCount),
 * verdict classification (pass | warn | block), and event emission routing
 * (planner_output_graded lands in project's events.jsonl).
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  gradePlannerOutput,
  computeMetaScores,
  metaVerdict,
} from "../../../bridge/handlers/grade_planner_output";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function mkSpec(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-w1-spec-"));
  tmpDirs.push(dir);
  const p = path.join(dir, "spec.md");
  fs.writeFileSync(p, content, "utf8");
  return p;
}

beforeEach(() => {
  for (const k of ["PALANTIR_MINI_PROJECT", "PALANTIR_MINI_EVENTS_FILE"]) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of Object.keys(savedEnv)) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("computeMetaScores", () => {
  test("counts ### F-NN feature sections", () => {
    const spec = Array.from({ length: 13 }, (_, i) => `### F-${String(i + 1).padStart(2, "0")}: feature ${i}`).join("\n");
    expect(computeMetaScores(spec).featureCount).toBe(13);
  });

  test("counts Must/Should/Nice sections as features", () => {
    const spec = "### Must have X\n### Should have Y\n### Nice to have Z";
    expect(computeMetaScores(spec).featureCount).toBe(3);
  });

  test("designSpecificity = 2 when hex+font >= 3", () => {
    const spec = "Color: #E9A24F and #5FC9C5 with #0F1113. font-family: mono";
    expect(computeMetaScores(spec).designSpecificity).toBe(2);
  });

  test("designSpecificity = 1 when 1-2 hits", () => {
    const spec = "Color: #E9A24F only";
    expect(computeMetaScores(spec).designSpecificity).toBe(1);
  });

  test("designSpecificity = 0 when no design signals", () => {
    const spec = "Simple text without design language.";
    expect(computeMetaScores(spec).designSpecificity).toBe(0);
  });

  test("antiPatternCount matches anti-pattern / avoid / never / ❌", () => {
    const spec = "anti-pattern: X. avoid Y. never use Z. ❌ W";
    expect(computeMetaScores(spec).antiPatternCount).toBeGreaterThanOrEqual(4);
  });
});

describe("metaVerdict", () => {
  test("pass when featureCount>=12 + designSpecificity=2 + antiPatternCount>=3", () => {
    expect(metaVerdict({ featureCount: 12, designSpecificity: 2, antiPatternCount: 3 })).toBe("pass");
  });

  test("warn when featureCount>=8 + antiPatternCount>=1", () => {
    expect(metaVerdict({ featureCount: 10, designSpecificity: 1, antiPatternCount: 1 })).toBe("warn");
  });

  test("block when featureCount<8", () => {
    expect(metaVerdict({ featureCount: 5, designSpecificity: 2, antiPatternCount: 5 })).toBe("block");
  });

  test("block when antiPatternCount=0 and featureCount>=8", () => {
    expect(metaVerdict({ featureCount: 10, designSpecificity: 2, antiPatternCount: 0 })).toBe("block");
  });
});

describe("gradePlannerOutput event emission", () => {
  test("emits planner_output_graded event into project events.jsonl", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-w1-proj-"));
    tmpDirs.push(project);
    process.env.PALANTIR_MINI_PROJECT = project;

    const specPath = mkSpec("### F-1: x\n### F-2: y\n### F-3: z");
    const result = await gradePlannerOutput({ specPath, projectPath: project, agentName: "test" });
    expect(result.verdict).toBe("block");
    expect(result.emittedEventCount).toBe(1);

    const eventsLog = path.join(project, ".palantir-mini", "session", "events.jsonl");
    expect(fs.existsSync(eventsLog)).toBe(true);
    const lines = fs.readFileSync(eventsLog, "utf8").trim().split("\n").filter(Boolean);
    const event = JSON.parse(lines[lines.length - 1]!);
    expect(event.type).toBe("planner_output_graded");
    expect(event.payload.verdict).toBe("block");
    expect(event.payload.metaScores.featureCount).toBe(3);
  });

  test("throws if specPath missing", async () => {
    await expect(
      gradePlannerOutput({ specPath: "/nonexistent/spec.md" }),
    ).rejects.toThrow(/spec not found/);
  });
});
