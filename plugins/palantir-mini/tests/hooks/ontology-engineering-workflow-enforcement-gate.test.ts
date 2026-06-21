import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { assessOntologyEngineeringWorkflowHook } from "../../hooks/ontology-engineering-workflow-enforcement-gate";
import {
  ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
  type OntologyEngineeringWorkflowState,
  writeOntologyEngineeringWorkflowState,
} from "../../lib/ontology-engineering-workflow";

let projectRoot = "";

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-oe-workflow-hook-"));
  fs.mkdirSync(path.join(projectRoot, ".palantir-mini"), { recursive: true });
});

afterEach(() => {
  if (projectRoot.length > 0) {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

function legacyToolName(): string {
  return ["request", "user", "input"].join("_");
}

function legacyScanPattern(): string {
  return [
    ["Ask", "User", "Question"].join(""),
    ["request", "user", "input"].join("_"),
    ["manual", "review", "card"].join("-"),
    ["ask", "UserQuestionQueue"].join(""),
    ["ask", "UserQuestionPayload"].join(""),
    ["runtime", "QuestionUi"].join(""),
  ].join("|");
}

function writeWorkflowState(mutationAuthorized: boolean): void {
  const now = "2026-05-22T00:00:00.000Z";
  const state: OntologyEngineeringWorkflowState = {
    schemaVersion: ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
    contractId: "ontology-engineering-workflow:test",
    projectRoot,
    fdeSessionId: "fde-test",
    fdeSessionRef: "fde-ontology-engineering://session/fde-test",
    semanticIntentContractRef: mutationAuthorized
      ? "semantic-intent:approved:test"
      : "semantic-intent:draft:test",
    semanticIntentContractStatus: mutationAuthorized ? "approved" : "draft",
    digitalTwinChangeContractRef: mutationAuthorized
      ? "digital-twin-change:approved:test"
      : "digital-twin-change:draft:test",
    digitalTwinChangeContractStatus: mutationAuthorized ? "approved" : "draft",
    phase: mutationAuthorized ? "mutation-authorized" : "semantic-contract-drafted",
    allowedNextActions: ["status"],
    mutationAuthorized,
    sourceRefs: ["fde-ontology-engineering://session/fde-test"],
    turnDecisionSpecs: [],
    userDecisionRecords: [],
    decisionLedgerAuditFindings: [],
    createdAt: now,
    updatedAt: now,
  };
  writeOntologyEngineeringWorkflowState(state);
}

describe("ontology-engineering workflow enforcement hook", () => {
  test("advises (does not block) runtime-native question UI tools", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: legacyToolName(),
      tool_input: { prompt: "Choose a workflow decision." },
    });

    // Advisory (suggest-only): detection still fires but the verdict CONTINUES.
    expect(result.decision).toBe("continue");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    expect(result.message).toContain("ADVISORY");
    expect(result.additionalContext).toContain("Advisory");
    expect(result.additionalContext).toContain("turn-card decision queue");
  });

  test("allows read-only validation scans that mention forbidden legacy tokens", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: {
        command: `rg -n "${legacyScanPattern()}" .`,
      },
    });

    expect(result.decision).toBe("continue");
  });

  test("blocks Ontology Engineering SIC authoring before FDE workflow provenance exists", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "mcp__palantir_mini__pm_semantic_intent_gate",
      tool_input: {
        project: projectRoot,
        rawIntent: "Start Ontology Engineering WorkflowContract SIC and DTC for object types.",
      },
    });

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("FDE workflow provenance");
  });

  test("allows workflow start before FDE workflow provenance exists", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "mcp__palantir_mini__pm_ontology_engineering_workflow",
      tool_input: {
        project: projectRoot,
        action: "start",
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.additionalContext).toContain("palantir-mini user requirement prompt response requirements");
    expect(result.additionalContext).toContain("현재 workflow phase");
    expect(result.additionalContext).toContain("선택된 palantir-mini workflow 또는 workflow gap");
    expect(result.additionalContext).toContain("Claude hooks");
  });

  test("blocks protected workflow-surface mutation until workflow state is mutation-authorized", () => {
    writeWorkflowState(false);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(
          projectRoot,
          ".claude/plugins/palantir-mini/hooks/hooks.json",
        ),
      },
    });

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("provenance deny injects the Altitude-1 runbook BROWSE pointer (Stage 01)", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "mcp__palantir_mini__pm_semantic_intent_gate",
      tool_input: {
        project: projectRoot,
        rawIntent: "Start Ontology Engineering WorkflowContract SIC and DTC for object types.",
      },
    });

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      "Runbook: docs/altitude1-runtime-guide/BROWSE.md",
    );
    expect(result.hookSpecificOutput?.additionalContext).toContain("Stage 01 (fde-provenance)");
  });

  test("mutation-unauthorized deny injects the Altitude-1 runbook BROWSE pointer (Stage 05/06)", () => {
    writeWorkflowState(false);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(
          projectRoot,
          ".claude/plugins/palantir-mini/hooks/hooks.json",
        ),
      },
    });

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      "Runbook: docs/altitude1-runtime-guide/BROWSE.md",
    );
    expect(result.hookSpecificOutput?.additionalContext).toContain("Stage 05 (dtc-fill)");
    expect(result.hookSpecificOutput?.additionalContext).toContain("Stage 06 (envelope-advance)");
  });

  test("allows protected workflow-surface mutation after workflow state is mutation-authorized", () => {
    writeWorkflowState(true);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(
          projectRoot,
          ".claude/plugins/palantir-mini/hooks/hooks.json",
        ),
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.additionalContext).toContain("mutationAuthorized=true");
    expect(result.additionalContext).toContain("palantir-mini user requirement prompt response requirements");
    expect(result.additionalContext).toContain("Codex");
  });

  // --- CTX-iii: write-target resolver (decide on RESOLVED target, not VOCABULARY) ---

  test("RELAXATION: a memory-note Write whose content describes an ontology re-bind PASSES", () => {
    // The 2026-06-21 recurrence payload: content body mentions protected surfaces +
    // /ontology/ segment + SIC/DTC, but the resolved write target is a plain .md.
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Write",
      tool_input: {
        file_path: "~/.claude/projects/x/memory/altitude2-rebind.md",
        content:
          "Describes a re-bind touching palantir-mini/lib/ontology-engineering-workflow/ and a " +
          "/ontology/object-type/foo.ts path; SemanticIntentContract DigitalTwinChangeContract palantir-mini/hooks/x.ts.",
      },
    });
    expect(result.decision).toBe("continue");
  });

  test("RELAXATION: an out-of-tree workspace doc Write PASSES", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectRoot, "_workspace/run/plan.md"),
        content: "ontology engineering plan mentioning palantir-mini/hooks/ and semanticintentcontract",
      },
    });
    expect(result.decision).toBe("continue");
  });

  test("RELAXATION: read-only Bash mentioning a protected path PASSES", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: { command: "grep -rn 'palantir-mini/hooks' ." },
    });
    expect(result.decision).toBe("continue");
  });

  test("RELAXATION: OE-marker in content with a plain .md target does NOT block", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectRoot, "plain.md"),
        content: "ontology engineering semanticintentcontract digitaltwinchangecontract",
      },
    });
    expect(result.decision).toBe("continue");
  });

  test("UNDER-BLOCK: genuine protected pm-source Write still hits provenance deny (no FDE)", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectRoot, ".claude/plugins/palantir-mini/hooks/x.ts"),
        content: "anything",
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("FDE workflow provenance");
  });

  test("UNDER-BLOCK: relative protected-surface Edit resolves abs and still blocks", () => {
    writeWorkflowState(false);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: path.join(projectRoot, ".claude/plugins/palantir-mini"),
      tool_name: "Edit",
      tool_input: { file_path: "skills/z/SKILL.md" },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("UNDER-BLOCK: MultiEdit targeting protected lib paths still blocks", () => {
    writeWorkflowState(false);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "MultiEdit",
      tool_input: {
        edits: [
          { file_path: path.join(projectRoot, ".claude/plugins/palantir-mini/lib/lead-intent/a.ts") },
          { file_path: path.join(projectRoot, ".claude/plugins/palantir-mini/lib/fde-ontology-engineering/b.ts") },
        ],
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("UNDER-BLOCK: NotebookEdit on a protected lib path still blocks", () => {
    writeWorkflowState(false);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "NotebookEdit",
      tool_input: {
        notebook_path: path.join(projectRoot, ".claude/plugins/palantir-mini/lib/context-engineering/c.ipynb"),
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("UNDER-BLOCK: project /object-type/ path-class write (no OE marker) still blocks", () => {
    writeWorkflowState(false);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectRoot, "projects/foo/ontology/object-type/bar.ts"),
        content: "no marker here at all",
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });
});
