// palantir-mini v2.26.0 — MCP tool handler: pm_agent_lineage_export
// Domain: LEARN (Researcher workflow input — D8.2)
//
// Filters events.jsonl by 5-dim envelope (typically `byWhom.agentName` + time
// range) and produces a Markdown timeline suitable for retrospectives or
// pasting into ~/.claude/plans/ synthesis. Read-only.
//
// Authority chain:
//   ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §9.2 (D8)
//   -> ~/.claude/plans/immutable-forging-summit.md §3.1 T2c-6
//   -> rules/10-events-jsonl.md (5-dim envelope)

import * as path from "path";
import { readEvents } from "../../lib/event-log/read";
import type { EventEnvelope } from "../../lib/event-log/types";

interface PmAgentLineageExportArgs {
  /** Project root. */
  project: string;
  /** Filter — agent identity (matches `byWhom.identity`). */
  agentIdentity?: string;
  /** Filter — agent name (matches `byWhom.agentName` exact). */
  agentName?: string;
  /** Filter — agent name regex (matches `byWhom.agentName`; case-insensitive). */
  agentNameRegex?: string;
  /** Filter — session id (matches `throughWhich.sessionId` exact). */
  sessionId?: string;
  /** Temporal — ISO8601 inclusive lower bound. */
  whenFrom?: string;
  /** Temporal — ISO8601 inclusive upper bound. */
  whenTo?: string;
  /** Result cap. Default 200. */
  limit?: number;
}

interface PmAgentLineageExportResult {
  project: string;
  filter: PmAgentLineageExportArgs;
  matchedEventCount: number;
  /** Markdown formatted timeline (h2 sections per session, bullets per event). */
  markdown: string;
}

function payloadShort(ev: EventEnvelope): string {
  try {
    const text = JSON.stringify(ev.payload).slice(0, 240);
    return text;
  } catch {
    return "(payload-serialize-failed)";
  }
}

function buildMarkdown(events: EventEnvelope[], filter: PmAgentLineageExportArgs): string {
  if (events.length === 0) {
    return `# Agent lineage — no matching events\n\n_filter: ${JSON.stringify(filter)}_\n`;
  }
  // Group by sessionId
  const bySession = new Map<string, EventEnvelope[]>();
  for (const ev of events) {
    const sid = (ev.throughWhich.sessionId as string) ?? "(no-session)";
    if (!bySession.has(sid)) bySession.set(sid, []);
    bySession.get(sid)!.push(ev);
  }

  const out: string[] = [];
  out.push(`# Agent lineage export`);
  out.push(``);
  out.push(`_Filter: \`${JSON.stringify(filter)}\`_`);
  out.push(``);
  out.push(`Total matched events: **${events.length}** across ${bySession.size} session(s).`);
  out.push(``);

  // Sort sessions by earliest event sequence
  const sessions = [...bySession.entries()].sort((a, b) => {
    const aSeq = a[1][0]?.sequence ?? 0;
    const bSeq = b[1][0]?.sequence ?? 0;
    return aSeq - bSeq;
  });

  for (const [sid, evs] of sessions) {
    out.push(`## Session \`${sid}\` (${evs.length} events)`);
    out.push(``);
    for (const ev of evs) {
      const agent = ev.byWhom.agentName ?? ev.byWhom.identity;
      out.push(
        `- \`seq=${ev.sequence}\` \`${ev.when}\` **${ev.type}** _by ${agent}_`,
      );
      out.push(`  - payload: \`${payloadShort(ev)}\``);
    }
    out.push(``);
  }

  return out.join("\n");
}

export default async function pmAgentLineageExport(
  rawArgs: unknown,
): Promise<PmAgentLineageExportResult> {
  const args = (rawArgs ?? {}) as PmAgentLineageExportArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("pm_agent_lineage_export: `project` required");
  }

  const eventsPath = path.join(args.project, ".palantir-mini", "session", "events.jsonl");
  const all = readEvents(eventsPath);
  const limit = Math.max(1, Math.min(2000, args.limit ?? 200));

  let regex: RegExp | undefined;
  if (args.agentNameRegex) {
    try {
      regex = new RegExp(args.agentNameRegex, "i");
    } catch (e) {
      throw new Error(
        `pm_agent_lineage_export: invalid agentNameRegex: ${(e as Error).message}`,
      );
    }
  }

  const matched: EventEnvelope[] = [];
  for (const ev of all) {
    if (args.agentIdentity && ev.byWhom.identity !== args.agentIdentity) continue;
    if (args.agentName && ev.byWhom.agentName !== args.agentName) continue;
    if (regex && !(ev.byWhom.agentName !== undefined && regex.test(ev.byWhom.agentName))) continue;
    if (
      args.sessionId &&
      (ev.throughWhich.sessionId as string) !== args.sessionId
    )
      continue;
    if (args.whenFrom && ev.when < args.whenFrom) continue;
    if (args.whenTo && ev.when > args.whenTo) continue;
    matched.push(ev);
    if (matched.length >= limit) break;
  }

  const markdown = buildMarkdown(matched, args);

  return {
    project: args.project,
    filter: args,
    matchedEventCount: matched.length,
    markdown,
  };
}
