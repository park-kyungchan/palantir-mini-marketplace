// Permanent regression for src/adapters/shared/{types,registry-loader,
// capability-registry.json} (ledger row A610, docs/architecture.md
// ADR-007). Converts A610 attempt-1's ad hoc `bun -e` probes (validation-
// contract items 4 and 5, outputs/a610-runtime-adapters.md "Validation
// contract — items proven") into a durable, re-runnable test file
// (W6 write-set adjudication, decisions/w6-write-set-adjudication.md
// item 2).

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  CAPABILITY_AREAS,
  FORBIDDEN_SEMANTIC_FIELD_TERMS,
  RUNTIME_IDS,
  isWellFormedCapabilityRegistry,
} from "../../../src/adapters/shared/types";
import { CAPABILITY_REGISTRY } from "../../../src/adapters/shared/registry-loader";

const REGISTRY_PATH = resolve(import.meta.dir, "..", "..", "..", "src", "adapters", "shared", "capability-registry.json");

describe("capability-registry.json: well-formedness", () => {
  test("registry-loader's belt-and-suspenders load succeeded (module-load throw would have already failed this test file)", () => {
    expect(isWellFormedCapabilityRegistry(CAPABILITY_REGISTRY)).toBe(true);
  });

  test("carries exactly the 3 RUNTIME_IDS profiles, no more, no fewer", () => {
    expect(Object.keys(CAPABILITY_REGISTRY.profiles).sort()).toEqual([...RUNTIME_IDS].sort());
  });

  test("every profile carries exactly the 8 CAPABILITY_AREAS, no more, no fewer", () => {
    for (const runtime of RUNTIME_IDS) {
      const profile = CAPABILITY_REGISTRY.profiles[runtime];
      expect(Object.keys(profile.capabilities).sort()).toEqual([...CAPABILITY_AREAS].sort());
    }
  });
});

// Validation-contract item 5: "Semantic decisions ... are NOT encoded in
// the capability source". Scans the actual on-disk JSON TEXT, not just the
// type shape (a type can be widened by mistake; the text scan cannot
// silently drift the same way — see types.ts's own module doc).
describe("capability-registry.json: no semantic-decision field leaks into the neutral source", () => {
  const raw = readFileSync(REGISTRY_PATH, "utf8");

  for (const term of FORBIDDEN_SEMANTIC_FIELD_TERMS) {
    test(`does not contain the forbidden semantic term "${term}"`, () => {
      expect(raw).not.toContain(term);
    });
  }
});

// Validation-contract item 4: "Every R210 unknown/unsupported cell present
// verbatim, cited." Hardcodes the exact 7-cell non-supported set A610
// attempt-1 verified against outputs/r210-runtime-capability-matrix.md's
// "Per-Runtime Unsupported/Unknown" lists (a610-runtime-adapters.md
// "Validation contract — items proven", item 4) — a regression that fails
// the moment a future edit rounds any of these up to "supported" or drops
// one.
describe("capability-registry.json: every R210 unknown/unsupported cell carried forward verbatim (UNKNOWN-is-not-PASS)", () => {
  const EXPECTED_NON_SUPPORTED: ReadonlyArray<{ runtime: "codex" | "claude" | "gemini"; area: string; key: string; verdict: "unsupported" | "unknown" }> = [
    { runtime: "claude", area: "mcpRegistration", key: "sseNewRegistration", verdict: "unsupported" },
    { runtime: "claude", area: "schemaFlatLimits", key: "officialRule", verdict: "unknown" },
    { runtime: "codex", area: "reloadInstall", key: "ideExtension", verdict: "unsupported" },
    { runtime: "codex", area: "schemaFlatLimits", key: "officialRule", verdict: "unknown" },
    { runtime: "codex", area: "skillsCommands", key: "commands", verdict: "unknown" },
    { runtime: "codex", area: "subagents", key: "pluginBundled", verdict: "unknown" },
    { runtime: "gemini", area: "mcpRegistration", key: "trustField", verdict: "unsupported" },
  ];

  test("the hardcoded expected set has exactly 7 entries (matching R210's own unsupported+unknown cell count)", () => {
    expect(EXPECTED_NON_SUPPORTED.length).toBe(7);
  });

  for (const expected of EXPECTED_NON_SUPPORTED) {
    test(`${expected.runtime}.${expected.area}.${expected.key} === "${expected.verdict}"`, () => {
      const fact = CAPABILITY_REGISTRY.profiles[expected.runtime].capabilities[expected.area as (typeof CAPABILITY_AREAS)[number]];
      expect(fact.verdicts[expected.key]).toBe(expected.verdict);
      expect(fact.citation.startsWith("R210")).toBe(true);
    });
  }

  test("no cell in the hardcoded expected set silently upgraded to \"supported\" by scanning every verdict in the live registry and confirming the non-supported set matches exactly (no fewer, no extra)", () => {
    const actualNonSupported: string[] = [];
    for (const runtime of RUNTIME_IDS) {
      const profile = CAPABILITY_REGISTRY.profiles[runtime];
      for (const area of CAPABILITY_AREAS) {
        const fact = profile.capabilities[area];
        for (const [key, verdict] of Object.entries(fact.verdicts)) {
          if (verdict !== "supported") actualNonSupported.push(`${runtime}.${area}.${key}`);
        }
      }
    }
    const expectedKeys = EXPECTED_NON_SUPPORTED.map((e) => `${e.runtime}.${e.area}.${e.key}`).sort();
    expect(actualNonSupported.sort()).toEqual(expectedKeys);
  });
});

describe("capability-registry.json: sourceOfRecord traceability", () => {
  test("sourceOfRecord points at the R210 report", () => {
    expect(CAPABILITY_REGISTRY.sourceOfRecord).toBe("outputs/r210-runtime-capability-matrix.md");
  });

  test("every capability area's citation begins with \"R210\" — no cell asserted from memory", () => {
    for (const runtime of RUNTIME_IDS) {
      const profile = CAPABILITY_REGISTRY.profiles[runtime];
      for (const area of CAPABILITY_AREAS) {
        expect(profile.capabilities[area].citation.startsWith("R210")).toBe(true);
      }
    }
  });

  test("every unsupportedFeatures/unknownFeatures list is an array (possibly empty, e.g. Gemini's unknownFeatures) of strings", () => {
    for (const runtime of RUNTIME_IDS) {
      const profile = CAPABILITY_REGISTRY.profiles[runtime];
      expect(Array.isArray(profile.unsupportedFeatures)).toBe(true);
      expect(Array.isArray(profile.unknownFeatures)).toBe(true);
      for (const f of profile.unsupportedFeatures) expect(typeof f).toBe("string");
      for (const f of profile.unknownFeatures) expect(typeof f).toBe("string");
    }
  });
});
