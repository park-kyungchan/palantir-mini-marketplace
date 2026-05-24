/**
 * SECURITY Domain Schema — Ontology Schema Redesign §4.1 (Governance Overlay)
 *
 * Self-sufficient schema for the SECURITY governance overlay. Security is NOT
 * a 4th semantic domain — it governs all three domains (DATA, LOGIC, ACTION)
 * as a cross-cutting access control layer.
 *
 * Four-layer model (RBAC + Markings + Object Security + Cell-Level):
 *   Layer 1: RBAC (Roles) — resource-type-level permission
 *   Layer 2: Markings (CBAC) — classification-based instance-level access
 *   Layer 3: Object Security (RLS/CLS) — row and column-level enforcement
 *   Layer 4: Cell-Level Security — property-level visibility policies
 *
 * Authority:
 *   - builder/fact boundary: .claude/research/palantir-developers/BROWSE.md
 *     -> .claude/research/palantir-foundry/architecture/security-overview.md
 *   - exact pre-split SECURITY semantics: resolve legacy citations through
 *     ../research-source-map.ts to the archive bridge under
 *     .claude/research/_archive/2026-04-20-palantir-consolidation/security/
 * Dependency: ../types.ts (Role, Marking, RLSPolicy, CLSPolicy, ObjectSecurityPolicy)
 *
 * Sections:
 *   1. Security Identity — governance overlay definition
 *   2. Type Definitions — re-exports + new security types
 *   3. Enumeration Constants — layers, scopes, enforcement points
 *   4. Decision Heuristics — 9 security-choice heuristics (DH-SEC-*)
 *   5. Mapping Tables — layer→enforcement, scope→effect, resource→actions
 *   6. Structural Rules — naming patterns for roles, markings, policies
 *   7. Validation Thresholds — numeric limits
 *   8. Hard Constraints — HC-SEC-01..22
 */

import type { HardConstraint } from "../semantics";
import type {
  BilingualDesc,
  StructuralRule,
  Role,
  PermissionEntry,
  Marking,
  RLSPolicy,
  CLSPolicy,
  ObjectSecurityPolicy,
  OntologySecurity,
  CrudOperation,
  MarkingType,
  PermissionModel,
  MarkingCategoryVisibility,
} from "../types";

export type { HardConstraint };
export type {
  BilingualDesc,
  StructuralRule,
  Role,
  PermissionEntry,
  Marking,
  RLSPolicy,
  CLSPolicy,
  ObjectSecurityPolicy,
  OntologySecurity,
  CrudOperation,
  MarkingType,
  PermissionModel,
  MarkingCategoryVisibility,
};

// =========================================================================
// Section 1: Security Identity
// =========================================================================

/** Security layer in the four-layer access control model (upgraded from 3-layer in v1.3.0). */
export type SecurityLayer = "rbac" | "markings" | "objectSecurity" | "cellLevel";

/** Scope at which markings apply. */
export type MarkingScope = "object" | "property" | "dataset";

/** Granularity of permission resolution. */
export type PermissionResolutionLevel =
  | "directUser"
  | "directGroup"
  | "inheritedGroup"
  | "multipassAttribute";

/** Points where CLS (column-level security) is enforced. */
export type CLSEnforcementPoint =
  | "objectLoading"
  | "propertyAccess"
  | "searchFilter"
  | "export"
  | "functionExecution";

/** Resource types that RBAC roles govern. */
export type PermissionResourceType =
  | "objectType"
  | "linkType"
  | "actionType"
  | "function"
  | "interface";

/** Mandatory control types available in OSv2. */
export type MandatoryControlType = "markings" | "organizations" | "classifications";

/** Marking permission actions. */
export type MarkingPermissionAction = "manage" | "apply" | "remove" | "members";

/** Security governance overlay identity. NOT a DomainSemantics — security is cross-cutting. */
export interface SecurityIdentity {
  readonly role: string;
  readonly semanticQuestion: string;
  readonly description: string;
  readonly analogy: string;
  readonly governedDomains: readonly ("data" | "logic" | "action")[];
  readonly commercialExamples: readonly {
    readonly sector: string;
    readonly concept: string;
    readonly reasoning: string;
  }[];
}

/** Schema version for SECURITY domain. */
export const SCHEMA_VERSION = "1.4.0" as const;

