/**
 * DATA Domain Schema — Ontology Schema Redesign §4.1
 *
 * Self-sufficient schema for the DATA domain. Every LLM session reading this
 * file alone can correctly generate the DATA domain skeleton without SKILL.md.
 * Upstream truth still comes from the split research stack plus the schema-local
 * crosswalk in `../research-source-map.ts`.
 *
 * Authority:
 *   - builder/fact boundary: .claude/research/palantir-developers/BROWSE.md
 *     -> .claude/research/palantir-foundry/architecture/ontology-overview.md
 *   - exact pre-split DATA semantics: resolve legacy citations through
 *     ../research-source-map.ts to the archive bridge under
 *     .claude/research/_archive/2026-04-20-palantir-consolidation/data/
 * Dependency: ../semantics.ts (§4.0, DATA_SEMANTICS + SemanticHeuristic type)
 * Downstream: logic/schema.ts reads DATA shared types via ../types.ts
 *
 * Sections:
 *   1. Semantic Identity — re-export DATA_SEMANTICS
 *   2. Type Definitions — enhanced DATA types + new enums
 *   3. Enumeration Constants — all constant arrays
 *   4. Decision Heuristics — 12 implementation-choice heuristics (DH-DATA-*)
 *   5. Mapping Tables — wire format, filter ops, bucketing, embeddings
 *   6. Structural Rules — naming patterns, PK position, output file
 *   7. Validation Thresholds — numeric limits
 *   8. Hard Constraints — HC-DATA-06..40 (extends semantics HC-DATA-01..05)
 */

// =========================================================================
// Section 1: Semantic Identity
// =========================================================================

import {
  DATA_SEMANTICS,
  type SemanticHeuristic,
  type HardConstraint,
} from "../semantics";
import { VALID_BASE_TYPES } from "../types";
import type { BasePropertyType, PropertyReducerStrategy, StructuralRule } from "../types";

/** Schema version for DATA domain. */
export const SCHEMA_VERSION = "1.4.0" as const;

/** Re-export DATA_SEMANTICS so downstream consumers only import from data/schema. */
export { DATA_SEMANTICS };
export type { SemanticHeuristic, HardConstraint, PropertyReducerStrategy };

// =========================================================================
// Section 2: Type Definitions
// =========================================================================

// --- Re-exports from ../types.ts (shared infrastructure) ---

export type {
  BilingualDesc,
  ValueConstraint,
  TestSeverity,
  BasePropertyType,
  ObjectType,
  Property,
  ValueType,
  StructType,
  SharedPropertyType,
  GeoPointProperty,
  GeoShapeProperty,
  GeoTemporalProperty,
  TimeSeriesProperty,
  AttachmentProperty,
  VectorProperty,
  CipherProperty,
  OntologyData,
} from "../types";

export { VALID_PK_TYPES, VALID_BASE_TYPES, SPECIAL_TYPES } from "../types";

// --- New enum types ---

/** Object type lifecycle status. Source: entities.md §7 */
export type ResourceStatus = "ACTIVE" | "EXPERIMENTAL" | "DEPRECATED";

/** Valid primary key base types. Source: entities.md §2 */
export type ValidPKType = "string" | "integer" | "long" | "BrandedType";

/** Object Storage version. Source: entities.md §6 */
export type StorageVersion = "OSv1" | "OSv2";

/** GeoJSON geometry types for GeoShape. Source: geospatial.md §2 */
export type GeoGeometryType =
  | "Point"
  | "LineString"
  | "Polygon"
  | "MultiPoint"
  | "MultiLineString"
  | "MultiPolygon";

// --- DATA-domain enhanced types ---

/** ObjectType with lifecycle status and storage version. Source: entities.md §6-7 */
export interface DataObjectType {
  readonly apiName: string;
  readonly displayName: string;
  readonly pluralName: string;
  readonly primaryKey: string;
  readonly titleKey: string;
  readonly description?: { readonly ko: string; readonly en: string };
  readonly status: ResourceStatus;
  readonly storageVersion: StorageVersion;
}

/** Property with searchable/filterable flags. Source: properties.md §3 */
export interface DataProperty {
  readonly apiName: string;
  readonly type: string;
  readonly baseType: BasePropertyType;
  readonly required: boolean;
  readonly searchable: boolean;
  readonly filterable: boolean;
}

/** ValueType with wire format and branded pattern. Source: value-types.md §2-3 */
export interface DataValueType {
  readonly apiName: string;
  readonly baseType: BasePropertyType;
  readonly wireFormat: string;
  readonly brandedPattern: string;
}

/** CipherProperty with platform-managed flag. Source: cipher.md */
export interface DataCipherProperty {
  readonly apiName: string;
  readonly encryption: "aes256" | "rsa" | "applicationLevel";
  readonly platformManaged: true;
}

/** Branded type definition. Source: value-types.md */
export interface BrandedTypeDefinition {
  readonly name: string;
  readonly baseType: "string" | "number";
  readonly brand: string;
  readonly palantirType: string;
  readonly wireFormat: string;
}

/** Embedding model definition. Source: vectors.md */
export interface EmbeddingModelDefinition {
  readonly dimensions: number;
  readonly tokenLimit: number;
  readonly useCase: string;
}

export type { StructuralRule } from "../types";

// --- OSDK support level ---

/** OSDK language support level for a property type. Source: cross-referenced from all data/*.md research files */
export type OsdkSupportLevel = "full" | "partial" | "unsupported";

/** Per-type OSDK language support entry. Source: cipher.md, vectors.md, timeseries.md, structs.md, attachments.md */
export interface OsdkTypeSupport {
  readonly type: string;
  readonly typescript: OsdkSupportLevel;
  readonly python: OsdkSupportLevel;
  readonly java: OsdkSupportLevel;
  readonly workaround?: string;
}

// --- Platform extended types ---

/**
 * Platform base types that exist in Palantir but are NOT in our core 19 BasePropertyType.
 * These map to existing Convex primitives (string/number) with no semantic distinction at our stack level.
 * Source: properties.md §2 — Base Property Types table
 */
export interface PlatformExtendedType {
  readonly name: string;
  readonly wireFormat: string;
  readonly tsMapping: string;
  readonly reason: string;
}

// --- Object Storage version comparison ---

/** Object Storage version feature comparison. Source: entities.md §6 */
export interface OsvFeatureEntry {
  readonly feature: string;
  readonly osv1: string;
  readonly osv2: string;
}

// =========================================================================
// Section 3: Enumeration Constants
// =========================================================================

/** All 19 base property types. Alias for VALID_BASE_TYPES. Source: properties.md */
export const BASE_PROPERTY_TYPES = VALID_BASE_TYPES;

/** The 6 OSDK branded types. Source: value-types.md */
export const BRANDED_TYPES: readonly BrandedTypeDefinition[] = [
  {
    name: "DateISOString",
    baseType: "string",
    brand: "__dateBrand",
    palantirType: "LocalDate",
    wireFormat: "ISO 8601 date string",
  },
  {
    name: "TimestampISOString",
    baseType: "string",
    brand: "__timestampBrand",
    palantirType: "Timestamp",
    wireFormat: "ISO 8601 datetime string",
  },
  {
    name: "Integer",
    baseType: "number",
    brand: "__integerBrand",
    palantirType: "32-bit signed integer",
    wireFormat: "JSON number",
  },
  {
    name: "Long",
    baseType: "string",
    brand: "__longBrand",
    palantirType: "64-bit signed integer",
    wireFormat: "string-encoded number",
  },
  {
    name: "Float",
    baseType: "number",
    brand: "__floatBrand",
    palantirType: "32-bit IEEE 754",
    wireFormat: "JSON number",
  },
  {
    name: "Double",
    baseType: "number",
    brand: "__doubleBrand",
    palantirType: "64-bit IEEE 754",
    wireFormat: "JSON number",
  },
] as const;

/** Object type lifecycle statuses. Source: entities.md §7 */
export const RESOURCE_STATUSES: readonly ResourceStatus[] = [
  "ACTIVE",
  "EXPERIMENTAL",
  "DEPRECATED",
] as const;

