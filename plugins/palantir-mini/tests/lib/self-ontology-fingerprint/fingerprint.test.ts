// HO-2 unit tests — the PURE structural fingerprint over a tool's {name, inputSchema}.
// Proves: `default` is part of the contract (FIX 2); prose keys are ignored AND a new
// prose key fails loud (FIX 3); param add/rename/retype/required-flip each drift;
// an OUTPUT-field add (7.13.0-class) is ABSORBED (still "match"); added/removed surface
// statuses are correct.

import { test, expect } from "bun:test";
import {
  normalizeInputSchema,
  fingerprintTool,
  fingerprintSurface,
  compareToolSurface,
  findUnclassifiedAnnotationKeys,
  KNOWN_ANNOTATION_KEYS,
  type FingerprintableTool,
} from "../../../lib/self-ontology-fingerprint";

const base = (inputSchema: unknown): FingerprintableTool => ({ name: "t", inputSchema });

// ── (i) `default` is part of the input contract — a flip MUST change the fp (FIX 2). ──
test("default value is contract: a default flip changes the fingerprint", () => {
  const a = base({ type: "object", properties: { mode: { type: "string", default: "fast" } } });
  const b = base({ type: "object", properties: { mode: { type: "string", default: "slow" } } });
  expect(fingerprintTool(a)).not.toBe(fingerprintTool(b));
  // and removing the default entirely is also drift
  const c = base({ type: "object", properties: { mode: { type: "string" } } });
  expect(fingerprintTool(a)).not.toBe(fingerprintTool(c));
});

// ── (ii) prose keys ignored; the fail-loud guard fires on an UNEXPECTED prose key (FIX 3). ──
test("prose keys (description/title/$comment) are stripped → fingerprint unchanged", () => {
  const bare = base({ type: "object", properties: { p: { type: "string" } } });
  const prosy = base({
    type: "object",
    title: "T",
    description: "doc",
    properties: { p: { type: "string", description: "the p", $comment: "internal" } },
  });
  expect(fingerprintTool(prosy)).toBe(fingerprintTool(bare));
});

test("fail-loud guard: a NEW annotation key (examples) is unclassified and fires", () => {
  // The annotation family we want pinned. `examples` is annotation-class but NOT in
  // KNOWN_ANNOTATION_KEYS → must be reported so it cannot silently flip the fingerprint.
  const annotationFamily = new Set(["description", "title", "$comment", "examples", "deprecated", "readOnly"]);
  const known = base({ type: "object", properties: { p: { type: "string", description: "ok" } } });
  expect(findUnclassifiedAnnotationKeys(known.inputSchema, annotationFamily).size).toBe(0);

  const withNewProse = base({ type: "object", properties: { p: { type: "string", examples: ["x"] } } });
  const flagged = findUnclassifiedAnnotationKeys(withNewProse.inputSchema, annotationFamily);
  expect(flagged.has("examples")).toBe(true);
  // sanity: the known prose keys are NOT flagged (they ARE classified)
  expect(KNOWN_ANNOTATION_KEYS.has("description")).toBe(true);
});

// ── (iii) param add / rename / retype / required<->optional each change the fp. ──
test("param add changes the fingerprint", () => {
  const a = base({ type: "object", properties: { p: { type: "string" } } });
  const b = base({ type: "object", properties: { p: { type: "string" }, q: { type: "number" } } });
  expect(fingerprintTool(a)).not.toBe(fingerprintTool(b));
});

test("param rename changes the fingerprint", () => {
  const a = base({ type: "object", properties: { p: { type: "string" } } });
  const b = base({ type: "object", properties: { renamed: { type: "string" } } });
  expect(fingerprintTool(a)).not.toBe(fingerprintTool(b));
});

test("param retype changes the fingerprint", () => {
  const a = base({ type: "object", properties: { p: { type: "string" } } });
  const b = base({ type: "object", properties: { p: { type: "number" } } });
  expect(fingerprintTool(a)).not.toBe(fingerprintTool(b));
});

test("required<->optional flip changes the fingerprint", () => {
  const a = base({ type: "object", required: ["p"], properties: { p: { type: "string" } } });
  const b = base({ type: "object", required: [], properties: { p: { type: "string" } } });
  expect(fingerprintTool(a)).not.toBe(fingerprintTool(b));
});

// ── (iv) OUTPUT-field add (7.13.0-class) is ABSORBED — fingerprint over inputSchema only. ──
test("adding an OUTPUT field (hypothetical 7.13.0 runtimeIdentity) leaves the inputSchema fp unchanged → match", () => {
  // The tool declaration only carries inputSchema; the 7.13.0 change added runtimeIdentity
  // to the HANDLER OUTPUT, never to inputSchema. Model that: inputSchema is identical pre/post.
  const inputSchema = {
    type: "object",
    properties: { mode: { type: "string" }, projectPath: { type: "string" }, agentName: { type: "string" } },
  };
  const pre = base(inputSchema);
  const post = base(inputSchema); // output add does NOT touch inputSchema
  const golden = fingerprintSurface([pre]);
  const cmp = compareToolSurface([post], golden);
  expect(cmp.perTool[0]!.status).toBe("match");
  expect(cmp.drift).toBe(false);
});

// ── (v) added / removed tool → correct status. ──
test("added and removed tools resolve to the correct status", () => {
  const golden = fingerprintSurface([base({ type: "object" })]); // golden has "t"
  const live: FingerprintableTool[] = [{ name: "u", inputSchema: { type: "object" } }]; // live has "u"
  const cmp = compareToolSurface(live, golden);
  const byName = Object.fromEntries(cmp.perTool.map((r) => [r.name, r.status]));
  expect(byName["u"]).toBe("added");
  expect(byName["t"]).toBe("removed");
  expect(cmp.drift).toBe(true);
});

test("structural-drift: same name, different inputSchema → structural-drift", () => {
  const golden = fingerprintSurface([base({ type: "object", properties: { p: { type: "string" } } })]);
  const live: FingerprintableTool[] = [{ name: "t", inputSchema: { type: "object", properties: { p: { type: "number" } } } }];
  const cmp = compareToolSurface(live, golden);
  expect(cmp.perTool[0]!.status).toBe("structural-drift");
  expect(cmp.drift).toBe(true);
});

// ── NORMALIZE invariances: key reorder benign. ──
test("key reorder is benign (stable-sort)", () => {
  const a = base({ type: "object", required: ["p"], properties: { p: { type: "string" } } });
  const b = base({ properties: { p: { type: "string" } }, required: ["p"], type: "object" });
  expect(fingerprintTool(a)).toBe(fingerprintTool(b));
  // normalizeInputSchema is pure: produces canonically-ordered equal JSON
  expect(JSON.stringify(normalizeInputSchema(a.inputSchema))).toBe(
    JSON.stringify(normalizeInputSchema(b.inputSchema)),
  );
});
