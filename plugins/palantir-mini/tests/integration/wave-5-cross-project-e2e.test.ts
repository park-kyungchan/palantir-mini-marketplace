// palantir-mini v3.10.0 — CT-2 Wave 5 cross-project lineage integration e2e
//
// Per ~/.claude/plans/2026-04-29-harness-base-mode-closing-tasks.md §1 CT-2
// + ~/.claude/plans/streamed-forging-kettle.md (approved 2026-04-29).
//
// The existing tests/bridge/handlers/pm-workflow-lineage-query.test.ts (11
// unit tests) covers single-axis filters + 2-project merge + executionGraph
// edges + truncated handling at unit granularity. CT-2 adds 3 holistic
// integration scenarios that the unit tests don't reach:
//
//   1. Hybrid registered+discovered path with 3 realistic projects (mixed
//      registry membership + multi-session + multi-identity envelopes).
//   2. Multi-axis filter composition (whenRange ∩ byWhom ∩ eventTypes).
//   3. Caller-vs-discovered events.jsonl routing of project_auto_discovered
//      advisory event (no pollution invariant per Plan agent §5).
//
// Anti-scope: NO consumer-project file reads. Plugin-internal tmpdir only.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import pmWorkflowLineageQuery from "../../bridge/handlers/pm-workflow-lineage-query";

interface SeedEvent {
  when:      string;
  sequence:  number;
  type:      string;
  payload?:  unknown;
  reasoning?: string;
  sessionId?: string;
  identity?:  "claude-code" | "monitor" | "user" | "test-agent";
}

function makeProjectWithEvents(
  projectsRoot: string,
  projectName: string,
  events: SeedEvent[],
): string {
  const projectPath = path.join(projectsRoot, projectName);
  const sessionDir = path.join(projectPath, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });
  const eventsPath = path.join(sessionDir, "events.jsonl");
  const lines = events.map((e) =>
    JSON.stringify({
      eventId: `evt-${projectName}-${e.sequence}`,
      when: e.when,
      atopWhich: "no-git",
      throughWhich: { sessionId: e.sessionId ?? "session-default", toolName: "test", cwd: projectPath },
      byWhom: { identity: e.identity ?? "claude-code" },
      withWhat: e.reasoning ? { reasoning: e.reasoning } : undefined,
      sequence: e.sequence,
      type: e.type,
      payload: e.payload ?? {},
    }),
  );
  fs.writeFileSync(eventsPath, lines.join("\n") + "\n");
  return projectPath;
}

function writeRegistry(registryPath: string, projectPaths: string[]): void {
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  const registrations = projectPaths.map((p) => ({
    rid: `rid:project:${path.basename(p)}`,
    projectPath: p,
    peerDepPin: ">=1.30.0 <2.0.0",
    label: path.basename(p),
    registeredAt: "2026-04-29T00:00:00Z",
  }));
  fs.writeFileSync(registryPath, JSON.stringify({ registrations }, null, 2));
}

let TMP_HOME: string;
let TMP_PROJECTS_ROOT: string;
let savedRegistry: string | undefined;
let savedProjectsRoot: string | undefined;
let savedEventsFile: string | undefined;
let savedEventsFileForce: string | undefined;

beforeEach(() => {
  TMP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "pm-w5-e2e-home-"));
  TMP_PROJECTS_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "pm-w5-e2e-projects-"));
  savedRegistry = process.env.PALANTIR_MINI_REGISTRY;
  savedProjectsRoot = process.env.PALANTIR_MINI_PROJECTS_ROOT;
  savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEventsFileForce = process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
  process.env.PALANTIR_MINI_REGISTRY = path.join(TMP_HOME, "registered-projects.json");
  process.env.PALANTIR_MINI_PROJECTS_ROOT = TMP_PROJECTS_ROOT;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
});

