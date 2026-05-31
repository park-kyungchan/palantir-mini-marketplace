import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import contract from "../contracts/layer-boundary.contract.json";
import schema from "../schemas/layer-boundary.schema.json";
import {
  validateLayerBoundary,
  verifyLayerBoundary,
  type LayerBoundaryContract,
} from "../scripts/verify-layer-boundary";

const PLUGIN_ROOT = resolve(import.meta.dir, "..");
const CONTRACT_PATH = resolve(PLUGIN_ROOT, "contracts/layer-boundary.contract.json");
const SCHEMA_PATH = resolve(PLUGIN_ROOT, "schemas/layer-boundary.schema.json");
const typedContract = contract as LayerBoundaryContract;

function cloneContract(overrides: Partial<LayerBoundaryContract> = {}): LayerBoundaryContract {
  return {
    ...structuredClone(typedContract),
    ...overrides,
  };
}

function validate(candidate: LayerBoundaryContract) {
  return validateLayerBoundary(candidate, schema, {
    contractPath: CONTRACT_PATH,
    schemaPath: SCHEMA_PATH,
  });
}

describe("LayerBoundaryV1", () => {
  test("default contract verifies every required runtime layer", () => {
    const result = verifyLayerBoundary();

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.checkedRoles).toEqual([
      "llm-provider",
      "runtime-adapter",
      "plugin-source",
      "project-state",
      "runtime-cache",
      "marketplace-root",
    ]);
  });

  test("schema makes the machine contract fields required", () => {
    expect(schema.title).toBe("LayerBoundaryV1");
    expect(schema.required).toContain("sourceAuthority");
    expect(schema.required).toContain("llmProvider");
    expect(schema.required).toContain("runtimeAdapter");
    expect(schema.required).toContain("pluginSource");
    expect(schema.required).toContain("projectState");
    expect(schema.required).toContain("runtimeCache");
    expect(schema.required).toContain("marketplaceRoot");
  });

  test("blocks unknown role enums", () => {
    const candidate = cloneContract({
      runtimeAdapter: {
        ...contract.runtimeAdapter,
        role: "claude-runtime",
      },
    });

    const result = validate(candidate);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.reasonCode)).toContain(
      "LAYER_BOUNDARY_UNKNOWN_ROLE",
    );
  });

  test("blocks LLM provider authorization of protected mutation", () => {
    const candidate = cloneContract({
      llmProvider: {
        ...contract.llmProvider,
        mutationAuthority: "source-authority",
        mayAuthorizeProtectedMutation: true,
      },
    });

    const result = validate(candidate);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.reasonCode)).toContain(
      "LAYER_BOUNDARY_PROVIDER_AUTHORITY",
    );
  });

  test("blocks runtime cache authority over semantic source edits", () => {
    const candidate = cloneContract({
      runtimeCache: {
        ...contract.runtimeCache,
        mutationAuthority: "source-authority",
        mayAuthorizeProtectedMutation: true,
        forbiddenPaths: [],
      },
    });

    const result = validate(candidate);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.reasonCode)).toContain(
      "LAYER_BOUNDARY_CACHE_AUTHORITY",
    );
  });

  test("blocks advisory prompt artifacts as approval authority", () => {
    const candidate = cloneContract({
      protectedMutationPolicy: {
        ...contract.protectedMutationPolicy,
        nonAuthorizingInputs: ["llm-provider-identity", "runtime-cache-presence"],
      },
    });

    const result = validate(candidate);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.reasonCode)).toContain(
      "LAYER_BOUNDARY_ADVISORY_AUTHORITY",
    );
  });

  test("blocks missing deterministic evidence and nonblocking reason codes", () => {
    const candidate = cloneContract({
      protectedMutationPolicy: {
        ...contract.protectedMutationPolicy,
        requiredEvidence: ["targeted-tests-passing"],
      },
      reasonCodes: typedContract.reasonCodes.map((reason) =>
        reason.code === "LAYER_BOUNDARY_MISSING_EVIDENCE"
          ? { ...reason, severity: "advisory" as const, deniesProtectedMutation: false }
          : reason,
      ),
    });

    const result = validate(candidate);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.reasonCode)).toContain(
      "LAYER_BOUNDARY_MISSING_EVIDENCE",
    );
  });

  test("CLI default paths verify the checked-in contract", async () => {
    const proc = Bun.spawn(["bun", "run", "scripts/verify-layer-boundary.ts"], {
      cwd: PLUGIN_ROOT,
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(JSON.parse(stdout).valid).toBe(true);
  });

  test("CLI exits nonzero for invalid contract input", async () => {
    const dir = mkdtempSync(join(tmpdir(), "layer-boundary-"));
    const invalidPath = join(dir, "invalid.contract.json");
    writeFileSync(
      invalidPath,
      JSON.stringify(
        cloneContract({
          runtimeCache: {
            ...contract.runtimeCache,
            mayAuthorizeProtectedMutation: true,
          },
        }),
        null,
        2,
      ),
    );

    const proc = Bun.spawn(
      [
        "bun",
        "run",
        "scripts/verify-layer-boundary.ts",
        "--contract",
        invalidPath,
        "--schema",
        SCHEMA_PATH,
      ],
      {
        cwd: PLUGIN_ROOT,
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout).issues.map((issue: { reasonCode: string }) => issue.reasonCode)).toContain(
      "LAYER_BOUNDARY_CACHE_AUTHORITY",
    );
  });
});
