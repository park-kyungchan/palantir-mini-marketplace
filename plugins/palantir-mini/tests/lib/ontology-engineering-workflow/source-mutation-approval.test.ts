/**
 * Adversarial certification of the Improvement #2 ("user-approval fast-path",
 * a.k.a. fix2) source-mutation approval defense.
 *
 * The trust anchor is the hook-captured PromptEnvelope (the model can neither
 * write nor alter it). Every case below feeds a FAKE in-memory EnvelopeStore +
 * fabricated PromptEnvelopes into the REAL verifier code and asserts the gate
 * decision. These are red-team tests: a forged record must FAIL closed.
 *
 * Cases (numbers map to the task brief):
 *   1. HAPPY PATH                       -> authorized:true
 *   2. FORGERY (no envelope)            -> authorized:false
 *   3. FORGERY (promptHash mismatch)    -> authorized:false
 *   4. FORGERY (userQuote not substring)-> authorized:false
 *   5. REPLAY (stale pointer)           -> authorized:false
 *   6. TTL EXPIRED                      -> authorized:false
 *   7. HOLE-2 (path w/o approval verb)  -> excerptExpresses... false; authorized:false
 *   8. SCOPE ESCAPE                     -> authorized:false
 *   9. SINGLE-USE (consumed)            -> authorized:false
 */

import { describe, expect, test } from "bun:test";
import {
  reverifySourceMutationApprovalAgainstEnvelope,
  verifyAndMintSourceMutationApproval,
  excerptExpressesSourceMutationApproval,
  authorizesProtectedPaths,
  SOURCE_MUTATION_APPROVAL_TTL_MS,
  type EnvelopeStore,
} from "../../../lib/ontology-engineering-workflow/source-mutation-approval";
import type { SourceMutationApprovalRecord } from "../../../lib/ontology-engineering-workflow/types";
import {
  createPromptEnvelope,
  type PromptEnvelope,
  type PromptRuntime,
} from "../../../lib/prompt-front-door/envelope";

// ---------------------------------------------------------------------------
// Fake in-memory EnvelopeStore (the model-unforgeable trust anchor, faked).
// ---------------------------------------------------------------------------

interface PointerShape {
  readonly promptId: string;
  readonly promptHash: string;
}

class FakeEnvelopeStore implements EnvelopeStore {
  private readonly envelopes = new Map<string, PromptEnvelope>();
  private readonly pointers = new Map<string, PointerShape>();

  private envKey(sessionId: string, promptId: string): string {
    return `${sessionId}::${promptId}`;
  }
  private ptrKey(runtime: PromptRuntime, sessionId: string): string {
    return `${runtime}::${sessionId}`;
  }

  putEnvelope(envelope: PromptEnvelope): void {
    this.envelopes.set(this.envKey(envelope.sessionId, envelope.promptId), envelope);
  }
  /** Set the front-door "current" pointer for (runtime, sessionId). */
  setPointer(runtime: PromptRuntime, sessionId: string, pointer: PointerShape): void {
    this.pointers.set(this.ptrKey(runtime, sessionId), pointer);
  }
  clearPointer(runtime: PromptRuntime, sessionId: string): void {
    this.pointers.delete(this.ptrKey(runtime, sessionId));
  }