/** GeoJSON geometry types. Source: geospatial.md §2 */
export const GEO_GEOMETRY_TYPES: readonly GeoGeometryType[] = [
  "Point",
  "LineString",
  "Polygon",
  "MultiPoint",
  "MultiLineString",
  "MultiPolygon",
] as const;

/** String filter operations. Source: properties.md §4 */
export const STRING_FILTER_OPS: readonly string[] = [
  "exactMatch",
  "phrase",
  "phrasePrefix",
  "prefixOnLastToken",
  "matchAnyToken",
  "matchAllTokens",
  "fuzzyMatchAnyToken",
  "fuzzyMatchAllTokens",
] as const;

/** Numeric/range filter operations (integer, long, float, double, date, timestamp). Source: properties.md §4 */
export const NUMERIC_FILTER_OPS: readonly string[] = [
  "lt",
  "lte",
  "gt",
  "gte",
] as const;

/** Boolean filter operations. Source: properties.md §4 */
export const BOOLEAN_FILTER_OPS: readonly string[] = [
  "isTrue",
  "isFalse",
] as const;

/** GeoPoint filter operations. Source: geospatial.md §1 */
export const GEO_POINT_FILTER_OPS: readonly string[] = [
  "withinDistanceOf",
  "withinPolygon",
  "withinBoundingBox",
] as const;

/** GeoShape filter operations. Source: geospatial.md §2 (canonical: 6 methods) */
export const GEO_SHAPE_FILTER_OPS: readonly string[] = [
  "withinBoundingBox",
  "intersectsBoundingBox",
  "doesNotIntersectBoundingBox",
  "withinPolygon",
  "intersectsPolygon",
  "doesNotIntersectPolygon",
] as const;

/** Array filter operations. Source: properties.md §4 */
export const ARRAY_FILTER_OPS: readonly string[] = [
  "contains",
] as const;

/** Aggregation metric methods. Source: properties.md §5 */
export const AGGREGATION_METRICS: readonly string[] = [
  "count",
  "average",
  "sum",
  "max",
  "min",
  "cardinality",
] as const;

/** Date bucketing methods. Source: properties.md §5 */
export const DATE_BUCKETING_METHODS: readonly string[] = [
  "byYear",
  "byQuarter",
  "byMonth",
  "byWeek",
  "byDays",
] as const;

/** Timestamp bucketing methods (superset of date). Source: properties.md §5, timeseries.md */
export const TIMESTAMP_BUCKETING_METHODS: readonly string[] = [
  "byYear",
  "byQuarter",
  "byMonth",
  "byWeek",
  "byDays",
  "byHours",
  "byMinutes",
  "bySeconds",
] as const;

/** Value constraint discriminator kinds. Aligned with types.ts. */
export const VALUE_CONSTRAINT_KINDS: readonly string[] = [
  "regex",
  "range",
  "enum",
  "uuid",
  "arrayUnique",
] as const;

/**
 * Platform base types that exist in Palantir but are excluded from our core 19 BasePropertyType.
 * They map to existing Convex primitives with no semantic distinction at our stack level.
 * Source: properties.md §2 — Base Property Types table (byte, decimal, short rows)
 */
export const PLATFORM_EXTENDED_BASE_TYPES: readonly PlatformExtendedType[] = [
  {
    name: "byte",
    wireFormat: "string",
    tsMapping: "string",
    reason: "Base64-encoded byte array. Maps to string in Convex — no separate type needed. Used for binary data fields in Java-originated Ontologies.",
  },
  {
    name: "decimal",
    wireFormat: "string",
    tsMapping: "string",
    reason: "Arbitrary-precision decimal, string-encoded to avoid floating-point loss. Maps to string in Convex — precision-sensitive applications parse client-side. Common in financial/accounting Ontologies.",
  },
  {
    name: "short",
    wireFormat: "number",
    tsMapping: "number",
    reason: "16-bit signed integer (-32768 to 32767). Maps to number in Convex — JavaScript makes no distinction from integer. Rare in modern Ontologies, legacy Java interop.",
  },
] as const;

/**
 * Platform-native derived property aggregation methods (Beta, 2026).
 * These are available via Ontology Manager derived property configuration, distinct from
 * in-function aggregation metrics (AGGREGATION_METRICS) which are the v1/v2 function API.
 * Source: Palantir docs — derived-properties (2026 Beta)
 */
export const DERIVED_PROPERTY_AGGREGATIONS: readonly string[] = [
  "count",
  "average",
  "sum",
  "minimum",
  "maximum",
  "approximateCardinality",
  "exactCardinality",
  "collectList",
  "collectSet",
] as const;

/** Universal filter operation available on ALL property types. Source: properties.md §3 */
export const UNIVERSAL_FILTER_OPS: readonly string[] = [
  "hasProperty",
] as const;

/**
 * OSDK 2.0 declarative where-clause filter operators.
 * Replaces the builder pattern (.filter().range().lt()) with JSON syntax ({ capacity: { $gt: 200 } }).
 * Source: properties.md §4 — OSDK 2.0 Filter Syntax
 */
export const OSDK_FILTER_OPERATORS: readonly string[] = [
  "$eq",
  "$neq",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$startsWith",
  "$containsAllTerms",
  "$containsAnyTerm",
  "$isNull",
  "$or",
  "$and",
  "$not",
] as const;

/**
 * Time series stream aggregation methods (server-side, via REST API streamPoints).
 * Source: timeseries.md §REST API — Stream Aggregation Methods
 */
export const TIMESERIES_STREAM_AGGREGATION_METHODS: readonly string[] = [
  "SUM",
  "MEAN",
  "MIN",
  "MAX",
  "COUNT",
  "STANDARD_DEVIATION",
  "PERCENT_CHANGE",
  "DIFFERENCE",
  "PRODUCT",
  "FIRST",
  "LAST",
] as const;

/**
 * Time series stream aggregation strategies.
 * Source: timeseries.md §REST API — Aggregation strategies
 */
export const TIMESERIES_STREAM_STRATEGIES: readonly string[] = [
  "CUMULATIVE",
  "ROLLING",
  "PERIODIC",
] as const;

/** Time series stream response formats. Source: timeseries.md §REST API */
export const TIMESERIES_RESPONSE_FORMATS: readonly string[] = [
  "JSON",
  "ARROW",
] as const;

/**
 * 6 property reducer strategies for MDO (Multi-Datasource Object) conflict resolution.
 * When the same property has different values from different datasources, the reducer
 * determines which value becomes canonical. Evaluated at INDEX TIME, not query time.
 * Source: data/properties.md §Property Reducers
 */
export const PROPERTY_REDUCER_STRATEGIES: readonly PropertyReducerStrategy[] = [
  "firstNonNull",
  "lastUpdated",
  "min",
  "max",
  "sum",
  "custom",
] as const;

// =========================================================================
// Section 4: Decision Heuristics
// =========================================================================

/**
 * DATA domain implementation-choice heuristics (DH-DATA-*).
 * Each absorbs prose heuristics from one or more SKILL.md files.
 * Uses SemanticHeuristic type from semantics.ts for structural consistency.
 */
