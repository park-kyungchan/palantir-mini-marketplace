/**
 * Structured-output capability contract (verify/recover layer) — O-1 / SI-1.
 *
 * The DATA contract only — no behavior, no I/O (mirrors lib/sandbox/contract.ts).
 * Models the `StructuredOutput` Tier-2 ActionType + `structuredOutputFillOrFallback`
 * Function in the self-Ontology (runtime-overlay/.../self/{action-types,functions}.ts).
 *
 * This is the structural form of the rule-05 anti-stall clause: a model-produced
 * candidate is EITHER returned as a validated structured value OR collapses to a
 * bounded fallback text. Termination is a property of the MACHINERY (lib/structured-
 * output/index.ts) — a fixed finite path with a hard integer retry ceiling and a
 * guaranteed fallback — NOT of caller discipline. The big/open-ended StructuredOutput
 * that caused two unrecoverable validation loops (rule 05 failure mode) cannot recur:
 * the pre-size gate kills the ~1 MB case and the bounded loop kills the retry case.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Structured-output request/result DATA contract (O-1)
 */

/**
 * A small bounded JSON-Schema target. Kept as an opaque object here — the engine
 * validates a candidate against it via the injected validator port (no schema
 * library imported into the contract). Open-endedness (e.g. an empty schema that
 * accepts everything / nothing meaningfully) is the caller's responsibility to
 * bound; the engine treats an undefined validator verdict as a failed attempt.
 */
export type JSONSchema = Record<string, unknown>;

/** The only overflow sink kind allowed in v0 — write the oversized candidate to a file. */
export const OVERFLOW_SINK_KINDS = ["file"] as const;
export type OverflowSinkKind = (typeof OVERFLOW_SINK_KINDS)[number];

/** Shipped defaults (approved contract): 16 KiB pre-size cap, 2 bounded retries. */
export const DEFAULT_MAX_BYTES = 16384;
export const DEFAULT_MAX_RETRIES = 2;

/**
 * Structured-output request — the engine's input.
 * `maxBytes` / `maxRetries` carry the shipped defaults when omitted by the caller.
 */
export interface StructuredOutputRequest {
  /** Small bounded validation target. */
  readonly schema: JSONSchema;
  /** The value to validate (model-produced). May be absent (⇒ retries-exhausted fallback). */
  readonly candidate?: unknown;
  /** Pre-size gate ceiling in bytes. Default DEFAULT_MAX_BYTES (16 KiB). */
  readonly maxBytes?: number;
  /** Hard integer retry ceiling for the bounded validate loop. Default DEFAULT_MAX_RETRIES (2). */
  readonly maxRetries?: number;
  /** The only sink allowed — write the oversized candidate to a file. */
  readonly overflowSink?: OverflowSinkKind;
}

/** Why a request collapsed to the bounded fallback (the non-ok terminal reasons). */
export type StructuredOutputFallbackReason =
  | "oversize"
  | "retries_exhausted"
  | "schema_too_open";

/** Descriptor of where an oversized candidate was sunk (present on reason:"oversize"). */
export interface StructuredOutputSink {
  readonly path: string;
  readonly bytes: number;
}

/**
 * Structured-output result — a discriminated union that is ALWAYS terminal.
 * Every engine branch returns one of these two shapes; no branch re-enters
 * validation unbounded. `ok:true` carries the validated value; `ok:false`
 * carries a bounded fallback text + the terminal reason (+ sink when sunk).
 */
export type StructuredOutputResult =
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly fallbackText: string;
      readonly reason: StructuredOutputFallbackReason;
      readonly sink?: StructuredOutputSink;
    };

/**
 * Minimal structural sink port — a LOCAL mirror (decoupled-port idiom, the
 * lib/sandbox/contract.ts:SandboxClientPort precedent). The engine writes an
 * oversized candidate THROUGH this port only; it NEVER calls fs.write directly
 * outside the declared sink. The concrete provider (filesystem write) is injected
 * at the wiring boundary; tests inject a fake that records the write.
 */
export interface StructuredOutputSinkPort {
  /** Persist the oversized serialized candidate; return where it landed. */
  write(serialized: string): StructuredOutputSink | Promise<StructuredOutputSink>;
}

/**
 * Validator port — mirrors a JSON-Schema validate(candidate, schema) verdict.
 * Returns true when the candidate conforms. Injected so the lib stays decoupled
 * from any concrete schema library; the shipped default is a minimal structural
 * validator (engine module). A thrown / undefined verdict counts as a failed
 * attempt (the bounded loop treats it as non-conforming, never as a crash).
 */
export interface StructuredOutputValidatorPort {
  validate(candidate: unknown, schema: JSONSchema): boolean;
}
