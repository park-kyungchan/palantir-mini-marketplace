// Legacy ontology_context_query handler regression — preserved after sprint-093
// PR 3.1 (canonical plan v2 §4 row 3.1) renamed the file path to
// `ontology-context-query-legacy.ts` and promoted the NEW canonical handler per
// proposal §8 Stage 4. Test verifies the legacy UniversalOntologyEntry +
// workflowTrace flow remains intact for internal callers.

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import handler from "../../../bridge/handlers/ontology-context-query-legacy";
import {
  PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION,
} from "../../../lib/capability/project-ontology-index";

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProjectIndex(projectRoot: string): void {
  writeJson(path.join(projectRoot, ".palantir-mini", "ontology-index", "project.json"), {
    schemaVersion: PROJECT_ONTOLOGY_INDEX_SCHEMA_VERSION,
    projectId: "smoke-project",
    capabilities: [
      {
        schemaVersion: "palantir-mini/capability-contract/v1",
        capabilityId: "smoke-project:ontology-runtime-smoke",
        sourceKind: "ontology-index",
        sourceRef: ".palantir-mini/ontology-index/project.json",
        displayName: "smoke-project ontology runtime smoke",
        category: "generic",
        userFacingPurpose: "Validate ontology context smoke wiring.",
        leadFacingPurpose: "Read-only context query smoke capability.",
        inputOntology: {
          objectRefs: ["smoke-project", "OntologyContextSeed"],
          requiredArtifacts: [".palantir-mini/ontology-index/project.json"],
          artifactLifecycle: {
            prerequisites: [".palantir-mini/ontology-index/project.json"],
            optionalInputs: [],
            creates: [],
            mutates: [],
          },
          allowedRawInputs: ["ontology context smoke"],
        },
        outputOntology: {
          objectRefs: ["smoke-project", "OntologyContextSeed"],
          artifactRefs: [],
          validationPacks: ["smoke-project:ontology-context-smoke"],
        },
        actionBoundary: {
          mayMutateProjectFiles: false,
          mutationSurfaces: [],
          requiresDtcApproval: false,
        },
        nonGoals: ["Do not authorize mutation."],
        failureModes: ["Missing ontology index."],
        intentMatchers: [
          {
            matcherId: "smoke-project:ontology-runtime-smoke",
            naturalLanguageExamples: ["ontology context smoke"],
            nouns: ["smoke-project", "OntologyContextSeed"],
            verbs: ["validate", "smoke"],
            projectScopeLanes: [],
          },
        ],
        readSurfaces: [".palantir-mini/ontology-index/project.json"],
        writeSurfaces: [],
        knownIssueRefs: [],
      },
    ],
    validationPacks: [
      {
        validationPackId: "smoke-project:ontology-context-smoke",
        command: "bun test tests/ontology-context-smoke.test.ts",
        sourceRef: ".palantir-mini/ontology-index/project.json",
        required: true,
      },
    ],
  });
}

describe("ontology-context-query handler", () => {
  test("is internal-only and persists query result with workflow trace refs", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-ontology-query-"));
    try {
      writeProjectIndex(projectRoot);

      const result = await handler({
        project: projectRoot,
        rawIntent: "Run smoke-project:ontology-runtime-smoke ontology context smoke validation.",
        promptId: "prompt-test",
        promptHash: "hash-test",
        sessionId: "session-test",
        runtime: "codex",
      });

      // Note: post-sprint-093 PR 3.1 the canonical `ontology_context_query` IS
      // in TOOLS (new public Phase 3 handler). The legacy is registered under
      // HANDLER_MODULES key `ontology_context_query_legacy`. This regression
      // covers the legacy file path only.
      expect(fs.existsSync(result.queryPath)).toBe(true);
      expect(result.queryRef).toMatch(/^ontology-context-query:\/\//);
      expect(result.universalOntologyEntryRef).toMatch(/^universal-ontology-entry:\/\//);
      expect(result.capabilityContext.selectedCapabilityIds).toContain(
        "smoke-project:ontology-runtime-smoke",
      );
      expect(result.workflowTrace.mode).toBe("context-only");
      expect(result.workflowTrace.refs.universalOntologyEntryRef).toBe(result.universalOntologyEntryRef);
      expect(result.workflowTrace.refs.ontologyContextQueryRef).toBe(result.queryRef);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
