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
