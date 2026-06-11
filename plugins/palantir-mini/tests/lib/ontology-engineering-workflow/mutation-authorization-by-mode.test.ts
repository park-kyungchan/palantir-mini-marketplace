/**
 * P4 — per-mode mutation authorization predicate (`deriveMutationAuthorizationByMode`).
 *
 * The legacy runtime collapsed all SEVEN SSoT mutation modes into the single
 * `deriveMutationAuthorized` promotion boolean. This locks the fan-out: each mode
 * now has its OWN authorization predicate grounded in the proof table
 * (approval-and-lineage.md:90-98). These are pure-function unit tests over the
 * predicate; the handler-level wiring is covered in
 * tests/bridge/handlers/pm-ontology-engineering-workflow.test.ts.
 */

import { describe, expect, test } from "bun:test";
import {
  DEFAULT_MUTATION_MODE,
  deriveMutationAuthorized,
  deriveMutationAuthorizationByMode,
  type MutationMode,
  type MutationModeState,
  type UserDecisionRecord,
} from "../../../lib/ontology-engineering-workflow/types";

/** A state bag that satisfies the full 9-axis promotion gate. */
const PROMOTION_DECISION_RECORD: UserDecisionRecord = {
  decisionId: "mutation-auth-promotion",
  choiceId: "mutation-auth-promotion.approved",
  kind: "accept",
  recordedAt: "2026-06-11T00:00:00.000Z",
  source: "handler-input",
  appliesToRequirementIds: [],
  approvedMutationBoundary: "plugin-source-tests-only:p4-mode-predicate",
};

const PROMOTED_STATE: MutationModeState = {
  semanticIntentContractRef: "semantic-intent:test",
  semanticIntentContractStatus: "approved",
  digitalTwinChangeContractRef: "digital-twin-change:test",
  digitalTwinChangeContractStatus: "approved",
  workContractRef: "work-contract:test",
  userDecisionRecords: [PROMOTION_DECISION_RECORD],
};

const EMPTY_STATE: MutationModeState = {};

describe("deriveMutationAuthorizationByMode — the seven SSoT modes", () => {
  test("read-only is always authorized with no requirements", () => {
    const verdict = deriveMutationAuthorizationByMode("read-only", EMPTY_STATE);
    expect(verdict.mode).toBe("read-only");
    expect(verdict.authorized).toBe(true);
    expect(verdict.requires).toEqual([]);
  });

  test("proposal-only is authorized (recorded-proposal requirement)", () => {
    const verdict = deriveMutationAuthorizationByMode("proposal-only", EMPTY_STATE);
    expect(verdict.authorized).toBe(true);
    expect(verdict.requires.length).toBeGreaterThan(0);
    expect(verdict.requires).toContain("recorded proposal");
  });

  test("dry-run/sandbox is authorized while writes stay in the sandbox", () => {
    const verdict = deriveMutationAuthorizationByMode("dry-run/sandbox", EMPTY_STATE);
    expect(verdict.authorized).toBe(true);
    expect(verdict.requires).toContain("sandbox; no real commit");
  });

  test("consumer-data-write is authorized iff the proof inputs are present", () => {
    const ungated = deriveMutationAuthorizationByMode("consumer-data-write", EMPTY_STATE);
    expect(ungated.authorized).toBe(false);
    expect(ungated.requires.length).toBeGreaterThan(0);

    // action type present but no validation verdict -> still gated false.
    const partial = deriveMutationAuthorizationByMode("consumer-data-write", {
      consumerActionTypeRef: "action-type:record-observation",
    });
    expect(partial.authorized).toBe(false);
    expect(partial.requires.length).toBeGreaterThan(0);

    // approved action type + passing validation verdict -> authorized.
    const authorized = deriveMutationAuthorizationByMode("consumer-data-write", {
      consumerActionTypeRef: "action-type:record-observation",
      consumerWriteValidated: true,
    });
    expect(authorized.authorized).toBe(true);
  });

  test("consumer-data-write does NOT require the 9-axis promotion gate", () => {
    // No SIC / DTC / work contract / decision record at all, yet the consumer lane
    // authorizes on its own (lighter) proof — the whole point of P4.
    const promotionSatisfied = deriveMutationAuthorized(EMPTY_STATE);
    expect(promotionSatisfied).toBe(false);

    const verdict = deriveMutationAuthorizationByMode("consumer-data-write", {
      consumerActionTypeRef: "action-type:record-observation",
      consumerWriteValidated: true,
    });
    expect(verdict.authorized).toBe(true);
  });

  test("builder-structure-write === the legacy promotion gate (deriveMutationAuthorized)", () => {
    const gated = deriveMutationAuthorizationByMode("builder-structure-write", EMPTY_STATE);
    expect(gated.authorized).toBe(deriveMutationAuthorized(EMPTY_STATE));
    expect(gated.authorized).toBe(false);
    expect(gated.requires).toContain("approved SIC");

    const promoted = deriveMutationAuthorizationByMode("builder-structure-write", PROMOTED_STATE);
    expect(promoted.authorized).toBe(deriveMutationAuthorized(PROMOTED_STATE));
    expect(promoted.authorized).toBe(true);
  });

  test("approved-commit needs BOTH the promotion gate AND a commit ref", () => {
    // Promotion satisfied but no commit ref -> gated false.
    const noRef = deriveMutationAuthorizationByMode("approved-commit", PROMOTED_STATE);
    expect(noRef.authorized).toBe(false);
    expect(noRef.requires).toContain("approval/commit reference");

    // Commit ref but promotion NOT satisfied -> gated false.
    const noPromotion = deriveMutationAuthorizationByMode("approved-commit", {
      approvedCommitRef: "approval:commit-ref",
    });
    expect(noPromotion.authorized).toBe(false);

    // Both present -> authorized.
    const both = deriveMutationAuthorizationByMode("approved-commit", {
      ...PROMOTED_STATE,
      approvedCommitRef: "approval:commit-ref",
    });
    expect(both.authorized).toBe(true);
  });

  test("armed-side-effect is gated false without explicit arming, authorized when armed", () => {
    const notArmed = deriveMutationAuthorizationByMode("armed-side-effect", EMPTY_STATE);
    expect(notArmed.authorized).toBe(false);
    expect(notArmed.requires).toContain("explicit arming");

    const armed = deriveMutationAuthorizationByMode("armed-side-effect", { sideEffectArmed: true });
    expect(armed.authorized).toBe(true);
  });

  test("every mode echoes its own mode + a non-empty rationale", () => {
    const modes: readonly MutationMode[] = [
      "read-only",
      "proposal-only",
      "dry-run/sandbox",
      "consumer-data-write",
      "builder-structure-write",
      "approved-commit",
      "armed-side-effect",
    ];
    for (const mode of modes) {
      const verdict = deriveMutationAuthorizationByMode(mode, EMPTY_STATE);
      expect(verdict.mode).toBe(mode);
      expect(verdict.rationale.length).toBeGreaterThan(0);
    }
  });

  test("DEFAULT_MUTATION_MODE is builder-structure-write (legacy-behavior-preserving)", () => {
    expect(DEFAULT_MUTATION_MODE).toBe("builder-structure-write");
    const viaDefault = deriveMutationAuthorizationByMode(DEFAULT_MUTATION_MODE, PROMOTED_STATE);
    expect(viaDefault.authorized).toBe(deriveMutationAuthorized(PROMOTED_STATE));
  });
});
