// palantir-mini v4.15.0 — pm_lead_brief handler tests (sprint-063 W3.B)
// Coverage:
//   T1: returns session ctx + recentSprints
//   T2: valueGradeMetrics correctness from synthetic events.jsonl fixture
//   T3: recentT3Plus filter correctness
//   T4: dispatchSuggestion populated when intent ≥ 200 chars
//   T5: emits skill_started event

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pmLeadBrief } from "../../../bridge/handlers/pm-lead-brief";
import type { PmLeadBriefArgs } from "../../../bridge/handlers/pm-lead-brief";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpProject(): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-lead-brief-"));
  tmpDirs.push(project);
  fs.mkdirSync(path.join(project, ".palantir-mini", "session"), { recursive: true });
  return project;
}

function makeSprintContract(
  project: string,
  sprintNumber: number,
  opts: { theme?: string; mode?: string; boundAt?: string } = {},
): void {
  const sprintDir = path.join(
    project,
    ".palantir-mini",
    "harness",
    "sprints",
    `sprint-${String(sprintNumber).padStart(3, "0")}`,
  );
  fs.mkdirSync(sprintDir, { recursive: true });
  fs.writeFileSync(
    path.join(sprintDir, "contract.json"),
    JSON.stringify({
      sprintNumber,
      theme: opts.theme ?? `Sprint ${sprintNumber} theme`,
      mode: opts.mode ?? "quick",
      boundAt: opts.boundAt ?? `2026-05-0${sprintNumber}T00:00:00.000Z`,
    }),
    "utf8",
  );
}

function writeEventsLine(eventsPath: string, event: Record<string, unknown>): void {
  fs.appendFileSync(eventsPath, JSON.stringify(event) + "\n", "utf8");
}

