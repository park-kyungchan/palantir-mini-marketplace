import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION,
  type AipFdeLocalSurfaceContract,
} from "../../../core/contracts/aip-fde-local-surface";
import { pmAipSourceAuthorityValidate } from "../../../bridge/handlers/pm-aip-source-authority-validate";

const TEMP_ROOTS: string[] = [];

function makeOfficialResearchPath(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-aip-source-authority-"));
  TEMP_ROOTS.push(root);
  const officialRoot = path.join(root, ".claude", "research", "palantir-official");
  const docPath = path.join(officialRoot, "foundry", "chatbot-studio", "tools.md");
  fs.mkdirSync(path.dirname(docPath), { recursive: true });
  fs.writeFileSync(docPath, "# Tools\n", "utf8");
  fs.writeFileSync(
    path.join(officialRoot, "_manifest.json"),
    JSON.stringify({
      docs: [
        {
          path: "foundry/chatbot-studio/tools.md",
          status: "fetched",
        },
      ],
    }, null, 2),
    "utf8",
  );
  return docPath;
}

function makeUnlistedOfficialResearchPath(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-aip-source-authority-"));
  TEMP_ROOTS.push(root);
  const officialRoot = path.join(root, ".claude", "research", "palantir-official");
  const listedPath = path.join(officialRoot, "foundry", "chatbot-studio", "tools.md");
  const unlistedPath = path.join(officialRoot, "foundry", "chatbot-studio", "application-state.md");
  fs.mkdirSync(path.dirname(unlistedPath), { recursive: true });
  fs.writeFileSync(listedPath, "# Tools\n", "utf8");
  fs.writeFileSync(unlistedPath, "# Application State\n", "utf8");
  fs.writeFileSync(
    path.join(officialRoot, "_manifest.json"),
    JSON.stringify({
      docs: [
        {
          path: "foundry/chatbot-studio/tools.md",
          status: "fetched",
        },
      ],
    }, null, 2),
    "utf8",
  );
  return unlistedPath;
}

function makeSurface(localResearchPath = makeOfficialResearchPath()): AipFdeLocalSurfaceContract {
  return {
    schemaVersion: AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION,
    surfaceKind: "mcp-tool",
    surfaceId: "tool:pm_semantic_intent_gate",
    workflowFamily: "semanticIntentAndRouting",
    phaseRefs: ["semantic-routing:prompt-contract"],
    aipSurfaceRefs: ["tools-function"],
    palantirSourceAuthorityRefs: [
      {
        localResearchPath,
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
}

afterEach(() => {
  for (const root of TEMP_ROOTS.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("pm_aip_source_authority_validate", () => {
  test("validates official Palantir source authority for a surface contract", async () => {
    const result = await pmAipSourceAuthorityValidate({ surfaceContract: makeSurface() });

    expect(result.status).toBe("pass");
    expect(result.checkedRefCount).toBe(1);
  });

  test("reports malformed Palantir official snapshot paths", async () => {
    const validPath = makeOfficialResearchPath();
    const missingPath = validPath.replace(
      "/foundry/chatbot-studio/tools.md",
      "/chatbot-studio/tools.md",
    );
    const result = await pmAipSourceAuthorityValidate({
      surfaceContract: makeSurface(missingPath),
    });

    expect(result.status).toBe("fail");
    expect(result.issues.map((item) => item.issueId)).toContain(
      "palantir-authority.local-research-path-not-found",
    );
  });

  test("reports existing Palantir official files omitted from the manifest", async () => {
    const result = await pmAipSourceAuthorityValidate({
      surfaceContract: makeSurface(makeUnlistedOfficialResearchPath()),
    });

    expect(result.status).toBe("fail");
    expect(result.issues.map((item) => item.issueId)).toContain(
      "palantir-authority.local-research-path-not-in-manifest",
    );
  });
});
