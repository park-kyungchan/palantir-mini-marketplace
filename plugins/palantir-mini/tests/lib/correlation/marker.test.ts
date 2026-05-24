// palantir-mini PR 5.5 (sprint-116) — Tests for lib/correlation/marker.ts
//
// Covers:
//   - Write + read round-trip per-agent
//   - Two concurrent writes with different subagentId → distinct files, no overlap
//   - Read all markers in a session returns full set
//   - Missing marker → returns null
//   - writeCorrelationMarker never throws (best-effort error handling)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs   from "fs";
import * as os   from "os";
import * as path from "path";
import {
  writeCorrelationMarker,
  readCorrelationMarker,
  readAllMarkersForSession,
  type WriteMarkerOpts,
} from "../../../lib/correlation/marker";

function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-corr-${label}-`));
}

describe("writeCorrelationMarker + readCorrelationMarker — round-trip", () => {
  let root: string;
  beforeEach(() => { root = makeTmpRoot("rtt"); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  test("writes marker and reads it back correctly", () => {
    const opts: WriteMarkerOpts = {
      projectRoot:   root,
      sessionId:     "sess-abc",
      subagentId:    "agent-001",
      correlationId: "corr-uuid-1111",
      agentName:     "implementer",
      spawnedAt:     "2026-05-13T00:00:00.000Z",
    };
    const ok = writeCorrelationMarker(opts);
    expect(ok).toBe(true);

    const marker = readCorrelationMarker({
      projectRoot: root,
      sessionId:   "sess-abc",
      subagentId:  "agent-001",
    });
    expect(marker).not.toBeNull();
    expect(marker!.correlationId).toBe("corr-uuid-1111");
    expect(marker!.agentName).toBe("implementer");
    expect(marker!.sessionId).toBe("sess-abc");
    expect(marker!.subagentId).toBe("agent-001");
    expect(marker!.spawnedAt).toBe("2026-05-13T00:00:00.000Z");
  });

  test("includes extra metadata fields", () => {
    writeCorrelationMarker({
      projectRoot:   root,
      sessionId:     "sess-abc",
      subagentId:    "agent-002",
      correlationId: "corr-uuid-2222",
      agentName:     "researcher",
      extra: {
        model:        "opus",
        promptDigest: "abc123",
      },
    });
    const marker = readCorrelationMarker({ projectRoot: root, sessionId: "sess-abc", subagentId: "agent-002" });
    expect(marker).not.toBeNull();
    expect(marker!["model"]).toBe("opus");
    expect(marker!["promptDigest"]).toBe("abc123");
  });

  test("creates directory tree when absent", () => {
    const nestedRoot = path.join(root, "deep", "nested");
    writeCorrelationMarker({
      projectRoot:   nestedRoot,
      sessionId:     "sess-x",
      subagentId:    "agent-x",
      correlationId: "corr-xxx",
      agentName:     "hook-builder",
    });
    const marker = readCorrelationMarker({ projectRoot: nestedRoot, sessionId: "sess-x", subagentId: "agent-x" });
    expect(marker?.correlationId).toBe("corr-xxx");
  });
});

describe("Two concurrent subagentIds — distinct files, no overlap", () => {
  let root: string;
  beforeEach(() => { root = makeTmpRoot("conc"); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  test("different subagentIds produce separate files with correct correlationIds", () => {
    writeCorrelationMarker({
      projectRoot:   root,
      sessionId:     "sess-conc",
      subagentId:    "agent-A",
      correlationId: "corr-A",
      agentName:     "implementer",
    });
    writeCorrelationMarker({
      projectRoot:   root,
      sessionId:     "sess-conc",
      subagentId:    "agent-B",
      correlationId: "corr-B",
      agentName:     "researcher",
    });

    const markerA = readCorrelationMarker({ projectRoot: root, sessionId: "sess-conc", subagentId: "agent-A" });
    const markerB = readCorrelationMarker({ projectRoot: root, sessionId: "sess-conc", subagentId: "agent-B" });

    expect(markerA!.correlationId).toBe("corr-A");
    expect(markerB!.correlationId).toBe("corr-B");
    // No cross-contamination
    expect(markerA!.correlationId).not.toBe(markerB!.correlationId);
    expect(markerA!.agentName).toBe("implementer");
    expect(markerB!.agentName).toBe("researcher");
  });

  test("ten concurrent writes produce ten distinct marker files", () => {
    const count = 10;
    for (let i = 0; i < count; i++) {
      writeCorrelationMarker({
        projectRoot:   root,
        sessionId:     "sess-bulk",
        subagentId:    `agent-${i}`,
        correlationId: `corr-${i}`,
        agentName:     "implementer",
      });
    }
    const markerDir = path.join(root, ".palantir-mini", "session", "correlation-markers", "sess-bulk");
    const files = fs.readdirSync(markerDir).filter(f => f.endsWith(".json"));
    expect(files.length).toBe(count);
    // Verify each reads back its own correlationId
    for (let i = 0; i < count; i++) {
      const m = readCorrelationMarker({ projectRoot: root, sessionId: "sess-bulk", subagentId: `agent-${i}` });
      expect(m!.correlationId).toBe(`corr-${i}`);
    }
  });
});

describe("readAllMarkersForSession", () => {
  let root: string;
  beforeEach(() => { root = makeTmpRoot("all"); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  test("returns empty array when session directory does not exist", () => {
    const markers = readAllMarkersForSession(root, "nonexistent-session");
    expect(markers).toEqual([]);
  });

  test("returns all markers sorted by spawnedAt", () => {
    writeCorrelationMarker({
      projectRoot: root, sessionId: "sess-all", subagentId: "z-last",
      correlationId: "corr-z", agentName: "agent-z",
      spawnedAt: "2026-05-13T12:00:00.000Z",
    });
    writeCorrelationMarker({
      projectRoot: root, sessionId: "sess-all", subagentId: "a-first",
      correlationId: "corr-a", agentName: "agent-a",
      spawnedAt: "2026-05-13T10:00:00.000Z",
    });
    writeCorrelationMarker({
      projectRoot: root, sessionId: "sess-all", subagentId: "m-mid",
      correlationId: "corr-m", agentName: "agent-m",
      spawnedAt: "2026-05-13T11:00:00.000Z",
    });

    const markers = readAllMarkersForSession(root, "sess-all");
    expect(markers.length).toBe(3);
    expect(markers[0]!.correlationId).toBe("corr-a");
    expect(markers[1]!.correlationId).toBe("corr-m");
    expect(markers[2]!.correlationId).toBe("corr-z");
  });

  test("skips malformed JSON files silently", () => {
    const dir = path.join(root, ".palantir-mini", "session", "correlation-markers", "sess-bad");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "bad.json"), "not-json", "utf8");
    writeCorrelationMarker({
      projectRoot: root, sessionId: "sess-bad", subagentId: "good",
      correlationId: "corr-good", agentName: "implementer",
    });

    const markers = readAllMarkersForSession(root, "sess-bad");
    expect(markers.length).toBe(1);
    expect(markers[0]!.correlationId).toBe("corr-good");
  });
});

describe("readCorrelationMarker — missing marker", () => {
  let root: string;
  beforeEach(() => { root = makeTmpRoot("miss"); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  test("returns null when file does not exist", () => {
    const marker = readCorrelationMarker({ projectRoot: root, sessionId: "sess-x", subagentId: "nonexistent" });
    expect(marker).toBeNull();
  });

  test("returns null when file is malformed JSON", () => {
    const dir = path.join(root, ".palantir-mini", "session", "correlation-markers", "sess-x");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "bad-agent.json"), "not json", "utf8");
    const marker = readCorrelationMarker({ projectRoot: root, sessionId: "sess-x", subagentId: "bad-agent" });
    expect(marker).toBeNull();
  });

  test("returns null when correlationId field is missing", () => {
    const dir = path.join(root, ".palantir-mini", "session", "correlation-markers", "sess-x");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "no-corr.json"), JSON.stringify({ agentName: "test" }), "utf8");
    const marker = readCorrelationMarker({ projectRoot: root, sessionId: "sess-x", subagentId: "no-corr" });
    expect(marker).toBeNull();
  });
});

describe("writeCorrelationMarker — error resilience", () => {
  test("returns false (does not throw) when projectRoot is a non-writable path", () => {
    // Use a path whose parent cannot be created
    const result = writeCorrelationMarker({
      projectRoot:   "/proc/this-cannot-be-written",
      sessionId:     "sess-x",
      subagentId:    "agent-x",
      correlationId: "corr-x",
      agentName:     "implementer",
    });
    expect(result).toBe(false);
  });
});
