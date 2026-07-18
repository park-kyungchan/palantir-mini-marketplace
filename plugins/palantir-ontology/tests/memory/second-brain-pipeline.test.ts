// P520 S3: order-of-operation tests for the SecondBrain governed pipeline
// (extract/quarantine -> validate -> governed emit -> authoritative
// persist). Validation-contract item 2: "invalid/unvalidated content is
// quarantined and NEVER persisted (test); persistence is structurally
// unreachable without a prior validated governed emit (audit + test)."
//
// Complements tests/contracts/contracts.test.ts (envelope-level JSON-schema
// shape only for second-brain-interchange/second-brain-graph) — this file
// exercises src/memory/second-brain-validate.ts's kind-conditional/cross-
// field guards (the JSON contract's minimal subset structurally cannot),
// and src/memory/second-brain-pipeline.ts's ordering gate end-to-end
// through the real (test-constructed) commit gate.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createMintLedger } from "../../src/governance";
import {
  runSecondBrainGraphGovernedEmit,
  runSecondBrainInterchangeGovernedEmit,
  extractToQuarantine,
  validateQuarantineEntry,
  buildSecondBrainMutationRequest,
} from "../../src/memory/second-brain-pipeline";
import {
  validateSecondBrainBatchLine,
  validateSecondBrainGraphDocument,
  validateSecondBrainInterchangeLine,
  validateSecondBrainSummaryLine,
} from "../../src/memory/second-brain-validate";
import { baseDeps, buildGate, computeDryRunFingerprintForRaw, createFileWriteExecutor, makeTempOutcomeDir, spyWriteExecutor } from "./second-brain-test-helpers";

const VALID_BATCH_RAW = JSON.stringify({
  schemaVersion: "1.0.0",
  kind: "batch",
  sessionId: "session-2026-07-18-p520",
  batchIndex: 0,
  verdicts: [{ kind: "ADD", nodeId: "node-decision-001" }],
  emittedAt: "2026-07-18T10:00:00Z",
  byWhom: { identity: "second-brain-fold:worker" },
});

const VALID_GRAPH_RAW = JSON.stringify({
  schemaVersion: "1.0.0",
  sessionId: "session-2026-07-18-p520",
  nodes: [{ nodeId: "node-decision-001", kind: "decision" }],
  edges: [],
  nodeCount: 1,
  edgeCount: 0,
});

describe("second-brain-validate: kind-conditional + cross-field enforcement", () => {
  test("a well-formed batch line validates", () => {
    const result = validateSecondBrainBatchLine(JSON.parse(VALID_BATCH_RAW));
    expect(result.valid).toBe(true);
  });

  test("a batch line smuggling a summary field is rejected", () => {
    const line = { ...JSON.parse(VALID_BATCH_RAW), summary: { nodeCount: 1, edgeCount: 0, sessionId: "s", graphRef: "g" } };
    const result = validateSecondBrainBatchLine(line);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("summary") && e.includes("forbidden"))).toBe(true);
  });

  test("an unknown verdict kind is rejected", () => {
    const line = { ...JSON.parse(VALID_BATCH_RAW), verdicts: [{ kind: "REWRITE", nodeId: "x" }] };
    const result = validateSecondBrainBatchLine(line);
    expect(result.valid).toBe(false);
  });

  test("a summary line smuggling batchIndex/verdicts is rejected", () => {
    const summaryRaw = {
      schemaVersion: "1.0.0",
      kind: "summary",
      sessionId: "session-2026-07-18-p520",
      totalBatches: 1,
      summary: { nodeCount: 1, edgeCount: 0, sessionId: "session-2026-07-18-p520", graphRef: "g" },
      emittedAt: "2026-07-18T10:00:05Z",
      byWhom: { identity: "second-brain-fold:worker" },
      batchIndex: 0,
    };
    const result = validateSecondBrainSummaryLine(summaryRaw);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("batchIndex") && e.includes("forbidden"))).toBe(true);
  });

  test("validateSecondBrainInterchangeLine dispatches on kind and fails closed on neither", () => {
    expect(validateSecondBrainInterchangeLine({ kind: "extract" }).valid).toBe(false);
    expect(validateSecondBrainInterchangeLine(null).valid).toBe(false);
    expect(validateSecondBrainInterchangeLine("not-an-object").valid).toBe(false);
  });

  test("a well-formed graph document validates", () => {
    expect(validateSecondBrainGraphDocument(JSON.parse(VALID_GRAPH_RAW)).valid).toBe(true);
  });

  test("nodeCount not matching nodes.length is rejected (cross-field, not expressible in the JSON contract)", () => {
    const doc = { ...JSON.parse(VALID_GRAPH_RAW), nodeCount: 2 };
    const result = validateSecondBrainGraphDocument(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("nodeCount"))).toBe(true);
  });

  test("a dangling edge (from/to not a declared node) is rejected", () => {
    const doc = {
      ...JSON.parse(VALID_GRAPH_RAW),
      edges: [{ edgeId: "e1", from: "node-decision-001", to: "node-ghost", kind: "derivesFrom" }],
      edgeCount: 1,
    };
    const result = validateSecondBrainGraphDocument(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("node-ghost"))).toBe(true);
  });
});

