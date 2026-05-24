// palantir-mini v1.1 — UserPromptSubmit hook handler
// Fires on: UserPromptSubmit (user submits a prompt in Claude Code)
//
// v1.1 upgrades (Phase A-2 W2-2 defect #3):
//   - Reads <project>/.palantir-mini/session/inbox-<name>.json for the current
//     receiving teammate (resolved from env PALANTIR_MINI_AGENT_NAME, falling
//     back to a session-scoped inbox).
//   - Finds unread messages (read: false), injects summary as additionalContext.
//   - Marks messages read: true with readAt ISO timestamp.
//   - Emits inbox_delivered event with count + message ids.
//   - Non-blocking (hooks.json sets async: true).
//
// events.jsonl is NEVER touched here — inbox is separate mutable state.
// See rule 10 (events.jsonl append-only) + rule 12 §Auto-inbox injection.

import * as fs from "fs";
import * as path from "path";
import { emit, projectRoot } from "../scripts/log";

interface HookPayload {
  session_id?:     string;
  cwd?:            string;
  prompt_length?:  number;
  agent_name?:     string;
}

export interface InboxMessage {
  id:           string;
  type?:        string;
  from?:        string;
  subject?:     string;
  body?:        string;
  taskId?:      string;
  read:         boolean;
  readAt?:      string;
  createdAt?:   string;
  [k: string]:  unknown;
}

export interface InboxFile {
  recipient:  string;
  messages:   InboxMessage[];
}

/**
 * Resolves the inbox file path for the receiving agent.
 * Prefers explicit agent name; falls back to 'default'.
 */
export function inboxPathFor(root: string, agentName: string): string {
  return path.join(root, ".palantir-mini", "session", `inbox-${agentName}.json`);
}

/** Reads and parses an inbox JSON file. Returns null on missing/invalid. */
export function readInbox(inboxPath: string): InboxFile | null {
  if (!fs.existsSync(inboxPath)) return null;
  try {
    const raw = fs.readFileSync(inboxPath, "utf8");
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw) as InboxFile;
    if (!Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Writes inbox atomically via tmp + rename. */
export function writeInbox(inboxPath: string, inbox: InboxFile): void {
  fs.mkdirSync(path.dirname(inboxPath), { recursive: true });
  const tmp = inboxPath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(inbox, null, 2), "utf8");
  fs.renameSync(tmp, inboxPath);
}

/** Summarizes unread messages for additionalContext injection. */
export function summarizeUnread(unread: InboxMessage[]): string {
  if (unread.length === 0) return "";
  const lines = unread.map((m, i) => {
    const idx = i + 1;
    const from = m.from ? `from ${m.from}` : "from <unknown>";
    const subject = m.subject ? `"${m.subject}"` : (m.type ? `<${m.type}>` : "<no subject>");
    const body = m.body ? ` — ${m.body.slice(0, 120)}${m.body.length > 120 ? "…" : ""}` : "";
    return `  ${idx}. ${from}: ${subject}${body}`;
  });
  return `palantir-mini inbox delivered (${unread.length} unread):\n${lines.join("\n")}`;
}

export default async function userPromptSubmit(payload: unknown): Promise<{ message: string; additionalContext?: string }> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  // v1.35.0 / rule 26 §R3 — Skip emit when no useful payload (promptLength=0
  // or undefined). Empty user_prompt_submitted rows are T0 noise per Axis A3
  // (no evidence content). For T1+ envelopes, tag working+episodic memory
  // layers (Axis E) so this row counts toward refinement substrate.
  const hasContent =
    typeof p.prompt_length === "number" && p.prompt_length > 0;
  if (hasContent) {
    try {
      await emit({
        type: "user_prompt_submitted",
        payload: { promptLength: p.prompt_length },
        toolName:  "UserPromptSubmit",
        cwd,
        sessionId: p.session_id,
        identity:  "claude-code",
        memoryLayers: ["working", "episodic"],
        reasoning: "user prompt accepted; routes to working memory (current task scratchpad) and episodic memory (this session).",
      });
    } catch {
      // best-effort
    }
  }

  // Inbox injection (defect #3 remediation)
  const agentName = p.agent_name
    ?? process.env.PALANTIR_MINI_AGENT_NAME
    ?? process.env.CLAUDE_AGENT_NAME
    ?? "lead";
  const root = projectRoot();
  const inboxPath = inboxPathFor(root, agentName);

  const inbox = readInbox(inboxPath);
  if (!inbox) {
    return { message: "palantir-mini: user_prompt_submitted recorded (no inbox)" };
  }

  const unread = inbox.messages.filter((m) => m.read === false);
  if (unread.length === 0) {
    return { message: `palantir-mini: user_prompt_submitted recorded (inbox clean for ${agentName})` };
  }

  const nowIso = new Date().toISOString();
  const deliveredIds: string[] = [];
  for (const m of inbox.messages) {
    if (m.read === false) {
      m.read = true;
      m.readAt = nowIso;
      deliveredIds.push(m.id);
    }
  }

  try {
    writeInbox(inboxPath, inbox);
  } catch (e) {
    // If writing failed, don't claim delivered.
    return { message: `palantir-mini: inbox write failed: ${(e as Error).message}` };
  }

  try {
    await emit({
      type: "inbox_delivered",
      payload: {
        recipient:      agentName,
        deliveredCount: deliveredIds.length,
        messageIds:     deliveredIds,
      },
      toolName:  "UserPromptSubmit",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
    });
  } catch { /* best-effort */ }

  const summary = summarizeUnread(unread);
  return {
    message: `palantir-mini: user_prompt_submitted recorded (${deliveredIds.length} inbox messages delivered to ${agentName})`,
    additionalContext: summary,
  };
}
