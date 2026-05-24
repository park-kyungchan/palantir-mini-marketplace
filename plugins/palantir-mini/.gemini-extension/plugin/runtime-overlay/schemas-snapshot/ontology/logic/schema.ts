/**
 * LOGIC Domain Schema — Ontology Schema Redesign §4.1
 *
 * Self-sufficient schema for the LOGIC domain. Every LLM session reading this
 * file alone can correctly generate the LOGIC domain skeleton without SKILL.md.
 * Upstream truth still comes from the split research stack plus the schema-local
 * crosswalk in `../research-source-map.ts`.
 *
 * LOGIC is the intelligence layer — it captures how experts reason about DATA.
 * It owns 5 concept types: LinkType, Interface, Query, DerivedProperty, Function.
 * Four of these are "transition zone" concepts (documented under data/ in research
 * but semantically classified as LOGIC via the semanticQuestion test).
 *
 * Authority:
 *   - builder/fact boundary: .claude/research/palantir-developers/BROWSE.md
 *     -> .claude/research/palantir-foundry/architecture/ontology-overview.md
 *   - transition-zone and pre-split LOGIC semantics: resolve legacy citations
 *     through ../research-source-map.ts to archive bridges under
 *     .claude/research/_archive/2026-04-20-palantir-consolidation/{logic,data}/
 * Dependency: ../semantics.ts (§4.0, LOGIC_SEMANTICS + SemanticHeuristic type)
 * Upstream: data/schema.ts (LOGIC reads DATA types)
 * Downstream: action/schema.ts (future) reads LOGIC types
 *
 * Sections:
 *   1. Semantic Identity — re-export LOGIC_SEMANTICS
 *   2. Type Definitions — re-exports + enhanced LOGIC types + new enums
 *   3. Enumeration Constants — 16 constant arrays
 *   4. Decision Heuristics — 14 implementation-choice heuristics (DH-LOGIC-01..14)
 *   5. Mapping Tables — cardinality→backing, derivation→hops, function→constraints
 *   6. Structural Rules — naming patterns, output file
 *   7. Validation Thresholds — numeric limits
 *   8. Hard Constraints — HC-LOGIC-05..37 (extends semantics HC-LOGIC-01..04)
 */

// =========================================================================
// Section 1: Semantic Identity
// =========================================================================

import {
  LOGIC_SEMANTICS,
  type SemanticHeuristic,
  type HardConstraint,
} from "../semantics";
import type {
  LinkCardinality,
  QueryType,
  FunctionCategory,
  DerivedMode,
  StructuralRule,
} from "../types";

/** Schema version for LOGIC domain. */
export const SCHEMA_VERSION = "1.4.0" as const;

/** Re-export LOGIC_SEMANTICS so downstream consumers only import from logic/schema. */
export { LOGIC_SEMANTICS };
export type { SemanticHeuristic, HardConstraint };

// =========================================================================
// Section 2: Type Definitions
// =========================================================================

// --- Re-exports from ../types.ts (shared infrastructure) ---

export type {
  BilingualDesc,
  TestSeverity,
  LinkCardinality,
  QueryType,
  FunctionCategory,
  DerivedMode,
  LinkType,
  InterfaceLinkConstraint,
  OntologyInterface,
  QueryFilterField,
  Parameter,
  OntologyQuery,
  OntologyFunction,
  DerivedProperty,
  OntologyLogic,
} from "../types";

// --- New enum types ---

/** Link backing mechanism. Source: links.md §1-3 */
export type LinkBackingMechanism = "foreignKey" | "joinTable" | "objectBacked";

/** Function kind in the Function Taxonomy. Source: functions.md §Function Taxonomy + typescript-v2-ontology-transactions (2026 Beta) */
export type FunctionKind = "function" | "editFunction" | "query" | "modelFunction" | "transactionFunction";

/** Object Set persistence category. Source: queries.md §Object Set Types */
export type ObjectSetType = "static" | "dynamic" | "temporary" | "permanent";

/** Derivation category by traversal depth. Source: derived-properties.md §Derivation Categories */
export type DerivationCategory = "local" | "connected1hop" | "connectedMultiHop" | "aggregation";

/** How derived property changes propagate. Source: derived-properties.md §Impact Propagation */
export type PropagationModel = "functionBacked" | "automateCondition" | "explicit";

/** Interface link constraint cardinality option. Source: interfaces.md §Constraint Parameters */
export type InterfaceLinkCardinalityOption = "ONE" | "MANY";

// --- LOGIC-domain enhanced types ---

/** Link lifecycle status. Source: links.md §Link API Metadata */
export type LinkStatus = "ACTIVE" | "EXPERIMENTAL" | "DEPRECATED";

/** LinkType with backing mechanism and traversal semantics. Source: links.md §Backing + Backlinks */
export interface LogicLinkType {
  readonly apiName: string;
  readonly sourceEntity: string;
  readonly targetEntity: string;
  readonly cardinality: LinkCardinality;
  readonly backingMechanism: LinkBackingMechanism;
  readonly fkProperty?: string;
  readonly fkSide?: "source" | "target";
  readonly joinEntity?: string;
  readonly reverseName?: string;
  readonly selfReferential: boolean;
  /** Lifecycle status — same as ObjectType status. Source: links.md §Link API Metadata */
  readonly status?: LinkStatus;
  readonly description?: { readonly ko: string; readonly en: string };
}

/** Interface with inheritance and enhanced link constraints. Source: interfaces.md §Inheritance + Constraints */
export interface LogicInterface {
  readonly apiName: string;
  readonly description?: { readonly ko: string; readonly en: string };
  readonly properties: readonly string[];
  readonly parents?: readonly string[];
  readonly linkConstraints: readonly LogicInterfaceLinkConstraint[];
  readonly implementedBy: readonly string[];
}

/** Enhanced interface link constraint. Source: interfaces.md §Constraint Parameters */
export interface LogicInterfaceLinkConstraint {
  readonly linkApiName: string;
  readonly targetKind: "interface" | "objectType";
  readonly targetType: string;
  readonly cardinality: InterfaceLinkCardinalityOption;
  readonly required: boolean;
}

/** Query with ObjectSet type and filter combinator usage. Source: queries.md §Set Types + Combinators */
export interface LogicQuery {
  readonly apiName: string;
  readonly description?: { readonly ko: string; readonly en: string };
  readonly entityApiName: string;
  readonly queryType: QueryType;
  readonly objectSetType: ObjectSetType;
  readonly filterCombinators?: readonly string[];
}

/** Derived property with derivation category and impact semantics. Source: derived-properties.md */
export interface LogicDerivedProperty {
  readonly apiName: string;
  readonly entityApiName: string;
  readonly description?: { readonly ko: string; readonly en: string };
  readonly mode: DerivedMode;
  readonly returnType: string;
  readonly derivationCategory: DerivationCategory;
  readonly hopCount: number;
  readonly propagationModel: PropagationModel;
  readonly sourceProperties: readonly string[];
  readonly computeFn: string;
}

/** Function with kind, runtime version, and edit declarations. Source: functions.md §Taxonomy + v1/v2 */
export interface LogicFunction {
  readonly apiName: string;
  readonly description?: { readonly ko: string; readonly en: string };
  readonly category: FunctionCategory;
  readonly functionKind: FunctionKind;
  readonly runtimeVersion: "v1" | "v2";
  readonly parameters: readonly { readonly name: string; readonly type: string }[];
  readonly returnType: string;
  readonly editDeclarations?: readonly string[];
  readonly pureLogic: string;
  /** Whether this function is exposed as an LLM-callable tool (Pattern 2: Logic Tool Handoff). Source: ontology-ultimate-vision.md §2 */
  readonly toolExposure?: boolean;
}

export type { StructuralRule } from "../types";

// =========================================================================
// Section 3: Enumeration Constants
// =========================================================================

/** The 4 link cardinalities. Source: links.md §Cardinality */
export const LINK_CARDINALITIES: readonly LinkCardinality[] = [
  "1:1",
  "M:1",
  "1:M",
  "M:N",
] as const;

/** The 3 link backing mechanisms. Source: links.md §Backing Mechanisms */
export const LINK_BACKING_MECHANISMS: readonly LinkBackingMechanism[] = [
  "foreignKey",
  "joinTable",
  "objectBacked",
] as const;

/** The 5 function kinds. Source: functions.md §Function Taxonomy + typescript-v2-ontology-transactions (2026 Beta) */
export const FUNCTION_KINDS: readonly FunctionKind[] = [
  "function",
  "editFunction",
  "query",
  "modelFunction",
  "transactionFunction",
] as const;

/** v1 edit operations (8). Source: functions.md §v1 Edit Operations */
export const EDIT_OPERATIONS_V1: readonly string[] = [
  "updateProperty",
  "arrayAppend",
  "createObject",
  "deleteObject",
  "setSingleLink",
  "clearSingleLink",
  "addMultiLink",
  "removeMultiLink",
] as const;

/** v2 edit operations via EditBatch (6). Source: functions.md §v2 EditBatch */
export const EDIT_OPERATIONS_V2: readonly string[] = [
  "update",
  "create",
  "delete",
  "link",
  "unlink",
  "getEdits",
] as const;

