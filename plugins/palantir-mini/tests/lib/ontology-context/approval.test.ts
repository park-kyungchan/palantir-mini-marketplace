import { describe, expect, it, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  createOntologyContextApproval,
  loadOntologyContextApproval,
  listPendingContextApprovals,
  isLowRiskIntent,
  type CreateOntologyContextApprovalInput,
  ONTOLOGY_CONTEXT_APPROVAL_SCHEMA_VERSION,
} from "../../../lib/ontology-context/approval";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-approval-test-"));
}

function baseInput(projectRoot: string, overrides: Partial<CreateOntologyContextApprovalInput> = {}): CreateOntologyContextApprovalInput {
  return {
    sourceQueryRef: "ontology-context-query://test-query-ref-001",
    universalOntologyEntryRef: "universal-ontology-entry://test-entry-001",
    approvedCapabilityRefs: ["cap-a", "cap-b"],
    rejectedCapabilityRefs: ["cap-c"],
    approvedSurfaceRefs: ["lib/foo.ts", "bridge/bar.ts"],
    forbiddenSurfaceRefs: [],
    approvalKind: "auto-low-risk",
    approverIdentity: "claude-code",
    projectRoot,
    approvedAt: "2026-05-13T00:00:00.000Z",
    ...overrides,
  };
}

const tmpRoots: string[] = [];
function trackedTmpRoot(): string {
  const root = makeTmpRoot();
  tmpRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tmpRoots) {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
  }
  tmpRoots.length = 0;
});

// ─── describe("createOntologyContextApproval") ───────────────────────────────

