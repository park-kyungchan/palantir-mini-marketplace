// palantir-mini v6.40.0 — cross-runtime parity smoke tests
//
// Sprint-132 PR 6.5 (canonical plan v2 §4 row 6.5; Phase 6 PR 5/7).
//
// Purpose: assert that shared-lib surfaces (emit_event / pm_intent_router /
// commit_edits) produce identical structural results when invoked through the
// shared bridge/mcp-server.ts — the common code path used by both the Claude
// Code CLI runtime and the Codex CLI runtime.
//
// Scope declaration:
//   "Shared-lib parity" is the achievable test scope from this Claude session.
//   Both runtimes import from the same `bridge/` handlers via the same
//   `bridge/mcp-server.ts`. This test calls those handlers directly (in-process)
//   twice — once labeled "claude" and once labeled "codex" — to prove that the
//   shared implementation is deterministic under identical inputs.
//
//   Full IPC smoke (true cross-process invocation with a running Codex CLI) is
//   deferred: it requires a running `codex` binary, a wired config.toml MCP
//   block, and JSON-RPC socket connectivity — none of which are available in a
//   Claude Code CLI session. Each gap surface is marked with a `test.skip` or
//   `test.todo` carrying a "CODEX-PARITY-GAP" comment so CI output remains
//   legible.
//
// Gap surfaces (per NATIVE_RUNTIME_GAPS.md, PR 6.3):
//   - TaskCreated / TaskCompleted: no Codex native event; gap=true.
//   - TeammateIdle: Claude Code CLI Agent Teams concept; not applicable to Codex.
//   - SubagentStart / SubagentStop: no Codex native event; gap=true.
//
// @since palantir-mini v6.40.0 (sprint-132 PR 6.5)

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { sessionId as mkSessionId } from "../../lib/event-log/types";
import type { EventEnvelope } from "../../lib/event-log/types";

// ─── Types ──────────────────────────────────────────────────────────────────

type JsonObject = Record<string, unknown>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates a temporary sandbox directory for tests that need a project root.
 * Caller is responsible for cleanup.
 */
function makeSandbox(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-cross-runtime-parity-"));
}

/**
 * Loads a JSON fixture from the fixtures/ directory.
 */
function loadFixture<T = JsonObject>(name: string): T {
  const fixturePath = path.join(__dirname, "fixtures", name);
  return JSON.parse(fs.readFileSync(fixturePath, "utf8")) as T;
}

/**
 * Strips volatile fields from an emit result so results can be compared
 * structurally between "claude" and "codex" invocation paths.
 * Volatile: eventId (envelope-sourced), sequence (increments), eventsPath.
 */
function stripVolatileFromEmitResult(result: JsonObject): JsonObject {
  const { eventId: _a, sequence: _b, eventsPath: _c, ...stable } = result;
  return stable;
}

/**
 * Strips volatile fields from a router result so results can be compared
 * structurally between invocations.
 * Volatile: prefetchTimingsMs, prefetchedContext (network-dependent).
 */
function stripVolatileFromRouterResult(result: JsonObject): JsonObject {
  const {
    prefetchTimingsMs: _a,
    prefetchedContext: _b,
    prefetchSucceeded: _c,
    ...stable
  } = result;
  return stable;
}

// ─── Shared envelope builder ─────────────────────────────────────────────────

// Valid identity values per lib/event-log/types.ts byWhom.identity union.
// Codex runtime uses "codex" (not "codex-cli") per the type definition.
type RuntimeIdentity = "claude-code" | "codex";

/**
 * Builds a valid 5-dim EventEnvelope with a unique sessionId per invocation
 * so the two "runtimes" write to separate log files in independent sandboxes.
 */
function buildTestEnvelope(
  identity: RuntimeIdentity,
): Omit<EventEnvelope, "sequence"> {
  const raw = loadFixture("emit-event-fixture.json") as JsonObject;
  return {
    ...(raw as Omit<EventEnvelope, "sequence">),
    throughWhich: {
      sessionId: mkSessionId(`test-session-${identity}-parity-001`),
      toolName: "emit_event",
      cwd: `/tmp/cross-runtime-parity-smoke-${identity}`,
    },
    byWhom: {
      agentName: "lead",
      // Each runtime self-attributes per rule 27 §Cross-runtime invariant.
      // Valid values: "claude-code" | "codex" | "gemini" | "user" | "monitor" | "test-agent"
      identity,
    },
  };
}

