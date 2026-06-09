/**
 * Structured-output termination-guarantee engine (verify/recover layer) — O-1 / SI-1.
 *
 * The runtime impl of the `StructuredOutput` Tier-2 ActionType
 * (runtime-overlay/.../self/action-types.ts:STRUCTURED_OUTPUT_ACTION_TYPE) and the
 * `structuredOutputFillOrFallback` Function (self/functions.ts). DI-with-shipped-
 * defaults (lib/sandbox/executor.ts idiom): the un-defaultable sink port is injected
 * at the wiring boundary; the validator + serializer default to shipped primitives,
 * overridden in tests.
 *
 * ── TERMINATION IS A PROPERTY OF THE MACHINERY ──────────────────────────────────
 * `fillOrFallback` runs a FIXED 3-step finite path. EVERY branch returns an
 * `ok:true | ok:false` StructuredOutputResult; NO branch re-enters validation
 * unbounded:
 *   (1) pre-size gate    — byteLen(candidate) > maxBytes ⇒ sink + {ok:false,"oversize"}.
 *   (2) bounded validate — `for (let i=0; i<=maxRetries; i++)` (hard integer ceiling).
 *   (3) guaranteed fallback — after the loop ⇒ {ok:false,"retries_exhausted"}.
 * There is no `while`, no recursion, no unbounded retry — the loop variable is a
 * machine integer bounded by `maxRetries`, so the function provably halts. This is
 * the structural cure for the rule-05 unrecoverable-validation-loop failure mode.
 *
 * The sink port is a LOCAL structural mirror (decoupled-port idiom) so the lib stays
 * out of the shared-core compile graph. v0 = pure compute + at most ONE sink write;
 * no Executor needed.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Structured-output non-looping fill-or-fallback engine (O-1)
 */

import type { OntologyEdit } from "../event-log/types";
import { registerEditFunction } from "../actions/tier2-function";
import {
  type JSONSchema,
  type StructuredOutputRequest,
  type StructuredOutputResult,
  type StructuredOutputSinkPort,
  type StructuredOutputValidatorPort,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_RETRIES,
} from "./contract";

/**
 * MUST equal `STRUCTURED_OUTPUT_ACTION_TYPE.editFunctionName` in the self-model
 * snapshot (self/action-types.ts) so the typed MEANING and the runtime reconcile.
 * Equality is asserted in tests/lib/structured-output.test.ts.
 */
export const STRUCTURED_OUTPUT_EDIT_FUNCTION_NAME = "pm.structuredOutput.fillOrFallback";

/** Byte length of a value's JSON serialization (UTF-8). Stable + total (never throws). */
function byteLen(serialized: string): number {
  return Buffer.byteLength(serialized, "utf8");
}

/**
 * Default serializer — JSON with a circular-ref guard so a pathological candidate
 * cannot throw and stall the path. A non-serializable candidate serializes to a
 * marker string (still finite); the pre-size gate / validator handle it normally.
 */
function defaultSerialize(candidate: unknown): string {
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(
      candidate,
      (_key, value) => {
        if (value !== null && typeof value === "object") {
          if (seen.has(value as object)) return "[Circular]";
          seen.add(value as object);
        }
        return value;
      },
    ) ?? "undefined";
  } catch {
    return "[Unserializable]";
  }
}

/**
 * Default validator — a minimal STRUCTURAL JSON-Schema check (top-level only):
 *   - `type:"object"` ⇒ candidate must be a non-array object.
 *   - `required: string[]` ⇒ each named key must be present.
 *   - `type:"array"` / `"string"` / `"number"` / `"boolean"` ⇒ primitive type match.
 * Anything else is treated as "schema too open to validate" ⇒ returns false (a
 * failed attempt, never a crash). Callers needing full JSON-Schema inject a real
 * validator via deps.validator. Never throws — a thrown verdict counts as a fail.
 */
function defaultValidate(candidate: unknown, schema: JSONSchema): boolean {
  const t = schema?.type;
  if (t === "object") {
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
      return false;
    }
    const required = schema.required;
    if (Array.isArray(required)) {
      const obj = candidate as Record<string, unknown>;
      for (const key of required) {
        if (typeof key !== "string" || !(key in obj)) return false;
      }
    }
    return true;
  }
  if (t === "array") return Array.isArray(candidate);
  if (t === "string") return typeof candidate === "string";
  if (t === "number") return typeof candidate === "number";
  if (t === "boolean") return typeof candidate === "boolean";
  // No recognizable bounded shape ⇒ too open to validate.
  return false;
}