export const SECURITY_IDENTITY: SecurityIdentity = {
  role: "Governance overlay — controls WHO can access WHAT across all three semantic domains",
  semanticQuestion: "Does this control access, permissions, classification, or visibility of ontology resources?",
  description:
    "SECURITY is a governance overlay that cross-cuts DATA, LOGIC, and ACTION. It does not own "
    + "entities, relationships, or mutations — it governs who can see, traverse, and execute them. "
    + "The four-layer model (RBAC → Markings → Object Security → Cell-Level Policies) provides defense in depth: each "
    + "layer independently restricts access, and all layers must permit access for an operation to succeed. "
    + "RBAC controls resource-type access, Markings control classification-based instance access, "
    + "Object Security (RLS/CLS) controls row and column visibility, and Cell-Level Policies "
    + "(object + property security policies) provide per-cell granularity independent of backing datasource permissions.",
  analogy:
    "A library's security system: the library card (RBAC) determines if you can enter at all, "
    + "the classification stamps (Markings) determine which restricted sections you can access, "
    + "and the reading room rules (RLS/CLS) determine which specific books and pages you can see.",
  governedDomains: ["data", "logic", "action"],
  commercialExamples: [
    {
      sector: "healthcare",
      concept: "HIPAA-compliant patient data access: RBAC restricts by clinical role (nurse vs surgeon), CBAC markings enforce sensitivity levels (PHI, mental health, substance abuse), RLS restricts to patients in the provider's care team, CLS hides SSN and billing fields from clinical staff",
      reasoning: "Healthcare security layers independently: a nurse may have the role (RBAC) but lack the mental health marking (CBAC), or have both but only see patients in their unit (RLS), with billing fields hidden (CLS)",
    },
    {
      sector: "logistics",
      concept: "Supply chain visibility control: RBAC by partner tier (carrier vs broker vs shipper), markings for trade-secret routes, RLS restricts carriers to their own shipments, CLS hides cost/margin columns from external partners",
      reasoning: "Multi-tenant supply chain platforms must isolate competitor data while enabling collaboration — each layer prevents a different class of data leakage",
    },
    {
      sector: "finance",
      concept: "Chinese wall enforcement: RBAC by desk (M&A vs public trading), mandatory markings for material non-public information (MNPI), RLS restricts traders to their authorized instrument universe, CLS hides deal terms from trading desk",
      reasoning: "Financial regulation requires provable isolation between information-privileged groups — the three-layer model maps directly to SEC/FCA compliance requirements",
    },
    {
      sector: "education",
      concept: "FERPA student record protection: RBAC by institutional role (registrar vs faculty vs advisor), markings for disciplinary and disability records, RLS restricts faculty to enrolled students, CLS hides financial aid details from academic advisors",
      reasoning: "Educational records require role-based access with special protections for sensitive categories — each layer addresses a distinct FERPA requirement",
    },
    {
      sector: "manufacturing",
      concept: "Factory floor access control: RBAC by job function (operator vs maintenance vs quality), markings for proprietary process parameters, RLS restricts operators to their assigned production lines, CLS hides cost/yield data from floor operators",
      reasoning: "Manufacturing combines operational access (who runs what machine) with intellectual property protection (process secrets) — layered security addresses both concerns independently",
    },
    {
      sector: "military",
      concept: "Coalition information sharing: RBAC by coalition role, CBAC markings with classification hierarchy (UNCLASSIFIED → CONFIDENTIAL → SECRET → TOP SECRET), RLS restricts to theater-of-operations data, CLS hides source intelligence methods from partner nations",
      reasoning: "Military operations require the most granular security model: need-to-know (RLS), classification (markings), role-based function access (RBAC), and source protection (CLS) all operate independently",
    },
    {
      sector: "energy",
      concept: "NERC CIP compliance for grid operations: RBAC by control center role, markings for Critical Infrastructure Protection levels, RLS restricts operators to their balancing authority area, CLS hides vulnerability assessment details from field technicians",
      reasoning: "Critical infrastructure security mandates defense-in-depth — NERC CIP maps directly to the three-layer model with regulatory audit requirements at each layer",
    },
  ],
} as const;

// =========================================================================
// Section 2: Type Definitions — see re-exports above
// =========================================================================

// All security types are re-exported from ../types.ts at the top of this file.
// Additional types (SecurityLayer, MarkingScope, etc.) are defined in Section 1.

// =========================================================================
// Section 3: Enumeration Constants
// =========================================================================

/** The 4 security layers. Source: security/README.md */
export const SECURITY_LAYERS: readonly SecurityLayer[] = [
  "rbac",
  "markings",
  "objectSecurity",
  "cellLevel",
] as const;

/** Resource types governed by RBAC (5). Source: security/permissions.md */
export const PERMISSION_RESOURCE_TYPES: readonly PermissionResourceType[] = [
  "objectType",
  "linkType",
  "actionType",
  "function",
  "interface",
] as const;

/** Marking scopes (3). Source: security/markings.md */
export const MARKING_SCOPES: readonly MarkingScope[] = [
  "object",
  "property",
  "dataset",
] as const;

/** CLS enforcement points (5). Source: security/object-security.md */
export const CLS_ENFORCEMENT_POINTS: readonly CLSEnforcementPoint[] = [
  "objectLoading",
  "propertyAccess",
  "searchFilter",
  "export",
  "functionExecution",
] as const;

/** Permission resolution levels — order of precedence (4). Source: security/permissions.md */
export const PERMISSION_RESOLUTION_LEVELS: readonly PermissionResolutionLevel[] = [
  "directUser",
  "directGroup",
  "inheritedGroup",
  "multipassAttribute",
] as const;

/** CRUD operations (4). Source: ../types.ts */
export const CRUD_OPERATIONS: readonly CrudOperation[] = [
  "create",
  "read",
  "update",
  "delete",
] as const;

/** Marking types (2). Source: ../types.ts */
export const MARKING_TYPES: readonly MarkingType[] = [
  "mandatory",
  "cbac",
] as const;

/** Mandatory control types available in OSv2 (3). Source: security/markings.md */
export const MANDATORY_CONTROL_TYPES: readonly MandatoryControlType[] = [
  "markings",
  "organizations",
  "classifications",
] as const;

/** Marking permission actions (4). Source: security/markings.md */
export const MARKING_PERMISSION_ACTIONS: readonly MarkingPermissionAction[] = [
  "manage",
  "apply",
  "remove",
  "members",
] as const;

/** RLS operator types (3). Source: ../types.ts + security/object-security.md */
export const RLS_OPERATORS: readonly ("equals" | "contains" | "in")[] = [
  "equals",
  "contains",
  "in",
] as const;

