// Public barrel for src/adapters/shared/ (ledger row A610,
// docs/architecture.md ADR-007). The one import path A620/A630/A640 use to
// read the neutral capability source — never a direct import of
// `capability-registry.json` (keeps the validated-load self-check in
// `registry-loader.ts` on every consumption path).

export {
  CAPABILITY_AREAS,
  CAPABILITY_VERDICTS,
  FORBIDDEN_SEMANTIC_FIELD_TERMS,
  RUNTIME_IDS,
  isCapabilityArea,
  isCapabilityVerdict,
  isRuntimeId,
  isWellFormedCapabilityAreaFact,
  isWellFormedCapabilityRegistry,
  isWellFormedProviderMetadata,
  isWellFormedRuntimeCapabilityProfile,
} from "./types";
export type {
  CapabilityArea,
  CapabilityAreaFact,
  CapabilityRegistry,
  CapabilityVerdict,
  ProviderMetadata,
  RuntimeCapabilityProfile,
  RuntimeId,
} from "./types";
export { CAPABILITY_REGISTRY } from "./registry-loader";
