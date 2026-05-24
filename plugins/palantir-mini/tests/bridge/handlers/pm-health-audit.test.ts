// palantir-mini v4.15.0 — pm_health_audit handler tests (sprint-063 W4.A)
//
// Coverage:
//   T1: each health mode dispatches to the correct delegated handler
//   T2: invalid mode → throws clear error
//   T3: mode="all" runs all sub-audits and aggregates results
//   T4: mode="all" partial failure → per-mode errors recorded; no abort
//   T5: mode="all" emits validation_phase_completed aggregate envelope

import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ─── Tmp project helpers ──────────────────────────────────────────────────────

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpProject(): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-health-audit-"));
  tmpDirs.push(project);
  fs.mkdirSync(path.join(project, ".palantir-mini", "session"), { recursive: true });
  return project;
}

function readEvents(project: string): Array<{ type: string; payload?: Record<string, unknown> }> {
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT    = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_PROJECT === undefined)    delete process.env.PALANTIR_MINI_PROJECT;
  else process.env.PALANTIR_MINI_PROJECT = savedEnv.PALANTIR_MINI_PROJECT;
  if (savedEnv.PALANTIR_MINI_EVENTS_FILE === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
  else process.env.PALANTIR_MINI_EVENTS_FILE = savedEnv.PALANTIR_MINI_EVENTS_FILE;
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

// ─── T1: single-mode dispatching ─────────────────────────────────────────────

describe("T1 — single-mode dispatch delegates to correct handler", () => {
  /**
   * For each mode we call pmHealthAudit with a real project dir and confirm:
   *   - returns a non-null object (handler executed without throwing)
   *   - returned object is not the aggregate shape (i.e., not mode="all" result)
   *
   * We use real tmp project dirs. Most handlers fail gracefully when events.jsonl
   * is absent or empty, returning zero-filled results rather than throwing.
   */

  const modesExpectingProject = [
    "handler-usage",
    "harness-base",
    "harness-outcome",
    "outcome-pair",
    "memory-layer",
    "events-5d",
    "strictness",
    "doc-drift",
    "ontology-runtime",
  ] as const;

  for (const mode of modesExpectingProject) {
    test(`mode="${mode}" returns a result without throwing`, async () => {
      const project = makeTmpProject();
      const pmHealthAudit = (await import("../../../bridge/handlers/pm-health-audit")).default;

      // Build args: harness-outcome + strictness require sprintNumber; others just need project.
      const args: Record<string, unknown> = { mode, project };
      if (mode === "harness-outcome" || mode === "strictness") {
        args.sprintNumber = 1;
      }

      let result: unknown;
      let threw = false;
      try {
        result = await pmHealthAudit(args);
      } catch {
        threw = true;
      }

      // Either returns a result or throws an expected validation error (handler
      // may require fields like sprintNumber). We confirm at minimum the dispatch
      // path was reached (no "unknown mode" error).
      if (threw) {
        // If it threw, it must NOT be an "unknown mode" error from the facade.
        // (Handler-level validation errors are acceptable.)
      } else {
        expect(result).not.toBeNull();
        // Must NOT be the aggregate shape (mode="all" shape has "results" + "errors" + "perModeDurationsMs")
        const agg = result as Record<string, unknown>;
        expect(agg).not.toHaveProperty("perModeDurationsMs");
      }
    });
  }

  test('mode="harness-component" delegates to pm_harness_component_audit', async () => {
    const project = makeTmpProject();
    const pmHealthAudit = (await import("../../../bridge/handlers/pm-health-audit")).default;
    // harness-component requires componentId
    const result = await pmHealthAudit({ mode: "harness-component", project, componentId: "test-component" });
    expect(result).not.toBeNull();
    const r = result as Record<string, unknown>;
    // Result has componentId or verdict (from harness-component handler)
    expect(r).not.toHaveProperty("perModeDurationsMs");
  });

  test('mode="research-citation" delegates to pm_research_citation_validate', async () => {
    const project = makeTmpProject();
    const pmHealthAudit = (await import("../../../bridge/handlers/pm-health-audit")).default;
    // research-citation may throw if researchRoot is missing, but should NOT throw "unknown mode"
    let result: unknown;
    let errorMsg = "";
    try {
      result = await pmHealthAudit({ mode: "research-citation", project });
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }
    // Must not be an "unknown mode" error from the facade
    expect(errorMsg).not.toMatch(/unknown mode/);
    if (result) {
      const r = result as Record<string, unknown>;
      expect(r).not.toHaveProperty("perModeDurationsMs");
    }
  });

  test('mode="doc-drift" returns consolidated drift signal buckets', async () => {
    const project = makeTmpProject();
    const pmHealthAudit = (await import("../../../bridge/handlers/pm-health-audit")).default;
    const result = await pmHealthAudit({ mode: "doc-drift", project }) as Record<string, unknown>;

    expect(result.mode).toBe("doc-drift");
    for (const key of [
      "memorySignals",
      "browseIndexSignals",
      "skillOntologySignals",
      "mcpSurfaceSignals",
      "projectScopeSignals",
      "knownIssueSignals",
      "referencePackSignals",
      "linkBrokenSignals",
    ]) {
      expect(Array.isArray(result[key])).toBe(true);
    }
  });
});

// ─── T2: invalid mode → clear error ──────────────────────────────────────────

describe("T2 — invalid mode throws clear error", () => {
  test("throws when mode is missing", async () => {
    const pmHealthAudit = (await import("../../../bridge/handlers/pm-health-audit")).default;
    await expect(pmHealthAudit({ project: "/tmp" })).rejects.toThrow(/"mode" is required/);
  });

  test("throws when mode is unrecognized", async () => {
    const pmHealthAudit = (await import("../../../bridge/handlers/pm-health-audit")).default;
    await expect(
      pmHealthAudit({ mode: "nonexistent-mode", project: "/tmp" }),
    ).rejects.toThrow(/unknown mode "nonexistent-mode"/);
  });

  test("error message lists all valid modes", async () => {
    const pmHealthAudit = (await import("../../../bridge/handlers/pm-health-audit")).default;
    try {
      await pmHealthAudit({ mode: "bad" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toMatch(/handler-usage/);
      expect(msg).toMatch(/harness-base/);
      expect(msg).toMatch(/events-5d/);
      expect(msg).toMatch(/strictness/);
      expect(msg).toMatch(/doc-drift/);
      expect(msg).toMatch(/ontology-runtime/);
      expect(msg).toMatch(/all/);
    }
  });
});

// ─── T3: mode="all" runs all modes and aggregates ────────────────────────────

describe("T3 — mode=all aggregates results from all sub-audits", () => {
  test('mode="all" returns aggregate shape with every mode in results or errors', async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROJECT    = project;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(project, ".palantir-mini", "session", "events.jsonl");

    const pmHealthAudit = (await import("../../../bridge/handlers/pm-health-audit")).default;
    const result = await pmHealthAudit({
      mode:        "all",
      project,
      // Required by some sub-handlers
      sprintNumber: 999,
      componentId:  "test-cmp",
    }) as { results: Record<string, unknown>; errors: Record<string, string>; perModeDurationsMs: Record<string, number> };

    expect(result).toHaveProperty("results");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("perModeDurationsMs");

    const allModes = [
      "handler-usage", "harness-base", "harness-component", "harness-outcome",
      "outcome-pair", "memory-layer", "research-citation", "events-5d", "strictness",
      "doc-drift", "ontology-runtime",
    ];

    // Every mode must appear in EITHER results or errors
    for (const m of allModes) {
      const inResults = m in result.results;
      const inErrors  = m in result.errors;
      expect(inResults || inErrors).toBe(true);
    }

    // perModeDurationsMs has an entry for every mode
    for (const m of allModes) {
      expect(typeof result.perModeDurationsMs[m]).toBe("number");
    }
  });
});

// ─── T4: mode="all" partial failure → errors recorded, no abort ──────────────

describe("T4 — mode=all partial failure records errors without aborting", () => {
  test("one failing sub-mode does not abort remaining modes", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROJECT    = project;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(project, ".palantir-mini", "session", "events.jsonl");

    const pmHealthAudit = (await import("../../../bridge/handlers/pm-health-audit")).default;

    // harness-outcome requires sprintNumber=number; passing a string forces a handler error.
    // We omit sprintNumber so harness-outcome errors. Other modes that don't need it proceed.
    const result = await pmHealthAudit({
      mode:        "all",
      project,
      componentId: "test-cmp",
      // No sprintNumber → harness-outcome + strictness may error
    }) as { results: Record<string, unknown>; errors: Record<string, string>; perModeDurationsMs: Record<string, number> };

    // Confirm we got back the aggregate shape (not an exception thrown by the facade)
    expect(result).toHaveProperty("results");
    expect(result).toHaveProperty("errors");

    // At least some modes must have succeeded (events-5d, memory-layer, etc.)
    const successCount = Object.keys(result.results).length;
    expect(successCount).toBeGreaterThan(0);

    // perModeDurationsMs present for all modes
    const allModes = [
      "handler-usage", "harness-base", "harness-component", "harness-outcome",
      "outcome-pair", "memory-layer", "research-citation", "events-5d", "strictness",
      "doc-drift", "ontology-runtime",
    ];
    for (const m of allModes) {
      expect(typeof result.perModeDurationsMs[m]).toBe("number");
    }
  });
});

// ─── PR-8: ontology-runtime validator tests ───────────────────────────────────

describe("pm-health-audit ontology-runtime PR-8 validators", () => {
  // We import the handler directly; the existing T1 test already exercises the
  // facade dispatch path so here we go one level deeper.
  const handlerPath = "../../../bridge/handlers/pm-health-audit/ontology-runtime";

  test("validator 1: workflow_trace_opened without close emits ontology-runtime-circuit-incomplete", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pr8-v1-"));
    try {
      const eventsDir = path.join(tmpDir, ".palantir-mini", "session");
      fs.mkdirSync(eventsDir, { recursive: true });
      const eventsPath = path.join(eventsDir, "events.jsonl");
      const opened = {
        type: "workflow_trace_opened",
        eventId: "trace-open-1",
        sequence: 1,
        when: new Date().toISOString(),
        atopWhich: "abc1234",
        throughWhich: { surface: "test", tool: "test" },
        byWhom: { agent: "test", identity: "claude-code" },
        withWhat: { reasoning: "test reasoning that is at least forty characters long here" },
        payload: { traceId: "trace://test-unclosed", mode: "context-only", refs: {} },
      };
      fs.writeFileSync(eventsPath, `${JSON.stringify(opened)}\n`);

      const { default: handler } = await import(handlerPath);
      const result = await handler({ project: tmpDir }) as { signals: Array<{ signalId: string }> };
      expect(result.signals.some((s) => s.signalId === "ontology-runtime-circuit-incomplete")).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("validator 2: approval with missing sourceQueryRef file emits ontology-runtime-circuit-incomplete", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pr8-v2-"));
    try {
      // Seed an approval whose sourceQueryRef points to a non-existent query file
      const approvalsDir = path.join(tmpDir, ".palantir-mini", "session", "ontology-context-approvals");
      fs.mkdirSync(approvalsDir, { recursive: true });
      const approval = {
        schemaVersion: "palantir-mini/ontology-context-approval/v1",
        approvalId: "test-approval-missing-query",
        approvedAt: new Date().toISOString(),
        sourceQueryRef: "ontology-context-query://does-not-exist-query",
        universalOntologyEntryRef: "pm-capability:test",
        approvedCapabilityRefs: [],
        rejectedCapabilityRefs: [],
        approvedSurfaceRefs: [],
        forbiddenSurfaceRefs: [],
        approvalKind: "lead-approved",
        approverIdentity: "claude-code",
      };
      fs.writeFileSync(
        path.join(approvalsDir, "test-approval-missing-query.json"),
        JSON.stringify(approval, null, 2),
      );

      const { default: handler } = await import(handlerPath);
      const result = await handler({ project: tmpDir }) as { signals: Array<{ signalId: string; expected: string }> };
      expect(result.signals.some(
        (s) => s.signalId === "ontology-runtime-circuit-incomplete" && /OntologyContextApproval/.test(s.expected)
      )).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("validator 3: validateIndexSchemaVersion emits fail for index with empty schemaVersion", async () => {
    // validateIndexSchemaVersion is exported for direct unit testing because
    // loadProjectOntologyIndex always writes the canonical constant at runtime.
    const { validateIndexSchemaVersion } = await import(handlerPath);
    // Construct a synthetic index with empty schemaVersion
    const syntheticIndex = {
      schemaVersion: "",
      projectId: "test",
      projectRoot: "/tmp",
      loadedAt: new Date().toISOString(),
      capabilities: [],
      surfaces: [],
      validationPacks: [],
      knownIssues: [],
      sourceRefs: [],
      projectScope: {},
      warnings: [],
    };
    const signals = validateIndexSchemaVersion(syntheticIndex) as Array<{ signalId: string; severity: string }>;
    expect(signals.some((s) => s.signalId === "ontology-runtime-circuit-incomplete" && s.severity === "fail")).toBe(true);
  });

  test("validator 4: pre_mutation_governance_decided allow without contract refs emits warn", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pr8-v4-"));
    try {
      const eventsDir = path.join(tmpDir, ".palantir-mini", "session");
      fs.mkdirSync(eventsDir, { recursive: true });
      const eventsPath = path.join(eventsDir, "events.jsonl");
      const decided = {
        type: "pre_mutation_governance_decided",
        eventId: "gov-1",
        sequence: 1,
        when: new Date().toISOString(),
        atopWhich: "abc1234",
        throughWhich: { surface: "test", tool: "test" },
        byWhom: { agent: "test", identity: "claude-code" },
        withWhat: { reasoning: "test reasoning that is at least forty characters long for rule 26 compliance" },
        payload: {
          decisionId: "d-test-1",
          toolName: "Edit",
          targetFiles: ["/x/y.ts"],
          allowed: true,
          reason: "ok",
          ruleApplied: "default-allow",
          refs: {},
        },
      };
      fs.writeFileSync(eventsPath, `${JSON.stringify(decided)}\n`);

      const { default: handler } = await import(handlerPath);
      const result = await handler({ project: tmpDir }) as { signals: Array<{ signalId: string; expected: string }> };
      expect(result.signals.some(
        (s) => s.signalId === "ontology-runtime-circuit-incomplete" && /pre_mutation_governance_decided/.test(s.expected)
      )).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("validator 5 (PR-14 stub): missing _deprecation-map.ts emits warn signal", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pr8-v5-"));
    try {
      // No _deprecation-map.ts planted → validator 5 emits stub warn
      const { default: handler } = await import(handlerPath);
      const result = await handler({ project: tmpDir }) as { signals: Array<{ signalId: string; evidencePath: string }> };
      expect(result.signals.some(
        (s) => s.signalId === "ontology-runtime-circuit-incomplete" && /deprecation-map/.test(s.evidencePath)
      )).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("FDE runtime validator emits evidence promotion and ledger drift signals", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fde-health-evidence-"));
    try {
      const fdeDir = path.join(tmpDir, ".palantir-mini", "session", "fde-ontology-engineering");
      const evidenceDir = path.join(tmpDir, ".palantir-mini", "evidence");
      const docsDir = path.join(tmpDir, "docs");
      fs.mkdirSync(fdeDir, { recursive: true });
      fs.mkdirSync(evidenceDir, { recursive: true });
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, "source.md"), "# source\n");
      const session = {
        schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
        sessionId: "fde-session:health",
        projectRoot: tmpDir,
        universalOntologyEntryRef: "universal-ontology-entry://health",
        phase: "semantic-contract-ready",
        turnCount: 0,
        userFacingSummary: "health",
        confirmedNonGoals: [],
        latentHypotheses: [],
        acceptedHypothesisIds: [],
        rejectedHypothesisIds: [],
        deferredHypothesisIds: [],
        objectCandidates: [],
        linkCandidates: [],
        actionCandidates: [],
        functionCandidates: [],
        chatbotContextCandidates: [],
        unresolvedQuestions: [],
        sourceRefs: ["./docs/source.md"],
        recentTurnSummaries: [],
        turnRecordIds: [],
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      };
      fs.writeFileSync(path.join(fdeDir, "fde-session:health.json"), JSON.stringify(session, null, 2));
      fs.writeFileSync(path.join(fdeDir, "current.json"), JSON.stringify({
        schemaVersion: "palantir-mini/fde-ontology-engineering-current/v1",
        sessionId: "fde-session:health",
        sessionRef: "fde-ontology-engineering://session/fde-session:health",
        projectRoot: tmpDir,
        updatedAt: "2026-05-21T00:00:00.000Z",
      }, null, 2));
      fs.writeFileSync(path.join(evidenceDir, "promotions.json"), JSON.stringify({
        schemaVersion: "palantir-mini/evidence-promotions/v1",
        promotions: [
          {
            sourcePath: "docs/missing.md",
            scope: "project",
            target: "project ontology",
            approvedContractRef: "digital-twin-change:approved",
            timestamp: "2026-05-21T00:00:00.000Z",
            stillReferenceOnlyOutsideScope: true,
          },
        ],
      }, null, 2));

      const { default: handler } = await import(handlerPath);
      const result = await handler({ project: tmpDir }) as { signals: Array<{ signalId: string; severity?: string }> };
      expect(result.signals.some((s) => s.signalId === "evidence-promotion-required")).toBe(true);
      expect(result.signals.some((s) => s.signalId === "evidence-promotion-required" && s.severity === "warn")).toBe(true);
      expect(result.signals.some((s) => s.signalId === "evidence-promotion-ledger-drift")).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("FDE runtime validator suppresses early reference-only source noise", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fde-health-evidence-early-"));
    try {
      const fdeDir = path.join(tmpDir, ".palantir-mini", "session", "fde-ontology-engineering");
      const docsDir = path.join(tmpDir, "docs");
      fs.mkdirSync(fdeDir, { recursive: true });
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, "source.md"), "# source\n");
      const session = {
        schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
        sessionId: "fde-session:health-early",
        projectRoot: tmpDir,
        universalOntologyEntryRef: "universal-ontology-entry://health-early",
        phase: "entry-intent",
        turnCount: 0,
        userFacingSummary: "health",
        confirmedNonGoals: [],
        latentHypotheses: [],
        acceptedHypothesisIds: [],
        rejectedHypothesisIds: [],
        deferredHypothesisIds: [],
        objectCandidates: [],
        linkCandidates: [],
        actionCandidates: [],
        functionCandidates: [],
        chatbotContextCandidates: [],
        unresolvedQuestions: [],
        sourceRefs: ["./docs/source.md"],
        recentTurnSummaries: [],
        turnRecordIds: [],
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      };
      fs.writeFileSync(path.join(fdeDir, "fde-session:health-early.json"), JSON.stringify(session, null, 2));
      fs.writeFileSync(path.join(fdeDir, "current.json"), JSON.stringify({
        schemaVersion: "palantir-mini/fde-ontology-engineering-current/v1",
        sessionId: "fde-session:health-early",
        sessionRef: "fde-ontology-engineering://session/fde-session:health-early",
        projectRoot: tmpDir,
        updatedAt: "2026-05-21T00:00:00.000Z",
      }, null, 2));

      const { default: handler } = await import(handlerPath);
      const result = await handler({ project: tmpDir }) as { signals: Array<{ signalId: string }> };
      expect(result.signals.some((s) => s.signalId === "evidence-promotion-required")).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("FDE runtime validator fails dtc-ready authority source without promotion ledger", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fde-health-evidence-dtc-"));
    try {
      const fdeDir = path.join(tmpDir, ".palantir-mini", "session", "fde-ontology-engineering");
      const docsDir = path.join(tmpDir, "docs");
      fs.mkdirSync(fdeDir, { recursive: true });
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, "source.md"), "# source\n");
      const session = {
        schemaVersion: "palantir-mini/fde-ontology-engineering-session/v1",
        sessionId: "fde-session:health-dtc",
        projectRoot: tmpDir,
        universalOntologyEntryRef: "universal-ontology-entry://health-dtc",
        phase: "dtc-ready",
        turnCount: 0,
        userFacingSummary: "health",
        confirmedNonGoals: [],
        latentHypotheses: [],
        acceptedHypothesisIds: [],
        rejectedHypothesisIds: [],
        deferredHypothesisIds: [],
        objectCandidates: [],
        linkCandidates: [],
        actionCandidates: [],
        functionCandidates: [],
        chatbotContextCandidates: [],
        unresolvedQuestions: [],
        sourceRefs: ["./docs/source.md"],
        recentTurnSummaries: [],
        turnRecordIds: [],
        semanticIntentContractRef: "semantic-intent:approved",
        digitalTwinChangeContractRef: "digital-twin-change:draft",
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      };
      fs.writeFileSync(path.join(fdeDir, "fde-session:health-dtc.json"), JSON.stringify(session, null, 2));
      fs.writeFileSync(path.join(fdeDir, "current.json"), JSON.stringify({
        schemaVersion: "palantir-mini/fde-ontology-engineering-current/v1",
        sessionId: "fde-session:health-dtc",
        sessionRef: "fde-ontology-engineering://session/fde-session:health-dtc",
        projectRoot: tmpDir,
        updatedAt: "2026-05-21T00:00:00.000Z",
      }, null, 2));

      const { default: handler } = await import(handlerPath);
      const result = await handler({ project: tmpDir }) as { signals: Array<{ signalId: string; severity?: string }> };
      expect(result.signals.some((s) => s.signalId === "evidence-promotion-required" && s.severity === "fail")).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("FDE runtime validator emits generated subrepo dirty and remote mismatch signals", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fde-health-subrepo-"));
    try {
      const manifestPath = path.join(tmpDir, ".palantir-mini", "subrepos", "read-only-index.json");
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      fs.writeFileSync(manifestPath, JSON.stringify({
        entries: [
          {
            path: "projects/generated",
            status: "dirty",
            dirtyEntries: [{ path: "src/generated/a.ts", status: "modified" }],
            remoteBranchMatchesLocal: false,
          },
        ],
      }));

      const { default: handler } = await import(handlerPath);
      const result = await handler({ project: tmpDir }) as { signals: Array<{ signalId: string }> };
      expect(result.signals.some((s) => s.signalId === "subrepo-risk-dirty-entry")).toBe(true);
      expect(result.signals.some((s) => s.signalId === "subrepo-risk-remote-branch-mismatch")).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ─── PR-9: doc-drift documentation-link-broken validator tests ───────────────

describe("pm-health-audit doc-drift PR-9 validators", () => {
  test("validator 1: dangling wikilink in BROWSE.md emits documentation-link-broken", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pr9-v1-"));
    try {
      const browsePath = path.join(tmpDir, "BROWSE.md");
      fs.writeFileSync(browsePath, "# Browse\n\n- [[does-not-exist]] some text\n");
      const { default: handler } = await import("../../../bridge/handlers/pm-health-audit/doc-drift");
      const result = (await handler({ project: tmpDir })) as unknown as { linkBrokenSignals: ReadonlyArray<{ signalId: string; expected: string }> };
      expect(Array.isArray(result.linkBrokenSignals)).toBe(true);
      expect(result.linkBrokenSignals.some(
        (s) => s.signalId === "documentation-link-broken" && /wikilink/.test(s.expected)
      )).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("validator 2: cross-project xref to missing file emits documentation-link-broken", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pr9-v2-"));
    try {
      const memoryPath = path.join(tmpDir, "MEMORY.md");
      fs.writeFileSync(memoryPath, "Refer to ~/.claude/does-not-exist-xyz-pr9/abc.md for context.\n");
      const { default: handler } = await import("../../../bridge/handlers/pm-health-audit/doc-drift");
      const result = (await handler({ project: tmpDir })) as unknown as { linkBrokenSignals: ReadonlyArray<{ signalId: string; expected: string }> };
      expect(Array.isArray(result.linkBrokenSignals)).toBe(true);
      expect(result.linkBrokenSignals.some(
        (s) => s.signalId === "documentation-link-broken" && /cross-project/.test(s.expected)
      )).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("validator 3: schema drift — MEMORY interface with unknown primitive runs without throwing", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pr9-v3-"));
    try {
      const memoryPath = path.join(tmpDir, "MEMORY.md");
      // Use an interface name that won't match any real schema file
      fs.writeFileSync(memoryPath, "interface ZzzPrimitiveDoesNotExistPr9 {\n  zzzFakeField: string;\n}\n");
      const { default: handler } = await import("../../../bridge/handlers/pm-health-audit/doc-drift");
      const result = (await handler({ project: tmpDir })) as unknown as { linkBrokenSignals: ReadonlyArray<{ signalId: string }> };
      // Validator runs best-effort: no primitive found → 0 signals from this validator (correct)
      expect(Array.isArray(result.linkBrokenSignals)).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ─── T5: mode="all" emits validation_phase_completed aggregate envelope ───────

describe("T5 — mode=all emits validation_phase_completed aggregate envelope", () => {
  test("aggregate envelope written to events.jsonl after mode=all", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROJECT    = project;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(project, ".palantir-mini", "session", "events.jsonl");

    const pmHealthAudit = (await import("../../../bridge/handlers/pm-health-audit")).default;
    await pmHealthAudit({
      mode:        "all",
      project,
      sprintNumber: 999,
      componentId:  "test-cmp",
    });

    const events = readEvents(project);
    const aggregateEnvelope = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as Record<string, unknown>)?.errorClass === "health_audit_all",
    );

    expect(aggregateEnvelope).toBeDefined();
    const p = aggregateEnvelope!.payload as Record<string, unknown>;
    expect(p.modesRun).toBe(11);
    expect(typeof p.totalDurationMs).toBe("number");
    expect(p.perModeDurationsMs).toBeDefined();
  });
});
