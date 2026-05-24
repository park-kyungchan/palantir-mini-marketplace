// tests/convex/decisionEvents.test.ts
// Stub-mode tests for sprint-062 W2-β decisionEvents schema + mutation/query shapes.
// Full Convex integration tests require a running local backend (127.0.0.1:3210).
// These tests verify: schema table presence, index definitions, and function export shapes.
//
// Note: import() of convex/ files works at runtime via Bun (which can import .ts directly).
// tsconfig.json does not include convex/** in its compile scope (convex uses its own tsconfig).

import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

// Resolve plugin root relative to this test file
const PLUGIN_ROOT = join(import.meta.dir, "../..");

// ─── Schema structural tests ──────────────────────────────────────────────────

describe("decisionEvents schema", () => {
  it("schema module imports without error", async () => {
    const mod = await import(`${PLUGIN_ROOT}/convex/schema.ts`);
    expect(mod.default).toBeDefined();
  });

  it("schema includes the decision-events baseline tables", async () => {
    const { default: schema } = await import(`${PLUGIN_ROOT}/convex/schema.ts`);
    const tableNames = Object.keys(schema.tables);
    expect(tableNames).toContain("impactEdges");
    expect(tableNames).toContain("fileState");
    expect(tableNames).toContain("graphMutations");
    expect(tableNames).toContain("decisionEvents");
    expect(tableNames.length).toBeGreaterThanOrEqual(4);
  });

  it("decisionEvents table is defined", async () => {
    const { default: schema } = await import(`${PLUGIN_ROOT}/convex/schema.ts`);
    expect(schema.tables["decisionEvents"]).toBeDefined();
  });

  it("decisionEvents table is a non-null object", async () => {
    const { default: schema } = await import(`${PLUGIN_ROOT}/convex/schema.ts`);
    const table: unknown = schema.tables["decisionEvents"];
    expect(table).not.toBeNull();
    expect(typeof table).toBe("object");
  });

  it("schema source contains all 3 expected indexes", () => {
    const src = readFileSync(join(PLUGIN_ROOT, "convex/schema.ts"), "utf-8");
    expect(src).toContain("by_project_grade");
    expect(src).toContain("by_project_actionRid");
    expect(src).toContain("by_project_when");
  });

  it("schema source contains all required decisionEvents fields", () => {
    const src = readFileSync(join(PLUGIN_ROOT, "convex/schema.ts"), "utf-8");
    expect(src).toContain("projectRoot");
    expect(src).toContain("sequence");
    expect(src).toContain("eventType");
    expect(src).toContain("valueGrade");
    expect(src).toContain("actionRid");
    expect(src).toContain("refinementTargetKind");
    expect(src).toContain("refinementTargetRid");
    expect(src).toContain("byWhomIdentity");
    expect(src).toContain("raw");
  });

  it("schema source contains all valueGrade literals (T0-T4)", () => {
    const src = readFileSync(join(PLUGIN_ROOT, "convex/schema.ts"), "utf-8");
    expect(src).toContain('v.literal("T0")');
    expect(src).toContain('v.literal("T1")');
    expect(src).toContain('v.literal("T2")');
    expect(src).toContain('v.literal("T3")');
    expect(src).toContain('v.literal("T4")');
  });
});

// ─── decisionEvents module export tests ───────────────────────────────────────

describe("decisionEvents module exports", () => {
  it("module imports without error", async () => {
    const mod = await import(`${PLUGIN_ROOT}/convex/decisionEvents.ts`);
    expect(mod).toBeDefined();
  });

  it("exports mirrorFromEventsLog mutation (callable)", async () => {
    const mod = await import(`${PLUGIN_ROOT}/convex/decisionEvents.ts`);
    expect(mod.mirrorFromEventsLog).toBeDefined();
    // Convex mutations/queries are callable functions at runtime
    expect(typeof mod.mirrorFromEventsLog).toBe("function");
  });

  it("exports bulkMirror mutation (callable)", async () => {
    const mod = await import(`${PLUGIN_ROOT}/convex/decisionEvents.ts`);
    expect(mod.bulkMirror).toBeDefined();
    expect(typeof mod.bulkMirror).toBe("function");
  });

  it("exports findT3PlusByRefinementTarget query (callable)", async () => {
    const mod = await import(`${PLUGIN_ROOT}/convex/decisionEvents.ts`);
    expect(mod.findT3PlusByRefinementTarget).toBeDefined();
    expect(typeof mod.findT3PlusByRefinementTarget).toBe("function");
  });

  it("exports findT4Candidates query (callable)", async () => {
    const mod = await import(`${PLUGIN_ROOT}/convex/decisionEvents.ts`);
    expect(mod.findT4Candidates).toBeDefined();
    expect(typeof mod.findT4Candidates).toBe("function");
  });

  it("exports convergenceCount query (callable)", async () => {
    const mod = await import(`${PLUGIN_ROOT}/convex/decisionEvents.ts`);
    expect(mod.convergenceCount).toBeDefined();
    expect(typeof mod.convergenceCount).toBe("function");
  });

  it("exports findRecentT3Plus query (callable)", async () => {
    const mod = await import(`${PLUGIN_ROOT}/convex/decisionEvents.ts`);
    expect(mod.findRecentT3Plus).toBeDefined();
    expect(typeof mod.findRecentT3Plus).toBe("function");
  });

  it("exports findByActionRid query (callable)", async () => {
    const mod = await import(`${PLUGIN_ROOT}/convex/decisionEvents.ts`);
    expect(mod.findByActionRid).toBeDefined();
    expect(typeof mod.findByActionRid).toBe("function");
  });

  it("all 7 exports are defined (non-undefined)", async () => {
    const mod = await import(`${PLUGIN_ROOT}/convex/decisionEvents.ts`);
    const allExports = [
      mod.mirrorFromEventsLog,
      mod.bulkMirror,
      mod.findT3PlusByRefinementTarget,
      mod.findT4Candidates,
      mod.convergenceCount,
      mod.findRecentT3Plus,
      mod.findByActionRid,
    ];
    for (const fn of allExports) {
      expect(fn).not.toBeUndefined();
    }
  });

  it("source has 2 mutations + 5 queries (correct count)", () => {
    const src = readFileSync(join(PLUGIN_ROOT, "convex/decisionEvents.ts"), "utf-8");
    const mutationCount = (src.match(/^export const \w+ = mutation\(/gm) ?? []).length;
    const queryCount = (src.match(/^export const \w+ = query\(/gm) ?? []).length;
    expect(mutationCount).toBe(2); // mirrorFromEventsLog + bulkMirror
    expect(queryCount).toBe(5);   // findT3Plus... + findT4... + convergenceCount + findRecent... + findByAction...
  });
});

// ─── api.d.ts coverage test ───────────────────────────────────────────────────

describe("_generated/api.d.ts includes decisionEvents", () => {
  it("api.d.ts references decisionEvents module", () => {
    const apiDts = readFileSync(
      join(PLUGIN_ROOT, "convex/_generated/api.d.ts"),
      "utf-8",
    );
    expect(apiDts).toContain("decisionEvents");
    expect(apiDts).toContain("impactGraph");
  });

  it("api.d.ts fullApi type includes both modules", () => {
    const apiDts = readFileSync(
      join(PLUGIN_ROOT, "convex/_generated/api.d.ts"),
      "utf-8",
    );
    expect(apiDts).toContain("impactGraph: typeof impactGraph");
    expect(apiDts).toContain("decisionEvents: typeof decisionEvents");
  });
});
