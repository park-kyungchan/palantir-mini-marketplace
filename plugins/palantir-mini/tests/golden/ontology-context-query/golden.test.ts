// palantir-mini v6.20.0 — ontology_context_query golden fixtures
//
// Sprint-099 PR 3.7 (canonical plan v2 §4 row 3.7; Phase 3 PR 7/7).
// Reads each *.input.json + *.expected.json pair, runs ontology_context_query
// in-process, and asserts structural-shape equality (volatile fields placeholdered).
//
// @since palantir-mini v6.20.0 (sprint-099 PR 3.7)

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ontologyContextQuery } from "../../../bridge/handlers/ontology-context-query";
import type { OntologyContextQueryInput } from "../../../bridge/handlers/ontology-context-query";

// ─── Types ──────────────────────────────────────────────────────────────────

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// ─── Constants ───────────────────────────────────────────────────────────────

const FIXTURES_DIR = __dirname;
const SANDBOX_PREFIX = "pm-golden-ocq-";

const VOLATILE_ENUM_RE = /^<volatile:enum:(.+)>$/;
const VOLATILE_ARRAY_LENGTH_RE = /^<volatile:array_length_(\d+)>$/;

// Keys treated as volatile top-level metadata (never compared).
const META_KEYS = new Set(["_shape_only", "_description"]);

// ─── Volatile placeholder assertion ────────────────────────────────────────

/**
 * Asserts that `actual` satisfies the volatile placeholder `expected`.
 * Throws an Expect assertion on mismatch so bun:test shows a nice diff.
 */
function assertVolatile(
  actual: unknown,
  placeholder: string,
  fieldPath: string,
): void {
  if (placeholder === "<volatile:string>") {
    expect(typeof actual).toBe("string");
    return;
  }
  if (placeholder === "<volatile:boolean>") {
    expect(typeof actual).toBe("boolean");
    return;
  }
  if (placeholder === "<volatile:number>") {
    expect(typeof actual).toBe("number");
    return;
  }
  if (placeholder === "<volatile:number_0_to_1>") {
    expect(typeof actual).toBe("number");
    expect(actual as number).toBeGreaterThanOrEqual(0);
    expect(actual as number).toBeLessThanOrEqual(1);
    return;
  }
  if (placeholder === "<volatile:iso8601>") {
    expect(typeof actual).toBe("string");
    // Light ISO 8601 check — starts with YYYY- and parseable.
    expect((actual as string)).toMatch(/^\d{4}-/);
    expect(Number.isFinite(Date.parse(actual as string))).toBe(true);
    return;
  }
  if (placeholder === "<volatile:array>") {
    expect(Array.isArray(actual)).toBe(true);
    return;
  }
  if (placeholder === "<volatile:array_max_50>") {
    expect(Array.isArray(actual)).toBe(true);
    expect((actual as unknown[]).length).toBeLessThanOrEqual(50);
    return;
  }
  if (placeholder === "<volatile:string|null>") {
    expect(actual === null || typeof actual === "string").toBe(true);
    return;
  }
  if (placeholder === "<volatile:object>") {
    expect(actual !== null && typeof actual === "object" && !Array.isArray(actual)).toBe(true);
    return;
  }
  const enumMatch = placeholder.match(VOLATILE_ENUM_RE);
  if (enumMatch && enumMatch[1] !== undefined) {
    const allowed = enumMatch[1].split("|");
    expect(allowed).toContain(actual as string);
    return;
  }
  const lengthMatch = placeholder.match(VOLATILE_ARRAY_LENGTH_RE);
  if (lengthMatch && lengthMatch[1] !== undefined) {
    expect(Array.isArray(actual)).toBe(true);
    expect((actual as unknown[]).length).toBe(Number.parseInt(lengthMatch[1], 10));
    return;
  }
  // Fallback: treat as exact equality.
  expect(actual).toEqual(placeholder);
}

// ─── Recursive shape comparator ─────────────────────────────────────────────

/**
 * Recursively asserts that `actual` matches `expected` shape.
 * - string values starting with "<volatile:" are compared via assertVolatile.
 * - Non-volatile primitives are exact equality.
 * - Arrays: if expected has volatile array placeholder, use assertVolatile.
 *   Otherwise length + per-item comparison.
 * - Objects: all keys in expected must exist in actual; extra keys in actual
 *   are permitted (additive tolerance).
 */
function assertShape(
  actual: unknown,
  expected: JsonValue,
  fieldPath: string,
): void {
  if (expected === null) {
    expect(actual).toBeNull();
    return;
  }
  if (typeof expected === "string" && expected.startsWith("<volatile:")) {
    assertVolatile(actual, expected, fieldPath);
    return;
  }
  if (typeof expected === "string" || typeof expected === "number" || typeof expected === "boolean") {
    expect(actual).toEqual(expected);
    return;
  }
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true);
    const actualArr = actual as unknown[];
    expect(actualArr.length).toBe(expected.length);
    for (let i = 0; i < expected.length; i++) {
      assertShape(actualArr[i], expected[i] as JsonValue, `${fieldPath}[${i}]`);
    }
    return;
  }
  // Object case.
  expect(actual !== null && typeof actual === "object" && !Array.isArray(actual)).toBe(true);
  const actualObj = actual as Record<string, unknown>;
  for (const [key, expVal] of Object.entries(expected)) {
    if (META_KEYS.has(key)) continue;
    const actualVal = actualObj[key];
    expect(
      { field: `${fieldPath}.${key}`, defined: actualVal !== undefined },
    ).toEqual(
      { field: `${fieldPath}.${key}`, defined: true },
    );
    assertShape(actualVal, expVal as JsonValue, `${fieldPath}.${key}`);
  }
}

