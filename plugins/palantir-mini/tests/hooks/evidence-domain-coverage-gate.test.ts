// palantir-mini — evidence-domain-coverage-gate hook tests (PR 5.15 sprint-126)
//
// Acceptance gates:
//   T1. No active SIC (no events.jsonl)                 → no-op (continue)
//   T2. Active SIC, all domains covered by seed refs    → gate passed (continue)
//   T3. Active SIC, 1 domain uncovered                  → advisory (continue, strike=1)
//   T4. 2nd miss same session                           → blocking (deny, strike=2)
//   T5. PALANTIR_MINI_EVIDENCE_DOMAIN_COVERAGE_BYPASS=1 → bypass (continue, audited)
//   T6. Non-gate tool                                   → immediate no-op (continue)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import { spawnSync } from "child_process";

// ─── Constants ───────────────────────────────────────────────────────────────

const HOOK_SCRIPT = path.resolve(
  import.meta.dirname!,
  "../../hooks/evidence-domain-coverage-gate.ts",
);

const APPLY_EDIT_TOOL = "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function";
const COMMIT_EDITS    = "mcp__plugin_palantir-mini_palantir-mini__commit_edits";
const CODEX_COMMIT_EDITS = "mcp__palantir_mini__commit_edits";
const NON_GATE_TOOL   = "Read";

// ─── Temp dir setup ───────────────────────────────────────────────────────────

let TMP: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-evidence-domain-gate-"));
  const sessionDir = path.join(TMP, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });

  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(sessionDir, "events.jsonl");
  process.env.PALANTIR_MINI_PROJECT     = TMP;

  // Clear bypass
  delete process.env.PALANTIR_MINI_EVIDENCE_DOMAIN_COVERAGE_BYPASS;
});

