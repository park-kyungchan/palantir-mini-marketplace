/**
 * Ontology Types — Core Infrastructure
 *
 * Split from legacy types.ts v1.13.1 (D4, 2026-04-19).
 * Contains: test infrastructure (TestResult, DomainGateResult), shared
 * primitive type unions and enums, structural rule & bilingual description
 * primitives, value constraints, propagation graph, semantic issue result,
 * and VALID_PK_TYPES / VALID_BASE_TYPES / SPECIAL_TYPES constants.
 *
 * Consumers MUST import from the parent barrel: `from "../types"`.
  * @owner palantirkc-ontology
 * @purpose Core Infrastructure
 */

import type { InteractionExports } from "../../interaction/types";
import type { RenderingExports } from "../../rendering/types";

// === Test Infrastructure ===
export type TestSeverity = "error" | "warn" | "info";

export interface TestResult {
  readonly id: string;
  readonly description: string;
  readonly severity: TestSeverity;
  readonly passed: boolean;
  readonly details?: string;
}

export interface DomainGateResult {
  readonly domain: OntologyDomain;
  readonly passed: boolean;
  readonly results: TestResult[];
  readonly errorCount: number;
  readonly warnCount: number;
  readonly timestamp: number;
}

/**
 * 4-value domain identifier used in test infrastructure (DomainGateResult).
 * Includes "security" because tests validate security schema independently.
 * Equivalent to DomainOrOverlay in semantics.ts — see TERMINOLOGY_CHARTER.
 * NOTE: This is a LOCAL NORMALIZATION. Official Palantir does not formalize
 * semantic domains. See semantics.ts file header for details.
 */
export type OntologyDomain = "data" | "logic" | "action" | "security";

// === Base Enums (aligned with schema.ts — lowercase for special types) ===
//
// BasePropertyType (19 members): Ontology-level property types declared on entities.
// Differs from OntologyPropertyType (24 members) which adds:
//   - `number` (alias for generic numeric), `enum` (handled via ValueConstraint)
//   - `optional`, `array` (type modifiers/wrappers)
//   - `GeoTemporal` (composite: array of timestamped coordinates)
// Casing: BasePropertyType uses lowercase for special types (geopoint, cipher, etc.);
// OntologyPropertyType uses PascalCase (GeoPoint, Cipher). Adapters normalize via map lookup.

/**
 * Full ontology-level property type union (24 members).
 * Extends BasePropertyType with aliases, modifiers, and composite types.
 * Adapters normalize between casing conventions via lookup maps.
 */
export type OntologyPropertyType =
  | BasePropertyType
  | "number"       // alias for generic numeric (maps to integer/long/float/double)
  | "enum"         // handled via ValueConstraint, not a storage type
  | "optional"     // type modifier/wrapper
  | "array"        // type modifier/wrapper
  | "GeoTemporal"; // composite: array of timestamped coordinates

/** All 24 OntologyPropertyType members as a constant array. */
export const ONTOLOGY_PROPERTY_TYPES: readonly OntologyPropertyType[] = [
  // BasePropertyType (19)
  "string", "integer", "long", "float", "double",
  "boolean", "date", "timestamp",
  "geopoint", "geoshape",
  "attachment", "mediaReference",
  "timeseries", "cipher",
  "struct", "vector", "marking",
  "FK", "BrandedType",
  // Extended types (5)
  "number", "enum", "optional", "array", "GeoTemporal",
] as const;

export type BasePropertyType =
  | "string" | "integer" | "long" | "float" | "double"
  | "boolean" | "date" | "timestamp"
  | "geopoint" | "geoshape"
  | "attachment" | "mediaReference"
  | "timeseries" | "cipher"
  | "struct" | "vector" | "marking"
  | "FK" | "BrandedType";

export type LinkCardinality = "1:1" | "M:1" | "1:M" | "M:N";

export type MutationType = "create" | "modify" | "delete" | "batch" | "custom";

export type QueryType =
  | "list" | "getById" | "filter" | "search"
  | "paginated" | "aggregation" | "searchAround";

export type FunctionCategory = "pureLogic" | "readHelper" | "computedField";

export type DerivedMode = "onRead" | "cached";

export type WebhookKind = "transactional" | "sideEffect";

export type AutomationKind = "cron" | "eventDriven";

/** Progressive autonomy level for AI-driven action execution. Source: ontology-ultimate-vision.md §6 */
export type AutonomyLevel =
  | "monitor"
  | "recommend"
  | "approve-then-act"
  | "act-then-inform"
  | "full-autonomy";

export type MarkingType = "mandatory" | "cbac";

