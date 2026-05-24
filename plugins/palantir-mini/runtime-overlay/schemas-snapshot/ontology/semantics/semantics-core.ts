/**
 * Domain Semantic Definitions — Core Types & Aggregates
 *
 * Split from legacy semantics.ts v1.13.1 (D1, 2026-04-19).
 * Contains: terminology charter, base type definitions, semantic heuristics,
 * transition zones, aggregated constants (DOMAIN_SEMANTICS, DIGITAL_TWIN_LOOP,
 * CONCEPT_OWNER), and consistency invariants.
 *
 * Consumers MUST import from the parent barrel: `from "../semantics"`.
 * Do NOT import this file directly; structural layout may change within v1.x.
 */

import type { ConstraintContext } from "../../meta/types";
import { DATA_SEMANTICS } from "./semantics-data";
import { LOGIC_SEMANTICS } from "./semantics-logic";
import { ACTION_SEMANTICS } from "./semantics-action";

/** Schema version following semver convention. */
export const SCHEMA_VERSION = "1.12.0" as const;

// =========================================================================
// Section 0: Terminology Charter
// =========================================================================

/**
 * TERMINOLOGY_CHARTER — Canonical boundary between official Palantir wording
 * and local normalization decisions.
 *
 * Every claim in this schema falls into exactly one of three categories:
 *   1. OFFICIAL FACT — verbatim or closely paraphrased from Palantir docs/blog
 *   2. LOCAL NORMALIZATION — our formalization of an official concept for LLM consistency
 *   3. LOCAL INFERENCE — our extension of official concepts, not directly stated by Palantir
 *
 * This charter exists because passing tests do not prove semantic correctness.
 * A test can validate that HC-SEC-01 has domain="security" without knowing
 * whether Palantir considers security a domain, overlay, or something else.
 *
 * Sources verified 2026-03-17:
 *   SRC-01: palantir.com/docs/foundry/ontology/why-ontology/ — decision capture, digital twin
 *   SRC-02: palantir.com/docs/foundry/architecture-center/ontology-system/ — "four-fold integration of data, logic, action, and security"
 *   SRC-03: palantir.com/docs/foundry/object-permissioning/object-security-policies — cell-level security
 *   SRC-05: palantir.com/docs/foundry/ontology-sdk/typescript-osdk-migration — $returnEdits (post-commit), $validateOnly (pre-commit)
 *   SRC-06: palantir.com/docs/foundry/action-types/action-log — action log, decision capture
 *   SRC-11: palantir.com/docs/foundry/ontology-sdk/overview/ — OSDK generated client, applyAction semantics
 *   SRC-12: blog.palantir.com "Ontology-Oriented Software Development" — data/logic/action elements
 */
