// palantir-mini v6.35.0 — harness-sprint-chain-suggest hook tests
// Coverage: no active sprint, 100% visited, below threshold, above threshold, agent filter.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import harnessSprintChainSuggest, {
  findActiveContract,
  collectTargetRids,
  findSprintBoundTime,
  computeVisitedRids,
  buildSuggestedBrief,
} from "../../hooks/harness-sprint-chain-suggest";

let TMP: string;
let savedEventsFile: string | undefined;

function makeSprintDir(
  root: string,
  sprintName: string,
  contract: object,
  ageMins: number = 5,
): string {
  const sprintDir = path.join(root, ".palantir-mini", "harness", "sprints", sprintName);
  fs.mkdirSync(sprintDir, { recursive: true });
  const contractPath = path.join(sprintDir, "contract.json");
  fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));
  // Adjust mtime to simulate age (make it fresh by default)
  const mtime = new Date(Date.now() - ageMins * 60 * 1000);
  fs.utimesSync(contractPath, mtime, mtime);
  return sprintDir;
}

function makeEventsJsonl(root: string, lines: string[]): string {
  const dir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(dir, { recursive: true });
  const eventsPath = path.join(dir, "events.jsonl");
  const normalizedLines = lines.map((line, idx) => {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      return JSON.stringify({
        when: new Date().toISOString(),
        atopWhich: { commitSha: "test" },
        throughWhich: { sessionId: "test-session", toolName: "test", cwd: root },
        byWhom: { agentName: "test", identity: "claude-code" },
        sequence: idx + 1,
        ...parsed,
      });
    } catch {
      return line;
    }
  });
  fs.writeFileSync(eventsPath, normalizedLines.join("\n") + (lines.length > 0 ? "\n" : ""));
  return eventsPath;
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sprint-chain-suggest-"));
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
  savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
});

