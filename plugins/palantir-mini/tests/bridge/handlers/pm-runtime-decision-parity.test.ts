import { describe, expect, test } from "bun:test";
import type { RuntimeDecision } from "../../../core/contracts/aip-fde-local-surface";
import { pmRuntimeDecisionParity } from "../../../bridge/handlers/pm-runtime-decision-parity";

const DECISION: RuntimeDecision = {
  runtime: "neutral",
  workflowFamily: "runtimeAdapterAndParity",
  phaseId: "runtime-parity:decision-projection",
  requiredContracts: {
    semanticIntent: "required",
    digitalTwinChange: "required",
    workContract: "required",
    userDecisionRecord: "required",
  },
  allowedTools: ["pm_runtime_decision_parity"],
  forbiddenTools: ["unsupported-parity-claim"],
  blockingGates: ["neutral-contract"],
  advisoryGates: ["codex-manual-fallback"],
  decision: "contract_required",
  unsupportedSurfaceRefs: [],
};

describe("pm_runtime_decision_parity", () => {
  test("compares neutral, Claude, and Codex semantic decisions", async () => {
    const result = await pmRuntimeDecisionParity({
      neutral: DECISION,
      claude: { ...DECISION, runtime: "claude" },
      codex: { ...DECISION, runtime: "codex", unsupportedSurfaceRefs: ["codex:subagent-stop"] },
    });

    expect(result.status).toBe("pass");
    expect(result.differences).toEqual([]);
  });
});
