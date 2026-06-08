import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION,
  type AipFdeLocalSurfaceContract,
} from "../../core/contracts/aip-fde-local-surface";
import {
  DEFAULT_PALANTIR_SOURCE_AUTHORITY_CONFIG,
  validatePalantirSourceAuthority,
} from "../../lib/research/palantir-source-authority";

const TEMP_ROOTS: string[] = [];

function makeOfficialResearchPath(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-palantir-official-"));
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-palantir-official-"));
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

function makeBaseSurface(localResearchPath = makeOfficialResearchPath()): AipFdeLocalSurfaceContract {
  return {
    schemaVersion: AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION,
    surfaceKind: "skill",
    surfaceId: "skill:pm-semantic-intent-gate",
    workflowFamily: "semanticIntentAndRouting",
    phaseRefs: ["semantic-routing:prompt-contract"],
    aipSurfaceRefs: ["tools-function", "security-governance"],
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
        unsupportedSurfaceRefs: ["codex:subagent-stop"],
        smokeEvidenceRefs: [],
      },
      gemini: {
        support: "unsupported",
        evidenceRefs: [],
        fallbackObligations: ["Gemini remains runtime_gap until native evidence exists."],
        unsupportedSurfaceRefs: ["gemini:runtime-gap-unsupported"],
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

describe("Palantir source authority validator", () => {
  test("accepts local research plus official palantir.com authority", () => {
    const result = validatePalantirSourceAuthority(makeBaseSurface());

    expect(result.status).toBe("pass");
    expect(result.issues).toEqual([]);
    expect(result.checkedRefCount).toBe(1);
  });

  test("rejects missing local path, non-official URL, stale date shape, and unknown class", () => {
    const result = validatePalantirSourceAuthority({
      ...makeBaseSurface(),
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

  test("rejects palantir-official paths that are not real fetched files", () => {
    const validPath = makeOfficialResearchPath();
    const missingPath = validPath.replace(
      "/foundry/chatbot-studio/tools.md",
      "/chatbot-studio/tools.md",
    );
    const result = validatePalantirSourceAuthority(makeBaseSurface(missingPath));

    expect(result.status).toBe("fail");
    expect(result.issues.map((item) => item.issueId)).toContain(
      "palantir-authority.local-research-path-not-found",
    );
  });

  test("rejects existing palantir-official files omitted from the manifest", () => {
    const result = validatePalantirSourceAuthority(
      makeBaseSurface(makeUnlistedOfficialResearchPath()),
    );

    expect(result.status).toBe("fail");
    expect(result.issues.map((item) => item.issueId)).toContain(
      "palantir-authority.local-research-path-not-in-manifest",
    );
  });

  describe("injectable config", () => {
    test("omitting config equals passing the exported default config", () => {
      const surface = makeBaseSurface();
      const withoutConfig = validatePalantirSourceAuthority(surface);
      const withDefault = validatePalantirSourceAuthority(
        surface,
        DEFAULT_PALANTIR_SOURCE_AUTHORITY_CONFIG,
      );

      expect(withDefault).toEqual(withoutConfig);
      expect(withoutConfig.status).toBe("pass");
    });

    test("custom officialUrlHostname overrides the default www.palantir.com check", () => {
      // The base surface uses an https://www.palantir.com URL -> passes by default.
      expect(validatePalantirSourceAuthority(makeBaseSurface()).status).toBe("pass");

      // With a custom official hostname, the default URL is no longer official.
      const result = validatePalantirSourceAuthority(
        makeBaseSurface(),
        { officialUrlHostname: "docs.internal.example.com" },
      );
      expect(result.status).toBe("fail");
      expect(result.issues.map((item) => item.issueId)).toContain(
        "palantir-authority.invalid-external-url",
      );
    });

    test("custom surfacesRequiringAuthority can make validation not-required", () => {
      // Default: tools-function/security-governance require authority refs.
      expect(validatePalantirSourceAuthority(makeBaseSurface()).status).toBe("pass");

      // Custom required set excludes the surface's refs -> authority not required.
      const result = validatePalantirSourceAuthority(
        makeBaseSurface(),
        { surfacesRequiringAuthority: ["application-state-variables"] },
      );
      expect(result.status).toBe("not-required");
      expect(result.checkedRefCount).toBe(0);
      expect(result.issues).toEqual([]);
    });

    test("custom localResearchPathPrefixes accept a non-default research root", () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-palantir-custom-"));
      TEMP_ROOTS.push(root);
      // A research file that does NOT match the default ~/.claude/research/palantir-* shape.
      const officialRoot = path.join(root, "vendor-research", "palantir-official");
      const docPath = path.join(officialRoot, "foundry", "tools.md");
      fs.mkdirSync(path.dirname(docPath), { recursive: true });
      fs.writeFileSync(docPath, "# Tools\n", "utf8");
      fs.writeFileSync(
        path.join(officialRoot, "_manifest.json"),
        JSON.stringify({ docs: [{ path: "foundry/tools.md", status: "fetched" }] }, null, 2),
        "utf8",
      );

      const surface = makeBaseSurface(docPath);

      // Default prefixes reject this path shape.
      expect(
        validatePalantirSourceAuthority(surface).issues.map((item) => item.issueId),
      ).toContain("palantir-authority.invalid-local-research-path");

      // Injected prefix + official-root suffix make the custom path valid.
      const result = validatePalantirSourceAuthority(surface, {
        localResearchPathPrefixes: [root],
        officialRootSuffixSegments: ["vendor-research", "palantir-official"],
      });
      expect(result.status).toBe("pass");
    });
  });
});
