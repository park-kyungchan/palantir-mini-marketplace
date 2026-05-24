// palantir-mini v3.7.0 — agent-frontmatter-validate integration (main)
// Coverage: full agentFrontmatterValidate hook default export.
// Decomposed in v3.7.0 A.4: helper unit tests → -helpers.test.ts.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import agentFrontmatterValidate from "../../hooks/agent-frontmatter-validate";
import { readEvents } from "../../lib/event-log/read";

function makeTmpProject(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-fm-${label}-`));
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

const CONFORMANT = `---
name: researcher
description: does research
model: opus
tools:
  - Read
  - Grep
maxTurns: 20
memory: project
---

Body here.
`;

const MISSING_MODEL = `---
name: bad-one
description: no model field
tools: [Read]
---

Body here.
`;

const HAS_INITIAL_PROMPT = `---
name: legacy
description: has forbidden field
model: sonnet
tools: [Read]
initialPrompt: "hello"
---

Body.
`;

const WARN_ONLY_MISSING_RECOMMENDED = `---
name: minimal
description: minimal def
model: sonnet
tools: [Read]
---

Body.
`;

describe("agent-frontmatter-validate integration", () => {
  let tmpRoot: string;
  let fakeHome: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    tmpRoot = makeTmpProject("integ");
    fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fm-home-"));
    savedEnv.PALANTIR_MINI_PROJECT     = process.env.PALANTIR_MINI_PROJECT;
    savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
    savedEnv.HOME                       = process.env.HOME;
    process.env.PALANTIR_MINI_PROJECT     = tmpRoot;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPathFor(tmpRoot);
    process.env.HOME                       = fakeHome;
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    fs.rmSync(fakeHome, { recursive: true, force: true });
  });

  test("all conformant → decision continue, no block", async () => {
    writeAgentMd(tmpRoot, "researcher", CONFORMANT);
    writeAgentMd(tmpRoot, "implementer", CONFORMANT);
    const res = await agentFrontmatterValidate({ cwd: tmpRoot });
    expect(res.decision).toBe("continue");
    expect(res.additionalContext).toContain("2 agent file(s) scanned");
  });

  test("missing required field → decision block with reason", async () => {
    writeAgentMd(tmpRoot, "bad", MISSING_MODEL);
    const res = await agentFrontmatterValidate({ cwd: tmpRoot });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("non-conformant");
    expect(res.reason).toContain("missing required: model");
  });

  test("forbidden initialPrompt → decision block", async () => {
    writeAgentMd(tmpRoot, "legacy", HAS_INITIAL_PROMPT);
    const res = await agentFrontmatterValidate({ cwd: tmpRoot });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("forbidden field");
    expect(res.reason).toContain("initialPrompt");
  });

  test("warn-only missing recommended → decision continue + warning event", async () => {
    writeAgentMd(tmpRoot, "minimal", WARN_ONLY_MISSING_RECOMMENDED);
    const res = await agentFrontmatterValidate({ cwd: tmpRoot });
    expect(res.decision).toBe("continue");
    expect(res.additionalContext).toContain("Warnings");
    const events = readEvents(eventsPathFor(tmpRoot));
    const v = events.find((e) => e.type === "agent_frontmatter_validated");
    expect(v).toBeDefined();
    const p = v!.payload as { warnings: number; nonconformant: number; conformant: number };
    expect(p.warnings).toBe(1);
    expect(p.nonconformant).toBe(0);
    expect(p.conformant).toBe(1);
  });

  test("empty agents dir → scanned=0, continue", async () => {
    const res = await agentFrontmatterValidate({ cwd: tmpRoot });
    expect(res.decision).toBe("continue");
    expect(res.additionalContext).toContain("0 agent file(s) scanned");
  });

  test("mixed conformant + non-conformant → block, event counts accurate", async () => {
    writeAgentMd(tmpRoot, "good", CONFORMANT);
    writeAgentMd(tmpRoot, "bad", MISSING_MODEL);
    const res = await agentFrontmatterValidate({ cwd: tmpRoot });
    expect(res.decision).toBe("block");
    const events = readEvents(eventsPathFor(tmpRoot));
    const v = events.find((e) => e.type === "agent_frontmatter_validated");
    const p = v!.payload as { scanned: number; nonconformant: number; conformant: number };
    expect(p.scanned).toBe(2);
    expect(p.nonconformant).toBe(1);
    expect(p.conformant).toBe(1);
  });

  test("BROWSE.md + INDEX.md alongside conformant agent → continue (docs skipped)", async () => {
    writeAgentMd(tmpRoot, "researcher", CONFORMANT);
    const dir = path.join(tmpRoot, ".claude", "agents");
    fs.writeFileSync(path.join(dir, "BROWSE.md"), "# Query Router\n");
    fs.writeFileSync(path.join(dir, "INDEX.md"), "# Structure Index\n");
    const res = await agentFrontmatterValidate({ cwd: tmpRoot });
    expect(res.decision).toBe("continue");
    expect(res.additionalContext).toContain("1 agent file(s) scanned");
    const events = readEvents(eventsPathFor(tmpRoot));
    const v = events.find((e) => e.type === "agent_frontmatter_validated");
    const p = v!.payload as { scanned: number; nonconformant: number };
    expect(p.scanned).toBe(1);
    expect(p.nonconformant).toBe(0);
  });
});