/** Bounded fallback text for a non-ok terminal — short, never the full candidate. */
function fallbackTextFor(reason: string, serializedBytes: number): string {
  return (
    `structured_output fell back (reason=${reason}); ` +
    `candidate was ${serializedBytes} bytes. The caller should consume fallbackText ` +
    `instead of a structured value — no retry is attempted (termination guaranteed).`
  );
}

/** Injectable engine dependencies (shipped defaults + the un-defaultable sink port). */
export interface FillOrFallbackDeps {
  /** Un-defaultable: where an oversized candidate is sunk (injected at the wiring boundary). */
  readonly sink: StructuredOutputSinkPort;
  /** Defaults to the shipped minimal structural validator. */
  readonly validator?: StructuredOutputValidatorPort;
  /** Defaults to the shipped circular-safe JSON serializer. */
  readonly serialize?: (candidate: unknown) => string;
  /**
   * Test-only counter hook — invoked once per validation ATTEMPT. Lets the
   * non-looping test prove the engine validates AT MOST maxRetries+1 times.
   */
  readonly onValidationAttempt?: () => void;
}

/**
 * The fixed 3-step finite path. Always returns a terminal StructuredOutputResult.
 *
 * @returns ok:true with the validated value, OR ok:false with a bounded fallback.
 */
export async function fillOrFallback(
  request: StructuredOutputRequest,
  deps: FillOrFallbackDeps,
): Promise<StructuredOutputResult> {
  const maxBytes = request.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRetries = request.maxRetries ?? DEFAULT_MAX_RETRIES;
  const serialize = deps.serialize ?? defaultSerialize;
  const validate = (deps.validator?.validate ?? defaultValidate);

  const serialized = serialize(request.candidate);
  const bytes = byteLen(serialized);

  // ── Step 1: pre-size gate. Kills the ~1 MB failure mode BEFORE any validation. ──
  if (bytes > maxBytes) {
    const sink = await deps.sink.write(serialized);
    return {
      ok: false,
      reason: "oversize",
      fallbackText: fallbackTextFor("oversize", bytes),
      sink,
    };
  }

  // ── Step 2: bounded validate-retry. Hard integer ceiling ⇒ provably halts. ──
  // i ∈ [0, maxRetries] ⇒ AT MOST maxRetries+1 attempts; no branch re-enters unbounded.
  for (let i = 0; i <= maxRetries; i++) {
    deps.onValidationAttempt?.();
    let conforms = false;
    try {
      conforms = validate(request.candidate, request.schema);
    } catch {
      // A thrown verdict counts as a failed attempt — never a crash, never a stall.
      conforms = false;
    }
    if (conforms) {
      return { ok: true, value: request.candidate };
    }
  }

  // ── Step 3: guaranteed fallback. The bounded loop is exhausted ⇒ terminal. ──
  return {
    ok: false,
    reason: "retries_exhausted",
    fallbackText: fallbackTextFor("retries_exhausted", bytes),
  };
}

/**
 * THIN pure wrapper registered under the ActionType's editFunctionName so the
 * ActionType↔editFunctionName parity holds like the four O-2 register verbs. It
 * does NOT run the engine (the engine needs an injected sink + is async); it
 * returns a single descriptor OntologyEdit declaring the structured-output capability,
 * keeping the EditFunction PURE (no fs, no commit) per the tier2-function contract.
 * The MCP handler is the live execution path; this wrapper exists so
 * `getEditFunction(STRUCTURED_OUTPUT_EDIT_FUNCTION_NAME)` resolves (self-model parity).
 */
export function structuredOutputEditFunction(): OntologyEdit[] {
  return [
    {
      kind: "object",
      rid: "pm.self.ontology/function/structured-output-fill-or-fallback",
      properties: {
        primitiveKind: "Function",
        functionName: "structuredOutputFillOrFallback",
        deterministic: true,
      },
    },
  ];
}

// ── Side-effect: register under the ActionType's forward-named editFunctionName. ──
registerEditFunction({
  name: STRUCTURED_OUTPUT_EDIT_FUNCTION_NAME,
  description:
    "Structured-output fill-or-fallback — the ActionType-parity edit-function. Pure " +
    "compute returning the capability descriptor OntologyEdit; the MCP handler runs the " +
    "non-looping engine (lib/structured-output/index.ts:fillOrFallback).",
  apply: structuredOutputEditFunction,
});