afterEach(() => {
  if (savedRegistry !== undefined) process.env.PALANTIR_MINI_REGISTRY = savedRegistry;
  else delete process.env.PALANTIR_MINI_REGISTRY;
  if (savedProjectsRoot !== undefined) process.env.PALANTIR_MINI_PROJECTS_ROOT = savedProjectsRoot;
  else delete process.env.PALANTIR_MINI_PROJECTS_ROOT;
  if (savedEventsFile !== undefined) process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
  else delete process.env.PALANTIR_MINI_EVENTS_FILE;
  if (savedEventsFileForce !== undefined) process.env.PALANTIR_MINI_EVENTS_FILE_FORCE = savedEventsFileForce;
  else delete process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
  if (TMP_HOME && fs.existsSync(TMP_HOME)) fs.rmSync(TMP_HOME, { recursive: true, force: true });
  if (TMP_PROJECTS_ROOT && fs.existsSync(TMP_PROJECTS_ROOT)) {
    fs.rmSync(TMP_PROJECTS_ROOT, { recursive: true, force: true });
  }
});

/** Seed for 3 projects: 7 events each for proj-a + proj-b, 7 for proj-c.
 *  Each project has 2 distinct sessions + 2 distinct identities + 3 event types. */
function seedThreeProjects(): { pathA: string; pathB: string; pathC: string; totalEvents: number } {
  const pathA = makeProjectWithEvents(TMP_PROJECTS_ROOT, "proj-a", [
    { when: "2026-04-27T09:00:00Z", sequence: 1, type: "session_started", sessionId: "sa1", identity: "claude-code" },
    { when: "2026-04-27T09:05:00Z", sequence: 2, type: "edit_committed", sessionId: "sa1", identity: "claude-code", payload: { actionTypeRid: "x", appliedEdits: [], submissionCriteriaPassed: [] } },
    { when: "2026-04-28T10:00:00Z", sequence: 3, type: "validation_phase_completed", sessionId: "sa1", identity: "claude-code", reasoning: "harness_gate_passed dryRunRef=aaaa1111bbbb2222" },
    { when: "2026-04-28T11:00:00Z", sequence: 4, type: "session_started", sessionId: "sa2", identity: "monitor" },
    { when: "2026-04-29T08:00:00Z", sequence: 5, type: "validation_phase_completed", sessionId: "sa2", identity: "monitor", reasoning: "drift_check" },
    { when: "2026-04-29T09:00:00Z", sequence: 6, type: "edit_committed", sessionId: "sa2", identity: "claude-code", payload: { actionTypeRid: "y", appliedEdits: [], submissionCriteriaPassed: [] } },
    { when: "2026-04-29T10:00:00Z", sequence: 7, type: "session_started", sessionId: "sa2", identity: "claude-code" },
  ]);
  const pathB = makeProjectWithEvents(TMP_PROJECTS_ROOT, "proj-b", [
    { when: "2026-04-27T15:00:00Z", sequence: 1, type: "session_started", sessionId: "sb1", identity: "claude-code" },
    { when: "2026-04-28T09:00:00Z", sequence: 2, type: "edit_committed", sessionId: "sb1", identity: "claude-code", payload: { actionTypeRid: "z", appliedEdits: [], submissionCriteriaPassed: [] } },
    { when: "2026-04-28T13:00:00Z", sequence: 3, type: "validation_phase_completed", sessionId: "sb1", identity: "claude-code", reasoning: "dry-run-graded dryRunRef=aaaa1111bbbb2222 verdict=pass" },
    { when: "2026-04-28T14:00:00Z", sequence: 4, type: "session_started", sessionId: "sb2", identity: "monitor" },
    { when: "2026-04-29T07:00:00Z", sequence: 5, type: "validation_phase_completed", sessionId: "sb2", identity: "monitor", reasoning: "harness_bypass_invoked" },
    { when: "2026-04-29T08:30:00Z", sequence: 6, type: "edit_committed", sessionId: "sb2", identity: "claude-code", payload: { actionTypeRid: "w", appliedEdits: [], submissionCriteriaPassed: [] } },
    { when: "2026-04-29T11:00:00Z", sequence: 7, type: "session_started", sessionId: "sb2", identity: "claude-code" },
  ]);
  const pathC = makeProjectWithEvents(TMP_PROJECTS_ROOT, "proj-c", [
    { when: "2026-04-26T08:00:00Z", sequence: 1, type: "session_started", sessionId: "sc1", identity: "claude-code" },
    { when: "2026-04-27T08:00:00Z", sequence: 2, type: "edit_committed", sessionId: "sc1", identity: "claude-code", payload: { actionTypeRid: "q", appliedEdits: [], submissionCriteriaPassed: [] } },
    { when: "2026-04-28T08:00:00Z", sequence: 3, type: "validation_phase_completed", sessionId: "sc1", identity: "monitor", reasoning: "harness_gate_passed" },
    { when: "2026-04-29T06:00:00Z", sequence: 4, type: "session_started", sessionId: "sc2", identity: "monitor" },
    { when: "2026-04-29T06:30:00Z", sequence: 5, type: "edit_committed", sessionId: "sc2", identity: "claude-code", payload: { actionTypeRid: "r", appliedEdits: [], submissionCriteriaPassed: [] } },
    { when: "2026-04-29T07:00:00Z", sequence: 6, type: "validation_phase_completed", sessionId: "sc2", identity: "claude-code", reasoning: "dry-run-computed" },
    { when: "2026-04-29T12:00:00Z", sequence: 7, type: "session_started", sessionId: "sc2", identity: "claude-code" },
  ]);
  return { pathA, pathB, pathC, totalEvents: 21 };
}

