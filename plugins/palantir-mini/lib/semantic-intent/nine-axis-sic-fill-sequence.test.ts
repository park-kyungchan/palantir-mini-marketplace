import { describe, expect, it } from "bun:test";
import type { SemanticIntentContract } from "../lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import {
  advanceNineAxisSicSequence,
  advanceNineAxisSicBatch,
  isNineAxisSicComplete,
  nineAxisSicReadinessIssues,
} from "./nine-axis-sic-fill-sequence";
import type { NineAxisSicContract } from "./nine-axis-sic-fill-sequence";

function makeBase(overrides: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
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

describe("advanceNineAxisSicBatch — first-class batched multi-axis fill", () => {
  it("fills T0 + all 9 axes in ONE call and reaches readiness", () => {
    const result = advanceNineAxisSicBatch(makeBase(), {
      intent: "Add nine-axis SIC fill policy to palantir-mini",
      data: { answer: "obj-a, src/foo.ts" },
      logic: { answer: "validate and route intent" },
      action: { answer: "write nine-axis-sic-fill-sequence.ts" },
      governance: { answer: "lead approval required for ontology edits" },
      context: { answer: "lib/semantic-intent, ~/.claude/research" },
      successEval: { answer: "bun run typecheck exits 0 and tests pass" },
      constraintsNonGoals: { answer: "do not touch existing fill sequences" },
      actors: { answer: "lead orchestrates, sonnet implements" },
      memoryPrior: { answer: "context-engineering-to-sic pattern" },
    });

    expect(result.fillComplete).toBe(true);
    expect(isNineAxisSicComplete(result.contract)).toBe(true);
    expect(nineAxisSicReadinessIssues(result.contract)).toHaveLength(0);
    expect(result.appliedTurns).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // One user-sourced fill step per applied turn.
    expect(result.contract.fillSequence?.length).toBe(10);
    for (const step of result.contract.fillSequence ?? []) {
      expect(step.source).toBe("user");
    }
  });

  it("produces axis records byte-identical to 10 sequential per-turn calls", () => {
    const inputs = [
      "Add nine-axis SIC fill policy to palantir-mini",
      "obj-a, src/foo.ts",
      "validate and route intent",
      "write nine-axis-sic-fill-sequence.ts",
      "lead approval required for ontology edits",
      "lib/semantic-intent, ~/.claude/research",
      "bun run typecheck exits 0 and tests pass",
      "do not touch existing fill sequences",
      "lead orchestrates, sonnet implements",
      "context-engineering-to-sic pattern",
    ];
    let seq = makeBase();
    for (let i = 0; i < inputs.length; i++) {
      seq = advanceNineAxisSicSequence(seq, i, inputs[i]);
    }
    const batch = advanceNineAxisSicBatch(makeBase(), {
      intent: inputs[0],
      data: { answer: inputs[1] },
      logic: { answer: inputs[2] },
      action: { answer: inputs[3] },
      governance: { answer: inputs[4] },
      context: { answer: inputs[5] },
      successEval: { answer: inputs[6] },
      constraintsNonGoals: { answer: inputs[7] },
      actors: { answer: inputs[8] },
      memoryPrior: { answer: inputs[9] },
    }).contract;

    // Axes match exactly (the load-bearing readiness surface).
    expect(batch.axes).toEqual((seq as NineAxisSicContract).axes);
    expect(batch.rawIntent).toBe(seq.rawIntent);
    expect(batch.confirmedIntent).toBe(seq.confirmedIntent);
  });

  it("applies a PARTIAL batch and accumulates onto the threaded contract", () => {
    const first = advanceNineAxisSicBatch(makeBase(), {
      intent: "partial intent",
      data: { answer: "obj-a" },
      logic: { answer: "rule X" },
    });
    expect(first.fillComplete).toBe(false);
    expect(first.appliedTurns).toEqual([0, 1, 2]);

    // Thread the contract back; fill the remaining axes in a second batch.
    const second = advanceNineAxisSicBatch(first.contract, {
      action: { answer: "do Y" },
      governance: { answer: "approval Z" },
      context: { answer: "src/a.ts" },
      successEval: { answer: "tests green" },
      constraintsNonGoals: { answer: "no touch" },
      actors: { notApplicable: true },
      memoryPrior: { notApplicable: true },
    });
    expect(second.fillComplete).toBe(true);
    expect(isNineAxisSicComplete(second.contract)).toBe(true);
    // fillSequence accumulated across both batches (3 + 7 = 10).
    expect(second.contract.fillSequence?.length).toBe(10);
    expect((second.contract.axes!.actors.status)).toBe("not-applicable");
  });

  it("input key order does not change applied turn order (canonical T0..T9)", () => {
    const result = advanceNineAxisSicBatch(makeBase(), {
      memoryPrior: { answer: "m" },
      data: { answer: "d" },
      intent: "i",
    });
    expect(result.appliedTurns).toEqual([0, 1, 9]);
  });

  it("propagates per-turn / intent source instead of forging 'user' (provenance, item a)", () => {
    const result = advanceNineAxisSicBatch(makeBase(), {
      intent: "lead-captured intent summary",
      intentSource: "agent",
      data: { answer: "obj-a", source: "agent" },
      logic: { answer: "rule X" }, // absent source ⇒ defaults to "user"
      action: { answer: "do Y", source: "system" },
    });

    const byStep = (n: number) =>
      result.contract.fillSequence!.find((s) => s.step === n)!;
    // T0 intent step honors batch.intentSource.
    expect(byStep(1).source).toBe("agent");
    // T1 data axis honors turn.source.
    expect(byStep(2).source).toBe("agent");
    // T2 logic axis has NO source ⇒ defaults to "user" (byte-identical to prior behavior).
    expect(byStep(3).source).toBe("user");
    // T3 action axis honors turn.source = "system".
    expect(byStep(4).source).toBe("system");
  });

  it("absent source fields keep every step user-sourced (default-preserving)", () => {
    const result = advanceNineAxisSicBatch(makeBase(), {
      intent: "plain user intent",
      data: { answer: "obj-a" },
      logic: { answer: "rule X" },
    });
    for (const step of result.contract.fillSequence ?? []) {
      expect(step.source).toBe("user");
    }
  });
});