export const DATA_HEURISTICS: readonly SemanticHeuristic[] = [
  {
    id: "DH-DATA-01",
    question: "Should this composite data be a Struct, a separate Entity, or a SharedPropertyType?",
    options: [
      {
        condition: "Data is owned by and inseparable from the parent object, no independent lifecycle, no need for direct queries or links",
        choice: "StructType",
        reasoning: "Structs embed composite data within a single property. They inherit parent permissions, cannot be queried independently, and are NON_FILTERABLE. Use when the data has no meaning outside the parent.",
      },
      {
        condition: "Data has an independent lifecycle, needs its own queries, links, or separate permissions",
        choice: "Separate Entity (ObjectType)",
        reasoning: "Entities are first-class objects in the Ontology with their own PK, queries, links, and security policies. Use when the data can exist or be referenced independently.",
      },
      {
        condition: "Same property definition (name + type) appears on 3+ object types, and all need consistent metadata",
        choice: "SharedPropertyType",
        reasoning: "Shared properties centralize metadata (display name, description, base type) in one location. They share definitions, not data. Use for cross-type consistency without polymorphism.",
      },
    ],
    source: ".claude/research/palantir/data/structs.md, shared-properties.md",
    realWorldExample: "Address {street, city, zip} owned by a Customer → StructType, because an address has no independent lifecycle, cannot be queried separately, and is meaningless without the parent Customer. A Product that multiple Orders reference → separate Entity with Link, because Products exist independently (they have their own PK, need independent queries, and multiple Orders can reference the same Product via M:N links). createdAt timestamp appearing on Customer, Order, Invoice, Shipment, and Payment entities → SharedPropertyType, centralizing the display name, description, and base type in one location for consistency across all 5+ entity types. COUNTER-EXAMPLE: Modeling a customer's address as a separate Entity when it's always 1:1 with the Customer, has no independent queries, and never appears outside that Customer context — this creates unnecessary entity overhead and link management for data that naturally belongs as a Struct within the parent.",
  },
  {
    id: "DH-DATA-02",
    question: "Should this data be a Property on an existing entity or a separate Entity?",
    options: [
      {
        condition: "Value is a simple scalar, composite, or array that belongs to the parent and has no independent lifecycle",
        choice: "Property (or StructType property)",
        reasoning: "Properties attach to entities as named, typed fields. They inherit the entity's security and lifecycle. If the data is a sub-object, use a struct property.",
      },
      {
        condition: "Value has an independent lifecycle, needs own queries, links, or will be referenced by multiple entities",
        choice: "Separate Entity with Link",
        reasoning: "Create a new ObjectType with its own PK and link it. This enables independent querying, separate permissions, and M:N relationships if needed.",
      },
    ],
    source: ".claude/research/palantir/data/entities.md",
    realWorldExample: "An employee's email address (workEmail: string) → Property on the Employee entity, because it's a simple scalar that belongs to and is inseparable from the employee record, with no independent lifecycle or need for separate queries. An employee's department → separate Department entity linked to Employee via M:1 link, because departments have their own attributes (budget, head count, location, department head), need independent queries ('list all departments with budget > $1M'), and multiple employees reference the same department. The Department exists whether or not any employees are assigned to it. COUNTER-EXAMPLE: Creating a separate 'EmployeeEmail' entity with its own PK linked to Employee when the email is a simple scalar with no independent lifecycle — this introduces unnecessary entity management, link traversal overhead, and permission complexity for what should be a single property on the Employee type.",
  },
  {
    id: "DH-DATA-03",
    question: "For an M:N relationship: join table or object-backed link (join entity)?",
    options: [
      {
        condition: "The relationship has no attributes — it's a pure many-to-many association",
        choice: "Join table (M:N link with joinEntity pointing to a thin join object type)",
        reasoning: "A thin join entity with only two FK properties is sufficient. The join entity exists solely to back the M:N link without carrying domain data.",
      },
      {
        condition: "The relationship has its own attributes (date, quantity, role, status) that describe the association itself",
        choice: "Join entity with domain properties (object-backed link)",
        reasoning: "When the relationship has data, the join entity becomes a first-class entity with its own properties beyond the two FKs. It gets list-table + detail views but NOT form-create/form-edit.",
      },
    ],
    source: ".claude/research/palantir/data/entities.md, links.md",
    realWorldExample: "Student↔Course with no relationship attributes (just 'this student takes this course') → thin join table with only studentId and courseId FK properties. The join entity exists solely to back the M:N link and carries no domain data of its own. Enrollment with grade (A/B/C/D/F), enrolledDate (2026-01-15), status (active/withdrawn/completed), and creditHours (3) → join entity with domain properties, because the enrollment itself has meaningful attributes that describe the relationship. The Enrollment entity gets list-table and detail views but NOT form-create/form-edit, since enrollments are created and managed through Actions. COUNTER-EXAMPLE: Creating a full domain entity with form views for a pure association like 'Tag↔Article' where the relationship carries no attributes — a thin join table is sufficient and avoids the overhead of entity lifecycle management, form rendering, and permission configuration for what is just a linking mechanism.",
  },
  {
    id: "DH-DATA-04",
    question: "GeoPoint, GeoShape, or GeoTemporal?",
    options: [
      {
        condition: "A single geographic coordinate (latitude/longitude) representing a fixed location",
        choice: "GeoPoint",
        reasoning: "GeoPoint stores one WGS84 coordinate. Supports withinDistanceOf, withinPolygon, withinBoundingBox filters. Use for stores, sensors, airports — anything with a single fixed position.",
      },
      {
        condition: "A complex geometry (polygon boundary, line route, multi-geometry) that defines a geographic shape",
        choice: "GeoShape",
        reasoning: "GeoShape stores GeoJSON geometries (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon). Supports within/intersects/doesNotIntersect for both bbox and polygon. Circles are NOT indexed for search.",
      },
      {
        condition: "Time-stamped coordinates tracking movement or trajectory over time",
        choice: "GeoTemporalProperty",
        reasoning: "GeoTemporal stores arrays of timestamped coordinates. Use for fleet tracking, delivery routes, or any entity whose position changes over time.",
      },
    ],
    source: ".claude/research/palantir/data/geospatial.md",
    realWorldExample: "Warehouse location at GPS coordinates (40.7128°N, 74.0060°W) → GeoPoint, because it represents a single fixed coordinate in WGS84 CRS. Supports spatial filters: withinDistanceOf(5km), withinPolygon(deliveryZone), withinBoundingBox(northeast, southwest). City boundary polygon defining the administrative limits of Chicago → GeoShape, using GeoJSON MultiPolygon geometry (bare RFC 7946 format). Supports within/intersects/doesNotIntersect filters for bbox and polygon queries. Note: circles are NOT indexed for GeoShape search. Delivery truck route history showing timestamped positions over a 12-hour shift → GeoTemporalProperty, storing arrays of {latitude, longitude, timestamp, altitude?} records at 30-second intervals to track movement and calculate dwell time. COUNTER-EXAMPLE: Using GeoShape for a store location that is a single point — GeoPoint is simpler, has better filter support, and avoids the overhead of GeoJSON geometry parsing for a single coordinate.",
  },
  {
    id: "DH-DATA-05",
    question: "Keep time series properties on the entity or extract to a separate sensor entity?",
    options: [
      {
        condition: "Entity has ≤5 time series properties",
        choice: "Keep on parent entity",
        reasoning: "A small number of time series properties on the entity keeps the model simple. Each property references its own series store. The entity remains the primary query target.",
      },
      {
        condition: "Entity has >5 time series properties (sensor-heavy)",
        choice: "Extract to a separate sensor entity linked to the parent",
        reasoning: "When an entity has many time series, extract a SensorReading or similar entity with a link back to the parent. This keeps the parent entity clean and enables sensor-specific queries.",
      },
    ],
    source: ".claude/research/palantir/data/timeseries.md",
    realWorldExample: "A CNC machine with 3 time series properties — temperature (°C, regular interval, 1-minute), pressure (PSI, regular interval, 1-minute), and vibration (mm/s, regular interval, 5-second) — keeps all series on the Machine entity because ≤5 series is manageable without cluttering the entity schema. Each property references its own series store with configured regularity and optional retention policies. An IoT gateway device with 15+ sensor channels (temperature, humidity, CO2, particulates PM2.5/PM10, noise level, light intensity, air pressure, wind speed, wind direction, rainfall, UV index, soil moisture, soil temperature, leaf wetness, battery voltage) → extract a SensorReading entity linked to the parent Device via 1:M link. This keeps the Device entity clean and enables sensor-specific queries, aggregations, and retention policies. COUNTER-EXAMPLE: Keeping 20+ time series on a single entity creates a bloated schema that is difficult to maintain, slow to load (all series metadata loads with the entity), and impossible to set per-sensor retention policies.",
  },
  {
    id: "DH-DATA-06",
    question: "Attachment property or MediaReference property?",
    options: [
      {
        condition: "General file association (PDFs, CSVs, documents) with basic upload/download needs",
        choice: "Attachment",
        reasoning: "Attachment is the standard file type — available across all OSDK languages (TS, Python, Java). Uses upload-then-associate pattern. Attachments inherit parent object security.",
      },
      {
        condition: "Media-centric workflow (image galleries, video libraries) requiring rich metadata and media-specific operations",
        choice: "MediaReference",
        reasoning: "MediaReference connects to Palantir's media set system with richer metadata (dimensions, duration, format). Available in OSDK 2.0+ TypeScript only. Use when media management is a core concern.",
      },
    ],
    source: ".claude/research/palantir/data/attachments.md",
    realWorldExample: "Invoice PDF attached to a PurchaseOrder entity → Attachment type, because it's a general file association following the upload-then-associate pattern. Attachments are available across all OSDK languages (TypeScript, Python, Java), inherit parent object security policies, and support basic upload/download operations with MIME type validation. Product image gallery on a Listing entity with rich metadata requirements (image dimensions, aspect ratio, thumbnail generation, ordering) → MediaReference type, connecting to Palantir's media set system for media-specific operations. MediaReference is available in OSDK 2.0+ TypeScript only. The key distinction: Attachment is for files-as-data, MediaReference is for media-as-content. COUNTER-EXAMPLE: Using MediaReference for a simple CSV data export file on a Report entity — this is a general file attachment with no media-specific metadata needs, and MediaReference limits OSDK language support to TypeScript only, preventing Python or Java consumers from accessing the file.",
  },
  {
    id: "DH-DATA-07",
    question: "Value Type (branded semantic wrapper) or enum constraint?",
    options: [
      {
        condition: "Need type safety and consistent semantics across multiple properties (e.g., 'all email fields validate the same way')",
        choice: "ValueType",
        reasoning: "Value types are semantic wrappers with constraints that auto-propagate via versioning. They add compile-time type safety (branded types prevent mixing structurally identical values). Changes propagate to all consumers automatically.",
      },
      {
        condition: "Simple list of allowed values on a single property with no cross-property reuse needed",
        choice: "Enum constraint (ValueConstraint kind='enum')",
        reasoning: "An enum constraint is a per-property validation rule. It's simpler and requires no platform-level value type management. Use when the allowed values are specific to one property.",
      },
    ],
    source: ".claude/research/palantir/data/value-types.md",
    realWorldExample: "Email address format used across Customer.email, Employee.workEmail, Vendor.contactEmail, and ContactPerson.primaryEmail → ValueType with regex constraint (RFC 5322 pattern) and branded type safety. All 4 properties auto-propagate when the ValueType's validation rule is updated — a single change to the regex fixes all consumers. Changes are versioned, so downstream consumers update on their next schema sync. Order status 'pending'|'shipped'|'delivered' on a single OrderLineItem entity → enum constraint (ValueConstraint kind='enum'), because the allowed values are specific to this one property with no cross-property reuse needed. A simple per-property validation rule is sufficient. COUNTER-EXAMPLE: Creating a ValueType for a status enum used on only one entity (e.g., OrderLineItemStatus with values ['pending','shipped','delivered']) adds platform-level value type management overhead (versioning, propagation, branded type generation) for a simple enum that will never be reused on another entity type.",
  },
  {
    id: "DH-DATA-08",
    question: "Should this property be searchable?",
    options: [
      {
        condition: "Property needs to support filter, orderBy, or aggregation operations in queries",
        choice: "searchable: true",
        reasoning: "The searchable hint indexes the property for full-text search, enabling .filter(), .orderBy(), and aggregation bucketing. Required for any property used in Object Set operations.",
      },
      {
        condition: "Property is display-only, used in UIs but never in programmatic queries or aggregations",
        choice: "searchable: false",
        reasoning: "Not indexing saves storage and indexing overhead. Use for properties that are loaded with the object but never used as filter criteria or sort keys.",
      },
    ],
    source: ".claude/research/palantir/data/properties.md",
    realWorldExample: "Customer.name needs searchable: true because the UI requires full-text search (phrasePrefix for autocomplete), filter (exactMatch for dedup), and orderBy (alphabetical listing). The searchable hint indexes the property, enabling .filter(), .orderBy(), and aggregation bucketing in Object Set operations. Customer.internalNotes (a free-text field containing internal comments about the customer) sets searchable: false because it is display-only — shown on the detail view but never used as a filter criterion, sort key, or aggregation dimension. Not indexing saves storage and indexing overhead proportional to the field's text volume. COUNTER-EXAMPLE: Setting searchable: true on every property 'just in case' wastes index storage and slows write operations, since every indexed property adds overhead to the indexing pipeline. Only index properties that are actually used in programmatic queries, filters, sorts, or aggregations — review usage patterns before enabling.",
  },
  {
    id: "DH-DATA-09",
    question: "Should this property be required or optional?",
    options: [
      {
        condition: "Property must always have a non-null value for the entity to be valid (PK, core identity fields)",
        choice: "required: true (OSv2 only)",
        reasoning: "Required properties are enforced at index time and action apply time. Adding required to an existing property is a BREAKING CHANGE if any null values exist. Required arrays must have ≥1 item.",
      },
      {
        condition: "Property may legitimately be null (optional metadata, enrichment fields, multi-datasource scenarios)",
        choice: "required: false",
        reasoning: "Optional properties accept null. In multi-datasource types, a record may exist in datasource A but not in datasource B — the required constraint only triggers when the record appears in the owning datasource.",
      },
    ],
    source: ".claude/research/palantir/data/properties.md, entities.md",
    realWorldExample: "Employee.employeeId (PK, string) → required: true, because the primary key must always have a non-null value for object identity. Employee.startDate → required: true, because the start date is always known at creation time and is used in tenure calculations and HR reporting. Required arrays like Employee.certifications → must have at least 1 item (empty array = invalid in OSv2). Employee.middleName → required: false (optional), because many employees don't have middle names, and forcing a value would require placeholder data. Important: adding required to an EXISTING property is a BREAKING CHANGE if any null values exist in the dataset — the indexer will reject those records. COUNTER-EXAMPLE: Making Employee.linkedInUrl required when many employees don't have LinkedIn accounts — this forces either placeholder URLs (bad data quality) or blocks record creation for employees without LinkedIn, when the field is genuinely optional metadata.",
  },
  {
    id: "DH-DATA-10",
    question: "Which embedding model for vector properties?",
    options: [
      {
        condition: "General-purpose English text, short inputs (≤512 tokens), symmetric similarity",
        choice: "all-MiniLM-L6-v2 (384 dimensions)",
        reasoning: "Smallest model, fastest inference. Good for document-to-document similarity and short text. 384 dimensions keeps storage and query costs low.",
      },
      {
        condition: "Query-passage asymmetric search (short query → long passage retrieval)",
        choice: "MS MARCO (768 dimensions)",
        reasoning: "Optimized for asymmetric embedding where queries and passages differ in length/nature. Best for search-style workflows with English content.",
      },
      {
        condition: "Long text (up to 8191 tokens) or multilingual content",
        choice: "text-embedding-ada-002 (1536 dimensions)",
        reasoning: "OpenAI Ada handles long documents and non-English languages. 1536 dimensions within Palantir's 2048 limit. Strongest option for multilingual workloads.",
      },
      {
        condition: "Domain-specific model (fine-tuned, custom architecture) with known dimensions",
        choice: "Custom (ensure dimensions ≤ 2048)",
        reasoning: "Custom models require dimension verification against the platform's 2048 max. Query vectors must match indexed dimensions exactly.",
      },
    ],
    source: ".claude/research/palantir/data/vectors.md",
    realWorldExample: "Internal FAQ search where users type short English questions ('how do I reset my password?') and expect to find matching FAQ articles → MS MARCO (768 dimensions) optimized for asymmetric query-to-passage retrieval. Multilingual document corpus containing English, Korean, Japanese, and German technical documentation requiring cross-language similarity search → text-embedding-ada-002 (1536 dimensions) which handles non-English languages and long documents up to 8191 tokens. A specialized medical research platform using BioBERT fine-tuned embeddings for clinical trial matching → Custom model at 768 dimensions (verified ≤2048 platform limit). Query vectors must match the indexed 768 dimensions exactly — dimension mismatch causes API error. COUNTER-EXAMPLE: Using text-embedding-ada-002 (1536 dims) for a simple English FAQ with 200-word articles — all-MiniLM-L6-v2 (384 dims) would be faster, cheaper, and equally effective for short symmetric English text. The larger model wastes storage and query compute without improving relevance.",
  },
  {
    id: "DH-DATA-11",
    question: "Which property reducer strategy for conflicting multi-datasource values?",
    options: [
      {
        condition: "Multiple datasources may have null values — use the first non-null value found across sources",
        choice: "firstNonNull",
        reasoning: "Takes the first non-null value in datasource priority order. Best when one source is authoritative but may have gaps filled by fallback sources.",
      },
      {
        condition: "Values change over time across datasources — the most recently updated value should win",
        choice: "lastUpdated",
        reasoning: "Uses the most recently modified value across datasources. Best when temporal freshness determines correctness (e.g., address changes, status updates).",
      },
      {
        condition: "Numeric property where the lowest value across datasources is the correct canonical value",
        choice: "min",
        reasoning: "Selects the minimum value. Use for conservative estimates, floor prices, or earliest dates.",
      },
      {
        condition: "Numeric property where the highest value across datasources is the correct canonical value",
        choice: "max",
        reasoning: "Selects the maximum value. Use for peak measurements, ceiling prices, or latest dates.",
      },
      {
        condition: "Numeric property where the total across datasources represents the true value",
        choice: "sum",
        reasoning: "Sums values across datasources. Use for aggregate quantities like total inventory from multiple warehouses.",
      },
      {
        condition: "Business logic requires domain-specific merge rules that don't fit standard strategies",
        choice: "custom",
        reasoning: "Custom expressions allow arbitrary merge logic. Use sparingly — adds complexity and makes the reducer opaque to tooling.",
      },
    ],
    source: ".claude/research/palantir/data/properties.md §Property Reducers",
    realWorldExample: "Employee.phoneNumber from HR System (authoritative but may be stale) and Employee Directory (user-updated) → lastUpdated, because the most recently changed value is most likely correct. Inventory.stockCount from Warehouse A (500 units) and Warehouse B (300 units) → sum (800 total), because total stock is the sum across locations. Asset.purchasePrice from ProcurementDB ($45,000) and AuditDB ($47,500, includes fees) → min ($45,000), because the procurement system holds the base price without fees. Employee.department from HRCore (may lag) and ActiveDirectory (auto-synced hourly) → firstNonNull, because HRCore is the primary source and AD fills gaps. COUNTER-EXAMPLE: Using 'sum' for Employee.salary when two HR systems each record the same salary independently — this wastes correctness by doubling the salary value. Use firstNonNull or lastUpdated instead.",
  },
  {
    id: "DH-DATA-12",
    question: "Single datasource vs multi-datasource object type (MDO)?",
    options: [
      {
        condition: "All properties for this object type come from a single authoritative dataset",
        choice: "Single datasource",
        reasoning: "Simpler model — no reducer configuration, no cross-source conflict resolution. The single dataset is the authoritative source for all properties.",
      },
      {
        condition: "Properties come from different teams, systems, or pipelines — different ownership per property subset",
        choice: "Multi-datasource (MDO)",
        reasoning: "MDO enables different teams to own different property subsets. The primary key must exist in every datasource. Property reducers resolve value conflicts at index time. Use for incremental enrichment or combining structured + derived data.",
      },
    ],
    source: ".claude/research/palantir/data/entities.md §Multi-Datasource Types",
    realWorldExample: "A simple Product entity with name, SKU, price, and category all from the ProductCatalogDB → single datasource, because all properties originate from one authoritative source. An Employee entity where HRCore provides demographics (name, DOB, department), PayrollDB provides compensation data (salary, bonus, tax bracket), and an ML pipeline provides computed metrics (attrition risk score, engagement index) → multi-datasource, because three independent systems contribute different property subsets owned by different teams (HR, Finance, Data Science). The employeeId primary key must appear in all three datasources for row joining. COUNTER-EXAMPLE: Creating a multi-datasource Employee type when the same HR system provides all properties through different tables — this adds unnecessary reducer complexity. Use a pipeline to join the tables before indexing instead.",
  },
] as const;

