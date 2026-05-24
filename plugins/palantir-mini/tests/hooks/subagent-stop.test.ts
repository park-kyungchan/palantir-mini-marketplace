// palantir-mini v3.2.0 — subagent-stop hook tests (N3)
// Covers: findAgentMd + main hook smoke

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import subagentStop, { findAgentMd } from "../../hooks/subagent-stop";

function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-sst-${label}-`));
}

describe("findAgentMd", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("fa"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("returns null for empty agentName", () => {
    expect(findAgentMd("", tmp)).toBeNull();
  });

  test("returns null when no agent .md found", () => {
    expect(findAgentMd("nonexistent-x", tmp)).toBeNull();
  });

  test("finds project-local agent .md when present", () => {
    const dir = path.join(tmp, ".claude/agents");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "myagent.md"), "x");
    const result = findAgentMd("myagent", tmp);
    expect(result).toBe(path.join(dir, "myagent.md"));
  });
});

describe("subagentStop hook", () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmpDir("hk"); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  test("returns object (does not throw on missing agent_name)", async () => {
    const r = await subagentStop({ cwd: tmp, exit_code: 0 });
    expect(typeof r).toBe("object");
  });

  test("returns object (does not throw with synthetic agent name)", async () => {
    const r = await subagentStop({ cwd: tmp, agent_name: "x", exit_code: 0 });
    expect(typeof r).toBe("object");
  });
});
