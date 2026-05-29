// palantir-mini — plan-task-dag-validate tests
// Per rule 12 v3.19.1 §Plan-mode authoring requirement + sprint-136.
// Covers: ownerAgent required field + canonical value validation (v3.19.1 extension).
// Also covers: base required DAG fields (runsAfter, parallelEligibleWith, etc.).

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import planTaskDagValidate from "../../hooks/plan-task-dag-validate";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeTmpPlan(content: string): string {
  const dir = path.join(os.tmpdir(), ".claude", "plans");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `test-plan-${Date.now()}.md`);
  const lines = content.split("\n");
  const shouldKeepShort = content.includes("# Short plan") || content.startsWith("Short plan");
  const padded = shouldKeepShort || lines.length > 20
    ? content
    : `${content}\n${Array.from({ length: 21 - lines.length }, (_, i) => `filler ${i + 1}`).join("\n")}`;
  fs.writeFileSync(file, padded, "utf8");
  return file;
}

function makeTmpCanonicalPlan(content: string): string {
  const dir = path.join(os.tmpdir(), ".palantir-mini", "plan");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `test-plan-${Date.now()}.md`);
  const lines = content.split("\n");
  const padded = lines.length > 20
    ? content
    : `${content}\n${Array.from({ length: 21 - lines.length }, (_, i) => `filler ${i + 1}`).join("\n")}`;
  fs.writeFileSync(file, padded, "utf8");
  return file;
}

function buildPayload(filePath: string) {
  return {
    cwd: os.tmpdir(),
    session_id: "test-session",
    tool_name: "Write",
    tool_input: { file_path: filePath },
  };
}

// Full valid DAG section with all required fields including ownerAgent
const VALID_DAG_SECTION = `
# Sprint-N Plan

Some intro text here.

## Task DAG

| id | runsAfter | parallelEligibleWith | ownerAgent | preReservedVersionSlot | worktreeIsolationRequired | riskTier |
|----|-----------|----------------------|------------|------------------------|---------------------------|----------|
| pr-1-rule | [] | [pr-1-hook] | palantir-mini:protocol-designer | (no plugin bump) | true | low |
| pr-1-hook | [] | [pr-1-rule] | palantir-mini:hook-builder | (no plugin bump) | true | low |
| pr-1-ship | [pr-1-rule, pr-1-hook] | [] | palantir-mini:plugin-maintainer | 6.56.0 | false | low |

## Notes

Some notes here.
`.trim();

// DAG section missing ownerAgent column entirely
const DAG_MISSING_OWNER_AGENT = `
# Sprint-N Plan

Some intro text here.

## Task DAG

| id | runsAfter | parallelEligibleWith | preReservedVersionSlot | worktreeIsolationRequired | riskTier |
|----|-----------|----------------------|------------------------|---------------------------|----------|
| pr-1-rule | [] | [pr-1-hook] | (no plugin bump) | true | low |
| pr-1-hook | [] | [pr-1-rule] | (no plugin bump) | true | low |

## Notes

Some notes here.
`.trim();

// DAG section with non-canonical ownerAgent value
const DAG_NON_CANONICAL_OWNER_AGENT = `
# Sprint-N Plan

Some intro text here.

## Task DAG

| id | runsAfter | parallelEligibleWith | ownerAgent | worktreeIsolationRequired | riskTier |
|----|-----------|----------------------|------------|---------------------------|----------|
| pr-1 | [] | [] | general-purpose-agent | true | low |
| pr-2 | [pr-1] | [] | unknown-agent | false | low |

## Notes

Some notes here.
`.trim();

// DAG section missing runsAfter (base field, not ownerAgent)
const DAG_MISSING_BASE_FIELD = `
# Sprint-N Plan

Some intro text here.

## Task DAG

| id | parallelEligibleWith | ownerAgent | worktreeIsolationRequired | riskTier |
|----|----------------------|------------|---------------------------|----------|
| pr-1 | [] | palantir-mini:hook-builder | true | low |

## Notes

Some notes here.
`.trim();

// Plan file with no DAG heading — should skip validation
const PLAN_NO_DAG_HEADING = `
# Some Plan

This plan has no task DAG section.

## Notes

Just notes here.
`.trim();

// ─── tests ────────────────────────────────────────────────────────────────────

