// palantir-mini v2.8.2 — Session 3 Slice 1 (B-15) handler latency instrumentation tests.
// Covers: now / elapsedMs precision; classifyError taxonomy (Error subclass + ENOENT
// + non-Error throws); emitToolInvocationCompleted envelope shape (5-dim + payload);
// errorClass present on failure path / absent on success path.

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  classifyError,
  elapsedMs,
  emitToolInvocationCompleted,
  now,
} from "../../../lib/event-log/timing";
import { readEvents } from "../../../lib/event-log/read";
import type { EventEnvelope } from "../../../lib/event-log/types";

function tmpEventsPath(label: string): string {
  // Root the events path inside a `.palantir-mini/session/` subtree (mirroring the
  // production layout) so the append.ts declared-write-set guard sees an in-set
  // target. Without this, `PALANTIR_MINI_WRITE_SET_STRICT=1` makes the guard abort
  // the write and these envelope-shape assertions see 0 events. Matches the
  // quarantine.test.ts strict-mode fixture pattern.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-timing-${label}-`));
  const sessionDir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });
  return path.join(sessionDir, "events.jsonl");
}

describe("now / elapsedMs", () => {
  test("now() returns a positive number monotonically", () => {
    const a = now();
    const b = now();
    expect(typeof a).toBe("number");
    expect(b).toBeGreaterThanOrEqual(a);
  });

  test("elapsedMs returns ≥ 0 integer rounded from sub-ms delta", () => {
    const start = now();
    const elapsed = elapsedMs(start);
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(elapsed)).toBe(true);
  });

  test("elapsedMs reports ≥ ~50ms after a 50ms sleep", async () => {
    const start = now();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const elapsed = elapsedMs(start);
    expect(elapsed).toBeGreaterThanOrEqual(40); // jitter floor
    expect(elapsed).toBeLessThan(500);          // ceiling for sane CI
  });
});

describe("classifyError", () => {
  test("plain Error returns 'Error'", () => {
    expect(classifyError(new Error("boom"))).toBe("Error");
  });

  test("TypeError returns 'TypeError'", () => {
    expect(classifyError(new TypeError("bad type"))).toBe("TypeError");
  });

  test("NodeJS errno (ENOENT) returns the errno code", () => {
    const err = new Error("file not found") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    expect(classifyError(err)).toBe("ENOENT");
  });

  test("string throw returns 'StringError'", () => {
    expect(classifyError("just a string")).toBe("StringError");
  });

  test("unknown non-Error throw returns 'UnknownError'", () => {
    expect(classifyError(42)).toBe("UnknownError");
    expect(classifyError(null)).toBe("UnknownError");
    expect(classifyError({ random: "obj" })).toBe("UnknownError");
  });
});

describe("emitToolInvocationCompleted envelope shape", () => {
  test("success path: writes envelope with no errorClass", async () => {
    const eventsPath = tmpEventsPath("success");
    await emitToolInvocationCompleted({
      toolName:           "test_tool_alpha",
      durationMs:         42,
      success:            true,
      eventsPathOverride: eventsPath,
    });

    const events = readEvents(eventsPath);
    expect(events.length).toBe(1);

    const ev = events[0]!;
    expect(ev.type).toBe("tool_invocation_completed");
    expect(ev.sequence).toBe(1);

    // 5-dim envelope conformance (rule 10)
    expect(typeof ev.eventId).toBe("string");
    expect(ev.eventId.startsWith("evt-")).toBe(true);
    expect(typeof ev.when).toBe("string");
    expect(() => new Date(ev.when).toISOString()).not.toThrow();
    expect(typeof ev.atopWhich).toBe("string");
    expect(ev.throughWhich.toolName).toBe("test_tool_alpha");
    expect(typeof ev.throughWhich.cwd).toBe("string");
    expect(ev.byWhom.identity).toBe("claude-code");
    expect(typeof ev.withWhat?.reasoning).toBe("string");

    if (ev.type !== "tool_invocation_completed") throw new Error("type narrow");
    expect(ev.payload.toolName).toBe("test_tool_alpha");
    expect(ev.payload.durationMs).toBe(42);
    expect(ev.payload.success).toBe(true);
    expect(ev.payload.errorClass).toBeUndefined();
  });

  test("failure path: writes envelope with errorClass set", async () => {
    const eventsPath = tmpEventsPath("failure");
    await emitToolInvocationCompleted({
      toolName:           "test_tool_beta",
      durationMs:         99,
      success:            false,
      errorClass:         "ENOENT",
      eventsPathOverride: eventsPath,
    });

    const events = readEvents(eventsPath);
    expect(events.length).toBe(1);

    const ev = events[0]! as EventEnvelope;
    if (ev.type !== "tool_invocation_completed") throw new Error("type narrow");
    expect(ev.payload.success).toBe(false);
    expect(ev.payload.errorClass).toBe("ENOENT");
    expect(ev.withWhat?.reasoning).toContain("ENOENT");
    expect(ev.withWhat?.reasoning).toContain("failed");
  });

  test("multiple emits assign monotonic sequence numbers", async () => {
    const eventsPath = tmpEventsPath("monotonic");
    for (let i = 0; i < 5; i++) {
      await emitToolInvocationCompleted({
        toolName:           `tool_${i}`,
        durationMs:         10 + i,
        success:            true,
        eventsPathOverride: eventsPath,
      });
    }

    const events = readEvents(eventsPath);
    expect(events.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(events[i]!.sequence).toBe(i + 1);
    }
  });

  test("write failure on read-only path is silently swallowed", async () => {
    // /proc/1 is non-writable for non-root processes — best portable choice.
    // If running as root, use /sys which is also typically RO; if both writable,
    // the assertion that "no throw" still holds (best-effort contract).
    const result = await emitToolInvocationCompleted({
      toolName:           "test_tool_writefail",
      durationMs:         5,
      success:            true,
      eventsPathOverride: "/proc/1/this-cannot-be-created/events.jsonl",
    });
    expect(result).toBeUndefined();
  });
});
