#!/usr/bin/env bun
/**
 * palantir-mini — kosmos orphan-event reconciliation script
 *
 * Phase B3 Task D5: Scans kosmos events.jsonl for "orphan" lines
 * (emitted by old track-reads hook — missing eventId + sequence fields)
 * and appends one `orphan_event_reconciled` envelope to the parent
 * events.jsonl for each orphan found.
 *
 * kosmos events.jsonl is READ-ONLY. This script NEVER writes to it.
 * All output goes to ~/.palantir-mini/session/events.jsonl.
 *
 * Usage:
 *   bun scripts/reconcile-orphan-events.ts              (dry-run, default)
 *   bun scripts/reconcile-orphan-events.ts --execute    (Lead-only: live append)
 *
 * @owner palantirkc-plugin-events
 * @purpose Reconcile kosmos orphan events into parent events.jsonl via orphan_event_reconciled envelopes
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as os from "os";
import { appendEventAtomic } from "../../plugins/palantir-mini/lib/event-log/append.ts";
import { eventId, sessionId, commitSha } from "../../plugins/palantir-mini/lib/event-log/types.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOME = process.env.HOME ?? os.homedir();

/** Source: kosmos events.jsonl — READ-ONLY */
const KOSMOS_EVENTS = path.join(HOME, "kosmos/.palantir-mini/session/events.jsonl");

/** Destination: parent project events.jsonl — append-only */
const PARENT_EVENTS = path.join(HOME, ".palantir-mini/session/events.jsonl");

/** git HEAD SHA for atopWhich dimension */
const RECONCILE_COMMIT_SHA = "7a905a3539d1477ae8c408a3385e2dd4388eb929";

/** Session ID for reconciliation run */
const RECONCILE_SESSION_ID = "reconcile-orphan-b3-d5";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * An orphan line is a raw JSON line from kosmos events.jsonl that lacks
 * the EventEnvelopeBase fields (eventId, sequence). These were emitted by
 * the old track-reads hook, which used a simpler schema:
 *
 *   { timestamp, type, agent, session_id, tool, file, summary }
 */
interface OrphanLine {
  /** 0-based line offset in the source file */
  lineOffset: number;
  /** Raw JSON string (trimmed) */
  originalLine: string;
  /** Parsed fields from the orphan payload */
  parsed: {
    timestamp?: string;
    type?: string;
    agent?: string;
    session_id?: string;
    tool?: string;
    file?: string;
    summary?: string;
  };
}

// ---------------------------------------------------------------------------
// Step 1 — Scan kosmos events.jsonl for orphan lines
// ---------------------------------------------------------------------------

