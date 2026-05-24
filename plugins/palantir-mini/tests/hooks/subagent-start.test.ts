// palantir-mini v3.2.0 — subagent-start hook tests (N3)
// Covers: parseEnvBlock, agentMdCandidates, readAgentMd, injectEnvFromAgentMd
// PR 5.5 (sprint-116): added correlation marker binding tests

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import subagentStart, {
  parseEnvBlock,
  agentMdCandidates,
  readAgentMd,
  injectEnvFromAgentMd,
  outputContractStartAdvisory,
} from "../../hooks/subagent-start";
import { readCorrelationMarker, readAllMarkersForSession } from "../../lib/correlation/marker";

function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-sas-${label}-`));
}

describe("parseEnvBlock", () => {
  test("returns empty record for content without frontmatter", () => {
    expect(parseEnvBlock("no frontmatter here")).toEqual({});
  });

  test("returns empty record for frontmatter without env block", () => {
    const md = `---
name: test
description: foo
---
body`;
    expect(parseEnvBlock(md)).toEqual({});
  });

  test("parses env block with quoted + unquoted values", () => {
    const md = `---
name: test
env:
  KEY1: "value1"
  KEY2: 'value2'
  KEY3: value3
---
body`;
    expect(parseEnvBlock(md)).toEqual({ KEY1: "value1", KEY2: "value2", KEY3: "value3" });
  });

  test("env block parses indented entries", () => {
    const md = `---
env:
  KEY1: v1
  KEY2: v2
  KEY3: v3
---
body`;
    expect(parseEnvBlock(md)).toEqual({ KEY1: "v1", KEY2: "v2", KEY3: "v3" });
  });
});

describe("agentMdCandidates", () => {
  test("returns 2-3 candidate paths in correct order", () => {
    const cwd = "/some/cwd";
    const out = agentMdCandidates("foo", cwd);
    expect(out[0]).toBe(path.join(cwd, ".claude", "agents", "foo.md"));
    expect(out[1]).toContain(".claude/agents/foo.md");
    // 3rd entry exists only when CLAUDE_PLUGIN_ROOT is set
    expect(out.length).toBeGreaterThanOrEqual(2);
  });
});

describe("readAgentMd", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("rm"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("returns null when no agent .md found", () => {
    expect(readAgentMd("nonexistent-agent-x", tmp)).toBeNull();
  });

  test("reads project-local agent .md when present", () => {
    const dir = path.join(tmp, ".claude", "agents");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "found.md"), "agent-content");
    expect(readAgentMd("found", tmp)).toBe("agent-content");
  });
});

describe("injectEnvFromAgentMd", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("ie"); });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    delete process.env.SUBSTART_TEST_KEY;
  });

  test("injects env vars when previously unset", () => {
    delete process.env.SUBSTART_TEST_KEY;
    const dir = path.join(tmp, ".claude", "agents");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "x.md"), `---
env:
  SUBSTART_TEST_KEY: "from-agent-md"
---
body`);
    injectEnvFromAgentMd("x", tmp);
    expect(String(process.env.SUBSTART_TEST_KEY)).toBe("from-agent-md");
  });

  test("does not overwrite previously-set env vars", () => {
    process.env.SUBSTART_TEST_KEY = "preset";
    const dir = path.join(tmp, ".claude", "agents");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "x.md"), `---
env:
  SUBSTART_TEST_KEY: "from-agent-md"
---`);
    injectEnvFromAgentMd("x", tmp);
    expect(String(process.env.SUBSTART_TEST_KEY)).toBe("preset");
  });
});

describe("subagentStart hook", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("ss"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("returns message with agent name", async () => {
    const r = await subagentStart({ agent_id: "agt-1", agent_name: "researcher", cwd: tmp });
    expect("message" in r).toBe(true);
    const msg = (r as { message: string }).message;
    expect(msg).toContain("subagent_start");
    expect(msg).toContain("researcher");
  });

  test("returns message with fallback name when no agent identity provided", async () => {
    const r = await subagentStart({ cwd: tmp });
    expect("message" in r).toBe(true);
    expect((r as { message: string }).message).toContain("subagent-unnamed");
  });

  test("advises, but does not block, mutation-capable agent missing output contract", async () => {
    const dir = path.join(tmp, ".claude", "agents");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "writer.md"), `---