afterEach(() => {
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
  delete process.env.PALANTIR_MINI_EVIDENCE_DOMAIN_COVERAGE_BYPASS;

  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function runHook(
  payload: unknown,
  extraEnv: Record<string, string> = {},
): {
  exitCode: number;
  stdout:   string;
  stderr:   string;
  result:   Record<string, unknown> | null;
} {
  const envWithTmp = { ...process.env, ...extraEnv };
  const res = spawnSync("bun", ["run", HOOK_SCRIPT], {
    input:    JSON.stringify(payload),
    encoding: "utf8",
    env:      envWithTmp,
    timeout:  15_000,
  });
  let parsed: Record<string, unknown> | null = null;
  if (res.stdout?.trim().length > 0) {
    try {
      parsed = JSON.parse(res.stdout.trim()) as Record<string, unknown>;
    } catch { /* leave null */ }
  }
  return {
    exitCode: res.status ?? 0,
    stdout:   res.stdout ?? "",
    stderr:   res.stderr ?? "",
    result:   parsed,
  };
}

/**
 * Write a semantic_intent_contract_approved event to the events file.
 */
function writeSicEvent(opts: {
  affectedSurfaces?: string[];
  seedRid?:          string;
  ageMsAgo?:         number;
}): void {
  const {
    affectedSurfaces = [".claude/schemas/foo.ts", ".claude/research/bar.md"],
    seedRid          = "seed-001",
    ageMsAgo         = 5_000,
  } = opts;

  const evFile = process.env.PALANTIR_MINI_EVENTS_FILE!;
  const event  = JSON.stringify({
    type:     "semantic_intent_contract_approved",
    when:     new Date(Date.now() - ageMsAgo).toISOString(),
    withWhat: {
      contractId:      "sic-test-001",
      seedRid,
      affectedSurfaces,
      reasoning:       "test SIC for evidence-domain-coverage-gate tests (≥40 chars reasoning)",
    },
  });
  fs.appendFileSync(evFile, event + "\n", "utf8");
}

/**
 * Write an ontology_context_seed_drafted event to the events file.
 */
function writeSeedEvent(opts: {
  seedId?:                 string;
  supportingResearchRefs?: string[];
  ageMsAgo?:               number;
}): void {
  const {
    seedId                = "seed-001",
    supportingResearchRefs = [],
    ageMsAgo              = 3_000,
  } = opts;

  const evFile = process.env.PALANTIR_MINI_EVENTS_FILE!;
  const event  = JSON.stringify({
    type:     "ontology_context_seed_drafted",
    when:     new Date(Date.now() - ageMsAgo).toISOString(),
    withWhat: {
      seedId,
      supportingResearchRefs,
      reasoning: "seed event for evidence-domain-coverage-gate tests",
    },
  });
  fs.appendFileSync(evFile, event + "\n", "utf8");
}

function buildPayload(toolName: string, sessionId = "sess-test-001"): unknown {
  return {
    tool_name:  toolName,
    cwd:        TMP,
    session_id: sessionId,
    tool_input: {},
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("evidence-domain-coverage-gate", () => {

  // T1. No active SIC → no-op
  test("T1: no active SIC → no-op (continue)", () => {
    // events.jsonl is empty (no SIC event)
    const { result } = runHook(buildPayload(APPLY_EDIT_TOOL));
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("no active SIC");
  });

  // T2. Active SIC with all domains covered → gate passed
  test("T2: all domains covered → gate passed (continue)", () => {
    // SIC has affectedSurfaces from .claude/schemas and .claude/research
    writeSicEvent({
      affectedSurfaces: [".claude/schemas/foo.ts", ".claude/research/bar.md"],
      seedRid:          "seed-001",
    });
    // Seed covers both domains
    writeSeedEvent({
      seedId:                "seed-001",
      supportingResearchRefs: [
        ".claude/schemas/ontology-ref.md",
        ".claude/research/browse.md",
      ],
    });

    const { result } = runHook(buildPayload(APPLY_EDIT_TOOL));
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("gate passed");
  });

  // T3. Active SIC, 1 domain uncovered → advisory (continue)
  test("T3: 1 uncovered domain → advisory (continue, strike=1)", () => {
    writeSicEvent({
      affectedSurfaces: [".claude/schemas/foo.ts", ".claude/research/bar.md"],
      seedRid:          "seed-002",
    });
    // Seed only covers .claude/schemas — missing .claude/research
    writeSeedEvent({
      seedId:                "seed-002",
      supportingResearchRefs: [".claude/schemas/ontology-ref.md"],
    });

    const { result, stderr } = runHook(buildPayload(APPLY_EDIT_TOOL));
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("advisory");
    // Should mention the uncovered domain in stderr
    expect(stderr).toContain(".claude/research");
    // Strike count should be 1 (advisory, not blocking)
    expect(stderr).toContain("Strike 1 of 2");
  });

  // T4. 2nd strike → blocking
  test("T4: 2nd miss same session → blocking (deny, strike=2)", () => {
    // Create a stale strikes file with count=1 for same session
    const strikesDir = path.join(TMP, ".palantir-mini", "session");
    fs.mkdirSync(strikesDir, { recursive: true });
    fs.writeFileSync(
      path.join(strikesDir, "evidence-domain-strikes.json"),
      JSON.stringify({ count: 1, sessionId: "sess-test-002", lastMiss: new Date().toISOString() }),
      "utf8",
    );

    writeSicEvent({
      affectedSurfaces: [".claude/schemas/foo.ts", ".claude/research/bar.md"],
      seedRid:          "seed-003",
    });
    // Seed covers nothing
    writeSeedEvent({
      seedId:                "seed-003",
      supportingResearchRefs: [],
    });

    const { result, stderr } = runHook(buildPayload(APPLY_EDIT_TOOL, "sess-test-002"));
    expect(result?.decision).toBe("deny");
    expect(result?.permissionDecision ?? (result?.hookSpecificOutput as Record<string, unknown>)?.["permissionDecision"]).toBe("deny");
    expect(stderr).toContain("BLOCKING");
    expect(stderr).toContain("Strike 2 of 2");
  });

  // T5. Bypass envvar honored
  test("T5: PALANTIR_MINI_EVIDENCE_DOMAIN_COVERAGE_BYPASS=1 → bypass (continue)", () => {
    writeSicEvent({
      affectedSurfaces: [".claude/schemas/foo.ts"],
      seedRid:          "seed-004",
    });
    // No seed refs → would fail without bypass
    writeSeedEvent({ seedId: "seed-004", supportingResearchRefs: [] });

    const { result } = runHook(
      buildPayload(APPLY_EDIT_TOOL),
      { PALANTIR_MINI_EVIDENCE_DOMAIN_COVERAGE_BYPASS: "1" },
    );
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("bypass");
  });

  // T6. Non-gate tool → immediate no-op
  test("T6: non-gate tool → immediate no-op (continue)", () => {
    // Even with a SIC + uncovered domain, non-gate tools are skipped
    writeSicEvent({ affectedSurfaces: [".claude/schemas/foo.ts"], seedRid: "seed-005" });
    writeSeedEvent({ seedId: "seed-005", supportingResearchRefs: [] });

    const { result } = runHook(buildPayload(NON_GATE_TOOL));
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("skipped");
  });

  // Bonus: commit_edits is also gated
  test("commit_edits tool is also gated", () => {
    writeSicEvent({
      affectedSurfaces: [".claude/schemas/foo.ts"],
      seedRid:          "seed-006",
    });
    writeSeedEvent({ seedId: "seed-006", supportingResearchRefs: [] });

    const { result } = runHook(buildPayload(COMMIT_EDITS));
    // Should be advisory (not blocking) on first strike
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("advisory");
  });

  test("Codex commit_edits spelling is also gated", () => {
    writeSicEvent({
      affectedSurfaces: [".claude/schemas/foo.ts"],
      seedRid:          "seed-007",
    });
    writeSeedEvent({ seedId: "seed-007", supportingResearchRefs: [] });

    const { result } = runHook(buildPayload(CODEX_COMMIT_EDITS));
    expect(result?.decision).toBe("continue");
    expect(result?.message).toContain("advisory");
  });
});
