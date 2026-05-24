import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "..", "..");
const SKILL_PATH = path.join(PLUGIN_ROOT, "skills", "pm-ontology-engineering-lead", "SKILL.md");

describe("pm-ontology-engineering-lead skill docs", () => {
  test("exists with docs-only session-first workflow", () => {
    const content = fs.readFileSync(SKILL_PATH, "utf8");

    expect(content).toContain("name: pm-ontology-engineering-lead");
    expect(content).toContain("docs-only");
    expect(content).toContain("Session-first");
    expect(content).toContain("ontology_context_query");
    expect(content).toContain("pm_semantic_intent_gate");
    expect(content).toContain("dtc-turn-fill");
    expect(content).toContain("reference_only");
    expect(content).toContain("not_promoted");
  });
});
