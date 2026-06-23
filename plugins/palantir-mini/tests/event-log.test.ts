// palantir-mini v3.7.0 — Event log test suite (round-trip, fold, monotonicity, race, replay, snapshot, conflict-marker resilience).

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { appendEventAtomic } from "../lib/event-log/append";
import { readEvents, foldToSnapshot } from "../lib/event-log/read";
import { replayLineage } from "../lib/event-log/replay";
import { writeSnapshot, readSnapshot } from "../lib/event-log/snapshot";
import type { EventEnvelope } from "../lib/event-log/types";

function tmpEventsPath(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pm-${label}-`));
  return path.join(dir, "events.jsonl");
}

function makeEvent(type: EventEnvelope["type"], eventId: string, payload: unknown): Omit<EventEnvelope, "sequence"> {
  return {
    type, eventId: eventId as never,
    when: new Date().toISOString(),
    atopWhich: "abc123" as never,
    throughWhich: { sessionId: "sess-1" as never, toolName: "test", cwd: "/tmp" },
    byWhom: { identity: "test-agent" },
    payload,
  } as Omit<EventEnvelope, "sequence">;
}

const makeEditProposed = (i: number) =>
  makeEvent("edit_proposed", `evt-${i}`, { functionName: "editFn", params: { i }, hypotheticalEdits: [] });
const makeEditCommitted = (i: number) =>
  // F1b — a REGISTERED built-in self-ontology verb so the fold's registration-gated
  // edit_committed count includes these rows (presence→registration upgrade).
  makeEvent("edit_committed", `evt-c-${i}`, { actionTypeRid: "pm.self.ontology/action-type/commit-edits", appliedEdits: [], submissionCriteriaPassed: ["criteria-1"] });
const makeSessionStarted = (i: number) =>
  makeEvent("session_started", `evt-s-${i}`, { model: "claude-sonnet-4-6", effort: "high" });

describe("resilience against corrupted trailing content", () => {
  test("appends succeed after git conflict markers at EOF (>>>>>>> Stashed changes)", async () => {
    // Regression guard for 2026-04-23 git-merge-marker-in-events.jsonl bug.
    const eventsPath = tmpEventsPath("conflict-markers");
    await appendEventAtomic(eventsPath, makeSessionStarted(1));
    await appendEventAtomic(eventsPath, makeEditProposed(1));
    fs.appendFileSync(
      eventsPath,
      "<<<<<<< Updated upstream\n" +
      "=======\n" +
      ">>>>>>> Stashed changes\n",
      "utf8",
    );
    const nextSeq = await appendEventAtomic(eventsPath, makeEditCommitted(1));
    expect(nextSeq).toBe(3);
    const content = fs.readFileSync(eventsPath, "utf8");
    expect(content).toContain(">>>>>>> Stashed changes");
    expect(content.trim().endsWith("\"sequence\":3}")).toBe(true);
  });

  test("appends succeed when last line is a torn/partial write", async () => {
    const eventsPath = tmpEventsPath("torn-write");
    await appendEventAtomic(eventsPath, makeSessionStarted(1));
    fs.appendFileSync(eventsPath, '{"type":"edit_proposed","eventId":"torn-', "utf8");
    const seq = await appendEventAtomic(eventsPath, makeEditProposed(1));
    expect(seq).toBe(2);
  });

  test("starts from sequence 1 when no valid JSON line exists", async () => {
    const eventsPath = tmpEventsPath("all-corrupt");
    fs.writeFileSync(eventsPath, "not json\n>>>>>>> stashed\n---\n", "utf8");
    const seq = await appendEventAtomic(eventsPath, makeSessionStarted(1));
    expect(seq).toBe(1);
  });

  test("tail scan walks backward across corrupt content larger than one read chunk", async () => {
    const eventsPath = tmpEventsPath("large-trailing-corrupt");
    await appendEventAtomic(eventsPath, makeSessionStarted(1));
    await appendEventAtomic(eventsPath, makeEditProposed(1));
    fs.appendFileSync(eventsPath, `${"not-json".repeat(10_000)}\n`, "utf8");

    const seq = await appendEventAtomic(eventsPath, makeEditCommitted(1));
    expect(seq).toBe(3);
  });
});

describe("round-trip", () => {
  test("append 10 events and read them back with exact sequence + content", async () => {
    const eventsPath = tmpEventsPath("roundtrip");
    const appended: number[] = [];
    for (let i = 0; i < 10; i++) {
      appended.push(await appendEventAtomic(eventsPath, makeEditProposed(i)));
    }
    expect(appended).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const events = readEvents(eventsPath);
    expect(events).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(events[i]!.sequence).toBe(i + 1);
      expect(events[i]!.type).toBe("edit_proposed");
    }
  });
});

describe("10-variant exhaustive fold", () => {
  test("fold covers all 10 variants in EventSnapshot", async () => {
    const eventsPath = tmpEventsPath("fold10");
    for (let i = 0; i < 3; i++) await appendEventAtomic(eventsPath, makeSessionStarted(i));
    for (let i = 0; i < 5; i++) await appendEventAtomic(eventsPath, makeEditProposed(i));
    for (let i = 0; i < 7; i++) await appendEventAtomic(eventsPath, makeEditCommitted(i));

    const events = readEvents(eventsPath);
    const snap   = foldToSnapshot(events);
    expect(snap.totalEvents).toBe(15);
    expect(snap.session_started).toBe(3);
    expect(snap.edit_proposed).toBe(5);
    expect(snap.edit_committed).toBe(7);
    expect(snap.lastSequence).toBe(15);
  });
});

describe("sequence monotonicity", () => {
  test("100 sequential appends produce strictly monotonic sequences 1..100", async () => {
    const eventsPath = tmpEventsPath("monotonic");
    for (let i = 0; i < 100; i++) await appendEventAtomic(eventsPath, makeEditProposed(i));
    const events = readEvents(eventsPath);
    expect(events).toHaveLength(100);
    for (let i = 0; i < 100; i++) expect(events[i]!.sequence).toBe(i + 1);
  });
});

describe("adversarial 2-writer race (resolves gap-01)", () => {
  test("2 writers × 1000 events = 0 duplicate sequences, 0 torn writes, 0 lost events", async () => {
    const eventsPath = tmpEventsPath("race");
    const EVENTS_PER_WRITER = 1000;
    const TOTAL_EXPECTED    = EVENTS_PER_WRITER * 2;

    async function runWriter(writerId: number): Promise<void> {
      for (let i = 0; i < EVENTS_PER_WRITER; i++) {
        const envelope = makeEditProposed(writerId * 10000 + i);
        envelope.byWhom = { identity: "test-agent", agentName: `writer-${writerId}` };
        await appendEventAtomic(eventsPath, envelope);
      }
    }
    await Promise.all([runWriter(0), runWriter(1)]);

    const events = readEvents(eventsPath);
    expect(events).toHaveLength(TOTAL_EXPECTED);

    const sequences = events.map((e) => e.sequence);
    const unique    = new Set(sequences);
    expect(sequences.length - unique.size).toBe(0);

    const sorted = [...sequences].sort((a, b) => a - b);
    expect(sorted[0]).toBe(1);
    expect(sorted[sorted.length - 1]).toBe(TOTAL_EXPECTED);
    for (let i = 0; i < sorted.length; i++) expect(sorted[i]).toBe(i + 1);
  }, 60000);
});

describe("replay lineage", () => {
  test("filter by eventTypes returns only matching events", async () => {
    const eventsPath = tmpEventsPath("replay");
    for (let i = 0; i < 3; i++) await appendEventAtomic(eventsPath, makeEditProposed(i));
    for (let i = 0; i < 2; i++) await appendEventAtomic(eventsPath, makeEditCommitted(i));
    for (let i = 0; i < 4; i++) await appendEventAtomic(eventsPath, makeSessionStarted(i));

    const r1 = replayLineage(eventsPath, { eventTypes: ["edit_proposed"] });
    expect(r1.matched).toBe(3);
    expect(r1.events.every((e) => e.type === "edit_proposed")).toBe(true);

    const r2 = replayLineage(eventsPath, { eventTypes: ["edit_committed", "session_started"] });
    expect(r2.matched).toBe(6);

    const r3 = replayLineage(eventsPath, { fromSequence: 4, toSequence: 6 });
    expect(r3.matched).toBe(3);
  });

  test("filter by byWhom.agentName matches correctly", async () => {
    const eventsPath = tmpEventsPath("replay-by-whom");
    const a = makeEditProposed(0); a.byWhom = { identity: "test-agent", agentName: "alice" };
    const b = makeEditProposed(1); b.byWhom = { identity: "test-agent", agentName: "bob"   };
    const c = makeEditProposed(2); c.byWhom = { identity: "test-agent", agentName: "alice" };
    await appendEventAtomic(eventsPath, a);
    await appendEventAtomic(eventsPath, b);
    await appendEventAtomic(eventsPath, c);

    const r = replayLineage(eventsPath, { byWhom: { agentName: "alice" } });
    expect(r.matched).toBe(2);
  });
});

describe("snapshot derivation", () => {
  test("writeSnapshot / readSnapshot round-trip", async () => {
    const eventsPath  = tmpEventsPath("snap");
    const snapshotDir = path.join(path.dirname(eventsPath), "snapshots");

    for (let i = 0; i < 5; i++) await appendEventAtomic(eventsPath, makeEditProposed(i));
    const wrote = writeSnapshot(eventsPath, snapshotDir);
    expect(wrote.manifest.atSequence).toBe(5);
    expect(wrote.snapshot.edit_proposed).toBe(5);
    expect(wrote.snapshot.totalEvents).toBe(5);

    const read = readSnapshot(snapshotDir);
    expect(read).not.toBeNull();
    expect(read!.manifest.atSequence).toBe(5);
    expect(read!.snapshot.edit_proposed).toBe(5);
  });
});
