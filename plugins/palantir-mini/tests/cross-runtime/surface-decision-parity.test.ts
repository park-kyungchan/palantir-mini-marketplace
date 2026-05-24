import { describe, expect, test } from "bun:test";
import type { RuntimeDecision } from "../../core/contracts/aip-fde-local-surface";
import { compareRuntimeDecisionParity } from "../../lib/runtime/surface-decision-parity";

const REQUIRED_CONTRACTS = {
  semanticIntent: "required",
  digitalTwinChange: "required",
  workContract: "required",
  userDecisionRecord: "required",
} as const;

const NEUTRAL_DECISION: RuntimeDecision = {
  runtime: "neutral",
  workflowFamily: "runtimeAdapterAndParity",
  phaseId: "runtime-parity:decision-projection",
  requiredContracts: REQUIRED_CONTRACTS,
  allowedTools: ["pm_semantic_intent_gate"],
  forbiddenTools: ["direct-main-push"],
  blockingGates: ["approved-dtc"],
  advisoryGates: ["codex-subagent-stop-gap"],
  decision: "contract_required",
  unsupportedSurfaceRefs: [],
  evalRequirementRefs: ["eval:runtime-decision-parity"],
  replayRequirementRefs: ["replay:workflow-family-e2e"],
  lineageRequirementRefs: ["lineage:prompt-front-door"],
  outputContractRefs: ["SurfaceDecisionCard"],
};

describe("surface decision parity", () => {
  test("passes when semantic decisions match even if unsupported runtime surfaces differ", () => {
    const result = compareRuntimeDecisionParity({
      neutral: NEUTRAL_DECISION,
      claude: { ...NEUTRAL_DECISION, runtime: "claude", unsupportedSurfaceRefs: [] },
      codex: {
        ...NEUTRAL_DECISION,
        runtime: "codex",
        unsupportedSurfaceRefs: ["codex:subagent-stop"],
      },
    });

    expect(result.status).toBe("pass");
    expect(result.differences).toEqual([]);
    expect(result.allowedRuntimeSpecificFields).toContain("unsupportedSurfaceRefs");
  });

  test("fails when a runtime changes mutation authorization semantics", () => {
    const result = compareRuntimeDecisionParity({
      neutral: NEUTRAL_DECISION,
      claude: { ...NEUTRAL_DECISION, runtime: "claude" },
      codex: { ...NEUTRAL_DECISION, runtime: "codex", decision: "allow" },
    });

    expect(result.status).toBe("fail");
    expect(result.differences.map((diff) => diff.field)).toContain("decision");
  });
});