/** Object Set persistence categories (4). Source: queries.md §Object Set Types */
export const OBJECT_SET_TYPES: readonly ObjectSetType[] = [
  "static",
  "dynamic",
  "temporary",
  "permanent",
] as const;

/** Set algebra operations (3). Source: queries.md §Set Operations */
export const SET_OPERATIONS: readonly string[] = [
  "union",
  "intersect",
  "subtract",
] as const;

/** Link traversal methods (5). Source: object-sets.md §Link Traversal */
export const LINK_TRAVERSAL_METHODS: readonly string[] = [
  "get",
  "getAsync",
  "all",
  "allAsync",
  "searchAroundToType",
] as const;

/** Filter logical combinators (3). Source: queries.md §Combining Filters */
export const FILTER_COMBINATORS: readonly string[] = [
  "and",
  "or",
  "not",
] as const;

/** Submission criteria types (9). Source: functions.md §Constraint Types */
export const SUBMISSION_CRITERIA_TYPES: readonly string[] = [
  "Range",
  "ArraySize",
  "StringLength",
  "StringRegexMatch",
  "OneOf",
  "ObjectQueryResult",
  "ObjectPropertyValue",
  "GroupMember",
  "Unevaluable",
] as const;

/** Derivation categories (4). Source: derived-properties.md §Derivation Categories */
export const DERIVATION_CATEGORIES: readonly DerivationCategory[] = [
  "local",
  "connected1hop",
  "connectedMultiHop",
  "aggregation",
] as const;

/** Propagation models (3). Source: derived-properties.md §Impact Propagation */
export const PROPAGATION_MODELS: readonly PropagationModel[] = [
  "functionBacked",
  "automateCondition",
  "explicit",
] as const;

/** Test assertion methods (8). Source: testing.md §Assertion Methods */
export const TEST_ASSERTION_METHODS: readonly string[] = [
  "createsObject",
  "createsObjects",
  "modifiesObject",
  "addsLink",
  "addsLinks",
  "removesLink",
  "deletesObject",
  "hasNoMoreEdits",
] as const;

/** Interface link constraint cardinality options (2). Source: interfaces.md §Constraint Parameters */
export const INTERFACE_LINK_CONSTRAINT_CARDINALITIES: readonly InterfaceLinkCardinalityOption[] = [
  "ONE",
  "MANY",
] as const;

/** Polymorphic query patterns (6). Source: interfaces.md §Query Patterns */
export const POLYMORPHIC_QUERY_PATTERNS: readonly string[] = [
  "typeSpecific",
  "interfaceQuery",
  "interfaceFilter",
  "interfaceSearchAround",
  "multiTypeLoad",
  "interfaceLoad",
] as const;

/** Error categories in function execution (7). Source: functions.md §Error Categories */
export const ERROR_CATEGORIES: readonly string[] = [
  "ActionValidationError",
  "staleObject",
  "primaryKeyConflict",
  "permissionDenied",
  "searchLagStaleRead",
  "resourceLimitExceeded",
  "UserFacingError",
] as const;

// =========================================================================
// Section 4: Decision Heuristics
// =========================================================================

/**
 * LOGIC domain implementation-choice heuristics (DH-LOGIC-*).
 * Each absorbs prose heuristics from one or more SKILL.md files.
 * Uses SemanticHeuristic type from semantics.ts for structural consistency.
 *
 * Every realWorldExample follows Freudenthal's paradigmatic example principle:
 * (1) Concrete scenario, (2) WHY this choice is correct, (3) COUNTER-EXAMPLE:
 * what breaks with the alternative.
 */
