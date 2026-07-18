// Permanent regression for scripts/generators/capability-index.ts's
// determinism guarantee (ledger row A610, validation-contract item 2:
// "Generator output is deterministic — two independent runs byte-
// identical"). Converts A610 attempt-1's ad hoc `bun -e` probe
// (outputs/a610-runtime-adapters.md "Validation contract — items proven",
// item 2) into a durable, re-runnable test file (W6 write-set
// adjudication, decisions/w6-write-set-adjudication.md item 2). No file
// under scripts/generated/** is written by this test — `generateCapabilityIndex`
// is a pure function returning a string; disk writes are `run-all.ts`'s job.

import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { generateCapabilityIndex, HEADER } from "../../../scripts/generators/capability-index";

const REGISTRY_PATH = resolve(import.meta.dir, "..", "..", "..", "src", "adapters", "shared", "capability-registry.json");

describe("generateCapabilityIndex: determinism", () => {
  test("two independent calls against the same source produce byte-identical output", () => {
    const first = generateCapabilityIndex(REGISTRY_PATH);
    const second = generateCapabilityIndex(REGISTRY_PATH);
    expect(first).toBe(second);
  });
});

describe("generateCapabilityIndex: mandatory header", () => {
  test("output starts with the @generated / DO NOT EDIT header", () => {
    const output = generateCapabilityIndex(REGISTRY_PATH);
    expect(output.startsWith(HEADER)).toBe(true);
    expect(HEADER).toContain("@generated");
    expect(HEADER).toContain("DO NOT EDIT");
  });
});

describe("generateCapabilityIndex: entry shape", () => {
  test("produces exactly 24 entries (3 runtimes x 8 capability areas)", () => {
    const output = generateCapabilityIndex(REGISTRY_PATH);
    const matches = output.match(/runtime: "/g);
    expect(matches).not.toBeNull();
    expect((matches ?? []).length).toBe(24);
  });

  test("carries the CAPABILITY_REGISTRY_SOURCE_SHA256 export, stable across two runs", () => {
    const first = generateCapabilityIndex(REGISTRY_PATH);
    const second = generateCapabilityIndex(REGISTRY_PATH);
    const shaOf = (s: string): string => {
      const m = s.match(/CAPABILITY_REGISTRY_SOURCE_SHA256 = "([0-9a-f]+)"/);
      if (!m) throw new Error("CAPABILITY_REGISTRY_SOURCE_SHA256 export not found in generated output");
      return m[1]!;
    };
    expect(shaOf(first)).toBe(shaOf(second));
  });
});
