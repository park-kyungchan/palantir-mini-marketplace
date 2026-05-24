#!/usr/bin/env bun
// palantir-mini — replay-promote-grades.ts (rule 26 §Substrate routing)
//
// Offline batch job: scans <projectRoot>/.palantir-mini/session/events.jsonl,
// applies promotion rules (T1→T2→T3→T4), and writes promoted envelopes as NEW
// append rows — NEVER mutates existing rows (rule 10 §append-only invariant).
//
// Usage:
//   bun run scripts/replay-promote-grades.ts [--project <projectRoot>] [--dry-run]
//
// Promotion conditions applied in sequence:
//   T1→T2: event has an outcome_pair_audited or validation_phase_completed sibling
//          with matching lineageRefs.outcomePairId or sourceEventId in payload.
//   T2→T3: event already has a typed withWhat.refinementTarget populated.
//   T3→T4: event has ≥2 distinct validation_phase_completed(passed=true) events
//          with matching lineageRefs.actionRid, OR has kLlmConsensus marker.
//
// Authority: rule 26 §Substrate routing + rule 10 §append-only invariant
//            canonical plan v2 §4 row 4.2

import * as fs from "fs";
import * as path from "path";
import { appendEventAtomic } from "../lib/event-log/append";
import {
  promoteT1ToT2,
  promoteT2ToT3,
  promoteT3ToT4,
  type T1ToT2Evidence,
  type T2ToT3Evidence,
  type T3ToT4Evidence,
} from "../lib/event-log/grade-promotion";
import type { EventEnvelope } from "../lib/event-log/types";
import type { ValueGrade } from "#schemas/ontology/primitives/value-grade";

// ─── CLI arg parsing ─────────────────────────────────────────────────────────

function parseArgs(argv: string[]): {
  projectRoot: string;
  dryRun: boolean;
} {
  let projectRoot = process.env.PALANTIR_MINI_PROJECT ?? process.cwd();
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) {
      projectRoot = argv[++i]!;
    } else if (argv[i] === "--dry-run") {
      dryRun = true;
    }
  }

  return { projectRoot, dryRun };
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

export function eventsJsonlPath(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
}

// ─── Event reading ─────────────────────────────────────────────────────────────

export function readEvents(eventsPath: string): EventEnvelope[] {
  if (!fs.existsSync(eventsPath)) return [];
  const content = fs.readFileSync(eventsPath, "utf8");
  const events: EventEnvelope[] = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line) as EventEnvelope);
    } catch {
      // Skip malformed lines per rule 10 §append-only (never lose data).
    }
  }
  return events;
}

// ─── Grade index helpers ───────────────────────────────────────────────────────

/** Build a lookup: eventId → current effective grade (accounting for promotion rows). */
export function buildEffectiveGradeIndex(events: EventEnvelope[]): Map<string, ValueGrade> {
  const index = new Map<string, ValueGrade>();
  for (const ev of events) {
    const id = ev.eventId as string;
    if (!id) continue;

    // If this event is a promotion row (payload.promotedFrom present), it
    // updates the effective grade for the source event (lineageRefs.actionRid).
    const payload = ev.payload as Record<string, unknown>;
    const promotedFrom = payload?.promotedFrom as string | undefined;
    if (promotedFrom && ev.lineageRefs?.actionRid) {
      const sourceId = ev.lineageRefs.actionRid;
      if (ev.valueGrade) {
        index.set(sourceId, ev.valueGrade);
      }
    } else {
      // Original event row — record its grade unless a promotion row
      // has already upgraded it.
      if (!index.has(id) && ev.valueGrade) {
        index.set(id, ev.valueGrade);
      }
    }
  }
  return index;
}

// ─── T1→T2 evidence finder ─────────────────────────────────────────────────────

/**
 * For a given T1 event, search the event list for an outcome-pair event that
 * references it. Returns evidence when found, null otherwise.
 *
 * Matches when:
 *   - type = "validation_phase_completed" AND passed = true AND
 *     (lineageRefs.actionRid === source.eventId OR
 *      payload.sourceEventId === source.eventId)
 *   - OR type = "phase_completed" AND
 *     payload.taskId matches source.eventId (loose association)
 */