export const TERMINOLOGY_CHARTER = {
  localNormalizations: [
    {
      concept: "SemanticDomainId ('data' | 'logic' | 'action')",
      officialWording: "data, logic and action elements (OOSD blog, Jan 2024, lowercase, informal grouping)",
      localDecision: "Elevated to typed SemanticDomainId union for LLM grounding consistency",
      justification: "OOSD-02 (Abstraction of Implementation) — formalized element grouping ensures every LLM session classifies concepts identically",
    },
    {
      concept: "SECURITY_OVERLAY (governance overlay, not 4th domain)",
      officialWording: "SRC-02 Architecture Center: security is a PEER in the 'four-fold integration' (equal column in Language/Engine/Toolchain matrix). SRC-02 also: 'woven into data, logic, and actions' and diagrammed as 'a security layer beneath'. SRC-12 OOSD blog: uses only 3 elements, no security. Official position is genuinely ambiguous — security is simultaneously peer, overlay, and foundation layer.",
      localDecision: "Modeled as GovernanceOverlaySemantics (not a 4th DomainSemantics) because security does not own ConceptTypes and has no digital twin stage mapping. DomainOrOverlay type allows security-tagged HardConstraints.",
      justification: "Security controls access TO data/logic/action but does not own ConceptTypes. The SRC-02 four-fold model treats security as equal for integration purposes, but our semantic classification (SemanticDomainId) models what EXISTS/REASONS/CHANGES — security does none of these. The overlay model is a valid local abstraction of the officially ambiguous positioning.",
    },
    {
      concept: "DomainOrOverlay ('data' | 'logic' | 'action' | 'security')",
      officialWording: "No official equivalent — Palantir does not classify constraints by semantic domain",
      localDecision: "Extended domain type allowing HardConstraints to be tagged with their true governance scope",
      justification: "HC-SEC-* constraints are about security governance, not data modeling — domain='data' was a type-system limitation",
    },
    {
      concept: "Digital Twin Loop (SENSE→DECIDE→ACT→LEARN)",
      officialWording: "Palantir uses 'digital twin' (why-ontology page), 'decision capture' (same page), 'feedback loop' (AIPCon demos)",
      localDecision: "Formalized as 4-stage loop with typed DigitalTwinLoopStage constants mapping to D/L/A + cross-domain",
      justification: "Aggregates official concepts into a computable loop model for Twin Maturity assessment",
    },
    {
      concept: "SH-03 (edit functions vs actions for LOGIC/ACTION classification)",
      officialWording: "Edit functions compute edits but 'running an edit function outside of an Action will not actually modify any object data' (Functions docs). Function-backed actions commit edits. OSDK: $returnEdits commits AND returns edits manifest (post-commit introspection); $validateOnly validates without committing (true preview). These are mutually exclusive.",
      localDecision: "Simplified to 'computes edits (LOGIC) vs commits edits (ACTION)' for classification heuristic. $returnEdits is NOT used for LOGIC/ACTION distinction — the distinction is at the function/action boundary, not the OSDK client mode.",
      justification: "The function/action boundary is the semantic classification point. OSDK client modes ($returnEdits, $validateOnly) are implementation-level concerns that do not affect domain classification.",
    },
  ],
  officialFacts: [
    "The Ontology models decisions through the four-fold integration of data, logic, action, and security (SRC-02, Architecture Center — canonical structural statement)",
    "Object types, link types, action types, functions, interfaces — official ontology building blocks (Palantir docs)",
    "OSDK exposes data, logic and action elements in idiomatic Python, TypeScript and Java (SRC-12, OOSD blog — uses 3 elements, no security)",
    "Object security policies provide row-level security; property security policies provide column-level; combined = cell-level (SRC-03)",
    "Action log captures: Action RID, timestamp, userId, edited objects (SRC-06)",
    "Property security policy restrictions: requires object policy, no PK, at most one policy per property (SRC-03)",
    "When security policies are configured, users do NOT need Viewer permissions on backing datasources (SRC-03)",
    "$returnEdits executes + commits + returns edits manifest; $validateOnly validates without executing; mutually exclusive (SRC-05, OSDK migration guide)",
    "Edit functions outside an Action 'will not actually modify any object data' — only function-backed Actions commit (Palantir Functions docs)",
    "Actions use 'apply' semantics (applyAction method), not 'execute' — edits are 'applied' (SRC-06, SRC-11)",
    "K-LLM is an official Palantir concept — CTO Shyam Sankar presented 'K-LLMs, not LLMs' publicly; Palantir LinkedIn posted 'Never use 1 LLM when you can use K-LLMs' (provenance-audit.md §PA-03.1)",
    "Every decision comprises data, logic, and action — the three constituent elements of decision-making (AIP platform page, search results)",
    "@osdk/maker provides ontology-as-code in TypeScript: defineObject, defineLink, defineInterface, defineAction (npmjs.com/@osdk/maker, provenance-audit.md §PA-08)",
    "Palantir ontology overview uses 2-category taxonomy: semantic (objects, properties, links) vs kinetic (action types, functions) — our 3-domain model splits kinetic into LOGIC + ACTION (provenance-audit.md §PA-03.4)",
  ],
} as const;

// =========================================================================
// Section 1: Type Definitions
// =========================================================================

/**
 * The three semantic domains (LOCAL NORMALIZATION).
 * Official Palantir uses "data, logic and action elements" (OOSD blog, Jan 2024).
 * We formalize these as typed domain IDs for LLM grounding consistency.
 * Security is a governance overlay, not a 4th domain — see SECURITY_OVERLAY.
 */
export type SemanticDomainId = "data" | "logic" | "action";

/**
 * Extended domain identifier that includes the security governance overlay.
 * Use this type when a field needs to represent BOTH semantic domains AND
 * the security overlay (e.g., HardConstraint.domain, SchemaStats keys).
 */
export type DomainOrOverlay = SemanticDomainId | "security";

/**
 * Digital Twin feedback loop stages.
 * The Ontology IS a digital twin — DATA/LOGIC/ACTION map to SENSE/DECIDE/ACT.
 * LEARN is not a separate domain — it is the feedback path from ACT back to SENSE.
 */
