import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { pmPluginSelfCheck } from "../../../bridge/handlers/pm-plugin-self-check";
import {
  cleanupTmpDirs,
  makeTmpDir,
  restoreEnv,
  saveEnv,
} from "./pm-plugin-self-check/fixtures";

const GOOD_SKILL = `---
name: palantir-math-expert
ontologySkill:
  version: "palantir-mini/skill-ontology/v1"
  category: "problem-authoring"
  userFacingPurpose: "Help the user confirm the math teaching meaning before files change."
  leadFacingPurpose: "Reads lesson artifacts and keeps Sequencer and Presenter runtime out of scope."
  requiresPromptDtc: true
  mayMutateProjectFiles: false
  outputOntology:
    - LectureProblem
    - MathLectureTrace
---

## Must not do
- mutate Sequencer runtime
- mutate Presenter runtime
`;

beforeEach(() => {
  saveEnv();
});

afterEach(() => {
  restoreEnv();
  cleanupTmpDirs();
});

function writeProjectSkill(projectRoot: string, skillName: string, markdown: string): void {
  const skillDir = path.join(projectRoot, ".claude", "skills", skillName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), markdown);
}

describe("pm_plugin_self_check project-skill-ontology mode", () => {
  test("passes when project skills declare ontology contracts", async () => {
    const projectRoot = makeTmpDir();
    process.env.PALANTIR_MINI_PROJECT = projectRoot;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(projectRoot, "events.jsonl");
    writeProjectSkill(projectRoot, "palantir-math-expert", GOOD_SKILL);

    const result = await pmPluginSelfCheck({
      mode: "project-skill-ontology",
      projectPath: projectRoot,
    });

    expect(result.activeChecks).toEqual(["project-skill-ontology"]);
    expect(result.projectSkillOntologyResult.status).toBe("pass");
    expect(result.projectSkillOntologyResult.skillCount).toBe(1);
    expect(result.projectSkillOntologyResult.contractsFound).toBe(1);
    expect(result.projectSkillOntologyResult.missingOntologyFrontmatter).toEqual([]);
    expect(result.overallStatus).toBe("pass");
  });

  test("fails when a project skill is still a legacy instruction file", async () => {
    const projectRoot = makeTmpDir();
    process.env.PALANTIR_MINI_PROJECT = projectRoot;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(projectRoot, "events.jsonl");
    writeProjectSkill(
      projectRoot,
      "legacy",
      "## User-facing purpose\nExplain the task.\n\nPresenter edits the lesson structure.\n",
    );

    const result = await pmPluginSelfCheck({
      mode: "project-skill-ontology",
      projectPath: projectRoot,
    });

    expect(result.projectSkillOntologyResult.status).toBe("fail");
    expect(result.projectSkillOntologyResult.missingOntologyFrontmatter).toEqual([
      ".claude/skills/legacy/SKILL.md",
    ]);
    expect(result.projectSkillOntologyResult.presenterEditViolations.length).toBe(1);
    expect(result.overallStatus).toBe("fail");
  });
});