// =========================================================================
// Section 5: Mapping Tables
// =========================================================================

/** Wire format for each base property type. Source: value-types.md, properties.md */
export const BASE_TYPE_WIRE_FORMAT: Readonly<Record<BasePropertyType, string>> = {
  string: "string",
  integer: "number",
  long: "string",
  float: "number",
  double: "number",
  boolean: "boolean",
  date: "ISO 8601 date string",
  timestamp: "ISO 8601 datetime string",
  geopoint: "GeoJSON Point",
  geoshape: "GeoJSON Geometry",
  attachment: "RID string",
  mediaReference: "RID string",
  timeseries: "series reference",
  cipher: "encrypted blob",
  struct: "JSON object",
  vector: "number[]",
  marking: "marking ID",
  FK: "string",
  BrandedType: "varies by base type",
};

/** Base type → branded type name (6 entries). Source: value-types.md */
export const BASE_TYPE_BRANDED_MAP: Readonly<Partial<Record<BasePropertyType, string>>> = {
  date: "DateISOString",
  timestamp: "TimestampISOString",
  integer: "Integer",
  long: "Long",
  float: "Float",
  double: "Double",
};

/** Filter operations by base property type. Source: properties.md §4, geospatial.md */
export const FILTER_OPS_BY_TYPE: Readonly<Partial<Record<BasePropertyType, readonly string[]>>> = {
  string: STRING_FILTER_OPS,
  integer: NUMERIC_FILTER_OPS,
  long: NUMERIC_FILTER_OPS,
  float: NUMERIC_FILTER_OPS,
  double: NUMERIC_FILTER_OPS,
  boolean: BOOLEAN_FILTER_OPS,
  date: NUMERIC_FILTER_OPS,
  timestamp: NUMERIC_FILTER_OPS,
  geopoint: GEO_POINT_FILTER_OPS,
  geoshape: GEO_SHAPE_FILTER_OPS,
};

