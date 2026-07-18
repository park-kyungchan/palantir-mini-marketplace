// Neutral adapter capability source — shared types (ledger row A610,
// docs/architecture.md ADR-007: "Per-runtime bindings for Codex, Claude,
// and Gemini are generated from one neutral capability source — never
// hand-derived, hand-forked, or hand-maintained per runtime").
//
// This module defines the SHAPE of that one neutral source. It encodes
// only capability facts (what each runtime's official documentation
// confirms `supported`, `unsupported`, or `unknown`, per R210
// (`outputs/r210-runtime-capability-matrix.md`)) plus provider identity/
// availability/packaging/transport metadata. It never encodes a semantic
// decision — no `mutation-authority`, permission, reason code, or
// consumer-Ontology field appears anywhere below; that boundary is
// mechanically checked by `tests/adapters/shared/capability-registry.test.ts`
// ("no semantic-decision field leaks into the neutral source").
//
// Deliberately lives under `src/adapters/shared/`, not `src/control-plane/`
// or `src/semantic-core/`: `boundary:check` (ADR-002) exempts every file
// under `src/adapters/**` from the runtime-identity-literal scan, so this
// module — whose whole purpose is to name Codex/Claude/Gemini as literal
// DATA — is exempt by construction, the same way `src/control-plane/`'s
// `runtimeScope` field is exempt for the same reason (see
// `scripts/boundary-check.ts`'s `isControlPlaneFile`/`isAdapterFile`).
//
// `UNKNOWN-is-not-PASS`: `CapabilityVerdict` has exactly 3 values and
// `"unknown"` is never treated as `"supported"` anywhere a consumer reads
// this registry — carrying an R210 `unknown` cell forward as `"unknown"`
// here, verbatim, is the whole point of this module.

export const CAPABILITY_VERDICTS = ["supported", "unsupported", "unknown"] as const;
export type CapabilityVerdict = (typeof CAPABILITY_VERDICTS)[number];

export function isCapabilityVerdict(value: unknown): value is CapabilityVerdict {
  return typeof value === "string" && (CAPABILITY_VERDICTS as readonly string[]).includes(value);
}

// The 3 runtimes ADR-007 requires bindings for (A620 Codex, A630 Claude,
// A640 Gemini). Naming them here is data, not the runtime-identity-BRANCH
// ADR-002 forbids elsewhere — see module doc above.
export const RUNTIME_IDS = ["codex", "claude", "gemini"] as const;
export type RuntimeId = (typeof RUNTIME_IDS)[number];

export function isRuntimeId(value: unknown): value is RuntimeId {
  return typeof value === "string" && (RUNTIME_IDS as readonly string[]).includes(value);
}

// The 8 capability areas R210's matrix covers (execution-plan.md §6.2 /
// R210 "Capability Matrix (8 areas x 3 runtimes)"). Fixed set — adding a
// 9th area is a new R210-equivalent refresh task, not a registry edit.
export const CAPABILITY_AREAS = [
  "packagingManifest",
  "mcpRegistration",
  "hooks",
  "skillsCommands",
  "subagents",
  "reloadInstall",
  "schemaFlatLimits",
  "configSurfaces",
] as const;
export type CapabilityArea = (typeof CAPABILITY_AREAS)[number];

export function isCapabilityArea(value: unknown): value is CapabilityArea {
  return typeof value === "string" && (CAPABILITY_AREAS as readonly string[]).includes(value);
}

/**
 * One capability area's fact for one runtime. `verdicts` always carries at
 * least a `"primary"` key; R210 areas that split into named sub-facts
 * (e.g. Codex `skillsCommands` has a `skills` verdict distinct from a
 * `commands` verdict) carry those additional keys verbatim, matching
 * R210's own YAML field names with the `_verdict` suffix stripped.
 * `citation`/`url` point at the exact R210 row this fact was carried
 * forward from (never asserted from memory — AGENT-CONTRACT.md §6/§8,
 * ADR-007's "refresh-first" discipline). `facts` is packaging/transport/
 * provider metadata ONLY (paths, transports, event names, scopes) — never
 * a semantic decision.
 */
export interface CapabilityAreaFact {
  readonly verdicts: Readonly<Record<string, CapabilityVerdict>>;
  readonly citation: string;
  readonly url: string;
  readonly notes: string;
  readonly facts?: Readonly<Record<string, unknown>>;
}

function isWellFormedVerdictMap(value: unknown): value is Readonly<Record<string, CapabilityVerdict>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return false;
  if (!entries.some(([key]) => key === "primary" || key.length > 0)) return false;
  return entries.every(([, v]) => isCapabilityVerdict(v));
}

