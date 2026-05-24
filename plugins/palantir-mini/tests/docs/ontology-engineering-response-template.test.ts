import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ONTOLOGY_ENGINEERING_RESPONSE_REQUIRED_FIELDS } from "../../lib/ontology-engineering-response-template";

const PLUGIN_ROOT = join(import.meta.dir, "../..");
const DOC_PATH = join(PLUGIN_ROOT, "docs/ONTOLOGY_ENGINEERING_RESPONSE_TEMPLATE.md");

describe("ONTOLOGY_ENGINEERING_RESPONSE_TEMPLATE.md", () => {
  test("documents every required status field", () => {
    const content = readFileSync(DOC_PATH, "utf8");
    for (const field of ONTOLOGY_ENGINEERING_RESPONSE_REQUIRED_FIELDS) {
      expect(content).toContain(field);
    }
  });

  test("documents Claude hook native status and Codex runtime gap disclosure", () => {
    const content = readFileSync(DOC_PATH, "utf8");
    expect(content).toContain("Claude hooks");
    expect(content).toContain("Codex");
    expect(content).toContain("runtime gap");
    expect(content).toContain("manual");
    expect(content).toContain("smoke evidence");
  });

  test("documents SSoT decision-basis disclosure", () => {
    const content = readFileSync(DOC_PATH, "utf8");
    expect(content).toContain("SSoT 판단 근거");
    expect(content).toContain("Palantir AIP Chatbot Studio");
    expect(content).toContain("AI FDE");
    expect(content).toContain("Context Engineering");
    expect(content).toContain("plugin source");
    expect(content).toContain("generated mirrors");
    expect(content).toContain("source/ref");
    expect(content).toContain("provenance/currentness");
    expect(content).toContain("used-for judgment");
    expect(content).toContain("confidence/limit");
  });

  test("documents generic workflow and non-developer explanation behavior", () => {
    const content = readFileSync(DOC_PATH, "utf8");
    expect(content).toContain("palantir-mini Workflow Response Template");
    expect(content).toContain("not limited to Ontology Engineering");
    expect(content).toContain("For non-Ontology workflows");
    expect(content).toContain("what this request means");
    expect(content).toContain("why this source is trusted");
    expect(content).toContain("what I am allowed to do now");
    expect(content).toContain("what needs user approval");
    expect(content).toContain("what gap or uncertainty remains");
  });

  test("documents plugin enforcement surfaces", () => {
    const content = readFileSync(DOC_PATH, "utf8");
    expect(content).toContain("hooks/prompt-front-door-capture.ts");
    expect(content).toContain("hooks/ontology-engineering-workflow-enforcement-gate.ts");
    expect(content).toContain("lib/ontology-engineering-response-template.ts");
  });
});
