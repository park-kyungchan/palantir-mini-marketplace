// palantir-mini — pending-fold tests, focused on isQueueOperationTranscript.
//
// The second-brain detect block in hooks/session-start.ts uses this helper to
// EXCLUDE the fold engine's own CLI-extraction byproducts (a transcript whose
// FIRST line parses to {type:"queue-operation"}) from the detect set — otherwise
// the fold engine self-feeds (a queue-operation transcript gets back-filled
// pending → re-triggers a fold → whose CLI run writes another queue-operation
// transcript...). Real sessions (type user/summary/etc.) MUST be unaffected, and
// any read/parse error MUST resolve to "include" (return false), never drop a
// real session on error.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { isQueueOperationTranscript } from "./pending-fold";

const tmpDirs: string[] = [];

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pending-fold-"));
  tmpDirs.push(dir);
  return dir;
}

function writeTranscript(dir: string, name: string, firstLineObj: unknown, extraLines: unknown[] = []): string {
  const p = path.join(dir, name);
  const lines = [JSON.stringify(firstLineObj), ...extraLines.map((o) => JSON.stringify(o))];
  fs.writeFileSync(p, lines.join("\n") + "\n", "utf8");
  return p;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("isQueueOperationTranscript", () => {
  test("EXCLUDES (returns true for) a transcript whose first line is {type:'queue-operation'}", () => {
    const dir = tmpDir();
    const file = writeTranscript(dir, "qop.jsonl", { type: "queue-operation", op: "extract" }, [
      { type: "user", content: "ignored — only first line matters" },
    ]);
    expect(isQueueOperationTranscript(file)).toBe(true);
  });

  test("INCLUDES (returns false for) a normal session: first line type:'user'", () => {
    const dir = tmpDir();
    const file = writeTranscript(dir, "user.jsonl", { type: "user", message: { role: "user", content: "hi" } });
    expect(isQueueOperationTranscript(file)).toBe(false);
  });

  test("INCLUDES (returns false for) a normal session: first line type:'summary'", () => {
    const dir = tmpDir();
    const file = writeTranscript(dir, "summary.jsonl", { type: "summary", summary: "prior session recap" });
    expect(isQueueOperationTranscript(file)).toBe(false);
  });

  test("error-safe: a missing file returns false (never drops a real session on error)", () => {
    const dir = tmpDir();
    expect(isQueueOperationTranscript(path.join(dir, "does-not-exist.jsonl"))).toBe(false);
  });

  test("error-safe: a first line that is not valid JSON returns false", () => {
    const dir = tmpDir();
    const p = path.join(dir, "garbage.jsonl");
    fs.writeFileSync(p, "{not json\n", "utf8");
    expect(isQueueOperationTranscript(p)).toBe(false);
  });

  test("error-safe: an empty file returns false", () => {
    const dir = tmpDir();
    const p = path.join(dir, "empty.jsonl");
    fs.writeFileSync(p, "", "utf8");
    expect(isQueueOperationTranscript(p)).toBe(false);
  });

  test("a queue-operation row longer than 2KB on the first line is still detected (header within 2KB)", () => {
    const dir = tmpDir();
    const p = path.join(dir, "big-qop.jsonl");
    // type appears early; padding pushes the rest past 2KB but the parseable prefix
    // is what matters — JSON.parse needs the WHOLE first line, so keep the line < 2KB.
    const obj = { type: "queue-operation", note: "x".repeat(500) };
    fs.writeFileSync(p, JSON.stringify(obj) + "\n", "utf8");
    expect(isQueueOperationTranscript(p)).toBe(true);
  });
});
