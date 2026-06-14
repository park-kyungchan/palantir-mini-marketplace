import type {
  RuntimeId,
  RuntimeSupportDeclaration,
} from "./workflow-family-enforcement";

export const RUNTIME_ADAPTER_CONTRACT_SCHEMA_VERSION =
  "palantir-mini/runtime-adapter-contract/v1" as const;

export const RUNTIME_ADAPTER_PROVIDER_IDENTITY_AUTHORITY =
  "metadata-only" as const;

export const RUNTIME_ADAPTER_PACKAGE_SURFACES = [
  "absent",
  "codex-plugin",
  "claude-plugin",
] as const;

export type RuntimeAdapterPackageSurface =
  (typeof RUNTIME_ADAPTER_PACKAGE_SURFACES)[number];

export interface RuntimeAdapterContract {
  readonly schemaVersion: typeof RUNTIME_ADAPTER_CONTRACT_SCHEMA_VERSION;
  readonly runtime: RuntimeId;
  readonly support: RuntimeSupportDeclaration;
  readonly providerIdentityAuthority: typeof RUNTIME_ADAPTER_PROVIDER_IDENTITY_AUTHORITY;
  readonly sourceAuthority: "plugins/palantir-mini";
  readonly packageSurface: RuntimeAdapterPackageSurface;
  readonly manifestRefs: readonly string[];
  readonly hookRegistryRefs: readonly string[];
  readonly adapterRefs: readonly string[];
  readonly mcpProfileRefs: readonly string[];
  readonly skillSurfaceRefs: readonly string[];
  readonly mountedHookEvents: readonly string[];
  readonly unmountedHookEvents: readonly string[];
  readonly unsupportedSurfaceRefs: readonly string[];
  readonly runtimeGapRefs: readonly string[];
  readonly fallbackObligations: readonly string[];
  readonly smokeEvidenceRefs: readonly string[];
  readonly reloadEvidenceRefs: readonly string[];
  readonly lastVerified: string;
  readonly unsupportedParityClaimsForbidden: true;
}