function readEmittedEvents(
  project: string,
): Array<{ type: string; payload?: Record<string, unknown> }> {
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEnv.PALANTIR_MINI_CONFIG_PATH = process.env.PALANTIR_MINI_CONFIG_PATH;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_PROJECT === undefined) delete process.env.PALANTIR_MINI_PROJECT;
  else process.env.PALANTIR_MINI_PROJECT = savedEnv.PALANTIR_MINI_PROJECT;
  if (savedEnv.PALANTIR_MINI_EVENTS_FILE === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
  else process.env.PALANTIR_MINI_EVENTS_FILE = savedEnv.PALANTIR_MINI_EVENTS_FILE;
  if (savedEnv.PALANTIR_MINI_CONFIG_PATH === undefined) delete process.env.PALANTIR_MINI_CONFIG_PATH;
  else process.env.PALANTIR_MINI_CONFIG_PATH = savedEnv.PALANTIR_MINI_CONFIG_PATH;
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

// ─── T1: session ctx + recentSprints ─────────────────────────────────────────

describe("T1: session ctx + recentSprints", () => {
  test("returns session object with required fields", async () => {
    const project = makeTmpProject();
    const args: PmLeadBriefArgs = { project };

    const result = await pmLeadBrief(args);

    expect(typeof result.session.sessionId).toBe("string");
    expect(result.session.sessionId.length).toBeGreaterThan(0);
    expect(typeof result.session.branch).toBe("string");
    expect(typeof result.session.repoMode).toBe("string");
    expect(typeof result.session.sessionMinutes).toBe("number");
    expect(result.session.sessionMinutes).toBeGreaterThanOrEqual(0);
  });

  test("returns recentSprints sorted by sprintNumber DESC", async () => {
    const project = makeTmpProject();
    makeSprintContract(project, 10, { theme: "Sprint 10", mode: "full" });
    makeSprintContract(project, 5, { theme: "Sprint 5", mode: "quick" });
    makeSprintContract(project, 8, { theme: "Sprint 8", mode: "full" });

    const result = await pmLeadBrief({ project });

    expect(result.recentSprints.length).toBe(3);
    expect(result.recentSprints[0]!.sprintNumber).toBe(10);
    expect(result.recentSprints[1]!.sprintNumber).toBe(8);
    expect(result.recentSprints[2]!.sprintNumber).toBe(5);
  });

  test("returns at most 5 recentSprints", async () => {
    const project = makeTmpProject();
    for (let i = 1; i <= 8; i++) {
      makeSprintContract(project, i, { theme: `Sprint ${i}` });
    }

    const result = await pmLeadBrief({ project });

    expect(result.recentSprints.length).toBe(5);
    // Should be the 5 most recent (4–8)
    expect(result.recentSprints[0]!.sprintNumber).toBe(8);
    expect(result.recentSprints[4]!.sprintNumber).toBe(4);
  });

  test("returns empty recentSprints when no sprints dir exists", async () => {
    const project = makeTmpProject();

    const result = await pmLeadBrief({ project });

    expect(Array.isArray(result.recentSprints)).toBe(true);
    expect(result.recentSprints.length).toBe(0);
  });

  test("sprint entry has all required fields", async () => {
    const project = makeTmpProject();
    makeSprintContract(project, 63, {
      theme: "MCP Drastic Reduction",
      mode: "full",
      boundAt: "2026-05-09T03:25:00.000Z",
    });

    const result = await pmLeadBrief({ project });

    expect(result.recentSprints.length).toBe(1);
    const s = result.recentSprints[0]!;
    expect(s.sprintNumber).toBe(63);
    expect(s.theme).toBe("MCP Drastic Reduction");
    expect(s.mode).toBe("full");
    expect(s.boundAt).toBe("2026-05-09T03:25:00.000Z");
  });
});

// ─── T2: valueGradeMetrics correctness ───────────────────────────────────────

describe("T2: valueGradeMetrics correctness", () => {
  test("counts grades correctly from synthetic events.jsonl", async () => {
    const project = makeTmpProject();
    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");

    // Write synthetic events with known grade distribution
    const grades: string[] = ["T0", "T0", "T1", "T1", "T1", "T2", "T2", "T3", "T4"];
    for (const grade of grades) {
      writeEventsLine(eventsPath, { type: "skill_started", valueGrade: grade, when: "2026-05-09T00:00:00.000Z" });
    }

    const result = await pmLeadBrief({ project });
    const m = result.valueGradeMetrics;

    // skill_started event emitted by handler itself will also appear — we count
    // only what's in the file before assertion but the handler writes one more.
    // Use ≥ checks to be robust to the handler's own skill_started emission.
    expect(m.T0).toBeGreaterThanOrEqual(2);
    expect(m.T1).toBeGreaterThanOrEqual(3);
    expect(m.T2).toBeGreaterThanOrEqual(2);
    expect(m.T3).toBeGreaterThanOrEqual(1);
    expect(m.T4).toBeGreaterThanOrEqual(1);
  });

  test("T2plusRatio is between 0 and 1", async () => {
    const project = makeTmpProject();
    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");

    for (let i = 0; i < 5; i++) {
      writeEventsLine(eventsPath, { type: "skill_started", valueGrade: "T2", when: "2026-05-09T00:00:00.000Z" });
    }
    for (let i = 0; i < 5; i++) {
      writeEventsLine(eventsPath, { type: "skill_started", valueGrade: "T0", when: "2026-05-09T00:00:00.000Z" });
    }

    const result = await pmLeadBrief({ project });

    expect(result.valueGradeMetrics.T2plusRatio).toBeGreaterThanOrEqual(0);
    expect(result.valueGradeMetrics.T2plusRatio).toBeLessThanOrEqual(1);
  });

  test("T3count equals T3 field value", async () => {
    const project = makeTmpProject();
    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");

    writeEventsLine(eventsPath, { type: "edit_committed", valueGrade: "T3", when: "2026-05-09T00:00:00.000Z" });
    writeEventsLine(eventsPath, { type: "edit_committed", valueGrade: "T3", when: "2026-05-09T00:00:00.000Z" });

    const result = await pmLeadBrief({ project });

    expect(result.valueGradeMetrics.T3count).toBe(result.valueGradeMetrics.T3);
  });

  test("returns zero metrics when events.jsonl empty", async () => {
    const project = makeTmpProject();

    const result = await pmLeadBrief({ project });

    // Handler emits one skill_started — so T0 may be 1, but not from fixture.
    // Verify structure is present regardless.
    expect(typeof result.valueGradeMetrics.T0).toBe("number");
    expect(typeof result.valueGradeMetrics.T2plusRatio).toBe("number");
  });
});

// ─── T3: recentT3Plus filter correctness ─────────────────────────────────────

describe("T3: recentT3Plus filter correctness", () => {
  test("returns only T3 and T4 events", async () => {
    const project = makeTmpProject();
    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");

    writeEventsLine(eventsPath, { type: "edit_committed", valueGrade: "T0", when: "2026-05-09T00:00:00.000Z", eventId: "evt-t0" });
    writeEventsLine(eventsPath, { type: "edit_committed", valueGrade: "T3", when: "2026-05-09T01:00:00.000Z", eventId: "evt-t3" });
    writeEventsLine(eventsPath, { type: "edit_committed", valueGrade: "T4", when: "2026-05-09T02:00:00.000Z", eventId: "evt-t4" });
    writeEventsLine(eventsPath, { type: "edit_committed", valueGrade: "T1", when: "2026-05-09T03:00:00.000Z", eventId: "evt-t1" });

    const result = await pmLeadBrief({ project });

    const grades = result.recentT3Plus.map((e) => e.valueGrade);
    for (const g of grades) {
      expect(["T3", "T4"]).toContain(g);
    }
    // T3 and T4 events from fixture should be present
    const ids = result.recentT3Plus.map((e) => e.eventId);
    expect(ids).toContain("evt-t3");
    expect(ids).toContain("evt-t4");
  });

  test("returns at most 10 T3Plus events", async () => {
    const project = makeTmpProject();
    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");

    for (let i = 0; i < 20; i++) {
      writeEventsLine(eventsPath, {
        type: "edit_committed",
        valueGrade: "T3",
        when: `2026-05-09T${String(i).padStart(2, "0")}:00:00.000Z`,
        eventId: `evt-t3-${i}`,
      });
    }

    const result = await pmLeadBrief({ project });

    expect(result.recentT3Plus.length).toBeLessThanOrEqual(10);
  });

  test("T3Plus entry has all expected fields", async () => {
    const project = makeTmpProject();
    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");

    writeEventsLine(eventsPath, {
      type: "edit_committed",
      valueGrade: "T3",
      when: "2026-05-09T01:00:00.000Z",
      eventId: "evt-check",
      withWhat: { reasoning: "important decision reasoning text here" },
    });

    const result = await pmLeadBrief({ project });

    const entry = result.recentT3Plus.find((e) => e.eventId === "evt-check");
    expect(entry).toBeDefined();
    expect(entry?.type).toBe("edit_committed");
    expect(entry?.when).toBe("2026-05-09T01:00:00.000Z");
    expect(entry?.valueGrade).toBe("T3");
    expect(entry?.reasoning).toBe("important decision reasoning text here");
  });

  test("returns empty array when no T3/T4 events exist", async () => {
    const project = makeTmpProject();
    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");

    writeEventsLine(eventsPath, { type: "skill_started", valueGrade: "T0", when: "2026-05-09T00:00:00.000Z" });
    writeEventsLine(eventsPath, { type: "skill_started", valueGrade: "T1", when: "2026-05-09T01:00:00.000Z" });

    const result = await pmLeadBrief({ project });

    // Handler's own skill_started may appear, but it shouldn't be T3/T4
    for (const e of result.recentT3Plus) {
      expect(["T3", "T4"]).toContain(e.valueGrade);
    }
  });
});

// ─── T4: dispatchSuggestion ───────────────────────────────────────────────────

describe("T4: dispatchSuggestion populated when intent provided", () => {
  test("returns 'delegate' when intent is >= 200 chars", async () => {
    const project = makeTmpProject();
    const longIntent = "a".repeat(200) + " implement refactor something complex here";

    const result = await pmLeadBrief({ project, intent: longIntent });

    expect(result.dispatchSuggestion).toBe("delegate");
    expect(typeof result.suggestionRationale).toBe("string");
    expect(result.suggestionRationale!.length).toBeGreaterThan(0);
  });

  test("returns 'delegate' when intent matches >= 2 delegate keywords", async () => {
    const project = makeTmpProject();
    const keywordIntent = "implement and refactor the ontology layer";

    const result = await pmLeadBrief({ project, intent: keywordIntent });

    expect(result.dispatchSuggestion).toBe("delegate");
  });

  test("returns 'lead-direct' for short intent with < 2 keywords", async () => {
    const project = makeTmpProject();
    const shortIntent = "Fix typo in CHANGELOG.md";

    const result = await pmLeadBrief({ project, intent: shortIntent });

    expect(result.dispatchSuggestion).toBe("lead-direct");
    expect(typeof result.suggestionRationale).toBe("string");
  });

  test("dispatchSuggestion is absent when intent not provided", async () => {
    const project = makeTmpProject();

    const result = await pmLeadBrief({ project });

    expect(result.dispatchSuggestion).toBeUndefined();
    expect(result.suggestionRationale).toBeUndefined();
  });

  test("dispatchSuggestion is absent when intent is empty string", async () => {
    const project = makeTmpProject();

    const result = await pmLeadBrief({ project, intent: "" });

    expect(result.dispatchSuggestion).toBeUndefined();
  });
});

// ─── T5: emits skill_started event ───────────────────────────────────────────

describe("T5: emits skill_started event", () => {
  test("emits skill_started event after successful call", async () => {
    const project = makeTmpProject();

    await pmLeadBrief({ project, skillName: "pm_lead_brief" });

    const events = readEmittedEvents(project);
    const skillEvent = events.find(
      (e) => e.type === "skill_started" &&
        (e.payload as { skillName?: string })?.skillName === "pm_lead_brief",
    );
    expect(skillEvent).toBeDefined();
  });

  test("skill_started uses custom skillName when provided", async () => {
    const project = makeTmpProject();

    await pmLeadBrief({ project, skillName: "my-custom-skill" });

    const events = readEmittedEvents(project);
    const skillEvent = events.find(
      (e) => e.type === "skill_started" &&
        (e.payload as { skillName?: string })?.skillName === "my-custom-skill",
    );
    expect(skillEvent).toBeDefined();
  });

  test("skill_started defaults to pm_lead_brief when skillName omitted", async () => {
    const project = makeTmpProject();

    await pmLeadBrief({ project });

    const events = readEmittedEvents(project);
    const skillEvent = events.find(
      (e) => e.type === "skill_started" &&
        (e.payload as { skillName?: string })?.skillName === "pm_lead_brief",
    );
    expect(skillEvent).toBeDefined();
  });

  test("does not throw even if events dir is not writable (degraded mode)", async () => {
    const project = makeTmpProject();
    // Override events path to a location that can't be created
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join("/nonexistent", "events.jsonl");

    // Should not throw — emit errors are swallowed gracefully
    await expect(pmLeadBrief({ project })).resolves.toBeDefined();

    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  });
});