// ─── Suite 1: emit_event parity ───────────────────────────────────────────────

describe(
  "cross-runtime parity — emit_event (sprint-132 PR 6.5)",
  () => {
    test(
      "[shared-lib-parity] claude path and codex path produce same envelope row format",
      async () => {
        // Import the shared handler — both runtimes use this exact module via
        // bridge/mcp-server.ts. Calling it twice with different identity labels
        // is the achievable parity check without a running Codex binary.
        const { default: emitEvent } = await import(
          "../../bridge/handlers/emit-event"
        );

        const claudeSandbox = makeSandbox();
        const codexSandbox = makeSandbox();

        try {
          const claudeEnvelope = buildTestEnvelope("claude-code");
          const codexEnvelope = buildTestEnvelope("codex");

          // Invoke the handler through the "claude" path.
          const claudeResult = await emitEvent({
            project: claudeSandbox,
            envelope: claudeEnvelope,
          });

          // Invoke the same handler through the "codex" path (same binary code,
          // different identity). This models "shared-lib parity": both runtimes
          // invoke the same bridge handler, so the output shape must be identical.
          const codexResult = await emitEvent({
            project: codexSandbox,
            envelope: codexEnvelope,
          });

          // Shape-level structural assertions (volatile fields stripped).
          const claudeStable = stripVolatileFromEmitResult(
            claudeResult as unknown as JsonObject,
          );
          const codexStable = stripVolatileFromEmitResult(
            codexResult as unknown as JsonObject,
          );

          // Both results must have identical stable key sets.
          expect(Object.keys(claudeStable).sort()).toEqual(
            Object.keys(codexStable).sort(),
          );

          // Neither invocation should error — sequence and eventsPath must be present.
          // eventId is taken from the envelope (may be undefined if not supplied in fixture).
          expect(typeof claudeResult.sequence).toBe("number");
          expect(typeof claudeResult.eventsPath).toBe("string");

          expect(typeof codexResult.sequence).toBe("number");
          expect(typeof codexResult.eventsPath).toBe("string");

          // Both paths should assign sequence=1 (first event in fresh sandbox).
          expect(claudeResult.sequence).toBe(1);
          expect(codexResult.sequence).toBe(1);

          // Verify each sandbox actually wrote an events.jsonl row.
          const claudeEventsPath = path.join(
            claudeSandbox,
            ".palantir-mini",
            "session",
            "events.jsonl",
          );
          const codexEventsPath = path.join(
            codexSandbox,
            ".palantir-mini",
            "session",
            "events.jsonl",
          );

          expect(fs.existsSync(claudeEventsPath)).toBe(true);
          expect(fs.existsSync(codexEventsPath)).toBe(true);

          const claudeRow = JSON.parse(
            fs.readFileSync(claudeEventsPath, "utf8").trim(),
          ) as JsonObject;
          const codexRow = JSON.parse(
            fs.readFileSync(codexEventsPath, "utf8").trim(),
          ) as JsonObject;

          // Both rows must be valid JSON objects with the same top-level keys
          // (excluding runtime-specific identity fields).
          const claudeKeys = Object.keys(claudeRow).sort();
          const codexKeys = Object.keys(codexRow).sort();
          expect(claudeKeys).toEqual(codexKeys);

          // byWhom.identity must be set correctly per rule 27 §Cross-runtime invariant.
          expect((claudeRow.byWhom as JsonObject)?.identity).toBe("claude-code");
          expect((codexRow.byWhom as JsonObject)?.identity).toBe("codex");
        } finally {
          fs.rmSync(claudeSandbox, { recursive: true, force: true });
          fs.rmSync(codexSandbox, { recursive: true, force: true });
        }
      },
    );

    test(
      "[shared-lib-parity] autoGradeEnvelope produces T0 for incomplete 5-dim envelope (both paths)",
      async () => {
        const { autoGradeEnvelope } = await import(
          "../../bridge/handlers/emit-event"
        );

        // Incomplete envelope (missing atopWhich) → must grade T0 regardless of runtime.
        const incompleteBase = {
          type: "session_started" as const,
          when: "2026-05-13T12:00:00.000Z",
          // atopWhich intentionally omitted — triggers T0
          throughWhich: {
            sessionId: mkSessionId("test-incomplete"),
            toolName: "emit_event",
            cwd: "/tmp/test",
          },
          withWhat: { reasoning: "test incomplete envelope for T0 grade assertion" },
        };

        // Both "claude" and "codex" paths call the same grader — shared lib.
        const claudeGrade = autoGradeEnvelope({
          ...incompleteBase,
          byWhom: { agentName: "lead", identity: "claude-code" },
        } as unknown as Omit<EventEnvelope, "sequence">);

        const codexGrade = autoGradeEnvelope({
          ...incompleteBase,
          byWhom: { agentName: "lead", identity: "codex" },
        } as unknown as Omit<EventEnvelope, "sequence">);

        expect(claudeGrade).toBe("T0");
        expect(codexGrade).toBe("T0");

        // Grades are identical — parity confirmed.
        expect(claudeGrade).toBe(codexGrade);
      },
    );
  },
);

