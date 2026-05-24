// palantir-mini — lib/agent-audit/decision-extractor (W1.H sprint-037)
//
// Pure function extractDecisionTrail — aggregates per-correlationId decision
// trail from events.jsonl: subagent spawn → N agent_decision_logged events →
// terminal stop/commit.
//
// The two event sources (W1.E + W1.G) both emit validation_phase_completed
// envelopes with extended payload fields:
//   - errorClass="subagent_orchestration_audited"  → spawn record
//   - errorClass="agent_decision_logged"            → decision record
//
// Authority:
//   rule 12 v3.4.0 §Subagent decision audit invariant
//   rule 26 §Axis E (semantic + procedural + episodic + working)

import type { EventEnvelope } from "../event-log/types";

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface AuditFilter {
  sprintRef?:    string;
  agentName?:    string;
  whenRange?:    { from?: string; to?: string };
  correlationId?: string;
}

export interface SpawnRecord {
  spawnedAgent:     string;
  model:            string;
  description:      string;
  promptDigest:     string;
  spawnTimestamp:   string;
  correlationId:    string;
}

export interface DecisionRecord {
  toolName:      string;
  agentName:     string;
  inputDigest:   string;
  reasoning:     string | null;
  hypothesis:    string | null;
  sprintRef:     string | null;
  memoryLayers:  string[] | null;
  correlationId: string | null;
  timestamp:     string;
}

export interface TerminalRecord {
  type:      "subagent_stop" | "edit_committed" | "session_ended";
  timestamp: string;
}

export interface CorrelationGroup {
  correlationId:  string | null;
  spawn:          SpawnRecord | null;
  decisions:      DecisionRecord[];
  terminalEvent:  TerminalRecord | null;
  durationMs:     number | null;
}

