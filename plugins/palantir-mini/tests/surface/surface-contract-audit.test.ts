import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { parseSurfaceContractFromMarkdown } from "../../lib/surface/parse";
import { auditSurfaceContracts } from "../../lib/surface/audit";

function tmpPluginRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-surface-audit-"));
}

const SURFACE_DOC = `---
name: pm-semantic-intent-gate
palantirSurface:
  schemaVersion: palantir-mini/aip-fde-local-surface/v1
  surfaceKind: skill
  surfaceId: skill:pm-semantic-intent-gate
  workflowFamily: semanticIntentAndRouting
  phaseRefs:
    - semantic-routing:prompt-contract
  aipSurfaceRefs:
    - tools-function
    - security-governance
  palantirSourceAuthorityRefs:
    - localResearchPath: ~/.claude/research/palantir-official/chatbot-studio/tools.md
      externalUrl: https://www.palantir.com/docs/foundry/chatbot-studio/tools/
      lastVerified: 2026-05-24
      sourceClass: palantir-chatbot-studio
  requiredContracts:
    semanticIntent: required
    digitalTwinChange: optional
    workContract: optional
    userDecisionRecord: optional
  mutationCapability: none
  deterministicStatus: enforced
  runtimeProjection:
    claude:
      support: native
    codex:
      support: adapter-native
  outputStateRefs:
    - semanticIntentContractRef
  validationRefs:
    - tests/bridge/handlers/pm-semantic-intent-gate.test.ts
  unsupportedParityClaimsForbidden: true
---

# Skill
`;

describe("local AIP/FDE surface contract parsing and audit", () => {
  test("parses palantirSurface frontmatter into a typed contract", () => {
    const parsed = parseSurfaceContractFromMarkdown(SURFACE_DOC);

    expect(parsed.source).toBe("frontmatter");
    expect(parsed.issues).toEqual([]);
    expect(parsed.contract?.surfaceKind).toBe("skill");
    expect(parsed.contract?.workflowFamily).toBe("semanticIntentAndRouting");
    expect(parsed.contract?.runtimeProjection.codex.support).toBe("adapter-native");
  });

  test("reports invalid enum values as field-level issues", () => {
    const parsed = parseSurfaceContractFromMarkdown(SURFACE_DOC.replace(
      "workflowFamily: semanticIntentAndRouting",
      "workflowFamily: genericPromptDiscipline",
    ));

    expect(parsed.contract).toBeUndefined();
    expect(parsed.issues.map((issue) => issue.issueId)).toContain("surface.invalid-workflow-family");
  });

  test("audits files in advisory mode before fail-closed rollout", () => {
    const root = tmpPluginRoot();
    fs.mkdirSync(path.join(root, "skills", "pm-semantic-intent-gate"), { recursive: true });
    fs.mkdirSync(path.join(root, "agents"), { recursive: true });
    fs.writeFileSync(path.join(root, "skills", "pm-semantic-intent-gate", "SKILL.md"), SURFACE_DOC);
    fs.writeFileSync(path.join(root, "agents", "plain-agent.md"), "# Missing contract\n");

    const result = auditSurfaceContracts({ pluginRoot: root, mode: "all" });

    expect(result.status).toBe("advisory");
    expect(result.scannedFileCount).toBe(2);
    expect(result.contractCount).toBe(1);
    expect(result.missingContractCount).toBe(1);
  });

  test("parses migrated high-priority agent and skill surface contracts", () => {
    const pluginRoot = path.resolve(import.meta.dir, "../..");
    const migratedFiles = [
      "agents/lead-orchestrator.md",
      "agents/ontology-steward.md",
      "agents/plugin-maintainer.md",
      "agents/hook-builder.md",
      "skills/pm-semantic-intent-gate/SKILL.md",
      "skills/pm-ontology-engineering-lead/SKILL.md",
    ];

    for (const relPath of migratedFiles) {
      const parsed = parseSurfaceContractFromMarkdown(
        fs.readFileSync(path.join(pluginRoot, relPath), "utf8"),
      );
      expect(parsed.source, relPath).toBe("frontmatter");
      expect(parsed.issues, relPath).toEqual([]);
      expect(parsed.contract?.surfaceId, relPath).toMatch(/^(agent|skill):/);
      expect(parsed.contract?.unsupportedParityClaimsForbidden, relPath).toBe(true);
    }
  });
});
