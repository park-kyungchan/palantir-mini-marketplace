import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ONTOLOGY_ENGINEERING_RESPONSE_REQUIRED_FIELDS } from "../../lib/ontology-engineering-response-template";

const PLUGIN_ROOT = join(import.meta.dir, "../..");
const USER_REQUIREMENT_PROMPT_DOC_PATH = join(
  PLUGIN_ROOT,
  "docs/PALANTIR_MINI_USER_REQUIREMENT_PROMPT_TEMPLATE.md",
);

describe("PALANTIR_MINI_USER_REQUIREMENT_PROMPT_TEMPLATE.md", () => {
  test("is the sole prompt and answer-shape template", () => {
    const content = readFileSync(USER_REQUIREMENT_PROMPT_DOC_PATH, "utf8");
    expect(content).toContain("This document is the only prompt/answer-shape template");
    expect(content).not.toContain("docs/ONTOLOGY_ENGINEERING_RESPONSE_TEMPLATE.md");
  });

  test("provides a dedicated user requirement slot and workflow guardrails", () => {
    const content = readFileSync(USER_REQUIREMENT_PROMPT_DOC_PATH, "utf8");
    expect(content).toContain("<USER_REQUIREMENT>");
    expect(content).toContain("</USER_REQUIREMENT>");
    expect(content).toContain("/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini");
    expect(content).toContain("park-kyungchan/palantir-mini-marketplace:plugins/palantir-mini/");
    expect(content).toContain("Installed runtime caches are consumer payloads only");
    expect(content).toContain("Do not edit:");
    expect(content).toContain("~/.codex/plugins/cache/**");
    expect(content).toContain("Classify the request semantically");
    expect(content).toContain("mutation authority");
  });

  test("requires Palantir SSoT grounding and non-developer explanation", () => {
    const content = readFileSync(USER_REQUIREMENT_PROMPT_DOC_PATH, "utf8");
    expect(content).toContain("~/.claude/research/BROWSE.md");
    expect(content).toContain("~/.claude/research/INDEX.md");
    expect(content).toContain("~/.claude/research/palantir-official/");
    expect(content).toContain("live www.palantir.com official docs");
    expect(content).toContain("AIP Chatbot Studio");
    expect(content).toContain("application-state.md");
    expect(content).toContain("retrieval-context.md");
    expect(content).toContain("tools.md");
    expect(content).toContain("plain language for a non-developer");
    expect(content).toContain("evidence supports that judgment");
  });

  test("embeds every required response status field", () => {
    const content = readFileSync(USER_REQUIREMENT_PROMPT_DOC_PATH, "utf8");
    for (const field of ONTOLOGY_ENGINEERING_RESPONSE_REQUIRED_FIELDS) {
      expect(content).toContain(field);
    }
    expect(content).toContain("Claude/Codex/Gemini parity");
    expect(content).toContain("runtime-native evidence");
    expect(content).toContain("SSoT decision basis");
  });
});
