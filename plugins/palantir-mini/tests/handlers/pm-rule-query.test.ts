// palantir-mini v2.26.0 — handler test: pm_rule_query
// Domain: OPS (D9 consolidation: pm_rule_get + pm_rule_list + pm_rule_search → pm_rule_query)
//
// Validates discriminator dispatch + per-mode parity with pre-consolidation
// behavior. Test rule IDs are stable per CONTEXT.md §4 (numbered-ID stability).

import { test, expect, describe } from "bun:test";
import pmRuleQuery from "../../bridge/handlers/pm-rule-query";

async function errorMessageFor(args: Parameters<typeof pmRuleQuery>[0]): Promise<string> {
  try {
    await pmRuleQuery(args);
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
  throw new Error("expected pmRuleQuery to throw");
}

// ─── byId — get mode ─────────────────────────────────────────────────────────

describe("pm_rule_query byId (get mode)", () => {
  test("byId=10 (events-jsonl) returns mode='get' + body", async () => {
    const res = await pmRuleQuery({ byId: 10 });
    expect(res.mode).toBe("get");
    if (res.mode !== "get") throw new Error("expected get mode");
    expect(res.rule.ruleId).toBe(10);
    expect(res.rule.slug).toBe("events-jsonl");
    expect(typeof res.body).toBe("string");
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("byId=99 (nonexistent) throws", async () => {
    await expect(pmRuleQuery({ byId: 99 })).rejects.toThrow("not found");
  });

  // Skipped post-2026-04-29 §12-license consolidation: rule 18 (events-5d-conformance) was
  // deleted from disk; numbered IDs become permanent gaps per CONTEXT.md §4. No retired
  // stub remains in the registry to exercise withFollow behavior. Re-enable when a future
  // retirement uses CONTEXT.md §7 default path (stub body + supersededBy, no file deletion).
  test.skip("byId=18 (retired, supersededBy=10) follows by default", async () => {
    const res = await pmRuleQuery({ byId: 18 });
    expect(res.mode).toBe("get");
    if (res.mode !== "get") throw new Error("expected get mode");
    expect(res.rule.ruleId).toBe(10);
    expect(res.followedFrom).toBe(18);
  });

  test.skip("byId=18 + withFollow=false stays on retired", async () => {
    const res = await pmRuleQuery({ byId: 18, withFollow: false });
    expect(res.mode).toBe("get");
    if (res.mode !== "get") throw new Error("expected get mode");
    expect(res.rule.ruleId).toBe(18);
    expect(res.followedFrom).toBeUndefined();
  });

  test("byId=10 + withContext=true returns crossRefs neighbors", async () => {
    const res = await pmRuleQuery({ byId: 10, withContext: true });
    expect(res.mode).toBe("get");
    if (res.mode !== "get") throw new Error("expected get mode");
    expect(Array.isArray(res.contextRules)).toBe(true);
  });
});

// ─── bySlug — get mode ───────────────────────────────────────────────────────

describe("pm_rule_query bySlug (get mode)", () => {
  test("bySlug='events-jsonl' returns mode='get'", async () => {
    const res = await pmRuleQuery({ bySlug: "events-jsonl" });
    expect(res.mode).toBe("get");
    if (res.mode !== "get") throw new Error("expected get mode");
    expect(res.rule.ruleId).toBe(10);
  });

  test("bySlug='no-such-rule' throws", async () => {
    await expect(pmRuleQuery({ bySlug: "no-such-rule" })).rejects.toThrow("not found");
  });
});

// ─── byQuery — search mode ───────────────────────────────────────────────────

describe("pm_rule_query byQuery (search mode)", () => {
  test("byQuery='events.jsonl' returns hits", async () => {
    const res = await pmRuleQuery({ byQuery: "events.jsonl" });
    expect(res.mode).toBe("search");
    if (res.mode !== "search") throw new Error("expected search mode");
    expect(res.query).toBe("events.jsonl");
    expect(res.count).toBeGreaterThan(0);
    expect(Array.isArray(res.hits)).toBe(true);
    expect(res.hits.length).toBeLessThanOrEqual(10); // default limit
  });

  test("byQuery='zzzNoMatch' returns 0 hits", async () => {
    const res = await pmRuleQuery({ byQuery: "zzzzzNoMatchInAnyRule" });
    expect(res.mode).toBe("search");
    if (res.mode !== "search") throw new Error("expected search mode");
    expect(res.count).toBe(0);
    expect(res.hits.length).toBe(0);
  });

  test("byQuery='   ' (whitespace) throws", async () => {
    const message = await errorMessageFor({ byQuery: "   " });
    expect(message).toContain("byQuery must be non-empty");
    expect(message).toContain("Received byQuery");
    expect(message).toContain('{"byQuery":"events.jsonl"}');
    expect(message).toContain("omit byQuery for list mode");
  });

  test("byQuery '' (empty) throws", async () => {
    const message = await errorMessageFor({ byQuery: "" });
    expect(message).toContain("byQuery must be non-empty");
    expect(message).toContain('{"byQuery":"events.jsonl"}');
  });

  test("byQuery limit clamps to 100 (max)", async () => {
    const res = await pmRuleQuery({ byQuery: "rule", limit: 999 });
    expect(res.mode).toBe("search");
    if (res.mode !== "search") throw new Error("expected search mode");
    expect(res.hits.length).toBeLessThanOrEqual(100);
  });

  test("byQuery limit=2 returns at most 2", async () => {
    const res = await pmRuleQuery({ byQuery: "rule", limit: 2 });
    expect(res.mode).toBe("search");
    if (res.mode !== "search") throw new Error("expected search mode");
    expect(res.hits.length).toBeLessThanOrEqual(2);
  });

  test("hits sorted by score desc", async () => {
    const res = await pmRuleQuery({ byQuery: "rule", limit: 50 });
    expect(res.mode).toBe("search");
    if (res.mode !== "search") throw new Error("expected search mode");
    for (let i = 1; i < res.hits.length; i++) {
      expect(res.hits[i - 1]!.score).toBeGreaterThanOrEqual(res.hits[i]!.score);
    }
  });
});

// ─── no discriminators — list mode ───────────────────────────────────────────

describe("pm_rule_query no discriminators (list mode)", () => {
  test("returns mode='list' with all non-retired rules", async () => {
    const res = await pmRuleQuery({});
    expect(res.mode).toBe("list");
    if (res.mode !== "list") throw new Error("expected list mode");
    expect(res.count).toBeGreaterThan(0);
    expect(Array.isArray(res.entries)).toBe(true);
    expect(res.totalRegistered).toBeGreaterThanOrEqual(res.count);
    expect(res.registeredTotal).toBe(res.totalRegistered);
    expect(res.activeGlobalCount).toBeGreaterThan(0);
    expect(res.registeredTotal).toBeGreaterThanOrEqual(res.activeGlobalCount);
    // none of the entries are retired (rule 18 has supersededBy=10)
    for (const e of res.entries) {
      if ("supersededBy" in e) {
        expect(e.supersededBy).toBeNull();
      }
    }
  });

  test("compact=true returns only ruleId+slug+invariant entries", async () => {
    const res = await pmRuleQuery({ compact: true });
    expect(res.mode).toBe("list");
    if (res.mode !== "list") throw new Error("expected list mode");
    for (const e of res.entries) {
      const keys = Object.keys(e).sort();
      expect(keys).toEqual(["invariant", "ruleId", "slug"]);
    }
  });

  // Skipped post-2026-04-29 §12-license consolidation: see byId=18 tests above.
  test.skip("includeRetired=true includes retired rules (rule 18)", async () => {
    const res = await pmRuleQuery({ includeRetired: true });
    expect(res.mode).toBe("list");
    if (res.mode !== "list") throw new Error("expected list mode");
    const ids = res.entries.map((e) =>
      "ruleId" in e ? e.ruleId : 0,
    );
    expect(ids).toContain(18);
  });

  test("scope='global' filter works", async () => {
    const res = await pmRuleQuery({ scope: "global" });
    expect(res.mode).toBe("list");
    if (res.mode !== "list") throw new Error("expected list mode");
    for (const e of res.entries) {
      if ("scope" in e) {
        expect(e.scope).toBe("global");
      }
    }
  });
});

// ─── discriminator validation ────────────────────────────────────────────────

describe("pm_rule_query discriminator validation", () => {
  test("byId + bySlug both set throws", async () => {
    const message = await errorMessageFor({ byId: 10, bySlug: "events-jsonl" });
    expect(message).toContain("at most ONE");
    expect(message).toContain("Received discriminators: byId, bySlug");
    expect(message).toContain('{"byId":10}');
    expect(message).toContain('{"bySlug":"events-jsonl"}');
    expect(message).toContain("omit all three for list mode");
  });

  test("byId + byQuery both set throws", async () => {
    const message = await errorMessageFor({ byId: 10, byQuery: "rule" });
    expect(message).toContain("at most ONE");
    expect(message).toContain("Received discriminators: byId, byQuery");
    expect(message).toContain('{"byQuery":"events.jsonl"}');
  });

  test("bySlug + byQuery both set throws", async () => {
    const message = await errorMessageFor({ bySlug: "events-jsonl", byQuery: "rule" });
    expect(message).toContain("at most ONE");
    expect(message).toContain("Received discriminators: bySlug, byQuery");
  });

  test("all three discriminators set throws", async () => {
    const message = await errorMessageFor({ byId: 10, bySlug: "events-jsonl", byQuery: "rule" });
    expect(message).toContain("at most ONE");
    expect(message).toContain("Received discriminators: byId, bySlug, byQuery");
  });
});
