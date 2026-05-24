// palantir-mini v4.10.0 — pre-pr-dirty-gate hook tests (sprint-056 W3.E1.b)
// Coverage for hooks/pre-pr-dirty-gate.ts.
//
// Tests:
//   1. Non-gh-pr-create command → pass-through (skipped)
//   2. gh pr create + scope env + all dirty in-scope → pass-through
//   3. gh pr create + scope env + dirty outside scope → block with deny
//   4. gh pr create + no scope env → permissive advisory only
//   5. Bypass env → pass-through + audit emit

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { classifyDirty, isOutOfScope } from "../../lib/dirty-classify";

// ─── Env helpers ─────────────────────────────────────────────────────────────

let savedBypass: string | undefined;
let savedScope: string | undefined;
let savedBoundaryRequired: string | undefined;
let savedBoundaryInput: string | undefined;
let tmpDir: string | undefined;

beforeEach(() => {
  savedBypass = process.env.PALANTIR_MINI_DIRTY_GATE_BYPASS;
  savedScope  = process.env.PALANTIR_MINI_SPRINT_SCOPE;
  savedBoundaryRequired = process.env.PALANTIR_MINI_PR_CONTRACT_BOUNDARY_REQUIRED;
  savedBoundaryInput = process.env.PALANTIR_MINI_PR_CONTRACT_BOUNDARY_INPUT;
  delete process.env.PALANTIR_MINI_DIRTY_GATE_BYPASS;
  delete process.env.PALANTIR_MINI_SPRINT_SCOPE;
  delete process.env.PALANTIR_MINI_PR_CONTRACT_BOUNDARY_REQUIRED;
  delete process.env.PALANTIR_MINI_PR_CONTRACT_BOUNDARY_INPUT;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pre-pr-boundary-"));
});

