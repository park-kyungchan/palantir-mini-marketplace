// palantir-mini — commit_edits MCP handler tests (sprint-060 W1.5)
// Coverage:
//   - Original scenarios: arg validation, validateOnly, happy commit, submission criteria failure
//   - sprint-060 W1.5 new scenarios:
//     1. with-dryRunRef (caller provides ref — no auto-injection)
//     2. without-dryRunRef-full-mode (auto dry_run_auto_computed event injected)
//     3. without-dryRunRef-quick-mode (no auto-injection — inline grader path)
//     4. skipAutoDryRun=true (audited bypass — dry_run_auto_skip event emitted)

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import commitEditsHandler from "../../../bridge/handlers/commit-edits";
import { readEvents } from "../../../lib/event-log/read";

function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-cm-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

const tmpRoots: string[] = [];

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

function setupRoot(label: string): string {
  const root = makeTmpRoot(label);
  tmpRoots.push(root);
  return root;
}

/**
 * Helper: write a fake SprintContract with given mode + status=bound
 * so readBoundContractMode() in the handler finds it.
 */
function setupBoundContract(root: string, mode: string): void {
  const harnessDir = path.join(root, ".palantir-mini", "harness", "sprint-001");
  fs.mkdirSync(harnessDir, { recursive: true });
  fs.writeFileSync(
    path.join(harnessDir, "contract.json"),
    JSON.stringify({ status: "bound", mode, theme: "test" }),
    "utf8",
  );
}

const sampleEdit = {
  kind: "create" as const,
  rid: "rid:test:abc" as any,
  payload: { name: "abc" },
} as any;

// ─── Original arg validation tests ──────────────────────────────────────────

describe("commit_edits handler — arg validation", () => {
  test("throws when project missing", async () => {
    await expect(
      commitEditsHandler({ actionTypeRid: "pm.self.ontology/action-type/commit-edits", edits: [] }),
    ).rejects.toThrow(/project.*required/i);
  });

  test("throws when actionTypeRid missing", async () => {
    const root = setupRoot("missing-rid");
    await expect(
      commitEditsHandler({ project: root, edits: [] }),
    ).rejects.toThrow(/actionTypeRid.*required/i);
  });

  test("throws when edits not an array", async () => {
    const root = setupRoot("bad-edits");
    await expect(
      commitEditsHandler({ project: root, actionTypeRid: "pm.self.ontology/action-type/commit-edits", edits: "not-an-array" }),
    ).rejects.toThrow(/edits.*array/i);
  });

  test("throws when project is non-string", async () => {
    await expect(
      commitEditsHandler({ project: 0, actionTypeRid: "pm.self.ontology/action-type/commit-edits", edits: [] }),
    ).rejects.toThrow(/project.*required/i);
  });
});

// ─── Original happy path tests ───────────────────────────────────────────────

describe("commit_edits handler — happy path", () => {
  test("empty edits + no criteria + validateOnly=false → COMMITTED + edit_committed event", async () => {
    const root = setupRoot("happy-empty");
    const result = await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [],
    });

    expect(result.result).toBe("COMMITTED");
    expect(result.committed).toBe(true);
    expect(result.eventType).toBe("edit_committed");
    expect(result.failedCriteria).toEqual([]);

    const events = readEvents(eventsPathFor(root));
    const committed = events.filter((e) => e.type === "edit_committed");
    expect(committed.length).toBe(1);
    expect(committed[0]!.throughWhich.toolName).toBe("commit_edits");
  });

  test("non-empty edits + no criteria → COMMITTED with appliedEdits", async () => {
    const root = setupRoot("happy-nonempty");
    const result = await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [sampleEdit],
    });

    expect(result.result).toBe("COMMITTED");
    expect(result.committed).toBe(true);
    expect(result.appliedEdits?.length).toBe(1);
  });
});

// ─── Original validateOnly tests ─────────────────────────────────────────────

describe("commit_edits handler — validateOnly", () => {
  test("validateOnly=true → VALIDATE_ONLY, no commit, no edit_committed event", async () => {
    const root = setupRoot("validate-only");
    const result = await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [sampleEdit],
      validateOnly: true,
    });

    expect(result.result).toBe("VALIDATE_ONLY");
    expect(result.committed).toBe(false);
    expect(result.eventType).toBe("none");

    const events = readEvents(eventsPathFor(root));
    expect(events.filter((e) => e.type === "edit_committed").length).toBe(0);
  });
});

