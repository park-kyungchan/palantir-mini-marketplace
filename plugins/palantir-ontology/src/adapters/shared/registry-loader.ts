// Neutral adapter capability source — registry loader (ledger row A610,
// docs/architecture.md ADR-007). Reads the hand-authored
// `capability-registry.json` (the neutral source of record) directly via
// `resolveJsonModule`, the same pattern `src/semantic-core/reason-codes.ts`
// already uses for `contracts/reason-code-registry.json` — no duplicated
// data, no generated-index dependency for the runtime consumption path.
//
// This module is the ONE place `A620` (Codex), `A630` (Claude), and `A640`
// (Gemini) import the registry from — "A610's registry is the SOLE
// authority" (spawn-prompts/a610.md). No later row may hand-derive its own
// capability facts; every one imports `CAPABILITY_REGISTRY` from here (or
// its barrel re-export, `./index`).
//
// Belt-and-suspenders self-check, matching `src/control-plane/registry.ts`'s
// own precedent: throws at module load if the on-disk JSON does not
// structurally match `CapabilityRegistry` (see `types.ts`).

import registryJson from "./capability-registry.json";
import { isWellFormedCapabilityRegistry, type CapabilityRegistry } from "./types";

export const CAPABILITY_REGISTRY: CapabilityRegistry = registryJson as unknown as CapabilityRegistry;

if (!isWellFormedCapabilityRegistry(CAPABILITY_REGISTRY)) {
  throw new Error("registry-loader.ts: capability-registry.json does not structurally match CapabilityRegistry — see types.ts");
}