export const LOGIC_HEURISTICS: readonly SemanticHeuristic[] = [
  {
    id: "DH-LOGIC-01",
    question: "Which backing mechanism for this relationship: foreign key, join table, or object-backed link?",
    options: [
      {
        condition: "One side has cardinality 1 (1:1, M:1, 1:M) — the relationship is directional with a clear dependent side",
        choice: "foreignKey",
        reasoning: "A single FK column on the 'many' side (or either side for 1:1) resolves the relationship with zero storage overhead. SearchAround traversal is a single hop. No additional datasource or entity needed.",
      },
      {
        condition: "Both sides have cardinality many (M:N) and the relationship carries NO attributes — it is a pure association",
        choice: "joinTable",
        reasoning: "The platform auto-generates a join table datasource with two FK columns. Dedicated Create/Delete Link action rules manage the association. No domain data lives on the relationship itself.",
      },
      {
        condition: "Both sides have cardinality many (M:N) and the relationship carries its own attributes (dates, roles, scores, status)",
        choice: "objectBacked",
        reasoning: "The relationship becomes a first-class ObjectType with its own properties, security policies, queries, and derived properties. It has an independent lifecycle — it can be created, modified, queried, and secured independently of its endpoints.",
      },
    ],
    source: ".claude/research/palantir/data/links.md — Cardinality Decision Matrix + Backing Mechanisms",
    realWorldExample:
      "Employee→Department is M:1 backed by FK (departmentId on Employee). One employee belongs to exactly one department, "
      + "so a single FK column resolves the relationship with zero overhead. COUNTER-EXAMPLE: if you used a join table for "
      + "Employee↔Department, you'd waste a separate datasource for a guaranteed-single association, SearchAround would "
      + "become two hops instead of one, and you'd need Create/Delete Link rules for what is simply an attribute on Employee. "
      + "Contrast with Student↔Course (M:N): a FK on Student loses 'which students are in this course?', and a FK on Course "
      + "loses 'which courses does this student take?'. M:N requires a join table. When the M:N carries data (grade, enrollDate), "
      + "Enrollment must be object-backed — a thin join table cannot hold grade, cannot be queried independently ('all failing "
      + "enrollments'), and cannot have row-level security ('students see only their own enrollments').",
  },
  {
    id: "DH-LOGIC-02",
    question: "For an M:N relationship: thin join table or full object-backed link?",
    options: [
      {
        condition: "The relationship is a pure association — 'A is connected to B' with no additional information",
        choice: "joinTable",
        reasoning: "A thin join table with two FK columns (sourceId, targetId) is the minimal representation. The platform manages it automatically. No independent queries, security, or derived properties are needed on the relationship.",
      },
      {
        condition: "The relationship carries its own attributes, needs independent queries, or requires its own security policies",
        choice: "objectBacked",
        reasoning: "The relationship becomes a full ObjectType. It gets list-table + detail views (but NOT form-create/form-edit — creation is through the linking action). It can have derived properties, participate in SearchAround, and have row-level security.",
      },
    ],
    source: ".claude/research/palantir/data/links.md — Object-Backed Link Detail + Join Table Upgrade Decision",
    realWorldExample:
      "Tag↔Article is a pure M:N association — the fact that Article X has Tag Y carries no information beyond the connection "
      + "itself. A thin join table suffices. COUNTER-EXAMPLE: if you made Tag↔Article object-backed, you'd create an unnecessary "
      + "ArticleTag entity with no domain properties, wasting a datasource and complicating the data model for zero benefit. "
      + "Contrast with Prescription connecting Doctor↔Patient: it carries {dosage, startDate, endDate, refillCount, status}. "
      + "A patient can have multiple prescriptions from the same doctor; a doctor can prescribe to the same patient multiple times. "
      + "COUNTER-EXAMPLE of using thin join table here: you'd lose the ability to query 'all active prescriptions expiring this week', "
      + "you couldn't apply row-level security (patients see only their own prescriptions), and you couldn't compute "
      + "daysRemaining as a derived property on the relationship. The Prescription's lifecycle (refill, expire, cancel) "
      + "demands entity status.",
  },
  {
    id: "DH-LOGIC-03",
    question: "Should shared schema be modeled as an Interface (polymorphic contract) or SharedPropertyType (reusable metadata)?",
    options: [
      {
        condition: "Consumers need to operate across implementing types uniformly — polymorphic queries, interface-level actions, or SearchAround across types",
        choice: "Interface",
        reasoning: "An interface enables one polymorphic query that returns ALL implementing types. It can declare link constraints guaranteeing relationship shapes. New implementations are instantly compatible with existing interface-based workflows.",
      },
      {
        condition: "The goal is consistent property definitions across types, but each type is queried and operated on independently",
        choice: "SharedPropertyType",
        reasoning: "SharedPropertyType centralizes metadata (display name, description, base type) in one location. Types share definitions but NOT behavior. Each type is queried separately. No polymorphic operations are needed.",
      },
    ],
    source: ".claude/research/palantir/data/interfaces.md + shared-properties.md",
    realWorldExample:
      "Consider {status, lastUpdated, assignedTo} appearing on Incident, Alert, WorkOrder, and MaintenanceRequest. "
      + "With Interface IAssignable: one query Objects.search().assignable().filter(a => a.status.exactMatch('Open')) "
      + "returns results across ALL four types. IAssignable can also declare a link constraint (must link to AuditLog), "
      + "guaranteeing every implementing type is auditable. COUNTER-EXAMPLE of SharedPropertyType only: querying 'all open "
      + "items assigned to Alice' requires four separate queries (one per type), four separate result handlers, and manual "
      + "merging. Worse, a new MaintenanceRequest type could omit the AuditLog link and silently break audit workflows — "
      + "SharedPropertyType cannot enforce link constraints. COUNTER-EXAMPLE of Interface when unnecessary: if each type "
      + "has completely different UI views and is never mixed in dashboards, the Interface adds compile-time overhead for "
      + "polymorphism that no consumer uses. Use SharedPropertyType for metadata consistency; Interface for behavioral uniformity.",
  },
  {
    id: "DH-LOGIC-04",
    question: "Which query type: list, getById, filter, search, paginated, aggregation, or searchAround?",
    options: [
      {
        condition: "Simple enumeration of all entities, no filter criteria",
        choice: "list",
        reasoning: "List queries retrieve all objects of a type, optionally ordered. No filter parameters. Use for reference data (countries, categories) or admin views.",
      },
      {
        condition: "User-driven criteria on specific properties (range, exact match, boolean)",
        choice: "filter",
        reasoning: "Filter queries apply property-based predicates using the OSDK filter API. Supports .exactMatch(), .range(), .withinDistanceOf(), and logical combinators (and/or/not).",
      },
      {
        condition: "Full-text search with fuzzy matching, tokenization, or prefix completion",
        choice: "search",
        reasoning: "Search queries use the platform's full-text search index. Supports .phrase(), .fuzzyMatchAllTokens(), .prefixOnLastToken() for typo-tolerant, autocomplete-style queries.",
      },
      {
        condition: "Statistical metrics grouped by dimensions (count, average, sum by category)",
        choice: "aggregation",
        reasoning: "Aggregation queries compute metrics (count, avg, sum, min, max, cardinality) grouped by bucketed dimensions (topValues, byMonth, byRanges). Up to 3D (groupBy + segmentBy + metric).",
      },
      {
        condition: "Graph traversal to discover affected entities across link chains (multi-hop impact analysis)",
        choice: "searchAround",
        reasoning: "SearchAround traverses the Impact Propagation Graph up to 3 hops. It discovers entities connected through link chains without knowing intermediate IDs in advance. Essential for impact scope determination.",
      },
    ],
    source: ".claude/research/palantir/data/queries.md — Query Patterns + SearchAround",
    realWorldExample:
      "A pharmaceutical company tracks drug supply chains. 'Show all warehouses' → list. 'Warehouses with capacity > 10,000m³ "
      + "in Texas' → filter. 'Search facilities matching aierport' → search (fuzzy). 'Average shipment weight by destination "
      + "region, segmented by carrier' → aggregation (3D). 'Supplier in Shenzhen reports contamination — find all affected "
      + "products, shipments, and patients within 3 hops' → searchAround (Supplier→Products→Shipments→Hospitals). "
      + "COUNTER-EXAMPLE of using filter instead of searchAround for contamination: you'd need to know ALL intermediate "
      + "Product IDs, Shipment IDs, and Hospital IDs in advance — impossible when the contamination scope is unknown. Filter "
      + "operates on known property values; searchAround DISCOVERS the affected set by traversing the graph. "
      + "COUNTER-EXAMPLE of searchAround when filter suffices: 'Find warehouses in Texas' can be answered by filtering "
      + "on warehouse.state — using searchAround from a State entity adds unnecessary hops and latency for what is a "
      + "single-property predicate.",
  },
  {
    id: "DH-LOGIC-05",
    question: "Should this computation be a derived property (field-like) or a standalone function (call-like)?",
    options: [
      {
        condition: "The result looks like a field to consumers — displayed in table columns, detail views, and cards alongside stored properties",
        choice: "derivedProperty",
        reasoning: "Derived properties are read-only computed fields that appear in the entity's schema. Users see them as data columns, not as operations to invoke. They compute from the entity's own properties (local) or via link traversal (connected).",
      },
      {
        condition: "The result is explicitly invoked with parameters — validation, multi-input computation, or complex logic that doesn't belong in a table column",
        choice: "standaloneFunction",
        reasoning: "Functions are called explicitly, accept multiple parameters (possibly from different entities), and return structured results. Users trigger them via buttons or API calls, not by reading a table column.",
      },
    ],
    source: ".claude/research/palantir/data/derived-properties.md + logic/functions.md",
    realWorldExample:
      "fullName = firstName + ' ' + lastName is a derived property — users see 'John Smith' as a column in the employee "
      + "table, indistinguishable from stored properties. No one 'calls' fullName; they read it. Contrast with "
      + "assessLoanRisk(applicant, creditHistory[], collateralAssets[], marketConditions) — this takes four inputs from "
      + "multiple entities, performs a multi-step weighted calculation with branching logic, and returns a risk score object "
      + "with breakdown. COUNTER-EXAMPLE of making assessLoanRisk a derived property: it would need to be on the Applicant "
      + "entity, but it depends on external market conditions (not a property of Applicant), it has a complex return type "
      + "(not a simple scalar), and recomputing it on every list-table row load would be prohibitively expensive. "
      + "COUNTER-EXAMPLE of making fullName a function: consumers would need to call computeFullName(employee) explicitly "
      + "instead of simply reading employee.fullName — adding unnecessary API calls for what is a trivial string concatenation. "
      + "Litmus test: would a user expect to see this as a column in a table? If yes → derived property.",
  },
  {
    id: "DH-LOGIC-06",
    question: "Should this derived property compute on every read (onRead) or cache and invalidate (cached)?",
    options: [
      {
        condition: "Computation is trivial (string concat, arithmetic, date math, boolean logic) — sub-millisecond",
        choice: "onRead",
        reasoning: "Zero staleness risk. No cache invalidation logic needed. The computation runs inline with every read at negligible cost. This is the default — start here and only promote to cached when measured latency proves insufficient.",
      },
      {
        condition: "Computation involves expensive link traversal, aggregation over large collections, or external data",
        choice: "cached",
        reasoning: "Cache the result and invalidate when source properties change. Trades staleness risk for read performance. Requires explicit invalidation via function-backed actions or automation triggers.",
      },
    ],
    source: ".claude/research/palantir/data/derived-properties.md — Derivation Strategy",
    realWorldExample:
      "daysSinceCreation = Math.floor((Date.now() - createdAt) / 86400000) is onRead — pure arithmetic on one timestamp, "
      + "sub-microsecond, changes daily so caching would need daily invalidation anyway. Contrast with totalPortfolioValue "
      + "= sum of (quantity × currentPrice) across 2,000 linked Holdings, each requiring a link traversal to its Security for "
      + "the current price. At 50 reads/second, that's 100,000 link traversals/second. COUNTER-EXAMPLE of using onRead for "
      + "portfolioValue: every portfolio detail view, every list-table row, every dashboard card triggers 2,000 link "
      + "traversals — response time degrades from 50ms to 3 seconds, API timeouts cascade to the frontend. Caching reduces "
      + "this to one traversal per holding change. COUNTER-EXAMPLE of caching daysSinceCreation: you add invalidation "
      + "infrastructure (what triggers the cache refresh? a daily cron?) for a computation that takes microseconds. "
      + "Default to onRead; promote to cached only when profiling shows real latency problems.",
  },
  {
    id: "DH-LOGIC-07",
    question: "Is this derivation local (same object), connected 1-hop, connected multi-hop, or aggregation-based?",
    options: [
      {
        condition: "Computation uses only properties on the same object — no link traversal needed",
        choice: "local (0 hops)",
        reasoning: "Local derivation does NOT participate in the Impact Propagation Graph. It is pure computation on the object's own stored properties. Cheapest and simplest category.",
      },
      {
        condition: "Computation traverses exactly one link to read a property from a related entity",
        choice: "connected1hop (1 hop)",
        reasoning: "Single link traversal. Changes to the linked entity's property or the link itself trigger recomputation. Participates in the Impact Propagation Graph at depth 1.",
      },
      {
        condition: "Computation traverses 2-3 links or aggregates across a linked collection",
        choice: "connectedMultiHop / aggregation (2-3 hops)",
        reasoning: "Multi-hop traversal or collection aggregation. Limited to 3 hops by the SearchAround platform constraint. Beyond 3 hops, staged intermediate derived properties are required — each stage ≤3 hops.",
      },
    ],
    source: ".claude/research/palantir/data/derived-properties.md — Derivation Categories + Propagation Depth",
    realWorldExample:
      "Three tiers on a hospital system: (1) LOCAL: Patient.ageYears = (today - birthDate).years — 0 hops, pure computation, "
      + "does NOT participate in Impact Propagation. (2) CONNECTED 1-HOP: Patient.attendingDoctorName = Patient→Doctor.name — "
      + "1 link traversal, recomputes when Doctor.name changes or Patient's Doctor link changes. (3) MULTI-HOP: "
      + "Patient.hasActiveInsuranceClaim = Patient→Policies→Claims.some(status='Active') — 2 hops. COUNTER-EXAMPLE of "
      + "modeling a 4-hop derivation directly: Region→Hospital→Department→Doctor→Patient.count would require 4 hops, exceeding "
      + "the SearchAround limit of 3. The computation silently fails or times out. Fix: stage intermediate properties — "
      + "Department.doctorCount (1-hop aggregation), Hospital.totalDoctors (1-hop reading staged value), Region.totalDoctors "
      + "(1-hop reading staged value). Each stage stays within the 3-hop budget. COUNTER-EXAMPLE of classifying 1-hop "
      + "as local: if you mark Patient.attendingDoctorName as 'local', the Impact Propagation Graph won't track Doctor.name "
      + "changes — the derived property goes stale without anyone knowing.",
  },
  {
    id: "DH-LOGIC-08",
    question: "Is this a read-only computation (@Function) or a write-describing edit function (@OntologyEditFunction)?",
    options: [
      {
        condition: "The function reads data and returns a result without describing any state changes",
        choice: "function (@Function)",
        reasoning: "@Function is read-only. It computes values, validates conditions, formats data. It cannot create, modify, or delete objects. It is pure LOGIC — reasoning about data without affecting it.",
      },
      {
        condition: "The function traverses links and returns Edits[] describing what changes SHOULD happen — without committing them",
        choice: "editFunction (@OntologyEditFunction)",
        reasoning: "@OntologyEditFunction describes impact along the Impact Propagation Graph. It returns Edits[] (v2) or implicitly captures edits (v1). The Edits are a causality blueprint — they describe, not execute. The function-backed Action that wraps and commits is ACTION.",
      },
    ],
    source: ".claude/research/palantir/logic/functions.md — Function Taxonomy + SH-03 from semantics.ts",
    realWorldExample:
      "needsMaintenance(machine: Machine): boolean is a @Function — it reads vibration (4.5mm/s threshold), operatingHours "
      + "(2000h threshold), and daysSinceInspection (90-day threshold), applies the veteran machinist's weighted heuristic, "
      + "and returns true/false. No state changes. Contrast with closeIncidentAndResolveAlerts(incident: Incident) — an "
      + "@OntologyEditFunction that traverses incident.alerts.all(), sets each Alert.status='Resolved' and "
      + "Alert.resolvedAt=now(), then sets Incident.status='Closed'. It returns Edits[] describing all changes WITHOUT "
      + "committing. COUNTER-EXAMPLE of using @Function for closeIncident: @Function cannot create Edits — attempting to "
      + "modify alert.status inside a @Function causes a compile-time error (no @Edits declaration). The function would "
      + "silently do nothing. COUNTER-EXAMPLE of using @OntologyEditFunction for needsMaintenance: the runtime allocates "
      + "write permissions and edit tracking infrastructure for a function that never creates edits — wasted resources and "
      + "misleading semantics (consumers expect edits from an edit function). The boundary is SH-03: does it return Edits[] "
      + "(LOGIC) or commit them (ACTION)?",
  },
  {
    id: "DH-LOGIC-09",
    question: "Should this function target TypeScript v1 or v2 runtime?",
    options: [
      {
        condition: "New project starting in 2025+ with no existing v1 codebase to maintain",
        choice: "v2",
        reasoning: "v2 (GA July 2025) provides: EditBatch API (explicit batch.create/update/delete/link/unlink), interface support in functions, OSDK integration, deployed execution. Edit functions return Edits[] explicitly. This is the only actively developed path.",
      },
      {
        condition: "Existing v1 codebase with established patterns, or need for v1-only features (bring-your-own-model, authoring debugger)",
        choice: "v1",
        reasoning: "v1 provides class-based functions with private methods, authoring helper with debugger breakpoints, and bring-your-own-model support. Edit functions return void (implicit capture). v1 is maintenance-only — no new features.",
      },
    ],
    source: ".claude/research/palantir/logic/functions.md — Feature Support Matrix + v1/v2 Comparison",
    realWorldExample:
      "A 2026 SaveTicker project → v2. Benefits: EditBatch API enables batch.create(Stock, {ticker, name}), "
      + "batch.link(user, 'watchlist', stock) in a single transaction. Interface parameters let functions accept ISearchable "
      + "instead of concrete Stock/Article types. OSDK client generates type-safe function wrappers. COUNTER-EXAMPLE of "
      + "choosing v1 for a new project: no interface support means functions cannot accept polymorphic parameters, deployed "
      + "execution is unavailable (v1 is on-demand only with cold start latency), and OSDK integration requires v2. You'd "
      + "build on a maintenance-only runtime that receives no new features. COUNTER-EXAMPLE of migrating a 50-function v1 "
      + "codebase to v2: the class→module migration touches every file, private method composition patterns change, and "
      + "void→Edits[] return type changes cascade through all callers. Migration cost may exceed benefit if the codebase "
      + "is stable.",
  },
  {
    id: "DH-LOGIC-10",
    question: "During an edit function, should affected entities be found via search or link traversal?",
    options: [
      {
        condition: "Inside an edit function (@OntologyEditFunction) — finding entities to modify during a cascading edit",
        choice: "linkTraversal (always)",
        reasoning: "Direct link traversal (.alerts.all(), .department.get()) reads from the edit store, which reflects ALL changes made earlier in the same function. This is the ONLY safe way to find entities during cascading edits.",
      },
      {
        condition: "Outside edit functions — building UI queries, dashboard filters, or read-only data loading",
        choice: "search (safe outside edits)",
        reasoning: "Objects.search() is appropriate for UI queries and read-only contexts where eventual consistency is acceptable. The search index reflects committed state, not in-progress edits.",
      },
    ],
    source: ".claude/research/palantir/logic/functions.md + object-sets.md — Search Lag Constraint",
    realWorldExample:
      "ALWAYS link traversal inside edit functions: closeIncident(incident) traverses incident.alerts.all() to find all "
      + "alerts, sets each to 'Resolved'. Direct link traversal sees POST-edit state — if an earlier step in the same "
      + "function modified an alert, the traversal reflects that change. COUNTER-EXAMPLE — the paradigmatic failure: "
      + "closeIncident sets incident.status='Closed', then uses Objects.search().alert().filter(a => a.incidentId === "
      + "incident.id && a.status === 'Open') to find remaining open alerts. The search index still reflects PRE-edit state "
      + "(eventual consistency lag) — it returns the alerts that were JUST set to 'Resolved' moments ago, because the index "
      + "hasn't updated yet. The function incorrectly concludes there are still open alerts and either fails or creates "
      + "duplicate resolution edits. This is HC-LOGIC-08/09 — a platform architectural constraint, not a performance "
      + "preference. Search inside edit functions produces SILENTLY WRONG results.",
  },
  {
    id: "DH-LOGIC-11",
    question: "Should this query target a specific ObjectType, an Interface (polymorphic), or multi-type loading?",
    options: [
      {
        condition: "The consumer needs exactly one entity type with type-specific columns and behavior",
        choice: "typeSpecific",
        reasoning: "Type-specific queries return only the target ObjectType. Full access to all type-specific properties, links, and derived properties. Use for entity-dedicated views (Airport detail page, Vehicle list).",
      },
      {
        condition: "The consumer needs to operate across multiple types uniformly — same filters, same display columns, same actions",
        choice: "interfaceQuery",
        reasoning: "Interface queries return ALL implementing types via one query. Access is limited to interface-level properties and links. Use for cross-type dashboards, polymorphic search results, and impact analysis spanning heterogeneous entities.",
      },
      {
        condition: "The consumer needs a specific known subset of types loaded together, but NOT all implementors of an interface",
        choice: "multiTypeLoad",
        reasoning: "Multi-type loading fetches specific ObjectTypes in one API call. Use when you need Vehicles and Warehouses but NOT ContainerShips — more precise than interface query, more efficient than multiple type-specific queries.",
      },
    ],
    source: ".claude/research/palantir/data/interfaces.md + queries.md — Polymorphic Query Patterns",
    realWorldExample:
      "A logistics operations dashboard needs 'all assets requiring attention.' Assets include Vehicles, Warehouses, "
      + "ContainerShips, and Drones — all implementing IMonitorable with {status, lastChecked, priority}. Interface query: "
      + "Objects.search().monitorable().filter(m => m.status.exactMatch('NeedsAttention')) returns all four types in one "
      + "call, sorted by priority. COUNTER-EXAMPLE of using four type-specific queries: you'd make 4 API calls, merge "
      + "results manually, implement sorting across heterogeneous result sets, and add a new query every time a new asset "
      + "type is added. With the interface, new types implementing IMonitorable are automatically included. "
      + "COUNTER-EXAMPLE of using interface query when type-specific is needed: a Vehicle detail page needs "
      + "vehicle-specific properties (mileage, fuelType, licensePlate) that don't exist on IMonitorable. An interface "
      + "query would return only {status, lastChecked, priority} — losing all vehicle-specific data. Use type-specific "
      + "for entity-dedicated views; interface for cross-type operations.",
  },
  {
    id: "DH-LOGIC-12",
    question: "Which string/numeric/geo filter method for this query pattern?",
    options: [
      {
        condition: "Exact value match or ordered phrase — the user knows the precise value or token sequence",
        choice: "exactMatch / phrase",
        reasoning: "exactMatch for enum-like values (status, category codes). phrase for token-order-sensitive matching ('United States' ≠ 'States United'). Fastest filter methods — direct index lookup.",
      },
      {
        condition: "Partial input or autocomplete — the user is typing and expects suggestions",
        choice: "prefixOnLastToken / phrasePrefix",
        reasoning: "prefixOnLastToken matches all completed tokens plus a prefix on the last token ('John Sm' matches 'John Smith'). phrasePrefix is similar but preserves token order. Essential for search-as-you-type UIs.",
      },
      {
        condition: "Typo-tolerant input — the user may misspell words",
        choice: "fuzzyMatchAnyToken / fuzzyMatchAllTokens",
        reasoning: "Fuzzy matching uses edit distance to find approximate matches. fuzzyMatchAnyToken matches if ANY token is close; fuzzyMatchAllTokens requires ALL tokens to be close. Slower than exact/prefix but essential for real-world user input.",
      },
      {
        condition: "Numeric range, date range, or geospatial containment — the criterion is a boundary, not a value",
        choice: "range / geo filters",
        reasoning: "range().gt().lte() for numeric/date intervals. withinDistanceOf/withinPolygon/withinBoundingBox for geospatial. These are boundary-based predicates, not value-matching.",
      },
    ],
    source: ".claude/research/palantir/data/queries.md — Filtering by Property Type",
    realWorldExample:
      "A hospital patient search demonstrates all four tiers: (1) EXACT: Patient.bloodType.exactMatch('O-') — enum-like "
      + "value, no variation possible. (2) PREFIX: Patient.name.prefixOnLastToken('John Sm') — autocomplete as the nurse "
      + "types, matching 'John Smith', 'John Smythe'. (3) FUZZY: Patient.name.fuzzyMatchAllTokens('Jonh Smithh') — the "
      + "admitting nurse types fast with typos, fuzzy matching still finds the right patient. (4) RANGE: "
      + "Patient.admissionDate.range().gte('2026-01-01').lt('2026-04-01') for Q1 admissions. COUNTER-EXAMPLE of using "
      + "exactMatch for name search: 'John Smith' would NOT find 'john smith' (case mismatch) or 'John A. Smith' (extra "
      + "token). Patient goes unfound, duplicate record created. COUNTER-EXAMPLE of using fuzzy for bloodType: 'O-' "
      + "fuzzy-matched against the database might return 'O+' (edit distance 1) — a life-threatening medication error. "
      + "Enum values must use exactMatch; free-text values need prefix/fuzzy. A production search bar combines: "
      + "Filters.or(name.prefixOnLastToken(q), name.fuzzyMatchAnyToken(q), id.exactMatch(q)).",
  },
  {
    id: "DH-LOGIC-13",
    question: "Should this function be exposed as an LLM-callable tool (toolExposure)?",
    options: [
      {
        condition: "Function performs computation LLMs cannot reliably do — distance calculation, simulation, forecasting, optimization, deterministic validation",
        choice: "toolExposure: true",
        reasoning: "Pattern 2 (Logic Tool Handoff): LLMs hallucinate when asked to compute. Exposing the function as a tool lets the LLM delegate computation to a deterministic function, receiving the correct answer instead of approximating. Only expose functions with clear inputs, unambiguous outputs, and no side effects.",
      },
      {
        condition: "Function is internal helper, business-logic-specific, or its invocation requires context an LLM agent would not have",
        choice: "toolExposure: false (default)",
        reasoning: "Not all functions should be LLM-callable. Internal composition helpers, domain-specific edit functions, and functions requiring contextual knowledge (user session state, UI context) should remain internal. Over-exposing tools increases LLM decision complexity and error surface.",
      },
    ],
    source: ".claude/research/palantir/philosophy/llm-grounding.md — Pattern 2: Logic Tool Handoff + ontology-ultimate-vision.md §2",
    realWorldExample:
      "calculateHaversineDistance(pointA: GeoPoint, pointB: GeoPoint): number → toolExposure: true. An LLM asked 'Which "
      + "distribution center is closest to this stranded truck?' cannot reliably compute haversine distance — it will approximate "
      + "and likely get the wrong answer. By exposing this as a tool, the LLM invokes the deterministic function and gets the "
      + "exact distance. Similarly, computePortfolioVaR(holdings: Holding[], confidence: number): number → toolExposure: true, "
      + "because Value-at-Risk requires Monte Carlo simulation that LLMs cannot perform. COUNTER-EXAMPLE: "
      + "formatEmployeeName(first: string, last: string): string → toolExposure: false. An LLM can concatenate strings "
      + "perfectly well — exposing this as a tool adds unnecessary overhead. The litmus test: would an LLM give the WRONG answer "
      + "if it tried to compute this itself? If yes → toolExposure: true. If the LLM can do it correctly → false.",
  },
  // --- v1.3.0 addition (DevCon5/AIPCon9 gap closure — Refinement-Measurable Output) ---
  {
    id: "DH-LOGIC-14",
    question: "Should this function produce refinement-measurable output (outcome that can be compared against actual results for LEARN feedback)?",
    options: [
      {
        condition: "Function's output directly informs a decision that has a measurable real-world outcome — the output can be compared against what actually happened",
        choice: "Refinement-measurable: return typed prediction alongside confidence score",
        reasoning: "Functions that inform decisions feeding into REF-02 (Accuracy Measurement) must produce outputs that can be measured against actual outcomes. A typed prediction (e.g., { recommendation: string; confidence: number; predictedImpact: Record<string, number> }) enables the DH_REFINEMENT_PROTOCOL to calculate accuracy: was the prediction correct? This closes the LEARN backpropagation loop.",
      },
      {
        condition: "Function is a utility computation (formatting, validation, lookup) where output correctness is deterministic — no prediction to measure",
        choice: "Not refinement-measurable: standard return type, no confidence field",
        reasoning: "Deterministic functions (Haversine distance, string formatting, regex validation) produce correct answers by definition. There is no prediction to measure against actual outcomes. Adding confidence scores to deterministic functions adds noise to the refinement signal.",
      },
    ],
    source: ".claude/research/palantir/philosophy/digital-twin.md §LEARN Mechanisms + philosophy/tribal-knowledge.md §Decision Lineage as LEARN",
    realWorldExample:
      "A predictive maintenance function assessMaintenanceUrgency(vibration, hours, inspectionDays) returns { urgency: 'high', "
      + "confidence: 0.87, predictedFailureWindow: '7-14 days' }. When the actual failure occurs at day 9, the system compares: "
      + "predicted '7-14 days' vs actual '9 days' → prediction was correct within window, confidence 0.87 was well-calibrated. "
      + "Over 200 predictions, accuracy is 84% — the DH that informed this function (DH-LOGIC-05 vibration threshold) is validated. "
      + "If accuracy drops below 70%, REF-03 (Drift Detection) flags DH-LOGIC-05 for expert review. "
      + "COUNTER-EXAMPLE: Making calculateHaversineDistance refinement-measurable — distance between two GPS points is mathematically "
      + "exact. There is no 'predicted vs actual' comparison possible. Adding a confidence field (confidence: 1.0 always) pollutes the "
      + "refinement signal with 100% accuracy readings that teach the system nothing. Only PREDICTIVE functions with uncertain outcomes "
      + "should be refinement-measurable. "
      + "COUNTER-EXAMPLE: Omitting confidence from assessMaintenanceUrgency — the system records 'urgency: high' but cannot "
      + "distinguish between a confident prediction (0.95) and a borderline guess (0.52). When the prediction is wrong, there's no "
      + "signal to tell REF-03 whether the DH threshold was fundamentally wrong or the input was an edge case. Confidence is the "
      + "calibration signal that makes accuracy measurement meaningful.",
  },
] as const;

