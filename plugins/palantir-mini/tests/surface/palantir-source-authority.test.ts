import { describe, expect, test } from "bun:test";
import {
  AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION,
  type AipFdeLocalSurfaceContract,
} from "../../core/contracts/aip-fde-local-surface";
import { validatePalantirSourceAuthority } from "../../lib/research/palantir-source-authority";

const BASE_SURFACE: AipFdeLocalSurfaceContract = {
  schemaVersion: AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION,
  surfaceKind: "skill",
  surfaceId: "skill:pm-semantic-intent-gate",
  workflowFamily: "semanticIntentAndRouting",
  phaseRefs: ["semantic-routing:prompt-contract"],
  aipSurfaceRefs: ["tools-function", "security-governance"],
  palantirSourceAuthorityRefs: [
    {
      localResearchPath: "~/.claude/research/palantir-official/chatbot-studio/tools.md",
      externalUrl: "https://www.palantir.com/docs/foundry/chatbot-studio/tools/",
      lastVerified: "2026-05-24",
      sourceClass: "palantir-chatbot-studio",
    },
  ],
  requiredContracts: {
    semanticIntent: "required",
    digitalTwinChange: "optional",
    workContract: "optional",
    userDecisionRecord: "optional",
  },
  mutationCapability: "none",
  deterministicStatus: "enforced",
  runtimeProjection: {
    claude: {
      support: "native",
      evidenceRefs: [],
      fallbackObligations: [],
      unsupportedSurfaceRefs: [],
      smokeEvidenceRefs: [],
    },
    codex: {
      support: "adapter-native",
      evidenceRefs: [],
      fallbackObligations: [],
      unsupportedSurfaceRefs: ["codex:subagent-stop"],
      smokeEvidenceRefs: [],
    },
  },
  outputStateRefs: ["semanticIntentContractRef"],
  validationRefs: ["tests/bridge/handlers/pm-semantic-intent-gate.test.ts"],
  unsupportedParityClaimsForbidden: true,
};

describe("Palantir source authority validator", () => {
  test("accepts local research plus official palantir.com authority", () => {
    const result = validatePalantirSourceAuthority(BASE_SURFACE);

    expect(result.status).toBe("pass");
    expect(result.issues).toEqual([]);
    expect(result.checkedRefCount).toBe(1);
  });

  test("rejects missing local path, non-official URL, stale date shape, and unknown class", () => {
    const result = validatePalantirSourceAuthority({
      ...BASE_SURFACE,
      palantirSourceAuthorityRefs: [
        {
          localResearchPath: "/tmp/research.md",
          externalUrl: "https://example.com/docs",
          lastVerified: "today",
          sourceClass: "blog" as "palantir-aip",
        },
      ],
    });

    expect(result.status).toBe("fail");
    expect(result.issues.map((issue) => issue.issueId)).toEqual([
      "palantir-authority.invalid-local-research-path",
      "palantir-authority.invalid-external-url",
      "palantir-authority.invalid-last-verified",
      "palantir-authority.invalid-source-class",
    ]);
  });
});
