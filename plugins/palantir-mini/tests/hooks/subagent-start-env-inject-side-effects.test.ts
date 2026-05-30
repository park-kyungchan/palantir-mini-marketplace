// palantir-mini v3.7.0 — subagent-start-env-inject side-effects sibling
// Coverage: readAgentMd + injectEnvFromAgentMd (fs + env mutating).
// A.4 sibling split — see subagent-start-env-inject.test.ts for parseEnvBlock + agentMdCandidates.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import {
  readAgentMd,
  injectEnvFromAgentMd,
} from "../../hooks/subagent-start";
import { makeTmpDir, writeAgentMd, AGENT_WITH_ENV, AGENT_NO_ENV } from "./subagent-start-env-inject/fixtures";

// ---------------------------------------------------------------------------
// readAgentMd
// ---------------------------------------------------------------------------

describe("readAgentMd", () => {
  let tmpRoot: string;
  let tmpHome: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    tmpRoot = makeTmpDir("read");
    savedEnv.HOME              = process.env.HOME;
    savedEnv.PALANTIR_MINI_PLUGIN_ROOT = process.env.PALANTIR_MINI_PLUGIN_ROOT;
    tmpHome = makeTmpDir("home");
    process.env.HOME              = tmpHome;
    delete process.env.PALANTIR_MINI_PLUGIN_ROOT;
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

  test("returns content from project-local .claude/agents/ (first match wins)", () => {
    writeAgentMd(tmpRoot, "researcher", AGENT_WITH_ENV);
    const content = readAgentMd("researcher", tmpRoot);
    expect(content).not.toBeNull();
    expect(content).toContain("MY_VAR");
  });

  test("returns null when agent .md file does not exist in any candidate path", () => {
    const content = readAgentMd("nonexistent-agent", tmpRoot);
    expect(content).toBeNull();
  });

  test("finds file in HOME path when not in project", () => {
    const fakeHome = process.env.HOME!;
    writeAgentMd(fakeHome, "home-agent", AGENT_WITH_ENV);
    const content = readAgentMd("home-agent", tmpRoot);
    expect(content).not.toBeNull();
    expect(content).toContain("MY_VAR");
  });

  test("silent on permission error — returns null", () => {
    const content = readAgentMd("", tmpRoot);
    expect(content).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// injectEnvFromAgentMd
// ---------------------------------------------------------------------------

describe("injectEnvFromAgentMd", () => {
  let tmpRoot: string;
  let tmpHome: string;
  const savedEnv: Record<string, string | undefined> = {};
  const injectedKeys = ["MY_VAR", "ANOTHER_VAR", "QUOTED_SINGLE", "EMPTY_VAR", "ANOTHER"];

  beforeEach(() => {
    tmpRoot = makeTmpDir("inject");
    savedEnv.HOME              = process.env.HOME;
    savedEnv.PALANTIR_MINI_PLUGIN_ROOT = process.env.PALANTIR_MINI_PLUGIN_ROOT;
    tmpHome = makeTmpDir("home-inj");
    process.env.HOME              = tmpHome;
    delete process.env.PALANTIR_MINI_PLUGIN_ROOT;
    for (const k of injectedKeys) {
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

  test("injects vars from env block into process.env", () => {
    writeAgentMd(tmpRoot, "inject-agent", AGENT_WITH_ENV);
    injectEnvFromAgentMd("inject-agent", tmpRoot);
    expect(process.env["MY_VAR"]).toBe("hello");
    expect(process.env["ANOTHER_VAR"]).toBe("world");
    expect(process.env["QUOTED_SINGLE"]).toBe("single");
  });

  test("does NOT overwrite an already-set env var", () => {
    process.env["MY_VAR"] = "pre-existing";
    writeAgentMd(tmpRoot, "inject-agent", AGENT_WITH_ENV);
    injectEnvFromAgentMd("inject-agent", tmpRoot);
    expect(process.env["MY_VAR"]).toBe("pre-existing");
  });

  test("injects unset vars but skips set vars in the same batch", () => {
    process.env["MY_VAR"] = "original";
    writeAgentMd(tmpRoot, "inject-agent", AGENT_WITH_ENV);
    injectEnvFromAgentMd("inject-agent", tmpRoot);
    expect(process.env["MY_VAR"]).toBe("original");
    expect(process.env["ANOTHER_VAR"]).toBe("world");
    expect(process.env["QUOTED_SINGLE"]).toBe("single");
  });

  test("silent when agent file does not exist (no throw)", () => {
    expect(() => injectEnvFromAgentMd("nonexistent", tmpRoot)).not.toThrow();
  });

  test("silent when agent name is empty string (no throw)", () => {
    expect(() => injectEnvFromAgentMd("", tmpRoot)).not.toThrow();
  });

  test("no env vars injected when agent has no env block", () => {
    writeAgentMd(tmpRoot, "no-env-agent", AGENT_NO_ENV);
    injectEnvFromAgentMd("no-env-agent", tmpRoot);
    expect(process.env["MY_VAR"]).toBeUndefined();
    expect(process.env["ANOTHER_VAR"]).toBeUndefined();
  });
});