  async readEnvelope(sessionId: string, promptId: string): Promise<PromptEnvelope | null> {
    return this.envelopes.get(this.envKey(sessionId, promptId)) ?? null;
  }
  async readCurrentPointer(
    runtime: PromptRuntime,
    sessionId: string,
  ): Promise<PointerShape | null> {
    return this.pointers.get(this.ptrKey(runtime, sessionId)) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

const SESSION_ID = "sess-fix2";
const RUNTIME: PromptRuntime = "claude";
const PROJECT_ROOT = "/tmp/fake-project-fix2";
const NOW_MS = Date.parse("2026-06-09T12:00:00.000Z");

/** A user prompt that clearly co-occurs an approval verb + protected surface. */
const APPROVING_PROMPT =
  "Go ahead and apply the hotfix to hooks/ontology-engineering-workflow-enforcement-gate.ts — I approve this source edit.";

/**
 * Build a captured envelope from a raw prompt (uses the REAL excerpt/hash so the
 * substring + promptHash checks exercise the production code path).
 */
function makeEnvelope(opts: {
  rawPrompt?: string;
  sequence?: number;
  supersededByPromptId?: string;
  promptExcerptOverride?: string;
  promptHashOverride?: string;
}): PromptEnvelope {
  const base = createPromptEnvelope({
    rawPrompt: opts.rawPrompt ?? APPROVING_PROMPT,
    sessionId: SESSION_ID,
    runtime: RUNTIME,
    projectRoot: PROJECT_ROOT,
    capturedAt: "2026-06-09T11:58:00.000Z",
    sequence: opts.sequence ?? 1,
  });
  return {
    ...base,
    ...(opts.promptExcerptOverride !== undefined
      ? { promptExcerpt: opts.promptExcerptOverride }
      : {}),
    ...(opts.promptHashOverride !== undefined ? { promptHash: opts.promptHashOverride } : {}),
    ...(opts.supersededByPromptId !== undefined
      ? { supersededByPromptId: opts.supersededByPromptId }
      : {}),
  };
}

/** Build a SourceMutationApprovalRecord bound to a given envelope. */
function makeRecord(
  envelope: PromptEnvelope,
  opts: {
    approvedSourcePaths?: readonly string[];
    userQuote?: string;
    approvedAt?: string;
    approvedPromptHashOverride?: string;
    consumedByToolCallId?: string;
  } = {},
): SourceMutationApprovalRecord {
  return {
    kind: "developer-source-mutation",
    approvalRef: {
      schemaVersion: "prompt-front-door/approval-ref/v1",
      kind: "user-explicit-natural-language",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: SESSION_ID,
      runtime: RUNTIME,
      approvedAt: opts.approvedAt ?? new Date(NOW_MS).toISOString(),
      userVisibleSummaryHash: "sha256:deadbeef",
      userAnswerExcerpt: opts.userQuote ?? "I approve this source edit",
      approvalSurface: "developer-source-mutation",
    },
    approvedSourcePaths: opts.approvedSourcePaths ?? [
      "hooks/ontology-engineering-workflow-enforcement-gate.ts",
    ],
    approvedAtPromptId: envelope.promptId,
    approvedPromptHash: opts.approvedPromptHashOverride ?? envelope.promptHash,
    runtime: RUNTIME,
    sessionId: SESSION_ID,
    approvedAt: opts.approvedAt ?? new Date(NOW_MS).toISOString(),
    ...(opts.consumedByToolCallId !== undefined
      ? { consumedByToolCallId: opts.consumedByToolCallId }
      : {}),
    userQuote: opts.userQuote ?? "I approve this source edit",
  };
}

const IN_SCOPE_TOUCH = ["hooks/ontology-engineering-workflow-enforcement-gate.ts"];

// ---------------------------------------------------------------------------
// Case 1 — HAPPY PATH
// ---------------------------------------------------------------------------

describe("fix2 reverify — happy path", () => {
  test("case 1: valid record with captured envelope, hash match, in-scope, fresh, unconsumed -> authorized", async () => {
    const envelope = makeEnvelope({});
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });
    const record = makeRecord(envelope, { userQuote: "I approve this source edit" });

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      IN_SCOPE_TOUCH,
      NOW_MS,
    );
    expect(verdict.authorized).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Case 2 — FORGERY: no captured envelope
// ---------------------------------------------------------------------------

describe("fix2 reverify — forgery: no envelope", () => {
  test("case 2: hand-written record whose (sessionId, promptId) has NO captured envelope -> denied", async () => {
    const envelope = makeEnvelope({});
    const store = new FakeEnvelopeStore();
    // Deliberately DO NOT putEnvelope — the LLM fabricated the record.
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });
    const record = makeRecord(envelope);

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      IN_SCOPE_TOUCH,
      NOW_MS,
    );
    expect(verdict.authorized).toBe(false);
    expect(verdict.reason).toContain("PromptEnvelope not found");
  });
});

