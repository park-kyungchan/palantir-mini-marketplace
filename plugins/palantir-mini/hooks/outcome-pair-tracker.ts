// palantir-mini v4.1.0 — outcome-pair-tracker hook (rule 26 §Axis B1)
// Fires on: PostToolUse with matcher
//   mcp__plugin_palantir-mini_palantir-mini__emit_event (advisory, async)
//
// Pair lifecycle tracking per rule 26 §Axis B1 (outcome-paired) +
// rule 16 v4.0.0 §Loop step 6 (revise). For every emitted envelope:
//   - OPEN events (e.g. `edit_proposed`, `dry_run_computed`, `*_started`)
//     → write marker `<sessionDir>/outcome-pairs/<pairRid>.json` keyed
//       by lineageRefs.actionRid (or synthetic from event when missing).
//   - CLOSE events (e.g. `edit_committed`, `dry_run_graded`, `sprint_completed`,
//     `*_observed`, `*_completed`) → mutate matching marker to `closed` state
//     with refinedOutcome snapshot.
//   - Orphan detection: piggybacks on close events; scans markers older than
//     `orphanThresholdMs` (default 30 min) → emit `outcome_pair_orphaned`
//     advisory event. Downgrade decision (T3 → T2) is a read-time concern
//     handled by `pm_outcome_pair_audit` MCP, not envelope mutation
//     (events.jsonl is append-only, rule 10).
//
// Idempotent: re-firing on the same event is a no-op (mtime-based dedupe).
// Best-effort: never block emit success (PostToolUse advisory).
//
// Authority: ~/.claude/rules/26-valuable-data-standard.md §Axis B1
//            ~/.claude/schemas/ontology/primitives/outcome-pairing.ts
//            ~/.claude/plans/quiet-fluttering-garden.md §Phase 2.2

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { normalizePalantirMiniMcpToolName } from "../lib/hooks/tool-classifier";
import {
  pairingState,
  type OutcomePairingDeclaration,
  type OutcomePairingRid,
  type OutcomeSnapshot,
} from "#schemas/ontology/primitives/outcome-pairing";

const TARGET_TOOL = "emit_event";
const ORPHAN_THRESHOLD_MS = 30 * 60 * 1000; // 30 min

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    project?: string;
    envelope?: {
      type?: string;
      eventId?: string;
      when?: string;
      lineageRefs?: { actionRid?: string };
      payload?: Record<string, unknown>;
      withWhat?: { hypothesis?: string };
      valueGrade?: string;
    };
  };
}

interface HookResult {
  message:           string;
  decision?:         "continue";
  additionalContext?: string;
}

/** Determine pair role from event type. Returns null if not a pair-able event. */
export function classifyPairRole(eventType: string): "open" | "close" | null {
  // Explicit named pairs (highest priority)
  const openTypes = new Set([
    "edit_proposed",
    "dry_run_computed",
    "harness_agent_spawned",
    "feedback_loop_opened",
    "sprint_contract_negotiated",
  ]);
  const closeTypes = new Set([
    "edit_committed",
    "dry_run_graded",
    "sprint_completed",
    "feedback_loop_closed",
    "sprint_contract_bound",
    "grading_completed",
    "playwright_scenario_executed",
  ]);

  if (openTypes.has(eventType)) return "open";
  if (closeTypes.has(eventType)) return "close";

  // Lifecycle marker non-pairs (avoid false-positive matches via suffix fallback)
  const lifecycleNonPairs = new Set([
    "session_started",
    "session_ended",
    "phase_completed", // generic checkpoint, not pair half
  ]);
  if (lifecycleNonPairs.has(eventType)) return null;

  // Suffix-based fallback (conservative — only `_proposed` for open)
  if (eventType.endsWith("_proposed")) {
    return "open";
  }
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
function computePairRid(actionRid: string, whenIso: string): OutcomePairingRid {
  const sha = crypto
    .createHash("sha256")
    .update(actionRid)
    .digest("hex")
    .slice(0, 12);
  const unixMs = Date.parse(whenIso);
  const ms = Number.isFinite(unixMs) ? unixMs : Date.now();
  return `pair-${sha}-${ms}` as OutcomePairingRid;
}

/** Derive actionRid from envelope. Fallback to eventId when missing. */
export function deriveActionRid(envelope: HookPayload["tool_input"] extends infer T
  ? T extends { envelope?: infer E } ? E : never
  : never): string {
  if (envelope?.lineageRefs?.actionRid) return envelope.lineageRefs.actionRid;
  // Best-effort fallbacks for legacy events without lineageRefs
  const payload = envelope?.payload as Record<string, unknown> | undefined;
  if (payload) {
    if (typeof payload.actionRid === "string" && payload.actionRid.length > 0) {
      return payload.actionRid;
    }
    if (typeof payload.contractId === "string" && payload.contractId.length > 0) {
      return payload.contractId;
    }
    if (typeof payload.loopId === "string" && payload.loopId.length > 0) {
      return payload.loopId;
    }
    if (typeof payload.scenarioId === "string" && payload.scenarioId.length > 0) {
      return payload.scenarioId;
    }
    if (typeof payload.dryRunRef === "string" && payload.dryRunRef.length > 0) {
      return payload.dryRunRef;
    }
  }
  return envelope?.eventId ?? "unknown";
}

function outcomePairsDir(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "outcome-pairs");
}

