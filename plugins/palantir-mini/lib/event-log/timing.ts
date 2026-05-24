/**
 * palantir-mini v2.8.2 — Handler latency instrumentation (Session 3 Slice 1).
 *
 * @owner palantirkc-plugin-events
 * @purpose B-15 closure: capture every MCP `tools/call` dispatch with `durationMs`
 *          + success flag + optional errorClass, written as a `tool_invocation_completed`
 *          event into the plugin-self events.jsonl. Mirrors AIP architecture #2
 *          End-to-end observability — handler-level telemetry without per-handler
 *          instrumentation cost.
 *
 * Authority chain:
 *   ~/.claude/research/palantir-foundry/architecture/architecture-center-aip-architecture.md §2
 *   → schemas/ontology (no schema-side primitive — plugin-internal Decision Lineage envelope)
 *   → lib/event-log/types.ts (ToolInvocationCompletedEnvelope variant)
 *   → bridge/mcp-server.ts (dispatch wrapper, sole emitter)
 *
 * Rule 10: every emit goes through `appendEventAtomic` with the 5-dim envelope.
 *          Best-effort: telemetry write failure MUST NOT break tool dispatch.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { appendEventAtomic } from "./append";
import type {
  CommitSha,
  EventEnvelope,
  EventId,
  SessionId,
} from "./types";

// ─── Plugin-self path resolution ──────────────────────────────────────────────
//
// `import.meta.dir` resolves to .../palantir-mini/lib/event-log when this file
// runs under Bun. Two levels up = plugin root. We DO NOT chase project events.jsonl
// for tool_invocation_completed — handler-timing telemetry is plugin-self metadata,
// not project-domain state. Per-project events stay populated by the handlers themselves
// via their existing emit calls.

const PLUGIN_ROOT = path.resolve(import.meta.dir, "..", "..");
const PLUGIN_EVENTS_PATH = path.join(
  PLUGIN_ROOT,
  ".palantir-mini",
  "session",
  "events.jsonl",
);

// ─── Timer primitives (the public surface for handler-side opt-in instrumentation) ──

/** High-resolution wall-clock in milliseconds. Prefer over `Date.now()` for sub-ms precision. */
export function now(): number {
  return performance.now();
}

/** Elapsed milliseconds since `startedAt`, rounded to integer. Returns ≥ 0. */
export function elapsedMs(startedAt: number): number {
  const delta = performance.now() - startedAt;
  return Math.max(0, Math.round(delta));
}

// ─── Git HEAD cache (atopWhich) ────────────────────────────────────────────────
//
// Cached for the lifetime of the MCP server process — git HEAD does not change
// during a session unless the user runs git checkout, in which case the slight
// staleness is acceptable for telemetry envelopes (lineage replay still resolves
// the actual commit by git history, not by this cached value).

let gitHeadCache: string | null = null;
function gitHead(): string {
  if (gitHeadCache !== null) return gitHeadCache;
  try {
    gitHeadCache = execSync("git rev-parse HEAD", {
      cwd: PLUGIN_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    gitHeadCache = "no-git";
  }
  return gitHeadCache;
}

// ─── eventId generator (matches existing handler convention) ───────────────────

function makeEventId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `evt-${ts}-${rand}`;
}

// ─── errorClass extraction (lightweight, no full stack) ───────────────────────

export function classifyError(err: unknown): string {
  if (err instanceof Error) {
    // NodeJS errno codes (e.g. ENOENT, EACCES) are more useful than just "Error"
    const errnoCode = (err as NodeJS.ErrnoException).code;
    if (typeof errnoCode === "string" && errnoCode.length > 0) return errnoCode;
    return err.constructor.name;
  }
  if (typeof err === "string") return "StringError";
  return "UnknownError";
}

// ─── The emit function (called by mcp-server.ts dispatch wrapper) ─────────────

export interface ToolInvocationCompletedInput {
  toolName:    string;
  durationMs:  number;
  success:     boolean;
  errorClass?: string;
  /** Test-seam: override the events.jsonl destination (defaults to plugin-self). */
  eventsPathOverride?: string;
}

/**
 * Best-effort telemetry emit. Failure to append (e.g. lock contention, full disk)
 * is silently swallowed so it never breaks the tool dispatch path. Per rule 10
 * the event substrate is append-only — we never overwrite or recover from a
 * failed write at this layer; reconciliation belongs to `orphan_event_reconciled`
 * downstream if needed.
 */
export async function emitToolInvocationCompleted(
  input: ToolInvocationCompletedInput,
): Promise<void> {
  const eventsPath = input.eventsPathOverride ?? PLUGIN_EVENTS_PATH;
  // Cheap guard: if the plugin-self session dir was never initialized (fresh
  // install, never invoked), we still create the parent directory inside
  // appendEventAtomic. No-op if disk is read-only.
  const envelope: Omit<EventEnvelope, "sequence"> = {
    eventId:   makeEventId() as EventId,
    when:      new Date().toISOString(),
    atopWhich: gitHead() as CommitSha,
    throughWhich: {
      sessionId: (process.env.CLAUDE_SESSION_ID ?? "local") as SessionId,
      toolName:  input.toolName,
      cwd:       process.cwd(),
    },
    byWhom: {
      identity: "claude-code",
    },
    withWhat: {
      reasoning: input.success
        ? `tool ${input.toolName} completed in ${input.durationMs}ms`
        : `tool ${input.toolName} failed in ${input.durationMs}ms (${input.errorClass ?? "unknown"})`,
    },
    type: "tool_invocation_completed",
    payload: {
      toolName:   input.toolName,
      durationMs: input.durationMs,
      success:    input.success,
      ...(input.errorClass ? { errorClass: input.errorClass } : {}),
    },
  };

  try {
    // mkdir parent recursively; appendEventAtomic does this too but we want to
    // keep the lock window small.
    fs.mkdirSync(path.dirname(eventsPath), { recursive: true });
    await appendEventAtomic(eventsPath, envelope);
  } catch {
    // Best-effort. Telemetry MUST NOT break tool dispatch.
  }
}

// ─── Test seam ────────────────────────────────────────────────────────────────
//
// Tests need to override the events path + reset the git cache. Exposed as
// underscore-prefixed to signal "internal — not for runtime callers".

export const _testing = {
  pluginEventsPath:    PLUGIN_EVENTS_PATH,
  pluginRoot:          PLUGIN_ROOT,
  resetGitHeadCache(): void {
    gitHeadCache = null;
  },
};
