/**
 * Tests: bounded-return firehose cure — PROVES bounding is a property of the machinery.
 *
 * The two terminal paths of boundedReturn (lib/bounded-return/index.ts) — under-ceiling
 * inline + over-ceiling sink+pointer — plus genericResultSummary projection and the
 * circular-safe serialize guard. bun:test, importing the lib directly (lib-test idiom).
 * A FAKE sink records the write + returns a fixed descriptor — the real fs is never
 * touched here (the concrete fs sink lives at the wiring boundary in bridge/mcp-server.ts).
 */

import { test, expect, describe } from "bun:test";
import {
  boundedReturn,
  genericResultSummary,
  serialize,
  DEFAULT_BOUNDED_RETURN_MAX_BYTES,
  type BoundedReturnSink,
  type BoundedReturnSinkPort,
} from "../../lib/bounded-return";

/** Fake sink port — records each write, returns a fixed synthetic descriptor (no fs). */
function recordingSink(fixedPath = "/tmp/fake-overflow.json"): {
  port: BoundedReturnSinkPort;
  writes: string[];
} {
  const writes: string[] = [];
  return {
    writes,
    port: {
      write(serialized: string): BoundedReturnSink {
        writes.push(serialized);
        return { path: fixedPath, bytes: Buffer.byteLength(serialized, "utf8") };
      },
    },
  };
}

describe("bounded-return — bounding is a property of the machinery", () => {
  test("(a) under-ceiling -> bounded:false, full returned verbatim, summary present", async () => {
    const sink = recordingSink();
    const full = { a: 1, b: ["x", "y"], note: "small" };
    const summary = genericResultSummary(full);
    const result = await boundedReturn({ summary, full }, sink.port);

    expect(result.bounded).toBe(false);
    if (result.bounded === false) {
      // The full result is returned by identity — verbatim, no copy.
      expect(result.full).toBe(full);
      expect(result.summary).toBe(summary);
    }
    // Common path never writes through the sink.
    expect(sink.writes.length).toBe(0);
  });

  test("(b) over-ceiling -> bounded:true, sink written once, {fullPath, bytes, digest(16 hex), summary}", async () => {
    const sink = recordingSink("/tmp/over.json");
    const full = { blob: "x".repeat(5000) };
    const summary = genericResultSummary(full);
    // tiny maxBytes forces the over-ceiling branch.
    const result = await boundedReturn({ summary, full, maxBytes: 10 }, sink.port);

    expect(result.bounded).toBe(true);
    if (result.bounded === true) {
      expect(result.fullPath).toBe("/tmp/over.json");
      expect(result.bytes).toBeGreaterThan(10);
      expect(result.summary).toBe(summary);
      // 16 hex chars (sha256 sliced to 16).
      expect(result.digest).toMatch(/^[0-9a-f]{16}$/);
    }
    // Exactly ONE sink write, carrying the serialized full result.
    expect(sink.writes.length).toBe(1);
    expect(sink.writes[0]).toBe(JSON.stringify(full));
  });

  test("(b') default ceiling is 64 KiB — a sub-ceiling payload stays inline", async () => {
    const sink = recordingSink();
    expect(DEFAULT_BOUNDED_RETURN_MAX_BYTES).toBe(65536);
    const full = { blob: "x".repeat(1000) }; // ~1 KB << 64 KiB
    const result = await boundedReturn({ summary: {}, full }, sink.port);
    expect(result.bounded).toBe(false);
    expect(sink.writes.length).toBe(0);
  });

  test("(c) genericResultSummary maps array/object/string/primitive top-level keys to compact descriptors", () => {
    const summary = genericResultSummary({
      list: [1, 2, 3],
      nested: { p: 1, q: 2 },
      label: "hello",
      count: 42,
      flag: true,
    });
    expect(summary.list).toEqual({ kind: "array", length: 3 });
    expect(summary.nested).toEqual({ kind: "object", keys: 2 });
    expect(summary.label).toEqual({ kind: "string", chars: 5 });
    // Small primitives are inlined verbatim.
    expect(summary.count).toBe(42);
    expect(summary.flag).toBe(true);
  });

  test("(c') genericResultSummary on a non-object top level returns a kind descriptor", () => {
    expect(genericResultSummary([1, 2, 3])).toEqual({ kind: "array", length: 3 });
    expect(genericResultSummary("plain")).toEqual({ kind: "string", chars: 5 });
    expect(genericResultSummary(7)).toEqual({ kind: "number", value: 7 });
  });

  test("(d) circular-safe serialize does not throw on a self-referential object", () => {
    const cyclic: Record<string, unknown> = { name: "loop" };
    cyclic.self = cyclic;
    let out = "";
    expect(() => {
      out = serialize(cyclic);
    }).not.toThrow();
    expect(out).toContain("[Circular]");
  });

  test("(e) indent-gap no longer leaks: a provided indented `serialized` over the ceiling forces bounded:true (the compact form fitting is irrelevant)", async () => {
    const sink = recordingSink("/tmp/indent-gap.json");
    // COMPACT form is small (under maxBytes); the caller's INDENTED form exceeds it.
    const full = { a: 1, b: 2, c: 3 };
    const compact = JSON.stringify(full); // would fit under maxBytes
    const indented = JSON.stringify(full, null, 2); // larger — exceeds maxBytes
    const maxBytes = Buffer.byteLength(compact, "utf8") + 1; // compact fits, indented does not
    expect(Buffer.byteLength(indented, "utf8")).toBeGreaterThan(maxBytes);

    const summary = genericResultSummary(full);
    const result = await boundedReturn(
      { summary, full, serialized: indented, maxBytes },
      sink.port,
    );

    expect(result.bounded).toBe(true);
    // The sink received THAT indented string — NOT a compact re-serialization.
    expect(sink.writes.length).toBe(1);
    expect(sink.writes[0]).toBe(indented);
    expect(sink.writes[0]).not.toBe(compact);
  });

  test("(e') serialized passthrough digest: sink write arg + digest derive from the provided `serialized`", async () => {
    const sink = recordingSink("/tmp/passthrough.json");
    const full = { x: "y" };
    const provided = "SENTINEL-PROVIDED-SERIALIZATION-" + "z".repeat(100);
    const result = await boundedReturn(
      { summary: { kind: "object", keys: 1 }, full, serialized: provided, maxBytes: 10 },
      sink.port,
    );
    expect(result.bounded).toBe(true);
    // The exact provided string was written (not serialize(full)).
    expect(sink.writes.length).toBe(1);
    expect(sink.writes[0]).toBe(provided);
    expect(sink.writes[0]).not.toBe(serialize(full));
    if (result.bounded === true) {
      // Digest is sha256(provided).slice(0,16) — derived from the provided form.
      const { createHash } = await import("node:crypto");
      const expected = createHash("sha256").update(provided).digest("hex").slice(0, 16);
      expect(result.digest).toBe(expected);
    }
  });

  test("(f) genericResultSummary(null) => {kind:'null'}", () => {
    expect(genericResultSummary(null)).toEqual({ kind: "null" });
  });

  test("(d') boundedReturn over a circular full result still terminates (sink gets the marker form)", async () => {
    const sink = recordingSink("/tmp/cyclic.json");
    const cyclic: Record<string, unknown> = { blob: "x".repeat(5000) };
    cyclic.self = cyclic;
    const result = await boundedReturn(
      { summary: { kind: "object", keys: 2 }, full: cyclic, maxBytes: 10 },
      sink.port,
    );
    expect(result.bounded).toBe(true);
    expect(sink.writes.length).toBe(1);
    expect(sink.writes[0]).toContain("[Circular]");
  });
});