// =========================================================================
// Section 5: Mapping Tables
// =========================================================================

/** Valid backing mechanisms per link cardinality. Source: links.md §Cardinality Decision Matrix */
export const CARDINALITY_TO_BACKING: Readonly<Record<LinkCardinality, readonly LinkBackingMechanism[]>> = {
  "1:1": ["foreignKey"],
  "M:1": ["foreignKey"],
  "1:M": ["foreignKey"],
  "M:N": ["joinTable", "objectBacked"],
};

/** Hop range per derivation category. Source: derived-properties.md §Propagation Depth */
export const DERIVATION_CATEGORY_TO_HOP_RANGE: Readonly<Record<DerivationCategory, { readonly min: number; readonly max: number }>> = {
  local: { min: 0, max: 0 },
  connected1hop: { min: 1, max: 1 },
  connectedMultiHop: { min: 2, max: 3 },
  aggregation: { min: 1, max: 3 },
};

/** Constraints per function kind. Source: functions.md §Function Taxonomy */
export const FUNCTION_KIND_TO_CONSTRAINTS: Readonly<Record<FunctionKind, {
  readonly purity: string;
  readonly sideEffects: boolean;
  readonly returnType: string;
}>> = {
  function: { purity: "readOnly", sideEffects: false, returnType: "any" },
  editFunction: { purity: "readWrite", sideEffects: true, returnType: "void (v1) | Edits[] (v2)" },
  query: { purity: "readOnly", sideEffects: false, returnType: "any" },
  modelFunction: { purity: "deterministic", sideEffects: false, returnType: "custom" },
  transactionFunction: { purity: "readWrite", sideEffects: true, returnType: "any (edits auto-staged, no Edits[] return required)" },
};