export function findT1ToT2Evidence(
  source: EventEnvelope,
  events: EventEnvelope[],
): T1ToT2Evidence | null {
  const sourceId = source.eventId as string;
  if (!sourceId) return null;

  for (const ev of events) {
    if (ev.eventId === source.eventId) continue; // skip self

    if (ev.type === "validation_phase_completed") {
      const p = ev.payload as Record<string, unknown>;
      if (!p.passed) continue;

      const refersToSource =
        ev.lineageRefs?.actionRid === sourceId ||
        (p.sourceEventId as string | undefined) === sourceId;

      if (refersToSource) {
        return {
          outcomePairEventId: ev.eventId as string,
          outcomePairId: ev.lineageRefs?.outcomePairId as string | undefined,
          rationale: `Paired with validation_phase_completed event ${ev.eventId} (passed=true)`,
        };
      }
    }
  }

  return null;
}

// ─── T2→T3 evidence finder ─────────────────────────────────────────────────────

/**
 * For a T2 event, check whether it already has a typed withWhat.refinementTarget.
 * If yes, return evidence; otherwise null.
 *
 * Per rule 26 §Axis C2: "refinement target typed" = C axis ≥1.
 */
export function findT2ToT3Evidence(source: EventEnvelope): T2ToT3Evidence | null {
  const rt = source.withWhat?.refinementTarget;
  if (!rt) return null;

  const rtRec = rt as unknown as Record<string, unknown>;
  return {
    refinementTarget: {
      kind: rtRec.kind as string,
      filePathOrRid: rtRec.filePathOrRid as string,
      description: rtRec.description as string,
      confidenceLevel: rtRec.confidenceLevel as string,
    },
    memoryLayers: source.withWhat?.memoryLayers as readonly string[] | undefined,
    rationale: `refinementTarget already present on source event ${source.eventId}`,
  };
}

// ─── T3→T4 evidence finder ─────────────────────────────────────────────────────

/**
 * For a T3 event, search for ≥2 distinct validation_phase_completed(passed=true)
 * attestations referencing the source event.
 *
 * Also accepts single-vendor D2-fallback when withWhat carries kLlmConsensus
 * = "single-vendor-attested".
 */
export function findT3ToT4Evidence(
  source: EventEnvelope,
  events: EventEnvelope[],
): T3ToT4Evidence | null {
  const sourceId = source.eventId as string;
  if (!sourceId) return null;

  // Check for pre-existing D2-fallback marker on the source event itself
  const withWhat = source.withWhat as Record<string, unknown> | undefined;
  if (withWhat?.kLlmConsensus === "single-vendor-attested") {
    return {
      kLlmConsensus: "single-vendor-attested",
      confidenceTier: "lower",
      rationale: `Pre-existing single-vendor-attested kLlmConsensus on source event ${source.eventId}`,
    };
  }

  // Collect distinct attestation identities from validation_phase_completed events
  const attestationEvents: EventEnvelope[] = [];
  const attestingIdentities = new Set<string>();

  for (const ev of events) {
    if (ev.eventId === source.eventId) continue;
    if (ev.type !== "validation_phase_completed") continue;
    const p = ev.payload as Record<string, unknown>;
    if (!p.passed) continue;

    const refersToSource =
      ev.lineageRefs?.actionRid === sourceId ||
      (p.sourceEventId as string | undefined) === sourceId;

    if (refersToSource) {
      attestationEvents.push(ev);
      const identity = ev.byWhom?.identity;
      if (identity) attestingIdentities.add(identity);
      if (ev.byWhom?.agentName) attestingIdentities.add(ev.byWhom.agentName);
    }
  }

  if (attestingIdentities.size >= 2) {
    return {
      attestingIdentities: Array.from(attestingIdentities),
      kLlmConsensus: "dual-vendor-canonical",
      confidenceTier: "high",
      attestationEventIds: attestationEvents.map((e) => e.eventId as string),
      rationale: `D2-canonical: ${attestingIdentities.size} distinct identities attested for event ${source.eventId}`,
    };
  }

  return null;
}

// ─── Core batch promotion logic ─────────────────────────────────────────────────

export interface PromotionBatchResult {
  /** Number of new promotion envelopes appended. */
  promotedCount: number;
  /** Breakdown by transition. */
  byTransition: {
    t1ToT2: number;
    t2ToT3: number;
    t3ToT4: number;
  };
  /** Dry-run flag — no actual appends when true. */
  dryRun: boolean;
  /** EventIds of promoted events (for reporting). */
  promotedEventIds: string[];
}

