/**
 * Tests for lib/prompt-front-door/global-session-index.ts — pm authorization-
 * flexibility slice 2 (G-ENV-A cross-lane envelope/grant resolution).
 *
 * Coverage:
 *   - readGlobalSessionPointer returns null when no pointer exists.
 *   - writeGlobalSessionPointerSync then readGlobalSessionPointer round-trips.
 *   - writeGlobalSessionPointer (async) then readGlobalSessionPointer round-trips.
 *   - upsert overwrites a prior pointer for the same (runtime, sessionId).
 *   - PALANTIR_MINI_GLOBAL_STATE_DIR overrides the root — never touches the
 *     real user home during this test (hard hermeticity requirement).
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  globalSessionIndexRootDir,
  readGlobalSessionPointer,
  writeGlobalSessionPointer,
  writeGlobalSessionPointerSync,
} from "../../../lib/prompt-front-door/global-session-index";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpGlobalStateDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "pm-global-session-index-"));
  tmpDirs.push(dir);
  return dir;
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_GLOBAL_STATE_DIR = process.env.PALANTIR_MINI_GLOBAL_STATE_DIR;
  process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir();
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_GLOBAL_STATE_DIR === undefined) {
    delete process.env.PALANTIR_MINI_GLOBAL_STATE_DIR;
  } else {
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = savedEnv.PALANTIR_MINI_GLOBAL_STATE_DIR;
  }
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("global-session-index", () => {
  test("readGlobalSessionPointer returns null when no pointer exists", async () => {
    const pointer = await readGlobalSessionPointer("codex", "session-missing");
    expect(pointer).toBeNull();
  });

  test("root dir is rooted under the PALANTIR_MINI_GLOBAL_STATE_DIR override", () => {
    const root = globalSessionIndexRootDir();
    expect(root.startsWith(process.env.PALANTIR_MINI_GLOBAL_STATE_DIR!)).toBe(true);
    expect(root).toContain(".palantir-mini");
    expect(root.endsWith(path.join("session", "prompt-front-door-global"))).toBe(true);
  });

  test("writeGlobalSessionPointerSync then readGlobalSessionPointer round-trips", async () => {
    writeGlobalSessionPointerSync("codex", "session-alpha", "/tmp/project-a");
    const pointer = await readGlobalSessionPointer("codex", "session-alpha");
    expect(pointer).toMatchObject({
      runtime: "codex",
      sessionId: "session-alpha",
      projectRoot: "/tmp/project-a",
    });
    expect(typeof pointer?.capturedAt).toBe("string");
  });

  test("writeGlobalSessionPointer (async) then readGlobalSessionPointer round-trips", async () => {
    await writeGlobalSessionPointer("claude", "session-beta", "/tmp/project-b");
    const pointer = await readGlobalSessionPointer("claude", "session-beta");
    expect(pointer).toMatchObject({
      runtime: "claude",
      sessionId: "session-beta",
      projectRoot: "/tmp/project-b",
    });
  });

  test("upsert overwrites a prior pointer for the same (runtime, sessionId)", async () => {
    writeGlobalSessionPointerSync("codex", "session-gamma", "/tmp/project-first");
    writeGlobalSessionPointerSync("codex", "session-gamma", "/tmp/project-second");
    const pointer = await readGlobalSessionPointer("codex", "session-gamma");
    expect(pointer?.projectRoot).toBe("/tmp/project-second");
  });

  test("distinct (runtime, sessionId) keys do not collide", async () => {
    writeGlobalSessionPointerSync("codex", "session-shared", "/tmp/codex-project");
    writeGlobalSessionPointerSync("claude", "session-shared", "/tmp/claude-project");
    const codexPointer = await readGlobalSessionPointer("codex", "session-shared");
    const claudePointer = await readGlobalSessionPointer("claude", "session-shared");
    expect(codexPointer?.projectRoot).toBe("/tmp/codex-project");
    expect(claudePointer?.projectRoot).toBe("/tmp/claude-project");
  });
});