// ─── Suite 2: pm_intent_router parity ────────────────────────────────────────

describe(
  "cross-runtime parity — pm_intent_router (sprint-132 PR 6.5)",
  () => {
    test(
      "[shared-lib-parity] same intent + scope produces same recipe shape from both runtimes",
      async () => {
        const { routeIntent } = await import(
          "../../bridge/handlers/pm-intent-router"
        );

        const claudeSandbox = makeSandbox();
        const codexSandbox = makeSandbox();

        try {
          const fixtureInput = loadFixture("pm-intent-router-fixture.json") as JsonObject;

          // Claude runtime invocation.
          // PromptRuntime values: "claude" | "codex" | "cursor" | "gemini" | "unknown"
          const claudeResult = await routeIntent({
            project: claudeSandbox,
            intent: fixtureInput.intent as string,
            scopePaths: fixtureInput.scopePaths as string[],
            complexityHint: fixtureInput.complexityHint as "trivial",
            acceptApprovalAutoCreate: false,
            runtime: "claude",
          });

          // Codex runtime invocation (same shared handler).
          // Per rule 27: the shared lib is SSoT; Codex invokes via the same bridge.
          const codexResult = await routeIntent({
            project: codexSandbox,
            intent: fixtureInput.intent as string,
            scopePaths: fixtureInput.scopePaths as string[],
            complexityHint: fixtureInput.complexityHint as "trivial",
            acceptApprovalAutoCreate: false,
            runtime: "codex",
          });

          // Both results must be objects.
          expect(typeof claudeResult).toBe("object");
          expect(typeof codexResult).toBe("object");

          // Stable shape keys must match (strip volatile before comparing).
          const claudeStable = stripVolatileFromRouterResult(
            claudeResult as unknown as JsonObject,
          );
          const codexStable = stripVolatileFromRouterResult(
            codexResult as unknown as JsonObject,
          );

          const claudeKeys = Object.keys(claudeStable).sort();
          const codexKeys = Object.keys(codexStable).sort();
          expect(claudeKeys).toEqual(codexKeys);

          // Decision field must be deterministic for same input regardless of runtime.
          expect(claudeResult.decision).toBe(codexResult.decision);

          // dispatchSpecies must be a string in both cases.
          expect(typeof claudeResult.dispatchSpecies).toBe("string");
          expect(typeof codexResult.dispatchSpecies).toBe("string");

          // costRationale must be a string in both cases.
          expect(typeof claudeResult.costRationale).toBe("string");
          expect(typeof codexResult.costRationale).toBe("string");

          // contractGate must be an object in both cases.
          expect(typeof claudeResult.contractGate).toBe("object");
          expect(typeof codexResult.contractGate).toBe("object");
        } finally {
          fs.rmSync(claudeSandbox, { recursive: true, force: true });
          fs.rmSync(codexSandbox, { recursive: true, force: true });
        }
      },
    );
  },
);