/** Filter/ordering/aggregation support per query type. Source: queries.md */
export const QUERY_TYPE_TO_FILTER_SUPPORT: Readonly<Record<QueryType, {
  readonly filtering: boolean;
  readonly ordering: boolean;
  readonly aggregation: boolean;
}>> = {
  list: { filtering: false, ordering: true, aggregation: false },
  getById: { filtering: false, ordering: false, aggregation: false },
  filter: { filtering: true, ordering: true, aggregation: false },
  search: { filtering: true, ordering: true, aggregation: false },
  paginated: { filtering: true, ordering: true, aggregation: false },
  aggregation: { filtering: true, ordering: false, aggregation: true },
  searchAround: { filtering: true, ordering: true, aggregation: false },
};

/** Whether each access method sees post-edit state during function execution. Source: object-sets.md §Search Lag */
export const SEARCH_SEES_EDITS: Readonly<Record<string, boolean>> = {
  linkGet: true,
  linkAll: true,
  objectsSearch: false,
  objectSetAggregate: false,
};

/** @Edits declaration requirements per edit type. Source: functions.md §@Edits Provenance */
export const EDIT_TYPE_TO_EDITS_DECLARATION: Readonly<Record<string, string>> = {
  propertyEdit: "Declare the ObjectType being modified",
  singleLinkEdit: "Declare the ObjectType with the FK",
  joinLinkEdit: "Declare BOTH source AND target ObjectTypes",
};