/**
 * Ontology permission models (2). Source: security/permissions.md §Project-Based (Jan 2026)
 * Post-2026-01-21, all new ontologies default to projectBased.
 */
export const PERMISSION_MODELS: readonly PermissionModel[] = [
  "ontologyRoles",
  "projectBased",
] as const;

/**
 * Marking category visibility modes (2). Source: security/markings.md §Marking Management
 * Hidden categories are only visible to users with explicit "Category Viewer" permission.
 */
export const MARKING_CATEGORY_VISIBILITY_MODES: readonly MarkingCategoryVisibility[] = [
  "visible",
  "hidden",
] as const;

// =========================================================================
// Section 4: Decision Heuristics
// =========================================================================

/**
 * Heuristic shape reused from SemanticHeuristic (semantics.ts).
 * Imported structurally rather than by type to keep security self-sufficient.
 */
interface SecurityHeuristic {
  readonly id: string;
  readonly question: string;
  readonly options: readonly {
    readonly condition: string;
    readonly choice: string;
    readonly reasoning: string;
  }[];
  readonly source: string;
  readonly realWorldExample: string;
}

export const SECURITY_HEURISTICS: readonly SecurityHeuristic[] = [
  {
    id: "DH-SEC-01",
    question: "Should access control use RBAC alone, or add Markings and/or Object Security layers?",
    options: [
      {
        condition: "All users with a given role should see the same data — no instance-level or column-level restrictions needed",
        choice: "RBAC only (Layer 1)",
        reasoning: "RBAC is the simplest layer. If every user with the 'analyst' role should see all analyst-accessible data equally, additional layers add complexity without security value.",
      },
      {
        condition: "Some instances within a type carry classification or sensitivity that varies per record (e.g., some patients are VIP, some documents are SECRET)",
        choice: "RBAC + Markings (Layers 1+2)",
        reasoning: "Markings add instance-level classification atop role-based access. Use when the same object type has records of different sensitivity levels that require different clearances.",
      },
      {
        condition: "Users should see only rows they 'own' or are assigned to, and/or certain columns should be hidden from specific roles",
        choice: "RBAC + Object Security (Layers 1+3) or all three layers",
        reasoning: "RLS/CLS provides the finest granularity. Add RLS when row-level filtering is needed (e.g., 'see only your patients'), CLS when column-level hiding is needed (e.g., 'hide salary from non-HR').",
      },
    ],
    source: ".claude/research/palantir/security/README.md",
    realWorldExample: "Hospital system: RBAC alone would give all doctors access to all patient records — insufficient for HIPAA compliance. Adding markings restricts access to sensitive categories like psychiatric records and substance abuse treatment notes, which require additional clearance beyond the basic clinical role. Adding RLS restricts each doctor to only their own care team's patients, preventing a cardiologist from browsing oncology records they have no clinical need for. Adding CLS hides billing columns (insurance ID, copay amounts) from clinical staff who only need medical data. Each layer addresses a distinct compliance gap that the others cannot cover. COUNTER-EXAMPLE: A public-facing data catalog where all authenticated users see the same curated datasets needs only RBAC — adding markings or RLS would be unnecessary complexity with no security benefit, since the data is already sanitized for public consumption.",
  },
  {
    id: "DH-SEC-02",
    question: "Mandatory markings or CBAC (classification-based) markings?",
    options: [
      {
        condition: "Binary access barrier — users either possess the marking or they don't, no hierarchy involved",
        choice: "Mandatory marking",
        reasoning: "Mandatory markings use conjunctive logic: user must possess ALL applied markings. Simplest model for 'members-only' style access groups. No level hierarchy needed.",
      },
      {
        condition: "Hierarchical sensitivity levels where higher clearance implies access to lower tiers (e.g., SECRET clearance can read CONFIDENTIAL and below)",
        choice: "CBAC marking with classification hierarchy",
        reasoning: "CBAC supports hierarchical clearance levels plus disjunctive releasability categories. Required for government/military classification schemes and any model where 'higher clearance = more access'.",
      },
    ],
    source: ".claude/research/palantir/security/markings.md",
    realWorldExample: "A law firm's client matter confidentiality uses mandatory markings: either you're staffed on the Matter-XYZ engagement or you're not — there's no 'partial' access or hierarchy of involvement. Partners staffed on the matter possess the marking and see all documents; everyone else sees nothing related to that client. In contrast, a defense contractor's document classification uses CBAC with a four-tier hierarchy: TOP SECRET clearance implies access to SECRET, CONFIDENTIAL, and UNCLASSIFIED documents — the hierarchy is fundamental to the access model, and a single clearance level determines access to everything at or below that tier. COUNTER-EXAMPLE: Using CBAC for a simple 'premium vs free tier' access control in a SaaS platform adds unnecessary hierarchical complexity. A binary mandatory marking ('premium-member') achieves the same result without the overhead of maintaining a classification hierarchy that only has two levels.",
  },
  {
    id: "DH-SEC-03",
    question: "Row-Level Security (RLS) via restricted views, or property-level markings?",
    options: [
      {
        condition: "Need to hide entire object instances from unauthorized users based on a user attribute matching an object property (e.g., 'see only your region's data')",
        choice: "RLS (restricted views)",
        reasoning: "RLS filters rows at query time based on user attribute → object property matching. Multiple views per type; users see the union of authorized views. Ideal for multi-tenant and assignment-based visibility.",
      },
      {
        condition: "Need to hide specific property VALUES on otherwise visible objects based on classification (e.g., the object is visible but certain fields are redacted)",
        choice: "Property-level markings or CLS",
        reasoning: "Property-level markings redact individual field values. CLS hides entire columns. Use markings when classification varies per-instance; use CLS when column visibility is role-based and uniform.",
      },
    ],
    source: ".claude/research/palantir/security/object-security.md",
    realWorldExample: "An HR system where managers see only their direct reports' records uses RLS with a restricted view matching manager.userId == employee.managerUserId. The VP of Engineering sees all engineering employees; a team lead sees only their 5 direct reports. A medical record system where the diagnosis and treatment plan are visible but the psychiatric evaluation notes field is redacted uses property-level markings on the sensitive fields — the record itself is visible (the patient exists in the system), but specific high-sensitivity fields require additional clearance to read. COUNTER-EXAMPLE: Using property-level markings to hide entire rows (marking every single property on a record) is the wrong approach — if a user shouldn't see the record at all, use RLS to exclude the row entirely. Property-level markings are for selective field redaction, not whole-record hiding.",
  },
  {
    id: "DH-SEC-04",
    question: "Should CLS use datasource-level permissions or property-level markings?",
    options: [
      {
        condition: "Column visibility is role-based and uniform across all instances (e.g., 'HR can see salary, others cannot')",
        choice: "CLS via datasource permissions",
        reasoning: "OSv2 multi-datasource architecture assigns independent column permissions per datasource. Uniform, role-based column visibility is cleanly modeled as datasource-level access control.",
      },
      {
        condition: "Column visibility varies per instance or requires classification-based access (e.g., some records have classified values in a column, others don't)",
        choice: "Property-level markings",
        reasoning: "When the same column has different sensitivity levels across instances, datasource-level CLS is too coarse. Property-level markings allow per-instance, per-field classification.",
      },
    ],
    source: ".claude/research/palantir/security/object-security.md, markings.md",
    realWorldExample: "Financial trading platform: the 'deal terms' column on InvestmentOpportunity should be hidden from all traders regardless of which opportunity they're viewing — this is uniform column visibility based on role, so CLS via datasource permissions is the right choice. A single permission rule on the datasource hides the column for all non-M&A users. Intelligence report system: the 'source identity' field on IntelligenceReport is classified differently per report — some are CONFIDENTIAL (human source), some SECRET (signals intelligence), some TOP SECRET (special access program). Property-level markings allow each instance to carry its own classification on that field. COUNTER-EXAMPLE: Using property-level markings to hide salary from non-HR staff (a uniform column rule) introduces per-instance marking overhead across thousands of employee records when datasource-level CLS achieves the same result with a single permission configuration.",
  },
  {
    id: "DH-SEC-05",
    question: "How should submission criteria and RBAC permissions interact for action authorization?",
    options: [
      {
        condition: "Action authorization depends only on the user's role — anyone with the role can execute the action with any valid parameters",
        choice: "RBAC permission on the action type (no submission criteria)",
        reasoning: "Simple role-based authorization is sufficient when there are no business rules about WHO specifically can submit with WHAT parameters. RBAC is the default authorization mechanism.",
      },
      {
        condition: "Action authorization depends on business context — the user's relationship to the data, parameter values, or real-time attributes beyond their role",
        choice: "RBAC + submission criteria (dual authorization)",
        reasoning: "Submission criteria add parameter-aware authorization atop RBAC. The user must have the role (RBAC) AND satisfy business rules (criteria). This is dual authorization — neither layer alone is sufficient.",
      },
    ],
    source: ".claude/research/palantir/security/permissions.md",
    realWorldExample: "Hospital prescription action: RBAC requires the 'prescriber' role (only licensed doctors and nurse practitioners), but submission criteria additionally verify that the prescriber holds an active DEA license in the prescribing state AND the prescribed drug is not in the patient's documented allergy list AND the drug is not a Schedule II controlled substance unless the prescriber has additional controlled substance authorization. A nurse practitioner with 'prescriber' role but expired DEA license fails the submission criteria despite having the RBAC role — the action is rejected before any state changes occur. COUNTER-EXAMPLE: Adding submission criteria to a simple 'view dashboard report' action where any authenticated user with read permission should succeed — submission criteria add authorization overhead and user friction without business value, since the report contains only pre-aggregated, non-sensitive summary data.",
  },
  {
    id: "DH-SEC-06",
    question: "How many roles should be defined for an ontology?",
    options: [
      {
        condition: "Small team (<20 users) with few distinct permission patterns, most users need similar access",
        choice: "Minimal roles (3-5): admin, editor, viewer, plus 1-2 domain-specific",
        reasoning: "Fewer roles are easier to audit and maintain. For small teams, role explosion creates administration overhead without security benefit.",
      },
      {
        condition: "Large organization with distinct functional groups, compliance requirements, and audit needs",
        choice: "Structured roles (10-30): align with organizational functions and compliance boundaries",
        reasoning: "Roles should map to real organizational functions (e.g., 'clinician', 'billing-specialist', 'compliance-auditor'). Each role represents a distinct permission pattern that exists in the real world.",
      },
      {
        condition: "Enterprise platform with multiple tenants or business units requiring isolation",
        choice: "Hierarchical roles (20-50): base roles + tenant-scoped overrides",
        reasoning: "Multi-tenant platforms need base roles (shared permission patterns) plus tenant-specific roles (scoped to a business unit). Keep total under 50 to maintain auditability.",
      },
    ],
    source: ".claude/research/palantir/security/permissions.md",
    realWorldExample: "A startup's internal tool with 8 engineers needs 3 roles: admin (full access), developer (read/write code and configs), and viewer (read-only dashboards). An enterprise hospital system with 2,000 staff across 15 departments needs 25 roles aligned with real organizational functions: clinician, nurse, pharmacist, billing-specialist, compliance-auditor, department-head, etc. Each role maps to a distinct permission pattern that exists in the real world and can be verified against HR job classifications. A multi-tenant SaaS platform serving 50 companies needs approximately 40 roles: 10 base role templates (owner, admin, editor, viewer, billing, support, etc.) scoped per tenant with tenant-specific overrides for custom workflows. COUNTER-EXAMPLE: Creating 100+ fine-grained roles for a 50-person organization leads to role sprawl where no administrator can audit the complete permission matrix — consolidate into fewer, well-defined roles that match actual job functions.",
  },
  {
    id: "DH-SEC-07",
    question: "Should security policies use restricted views (RLS) with union semantics or intersection semantics?",
    options: [
      {
        condition: "Users belong to multiple groups, each granting visibility to a different subset — user should see ALL subsets they're authorized for",
        choice: "Union semantics (Palantir default)",
        reasoning: "Palantir's restricted views use union semantics: if a user has access to View A (region=US) and View B (department=Engineering), they see rows matching EITHER condition. This is the platform default and cannot be changed.",
      },
      {
        condition: "Intersection semantics are required (user should see only rows matching ALL conditions simultaneously)",
        choice: "Not supported — use single composite view or marking-based filtering",
        reasoning: "The platform does not support intersection semantics for restricted views. Simulate with a single view using compound filter conditions, or use markings for additional filtering layers.",
      },
    ],
    source: ".claude/research/palantir/security/object-security.md",
    realWorldExample: "Regional sales team visibility: VP of Sales has restricted views for US, EU, and APAC regions. Union semantics means the VP sees data matching region=US OR region=EU OR region=APAC — effectively all regions, which is correct since they oversee global sales. A regional manager with only the US view sees only region=US data. A cross-functional lead with views for 'region=US' and 'department=Engineering' sees ALL US rows (any department) plus ALL Engineering rows (any region) — the union can be broader than intended. COUNTER-EXAMPLE: Attempting to configure 'see only rows that are BOTH in US region AND in Engineering department' as two separate restricted views would fail — union semantics would show ALL US rows plus ALL Engineering rows, which is much broader than the intended intersection. Instead, use a single composite restricted view with a compound filter condition: region=US AND department=Engineering.",
  },
  {
    id: "DH-SEC-08",
    question: "Should interface-level permissions be used, or should permissions be set per implementing object type?",
    options: [
      {
        condition: "All implementing types should have the same permission model — actions on the interface should work uniformly",
        choice: "Interface-level permissions (automatically propagated)",
        reasoning: "Interface permissions propagate to all implementing types, including types added later. This ensures uniform access across the polymorphic set and reduces administration.",
      },
      {
        condition: "Different implementing types have different sensitivity levels or belong to different organizational units",
        choice: "Per-type permissions (more granular but more administration)",
        reasoning: "When implementing types have different security requirements (e.g., ITrackable implemented by both PublicTask and ClassifiedMission), per-type permissions prevent over-granting through the interface.",
      },
    ],
    source: ".claude/research/palantir/security/permissions.md",
    realWorldExample: "An IApprovable interface for expense reports, purchase orders, and time-off requests: all three implementing types use the same multi-step approval workflow with identical permission requirements (submit, review, approve, reject). Interface-level permissions ensure new IApprovable implementations automatically inherit the correct access model without manual configuration. An IAuditable interface implemented by both PublicComment (low sensitivity, visible to all authenticated users) and ClassifiedIntelligenceReport (TOP SECRET, restricted to cleared analysts): these have vastly different sensitivity levels, so per-type permissions prevent classified data exposure through the shared interface. COUNTER-EXAMPLE: Setting per-type permissions for 50 object types all implementing the same ITrackable interface with identical tracking security needs creates 50× administration overhead for identical configurations — use interface-level permissions and accept the automatic propagation to new implementations.",
  },
  {
    id: "DH-SEC-09",
    question: "Ontology role-based vs project-based permissions?",
    options: [
      {
        condition: "Granular per-resource-type RBAC needed — different roles for different object types, actions, and functions within the same ontology",
        choice: "Ontology roles (traditional RBAC)",
        reasoning: "Ontology roles map users/groups to capabilities on specific resource types. Best for complex multi-team ontologies where different teams need different access to different resource types within the same ontology.",
      },
      {
        condition: "Simpler access model where project membership determines ontology access — post-2026-01-21 default",
        choice: "Project-based permissions (Compass integration)",
        reasoning: "Project-based permissions use Compass project membership as the access control mechanism. Standard Compass operations (move, share, trash) apply to ontology resources. Simpler to administer for teams already using Compass workflows.",
      },
    ],
    source: ".claude/research/palantir/security/permissions.md §Project-Based Ontology Permissions (Jan 2026)",
    realWorldExample: "A large enterprise ontology with 50+ object types, 200+ actions, and 15 distinct teams (HR, Finance, Engineering, Legal, Compliance, etc.) where each team needs CRUD on their own entity types but read-only on others → ontology roles, because project-based permissions cannot express per-resource-type granularity within a single project. A small team building a new analytics ontology for a single business unit, all members need full access to all resources → project-based permissions, because Compass project membership is simpler and the team already uses Compass for file sharing and collaboration. COUNTER-EXAMPLE: Choosing project-based permissions for a defense ontology with classification-separated teams (Intel analysts, operations planners, logistics) who must NOT have uniform access — project membership would over-grant access to all resource types, violating need-to-know principles. Use ontology roles with per-type RBAC and CBAC markings instead.",
  },
] as const;

