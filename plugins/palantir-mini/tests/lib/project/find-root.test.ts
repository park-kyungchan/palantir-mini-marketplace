// palantir-mini — findProjectRoot tests (g10 double-nested-events.jsonl fix).
// Coverage: upward walk to a marker, the stray-nested-marker regression, and
// the no-marker-anywhere null case.

import { test, expect, describe, afterEach, spyOn } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { findProjectRoot } from "../../../lib/project/find-root";

const tmpDirs: string[] = [];

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

function mkTmpRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-find-root-${label}-`));
  tmpDirs.push(root);
  return root;
}

describe("findProjectRoot", () => {
  test("resolves the temp root when a marker sits at the root and start is 3 levels deep", () => {
    const root = mkTmpRoot("deep");
    fs.mkdirSync(path.join(root, ".palantir-mini"), { recursive: true });
    const deep = path.join(root, "a", "b", "c");
    fs.mkdirSync(deep, { recursive: true });

    expect(findProjectRoot(deep)).toBe(root);
  });

  test("REGRESSION (g10): a stray marker nested inside <root>/.palantir-mini/session/prompt-front-door/ must not shadow the real outer root", () => {
    const root = mkTmpRoot("nested-stray");
    fs.mkdirSync(path.join(root, ".palantir-mini"), { recursive: true });
    const promptFrontDoor = path.join(root, ".palantir-mini", "session", "prompt-front-door");
    fs.mkdirSync(promptFrontDoor, { recursive: true });
    // Stray marker minted inside the project's own output tree (the bug).
    fs.mkdirSync(path.join(promptFrontDoor, ".palantir-mini"), { recursive: true });

    expect(findProjectRoot(promptFrontDoor)).toBe(root);
  });

  test("returns null when no marker exists anywhere up the chain", () => {
    const root = mkTmpRoot("no-marker");
    const deep = path.join(root, "a", "b");
    fs.mkdirSync(deep, { recursive: true });

    // The real filesystem may carry pre-existing stray `.palantir-mini`
    // markers above `os.tmpdir()` (the exact g10 bug this file guards
    // against) — isolate this "no marker anywhere" case from that ambient
    // state by stubbing existsSync to report no marker ever exists, so the
    // assertion reflects findProjectRoot's own walk logic, not machine state.
    const existsSpy = spyOn(fs, "existsSync").mockReturnValue(false);
    try {
      expect(findProjectRoot(deep)).toBeNull();
    } finally {
      existsSpy.mockRestore();
    }
  });
});
