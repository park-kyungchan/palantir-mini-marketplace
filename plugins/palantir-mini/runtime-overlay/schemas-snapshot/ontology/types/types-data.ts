/**
 * Ontology Types — DATA Domain Export Shapes
 *
 * Split from legacy types.ts v1.13.1 (D4, 2026-04-19). Entity-level shapes
 * for DATA ontology primitives (Property, ObjectType, geo/temporal/vector,
 * derived, struct, shared property type, value type, OntologyData barrel).
 *
 * Consumers MUST import from the parent barrel: `from "../types"`.
  * @owner palantirkc-ontology
 * @purpose DATA Domain Export Shapes
 */

import type { StructuralRule, BilingualDesc, ValueConstraint, OntologyPropertyType, BasePropertyType, DerivedMode, PropertyReducerStrategy } from "./types-core";

// =========================================================================
// DATA Domain Export Shapes
// =========================================================================

export interface Property {
  readonly apiName: string;
  readonly type: string;
  readonly baseType: BasePropertyType;
  readonly required: boolean;
  readonly readonly: boolean;
  readonly description: BilingualDesc;
  readonly constraints?: readonly ValueConstraint[];
  readonly valueType?: string;
  readonly targetEntity?: string;
  readonly isArray?: boolean;
  readonly defaultValue?: string;
  readonly indexCandidate?: boolean;
  /** Conflict resolution strategy for multi-datasource properties. Source: data/properties.md §Property Reducers */
  readonly reducerStrategy?: PropertyReducerStrategy;
}

export interface ValueType {
  readonly apiName: string;
  readonly baseType: BasePropertyType;
  readonly description: BilingualDesc;
  readonly constraints: readonly ValueConstraint[];
  readonly validatorFn: string;
}

export interface StructType {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly fields: readonly Property[];
}

export interface SharedPropertyType {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly properties: readonly Property[];
  readonly usedBy: readonly string[];
}

// === Special Type Sub-Arrays (aligned with schema.ts) ===

export interface GeoPointProperty {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly crs: "WGS84";
}

export interface GeoShapeProperty {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly geometryTypes: readonly ("Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon")[];
  readonly indexed: boolean;
}

export interface GeoTemporalProperty {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly timestampType: "timestamp";
  readonly includesAltitude?: boolean;
}

export interface TimeSeriesProperty {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly valueType: "number" | "string" | "boolean";
  readonly regularity: "regular" | "irregular";
  readonly partitioning?: string;
  readonly retentionDays?: number;
}

export interface AttachmentProperty {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly kind: "attachment" | "mediaReference";
  readonly mimeTypes: readonly string[];
  readonly maxSizeMB?: number;
}

export interface VectorProperty {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly dimensions: number;
  readonly similarity: "cosine" | "euclidean" | "dotProduct";
}

export interface CipherProperty {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly encryption: "aes256" | "rsa" | "applicationLevel";
}

// === Derived Properties ===

export interface DerivedProperty {
  readonly apiName: string;
  readonly entityApiName: string;
  readonly description: BilingualDesc;
  readonly mode: DerivedMode;
  readonly returnType: string;
  readonly sourceProperties: readonly string[];
  readonly computeFn: string;
}

// === Object Type (full sub-array model, aligned with schema.ts) ===

export interface ObjectType {
  readonly apiName: string;
  readonly displayName: string;
  readonly pluralName: string;
  readonly primaryKey: string;
  readonly titleKey: string;
  readonly description?: BilingualDesc;
  readonly properties: readonly Property[];
  readonly structs?: readonly string[];
  readonly geoProperties?: readonly (GeoPointProperty | GeoShapeProperty | GeoTemporalProperty)[];
  readonly timeSeriesProperties?: readonly TimeSeriesProperty[];
  readonly attachments?: readonly AttachmentProperty[];
  readonly vectors?: readonly VectorProperty[];
  readonly ciphers?: readonly CipherProperty[];
  readonly derivedProperties?: readonly DerivedProperty[];
  readonly implements?: readonly string[];
  readonly indexCandidates?: readonly string[];
  /** Number of backing datasources. >1 indicates a Multi-Datasource Object (MDO). Source: data/entities.md §Multi-Datasource Types */
  readonly datasourceCount?: number;
}

export interface OntologyData {
  readonly objectTypes: readonly ObjectType[];
  readonly valueTypes: readonly ValueType[];
  readonly structTypes: readonly StructType[];
  readonly sharedPropertyTypes: readonly SharedPropertyType[];
}

