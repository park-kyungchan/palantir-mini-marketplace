// palantir-mini v1.4 — lead-idle-digest hook
// Fires on: TeammateIdle (advisory, async: true)
//
// Phase A-4: aggregates idle pings into a time-windowed digest buffer instead
// of forwarding every idle ping to Lead as a notification. This prevents the
// 71.4% idle-notification saturation observed in phase-a3 (170/238 messages).
//
// Behavior:
// - Every idle ping is appended to /tmp/claude-hooks/<sessionId>/idle-digest.jsonl.
// - Returns {suppressNotification: true} for every individual ping.
// - Every 5 minutes (tracked by last-flush timestamp), emits a consolidated
//   inbox message to Lead summarizing pending idles since last flush.
//   The flush is best-effort: if writing fails, next call retries.
//
// See plan §Layer 3 hook #2, rule 12 §Idle cost management.

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";

interface HookPayload {
  agent_id?:    string;
  idle_count?:  number;
  session_id?:  string;
  cwd?:         string;
}

interface DigestEntry {
  agentId:    string;
  idleCount:  number;
  recordedAt: string;
}

interface FlushMeta {
  lastFlushedAt: string;
}

export const DIGEST_FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function resolveSessionId(p: HookPayload): string {
  return p.session_id ?? process.env.CLAUDE_SESSION_ID ?? "default";
}

function digestDir(sessionId: string): string {
  return path.join("/tmp", "claude-hooks", sessionId);
}

function digestPath(sessionId: string): string {
  return path.join(digestDir(sessionId), "idle-digest.jsonl");
}

function flushMetaPath(sessionId: string): string {
  return path.join(digestDir(sessionId), "idle-digest-flush.json");
}

function appendDigestEntry(sessionId: string, entry: DigestEntry): void {
  const dir = digestDir(sessionId);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(digestPath(sessionId), JSON.stringify(entry) + "\n", "utf8");
}

function readPendingEntries(sessionId: string): DigestEntry[] {
  const p = digestPath(sessionId);
  if (!fs.existsSync(p)) return [];
  try {
    return fs
      .readFileSync(p, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l) as DigestEntry);
  } catch {
    return [];
  }
}

function readFlushMeta(sessionId: string): FlushMeta {
  const p = flushMetaPath(sessionId);
  if (!fs.existsSync(p)) {
    const init = { lastFlushedAt: new Date().toISOString() };
    try { writeFlushMeta(sessionId, init); } catch { /* best-effort */ }
    return init;
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as FlushMeta;
  } catch {
    return { lastFlushedAt: new Date().toISOString() };
  }
}

function writeFlushMeta(sessionId: string, meta: FlushMeta): void {
  const dir = digestDir(sessionId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(flushMetaPath(sessionId), JSON.stringify(meta, null, 2), "utf8");
}

function clearDigest(sessionId: string): void {
  const p = digestPath(sessionId);
  if (fs.existsSync(p)) {
    fs.writeFileSync(p, "", "utf8");
  }
}

export function buildDigestSummary(entries: DigestEntry[]): string {
  if (entries.length === 0) return "No idle pings in this window.";

  const byAgent: Record<string, number> = {};
  for (const e of entries) {
    byAgent[e.agentId] = (byAgent[e.agentId] ?? 0) + 1;
  }

  const sorted = Object.entries(byAgent)
    .sort(([, a], [, b]) => b - a)
    .map(([id, n]) => `  - ${id}: ${n} idle ping(s)`)
    .join("\n");

  return `Idle digest (last ${entries.length} ping(s)):\n${sorted}\nConsider shutting down deeply-blocked teammates.`;
}

export default async function leadIdleDigest(payload: unknown): Promise<{
  message:              string;
  suppressNotification?: boolean;
  additionalContext?:   string;
}> {
  const p         = (payload ?? {}) as HookPayload;
  const cwd       = p.cwd ?? process.cwd();
  const agentId   = p.agent_id ?? "unknown";
  const idleCount = p.idle_count ?? 0;
  const sessionId = resolveSessionId(p);

  // Check if flush window has elapsed (based on prior state, before this ping)
  const meta       = readFlushMeta(sessionId);
  const lastFlush  = new Date(meta.lastFlushedAt).getTime();
  const now        = Date.now();
  const shouldFlush = (now - lastFlush) >= DIGEST_FLUSH_INTERVAL_MS;

  let digestContext = "";
  if (shouldFlush) {
    const pending = readPendingEntries(sessionId);
    if (pending.length > 0) {
      const summary = buildDigestSummary(pending);

      try {
        await emit({
          type:      "teammate_idle",
          payload:   { agentId: "digest-flush", idleCount: pending.length },
          toolName:  "TeammateIdle",
          cwd,
          sessionId,
          identity:  "monitor",
          reasoning: `lead-idle-digest flush: ${pending.length} entries consolidated`,
        });
      } catch {
        // best-effort
      }

      digestContext = summary;
    }

    // Clear old entries + update flush meta BEFORE appending current ping,
    // so the current ping starts the new window.
    clearDigest(sessionId);
    writeFlushMeta(sessionId, { lastFlushedAt: new Date().toISOString() });
  }

  // Append current ping (after flush if one occurred — current entry starts new window)
  const entry: DigestEntry = {
    agentId,
    idleCount,
    recordedAt: new Date().toISOString(),
  };
  appendDigestEntry(sessionId, entry);

  return {
    message:              `palantir-mini: lead-idle-digest (agent=${agentId}, buffered, flush=${shouldFlush})`,
    suppressNotification: !shouldFlush,
    ...(digestContext ? { additionalContext: digestContext } : {}),
  };
}