/** Find existing open marker matching actionRid. Returns null if none. */
function findOpenMarker(dir: string, actionRid: string): string | null {
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
      // Match on stored actionRid (carried in evidence.actionRid OR top-level)
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

/** Scan for orphaned (open + older than threshold) markers. Returns RIDs. */
export function scanOrphans(dir: string, thresholdMs: number, nowMs: number): OutcomePairingRid[] {
  if (!fs.existsSync(dir)) return [];
  const orphans: OutcomePairingRid[] = [];
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  for (const f of entries) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const decl = JSON.parse(raw) as OutcomePairingDeclaration;
      const state = pairingState(decl, thresholdMs, nowMs);
      if (state === "orphaned") {
        orphans.push(decl.pairingId);
      }
    } catch {
      continue;
    }
  }
  return orphans;
}

export default async function outcomePairTracker(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const toolName = p.tool_name ?? "";

  if (normalizePalantirMiniMcpToolName(toolName) !== TARGET_TOOL) {
    return {
      message: `palantir-mini: outcome-pair-tracker skipped (tool=${toolName})`,
      decision: "continue",
    };
  }

  const envelope = p.tool_input?.envelope;
  if (!envelope || !envelope.type) {
    return {
      message: "palantir-mini: outcome-pair-tracker skipped (no envelope)",
      decision: "continue",
    };
  }

  const role = classifyPairRole(envelope.type);
  if (role === null) {
    return {
      message: `palantir-mini: outcome-pair-tracker skipped (event=${envelope.type} not pair-able)`,
      decision: "continue",
    };
  }

  const projectRoot = p.tool_input?.project ?? p.cwd ?? process.cwd();
  const pairsDir = outcomePairsDir(projectRoot);
  const actionRid = deriveActionRid(envelope);
  const whenIso = envelope.when ?? new Date().toISOString();

  // Ensure dir exists
  try {
    fs.mkdirSync(pairsDir, { recursive: true });
  } catch (e) {
    return {
      message: `palantir-mini: outcome-pair-tracker mkdir failed: ${(e as Error).message}`,
      decision: "continue",
    };
  }

  const verdict =
    (envelope.payload?.passed === false || envelope.payload?.verdict === "failed")
      ? "fail"
      : (envelope.payload?.passed === true || envelope.payload?.verdict === "passed")
        ? "pass"
        : "unknown";

  const score = typeof envelope.payload?.overallScore === "number"
    ? envelope.payload.overallScore as number
    : -1;

  if (role === "open") {
    // Idempotency: existing OPEN marker for same actionRid → no-op
    const existing = findOpenMarker(pairsDir, actionRid);
    if (existing !== null) {
      return {
        message: `palantir-mini: outcome-pair-tracker open no-op (existing marker for actionRid=${actionRid})`,
        decision: "continue",
      };
    }

    const pairRid = computePairRid(actionRid, whenIso);
    const decl: OutcomePairingDeclaration & { actionRid?: string } = {
      pairingId: pairRid,
      actionRid,
      scenario: envelope.type,
      baselineOutcome: {
        verdict,
        score,
        capturedAt: whenIso,
      },
      evidence: {
        actionRid,
      },
      createdAt: whenIso,
    };

    const markerPath = path.join(pairsDir, `${pairRid}.json`);
    try {
      fs.writeFileSync(markerPath, JSON.stringify(decl, null, 2), "utf8");
    } catch (e) {
      return {
        message: `palantir-mini: outcome-pair-tracker open write failed: ${(e as Error).message}`,
        decision: "continue",
      };
    }

    // (a) Open-side emit — record in events.jsonl that a pair was opened.
    // Without this, markers accumulate (830+) with no corresponding events.jsonl
    // rows, causing 90% drift vs the ~86 close-side rows.
    void emitOpenEvent(projectRoot, pairRid, actionRid, envelope.type, whenIso);

    // (b) Correlation emit — link originating eventId → pairRid so downstream
    // pm_outcome_pair_audit can join events by outcomePairId. PostToolUse fires
    // AFTER the originating event is already persisted (append-only, rule 10),
    // so we cannot mutate the in-flight envelope; we emit a correction row
    // carrying the correlation instead.
    if (envelope.eventId) {
      void emitCorrelationEvent(
        projectRoot,
        pairRid,
        actionRid,
        envelope.eventId,
        envelope.type,
        whenIso,
      );
    }

    return {
      message: `palantir-mini: outcome-pair-tracker opened pair=${pairRid} actionRid=${actionRid}`,
      decision: "continue",
    };
  }

  // role === "close"
  const openMarker = findOpenMarker(pairsDir, actionRid);
  if (openMarker === null) {
    // Close-without-open: write standalone closed marker (snapshot only)
    const pairRid = computePairRid(actionRid, whenIso);
    const closedAt = whenIso;
    const refinedOutcome: OutcomeSnapshot = {
      verdict,
      score,
      capturedAt: whenIso,
    };
    const decl: OutcomePairingDeclaration & { actionRid?: string } = {
      pairingId: pairRid,
      actionRid,
      scenario: envelope.type,
      baselineOutcome: refinedOutcome,
      refinedOutcome,
      evidence: { actionRid },
      createdAt: whenIso,
      closedAt,
    };
    const markerPath = path.join(pairsDir, `${pairRid}.json`);
    try {
      fs.writeFileSync(markerPath, JSON.stringify(decl, null, 2), "utf8");
    } catch {
      // best-effort
    }
    // Run orphan scan opportunistically
    void runOrphanScan(projectRoot, pairsDir);
    return {
      message: `palantir-mini: outcome-pair-tracker close-without-open recorded actionRid=${actionRid}`,
      decision: "continue",
    };
  }

  // Mutate existing OPEN marker → CLOSED
  try {
    const raw = fs.readFileSync(openMarker, "utf8");
    const decl = JSON.parse(raw) as OutcomePairingDeclaration & { actionRid?: string };
    const refinedOutcome: OutcomeSnapshot = {
      verdict,
      score,
      capturedAt: whenIso,
    };
    const updated: OutcomePairingDeclaration & { actionRid?: string } = {
      ...decl,
      refinedOutcome,
      closedAt: whenIso,
      deltaMetrics: {
        scoreDelta:
          decl.baselineOutcome.score >= 0 && score >= 0
            ? score - decl.baselineOutcome.score
            : undefined,
        latencyMs: Date.parse(whenIso) - Date.parse(decl.createdAt),
      },
    };
    fs.writeFileSync(openMarker, JSON.stringify(updated, null, 2), "utf8");
  } catch (e) {
    return {
      message: `palantir-mini: outcome-pair-tracker close mutate failed: ${(e as Error).message}`,
      decision: "continue",
    };
  }

  // Run orphan scan opportunistically (close events are a natural pulse)
  void runOrphanScan(projectRoot, pairsDir);

  return {
    message: `palantir-mini: outcome-pair-tracker closed pair (actionRid=${actionRid})`,
    decision: "continue",
  };
}

