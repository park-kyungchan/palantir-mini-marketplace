// P330 validation-contract item 4 (Neutrality): every contracts/*.contract.json
// file and the reason-code registry must carry zero runtime-specific fields —
// no claude/codex/gemini-shaped keys or values. Adapters translate a neutral
// contract into a runtime-specific shape later (ADR-007); the contract itself
// never encodes which runtime it is for. This is the automated regression for
// the grep proof recorded in outputs/p330-contracts.md.

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CONTRACTS_DIR = join(import.meta.dir, "..", "..", "contracts");

// Case-insensitive: a neutral contract has no legitimate reason to name any
// of these runtime identifiers anywhere in its schema text.
const FORBIDDEN_TERMS = [/claude/i, /codex/i, /gemini/i, /anthropic/i, /openai/i, /google/i];

describe("contract neutrality (runtime-independence)", () => {
  const files = readdirSync(CONTRACTS_DIR).filter((f) => f.endsWith(".json"));

  test("at least the 9 expected contract/registry files are present", () => {
    expect(files.length).toBeGreaterThanOrEqual(9);
  });

  for (const file of files) {
    test(`${file} carries no runtime-specific term`, () => {
      const text = readFileSync(join(CONTRACTS_DIR, file), "utf8");
      for (const term of FORBIDDEN_TERMS) {
        expect(term.test(text)).toBe(false);
      }
    });
  }
});