// ---------------------------------------------------------------------------
// Case 3 — FORGERY: promptHash mismatch
// ---------------------------------------------------------------------------

describe("fix2 reverify — forgery: promptHash mismatch", () => {
  test("case 3: envelope exists but its promptHash != record.approvedPromptHash -> denied", async () => {
    const envelope = makeEnvelope({});
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });
    // Record claims a different hash than the captured envelope holds.
    const record = makeRecord(envelope, {
      approvedPromptHashOverride: "f".repeat(64),
    });

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      IN_SCOPE_TOUCH,
      NOW_MS,
    );
    expect(verdict.authorized).toBe(false);
    expect(verdict.reason).toContain("promptHash does not match");
  });
});

// ---------------------------------------------------------------------------
// Case 4 — FORGERY: userQuote not a substring of the verbatim excerpt
// ---------------------------------------------------------------------------

describe("fix2 reverify — forgery: userQuote not substring", () => {
  test("case 4: userQuote was never in the captured prompt -> denied", async () => {
    const envelope = makeEnvelope({});
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });
    // The model invents an approval sentence the user never said.
    const record = makeRecord(envelope, {
      userQuote: "I approve deleting the entire production database",
    });

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      IN_SCOPE_TOUCH,
      NOW_MS,
    );
    expect(verdict.authorized).toBe(false);
    expect(verdict.reason).toContain("not a substring");
  });
});

// ---------------------------------------------------------------------------
// Case 5 — REPLAY: stale pointer (front-door has advanced past this prompt)
// ---------------------------------------------------------------------------

describe("fix2 reverify — replay: stale pointer", () => {
  test("case 5: pointer advanced to a later turn this approval does not supersede -> denied", async () => {
    const approvalEnvelope = makeEnvelope({ sequence: 1 });
    // A later, unrelated prompt is now the current pointer. The approval
    // envelope does NOT carry supersededByPromptId pointing at it (gap of >1).
    const laterPromptId = "prompt-sess-fix2-later-turn-9999";
    const store = new FakeEnvelopeStore();
    store.putEnvelope(approvalEnvelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: laterPromptId,
      promptHash: "a".repeat(64),
    });
    const record = makeRecord(approvalEnvelope);

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      IN_SCOPE_TOUCH,
      NOW_MS,
    );
    expect(verdict.authorized).toBe(false);
    expect(verdict.reason).toContain("stale/replay");
  });

  test("case 5b: just-prior turn (supersededByPromptId == current pointer) is still honored", async () => {
    const currentPromptId = "prompt-sess-fix2-current-turn-0001";
    const approvalEnvelope = makeEnvelope({
      sequence: 1,
      supersededByPromptId: currentPromptId,
    });
    const store = new FakeEnvelopeStore();
    store.putEnvelope(approvalEnvelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: currentPromptId,
      promptHash: "b".repeat(64),
    });
    const record = makeRecord(approvalEnvelope);

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      IN_SCOPE_TOUCH,
      NOW_MS,
    );
    expect(verdict.authorized).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Case 6 — TTL EXPIRED
// ---------------------------------------------------------------------------

describe("fix2 reverify — TTL expired", () => {
  test("case 6: nowMs beyond the 15-min window -> denied", async () => {
    const envelope = makeEnvelope({});
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });
    const approvedAt = new Date(NOW_MS).toISOString();
    const record = makeRecord(envelope, { approvedAt });

    const expiredNow = NOW_MS + SOURCE_MUTATION_APPROVAL_TTL_MS + 1;
    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      IN_SCOPE_TOUCH,
      expiredNow,
    );
    expect(verdict.authorized).toBe(false);
    expect(verdict.reason).toContain("expired");
  });

  test("case 6b: exactly at the TTL boundary is still honored (window is inclusive)", async () => {
    const envelope = makeEnvelope({});
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });
    const approvedAt = new Date(NOW_MS).toISOString();
    const record = makeRecord(envelope, { approvedAt });

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      IN_SCOPE_TOUCH,
      NOW_MS + SOURCE_MUTATION_APPROVAL_TTL_MS,
    );
    expect(verdict.authorized).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Case 7 — HOLE-2: path mention WITHOUT an approval verb