// ─── Scenarios ───────────────────────────────────────────────────────────────

describe("CT-2 Wave 5 — cross-project lineage integration", () => {
  test("hybrid registered+discovered: 3 projects, registry has 2, fs walk finds 1 unregistered", async () => {
    const { pathA, pathB, pathC, totalEvents } = seedThreeProjects();

    // Registry has only proj-a + proj-b. proj-c is discovered via fs walk.
    writeRegistry(process.env.PALANTIR_MINI_REGISTRY!, [pathA, pathB]);

    const result = await pmWorkflowLineageQuery({});

    // All 3 projects' events merged
    expect(result.events.length).toBe(totalEvents);

    // discovered list contains only proj-c
    expect(result.discovered).toEqual([pathC]);

    // perProjectCounts populated for all 3
    expect(result.perProjectCounts[pathA]).toBe(7);
    expect(result.perProjectCounts[pathB]).toBe(7);
    expect(result.perProjectCounts[pathC]).toBe(7);

    // Events sorted by (when, sequence) ASC — first event is the earliest
    expect(result.events[0]?.when).toBe("2026-04-26T08:00:00Z");
    expect(result.events[0]?.__sourceProject).toBe(pathC);
    // Last event is the latest by ISO string
    expect(result.events[result.events.length - 1]?.when).toBe("2026-04-29T12:00:00Z");

    // Monotonic non-decreasing on `when`
    for (let i = 1; i < result.events.length; i++) {
      expect(result.events[i]!.when >= result.events[i - 1]!.when).toBe(true);
    }

    // executionGraph: 1 node per filtered event
    expect(result.executionGraph.nodes.length).toBe(totalEvents);

    // follows edges: each project has 2 sessions, each with 3-4 events.
    // Counting (n-1) follows per session = (3 sessions for proj-a-sa1 has 3 events
    // → 2 edges; sa2 has 4 events → 3 edges; same shape for B + C). Concretely:
    // proj-a: sa1(3 events → 2 follows) + sa2(4 events → 3 follows) = 5
    // proj-b: same shape = 5
    // proj-c: sc1(3 events → 2 follows) + sc2(4 events → 3 follows) = 5
    // total = 15 follows edges
    const followsEdges = result.executionGraph.edges.filter((e) => e.relation === "follows");
    expect(followsEdges.length).toBe(15);

    // cited edges: dryRunRef=aaaa1111bbbb2222 appears in proj-a seq=3 + proj-b seq=3
    // Cross-project citation creates 1 cited edge.
    const citedEdges = result.executionGraph.edges.filter((e) => e.relation === "cited");
    expect(citedEdges.length).toBeGreaterThanOrEqual(1);
  });

  test("multi-filter composition: whenRange ∩ byWhom ∩ eventTypes returns the 3-axis intersection", async () => {
    const { pathA, pathB, pathC } = seedThreeProjects();
    writeRegistry(process.env.PALANTIR_MINI_REGISTRY!, [pathA, pathB, pathC]);

    const result = await pmWorkflowLineageQuery({
      filter: {
        whenRange: { from: "2026-04-28T00:00:00Z", to: "2026-04-29T23:59:59Z" },
        byWhom: { identity: "claude-code" },
        eventTypes: ["edit_committed", "validation_phase_completed"],
      },
    });

    // Hand-counted intersection (when in [04-28,04-29] AND identity=claude-code AND
    // type in {edit_committed, validation_phase_completed}):
    //   proj-a: seq=3 (validation_phase_completed, claude-code, 04-28) ✓
    //           seq=6 (edit_committed, claude-code, 04-29) ✓
    //   proj-b: seq=2 (edit_committed, claude-code, 04-28) ✓
    //           seq=3 (validation_phase_completed, claude-code, 04-28) ✓
    //           seq=6 (edit_committed, claude-code, 04-29) ✓
    //   proj-c: seq=5 (edit_committed, claude-code, 04-29) ✓
    //           seq=6 (validation_phase_completed, claude-code, 04-29) ✓
    // = 7 events
    expect(result.events.length).toBe(7);

    // All filtered events must satisfy all three predicates
    for (const ev of result.events) {
      expect(ev.when >= "2026-04-28T00:00:00Z").toBe(true);
      expect(ev.when <= "2026-04-29T23:59:59Z").toBe(true);
      expect(ev.byWhom.identity).toBe("claude-code");
      expect(["edit_committed", "validation_phase_completed"]).toContain(ev.type);
    }

    // executionGraph reflects the FILTERED set (1 node per filtered event)
    expect(result.executionGraph.nodes.length).toBe(7);

    // discovered should be empty since registry now has all 3
    expect(result.discovered).toEqual([]);
  });

  test("project_auto_discovered advisory lands on caller's events.jsonl, NOT discovered project's", async () => {
    const { pathA, pathB, pathC } = seedThreeProjects();
    writeRegistry(process.env.PALANTIR_MINI_REGISTRY!, [pathA, pathB]);

    // Caller-side events.jsonl override (simulates handler's process.cwd events file)
    const callerEventsDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-w5-caller-"));
    const callerEventsPath = path.join(callerEventsDir, "events.jsonl");
    process.env.PALANTIR_MINI_EVENTS_FILE = callerEventsPath;
    process.env.PALANTIR_MINI_EVENTS_FILE_FORCE = "1";

    try {
      const result = await pmWorkflowLineageQuery({});
      expect(result.discovered).toContain(pathC);

      // Caller's events.jsonl must contain the project_auto_discovered advisory
      expect(fs.existsSync(callerEventsPath)).toBe(true);
      const callerEvents = fs
        .readFileSync(callerEventsPath, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
      const advisory = callerEvents.find(
        (e) =>
          e.type === "phase_completed" &&
          e.payload?.phaseTag === "project_auto_discovered",
      );
      expect(advisory).toBeDefined();
      expect(advisory.withWhat?.reasoning).toContain(pathC);

      // The discovered project (proj-c) MUST NOT have the advisory in its
      // own events.jsonl — read/write separation invariant per Plan agent §5.
      const projCEventsPath = path.join(pathC, ".palantir-mini", "session", "events.jsonl");
      const projCEvents = fs
        .readFileSync(projCEventsPath, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
      const pollutedAdvisory = projCEvents.find(
        (e) =>
          e.type === "phase_completed" &&
          e.payload?.phaseTag === "project_auto_discovered",
      );
      expect(pollutedAdvisory).toBeUndefined();
    } finally {
      fs.rmSync(callerEventsDir, { recursive: true, force: true });
    }
  });
});
