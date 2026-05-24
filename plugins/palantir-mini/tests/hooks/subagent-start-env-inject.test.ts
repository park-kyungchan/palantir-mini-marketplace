// palantir-mini v3.7.0 — subagent-start env injection tests (main)
// Coverage: parseEnvBlock + agentMdCandidates pure-fn unit tests.
// Decomposed in v3.7.0 A.4: side-effects → -side-effects.test.ts; hook → -hook.test.ts.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as path from "path";
import {
  parseEnvBlock,
  agentMdCandidates,
} from "../../hooks/subagent-start";
import {
  AGENT_WITH_ENV,
  AGENT_NO_ENV,
  AGENT_EMPTY_ENV,
  AGENT_NO_FRONTMATTER,
  AGENT_ENV_WITH_EMPTY_VALUE,
} from "./subagent-start-env-inject/fixtures";

// ---------------------------------------------------------------------------
// parseEnvBlock
// ---------------------------------------------------------------------------

describe("parseEnvBlock", () => {
  test("parses double-quoted values", () => {
    const result = parseEnvBlock(AGENT_WITH_ENV);
    expect(result["MY_VAR"]).toBe("hello");
  });

  test("parses unquoted values", () => {
    const result = parseEnvBlock(AGENT_WITH_ENV);
    expect(result["ANOTHER_VAR"]).toBe("world");
  });

  test("parses single-quoted values", () => {
    const result = parseEnvBlock(AGENT_WITH_ENV);
    expect(result["QUOTED_SINGLE"]).toBe("single");
  });

  test("returns empty record when no env block present", () => {
    const result = parseEnvBlock(AGENT_NO_ENV);
    expect(Object.keys(result)).toHaveLength(0);
  });

  test("returns empty record when env block is empty (next key follows immediately)", () => {
    const result = parseEnvBlock(AGENT_EMPTY_ENV);
    expect(Object.keys(result)).toHaveLength(0);
  });

  test("returns empty record when no frontmatter present", () => {
    const result = parseEnvBlock(AGENT_NO_FRONTMATTER);
    expect(Object.keys(result)).toHaveLength(0);
  });

  test("returns empty record for empty string", () => {
    const result = parseEnvBlock("");
    expect(Object.keys(result)).toHaveLength(0);
  });

  test("parses empty-string value (double quotes with no content)", () => {
    const result = parseEnvBlock(AGENT_ENV_WITH_EMPTY_VALUE);
    expect(result["EMPTY_VAR"]).toBe("");
    expect(result["ANOTHER"]).toBe("set");
  });

  test("does not include non-env frontmatter keys", () => {
    const result = parseEnvBlock(AGENT_WITH_ENV);
    expect("name" in result).toBe(false);
    expect("model" in result).toBe(false);
    expect("tools" in result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// agentMdCandidates
// ---------------------------------------------------------------------------

describe("agentMdCandidates", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.HOME              = process.env.HOME;
    savedEnv.CLAUDE_PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT;
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  test("first candidate is project-local .claude/agents/<name>.md", () => {
    const cwd = "/some/project";
    const candidates = agentMdCandidates("my-agent", cwd);
    expect(candidates[0]).toBe("/some/project/.claude/agents/my-agent.md");
  });

  test("second candidate is HOME/.claude/agents/<name>.md", () => {
    process.env.HOME = "/fake/home";
    const candidates = agentMdCandidates("my-agent", "/cwd");
    expect(candidates[1]).toBe("/fake/home/.claude/agents/my-agent.md");
  });

  test("third candidate uses CLAUDE_PLUGIN_ROOT when set", () => {
    process.env.CLAUDE_PLUGIN_ROOT = "/plugin/root";
    const candidates = agentMdCandidates("my-agent", "/cwd");
    expect(candidates[2]).toBe("/plugin/root/agents/my-agent.md");
  });

  test("uses canonical palantir-mini root when CLAUDE_PLUGIN_ROOT is unset", () => {
    delete process.env.CLAUDE_PLUGIN_ROOT;
    const candidates = agentMdCandidates("my-agent", "/cwd");
    expect(candidates).toHaveLength(3);
    expect(candidates[2]).toBe("/home/palantirkc/palantir-mini/agents/my-agent.md");
  });

  test("all candidates include the agent name as filename stem", () => {
    const candidates = agentMdCandidates("researcher", "/cwd");
    for (const c of candidates) {
      expect(path.basename(c)).toBe("researcher.md");
    }
  });
});
