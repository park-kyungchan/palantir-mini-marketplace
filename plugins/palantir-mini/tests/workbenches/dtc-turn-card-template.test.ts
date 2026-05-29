import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateDtcApprovalCardText } from "../../lib/ontology-engineering-response-template";

const PLUGIN_ROOT = join(import.meta.dir, "..", "..");
const TEMPLATE_PATH = join(
  PLUGIN_ROOT,
  "workbenches",
  "hitl-lead-feedback",
  "templates",
  "dtc-turn-card.md",
);

describe("DTC turn card template", () => {
  test("states that rawIntent is trace identity only and DTC needs approved FDE source material", () => {
    const template = readFileSync(TEMPLATE_PATH, "utf8");

    expect(template).toContain("## sourceMaterialGuard");
    expect(template).toContain("`rawIntent` is trace identity only");
    expect(template).toContain("approved SIC ref");
    expect(template).toContain("FDE session ref");
    expect(template).toContain("ContextEngineeringPlan review cards");
    expect(template).toContain("technologyRecommendation");
    expect(template).toContain("validationPlan");
    expect(template).toContain("mark the DTC unready instead of filling from the raw prompt");
    expect(template).toContain("prompt를 바로 실행하지 않습니다");
    expect(template).toContain("ContextEngineeringPlan(DATA/LOGIC/ACTION)");
    expect(template).toContain("검증 계획");
    expect(template).toContain("ontologyDtcBuildGuard");
    expect(template).toContain('fillPolicy: "ontology-dtc-build"');
    expect(template).toContain("T0 ObjectType readiness");
    expect(template).toContain("T1 LinkType readiness");
    expect(template).toContain("T2 ActionType readiness");
    expect(template).toContain("T3 Function readiness");
    expect(template).toContain("T4 Chatbot/Application State readiness");
    expect(template).toContain("T5 Replay/Eval/Validation readiness");
    expect(template).toContain("T6 ready-for-DTC verdict");
    expect(validateDtcApprovalCardText(template)).toEqual([]);
  });
});
