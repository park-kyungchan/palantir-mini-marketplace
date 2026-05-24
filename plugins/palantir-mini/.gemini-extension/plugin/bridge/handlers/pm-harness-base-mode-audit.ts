// palantir-mini v3.11.0 — pm_harness_base_mode_audit (CT-5 W3.1d audit infrastructure)
// Domain: LEARN (audit of commit-edits-precondition gate behavior under B1 default-on)
//
// Reads validation_phase_completed events from project's events.jsonl + archive
// emitted by commit-edits-precondition hook (W1.2 + W3.1c). Tracks gate outcomes
// (passed / bypassed / blocked) over a rolling window. Returns recommendation:
//   ready-for-B2       — bypassRate < 5%, blockRate < 20%, ≥ 50 passed events
//   more-data-needed   — < 20 passed events (insufficient signal)
//   investigate-friction — bypass or block rate too high (workflow friction)
//
// Read-only — no side effects, no event emission (pure audit per
// pm_harness_strictness_audit pattern).
//
// Authority: ~/.claude/plans/2026-04-29-harness-base-mode-closing-tasks.md CT-5
//            ~/.claude/rules/16-3-agent-harness.md §Default-On Policy

import * as path from "path";
import { readEvents } from "../../lib/event-log/read";
import type { EventEnvelope } from "../../lib/event-log/types";
import { projectRoot as resolveProjectRoot } from "../../scripts/log";

export interface PmHarnessBaseModeAuditArgs {
  projectPath?: string;
  sinceDays?: number;
}

export type Recommendation =
  | "ready-for-B2"
  | "more-data-needed"
  | "investigate-friction";

const TRACKED_ERROR_CLASSES = [
  "harness_gate_passed",
  "harness_bypass_invoked",
  "no-harness-dir",
  "no-bound-contract",
  "missing-dry-run-ref",
  "dry-run-not-computed",
  "dry-run-not-graded",
  "dry-run-validation-errors",
  "dry-run-graded-fail",
] as const;

type TrackedErrorClass = (typeof TRACKED_ERROR_CLASSES)[number];

const PASS_CLASS: TrackedErrorClass = "harness_gate_passed";
const BYPASS_CLASS: TrackedErrorClass = "harness_bypass_invoked";

export interface PmHarnessBaseModeAuditResult {
  window: { since: string; until: string };
  totals: { passed: number; bypassed: number; blocked: number };
  blockedByReason: Record<string, number>;
  bypassRate: number;
  blockRate: number;
  recommendation: Recommendation;
  reasoning: string;
}

const DEFAULT_SINCE_DAYS = 7;
const READY_BYPASS_RATE_CEIL = 0.05;
const READY_BLOCK_RATE_CEIL = 0.20;
const READY_PASSED_FLOOR = 50;
const INSUFFICIENT_DATA_FLOOR = 20;

function getEnvelopeProperty<T = unknown>(env: EventEnvelope, key: string): T | undefined {
  return (env as unknown as Record<string, unknown>)[key] as T | undefined;
}

/** Compute recommendation from totals per CT-5 thresholds. */
export function deriveRecommendation(totals: {
  passed: number;
  bypassed: number;
  blocked: number;
}): { recommendation: Recommendation; bypassRate: number; blockRate: number } {
  const total = totals.passed + totals.bypassed + totals.blocked;
  const bypassRate = total === 0 ? 0 : totals.bypassed / total;
  const blockRate = total === 0 ? 0 : totals.blocked / total;
  let recommendation: Recommendation;
  if (totals.passed < INSUFFICIENT_DATA_FLOOR) {
    recommendation = "more-data-needed";
  } else if (
    bypassRate < READY_BYPASS_RATE_CEIL &&
    blockRate < READY_BLOCK_RATE_CEIL &&
    totals.passed >= READY_PASSED_FLOOR
  ) {
    recommendation = "ready-for-B2";
  } else {
    recommendation = "investigate-friction";
  }
  return { recommendation, bypassRate, blockRate };
}

