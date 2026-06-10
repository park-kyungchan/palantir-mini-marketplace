import { describe, expect, it } from "bun:test";
import type { SemanticIntentContract } from "../lead-intent/contracts";
import type { NineAxisSicContract } from "./nine-axis-sic-fill-sequence";
import type { SemanticIntentAxes, SicAxis } from "#schemas/ontology/primitives/semantic-intent-contract";
import {
  changeMode,
  generatePlan,
  loadDocumentation,
  manageContext,
  requestClarification,
} from "./agent-skill-mechanics";

function makeBase(overrides: Partial<SemanticIntentContract> = {}): SemanticIntentContract {
  return {
    contractId: "semantic-intent:test-agent-skill",
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

function axis(status: SicAxis["status"], summary = ""): SicAxis {
  return { summary, refs: [], status };
}

function axes(over: Partial<SemanticIntentAxes> = {}): SemanticIntentAxes {
  return {
    data: axis("open"),
    logic: axis("open"),
    action: axis("open"),
    governance: axis("open"),
    context: axis("open"),
    successEval: axis("open"),
    constraintsNonGoals: axis("open"),
    actors: axis("open"),
    memoryPrior: axis("open"),
    ...over,
  };
}

describe("agent-skill-mechanics", () => {
  it("requestClarification returns a blocking card naming the unresolved axis + ambiguity", () => {
    const m = requestClarification("data", "어떤 객체인지 불명확");
    expect(m.skill).toBe("request-clarification");
    expect(m.card.blocking).toBe(true);
    expect(m.card.phase).toBe("data");
    expect(m.card.decisionId).toBe("agent-skill:request-clarification:data");
    expect(m.card.whyItMatters).toContain("어떤 객체인지 불명확");
    expect(m.card.choices.map((c) => c.choiceId)).toContain("not-applicable");
    // purity: same input → deep-equal output.
    expect(requestClarification("data", "어떤 객체인지 불명확")).toEqual(m);
  });

  it("generatePlan projects per-axis one-liners and lists only open axes as open items", () => {
    const contract = makeBase({
      confirmedIntent: "도서 대출 흐름",
      axes: axes({
        data: axis("filled", "회원, 책, 대출기록"),
        governance: axis("not-applicable"),
      }),
    }) as NineAxisSicContract;
    const m = generatePlan(contract);
    expect(m.skill).toBe("generate-plan");
    expect(m.intentSummary).toContain("도서 대출 흐름");
    expect(m.axisLines).toHaveLength(9);
    expect(m.axisLines[0]).toContain("회원, 책, 대출기록");
    // governance is N/A → not open; data is filled → not open; the other 7 stay open.
    expect(m.openItems).toHaveLength(7);
    expect(m.openItems.join(" ")).not.toContain("Governance");
    expect(m.openItems.join(" ")).not.toContain("Data");
    // purity: same input → deep-equal output (no mutation).
    expect(generatePlan(contract)).toEqual(m);
  });

  it("changeMode returns the mode target descriptor", () => {
    const m = changeMode("ontology-editing");
    expect(m).toEqual({ skill: "change-mode", targetMode: "ontology-editing" });
  });

  it("loadDocumentation returns a bounded doc-ref descriptor (copied, not aliased)", () => {
    const refs = ["docs/a.md", "docs/b.md"];
    const m = loadDocumentation(refs);
    expect(m).toEqual({ skill: "load-documentation", docRefs: ["docs/a.md", "docs/b.md"] });
    // pure projection must not alias the caller's array.
    refs.push("docs/c.md");
    expect(m.docRefs).toHaveLength(2);
  });

  it("manageContext returns the context-scope descriptor (copied, not aliased)", () => {
    const scope = ["axes.data", "axes.logic"];
    const m = manageContext(scope);
    expect(m).toEqual({ skill: "manage-context", contextScope: ["axes.data", "axes.logic"] });
    scope.push("axes.action");
    expect(m.contextScope).toHaveLength(2);
  });
});
