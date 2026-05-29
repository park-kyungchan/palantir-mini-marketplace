// palantir-mini v6.80.0 — pm_outcome_pair_audit orphan detail tests

import { describe, expect, test, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import pmOutcomePairAudit from "../../../bridge/handlers/pm-outcome-pair-audit";

const tmpDirs: string[] = [];

function makeTmpProject(): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-outcome-pair-audit-"));
  tmpDirs.push(project);
  fs.mkdirSync(path.join(project, ".palantir-mini", "session", "outcome-pairs"), {
    recursive: true,
  });
  return project;
}

function pairsDir(project: string): string {
  return path.join(project, ".palantir-mini", "session", "outcome-pairs");
}

function writePair(project: string, pairingId: string, decl: Record<string, unknown>): void {
  fs.writeFileSync(
    path.join(pairsDir(project), `${pairingId}.json`),
    JSON.stringify({ pairingId, ...decl }, null, 2),
    "utf8",
  );
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("pm_outcome_pair_audit orphan details", () => {
  test("empty project returns zeroed orphan detail fields", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-outcome-pair-empty-"));
    tmpDirs.push(project);

    const result = await pmOutcomePairAudit({ project }) as unknown as Record<string, unknown>;

    expect(result.orphanedByScenario).toEqual({});
    expect(result.orphanedDetails).toEqual([]);
  });

  test("reports scenario counts and path-preserving details for orphaned pairs", async () => {
    const project = makeTmpProject();
    const old = "2026-05-29T00:00:00.000Z";
    const closed = "2026-05-29T00:10:00.000Z";

    writePair(project, "pair-agent", {
      actionRid: "evt-agent",
      scenario: "agent_start",
      baselineOutcome: { verdict: "unknown", score: -1, capturedAt: old },
      evidence: { actionRid: "evt-agent" },
      createdAt: old,
    });
    writePair(project, "pair-edit", {
      actionRid: "evt-edit",
      scenario: "edit_proposed",
      baselineOutcome: { verdict: "pass", score: 1, capturedAt: old },
      evidence: { actionRid: "evt-edit" },
      createdAt: old,
    });
    writePair(project, "pair-closed", {
      actionRid: "evt-closed",
      scenario: "agent_start",
      baselineOutcome: { verdict: "unknown", score: -1, capturedAt: old },
      refinedOutcome: { verdict: "pass", score: 1, capturedAt: closed },
      evidence: { actionRid: "evt-closed" },
      createdAt: old,
      closedAt: closed,
    });

    const result = await pmOutcomePairAudit({
      project,
      orphanThresholdMs: 1,
    }) as {
      orphanedPairs: number;
      orphanedByScenario: Record<string, number>;
      orphanedDetails: Array<{
        pairingId: string;
        filePath: string;
        actionRid?: string;
        scenario: string;
        retentionDecision: string;
        reason: string;
      }>;
    };

    expect(result.orphanedPairs).toBe(2);
    expect(result.orphanedByScenario).toEqual({
      agent_start: 1,
      edit_proposed: 1,
    });
    expect(result.orphanedDetails).toHaveLength(2);
    expect(result.orphanedDetails.map((detail) => detail.pairingId)).toEqual([
      "pair-agent",
      "pair-edit",
    ]);
    expect(result.orphanedDetails[0]!.filePath).toBe(
      path.join(pairsDir(project), "pair-agent.json"),
    );
    expect(result.orphanedDetails[0]!.actionRid).toBe("evt-agent");
    expect(result.orphanedDetails[0]!.retentionDecision).toBe("retain-until-reconciled");
    expect(result.orphanedDetails[0]!.reason).toBe("missing_refined_outcome_or_closed_at");
  });

  test("maxOrphanDetails limits detail rows but keeps aggregate counts", async () => {
    const project = makeTmpProject();
    const old = "2026-05-29T00:00:00.000Z";
    for (const id of ["pair-a", "pair-b", "pair-c"]) {
      writePair(project, id, {
        actionRid: `evt-${id}`,
        scenario: "agent_start",
        baselineOutcome: { verdict: "unknown", score: -1, capturedAt: old },
        evidence: { actionRid: `evt-${id}` },
        createdAt: old,
      });
    }

    const result = await pmOutcomePairAudit({
      project,
      orphanThresholdMs: 1,
      maxOrphanDetails: 2,
    }) as { orphanedPairs: number; orphanedDetails: unknown[] };

    expect(result.orphanedPairs).toBe(3);
    expect(result.orphanedDetails).toHaveLength(2);
  });
});