/** Bucketing methods by base property type. Source: properties.md §5 */
export const BUCKETING_BY_TYPE: Readonly<Partial<Record<BasePropertyType, readonly string[]>>> = {
  boolean: ["topValues"],
  string: ["topValues", "exactValues"],
  integer: ["byRanges", "byFixedWidth"],
  long: ["byRanges", "byFixedWidth"],
  float: ["byRanges", "byFixedWidth"],
  double: ["byRanges", "byFixedWidth"],
  date: DATE_BUCKETING_METHODS,
  timestamp: TIMESTAMP_BUCKETING_METHODS,
};

/** Common embedding models within platform limits. Source: vectors.md */
export const EMBEDDING_MODELS: Readonly<Record<string, EmbeddingModelDefinition>> = {
  "all-MiniLM-L6-v2": { dimensions: 384, tokenLimit: 512, useCase: "General-purpose text (symmetric)" },
  "ms-marco": { dimensions: 768, tokenLimit: 512, useCase: "Query-passage asymmetric" },
  "text-embedding-ada-002": { dimensions: 1536, tokenLimit: 8191, useCase: "General-purpose / multilingual" },
  "text-embedding-3-small": { dimensions: 1536, tokenLimit: 8191, useCase: "General-purpose text" },
  "text-embedding-3-large": { dimensions: 3072, tokenLimit: 8191, useCase: "High-accuracy text (EXCEEDS 2048 platform limit — requires dimensions parameter for reduction)" },
};

