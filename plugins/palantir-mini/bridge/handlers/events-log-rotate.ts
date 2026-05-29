// palantir-mini v6.80.0 — MCP tool handler: events_log_rotate
// Domain: LEARN (AppendOnlyEventLog retention) + ACTION (AtomicCommit)
//
// Rotates a breached events.jsonl through lib/event-log/rotate and writes an
// event_log_rotated bridge row into the fresh live log under the same lock.

import * as path from "path";
import { rotateEventLog } from "../../lib/event-log/rotate";
import type {
  CommitSha,
  EventEnvelope,
  EventId,
  SessionId,
} from "../../lib/event-log/types";

export interface EventsLogRotateArgs {
  project: string;
  thresholdBytes?: number;
  thresholdLines?: number;
  sessionId?: string;
  agentName?: string;
}

export interface EventsLogRotateResult {
  rotated: boolean;
  archivedPath?: string;
  sizeBytes: number;
  lineCount: number;
  thresholdBytes: number;
  thresholdLines: number;
  eventsPath: string;
  lastSequence?: number;
  rotationEventSequence?: number;
}

function eventId(): EventId {
  return `evt-events-log-rotated-${Date.now()}-${Math.random().toString(36).slice(2)}` as EventId;
}

function sessionId(args: EventsLogRotateArgs): SessionId {
  return (
    args.sessionId ??
    process.env.PALANTIR_MINI_SESSION_ID ??
    process.env.CODEX_SESSION_ID ??
    process.env.CLAUDE_SESSION_ID ??
    "local"
  ) as SessionId;
}

function commitSha(): CommitSha {
  return (
    process.env.GIT_COMMIT ??
    process.env.GITHUB_SHA ??
    process.env.CI_COMMIT_SHA ??
    "unknown"
  ) as CommitSha;
}

function optionalPositiveNumber(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`events_log_rotate: \`${name}\` must be a positive number`);
  }
  return value;
}

export default async function eventsLogRotate(
  rawArgs: unknown,
): Promise<EventsLogRotateResult> {
  const args = (rawArgs ?? {}) as EventsLogRotateArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("events_log_rotate: `project` is required");
  }

  const thresholdBytes = optionalPositiveNumber(args.thresholdBytes, "thresholdBytes");
  const thresholdLines = optionalPositiveNumber(args.thresholdLines, "thresholdLines");
  const eventsPath = path.join(args.project, ".palantir-mini", "session", "events.jsonl");

  const result = await rotateEventLog(args.project, {
    ...(thresholdBytes !== undefined ? { thresholdBytes } : {}),
    ...(thresholdLines !== undefined ? { thresholdLines } : {}),
    rotationEvent: (info): Omit<EventEnvelope, "sequence"> => ({
      eventId: eventId(),
      when: new Date().toISOString(),
      atopWhich: commitSha(),
      throughWhich: {
        sessionId: sessionId(args),
        toolName: "events_log_rotate",
        cwd: args.project,
        surface: "mcp",
      },
      byWhom: {
        identity: "monitor",
        agentName: args.agentName ?? "events-log-rotate",
        runtime: "palantir-mini-mcp",
      },
      withWhat: {
        reasoning:
          "Rotated events.jsonl through atomic archive rename and wrote a bridge event into the fresh log.",
        hypothesis:
          "Preserving sequence continuity across archive and live logs keeps BackPropagation replay deterministic after retention cleanup.",
        memoryLayers: ["episodic", "procedural"],
        refinementTarget: {
          kind: "other",
          filePathOrRid: "lib/event-log/rotate.ts",
          description:
            "Append-only event-log retention boundary with archive-aware replay continuity.",
          confidenceLevel: "high",
        },
      },
      type: "event_log_rotated",
      payload: {
        archivedPath: info.archivedPath,
        sizeBytes: info.sizeBytes,
        lineCount: info.lineCount,
        thresholdBytes: info.thresholdBytes,
        thresholdLines: info.thresholdLines,
      },
      valueGrade: "T3",
    }),
  });

  return {
    ...result,
    eventsPath,
  };
}
