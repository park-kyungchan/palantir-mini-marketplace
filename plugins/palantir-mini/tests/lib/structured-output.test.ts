/**
 * Tests: O-1 structured_output engine — PROVES termination is a property of the machinery.
 *
 * The three terminal paths of the fixed finite path (lib/structured-output/index.ts:
 * fillOrFallback) + the self-model parity asserts (ActionType editFunctionName ===
 * registered edit-function name; getMcpToolCapability("structured_output") defined).
 * bun:test, importing the engine directly (lib-test idiom).
 */

import { test, expect, describe } from "bun:test";
import {
  fillOrFallback,
  structuredOutputEditFunction,
  STRUCTURED_OUTPUT_EDIT_FUNCTION_NAME,
  type FillOrFallbackDeps,
} from "../../lib/structured-output";
import type {
  StructuredOutputSink,
  StructuredOutputSinkPort,
} from "../../lib/structured-output/contract";
import { getEditFunction } from "../../lib/actions/tier2-function";
import { STRUCTURED_OUTPUT_ACTION_TYPE } from "../../runtime-overlay/schemas-snapshot/ontology/self/action-types";
import { getMcpToolCapability } from "../../lib/capability-registry/mcp-tool-capability";

/** Fake sink port — records the write, returns a synthetic path (no real fs). */
function recordingSink(): { port: StructuredOutputSinkPort; writes: string[]; last?: StructuredOutputSink } {
  const writes: string[] = [];
  const state: { port: StructuredOutputSinkPort; writes: string[]; last?: StructuredOutputSink } = {
    writes,
    port: {
      write(serialized: string): StructuredOutputSink {
        writes.push(serialized);
        const sink = { path: `/tmp/fake-overflow-${writes.length}.json`, bytes: Buffer.byteLength(serialized, "utf8") };
        state.last = sink;
        return sink;
      },
    },
  };
  return state;
}

describe("structured_output engine — termination is a property of the machinery", () => {
  test("(a) oversize -> fallback (sink written, NO validation attempted)", async () => {
    const sink = recordingSink();
    let validationCalls = 0;
    const deps: FillOrFallbackDeps = {
      sink: sink.port,
      validator: { validate: () => { validationCalls++; return true; } },
      onValidationAttempt: () => { validationCalls++; },
    };
    // candidate well above the 8-byte cap.
    const big = "x".repeat(5000);
    const result = await fillOrFallback({ schema: { type: "string" }, candidate: big, maxBytes: 8 }, deps);

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toBe("oversize");
      expect(result.sink).toBeDefined();
      expect(result.sink!.path).toBe("/tmp/fake-overflow-1.json");
      expect(result.sink!.bytes).toBeGreaterThan(8);
      expect(typeof result.fallbackText).toBe("string");
    }
    // Pre-size gate runs BEFORE validation — no validation attempted.
    expect(sink.writes.length).toBe(1);
    expect(validationCalls).toBe(0);
  });

  test("(b) retries-exhausted -> fallback (validation invoked AT MOST maxRetries+1 times)", async () => {
    const sink = recordingSink();
    let attempts = 0;
    const deps: FillOrFallbackDeps = {
      sink: sink.port,
      // Never conforms — forces the bounded loop to exhaust.
      validator: { validate: () => false },
      onValidationAttempt: () => { attempts++; },
    };
    const maxRetries = 2;
    const result = await fillOrFallback(
      { schema: { type: "object", required: ["nope"] }, candidate: { a: 1 }, maxRetries, maxBytes: 1_000_000 },
      deps,
    );

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toBe("retries_exhausted");
      expect(result.sink).toBeUndefined();
      expect(typeof result.fallbackText).toBe("string");
    }
    // The integer ceiling holds: at most maxRetries+1 attempts (i in [0, maxRetries]).
    expect(attempts).toBe(maxRetries + 1);
    expect(attempts).toBeLessThanOrEqual(maxRetries + 1);
  });

  test("(b2) a thrown validator verdict counts as a failed attempt, never a crash/stall", async () => {
    const sink = recordingSink();
    let attempts = 0;
    const deps: FillOrFallbackDeps = {
      sink: sink.port,
      validator: { validate: () => { throw new Error("validator blew up"); } },
      onValidationAttempt: () => { attempts++; },
    };
    const result = await fillOrFallback(
      { schema: { type: "object" }, candidate: {}, maxRetries: 1, maxBytes: 1_000_000 },
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.reason).toBe("retries_exhausted");
    expect(attempts).toBe(2); // maxRetries(1) + 1
  });

  test("(c) valid -> ok (value deep-equals input)", async () => {
    const sink = recordingSink();
    const input = { a: 1, b: ["x", "y"], c: { nested: true } };
    const deps: FillOrFallbackDeps = {
      sink: sink.port,
      validator: { validate: () => true },
    };
    const result = await fillOrFallback(
      { schema: { type: "object" }, candidate: input, maxBytes: 1_000_000 },
      deps,
    );
    expect(result.ok).toBe(true);
    if (result.ok === true) {
      expect(result.value).toEqual(input);
    }
    expect(sink.writes.length).toBe(0); // no overflow
  });

  test("default structural validator: conforming object -> ok; missing required -> fallback", async () => {
    const sink = recordingSink();
    // No injected validator => shipped default structural validator.
    const ok = await fillOrFallback(
      { schema: { type: "object", required: ["id"] }, candidate: { id: "k1", extra: 1 }, maxBytes: 1_000_000 },
      { sink: sink.port },
    );
    expect(ok.ok).toBe(true);

    const bad = await fillOrFallback(
      { schema: { type: "object", required: ["id"] }, candidate: { other: 1 }, maxRetries: 0, maxBytes: 1_000_000 },
      { sink: sink.port },
    );
    expect(bad.ok).toBe(false);
    if (bad.ok === false) expect(bad.reason).toBe("retries_exhausted");
  });
});

describe("structured_output self-model parity", () => {
  test("ActionType editFunctionName === registered edit-function name", () => {
    expect(STRUCTURED_OUTPUT_ACTION_TYPE.editFunctionName).toBe(STRUCTURED_OUTPUT_EDIT_FUNCTION_NAME);
    // The edit-function side-effect fired on engine import — it resolves in the registry.
    const fn = getEditFunction(STRUCTURED_OUTPUT_EDIT_FUNCTION_NAME);
    expect(fn).toBeDefined();
    // The thin wrapper is pure and returns a descriptor OntologyEdit (parity, no engine run).
    const edits = structuredOutputEditFunction();
    expect(Array.isArray(edits)).toBe(true);
    expect(edits[0]!.kind).toBe("object");
  });

  test('getMcpToolCapability("structured_output") is defined', () => {
    const cap = getMcpToolCapability("structured_output");
    expect(cap).toBeDefined();
    expect(cap!.toolName).toBe("structured_output");
    expect(cap!.mutationKind).toBe("none");
    expect(cap!.externalEgress).toBe(false);
  });
});
