// Cross-runtime parity suite (ledger row A650, docs/architecture.md
// ADR-007, execution-plan DoD item 9: "Claude, Codex, and Gemini consume
// identical semantic fixtures. Packaging differences are adapter metadata
// only."). See README.md for the full design note.
//
// tests/parity/{codex,claude,gemini}/fixture.test.ts (A620/A630/A640) each
// prove only their OWN runtime's inventory-shape fixture is well-formed and
// traceable to that runtime's own committed binding — every one of those
// three README.md files says explicitly that the actual 3-way comparison is
// this row's job. This file is that comparison.

import { describe, expect, test } from "bun:test";
import { CAPABILITY_AREAS, FORBIDDEN_SEMANTIC_FIELD_TERMS } from "../../../src/adapters/shared";
import {
  CLAUDE_BINDING,
  CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND,
} from "../../../src/adapters/claude";
import {
  CODEX_BINDING,
  CODEX_MECHANISM_TO_CONTROL_PLANE_KIND,
} from "../../../src/adapters/codex";
import {
  GEMINI_BINDING,
  GEMINI_MECHANISM_TO_CONTROL_PLANE_KIND,
} from "../../../src/adapters/gemini";
import { checkAdapterParity } from "../../../scripts/parity-check";
import { resolve } from "node:path";

const ADAPTERS_DIR = resolve(import.meta.dir, "..", "..", "..", "src", "adapters");

// A mutation-shaped tool name is anything that reads as a write/approve/
// commit verb rather than a read-only "queryCapability_<area>" query. None
// of the three generated bindings may ever expose one (ADR-005: every
// protected writer sits behind the single commit gate, never a
// runtime-adapter tool).
const MUTATION_VERB_RE = /mutate|commit|write|propose|dryrun|approve|authorize|delete/i;

function sortedAreas(binding: { manifest: { capabilities: ReadonlyArray<{ area: string }> } }): string[] {
  return [...binding.manifest.capabilities.map((c) => c.area)].sort();
}

function sortedToolNames(binding: { tools: ReadonlyArray<{ name: string }> }): string[] {
  return [...binding.tools.map((t) => t.name)].sort();
}

describe("1. Generated inventories: byte-equivalent across codex/claude/gemini", () => {
  test("capabilityAreas: all three bindings carry exactly the same sorted 8-area set", () => {
    const areas = sortedAreas(CODEX_BINDING);
    expect(areas).toEqual([...CAPABILITY_AREAS].sort());
    expect(sortedAreas(CLAUDE_BINDING)).toEqual(areas);
    expect(sortedAreas(GEMINI_BINDING)).toEqual(areas);
  });

  test("toolNames: all three bindings carry exactly the same sorted queryCapability_<area> set", () => {
    const tools = sortedToolNames(CODEX_BINDING);
    expect(tools).toEqual(CAPABILITY_AREAS.map((a) => `queryCapability_${a}`).sort());
    expect(sortedToolNames(CLAUDE_BINDING)).toEqual(tools);
    expect(sortedToolNames(GEMINI_BINDING)).toEqual(tools);
  });

  test("toolInputSchemaConvention: all three bindings' tools share the identical flat-schema shape", () => {
    for (const binding of [CODEX_BINDING, CLAUDE_BINDING, GEMINI_BINDING]) {
      for (const tool of binding.tools) {
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.required).toEqual(["runtime"]);
        expect(tool.inputSchema.additionalProperties).toBe(false);
      }
    }
  });

  test("manifestFieldKeys: codex and claude carry the identical 8-key core; gemini's only addition is its own documented nativePackaging field (allowed per-runtime metadata, not a shape mismatch)", () => {
    const codexKeys = [...Object.keys(CODEX_BINDING.manifest)].sort();
    const claudeKeys = [...Object.keys(CLAUDE_BINDING.manifest)].sort();
    const geminiKeys = [...Object.keys(GEMINI_BINDING.manifest)].sort();

    expect(claudeKeys).toEqual(codexKeys);
    expect(geminiKeys.filter((k) => k !== "nativePackaging")).toEqual(codexKeys);
    expect(geminiKeys).toContain("nativePackaging");
    expect(codexKeys).not.toContain("nativePackaging");
    expect(claudeKeys).not.toContain("nativePackaging");
  });
});

