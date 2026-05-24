// palantir-mini v4.10.0 — lib/value-grade/consensus.ts unit tests (W3.C2)
// Sprint-056 W3.C2: D2 K-LLM consensus axis

import { test, expect, describe } from "bun:test";
import { evaluateD2Consensus } from "../../../lib/value-grade/consensus";
import type { EnvelopeForConsensus } from "../../../lib/value-grade/consensus";

const NOW = "2026-05-07T10:00:00.000Z";
const MINUS_1H = "2026-05-07T09:00:00.000Z";
const MINUS_25H = "2026-05-06T09:00:00.000Z"; // outside 24h window

function makeValidationEnvelope(
  identity: string,
  actionRid: string,
  errorClass: string,
  when: string = NOW,
): EnvelopeForConsensus {
  return {
    type: "validation_phase_completed",
    when,
    byWhom: { identity },
    lineageRefs: { actionRid },
    payload: { errorClass, passed: true },
  };
}

describe("evaluateD2Consensus", () => {
  // ─── Case 1: single identity → false ──────────────────────────────────────

  test("single identity emit → returns false (no consensus)", () => {
    const envelope = makeValidationEnvelope("claude-code", "act-001", "dry_run_graded");
    const recentEvents: EnvelopeForConsensus[] = [
      makeValidationEnvelope("claude-code", "act-001", "dry_run_graded", MINUS_1H),
    ];
    expect(evaluateD2Consensus(envelope, recentEvents)).toBe(false);
  });

  // ─── Case 2: 2 distinct identities, same actionRid, same errorClass, within 24h → true ──

  test("2 distinct identities, same actionRid, same verdict, within 24h → returns true", () => {
    const envelope = makeValidationEnvelope("claude-code", "act-002", "dry_run_graded");
    const recentEvents: EnvelopeForConsensus[] = [
      makeValidationEnvelope("codex", "act-002", "dry_run_graded", MINUS_1H),
    ];
    expect(evaluateD2Consensus(envelope, recentEvents)).toBe(true);
  });

  // ─── Case 3: 2 distinct identities but different actionRid → false ────────

  test("2 distinct identities but different actionRid → returns false", () => {
    const envelope = makeValidationEnvelope("claude-code", "act-003", "dry_run_graded");
    const recentEvents: EnvelopeForConsensus[] = [
      makeValidationEnvelope("codex", "act-DIFFERENT", "dry_run_graded", MINUS_1H),
    ];
    expect(evaluateD2Consensus(envelope, recentEvents)).toBe(false);
  });

  // ─── Case 4 (bonus): 2 distinct identities, same actionRid, OUTSIDE 24h → false ──

  test("2 distinct identities, same actionRid, outside 24h window → returns false", () => {
    const envelope = makeValidationEnvelope("claude-code", "act-004", "dry_run_graded");
    const recentEvents: EnvelopeForConsensus[] = [
      makeValidationEnvelope("codex", "act-004", "dry_run_graded", MINUS_25H),
    ];
    expect(evaluateD2Consensus(envelope, recentEvents)).toBe(false);
  });

  // ─── Non-validation envelopes always return false ─────────────────────────

  test("non-validation_phase_completed type → always false", () => {
    const envelope: EnvelopeForConsensus = {
      type: "edit_proposed",
      when: NOW,
      byWhom: { identity: "claude-code" },
      lineageRefs: { actionRid: "act-005" },
      payload: {},
    };
    expect(evaluateD2Consensus(envelope, [])).toBe(false);
  });

  // ─── Missing actionRid → false ────────────────────────────────────────────

  test("envelope missing actionRid → returns false", () => {
    const envelope: EnvelopeForConsensus = {
      type: "validation_phase_completed",
      when: NOW,
      byWhom: { identity: "claude-code" },
      payload: { errorClass: "dry_run_graded" },
    };
    expect(evaluateD2Consensus(envelope, [])).toBe(false);
  });

  // ─── Different errorClass → false ─────────────────────────────────────────

  test("2 distinct identities, same actionRid, different errorClass → returns false", () => {
    const envelope = makeValidationEnvelope("claude-code", "act-006", "dry_run_graded");
    const recentEvents: EnvelopeForConsensus[] = [
      makeValidationEnvelope("codex", "act-006", "DIFFERENT_ERROR_CLASS", MINUS_1H),
    ];
    expect(evaluateD2Consensus(envelope, recentEvents)).toBe(false);
  });

  // ─── 3 identities still returns true ──────────────────────────────────────

  test("3 distinct identities, same actionRid, same verdict → returns true (≥2 threshold)", () => {
    const envelope = makeValidationEnvelope("claude-code", "act-007", "dry_run_graded");
    const recentEvents: EnvelopeForConsensus[] = [
      makeValidationEnvelope("codex", "act-007", "dry_run_graded", MINUS_1H),
      makeValidationEnvelope("gemini", "act-007", "dry_run_graded", MINUS_1H),
    ];
    expect(evaluateD2Consensus(envelope, recentEvents)).toBe(true);
  });

  // ─── Empty recent events, only self → false ───────────────────────────────

  test("no recent events, only self → returns false (need ≥2)", () => {
    const envelope = makeValidationEnvelope("claude-code", "act-008", "dry_run_graded");
    expect(evaluateD2Consensus(envelope, [])).toBe(false);
  });
});