/**
 * Emit a `phase_completed` envelope recording that an outcome pair was opened.
 * Closes the events.jsonl gap: previously the hook wrote disk markers only;
 * now every open marker has a corresponding events.jsonl row with
 * lineageRefs.outcomePairId so pm_outcome_pair_audit can join by RID.
 * Best-effort — never throws.
 */
async function emitOpenEvent(
  projectRoot: string,
  pairRid: OutcomePairingRid,
  actionRid: string,
  eventType: string,
  whenIso: string,
): Promise<void> {
  try {
    await emit({
      type: "phase_completed",
      payload: {
        phaseTag: "outcome_pair_opened",
        taskId: `outcome-pair-open-${pairRid}`,
        validations: [`pairRid=${pairRid}`, `actionRid=${actionRid}`, `openEventType=${eventType}`],
      },
      toolName: "PostToolUse",
      cwd: projectRoot,
      identity: "monitor",
      memoryLayers: ["episodic", "procedural"],
      lineageRefs: {
        outcomePairId: pairRid,
        actionRid,
      },
      reasoning: `outcome-pair-tracker: opened pair=${pairRid} for ${eventType} (actionRid=${actionRid})`,
    });
  } catch {
    // best-effort
  }
}

/**
 * Emit an `outcome_pair_correlation` correction envelope linking the originating
 * event (already persisted — append-only invariant, rule 10) to its pairRid.
 * This back-propagates outcomePairId into the lineage chain without mutating
 * the original event row.
 * Best-effort — never throws.
 */
