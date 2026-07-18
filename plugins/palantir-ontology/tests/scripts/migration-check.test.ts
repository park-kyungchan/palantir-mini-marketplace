// Permanent regression for scripts/migration-check.ts's pure copy-only
// direction predicate (P340, ADR-008). Complements the manual bite-proof
// demonstration recorded in outputs/p340-generators-checkers.md.

import { describe, expect, test } from "bun:test";
import { checkCopyOnlyDirection } from "../../scripts/migration-check";

describe("migration-check: checkCopyOnlyDirection", () => {
  test("legacy-to-successor direction is accepted", () => {
    const violation = checkCopyOnlyDirection("ok.json", {
      sourceStore: "plugins/palantir-mini/.palantir-mini/session/events.jsonl",
      targetStore: "plugins/palantir-ontology/.palantir-ontology/session/events.jsonl",
    });
    expect(violation).toBeNull();
  });

  test("reversed direction (successor-to-legacy) is rejected", () => {
    const violation = checkCopyOnlyDirection("bad.json", {
      sourceStore: "plugins/palantir-ontology/.palantir-ontology/session/events.jsonl",
      targetStore: "plugins/palantir-mini/.palantir-mini/session/events.jsonl",
    });
    expect(violation).not.toBeNull();
  });

  test("a target that also references palantir-mini is rejected even if source is correct", () => {
    const violation = checkCopyOnlyDirection("bad2.json", {
      sourceStore: "plugins/palantir-mini/.palantir-mini/session/events.jsonl",
      targetStore: "plugins/palantir-mini/.palantir-mini/session/backup.jsonl",
    });
    expect(violation).not.toBeNull();
  });
});
