/**
 * palantir-mini — PropertyType primitive (prim-data-03)
 *
 * 24 branded property types. These are value objects with no identity.
 * Branded for nominal type safety at zero runtime cost.
 *
 * PalantirFoundry-aligned set. Extend in v1 for domain-specific types.
  * @owner palantirkc-ontology
 * @purpose PropertyType primitive (prim-data-03)
 */

import type { PrimitiveSemantics, PrimitiveStatus, PrimitiveProvenance } from "./primitive-semantics";

export type PropertyTypeName =
  | "String"
  | "Integer"
  | "Long"
  | "Short"
  | "Byte"
  | "Double"
  | "Float"
  | "Decimal"
  | "Boolean"
  | "Date"
  | "Timestamp"
  | "Duration"
  | "Array"
  | "Struct"
  | "Marking"
  | "GeoPoint"
  | "GeoShape"
  | "Attachment"
  | "MediaReference"
  | "Cipher"
  | "Experimental"
  | "Vector"
  | "Enum"
  | "Json";

export interface PropertyTypeDeclaration {
  readonly name: PropertyTypeName;
  readonly description?: string;
  /** TS type literal used by codegen templates */
  readonly tsType: string;
}

export const PROPERTY_TYPES: Readonly<Record<PropertyTypeName, PropertyTypeDeclaration>> = Object.freeze({
  String:         { name: "String",         tsType: "string" },
  Integer:        { name: "Integer",        tsType: "number" },
  Long:           { name: "Long",           tsType: "bigint" },
  Short:          { name: "Short",          tsType: "number" },
  Byte:           { name: "Byte",           tsType: "number" },
  Double:         { name: "Double",         tsType: "number" },
  Float:          { name: "Float",          tsType: "number" },
  Decimal:        { name: "Decimal",        tsType: "string" }, // preserve precision
  Boolean:        { name: "Boolean",        tsType: "boolean" },
  Date:           { name: "Date",           tsType: "string" }, // ISO8601 date
  Timestamp:      { name: "Timestamp",      tsType: "string" }, // ISO8601 datetime
  Duration:       { name: "Duration",       tsType: "string" }, // ISO8601 duration
  Array:          { name: "Array",          tsType: "readonly unknown[]" },
  Struct:         { name: "Struct",         tsType: "Record<string, unknown>" },
  Marking:        { name: "Marking",        tsType: "string" },
  GeoPoint:       { name: "GeoPoint",       tsType: "{ lat: number; lon: number }" },
  GeoShape:       { name: "GeoShape",       tsType: "{ type: string; coordinates: unknown }" },
  Attachment:     { name: "Attachment",     tsType: "{ rid: string; mediaType: string }" },
  MediaReference: { name: "MediaReference", tsType: "{ rid: string }" },
  Cipher:         { name: "Cipher",         tsType: "{ algorithm: string; ciphertext: string }" },
  Experimental:   { name: "Experimental",   tsType: "unknown" },
  Vector:         { name: "Vector",         tsType: "readonly number[]" },
  Enum:           { name: "Enum",           tsType: "string" },
  Json:           { name: "Json",           tsType: "unknown" },
});

export const PROPERTY_TYPE_NAMES: readonly PropertyTypeName[] = Object.keys(PROPERTY_TYPES) as PropertyTypeName[];

/**
 * @stable — PropertyDeclaration primitive (prim-data-03b, W2 remediation)
 *
 * A single stored-fact Property registered onto an ObjectType (the 6th
 * candidate->registered elevation kind — see
 * lib/ontology-engineering-workflow/register-accepted.ts PropertyCandidate).
 * Until this remediation, Property elevation had NO typed declaration
 * primitive of its own (unlike ObjectType/LinkType/ActionType/Function/Role,
 * each of which already carries semantics?/status?/provenance? per W2 — see
 * primitive-semantics.ts). This closes that gap so Property elevation reaches
 * semantic parity with the other 5 kinds: PropertyCandidate.whyItMayMatter ->
 * semantics.whyItMayMatter; PropertyCandidate.evidenceRefs ->
 * semantics.evidenceRefs; status defaults "active" at registration
 * (primitiveStatusOrDefault()); provenance records the elevation audit trail
 * (candidateId/sicRef/promotedAt/byWhom).
 *
 * Optional + additive — a Property registered before this shape existed
 * simply omits `semantics`/`status`/`provenance`.
 */
export interface PropertyDeclaration {
  /** Stable field name (matches the owning ObjectType's `properties[].name`). */
  readonly name: string;
  /** plainName of the owner ObjectType this Property is a stored field of, if known. */
  readonly ownerObjectName?: string;
  /** Owner ObjectType rid, resolved at registration time via the combined name->rid map. */
  readonly ownerRid?: string;
  /** PropertyType (e.g. "String", "Integer") or a free-form value-type hint. */
  readonly dataType?: string;
  /** Column-level access-security principals permitted to READ this property. */
  readonly readableBy?: readonly string[];
  /**
   * Business-meaning payload preserved from the PropertyCandidate this
   * Property was elevated from (W2 parity closure).
   * PropertyCandidate.whyItMayMatter -> semantics.whyItMayMatter;
   * PropertyCandidate.evidenceRefs -> semantics.evidenceRefs.
   */
  readonly semantics?: PrimitiveSemantics;
  /** Foundry-equivalent lifecycle status. Absent = "active". */
  readonly status?: PrimitiveStatus;
  /** Audit record of the candidate->registered elevation. */
  readonly provenance?: PrimitiveProvenance;
}
