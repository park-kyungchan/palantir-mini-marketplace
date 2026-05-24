// palantir-mini v6.35.0 — SubagentStop hook: harness-sprint-chain-suggest
//
// On harness-generator/evaluator/implementer subagent stop, computes the
// unvisited-RID ratio for the active SprintContract scope. If >5% unvisited,
// emits an advisory validation_phase_completed errorClass="harness_sprint_chain_suggestion"
// with withWhat.suggestedNextSprintBrief listing the unvisited RIDs so Lead can
// decide on a follow-up sprint for residual scope coverage.
//
// Per canonical plan v2 §4 row 5.16. PHASE 5 CLOSE.

import * as fs from "fs";
import * as path from "path";
import { emit, eventsPathFor } from "../scripts/log";
import { readEvents } from "../lib/event-log/read";
import { findProjectRoot } from "./harness-base-mode-advisory";

// Agents whose stop triggers the unvisited-RID check.
const TARGET_AGENTS = new Set([
  "harness-generator",
  "harness-evaluator",
  "project-implementer",
  "implementer",
]);

// Maximum age of a sprint contract to be considered "active" (60 minutes).
const MAX_CONTRACT_AGE_MS = 60 * 60 * 1000;

// Threshold: emit advisory when unvisited ratio exceeds 5%.
const UNVISITED_THRESHOLD = 0.05;

interface HookPayload {
  cwd?: string;
  session_id?: string;
  agent_name?: string;
  agent_id?: string;
  exit_code?: number;
  reason?: string;
}

interface HookResult {
  message: string;
  decision?: "continue";
  reason?: string;
  additionalContext?: string;
}

interface SprintContractInput {
  featureId?: string;
  title?: string;
  description?: string;
  scopePaths?: string[];
}

interface SprintContract {
  contractId?: string;
  sprintNumber?: number;
  inputs?: SprintContractInput[];
  successCriteriaRids?: string[];
}

interface ContractHit {
  contractPath: string;
  contract: SprintContract;
  sprintDir: string;
  mtimeMs: number;
}

/** Walk sprints/ directory to find the most recently modified contract.json within MAX_CONTRACT_AGE_MS. */
export function findActiveContract(projectRoot: string): ContractHit | null {
  const sprintsDir = path.join(projectRoot, ".palantir-mini", "harness", "sprints");
  if (!fs.existsSync(sprintsDir)) return null;

  let entries: string[] = [];
  try {
    entries = fs.readdirSync(sprintsDir);
  } catch {
    return null;
  }

  let best: ContractHit | null = null;
  const now = Date.now();

  for (const entry of entries) {
    const contractPath = path.join(sprintsDir, entry, "contract.json");
    if (!fs.existsSync(contractPath)) continue;
    try {
      const stat = fs.statSync(contractPath);
      const ageSince = now - stat.mtimeMs;
      if (ageSince > MAX_CONTRACT_AGE_MS) continue;
      const raw = fs.readFileSync(contractPath, "utf8");
      const contract = JSON.parse(raw) as SprintContract;
      if (!best || stat.mtimeMs > best.mtimeMs) {
        best = {
          contractPath,
          contract,
          sprintDir: path.join(sprintsDir, entry),
          mtimeMs: stat.mtimeMs,
        };
      }
    } catch {
      // skip malformed or unreadable contracts
    }
  }

  return best;
}

/**
 * Collect target RIDs from a SprintContract.
 * Sources: successCriteriaRids + inputs[].scopePaths (treat each non-empty path as a RID-like target)
 * + inputs[].featureId (as named RID identifiers).
 */
export function collectTargetRids(contract: SprintContract): string[] {
  const rids = new Set<string>();

  // successCriteriaRids
  if (Array.isArray(contract.successCriteriaRids)) {
    for (const rid of contract.successCriteriaRids) {
      if (rid && rid.trim().length > 0) rids.add(rid.trim());
    }
  }

  // inputs[].featureId
  if (Array.isArray(contract.inputs)) {
    for (const input of contract.inputs) {
      if (input.featureId && input.featureId.trim().length > 0) {
        rids.add(input.featureId.trim());
      }
      // inputs[].scopePaths — treat each entry as a path-scoped RID
      if (Array.isArray(input.scopePaths)) {
        for (const sp of input.scopePaths) {
          if (sp && sp.trim().length > 0) rids.add(sp.trim());
        }
      }
    }
  }

  return Array.from(rids);
}

/**
 * Find the time when the sprint contract was bound by scanning events.jsonl for
 * sprint_contract_bound events matching this contractId. Falls back to contract file mtime.
 */
export function findSprintBoundTime(
  eventsPath: string,
  contractId: string | undefined,
  fallbackMtimeMs: number,
): number {
  if (!fs.existsSync(eventsPath)) return fallbackMtimeMs;
  try {
    const events = readEvents(eventsPath);
    for (const evt of events) {
      if (
        evt.type === "sprint_contract_bound" &&
        (evt.payload as { contractId?: string })?.contractId === contractId
      ) {
        return new Date(evt.when ?? 0).getTime() || fallbackMtimeMs;
      }
    }
  } catch {
    // best-effort
  }
  return fallbackMtimeMs;
}

/**
 * Compute which target RIDs appear in events.jsonl events emitted AFTER boundAtMs.
 * Checks: lineageRefs.actionRid, payload.affectedRid, payload.featureId, payload.scopePath.
 */