// ---------------------------------------------------------------------------

describe("fix2 HOLE-2 — path mention without approval verb", () => {
  test("case 7a: excerptExpressesSourceMutationApproval is false for a no-approval prompt", () => {
    // Mentions a protected surface ("hooks/") but carries NO approval verb.
    expect(excerptExpressesSourceMutationApproval("Please don't edit hooks/ for now.")).toBe(false);
    // Sanity: a real approval co-occurrence is true.
    expect(excerptExpressesSourceMutationApproval(APPROVING_PROMPT)).toBe(true);
  });

  test("case 7b: reverify denies a record whose envelope excerpt lacks the approval verb", async () => {
    const rawNoVerb = "Please don't edit hooks/ for now — just read it.";
    const envelope = makeEnvelope({ rawPrompt: rawNoVerb });
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });
    // userQuote is genuinely a substring of the excerpt (passes check #3), so the
    // ONLY thing standing between the model and a forged approval is HOLE-2.
    const record = makeRecord(envelope, { userQuote: "don't edit hooks/" });

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      ["hooks/something.ts"],
      NOW_MS,
    );
    expect(verdict.authorized).toBe(false);
    expect(verdict.reason).toContain("co-occurrence");
  });
});

// ---------------------------------------------------------------------------
// Case 7-KO — Korean approval lexicon (#2): Korean approvals must be recognized
// while the co-occurrence requirement stays intact (no security weakening).
// ---------------------------------------------------------------------------

describe("fix2 HOLE-2 — Korean approval lexicon", () => {
  test("Korean approval verb + Korean protected-surface marker co-occur -> true", () => {
    // The exact shape that was wrongly rejected: 승인한다 + 워크플로 라이브러리 소스.
    expect(
      excerptExpressesSourceMutationApproval(
        "워크플로 라이브러리 소스 수정 승인한다.",
      ),
    ).toBe(true);
    // Other Korean verbs added to the lexicon, each with a Korean surface marker.
    expect(excerptExpressesSourceMutationApproval("훅 수정에 동의한다.")).toBe(true);
    expect(excerptExpressesSourceMutationApproval("게이트 핸들러 수정 허락합니다.")).toBe(true);
    expect(excerptExpressesSourceMutationApproval("플러그인 소스 수정 허용.")).toBe(true);
    // 워크플로우 (trailing 우) variant also matches.
    expect(excerptExpressesSourceMutationApproval("워크플로우 소스 수정 승인합니다.")).toBe(true);
  });

  test("Korean surface mention WITHOUT an approval verb is still rejected (fail-closed)", () => {
    // Mentions protected surfaces (워크플로 라이브러리 소스) but no approval verb.
    expect(
      excerptExpressesSourceMutationApproval("워크플로 라이브러리 소스는 지금 건드리지 마세요."),
    ).toBe(false);
    // Korean approval verb but NO protected-surface marker -> still rejected.
    expect(excerptExpressesSourceMutationApproval("그 변경 승인한다.")).toBe(false);
  });

  test("reverify authorizes a record bound to a Korean-approval envelope", async () => {
    const rawKoreanApproval =
      "워크플로 라이브러리 소스(hooks/ontology-engineering-workflow-enforcement-gate.ts) 수정 승인한다.";
    const envelope = makeEnvelope({ rawPrompt: rawKoreanApproval });
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });
    const record = makeRecord(envelope, { userQuote: "수정 승인한다" });

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      IN_SCOPE_TOUCH,
      NOW_MS,
    );
    expect(verdict.authorized).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Case 8 — SCOPE ESCAPE
// ---------------------------------------------------------------------------

describe("fix2 reverify — scope escape", () => {
  test("case 8: touched path outside the record's approved scope -> denied", async () => {
    const envelope = makeEnvelope({});
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });
    // Approval scoped to ONE gate file; the call touches a DIFFERENT protected file.
    const record = makeRecord(envelope, {
      approvedSourcePaths: ["hooks/ontology-engineering-workflow-enforcement-gate.ts"],
    });

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      ["hooks/some-other-unrelated-hook.ts"],
      NOW_MS,
    );
    expect(verdict.authorized).toBe(false);
    expect(verdict.reason).toContain("scope");
  });

  test("case 8b: authorizesProtectedPaths rejects partial coverage (one in, one out)", () => {
    const envelope = makeEnvelope({});
    const record = makeRecord(envelope, {
      approvedSourcePaths: ["hooks/gate.ts"],
    });
    expect(authorizesProtectedPaths(record, ["hooks/gate.ts", "lib/secret.ts"])).toBe(false);
    expect(authorizesProtectedPaths(record, ["hooks/gate.ts"])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Case 9 — SINGLE-USE (already consumed)
// ---------------------------------------------------------------------------

describe("fix2 reverify — single-use", () => {
  test("case 9: record already marked consumed -> denied", async () => {
    const envelope = makeEnvelope({});
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });
    const record = makeRecord(envelope, { consumedByToolCallId: "toolu_already_used_123" });

    const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
      record,
      store,
      IN_SCOPE_TOUCH,
      NOW_MS,
    );
    expect(verdict.authorized).toBe(false);
    expect(verdict.reason).toContain("consumed");
  });
});