// =========================================================================
// Section 5: Mapping Tables
// =========================================================================

/** Security layer → enforcement point mapping. Source: security/README.md */
export const LAYER_TO_ENFORCEMENT_POINT: Readonly<Record<SecurityLayer, string>> = {
  rbac: "Resource-type access (can user access this type of resource?)",
  markings: "Instance-level classification (does user have clearance for this record?)",
  objectSecurity: "Row and column visibility (can user see this specific row and column?)",
  cellLevel: "Combined object + property security policies — row visibility AND column nullability per user (v1.3.0)",
};

/** Marking scope → security effect. Source: security/markings.md */
export const MARKING_SCOPE_TO_EFFECT: Readonly<Record<MarkingScope, string>> = {
  object: "Entire object instance hidden from unauthorized users",
  property: "Individual property values redacted; rest of object visible",
  dataset: "Entire backing dataset restricted at storage level",
};

/** Resource type → available permission actions. Source: security/permissions.md */
export const RESOURCE_TYPE_TO_PERMISSION_ACTIONS: Readonly<Record<PermissionResourceType, readonly string[]>> = {
  objectType: ["read", "write", "create", "delete"],
  linkType: ["traverse", "modify"],
  actionType: ["submit"],
  function: ["execute"],
  interface: ["read", "write", "traverse"],
};