/** v1→v2 link traversal API migration mapping. Source: links.md §Link Type Migration */
export const LINK_TRAVERSAL_V1_TO_V2: Readonly<Record<string, {
  readonly v1: string;
  readonly v2: string;
  readonly returnType: string;
}>> = {
  singleGet: { v1: "object.link.get()", v2: "object.$link.linkName.fetchOne()", returnType: "T | undefined → Promise<T>" },
  singleGetAsync: { v1: "object.link.getAsync()", v2: "object.$link.linkName.fetchOneWithErrors()", returnType: "Promise<T> → Promise<Result<T>>" },
  multiAll: { v1: "object.link.all()", v2: "object.$link.linkName.fetchPage({ $pageSize })", returnType: "T[] → Promise<Page<T>>" },
  setTraversal: { v1: "objectSet.searchAroundToType()", v2: "client(Type).where({...}).pivotTo(OtherType)", returnType: "ObjectSet → ObjectSet (lazy)" },
};

/**
 * Function runtime v1 vs v2 feature support matrix.
 * Source: functions.md §Feature Support Matrix + v1/v2 Comparison
 */
export interface RuntimeFeatureEntry {
  readonly feature: string;
  readonly v1: boolean | "partial";
  readonly v2: boolean | "partial";
  readonly note?: string;
}

export const FUNCTION_RUNTIME_FEATURES: readonly RuntimeFeatureEntry[] = [
  { feature: "EditBatch API (explicit batch.create/update/delete/link/unlink)", v1: false, v2: true },
  { feature: "Interface parameters in functions", v1: false, v2: true },
  { feature: "OSDK integration (type-safe client wrappers)", v1: false, v2: true },
  { feature: "Deployed execution (always-warm, no cold start)", v1: false, v2: true },
  { feature: "Class-based functions with private methods", v1: true, v2: false, note: "v2 uses module-level imports instead" },
  { feature: "Authoring helper with debugger breakpoints", v1: true, v2: false },
  { feature: "Bring-your-own-model (BYOM)", v1: true, v2: false, note: "v2 uses Model Functions instead" },
  { feature: "Edit functions return Edits[] explicitly", v1: false, v2: true, note: "v1 returns void (implicit capture)" },
  { feature: "Async link traversal", v1: false, v2: true },
  { feature: "Writeback dataset flow", v1: true, v2: true },
  { feature: "Runtime Derived Properties (withProperties())", v1: false, v2: true },
] as const;

/**
 * Edit collapse and ordering rules — how the platform merges multiple edits.
 * Source: functions.md §Edit Capture Behavior
 *
 * Freudenthal's paradigmatic example: Two edits on the same Alert object within one function call:
 *   batch.update(alert, { status: "Resolved" });
 *   batch.update(alert, { resolvedAt: now() });
 * These collapse into ONE edit operation: update alert { status: "Resolved", resolvedAt: now() }.
 * The platform does NOT apply them sequentially — it merges property assignments into a single write.
 *
 * Counter-example of why ordering matters for links:
 *   batch.unlink(patient, "doctor", drSmith);   // remove old doctor
 *   batch.link(patient, "doctor", drJones);      // assign new doctor
 * These are TWO distinct edit operations that CANNOT collapse (different targets).
 * If reordered (link then unlink), the patient would end up with NO doctor.
 */
export const EDIT_COLLAPSE_RULES = {
  /** Multiple property edits on the same object in the same function collapse into one edit operation. */
  PROPERTY_EDITS_COLLAPSE: true,
  /** Link operations (link/unlink) on different targets do NOT collapse and preserve execution order. */
  LINK_OPS_PRESERVE_ORDER: true,
  /** Create + subsequent property edits on the same new object collapse into a single create-with-properties. */
  CREATE_THEN_UPDATE_COLLAPSES: true,
  /** Delete after modify is allowed — the delete wins, modifications are discarded. */
  MODIFY_THEN_DELETE_ALLOWED: true,
  /** Create then delete in the same function results in a no-op (both edits cancel). */
  CREATE_THEN_DELETE_NOOP: true,
} as const;

// =========================================================================
// Section 6: Structural Rules
// =========================================================================

/** Naming and structural rules for LOGIC domain artifacts. */
export const STRUCTURAL_RULES: readonly StructuralRule[] = [
  {
    target: "Link API name",
    casing: "camelCase",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/data/links.md §API Name Rules",
  },
  {
    target: "Interface API name",
    casing: "PascalCase",
    pattern: "^I?[A-Z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/data/interfaces.md §Naming",
  },
  {
    target: "Query API name",
    casing: "camelCase",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/data/queries.md §API Naming",
  },
  {
    target: "Derived property API name",
    casing: "camelCase",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/data/derived-properties.md §Naming",
  },
  {
    target: "Function API name",
    casing: "camelCase",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/logic/functions.md §Canonical Constraints",
  },
] as const;

/** Output file for LOGIC domain generation. Source: SKILL.md pattern */
export const OUTPUT_FILE = "ontology/logic.ts" as const;

// =========================================================================
// Section 7: Validation Thresholds
// =========================================================================

/** Numeric thresholds for LOGIC domain validation. */
export const VALIDATION_THRESHOLDS = {
  /** Maximum SearchAround hops per traversal chain. Source: architecture/ontology-model.md §ARCH-39 */
  SEARCH_AROUND_MAX_HOPS: 3,
  /** Maximum objects from ObjectSet .all(). Source: architecture/ontology-model.md §ARCH-39 */
  OBJECT_SET_ALL_MAX: 100_000,
  /** Performance timeout risk threshold. Source: object-sets.md */
  OBJECT_SET_TIMEOUT_RISK: 10_000,
  /** Maximum aggregation buckets. Source: architecture/ontology-model.md §ARCH-39 */
  AGGREGATION_MAX_BUCKETS: 10_000,
  /** .topValues() becomes approximate above this. Source: queries.md */
  TOP_VALUES_APPROXIMATE: 1_000,
  /** OSv2 SearchAround result set maximum. Source: links.md */
  SEARCH_AROUND_OSV2_MAX: 10_000_000,
  /** OSv1 SearchAround result set maximum. Source: links.md */
  SEARCH_AROUND_OSV1_MAX: 100_000,
  /** Model function max input/output in MB. Source: functions.md */
  MODEL_FUNCTION_MAX_IO_MB: 50,
  /** Model function max execution seconds. Source: functions.md */
  MODEL_FUNCTION_MAX_SECONDS: 30,
  /** Maximum API name length. Source: links.md, functions.md */
  API_NAME_MAX_LENGTH: 100,
  /** v2 runtime max vCPUs. Source: functions.md */
  MAX_V2_VCPUS: 8,
  /** v2 runtime max memory in GB. Source: functions.md */
  MAX_V2_MEMORY_GB: 5,
  /** Temporary ObjectSet expiration in hours. Source: queries.md */
  TEMPORARY_OBJECT_SET_EXPIRY_HOURS: 24,
} as const;

// =========================================================================
// Section 8: Hard Constraints
// =========================================================================

/**
 * HC-LOGIC-01..04 are defined in LOGIC_SEMANTICS.hardConstraints (semantics.ts).
 * HC-LOGIC-05..37 extend with domain-specific constraints from research files.
 * All are severity="error" and domain="logic".
 */
