/**
 * Self-ontology structural fingerprint — McpTool surface drift guard (HO-2).
 *
 * PURPOSE. pm registers its MCP surface as the `McpTool` ObjectType + 23 tool
 * instances (the self-ontology's mechanically-extracted Hands layer). The seed
 * (`runtime-overlay/schemas-snapshot/ontology/self/mcp-tool.objecttype.ts`) is
 * IDENTITY-ONLY by design — it carries `{ toolName }` per instance and nothing
 * more. The pre-existing drift guard could therefore only compare the NAME SET.
 * HO-2 generalizes that to a deterministic STRUCTURAL fingerprint over each
 * tool's `{ name, inputSchema }`, so a silent input-contract break — a param
 * add / remove / rename / retype, an enum-membership change, a required<->optional
 * flip, an `additionalProperties` tighten/loosen — fails loud instead of slipping
 * past a name-only check.
 *
 * DELIBERATE ALTITUDE ASYMMETRY (load-bearing — do NOT "fix" it). The fingerprint
 * hashes the INPUT contract only. An INPUT-schema change is identity-relevant: it
 * is the surface a caller binds to, so it is FLAGGED (structural-drift). An OUTPUT
 * shape change sits BELOW the registered IDENTITY altitude the self-ontology models,
 * so it is ABSORBED (never representable in the fingerprint). This is why pm 7.13.0
 * — which added `runtimeIdentity` to the OUTPUT of `pm_plugin_self_check` — is
 * correctly classified as a non-drift "match": that field is not in any `inputSchema`,
 * so the `{name, inputSchema}` fingerprint is byte-identical pre/post 7.13.0. A
 * fingerprint that flagged 7.13.0 would be modeled at the WRONG altitude and is WRONG.
 * (DESIGN §6 — IDENTITY altitude.)
 *
 * PURITY. This module is PURE: deterministic, no I/O, no LLM, no clock, no network,
 * no randomness. It takes the tools array as an argument. DETECT-only — it returns a
 * verdict; it never writes the seed, never proposes a mutation, never auto-applies.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Structural input-contract fingerprint drift guard for pm's McpTool self-ontology (HO-2)
 */

import { createHash } from "node:crypto";

/** A tool as seen on the live bridge surface — only the fields the fingerprint reads. */
export interface FingerprintableTool {
  name: string;
  inputSchema: unknown;
}

/**
 * Prose / annotation-only JSON-Schema keys that are NOT part of the input contract.
 * Stripped by NORMALIZE so a documentation edit does not register as drift.
 *
 * FIX 3: this is a DENYLIST over an open JSON-Schema annotation vocabulary, paired
 * with `assertNoUnknownAnnotationKeys` (a fail-loud guard) so a future prose key
 * (e.g. `examples`, `deprecated`, `readOnly`) cannot SILENTLY flip the fingerprint —
 * the guard test fires first, forcing an explicit classification decision.
 */
export const PROSE_KEYS: ReadonlySet<string> = new Set(["description", "title", "$comment"]);

/**
 * The full set of JSON-Schema annotation keys we KNOW about. Any annotation-class
 * key seen in a schema that is NOT in this set is unexpected and must be classified
 * (contract vs prose) before the fingerprint can be trusted. Contract-bearing keys
 * (type, properties, required, enum, items, additionalProperties, default, ...) are
 * intentionally NOT listed here — only the annotation vocabulary is enumerated.
 */
export const KNOWN_ANNOTATION_KEYS: ReadonlySet<string> = new Set(["description", "title", "$comment"]);

/**
 * Recursively NORMALIZE an inputSchema into a canonical value for hashing:
 *   (a) strip PROSE keys (PROSE_KEYS) — prose, not contract;
 *   (b) KEEP `default` VERBATIM — it is part of the input contract (FIX 2);
 *   (c) stable-sort object keys (deterministic ordering);
 *   (d) leave arrays in source order (array element order can be contract-significant,
 *       e.g. tuple `items`); the deterministic JSON serialize handles the rest.
 *
 * Pure: returns a new value, never mutates the input.
 */
