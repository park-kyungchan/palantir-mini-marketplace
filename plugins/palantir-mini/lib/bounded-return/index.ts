/**
 * Bounded-return firehose cure (verify/recover layer) — cross-cutting MCP response cap.
 *
 * Audit G1 found ≥7 MCP read tools serialize uncapped ontology/workflow state (worst:
 * pm_ontology_engineering_workflow ~1.59 MB, ontology_context_query ~100 KB) with NO
 * byte ceiling — a firehose that floods the model context. The canonical anti-pattern
 * reference is lib/structured-output/ (the ONLY surface with a designed-in byte ceiling
 * + injected file-sink). Per rule 05 §3 (structural enforcement over per-handler
 * discipline), the cure is THIS shared helper applied at the SINGLE MCP server response
 * seam so EVERY oversized tool payload degrades to {summary, fullPath, bytes, digest} —
 * with ZERO change for normal (under-ceiling) responses.
 *
 * ── BOUNDING IS A PROPERTY OF THE MACHINERY ─────────────────────────────────────
 * `boundedReturn` is pure compute + AT MOST ONE sink write. It serializes the full
 * result once; if it fits under the ceiling it is returned verbatim; otherwise it is
 * written THROUGH the injected sink port and only the small {summary, path, bytes,
 * digest} crosses the wire. No fs in the lib (decoupled-port idiom, mirroring
 * lib/structured-output/contract.ts:StructuredOutputSinkPort); the concrete fs sink is
 * injected at the wiring boundary (bridge/mcp-server.ts).
 *
 * @owner palantirkc-plugin-actions
 * @purpose Cross-cutting MCP response byte ceiling (firehose cure — audit G1 / rule 05 §3)
 */

import { createHash } from "node:crypto";

/**
 * 64 KiB. High enough to pass typical tool responses inline (no behavior change on the
 * common path), low enough to catch the 100 KB – 1.59 MB firehose. Tunable via env at
 * the call site (PALANTIR_MINI_MCP_MAX_RESPONSE_BYTES in bridge/mcp-server.ts).
 */
export const DEFAULT_BOUNDED_RETURN_MAX_BYTES = 65536;

/** Descriptor of where an oversized full result was sunk. */
export interface BoundedReturnSink {
  readonly path: string;
  readonly bytes: number;
}

/**
 * Minimal structural sink port — a LOCAL mirror (decoupled-port idiom, the
 * lib/structured-output/contract.ts:StructuredOutputSinkPort precedent). The helper
 * writes an oversized serialized full result THROUGH this port only; it NEVER calls fs
 * directly. The concrete provider (filesystem write) is injected at the wiring boundary;
 * tests inject a fake that records the write.
 */
export interface BoundedReturnSinkPort {
  /** Persist the oversized serialized full result; return where it landed. */
  write(serialized: string): BoundedReturnSink | Promise<BoundedReturnSink>;
}

/**
 * Circular-safe JSON serializer — copies lib/structured-output/index.ts:defaultSerialize.
 * A WeakSet circular guard ensures a pathological self-referential value cannot throw and
 * stall the seam; a non-serializable value collapses to a finite marker string.
 */
export function serialize(value: unknown): string {
  try {
    const seen = new WeakSet<object>();
    return (
      JSON.stringify(value, (_key, v) => {
        if (v !== null && typeof v === "object") {
          if (seen.has(v as object)) return "[Circular]";
          seen.add(v as object);
        }
        return v;
      }) ?? "undefined"
    );
  } catch {
    return "[Unserializable]";
  }
}

