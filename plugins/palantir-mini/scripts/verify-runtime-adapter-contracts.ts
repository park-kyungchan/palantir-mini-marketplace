import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RUNTIME_ADAPTER_CONTRACT_SCHEMA_VERSION,
  RUNTIME_ADAPTER_PROVIDER_IDENTITY_AUTHORITY,
  RUNTIME_ADAPTER_PACKAGE_SURFACES,
  RUNTIME_SUPPORT_DECLARATIONS,
  type RuntimeAdapterContract,
  type RuntimeId,
} from "../core/contracts";

const PLUGIN_ROOT = join(import.meta.dir, "..");
const RUNTIMES: readonly RuntimeId[] = ["claude", "codex", "gemini"];
const CODEX_UNMOUNTED_HOOK_EVENTS = [] as const;
const FORBIDDEN_SOURCE_REFS = [
  "~/.codex/plugins/cache",
  "/home/palantirkc/.codex/plugins/cache",
] as const;

export interface RuntimeAdapterContractVerification {
  readonly status: "pass" | "fail";
  readonly errors: readonly string[];
  readonly contractCount: number;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function refLists(contract: RuntimeAdapterContract): readonly string[] {
  return [
    ...contract.manifestRefs,
    ...contract.hookRegistryRefs,
    ...contract.adapterRefs,
    ...contract.mcpProfileRefs,
    ...contract.skillSurfaceRefs,
    ...contract.unsupportedSurfaceRefs,
    ...contract.runtimeGapRefs,
    ...contract.fallbackObligations,
    ...contract.smokeEvidenceRefs,
    ...contract.reloadEvidenceRefs,
  ];
}

function readContracts(pluginRoot: string): RuntimeAdapterContract[] {
  return RUNTIMES.map((runtime) => {
    const contractPath = join(pluginRoot, "runtime-adapters", runtime, "contract.json");
    return readJson<RuntimeAdapterContract>(contractPath);
  });
}

export function verifyRuntimeAdapterContracts(
  pluginRoot = PLUGIN_ROOT,
): RuntimeAdapterContractVerification {
  const errors: string[] = [];
  const contracts = readContracts(pluginRoot);
  const byRuntime = new Map<RuntimeId, RuntimeAdapterContract>();

  for (const contract of contracts) {
    if (!RUNTIMES.includes(contract.runtime)) {
      errors.push(`${contract.runtime}: unsupported runtime id`);
      continue;
    }
    byRuntime.set(contract.runtime, contract);
    if (contract.schemaVersion !== RUNTIME_ADAPTER_CONTRACT_SCHEMA_VERSION) {
      errors.push(`${contract.runtime}: invalid schemaVersion`);
    }
    if (!RUNTIME_SUPPORT_DECLARATIONS.includes(contract.support)) {
      errors.push(`${contract.runtime}: invalid support declaration`);
    }
    if (contract.providerIdentityAuthority !== RUNTIME_ADAPTER_PROVIDER_IDENTITY_AUTHORITY) {
      errors.push(`${contract.runtime}: provider identity must be metadata-only`);
    }
    if (contract.sourceAuthority !== "plugins/palantir-mini") {
      errors.push(`${contract.runtime}: sourceAuthority must be plugins/palantir-mini`);
    }
    if (!RUNTIME_ADAPTER_PACKAGE_SURFACES.includes(contract.packageSurface)) {
      errors.push(`${contract.runtime}: invalid packageSurface`);
    }
    if (contract.unsupportedParityClaimsForbidden !== true) {
      errors.push(`${contract.runtime}: unsupportedParityClaimsForbidden must be true`);
    }
    const expectedLastVerified = contract.runtime === "codex" ? "2026-06-05" : "2026-05-31";
    if (contract.lastVerified !== expectedLastVerified) {
      errors.push(`${contract.runtime}: lastVerified must be ${expectedLastVerified}`);
    }
    for (const ref of refLists(contract)) {
      for (const forbidden of FORBIDDEN_SOURCE_REFS) {
        if (ref.includes(forbidden)) {
          errors.push(`${contract.runtime}: cache path cannot be source authority (${ref})`);
        }
      }
    }
  }

  if (byRuntime.size !== RUNTIMES.length) {
    errors.push(`expected exactly ${RUNTIMES.length} runtime contracts`);
  }

  const codex = byRuntime.get("codex");
  if (codex) {
    const codexHooks = readJson<{ hooks?: Record<string, unknown> }>(
      join(pluginRoot, "hooks", "codex-hooks.json"),
    );
    const mountedEvents = Object.keys(codexHooks.hooks ?? {}).sort();
    const contractMountedEvents = [...codex.mountedHookEvents].sort();
    if (JSON.stringify(mountedEvents) !== JSON.stringify(contractMountedEvents)) {
      errors.push("codex: mountedHookEvents must match hooks/codex-hooks.json");
    }
    for (const event of CODEX_UNMOUNTED_HOOK_EVENTS) {
      if (mountedEvents.includes(event)) {
        errors.push(`codex: ${event} must remain unmounted from Codex hook registry`);
      }
      if (!codex.unmountedHookEvents.includes(event)) {
        errors.push(`codex: ${event} must be listed in unmountedHookEvents`);
      }
    }
    if (codex.support !== "adapter-native" || codex.packageSurface !== "codex-plugin") {
      errors.push("codex: support must remain adapter-native with codex-plugin package surface");
    }
    if (codex.smokeEvidenceRefs.length === 0) {
      errors.push("codex: adapter-native support must list smokeEvidenceRefs");
    }
    const runtimeEvidence = readJson<{ unsupportedSurfaceRefs?: readonly string[] }>(
      join(pluginRoot, "contracts", "runtime-evidence", "codex.json"),
    );
    for (const ref of runtimeEvidence.unsupportedSurfaceRefs ?? []) {
      if (!codex.unsupportedSurfaceRefs.includes(ref)) {
        errors.push(`codex: missing unsupportedSurfaceRef from runtime evidence (${ref})`);
      }
    }
  }

  for (const runtime of ["claude", "gemini"] as const) {
    const contract = byRuntime.get(runtime);
    if (!contract) continue;
    if (contract.support !== "unsupported") {
      errors.push(`${runtime}: support must remain unsupported until native evidence exists`);
    }
    if (contract.packageSurface !== "absent") {
      errors.push(`${runtime}: packageSurface must remain absent`);
    }
    if (contract.smokeEvidenceRefs.length > 0) {
      errors.push(`${runtime}: unsupported runtime must not carry smokeEvidenceRefs`);
    }
    if (contract.runtimeGapRefs.length === 0 || contract.unsupportedSurfaceRefs.length === 0) {
      errors.push(`${runtime}: unsupported runtime must list runtimeGapRefs and unsupportedSurfaceRefs`);
    }
  }

  for (const absentSurface of [".claude-plugin", ".gemini-extension", "lib/gemini", "hooks/claude-hooks.json"]) {
    if (existsSync(join(pluginRoot, absentSurface))) {
      errors.push(`${absentSurface}: unsupported runtime package surface must remain absent`);
    }
  }

  return {
    status: errors.length === 0 ? "pass" : "fail",
    errors,
    contractCount: contracts.length,
  };
}

if (import.meta.main) {
  const result = verifyRuntimeAdapterContracts();
  if (result.status === "fail") {
    for (const error of result.errors) console.error(`[runtime-adapters] ${error}`);
    process.exit(1);
  }
  console.log("[runtime-adapters] OK: runtime adapter contracts are separated and evidence-bounded");
}
