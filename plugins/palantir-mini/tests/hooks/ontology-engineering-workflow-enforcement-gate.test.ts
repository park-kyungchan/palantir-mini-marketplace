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
  test("blocks runtime-native question UI tools", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: legacyToolName(),
      tool_input: { prompt: "Choose a workflow decision." },
    });

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("runtime-native question UI");
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
});