// ---------------------------------------------------------------------------
// Mint-path coverage — the same defenses must hold at mint time, not just read.
// ---------------------------------------------------------------------------

describe("fix2 mint — verifyAndMintSourceMutationApproval", () => {
  test("happy: mints a record bound to the captured envelope", async () => {
    const envelope = makeEnvelope({});
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });

    const result = await verifyAndMintSourceMutationApproval({
      projectRoot: PROJECT_ROOT,
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      userQuote: "I approve this source edit",
      approvedSourcePaths: ["hooks/ontology-engineering-workflow-enforcement-gate.ts"],
      runtime: RUNTIME,
      sessionId: SESSION_ID,
      nowMs: NOW_MS,
      envelopeStore: store,
    });
    expect(result.record).toBeDefined();
    expect(result.invalidReason).toBeUndefined();
    expect(result.record?.approvedPromptHash).toBe(envelope.promptHash);
  });

  test("forgery: mint refuses when no captured envelope exists", async () => {
    const envelope = makeEnvelope({});
    const store = new FakeEnvelopeStore();
    // No putEnvelope.
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });

    const result = await verifyAndMintSourceMutationApproval({
      projectRoot: PROJECT_ROOT,
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      userQuote: "I approve this source edit",
      approvedSourcePaths: ["hooks/gate.ts"],
      runtime: RUNTIME,
      sessionId: SESSION_ID,
      nowMs: NOW_MS,
      envelopeStore: store,
    });
    expect(result.record).toBeUndefined();
    expect(result.invalidReason).toContain("PromptEnvelope not found");
  });

  test("forgery: mint refuses a wildcard-only scope (no global grant)", async () => {
    const envelope = makeEnvelope({});
    const store = new FakeEnvelopeStore();
    store.putEnvelope(envelope);
    store.setPointer(RUNTIME, SESSION_ID, {
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });

    const result = await verifyAndMintSourceMutationApproval({
      projectRoot: PROJECT_ROOT,
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      userQuote: "I approve this source edit",
      approvedSourcePaths: ["**"],
      runtime: RUNTIME,
      sessionId: SESSION_ID,
      nowMs: NOW_MS,
      envelopeStore: store,
    });
    expect(result.record).toBeUndefined();
    expect(result.invalidReason).toContain("wildcard-only");
  });
});