export interface DecisionTrail {
  byCorrelation:  CorrelationGroup[];
  unattributed:   DecisionRecord[];
  summary: {
    totalCorrelations: number;
    totalDecisions:    number;
    totalSpawns:       number;
    perAgent:          Record<string, { spawnCount: number; decisionCount: number }>;
  };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Type guard: event payload as a generic record (safe cast). */
function asRecord(v: unknown): Record<string, unknown> {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function strArrayOrNull(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v.filter((x): x is string => typeof x === "string");
}

/** Extract a SpawnRecord from a subagent_orchestration_audited payload. */
function toSpawnRecord(
  payload: Record<string, unknown>,
  when: string,
): SpawnRecord | null {
  const correlationId = str(payload["correlationId"]);
  if (!correlationId) return null;
  return {
    spawnedAgent:   str(payload["spawnedAgent"]),
    model:          str(payload["model"]) || "unknown",
    description:    str(payload["description"]),
    promptDigest:   str(payload["promptDigest"]),
    spawnTimestamp: str(payload["spawnTimestamp"]) || when,
    correlationId,
  };
}

/** Extract a DecisionRecord from an agent_decision_logged payload. */
function toDecisionRecord(
  payload: Record<string, unknown>,
  when: string,
): DecisionRecord {
  return {
    toolName:      str(payload["toolName"]),
    agentName:     str(payload["agentName"]) || "unknown",
    inputDigest:   str(payload["inputDigest"]) || "unknown",
    reasoning:     strOrNull(payload["reasoning"]),
    hypothesis:    strOrNull(payload["hypothesis"]),
    sprintRef:     strOrNull(payload["sprintRef"]),
    memoryLayers:  strArrayOrNull(payload["memoryLayers"]),
    correlationId: strOrNull(payload["correlationId"]),
    timestamp:     when,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Extract per-correlationId decision trail from a flat event array.
 *
 * Steps:
 * 1. Apply filter (sprintRef / agentName / whenRange / correlationId).
 * 2. Index events by correlationId:
 *    - validation_phase_completed{errorClass="subagent_orchestration_audited"} → SpawnRecord
 *    - validation_phase_completed{errorClass="agent_decision_logged"}          → DecisionRecord
 *    - subagent_stop / edit_committed with matching correlationId              → TerminalRecord
 * 3. Aggregate per-agent counts.
 * 4. Compute durations (spawnTimestamp → terminal.timestamp).
 */
export function extractDecisionTrail(
  events: EventEnvelope[],
  filter: AuditFilter,
): DecisionTrail {
  // ── Step 1: filter ─────────────────────────────────────────────────────────
  const filtered = events.filter((ev) => {
    if (filter.whenRange?.from && ev.when < filter.whenRange.from) return false;
    if (filter.whenRange?.to   && ev.when > filter.whenRange.to)   return false;

    // Agent name filter applies to decision events and spawn events
    if (filter.agentName) {
      const payload = asRecord((ev as { payload?: unknown }).payload);
      const eventAgentName = str(payload["agentName"]) || str(ev.byWhom.agentName);
      const spawnedAgent   = str(payload["spawnedAgent"]);
      if (eventAgentName !== filter.agentName && spawnedAgent !== filter.agentName) {
        return false;
      }
    }

    // correlationId filter: check payload and byWhom context
    if (filter.correlationId) {
      const payload = asRecord((ev as { payload?: unknown }).payload);
      const evCorrelation = str(payload["correlationId"]);
      if (evCorrelation !== filter.correlationId) return false;
    }

    // sprintRef filter: check payload.sprintRef
    if (filter.sprintRef) {
      const payload = asRecord((ev as { payload?: unknown }).payload);
      const evSprintRef = str(payload["sprintRef"]);
      // Non-decision events may not carry sprintRef — only filter if they do
      const errorClass = str(payload["errorClass"]);
      if (errorClass === "agent_decision_logged" && evSprintRef && evSprintRef !== filter.sprintRef) {
        return false;
      }
    }

    return true;
  });

  // ── Step 2: index by correlationId ─────────────────────────────────────────
  const spawnByCorrelation   = new Map<string, SpawnRecord>();
  const decisionsByCorrelation = new Map<string, DecisionRecord[]>();
  const terminalByCorrelation  = new Map<string, TerminalRecord>();
  const unattributed: DecisionRecord[] = [];

  for (const ev of filtered) {
    const payload = asRecord((ev as { payload?: unknown }).payload);
    const errorClass = str(payload["errorClass"]);

    if (ev.type === "validation_phase_completed") {
      if (errorClass === "subagent_orchestration_audited") {
        const spawn = toSpawnRecord(payload, ev.when);
        if (spawn) {
          spawnByCorrelation.set(spawn.correlationId, spawn);
        }
      } else if (errorClass === "agent_decision_logged") {
        const decision = toDecisionRecord(payload, ev.when);
        const cid = decision.correlationId;
        if (cid) {
          const arr = decisionsByCorrelation.get(cid) ?? [];
          arr.push(decision);
          decisionsByCorrelation.set(cid, arr);
        } else {
          unattributed.push(decision);
        }
      }
    } else if (ev.type === "subagent_stop") {
      const cid = strOrNull(payload["correlationId"]);
      // subagent_stop may not carry correlationId directly; we can still collect
      // terminal records keyed on existing correlation groups if cid matches
      if (cid && !terminalByCorrelation.has(cid)) {
        terminalByCorrelation.set(cid, { type: "subagent_stop", timestamp: ev.when });
      }
    } else if (ev.type === "edit_committed") {
      const cid = strOrNull(payload["correlationId"]);
      if (cid && !terminalByCorrelation.has(cid)) {
        terminalByCorrelation.set(cid, { type: "edit_committed", timestamp: ev.when });
      }
    } else if (ev.type === "session_ended") {
      // session_ended as fallback terminal — not keyed by correlationId, handled below
    }
  }

  // ── Step 3: assemble correlation groups ────────────────────────────────────
  // Collect all known correlationIds from spawn + decisions + terminal
  const allCids = new Set<string>([
    ...spawnByCorrelation.keys(),
    ...decisionsByCorrelation.keys(),
    ...terminalByCorrelation.keys(),
  ]);

  // Also check decisions that may have correlationIds not yet in spawn set
  for (const [cid] of decisionsByCorrelation) {
    allCids.add(cid);
  }

  const byCorrelation: CorrelationGroup[] = [];
  for (const cid of allCids) {
    const spawn      = spawnByCorrelation.get(cid) ?? null;
    const decisions  = decisionsByCorrelation.get(cid) ?? [];
    const terminal   = terminalByCorrelation.get(cid) ?? null;

    // Compute duration
    let durationMs: number | null = null;
    const spawnTs  = spawn?.spawnTimestamp;
    const termTs   = terminal?.timestamp;
    if (spawnTs && termTs) {
      const startMs = Date.parse(spawnTs);
      const endMs   = Date.parse(termTs);
      if (!isNaN(startMs) && !isNaN(endMs)) {
        durationMs = endMs - startMs;
      }
    }

    byCorrelation.push({ correlationId: cid, spawn, decisions, terminalEvent: terminal, durationMs });
  }

  // Sort groups by spawnTimestamp (or first decision timestamp if no spawn)
  byCorrelation.sort((a, b) => {
    const aTs = a.spawn?.spawnTimestamp ?? a.decisions[0]?.timestamp ?? "";
    const bTs = b.spawn?.spawnTimestamp ?? b.decisions[0]?.timestamp ?? "";
    return aTs < bTs ? -1 : aTs > bTs ? 1 : 0;
  });

  // ── Step 4: compute summary ────────────────────────────────────────────────
  const perAgent: Record<string, { spawnCount: number; decisionCount: number }> = {};

  const incAgent = (name: string, kind: "spawn" | "decision"): void => {
    if (!perAgent[name]) perAgent[name] = { spawnCount: 0, decisionCount: 0 };
    if (kind === "spawn")    perAgent[name]!.spawnCount++;
    else                     perAgent[name]!.decisionCount++;
  };

  let totalSpawns    = 0;
  let totalDecisions = 0;

  for (const grp of byCorrelation) {
    if (grp.spawn) {
      totalSpawns++;
      incAgent(grp.spawn.spawnedAgent || "unknown", "spawn");
    }
    for (const d of grp.decisions) {
      totalDecisions++;
      incAgent(d.agentName, "decision");
    }
  }

  for (const d of unattributed) {
    totalDecisions++;
    incAgent(d.agentName, "decision");
  }

  return {
    byCorrelation,
    unattributed,
    summary: {
      totalCorrelations: byCorrelation.length,
      totalDecisions,
      totalSpawns,
      perAgent,
    },
  };
}
