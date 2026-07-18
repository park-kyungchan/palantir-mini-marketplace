// Permanent regression for src/adapters/gemini/flat-schema.ts (ledger row
// A640, validation-contract item 2 precedent: "Flat-schema validator: every
// public MCP input schema is flat, no anyOf/oneOf/allOf/not (test evidence
// against the exact schemas shipped)"). Colocated (not under
// tests/adapters/**) because this row's exact write set does not include
// tests/adapters/** (decisions/w6-write-set-adjudication.md item 2 grants
// it to A610 only).

import { describe, expect, test } from "bun:test";
import { FORBIDDEN_SCHEMA_COMBINATOR_KEYS, findSchemaCombinatorViolations, isFlatMcpInputSchema } from "./flat-schema";
import { GEMINI_BINDING } from "./binding.generated";

describe("isFlatMcpInputSchema: every schema this plugin actually ships is flat", () => {
  test("GEMINI_BINDING carries at least one tool (non-trivial coverage)", () => {
    expect(GEMINI_BINDING.tools.length).toBeGreaterThan(0);
  });

  for (const tool of GEMINI_BINDING.tools) {
    test(`tool "${tool.name}"'s inputSchema is flat (no anyOf/oneOf/allOf/not)`, () => {
      expect(isFlatMcpInputSchema(tool.inputSchema)).toBe(true);
      expect(findSchemaCombinatorViolations(tool.inputSchema)).toEqual([]);
    });
  }
});

describe("isFlatMcpInputSchema: negative cases (synthetic, proving the validator actually rejects combinators)", () => {
  test("rejects a top-level anyOf", () => {
    const schema = { type: "object", anyOf: [{ type: "string" }, { type: "number" }] };
    expect(isFlatMcpInputSchema(schema)).toBe(false);
    expect(findSchemaCombinatorViolations(schema)).toContain("$.anyOf");
  });

  test("rejects a top-level oneOf", () => {
    const schema = { type: "object", oneOf: [{ type: "string" }] };
    expect(isFlatMcpInputSchema(schema)).toBe(false);
  });

  test("rejects a top-level allOf", () => {
    const schema = { type: "object", allOf: [{ type: "string" }] };
    expect(isFlatMcpInputSchema(schema)).toBe(false);
  });

  test("rejects a top-level not", () => {
    const schema = { type: "object", not: { type: "string" } };
    expect(isFlatMcpInputSchema(schema)).toBe(false);
  });

  test("rejects a combinator nested inside properties (not just top-level)", () => {
    const schema = {
      type: "object",
      properties: {
        runtime: { type: "string", anyOf: [{ enum: ["codex"] }, { enum: ["claude"] }] },
      },
      required: ["runtime"],
      additionalProperties: false,
    };
    expect(isFlatMcpInputSchema(schema)).toBe(false);
    expect(findSchemaCombinatorViolations(schema)).toEqual(["$.properties.runtime.anyOf"]);
  });

  test("accepts a genuinely flat schema", () => {
    const schema = {
      type: "object",
      properties: { runtime: { type: "string", enum: ["codex", "claude", "gemini"] } },
      required: ["runtime"],
      additionalProperties: false,
    };
    expect(isFlatMcpInputSchema(schema)).toBe(true);
  });

  test("FORBIDDEN_SCHEMA_COMBINATOR_KEYS carries exactly the 4 execution-plan §6.2 keys", () => {
    expect([...FORBIDDEN_SCHEMA_COMBINATOR_KEYS].sort()).toEqual(["allOf", "anyOf", "not", "oneOf"]);
  });
});
