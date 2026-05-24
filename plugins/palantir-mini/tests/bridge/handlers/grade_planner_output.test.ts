// palantir-mini v3.7.0 — grade_planner_output handler tests (C.F.1)
// Coverage: computeMetaScores regex, metaVerdict thresholds, validation,
// emit planner_output_graded event. NO claude -p mock needed (pure fs+emit).

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import gradePlannerOutputHandler, {
  gradePlannerOutput,
  computeMetaScores,
  metaVerdict,
} from "../../../bridge/handlers/grade_planner_output";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpProject(): { project: string; eventsPath: string } {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-grade-planner-"));
  tmpDirs.push(project);
  fs.mkdirSync(path.join(project, ".palantir-mini", "session"), { recursive: true });
  return { project, eventsPath: path.join(project, ".palantir-mini", "session", "events.jsonl") };
}

function writeSpec(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-grade-planner-spec-"));
  tmpDirs.push(dir);
  const file = path.join(dir, "spec.md");
  fs.writeFileSync(file, content);
  return file;
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_PROJECT === undefined) delete process.env.PALANTIR_MINI_PROJECT;
  else process.env.PALANTIR_MINI_PROJECT = savedEnv.PALANTIR_MINI_PROJECT;
  if (savedEnv.PALANTIR_MINI_EVENTS_FILE === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
  else process.env.PALANTIR_MINI_EVENTS_FILE = savedEnv.PALANTIR_MINI_EVENTS_FILE;
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("computeMetaScores", () => {
  test("counts F-N feature headers", () => {
    const spec = "### F-1 Login\n### F-2 Signup\n### F-3 Reset\n";
    const scores = computeMetaScores(spec);
    expect(scores.featureCount).toBeGreaterThanOrEqual(3);
  });

  test("counts hex + font-family for designSpecificity", () => {
    const spec = "color: #ff0000\nfont-family: Inter\nbackground: #00ff00\nfont-family: Arial";
    const scores = computeMetaScores(spec);
    expect(scores.designSpecificity).toBe(2);
  });

  test("designSpecificity 1 for 1-2 hits", () => {
    const spec = "color: #ff0000";
    const scores = computeMetaScores(spec);
    expect(scores.designSpecificity).toBe(1);
  });

  test("designSpecificity 0 for no hex/font-family", () => {
    const spec = "Plain text only.";
    const scores = computeMetaScores(spec);
    expect(scores.designSpecificity).toBe(0);
  });

  test("counts anti-pattern markers", () => {
    const spec = "Avoid X.\nNever Y.\n❌ Z.\nanti-pattern: bad.";
    const scores = computeMetaScores(spec);
    expect(scores.antiPatternCount).toBeGreaterThanOrEqual(3);
  });
});

describe("metaVerdict", () => {
  test("pass requires 12+ features + designSpecificity=2 + 3+ anti-patterns", () => {
    expect(metaVerdict({ featureCount: 12, designSpecificity: 2, antiPatternCount: 3 })).toBe("pass");
    expect(metaVerdict({ featureCount: 11, designSpecificity: 2, antiPatternCount: 3 })).not.toBe("pass");
    expect(metaVerdict({ featureCount: 12, designSpecificity: 1, antiPatternCount: 3 })).not.toBe("pass");
    expect(metaVerdict({ featureCount: 12, designSpecificity: 2, antiPatternCount: 2 })).not.toBe("pass");
  });

  test("warn requires 8+ features + 1+ anti-patterns", () => {
    expect(metaVerdict({ featureCount: 9, designSpecificity: 1, antiPatternCount: 1 })).toBe("warn");
    expect(metaVerdict({ featureCount: 7, designSpecificity: 1, antiPatternCount: 1 })).toBe("block");
  });

  test("block when neither pass nor warn criteria met", () => {
    expect(metaVerdict({ featureCount: 0, designSpecificity: 0, antiPatternCount: 0 })).toBe("block");
  });
});

describe("gradePlannerOutput handler", () => {
  test("missing spec file throws", async () => {
    await expect(
      gradePlannerOutput({ specPath: "/no/such/spec.md" }),
    ).rejects.toThrow(/spec not found/);
  });

  test("happy path returns verdict + reasoning + emits planner_output_graded event", async () => {
    const { project, eventsPath } = makeTmpProject();
    const spec = writeSpec(
      [
        "### F-1 a",
        "### F-2 b",
        "### F-3 c",
        "### F-4 d",
        "### F-5 e",
        "### F-6 f",
        "### F-7 g",
        "### F-8 h",
        "### F-9 i",
        "### F-10 j",
        "### F-11 k",
        "### F-12 l",
        "color: #ff0000",
        "font-family: Inter",
        "background: #00ff00",
        "Avoid duplication.",
        "Never persist secrets.",
        "❌ Direct DB writes.",
      ].join("\n"),
    );
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
    const result = await gradePlannerOutput({ specPath: spec, projectPath: project });
    expect(result.verdict).toBe("pass");
    expect(result.metaScores.featureCount).toBeGreaterThanOrEqual(12);
    expect(result.emittedEventCount).toBe(1);
    expect(result.reasoning).toContain("featureCount=");

    const events = fs
      .readFileSync(eventsPath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    const graded = events.find((e: { type: string }) => e.type === "planner_output_graded");
    expect(graded).toBeDefined();
    expect(graded.payload.verdict).toBe("pass");
  });

  test("returns block verdict for sparse spec", async () => {
    const { project, eventsPath } = makeTmpProject();
    const spec = writeSpec("# Empty plan\nJust a header.\n");
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
    const result = await gradePlannerOutput({ specPath: spec, projectPath: project });
    expect(result.verdict).toBe("block");
  });

  test("default handler delegates to gradePlannerOutput", async () => {
    const { project, eventsPath } = makeTmpProject();
    const spec = writeSpec("### F-1 only\n");
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
    const result = await gradePlannerOutputHandler({ specPath: spec, projectPath: project });
    expect(result).toBeDefined();
    expect(result.verdict).toBe("block");
  });
});
