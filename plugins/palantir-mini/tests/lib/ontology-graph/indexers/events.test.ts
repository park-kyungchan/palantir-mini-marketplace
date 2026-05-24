/**
 * tests/lib/ontology-graph/indexers/events.test.ts
 * Tests for indexEventsT2Plus (events.ts — PR 2.12 sprint-089).
 * Uses real fs.promises fixture writes under os.tmpdir() — no fs mocking.
 * Passes nowIso: "2026-05-13T00:00:00Z" for deterministic lastIndexed timestamps.
 * Sprint X3 PR 2/5.
 *
 * NOTE on rule 10: tests author a fixture events.jsonl file under os.tmpdir()
 * which is NOT any real project's `<projectRoot>/.palantir-mini/session/events.jsonl`.
 * The indexer-under-test reads (not writes) the fixture; the indexer itself
 * never writes to events.jsonl. Rule 10 append-only invariant preserved.
 */

import { describe, expect, test, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { indexEventsT2Plus } from "../../../../lib/ontology-graph/indexers/events";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** Creates a temp directory for a test fixture and returns its path. */
async function makeTmpDir(prefix: string): Promise<string> {
  const base = path.join(os.tmpdir(), `events-indexer-test-${prefix}-${Date.now()}`);
  await fs.promises.mkdir(base, { recursive: true });
  return base;
}

/** Writes a file at an absolute path, creating parent dirs as needed. */
async function writeFile(absPath: string, content: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
  await fs.promises.writeFile(absPath, content, "utf-8");
}

/** Deletes a temp directory after the test. */
async function rmDir(dir: string): Promise<void> {
  await fs.promises.rm(dir, { recursive: true, force: true });
}

const NOW_ISO = "2026-05-13T00:00:00Z";

// ─── Fixture cleanup registry ─────────────────────────────────────────────────

const tmpDirs: string[] = [];

afterAll(async () => {
  await Promise.all(tmpDirs.map((d) => rmDir(d)));
});

// ─── Test 1: Headline fixture walk + valueGrade filter + emits edges ──────────
//
// Create a fixture events.jsonl with 5 NDJSON lines:
//   line 1 — T0 (rejected; must NOT emit)
//   line 2 — T1 (Workflow-Lineage noise; must NOT emit)
//   line 3 — T2 with byWhom.agentName: "implementer" (named agent → confidence 1.0)
//   line 4 — T3 with only byWhom.identity: "claude-code" (identity-only → confidence 0.5)
//   line 5 — T4 with full join-key spread (correlationId, evalSuiteId, payload.affectedRid)
//
// Assert:
//   exactly 3 Event nodes (lines 3, 4, 5)
//   T0/T1 dropped
//   line 3 node payload.agentId === "implementer"
//   line 5 node populates correlationId / evalSuiteId / affectedRid from payload
//   exactly 3 emits edges (one per surviving Event with byWhom shape)
//   line 3 edge confidence === 1.0; line 4 edge confidence === 0.5

describe("indexEventsT2Plus", () => {
  test(
    "walks a fixture events.jsonl and emits T2+ Event nodes plus emits edges",
    async () => {
      const tmpDir = await makeTmpDir("headline");
      tmpDirs.push(tmpDir);

      const projectRoot = path.join(tmpDir, "projectRoot");
      const eventsPath = path.join(
        projectRoot,
        ".palantir-mini",
        "session",
        "events.jsonl",
      );

      const lines = [
        // T0 — REJECTED; must NOT emit (line 1)
        JSON.stringify({
          eventId: "evt-t0-line1",
          when: "2026-05-13T00:00:00.001Z",
          atopWhich: "sha-line1",
          throughWhich: { sessionId: "sess-1", toolName: "ToolA", cwd: "/x" },
          byWhom: { identity: "claude-code", agentName: "noisy" },
          type: "noise_event_a",
          payload: {},
          valueGrade: "T0",
          sequence: 1,
        }),
        // T1 — noise; must NOT emit (line 2)
        JSON.stringify({
          eventId: "evt-t1-line2",
          when: "2026-05-13T00:00:00.002Z",
          atopWhich: "sha-line2",
          throughWhich: { sessionId: "sess-1", toolName: "ToolA", cwd: "/x" },
          byWhom: { identity: "monitor" },
          type: "lifecycle",
          payload: {},
          valueGrade: "T1",
          sequence: 2,
        }),
        // T2 — emit; named agent (confidence 1.0) (line 3)
        JSON.stringify({
          eventId: "evt-t2-line3",
          when: "2026-05-13T00:00:00.003Z",
          atopWhich: "sha-line3-commit",
          throughWhich: { sessionId: "sess-1", toolName: "ToolB", cwd: "/x" },
          byWhom: { identity: "claude-code", agentName: "implementer", runtime: "claude-code" },
          withWhat: { reasoning: "edit applied" },
          type: "edit_committed",
          payload: { correlationId: "corr-A" },
          valueGrade: "T2",
          sequence: 3,
        }),
        // T3 — emit; identity-only (confidence 0.5) (line 4)
        JSON.stringify({
          eventId: "evt-t3-line4",
          when: "2026-05-13T00:00:00.004Z",
          atopWhich: "sha-line4",
          throughWhich: { sessionId: "sess-1", toolName: "ToolC", cwd: "/x" },
          byWhom: { identity: "claude-code" },
          type: "validation_phase_completed",
          payload: {},
          valueGrade: "T3",
          sequence: 4,
        }),
        // T4 — emit; full join-key spread (line 5)
        JSON.stringify({
          eventId: "evt-t4-line5",
          when: "2026-05-13T00:00:00.005Z",
          atopWhich: "sha-line5",
          throughWhich: { sessionId: "sess-X", toolName: "ToolD", cwd: "/x" },
          byWhom: { identity: "claude-code", agentName: "orchestrator", runtime: "claude-code" },
          withWhat: {
            reasoning: "promotion candidate",
            refinementTarget: { kind: "shared-core-promotion" },
          },
          type: "outcome_paired",
          payload: {
            correlationId: "corr-Z",
            evalSuiteId: "suite-A",
            affectedRid: "rid-foo",
            branchName: "main",
            pullRequestNumber: 421,
          },
          lineageRefs: { actionRid: "action-rid-X" },
          valueGrade: "T4",
          sequence: 5,
        }),
      ];

      await writeFile(eventsPath, lines.join("\n") + "\n");

      const result = await indexEventsT2Plus(projectRoot, { nowIso: NOW_ISO });

      // Filter to this fixture's projectRoot to avoid any unrelated cross-pollution
      const fixtureEventNodes = result.nodes
        .filter((n) => n.kind === "Event")
        .filter((n) => {
          const v = n.value as { projectRoot: string };
          return v.projectRoot === projectRoot;
        });

      // Exactly 3 Event nodes (T2/T3/T4); T0+T1 dropped
      expect(fixtureEventNodes.length).toBe(3);

      const findByEventId = (id: string) =>
        fixtureEventNodes.find((n) => {
          const v = n.value as { eventId: string };
          return v.eventId === id;
        });

      const t2Node = findByEventId("evt-t2-line3");
      expect(t2Node).toBeDefined();
      const t2Value = t2Node?.value as {
        agentId?: string;
        valueGrade: string;
        lastIndexed: string;
        runtime?: string;
        toolName?: string;
        commitSha?: string;
        sessionId?: string;
        correlationId?: string;
      };
      expect(t2Value.valueGrade).toBe("T2");
      expect(t2Value.agentId).toBe("implementer");
      expect(t2Value.runtime).toBe("claude-code");
      expect(t2Value.toolName).toBe("ToolB");
      expect(t2Value.commitSha).toBe("sha-line3-commit");
      expect(t2Value.sessionId).toBe("sess-1");
      expect(t2Value.correlationId).toBe("corr-A");
      expect(t2Value.lastIndexed).toBe(NOW_ISO);

      const t3Node = findByEventId("evt-t3-line4");
      expect(t3Node).toBeDefined();
      const t3Value = t3Node?.value as { agentId?: string; valueGrade: string };
      expect(t3Value.valueGrade).toBe("T3");
      expect(t3Value.agentId).toBe("claude-code");

      const t4Node = findByEventId("evt-t4-line5");
      expect(t4Node).toBeDefined();
      const t4Value = t4Node?.value as {
        agentId?: string;
        valueGrade: string;
        correlationId?: string;
        evalSuiteId?: string;
        affectedRid?: string;
        branchName?: string;
        pullRequestNumber?: number;
        refinementTarget?: string;
      };
      expect(t4Value.valueGrade).toBe("T4");
      expect(t4Value.agentId).toBe("orchestrator");
      expect(t4Value.correlationId).toBe("corr-Z");
      expect(t4Value.evalSuiteId).toBe("suite-A");
      expect(t4Value.affectedRid).toBe("rid-foo");
      expect(t4Value.branchName).toBe("main");
      expect(t4Value.pullRequestNumber).toBe(421);
      expect(t4Value.refinementTarget).toBe("shared-core-promotion");

      // Confirm T0 + T1 dropped explicitly
      expect(findByEventId("evt-t0-line1")).toBeUndefined();
      expect(findByEventId("evt-t1-line2")).toBeUndefined();

      // Edges: 3 emits (one per surviving Event with byWhom shape)
      const fixtureEmitsEdges = result.edges
        .filter((e) => e.kind === "emits")
        .filter((e) =>
          fixtureEventNodes.some((n) => n.rid === e.toRid),
        );
      expect(fixtureEmitsEdges.length).toBe(3);

      const findEdgeForNode = (rid: unknown) =>
        fixtureEmitsEdges.find((e) => e.toRid === rid);

      const t2Edge = findEdgeForNode(t2Node?.rid);
      expect(t2Edge).toBeDefined();
      const t2EdgeValue = t2Edge?.value as { agentLabel: string; confidence: number };
      expect(t2EdgeValue.agentLabel).toBe("implementer");
      expect(t2EdgeValue.confidence).toBe(1.0);

      const t3Edge = findEdgeForNode(t3Node?.rid);
      expect(t3Edge).toBeDefined();
      const t3EdgeValue = t3Edge?.value as { agentLabel: string; confidence: number };
      expect(t3EdgeValue.agentLabel).toBe("claude-code");
      expect(t3EdgeValue.confidence).toBe(0.5);

      const t4Edge = findEdgeForNode(t4Node?.rid);
      expect(t4Edge).toBeDefined();
      const t4EdgeValue = t4Edge?.value as { agentLabel: string; confidence: number };
      expect(t4EdgeValue.agentLabel).toBe("orchestrator");
      expect(t4EdgeValue.confidence).toBe(1.0);
    },
  );

  // ─── Test 2: Empty-tree degenerate case ────────────────────────────────────
  //
  // Create an empty projectRoot with no .palantir-mini/session/ subtree.
  // Assert: nodes=[], edges=[], no throw.

  test("gracefully handles a directory with no events.jsonl and no archive", async () => {
    const tmpDir = await makeTmpDir("empty");
    tmpDirs.push(tmpDir);

    const projectRoot = path.join(tmpDir, "projectRoot");
    await fs.promises.mkdir(projectRoot, { recursive: true });

    let result: Awaited<ReturnType<typeof indexEventsT2Plus>> | undefined;
    let threw = false;

    try {
      result = await indexEventsT2Plus(projectRoot, { nowIso: NOW_ISO });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result?.nodes.length).toBe(0);
    expect(result?.edges.length).toBe(0);
  });

  // ─── Test 3: maxEvents cap applied after T0/T1 filter ──────────────────────
  //
  // Create fixture with 5 T2+ lines (all carrying byWhom.agentName).
  // Call with maxEvents: 2.
  // Assert: exactly 2 Event nodes (cap applied AFTER filter, sequence ASC); 2 emits edges.

  test("respects opts.maxEvents cap after filtering T0/T1 noise", async () => {
    const tmpDir = await makeTmpDir("cap");
    tmpDirs.push(tmpDir);

    const projectRoot = path.join(tmpDir, "projectRoot");
    const eventsPath = path.join(
      projectRoot,
      ".palantir-mini",
      "session",
      "events.jsonl",
    );

    const lines = [1, 2, 3, 4, 5].map((i) =>
      JSON.stringify({
        eventId: `evt-cap-${i}`,
        when: `2026-05-13T00:00:0${i}.000Z`,
        atopWhich: `sha-${i}`,
        throughWhich: { sessionId: "sess-cap", toolName: "ToolX", cwd: "/x" },
        byWhom: { identity: "claude-code", agentName: `agent-${i}` },
        type: "edit_committed",
        payload: {},
        valueGrade: "T2",
        sequence: i,
      }),
    );

    await writeFile(eventsPath, lines.join("\n") + "\n");

    const result = await indexEventsT2Plus(projectRoot, {
      maxEvents: 2,
      nowIso: NOW_ISO,
    });

    const fixtureNodes = result.nodes
      .filter((n) => n.kind === "Event")
      .filter((n) => {
        const v = n.value as { projectRoot: string };
        return v.projectRoot === projectRoot;
      });

    // Exactly 2 nodes — cap of 2
    expect(fixtureNodes.length).toBe(2);

    const fixtureEdges = result.edges
      .filter((e) => e.kind === "emits")
      .filter((e) => fixtureNodes.some((n) => n.rid === e.toRid));

    // Exactly 2 emits edges (one per retained Event; all 5 had byWhom.agentName)
    expect(fixtureEdges.length).toBe(2);

    // The first two by sequence are retained (sequence 1 and 2)
    const fixtureEventIds = fixtureNodes
      .map((n) => (n.value as { eventId: string }).eventId)
      .sort();
    expect(fixtureEventIds).toEqual(["evt-cap-1", "evt-cap-2"]);
  });
});