/** Filter envelopes by `errorClass` field in payload, within sinceDays window. */
export function filterGateEvents(
  envelopes: EventEnvelope[],
  sinceISO: string,
): EventEnvelope[] {
  const matched: EventEnvelope[] = [];
  for (const env of envelopes) {
    if (env.type !== "validation_phase_completed") continue;
    const when = getEnvelopeProperty<string>(env, "when");
    if (typeof when === "string" && when < sinceISO) continue;
    const payload = (env.payload ?? {}) as { errorClass?: string };
    const ec = payload.errorClass;
    if (typeof ec !== "string") continue;
    if (!TRACKED_ERROR_CLASSES.includes(ec as TrackedErrorClass)) continue;
    matched.push(env);
  }
  return matched;
}

export async function pmHarnessBaseModeAudit(
  args: PmHarnessBaseModeAuditArgs,
): Promise<PmHarnessBaseModeAuditResult> {
  const project = args.projectPath ?? resolveProjectRoot();
  const sinceDays = typeof args.sinceDays === "number" && args.sinceDays > 0
    ? args.sinceDays
    : DEFAULT_SINCE_DAYS;

  const until = new Date();
  const since = new Date(until.getTime() - sinceDays * 24 * 60 * 60 * 1000);
  const sinceISO = since.toISOString();
  const untilISO = until.toISOString();

  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  const allEvents = readEvents(eventsPath);
  const gateEvents = filterGateEvents(allEvents, sinceISO);

  let passed = 0;
  let bypassed = 0;
  let blocked = 0;
  const blockedByReason: Record<string, number> = {};
  for (const env of gateEvents) {
    const payload = (env.payload ?? {}) as { errorClass?: string };
    const ec = payload.errorClass!;
    if (ec === PASS_CLASS) passed++;
    else if (ec === BYPASS_CLASS) bypassed++;
    else {
      blocked++;
      blockedByReason[ec] = (blockedByReason[ec] ?? 0) + 1;
    }
  }

  const { recommendation, bypassRate, blockRate } = deriveRecommendation({
    passed,
    bypassed,
    blocked,
  });

  const total = passed + bypassed + blocked;
  let reasoning: string;
  if (recommendation === "more-data-needed") {
    reasoning = `Window ${sinceDays}d: ${passed} passed (need ≥${INSUFFICIENT_DATA_FLOOR}); insufficient signal for B2 escalation decision. Continue B1 shakedown.`;
  } else if (recommendation === "ready-for-B2") {
    reasoning = `Window ${sinceDays}d: ${total} total gate events; ${passed} passed, bypass ${(bypassRate * 100).toFixed(1)}% < ${READY_BYPASS_RATE_CEIL * 100}%, block ${(blockRate * 100).toFixed(1)}% < ${READY_BLOCK_RATE_CEIL * 100}%. Workflow friction within tolerance — proceed with B1 → B2 escalation per rule 16 §Default-On Policy.`;
  } else {
    reasoning = `Window ${sinceDays}d: ${total} total gate events; bypass ${(bypassRate * 100).toFixed(1)}%, block ${(blockRate * 100).toFixed(1)}%. Friction exceeds tolerance — investigate before B2 escalation. Top block reasons: ${
      Object.entries(blockedByReason)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ") || "(none)"
    }.`;
  }

  return {
    window: { since: sinceISO, until: untilISO },
    totals: { passed, bypassed, blocked },
    blockedByReason,
    bypassRate,
    blockRate,
    recommendation,
    reasoning,
  };
}

export default async function pmHarnessBaseModeAuditHandler(
  rawArgs: unknown,
): Promise<PmHarnessBaseModeAuditResult> {
  return pmHarnessBaseModeAudit((rawArgs ?? {}) as PmHarnessBaseModeAuditArgs);
}