export type DigitalTwinStage = "sense" | "decide" | "act";

/** All concept types across the three domains (20 total). */
export type ConceptType =
  // DATA domain (12)
  | "ObjectType" | "Property" | "ValueType" | "StructType" | "SharedPropertyType"
  | "GeoPointProperty" | "GeoShapeProperty" | "GeoTemporalProperty"
  | "TimeSeriesProperty" | "AttachmentProperty" | "VectorProperty" | "CipherProperty"
  // LOGIC domain (5)
  | "LinkType" | "Interface" | "Query" | "DerivedProperty" | "Function"
  // ACTION domain (3)
  | "Mutation" | "Webhook" | "Automation";

/** Multi-domain commercial example. One per sector, representing the purest form. */
export interface DomainExample {
  readonly sector: "healthcare" | "logistics" | "finance" | "education" | "manufacturing" | "military" | "energy";
  readonly concept: string;
  readonly reasoning: string;
}

/** How to classify a specific concept into a domain. */
export interface ClassificationRule {
  readonly id: string;
  readonly concept: string;
  readonly semanticTest: string;
  readonly domain: SemanticDomainId;
  readonly reasoning: string;
  readonly counterArgument?: string;
}

/**
 * Domain-placement decision tree. Resolves to DOMAIN PLACEMENT.
 * Distinct from DecisionHeuristic constants (DH-DATA-*, DH-LOGIC-*, etc.
 * in each domain's schema.ts) which resolve IMPLEMENTATION CHOICES
 * (struct vs entity, etc.) within a domain.
 */
export interface SemanticHeuristic {
  readonly id: string;
  readonly question: string;
  readonly options: readonly {
    readonly condition: string;
    readonly choice: string;
    readonly reasoning: string;
  }[];
  readonly source: string;
  readonly realWorldExample: string;
  /** AI agent context — backpropagated from project bugs. Optional for backward compat. */
  readonly context?: ConstraintContext;
}

/** DATA-LOGIC boundary nuance where structural home differs from semantic domain. */
export interface TransitionZone {
  readonly concept: string;
  readonly structuralHome: string;
  readonly semanticDomain: SemanticDomainId;
  readonly explanation: string;
}

/**
 * Platform constraint that cannot be violated. All severity="error".
 * Domain field uses DomainOrOverlay so security-specific constraints
 * can be correctly tagged as domain="security" rather than masquerading
 * as domain="data". See WI-01 remediation (2026-03-17).
 */
export interface HardConstraint {
  readonly id: string;
  readonly domain: DomainOrOverlay;
  readonly rule: string;
  readonly severity: "error";
  readonly source: string;
  readonly rationale: string;
  /** AI agent context — backpropagated from project bugs. Optional for backward compat. */
  readonly context?: ConstraintContext;
}

/** Cross-domain verification rule. */
export interface ConsistencyInvariant {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly checkLogic: string;
  readonly violationMessage: string;
}

/** Main domain semantics interface — the complete semantic definition of one domain. */
export interface DomainSemantics {
  readonly domain: SemanticDomainId;
  readonly realWorldRole: string;
  readonly semanticQuestion: string;
  readonly description: string;
  readonly analogy: string;
  /** Digital Twin loop stage this domain implements. Source: philosophy/digital-twin.md */
  readonly digitalTwinStage: DigitalTwinStage;
  /** How this domain participates in the LEARN feedback loop. */
  readonly digitalTwinRole: string;
  readonly commercialExamples: readonly DomainExample[];
  /** Project-specific ontology examples (SaveTicker). */
  readonly projectExamples: readonly DomainExample[];
  readonly owns: readonly ConceptType[];
  readonly reads: readonly ConceptType[];
  readonly mustNotContain: readonly ConceptType[];
  readonly classificationRules: readonly ClassificationRule[];
  readonly hardConstraints: readonly HardConstraint[];
  readonly boundaryTestId: string;
}

// =========================================================================
// Section 2: Semantic Heuristics
// =========================================================================

