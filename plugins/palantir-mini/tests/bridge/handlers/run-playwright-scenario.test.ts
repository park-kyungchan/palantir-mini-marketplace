// palantir-mini v3.7.0 — run_playwright_scenario handler tests (C.E.2)
// Coverage: validation, ad-hoc + sprint evidence dir layout, scenario.json
// persisted, mcpToolBinding default + override, instructions text shape,
// playwright_scenario_executed event emission.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import runPlaywrightScenario from "../../../bridge/handlers/run-playwright-scenario";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpProject(): { project: string; eventsPath: string } {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pws-"));
  tmpDirs.push(project);
  fs.mkdirSync(path.join(project, ".palantir-mini", "session"), { recursive: true });
  return { project, eventsPath: path.join(project, ".palantir-mini", "session", "events.jsonl") };
}

const minimalScenario = {
  url: "http://localhost:3000",
  steps: [
    { kind: "navigate", label: "open page" },
    { kind: "click", selector: "#submit", label: "submit form" },
  ],
};

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

describe("runPlaywrightScenario — validation", () => {
  test("missing scenarioId throws", async () => {
    await expect(runPlaywrightScenario({})).rejects.toThrow(/scenarioId/);
  });

  test("missing scenario throws", async () => {
    await expect(runPlaywrightScenario({ scenarioId: "x" })).rejects.toThrow(/scenario\.url/);
  });

  test("missing scenario.url throws", async () => {
    await expect(
      runPlaywrightScenario({ scenarioId: "x", scenario: { steps: [] } as never }),
    ).rejects.toThrow(/scenario\.url/);
  });
});

describe("runPlaywrightScenario — ad-hoc evidence dir", () => {
  test("creates ad-hoc evidence dir + scenario.json + emits event", async () => {
    const { project, eventsPath } = makeTmpProject();
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
    const result = await runPlaywrightScenario({
      scenarioId: "scenario-foo",
      scenario: minimalScenario,
      projectPath: project,
    });
    expect(result.scenarioId).toBe("scenario-foo");
    expect(result.evidenceDir).toContain(".palantir-mini/harness/ad-hoc-scenarios/scenario-foo-");
    expect(fs.existsSync(result.scenarioSpecPath)).toBe(true);
    const spec = JSON.parse(fs.readFileSync(result.scenarioSpecPath, "utf8"));
    expect(spec.scenarioId).toBe("scenario-foo");
    expect(spec.url).toBe("http://localhost:3000");

    const events = fs.readFileSync(eventsPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const pwsEvent = events.find((e: { type: string }) => e.type === "playwright_scenario_executed");
    expect(pwsEvent).toBeDefined();
    expect(pwsEvent.payload.scenarioId).toBe("scenario-foo");
    expect(pwsEvent.payload.state).toBe("instructions_issued");
  });
});

describe("runPlaywrightScenario — sprint evidence dir", () => {
  test("uses sprint+iteration directory layout when supplied", async () => {
    const { project, eventsPath } = makeTmpProject();
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
    const result = await runPlaywrightScenario({
      scenarioId: "scenario-sprint",
      scenario: minimalScenario,
      sprintNumber: 3,
      iteration: 2,
      projectPath: project,
    });
    expect(result.evidenceDir).toContain("sprints/sprint-003/iterations/iteration-002/evidence/scenario-sprint");
  });
});

describe("runPlaywrightScenario — mcpToolBinding", () => {
  test("defaults to mcp__playwright__*", async () => {
    const { project, eventsPath } = makeTmpProject();
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
    const result = await runPlaywrightScenario({
      scenarioId: "s1",
      scenario: minimalScenario,
      projectPath: project,
    });
    expect(result.mcpToolBinding).toBe("mcp__playwright__*");
  });

  test("respects mcp__claude-in-chrome__* override", async () => {
    const { project, eventsPath } = makeTmpProject();
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
    const result = await runPlaywrightScenario({
      scenarioId: "s2",
      scenario: { ...minimalScenario, mcpToolBinding: "mcp__claude-in-chrome__*" },
      projectPath: project,
    });
    expect(result.mcpToolBinding).toBe("mcp__claude-in-chrome__*");
  });
});

describe("runPlaywrightScenario — instructions", () => {
  test("includes navigate URL and step list", async () => {
    const { project, eventsPath } = makeTmpProject();
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;
    const result = await runPlaywrightScenario({
      scenarioId: "s3",
      scenario: {
        ...minimalScenario,
        preconditions: ["page loaded"],
        postconditions: ["form cleared"],
      },
      projectPath: project,
    });
    expect(result.instructionsForEvaluator).toContain("Navigate to: http://localhost:3000");
    expect(result.instructionsForEvaluator).toContain("page loaded");
    expect(result.instructionsForEvaluator).toContain("form cleared");
    expect(result.instructionsForEvaluator).toContain("submit form");
  });
});
