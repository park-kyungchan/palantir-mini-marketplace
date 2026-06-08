import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  classifyEvidenceSource,
  DEFAULT_EVIDENCE_SOURCE_POLICY_CONFIG,
  isReferenceEvidenceAllowed,
} from "../../../lib/evidence/evidence-source-policy";

describe("evidence source policy", () => {
  const projectRoot = "/tmp/example-project";

  test("allows project docs as reference-only, not-promoted evidence", () => {
    const result = classifyEvidenceSource({
      projectRoot,
      sourcePath: "docs/architecture.md",
    });

    expect(result.allowed).toBe(true);
    expect(result.kind).toBe("project-doc");
    expect(result.role).toBe("reference_only");
    expect(result.ssotStatus).toBe("not_promoted");
    expect(result.normalizedPath).toBe("/tmp/example-project/docs/architecture.md");
  });

  test("allows /home/palantirkc/docs evidence as reference-only, not-promoted evidence", () => {
    const result = classifyEvidenceSource({
      projectRoot,
      sourcePath: "/home/palantirkc/docs/proposals/fde-gap.md",
    });

    expect(result.allowed).toBe(true);
    expect(result.kind).toBe("home-doc");
    expect(result.role).toBe("reference_only");
    expect(result.ssotStatus).toBe("not_promoted");
    expect(result.policyVersion).toBe("v2");
  });

  test("keeps curriculum and MYP docs reference_only / not_promoted", () => {
    const result = classifyEvidenceSource({
      projectRoot,
      sourcePath: "/tmp/example-project/docs/2022-math-curriculum/agent-ready/ontology-engineering/v2/manifests/objects.jsonl",
    });

    expect(result.allowed).toBe(true);
    expect(result.kind).toBe("curriculum-reference");
    expect(result.role).toBe("reference_only");
    expect(result.ssotStatus).toBe("not_promoted");
  });

  test("allows subrepo read-only index as reference-only application-state evidence", () => {
    const result = classifyEvidenceSource({
      projectRoot,
      sourcePath: ".palantir-mini/subrepos/read-only-index.json",
    });

    expect(result.allowed).toBe(true);
    expect(result.kind).toBe("subrepo-read-only-index");
    expect(result.role).toBe("reference_only");
    expect(result.ssotStatus).toBe("not_promoted");
  });

  test("rejects non-doc runtime files", () => {
    const result = classifyEvidenceSource({
      projectRoot,
      sourcePath: "src/runtime.ts",
    });

    expect(result.allowed).toBe(false);
    expect(result.kind).toBe("unsupported");
    expect(result.role).toBe("reference_only");
    expect(result.ssotStatus).toBe("not_promoted");
    expect(isReferenceEvidenceAllowed({ projectRoot, sourcePath: "src/runtime.ts" })).toBe(false);
  });

  test("uses scoped promotion ledger only for matching normalized paths", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-evidence-ledger-"));
    try {
      const docsDir = path.join(root, "docs");
      fs.mkdirSync(path.join(root, ".palantir-mini", "evidence"), { recursive: true });
      fs.mkdirSync(docsDir, { recursive: true });
      const promoted = path.join(docsDir, "promoted.md");
      const unpromoted = path.join(docsDir, "unpromoted.md");
      fs.writeFileSync(promoted, "# promoted\n");
      fs.writeFileSync(unpromoted, "# unpromoted\n");
      fs.writeFileSync(
        path.join(root, ".palantir-mini", "evidence", "promotions.json"),
        JSON.stringify({
          schemaVersion: "palantir-mini/evidence-promotions/v1",
          promotions: [
            {
              sourcePath: "docs/promoted.md",
              scope: "project",
              target: "project ontology",
              approvedContractRef: "digital-twin-change:approved",
              timestamp: "2026-05-21T00:00:00.000Z",
              stillReferenceOnlyOutsideScope: true,
            },
          ],
        }),
      );

      expect(classifyEvidenceSource({
        projectRoot: root,
        sourcePath: "docs/promoted.md",
      }).ssotStatus).toBe("promoted_project_scope");
      expect(classifyEvidenceSource({
        projectRoot: root,
        sourcePath: "docs/unpromoted.md",
      }).ssotStatus).toBe("not_promoted");
      expect(classifyEvidenceSource({
        projectRoot: root,
        sourcePath: "src/runtime.ts",
      }).ssotStatus).toBe("not_promoted");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  describe("injectable config", () => {
    test("omitting config is identical to the exported default config", () => {
      const input = { projectRoot, sourcePath: "docs/architecture.md" };
      const withoutConfig = classifyEvidenceSource(input);
      const withDefault = classifyEvidenceSource(input, DEFAULT_EVIDENCE_SOURCE_POLICY_CONFIG);

      expect(withDefault).toEqual(withoutConfig);
    });

    test("custom homeDocsRoot overrides the default home-doc root", () => {
      // Default behavior: /home/palantirkc/docs is a home-doc.
      expect(classifyEvidenceSource({
        projectRoot,
        sourcePath: "/home/palantirkc/docs/proposals/fde-gap.md",
      }).kind).toBe("home-doc");

      // Custom root: the historical default path is no longer recognised as a home-doc...
      expect(classifyEvidenceSource(
        { projectRoot, sourcePath: "/home/palantirkc/docs/proposals/fde-gap.md" },
        { homeDocsRoot: "/srv/reference-docs" },
      ).kind).toBe("unsupported");

      // ...while the injected root is.
      const custom = classifyEvidenceSource(
        { projectRoot, sourcePath: "/srv/reference-docs/proposals/fde-gap.md" },
        { homeDocsRoot: "/srv/reference-docs" },
      );
      expect(custom.allowed).toBe(true);
      expect(custom.kind).toBe("home-doc");
    });

    test("custom projectDocSegments override the default project-doc directories", () => {
      // Default: "docs" is a project-doc segment.
      expect(classifyEvidenceSource({
        projectRoot,
        sourcePath: "docs/architecture.md",
      }).kind).toBe("project-doc");

      // Custom segment list (drops "docs", adds "handbook").
      expect(classifyEvidenceSource(
        { projectRoot, sourcePath: "docs/architecture.md" },
        { projectDocSegments: ["handbook"] },
      ).kind).toBe("unsupported");

      expect(classifyEvidenceSource(
        { projectRoot, sourcePath: "handbook/architecture.md" },
        { projectDocSegments: ["handbook"] },
      ).kind).toBe("project-doc");
    });

    test("custom docExtensions gate which file types qualify", () => {
      // Default: .md is an accepted doc extension.
      expect(classifyEvidenceSource({
        projectRoot,
        sourcePath: "docs/architecture.md",
      }).allowed).toBe(true);

      // Custom extensions exclude .md.
      expect(classifyEvidenceSource(
        { projectRoot, sourcePath: "docs/architecture.md" },
        { docExtensions: [".rst"] },
      ).allowed).toBe(false);

      expect(classifyEvidenceSource(
        { projectRoot, sourcePath: "docs/architecture.rst" },
        { docExtensions: [".rst"] },
      ).allowed).toBe(true);
    });

    test("partial config merges over defaults (unspecified fields keep default behavior)", () => {
      // Only override curriculumSegments; docFilenames default must still apply.
      const result = classifyEvidenceSource(
        { projectRoot, sourcePath: "nested/BROWSE.md" },
        { curriculumSegments: ["lessons"] },
      );
      expect(result.kind).toBe("project-doc");
    });
  });
});