function scanOrphans(): OrphanLine[] {
  if (!fs.existsSync(KOSMOS_EVENTS)) {
    console.error(`ERROR: kosmos events.jsonl not found at ${KOSMOS_EVENTS}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(KOSMOS_EVENTS, "utf8");
  const lines = raw.split("\n");
  const orphans: OrphanLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (!line) continue;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line) as Record<string, unknown>;
    } catch {
      // Malformed line — skip
      console.warn(`  SKIP line ${i + 1}: JSON parse error`);
      continue;
    }

    // Orphan = line that lacks eventId (the canonical EventEnvelopeBase field)
    if (!("eventId" in parsed)) {
      orphans.push({
        lineOffset: i,
        originalLine: line,
        parsed: {
          timestamp: typeof parsed["timestamp"] === "string" ? parsed["timestamp"] : undefined,
          type:      typeof parsed["type"]      === "string" ? parsed["type"]      : undefined,
          agent:     typeof parsed["agent"]     === "string" ? parsed["agent"]     : undefined,
          session_id:typeof parsed["session_id"]=== "string" ? parsed["session_id"]: undefined,
          tool:      typeof parsed["tool"]      === "string" ? parsed["tool"]      : undefined,
          file:      typeof parsed["file"]      === "string" ? parsed["file"]      : undefined,
          summary:   typeof parsed["summary"]   === "string" ? parsed["summary"]   : undefined,
        },
      });
    }
  }

  return orphans;
}

// ---------------------------------------------------------------------------
// Step 2 — Print dry-run report
// ---------------------------------------------------------------------------

function printDryRun(orphans: OrphanLine[]): void {
  console.log(`\n=== DRY-RUN: kosmos orphan-event reconciliation ===`);
  console.log(`Source:      ${KOSMOS_EVENTS}`);
  console.log(`Destination: ${PARENT_EVENTS} (append-only; not modified in dry-run)`);
  console.log(`\nOrphans found: ${orphans.length}\n`);

  for (const o of orphans) {
    const ts = o.parsed.timestamp ?? "(no timestamp)";
    const tool = o.parsed.tool ?? "?";
    const file = o.parsed.file ?? "?";
    console.log(`  line ${String(o.lineOffset + 1).padStart(3)}: ts=${ts} tool=${tool} file=${path.basename(file)}`);
  }

  console.log(`\nWould append ${orphans.length} orphan_event_reconciled envelope(s) to parent events.jsonl.`);
  console.log(`kosmos events.jsonl: UNCHANGED (read-only)`);
  console.log(`Run with --execute to perform the actual append (Lead-only in Task D6).`);
}

// ---------------------------------------------------------------------------
// Step 3 — Execute: append orphan_event_reconciled envelopes to parent
// ---------------------------------------------------------------------------

async function executeReconcile(orphans: OrphanLine[]): Promise<void> {
  console.log(`\n=== EXECUTE: kosmos orphan-event reconciliation ===`);
  console.log(`Appending ${orphans.length} envelope(s) to ${PARENT_EVENTS} ...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const o of orphans) {
    const when = o.parsed.timestamp ?? new Date().toISOString();
    const sid  = o.parsed.session_id ?? "unknown-session";
    const tool = o.parsed.tool       ?? "unknown-tool";
    const agent = o.parsed.agent     ?? "unknown";

    // Build reconciled dimension snapshot from orphan fields
    const reconciled = {
      when,
      atopWhich: RECONCILE_COMMIT_SHA,
      throughWhich: {
        sessionId: sid,
        toolName:  tool,
        cwd:       "~/projects/kosmos",
      },
      byWhom: {
        identity: "claude-code" as const,
        agentName: agent,
      },
    };

    try {
      const seq = await appendEventAtomic(PARENT_EVENTS, {
        eventId:     eventId(`orphan-recon-kosmos-line${o.lineOffset + 1}`),
        when:        new Date().toISOString(),
        atopWhich:   commitSha(RECONCILE_COMMIT_SHA),
        throughWhich: {
          sessionId: sessionId(RECONCILE_SESSION_ID),
          toolName:  "reconcile-orphan-events",
          cwd:       HOME,
        },
        byWhom: {
          identity:  "claude-code",
          agentName: "impl-D5-recon",
        },
        withWhat: {
          reasoning: `Reconciling orphan event at kosmos events.jsonl line ${o.lineOffset + 1} (${o.parsed.type ?? "unknown"} via ${tool})`,
        },
        type: "orphan_event_reconciled",
        payload: {
          orphanRef: {
            file:          KOSMOS_EVENTS,
            line_offset:   o.lineOffset,
            original_line: o.originalLine,
          },
          reconciled,
        },
      });
      console.log(`  APPENDED seq=${seq} for line ${o.lineOffset + 1}`);
      successCount++;
    } catch (err) {
      console.error(`  FAILED line ${o.lineOffset + 1}: ${String(err)}`);
      failCount++;
    }
  }

  console.log(`\nReconcile complete: ${successCount} appended, ${failCount} failed.`);
  console.log(`kosmos events.jsonl: UNCHANGED (read-only, ${fs.existsSync(KOSMOS_EVENTS) ? "verified" : "ERROR"})`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes("--execute");

  // Verify kosmos events.jsonl exists before anything
  if (!fs.existsSync(KOSMOS_EVENTS)) {
    console.error(`ABORT: kosmos events.jsonl not found at ${KOSMOS_EVENTS}`);
    process.exit(1);
  }

  const kosmosLinesBefore = fs.readFileSync(KOSMOS_EVENTS, "utf8").split("\n").filter(l => l.trim()).length;

  // Scan
  const orphans = scanOrphans();

  if (isDryRun) {
    printDryRun(orphans);
  } else {
    await executeReconcile(orphans);
  }

  // Invariant: kosmos line count must be unchanged
  const kosmosLinesAfter = fs.readFileSync(KOSMOS_EVENTS, "utf8").split("\n").filter(l => l.trim()).length;
  if (kosmosLinesBefore !== kosmosLinesAfter) {
    console.error(`\nINVARIANT VIOLATED: kosmos events.jsonl changed! before=${kosmosLinesBefore} after=${kosmosLinesAfter}`);
    process.exit(2);
  }
  console.log(`\nInvariant OK: kosmos events.jsonl unchanged (${kosmosLinesAfter} lines).`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