export const SEMANTIC_HEURISTICS: readonly SemanticHeuristic[] = [
  {
    id: "SH-01",
    question: "Does this describe what EXISTS, how to REASON, or how to CHANGE reality?",
    options: [
      {
        condition: "It represents a stored fact about the world — an entity, attribute, measurement, or classification that exists independently of interpretation",
        choice: "DATA",
        reasoning: "DATA is ground truth. If you deleted all LOGIC and ACTION, this would still describe what exists.",
      },
      {
        condition: "It represents how to interpret, connect, traverse, or derive understanding from what exists — relationships, rules, computations, or patterns",
        choice: "LOGIC",
        reasoning: "LOGIC is the intelligence layer. It encodes expert reasoning — the 'tribal knowledge' that makes raw data useful.",
      },
      {
        condition: "It represents a lever that, when pulled, changes the state of the real world — creating, modifying, deleting, or triggering external effects",
        choice: "ACTION",
        reasoning: "ACTION is the execution layer. It follows LOGIC's blueprint to commit changes and fire side effects.",
      },
    ],
    source: ".claude/research/palantir/architecture/ontology-model.md §ARCH-19 — Decision-Centric Systems table",
    realWorldExample: "ERP inventory levels are DATA (current stock counts exist as facts). 'If stock < reorder point, flag' is LOGIC (reasoning rule). 'Create purchase order to replenish' is ACTION (changes reality).",
  },
  {
    id: "SH-02",
    question: "If I deleted all LOGIC and ACTION, would this still describe reality?",
    options: [
      {
        condition: "Yes — this concept exists as a stored fact independent of any interpretation, relationship, or execution",
        choice: "DATA",
        reasoning: "DATA is foundational and standalone. It has no upstream dependencies beyond ENTRY.",
      },
      {
        condition: "No — this concept is an interpretation, connection, or derivation that requires DATA to exist first",
        choice: "Not DATA — apply SH-01 to distinguish LOGIC from ACTION",
        reasoning: "LOGIC and ACTION both depend on DATA. This test confirms DATA independence.",
      },
    ],
    source: ".claude/research/palantir/data/README.md — 'DATA is standalone and foundational'",
    realWorldExample: "A Patient record (name, DOB, blood type) survives deletion of all reasoning and actions — it is DATA. A Diagnosis→Treatment link only makes sense because Patient and Treatment exist — it depends on DATA, so it is not DATA.",
  },
  {
    id: "SH-03",
    question: "Does this compute edits (describe impact) or commit edits (execute change)?",
    options: [
      {
        condition: "It computes edits without committing — describes what SHOULD happen along propagation paths",
        choice: "LOGIC",
        reasoning: "Edit functions compute ontology edits within a function context. They are the causality blueprint — they compute, not execute. (LOCAL NORMALIZATION: official Palantir 'Ontology edits' docs describe functions as making edits; our heuristic simplifies to 'compute vs commit' for classification.)",
      },
      {
        condition: "It commits edits permanently, triggers webhooks, or schedules automated execution",
        choice: "ACTION",
        reasoning: "Function-backed Actions wrap edit functions and COMMIT. The wrapper is ACTION; the inner edit function is LOGIC. OSDK client modes: $returnEdits commits AND returns the edits manifest (post-commit introspection, NOT a preview). $validateOnly checks submission criteria only without committing (true non-committing preview).",
      },
    ],
    source: ".claude/research/palantir/logic/README.md — Three-layer separation: (1) edit functions compute edits (LOGIC), (2) function-backed actions commit edits (ACTION), (3) OSDK $returnEdits=post-commit edit introspection, $validateOnly=pre-commit validation only. Source: OSDK TypeScript migration guide (palantir.com/docs/foundry/ontology-sdk/typescript-osdk-migration)",
    realWorldExample: "An edit function traversing Incident→Alerts and computing each Alert.status='Resolved' is LOGIC (computes impact). The function-backed Action that wraps it and commits those edits is ACTION. $returnEdits:true returns the edit manifest AFTER commit; $validateOnly:true validates WITHOUT commit.",
  },
] as const;

// =========================================================================
// Section 3: Transition Zones
// =========================================================================