/** CLS enforcement point → description. Source: security/object-security.md */
export const CLS_ENFORCEMENT_DESCRIPTION: Readonly<Record<CLSEnforcementPoint, string>> = {
  objectLoading: "Only authorized properties populated when loading objects",
  propertyAccess: "Unauthorized properties return null/undefined on access",
  searchFilter: "Cannot filter or search on properties user cannot see",
  export: "Only authorized properties included in data exports",
  functionExecution: "Functions respect caller's property-level permissions",
};

/** Permission resolution order → description. Source: security/permissions.md */
export const RESOLUTION_LEVEL_TO_DESCRIPTION: Readonly<Record<PermissionResolutionLevel, string>> = {
  directUser: "Permission assigned directly to the user account",
  directGroup: "Permission inherited from a group the user is a direct member of",
  inheritedGroup: "Permission inherited from nested group membership (transitive)",
  multipassAttribute: "Permission derived from authentication provider attributes",
};

/** Mandatory control type → access logic. Source: security/markings.md */
export const MANDATORY_CONTROL_LOGIC: Readonly<Record<MandatoryControlType, string>> = {
  markings: "Conjunctive (AND) — user must possess ALL applied markings",
  organizations: "Disjunctive (OR) — user must be member of at least one organization",
  classifications: "Hierarchical — user clearance must be at or above resource classification",
};