/**
 * OSDK language support matrix for special property types.
 * Consolidated from cipher.md, vectors.md, timeseries.md, structs.md, attachments.md.
 * Critical for downstream consumers to know which types are usable in which SDK.
 */
export const OSDK_TYPE_SUPPORT: readonly OsdkTypeSupport[] = [
  { type: "attachment", typescript: "full", python: "full", java: "full" },
  { type: "mediaReference", typescript: "full", python: "unsupported", java: "partial" },
  { type: "struct", typescript: "full", python: "unsupported", java: "unsupported", workaround: "OpenAPI as any" },
  { type: "timeseries", typescript: "full", python: "partial", java: "unsupported", workaround: "REST API (3 endpoints)" },
  { type: "geopoint", typescript: "full", python: "full", java: "full" },
  { type: "geoshape", typescript: "full", python: "full", java: "full" },
  { type: "vector", typescript: "unsupported", python: "unsupported", java: "unsupported", workaround: "OpenAPI as any, REST API" },
  { type: "cipher", typescript: "unsupported", python: "unsupported", java: "unsupported", workaround: "OpenAPI as any, server-side functions" },
  { type: "marking", typescript: "unsupported", python: "unsupported", java: "unsupported", workaround: "Platform UI, REST API" },
] as const;

/**
 * Object Storage V1 vs V2 feature comparison.
 * Source: entities.md §6 — Object Storage Versions
 */
export const OSV_FEATURE_COMPARISON: readonly OsvFeatureEntry[] = [
  { feature: "Required properties", osv1: "Not enforced", osv2: "Enforced at index + action apply time" },
  { feature: "Vector search (KNN)", osv1: "Not supported", osv2: "Supported (max K=100, max dims=2048)" },
  { feature: "Struct types", osv1: "Limited", osv2: "Full support" },
  { feature: "SearchAround result limit", osv1: "100,000 objects", osv2: "10,000,000 objects" },
  { feature: "Max properties per ObjectType", osv1: "Not explicitly documented", osv2: "2,000" },
  { feature: "Architecture", osv1: "Consolidated indexing and query", osv2: "Separated read/write concerns" },
] as const;

/**
 * Struct type explicit constraints — NON_FILTERABLE and structural limitations.
 * Source: structs.md — NON_FILTERABLE Constraint, OSDK Struct Support
 */
export const STRUCT_CONSTRAINTS = {
  /** Struct properties cannot be used in Object Set filters, search, sort, or aggregation. */
  NON_FILTERABLE: true,
  /** Struct fields use base types only — no recursive nesting. */
  MAX_NESTING_DEPTH: 1,
  /** Editing a struct replaces the entire value — no partial field updates via rules. */
  PARTIAL_UPDATE_SUPPORTED: false,
  /** Individual struct fields cannot be independently marked required (only the struct property as a whole). */
  INDIVIDUAL_FIELD_REQUIRED: false,
  /** Struct field RIDs are NOT inherited when converting from local to shared property. */
  RID_INHERITANCE: false,
} as const;

/**
 * Property reducer strategy → description mapping.
 * Source: data/properties.md §Property Reducers
 */
export const REDUCER_STRATEGY_TO_DESCRIPTION: Readonly<Record<PropertyReducerStrategy, string>> = {
  firstNonNull: "Uses the first non-null value in datasource priority order",
  lastUpdated: "Uses the most recently modified value across datasources",
  min: "Selects the minimum value across datasources",
  max: "Selects the maximum value across datasources",
  sum: "Sums values across all datasources",
  custom: "Applies a custom merge expression defined in the Object Type configuration",
};

// =========================================================================
// Section 6: Structural Rules
// =========================================================================

/** Naming and structural rules for DATA domain artifacts. */
export const STRUCTURAL_RULES: readonly StructuralRule[] = [
  {
    target: "Entity (ObjectType) API name",
    casing: "PascalCase",
    pattern: "^[A-Z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/data/entities.md §1",
  },
  {
    target: "Property API name",
    casing: "camelCase",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/data/properties.md §1",
  },
  {
    target: "StructType API name",
    casing: "PascalCase",
    pattern: "^[A-Z][a-zA-Z0-9]*$",
    source: ".claude/research/palantir/data/structs.md §2",
  },
  {
    target: "ValueType API name",
    casing: "PascalCase",
    pattern: "^[A-Z][a-zA-Z0-9]*$",
    source: ".claude/research/palantir/data/value-types.md §2",
  },
  {
    target: "Object type API name (platform format)",
    casing: "lowercase start",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/data/entities.md §1",
  },
] as const;

/** Primary key must be the first property in entity definition. Source: entities.md §2 */
export const PK_POSITION_RULE = "first" as const;

/** Output file for DATA domain generation. Source: SKILL.md pattern */
export const OUTPUT_FILE = "ontology/data.ts" as const;

// =========================================================================
// Section 7: Validation Thresholds
// =========================================================================

/** Numeric thresholds for DATA domain validation. */
export const VALIDATION_THRESHOLDS = {
  /** Minimum entity usages to warrant a SharedPropertyType. Source: shared-properties.md */
  SHARED_PROPERTY_THRESHOLD: 3,
  /** TimeSeries count above which to extract sensor entity. Source: timeseries.md */
  TIMESERIES_SENSOR_THRESHOLD: 5,
  /** .topValues() becomes approximate above this. Source: properties.md §5 */
  TOP_VALUES_APPROXIMATE: 1000,
  /** .exactValues() maximum bucket count. Source: properties.md §5 */
  EXACT_VALUES_MAX_BUCKETS: 10000,
  /** Maximum properties per ObjectType (OSv2 hard limit). Source: entities.md, architecture/ontology-model.md §ARCH-39 */
  MAX_PROPERTIES_PER_ENTITY: 2000,
  /** Maximum vector embedding dimensions. Source: vectors.md */
  MAX_VECTOR_DIMENSIONS: 2048,
  /** Maximum K for KNN nearest neighbor queries. Source: vectors.md */
  MAX_KNN_K: 100,
  /** Loading >10,000 objects may cause timeouts in Object Set operations. Source: entities.md §Canonical Constraints, queries.md §Retrieval Methods */
  PERFORMANCE_TIMEOUT_THRESHOLD: 10000,
  /** Maximum aggregation buckets across all groupBy/segmentBy. Source: properties.md §5, architecture/ontology-model.md §ARCH-39 */
  MAX_AGGREGATION_BUCKETS: 10000,
  /** ObjectSet .all() maximum objects. Source: queries.md, architecture/ontology-model.md §ARCH-39 */
  MAX_OBJECT_SET_ALL: 100000,
  /** SearchAround maximum result count (OSv2). Source: links.md, architecture/ontology-model.md §ARCH-39 */
  MAX_SEARCH_AROUND_RESULTS_OSV2: 10000000,
  /** SearchAround maximum hops per chain. Source: links.md, architecture/ontology-model.md §ARCH-39 */
  MAX_SEARCH_AROUND_HOPS: 3,
  /** Maximum object types editable in a single action submission. Source: scale-property-limits (2026) */
  MAX_OBJECT_TYPES_PER_ACTION: 50,
  /** Maximum single object edit payload (OSv1). Source: scale-property-limits (2026) */
  MAX_SINGLE_OBJECT_EDIT_KB_OSV1: 32,
  /** Maximum single object edit payload (OSv2) in KB. Source: scale-property-limits (2026) */
  MAX_SINGLE_OBJECT_EDIT_KB_OSV2: 3072,
  /** Maximum elements in a primitive list action parameter. Source: scale-property-limits (2026) */
  MAX_PRIMITIVE_LIST_PARAM_ELEMENTS: 10000,
  /** Maximum elements in an object reference list action parameter. Source: scale-property-limits (2026) */
  MAX_OBJECT_REF_LIST_PARAM_ELEMENTS: 1000,
  /** Maximum batch calls per action (non-batched function-backed: 20). Source: scale-property-limits (2026) */
  MAX_BATCH_CALLS_PER_ACTION: 10000,
  /** Maximum batch calls for non-batched function-backed actions. Source: scale-property-limits (2026) */
  MAX_BATCH_CALLS_FUNCTION_BACKED: 20,
  /** Default collection limit for Collect List/Set derived property aggregations. Source: derived-properties (2026 Beta) */
  DERIVED_PROPERTY_COLLECT_DEFAULT_LIMIT: 10,
  /** Minimum OSDK client version for derived property support. Source: derived-properties (2026 Beta) */
  DERIVED_PROPERTY_OSDK_MIN_VERSION: "2.2.0-beta",
} as const;

