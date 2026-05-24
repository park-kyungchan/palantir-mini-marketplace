import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadProjectScope, stripProjectScopePathMarker } from "../../../lib/project-scope/loader";

describe("project-scope loader", () => {
  test("uses generic defaults when a project-local scope file is absent", () => {
    const scope = loadProjectScope();

    expect(scope.projectId).toBe("generic-template");
    expect(scope.seqDataLaneInventory).toEqual([]);
    expect(scope.projectOntologyAxes).toEqual([]);
    expect(scope.surfaceMutationBoundaries).toEqual([]);
    expect(scope.writableRoot).toBe(".");
    expect(scope.forbiddenPatterns).toContain("src/generated/**");
    expect(scope.domainAgents).toContain("implementer");
  });

  test("uses education defaults for known education project roots when local scope is absent", () => {
    const scope = loadProjectScope("/home/palantirkc/projects/palantir-math");

    expect(scope.projectId).toBe("education-template");
    expect(scope.seqDataLaneInventory.map((lane) => lane.id)).toContain("seq.rendering-scene");
  });

  test("loads a project-local .palantir-mini/project-scope.json when present", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-project-scope-"));
    try {
      fs.mkdirSync(path.join(project, ".palantir-mini"), { recursive: true });
      fs.writeFileSync(
        path.join(project, ".palantir-mini", "project-scope.json"),
        JSON.stringify({
          projectId: "custom-project",
          sourcePath: ".palantir-mini/project-scope.json",
          writableRoot: ".claude",
          forbiddenPatterns: ["src/**"],
          domainAgents: ["project-implementer", "custom-domain-agent"],
          pathMarkers: ["custom-project/"],
          projectOntologyAxes: [],
          surfaceMutationBoundaries: [],
          seqDataLaneInventory: [],
          projectOntologyScopeRedesign: {
            id: "custom.scope",
            status: "declared",
            purpose: "test",
            validationLadder: ["custom-check"],
          },
        }),
      );

      const scope = loadProjectScope(project);
      expect(scope.projectId).toBe("custom-project");
      expect(scope.writableRoot).toBe(".claude");
      expect(scope.forbiddenPatterns).toEqual(["src/**"]);
      expect(scope.domainAgents).toEqual(["project-implementer", "custom-domain-agent"]);
      expect(scope.projectOntologyScopeRedesign.validationLadder).toEqual(["custom-check"]);
      expect(stripProjectScopePathMarker("/tmp/custom-project/src/file.ts", scope)).toBe(
        "src/file.ts",
      );
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });
});