export const LOGIC_HARD_CONSTRAINTS: readonly HardConstraint[] = [
  // --- Inherited from semantics.ts (re-exported for single-file access) ---
  ...LOGIC_SEMANTICS.hardConstraints,

  // --- Link constraints ---
  {
    id: "HC-LOGIC-05",
    domain: "logic",
    rule: "Cross-ontology links are NOT supported — links connect objects within the same Ontology only",
    severity: "error",
    source: ".claude/research/palantir/data/links.md",
    rationale: "The platform resolves links via shared datasource references. Cross-ontology links would require cross-boundary datasource resolution, which is not supported. Organizations needing cross-boundary relationships must use shared Ontologies.",
  },
  {
    id: "HC-LOGIC-06",
    domain: "logic",
    rule: "Function rule is exclusive — no other rules (create, modify, delete) allowed when a function rule is present in an Action",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — Function Rule Exclusivity",
    rationale: "When a function rule is present, the function takes full responsibility for all edits. Mixing simple rules with function rules creates ambiguous ownership of state changes — the platform cannot determine which rule produced which edit.",
  },
  {
    id: "HC-LOGIC-07",
    domain: "logic",
    rule: "$validateOnly and $returnEdits are mutually exclusive — cannot use both in same request",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — Validate-then-Execute",
    rationale: "$validateOnly checks constraints without computing edits; $returnEdits computes edits without committing. These are different modes of non-execution and cannot be combined in a single API call.",
  },

  // --- Search lag constraints ---
  {
    id: "HC-LOGIC-08",
    domain: "logic",
    rule: "Within function execution, Objects.search() sees PRE-edit state — the search index has not yet been updated",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md + object-sets.md — Search Lag Constraint",
    rationale: "Search indexes update asynchronously after function completion. During execution, the search index reflects the state BEFORE any edits in the current function. Relying on search for recently-modified entities produces silently wrong results.",
  },
  {
    id: "HC-LOGIC-09",
    domain: "logic",
    rule: "Direct link traversal (.get(), .all()) sees POST-edit state — reads from the edit store, not the search index",
    severity: "error",
    source: ".claude/research/palantir/logic/object-sets.md — Search Lag Constraint",
    rationale: "Link traversal reads from the edit store which includes all changes made earlier in the same function. This is the ONLY reliable way to access modified entities during cascading edits.",
  },

  // --- Edit function constraints ---
  {
    id: "HC-LOGIC-10",
    domain: "logic",
    rule: "@Edits decorator must declare ALL object types and link types modified by the edit function",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — @Edits Provenance Rules",
    rationale: "The platform uses @Edits declarations for provenance tracking and permission checking. Undeclared modifications are rejected at runtime. For join links, BOTH source AND target types must be declared.",
  },
  {
    id: "HC-LOGIC-11",
    domain: "logic",
    rule: "v1 edit functions must return void (implicit edit capture); v2 edit functions must return Edits[] (explicit)",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — v1/v2 Taxonomy",
    rationale: "The runtime versions have incompatible edit capture mechanisms. v1 captures edits implicitly through property assignments; v2 requires explicit Edits[] return. Mixing patterns causes type errors or silent edit loss.",
  },

  // --- Model function constraints ---
  {
    id: "HC-LOGIC-12",
    domain: "logic",
    rule: "Model functions must be deterministic — same inputs must always produce same output, no data loading, no side effects",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — Model Functions",
    rationale: "Model functions wrap ML models for deterministic inference. Data loading would introduce non-determinism (data changes). Side effects would violate the purity contract. The platform enforces these constraints for reproducibility.",
  },
  {
    id: "HC-LOGIC-13",
    domain: "logic",
    rule: "Model function maximum 50 MB input/output payload",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — Canonical Constraints",
    rationale: "Memory and network boundary limit for model inference. Exceeding 50MB causes serialization failure or OOM during function invocation.",
  },
  {
    id: "HC-LOGIC-14",
    domain: "logic",
    rule: "Model function maximum 30 seconds execution time",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — Canonical Constraints",
    rationale: "Determinism requirement — model inference must complete within a bounded time. Exceeding 30 seconds causes forced termination and rollback.",
  },

  // --- Edit operation constraints ---
  {
    id: "HC-LOGIC-15",
    domain: "logic",
    rule: "Primary keys cannot be updated on existing objects within edit operations",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md + data/entities.md — PK Immutability",
    rationale: "PKs are used for object identity, link resolution, and index lookups. Updating a PK would orphan all downstream references. The platform rejects PK updates at runtime.",
  },

  // --- ObjectSet constraints ---
  {
    id: "HC-LOGIC-16",
    domain: "logic",
    rule: "Set operations (union, intersect, subtract) only work on sets of the SAME object type",
    severity: "error",
    source: ".claude/research/palantir/data/queries.md — Set Operations",
    rationale: "Set algebra requires type homogeneity. Union of Employees and Departments is undefined — the result set would have heterogeneous schemas. Use interface queries for cross-type operations.",
  },
  {
    id: "HC-LOGIC-17",
    domain: "logic",
    rule: "MultiLink cannot be converted directly to an ObjectSet — must convert via object → objectSet → searchAroundToOtherType",
    severity: "error",
    source: ".claude/research/palantir/logic/object-sets.md",
    rationale: "The type system distinguishes between link accessors (typed single/multi) and ObjectSets (untyped collections). Direct conversion is not supported; the API requires explicit conversion through the object set service.",
  },

  // --- Derived property constraints ---
  {
    id: "HC-LOGIC-18",
    domain: "logic",
    rule: "Derived properties cannot depend on other derived properties — no derivation chains (flatten to stored properties only)",
    severity: "error",
    source: ".claude/research/palantir/data/derived-properties.md — extends HC-LOGIC-03",
    rationale: "Derivation chains create implicit dependency ordering that the platform cannot resolve. Property A depending on derived B depending on derived C creates evaluation order ambiguity and potential infinite loops. Flatten to stored properties.",
  },
  {
    id: "HC-LOGIC-19",
    domain: "logic",
    rule: "Derived property computeFn must be pure — no I/O, no async, no external calls, no side effects",
    severity: "error",
    source: ".claude/research/palantir/data/derived-properties.md — Local Derivation",
    rationale: "computeFn executes inline with every read. I/O or async operations would block reads, introduce non-determinism, and potentially cause cascading timeouts. The function must be a synchronous pure computation.",
  },

  // --- FK placement constraint ---
  {
    id: "HC-LOGIC-20",
    domain: "logic",
    rule: "FK field must live on the 'many' side of a 1:M or M:1 relationship — never on the 'one' side",
    severity: "error",
    source: ".claude/research/palantir/data/links.md — Foreign Key Rules",
    rationale: "Placing FK on the 'one' side would require an array of FKs (violating scalar FK constraint) or lose M-side references. For M:1 Employee→Department, departmentId lives on Employee (the many side), not on Department.",
  },

  // --- Interface constraints ---
  {
    id: "HC-LOGIC-21",
    domain: "logic",
    rule: "Interface link constraint: implementing link must match or exceed the constraint's cardinality — MANY constraint cannot be satisfied by ONE link",
    severity: "error",
    source: ".claude/research/palantir/data/interfaces.md — Implementation Satisfaction",
    rationale: "A MANY cardinality constraint guarantees that the implementing type can hold multiple targets. A ONE link physically cannot hold multiple targets. ONE satisfies ONE; MANY satisfies MANY. ONE does NOT satisfy MANY.",
  },

  // --- Object-backed link prerequisites ---
  {
    id: "HC-LOGIC-22",
    domain: "logic",
    rule: "Object-backed link requires: two endpoint ObjectTypes + one intermediary backing ObjectType + M:1 links from each endpoint to the backing type",
    severity: "error",
    source: ".claude/research/palantir/data/links.md — Object-Backed Links",
    rationale: "The platform resolves object-backed links through the intermediary. Missing endpoints, missing intermediary, or incorrect cardinality on the backing links causes link resolution failure at runtime.",
  },

  // --- Temporary ObjectSet ---
  {
    id: "HC-LOGIC-23",
    domain: "logic",
    rule: "Temporary ObjectSets expire after 24 hours — they cannot be used as permanent references",
    severity: "error",
    source: ".claude/research/palantir/data/queries.md — Object Set Types",
    rationale: "Temporary ObjectSets are designed for service handoff workflows (e.g., passing a filtered set to another service). They are garbage-collected after 24 hours. Use static or dynamic ObjectSets for permanent references.",
  },

  // --- API naming ---
  {
    id: "HC-LOGIC-24",
    domain: "logic",
    rule: "All LOGIC domain API names: lowerCamelCase, alphanumeric, 1-100 characters, unique within scope, NFKC normalized",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — Canonical Constraints",
    rationale: "Platform-enforced naming format. Non-conforming names are rejected at schema compilation. NFKC normalization prevents Unicode homoglyph attacks. Uniqueness scope: per object type for links/properties, global for functions.",
  },

  // --- Derived property name collision ---
  {
    id: "HC-LOGIC-25",
    domain: "logic",
    rule: "Derived property apiName must NOT collide with any stored property name on the same ObjectType",
    severity: "error",
    source: ".claude/research/palantir/data/derived-properties.md — Naming",
    rationale: "The OSDK generates typed accessors for both stored and derived properties on the same object type. Name collisions cause compile-time errors in generated code and ambiguous API semantics.",
  },

  // --- Model function type constraints ---
  {
    id: "HC-LOGIC-26",
    domain: "logic",
    rule: "Model function parameters cannot accept ontology objects (Objects, ObjectSets) — must use individual scalar parameters per property",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — Model Functions: Input parameter constraints",
    rationale: "Model functions enforce determinism by never loading data themselves. Accepting an Object parameter would allow implicit data loading (traversing links, reading properties not passed). Individual scalar parameters make all inputs explicit and auditable.",
  },
  {
    id: "HC-LOGIC-27",
    domain: "logic",
    rule: "Model function output must be an anonymous custom type with primitive fields — aggregation types, ontology types, and notifications are not allowed",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — Model Functions: Allowed/disallowed types",
    rationale: "Model functions are wrappers around ML model inference. The output must be serializable as primitive fields. Ontology types (Objects, ObjectSets) would imply side effects (creating entities). Aggregation types would imply querying. Both violate the determinism contract.",
  },

  // --- Query/Function decorator exclusivity (v1) ---
  {
    id: "HC-LOGIC-28",
    domain: "logic",
    rule: "@Query and @Function decorators are mutually exclusive on the same method (v1) — a function cannot be both a published query and a standard function",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — Query Functions",
    rationale: "@Query exposes the function through the API gateway with an apiName. @Function publishes it to the platform without API exposure. Applying both creates ambiguous routing — is it API-callable or platform-internal? The v1 runtime rejects dual-decorated methods.",
  },

  // --- Edit function execution constraint ---
  {
    id: "HC-LOGIC-29",
    domain: "logic",
    rule: "Edit function edits only apply when configured as function-backed Actions — the authoring helper and direct invocation do NOT commit edits to the Ontology",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — Edit Functions",
    rationale: "Edit functions produce Edits[] (descriptions of changes), but those edits are only committed when wrapped in an Action and submitted through the Action execution pipeline. Running an edit function in the authoring helper captures and displays edits but does NOT apply them. This is a fundamental architectural boundary between LOGIC (describe) and ACTION (execute).",
  },

  // --- Version pinning ---
  {
    id: "HC-LOGIC-30",
    domain: "logic",
    rule: "Functions always use the latest tagged version — no semantic versioning support. For breaking changes, create new functions with distinct API names.",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — Version Pinning",
    rationale: "The platform does not support semantic version pinning for functions. All consumers invoke the latest tagged version. Breaking signature changes must use new API names to avoid cascading failures across all callers.",
  },

  // --- Model function ontology binding ---
  {
    id: "HC-LOGIC-31",
    domain: "logic",
    rule: "Model functions (February 2026+) must be tied to an ontology — unbound models cannot be wrapped as functions in v2 or Python runtimes",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md — Model Functions: Ontology binding requirement",
    rationale: "Ontology binding ensures the model's input/output schema is consistent with the ontology's property types. Without binding, the model cannot be type-checked against the ontology, and v2/Python function wrappers cannot generate typed parameters.",
  },

  // --- Ontology Transactions (Beta 2026) ---
  {
    id: "HC-LOGIC-32",
    domain: "logic",
    rule: "Transaction functions provide read-after-write guarantee — Ontology queries within the transaction reflect all previously staged edits",
    severity: "error",
    source: "Palantir docs — typescript-v2-ontology-transactions (2026 Beta)",
    rationale: "This is the KEY difference from regular edit functions (HC-LOGIC-08/09). Transaction functions use WriteableClient and stage edits in a transaction that is visible to subsequent queries within the same function. Regular edit functions see PRE-edit state via search. Transaction functions solve the search-lag problem at the cost of requiring Beta opt-in.",
  },
  {
    id: "HC-LOGIC-33",
    domain: "logic",
    rule: "Transaction functions do NOT require returning Edits[] — edits are automatically staged and committed when the function completes",
    severity: "error",
    source: "Palantir docs — typescript-v2-ontology-transactions (2026 Beta)",
    rationale: "Unlike regular v2 edit functions (HC-LOGIC-11 requires Edits[] return), transaction functions auto-stage all edits made through WriteableClient.create/update/delete/link/unlink. The return value is freed for other data. This is an exception to HC-LOGIC-11 for the transactionFunction kind.",
  },
  {
    id: "HC-LOGIC-34",
    domain: "logic",
    rule: "Interface edits are NOT supported in transaction functions",
    severity: "error",
    source: "Palantir docs — typescript-v2-ontology-transactions (2026 Beta) — Known limitations",
    rationale: "Transaction functions use WriteableClient which operates on concrete ObjectTypes only. Interface-level edits (Edits.Interface<I>) require the standard EditBatch pattern. This limits polymorphic edit patterns in transaction contexts.",
  },
  // --- v1.3.0 additions (research deep dive 2026-03-15) ---
  {
    id: "HC-LOGIC-35",
    domain: "logic",
    rule: "Functions can invoke LLMs during execution — LLM responses are part of function output, grounded by ontology context, not hallucinated context",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md §Language Models in Functions",
    rationale: "LLM invocation within functions enables Pattern 2 (Logic Tool Handoff) at a deeper level: the function itself orchestrates LLM reasoning over ontology data. The LLM response is constrained by the function's typed return type, preventing hallucinated structure.",
  },
  {
    id: "HC-LOGIC-36",
    domain: "logic",
    rule: "Function metrics are built-in — invocation count, latency, error rates, and custom counters are available without manual instrumentation",
    severity: "error",
    source: ".claude/research/palantir/logic/functions.md §Function Metrics/Monitoring/Telemetry",
    rationale: "The platform automatically captures function execution telemetry. This feeds LEARN-03 (decision outcome tracking) by providing measurable performance data for each function invocation, enabling accuracy-based graduation (LGC-01).",
  },
  // --- v1.3.0 addition (DevCon5/AIPCon9 gap closure — toolExposure constraints) ---
  {
    id: "HC-LOGIC-37",
    domain: "logic",
    rule: "Functions with toolExposure=true must have fully typed return values — `any` or untyped returns prevent agent composition verification and LEARN outcome measurement",
    severity: "error",
    source: ".claude/research/palantir/philosophy/llm-grounding.md §Ontology-Grounded Agents + semantics.ts §23 AGENT_COMPOSITION_PROTOCOL",
    rationale: "Agent composition (ACP-02) relies on typed function outputs to chain tool calls. If a toolExposure=true function returns `any`, the agent cannot verify that the output matches the next step's expected input. Additionally, LEARN refinement (REF-02) requires typed predictions to measure accuracy — untyped outputs cannot be compared against actual outcomes.",
  },
] as const;

