// palantir-mini v1.1 — user-prompt-submit inbox inject tests
// Defect #3 coverage: unread inbox → additionalContext + mark read + inbox_delivered.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import userPromptSubmit, {
  inboxPathFor,
  readInbox,
  writeInbox,
  summarizeUnread,
  type InboxFile,
} from "../../hooks/user-prompt-submit";
import { readEvents } from "../../lib/event-log/read";

function makeTmpProject(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-ups-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

describe("inbox helpers", () => {
  test("summarizeUnread renders non-empty list", () => {
    const out = summarizeUnread([
      { id: "m1", from: "lead", subject: "Task", body: "please do X", read: false },
    ]);
    expect(out).toContain("1 unread");
    expect(out).toContain("lead");
    expect(out).toContain("Task");
  });

  test("summarizeUnread returns empty for empty input", () => {
    expect(summarizeUnread([])).toBe("");
  });

  test("summarizeUnread truncates long bodies", () => {
    const long = "x".repeat(300);
    const out = summarizeUnread([{ id: "m2", from: "lead", body: long, read: false }]);
    expect(out.length).toBeLessThan(400);
    expect(out).toContain("…");
  });
});

describe("user-prompt-submit integration", () => {
  let tmpRoot: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    tmpRoot = makeTmpProject("integ");
    savedEnv.PALANTIR_MINI_PROJECT      = process.env.PALANTIR_MINI_PROJECT;
    savedEnv.PALANTIR_MINI_EVENTS_FILE  = process.env.PALANTIR_MINI_EVENTS_FILE;
    savedEnv.PALANTIR_MINI_AGENT_NAME   = process.env.PALANTIR_MINI_AGENT_NAME;
    process.env.PALANTIR_MINI_PROJECT     = tmpRoot;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPathFor(tmpRoot);
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("no inbox file — returns default message, emits user_prompt_submitted", async () => {
    const res = await userPromptSubmit({ cwd: tmpRoot, agent_name: "nobody", prompt_length: 12 });
    expect(res.message).toContain("no inbox");
    expect(res.additionalContext).toBeUndefined();
    const events = readEvents(eventsPathFor(tmpRoot));
    expect(events.some((e) => e.type === "user_prompt_submitted")).toBe(true);
  });

  test("inbox with unread messages — injects additionalContext and marks read", async () => {
    const inboxPath = inboxPathFor(tmpRoot, "lead");
    const inbox: InboxFile = {
      recipient: "lead",
      messages: [
        { id: "m1", from: "teammate-a", subject: "status", body: "done", read: false },
        { id: "m2", from: "teammate-b", subject: "question", body: "huh?", read: false },
      ],
    };
    writeInbox(inboxPath, inbox);

    const res = await userPromptSubmit({ cwd: tmpRoot, agent_name: "lead" });
    expect(res.additionalContext).toBeDefined();
    expect(res.additionalContext!).toContain("2 unread");

    const reloaded = readInbox(inboxPath)!;
    expect(reloaded.messages.every((m) => m.read === true)).toBe(true);
    expect(reloaded.messages.every((m) => typeof m.readAt === "string")).toBe(true);

    const events = readEvents(eventsPathFor(tmpRoot));
    const delivered = events.find((e) => e.type === "inbox_delivered");
    expect(delivered).toBeDefined();
    expect((delivered!.payload as { deliveredCount: number }).deliveredCount).toBe(2);
    expect((delivered!.payload as { messageIds: string[] }).messageIds).toEqual(["m1", "m2"]);
  });

  test("inbox with all-read messages — no injection, no delivered event", async () => {
    const inboxPath = inboxPathFor(tmpRoot, "lead");
    writeInbox(inboxPath, {
      recipient: "lead",
      messages: [
        { id: "m1", from: "t", subject: "s", body: "b", read: true, readAt: "prev" },
      ],
    });
    const res = await userPromptSubmit({ cwd: tmpRoot, agent_name: "lead" });
    expect(res.additionalContext).toBeUndefined();
    expect(res.message).toContain("inbox clean");
    const events = readEvents(eventsPathFor(tmpRoot));
    expect(events.some((e) => e.type === "inbox_delivered")).toBe(false);
  });

  test("mixed read/unread — only unread delivered", async () => {
    const inboxPath = inboxPathFor(tmpRoot, "lead");
    writeInbox(inboxPath, {
      recipient: "lead",
      messages: [
        { id: "m1", from: "t", read: true, readAt: "prev" },
        { id: "m2", from: "t", read: false },
        { id: "m3", from: "t", read: true, readAt: "prev" },
        { id: "m4", from: "t", read: false },
      ],
    });
    await userPromptSubmit({ cwd: tmpRoot, agent_name: "lead" });
    const events = readEvents(eventsPathFor(tmpRoot));
    const delivered = events.find((e) => e.type === "inbox_delivered");
    expect((delivered!.payload as { messageIds: string[] }).messageIds).toEqual(["m2", "m4"]);
  });

  test("env fallback: PALANTIR_MINI_AGENT_NAME used when payload missing agent_name", async () => {
    process.env.PALANTIR_MINI_AGENT_NAME = "env-lead";
    const inboxPath = inboxPathFor(tmpRoot, "env-lead");
    writeInbox(inboxPath, {
      recipient: "env-lead",
      messages: [{ id: "m1", from: "x", read: false }],
    });
    const res = await userPromptSubmit({ cwd: tmpRoot });
    expect(res.message).toContain("env-lead");
  });

  test("corrupt inbox JSON → graceful pass-through (no crash, no delivery)", async () => {
    const inboxPath = inboxPathFor(tmpRoot, "broken");
    fs.mkdirSync(path.dirname(inboxPath), { recursive: true });
    fs.writeFileSync(inboxPath, "{{{not valid json", "utf8");
    const res = await userPromptSubmit({ cwd: tmpRoot, agent_name: "broken" });
    expect(res.message).toContain("no inbox");
  });
});