export function computeVisitedRids(
  eventsPath: string,
  targetRids: Set<string>,
  boundAtMs: number,
): Set<string> {
  const visited = new Set<string>();
  if (!fs.existsSync(eventsPath) || targetRids.size === 0) return visited;

  try {
    const events = readEvents(eventsPath);
    for (const evt of events) {
      const evtTime = new Date(evt.when ?? 0).getTime();
      if (evtTime < boundAtMs) continue;

      // Collect all string-like values that might reference a RID
      const candidates: string[] = [];
      const lr = evt.lineageRefs as Record<string, unknown> | undefined;
      if (lr?.actionRid && typeof lr.actionRid === "string") candidates.push(lr.actionRid);
      const p = evt.payload as Record<string, unknown> | undefined;
      if (p?.affectedRid && typeof p.affectedRid === "string") candidates.push(p.affectedRid as string);
      if (p?.featureId && typeof p.featureId === "string") candidates.push(p.featureId as string);
      if (p?.scopePath && typeof p.scopePath === "string") candidates.push(p.scopePath as string);
      if (p?.contractId && typeof p.contractId === "string") candidates.push(p.contractId as string);
      // Also scan payload values shallowly for any key whose value matches a target RID
      if (p) {
        for (const val of Object.values(p)) {
          if (typeof val === "string" && targetRids.has(val)) candidates.push(val);
        }
      }

      for (const c of candidates) {
        if (targetRids.has(c)) visited.add(c);
      }
    }
  } catch {
    // best-effort
  }
  return visited;
}

/** Format the suggested next sprint brief (truncated at 10 RIDs for readability). */
export function buildSuggestedBrief(
  unvisited: string[],
  contractId: string | undefined,
  sprintNumber: number | undefined,
): string {
  const sprintRef = contractId ?? (sprintNumber != null ? `sprint-${sprintNumber}` : "the current sprint");
  const ridList = unvisited.slice(0, 10).join(", ");
  const overflow = unvisited.length > 10 ? ` (+${unvisited.length - 10} more)` : "";
  return `Pick up ${unvisited.length} unvisited RID${unvisited.length !== 1 ? "s" : ""} from ${sprintRef}: ${ridList}${overflow}`;
}

export default async function harnessSprintChainSuggest(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const agentName = p.agent_name ?? p.agent_id ?? "";

  // Only fire for targeted agent types
  if (!TARGET_AGENTS.has(agentName)) {
    return {
      message: `palantir-mini: harness-sprint-chain-suggest — skipped (agent=${agentName} not in target list)`,
      decision: "continue",
    };
  }

  // Locate project root
  const maybeRoot = findProjectRoot(cwd);
  if (!maybeRoot) {
    return {
      message: "palantir-mini: harness-sprint-chain-suggest — no project root; skipping",
      decision: "continue",
    };
  }
  const projectRoot: string = maybeRoot;

  // Find active SprintContract
  const hit = findActiveContract(projectRoot);
  if (!hit) {
    return {
      message: "palantir-mini: harness-sprint-chain-suggest — no active sprint contract within last 60min; skipping",
      decision: "continue",
    };
  }

  const { contract, contractPath } = hit;
  const targetRids = collectTargetRids(contract);

  if (targetRids.length === 0) {
    return {
      message: "palantir-mini: harness-sprint-chain-suggest — no target RIDs in contract; skipping",
      decision: "continue",
    };
  }

  const eventsPath = eventsPathFor(projectRoot);
  const boundAtMs = findSprintBoundTime(eventsPath, contract.contractId, hit.mtimeMs);

  const targetSet = new Set(targetRids);
  const visitedSet = computeVisitedRids(eventsPath, targetSet, boundAtMs);

  const unvisited = targetRids.filter((rid) => !visitedSet.has(rid));
  const ratio = unvisited.length / targetRids.length;

  if (ratio <= UNVISITED_THRESHOLD) {
    return {
      message: `palantir-mini: harness-sprint-chain-suggest — unvisited ratio ${(ratio * 100).toFixed(1)}% ≤ 5% threshold; no advisory needed`,
      decision: "continue",
    };
  }

  // Build advisory payload
  const suggestedNextSprintBrief = buildSuggestedBrief(
    unvisited,
    contract.contractId,
    contract.sprintNumber,
  );

  const reasoning =
    `Sprint-chain-suggest (canonical plan v2 §4 row 5.16): ${unvisited.length} of ${targetRids.length} ` +
    `target RIDs (${(ratio * 100).toFixed(1)}%) were not referenced in events.jsonl since sprint_contract_bound ` +
    `(contract=${contract.contractId ?? "unknown"}). Emitting follow-up sprint advisory for Lead next-sprint scoping.`;

  // Payload carries advisory fields beyond the strict ValidationPhaseCompleted schema;
  // cast to unknown first then to the expected union type — emit() serialises as JSON.
  const advisoryPayload = {
    passed: false,
    errorClass: "harness_sprint_chain_suggestion",
    unvisited,
    totalScope: targetRids.length,
    visitedCount: visitedSet.size,
    unvisitedRatio: ratio,
    suggestedNextSprintBrief,
    contractId: contract.contractId,
    contractPath,
    agentName,
  } as unknown as import("../lib/event-log/types").EventEnvelope["payload"];

  try {
    await emit({
      type: "validation_phase_completed",
      payload: advisoryPayload,
      toolName: "SubagentStop",
      cwd,
      sessionId: p.session_id,
      identity: "claude-code",
      reasoning,
      agentName,
    });
  } catch (e) {
    // best-effort emit; never block on failure
    return {
      message: `palantir-mini: harness-sprint-chain-suggest — emit failed: ${(e as Error).message}`,
      decision: "continue",
    };
  }

  const summary = `${unvisited.length}/${targetRids.length} RIDs unvisited (${(ratio * 100).toFixed(1)}%).`;
  return {
    message: `palantir-mini: harness-sprint-chain-suggest — advisory emitted. ${summary}`,
    decision: "continue",
    additionalContext: `NEXT SPRINT SUGGESTION: ${suggestedNextSprintBrief}`,
  };
}