// ─── Fixture loader ─────────────────────────────────────────────────────────

interface FixturePair {
  name: string;
  rawInput: OntologyContextQueryInput;
  expected: JsonValue;
}

function loadFixtures(): FixturePair[] {
  const entries = fs.readdirSync(FIXTURES_DIR).filter((f) =>
    f.endsWith(".input.json"),
  );
  entries.sort();
  return entries.map((inputFile) => {
    const name = inputFile.replace(".input.json", "");
    const expectedFile = `${name}.expected.json`;
    const rawInput = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, inputFile), "utf8"),
    ) as OntologyContextQueryInput;
    const expected = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, expectedFile), "utf8"),
    ) as JsonValue;
    return { name, rawInput, expected };
  });
}

// ─── Sandbox helper ─────────────────────────────────────────────────────────

function makeSandbox(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), SANDBOX_PREFIX));
}

function resolveProject(rawInput: OntologyContextQueryInput): string {
  return rawInput.project === "<sandbox>" ? makeSandbox() : rawInput.project;
}

// ─── Test suite ──────────────────────────────────────────────────────────────

const fixtures = loadFixtures();

describe("ontology_context_query — golden fixtures (sprint-099 PR 3.7)", () => {
  for (const fixture of fixtures) {
    const { name, rawInput, expected } = fixture;

    test(`[golden] ${name} — structural shape`, async () => {
      const sandbox = resolveProject(rawInput);
      const isTemp = rawInput.project === "<sandbox>";
      try {
        const input: OntologyContextQueryInput = {
          ...rawInput,
          project: sandbox,
        };
        const result = await ontologyContextQuery(input);
        assertShape(result, expected, "$");
      } finally {
        if (isTemp) {
          fs.rmSync(sandbox, { recursive: true, force: true });
        }
      }
    });
  }

  // ─── Key invariant assertions beyond shape ────────────────────────────────

  test("[invariant] 03-empty-graph: includeImpact=false → graphConfidence==1.0, recommendedAgentUse==lead-direct", async () => {
    const sandbox = makeSandbox();
    try {
      const result = await ontologyContextQuery({
        project: sandbox,
        includeImpact: false,
      });
      expect(result.graphConfidence).toBe(1.0);
      expect(result.missingEdges).toEqual([]);
      expect(result.recommendedAgentUse).toBe("lead-direct");
      expect(result.impactContext).toBeUndefined();
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test("[invariant] 02-multi-rid-query: contracts/ path → requiredContracts includes both canonical contracts", async () => {
    const sandbox = makeSandbox();
    try {
      const result = await ontologyContextQuery({
        project: sandbox,
        scopePaths: ["contracts/my-contract.ts"],
      });
      expect(result.requiredContracts).toContain("SemanticIntentContract");
      expect(result.requiredContracts).toContain("DigitalTwinChangeContract");
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test("[invariant] 05-low-confidence: nonexistent RID → graphConfidence < 1.0 (partial graph data)", async () => {
    const sandbox = makeSandbox();
    try {
      const result = await ontologyContextQuery({
        project: sandbox,
        scopePaths: ["nonexistent-path-to-force-impact-failure.ts"],
        includeLineage: false,
        includeCapabilities: false,
        includeRisks: false,
        includeEvals: false,
      });
      // impact_query degrades gracefully: graphConfidence is partial (not 1.0, not 0.0 necessarily).
      expect(result.graphConfidence).toBeLessThan(1.0);
      // impactContext.perRidImpact must have exactly 1 entry for the one scopePath.
      expect(result.impactContext?.perRidImpact.length).toBe(1);
      // recommendedAgentUse must be degraded below lead-direct.
      expect(result.recommendedAgentUse).not.toBe("lead-direct");
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test("[invariant] 04-high-risk-intent: riskContext is composed but does not auto-create approval gates", async () => {
    const sandbox = makeSandbox();
    try {
      const result = await ontologyContextQuery({
        project: sandbox,
        scopePaths: ["contracts/semantic-intent-contract.ts"],
        requestedAxes: ["delete-all-events", "schema-breaking-rename"],
      });
      // riskContext is diagnostic data; approval gating is pm_intent_router territory.
      expect(result.riskContext?.status).toBe("composed");
      // contracts/ path triggers mutation surface detection.
      expect(result.requiredContracts).toContain("SemanticIntentContract");
      expect(result.requiredContracts).toContain("DigitalTwinChangeContract");
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
