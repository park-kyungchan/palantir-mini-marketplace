// palantir-mini v3.6.0 — user-prompt-submit hook tests orchestrator (A13 split).
// Coverage: pure helpers (readInbox, inboxPathFor) + userPromptSubmit hook happy/error paths.
// Sibling user-prompt-submit-fixtures.test.ts holds env fallback chain + summarizeUnread truncation + payload event.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import userPromptSubmit, {
  inboxPathFor,
  readInbox,
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

function readEventsTypes(eventsFile: string): string[] {
  if (!fs.existsSync(eventsFile)) return [];
  return fs.readFileSync(eventsFile, "utf8").trim().split("\n").filter((l) => l.length > 0)
    .map((l) => (JSON.parse(l) as { type: string }).type);
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

describe("readInbox / inboxPathFor pure helpers", () => {
  test("readInbox returns null for missing file", () => {
    const root = makeTmpDir();
    expect(readInbox(inboxPathFor(root, "x"))).toBeNull();
  });

  test("readInbox returns null for invalid JSON", () => {
    const root = makeTmpDir();
    const p = inboxPathFor(root, "y");
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, "{not json");
    expect(readInbox(p)).toBeNull();
  });
});

describe("userPromptSubmit hook", () => {
  test("happy path — unread inbox, marks read + writes + emits 2 events + delivers context", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;
    process.env.PALANTIR_MINI_AGENT_NAME = "lead";

    const inboxPath = writeInboxFile(root, "lead", [
      { id: "m1", from: "alpha", subject: "ping", body: "ready?", read: false },
      { id: "m2", from: "beta", subject: "pong", body: "ok", read: false },
    ]);

    const result = await userPromptSubmit({ session_id: "sess-1", cwd: root, prompt_length: 18 });

    expect(result.message).toContain("2 inbox messages delivered");
    expect(result.additionalContext).toBeDefined();
    expect(result.additionalContext).toContain("2 unread");

    const after = JSON.parse(fs.readFileSync(inboxPath, "utf8")) as {
      messages: Array<{ read: boolean; readAt?: string }>;
    };
    expect(after.messages.every((m) => m.read === true)).toBe(true);
    expect(after.messages.every((m) => typeof m.readAt === "string")).toBe(true);

    const types = readEventsTypes(eventsFile);
    expect(types).toContain("user_prompt_submitted");
    expect(types).toContain("inbox_delivered");
  });

  test("missing inbox — emits user_prompt_submitted, returns no-inbox message, no additionalContext", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;
    process.env.PALANTIR_MINI_AGENT_NAME = "noinbox";

    const result = await userPromptSubmit({ cwd: root, prompt_length: 12 });
    expect(result.message).toContain("no inbox");
    expect(result.additionalContext).toBeUndefined();
    const types = readEventsTypes(eventsFile);
    expect(types).toContain("user_prompt_submitted");
    expect(types).not.toContain("inbox_delivered");
  });

  test("inbox clean — all messages already read, returns clean message, no inbox_delivered", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;
    process.env.PALANTIR_MINI_AGENT_NAME = "clean";

    writeInboxFile(root, "clean", [{ id: "m1", read: true }, { id: "m2", read: true }]);

    const result = await userPromptSubmit({ cwd: root });
    expect(result.message).toContain("inbox clean for clean");
    expect(result.additionalContext).toBeUndefined();
    const types = readEventsTypes(eventsFile);
    expect(types).not.toContain("inbox_delivered");
  });

  test("invalid inbox JSON — readInbox returns null, returns no-inbox message", async () => {
    const root = makeTmpDir();
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_AGENT_NAME = "broken";

    const inboxPath = inboxPathFor(root, "broken");
    fs.mkdirSync(path.dirname(inboxPath), { recursive: true });
    fs.writeFileSync(inboxPath, "{ not valid");

    const result = await userPromptSubmit({ cwd: root });
    expect(result.message).toContain("no inbox");
    expect(result.additionalContext).toBeUndefined();
  });
});