// =========================================================================
// Section 8: Hard Constraints
// =========================================================================

/**
 * HC-DATA-01..05 are defined in DATA_SEMANTICS.hardConstraints (semantics.ts).
 * HC-DATA-06..40 extend with domain-specific constraints from research files.
 * Note: HC-DATA-33 was reassigned in v1.4.0 from "required array min 1 item" (duplicate of HC-DATA-21) to "Edit-only properties".
 * All are severity="error" and domain="data".
 */
export const DATA_HARD_CONSTRAINTS: readonly HardConstraint[] = [
  // --- Inherited from semantics.ts (re-exported for single-file access) ---
  ...DATA_SEMANTICS.hardConstraints,

  // --- Entity constraints ---
  {
    id: "HC-DATA-06",
    domain: "data",
    rule: "API name: lowercase start, alphanumeric, NFKC normalized, 1-100 characters",
    severity: "error",
    source: ".claude/research/palantir/data/entities.md",
    rationale: "Platform-enforced naming format. Non-conforming names are rejected at schema compilation. NFKC normalization prevents Unicode homoglyph attacks.",
  },
  {
    id: "HC-DATA-07",
    domain: "data",
    rule: "API name must be unique within the Ontology",
    severity: "error",
    source: ".claude/research/palantir/data/entities.md",
    rationale: "Duplicate API names cause compilation ambiguity. All generated code (OSDK types, function parameters, REST endpoints) uses the API name as the unique key.",
  },
  {
    id: "HC-DATA-08",
    domain: "data",
    rule: "Primary key must be a non-nullable scalar type (string | integer | long | BrandedType)",
    severity: "error",
    source: ".claude/research/palantir/data/entities.md",
    rationale: "PKs are used for link resolution (FK backing), index lookups, and object identity. Only scalar types that support equality comparison are valid.",
  },
  {
    id: "HC-DATA-09",
    domain: "data",
    rule: "Exactly 1 primary key per ObjectType",
    severity: "error",
    source: ".claude/research/palantir/data/entities.md",
    rationale: "The platform requires a single PK for deterministic object identity. Composite keys are not supported — use a synthetic key if multiple columns define uniqueness.",
  },

  // --- Struct constraints ---
  {
    id: "HC-DATA-10",
    domain: "data",
    rule: "Struct types cannot nest other structs (max depth 1)",
    severity: "error",
    source: ".claude/research/palantir/data/structs.md",
    rationale: "Struct fields use base types only — no recursive nesting. The flat inverted index cannot decompose arbitrary nesting depths for search.",
  },

  // --- Property constraints ---
  {
    id: "HC-DATA-11",
    domain: "data",
    rule: "Array properties cannot contain Vector or TimeSeries types",
    severity: "error",
    source: ".claude/research/palantir/data/properties.md",
    rationale: "Vector properties require dedicated ANN indexing and TimeSeries properties reference external series stores — neither can be meaningfully arrayed.",
  },

  // --- Cipher constraints ---
  {
    id: "HC-DATA-12",
    domain: "data",
    rule: "Cipher properties cannot be aggregated",
    severity: "error",
    source: ".claude/research/palantir/data/cipher.md",
    rationale: "Encrypted values are opaque to the aggregation engine. Computing count, sum, average, etc. requires the plaintext, defeating encryption at rest.",
  },
  {
    id: "HC-DATA-13",
    domain: "data",
    rule: "Cipher properties only apply to scalar base types (not struct fields or array elements)",
    severity: "error",
    source: ".claude/research/palantir/data/cipher.md",
    rationale: "The cipher channel mechanism operates on individual property values. Encrypting nested struct fields or individual array elements is not supported.",
  },

  // --- Value type constraints ---
  {
    id: "HC-DATA-14",
    domain: "data",
    rule: "Long type wire format must be string (JavaScript number precision loss)",
    severity: "error",
    source: ".claude/research/palantir/data/value-types.md",
    rationale: "JavaScript number (IEEE 754 double) safely represents integers only up to 2^53-1. 64-bit Long values exceed this range, requiring string encoding to preserve precision.",
  },

  // --- Vector constraints ---
  {
    id: "HC-DATA-15",
    domain: "data",
    rule: "Vector query dimensions must match indexed vector dimensions exactly",
    severity: "error",
    source: ".claude/research/palantir/data/vectors.md",
    rationale: "The ANN index is built for a specific dimensionality. A query vector of different size causes a dimension mismatch error at query time.",
  },

  // --- Geospatial constraints ---
  {
    id: "HC-DATA-16",
    domain: "data",
    rule: "GeoShape must be bare GeoJSON geometry (RFC 7946)",
    severity: "error",
    source: ".claude/research/palantir/data/geospatial.md",
    rationale: "OSDK 2.0 requires standard GeoJSON format. Proprietary GeoShape objects from OSDK 1.x are not accepted. Wire format must be GeoJSON geometry.",
  },
  {
    id: "HC-DATA-17",
    domain: "data",
    rule: "GeoPoint CRS must be WGS84",
    severity: "error",
    source: ".claude/research/palantir/data/geospatial.md",
    rationale: "The platform standardizes on WGS84 (EPSG:4326) for all geospatial coordinates. Other CRS projections must be converted before storage.",
  },

  // --- Cipher key management ---
  {
    id: "HC-DATA-18",
    domain: "data",
    rule: "Cipher key management is platform-managed only (no developer-managed keys)",
    severity: "error",
    source: ".claude/research/palantir/data/cipher.md",
    rationale: "Cipher channels handle key generation, rotation, and access control. Embedding custom keys would bypass the platform's security audit trail and key lifecycle management.",
  },

  // --- Attachment security ---
  {
    id: "HC-DATA-19",
    domain: "data",
    rule: "Attachment properties inherit parent object security policies",
    severity: "error",
    source: ".claude/research/palantir/data/attachments.md",
    rationale: "Attachments have no independent permission model. If a user can read the object, they can download the attachment. No separate attachment-level ACL exists.",
  },

  // --- PK immutability ---
  {
    id: "HC-DATA-20",
    domain: "data",
    rule: "Primary key is immutable: cannot be modified after object creation",
    severity: "error",
    source: ".claude/research/palantir/data/entities.md",
    rationale: "Deliberate re-emphasis of HC-DATA-02 at the domain-specific constraint level. PK immutability ensures referential integrity across all links, indexes, and external references — changing a PK would orphan all downstream references. This constraint appears in both semantics (HC-DATA-02) and domain (HC-DATA-20) because it is the most critical DATA domain invariant.",
  },

  // --- Required property semantics ---
  {
    id: "HC-DATA-21",
    domain: "data",
    rule: "Required array properties must have at least one item (empty array = invalid)",
    severity: "error",
    source: ".claude/research/palantir/data/entities.md",
    rationale: "OSv2 enforces that required properties are non-null AND non-empty for arrays. An empty array on a required array property fails validation at index time.",
  },

  // --- Geospatial indexing ---
  {
    id: "HC-DATA-22",
    domain: "data",
    rule: "GeoShape circles are NOT indexed for search",
    severity: "error",
    source: ".claude/research/palantir/data/geospatial.md",
    rationale: "The spatial index does not support circle geometries. Use polygon approximations of circles for searchable spatial queries.",
  },

  // --- Cipher search ---
  {
    id: "HC-DATA-23",
    domain: "data",
    rule: "Cipher properties cannot be indexed or used in search (extends HC-DATA-01)",
    severity: "error",
    source: ".claude/research/palantir/data/cipher.md",
    rationale: "Encrypted data is opaque to the search engine. Indexing would require plaintext, defeating the purpose of encryption at rest. This extends HC-DATA-01 with explicit search prohibition.",
  },

  // --- Searchable hint requirement ---
  {
    id: "HC-DATA-24",
    domain: "data",
    rule: "Properties used in filter, orderBy, or aggregation operations MUST have the searchable hint enabled",
    severity: "error",
    source: ".claude/research/palantir/data/properties.md",
    rationale: "The searchable hint triggers property indexing for full-text search. Without it, .filter(), .orderBy(), and aggregation bucketing operations cannot reference the property — queries silently return empty results or throw errors.",
  },

  // --- Shared property breaking edit prevention ---
  {
    id: "HC-DATA-25",
    domain: "data",
    rule: "Breaking edits to shared properties are blocked if any consuming object type would be incompatible",
    severity: "error",
    source: ".claude/research/palantir/data/shared-properties.md",
    rationale: "The platform evaluates ALL object types using the shared property, including non-visible types in other projects. If any consumer would break, the edit is rejected. This prevents silent ontology-wide breakage from a single shared property change.",
  },

  // --- Max editable objects per action (DATA perspective) ---
  {
    id: "HC-DATA-26",
    domain: "data",
    rule: "Maximum 10,000 objects editable per single Action (OSv2)",
    severity: "error",
    source: ".claude/research/palantir/data/entities.md §DATA.EN-11, §DATA.EN-19",
    rationale: "Object Storage V2 transaction size limit. Batch operations exceeding this threshold cause transaction failure. Also declared in ACTION domain (HC-ACTION-01) — duplicated in DATA because it directly constrains entity edit scope.",
  },

  // --- Derived property limitations (Beta 2026) ---
  {
    id: "HC-DATA-27",
    domain: "data",
    rule: "Derived properties are read-only — cannot be edited by functions or actions",
    severity: "error",
    source: "Palantir docs — derived-properties (2026 Beta)",
    rationale: "Derived properties compute values at runtime from linked objects. They have no backing storage — writing to them is undefined. Only stored properties can be mutation targets.",
  },
  {
    id: "HC-DATA-28",
    domain: "data",
    rule: "Derived properties cannot be used in text search or keyword filters",
    severity: "error",
    source: "Palantir docs — derived-properties (2026 Beta) — Known limitations",
    rationale: "Derived property values are computed at runtime, not stored in the search index. Full-text search requires pre-indexed values. Use stored properties for searchable text.",
  },
  {
    id: "HC-DATA-29",
    domain: "data",
    rule: "Derived properties cannot be marked as required (non-nullable)",
    severity: "error",
    source: "Palantir docs — derived-properties (2026 Beta) — Known limitations",
    rationale: "Required property enforcement occurs at index time, but derived properties have no indexed storage. The platform cannot guarantee non-null values for computed properties that depend on linked object state.",
  },
  {
    id: "HC-DATA-30",
    domain: "data",
    rule: "Primary key properties cannot be derived properties",
    severity: "error",
    source: "Palantir docs — derived-properties (2026 Beta) — Known limitations",
    rationale: "PKs must be stable, immutable, and stored. A derived PK would change when linked object state changes, breaking referential integrity across all links and indexes.",
  },
  {
    id: "HC-DATA-31",
    domain: "data",
    rule: "Properties with value types cannot be converted to derived properties",
    severity: "error",
    source: "Palantir docs — derived-properties (2026 Beta) — Known limitations",
    rationale: "Value types carry semantic branding and constraint validation that cannot be applied to runtime-computed values from linked objects. The branded type contract assumes stored, validated data.",
  },
  {
    id: "HC-DATA-32",
    domain: "data",
    rule: "Maximum 50 object types editable per single action submission",
    severity: "error",
    source: "Palantir docs — scale-property-limits (2026)",
    rationale: "Platform limit on action transaction scope. Exceeding 50 object types causes action rejection. Design complex multi-type mutations to stay within this boundary.",
  },
  // --- v1.3.0 additions (research deep dive 2026-03-15) ---
  // Note: HC-DATA-33 reassigned in v1.4.0 from "required array min 1 item" (duplicate of HC-DATA-21) to "Edit-only properties".
  {
    id: "HC-DATA-33",
    domain: "data",
    rule: "Edit-only properties are set exclusively via actions — pipeline datasource syncs do not write to them",
    severity: "error",
    source: "research/palantir/data/properties.md §Edit-Only Properties",
    rationale: "Edit-only properties prevent data pipelines from overwriting user-generated data on each sync. This is essential for human-in-the-loop corrections, manual classifications, and annotations that must persist across pipeline rebuilds.",
  },
  {
    id: "HC-DATA-34",
    domain: "data",
    rule: "Mandatory control properties are required for granular per-row marking enforcement in object security policies (OSv2)",
    severity: "error",
    source: "research/palantir/data/properties.md §Mandatory Control Properties + security/markings.md",
    rationale: "Object security policies use mandatory control properties to evaluate row-level marking access. Without a mandatory control property, per-row marking enforcement cannot be configured — the policy has no data to evaluate against.",
  },
  {
    id: "HC-DATA-35",
    domain: "data",
    rule: "Value Type constraint changes create a new version that auto-propagates across the entire Ontology — tightening may cause downstream validation failures",
    severity: "error",
    source: "research/palantir/data/value-types.md §Value Type Constraints + §Versioning Behavior",
    rationale: "Value types version automatically. Breaking edits (tighter regex, narrower range) cascade to all properties using the value type. This means a constraint change in one place can break validation across multiple object types simultaneously.",
  },
  {
    id: "HC-DATA-36",
    domain: "data",
    rule: "Struct properties are replaced as a whole on edit — no partial field-level updates via action rules",
    severity: "error",
    source: "research/palantir/data/structs.md §Struct Action Parameters",
    rationale: "Action rules that modify struct properties replace the entire struct value. Individual field updates are not supported — the caller must provide the complete struct. This prevents partial-update bugs but requires client-side merge logic for single-field changes.",
  },
  // --- v1.4.0 additions (research scraping gap closure 2026-03-16) ---
  {
    id: "HC-DATA-37",
    domain: "data",
    rule: "GeoTimeSeriesReference is an OSv2-only property type — not available in OSv1 object storage",
    severity: "error",
    source: "Palantir docs — scale-property-limits (2026), scrapling confirmation",
    rationale: "GeoTimeSeriesReference stores spatiotemporal data (location + time). It requires OSv2 storage architecture and is not backported to OSv1. Projects on OSv1 must use separate GeoPoint + timestamp properties instead.",
  },
  {
    id: "HC-DATA-38",
    domain: "data",
    rule: "Derived properties with struct return types cannot be used in query filter operations",
    severity: "error",
    source: "Palantir docs — derived-properties (2026 Beta) — Known limitations, scrapling confirmation",
    rationale: "The query engine cannot decompose struct values for filtering. Derived properties returning structs are displayable but not queryable — use scalar derived properties for filterable computed values.",
  },
  {
    id: "HC-DATA-39",
    domain: "data",
    rule: "Property reducers are only applicable to multi-datasource object types (MDOs)",
    severity: "error",
    source: ".claude/research/palantir/data/properties.md §Property Reducers",
    rationale: "Single-datasource object types have no conflicting values to resolve. Configuring a reducer on a single-datasource entity is a no-op at best and a configuration error at worst — the reducer expects multiple input values from different datasources.",
  },
  {
    id: "HC-DATA-40",
    domain: "data",
    rule: "Property reducers are evaluated at index time, not query time",
    severity: "error",
    source: ".claude/research/palantir/data/properties.md §Property Reducers",
    rationale: "Reducers merge conflicting datasource values when rows are indexed into Object Storage. The canonical value is stored once; queries read the pre-resolved result. This means reducer changes require re-indexing to take effect — they are not dynamic query-time computations.",
  },
] as const;

/** Total hard constraint count (semantics + domain-specific). */
export const HARD_CONSTRAINT_COUNT = DATA_HARD_CONSTRAINTS.length;