/** Total hard constraint count (semantics + domain-specific). */
export const HARD_CONSTRAINT_COUNT = LOGIC_HARD_CONSTRAINTS.length;

// =========================================================================
// Section 9: Tool Exposure Requirements (v1.3.0)
// =========================================================================
//
// When a function is marked toolExposure=true, it becomes an LLM-callable tool
// (HRP-02). These requirements ensure the function is safe and useful for
// agent composition (ACP-02) and refinement measurement (REF-02).
//
// Source: semantics.ts §17 AGENTIC_WORKFLOW_PATTERNS
//         semantics.ts §23 AGENT_COMPOSITION_PROTOCOL
//         semantics.ts §22 DH_REFINEMENT_PROTOCOL

export interface ToolExposureRequirement {
  readonly id: string;
  readonly requirement: string;
  readonly rationale: string;
}

export const TOOL_EXPOSURE_REQUIREMENTS: readonly ToolExposureRequirement[] = [
  {
    id: "TER-01",
    requirement: "Fully typed return value — no `any`, `unknown`, or unresolved generics",
    rationale: "Agent composition (ACP-02) chains function outputs to subsequent inputs. Untyped returns break the chain verification. LEARN refinement (REF-02) requires typed predictions for accuracy measurement.",
  },
  {
    id: "TER-02",
    requirement: "No side effects — function must not modify ontology state, call external APIs, or trigger webhooks",
    rationale: "LLM agents may invoke tools speculatively during reasoning. Side-effecting tools would cause unintended mutations on exploratory calls. Tools must be read-only (LOGIC, not ACTION).",
  },
  {
    id: "TER-03",
    requirement: "Documented parameters with semantic descriptions — each parameter must have a human-readable description",
    rationale: "LLM agents use parameter descriptions to determine which tool to invoke and with what inputs. Undocumented parameters force the LLM to guess, increasing hallucination risk.",
  },
  {
    id: "TER-04",
    requirement: "Bounded execution time — tool functions should complete within 5 seconds for interactive agent workflows",
    rationale: "Agent composition chains multiple tool calls sequentially. A 30-second function blocks the entire reasoning chain. Interactive workflows require sub-5-second tool response for acceptable UX.",
  },
] as const;

// =========================================================================
// Section 10: Scenario Trade-off Computation Pattern (v1.3.0)
// =========================================================================
//
// When SCENARIOS_FRAMEWORK (semantics.ts §21) generates COAs, the trade-off
// quantification (SCN-02) is performed by LOGIC functions. This pattern defines
// the typed shape of trade-off computation functions.
//
// Source: semantics.ts §21 SCENARIOS_FRAMEWORK
//         platform/aipcon.md §APC9-03 — ShipOS 3-COA trade-offs

export interface ScenarioTradeoffDimension {
  readonly id: string;
  readonly dimension: string;
  readonly unit: string;
  readonly direction: "minimize" | "maximize";
  readonly computedBy: string;
}

export const SCENARIO_TRADEOFF_PATTERN: readonly ScenarioTradeoffDimension[] = [
  {
    id: "STD-01",
    dimension: "Schedule Impact",
    unit: "days",
    direction: "minimize",
    computedBy: "LOGIC function traversing Impact Propagation Graph to compute cascading schedule delays",
  },
  {
    id: "STD-02",
    dimension: "Cost Impact",
    unit: "dollars",
    direction: "minimize",
    computedBy: "LOGIC function aggregating direct costs + opportunity costs + carrying costs across affected entities",
  },
  {
    id: "STD-03",
    dimension: "Risk Score",
    unit: "0-100 normalized",
    direction: "minimize",
    computedBy: "LOGIC function combining probability of adverse outcome × severity across downstream dependencies",
  },
] as const;