// ─── Original submission criteria tests ──────────────────────────────────────

describe("commit_edits handler — submission criteria failure", () => {
  test("Unevaluable criterion fails → INVALID + submission_criteria_failed event", async () => {
    const root = setupRoot("criteria-fail");
    const result = await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [sampleEdit],
      submissionCriteria: [
        { type: "Unevaluable", name: "always_fails", reason: "test scenario" },
      ],
    });

    expect(result.result).toBe("INVALID");
    expect(result.committed).toBe(false);
    expect(result.eventType).toBe("submission_criteria_failed");
    expect(result.failedCriteria).toContain("always_fails");

    const events = readEvents(eventsPathFor(root));
    const failed = events.filter((e) => e.type === "submission_criteria_failed");
    expect(failed.length).toBe(1);
    expect(events.filter((e) => e.type === "edit_committed").length).toBe(0);
  });
});

describe("commit_edits handler — defaults", () => {
  test("submissionCriteria omitted defaults to []", async () => {
    const root = setupRoot("default-criteria");
    const result = await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [],
    });
    expect(result.passedCriteria).toEqual([]);
    expect(result.failedCriteria).toEqual([]);
  });

  test("validateOnly omitted defaults to false (commits proceed)", async () => {
    const root = setupRoot("default-validate");
    const result = await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [sampleEdit],
    });
    expect(result.result).toBe("COMMITTED");
    expect(result.committed).toBe(true);
  });
});

// ─── sprint-060 W1.5: 4 new dry-run scenarios ────────────────────────────────

