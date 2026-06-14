import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, expect, test } from "bun:test";
import {
  createUserApprovalRef,
  createPromptEnvelope,
  hashPrompt,
  hasApprovalRef,
  PromptFrontDoorStore,
  transitionPromptEnvelope,
  validateApprovalRefValue,
  validateDigitalTwinBoundaryFields,
  validatePromptContinuity,
} from "../../../lib/prompt-front-door";
import type { SemanticIntentContract } from "../../../lib/lead-intent/contracts";
import type { PromptEnvelope } from "../../../lib/prompt-front-door/envelope";
import {
  DTC_BUILD_APPROVAL_TTL_MS,
  excerptExpressesDtcBuildApproval,
  verifyDtcBuildApprovalAgainstEnvelope,
  type EnvelopeStore,
} from "../../../lib/lead-intent/dtc-build-approval";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";

describe("prompt front door envelope", () => {
  test("creates deterministic hash/id metadata without retaining raw prompt by default", () => {
    const rawPrompt = "Implement the prompt front door. Keep raw prompts out of storage.";
    const envelope = createPromptEnvelope({
      rawPrompt,
      sessionId: "session/alpha",
      runtime: "codex",
      projectRoot: "/repo",
      capturedAt: "2026-05-10T04:00:00.000Z",
      sequence: 7,
    });

    expect(envelope.promptHash).toBe(hashPrompt(rawPrompt));
    expect(envelope.promptId).toBe(
      `prompt-session-alpha-20260510T040000-7-${envelope.promptHash.slice(0, 16)}`,
    );
    expect(envelope.promptExcerpt).toContain("Implement the prompt front door");
    expect(envelope.rawPrompt).toBeUndefined();
    expect(envelope.state).toBe("captured");
  });

  test("retains raw prompt only when explicitly requested", () => {
    const envelope = createPromptEnvelope({
      rawPrompt: "retain this prompt",
      sessionId: "session",
      runtime: "claude",
      projectRoot: "/repo",
      capturedAt: "2026-05-10T04:00:00.000Z",
      retainRawPrompt: true,
    });

    expect(envelope.rawPrompt).toBe("retain this prompt");
  });
});