export const TRANSITION_ZONES: readonly TransitionZone[] = [
  {
    concept: "LinkType",
    structuralHome: "data/links.md",
    semanticDomain: "logic",
    explanation:
      "Link Types have structural definitions (cardinality, FK property, join entity) that feel DATA-like. "
      + "But their PRIMARY purpose is enabling reasoning and traversal — 'given a Patient, find their Doctor' "
      + "is a reasoning path, not a stored fact. Links are the edges of the Impact Propagation Graph. "
      + "The structural definition is the schema; the semantic role is LOGIC.",
  },
  {
    concept: "Interface",
    structuralHome: "data/interfaces.md",
    semanticDomain: "logic",
    explanation:
      "Interfaces declare shape contracts (required properties, link constraints) that feel DATA-like. "
      + "But their PRIMARY purpose is enabling connection polymorphism — 'anything that implements ITrackable "
      + "can be tracked the same way' is a reasoning category, not an entity definition. "
      + "Interfaces are connection contracts for the Impact Propagation Graph.",
  },
  {
    concept: "Query/ObjectSet",
    structuralHome: "data/queries.md",
    semanticDomain: "logic",
    explanation:
      "Queries define API surface (filter fields, parameters, return types) that feel DATA-like. "
      + "But their PRIMARY computational use is graph traversal for reasoning — SearchAround patterns, "
      + "multi-hop cascading edit scope, impact scope determination. LOGIC owns the computational use "
      + "of Object Sets; DATA defines the Object Set API itself.",
  },
  {
    concept: "DerivedProperty",
    structuralHome: "data/derived-properties.md",
    semanticDomain: "logic",
    explanation:
      "Derived Properties have schema definitions (base type, derivation category) that feel DATA-like. "
      + "But their PRIMARY role is computation — link traversal formulas, weighted aggregations, "
      + "cascading derived values. They are interpretation of raw data, not the data itself. "
      + "The definition is in DATA's territory; the computation belongs to LOGIC.",
  },
] as const;


// =========================================================================
// Section 7: Aggregated Constants
// =========================================================================

/** All three domain semantic definitions. */
export const DOMAIN_SEMANTICS: readonly DomainSemantics[] = [
  DATA_SEMANTICS,
  LOGIC_SEMANTICS,
  ACTION_SEMANTICS,
] as const;

// =========================================================================
// Section 7.5: Digital Twin Operational Semantics
// =========================================================================

/**
 * The SENSE→DECIDE→ACT→LEARN feedback loop — the operational model of the Ontology as Digital Twin.
 * LEARN is not a 4th domain. It is the feedback path from ACT back to SENSE.
 *
 * Source: .claude/research/palantir/philosophy/digital-twin.md
 *        .claude/research/palantir/philosophy/ontology-ultimate-vision.md §6
 */
export interface DigitalTwinLoopStage {
  readonly stage: DigitalTwinStage | "learn";
  readonly domain: SemanticDomainId | "cross-domain";
  readonly role: string;
  readonly examples: string;
  /** What this stage produces that feeds the next stage. */
  readonly output: string;
}

export const DIGITAL_TWIN_LOOP: readonly DigitalTwinLoopStage[] = [
  {
    stage: "sense",
    domain: "data",
    role: "Multi-modal data integration captures the current state of reality",
    examples: "Entity definitions, property values, ingested records, sensor readings, IoT feeds, ERP data, API responses",
    output: "Structured entity state — the 'ground truth' snapshot that LOGIC reasons about",
  },
  {
    stage: "decide",
    domain: "logic",
    role: "AI/ML modeling, expert reasoning, and impact propagation compute over current DATA state to inform decisions",
    examples: "Functions, derived properties, link traversal, impact propagation, forecast models, anomaly detection, classification",
    output: "Decision recommendations (Edits[]) — descriptions of what SHOULD change, without committing",
  },
  {
    stage: "act",
    domain: "action",
    role: "Approved decisions execute across enterprise substrates, changing reality",
    examples: "Mutations, webhooks, automations, scheduled actions, external system sync, notification dispatch",
    output: "State changes committed + action logs — reality is altered, outcomes are recorded",
  },
  {
    stage: "learn",
    domain: "cross-domain",
    role: "Decision outcomes captured as new DATA, feeding the next SENSE cycle. Heuristics refined, models recalibrated",
    examples: "Action logs → new DATA entities, updated metrics, corrected predictions, DH refinement from tracked outcomes",
    output: "New SENSE input — the loop closes, and the next cycle begins with enriched ground truth",
  },
] as const;

/** All 20 concept types across all three domains. */
export const ALL_CONCEPT_TYPES: readonly ConceptType[] = [
  // DATA (12)
  "ObjectType", "Property", "ValueType", "StructType", "SharedPropertyType",
  "GeoPointProperty", "GeoShapeProperty", "GeoTemporalProperty",
  "TimeSeriesProperty", "AttachmentProperty", "VectorProperty", "CipherProperty",
  // LOGIC (5)
  "LinkType", "Interface", "Query", "DerivedProperty", "Function",
  // ACTION (3)
  "Mutation", "Webhook", "Automation",
] as const;

