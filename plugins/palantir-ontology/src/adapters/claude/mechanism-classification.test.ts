// Permanent regression for src/adapters/claude/mechanism-classification.ts
// (ledger row A630, validation-contract item 2: "No Claude hook/skill/agent
// mechanism is treated as a semantic-decision or mutation-authority
// source; each is classified under ControlPlaneNodeKind"). Colocated (not
// under tests/adapters/**) because this row's exact write set does not
// include tests/adapters/** (decisions/w6-write-set-adjudication.md item 2
// grants it to A610 only).

import { describe, expect, test } from "bun:test";
import { isPrimitiveKind } from "../../altitude1/staged-construction";
import { isControlPlaneNodeKind } from "../../control-plane/types";
import { FORBIDDEN_SEMANTIC_FIELD_TERMS } from "../shared";
import { CLAUDE_BINDING } from "./binding.generated";
import { CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND, classifyClaudeMechanism } from "./mechanism-classification";

describe("Claude hook/skill/agent mechanisms classify as ControlPlaneNodeKind, never a product primitive or mutation-authority source", () => {
  test('hooks -> "hook", skillsCommands -> "skill", subagents -> "agent" (the 3 ADR-007 mechanism areas)', () => {
    expect(classifyClaudeMechanism("hooks")).toBe("hook");
    expect(classifyClaudeMechanism("skillsCommands")).toBe("skill");
    expect(classifyClaudeMechanism("subagents")).toBe("agent");
  });

  test("every mapped kind is a registered ControlPlaneNodeKind", () => {
    for (const kind of Object.values(CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND)) {
      expect(isControlPlaneNodeKind(kind)).toBe(true);
    }
  });

  test("every mapped kind is disjoint from the product-primitive PrimitiveKind vocabulary (never ObjectType/ActionType/Function/etc.)", () => {
    for (const kind of Object.values(CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND)) {
      expect(isPrimitiveKind(kind)).toBe(false);
    }
  });

  test("areas with no lifecycle-control mechanism analog classify as undefined, not a guessed kind", () => {
    for (const area of ["packagingManifest", "mcpRegistration", "reloadInstall", "schemaFlatLimits", "configSurfaces"] as const) {
      expect(classifyClaudeMechanism(area)).toBeUndefined();
    }
  });

  test("CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND carries exactly the 3 mapped areas, no more", () => {
    expect(Object.keys(CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND).sort()).toEqual(["hooks", "skillsCommands", "subagents"].sort());
  });

  test("CLAUDE_BINDING's own JSON text carries no forbidden semantic-decision field term (mutation-authority never leaks into this binding)", () => {
    const json = JSON.stringify(CLAUDE_BINDING);
    for (const term of FORBIDDEN_SEMANTIC_FIELD_TERMS) {
      expect(json.includes(term)).toBe(false);
    }
  });
});
