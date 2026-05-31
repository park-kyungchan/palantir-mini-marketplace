import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY,
  type RuntimeId,
  type RuntimeSupportDeclaration,
} from "../core/contracts";

const PLUGIN_ROOT = join(import.meta.dir, "..");
const SUPPORT_CLAIMS_REQUIRING_EVIDENCE = new Set<RuntimeSupportDeclaration>([
  "native",
  "adapter-native",
]);
const RUNTIMES: readonly RuntimeId[] = ["claude", "codex", "gemini"];

interface RuntimeEvidence {
  readonly schemaVersion: string;
  readonly runtime: RuntimeId;
  readonly support: RuntimeSupportDeclaration;
  readonly sourceAuthority: string;
  readonly evidenceRefs: readonly string[];
  readonly unsupportedSurfaceRefs: readonly string[];
  readonly smokeEvidenceRefs: readonly string[];
  readonly lastVerified: string;
}

function readRuntimeEvidence(runtime: RuntimeId): RuntimeEvidence | undefined {
  const evidencePath = join(PLUGIN_ROOT, "contracts", "runtime-evidence", `${runtime}.json`);
  if (!existsSync(evidencePath)) return undefined;
  return JSON.parse(readFileSync(evidencePath, "utf8")) as RuntimeEvidence;
}

function main(): void {
  const errors: string[] = [];
  const evidenceByRuntime = new Map<RuntimeId, RuntimeEvidence | undefined>(
    RUNTIMES.map((runtime) => [runtime, readRuntimeEvidence(runtime)]),
  );

  for (const [runtime, evidence] of evidenceByRuntime.entries()) {
    if (!evidence) continue;
    if (evidence.schemaVersion !== "palantir-mini/runtime-evidence/v1") {
      errors.push(`${runtime}: invalid runtime evidence schemaVersion`);
    }
    if (evidence.runtime !== runtime) {
      errors.push(`${runtime}: runtime evidence self-identifies as ${evidence.runtime}`);
    }
    if (evidence.sourceAuthority !== "plugins/palantir-mini") {
      errors.push(`${runtime}: runtime evidence sourceAuthority must be plugins/palantir-mini`);
    }
    if (evidence.evidenceRefs.length === 0) {
      errors.push(`${runtime}: runtime evidence must list evidenceRefs`);
    }
    if (evidence.smokeEvidenceRefs.length === 0) {
      errors.push(`${runtime}: runtime evidence must list smokeEvidenceRefs`);
    }
  }

  for (const contract of WORKFLOW_FAMILY_ENFORCEMENT_CONTRACT_INVENTORY) {
    const unsupportedRuntimes = new Set<RuntimeId>();
    for (const runtime of RUNTIMES) {
      const projection = contract.runtimeProjection[runtime];
      const evidence = evidenceByRuntime.get(runtime);
      if (runtime !== "codex" && projection.support !== "unsupported") {
        errors.push(
          `${contract.workflowFamily}: ${runtime} support must remain unsupported until a runtime-evidence/${runtime}.json file and install surface exist`,
        );
      }
      if (projection.support === "unsupported") {
        unsupportedRuntimes.add(runtime);
        if (projection.evidenceRefs.length > 0) {
          errors.push(`${contract.workflowFamily}: unsupported ${runtime} must not carry support evidence refs`);
        }
        if (projection.unsupportedSurfaceRefs.length === 0) {
          errors.push(`${contract.workflowFamily}: unsupported ${runtime} must list unsupportedSurfaceRefs`);
        }
      }
      if (SUPPORT_CLAIMS_REQUIRING_EVIDENCE.has(projection.support)) {
        if (!evidence) {
          errors.push(`${contract.workflowFamily}: ${runtime} ${projection.support} claim has no runtime evidence file`);
        }
        if (!projection.evidenceRefs.includes(`contracts/runtime-evidence/${runtime}.json`)) {
          errors.push(`${contract.workflowFamily}: ${runtime} ${projection.support} claim must reference contracts/runtime-evidence/${runtime}.json`);
        }
      }
    }

    for (const scenario of contract.complexE2EScenarios) {
      for (const runtimeRef of scenario.runtimeRefs) {
        if (unsupportedRuntimes.has(runtimeRef)) {
          errors.push(`${scenario.scenarioId}: unsupported runtimeRef ${runtimeRef} cannot be advertised as complex E2E coverage`);
        }
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`[runtime-parity] ${error}`);
    process.exit(1);
  }
  console.log("[runtime-parity] OK: runtime support claims are evidence-backed");
}

main();
