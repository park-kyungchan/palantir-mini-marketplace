/**
 * LOGIC Domain Semantics
 *
 * Split from legacy semantics.ts v1.13.1 (D1, 2026-04-19).
 * Digital Twin stage: DECIDE. Owns 5 concept types (LinkType, Interface,
 * Query, DerivedProperty, Function).
 *
 * Consumers MUST import from the parent barrel: `from "../semantics"`.
 */

import type { DomainSemantics } from "./semantics-core";

// =========================================================================
// Section 5: LOGIC_SEMANTICS
// =========================================================================

export const LOGIC_SEMANTICS: DomainSemantics = {
  domain: "logic",
  realWorldRole: "Models how to think about and interpret the current state — the causality blueprint",
  semanticQuestion: "Does this describe HOW TO REASON about what exists — connections, interpretations, derived understanding?",
  description:
    "LOGIC is the intelligence layer. It captures how experts reason about DATA — the 'tribal knowledge' "
    + "of institutions encoded as computable relationships and rules. In a commercial sense: the business "
    + "logic in 'the report named after Bob who has been there 20 years,' forecast models, optimization "
    + "models, the rules for interpreting which metrics matter. On a battlefield: link analysis, classifier "
    + "models, search-around patterns. LOGIC contains two complementary concerns: the Impact Propagation "
    + "Graph (primary — links, interfaces, derived properties, queries) defining how changes flow through "
    + "connections, and Pure Computation (supporting — validation, formatting, derivation functions) "
    + "operating along those paths. LOGIC describes; it does not execute.",
  analogy:
    "A librarian's expertise: knowing that these two authors influenced each other, that readers who "
    + "liked Book A will want Book B, how to trace a citation chain across disciplines — the intelligence "
    + "layer that makes the catalog useful for answering real questions.",
  digitalTwinStage: "decide",
  digitalTwinRole:
    "DECIDE: AI/ML modeling, expert reasoning, and impact propagation compute over current DATA state "
    + "to inform decisions. LOGIC functions produce decision recommendations without executing them. "
    + "In the LEARN feedback path, decision outcomes refine DecisionHeuristics — the DH constants evolve "
    + "from static tribal knowledge into continuously-improved institutional memory. Functions marked with "
    + "toolExposure serve as deterministic tools for LLM orchestration (Pattern 2: Logic Tool Handoff).",
  commercialExamples: [
    {
      sector: "healthcare",
      concept: "Diagnosis → Treatment protocol link chain with Drug → Contraindication traversal: given symptoms, traverse to matching diagnoses, follow links to approved treatments, check patient allergy links against drug contraindication links",
      reasoning: "This is expert clinical reasoning encoded as computable traversal — the path a clinician follows mentally to prescribe safely, not raw patient data or the act of prescribing",
    },
    {
      sector: "logistics",
      concept: "Shipment → Route → Checkpoint link chain with estimatedArrival derived property computed from distance, speed, and dwell-time along the chain, plus supplierDelay SearchAround: find all shipments affected by a single supplier disruption within 2 hops",
      reasoning: "Supply chain reasoning: understanding how a delay at one node propagates through the network is pure interpretation — it describes impact, not stored state or dispatched shipments",
    },
    {
      sector: "finance",
      concept: "Portfolio → Holding → Security link traversal with portfolioBeta derived property (weighted sum of individual betas across holdings) and sectorConcentration validation function (flag if >40% in one sector)",
      reasoning: "Risk analysis is reasoning about data — computing exposure, checking concentration limits, understanding how one security's move affects the whole portfolio. No state is changed.",
    },
    {
      sector: "education",
      concept: "Course prerequisite chain: Course A requires Course B which requires Course C. meetsPrerequisites derived property: student satisfies prerequisites if all ancestor courses have passing grades (recursive link traversal)",
      reasoning: "Prerequisite reasoning is graph traversal — the chain defines how to think about whether a student can enroll, not the enrollment itself or the courses themselves",
    },
    {
      sector: "manufacturing",
      concept: "Predictive maintenance function: if vibration exceeds threshold (>4.5 mm/s) AND operating hours surpass cycle limit (>2000h) AND last inspection >90 days ago, derive maintenanceUrgency from weighted factors (0.4*vibration + 0.35*hours + 0.25*inspection)",
      reasoning: "This is the tribal knowledge of a veteran machinist encoded as computable logic — expert reasoning about when a machine needs attention, independent of actually creating the work order",
    },
    {
      sector: "military",
      concept: "Link analysis: connecting intercepted communication nodes to known entity identifiers via signal metadata, with confidenceScore derived property aggregating corroboration across 3+ intelligence sources using Bayesian weight combination",
      reasoning: "Intelligence analysis is pure reasoning — connecting disparate data points into an understanding of who is connected to whom and how confident we are. No kinetic action is taken.",
    },
    {
      sector: "energy",
      concept: "Grid load balancing: generation units linked to grid nodes, with netLoadFactor derived property computed from (total generation - total demand) across connected nodes, plus contingency SearchAround: if Unit X trips, find all nodes affected within 2 hops",
      reasoning: "Grid reasoning is understanding how power flows and what happens when something changes — the causality blueprint of the electrical network. Adjusting generation output would be ACTION.",
    },
  ],
  projectExamples: [
    { sector: "finance", concept: "threadArticles link (1:M) — connects NewsArticle to StoryThread via camelCase link name", reasoning: "A link defines HOW articles relate to threads — structural reasoning about relationships, not the article data itself" },
    { sector: "finance", concept: "articleCount derived property — computed count of articles per StoryThread", reasoning: "A derived property computes aggregate values from existing data — interpretation layer, not raw storage" },
    { sector: "finance", concept: "findAffectedArticles query — ObjectSet filter for articles matching impact criteria", reasoning: "A query defines HOW to retrieve and filter data — reasoning about which objects match criteria" },
  ],
  owns: ["LinkType", "Interface", "Query", "DerivedProperty", "Function"],
  reads: ["ObjectType", "Property", "ValueType"],
  mustNotContain: [
    "ObjectType", "Property", "ValueType", "StructType", "SharedPropertyType",
    "GeoPointProperty", "GeoShapeProperty", "GeoTemporalProperty",
    "TimeSeriesProperty", "AttachmentProperty", "VectorProperty", "CipherProperty",
    "Mutation", "Webhook", "Automation",
  ],
  classificationRules: [
    {
      id: "CR-LOGIC-01",
      concept: "LinkType connecting Patient to Doctor (M:1 cardinality, FK on Patient)",
      semanticTest: "Does 'Patient has treating Doctor' describe how to REASON about entities?",
      domain: "logic",
      reasoning: "A link is a reasoning path between entities — 'given a Patient, find their Doctor' enables traversal and impact analysis. The link is an edge in the Impact Propagation Graph.",
      counterArgument: "Links have structural definitions (cardinality, FK property, join entity) that feel DATA-like. But the PURPOSE of a link is reasoning/traversal, not describing what exists. A Patient and a Doctor exist independently (DATA); how they relate is LOGIC.",
    },
    {
      id: "CR-LOGIC-02",
      concept: "Edit function computing ontology edits — traverses Incident→Alerts and computes each Alert.status='Resolved'",
      semanticTest: "Does computing impact edits without committing describe how to REASON?",
      domain: "logic",
      reasoning: "Edit functions compute what SHOULD happen along propagation paths without committing. They compute edits — a description of impact, not an execution of change. (OFFICIAL FACT: 'running an edit function outside of an Action will not actually modify any object data' — Palantir Functions docs.) (THREE-LAYER: function computes → action commits → OSDK $returnEdits=post-commit introspection, $validateOnly=pre-commit validation)",
    },
    {
      id: "CR-LOGIC-03",
      concept: "Interface ITrackable requiring {status, lastUpdated} properties and link to AuditLog",
      semanticTest: "Does a shape contract with link constraints describe how to REASON?",
      domain: "logic",
      reasoning: "An interface is a connection contract for polymorphic reasoning — 'anything implementing ITrackable can be tracked the same way.' It enables treating diverse entity types uniformly, which is a reasoning capability.",
      counterArgument: "Interfaces declare property shapes that feel DATA-like. But the PURPOSE is enabling connection polymorphism — a reasoning pattern, not an entity definition.",
    },
    {
      id: "CR-LOGIC-04",
      concept: "DerivedProperty totalRevenue computed from sum of linked LineItem.amount values",
      semanticTest: "Does a computed value from link traversal describe how to REASON?",
      domain: "logic",
      reasoning: "A derived property is interpretation of raw data via computation — totalRevenue doesn't exist as stored state, it's computed by traversing links and aggregating. This is reasoning about data, not the data itself.",
    },
    {
      id: "CR-LOGIC-05",
      concept: "Query/ObjectSet findAffectedSuppliers via SearchAround from Product through SupplyChain links",
      semanticTest: "Does graph traversal for scoping impact describe how to REASON?",
      domain: "logic",
      reasoning: "A query traverses the Impact Propagation Graph to scope the affected set — this is computational reasoning about which entities are impacted, not a stored fact or an execution.",
    },
    {
      id: "CR-LOGIC-06",
      concept: "$validateOnly operation checking submission criteria without mutating state",
      semanticTest: "Does checking validity without changing anything describe how to REASON?",
      domain: "logic",
      reasoning: "$validateOnly reasons about whether constraints are satisfied — it returns a validity assessment without committing any change. Reasoning about validity is LOGIC even though it is invoked via the Action API.",
      counterArgument: "$validateOnly is invoked in the context of an Action and is documented under Action Types. But the semanticTest is clear: no state changes occur, making it reasoning (LOGIC), not execution (ACTION).",
    },
  ],
  hardConstraints: [
    {
      id: "HC-LOGIC-01",
      domain: "logic",
      rule: "SearchAround maximum 3 hops per traversal chain",
      severity: "error",
      source: ".claude/research/palantir/architecture/ontology-model.md §ARCH-39 — Canonical Constraints",
      rationale: "Platform limit on graph traversal depth — exceeding 3 hops causes exponential result expansion and API timeout",
    },
    {
      id: "HC-LOGIC-02",
      domain: "logic",
      rule: "ObjectSet .all() maximum 100,000 objects",
      severity: "error",
      source: ".claude/research/palantir/architecture/ontology-model.md §ARCH-39 — Canonical Constraints",
      rationale: "Memory and performance limit on materializing Object Sets — exceeding this causes OOM or timeout in function execution",
    },
    {
      id: "HC-LOGIC-03",
      domain: "logic",
      rule: "No circular dependencies in derived property computation chains",
      severity: "error",
      source: ".claude/research/palantir/logic/README.md",
      rationale: "Circular derived dependencies cause infinite computation loops — property A derives from B which derives from A is undefined behavior",
    },
    {
      id: "HC-LOGIC-04",
      domain: "logic",
      rule: "Aggregation maximum 10,000 buckets",
      severity: "error",
      source: ".claude/research/palantir/architecture/ontology-model.md §ARCH-39 — Canonical Constraints",
      rationale: "Platform limit on aggregation granularity — exceeding 10K buckets causes performance degradation and potential timeout",
    },
  ],
  boundaryTestId: "DS-2",
} as const;