describe("prompt front door state machine", () => {
  test("promotes through approved semantic and digital twin states", () => {
    const envelope = createPromptEnvelope({
      rawPrompt: "Implement approved prompt gate",
      sessionId: "session",
      runtime: "codex",
      projectRoot: "/repo",
      capturedAt: "2026-05-10T04:00:00.000Z",
    });

    const semanticDrafted = transitionPromptEnvelope(envelope, "semantic_intent_drafted", {
      semanticIntentContractRef: "semantic-intent:test",
    });
    const semanticApproved = transitionPromptEnvelope(
      semanticDrafted,
      "semantic_intent_approved",
      { approvalRef: "user:approved:test" },
    );
    const dtcDrafted = transitionPromptEnvelope(semanticApproved, "digital_twin_drafted", {
      digitalTwinChangeContractRef: "digital-twin-change:test",
    });
    const dtcApproved = transitionPromptEnvelope(dtcDrafted, "digital_twin_approved", {
      approvalRef: "user:approved:test",
    });

    expect(dtcApproved.state).toBe("digital_twin_approved");
    expect(dtcApproved.contractRefs.semanticIntentContractRef).toBe("semantic-intent:test");
    expect(dtcApproved.contractRefs.digitalTwinChangeContractRef).toBe("digital-twin-change:test");
  });

  test("tracks semantic and digital twin approval refs separately", () => {
    const envelope = createPromptEnvelope({
      rawPrompt: "Approve semantic and Digital Twin boundary",
      sessionId: "session",
      runtime: "codex",
      projectRoot: "/repo",
      capturedAt: "2026-05-10T04:00:00.000Z",
    });
    const semanticApprovalRef = createUserApprovalRef({
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      userVisibleSummary: "Approve the semantic meaning only.",
      userAnswer: "Yes, approve the meaning.",
      approvalSurface: "semantic-intent",
      approvedAt: "2026-05-10T04:01:00.000Z",
    });
    const digitalTwinApprovalRef = createUserApprovalRef({
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      userVisibleSummary: "Approve the Digital Twin change boundary.",
      userAnswer: "Approve the boundary; do not change gate defaults.",
      approvalSurface: "digital-twin-change",
      approvedAt: "2026-05-10T04:02:00.000Z",
    });

    const semanticDrafted = transitionPromptEnvelope(envelope, "semantic_intent_drafted", {
      semanticIntentContractRef: "semantic-intent:test",
    });
    const semanticApproved = transitionPromptEnvelope(
      semanticDrafted,
      "semantic_intent_approved",
      {
        approvalRef: semanticApprovalRef,
        semanticIntentApprovalRef: semanticApprovalRef,
      },
    );
    const dtcDrafted = transitionPromptEnvelope(semanticApproved, "digital_twin_drafted", {
      digitalTwinChangeContractRef: "digital-twin-change:test",
    });
    const dtcApproved = transitionPromptEnvelope(dtcDrafted, "digital_twin_approved", {
      approvalRef: digitalTwinApprovalRef,
      digitalTwinApprovalRef,
    });

    expect(dtcApproved.contractRefs.approvalRef).toEqual(digitalTwinApprovalRef);
    expect(dtcApproved.contractRefs.semanticIntentApprovalRef).toEqual(semanticApprovalRef);
    expect(dtcApproved.contractRefs.digitalTwinApprovalRef).toEqual(digitalTwinApprovalRef);
  });

  test("supports user-review approval states before contract approval", () => {
    const envelope = createPromptEnvelope({
      rawPrompt: "Approve via review states",
      sessionId: "session",
      runtime: "codex",
      projectRoot: "/repo",
      capturedAt: "2026-05-10T04:00:00.000Z",
    });

    const semanticQuestions = transitionPromptEnvelope(
      envelope,
      "semantic_intent_questions_open",
      { semanticIntentContractRef: "semantic-intent:test" },
    );
    const semanticReview = transitionPromptEnvelope(
      semanticQuestions,
      "semantic_intent_user_review",
    );
    const semanticApproved = transitionPromptEnvelope(
      semanticReview,
      "semantic_intent_approved",
      { approvalRef: "user:approved:semantic" },
    );
    const dtcQuestions = transitionPromptEnvelope(
      semanticApproved,
      "digital_twin_questions_open",
      { digitalTwinChangeContractRef: "digital-twin-change:test" },
    );
    const dtcReview = transitionPromptEnvelope(dtcQuestions, "digital_twin_user_review");
    const dtcApproved = transitionPromptEnvelope(dtcReview, "digital_twin_approved", {
      approvalRef: "user:approved:dtc",
    });

    expect(dtcApproved.state).toBe("digital_twin_approved");
    expect(dtcApproved.contractRefs.semanticIntentContractRef).toBe("semantic-intent:test");
    expect(dtcApproved.contractRefs.digitalTwinChangeContractRef).toBe("digital-twin-change:test");
  });

  test("rejects Digital Twin approval before semantic approval and user review", () => {
    const envelope = createPromptEnvelope({
      rawPrompt: "reject early DTC approval",
      sessionId: "session",
      runtime: "codex",
      projectRoot: "/repo",
      capturedAt: "2026-05-10T04:00:00.000Z",
    });
    const semanticReview = transitionPromptEnvelope(
      envelope,
      "semantic_intent_user_review",
    );

    expect(() => transitionPromptEnvelope(envelope, "digital_twin_approved")).toThrow(
      "transition captured -> digital_twin_approved is not allowed",
    );
    expect(() => transitionPromptEnvelope(semanticReview, "digital_twin_approved")).toThrow(
      "transition semantic_intent_user_review -> digital_twin_approved is not allowed",
    );
  });

  test("rejects invalid state jumps", () => {
    const envelope = createPromptEnvelope({
      rawPrompt: "invalid jump",
      sessionId: "session",
      runtime: "codex",
      projectRoot: "/repo",
      capturedAt: "2026-05-10T04:00:00.000Z",
    });

    expect(() => transitionPromptEnvelope(envelope, "digital_twin_approved")).toThrow(
      "transition captured -> digital_twin_approved is not allowed",
    );
  });
});