// ─── Suite 3: commit_edits validate-only parity ───────────────────────────────

describe(
  "cross-runtime parity — commit_edits validate-only (sprint-132 PR 6.5)",
  () => {
    test(
      "[shared-lib-parity] validateOnly=true produces same validation result shape from both runtimes",
      async () => {
        // commit_edits with validateOnly=true runs the submission-criteria gate
        // without writing files. This is the safely-runnable parity check.
        // Full commit requires a bound SprintContract + dry-run cycle — deferred
        // to integration tests.
        const { default: commitEditsHandler } = await import(
          "../../bridge/handlers/commit-edits"
        );

        const claudeSandbox = makeSandbox();
        const codexSandbox = makeSandbox();

        try {
          const baseArgs = {
            actionTypeRid: "ri.ontology.main.action-type.test-parity",
            edits: [] as [],
            validateOnly: true,
            skipAutoDryRun: true,
          };

          // Claude invocation (validateOnly — no actual commit).
          const claudeResult = await commitEditsHandler({
            ...baseArgs,
            project: claudeSandbox,
          });

          // Codex invocation (same handler, same validateOnly path).
          const codexResult = await commitEditsHandler({
            ...baseArgs,
            project: codexSandbox,
          });

          // Both must return objects.
          expect(typeof claudeResult).toBe("object");
          expect(typeof codexResult).toBe("object");

          // Both must have the same top-level key set.
          const claudeObj = claudeResult as unknown as JsonObject;
          const codexObj = codexResult as unknown as JsonObject;

          const claudeKeys = Object.keys(claudeObj).sort();
          const codexKeys = Object.keys(codexObj).sort();
          expect(claudeKeys).toEqual(codexKeys);

          // validateOnly=true means no real commit occurred — both must agree.
          // If a `committed` field is present, both paths should agree on its value.
          if ("committed" in claudeObj && "committed" in codexObj) {
            expect(claudeObj.committed).toBe(codexObj.committed);
          }
        } finally {
          fs.rmSync(claudeSandbox, { recursive: true, force: true });
          fs.rmSync(codexSandbox, { recursive: true, force: true });
        }
      },
    );
  },
);

// ─── Suite 4: CODEX-PARITY-GAP placeholders ──────────────────────────────────
//
// These test stubs document hooks/events that exist in the Claude Code CLI
// runtime but have NO equivalent in Codex. Each is marked as skip/todo so
// CI output clearly shows the gap boundary.
//
// Source: NATIVE_RUNTIME_GAPS.md (sprint-130 PR 6.3).

