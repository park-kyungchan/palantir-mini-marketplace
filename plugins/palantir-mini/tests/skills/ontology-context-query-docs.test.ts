import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "..", "..");
const SKILLS_ROOT = path.join(PLUGIN_ROOT, "skills");

function readSkill(relativePath: string): string {
  return fs.readFileSync(path.join(SKILLS_ROOT, relativePath, "SKILL.md"), "utf8");
}

describe("skill docs use public ontology_context_query schema", () => {
  test("FDE session preview uses supported fields", () => {
    const content = readSkill("pm-fde-session-preview");

    expect(content).toContain("scopePaths");
    expect(content).toContain("requestedAxes");
    expect(content).toContain("includeDTCContext");
    expect(content).not.toContain('intent: "<user-facing description');
  });

  test("project onboard does not advertise stale includeDocumentContext on public ontology_context_query", () => {
    const content = readSkill("pm-project-onboard");

    expect(content).not.toContain("includeDocumentContext");
  });
});