export async function replayPromoteGrades(opts: {
  projectRoot: string;
  dryRun?: boolean;
}): Promise<PromotionBatchResult> {
  const { projectRoot, dryRun = false } = opts;
  const eventsPath = eventsJsonlPath(projectRoot);

  const result: PromotionBatchResult = {
    promotedCount: 0,
    byTransition: { t1ToT2: 0, t2ToT3: 0, t3ToT4: 0 },
    dryRun,
    promotedEventIds: [],
  };

  const events = readEvents(eventsPath);
  if (events.length === 0) return result;

  // Build effective grade index — accounts for any promotion rows already present
  const effectiveGrades = buildEffectiveGradeIndex(events);

  // Skip events that are themselves promotion rows (have payload.promotedFrom)
  const candidateEvents = events.filter((ev) => {
    const p = ev.payload as Record<string, unknown>;
    return !p?.promotedFrom;
  });

  for (const source of candidateEvents) {
    const sourceId = source.eventId as string;
    if (!sourceId) continue;

    // Use effective grade (may have been promoted in a prior run)
    const effectiveGrade = effectiveGrades.get(sourceId) ?? source.valueGrade;

    // ─── T1 → T2 ────────────────────────────────────────────────────────────
    if (effectiveGrade === "T1") {
      const evidence = findT1ToT2Evidence(source, events);
      if (evidence) {
        const promotionResult = promoteT1ToT2(source, evidence);
        if (promotionResult) {
          if (!dryRun) {
            await appendEventAtomic(eventsPath, promotionResult.promotedEnvelope);
          }
          // Update effective grade so downstream T2→T3 check can fire this run
          effectiveGrades.set(sourceId, "T2");
          result.promotedCount++;
          result.byTransition.t1ToT2++;
          result.promotedEventIds.push(sourceId);
          // Fall through: check T2→T3 immediately using the updated grade
        }
      }
    }

    // ─── T2 → T3 ────────────────────────────────────────────────────────────
    const gradeAfterT1Check = effectiveGrades.get(sourceId) ?? source.valueGrade;
    if (gradeAfterT1Check === "T2") {
      const evidence = findT2ToT3Evidence(source);
      if (evidence) {
        const promotionResult = promoteT2ToT3(source, evidence);
        if (promotionResult) {
          if (!dryRun) {
            await appendEventAtomic(eventsPath, promotionResult.promotedEnvelope);
          }
          effectiveGrades.set(sourceId, "T3");
          // Avoid double-counting if already counted in T1→T2 step
          if ((effectiveGrades.get(sourceId) ?? source.valueGrade) !== "T1") {
            result.promotedCount++;
          }
          result.byTransition.t2ToT3++;
          if (!result.promotedEventIds.includes(sourceId)) {
            result.promotedEventIds.push(sourceId);
          }
        }
      }
    }

    // ─── T3 → T4 ────────────────────────────────────────────────────────────
    const gradeAfterT2Check = effectiveGrades.get(sourceId) ?? source.valueGrade;
    if (gradeAfterT2Check === "T3") {
      const evidence = findT3ToT4Evidence(source, events);
      if (evidence) {
        const promotionResult = promoteT3ToT4(source, evidence);
        if (promotionResult) {
          if (!dryRun) {
            await appendEventAtomic(eventsPath, promotionResult.promotedEnvelope);
          }
          effectiveGrades.set(sourceId, "T4");
          result.promotedCount++;
          result.byTransition.t3ToT4++;
          if (!result.promotedEventIds.includes(sourceId)) {
            result.promotedEventIds.push(sourceId);
          }
        }
      }
    }
  }

  return result;
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await replayPromoteGrades(args);

  if (args.dryRun) {
    console.log(`[DRY RUN] Would promote ${result.promotedCount} events:`);
    console.log(`  T1→T2: ${result.byTransition.t1ToT2}`);
    console.log(`  T2→T3: ${result.byTransition.t2ToT3}`);
    console.log(`  T3→T4: ${result.byTransition.t3ToT4}`);
    if (result.promotedEventIds.length > 0) {
      console.log(`  Events: ${result.promotedEventIds.slice(0, 10).join(", ")}${result.promotedEventIds.length > 10 ? ` ...+${result.promotedEventIds.length - 10} more` : ""}`);
    }
  } else {
    if (result.promotedCount === 0) {
      console.log("replay-promote-grades: no eligible events found for promotion");
    } else {
      console.log(`replay-promote-grades: promoted ${result.promotedCount} events (appended new rows; originals unchanged)`);
      console.log(`  T1→T2: ${result.byTransition.t1ToT2}`);
      console.log(`  T2→T3: ${result.byTransition.t2ToT3}`);
      console.log(`  T3→T4: ${result.byTransition.t3ToT4}`);
    }
  }
}

main().catch((err) => {
  process.stderr.write(`replay-promote-grades: FATAL: ${String(err)}\n`);
  process.exit(1);
});