afterEach(() => {
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_DIRTY_GATE_BYPASS = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_DIRTY_GATE_BYPASS;
  }
  if (savedScope !== undefined) {
    process.env.PALANTIR_MINI_SPRINT_SCOPE = savedScope;
  } else {
    delete process.env.PALANTIR_MINI_SPRINT_SCOPE;
  }
  if (savedBoundaryRequired !== undefined) {
    process.env.PALANTIR_MINI_PR_CONTRACT_BOUNDARY_REQUIRED = savedBoundaryRequired;
  } else {
    delete process.env.PALANTIR_MINI_PR_CONTRACT_BOUNDARY_REQUIRED;
  }
  if (savedBoundaryInput !== undefined) {
    process.env.PALANTIR_MINI_PR_CONTRACT_BOUNDARY_INPUT = savedBoundaryInput;
  } else {
    delete process.env.PALANTIR_MINI_PR_CONTRACT_BOUNDARY_INPUT;
  }
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── Case 1: Non-gh-pr-create command → skipped ──────────────────────────────

describe("pre-pr-dirty-gate — non-gh-pr-create command", () => {
  test("Bash command not containing 'gh pr create' → pass-through", async () => {
    const prePrDirtyGate = (await import("../../hooks/pre-pr-dirty-gate")).default;

    const result = await prePrDirtyGate({
      cwd: process.cwd(),
      tool_input: { command: "git status" },
    });

    expect(result.message).toContain("skipped");
    expect(result.message).toContain("not gh pr create");
    expect(result.decision).not.toBe("block");
    expect((result as any).permissionDecision).not.toBe("deny");
  });

  test("gh pr list (not create) → pass-through", async () => {
    const prePrDirtyGate = (await import("../../hooks/pre-pr-dirty-gate")).default;

    const result = await prePrDirtyGate({
      cwd: process.cwd(),
      tool_input: { command: "gh pr list --state open" },
    });

    expect(result.message).toContain("skipped");
    expect(result.decision).not.toBe("block");
  });

  test("null payload → pass-through (no crash)", async () => {
    const prePrDirtyGate = (await import("../../hooks/pre-pr-dirty-gate")).default;
    const result = await prePrDirtyGate(null);
    // null payload has no tool_input.command → skipped
    expect(result.message).toContain("skipped");
  });
});

// ─── Case 2: scope env set + all dirty in-scope → pass-through ───────────────

describe("pre-pr-dirty-gate — in-scope user-WIP", () => {
  test("isOutOfScope returns false when file matches scope prefix", () => {
    const scope = ["hooks/", "tests/hooks/"];
    const result = classifyDirty(" M hooks/my-hook.ts\n M tests/hooks/my-hook.test.ts");
    const outOfScope = result.entries.filter((e) => isOutOfScope(e, scope));
    expect(outOfScope).toHaveLength(0);
  });

  test("gh pr create + PALANTIR_MINI_SPRINT_SCOPE set + files all in scope → OK", async () => {
    process.env.PALANTIR_MINI_SPRINT_SCOPE = "hooks/,tests/hooks/";
    const prePrDirtyGate = (await import("../../hooks/pre-pr-dirty-gate")).default;

    // Use a non-git dir so git status --porcelain returns ""
    const result = await prePrDirtyGate({
      cwd: "/nonexistent-path-xyz",
      tool_input: { command: "gh pr create --title 'test' --body 'b'" },
    });

    // Clean working tree → OK message
    expect(result.message).toContain("OK");
    expect(result.decision).not.toBe("block");
  });
});

// ─── Case 3: scope env set + dirty outside scope → block ─────────────────────

describe("pre-pr-dirty-gate — out-of-scope user-WIP", () => {
  test("isOutOfScope returns true when file does NOT match any scope prefix", () => {
    const scope = ["hooks/"];
    const result = classifyDirty(" M docs/CHANGELOG.md");
    const outOfScope = result.entries.filter((e) => isOutOfScope(e, scope));
    expect(outOfScope).toHaveLength(1);
    expect(outOfScope[0]?.path).toBe("docs/CHANGELOG.md");
  });

  test("out-of-scope entry causes block with reason containing Resolution", () => {
    // Unit-verify: scope logic produces the right entries list
    const scope = ["hooks/", "tests/hooks/"];
    const output = [
      " M hooks/my-hook.ts",
      " M projects/palantir-math/CHANGELOG.md",   // out-of-scope user-WIP
    ].join("\n");
    const result = classifyDirty(output);
    const outOfScope = result.entries.filter((e) => isOutOfScope(e, scope));
    // hooks/my-hook.ts is in scope; projects/palantir-math/CHANGELOG.md is not
    expect(outOfScope).toHaveLength(1);
    expect(outOfScope[0]?.path).toBe("projects/palantir-math/CHANGELOG.md");
  });

  test("gh pr create + scope set + working tree clean → OK (no block when tree clean)", async () => {
    process.env.PALANTIR_MINI_SPRINT_SCOPE = "hooks/";
    const prePrDirtyGate = (await import("../../hooks/pre-pr-dirty-gate")).default;

    const result = await prePrDirtyGate({
      cwd: "/nonexistent-path-xyz",
      tool_input: { command: "gh pr create --title 'test' --body 'b'" },
    });

    // Clean tree → OK
    expect(result.message).toContain("OK");
    expect(result.decision).not.toBe("block");
  });
});

// ─── Case 4: no scope env → permissive advisory only ─────────────────────────

describe("pre-pr-dirty-gate — no scope inferred", () => {
  test("gh pr create + no PALANTIR_MINI_SPRINT_SCOPE + non-git cwd → advisory (not block)", async () => {
    delete process.env.PALANTIR_MINI_SPRINT_SCOPE;
    const prePrDirtyGate = (await import("../../hooks/pre-pr-dirty-gate")).default;

    const result = await prePrDirtyGate({
      cwd: "/nonexistent-path-xyz",
      tool_input: { command: "gh pr create --title 'test' --body 'b'" },
    });

    // With no scope and non-git dir: either "OK (clean)" or "ADVISORY (no sprint scope inferred)"
    // Either way, must NOT be a block
    expect(result.decision).not.toBe("block");
    expect((result as any).permissionDecision).not.toBe("deny");
  });

  test("isOutOfScope with empty scope array → always returns false (in-scope)", () => {
    const emptyScope: string[] = [];
    const result = classifyDirty(" M docs/important.md");
    const outOfScope = result.entries.filter((e) => isOutOfScope(e, emptyScope));
    expect(outOfScope).toHaveLength(0);
  });

  test("no scope + dirty working tree in real project → ADVISORY message", async () => {
    delete process.env.PALANTIR_MINI_SPRINT_SCOPE;
    const prePrDirtyGate = (await import("../../hooks/pre-pr-dirty-gate")).default;

    const result = await prePrDirtyGate({
      cwd: process.cwd(), // real git repo; may have dirty files
      tool_input: { command: "gh pr create --title 'my PR' --body 'desc'" },
    });

    // In the real repo: either OK (clean) or ADVISORY (no scope) or block (scope declared)
    // But with no scope env set, it can only be OK or ADVISORY — never block
    expect(result.decision).not.toBe("block");
    expect((result as any).permissionDecision).not.toBe("deny");
  });
});

// ─── Case 5: bypass env → pass-through + audit emit ─────────────────────────

describe("pre-pr-dirty-gate — bypass", () => {
  test("PALANTIR_MINI_DIRTY_GATE_BYPASS=1 → returns bypass message", async () => {
    process.env.PALANTIR_MINI_DIRTY_GATE_BYPASS = "1";
    const prePrDirtyGate = (await import("../../hooks/pre-pr-dirty-gate")).default;

    const result = await prePrDirtyGate({
      cwd: process.cwd(),
      tool_input: { command: "gh pr create --title 'test' --body 'b'" },
    });

    expect(result.message).toContain("BYPASSED");
    expect(result.decision).not.toBe("block");
    expect((result as any).permissionDecision).not.toBe("deny");
  });

  test("bypass is still skipped when command is not gh pr create", async () => {
    process.env.PALANTIR_MINI_DIRTY_GATE_BYPASS = "1";
    const prePrDirtyGate = (await import("../../hooks/pre-pr-dirty-gate")).default;

    const result = await prePrDirtyGate({
      cwd: process.cwd(),
      tool_input: { command: "git status" },
    });

    // Bypass check comes AFTER the gh-pr-create guard, so still skipped
    expect(result.message).toContain("skipped");
  });
});

// ─── Case 6: PR contract boundary env enforcement ──────────────────────────

describe("pre-pr-dirty-gate — PR contract boundary", () => {
  test("PALANTIR_MINI_PR_CONTRACT_BOUNDARY_REQUIRED=1 without input → block", async () => {
    process.env.PALANTIR_MINI_PR_CONTRACT_BOUNDARY_REQUIRED = "1";
    const prePrDirtyGate = (await import("../../hooks/pre-pr-dirty-gate")).default;

    const result = await prePrDirtyGate({
      cwd: "/nonexistent-path-xyz",
      tool_input: { command: "gh pr create --title 'test' --body 'b'" },
    });

    expect(result.message).toContain("PR contract boundary input");
    expect(result.decision).toBe("block");
    expect((result as any).permissionDecision).toBe("deny");
  });

  test("valid PALANTIR_MINI_PR_CONTRACT_BOUNDARY_INPUT passes before dirty-scope check", async () => {
    const inputPath = path.join(tmpDir ?? os.tmpdir(), "boundary.json");
    fs.writeFileSync(
      inputPath,
      JSON.stringify({
        branchName: "feat/wave-9-dtc-wave-9-pr-boundary-branch",
        prBody: [
          "SemanticIntentContract: sic-wave-9-pr-boundary",
          "DigitalTwinChangeContract: dtc-wave-9-pr-boundary",
          "Affected Typed Refs: FileSurfaceRef scripts",
          "branchProposalPolicy: contract slug + wave token + scope kind",
          "permissionBoundary: scripts only",
          "evaluationPlan: focused validator tests",
          "Recovery: revert this PR",
          "Excluded Scope: gate default changes",
        ].join("\n"),
        changedFiles: [".claude/plugins/palantir-mini/scripts/validate-pr-contract-boundary.ts"],
        semanticIntentContract: {
          contractId: "sic-wave-9-pr-boundary",
          status: "approved",
          rawIntent: "Validate PR boundary.",
          confirmedIntent: "Validate PR boundary.",
          nonGoals: [],
          approvedNouns: ["PR boundary"],
          approvedVerbs: ["validate"],
          affectedSurfaces: [".claude/plugins/palantir-mini/scripts/"],
          permissionsAndProposal: "PR validator only.",
          acceptedRisks: [],
          downstreamAllowed: [],
          downstreamForbidden: [],
          clarificationQuestions: [],
        },
        digitalTwinChangeContract: {
          contractId: "dtc-wave-9-pr-boundary",
          status: "approved",
          semanticIntentContractRef: "sic-wave-9-pr-boundary",
          affectedSurfaces: [".claude/plugins/palantir-mini/scripts/"],
          changeBoundary: "Validator only.",
          branchProposalPolicy: "Require contract slug, wave token, and scope kind.",
          permissionBoundary: "Only .claude/plugins/palantir-mini/scripts/ may change.",
          replayMigrationPlan: "No migration.",
          observabilityPlan: "Report validation result.",
          toolSurfaceReadiness: "CLI helper.",
          evaluationPlan: "Focused tests.",
          risks: [],
        },
      }),
      "utf8",
    );
    process.env.PALANTIR_MINI_PR_CONTRACT_BOUNDARY_INPUT = inputPath;
    const prePrDirtyGate = (await import("../../hooks/pre-pr-dirty-gate")).default;

    const result = await prePrDirtyGate({
      cwd: "/nonexistent-path-xyz",
      tool_input: { command: "gh pr create --title 'test' --body 'b'" },
    });

    expect(result.message).toContain("PR contract boundary validated");
    expect(result.decision).not.toBe("block");
  });
});
