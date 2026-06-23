// palantir-mini — reserved commit-provenance type guard unit tests (F1b)
// Verifies validateReservedProvenanceType: reserved types → non-null error message,
// non-reserved types → null. This is the shared validator imported by BOTH the MCP
// boundary (bridge/handlers/emit-event.ts) and the hook-side emit() choke
// (scripts/log.ts) so the ActionType write-back gate (ssot/palantir approval-and-
// lineage = sole edit_committed emitter) cannot be bypassed via a raw emit.

import { test, expect, describe } from "bun:test";
import {
  RESERVED_PROVENANCE_TYPES,
  validateReservedProvenanceType,
} from "../../../lib/event-log/reserved-provenance";
import type { EventEnvelope } from "../../../lib/event-log/types";

// validateReservedProvenanceType only reads `.type`; a minimal stub envelope suffices.
function envOfType(type: string): Omit<EventEnvelope, "sequence"> {
  return { type } as unknown as Omit<EventEnvelope, "sequence">;
}

describe("reserved-provenance guard (F1b)", () => {
  test("RESERVED_PROVENANCE_TYPES holds the two governed commit-provenance types", () => {
    expect(RESERVED_PROVENANCE_TYPES.has("edit_committed")).toBe(true);
    expect(RESERVED_PROVENANCE_TYPES.has("submission_criteria_failed")).toBe(true);
  });

  test("reserved type edit_committed → non-null error message", () => {
    const msg = validateReservedProvenanceType(envOfType("edit_committed"));
    expect(msg).not.toBeNull();
    expect(msg).toContain("reserved commit-provenance type");
  });

  test("reserved type submission_criteria_failed → non-null error message", () => {
    const msg = validateReservedProvenanceType(envOfType("submission_criteria_failed"));
    expect(msg).not.toBeNull();
    expect(msg).toContain("reserved commit-provenance type");
  });

  test("non-reserved type drift_detected → null", () => {
    expect(validateReservedProvenanceType(envOfType("drift_detected"))).toBeNull();
  });

  test("non-reserved type session_started → null", () => {
    expect(validateReservedProvenanceType(envOfType("session_started"))).toBeNull();
  });
});