describe(
  "cross-runtime parity — CODEX-PARITY-GAP placeholders (sprint-132 PR 6.5)",
  () => {
    // CODEX-PARITY-GAP: TaskCreated event
    // Claude: TaskCreated → 2 hook commands (task-created + task-created-granularity-gate).
    // Codex: no native TaskCreated event; task granularity gate unenforced.
    // Bridge status: gap. Workaround: Codex must call ontology_context_query precondition manually.
    test.skip(
      "[CODEX-PARITY-GAP] TaskCreated — no Codex native equivalent; task-created-granularity-gate unenforced in Codex",
      () => {
        // Future IPC smoke plan:
        // 1. Emit a TaskCreated event via Codex MCP bridge.
        // 2. Assert task-created-granularity-gate fires (or its MCP equivalent fires).
        // 3. Compare hook enforcement result against Claude native behavior.
        //
        // Root: NATIVE_RUNTIME_GAPS.md §TaskCreated (gap); priority P1.
      },
    );

    // CODEX-PARITY-GAP: TaskCompleted event
    // Claude: TaskCompleted → 2 hook commands (task-completed-gate + task-completed-inbox-clean).
    // Codex: no native TaskCompleted event; inbox cleanup is a no-op.
    // Bridge status: gap. Workaround: emit task_completed event via MCP manually.
    test.skip(
      "[CODEX-PARITY-GAP] TaskCompleted — no Codex native equivalent; task-completed-gate unenforced in Codex",
      () => {
        // Future IPC smoke plan:
        // 1. Codex completes a task unit and calls mcp__palantir_mini__emit_event
        //    with type="task_completed".
        // 2. Assert the task_completed event appears in events.jsonl with correct 5-dim.
        // 3. Assert inbox clean logic runs (or is explicitly deferred).
        //
        // Root: NATIVE_RUNTIME_GAPS.md §TaskCompleted (gap); priority P3.
      },
    );

    // CODEX-PARITY-GAP: TeammateIdle event
    // Claude: TeammateIdle → 3 hook commands (teammate-idle + idle-auto-shutdown blocking + lead-idle-digest).
    // Codex: no multi-agent teammate surface; Agent Teams is Claude Code CLI-only.
    // Bridge status: gap (not-applicable to single-agent Codex).
    // Workaround (future multi-agent Codex): cron/scheduled MCP health-check polling.
    test.skip(
      "[CODEX-PARITY-GAP] TeammateIdle — Claude Code CLI Agent Teams concept; no Codex equivalent",
      () => {
        // Future consideration:
        // If Codex gains a multi-agent spawn surface, TeammateIdle equivalent
        // could be modeled as a polled MCP health-check (SessionStop + re-emit).
        //
        // Root: NATIVE_RUNTIME_GAPS.md §TeammateIdle (gap); not-applicable.
        // Rule ref: rule 12 v3.9.0 §Session lifecycle (5+ idle DMs → auto-replace).
      },
    );

    // CODEX-PARITY-GAP: SubagentStart event
    // Claude: SubagentStart → 2 hook commands (subagent-start + briefing-template-validate blocking).
    // Codex: no SubagentStart event; 5-section briefing rule unenforced natively.
    // Bridge status: gap. Priority P1.
    test.skip(
      "[CODEX-PARITY-GAP] SubagentStart — no Codex native equivalent; briefing-template-validate unenforced",
      () => {
        // Future IPC smoke plan:
        // 1. Codex spawns a sub-process (nearest equivalent to Agent spawn).
        // 2. Emit subagent_started event via MCP with briefing payload.
        // 3. Assert briefing-template-validate fires (or MCP equivalent) and
        //    confirms 5-section structure present.
        //
        // Root: NATIVE_RUNTIME_GAPS.md §SubagentStart (gap); priority P1.
        // Rule ref: rule 12 v3.9.0 §Briefing template (5-section; section 5 blocking).
      },
    );

    // CODEX-PARITY-GAP: SubagentStop event
    // Claude: SubagentStop → 4 hook commands (subagent-stop + heartbeat-validate +
    //         analyzer-output-injector + harness-sprint-chain-suggest).
    // Codex: no SubagentStop event; analyzer injection and sprint chain suggestions absent.
    // Bridge status: gap. Priority P2 (affects harness loop continuity).
    test.skip(
      "[CODEX-PARITY-GAP] SubagentStop — no Codex native equivalent; analyzer-output-injector absent",
      () => {
        // Future IPC smoke plan:
        // 1. Codex finishes a sub-process and calls mcp__palantir_mini__emit_event
        //    with type="subagent_stopped" and phase metadata.
        // 2. Assert the stopped event is in events.jsonl.
        // 3. Assert harness sprint-chain-suggest equivalent runs (or is explicitly deferred).
        //
        // Root: NATIVE_RUNTIME_GAPS.md §SubagentStop (gap).
      },
    );

    // Placeholder for full IPC smoke once Codex CLI is reachable from this session.
    // test.todo requires a fn arg in bun:test — use test.skip with empty fn instead.
    test.skip(
      "[CODEX-IPC-TODO] Full IPC smoke — JSON-RPC call to running Codex CLI MCP server not yet available in Claude Code CLI sessions",
      () => {
        // Future: connect to codex MCP stdio server and send JSON-RPC tools/call.
      },
    );
  },
);