/** Lookup: which domain owns a given concept type. */
export const CONCEPT_OWNER: Readonly<Record<ConceptType, SemanticDomainId>> = {
  ObjectType: "data", Property: "data", ValueType: "data", StructType: "data",
  SharedPropertyType: "data", GeoPointProperty: "data", GeoShapeProperty: "data",
  GeoTemporalProperty: "data", TimeSeriesProperty: "data", AttachmentProperty: "data",
  VectorProperty: "data", CipherProperty: "data",
  LinkType: "logic", Interface: "logic", Query: "logic",
  DerivedProperty: "logic", Function: "logic",
  Mutation: "action", Webhook: "action", Automation: "action",
} as const;

// =========================================================================
// Section 8: Consistency Invariants
// =========================================================================

export const CONSISTENCY_INVARIANTS: readonly ConsistencyInvariant[] = [
  {
    id: "CI-01",
    name: "Partition Completeness",
    description: "The union of all domains' owns arrays equals ALL_CONCEPT_TYPES",
    checkLogic: "new Set([...DATA.owns, ...LOGIC.owns, ...ACTION.owns]) equals new Set(ALL_CONCEPT_TYPES)",
    violationMessage: "Some concept types are not owned by any domain — the partition is incomplete",
  },
  {
    id: "CI-02",
    name: "No Owns Overlap",
    description: "The intersection of any two domains' owns arrays is empty",
    checkLogic: "For every pair (A, B) of domains: A.owns ∩ B.owns = ∅",
    violationMessage: "A concept type is owned by multiple domains — ownership must be exclusive",
  },
  {
    id: "CI-03",
    name: "Acyclic Reads",
    description: "DATA reads nothing; LOGIC reads only from DATA.owns; ACTION reads only from DATA.owns ∪ LOGIC.owns",
    checkLogic: "DATA.reads = []; LOGIC.reads ⊆ DATA.owns; ACTION.reads ⊆ (DATA.owns ∪ LOGIC.owns)",
    violationMessage: "A domain reads from a concept not owned by an upstream domain — violates dependency order",
  },
  {
    id: "CI-04",
    name: "mustNotContain Equals Complement",
    description: "Each domain's mustNotContain is exactly ALL_CONCEPT_TYPES minus its own owns",
    checkLogic: "domain.mustNotContain = ALL_CONCEPT_TYPES \\ domain.owns (set difference)",
    violationMessage: "mustNotContain is not the exact complement of owns — gap or extra entry detected",
  },
  {
    id: "CI-05",
    name: "Semantic Question Uniqueness",
    description: "No concept can satisfy two domains' semanticQuestions simultaneously",
    checkLogic: "For each classification rule: the concept's semanticTest yields exactly one domain",
    violationMessage: "A concept is classifiable under multiple domains — semantic questions are not mutually exclusive for this concept",
  },
  {
    id: "CI-06",
    name: "Reads Only What Others Own",
    description: "Every item in a domain's reads array exists in some other domain's owns array",
    checkLogic: "For each domain D: every item in D.reads exists in (ALL_CONCEPT_TYPES \\ D.owns)",
    violationMessage: "A domain reads a concept type that no other domain owns — phantom dependency",
  },
  {
    id: "CI-07",
    name: "Hard Constraint Domain Alignment",
    description: "Each hard constraint's domain field matches its containing DomainSemantics (for domain HCs) or is 'security' (for SECURITY_HARD_CONSTRAINTS in security/schema.ts)",
    checkLogic: "For each domain D: every HC in D.hardConstraints has HC.domain === D.domain. For SECURITY_HARD_CONSTRAINTS: every HC has HC.domain === 'security'",
    violationMessage: "A hard constraint is filed under the wrong domain — domain field does not match container",
  },
  {
    id: "CI-08",
    name: "Classification Rule Consistency",
    description: "No concept is classified into two different domains across all classification rules",
    checkLogic: "Collect all CR.concept values: if the same concept appears in multiple CRs, all must have the same CR.domain",
    violationMessage: "A concept is classified differently in different rules — contradictory classification",
  },
  {
    id: "CI-09",
    name: "Digital Twin Stage Bijection",
    description: "Each domain maps to exactly one Digital Twin stage (sense/decide/act), and each stage maps to exactly one domain",
    checkLogic: "DOMAIN_SEMANTICS.map(d => d.digitalTwinStage) produces 3 unique values covering all of ['sense','decide','act']",
    violationMessage: "Digital Twin stage mapping is not a bijection — a stage is missing or duplicated across domains",
  },
] as const;