/** Permission model → description. Source: security/permissions.md §Project-Based (Jan 2026) */
export const PERMISSION_MODEL_TO_DESCRIPTION: Readonly<Record<PermissionModel, string>> = {
  ontologyRoles: "Per-resource-type RBAC — granular roles for object types, links, actions, functions, interfaces",
  projectBased: "Compass project membership — standard Compass operations (move, share, trash) control ontology access",
};

/** Marking category visibility mode → effect. Source: security/markings.md §Marking Management */
export const MARKING_CATEGORY_VISIBILITY_TO_EFFECT: Readonly<Record<MarkingCategoryVisibility, string>> = {
  visible: "All organization users can see the category and marking names (access restrictions still apply)",
  hidden: "Only users with explicit 'Category Viewer' permission can see the category exists",
};

// =========================================================================
// Section 6: Structural Rules
// =========================================================================

/** Naming and structural rules for SECURITY domain artifacts. */
export const STRUCTURAL_RULES: readonly StructuralRule[] = [
  {
    target: "Role API name",
    casing: "camelCase",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/security/permissions.md",
  },
  {
    target: "Marking API name",
    casing: "camelCase",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    minLength: 1,
    maxLength: 100,
    source: ".claude/research/palantir/security/markings.md",
  },
  {
    target: "Object Security Policy entity reference",
    casing: "PascalCase (matches entity API name)",
    pattern: "^[A-Z][a-zA-Z0-9]*$",
    source: ".claude/research/palantir/security/object-security.md",
  },
  {
    target: "CLS property reference",
    casing: "camelCase (matches property API name)",
    pattern: "^[a-z][a-zA-Z0-9]*$",
    source: ".claude/research/palantir/security/object-security.md",
  },
] as const;

/** Output file for SECURITY domain generation. */
export const OUTPUT_FILE = "ontology/security.ts" as const;

// =========================================================================
// Section 7: Validation Thresholds
// =========================================================================

/** Numeric thresholds for SECURITY domain validation. */
export const VALIDATION_THRESHOLDS = {
  /** Minimum roles per ontology. Source: security/permissions.md */
  MIN_ROLES: 1,
  /** Maximum roles per ontology (audit complexity ceiling). Source: security/permissions.md */
  MAX_ROLES: 50,
  /** Minimum marking levels for CBAC hierarchy. Source: security/markings.md */
  MIN_MARKING_LEVELS: 2,
  /** Maximum CLS datasources per object type. Source: security/object-security.md */
  MAX_CLS_DATASOURCES: 10,
  /** Maximum restricted views per object type. Source: security/object-security.md */
  MAX_RESTRICTED_VIEWS: 20,
  /** Maximum permissions per role entry (CRUD operations). Source: types.ts */
  MAX_CRUD_OPERATIONS: 4,
} as const;