describe("prompt front door store", () => {
  test("writes envelope and current pointer atomically under project session state", async () => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), "prompt-front-door-"));
    try {
      const store = new PromptFrontDoorStore({ projectRoot });
      const envelope = createPromptEnvelope({
        rawPrompt: "store this prompt",
        sessionId: "session/with/slash",
        runtime: "codex",
        projectRoot,
        capturedAt: "2026-05-10T04:00:00.000Z",
      });

      const pointer = await store.saveEnvelope(envelope);
      const saved = await store.readEnvelope(envelope.sessionId, envelope.promptId);
      const current = await store.readCurrentPointer("codex", envelope.sessionId);

      expect(saved?.promptHash).toBe(envelope.promptHash);
      expect(pointer.promptId).toBe(envelope.promptId);
      expect(current?.promptId).toBe(envelope.promptId);
      expect(store.envelopePath(envelope.sessionId, envelope.promptId)).toContain(
        ".palantir-mini/session/prompt-front-door/sessions/session-with-slash",
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("writes and resolves prompt-local contract records by ref", async () => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), "prompt-front-door-contract-"));
    try {
      const store = new PromptFrontDoorStore({ projectRoot });
      const envelope = createPromptEnvelope({
        rawPrompt: "store contract refs",
        sessionId: "session/with/slash",
        runtime: "codex",
        projectRoot,
        capturedAt: "2026-05-10T04:00:00.000Z",
      });
      const contract: SemanticIntentContract = {
        schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
        contractId: "semantic-intent:test/ref",
        status: "draft",
        rawIntent: "store contract refs",
        confirmedIntent: "",
        nonGoals: [],
        approvedNouns: [],
        approvedVerbs: [],
        affectedSurfaces: ["ontology/example.ts"],
        permissionsAndProposal: "",
        acceptedRisks: [],
        downstreamAllowed: [],
        downstreamForbidden: ["Do not treat draft as approval."],
        clarificationQuestions: [],
      };

      const record = await store.writeContractRecord(envelope, "semantic-intent", contract);
      const resolved = await store.readContractRecordByRef<SemanticIntentContract>(record.ref);

      expect(record.ref).toContain("prompt-front-door://contract/semantic-intent/");
      expect(resolved?.promptId).toBe(envelope.promptId);
      expect(resolved?.promptHash).toBe(envelope.promptHash);
      expect(resolved?.contract.contractId).toBe(contract.contractId);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("persists structured contract approval refs", async () => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), "prompt-front-door-approval-ref-"));
    try {
      const store = new PromptFrontDoorStore({ projectRoot });
      const envelope = createPromptEnvelope({
        rawPrompt: "store structured approval refs",
        sessionId: "session/approval",
        runtime: "codex",
        projectRoot,
        capturedAt: "2026-05-10T04:00:00.000Z",
      });
      const approvalRef = createUserApprovalRef({
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: envelope.sessionId,
        runtime: envelope.runtime,
        userVisibleSummary: "Approve contract persistence.",
        userAnswer: "Approved.",
        approvalSurface: "semantic-intent",
        approvedAt: "2026-05-10T04:01:00.000Z",
      });
      const contract: SemanticIntentContract = {
        schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
        contractId: "semantic-intent:test/approved-ref",
        status: "approved",
        rawIntent: "store structured approval refs",
        confirmedIntent: "Store structured approval refs.",
        nonGoals: [],
        approvedNouns: ["ApprovalRef"],
        approvedVerbs: ["persist"],
        affectedSurfaces: ["lib/prompt-front-door/store.ts"],
        permissionsAndProposal: "Test-only temp store.",
        acceptedRisks: [],
        downstreamAllowed: ["Persist structured approval refs."],
        downstreamForbidden: [],
        clarificationQuestions: [],
        approvalRef,
      };

      const record = await store.writeContractRecord(envelope, "semantic-intent", contract);
      const resolved = await store.readContractRecordByRef<SemanticIntentContract>(record.ref);

      expect(record.approvalRef).toEqual(approvalRef);
      expect(resolved?.contract.approvalRef).toEqual(approvalRef);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("prompt front door validators", () => {
  test("detects prompt continuity drift", () => {
    const envelope = createPromptEnvelope({
      rawPrompt: "original",
      sessionId: "session",
      runtime: "codex",
      projectRoot: "/repo",
      capturedAt: "2026-05-10T04:00:00.000Z",
    });

    const result = validatePromptContinuity({
      envelope,
      expectedPromptHash: hashPrompt("different"),
      currentPromptId: "prompt:other",
      runtime: "claude",
      sessionId: "other-session",
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.field)).toEqual([
      "promptHash",
      "promptId",
      "runtime",
      "sessionId",
    ]);
  });

  test("flags a hash-mismatched / malformed structured approval ref (fail-closed primitive)", () => {
    const envelope = createPromptEnvelope({
      rawPrompt: "approve the DTC build for this ontology digital twin",
      sessionId: "session",
      runtime: "codex",
      projectRoot: "/repo",
      capturedAt: "2026-05-10T04:00:00.000Z",
    });
    const good = createUserApprovalRef({
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: envelope.sessionId,
      runtime: envelope.runtime,
      userVisibleSummary: "Approve the DTC build.",
      userAnswer: "approve the DTC build",
      approvalSurface: "digital-twin-change",
      approvedAt: "2026-05-10T04:01:00.000Z",
    });
    // A complete structured ref passes the validator (hasApprovalRef === true).
    expect(hasApprovalRef(good)).toBe(true);

    // Dropping a required field fails the fail-closed validator.
    const { userVisibleSummaryHash: _dropped, ...malformed } = good;
    expect(hasApprovalRef(malformed as unknown as typeof good)).toBe(false);
    const issues = validateApprovalRefValue("approvalRef", malformed as unknown as typeof good);
    expect(issues.map((issue) => issue.field)).toContain("approvalRef.userVisibleSummaryHash");
  });

  test("requires closed structured Digital Twin boundary fields", () => {
    const issues = validateDigitalTwinBoundaryFields({
      changeBoundary: {
        value: "Library-only Wave 1.",
        status: "approved",
        rationale: "User approved Wave 1.",
        approvalRef: "user:approved:test",
      },
      branchProposalPolicy: {
        value: "Separate PR.",
        status: "approved",
        rationale: "Rollbackable slice.",
        approvalRef: "user:approved:test",
      },
      permissionBoundary: {
        value: "No direct home plugin writes.",
        status: "approved",
        rationale: "Worktree-owned implementation.",
        approvalRef: "user:approved:test",
      },
      replayMigrationPlan: {
        value: "No migration.",
        status: "not-applicable",
        rationale: "Store tests use temp dirs only.",
      },
      observabilityPlan: {
        value: "Unit tests and lineage events.",
        status: "mitigated",
        rationale: "No hook events in Wave 1.",
      },
      toolSurfaceReadiness: {
        value: "Bun tests are enough for Wave 1.",
        status: "accepted-risk",
        rationale: "No hook path yet.",
      },
      evaluationPlan: {
        value: "Run targeted unit tests.",
        status: "approved",
        rationale: "Covers new store and validators.",
        approvalRef: "user:approved:test",
      },
    });

    expect(issues.map((issue) => issue.field)).toEqual([
      "toolSurfaceReadiness.designAlternative",
    ]);
  });
});

describe("dtc-build-approval read-time verifier", () => {
  function captured(over: Partial<PromptEnvelope> = {}): PromptEnvelope {
    const base = createPromptEnvelope({
      rawPrompt: "Please approve the DTC build for this ontology digital twin.",
      sessionId: "verifier-session",
      runtime: "codex",
      projectRoot: "/repo",
      capturedAt: "2026-05-10T04:00:00.000Z",
      sequence: 1,
    });
    return { ...base, ...over };
  }

  function stubStore(
    envelope: PromptEnvelope | null,
    pointer: { promptId: string; promptHash: string } | null,
  ): EnvelopeStore {
    return {
      async readEnvelope() {
        return envelope;
      },
      async readCurrentPointer() {
        return pointer;
      },
    };
  }

  async function verifyWith(
    envelope: PromptEnvelope | null,
    over: Partial<Parameters<typeof verifyDtcBuildApprovalAgainstEnvelope>[0]> = {},
  ) {
    const pointer = envelope
      ? { promptId: envelope.promptId, promptHash: envelope.promptHash }
      : null;
    return verifyDtcBuildApprovalAgainstEnvelope({
      projectRoot: "/repo",
      promptId: envelope?.promptId ?? "prompt-missing",
      promptHash: envelope?.promptHash ?? "hash-missing",
      userQuote: "approve the DTC build",
      sessionId: envelope?.sessionId ?? "verifier-session",
      runtime: "codex",
      envelopeStore: stubStore(envelope, pointer),
      ...over,
    });
  }

  test("the DTC-build approval lexicon requires verb + surface marker, no negation", () => {
    expect(excerptExpressesDtcBuildApproval("approve the DTC build")).toBe(true);
    expect(excerptExpressesDtcBuildApproval("승인합니다, 온톨로지 빌드 진행")).toBe(true);
    // surface marker without an approval verb
    expect(excerptExpressesDtcBuildApproval("the DTC build is in progress")).toBe(false);
    // negated directive voids the approval verb
    expect(excerptExpressesDtcBuildApproval("do not approve the DTC build")).toBe(false);
    expect(DTC_BUILD_APPROVAL_TTL_MS).toBe(15 * 60 * 1000);
  });

  test("authorizes a fresh on-current-turn build-approval envelope", async () => {
    const envelope = captured();
    const result = await verifyWith(envelope);
    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.approvalRef.approvalSurface).toBe("digital-twin-change");
      expect(result.approvalRef.promptHash).toBe(envelope.promptHash);
    }
  });

  test("fails closed when the captured envelope is absent (LLM cannot create one)", async () => {
    const result = await verifyWith(null);
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("not found");
  });

  test("fails closed on promptHash mismatch", async () => {
    const result = await verifyWith(captured(), { promptHash: "WRONG-HASH" });
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("promptHash");
  });

  test("fails closed when userQuote is not a substring of the captured excerpt", async () => {
    const result = await verifyWith(captured(), {
      userQuote: "this sentence was never in the captured prompt",
    });
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("substring");
  });

  test("fails closed when the excerpt carries no approval-verb / DTC-build co-occurrence", async () => {
    const envelope = captured({
      promptExcerpt: "Just a routine status check on the build pipeline.",
    });
    const result = await verifyWith(envelope, { userQuote: "routine status check" });
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("co-occurrence");
  });

  test("fails closed when the approval promptId is neither current nor just-prior (stale/replay)", async () => {
    const envelope = captured();
    const result = await verifyDtcBuildApprovalAgainstEnvelope({
      projectRoot: "/repo",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      userQuote: "approve the DTC build",
      sessionId: envelope.sessionId,
      runtime: "codex",
      envelopeStore: stubStore(envelope, {
        promptId: "prompt-some-other-newer-turn",
        promptHash: "newer-hash",
      }),
    });
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("stale");
  });
});