afterEach(() => {
  if (savedEventsFile !== undefined) {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
  } else {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ── Unit helpers ─────────────────────────────────────────────────────────────

describe("collectTargetRids", () => {
  test("empty contract returns empty array", () => {
    expect(collectTargetRids({})).toEqual([]);
  });

  test("collects successCriteriaRids", () => {
    const rids = collectTargetRids({ successCriteriaRids: ["crit-a", "crit-b"] });
    expect(rids).toContain("crit-a");
    expect(rids).toContain("crit-b");
  });

  test("collects inputs[].featureId", () => {
    const rids = collectTargetRids({
      inputs: [{ featureId: "F-001" }, { featureId: "F-002" }],
    });
    expect(rids).toContain("F-001");
    expect(rids).toContain("F-002");
  });

  test("collects inputs[].scopePaths", () => {
    const rids = collectTargetRids({
      inputs: [{ scopePaths: ["src/hooks/foo.ts", "src/lib/bar.ts"] }],
    });
    expect(rids).toContain("src/hooks/foo.ts");
    expect(rids).toContain("src/lib/bar.ts");
  });

  test("deduplicates RIDs appearing in multiple sources", () => {
    const rids = collectTargetRids({
      successCriteriaRids: ["crit-a"],
      inputs: [{ featureId: "crit-a" }],
    });
    expect(rids.filter((r) => r === "crit-a").length).toBe(1);
  });
});

describe("findActiveContract", () => {
  test("returns null when no sprints directory", () => {
    expect(findActiveContract(TMP)).toBeNull();
  });

  test("returns null when sprint contract is older than 60min", () => {
    makeSprintDir(TMP, "sprint-001", { contractId: "old-contract" }, 65); // 65 min old
    expect(findActiveContract(TMP)).toBeNull();
  });

  test("returns contract when within 60min", () => {
    makeSprintDir(TMP, "sprint-001", { contractId: "recent-contract", sprintNumber: 1 }, 10);
    const hit = findActiveContract(TMP);
    expect(hit).not.toBeNull();
    expect(hit!.contract.contractId).toBe("recent-contract");
  });

  test("returns most recently modified contract when multiple exist", () => {
    makeSprintDir(TMP, "sprint-001", { contractId: "older" }, 30);
    // Small delay to ensure different mtime
    makeSprintDir(TMP, "sprint-002", { contractId: "newer" }, 5);
    const hit = findActiveContract(TMP);
    expect(hit!.contract.contractId).toBe("newer");
  });
});

describe("computeVisitedRids", () => {
  test("returns empty set when events.jsonl does not exist", () => {
    const visited = computeVisitedRids(
      path.join(TMP, "nonexistent.jsonl"),
      new Set(["crit-a"]),
      0,
    );
    expect(visited.size).toBe(0);
  });

  test("marks RID as visited when in payload.featureId", () => {
    const eventsPath = makeEventsJsonl(TMP, [
      JSON.stringify({
        type: "edit_committed",
        when: new Date().toISOString(),
        payload: { featureId: "F-001" },
        sequence: 1,
      }),
    ]);
    const visited = computeVisitedRids(eventsPath, new Set(["F-001", "F-002"]), 0);
    expect(visited.has("F-001")).toBe(true);
    expect(visited.has("F-002")).toBe(false);
  });

  test("marks RID as visited when in lineageRefs.actionRid", () => {
    const eventsPath = makeEventsJsonl(TMP, [
      JSON.stringify({
        type: "some_event",
        when: new Date().toISOString(),
        lineageRefs: { actionRid: "crit-x" },
        payload: {},
        sequence: 1,
      }),
    ]);
    const visited = computeVisitedRids(eventsPath, new Set(["crit-x"]), 0);
    expect(visited.has("crit-x")).toBe(true);
  });

  test("ignores events before boundAtMs", () => {
    const past = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const eventsPath = makeEventsJsonl(TMP, [
      JSON.stringify({
        type: "edit_committed",
        when: past,
        payload: { featureId: "F-001" },
        sequence: 1,
      }),
    ]);
    const boundAt = Date.now() - 3600 * 1000; // 1 hour ago (event is 2h ago)
    const visited = computeVisitedRids(eventsPath, new Set(["F-001"]), boundAt);
    expect(visited.has("F-001")).toBe(false);
  });
});

describe("buildSuggestedBrief", () => {
  test("includes RID count and contract reference", () => {
    const brief = buildSuggestedBrief(["crit-a", "crit-b"], "sprint-001-quick", 1);
    expect(brief).toContain("2 unvisited RIDs");
    expect(brief).toContain("sprint-001-quick");
    expect(brief).toContain("crit-a");
  });

  test("truncates to 10 RIDs with overflow indicator", () => {
    const manyRids = Array.from({ length: 15 }, (_, i) => `crit-${i}`);
    const brief = buildSuggestedBrief(manyRids, "sprint-001", 1);
    expect(brief).toContain("+5 more");
  });

  test("singular 'RID' when exactly 1 unvisited", () => {
    const brief = buildSuggestedBrief(["crit-a"], "sprint-001", 1);
    expect(brief).toContain("1 unvisited RID ");
  });
});

// ── Integration (default export) ─────────────────────────────────────────────

describe("harnessSprintChainSuggest integration", () => {
  test("no-op when agent_name not in target list", async () => {
    const result = await harnessSprintChainSuggest({ cwd: TMP, agent_name: "unknown-agent" });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("not in target list");
  });

  test("no-op when no active sprint contract", async () => {
    const result = await harnessSprintChainSuggest({ cwd: TMP, agent_name: "harness-generator" });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("no active sprint contract");
  });

  test("no advisory when 100% of RIDs are visited", async () => {
    const contractId = "sprint-100-quick";
    makeSprintDir(TMP, "sprint-100-quick", {
      contractId,
      sprintNumber: 100,
      successCriteriaRids: ["crit-a", "crit-b"],
    });
    const boundTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    makeEventsJsonl(TMP, [
      JSON.stringify({
        type: "sprint_contract_bound",
        when: boundTime,
        payload: { contractId },
        sequence: 1,
      }),
      JSON.stringify({
        type: "edit_committed",
        when: new Date().toISOString(),
        payload: { featureId: "crit-a" },
        sequence: 2,
      }),
      JSON.stringify({
        type: "edit_committed",
        when: new Date().toISOString(),
        payload: { featureId: "crit-b" },
        sequence: 3,
      }),
    ]);

    const result = await harnessSprintChainSuggest({
      cwd: TMP,
      agent_name: "harness-generator",
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("no advisory needed");
  });

  test("no advisory when unvisited ratio is at or below 4% (below 5% threshold)", async () => {
    // 25 RIDs total; 1 unvisited = 4% — below 5% threshold
    const rids = Array.from({ length: 25 }, (_, i) => `crit-${i}`);
    const contractId = "sprint-101-quick";
    makeSprintDir(TMP, "sprint-101-quick", {
      contractId,
      sprintNumber: 101,
      successCriteriaRids: rids,
    });
    const boundTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    // Mark 24 out of 25 as visited (leave crit-24 unvisited)
    const eventLines = [
      JSON.stringify({
        type: "sprint_contract_bound",
        when: boundTime,
        payload: { contractId },
        sequence: 1,
      }),
      ...rids.slice(0, 24).map((rid, i) =>
        JSON.stringify({
          type: "edit_committed",
          when: new Date().toISOString(),
          payload: { featureId: rid },
          sequence: i + 2,
        }),
      ),
    ];
    makeEventsJsonl(TMP, eventLines);

    const result = await harnessSprintChainSuggest({
      cwd: TMP,
      agent_name: "harness-generator",
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("no advisory needed");
  });

  test("emits advisory with suggestedNextSprintBrief when >5% unvisited", async () => {
    // 10 RIDs total; 5 unvisited = 50% — well above threshold
    const allRids = Array.from({ length: 10 }, (_, i) => `feat-${i}`);
    const contractId = "sprint-102-full";
    makeSprintDir(TMP, "sprint-102-full", {
      contractId,
      sprintNumber: 102,
      successCriteriaRids: allRids,
    });
    const boundTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    // Only visit the first 5 RIDs
    const eventLines = [
      JSON.stringify({
        type: "sprint_contract_bound",
        when: boundTime,
        payload: { contractId },
        sequence: 1,
      }),
      ...allRids.slice(0, 5).map((rid, i) =>
        JSON.stringify({
          type: "edit_committed",
          when: new Date().toISOString(),
          payload: { featureId: rid },
          sequence: i + 2,
        }),
      ),
    ];
    makeEventsJsonl(TMP, eventLines);

    const result = await harnessSprintChainSuggest({
      cwd: TMP,
      agent_name: "project-implementer",
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("advisory emitted");
    expect(result.additionalContext).toContain("NEXT SPRINT SUGGESTION");
    expect(result.additionalContext).toContain("unvisited RIDs");
    expect(result.additionalContext).toContain("sprint-102-full");
  });

  test("no-op for implementer agent name not in target list edge-case (e.g. random-agent)", async () => {
    makeSprintDir(TMP, "sprint-103-quick", {
      contractId: "sprint-103",
      successCriteriaRids: ["crit-a"],
    });
    const result = await harnessSprintChainSuggest({
      cwd: TMP,
      agent_name: "random-agent",
    });
    expect(result.message).toContain("not in target list");
  });
});