// =========================================================================
// Section 8: Hard Constraints
// =========================================================================

/**
 * HC-SEC-01..22: Security governance hard constraints.
 * All severity="error". Domain field uses "security" (DomainOrOverlay type).
 * Previously used "data" due to HardConstraint.domain being SemanticDomainId-only.
 * Fixed in WI-01 (2026-03-17): security constraints now correctly self-identify.
 */
export const SECURITY_HARD_CONSTRAINTS: readonly HardConstraint[] = [
  {
    id: "HC-SEC-01",
    domain: "security",
    rule: "All four security layers (RBAC, Markings, Object Security, Cell-Level Policies) must independently permit access — no layer can override another",
    severity: "error",
    source: ".claude/research/palantir/security/README.md",
    rationale: "Defense-in-depth principle: each layer is an independent gate. Bypassing one layer (e.g., having the right role) does not grant access if another layer (e.g., markings) denies it.",
  },
  {
    id: "HC-SEC-02",
    domain: "security",
    rule: "Marking permanence: once a marking is applied to a resource, removing it requires both 'remove' AND 'apply' permissions",
    severity: "error",
    source: ".claude/research/palantir/security/markings.md",
    rationale: "Dual-permission requirement for marking removal prevents accidental or unauthorized declassification. Separation of apply and remove duties is a compliance control.",
  },
  {
    id: "HC-SEC-03",
    domain: "security",
    rule: "CLS (column-level security) requires Object Storage V2 (OSv2) multi-datasource architecture",
    severity: "error",
    source: ".claude/research/palantir/security/object-security.md",
    rationale: "OSv1 does not support per-datasource column permissions. CLS enforcement relies on OSv2's multi-datasource model where each datasource has independent column-level access control.",
  },
  {
    id: "HC-SEC-04",
    domain: "security",
    rule: "RLS restricted views use union semantics — multiple views grant additive visibility, not intersection",
    severity: "error",
    source: ".claude/research/palantir/security/object-security.md",
    rationale: "Platform design: a user with access to View A and View B sees rows matching A OR B. Intersection semantics are not supported. Designers must account for additive visibility when creating multiple views.",
  },
  {
    id: "HC-SEC-05",
    domain: "security",
    rule: "RBAC role assignment completeness: roles must cover ALL resource types a workflow requires (object types, links, actions, functions)",
    severity: "error",
    source: ".claude/research/palantir/security/permissions.md",
    rationale: "Incomplete role coverage causes runtime permission errors. A user needs read/write on affected object types, traverse on links, submit on actions, and execute on functions for a complete workflow.",
  },
  {
    id: "HC-SEC-06",
    domain: "security",
    rule: "Marking property type is NOT supported by Ontology SDK — external applications cannot interact with marking-classified data via OSDK",
    severity: "error",
    source: ".claude/research/palantir/security/markings.md",
    rationale: "OSDK limitation: marking-type properties cannot be read, written, or filtered via the SDK. External applications requiring marking data must use the internal API or marking service directly.",
  },
  {
    id: "HC-SEC-07",
    domain: "security",
    rule: "Functions execute within caller's permission context — function cannot escalate privileges beyond caller's RLS/CLS/marking access",
    severity: "error",
    source: ".claude/research/palantir/security/permissions.md",
    rationale: "Security context propagation: functions do not have their own identity. They see exactly what the calling user sees. This prevents privilege escalation through function composition.",
  },
  {
    id: "HC-SEC-08",
    domain: "security",
    rule: "Aggregations respect most restrictive marking in the computed set — aggregate results inherit the highest classification of any contributing record",
    severity: "error",
    source: ".claude/research/palantir/security/markings.md",
    rationale: "Marking propagation in aggregations: a count or average computed across records of different classification levels inherits the highest classification to prevent information leakage through statistics.",
  },
  {
    id: "HC-SEC-09",
    domain: "security",
    rule: "SearchAround traversal respects markings and RLS on BOTH source and target objects independently",
    severity: "error",
    source: ".claude/research/palantir/security/object-security.md §SEC.OB-06 + .claude/research/palantir/security/markings.md §SEC.MK-05",
    rationale: "Link traversal is filtered at both endpoints: the user must have access to the source object (via its RLS/markings) AND the target object (via its RLS/markings). Missing either hides the traversal result.",
  },
  {
    id: "HC-SEC-10",
    domain: "security",
    rule: "Interface permissions automatically propagate to ALL implementing object types, including types added after the permission grant",
    severity: "error",
    source: ".claude/research/palantir/security/permissions.md",
    rationale: "Interface permission inheritance is dynamic and prospective. Granting permission on ITrackable applies to all current and future ITrackable implementations. This can cause unintended access if not carefully considered.",
  },
  {
    id: "HC-SEC-11",
    domain: "security",
    rule: "Mandatory marking access uses conjunctive (AND) logic — user must possess ALL markings applied to a resource",
    severity: "error",
    source: ".claude/research/palantir/security/markings.md",
    rationale: "Conjunctive logic ensures that each marking is an independent access requirement. A resource with markings A and B requires the user to possess BOTH A and B — possessing only A is insufficient.",
  },
  {
    id: "HC-SEC-12",
    domain: "security",
    rule: "Marking propagation through data dependencies: derived datasets inherit markings from ALL upstream input datasets",
    severity: "error",
    source: ".claude/research/palantir/security/markings.md",
    rationale: "Derived data inherits the union of all input markings. If Dataset A (CONFIDENTIAL) and Dataset B (SECRET) feed Dataset C, then C inherits BOTH CONFIDENTIAL and SECRET markings.",
  },

  // --- Object/Property Security Policies (2026) ---
  {
    id: "HC-SEC-13",
    domain: "security",
    rule: "Property security policies require an object security policy to already be configured on the object type",
    severity: "error",
    source: ".claude/research/palantir/security/object-security.md — extended by Palantir docs object-security-policies (2026)",
    rationale: "Property-level security (CLS) is an additional layer on top of object-level security (RLS). Without the base object policy, the platform has no security context to evaluate property-level restrictions against.",
  },
  {
    id: "HC-SEC-14",
    domain: "security",
    rule: "Primary key property cannot be a member of any property security policy",
    severity: "error",
    source: ".claude/research/palantir/security/object-security.md — extended by Palantir docs object-security-policies (2026)",
    rationale: "The PK is required for object identity, link resolution, and index lookup. Hiding it via property security would make the object unreferenceable and break all downstream link traversals and SearchAround operations.",
  },
  {
    id: "HC-SEC-15",
    domain: "security",
    rule: "Each non-PK property can belong to at most one property security policy",
    severity: "error",
    source: ".claude/research/palantir/security/object-security.md — extended by Palantir docs object-security-policies (2026)",
    rationale: "Multiple policies on the same property would create ambiguous access resolution — which policy takes precedence? The platform enforces a single policy per property to maintain deterministic access evaluation.",
  },
  // --- v1.3.0 additions (research deep dive 2026-03-15) ---
  {
    id: "HC-SEC-16",
    domain: "security",
    rule: "Object security policies operate independently of backing datasource permissions — users do NOT need Viewer permissions on datasources when policies are configured",
    severity: "error",
    source: ".claude/research/palantir/security/object-security.md §Object and Property Security Policies",
    rationale: "When object or property security policies are configured, the policy itself governs access — not datasource-level Viewer permissions. This is a significant architectural distinction from the earlier multi-datasource CLS model.",
  },
  {
    id: "HC-SEC-17",
    domain: "security",
    rule: "Property security policies show null values for guarded properties to unauthorized users — not access denied errors",
    severity: "error",
    source: ".claude/research/palantir/security/object-security.md §Property Security Policies",
    rationale: "Unauthorized users see null for guarded properties rather than receiving an error. This preserves the object's visibility (row-level access passes) while hiding sensitive fields. Multiple property security policies can coexist on the same object type.",
  },
  {
    id: "HC-SEC-18",
    domain: "security",
    rule: "Cell-level security = object security policy (row visibility) + property security policy (column nullability) combined — failing object policy hides row, passing object but failing property policy shows null",
    severity: "error",
    source: ".claude/research/palantir/security/object-security.md §Cell-Level Security",
    rationale: "Cell-level security is achieved through two-tier evaluation: (1) object security policy determines if the user can see the row at all, (2) property security policy determines which columns show values vs null. This produces true cell-level granularity where different users see different subsets of data.",
  },
  {
    id: "HC-SEC-19",
    domain: "security",
    rule: "Three mandatory control types — Markings (conjunctive AND), Organizations (disjunctive OR), Classifications (hierarchical clearance) — Classifications cannot be combined with the other two",
    severity: "error",
    source: ".claude/research/palantir/security/markings.md §Three Mandatory Control Types",
    rationale: "Markings require ALL applied markings (conjunctive). Organizations require membership in at least ONE applied org (disjunctive). Classifications use hierarchical clearance (TOP SECRET > SECRET > CONFIDENTIAL). The platform prevents combining Classifications with Markings/Organizations on the same mandatory control property.",
  },
  {
    id: "HC-SEC-20",
    domain: "security",
    rule: "Marking categories and individual markings are permanent — cannot be deleted once created",
    severity: "error",
    source: ".claude/research/palantir/security/markings.md §Marking Management",
    rationale: "Permanence ensures referential integrity — once data is classified under a marking, removing the marking definition would leave orphaned classification references. The platform enforces immutability of marking infrastructure to prevent accidental declassification.",
  },
  {
    id: "HC-SEC-21",
    domain: "security",
    rule: "Ontologies created after 2026-01-21 default to project-based permissions",
    severity: "error",
    source: ".claude/research/palantir/security/permissions.md §Project-Based Ontology Permissions (Jan 2026)",
    rationale: "Palantir changed the default permission model on January 21, 2026. New ontologies use Compass project permissions unless explicitly configured for traditional ontology roles. The schema pipeline must reflect this default when generating security configurations for new projects.",
  },
  {
    id: "HC-SEC-22",
    domain: "security",
    rule: "Legacy ontology roles and project-based permissions can coexist during migration",
    severity: "error",
    source: ".claude/research/palantir/security/permissions.md §Project-Based Ontology Permissions (Jan 2026)",
    rationale: "Existing ontologies are not force-migrated to project-based permissions. Both models coexist: legacy roles continue to function while Compass integration is rolled out. Migration is opt-in via Ontology Manager settings. Security configurations must account for this hybrid state during transition.",
  },
] as const;

/** Total hard constraint count. */
export const HARD_CONSTRAINT_COUNT = SECURITY_HARD_CONSTRAINTS.length;