describe("extractToQuarantine: step 1 always succeeds, never throws", () => {
  test("valid JSON is parsed and quarantined", () => {
    const entry = extractToQuarantine(VALID_BATCH_RAW, () => "2026-07-18T10:00:20Z");
    expect(entry.parseOk).toBe(true);
    expect(entry.quarantinedAt).toBe("2026-07-18T10:00:20Z");
  });

  test("malformed JSON is captured IN the quarantine entry, not thrown", () => {
    const entry = extractToQuarantine("{not valid json", () => "2026-07-18T10:00:20Z");
    expect(entry.parseOk).toBe(false);
    expect(entry.parsed).toBeUndefined();
  });

  test("a malformed entry fails validateQuarantineEntry with a quarantine-specific message, never silently passes", () => {
    const entry = extractToQuarantine("{not valid json", () => "2026-07-18T10:00:20Z");
    const validation = validateQuarantineEntry(entry, "interchange-line");
    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain("quarantined");
  });
});

describe("buildSecondBrainMutationRequest: the hard ordering gate", () => {
  test("returns denied(RC-SCHEMA-VALIDATION-FAILED) for invalid content WITHOUT constructing a request", () => {
    const entry = extractToQuarantine(JSON.stringify({ kind: "extract" }), () => "2026-07-18T10:00:20Z");
    const validation = validateQuarantineEntry(entry, "interchange-line");
    const result = buildSecondBrainMutationRequest(entry, validation, "second-brain-fold:s", "second-brain-fold-persist", "second-brain-interchange", baseDeps());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
      expect(result.detail).toContain("quarantined");
    }
  });

  test("returns ok(request) for valid content, with a content-derived 64-hex dryRunFingerprint", () => {
    const entry = extractToQuarantine(VALID_BATCH_RAW, () => "2026-07-18T10:00:20Z");
    const validation = validateQuarantineEntry(entry, "interchange-line");
    const result = buildSecondBrainMutationRequest(entry, validation, "second-brain-fold:s", "second-brain-fold-persist", "second-brain-interchange", baseDeps());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.dryRunFingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(result.value.dryRunFingerprint).toBe(computeDryRunFingerprintForRaw(VALID_BATCH_RAW));
    }
  });
});

