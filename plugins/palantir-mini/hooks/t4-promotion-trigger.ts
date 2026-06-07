// palantir-mini — t4-promotion-trigger hook (sprint-062 W2-α)
// Fires on: Stop (Claude Code session end)
//
// PURPOSE: At session end, scan the recent events.jsonl tail (last N=100 events).
// For any event with valueGrade === "T4", auto-call apply_refinement_target
// with dryRun=true to surface promotion candidates.
// Lead reviews the dry-run digest via pm_recap.
// Explicit Lead-issued dryRun=false invocation (separate user prompt) finalizes.
//
// This hook NEVER commits changes — dryRun is always forced to true.
// The hook surface intent: ensure T4 events don't silently expire without
// triggering the refinement promotion circuit.
//
// Authority:
//   rule 26 v1.3.0 §Substrate routing — T4 → shared-core/promotions/ candidate
//   sprint-062 W2-α plan §t4-promotion-trigger
//   rule 10 v2.2.0 §append-only invariant (read-only at tail)

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { readEvents } from "../lib/event-log/read";
import type { EventEnvelope } from "../lib/event-log/types";
// apply-refinement-target handler was removed (Wave 2 lib rationalization).
// Stub returns a no-op result so the hook can still log T4 event counts
// without attempting to promote; Lead can invoke promotion manually.
type ApplyRefinementTargetResult = {
  applied: number;
  skipped: number;
  failed: number;
  perTargetEvidence: Array<{
    verdict: string;
    refinementTarget: { kind: string; rid: string };
    simulatorScore?: number;
    eventCount: number;
    reason?: string;
  }>;
};

async function applyRefinementTarget(
  _args: { project: string; events: unknown[]; dryRun: boolean; promotionTier: string },
): Promise<ApplyRefinementTargetResult> {
  // Handler removed — return zero-count result; manual Lead action required.
  return { applied: 0, skipped: _args.events.length, failed: 0, perTargetEvidence: [] };
}

// ─── Configuration ────────────────────────────────────────────────────────────

/** Number of tail events to scan for T4 candidates. */
const TAIL_SCAN_LIMIT = 100;

// ─── Hook input shape (Stop stdin) ───────────────────────────────────────────

interface StopPayload {
  cwd?:        string;
  session_id?: string;
  reason?:     string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Discover the project root from multiple sources (priority order):
 * 1. PALANTIR_MINI_PROJECT env var
 * 2. hook payload cwd
 * 3. process.cwd()
 */
function resolveProject(payload: StopPayload): string {
  return (
    process.env.PALANTIR_MINI_PROJECT ??
    payload.cwd ??
    process.cwd()
  );
}

/**
 * Filter the last N events for valueGrade === "T4".
 */
function extractT4Events(events: EventEnvelope[], limit: number): EventEnvelope[] {
  // Take last `limit` events (tail)
  const tail = events.slice(-limit);
  return tail.filter((ev) => {
    return (ev as EventEnvelope & { valueGrade?: string }).valueGrade === "T4";
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Read hook payload from stdin
  let rawInput = "";
  for await (const chunk of process.stdin) rawInput += chunk;

  let payload: StopPayload = {};
  try {
    payload = JSON.parse(rawInput) as StopPayload;
  } catch {
    // Malformed input — exit cleanly (Stop hook, advisory)
    process.exit(0);
  }

  const project = resolveProject(payload);
  const cwd     = project;

  // Read events.jsonl
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) {
    // No events file — nothing to promote
    process.exit(0);
  }

  const allEvents  = readEvents(eventsPath);
  const t4Events   = extractT4Events(allEvents, TAIL_SCAN_LIMIT);

  if (t4Events.length === 0) {
    // No T4 events in tail — emit informational and exit
    process.stderr.write(
      `[t4-promotion-trigger] No T4 events in last ${TAIL_SCAN_LIMIT} tail events. Nothing to promote.\n`,
    );
    process.exit(0);
  }

  process.stderr.write(
    `[t4-promotion-trigger] Found ${t4Events.length} T4 events in tail (of ${allEvents.length} total). Running dry-run promotion check...\n`,
  );

  // Run apply_refinement_target with dryRun=true (ALWAYS — this hook never commits)
  let result: ApplyRefinementTargetResult;
  try {
    result = await applyRefinementTarget({
      project,
      events:        t4Events,
      dryRun:        true,  // FORCED — this hook only previews, never commits
      promotionTier: "shared-core",
    });
  } catch (err) {
    process.stderr.write(
      `[t4-promotion-trigger] apply_refinement_target error: ${String(err)}\n`,
    );
    // Emit failure event (best-effort)
    await emit({
      type:    "validation_phase_completed",
      payload: {
        phase:      "post_write",
        passed:     false,
        errorClass: "t4_promotion_trigger_error",
      },
      toolName:     "t4-promotion-trigger",
      cwd,
      reasoning:    `t4-promotion-trigger: apply_refinement_target threw: ${String(err)}`,
      memoryLayers: ["episodic"],
    }).catch(() => { /* best-effort emit */ });
    process.exit(0);
  }

  // Build Lead recap digest (written to stderr for Lead pm_recap visibility)
  const digest = [
    `\n[t4-promotion-trigger] SESSION-END T4 PROMOTION DIGEST`,
    `  T4 events scanned: ${t4Events.length} (of last ${TAIL_SCAN_LIMIT})`,
    `  apply_refinement_target result:`,
    `    applied (dry-run):  ${result.applied}`,
    `    skipped:            ${result.skipped}`,
    `    failed:             ${result.failed}`,
    `  Per-target evidence:`,
    ...result.perTargetEvidence.map((e) =>
      `    [${e.verdict}] ${e.refinementTarget.kind}::${e.refinementTarget.rid}` +
      ` | score=${e.simulatorScore ?? "n/a"}` +
      ` | events=${e.eventCount}` +
      (e.reason ? ` | ${e.reason}` : ""),
    ),
    `\n  To finalize promotion: call apply_refinement_target({ project, dryRun: false }) from Lead prompt.`,
    `  Rule 26 §Substrate routing T4 → shared-core/promotions/ candidate.`,
  ].join("\n");

  process.stderr.write(digest + "\n");

  // Emit summary event for pm_recap
  await emit({
    type:    "validation_phase_completed",
    payload: {
      phase:      "post_write",
      passed:     result.applied > 0 || result.failed === 0,
      errorClass: "t4_promotion_trigger_completed",
    },
    toolName:    "t4-promotion-trigger",
    cwd,
    reasoning:   `t4-promotion-trigger session-end scan complete. t4Events=${t4Events.length} applied(dry)=${result.applied} skipped=${result.skipped} failed=${result.failed}. Lead should review digest and call apply_refinement_target(dryRun=false) to commit.`,
    memoryLayers: ["episodic", "procedural"],
  });

  // Advisory hook — always continue (Stop hooks are non-blocking)
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}

main().catch((err) => {
  process.stderr.write(`[t4-promotion-trigger] fatal: ${String(err)}\n`);
  process.exit(0); // Advisory — never block on failure
});
