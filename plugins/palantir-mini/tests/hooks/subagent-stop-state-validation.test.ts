// palantir-mini v1.1 — subagent-stop state validation tests
// Defect #1, #7, #8 coverage: schema validation, envelope wrap-on-read,
// missing file detection, schema mismatch → block.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import subagentStop, {
  parseOutputContract,
  validateAgainstContract,
} from "../../hooks/subagent-stop";
import { readEvents } from "../../lib/event-log/read";

function makeTmpProject(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-ss-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function writeAgentMd(root: string, name: string, body: string): string {
  const dir = path.join(root, ".claude", "agents");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.md`);
  fs.writeFileSync(file, body, "utf8");
  return file;
}

function writeMarkdownReport(root: string, reportPath = "report.md"): void {
  const file = path.join(root, reportPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "# Subagent Report\n\nValidated output report.\n", "utf8");
}

function agentMdBody(statePath: string, requiredFields: string[], envelopeKind?: string, markdownReportPath = "report.md"): string {
  return `---
name: test-agent
description: test
model: sonnet
tools: [Read]
---

## Output Contract

- statePath: ${statePath}
- markdownReportPath: ${markdownReportPath}
- requiredFields: ${requiredFields.join(", ")}
${envelopeKind ? `- envelopeKind: ${envelopeKind}\n` : ""}
## Body

Test agent.
`;
}

describe("parseOutputContract", () => {
  test("parses a contract with envelope", () => {
    const md = agentMdBody("state.json", ["a", "b"], "blueprint");
    const c = parseOutputContract(md);
    expect(c).not.toBeNull();
    expect(c!.statePath).toBe("state.json");
    expect(c!.markdownReportPath).toBe("report.md");
    expect(c!.requiredFields).toEqual(["a", "b"]);
    expect(c!.envelopeKind).toBe("blueprint");
  });

  test("parses a contract without envelope", () => {
    const md = agentMdBody("state.json", ["x"]);
    const c = parseOutputContract(md);
    expect(c).not.toBeNull();
    expect(c!.envelopeKind).toBeUndefined();
  });

  test("returns null when section absent", () => {
    expect(parseOutputContract("no contract here")).toBeNull();
  });
});

describe("validateAgainstContract", () => {
  test("flat-valid passes", () => {
    const r = validateAgainstContract({ a: 1, b: 2 }, { statePath: "s.json", requiredFields: ["a", "b"] });
    expect(r.passed).toBe(true);
  });

  test("missing required fails", () => {
    const r = validateAgainstContract({ a: 1 }, { statePath: "s.json", requiredFields: ["a", "b"] });
    expect(r.passed).toBe(false);
    expect(r.errorClass).toBe("MissingRequiredFields");
  });

  test("envelope-wrap-on-read when flat payload", () => {
    const r = validateAgainstContract(
      { schema_version: "1.0", primitives: [] },
      { statePath: "b.json", requiredFields: ["schema_version", "primitives"], envelopeKind: "blueprint" },
    );
    expect(r.passed).toBe(true);
    expect(r.wrapped).toBe(true);
  });

  test("already-enveloped payload validates without wrap", () => {
    const r = validateAgainstContract(
      { blueprint: { schema_version: "1.0", primitives: [] } },
      { statePath: "b.json", requiredFields: ["schema_version", "primitives"], envelopeKind: "blueprint" },
    );
    expect(r.passed).toBe(true);
    expect(r.wrapped).toBe(false);
  });
});

describe("subagent-stop integration", () => {
  let tmpRoot: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    tmpRoot = makeTmpProject("integ");
    savedEnv.PALANTIR_MINI_PROJECT     = process.env.PALANTIR_MINI_PROJECT;
    savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
    savedEnv.HOME                       = process.env.HOME;
    process.env.PALANTIR_MINI_PROJECT     = tmpRoot;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPathFor(tmpRoot);
    process.env.HOME                       = tmpRoot; // isolate user-global .claude/agents
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("no agent .md found → pass-through with warning event", async () => {
    const res = await subagentStop({ agent_id: "a1", agent_name: "absent", cwd: tmpRoot });
    expect(res.decision ?? "continue").toBe("continue");
    const events = readEvents(eventsPathFor(tmpRoot));
    const warn = events.find((e) => e.type === "subagent_state_validation");
    expect(warn).toBeDefined();
    expect((warn!.payload as { errorClass?: string }).errorClass).toBe("NoAgentDefinition");
  });

  test("agent .md with no contract → pass-through when not mutation-capable", async () => {
    writeAgentMd(tmpRoot, "plain", "---\nname: plain\nmodel: sonnet\ntools: []\ndescription: x\n---\n\nBody only.\n");
    const res = await subagentStop({ agent_id: "a2", agent_name: "plain", cwd: tmpRoot });
    expect(res.decision ?? "continue").toBe("continue");
    const events = readEvents(eventsPathFor(tmpRoot));
    const v = events.find((e) => e.type === "subagent_state_validation");
    expect((v!.payload as { errorClass?: string }).errorClass).toBe("NoContractDeclared");
  });

  test("mutation-capable agent with no contract → block", async () => {
    writeAgentMd(tmpRoot, "writer", "---\nname: writer\nmodel: sonnet\ntools: [Read, Write, Edit]\ndescription: x\n---\n\nBody only.\n");
    const res = await subagentStop({ agent_id: "a2b", agent_name: "writer", cwd: tmpRoot });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("missing required output contract");
    const events = readEvents(eventsPathFor(tmpRoot));
    const v = events.find((e) => e.type === "subagent_state_validation");
    expect((v!.payload as { errorClass?: string }).errorClass).toBe("MissingOutputContract");
  });

  test("outputContractExempt agent with no contract → continue", async () => {
    writeAgentMd(tmpRoot, "reader", `---
name: reader
model: sonnet
tools: [Read]
description: x
outputContractExempt:
  reason: "Read-only test fixture; no mutation authority."
---

Body only.
`);
    const res = await subagentStop({ agent_id: "a2c", agent_name: "reader", cwd: tmpRoot });
    expect(res.decision ?? "continue").toBe("continue");
    const events = readEvents(eventsPathFor(tmpRoot));
    const v = events.find((e) => e.type === "subagent_state_validation");
    expect((v!.payload as { errorClass?: string }).errorClass).toBe("OutputContractExempt");
  });

  test("valid state file → continue", async () => {
    writeAgentMd(tmpRoot, "v", agentMdBody("state.json", ["a", "b"]));
    fs.writeFileSync(path.join(tmpRoot, "state.json"), JSON.stringify({ a: 1, b: 2 }));
    writeMarkdownReport(tmpRoot);
    const res = await subagentStop({ agent_id: "a3", agent_name: "v", cwd: tmpRoot });
    expect(res.decision ?? "continue").toBe("continue");
    const events = readEvents(eventsPathFor(tmpRoot));
    const v = events.find((e) => e.type === "subagent_state_validation" && (e.payload as { passed: boolean }).passed === true);
    expect(v).toBeDefined();
  });

  test("missing markdown report → block", async () => {
    writeAgentMd(tmpRoot, "missing-report", agentMdBody("state.json", ["a"]));
    fs.writeFileSync(path.join(tmpRoot, "state.json"), JSON.stringify({ a: 1 }));
    const res = await subagentStop({ agent_id: "a3b", agent_name: "missing-report", cwd: tmpRoot });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("markdown report");
    const events = readEvents(eventsPathFor(tmpRoot));
    const v = events.find((e) => e.type === "subagent_state_validation" && (e.payload as { errorClass?: string }).errorClass === "MarkdownReportMissing");
    expect(v).toBeDefined();
  });

  test("non-markdown report path → block", async () => {
    writeAgentMd(tmpRoot, "bad-report-path", agentMdBody("state.json", ["a"], undefined, "report.txt"));
    fs.writeFileSync(path.join(tmpRoot, "state.json"), JSON.stringify({ a: 1 }));
    fs.writeFileSync(path.join(tmpRoot, "report.txt"), "report");
    const res = await subagentStop({ agent_id: "a3c", agent_name: "bad-report-path", cwd: tmpRoot });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("markdown report");
    const events = readEvents(eventsPathFor(tmpRoot));
    const v = events.find((e) => e.type === "subagent_state_validation" && (e.payload as { errorClass?: string }).errorClass === "MarkdownReportInvalid");
    expect(v).toBeDefined();
  });

  test("empty markdown report → block", async () => {
    writeAgentMd(tmpRoot, "empty-report", agentMdBody("state.json", ["a"]));
    fs.writeFileSync(path.join(tmpRoot, "state.json"), JSON.stringify({ a: 1 }));
    fs.writeFileSync(path.join(tmpRoot, "report.md"), "");
    const res = await subagentStop({ agent_id: "a3d", agent_name: "empty-report", cwd: tmpRoot });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("empty");
  });

  test("invalid schema → block with reason", async () => {
    writeAgentMd(tmpRoot, "bad", agentMdBody("state.json", ["a", "b", "c"]));
    fs.writeFileSync(path.join(tmpRoot, "state.json"), JSON.stringify({ a: 1 }));
    const res = await subagentStop({ agent_id: "a4", agent_name: "bad", cwd: tmpRoot });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("schema mismatch");
  });

  test("missing state file → block", async () => {
    writeAgentMd(tmpRoot, "miss", agentMdBody("nope.json", ["a"]));
    const res = await subagentStop({ agent_id: "a5", agent_name: "miss", cwd: tmpRoot });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("was not written");
  });

  test("envelope wrap-on-read: flat payload validates successfully", async () => {
    writeAgentMd(tmpRoot, "env", agentMdBody("blueprint.json", ["schema_version"], "blueprint"));
    fs.writeFileSync(path.join(tmpRoot, "blueprint.json"), JSON.stringify({ schema_version: "1.0" }));
    writeMarkdownReport(tmpRoot);
    const res = await subagentStop({ agent_id: "a6", agent_name: "env", cwd: tmpRoot });
    expect(res.decision ?? "continue").toBe("continue");
    const events = readEvents(eventsPathFor(tmpRoot));
    const v = events.find((e) => e.type === "subagent_state_validation" && (e.payload as { passed: boolean }).passed === true);
    expect((v!.payload as { wrapped?: boolean }).wrapped).toBe(true);
  });

  test("invalid JSON in state file → block", async () => {
    writeAgentMd(tmpRoot, "badjson", agentMdBody("state.json", ["a"]));
    fs.writeFileSync(path.join(tmpRoot, "state.json"), "not json");
    const res = await subagentStop({ agent_id: "a7", agent_name: "badjson", cwd: tmpRoot });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("not valid JSON");
  });

  test("subagent_stop event always emitted first", async () => {
    const res = await subagentStop({ agent_id: "a8", agent_name: "nonexistent", cwd: tmpRoot, exit_code: 0 });
    expect(res.decision ?? "continue").toBe("continue");
    const events = readEvents(eventsPathFor(tmpRoot));
    expect(events.some((e) => e.type === "subagent_stop")).toBe(true);
  });
});