describe("runSecondBrainInterchangeGovernedEmit: order-of-operation proof", () => {
  test("invalid content is denied and the writer is NEVER invoked (quarantine holds it, never persisted)", () => {
    const ledger = createMintLedger();
    const gate = buildGate();
    const spy = spyWriteExecutor();
    const result = runSecondBrainInterchangeGovernedEmit(
      JSON.stringify({ kind: "batch", schemaVersion: "1.0.0", sessionId: "s", batchIndex: -1, verdicts: [], emittedAt: "2026-07-18T10:00:00Z", byWhom: { identity: "x" } }),
      ledger,
      baseDeps({ writeExecutor: spy.writeExecutor }),
      gate,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
    expect(spy.calls.length).toBe(0);
  });

  test("malformed JSON is denied and the writer is NEVER invoked", () => {
    const ledger = createMintLedger();
    const gate = buildGate();
    const spy = spyWriteExecutor();
    const result = runSecondBrainInterchangeGovernedEmit("{not valid json", ledger, baseDeps({ writeExecutor: spy.writeExecutor }), gate);
    expect(result.ok).toBe(false);
    expect(spy.calls.length).toBe(0);
  });

  test("valid content through the PRODUCTION-shaped fail-closed default gate is denied, never committed", () => {
    const ledger = createMintLedger();
    const spy = spyWriteExecutor();
    // No gate argument: exercises the same fail-closed-by-default behavior
    // PRODUCTION_COMMIT_GATE carries. FAIL_CLOSED_ORACLE's empty-string
    // sicFingerprint/dtcFingerprint sentinels fail the mutation-authority
    // envelope's own `^[a-f0-9]{64}$` pattern at MINT time
    // (commit-gate.ts's issueMutationAuthority doc: "under a fail-closed
    // oracle... failing the envelope contract's pattern rather than
    // minting a broken envelope") — so this denies with
    // RC-SCHEMA-VALIDATION-FAILED before ever reaching the permission
    // check, the same honest "no real oracle exists yet" state every other
    // successor write path is in against PRODUCTION_COMMIT_GATE.
    const result = runSecondBrainInterchangeGovernedEmit(VALID_BATCH_RAW, ledger, baseDeps({ writeExecutor: spy.writeExecutor }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
    expect(spy.calls.length).toBe(0);
  });

  test("valid content, otherwise-trusted gate, permission denied: still denied with RC-AUTH-PERMISSION-DENIED and the writer is never invoked", () => {
    const ledger = createMintLedger();
    const gate = buildGate({
      resolvePermissionDecision: () => "deny",
      actualDryRunFingerprint: () => computeDryRunFingerprintForRaw(VALID_BATCH_RAW),
    });
    const spy = spyWriteExecutor();
    const result = runSecondBrainInterchangeGovernedEmit(VALID_BATCH_RAW, ledger, baseDeps({ writeExecutor: spy.writeExecutor }), gate);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-AUTH-PERMISSION-DENIED");
    expect(spy.calls.length).toBe(0);
  });

  test("valid content through a trusted test gate commits, and the writer is invoked exactly once with the matching envelope", () => {
    const ledger = createMintLedger();
    const gate = buildGate({ actualDryRunFingerprint: () => computeDryRunFingerprintForRaw(VALID_BATCH_RAW) });
    const spy = spyWriteExecutor();
    const result = runSecondBrainInterchangeGovernedEmit(VALID_BATCH_RAW, ledger, baseDeps({ writeExecutor: spy.writeExecutor }), gate);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.outcome).toBe("committed");
      expect(result.value.reasonCode).toBe("RC-COMMIT-SUCCEEDED");
    }
    expect(spy.calls.length).toBe(1);
    expect(spy.calls[0]?.allowedAction).toBe("second-brain-fold-persist");
    expect(spy.calls[0]?.targetIdentities).toEqual(["second-brain-fold:session-2026-07-18-p520"]);
  });

  test("commits using the REAL atomic-write-backed executor and the outcome file is byte-readable", () => {
    const ledger = createMintLedger();
    const gate = buildGate({ actualDryRunFingerprint: () => computeDryRunFingerprintForRaw(VALID_BATCH_RAW) });
    const outcomeDir = makeTempOutcomeDir();
    const writeExecutor = createFileWriteExecutor(outcomeDir, [outcomeDir]);

    // Capture the nonce the gate mints for THIS request by wrapping the
    // real executor with a spy — the outcome filename is
    // `<nonce>.committed.json` (default-write-executor.ts), and the nonce
    // is only known after minting, not before this call.
    let capturedNonce: string | undefined;
    const wrappedExecutor = (envelope: Parameters<typeof writeExecutor>[0]) => {
      capturedNonce = envelope.nonce;
      writeExecutor(envelope);
    };

    const result = runSecondBrainInterchangeGovernedEmit(VALID_BATCH_RAW, ledger, baseDeps({ writeExecutor: wrappedExecutor }), gate);
    expect(result.ok).toBe(true);
    expect(capturedNonce).toBeDefined();
    if (!capturedNonce) return;

    const written = JSON.parse(readFileSync(join(outcomeDir, `${capturedNonce}.committed.json`), "utf8"));
    expect(written.nonce).toBe(capturedNonce);
    expect(written.allowedAction).toBe("second-brain-fold-persist");
  });

  test("bypass attempt: a hand-crafted nonce that never went through this file's validation is denied by the shared gate's own forged-nonce check", () => {
    const ledger = createMintLedger();
    const gate = buildGate();
    const spy = spyWriteExecutor();
    const result = gate.resolveMutationAuthority("attacker-forged-nonce-never-minted", ledger, { writeExecutor: spy.writeExecutor });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
      expect(result.detail).toContain("never issued by this gate");
    }
    expect(spy.calls.length).toBe(0);
  });
});

