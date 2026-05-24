// palantir-mini v1 — post-compact hook tests (v3.3.0 N3 wave 1)
// Coverage: invariant-OK + non-monotonic detection + missing log + read error
// + post_compact_verified event emission + additionalContext rendering.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import postCompact from "../../hooks/post-compact";
import { readEvents } from "../../lib/event-log/read";

function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-pcompact-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

const tmpRoots: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv["PALANTIR_MINI_PROJECT"]     = process.env["PALANTIR_MINI_PROJECT"];
  savedEnv["PALANTIR_MINI_EVENTS_FILE"] = process.env["PALANTIR_MINI_EVENTS_FILE"];
});

afterEach(() => {
  for (const k of Object.keys(savedEnv)) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

function setupRoot(label: string): string {
  const root = makeTmpRoot(label);
  tmpRoots.push(root);
  process.env["PALANTIR_MINI_PROJECT"]     = root;
  process.env["PALANTIR_MINI_EVENTS_FILE"] = eventsPathFor(root);
  return root;
}

function seedEvent(root: string, sequence: number): void {
  const evt = {
    sequence,
    eventId: `evt-test-${sequence}`,
    type: "edit_committed",
    payload: { actionTypeRid: "X", appliedEdits: [], submissionCriteriaPassed: [] },
    when: `2026-04-26T00:00:0${sequence}.000Z`,
    atopWhich: "deadbeef",
    throughWhich: { sessionId: "test", toolName: "Edit", cwd: root },
    byWhom: { identity: "claude-code", agentName: "claude-code" },
    withWhat: { reasoning: "seed" },
  };
  const dir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, "events.jsonl"), JSON.stringify(evt) + "\n", "utf8");
}

describe("post-compact hook", () => {
  test("missing events.jsonl → invariantOk=true, totalEvents=0, emits verified event", async () => {
    const root = setupRoot("no-log");
    const out = await postCompact({ cwd: root });
    expect(out.message).toContain("ok=true");
    expect(out.additionalContext).toContain("totalEvents=0");
    expect(out.additionalContext).toContain("invariantOk=true");
    const events = readEvents(eventsPathFor(root));
    expect(events.length).toBe(1);
    expect(events[0]!.type).toBe("post_compact_verified");
  });

  test("monotonic events → invariantOk=true, snapshot pre-emit reflects 3 seeded", async () => {
    const root = setupRoot("monotonic");
    seedEvent(root, 1);
    seedEvent(root, 2);
    seedEvent(root, 3);
    const out = await postCompact({ cwd: root });
    expect(out.message).toContain("ok=true");
    // The snapshot of totalEvents is taken BEFORE emit() appends its own event.
    expect(out.additionalContext).toContain("totalEvents=3");
    expect(out.additionalContext).toContain("lastSequence=3");
    const events = readEvents(eventsPathFor(root));
    const verified = events.find((e) => e.type === "post_compact_verified");
    expect(verified).toBeDefined();
    expect((verified!.payload as { invariantOk: boolean }).invariantOk).toBe(true);
  });

  test("non-monotonic events (duplicate seq) → invariantOk=false with note", async () => {
    const root = setupRoot("non-monotonic");
    // readEvents sorts by sequence ASC; to force the monotonicity check to fail
    // we use a duplicate sequence — sort is stable, but check `seq <= prev` triggers.
    seedEvent(root, 1);
    seedEvent(root, 1);
    const out = await postCompact({ cwd: root });
    expect(out.message).toContain("ok=false");
    expect(out.additionalContext).toContain("invariantOk=false");
    expect(out.additionalContext).toContain("non-monotonic");
    const events = readEvents(eventsPathFor(root));
    const verified = events.find((e) => e.type === "post_compact_verified");
    expect((verified!.payload as { invariantOk: boolean; invariantNote?: string }).invariantOk).toBe(false);
    expect((verified!.payload as { invariantNote?: string }).invariantNote).toContain("non-monotonic");
  });

  test("malformed payload (undefined) → graceful, defaults applied", async () => {
    const root = setupRoot("malformed");
    process.env["PALANTIR_MINI_PROJECT"] = root;
    process.env["PALANTIR_MINI_EVENTS_FILE"] = eventsPathFor(root);
    const out = await postCompact(undefined);
    expect(out.message).toContain("post_compact_verified");
    expect(out.additionalContext).toBeDefined();
  });

  test("payload missing cwd uses process.cwd default; sessionId propagated", async () => {
    const root = setupRoot("no-cwd");
    const out = await postCompact({ session_id: "sess-1" });
    expect(out.message).toContain("ok=true");
    const events = readEvents(eventsPathFor(root));
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(String(events[0]!.throughWhich.sessionId)).toBe("sess-1");
  });

  test("additionalContext encodes lastSequence", async () => {
    const root = setupRoot("lastseq");
    seedEvent(root, 7);
    seedEvent(root, 8);
    const out = await postCompact({ cwd: root });
    // Note: emit() will assign next seq=9 to its own verified event,
    // so lastSequence in the snapshot the hook took before emit was 8.
    expect(out.additionalContext).toContain("lastSequence=8");
  });

  test("post_compact_verified payload carries reasoning", async () => {
    const root = setupRoot("reasoning");
    seedEvent(root, 1);
    await postCompact({ cwd: root });
    const events = readEvents(eventsPathFor(root));
    const verified = events.find((e) => e.type === "post_compact_verified");
    expect(verified!.withWhat?.reasoning).toContain("intact post-compaction");
  });
});
