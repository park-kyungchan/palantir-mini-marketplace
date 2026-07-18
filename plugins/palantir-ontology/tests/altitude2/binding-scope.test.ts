// P440 S1: binding-scope ceiling unit tests.

import { describe, expect, test } from "bun:test";
import { isStateWithinBindingScope } from "../../src/altitude2/binding-scope";

describe("isStateWithinBindingScope", () => {
  test("read authorizes exactly up to READ_OR_QUERY", () => {
    expect(isStateWithinBindingScope("read", "BOUND_CONSUMER_ONTOLOGY")).toBe(true);
    expect(isStateWithinBindingScope("read", "READ_OR_QUERY")).toBe(true);
    expect(isStateWithinBindingScope("read", "PROPOSAL")).toBe(false);
    expect(isStateWithinBindingScope("read", "COMMIT")).toBe(false);
  });

  test("proposal authorizes exactly up to PROPOSAL", () => {
    expect(isStateWithinBindingScope("proposal", "READ_OR_QUERY")).toBe(true);
    expect(isStateWithinBindingScope("proposal", "PROPOSAL")).toBe(true);
    expect(isStateWithinBindingScope("proposal", "DRY_RUN")).toBe(false);
    expect(isStateWithinBindingScope("proposal", "COMMIT")).toBe(false);
  });

  test("commit authorizes the whole chain through LINEAGE_APPENDED", () => {
    expect(isStateWithinBindingScope("commit", "DRY_RUN")).toBe(true);
    expect(isStateWithinBindingScope("commit", "GOVERNANCE_CHECK")).toBe(true);
    expect(isStateWithinBindingScope("commit", "MUTATION_AUTHORITY_ISSUED")).toBe(true);
    expect(isStateWithinBindingScope("commit", "COMMIT")).toBe(true);
    expect(isStateWithinBindingScope("commit", "LINEAGE_APPENDED")).toBe(true);
  });
});