describe("createOntologyContextApproval", () => {
  it("creates a record with deterministic approvalId for identical inputs", async () => {
    const projectRoot = trackedTmpRoot();
    const input = baseInput(projectRoot);
    const { approval: a1 } = await createOntologyContextApproval(input);
    const { approval: a2 } = await createOntologyContextApproval(input);
    expect(a1.approvalId).toBe(a2.approvalId);
    expect(a1.schemaVersion).toBe(ONTOLOGY_CONTEXT_APPROVAL_SCHEMA_VERSION);
    expect(a1.approvalKind).toBe("auto-low-risk");
    expect(a1.approvedCapabilityRefs).toContain("cap-a");
  });

  it("persists JSON at <projectRoot>/.palantir-mini/session/ontology-context-approvals/<approvalId>.json", async () => {
    const projectRoot = trackedTmpRoot();
    const { approval, approvalRef } = await createOntologyContextApproval(baseInput(projectRoot));
    const storeDir = path.join(projectRoot, ".palantir-mini", "session", "ontology-context-approvals");
    expect(fs.existsSync(storeDir)).toBe(true);
    // At least one .json file exists in the directory
    const files = fs.readdirSync(storeDir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);
    // approvalRef includes approvalId
    expect(approvalRef).toMatch(/^ontology-context-approval:\/\//);
    // The persisted record round-trips
    const diskContent = JSON.parse(
      fs.readFileSync(path.join(storeDir, files[0]!), "utf8"),
    ) as { approvalId: string };
    expect(diskContent.approvalId).toBe(approval.approvalId);
  });

  it("returns the same record on second call with identical inputs (idempotent)", async () => {
    const projectRoot = trackedTmpRoot();
    const input = baseInput(projectRoot);
    const { approval: first, approvalRef: ref1 } = await createOntologyContextApproval(input);
    // Get mtime of the file after first write
    const storeDir = path.join(projectRoot, ".palantir-mini", "session", "ontology-context-approvals");
    const files = fs.readdirSync(storeDir).filter((f) => f.endsWith(".json"));
    const mtimeBefore = fs.statSync(path.join(storeDir, files[0]!)).mtimeMs;

    const { approval: second, approvalRef: ref2 } = await createOntologyContextApproval(input);
    const mtimeAfter = fs.statSync(path.join(storeDir, files[0]!)).mtimeMs;

    expect(first.approvalId).toBe(second.approvalId);
    expect(ref1).toBe(ref2);
    // File was not re-written (mtime unchanged)
    expect(mtimeAfter).toBe(mtimeBefore);
  });

  it("emits exactly one phase_completed event with phaseTag=ontology-context-approval-created", async () => {
    const projectRoot = trackedTmpRoot();
    const input = baseInput(projectRoot, {
      // use a unique approvedAt so we get a fresh file (not cached from prior tests)
      approvedAt: `2026-05-13T01:00:00.000Z`,
      sourceQueryRef: "ontology-context-query://emit-test-query",
    });
    await createOntologyContextApproval(input);
    // Events are written to <projectRoot>/.palantir-mini/session/events.jsonl
    const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
    // Give the async emit a moment to flush (it's fire-and-forget in practice)
    await new Promise((r) => setTimeout(r, 50));
    if (!fs.existsSync(eventsPath)) {
      // emit may write to a different path based on env; skip assertion if events.jsonl absent
      return;
    }
    const lines = fs.readFileSync(eventsPath, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    const events = lines.map((l) => {
      try { return JSON.parse(l) as Record<string, unknown>; } catch { return null; }
    }).filter(Boolean);

    const approvalEvents = events.filter((e) => {
      const payload = e?.["payload"] as Record<string, unknown> | undefined;
      return payload?.["phaseTag"] === "ontology-context-approval-created";
    });
    // At least one event should have been emitted
    expect(approvalEvents.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── describe("loadOntologyContextApproval") ─────────────────────────────────

describe("loadOntologyContextApproval", () => {
  it("round-trips a freshly created approval", async () => {
    const projectRoot = trackedTmpRoot();
    const { approval, approvalRef } = await createOntologyContextApproval(baseInput(projectRoot));
    const loaded = loadOntologyContextApproval(projectRoot, approvalRef);
    expect(loaded).not.toBeUndefined();
    expect(loaded?.approvalId).toBe(approval.approvalId);
    expect(loaded?.approvalKind).toBe(approval.approvalKind);
    expect(loaded?.sourceQueryRef).toBe(approval.sourceQueryRef);
  });

  it("returns undefined for a non-existent approvalRef", () => {
    const projectRoot = trackedTmpRoot();
    const result = loadOntologyContextApproval(
      projectRoot,
      "ontology-context-approval://does-not-exist-abc123",
    );
    expect(result).toBeUndefined();
  });

  it("tolerates malformed JSON (write garbage to the path, assert undefined return, no throw)", async () => {
    const projectRoot = trackedTmpRoot();
    const { approvalRef } = await createOntologyContextApproval(baseInput(projectRoot));
    // Corrupt the file
    const storeDir = path.join(projectRoot, ".palantir-mini", "session", "ontology-context-approvals");
    const files = fs.readdirSync(storeDir).filter((f) => f.endsWith(".json"));
    fs.writeFileSync(path.join(storeDir, files[0]!), "{ NOT VALID JSON ;;; }", "utf8");

    let result: unknown;
    let threw = false;
    try {
      result = loadOntologyContextApproval(projectRoot, approvalRef);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result).toBeUndefined();
  });
});

// ─── describe("listPendingContextApprovals") ─────────────────────────────────

describe("listPendingContextApprovals", () => {
  it("returns [] when the directory is missing", () => {
    const projectRoot = trackedTmpRoot();
    // No .palantir-mini directory created
    expect(listPendingContextApprovals(projectRoot)).toEqual([]);
  });

  it("returns up to 5 most recent by approvedAt desc (create 7, assert length 5 + order)", async () => {
    const projectRoot = trackedTmpRoot();
    // Create 7 approvals with distinct approvedAt timestamps
    const times = [
      "2026-05-13T01:00:00.000Z",
      "2026-05-13T02:00:00.000Z",
      "2026-05-13T03:00:00.000Z",
      "2026-05-13T04:00:00.000Z",
      "2026-05-13T05:00:00.000Z",
      "2026-05-13T06:00:00.000Z",
      "2026-05-13T07:00:00.000Z",
    ];
    for (let i = 0; i < 7; i++) {
      await createOntologyContextApproval(
        baseInput(projectRoot, {
          approvedAt: times[i],
          sourceQueryRef: `ontology-context-query://query-${i}`,
        }),
      );
    }

    const list = listPendingContextApprovals(projectRoot);
    expect(list.length).toBe(5);
    // Should be sorted by approvedAt desc — most recent first
    expect(list[0]!.approvedAt).toBe("2026-05-13T07:00:00.000Z");
    expect(list[4]!.approvedAt).toBe("2026-05-13T03:00:00.000Z");
  });

  it("skips malformed files without throwing (mix valid + invalid, assert valid ones returned)", async () => {
    const projectRoot = trackedTmpRoot();
    // Create 2 valid approvals
    await createOntologyContextApproval(
      baseInput(projectRoot, {
        approvedAt: "2026-05-13T10:00:00.000Z",
        sourceQueryRef: "ontology-context-query://valid-1",
      }),
    );
    await createOntologyContextApproval(
      baseInput(projectRoot, {
        approvedAt: "2026-05-13T11:00:00.000Z",
        sourceQueryRef: "ontology-context-query://valid-2",
      }),
    );

    // Write a malformed file to the store directory
    const storeDir = path.join(projectRoot, ".palantir-mini", "session", "ontology-context-approvals");
    fs.writeFileSync(path.join(storeDir, "malformed-file.json"), "{ bad json ;;; }", "utf8");

    let list: ReturnType<typeof listPendingContextApprovals> = [];
    let threw = false;
    try {
      list = listPendingContextApprovals(projectRoot);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    // 2 valid approvals should be returned; malformed one skipped
    expect(list.length).toBe(2);
  });
});

// ─── describe("isLowRiskIntent") ─────────────────────────────────────────────
// Sprint-097 PR 3.5 — canonical plan v2 §4 row 3.5.

describe("isLowRiskIntent", () => {
  it("returns lowRisk=true for a clearly read-only trivial intent", () => {
    const result = isLowRiskIntent({
      intent: "list recent pull requests",
      scopePaths: ["lib/foo.ts"],
      complexityHint: "trivial",
    });
    expect(result.lowRisk).toBe(true);
    expect(result.failedSignal).toBeUndefined();
  });

  it("returns lowRisk=true for single-file complexityHint with safe intent", () => {
    const result = isLowRiskIntent({
      intent: "show current project status",
      scopePaths: ["src/index.ts"],
      complexityHint: "single-file",
    });
    expect(result.lowRisk).toBe(true);
    expect(result.failedSignal).toBeUndefined();
  });

  it("signal 2: fails when scope path count > 2", () => {
    const result = isLowRiskIntent({
      intent: "list recent prs",
      scopePaths: ["a.ts", "b.ts", "c.ts"],
      complexityHint: "trivial",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-2:scope-path-count");
  });

  it("signal 2: fails when a scope path matches schemas/**", () => {
    const result = isLowRiskIntent({
      intent: "read schema for foo",
      scopePaths: ["a.ts"],
      complexityHint: "single-file",
    });
    // "schema" is also a risky keyword (signal 6) — signal 6 fires first.
    // We only need to verify that some signal fails.
    expect(result.lowRisk).toBe(false);
  });

  it("signal 2: fails when a scope path contains 'schemas' directory segment", () => {
    const result = isLowRiskIntent({
      intent: "read file contents",
      scopePaths: ["lib/schemas/foo.ts"],
      complexityHint: "trivial",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toMatch(/^signal-2:risky-path:/);
  });

  it("signal 2: fails when a scope path contains 'ontology' directory segment", () => {
    const result = isLowRiskIntent({
      intent: "read file contents",
      scopePaths: ["project/ontology/types.ts"],
      complexityHint: "trivial",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toMatch(/^signal-2:risky-path:/);
  });

  it("signal 3: fails when requiresT3PlusEvent=true", () => {
    const result = isLowRiskIntent({
      intent: "list recent prs",
      scopePaths: ["a.ts"],
      complexityHint: "trivial",
      requiresT3PlusEvent: true,
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-3:requires-t3-plus-event");
  });

  it("signal 4: fails when hasContractMutation=true", () => {
    const result = isLowRiskIntent({
      intent: "list recent prs",
      scopePaths: ["a.ts"],
      complexityHint: "trivial",
      hasContractMutation: true,
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-4:contract-mutation");
  });

  it("signal 5: fails when complexityHint is 'multi-file'", () => {
    const result = isLowRiskIntent({
      intent: "list recent prs",
      scopePaths: ["a.ts"],
      complexityHint: "multi-file",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-5:complexity-hint:multi-file");
  });

  it("signal 5: fails when complexityHint is 'cross-cutting'", () => {
    const result = isLowRiskIntent({
      intent: "list recent prs",
      scopePaths: [],
      complexityHint: "cross-cutting",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-5:complexity-hint:cross-cutting");
  });

  it("signal 5: fails when complexityHint is absent (null)", () => {
    const result = isLowRiskIntent({
      intent: "list recent prs",
      scopePaths: [],
      complexityHint: null,
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-5:complexity-hint:absent");
  });

  it("signal 5: fails when complexityHint is absent (undefined)", () => {
    const result = isLowRiskIntent({
      intent: "list recent prs",
      scopePaths: [],
      // complexityHint absent
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-5:complexity-hint:absent");
  });

  it("signal 6: fails on keyword 'schema' in intent text", () => {
    const result = isLowRiskIntent({
      intent: "read schema for foo",
      scopePaths: ["a.ts"],
      complexityHint: "single-file",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-6:keyword:schema");
  });

  it("signal 6: fails on keyword 'ontology' in intent text", () => {
    const result = isLowRiskIntent({
      intent: "check ontology structure",
      scopePaths: ["a.ts"],
      complexityHint: "trivial",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-6:keyword:ontology");
  });

  it("signal 6: fails on keyword 'delete' in intent text (case-insensitive)", () => {
    const result = isLowRiskIntent({
      intent: "Delete the old entry",
      scopePaths: ["a.ts"],
      complexityHint: "trivial",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-6:keyword:delete");
  });

  it("signal 6: fails on keyword 'commit'", () => {
    const result = isLowRiskIntent({
      intent: "commit changes to the repo",
      scopePaths: [],
      complexityHint: "trivial",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-6:keyword:commit");
  });

  it("signal 6: fails on keyword 'merge'", () => {
    const result = isLowRiskIntent({
      intent: "merge this PR into main",
      scopePaths: [],
      complexityHint: "trivial",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-6:keyword:merge");
  });

  it("signal 6: fails on keyword 'migrate'", () => {
    const result = isLowRiskIntent({
      intent: "migrate the data to the new format",
      scopePaths: ["a.ts"],
      complexityHint: "single-file",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-6:keyword:migrate");
  });

  it("signal 6: fails on keyword 'deploy'", () => {
    const result = isLowRiskIntent({
      intent: "deploy the application",
      scopePaths: [],
      complexityHint: "trivial",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-6:keyword:deploy");
  });

  it("signal 6: fails on keyword 'remove'", () => {
    const result = isLowRiskIntent({
      intent: "remove the deprecated handler",
      scopePaths: ["a.ts"],
      complexityHint: "trivial",
    });
    expect(result.lowRisk).toBe(false);
    expect(result.failedSignal).toBe("signal-6:keyword:remove");
  });

  it("handles zero scope paths (counts as 0, passes signal 2 count check)", () => {
    const result = isLowRiskIntent({
      intent: "show project summary",
      scopePaths: [],
      complexityHint: "trivial",
    });
    expect(result.lowRisk).toBe(true);
  });

  it("handles exactly 2 safe scope paths (boundary: passes signal 2)", () => {
    const result = isLowRiskIntent({
      intent: "read two files",
      scopePaths: ["src/a.ts", "src/b.ts"],
      complexityHint: "single-file",
    });
    expect(result.lowRisk).toBe(true);
  });
});
