// Permanent regression for src/adapters/gemini/mechanism-classification.ts
// (ledger row A640, mirroring A630's validation-contract item 2 precedent:
// "No Gemini hook/skill/agent mechanism is treated as a semantic-decision
// or mutation-authority source; each is classified under
// ControlPlaneNodeKind"). Colocated (not under tests/adapters/**) because
// this row's exact write set does not include tests/adapters/**
// (decisions/w6-write-set-adjudication.md item 2 grants it to A610 only).

import { describe, expect, test } from "bun:test";
import { isPrimitiveKind } from "../../altitude1/staged-construction";
import { isControlPlaneNodeKind } from "../../control-plane/types";
import { FORBIDDEN_SEMANTIC_FIELD_TERMS } from "../shared";
import { GEMINI_BINDING } from "./binding.generated";
import { GEMINI_MECHANISM_TO_CONTROL_PLANE_KIND, classifyGeminiMechanism } from "./mechanism-classification";

describe("Gemini hook/skill/agent mechanisms classify as ControlPlaneNodeKind, never a product primitive or mutation-authority source", () => {
  test('hooks -> "hook", skillsCommands -> "skill", subagents -> "agent" (the 3 ADR-007 mechanism areas, same 3 A630 mapped for Claude)', () => {
    expect(classifyGeminiMechanism("hooks")).toBe("hook");
    expect(classifyGeminiMechanism("skillsCommands")).toBe("skill");
    expect(classifyGeminiMechanism("subagents")).toBe("agent");
  });

  test("every mapped kind is a registered ControlPlaneNodeKind", () => {
    for (const kind of Object.values(GEMINI_MECHANISM_TO_CONTROL_PLANE_KIND)) {
      expect(isControlPlaneNodeKind(kind)).toBe(true);
    }
  });

  test("every mapped kind is disjoint from the product-primitive PrimitiveKind vocabulary (never ObjectType/ActionType/Function/etc.)", () => {
    for (const kind of Object.values(GEMINI_MECHANISM_TO_CONTROL_PLANE_KIND)) {
      expect(isPrimitiveKind(kind)).toBe(false);
    }
  });

  test("areas with no lifecycle-control mechanism analog classify as undefined, not a guessed kind", () => {
    for (const area of ["packagingManifest", "mcpRegistration", "reloadInstall", "schemaFlatLimits", "configSurfaces"] as const) {
      expect(classifyGeminiMechanism(area)).toBeUndefined();
    }
  });

  test("GEMINI_MECHANISM_TO_CONTROL_PLANE_KIND carries exactly the 3 mapped areas, no more", () => {
    expect(Object.keys(GEMINI_MECHANISM_TO_CONTROL_PLANE_KIND).sort()).toEqual(["hooks", "skillsCommands", "subagents"].sort());
  });

  test("subagents classifies as a ControlPlaneNodeKind mechanism even though R210 records Gemini extension subagents as preview (never promoted to semantic/mutation authority regardless of maturity)", () => {
    const subagentsFact = GEMINI_BINDING.manifest.capabilities.find((c) => c.area === "subagents");
    expect(subagentsFact?.verdicts.primary).toBe("supported");
    expect(classifyGeminiMechanism("subagents")).toBe("agent");
  });

  test("GEMINI_BINDING's own JSON text carries no forbidden semantic-decision field term (mutation-authority never leaks into this binding)", () => {
    const json = JSON.stringify(GEMINI_BINDING);
    for (const term of FORBIDDEN_SEMANTIC_FIELD_TERMS) {
      expect(json.includes(term)).toBe(false);
    }
  });
});
