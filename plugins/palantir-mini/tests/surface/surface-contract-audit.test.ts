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
    - localResearchPath: ~/.claude/research/palantir-official/foundry/chatbot-studio/tools.md
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

const SOURCE_COMMENT_SURFACE = `/**
 * @palantirSurface
 * schemaVersion: palantir-mini/aip-fde-local-surface/v1
 * surfaceKind: mcp-tool
 * surfaceId: mcp:pm_semantic_intent_gate
 * workflowFamily: semanticIntentAndRouting
 * phaseRefs:
 *   - semantic-routing:prompt-contract
 * aipSurfaceRefs:
 *   - tools-function
 * requiredContracts:
 *   semanticIntent: optional
 *   digitalTwinChange: optional
 *   workContract: optional
 *   userDecisionRecord: optional
 * mutationCapability: proposal-only
 * deterministicStatus: enforced
 * runtimeProjection:
 *   claude:
 *     support: native
 *   codex:
 *     support: adapter-native
 * outputStateRefs:
 *   - semanticIntentContractRef
 * validationRefs:
 *   - tests/bridge/handlers/pm-semantic-intent-gate.test.ts
 * unsupportedParityClaimsForbidden: true
 */
export async function pmSemanticIntentGate() {}
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

  test("parses palantirSurface source comments for TypeScript surfaces", () => {
    const parsed = parseSurfaceContractFromMarkdown(SOURCE_COMMENT_SURFACE);

    expect(parsed.source).toBe("source-comment");
    expect(parsed.issues).toEqual([]);
    expect(parsed.contract?.surfaceKind).toBe("mcp-tool");
    expect(parsed.contract?.surfaceId).toBe("mcp:pm_semantic_intent_gate");
  });

  test("parses palantirSurface JSON objects for manifest-style surfaces", () => {
    const parsed = parseSurfaceContractFromMarkdown(JSON.stringify({
      palantirSurface: {
        schemaVersion: "palantir-mini/aip-fde-local-surface/v1",
        surfaceKind: "runtime-adapter",
        surfaceId: "runtime-adapter:codex",
        workflowFamily: "runtimeAdapterAndParity",
        phaseRefs: ["runtime-adapter:hook-projection"],
        aipSurfaceRefs: ["runtime-projection"],
        requiredContracts: {
          semanticIntent: "not-applicable",
          digitalTwinChange: "not-applicable",
          workContract: "not-applicable",
          userDecisionRecord: "not-applicable",
        },
        mutationCapability: "none",
        deterministicStatus: "advisory-only",
        runtimeProjection: {
          claude: { support: "native" },
          codex: { support: "adapter-native" },
        },
        outputStateRefs: ["codexHookRegistry"],
        validationRefs: ["tests/hooks/manifest-validate.test.ts"],
        unsupportedParityClaimsForbidden: true,
      },
    }));

    expect(parsed.source).toBe("json");
    expect(parsed.issues).toEqual([]);
    expect(parsed.contract?.surfaceKind).toBe("runtime-adapter");
    expect(parsed.contract?.workflowFamily).toBe("runtimeAdapterAndParity");
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
    expect(result.requiredSurfaceCount).toBe(2);
    expect(result.helperFileCount).toBe(0);
    expect(result.contractCount).toBe(1);
    expect(result.missingContractCount).toBe(1);
    expect(result.missingRequiredContractCount).toBe(1);
    expect(result.surfaceBreakdown).toEqual([
      {
        surfaceKind: "agent",
        scannedFileCount: 1,
        requiredSurfaceCount: 1,
        helperFileCount: 0,
        contractCount: 0,
        missingContractCount: 1,
        missingRequiredContractCount: 1,
        invalidContractCount: 0,
        unsupportedRepresentationCount: 0,
      },
      {
        surfaceKind: "skill",
        scannedFileCount: 1,
        requiredSurfaceCount: 1,
        helperFileCount: 0,
        contractCount: 1,
        missingContractCount: 0,
        missingRequiredContractCount: 0,
        invalidContractCount: 0,
        unsupportedRepresentationCount: 0,
      },
    ]);
  });

  test("separates helper inventory from fail-closed required surfaces", () => {
    const root = tmpPluginRoot();
    fs.mkdirSync(path.join(root, "bridge", "handlers", "internal"), { recursive: true });
    fs.writeFileSync(path.join(root, "bridge", "handlers", "pm-semantic-intent-gate.ts"), SOURCE_COMMENT_SURFACE);
    fs.writeFileSync(path.join(root, "bridge", "handlers", "internal", "helper.ts"), "export const helper = true;\n");
    fs.writeFileSync(path.join(root, "bridge", "handlers", "_project-event.ts"), "export const internal = true;\n");

    const result = auditSurfaceContracts({ pluginRoot: root, mode: "mcp-tools", failClosed: true });

    expect(result.status).toBe("advisory");
    expect(result.requiredSurfaceCount).toBe(1);
    expect(result.helperFileCount).toBe(2);
    expect(result.missingContractCount).toBe(2);
    expect(result.missingRequiredContractCount).toBe(0);
    expect(result.findings.filter((finding) => !finding.contractRequired)).toHaveLength(2);
    expect(result.findings.every((finding) =>
      finding.contractRequired || finding.issues.every((issue) => issue.severity === "warn")
    )).toBe(true);
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

  test("parses migrated source-comment MCP tool surface contracts", () => {
    const pluginRoot = path.resolve(import.meta.dir, "../..");
    const parsed = parseSurfaceContractFromMarkdown(
      fs.readFileSync(path.join(pluginRoot, "bridge/handlers/pm-semantic-intent-gate.ts"), "utf8"),
    );

    expect(parsed.source).toBe("source-comment");
    expect(parsed.issues).toEqual([]);
    expect(parsed.contract?.surfaceKind).toBe("mcp-tool");
    expect(parsed.contract?.surfaceId).toBe("mcp:pm_semantic_intent_gate");
  });
});
