#!/usr/bin/env bun
/**
 * run-compactor.ts — Offline batch job: compact repeated low-value events.
 * Sprint-105 PR 4.3 — canonical plan v2 §4 row 4.3
 *
 * Usage:
 *   bun run scripts/run-compactor.ts [--dry-run] [--threshold=N] [--types=<csv>]
 *                                    [--max-runs=N] [--no-passed-only] [--project=<root>]
 */
import { readEvents } from "../lib/event-log/read";
import { appendEventAtomic } from "../lib/event-log/append";
import {
  findSummarizableRuns, synthesizeSummaryEnvelope,
  DEFAULT_COMPACTION_TYPES, DEFAULT_THRESHOLD, type CompactionOptions,
} from "../lib/event-log/compactor";
import type { EventEnvelope, EventType, EventsSummarizedEnvelope } from "../lib/event-log/types";
import { execSync } from "child_process";
import path from "path";

// ─── CLI arg parsing ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun       = args.includes("--dry-run");
const noPassedOnly = args.includes("--no-passed-only");
const threshold    = (() => { const a = args.find(a => a.startsWith("--threshold=")); return a ? parseInt(a.split("=")[1]!, 10) : DEFAULT_THRESHOLD; })();
const maxRuns      = (() => { const a = args.find(a => a.startsWith("--max-runs=")); return a ? parseInt(a.split("=")[1]!, 10) : undefined; })();
const projectRoot  = (() => { const a = args.find(a => a.startsWith("--project=")); return a ? a.split("=")[1]! : process.cwd(); })();
const typesArg     = (() => { const a = args.find(a => a.startsWith("--types=")); return a ? a.split("=")[1]!.split(",") as EventType[] : [...DEFAULT_COMPACTION_TYPES]; })();

const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
const opts: CompactionOptions = { threshold, allowlist: typesArg, validationPassedOnly: !noPassedOnly };
if (maxRuns !== undefined) opts.maxRuns = maxRuns;

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[run-compactor] project=${projectRoot} threshold=${threshold} types=${typesArg.join(",")} dry-run=${dryRun}`);

  let events: EventEnvelope[];
  // readEvents(path) without options returns EventEnvelope[] (no-options overload)
  try { events = readEvents(eventsPath) as EventEnvelope[]; } catch (e) { console.error("[run-compactor] could not read events:", e); process.exit(1); }

  const runs = findSummarizableRuns(events, opts);
  console.log(`[run-compactor] found ${runs.length} summarizable run(s) across ${events.length} events`);

  if (runs.length === 0) { console.log("[run-compactor] nothing to compact"); return; }

  let atopWhich = "unknown";
  try { atopWhich = execSync("git rev-parse HEAD", { cwd: projectRoot }).toString().trim(); } catch {}

  for (const run of runs) {
    const env: Omit<EventsSummarizedEnvelope, "sequence"> = synthesizeSummaryEnvelope(run, {
      atopWhich, cwd: projectRoot, threshold,
    });
    console.log(`[run-compactor] ${dryRun ? "(dry-run) " : ""}compacting ${run.events.length}x ${run.type} (seqs ${run.firstSeq}-${run.lastSeq})`);
    if (!dryRun) {
      await appendEventAtomic(eventsPath, env);
      console.log(`[run-compactor] appended events_summarized envelope`);
    }
  }
  console.log(`[run-compactor] done. ${dryRun ? "0 written (dry-run)" : `${runs.length} summary envelope(s) appended`}`);
}

main().catch((e) => { console.error("[run-compactor] fatal:", e); process.exit(1); });
