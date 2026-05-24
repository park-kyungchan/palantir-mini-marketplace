// palantir-mini v3.6.0 — handler tests batch 6 (A7 trim, fixtures extracted).
// Covers: pm_retro_query, pm_learn_query, lib/event-log/learning-view.ts, foldToSnapshot.

import { test, expect, describe } from "bun:test";
import * as path from "path";

import pmRetroQuery  from "../../bridge/handlers/pm-retro-query";
import pmLearnQuery  from "../../bridge/handlers/pm-learn-query";
import { queryLearnings } from "../../lib/event-log/learning-view";
import { foldToSnapshot, readEvents } from "../../lib/event-log/read";

import { tmpProject, writeEventsJsonl } from "./batch6-retro-learn/fixtures";

describe("pm_retro_query", () => {
  test("happy: returns zeros when events.jsonl is missing", async () => {
    const dir = tmpProject();
    const res = await pmRetroQuery({ projectRoot: dir });
    expect(res.sessionMinutes).toBe(0);
    expect(res.phaseCompletedCount).toBe(0);
    expect(res.skillsRun).toEqual([]);
    expect(res.staleReplayCount).toBe(0);
  });

  test("happy: aggregates phase_completed + skill runs in last session window", async () => {
    const dir = tmpProject();
    writeEventsJsonl(dir, [
      { type: "session_started", payload: { model: "opus", effort: "high" }, when: "2026-04-19T10:00:00.000Z" },
      { type: "skill_started",   payload: { skillName: "pm-office-hours" }, when: "2026-04-19T10:01:00.000Z" },
      { type: "skill_completed", payload: { skillName: "pm-office-hours", durationMs: 2000, outcome: "success" }, when: "2026-04-19T10:02:00.000Z" },
      { type: "skill_started",   payload: { skillName: "pm-office-hours" }, when: "2026-04-19T10:03:00.000Z" },
      { type: "skill_completed", payload: { skillName: "pm-office-hours", durationMs: 4000, outcome: "success" }, when: "2026-04-19T10:04:00.000Z" },
      { type: "phase_completed", payload: { phaseTag: "A5-W1", taskId: "#16", validations: ["tsc"] }, when: "2026-04-19T10:30:00.000Z" },
    ]);
    const res = await pmRetroQuery({ projectRoot: dir });
    expect(res.phaseCompletedCount).toBe(1);
    expect(res.sessionMinutes).toBe(30);
    expect(res.skillsRun.length).toBe(1);
    expect(res.skillsRun[0]?.skill).toBe("pm-office-hours");
    expect(res.skillsRun[0]?.count).toBe(2);
    expect(res.skillsRun[0]?.avgDurationMs).toBe(3000);
  });

  test("happy: counts stale replays from inbox_cleaned events", async () => {
    const dir = tmpProject();
    writeEventsJsonl(dir, [
      { type: "session_started", payload: { model: "opus", effort: "high" } },
      { type: "inbox_cleaned",   payload: { taskId: "#t1", removedCount: 2, inboxFiles: ["a.json"] } },
      { type: "inbox_cleaned",   payload: { taskId: "#t2", removedCount: 1, inboxFiles: ["b.json"] } },
    ]);
    const res = await pmRetroQuery({ projectRoot: dir });
    expect(res.staleReplayCount).toBe(3);
  });

  test("happy: byAgent bucketing when flag set", async () => {
    const dir = tmpProject();
    writeEventsJsonl(dir, [
      { type: "session_started", payload: { model: "opus", effort: "high" }, byWhom: { identity: "claude-code", agentName: "lead" } },
      { type: "phase_completed", payload: { phaseTag: "x", taskId: "1", validations: [] }, byWhom: { identity: "claude-code", agentName: "implementer" } },
      { type: "phase_completed", payload: { phaseTag: "y", taskId: "2", validations: [] }, byWhom: { identity: "claude-code", agentName: "implementer" } },
    ]);
    const res = await pmRetroQuery({ projectRoot: dir, byAgent: true });
    expect(res.byAgent).toBeDefined();
    expect(res.byAgent?.["lead"]).toBe(1);
    expect(res.byAgent?.["implementer"]).toBe(2);
  });

  test("happy: slices to N-from-end session window", async () => {
    const dir = tmpProject();
    writeEventsJsonl(dir, [
      { type: "session_started", payload: { model: "a", effort: "x" } },
      { type: "phase_completed", payload: { phaseTag: "old", taskId: "1", validations: [] } },
      { type: "session_started", payload: { model: "b", effort: "y" } },
      { type: "phase_completed", payload: { phaseTag: "new", taskId: "2", validations: [] } },
    ]);
    const latest = await pmRetroQuery({ projectRoot: dir, sessionLast: 1 });
    expect(latest.phaseCompletedCount).toBe(1);
    const prior = await pmRetroQuery({ projectRoot: dir, sessionLast: 2 });
    expect(prior.phaseCompletedCount).toBeGreaterThanOrEqual(1);
  });
});

