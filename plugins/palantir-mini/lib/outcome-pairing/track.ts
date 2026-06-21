/**
 * palantir-mini v1.36 / sprint-026 / W1.4 — outcome-pairing pure helpers.
 *
 * Extracted from `hooks/outcome-pair-tracker.ts` so both the hook (PostToolUse
 * advisory path A — fires for MCP-routed emits) and `scripts/log.ts:emit()`
 * (in-band path B — fires for hook-direct emits) can share the same pair
 * lifecycle logic without circular import (the hook imports `emit` from
 * scripts/log).
 *
 * This file contains ONLY pure functions + filesystem-marker helpers (no
 * `emit` calls, no event log writes). The hook continues to perform orphan
 * scan emit; the in-band path performs only marker write/mutate.
 *
 * Authority: rule 26 v1.0.0 §Axis B1.
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type {
  OutcomePairingDeclaration,
  OutcomePairingRid,
  OutcomeSnapshot,
} from "#schemas/ontology/primitives/outcome-pairing";

/** Determine pair role from event type. Returns null if not pair-able. */
export function classifyPairRole(eventType: string): "open" | "close" | null {
  const openTypes = new Set([
    "edit_proposed",
    "dry_run_computed",
    "harness_agent_spawned",
    "feedback_loop_opened",
    "sprint_contract_negotiated",
    // W3.C1: agent lifecycle open events
    "agent_start",
    "task_started",
  ]);
  const closeTypes = new Set([
    "edit_committed",
    "dry_run_graded",
    "sprint_completed",
    "feedback_loop_closed",
    "sprint_contract_bound",
    "grading_completed",
    "playwright_scenario_executed",
    // W3.C1: agent lifecycle close events
    // NOTE: task_completed is NOT added here — already covered by _completed suffix match below
    "subagent_stop",
  ]);
  if (openTypes.has(eventType)) return "open";
  if (closeTypes.has(eventType)) return "close";

  const lifecycleNonPairs = new Set([
    "session_started",
    "session_ended",
    "phase_completed",
  ]);
  if (lifecycleNonPairs.has(eventType)) return null;

  if (eventType.endsWith("_proposed")) return "open";
  if (
    eventType.endsWith("_observed") ||
    eventType.endsWith("_completed") ||
    eventType.endsWith("_committed")
  ) {
    return "close";
  }
  return null;
}

/** Compute pairing RID — sha256-12 of actionRid + unix-ms. */
export function computePairRid(actionRid: string, whenIso: string): OutcomePairingRid {
  const sha = crypto.createHash("sha256").update(actionRid).digest("hex").slice(0, 12);
  const unixMs = Date.parse(whenIso);
  const ms = Number.isFinite(unixMs) ? unixMs : Date.now();
  return `pair-${sha}-${ms}` as OutcomePairingRid;
}

/** Shape of envelope subset used to derive actionRid. */
export interface EnvelopeForPairing {
  type?:        string;
  eventId?:     string;
  when?:        string;
  lineageRefs?: { actionRid?: string };
  payload?:     Record<string, unknown>;
}

/** Derive actionRid from envelope. Fallback to eventId when missing. */
export function deriveActionRid(envelope: EnvelopeForPairing | null | undefined): string {
  if (!envelope) return "unknown";
  if (envelope.lineageRefs?.actionRid) return envelope.lineageRefs.actionRid;
  const payload = envelope.payload;
  if (payload) {
    if (typeof payload.actionRid === "string" && payload.actionRid.length > 0) return payload.actionRid;
    if (typeof payload.contractId === "string" && payload.contractId.length > 0) return payload.contractId;
    if (typeof payload.loopId === "string" && payload.loopId.length > 0) return payload.loopId;
    if (typeof payload.scenarioId === "string" && payload.scenarioId.length > 0) return payload.scenarioId;
    if (typeof payload.dryRunRef === "string" && payload.dryRunRef.length > 0) return payload.dryRunRef;
  }
  return envelope.eventId ?? "unknown";
}

export function outcomePairsDir(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "outcome-pairs");
}

