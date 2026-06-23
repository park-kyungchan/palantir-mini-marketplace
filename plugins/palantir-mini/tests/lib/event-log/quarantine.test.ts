// palantir-mini v6.44.0 — quarantine.ts unit tests (PR 4.6)
// Tests: JSON-error quarantine, 5-dim-missing quarantine, manifest update,
//        atomic write (no half-written files), readQuarantine, readEvents integration.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  quarantineMalformedRow,
  readQuarantine,
  readQuarantineManifest,
} from "../../../lib/event-log/quarantine";
import { readEvents } from "../../../lib/event-log/read";
import type { EventEnvelope } from "../../../lib/event-log/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Session dirs are rooted under a `.palantir-mini/session` subtree so the
// governed write-set guard (assertWriteWithinDeclaredSet) sees an in-set target,
// mirroring production layout (sessionDir = path.dirname(.palantir-mini/session/events.jsonl)).
// This keeps the suite green under PALANTIR_MINI_WRITE_SET_STRICT=1 (tests / CI).
function makeTmpDir(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-quarantine-${label}-`));
  const sessionDir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });
  return sessionDir;
}

/** Outermost mkdtemp root for a session dir returned by makeTmpDir (for cleanup). */
function tmpRootOf(sessionDir: string): string {
  return path.dirname(path.dirname(sessionDir));
}

/** Standard valid event line (all 4 hard-required 5-dim fields present). */
function validEventLine(seq: number): string {
  return JSON.stringify({
    type:        "session_started",
    sequence:    seq,
    eventId:     `e-${seq}`,
    when:        "2026-05-13T00:00:00.000Z",
    atopWhich:   "abc1234",
    throughWhich: { sessionId: "s1", toolName: "test", cwd: "/tmp" },
    byWhom:      { identity: "claude-code" },
    payload:     { model: "sonnet", effort: "medium" },
  });
}

/** sessionDir follows the convention: events.jsonl lives at sessionDir/events.jsonl */
function eventsPath(sessionDir: string): string {
  return path.join(sessionDir, "events.jsonl");
}

function writeEvents(sessionDir: string, lines: string[]): void {
  const ep = eventsPath(sessionDir);
  fs.mkdirSync(path.dirname(ep), { recursive: true });
  fs.writeFileSync(ep, lines.join("\n") + "\n");
}

// ─── quarantineMalformedRow ───────────────────────────────────────────────────

describe("quarantineMalformedRow", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("q"); });
  afterEach(() => { fs.rmSync(tmpRootOf(tmp), { recursive: true, force: true }); });

  test("creates quarantine directory if absent", () => {
    quarantineMalformedRow({
      sessionDir:   tmp,
      originalLine: "{ bad json",
      lineNumber:   1,
      sourceFile:   "/some/events.jsonl",
      errorClass:   "json_parse_error",
      errorMessage: "Unexpected token",
    });
    expect(fs.existsSync(path.join(tmp, "quarantine"))).toBe(true);
  });

  test("writes record to malformed-rows.jsonl", () => {
    quarantineMalformedRow({
      sessionDir:   tmp,
      originalLine: "{ bad json",
      lineNumber:   1,
      sourceFile:   "/some/events.jsonl",
      errorClass:   "json_parse_error",
      errorMessage: "Unexpected token",
    });
    const rowsPath = path.join(tmp, "quarantine", "malformed-rows.jsonl");
    expect(fs.existsSync(rowsPath)).toBe(true);
    const content = fs.readFileSync(rowsPath, "utf8").trim();
    const record = JSON.parse(content);
    expect(record.originalLine).toBe("{ bad json");
    expect(record.lineNumber).toBe(1);
    expect(record.errorClass).toBe("json_parse_error");
    expect(record.errorMessage).toBe("Unexpected token");
    expect(record.sourceFile).toBe("/some/events.jsonl");
    expect(typeof record.detectedAt).toBe("string");
  });

  test("returns the QuarantineRecord", () => {
    const rec = quarantineMalformedRow({
      sessionDir:   tmp,
      originalLine: "oops",
      lineNumber:   5,
      sourceFile:   "/foo/events.jsonl",
      errorClass:   "missing_required_field",
      errorMessage: "Missing required 5-dim field: atopWhich",
    });
    expect(rec.originalLine).toBe("oops");
    expect(rec.lineNumber).toBe(5);
    expect(rec.errorClass).toBe("missing_required_field");
  });

  test("creates manifest.json with correct counters", () => {
    quarantineMalformedRow({
      sessionDir:   tmp,
      originalLine: "bad1",
      lineNumber:   1,
      sourceFile:   "/f.jsonl",
      errorClass:   "json_parse_error",
      errorMessage: "err",
    });
    const manifest = readQuarantineManifest(tmp);
    expect(manifest).not.toBeNull();
    expect(manifest!.totalCount).toBe(1);
    expect(manifest!.byClass.json_parse_error).toBe(1);
    expect(manifest!.byClass.missing_required_field).toBe(0);
    expect(manifest!.sourceFiles).toContain("/f.jsonl");
  });

  test("updates manifest correctly across multiple quarantines", () => {
    quarantineMalformedRow({ sessionDir: tmp, originalLine: "bad1", lineNumber: 1, sourceFile: "/a.jsonl", errorClass: "json_parse_error", errorMessage: "e1" });
    quarantineMalformedRow({ sessionDir: tmp, originalLine: "bad2", lineNumber: 2, sourceFile: "/b.jsonl", errorClass: "missing_required_field", errorMessage: "e2" });
    quarantineMalformedRow({ sessionDir: tmp, originalLine: "bad3", lineNumber: 3, sourceFile: "/a.jsonl", errorClass: "json_parse_error", errorMessage: "e3" });

    const manifest = readQuarantineManifest(tmp);
    expect(manifest!.totalCount).toBe(3);
    expect(manifest!.byClass.json_parse_error).toBe(2);
    expect(manifest!.byClass.missing_required_field).toBe(1);
    // de-duplicated sourceFiles
    expect(manifest!.sourceFiles.sort()).toEqual(["/a.jsonl", "/b.jsonl"]);
  });

  test("multiple calls append rows to malformed-rows.jsonl (not overwrite)", () => {
    quarantineMalformedRow({ sessionDir: tmp, originalLine: "row1", lineNumber: 1, sourceFile: "/x", errorClass: "json_parse_error", errorMessage: "e1" });
    quarantineMalformedRow({ sessionDir: tmp, originalLine: "row2", lineNumber: 2, sourceFile: "/x", errorClass: "json_parse_error", errorMessage: "e2" });

    const records = readQuarantine(tmp);
    expect(records.length).toBe(2);
    expect(records.at(0)!.originalLine).toBe("row1");
    expect(records.at(1)!.originalLine).toBe("row2");
  });

  test("no .tmp files left behind after write (atomic)", () => {
    quarantineMalformedRow({ sessionDir: tmp, originalLine: "x", lineNumber: 1, sourceFile: "/y", errorClass: "json_parse_error", errorMessage: "e" });
    const qDir = path.join(tmp, "quarantine");
    const tmpFiles = fs.readdirSync(qDir).filter((f) => f.includes(".tmp."));
    expect(tmpFiles).toHaveLength(0);
  });
});

// ─── readQuarantine ───────────────────────────────────────────────────────────

describe("readQuarantine", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("rq"); });
  afterEach(() => { fs.rmSync(tmpRootOf(tmp), { recursive: true, force: true }); });

  test("returns empty array when quarantine dir absent", () => {
    expect(readQuarantine(tmp)).toEqual([]);
  });

  test("returns all quarantined records", () => {
    quarantineMalformedRow({ sessionDir: tmp, originalLine: "a", lineNumber: 1, sourceFile: "/s", errorClass: "json_parse_error", errorMessage: "e" });
    quarantineMalformedRow({ sessionDir: tmp, originalLine: "b", lineNumber: 2, sourceFile: "/s", errorClass: "missing_required_field", errorMessage: "f" });
    const records = readQuarantine(tmp);
    expect(records).toHaveLength(2);
    expect(records.at(0)!.originalLine).toBe("a");
    expect(records.at(1)!.originalLine).toBe("b");
  });
});

// ─── readEvents integration ───────────────────────────────────────────────────

describe("readEvents quarantine integration", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("re"); });
  afterEach(() => { fs.rmSync(tmpRootOf(tmp), { recursive: true, force: true }); });

  test("malformed JSON row → quarantined, default read skips it", () => {
    writeEvents(tmp, [
      validEventLine(1),
      "{ corrupted-json",
      validEventLine(2),
    ]);
    const events = readEvents(eventsPath(tmp));
    expect(events.length).toBe(2);
    expect(events.map((e) => e.sequence)).toEqual([1, 2]);

    // Quarantine file must exist with 1 record
    const quarantined = readQuarantine(tmp);
    expect(quarantined).toHaveLength(1);
    expect(quarantined.at(0)!.errorClass).toBe("json_parse_error");
    expect(quarantined.at(0)!.originalLine).toBe("{ corrupted-json");
  });

  test("missing 5-dim field → quarantined, default read skips it", () => {
    const missingAtopWhich = JSON.stringify({
      type:        "session_started",
      sequence:    99,
      eventId:     "e-99",
      when:        "2026-05-13T00:00:00.000Z",
      // atopWhich MISSING
      throughWhich: { sessionId: "s1", toolName: "test", cwd: "/tmp" },
      byWhom:      { identity: "claude-code" },
      payload:     { model: "sonnet", effort: "medium" },
    });
    writeEvents(tmp, [
      validEventLine(1),
      missingAtopWhich,
      validEventLine(3),
    ]);
    const events = readEvents(eventsPath(tmp));
    expect(events.length).toBe(2);
    expect(events.map((e) => e.sequence)).toEqual([1, 3]);

    const quarantined = readQuarantine(tmp);
    expect(quarantined).toHaveLength(1);
    expect(quarantined.at(0)!.errorClass).toBe("missing_required_field");
    expect(quarantined.at(0)!.errorMessage).toContain("atopWhich");
  });

  test("includeQuarantine: true returns valid + quarantined rows", () => {
    writeEvents(tmp, [
      validEventLine(1),
      "bad-json",
      validEventLine(2),
    ]);
    const result = readEvents(eventsPath(tmp), { includeQuarantine: true });
    // 2 valid + 1 quarantined (cast to EventEnvelope)
    expect(result.events.length).toBe(3);
    // Valid rows have sequence 1 and 2; quarantined row is appended at end
    expect(result.events.at(0)!.sequence).toBe(1);
    expect(result.events.at(1)!.sequence).toBe(2);
    // The quarantined entry has originalLine field (not a real EventEnvelope)
    const q = result.events.at(2) as unknown as { originalLine: string };
    expect(q.originalLine).toBe("bad-json");
  });

  test("manifest updates correctly across multiple quarantine writes from readEvents", () => {
    writeEvents(tmp, [
      "bad1",
      "bad2",
      validEventLine(1),
      "{ incomplete",
    ]);
    readEvents(eventsPath(tmp));

    const manifest = readQuarantineManifest(tmp);
    expect(manifest!.totalCount).toBe(3);
    expect(manifest!.byClass.json_parse_error).toBe(3);
  });

  test("valid-only events file → no quarantine directory created", () => {
    writeEvents(tmp, [
      validEventLine(1),
      validEventLine(2),
    ]);
    readEvents(eventsPath(tmp));
    expect(fs.existsSync(path.join(tmp, "quarantine"))).toBe(false);
  });

  test("legacy signature (no options) still returns EventEnvelope[]", () => {
    writeEvents(tmp, [validEventLine(1), validEventLine(2)]);
    const result = readEvents(eventsPath(tmp));
    // Should be a plain array (backward-compat)
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  test("does NOT abort the read on quarantine I/O error (best-effort)", () => {
    // Simulate by writing a read-only quarantine directory that will block writes.
    // We just verify that even without a writable quarantine, the read continues.
    writeEvents(tmp, [
      validEventLine(1),
      "bad-json",
      validEventLine(2),
    ]);
    // Make quarantine dir but not writable
    const qDir = path.join(tmp, "quarantine");
    fs.mkdirSync(qDir, { recursive: true });
    fs.chmodSync(qDir, 0o444);

    let evts: EventEnvelope[] | undefined;
    try {
      evts = readEvents(eventsPath(tmp));
    } finally {
      // Restore permissions for cleanup
      fs.chmodSync(qDir, 0o755);
    }
    // Valid events still returned even if quarantine write failed
    expect(evts!.length).toBe(2);
  });
});