async function emitCorrelationEvent(
  projectRoot: string,
  pairRid: OutcomePairingRid,
  actionRid: string,
  originatingEventId: string,
  originatingEventType: string,
  whenIso: string,
): Promise<void> {
  try {
    await emit({
      type: "phase_completed",
      payload: {
        phaseTag: "outcome_pair_correlation",
        taskId: `outcome-pair-corr-${pairRid}`,
        validations: [
          `pairRid=${pairRid}`,
          `originatingEventId=${originatingEventId}`,
          `originatingEventType=${originatingEventType}`,
          `actionRid=${actionRid}`,
        ],
      },
      toolName: "PostToolUse",
      cwd: projectRoot,
      identity: "monitor",
      memoryLayers: ["episodic", "semantic"],
      lineageRefs: {
        outcomePairId: pairRid,
        actionRid,
      },
      reasoning: `outcome-pair-tracker: correlated originating event=${originatingEventId} (type=${originatingEventType}) to pair=${pairRid} — back-propagates outcomePairId into lineage chain (rule 10 append-only; cannot mutate original row)`,
    });
  } catch {
    // best-effort
  }
}

/** Best-effort orphan scan + emit advisory. Never throws. */
async function runOrphanScan(projectRoot: string, pairsDir: string): Promise<void> {
  try {
    const orphans = scanOrphans(pairsDir, ORPHAN_THRESHOLD_MS, Date.now());
    if (orphans.length === 0) return;
    await emit({
      type: "phase_completed",
      payload: {
        phaseTag: "outcome_pair_orphaned",
        taskId: `orphan-scan-${Date.now()}`,
        validations: [`orphan-count=${orphans.length}`],
      },
      toolName: "PostToolUse",
      cwd: projectRoot,
      identity: "monitor",
      memoryLayers: ["procedural", "episodic"],
      reasoning: `outcome-pair-tracker: ${orphans.length} orphaned pair(s) older than ${ORPHAN_THRESHOLD_MS}ms — first 5: ${orphans.slice(0, 5).join(", ")}`,
    });
  } catch {
    // best-effort
  }
}