/** Byte length of a string's UTF-8 serialization. Stable + total (never throws). */
export function byteLen(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

/** A primitive's compact JSON is "small" when it stays under this many bytes. */
const SMALL_PRIMITIVE_JSON_BYTES = 80;

/** Compact per-value descriptor for the top-level projection. Never throws. */
function describeValue(value: unknown): unknown {
  if (Array.isArray(value)) return { kind: "array", length: value.length };
  if (value !== null && typeof value === "object") {
    return { kind: "object", keys: Object.keys(value as Record<string, unknown>).length };
  }
  if (typeof value === "string") return { kind: "string", chars: value.length };
  // Primitive (number / boolean / null / undefined / bigint / symbol): inline it when
  // its JSON is small, else fall back to a kind descriptor.
  let json: string;
  try {
    json = JSON.stringify(value) ?? "";
  } catch {
    json = "";
  }
  if (json !== "" && byteLen(json) < SMALL_PRIMITIVE_JSON_BYTES) return value;
  return { kind: typeof value };
}

/**
 * A SMALL top-level projection of an arbitrary result so the caller can decide whether
 * to fetch the full file WITHOUT the full payload. For a non-array object, maps each
 * top-level key to a compact descriptor (array ⇒ {kind:"array",length}, object ⇒
 * {kind:"object",keys}, string ⇒ {kind:"string",chars}, else the primitive inline when
 * tiny, else {kind:typeof}). For a non-object top level returns {kind:typeof, ...}.
 * Tiny + total — never throws.
 */
export function genericResultSummary(value: unknown): Record<string, unknown> {
  if (value === null) {
    return { kind: "null" };
  }
  if (Array.isArray(value)) {
    return { kind: "array", length: value.length };
  }
  if (typeof value !== "object") {
    const desc = describeValue(value);
    // Primitive inline ⇒ wrap under `value`; kind-descriptor ⇒ spread it.
    if (desc !== null && typeof desc === "object") return desc as Record<string, unknown>;
    return { kind: typeof value, value: desc };
  }
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    out[key] = describeValue(obj[key]);
  }
  return out;
}

/**
 * Bounded-return result — a discriminated union. `bounded:false` carries the full result
 * inline (the common, under-ceiling path); `bounded:true` carries the small summary plus
 * a pointer (fullPath + bytes + digest) to the sunk full result.
 */
export type BoundedReturnResult<TSummary, TFull> =
  | { readonly bounded: false; readonly summary: TSummary; readonly full: TFull }
  | {
      readonly bounded: true;
      readonly summary: TSummary;
      readonly fullPath: string;
      readonly bytes: number;
      readonly digest: string;
    };

/** Bounded-return request — the helper's input. */
export interface BoundedReturnRequest<TSummary, TFull> {
  readonly summary: TSummary;
  readonly full: TFull;
  /** Pre-size gate ceiling in bytes. Default DEFAULT_BOUNDED_RETURN_MAX_BYTES (64 KiB). */
  readonly maxBytes?: number;
  /**
   * Pre-serialized form of `full`; when provided it is used for the size gate, sink write,
   * and digest INSTEAD of re-serializing — so the caller's exact serialization is measured
   * + persisted, preventing a compact-vs-indented size discrepancy.
   */
  readonly serialized?: string;
}

/**
 * The fixed finite path: serialize `request.full` once; if it fits under the ceiling
 * return it inline; otherwise sink it THROUGH the injected port and return a small
 * pointer. Pure compute + AT MOST ONE sink write; no fs in the lib.
 *
 * @returns bounded:false with the full value, OR bounded:true with {fullPath, bytes, digest}.
 */
export async function boundedReturn<TSummary, TFull>(
  request: BoundedReturnRequest<TSummary, TFull>,
  sink: BoundedReturnSinkPort,
): Promise<BoundedReturnResult<TSummary, TFull>> {
  const maxBytes = request.maxBytes ?? DEFAULT_BOUNDED_RETURN_MAX_BYTES;
  const serialized = request.serialized ?? serialize(request.full);

  // ── Pre-size gate: kills the firehose BEFORE the payload crosses the wire. ──
  if (byteLen(serialized) <= maxBytes) {
    return { bounded: false, summary: request.summary, full: request.full };
  }

  const written = await sink.write(serialized);
  const digest = createHash("sha256").update(serialized).digest("hex").slice(0, 16);
  return {
    bounded: true,
    summary: request.summary,
    fullPath: written.path,
    bytes: written.bytes,
    digest,
  };
}
