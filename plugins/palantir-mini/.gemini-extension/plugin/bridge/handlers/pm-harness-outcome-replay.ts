// palantir-mini v2.26.0 — MCP tool handler: pm_harness_outcome_replay
// Domain: LEARN (Harness — D8.1)
//
// Per-sprint replay: deterministic timeline + verdict + iteration count +
// drift curve over events.jsonl filtered by sprintNumber. Read-only —
// does not emit new events. Supersedes the manual chain of
// `replay_lineage` + `pm_harness_strictness_audit` + `feedback-*.md` reads
// previously assembled by harness operators.
//
// Authority chain:
//   ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §9.2 (D8)
//   -> ~/.claude/plans/immutable-forging-summit.md §3.1 T2c-4
//   -> rules/16-3-agent-harness.md (sprint event schema)
//   -> rules/10-events-jsonl.md (5-dim envelope, append-only)

import * as path from "path";
import { readEvents } from "../../lib/event-log/read";
import type { EventEnvelope } from "../../lib/event-log/types";

interface PmHarnessOutcomeReplayArgs {
  /** Project root (events.jsonl is read from <project>/.palantir-mini/session/). */
  project: string;
  /** Sprint number to filter on (matches `payload.sprintNumber`). */
  sprintNumber: number;
}

interface IterationDataPoint {
  iteration: number;
  /** finalScore from grading_completed if present, else null. */
  score: number | null;
  /** verdict from grading_completed payload if present. */
  verdict?: string;
  /** evidenceDir from playwright_scenario_executed if present. */
  evidenceDir?: string;
}

interface PmHarnessOutcomeReplayResult {
  project: string;
  sprintNumber: number;
  /** True when no events match the filter. */
  empty: boolean;
  /** Total events that matched. */
  totalEvents: number;
  /** Compact timeline of matched events (ordered by sequence). */
  timeline: Array<{
    sequence: number;
    when: string;
    eventType: EventEnvelope["type"];
    iteration?: number;
    role?: string;
    summary?: string;
  }>;
  /** Last verdict from feedback_loop_closed if present. */
  finalVerdict: "passed" | "failed" | "aborted" | "incomplete";
  /** Iteration count (max iteration seen across events). */
  iterationCount: number;
  /** Per-iteration drift curve (sorted ascending by iteration). */
  driftCurve: IterationDataPoint[];
}

function summarizeEvent(ev: EventEnvelope): string | undefined {
  switch (ev.type) {
    case "sprint_contract_bound":
      return `bound: ${ev.payload.role} role, ${ev.payload.roundCount} rounds`;
    case "sprint_contract_negotiated":
      return `negotiated: ${ev.payload.role} ${ev.payload.action} round ${ev.payload.round}`;
    case "playwright_scenario_executed":
      return `scenario ${ev.payload.scenarioId}: ${ev.payload.evidenceDir}`;
    case "grading_completed": {
      const p = ev.payload as { rubricId: string; overallScore?: unknown };
      const score = typeof p.overallScore === "number" ? String(p.overallScore) : "?";
      return `grade: ${p.rubricId} → ${score}`;
    }
    case "feedback_loop_closed":
      return `closed: verdict=${ev.payload.verdict} iterations=${ev.payload.iterationCount}`;
    default:
      return undefined;
  }
}

function payloadSprintNumber(ev: EventEnvelope): number | undefined {
  const p = ev.payload as { sprintNumber?: unknown };
  return typeof p.sprintNumber === "number" ? p.sprintNumber : undefined;
}

function payloadIteration(ev: EventEnvelope): number | undefined {
  const p = ev.payload as { iteration?: unknown };
  return typeof p.iteration === "number" ? p.iteration : undefined;
}

function payloadOverallScore(ev: EventEnvelope): number | undefined {
  const p = ev.payload as { overallScore?: unknown };
  return typeof p.overallScore === "number" ? p.overallScore : undefined;
}

function payloadVerdict(ev: EventEnvelope): string | undefined {
  const p = ev.payload as { verdict?: unknown };
  return typeof p.verdict === "string" ? p.verdict : undefined;
}

function payloadEvidenceDir(ev: EventEnvelope): string | undefined {
  const p = ev.payload as { evidenceDir?: unknown };
  return typeof p.evidenceDir === "string" ? p.evidenceDir : undefined;
}

function payloadRole(ev: EventEnvelope): string | undefined {
  const p = ev.payload as { role?: unknown };
  return typeof p.role === "string" ? p.role : undefined;
}

export default async function pmHarnessOutcomeReplay(
  rawArgs: unknown,
): Promise<PmHarnessOutcomeReplayResult> {
  const args = (rawArgs ?? {}) as PmHarnessOutcomeReplayArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("pm_harness_outcome_replay: `project` required");
  }
  if (typeof args.sprintNumber !== "number") {
    throw new Error("pm_harness_outcome_replay: `sprintNumber` required (number)");
  }

  const eventsPath = path.join(args.project, ".palantir-mini", "session", "events.jsonl");
  const all = readEvents(eventsPath);
  const matched = all.filter((ev) => payloadSprintNumber(ev) === args.sprintNumber);

  const timeline = matched.map((ev) => {
    const entry: PmHarnessOutcomeReplayResult["timeline"][number] = {
      sequence: ev.sequence,
      when: ev.when,
      eventType: ev.type,
    };
    const it = payloadIteration(ev);
    if (it !== undefined) entry.iteration = it;
    const role = payloadRole(ev);
    if (role !== undefined) entry.role = role;
    const summary = summarizeEvent(ev);
    if (summary !== undefined) entry.summary = summary;
    return entry;
  });

  // Iteration count = max iteration seen
  let iterationCount = 0;
  for (const ev of matched) {
    const it = payloadIteration(ev);
    if (it !== undefined && it > iterationCount) iterationCount = it;
  }

  // Final verdict — from last feedback_loop_closed if present
  let finalVerdict: PmHarnessOutcomeReplayResult["finalVerdict"] = "incomplete";
  for (let i = matched.length - 1; i >= 0; i--) {
    const ev = matched[i]!;
    if (ev.type === "feedback_loop_closed") {
      const v = payloadVerdict(ev);
      if (v === "passed" || v === "failed" || v === "aborted") {
        finalVerdict = v;
        break;
      }
    }
  }

  // Drift curve: per-iteration grading_completed score + verdict
  const byIteration = new Map<number, IterationDataPoint>();
  for (const ev of matched) {
    const it = payloadIteration(ev);
    if (it === undefined) continue;
    let dp = byIteration.get(it);
    if (!dp) {
      dp = { iteration: it, score: null };
      byIteration.set(it, dp);
    }
    if (ev.type === "grading_completed") {
      const score = payloadOverallScore(ev);
      if (score !== undefined) dp.score = score;
      const verdict = payloadVerdict(ev);
      if (verdict !== undefined) dp.verdict = verdict;
    }
    if (ev.type === "playwright_scenario_executed") {
      const ed = payloadEvidenceDir(ev);
      if (ed !== undefined) dp.evidenceDir = ed;
    }
  }
  const driftCurve = [...byIteration.values()].sort((a, b) => a.iteration - b.iteration);

  return {
    project: args.project,
    sprintNumber: args.sprintNumber,
    empty: matched.length === 0,
    totalEvents: matched.length,
    timeline,
    finalVerdict,
    iterationCount,
    driftCurve,
  };
}
