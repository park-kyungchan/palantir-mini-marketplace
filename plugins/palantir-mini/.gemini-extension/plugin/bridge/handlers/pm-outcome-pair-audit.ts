// palantir-mini v4.1.0 — MCP tool handler: pm_outcome_pair_audit
// Domain: LEARN (rule 26 §Axis B1 — outcome-pair lifecycle audit)
//
// Reads <project>/.palantir-mini/session/outcome-pairs/*.json markers
// (written by outcome-pair-tracker hook) + classifies each via
// pairingState() → returns aggregate metrics: total / open / closed /
// orphaned + orphan ratio + average latency + list of orphaned RIDs.
//
// Authority: ~/.claude/rules/26-valuable-data-standard.md §Axis B1
//            ~/.claude/schemas/ontology/primitives/outcome-pairing.ts
//            ~/.claude/plans/quiet-fluttering-garden.md §Phase 3.2

import * as fs from "fs";
import * as path from "path";
import {
  pairingState,
  type OutcomePairingDeclaration,
  type OutcomePairingRid,
  type OutcomePairingState,
} from "#schemas/ontology/primitives/outcome-pairing";

interface PmOutcomePairAuditArgs {
  project:            string;
  orphanThresholdMs?: number;
}

interface PmOutcomePairAuditResult {
  totalPairs:    number;
  openPairs:     number;
  closedPairs:   number;
  orphanedPairs: number;
  orphanRatio:   number;
  avgLatencyMs:  number;
  orphanedRids:  OutcomePairingRid[];
  perState:      Record<OutcomePairingState, number>;
}

const DEFAULT_ORPHAN_THRESHOLD_MS = 30 * 60 * 1000; // 30 min

export default async function pmOutcomePairAudit(
  rawArgs: unknown,
): Promise<PmOutcomePairAuditResult> {
  const args = (rawArgs ?? {}) as PmOutcomePairAuditArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("pm_outcome_pair_audit: `project` is required");
  }
  const orphanThresholdMs = args.orphanThresholdMs ?? DEFAULT_ORPHAN_THRESHOLD_MS;

  const dir = path.join(args.project, ".palantir-mini", "session", "outcome-pairs");
  if (!fs.existsSync(dir)) {
    return {
      totalPairs: 0,
      openPairs: 0,
      closedPairs: 0,
      orphanedPairs: 0,
      orphanRatio: 0,
      avgLatencyMs: 0,
      orphanedRids: [],
      perState: { open: 0, closed: 0, orphaned: 0 },
    };
  }

  const nowMs = Date.now();
  let totalPairs = 0;
  const perState: Record<OutcomePairingState, number> = { open: 0, closed: 0, orphaned: 0 };
  const orphanedRids: OutcomePairingRid[] = [];
  let totalLatencyMs = 0;
  let latencyCount = 0;

  const entries = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const f of entries) {
    let decl: OutcomePairingDeclaration;
    try {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      decl = JSON.parse(raw) as OutcomePairingDeclaration;
    } catch {
      continue;
    }
    totalPairs += 1;
    const state = pairingState(decl, orphanThresholdMs, nowMs);
    perState[state] += 1;
    if (state === "orphaned") {
      orphanedRids.push(decl.pairingId);
    }
    if (decl.deltaMetrics?.latencyMs !== undefined) {
      totalLatencyMs += decl.deltaMetrics.latencyMs;
      latencyCount += 1;
    } else if (decl.closedAt && decl.createdAt) {
      const dt = Date.parse(decl.closedAt) - Date.parse(decl.createdAt);
      if (Number.isFinite(dt) && dt >= 0) {
        totalLatencyMs += dt;
        latencyCount += 1;
      }
    }
  }

  const orphanRatio = totalPairs > 0 ? perState.orphaned / totalPairs : 0;
  const avgLatencyMs = latencyCount > 0 ? totalLatencyMs / latencyCount : 0;

  return {
    totalPairs,
    openPairs: perState.open,
    closedPairs: perState.closed,
    orphanedPairs: perState.orphaned,
    orphanRatio,
    avgLatencyMs,
    orphanedRids,
    perState,
  };
}
