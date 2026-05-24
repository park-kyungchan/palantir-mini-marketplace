// palantir-mini v3.7.0 — subagent-start-env-inject hook integration sibling
// Coverage: full subagentStart hook default export.
// A.4 sibling split — pure-fn unit tests live in subagent-start-env-inject.test.ts.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import subagentStart from "../../hooks/subagent-start";
import { makeTmpDir, writeAgentMd, AGENT_WITH_ENV } from "./subagent-start-env-inject/fixtures";

describe("subagentStart hook", () => {
  let tmpRoot: string;
  let tmpHome: string;
  const savedEnv: Record<string, string | undefined> = {};
  const testKeys = ["MY_VAR", "ANOTHER_VAR", "QUOTED_SINGLE"];

  beforeEach(() => {
    tmpRoot = makeTmpDir("hook");
    savedEnv.HOME                  = process.env.HOME;
    savedEnv.CLAUDE_PLUGIN_ROOT     = process.env.CLAUDE_PLUGIN_ROOT;
    savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
    tmpHome = makeTmpDir("home-hook");
    process.env.HOME                  = tmpHome;
    delete process.env.CLAUDE_PLUGIN_ROOT;
    const evDir = path.join(tmpRoot, ".palantir-mini", "session");
    fs.mkdirSync(evDir, { recursive: true });
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(evDir, "events.jsonl");
    for (const k of testKeys) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
    try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  test("returns message string on success", async () => {
    const res = await subagentStart({
      agent_id:   "test-id",
      agent_name: "test-agent",
      cwd:        tmpRoot,
    });
    expect("message" in res).toBe(true);
    const msg = (res as { message: string }).message;
    expect(typeof msg).toBe("string");
    expect(msg).toContain("subagent_start recorded");
  });

  test("injects env vars from agent .md when file is present", async () => {
    writeAgentMd(tmpRoot, "test-agent", AGENT_WITH_ENV);
    await subagentStart({
      agent_name: "test-agent",
      cwd:        tmpRoot,
    });
    expect(process.env["MY_VAR"]).toBe("hello");
    expect(process.env["ANOTHER_VAR"]).toBe("world");
    expect(process.env["QUOTED_SINGLE"]).toBe("single");
  });

  test("does not overwrite user-set env vars", async () => {
    process.env["MY_VAR"] = "user-set";
    writeAgentMd(tmpRoot, "test-agent", AGENT_WITH_ENV);
    await subagentStart({ agent_name: "test-agent", cwd: tmpRoot });
    expect(process.env["MY_VAR"]).toBe("user-set");
  });

  test("does not throw when agent .md is missing (silent fallback)", async () => {
    const res = await subagentStart({
      agent_name: "nonexistent-agent",
      cwd:        tmpRoot,
    });
    expect("message" in res).toBe(true);
    expect(typeof (res as { message: string }).message).toBe("string");
  });

  test("works without agent_name in payload", async () => {
    const res = await subagentStart({ cwd: tmpRoot });
    expect("message" in res).toBe(true);
    expect((res as { message: string }).message).toContain("subagent-unnamed");
  });

  test("uses subagent_type as fallback for file search when agent_name absent", async () => {
    writeAgentMd(tmpRoot, "id-agent", AGENT_WITH_ENV);
    await subagentStart({ agent_id: "opaque-runtime-id", subagent_type: "id-agent", cwd: tmpRoot });
    expect(process.env["MY_VAR"]).toBe("hello");
  });
});