describe("pm_learn_query", () => {
  test("happy: returns empty when no learning_captured events", async () => {
    const dir = tmpProject();
    const res = await pmLearnQuery({ projectRoot: dir });
    expect(res.count).toBe(0);
    expect(res.learnings).toEqual([]);
  });

  test("happy: projects learning_captured events into LearningView[]", async () => {
    const dir = tmpProject();
    writeEventsJsonl(dir, [
      { type: "learning_captured", payload: { topic: "testing", content: "use bun test", confidence: 0.9, source: "rule-07" }, when: "2026-04-19T09:00:00.000Z" },
      { type: "learning_captured", payload: { topic: "testing", content: "mock modules sparingly", confidence: 0.8 }, when: "2026-04-19T10:00:00.000Z" },
    ]);
    const res = await pmLearnQuery({ projectRoot: dir });
    expect(res.count).toBe(2);
    expect(res.learnings[0]?.confidence).toBe(0.9);
    expect(res.learnings[0]?.topic).toBe("testing");
    expect(res.learnings[0]?.source).toBe("rule-07");
    expect(res.learnings[0]?.byWhom).toContain("tester");
  });

  test("happy: filters by minConfidence", async () => {
    const dir = tmpProject();
    writeEventsJsonl(dir, [
      { type: "learning_captured", payload: { topic: "a", content: "x", confidence: 0.3 } },
      { type: "learning_captured", payload: { topic: "a", content: "y", confidence: 0.9 } },
    ]);
    const res = await pmLearnQuery({ projectRoot: dir, minConfidence: 0.5 });
    expect(res.count).toBe(1);
    expect(res.learnings[0]?.confidence).toBe(0.9);
  });

  test("happy: filters by topic substring case-insensitive", async () => {
    const dir = tmpProject();
    writeEventsJsonl(dir, [
      { type: "learning_captured", payload: { topic: "Testing", content: "a", confidence: 0.5 } },
      { type: "learning_captured", payload: { topic: "deployment", content: "b", confidence: 0.6 } },
    ]);
    const res = await pmLearnQuery({ projectRoot: dir, topic: "test" });
    expect(res.count).toBe(1);
    expect(res.learnings[0]?.topic).toBe("Testing");
  });

  test("happy: respects limit", async () => {
    const dir = tmpProject();
    const events = [];
    for (let i = 0; i < 15; i++) {
      events.push({ type: "learning_captured", payload: { topic: `t${i}`, content: "c", confidence: 0.5 + (i / 100) } });
    }
    writeEventsJsonl(dir, events);
    const res = await pmLearnQuery({ projectRoot: dir, limit: 5 });
    expect(res.count).toBe(5);
    expect(res.learnings[0]?.confidence).toBeCloseTo(0.64, 2);
  });

  test("happy: queryLearnings default limit is 10", () => {
    const dir = tmpProject();
    const events = [];
    for (let i = 0; i < 20; i++) {
      events.push({ type: "learning_captured", payload: { topic: `t${i}`, content: "c", confidence: 0.5 } });
    }
    writeEventsJsonl(dir, events);
    const learnings = queryLearnings({ projectRoot: dir });
    expect(learnings.length).toBe(10);
  });
});

describe("foldToSnapshot v1.5 counters", () => {
  test("counts new event types", () => {
    const dir = tmpProject();
    writeEventsJsonl(dir, [
      { type: "skill_started",     payload: { skillName: "s" } },
      { type: "skill_completed",   payload: { skillName: "s", durationMs: 100, outcome: "success" } },
      { type: "learning_captured", payload: { topic: "t", content: "c", confidence: 0.5 } },
      { type: "retro_emitted",     payload: { sessionMinutes: 60, summaryText: "ok" } },
      { type: "plan_reviewed",     payload: { planPath: "/p.md", reviewerAgent: "lead", approved: true } },
    ]);
    const eventsPath = path.join(dir, ".palantir-mini", "session", "events.jsonl");
    const events    = readEvents(eventsPath);
    const snap      = foldToSnapshot(events);
    expect(snap.skill_started).toBe(1);
    expect(snap.skill_completed).toBe(1);
    expect(snap.learning_captured).toBe(1);
    expect(snap.retro_emitted).toBe(1);
    expect(snap.plan_reviewed).toBe(1);
    expect(snap.totalEvents).toBe(5);
  });
});
