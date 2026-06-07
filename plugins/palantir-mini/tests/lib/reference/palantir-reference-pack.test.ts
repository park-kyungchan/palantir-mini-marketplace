import { describe, expect, test } from "bun:test";
import {
  PORTABLE_PALANTIR_REFERENCE_PACK,
  getReferenceEntry,
  validatePortableReferencePack,
} from "../../../lib/reference/palantir-reference-pack";

describe("portable Palantir reference pack", () => {
  test("covers every Lecture Delivery Kernel v0 authority domain", () => {
    expect(validatePortableReferencePack()).toEqual([]);
    expect(PORTABLE_PALANTIR_REFERENCE_PACK.entries.map((entry) => entry.domain)).toEqual([
      "aip",
      "ontology",
      "context",
      "function",
      "action",
      "security",
      "evals",
    ]);
  });

  test("routes through BROWSE and INDEX and keeps provenance read-only", () => {
    expect(PORTABLE_PALANTIR_REFERENCE_PACK.routing.browse).toEndWith("BROWSE.md");
    expect(PORTABLE_PALANTIR_REFERENCE_PACK.routing.index).toEndWith("INDEX.md");

    const action = getReferenceEntry("action");
    expect(action.kernelImplication).toContain("SequencerDraft");
    for (const entry of PORTABLE_PALANTIR_REFERENCE_PACK.entries) {
      expect(entry.sourceRefs.length).toBeGreaterThan(0);
      expect(entry.sourceRefs.every((source) => source.readOnly)).toBe(true);
    }
  });
});