describe("runSecondBrainGraphGovernedEmit: same ordering gate applied to the governing graph document", () => {
  test("a graph document with nodeCount/nodes.length mismatch is denied and the writer is never invoked", () => {
    const ledger = createMintLedger();
    const gate = buildGate();
    const spy = spyWriteExecutor();
    const badGraph = JSON.stringify({ ...JSON.parse(VALID_GRAPH_RAW), nodeCount: 99 });
    const result = runSecondBrainGraphGovernedEmit(badGraph, ledger, baseDeps({ writeExecutor: spy.writeExecutor }), gate);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
    expect(spy.calls.length).toBe(0);
  });

  test("a valid graph document through a trusted test gate commits and the writer is invoked exactly once", () => {
    const ledger = createMintLedger();
    const gate = buildGate({ actualDryRunFingerprint: () => computeDryRunFingerprintForRaw(VALID_GRAPH_RAW) });
    const spy = spyWriteExecutor();
    const result = runSecondBrainGraphGovernedEmit(VALID_GRAPH_RAW, ledger, baseDeps({ writeExecutor: spy.writeExecutor }), gate);
    expect(result.ok).toBe(true);
    expect(spy.calls.length).toBe(1);
    if (spy.calls[0]) {
      expect(spy.calls[0].targetIdentities).toEqual(["second-brain-graph:session-2026-07-18-p520"]);
      expect(spy.calls[0].allowedAction).toBe("second-brain-graph-persist");
    }
  });
});

describe("validation-contract item 3: no dependence on the out-of-repo SecondBrain engine", () => {
  test("second-brain-pipeline.ts imports governance ONLY from the public barrel", async () => {
    const source = await Bun.file(new URL("../../src/memory/second-brain-pipeline.ts", import.meta.url)).text();
    expect(source).not.toMatch(/from ["']\.\.\/governance\/commit-gate["']/);
    expect(source).not.toMatch(/from ["']\.\.\/governance\/security-oracle["']/);
    expect(source).not.toMatch(/from ["']\.\.\/governance\/testing/);
    expect(source).toMatch(/from ["']\.\.\/governance["']/);
  });

  test("second-brain-pipeline.ts and second-brain-validate.ts carry no IMPORT of the out-of-repo SecondBrain engine or legacy plugin path (a documentation citation naming what was NOT depended on is not an import — this test scans only `from \"...\"`/`require(\"...\")` specifiers)", async () => {
    const pipelineSource = await Bun.file(new URL("../../src/memory/second-brain-pipeline.ts", import.meta.url)).text();
    const validateSource = await Bun.file(new URL("../../src/memory/second-brain-validate.ts", import.meta.url)).text();
    const specifierRe = /(?:from\s+["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\))/g;
    for (const source of [pipelineSource, validateSource]) {
      const specifiers: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = specifierRe.exec(source)) !== null) {
        specifiers.push(m[1] ?? m[2] ?? "");
      }
      for (const spec of specifiers) {
        expect(spec).not.toMatch(/lib\/second-brain/);
        expect(spec).not.toMatch(/second-brain\/scripts\/fold/);
        expect(spec).not.toMatch(/palantir-mini-marketplace/);
      }
    }
  });

  test("second-brain-validate.ts has ZERO imports — pure, self-contained, no I/O surface at all (MEM-006: safe on a blocking hook path)", async () => {
    const source = await Bun.file(new URL("../../src/memory/second-brain-validate.ts", import.meta.url)).text();
    expect(source).not.toMatch(/^import /m);
    expect(source).not.toMatch(/from ["']node:fs["']/);
    expect(source).not.toMatch(/from ["']node:child_process["']/);
    expect(source).not.toMatch(/fetch\(/);
  });
});