describe("plan-task-dag-validate — ownerAgent required field (v3.19.1)", () => {
  let tmpFile: string;
  let savedHome: string | undefined;

  beforeEach(() => {
    savedHome = process.env.HOME;
    process.env.HOME = os.tmpdir();
  });

  afterEach(() => {
    if (tmpFile && fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
    if (savedHome !== undefined) {
      process.env.HOME = savedHome;
    } else {
      delete process.env.HOME;
    }
  });

  test("PASS: full valid DAG with ownerAgent column returns OK message", async () => {
    tmpFile = makeTmpPlan(VALID_DAG_SECTION);
    const result = await planTaskDagValidate(buildPayload(tmpFile));
    expect(result.message).toContain("OK");
    expect(result.message).not.toContain("ADVISORY");
  });

  test("PASS: canonical .palantir-mini/plan file is validated", async () => {
    tmpFile = makeTmpCanonicalPlan(VALID_DAG_SECTION);
    const result = await planTaskDagValidate(buildPayload(tmpFile));
    expect(result.message).toContain("OK");
    expect(result.message).not.toContain("ADVISORY");
  });

  test("ADVISORY: missing ownerAgent column emits plan_missing_owner_agent advisory", async () => {
    tmpFile = makeTmpPlan(DAG_MISSING_OWNER_AGENT);
    const result = await planTaskDagValidate(buildPayload(tmpFile));
    expect(result.message).toContain("ADVISORY");
    expect(result.message).toContain("ownerAgent");
    expect(result.message).toContain("missing required \"ownerAgent\"");
  });

  test("ADVISORY: missing ownerAgent advisory cites rule 12 v3.19.1 and rule 07", async () => {
    tmpFile = makeTmpPlan(DAG_MISSING_OWNER_AGENT);
    const result = await planTaskDagValidate(buildPayload(tmpFile));
    expect(result.message).toContain("rule 12 v3.19.1");
    expect(result.message).toContain("rule 07");
  });

  test("ADVISORY: non-canonical ownerAgent value emits plan_non_canonical_owner_agent advisory", async () => {
    tmpFile = makeTmpPlan(DAG_NON_CANONICAL_OWNER_AGENT);
    const result = await planTaskDagValidate(buildPayload(tmpFile));
    expect(result.message).toContain("ADVISORY");
    expect(result.message).toContain("non-canonical ownerAgent");
    expect(result.message).toContain("general-purpose-agent");
  });

  test("ADVISORY: non-canonical advisory lists canonical owner agent values", async () => {
    tmpFile = makeTmpPlan(DAG_NON_CANONICAL_OWNER_AGENT);
    const result = await planTaskDagValidate(buildPayload(tmpFile));
    expect(result.message).toContain("palantir-mini:hook-builder");
    expect(result.message).toContain("palantir-mini:plugin-maintainer");
    expect(result.message).toContain("palantir-mini:protocol-designer");
  });

  test("ADVISORY: missing base DAG field (runsAfter) emits plan_missing_dag_annotation advisory", async () => {
    tmpFile = makeTmpPlan(DAG_MISSING_BASE_FIELD);
    const result = await planTaskDagValidate(buildPayload(tmpFile));
    expect(result.message).toContain("ADVISORY");
    expect(result.message).toContain("missing required annotation fields");
    expect(result.message).toContain("runsAfter");
  });

  test("SKIP: plan file with no DAG heading skips validation", async () => {
    tmpFile = makeTmpPlan(PLAN_NO_DAG_HEADING);
    const result = await planTaskDagValidate(buildPayload(tmpFile));
    expect(result.message).toContain("no");
    expect(result.message).not.toContain("ADVISORY");
  });

  test("SKIP: short file (≤20 LOC) skips validation", async () => {
    tmpFile = makeTmpPlan("Short plan\n\n## Task DAG\n| id | ownerAgent |\n|---|---|\n");
    const result = await planTaskDagValidate(buildPayload(tmpFile));
    expect(result.message).toContain("skipped");
  });

  test("SKIP: non-plans/ file is ignored", async () => {
    const tmpDir = os.tmpdir();
    const nonPlanFile = path.join(tmpDir, "not-a-plan.md");
    fs.writeFileSync(nonPlanFile, VALID_DAG_SECTION, "utf8");
    const result = await planTaskDagValidate({
      cwd: tmpDir,
      session_id: "test-session",
      tool_name: "Write",
      tool_input: { file_path: nonPlanFile },
    });
    expect(result.message).toContain("skipped");
    fs.unlinkSync(nonPlanFile);
  });

  test("BYPASS: PALANTIR_MINI_DAG_VALIDATE_BYPASS=1 skips all checks", async () => {
    tmpFile = makeTmpPlan(DAG_MISSING_OWNER_AGENT);
    const orig = process.env.PALANTIR_MINI_DAG_VALIDATE_BYPASS;
    process.env.PALANTIR_MINI_DAG_VALIDATE_BYPASS = "1";
    try {
      const result = await planTaskDagValidate(buildPayload(tmpFile));
      expect(result.message).toContain("BYPASS");
      expect(result.message).not.toContain("ADVISORY");
    } finally {
      if (orig === undefined) {
        delete process.env.PALANTIR_MINI_DAG_VALIDATE_BYPASS;
      } else {
        process.env.PALANTIR_MINI_DAG_VALIDATE_BYPASS = orig;
      }
    }
  });
});