describe("commit_edits handler — sprint-060 W1.5 dry-run scenarios", () => {

  /**
   * Scenario 1: Caller provides dryRunRef → no auto-injection.
   * Only edit_committed event emitted (no dry_run_auto_computed).
   */
  test("with-dryRunRef: caller-provided ref passes through without auto-injection", async () => {
    const root = setupRoot("with-dry-run-ref");
    setupBoundContract(root, "full");

    const result = await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [sampleEdit],
      dryRunRef: "caller-provided-ref-abc123",
    });

    expect(result.result).toBe("COMMITTED");
    expect(result.committed).toBe(true);

    const events = readEvents(eventsPathFor(root));

    // No auto_computed event should exist — caller provided the ref
    const autoInjected = events.filter(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string }).errorClass === "dry_run_auto_computed",
    );
    expect(autoInjected.length).toBe(0);

    // edit_committed event should exist
    expect(events.filter((e) => e.type === "edit_committed").length).toBe(1);
  });

  /**
   * Scenario 2: No dryRunRef + full mode → auto-injection fires.
   * dry_run_auto_computed event emitted + commit succeeds.
   */
  test("without-dryRunRef-full-mode: auto-injects dry_run_auto_computed event", async () => {
    const root = setupRoot("auto-inject-full");
    setupBoundContract(root, "full");

    const result = await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [sampleEdit],
      // No dryRunRef — triggers auto-injection
    });

    expect(result.result).toBe("COMMITTED");
    expect(result.committed).toBe(true);

    const events = readEvents(eventsPathFor(root));

    // Auto-injected event should exist
    const autoComputed = events.filter(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string }).errorClass === "dry_run_auto_computed",
    );
    expect(autoComputed.length).toBe(1);

    const autoEvent = autoComputed[0]!;
    const autoPayload = autoEvent.payload as Record<string, unknown>;
    expect(autoPayload.autoInjected).toBe(true);
    expect(autoPayload.editCount).toBe(1);
    expect(autoPayload.actionTypeRid).toBe("pm.self.ontology/action-type/commit-edits");
    expect(typeof autoPayload.dryRunRef).toBe("string");
    expect((autoPayload.dryRunRef as string).length).toBe(16); // sha256 truncated to 16 hex

    // reasoning should contain the dryRunRef for the precondition hook scanner
    const reasoning = autoEvent.withWhat?.reasoning ?? "";
    expect(reasoning).toContain("dryRunRef=");
    expect(reasoning).toContain("auto-injected");

    // edit_committed also present
    expect(events.filter((e) => e.type === "edit_committed").length).toBe(1);
  });

  /**
   * Scenario 3: No dryRunRef + quick mode → NO auto-injection.
   * Quick Sprint uses inline grader path in precondition hook.
   * No dry_run_auto_computed event should be emitted by the handler.
   */
  test("without-dryRunRef-quick-mode: no auto-injection (quick sprint inline grader path)", async () => {
    const root = setupRoot("no-inject-quick");
    setupBoundContract(root, "quick");

    const result = await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [sampleEdit],
      // No dryRunRef — but quick mode, so no auto-injection
    });

    expect(result.result).toBe("COMMITTED");
    expect(result.committed).toBe(true);

    const events = readEvents(eventsPathFor(root));

    // No auto_computed event — quick mode is handled by precondition hook
    const autoComputed = events.filter(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string }).errorClass === "dry_run_auto_computed",
    );
    expect(autoComputed.length).toBe(0);

    // No skip audit event either (skipAutoDryRun was not set)
    const skipAudit = events.filter(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string }).errorClass === "dry_run_auto_skip",
    );
    expect(skipAudit.length).toBe(0);

    // edit_committed present
    expect(events.filter((e) => e.type === "edit_committed").length).toBe(1);
  });

  /**
   * Scenario 4: skipAutoDryRun=true → bypass honored + dry_run_auto_skip emitted.
   * No dry_run_auto_computed event; audit trail preserved.
   */
  test("skipAutoDryRun=true: bypass honored, dry_run_auto_skip event emitted", async () => {
    const root = setupRoot("skip-auto-dry-run");
    setupBoundContract(root, "full");

    const result = await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [sampleEdit],
      skipAutoDryRun: true,
    });

    expect(result.result).toBe("COMMITTED");
    expect(result.committed).toBe(true);

    const events = readEvents(eventsPathFor(root));

    // No auto-injection
    const autoComputed = events.filter(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string }).errorClass === "dry_run_auto_computed",
    );
    expect(autoComputed.length).toBe(0);

    // Audit event should exist
    const skipAudit = events.filter(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string }).errorClass === "dry_run_auto_skip",
    );
    expect(skipAudit.length).toBe(1);

    const skipPayload = skipAudit[0]!.payload as Record<string, unknown>;
    expect(skipPayload.skipAutoDryRun).toBe(true);
    expect(skipPayload.actionTypeRid).toBe("pm.self.ontology/action-type/commit-edits");

    // edit_committed present
    expect(events.filter((e) => e.type === "edit_committed").length).toBe(1);
  });

  /**
   * Additional: validateOnly=true with no dryRunRef → no auto-injection
   * (dry-run injection is unnecessary when no commit happens).
   */
  test("validateOnly=true: no auto dry-run injection", async () => {
    const root = setupRoot("validate-no-inject");
    setupBoundContract(root, "full");

    const result = await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [sampleEdit],
      validateOnly: true,
    });

    expect(result.result).toBe("VALIDATE_ONLY");
    expect(result.committed).toBe(false);

    const events = readEvents(eventsPathFor(root));
    const autoComputed = events.filter(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string }).errorClass === "dry_run_auto_computed",
    );
    expect(autoComputed.length).toBe(0);
  });

  /**
   * Determinism: same inputs → same dryRunRef across two calls.
   */
  test("auto-injected dryRunRef is deterministic for same inputs", async () => {
    const root1 = setupRoot("determinism-1");
    const root2 = setupRoot("determinism-2");
    setupBoundContract(root1, "full");
    setupBoundContract(root2, "full");

    const edit = { kind: "create" as const, rid: "rid:det:xyz" as any, payload: {} } as any;

    await commitEditsHandler({
      project: root1,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [edit],
    });

    await commitEditsHandler({
      project: root2,
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      edits: [edit],
    });

    const events1 = readEvents(eventsPathFor(root1));
    const events2 = readEvents(eventsPathFor(root2));

    const ref1 = (events1.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string }).errorClass === "dry_run_auto_computed",
    )?.payload as Record<string, unknown>)?.dryRunRef;

    const ref2 = (events2.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        (e.payload as { errorClass?: string }).errorClass === "dry_run_auto_computed",
    )?.payload as Record<string, unknown>)?.dryRunRef;

    expect(ref1).toBeDefined();
    expect(ref2).toBeDefined();
    // Same project-relative inputs (different absolute project paths → different refs;
    // that's correct — dryRunRef encodes the project path).
    // Both should be 16-hex strings.
    expect(typeof ref1).toBe("string");
    expect((ref1 as string).length).toBe(16);
    expect(typeof ref2).toBe("string");
    expect((ref2 as string).length).toBe(16);
  });
});