name: writer
tools: Write, Edit
model: sonnet
---

# Writer
`);
    expect(outputContractStartAdvisory("writer", tmp)).toContain("output contract advisory");
    const r = await subagentStart({ agent_id: "agt-w", agent_name: "writer", cwd: tmp });
    expect("message" in r).toBe(true);
    expect((r as { message: string }).message).toContain("output contract advisory");
  });
});

// PR 5.5 (sprint-116) — Correlation marker binding tests
describe("subagentStart hook — PR 5.5 per-agent correlation marker", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("sscorr"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("writes per-agent marker file when agent_id + session_id provided", async () => {
    const agentId  = "opaque-hash-abc123";
    const sessionId = "sess-test-001";

    await subagentStart({
      agent_id:   agentId,
      agent_name: "implementer",
      session_id: sessionId,
      cwd:        tmp,
    });

    const marker = readCorrelationMarker({
      projectRoot: tmp,
      sessionId,
      subagentId:  agentId,
    });

    expect(marker).not.toBeNull();
    expect(typeof marker!.correlationId).toBe("string");
    expect(marker!.correlationId.length).toBeGreaterThan(10);
    expect(marker!.agentName).toBe("implementer");
    expect(marker!.subagentId).toBe(agentId);
    expect(marker!.sessionId).toBe(sessionId);
  });

  test("marker file correlationId appears in return message", async () => {
    const agentId   = "hash-zzz";
    const sessionId = "sess-test-002";

    const r = await subagentStart({
      agent_id:   agentId,
      agent_name: "researcher",
      session_id: sessionId,
      cwd:        tmp,
    });

    expect("message" in r).toBe(true);
    const msg = (r as { message: string }).message;
    expect(msg).toContain("correlationId=");
  });

  test("two agents spawned in same session write distinct marker files", async () => {
    const sessionId = "sess-dual";

    await subagentStart({
      agent_id:   "agent-hash-alpha",
      agent_name: "implementer",
      session_id: sessionId,
      cwd:        tmp,
    });
    await subagentStart({
      agent_id:   "agent-hash-beta",
      agent_name: "researcher",
      session_id: sessionId,
      cwd:        tmp,
    });

    const markerAlpha = readCorrelationMarker({ projectRoot: tmp, sessionId, subagentId: "agent-hash-alpha" });
    const markerBeta  = readCorrelationMarker({ projectRoot: tmp, sessionId, subagentId: "agent-hash-beta" });

    expect(markerAlpha).not.toBeNull();
    expect(markerBeta).not.toBeNull();
    // Distinct correlationIds — no cross-contamination
    expect(markerAlpha!.correlationId).not.toBe(markerBeta!.correlationId);

    const all = readAllMarkersForSession(tmp, sessionId);
    expect(all.length).toBe(2);
  });

  test("does not write marker when agent_id is absent", async () => {
    const sessionId = "sess-no-id";
    await subagentStart({
      agent_name: "implementer",
      session_id: sessionId,
      cwd:        tmp,
    });

    const markerDir = path.join(tmp, ".palantir-mini", "session", "correlation-markers", sessionId);
    const exists = fs.existsSync(markerDir);
    // Either directory does not exist or it is empty
    if (exists) {
      const files = fs.readdirSync(markerDir).filter(f => f.endsWith(".json"));
      expect(files.length).toBe(0);
    } else {
      expect(exists).toBe(false);
    }
  });

  test("does not write marker when session_id is absent", async () => {
    await subagentStart({
      agent_id:   "hash-no-session",
      agent_name: "implementer",
      cwd:        tmp,
    });

    const baseDir = path.join(tmp, ".palantir-mini", "session", "correlation-markers");
    // No session-keyed subdirectory should be created
    const exists = fs.existsSync(baseDir);
    if (exists) {
      const dirs = fs.readdirSync(baseDir);
      expect(dirs.length).toBe(0);
    } else {
      expect(exists).toBe(false);
    }
  });
});
