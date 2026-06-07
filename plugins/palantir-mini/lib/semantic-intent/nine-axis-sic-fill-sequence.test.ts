import { describe, expect, it } from "bun:test";
import type { SemanticIntentContract } from "../lead-intent/contracts";
import {
  advanceNineAxisSicSequence,
  isNineAxisSicComplete,
  nineAxisSicReadinessIssues,
} from "./nine-axis-sic-fill-sequence";

function makeBase(overrides: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    contractId: "semantic-intent:test-nine-axis",
    status: "draft",
    rawIntent: "",
    confirmedIntent: "",
    nonGoals: [],
    approvedNouns: [],
    approvedVerbs: [],
    affectedSurfaces: [],
    permissionsAndProposal: "",
    acceptedRisks: [],
    downstreamAllowed: [],
    downstreamForbidden: [],
    clarificationQuestions: [],
    ...overrides,
  };
}

describe("nine-axis-sic fill sequence", () => {
  it("completes all 10 turns and passes readiness checks", () => {
    let contract = makeBase();

    // T0 — intent
    contract = advanceNineAxisSicSequence(contract, 0, "Add nine-axis SIC fill policy to palantir-mini");
    // T1-T9 — axes
    contract = advanceNineAxisSicSequence(contract, 1, "obj-a, src/foo.ts");
    contract = advanceNineAxisSicSequence(contract, 2, "validate and route intent");
    contract = advanceNineAxisSicSequence(contract, 3, "write nine-axis-sic-fill-sequence.ts");
    contract = advanceNineAxisSicSequence(contract, 4, "lead approval required for ontology edits");
    contract = advanceNineAxisSicSequence(contract, 5, "lib/semantic-intent, ~/.claude/research");
    contract = advanceNineAxisSicSequence(contract, 6, "bun run typecheck exits 0 and tests pass");
    contract = advanceNineAxisSicSequence(contract, 7, "do not touch existing fill sequences");
    contract = advanceNineAxisSicSequence(contract, 8, "lead orchestrates, sonnet implements");
    contract = advanceNineAxisSicSequence(contract, 9, "context-engineering-to-sic pattern");

    expect(isNineAxisSicComplete(contract)).toBe(true);
    expect(nineAxisSicReadinessIssues(contract)).toHaveLength(0);
    expect(contract.axes!.data.status).toBe("filled");
  });

  it("fails readiness when only T0 is complete", () => {
    let contract = makeBase();
    contract = advanceNineAxisSicSequence(contract, 0, "Only intent filled so far");

    expect(isNineAxisSicComplete(contract)).toBe(false);
    expect(nineAxisSicReadinessIssues(contract).length).toBeGreaterThan(0);
  });

  it("throws RangeError for turns outside T0-T9", () => {
    const contract = makeBase();
    expect(() => advanceNineAxisSicSequence(contract, -1)).toThrow(RangeError);
    expect(() => advanceNineAxisSicSequence(contract, 10)).toThrow(RangeError);
  });
});