/** Find existing open marker matching actionRid. Returns absolute path or null. */
export function findOpenMarker(dir: string, actionRid: string): string | null {
  if (!fs.existsSync(dir)) return null;
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }
  for (const f of entries) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const decl = JSON.parse(raw) as OutcomePairingDeclaration & { actionRid?: string };
      const stored = decl.evidence?.actionRid ?? decl.actionRid;
      if (stored === actionRid && decl.refinedOutcome === undefined) {
        return path.join(dir, f);
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** Verdict + score derivation for outcome snapshots. */
export function snapshotFromPayload(
  payload: Record<string, unknown> | undefined,
  whenIso: string,
): OutcomeSnapshot {
  const verdict =
    (payload?.passed === false || payload?.verdict === "failed")
      ? "fail"
      : (payload?.passed === true || payload?.verdict === "passed")
        ? "pass"
        : "unknown";
  const score = typeof payload?.overallScore === "number"
    ? (payload.overallScore as number)
    : -1;
  return { verdict, score, capturedAt: whenIso };
}

/**
 * Best-effort write of an OPEN marker. Returns the marker path on success or
 * null on no-op (existing open marker found) / silent failure.
 *
 * Idempotent: existing OPEN marker for the same actionRid → null no-op.
 */
export function writeOpenMarker(
  pairsDir: string,
  envelope: EnvelopeForPairing,
): string | null {
  const actionRid = deriveActionRid(envelope);
  const whenIso = envelope.when ?? new Date().toISOString();
  try {
    fs.mkdirSync(pairsDir, { recursive: true });
  } catch {
    return null;
  }
  if (findOpenMarker(pairsDir, actionRid) !== null) return null;
  const pairRid = computePairRid(actionRid, whenIso);
  const baseline = snapshotFromPayload(envelope.payload, whenIso);
  const decl: OutcomePairingDeclaration & { actionRid?: string } = {
    pairingId: pairRid,
    actionRid,
    scenario: envelope.type ?? "unknown",
    baselineOutcome: baseline,
    evidence: { actionRid },
    createdAt: whenIso,
  };
  const markerPath = path.join(pairsDir, `${pairRid}.json`);
  try {
    fs.writeFileSync(markerPath, JSON.stringify(decl, null, 2), "utf8");
    return markerPath;
  } catch {
    return null;
  }
}

/**
 * Best-effort mutation of OPEN → CLOSED. Returns the marker path on success
 * or null when no open marker matched (in which case the caller may choose
 * to write a standalone closed marker via writeClosedMarker).
 */
export function closeOpenMarker(
  pairsDir: string,
  envelope: EnvelopeForPairing,
): string | null {
  const actionRid = deriveActionRid(envelope);
  const whenIso = envelope.when ?? new Date().toISOString();
  const openMarker = findOpenMarker(pairsDir, actionRid);
  if (openMarker === null) return null;
  try {
    const raw = fs.readFileSync(openMarker, "utf8");
    const decl = JSON.parse(raw) as OutcomePairingDeclaration & { actionRid?: string };
    const refined = snapshotFromPayload(envelope.payload, whenIso);
    const updated: OutcomePairingDeclaration & { actionRid?: string } = {
      ...decl,
      refinedOutcome: refined,
      closedAt: whenIso,
      deltaMetrics: {
        scoreDelta:
          decl.baselineOutcome.score >= 0 && refined.score >= 0
            ? refined.score - decl.baselineOutcome.score
            : undefined,
        latencyMs: Date.parse(whenIso) - Date.parse(decl.createdAt),
      },
    };
    fs.writeFileSync(openMarker, JSON.stringify(updated, null, 2), "utf8");
    return openMarker;
  } catch {
    return null;
  }
}

/** Write a standalone CLOSED marker (close-without-open path). */
export function writeClosedMarker(
  pairsDir: string,
  envelope: EnvelopeForPairing,
): string | null {
  const actionRid = deriveActionRid(envelope);
  const whenIso = envelope.when ?? new Date().toISOString();
  const refined = snapshotFromPayload(envelope.payload, whenIso);
  // Degenerate-snapshot skip: an ungraded close-without-open would write a
  // standalone marker whose baselineOutcome === refinedOutcome with score -1 /
  // verdict "unknown" — zero analytical signal, only drift. Skip before any
  // mkdir/write so the substrate accumulates only graded close-without-open
  // markers. Append-only safe: existing pair files are never read or mutated.
  if (refined.score < 0 && refined.verdict === "unknown") return null;
  try {
    fs.mkdirSync(pairsDir, { recursive: true });
  } catch {
    return null;
  }
  const pairRid = computePairRid(actionRid, whenIso);
  const decl: OutcomePairingDeclaration & { actionRid?: string } = {
    pairingId: pairRid,
    actionRid,
    scenario: envelope.type ?? "unknown",
    baselineOutcome: refined,
    refinedOutcome: refined,
    evidence: { actionRid },
    createdAt: whenIso,
    closedAt: whenIso,
  };
  const markerPath = path.join(pairsDir, `${pairRid}.json`);
  try {
    fs.writeFileSync(markerPath, JSON.stringify(decl, null, 2), "utf8");
    return markerPath;
  } catch {
    return null;
  }
}