export function isWellFormedCapabilityAreaFact(value: unknown): value is CapabilityAreaFact {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!isWellFormedVerdictMap(v.verdicts)) return false;
  if (typeof v.citation !== "string" || v.citation.length === 0) return false;
  if (typeof v.url !== "string" || v.url.length === 0) return false;
  if (typeof v.notes !== "string" || v.notes.length === 0) return false;
  if (v.facts !== undefined && (v.facts === null || typeof v.facts !== "object" || Array.isArray(v.facts))) return false;
  return true;
}

/**
 * Provider identity/availability/packaging/transport metadata for one
 * runtime (ADR-007's second neutral-source category, distinct from the
 * per-area capability facts above). Never a semantic decision — this is
 * "how does a plugin reach this runtime," not "what is this plugin allowed
 * to do."
 */
export interface ProviderMetadata {
  readonly runtimeId: RuntimeId;
  readonly displayName: string;
  readonly manifestPath: string;
  readonly installRoot?: string;
  readonly transports: readonly string[];
  readonly configPaths: readonly string[];
  readonly availabilityNote?: string;
}

export function isWellFormedProviderMetadata(value: unknown): value is ProviderMetadata {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!isRuntimeId(v.runtimeId)) return false;
  if (typeof v.displayName !== "string" || v.displayName.length === 0) return false;
  if (typeof v.manifestPath !== "string" || v.manifestPath.length === 0) return false;
  if (v.installRoot !== undefined && typeof v.installRoot !== "string") return false;
  if (!Array.isArray(v.transports) || !v.transports.every((t) => typeof t === "string")) return false;
  if (!Array.isArray(v.configPaths) || !v.configPaths.every((c) => typeof c === "string")) return false;
  if (v.availabilityNote !== undefined && typeof v.availabilityNote !== "string") return false;
  return true;
}

/** One runtime's full neutral capability profile: provider metadata + one CapabilityAreaFact per CAPABILITY_AREAS entry, plus R210's per-runtime unsupported/unknown feature lists carried forward verbatim. */
export interface RuntimeCapabilityProfile {
  readonly runtimeId: RuntimeId;
  readonly provider: ProviderMetadata;
  readonly capabilities: Readonly<Record<CapabilityArea, CapabilityAreaFact>>;
  readonly unsupportedFeatures: readonly string[];
  readonly unknownFeatures: readonly string[];
}

export function isWellFormedRuntimeCapabilityProfile(value: unknown): value is RuntimeCapabilityProfile {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!isRuntimeId(v.runtimeId)) return false;
  if (!isWellFormedProviderMetadata(v.provider)) return false;
  if (v.capabilities === null || typeof v.capabilities !== "object" || Array.isArray(v.capabilities)) return false;
  const capabilities = v.capabilities as Record<string, unknown>;
  for (const area of CAPABILITY_AREAS) {
    if (!isWellFormedCapabilityAreaFact(capabilities[area])) return false;
  }
  if (!Array.isArray(v.unsupportedFeatures) || !v.unsupportedFeatures.every((f) => typeof f === "string")) return false;
  if (!Array.isArray(v.unknownFeatures) || !v.unknownFeatures.every((f) => typeof f === "string")) return false;
  return true;
}

/** Top-level neutral capability registry — the one source A620/A630/A640 generate their bindings from (ADR-007). */
export interface CapabilityRegistry {
  readonly schemaVersion: string;
  readonly sourceOfRecord: string;
  readonly sourceCitationNote: string;
  readonly profiles: Readonly<Record<RuntimeId, RuntimeCapabilityProfile>>;
}

export function isWellFormedCapabilityRegistry(value: unknown): value is CapabilityRegistry {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.schemaVersion !== "string" || v.schemaVersion.length === 0) return false;
  if (typeof v.sourceOfRecord !== "string" || v.sourceOfRecord.length === 0) return false;
  if (typeof v.sourceCitationNote !== "string" || v.sourceCitationNote.length === 0) return false;
  if (v.profiles === null || typeof v.profiles !== "object" || Array.isArray(v.profiles)) return false;
  const profiles = v.profiles as Record<string, unknown>;
  for (const runtime of RUNTIME_IDS) {
    if (!isWellFormedRuntimeCapabilityProfile(profiles[runtime])) return false;
  }
  return true;
}

// Fields that would smuggle a semantic decision into this neutral source
// (ADR-007: "it may NEVER encode semantic decisions — those stay in
// src/semantic-core, altitude1, altitude2, governance"). Checked by
// `tests/adapters/shared/capability-registry.test.ts` against the actual
// on-disk JSON text, not just this type's own field list — a type can be
// widened by mistake; the text scan cannot silently drift the same way.
export const FORBIDDEN_SEMANTIC_FIELD_TERMS = [
  "mutationAuthority",
  "mutation-authority",
  "reasonCode",
  "permissionDecision",
  "consumerOntology",
  "digitalTwinChange",
  "semanticIntent",
] as const;
