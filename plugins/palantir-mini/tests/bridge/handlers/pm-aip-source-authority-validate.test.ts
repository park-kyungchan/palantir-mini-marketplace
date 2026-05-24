import { describe, expect, test } from "bun:test";
import {
  AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION,
  type AipFdeLocalSurfaceContract,
} from "../../../core/contracts/aip-fde-local-surface";
import { pmAipSourceAuthorityValidate } from "../../../bridge/handlers/pm-aip-source-authority-validate";

const SURFACE: AipFdeLocalSurfaceContract = {
  schemaVersion: AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION,
  surfaceKind: "mcp-tool",
  surfaceId: "tool:pm_semantic_intent_gate",
  workflowFamily: "semanticIntentAndRouting",
  phaseRefs: ["semantic-routing:prompt-contract"],
  aipSurfaceRefs: ["tools-function"],
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
      unsupportedSurfaceRefs: [],
      smokeEvidenceRefs: [],
    },
  },
  outputStateRefs: ["semanticIntentContractRef"],
  validationRefs: ["tests/bridge/handlers/pm-semantic-intent-gate.test.ts"],
  unsupportedParityClaimsForbidden: true,
};

describe("pm_aip_source_authority_validate", () => {
  test("validates official Palantir source authority for a surface contract", async () => {
    const result = await pmAipSourceAuthorityValidate({ surfaceContract: SURFACE });

    expect(result.status).toBe("pass");
    expect(result.checkedRefCount).toBe(1);
  });
});