/** 6 property reducer strategies for MDO conflict resolution. Source: data/properties.md §Property Reducers */
export type PropertyReducerStrategy = "firstNonNull" | "lastUpdated" | "min" | "max" | "sum" | "custom";

/** Ontology permission model — traditional roles vs project-based. Source: security/permissions.md §Project-Based (Jan 2026) */
export type PermissionModel = "ontologyRoles" | "projectBased";

/** Marking category visibility mode. Source: security/markings.md §Marking Management */
export type MarkingCategoryVisibility = "visible" | "hidden";

export type CrudOperation = "create" | "read" | "update" | "delete";

/** TypeScript function version — v2 is the recommended default since Jul 2025 GA. Source: logic/functions.md */
export type FunctionVersion = "v1" | "v2";

/** 7 condition types for Automate (1 time-based + 6 object set). Source: action/automation.md §7 Condition Types */
export type AutomationConditionType =
  | "timeBased"
  | "objectsAdded"
  | "objectsRemoved"
  | "objectsModified"
  | "runOnAll"
  | "metricChanged"
  | "thresholdCrossed";

/** 4 effect types when an automation condition fires. Source: action/automation.md §Effect Types */
export type AutomationEffectType = "action" | "notification" | "function" | "aipLogic";

/** 4-layer security model (OFFICIAL FACT). Source: palantir.com/docs/foundry/object-permissioning/object-security-policies */
export type SecurityLayerType = "rbac" | "cbac" | "rls_cls" | "cell_level";

/** 3 mandatory control types for row-level marking enforcement (OSv2 only). Source: security/markings.md §Three Mandatory Control Types */
export type MandatoryControlType = "markings" | "organizations" | "classifications";

/** CC adapter implementation status for platform features. Source: architecture/adapter-gap-analysis.md */
export type ImplementationStatus = "implemented" | "partial" | "declaration_only" | "not_applicable";

// === Structural Naming Rule (shared across all domains) ===

/**
 * Ontology naming convention rule — defines casing, regex patterns, and length constraints
 * for domain artifact names (entity apiNames, property names, link names, etc.).
 *
 * NOT the same as adapter StructuralRule (schemas/types.ts) which defines code generation
 * structure (outputFiles, imports, naming maps, boundaries). Both use the same name but serve
 * different purposes and are never imported together — TypeScript resolves via import path.
 *
 * Source: per-domain research files
 */
export interface StructuralRule {
  readonly target: string;
  readonly casing: string;
  readonly pattern: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly source: string;
}

// === Bilingual Description ===

export interface BilingualDesc {
  readonly ko: string;
  readonly en: string;
}

// === Value Constraints (discriminated union, aligned with schema.ts) ===

export type ValueConstraint =
  | { readonly kind: "regex"; readonly pattern: string; readonly message?: string }
  | { readonly kind: "range"; readonly min?: number; readonly max?: number; readonly message?: string }
  | { readonly kind: "enum"; readonly values: readonly string[]; readonly message?: string }
  | { readonly kind: "uuid"; readonly version?: 4 | 7; readonly message?: string }
  | { readonly kind: "arrayUnique"; readonly message?: string };


// =========================================================================
// Propagation Graph (L8)
// =========================================================================

export interface PropagationEdge {
  readonly trigger: { entityApiName: string; propertyApiName: string };
  readonly affected: { entityApiName: string; propertyApiName: string };
  readonly mechanism: "link" | "derived" | "interface" | "query";
}

export interface PropagationGraph {
  readonly edges: readonly PropagationEdge[];
  readonly orphanEntities: readonly string[];
  readonly cycles: readonly string[][];
}

// =========================================================================
// Semantic Validation Result (L7)
// =========================================================================

export interface SemanticIssue {
  readonly checkId: string;
  readonly entity: string;
  readonly field?: string;
  readonly expected: string;
  readonly actual: string;
  readonly severity: TestSeverity;
}

// =========================================================================
// Valid PK/Base Types
// =========================================================================

export const VALID_PK_TYPES: readonly BasePropertyType[] = [
  "string", "integer", "long", "BrandedType",
] as const;

export const VALID_BASE_TYPES: readonly BasePropertyType[] = [
  "string", "integer", "long", "float", "double",
  "boolean", "date", "timestamp",
  "geopoint", "geoshape",
  "attachment", "mediaReference",
  "timeseries", "cipher",
  "struct", "vector", "marking",
  "FK", "BrandedType",
] as const;

export const SPECIAL_TYPES: readonly BasePropertyType[] = [
  "geopoint", "geoshape",
  "timeseries", "attachment", "mediaReference",
  "vector", "cipher", "marking",
] as const;
