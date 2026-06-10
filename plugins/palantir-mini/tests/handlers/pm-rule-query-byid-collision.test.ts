// palantir-mini — handler test: pm_rule_query byId scope-collision (G13b)
// Domain: OPS
//
// A numeric ruleId can collide across scopes (id 1 -> global ontology-first-core
// plus project:<id> overlays). The Map-keyed RULE_REGISTRY silently last-wins;
// the handler must resolve over RULE_REGISTRY_ENTRIES with a prefer-'global'
// rule (or an explicit args.scope override). Pins the G13a body-length regression.

import { test, expect, describe } from "bun:test";
import pmRuleQuery from "../../bridge/handlers/pm-rule-query";

describe("pm_rule_query byId scope collision (G13b)", () => {
  test("byId=1 (colliding) resolves to global 'ontology-first-core'", async () => {
    const res = await pmRuleQuery({ byId: 1 });
    expect(res.mode).toBe("get");
    if (res.mode !== "get") throw new Error("expected get mode");
    expect(res.rule.ruleId).toBe(1);
    expect(res.rule.slug).toBe("ontology-first-core");
    expect(res.rule.scope).toBe("global");
  });

  test("byId=1 + explicit scope override honors the override", async () => {
    const res = await pmRuleQuery({ byId: 1, scope: "project:mathcrew" });
    expect(res.mode).toBe("get");
    if (res.mode !== "get") throw new Error("expected get mode");
    expect(res.rule.ruleId).toBe(1);
    expect(res.rule.scope).toBe("project:mathcrew");
    expect(res.rule.slug).toBe("learning-world-semantics");
  });

  test("byId=29 returns full body (G13a regression pin, length > 3000)", async () => {
    const res = await pmRuleQuery({ byId: 29 });
    expect(res.mode).toBe("get");
    if (res.mode !== "get") throw new Error("expected get mode");
    expect(res.rule.ruleId).toBe(29);
    expect(res.rule.slug).toBe("fable5-ultracode-workflow-archiving");
    expect(res.body.length).toBeGreaterThan(3000);
  });

  test("byId=25 (non-colliding) is unchanged", async () => {
    const res = await pmRuleQuery({ byId: 25 });
    expect(res.mode).toBe("get");
    if (res.mode !== "get") throw new Error("expected get mode");
    expect(res.rule.ruleId).toBe(25);
    expect(res.rule.slug).toBe("auto-merge-cleanup-default");
    expect(res.rule.scope).toBe("global");
  });
});