export function normalizeInputSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((el) => normalizeInputSchema(el));
  }
  if (schema !== null && typeof schema === "object") {
    const src = schema as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src).sort()) {
      if (PROSE_KEYS.has(key)) continue; // strip prose; `default` is NOT a prose key → kept verbatim
      out[key] = normalizeInputSchema(src[key]);
    }
    return out;
  }
  return schema; // primitives (string/number/boolean/null) verbatim
}

/**
 * FIX 3 fail-loud guard. Walks an inputSchema and collects every key that LOOKS like
 * an annotation key (present in any tool but not a recognized contract construct) yet
 * is NOT in KNOWN_ANNOTATION_KEYS. Callers (a unit test) assert the returned set is
 * empty across all 23 inputSchemas, so a newly-introduced prose key fails loud.
 *
 * We cannot enumerate the open contract vocabulary, so this guard is scoped to the
 * KNOWN prose family: it reports any key that collides with the prose-NAMING pattern
 * the denylist governs but was not explicitly classified. Concretely, it flags any
 * occurrence of a key in a caller-supplied `candidateAnnotationKeys` set that is not
 * also in KNOWN_ANNOTATION_KEYS. The unit test supplies the JSON-Schema annotation
 * family it wants pinned.
 */
export function findUnclassifiedAnnotationKeys(
  schema: unknown,
  candidateAnnotationKeys: ReadonlySet<string>,
): Set<string> {
  const found = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const el of node) walk(el);
      return;
    }
    if (node !== null && typeof node === "object") {
      for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
        if (candidateAnnotationKeys.has(key) && !KNOWN_ANNOTATION_KEYS.has(key)) {
          found.add(key);
        }
        walk(val);
      }
    }
  };
  walk(schema);
  return found;
}

/** Deterministic, whitespace-free JSON serialization of an already-normalized value. */
function canonicalJSON(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Fingerprint a single tool = sha256 hex of the normalized `{name, inputSchema}`.
 * The `name` is included so a rename is caught structurally (it changes the hashed
 * payload), and so a fingerprint is self-describing of which tool it pins.
 */
export function fingerprintTool(tool: FingerprintableTool): string {
  const payload = canonicalJSON({
    name: tool.name,
    inputSchema: normalizeInputSchema(tool.inputSchema),
  });
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/** Fingerprint a whole surface → `{ name → fingerprint }`. */
export function fingerprintSurface(tools: readonly FingerprintableTool[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tool of tools) {
    out[tool.name] = fingerprintTool(tool);
  }
  return out;
}

export type ToolDriftStatus = "match" | "structural-drift" | "added" | "removed";

export interface PerToolResult {
  name: string;
  status: ToolDriftStatus;
}

export interface SurfaceComparison {
  perTool: PerToolResult[];
  drift: boolean;
}

/**
 * Compare a live tools array against a golden `{ name → fingerprint }` baseline.
 *   - match            — name present in both; live fingerprint === golden fingerprint.
 *   - structural-drift — name present in both; live fingerprint !== golden fingerprint.
 *   - added            — name present live, absent in golden.
 *   - removed          — name present in golden, absent live.
 * `drift` is true iff any tool is not `match`. PURE — takes both sides as args.
 */
export function compareToolSurface(
  liveTools: readonly FingerprintableTool[],
  goldenFingerprints: Record<string, string>,
): SurfaceComparison {
  const liveFingerprints = fingerprintSurface(liveTools);
  const names = new Set<string>([...Object.keys(liveFingerprints), ...Object.keys(goldenFingerprints)]);
  const perTool: PerToolResult[] = [];
  for (const name of [...names].sort()) {
    const live = liveFingerprints[name];
    const golden = goldenFingerprints[name];
    let status: ToolDriftStatus;
    if (live !== undefined && golden !== undefined) {
      status = live === golden ? "match" : "structural-drift";
    } else if (live !== undefined) {
      status = "added";
    } else {
      status = "removed";
    }
    perTool.push({ name, status });
  }
  return { perTool, drift: perTool.some((t) => t.status !== "match") };
}