describe("2. Semantic decisions: mechanism-to-ControlPlaneNodeKind classification is byte-identical across runtimes", () => {
  const EXPECTED = { hooks: "hook", skillsCommands: "skill", subagents: "agent" } as const;

  test("codex/claude/gemini's mechanism-classification maps are deep-equal to each other", () => {
    expect(CODEX_MECHANISM_TO_CONTROL_PLANE_KIND).toEqual(CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND);
    expect(CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND).toEqual(GEMINI_MECHANISM_TO_CONTROL_PLANE_KIND);
  });

  test("codex/claude/gemini's mechanism-classification maps are deep-equal to the fixed expected literal", () => {
    expect(CODEX_MECHANISM_TO_CONTROL_PLANE_KIND).toEqual(EXPECTED);
    expect(CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND).toEqual(EXPECTED);
    expect(GEMINI_MECHANISM_TO_CONTROL_PLANE_KIND).toEqual(EXPECTED);
  });

  test("the ControlPlaneNodeKind a mechanism classifies under does not depend on which runtime is asked, even though each runtime's native mechanism name differs", () => {
    for (const area of ["hooks", "skillsCommands", "subagents"] as const) {
      const codexKind = CODEX_MECHANISM_TO_CONTROL_PLANE_KIND[area];
      const claudeKind = CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND[area];
      const geminiKind = GEMINI_MECHANISM_TO_CONTROL_PLANE_KIND[area];
      expect(codexKind).toBe(claudeKind);
      expect(claudeKind).toBe(geminiKind);
    }
  });
});

describe("3. Reason codes / mutation denials: identical absence across all three bindings", () => {
  test("none of the three bindings' JSON text contains any FORBIDDEN_SEMANTIC_FIELD_TERMS entry", () => {
    for (const [runtime, binding] of [
      ["codex", CODEX_BINDING],
      ["claude", CLAUDE_BINDING],
      ["gemini", GEMINI_BINDING],
    ] as const) {
      const text = JSON.stringify(binding);
      for (const term of FORBIDDEN_SEMANTIC_FIELD_TERMS) {
        expect(text.includes(term)).toBe(false);
      }
      expect(runtime.length).toBeGreaterThan(0); // keep `runtime` used for the failure-message context above
    }
  });

  test("none of the three bindings' tool-name sets contains any mutation-verb-shaped tool", () => {
    for (const binding of [CODEX_BINDING, CLAUDE_BINDING, GEMINI_BINDING]) {
      const mutationShaped = binding.tools.filter((t) => MUTATION_VERB_RE.test(t.name));
      expect(mutationShaped).toEqual([]);
    }
  });

  test("all three bindings deny mutation identically: zero mutation-capable tools, zero reason-code fields, in every one", () => {
    const results = [CODEX_BINDING, CLAUDE_BINDING, GEMINI_BINDING].map((binding) => ({
      mutationTools: binding.tools.filter((t) => MUTATION_VERB_RE.test(t.name)).length,
      forbiddenTermHits: FORBIDDEN_SEMANTIC_FIELD_TERMS.filter((term) => JSON.stringify(binding).includes(term)).length,
    }));
    expect(results).toEqual([
      { mutationTools: 0, forbiddenTermHits: 0 },
      { mutationTools: 0, forbiddenTermHits: 0 },
      { mutationTools: 0, forbiddenTermHits: 0 },
    ]);
  });
});

describe("4. File-path-set parity: the real src/adapters/ tree passes checkAdapterParity's full 3-way tier", () => {
  test("checkAdapterParity(real src/adapters/) reports all three populated and zero cross-runtime path divergence", () => {
    const result = checkAdapterParity(ADAPTERS_DIR);
    expect(result.populated).toEqual(["codex", "claude", "gemini"]);
    expect(result.pending).toEqual([]);
    expect(result.onlyInOneOrTwo).toEqual([]);
  });
});
