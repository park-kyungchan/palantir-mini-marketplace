// palantir-mini v3.6.0 — user-prompt-submit hook sibling tests (A13 split).
// Covers: agent name env fallback chain + payload override + prompt_length payload + summarizeUnread truncation.
// Sibling of user-prompt-submit.test.ts (which retains pure helpers + happy/error paths).

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import userPromptSubmit, {
  inboxPathFor,
  summarizeUnread,
  type InboxMessage,
} from "../../hooks/user-prompt-submit";

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ups-"));
  tmpDirs.push(dir);
  return dir;
}

function writeInboxFile(root: string, agentName: string, messages: InboxMessage[]): string {
  const inboxPath = inboxPathFor(root, agentName);
  fs.mkdirSync(path.dirname(inboxPath), { recursive: true });
  fs.writeFileSync(inboxPath, JSON.stringify({ recipient: agentName, messages }, null, 2));
  return inboxPath;
}

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT     = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEnv.PALANTIR_MINI_AGENT_NAME  = process.env.PALANTIR_MINI_AGENT_NAME;
  savedEnv.CLAUDE_AGENT_NAME         = process.env.CLAUDE_AGENT_NAME;
});

afterEach(() => {
  for (const k of ["PALANTIR_MINI_PROJECT", "PALANTIR_MINI_EVENTS_FILE", "PALANTIR_MINI_AGENT_NAME", "CLAUDE_AGENT_NAME"]) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("summarizeUnread truncation", () => {
  test("returns empty string when unread list is empty", () => {
    expect(summarizeUnread([])).toBe("");
  });

  test("includes message count and from/subject/body in summary", () => {
    const summary = summarizeUnread([
      { id: "m1", from: "lead", subject: "task ready", body: "Please start.", read: false },
    ]);
    expect(summary).toContain("1 unread");
    expect(summary).toContain("lead");
    expect(summary).toContain("task ready");
    expect(summary).toContain("Please start");
  });

  test("truncates body at 120 chars + ellipsis", () => {
    const longBody = "x".repeat(200);
    const summary = summarizeUnread([
      { id: "m1", from: "lead", body: longBody, read: false },
    ]);
    expect(summary).toContain("…");
    expect(summary).not.toContain("x".repeat(150));
  });
});

describe("userPromptSubmit — agent name fallback chain", () => {
  test("PALANTIR_MINI_AGENT_NAME unset → CLAUDE_AGENT_NAME used", async () => {
    const root = makeTmpDir();
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(root, ".palantir-mini", "session", "events.jsonl");

    delete process.env.PALANTIR_MINI_AGENT_NAME;
    process.env.CLAUDE_AGENT_NAME = "claude-fallback";
    writeInboxFile(root, "claude-fallback", [{ id: "m1", read: false, body: "from claude env" }]);

    const result = await userPromptSubmit({ cwd: root });
    expect(result.message).toContain("delivered to claude-fallback");
  });

  test("no env set → defaults to 'lead'", async () => {
    const root = makeTmpDir();
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(root, ".palantir-mini", "session", "events.jsonl");
    delete process.env.PALANTIR_MINI_AGENT_NAME;
    delete process.env.CLAUDE_AGENT_NAME;

    writeInboxFile(root, "lead", [{ id: "m1", read: false, body: "default agent" }]);

    const result = await userPromptSubmit({ cwd: root });
    expect(result.message).toContain("delivered to lead");
  });

  test("payload agent_name overrides env", async () => {
    const root = makeTmpDir();
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_AGENT_NAME = "env-name";

    writeInboxFile(root, "payload-name", [{ id: "m1", read: false, body: "via payload" }]);

    const result = await userPromptSubmit({ cwd: root, agent_name: "payload-name" });
    expect(result.message).toContain("delivered to payload-name");
  });
});

describe("userPromptSubmit — event payload", () => {
  test("user_prompt_submitted event payload contains promptLength", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;

    await userPromptSubmit({ cwd: root, prompt_length: 42 });
    const lines = fs.readFileSync(eventsFile, "utf8").trim().split("\n");
    const submitEvent = lines
      .map((l) => JSON.parse(l) as { type: string; payload?: { promptLength?: number } })
      .find((e) => e.type === "user_prompt_submitted");
    expect(submitEvent?.payload?.promptLength).toBe(42);
  });
});
