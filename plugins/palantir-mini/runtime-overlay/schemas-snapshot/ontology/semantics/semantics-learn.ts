/**
 * LEARN Feedback-Loop & Governance Semantics
 *
 * Split from legacy semantics.ts v1.13.1 (D1, 2026-04-19).
 * Contains: philosophy meta-layer (Decision Lineage, Hallucination Reduction,
 * Tribal Knowledge, Compilation Pipeline, K-LLM, LLM Independence, OOSD,
 * Progressive Autonomy), operational context, LEARN mechanisms, Action
 * governance, Twin fidelity + maturity, LEARN graduation, agentic workflow,
 * edge semantics, workflow lineage, Ontology MCP, scenarios framework, DH
 * refinement, agent composition, schema self-audit, evaluation taxonomy,
 * LEARN evaluation surfaces, platform boundary, MCP product split, Foundry
 * orchestration map, Palantir MCP tool categories, workflow lineage graph
 * model, local workflow resource taxonomy, human-agent leverage criteria,
 * project scope ontology surfaces, ontology design principles, embedded
 * ontology app surfaces, structural change governance.
 *
 * This file is larger than the 700-LOC target because keeping all LEARN-axis
 * concerns co-located preserves cross-reference clarity. Any future split
 * must be semantic (e.g., learn-philosophy / learn-governance / learn-ops).
 *
 * Consumers MUST import from the parent barrel: `from "../semantics"`.
 */

import type { SemanticDomainId } from "./semantics-core";


// =========================================================================
// Section 9: Philosophy Meta-Layer Constants
// =========================================================================
//
// These constants codify the cognitive frameworks from research/palantir/philosophy/
// that govern HOW the ontology system operates and evolves. They are the "meta-WHY"
// above the domain-level semantics in Sections 4-6.
//
// Authority: philosophy/README.md, tribal-knowledge.md, llm-grounding.md,
//            digital-twin.md, ontology-ultimate-vision.md

/**
 * Decision Lineage — the 5 dimensions automatically captured for every decision.
 * This is the LEARN mechanism of the Digital Twin made concrete.
 * Source: philosophy/README.md §Decision Lineage, ontology-ultimate-vision.md §1
 */
export interface DecisionLineageDimension {
  readonly dimension: string;
  readonly captures: string;
  readonly example: string;
}

export const DECISION_LINEAGE: readonly DecisionLineageDimension[] = [
  {
    dimension: "WHEN",
    captures: "Timestamp of the decision",
    example: "2026-03-14T09:22:00Z — the moment the rebalancing was approved",
  },
  {
    dimension: "ATOP_WHICH_DATA",
    captures: "Version of enterprise data the decision was based on",
    example: "Portfolio snapshot v2026.03.14.001 — positions as of market close yesterday",
  },
  {
    dimension: "THROUGH_WHICH_APP",
    captures: "Application or workflow that facilitated the decision",
    example: "AIP Automate → Risk Dashboard → rebalancing action panel",
  },
  {
    dimension: "BY_WHOM",
    captures: "Human user or AI agent that made or approved the decision",
    example: "AI agent proposed, Jane Smith (Risk Manager, Level 3 autonomy) approved",
  },
  {
    dimension: "WITH_WHAT_REASONING",
    captures: "Logic functions, heuristics, and models that informed the decision",
    example: "DH-LOGIC-05 (sector concentration > 40%), VaR function output, K-LLM consensus (3/3 models agreed)",
  },
] as const;

/**
 * Three official Palantir hallucination reduction patterns.
 * Each pattern maps to a semantic domain and provides a specific grounding mechanism.
 * Source: philosophy/llm-grounding.md §Three Official Patterns, Palantir Blog Jul 2024
 */
export interface HallucinationReductionPattern {
  readonly id: string;
  readonly name: string;
  readonly primaryDomain: SemanticDomainId;
  readonly mechanism: string;
  readonly withoutPattern: string;
  readonly withPattern: string;
  readonly systemImplication: string;
}

export const HALLUCINATION_REDUCTION_PATTERNS: readonly HallucinationReductionPattern[] = [
  {
    id: "HRP-01",
    name: "Ontology-Augmented Generation (OAG)",
    primaryDomain: "data",
    mechanism: "LLMs query the Ontology for trusted entity data instead of hallucinating answers from training data",
    withoutPattern: "LLM hallucinates plausible but wrong organization-specific facts (e.g., invents distribution center cities)",
    withPattern: "LLM invokes Query Tool → returns actual entity data from the Ontology's DATA layer",
    systemImplication: "DATA entity properties serve as the trusted LLM query source. DerivedProperty and Function must be designable as LLM-callable tools.",
  },
  {
    id: "HRP-02",
    name: "Logic Tool Handoff",
    primaryDomain: "logic",
    mechanism: "LLMs delegate computation to deterministic LOGIC Functions instead of approximating results",
    withoutPattern: "LLM approximates distance/simulation/forecasting calculations (wrong results)",
    withPattern: "LLM invokes typed Function (e.g., Haversine distance) → deterministic correct answer",
    systemImplication: "LOGIC Functions need toolExposure property marking them as available to LLM orchestration. Only computation tasks LLMs cannot do (distance, forecasting, optimization) should be exposed.",
  },
  {
    id: "HRP-03",
    name: "Human-in-the-Loop Action Review",
    primaryDomain: "action",
    mechanism: "AI-proposed actions pass through structured review gates before execution",
    withoutPattern: "AI autonomously executes actions that may be based on hallucinated reasoning",
    withPattern: "AI proposes action → human reviews in context (sees impact chain, data version, reasoning) → approves/rejects/modifies → action executes with full audit trail",
    systemImplication: "ACTION needs reviewLevel and approvalWorkflow properties — explicit human-in-the-loop gates governed by Progressive Autonomy levels.",
  },
] as const;

/**
 * Tribal Knowledge 5-Stage Progression — from implicit expertise to autonomous reasoning.
 * Source: philosophy/tribal-knowledge.md §5-Stage Progression, ontology-ultimate-vision.md §7
 */
export interface TribalKnowledgeStage {
  readonly stage: number;
  readonly name: string;
  readonly description: string;
  readonly mechanism: string;
  readonly ourSystemState: "achieved" | "partial" | "future";
}

export const TRIBAL_KNOWLEDGE_PROGRESSION: readonly TribalKnowledgeStage[] = [
  {
    stage: 1,
    name: "Tribal Knowledge",
    description: "Expert knowledge is implicit — lives in people's heads, fragile, session-dependent",
    mechanism: "Discovery: interviews, observation, incident post-mortems, code review patterns",
    ourSystemState: "achieved",
  },
  {
    stage: 2,
    name: "DecisionHeuristic",
    description: "Expert knowledge is explicit — encoded as typed DH/HC constants with reasoning",
    mechanism: "Encoding: DH-DATA-01..10, DH-LOGIC-01..14, DH-ACTION-01..15, DH-SEC-01..08, HC-*-01..N",
    ourSystemState: "achieved",
  },
  {
    stage: 3,
    name: "LLM-Accessible Tools",
    description: "Encoded knowledge grounds LLM sessions via OAG, Logic Tools, Action Review patterns",
    mechanism: "Operationalization: semantics.ts + domain schemas read by every LLM session → K-LLM consensus",
    ourSystemState: "achieved",
  },
  {
    stage: 4,
    name: "Institutional Memory",
    description: "Decision outcomes are captured via Decision Lineage, enriching future decisions",
    mechanism: "Decision Lineage: WHEN/ATOP/THROUGH/BY/WITH recorded per decision → feedback loop",
    ourSystemState: "partial",
  },
  {
    stage: 5,
    name: "Autonomous Reasoning",
    description: "System self-improves DHs from tracked outcomes, operates with progressive autonomy",
    mechanism: "Continuous Learning: outcome tracking → DH refinement → staged autonomy promotion (REF-01..05 BackPropagation chain)",
    ourSystemState: "partial",
  },
] as const;

/**
 * Semantic Compilation Pipeline — 4 stages reducing ambiguity from business language to execution.
 * Source: philosophy/README.md §4-Stage Semantic Compilation Pipeline
 */
export interface CompilationStage {
  readonly stage: number;
  readonly name: string;
  readonly input: string;
  readonly output: string;
  readonly ourMapping: string;
}

export const SEMANTIC_COMPILATION_PIPELINE: readonly CompilationStage[] = [
  {
    stage: 1,
    name: "Business Language",
    input: "Natural, ambiguous domain expert descriptions",
    output: "Requirements and domain concepts expressed in prose",
    ourMapping: "research/palantir/entry/ (requirements capture, decomposition)",
  },
  {
    stage: 2,
    name: "Domain Modeling",
    input: "Prose requirements from Stage 1",
    output: "Typed ontology definitions: objects, properties, links, actions",
    ourMapping: "ontology/*.ts files (the business language made formal)",
  },
  {
    stage: 3,
    name: "Schema Compilation",
    input: "Ontology definitions from Stage 2",
    output: "Platform-specific indexed, queryable, executable schemas",
    ourMapping: "schemas/ontology/ (semantic SSoT) → skill-time compilation → convex/schema.ts + src/ (adapter output)",
  },
  {
    stage: 4,
    name: "Logic Binding + Action Execution",
    input: "Compiled schemas from Stage 3",
    output: "Functions bound to the model, actions executing against reality",
    ourMapping: "convex/model/ (logic), convex/mutations.ts (actions), src/ (frontend execution)",
  },
] as const;

/**
 * K-LLM: Multi-Model Consensus via Ontology.
 * [Official — CTO Shyam Sankar, AIP product update] "K-LLM" IS an official Palantir
 * concept. CTO Shyam Sankar presented "K-LLMs, not LLMs" publicly; Palantir LinkedIn
 * posted "Never use 1 LLM when you can use K-LLMs." The developer quote elaborates the
 * mechanism. Our CC application (sessions reading semantics.ts) is [Inference].
 * Source: philosophy/llm-grounding.md §K-LLM
 */
export const K_LLM = {
  /** The core mechanism: multiple independent LLMs reason against the same Ontology ground truth. */
  mechanism:
    "Multiple LLMs (from different providers) reasoning against the same Ontology. "
    + "When independent models arrive at the same conclusion backed by Ontology data, "
    + "the probability of hallucination is very low — consensus through grounded agreement.",
  /** Our system implements K-LLM by construction. */
  ourImplementation:
    "Every provider or interface family that reads the same semantics.ts typed constants "
    + "operates against the same ontology ground truth, producing output verified by the same test suite. "
    + "Claude Code, Codex, or any future agent session should converge on the same decisions because they read "
    + "the same DecisionHeuristic/HardConstraint grounding constants instead of vendor-specific prompt lore.",
  /** The key principle. */
  principle: "Consensus-driven confidence, not single-model confidence",
} as const;

export interface LlmIndependenceInvariant {
  readonly id: string;
  readonly name: string;
  readonly requirement: string;
  readonly rationale: string;
  readonly implementationImplication: string;
}

/**
 * LLM Independence — provider-neutral runtime contract.
 * K-LLM only works in practice when the system does not leak vendor-specific
 * assumptions into ontology semantics or feedback loops.
 */
export const LLM_INDEPENDENCE: readonly LlmIndependenceInvariant[] = [
  {
    id: "LLMI-01",
    name: "Ontology Before Vendor",
    requirement:
      "Business semantics, decision heuristics, and hard constraints must be expressed without naming a preferred model vendor or interface family.",
    rationale:
      "If domain meaning depends on 'what Claude does' or 'what Codex prefers', the ontology is no longer the semantic source of truth — the vendor prompt style is.",
    implementationImplication:
      "Semantics live in ontology/research/schema constants. Runtime adapters may normalize provider names, but they must not redefine ontology concepts.",
  },
  {
    id: "LLMI-02",
    name: "Provider-Neutral Identity",
    requirement:
      "Runtime traces must distinguish actor type, interface family, model identity, and provider as separate fields instead of collapsing them into one opaque string.",
    rationale:
      "A system cannot audit Claude/Codex coexistence if 'agent:worker:gpt-5.3-codex' and 'agent:worker:claude-opus' are only stored as free-form labels.",
    implementationImplication:
      "Store normalized runtime fields such as actorType, interfaceFamily, normalizedModel, and modelProvider. Graphs and audits should reason over those fields.",
  },
  {
    id: "LLMI-03",
    name: "Evaluation Independence",
    requirement:
      "Rubrics, outcomes, and autonomy promotion logic must score decision quality, not vendor loyalty.",
    rationale:
      "If the LEARN loop rewards a specific provider instead of measured correctness, the system will drift toward vendor lock-in rather than operational truth.",
    implementationImplication:
      "Evaluation suites and autonomy policies may observe provider mix, but pass/fail and graduation criteria must be expressed in provider-neutral terms.",
  },
] as const;

/**
 * Ontology-Oriented Software Development (OOSD) — 4 principles.
 * Source: philosophy/README.md §OOSD, Palantir Blog "Ontology-Oriented Software Development"
 */
export interface OosdPrinciple {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly ourMapping: string;
}

export const OOSD_PRINCIPLES: readonly OosdPrinciple[] = [
  {
    id: "OOSD-01",
    name: "Code in Business Language",
    description: "Business concepts (Airplanes, Flight Schedules, Airports) become first-class API objects — not rows, columns, or joins",
    ourMapping: "ontology/*.ts files ARE the business language — entities named in domain terms, not technical primitives",
  },
  {
    id: "OOSD-02",
    name: "Abstraction of Implementation",
    description: "Internal storage, indexing, and query optimization are hidden behind the Ontology's semantic layer",
    ourMapping: "schemas/ defines the compilation rules; convex/ is the implementation detail hidden from ontology consumers",
  },
  {
    id: "OOSD-03",
    name: "Marginal Cost → Zero",
    description: "OSDK drives the marginal cost of bespoke enterprise software toward zero by generating typed clients from ontology definitions",
    ourMapping: "Schema-driven code generation: ontology definitions → convex schema → typed queries/mutations → frontend hooks",
  },
  {
    id: "OOSD-04",
    name: "Defragmented Enterprise",
    description: "Isolated systems (ERP, CRM, sensors, BI tools) integrate into a holistic semantic model",
    ourMapping: "Single ontology unifies all data sources — no separate schemas for different subsystems",
  },
] as const;

/**
 * Progressive Autonomy — 5 levels of AI-driven automation.
 * [Inference from AIPCon deployment demos + developer statements. The PA-01..PA-05
 * numbering is 100% local inference. Official Palantir mechanism is binary: staged
 * review (human-reviewed proposals) vs auto-apply. The phrase "progressive autonomy"
 * does not appear in official Palantir documentation. Closest official concept is
 * the Agent Tier Framework (Tier 1-4), which describes builder complexity, not
 * runtime autonomy levels.]
 * Source: philosophy/digital-twin.md §Progressive Autonomy, ontology-ultimate-vision.md §6
 */
export interface ProgressiveAutonomyLevel {
  readonly level: number;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly example: string;
  readonly primaryDomain: SemanticDomainId;
}

export const PROGRESSIVE_AUTONOMY_LEVELS: readonly ProgressiveAutonomyLevel[] = [
  {
    level: 1,
    id: "PA-01",
    name: "Monitor",
    description: "Twin observes and reports — no action taken, human makes all decisions",
    example: "Dashboard shows anomalies in supply chain; operator decides what to do",
    primaryDomain: "data",
  },
  {
    level: 2,
    id: "PA-02",
    name: "Recommend",
    description: "Twin suggests actions to humans — AI proposes, human decides",
    example: "\"Consider rebalancing sector X\" — analyst reviews recommendation and acts manually",
    primaryDomain: "logic",
  },
  {
    level: 3,
    id: "PA-03",
    name: "Approve-then-act",
    description: "Twin prepares actions, human approves before execution",
    example: "AIP Automate staged review: AI drafts purchase order, procurement lead approves",
    primaryDomain: "action",
  },
  {
    level: 4,
    id: "PA-04",
    name: "Act-then-inform",
    description: "Twin executes autonomously, human is notified after the fact",
    example: "Automated maintenance scheduling: system reschedules shift, manager gets notification",
    primaryDomain: "action",
  },
  {
    level: 5,
    id: "PA-05",
    name: "Full autonomy",
    description: "Twin operates independently within defined risk boundaries",
    example: "Algorithmic trading within risk limits — no human in the loop for routine trades",
    primaryDomain: "action",
  },
] as const;

// =========================================================================
// Section 10: Operational Context Modeling
// =========================================================================
//
// The Ontology is the context store of operations. This is MORE than just data.
// DATA represents the current state of the world. LOGIC is HOW to think about
// that state. ACTION is the levers to affect the real world. All three must be
// modeled in the context of your operations — not how some BI tool needs it.
//
// "The semantics HAVE to be more than just data, and they have to be modeled
//  how the real world is actually working, not how some BI tool needs it."
// — Palantir developer practitioner
//
// This section defines the MODELING principles that make the ontology faithful
// to real-world operations across commercial and defense contexts.
//
// Source: Developer practitioner statement (verbatim)
//         philosophy/digital-twin.md, philosophy/ontology-ultimate-vision.md §1-6
//         AIPCon 8-9 demos (GE Aerospace, ShipOS, World View, Centrus)

/**
 * Operational context modeling example — demonstrates how a real-world domain
 * decomposes into DATA + LOGIC + ACTION in the context of actual operations,
 * not in the context of BI or reporting tools.
 *
 * "You need the data, logic, and actions modeled in the context of your operations."
 */
export interface OperationalContextExample {
  readonly id: string;
  readonly sector: string;
  readonly domain: string;
  /** What operations this domain runs. */
  readonly operationalContext: string;
  /** DATA: the ground truth of current state. */
  readonly data: string;
  /** LOGIC: how experts reason about that state — including tribal knowledge. */
  readonly logic: string;
  /** ACTION: the levers that affect the real world. */
  readonly action: string;
  /** LEARN: how outcomes feed back to improve the next cycle. */
  readonly learn: string;
  /** Source: AIPCon demo, partner case study, or industry deployment. */
  readonly source: string;
}

export const OPERATIONAL_CONTEXT_EXAMPLES: readonly OperationalContextExample[] = [
  {
    id: "OCE-01",
    sector: "manufacturing",
    domain: "Aerospace engine production",
    operationalContext:
      "Full production lifecycle: parts procurement → assembly → quality inspection → testing → delivery. "
      + "200-hour BOM approval cycles compressed to 15 seconds. 26% more engines output year-over-year.",
    data:
      "Bill of Materials (every part, every spec), supplier lead times, assembly line sensor telemetry "
      + "(torque, temperature, vibration), quality inspection results, production schedule, workforce allocation",
    logic:
      "BOM approval rules (previously 200 hours of manual cross-checking), predictive maintenance from sensor "
      + "anomaly patterns, bottleneck identification across production lines, supplier risk scoring from lead time "
      + "history — the tribal knowledge of 20-year veteran engineers encoded as computable functions",
    action:
      "Create work orders, adjust production schedules, trigger supplier re-sourcing, approve BOMs, "
      + "escalate quality holds, dispatch maintenance technicians",
    learn:
      "Production outcomes (actual yield vs predicted) → refine scheduling models. "
      + "2024 foundation → 2025 rigorous application → 26% output increase demonstrates compound learning.",
    source: "GE Aerospace — AIPCon 8-9",
  },
  {
    id: "OCE-02",
    sector: "military",
    domain: "Naval shipbuilding supply chain",
    operationalContext:
      "Entire supply chain from shipbuilders to shipyards to thousands of suppliers. "
      + "A single engineering change notice cascades across dozens of suppliers, hundreds of work orders, "
      + "and a production timeline measured in years.",
    data:
      "Ship specifications, supplier contracts, material inventories, production timelines, engineering "
      + "change notices, work order status, facility capacity, workforce certifications",
    logic:
      "Cascade analysis: one change notice → trace impact through ontology graph → find all affected "
      + "suppliers, parts, timelines. COA generation: produce 3 options with quantified trade-offs "
      + "(days of delay, dollars of cost, risk score). Email triage: AI classifies incoming supplier "
      + "communications and routes to correct decision-maker.",
    action:
      "Act now (minimal schedule/cost impact), Defer (defined cost growth, defined schedule risk), "
      + "or Reject and escalate (full impact assessment required). Each COA applies different edit sets. "
      + "'What used to land on somebody's desk as a problem now arrives as a decision with context, "
      + "options, and trade-offs already mapped.'",
    learn:
      "Actual schedule vs predicted → calibrate prediction models. "
      + "Risk identified earlier → intervention sooner → schedule recovery reduced, cost growth contained.",
    source: "US Navy ShipOS — AIPCon 9",
  },
  {
    id: "OCE-03",
    sector: "energy",
    domain: "Nuclear power operations",
    operationalContext:
      "Highly regulated operations where every action must be auditable. "
      + "'For us in the nuclear field, you have to audit everything. The NRC isn't very comfortable "
      + "with agentic autonomous control.'",
    data:
      "Reactor telemetry, component health metrics, regulatory compliance documents, inspection records, "
      + "maintenance history, personnel certifications, NRC regulatory requirements",
    logic:
      "Component health assessment: long-running agents that evaluate every component in every product "
      + "on every line. Regulatory rule tracing: each operational rule traced back to source NRC document. "
      + "Remediation suggestion: agents propose automated fixes based on component health patterns.",
    action:
      "Maintenance work orders, component replacements, regulatory reporting submissions, "
      + "compliance attestations — all with full decision lineage for NRC audit trail",
    learn:
      "'Every action taken here compounds. The system learns and improves, enables faster, "
      + "more accurate decisions tomorrow.' Outcome tracking feeds back into component health models, "
      + "improving predictive accuracy for the next maintenance cycle.",
    source: "Centrus Energy — AIPCon 9",
  },
  {
    id: "OCE-04",
    sector: "aerospace",
    domain: "Stratospheric flight operations",
    operationalContext:
      "Mission planning, real-time flight management, and post-mission intelligence. "
      + "AI Flight Director compressed mission planning from 2 weeks to minutes.",
    data:
      "Flight telemetry, weather data, payload specifications, airspace restrictions, "
      + "historical mission logs, sensor imagery, communications intercepts",
    logic:
      "Mission constraint propagation: update one constraint, see downstream effects instantaneously. "
      + "Flight path optimization: balance payload requirements, weather windows, and airspace restrictions. "
      + "Post-flight intelligence: synthesize sensor data into actionable intelligence reports.",
    action:
      "Launch authorization, real-time flight path adjustments, payload deployment, "
      + "emergency recovery procedures, intelligence dissemination",
    learn:
      "'Every mission, the ontology becomes a living memory of the operation.' "
      + "Past events, decisions, and outcomes enrich every future flight plan. "
      + "'The stratosphere ceases being a platform that collects data and starts becoming "
      + "a platform that participates in decisions.'",
    source: "World View — AIPCon 9",
  },
  {
    id: "OCE-05",
    sector: "finance",
    domain: "Mortgage operations at scale",
    operationalContext:
      "500K calls/month, regulatory documents, compliance rules — all flowing into the ontology. "
      + "Each customer interaction is a 'huge event operating uniformly inside the Ontology.'",
    data:
      "Call transcripts, loan documents, regulatory rule database, customer records, "
      + "property valuations, credit reports, title searches",
    logic:
      "Regulatory rule interpretation: each rule traced back to source regulatory document. "
      + "Call classification: AI categorizes call intent and routes to appropriate workflow. "
      + "Document completeness: verify all required documents are present for loan stage.",
    action:
      "Advance loan to next stage, request missing documents, schedule appraisal, "
      + "flag compliance exception, generate disclosure letters",
    learn:
      "IT projects that took months or years compressed to minutes, hours, and days. "
      + "Agent performance feedback from operators improves classification accuracy over time.",
    source: "Freedom Mortgage (Moder) — AIPCon 9",
  },
] as const;

// =========================================================================
// Section 11: LEARN Feedback Mechanisms
// =========================================================================
//
// The LEARN stage (DIGITAL_TWIN_LOOP[3]) is not a separate domain — it is the
// feedback path from ACT back to SENSE. These three mechanisms define HOW that
// feedback path operates, closing the loop from "snapshot" to "living system."
//
// Without these mechanisms, the digital twin is a dashboard.
// With them, it is an operating system that improves with every decision cycle.
//
// Source: philosophy/digital-twin.md §Three LEARN Mechanisms
//         AIPCon 8-9 demos (GE Aerospace, Centrus, Naval ShipOS)

/**
 * A discrete mechanism by which the LEARN stage feeds outcomes back into the twin.
 */
export interface LearnMechanism {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly palantirMechanism: string;
  /** Which domain layer receives the feedback from this mechanism. */
  readonly feedbackTarget: string;
  /** Real-world example from AIPCon deployments. */
  readonly realWorldExample: string;
  /** CC adapter implementation status. Source: architecture/adapter-gap-analysis.md */
  readonly implementationStatus: "implemented" | "partial" | "declaration_only" | "not_applicable";
  /** How the CC adapter implements this mechanism. Empty string if not_applicable. */
  readonly ccImplementation: string;
}

export const LEARN_MECHANISMS: readonly LearnMechanism[] = [
  {
    id: "LEARN-01",
    name: "Write-Back to Operational Systems",
    description:
      "ACTION outcomes are written back as new DATA entities, closing the SENSE→ACT loop. "
      + "The twin is not a mirror — it is a control panel. Changes made through the ontology "
      + "push back into downstream systems, update ERP states, and trigger work orders.",
    palantirMechanism:
      "Digital twin pushes state changes back into downstream operational systems "
      + "(ERPs, SCADA, supply chain planners) via webhooks and sync pipelines",
    feedbackTarget: "DATA layer — action outcomes become new entity state for the next SENSE cycle",
    realWorldExample:
      "Naval ShipOS: schedule predictions (DECIDE) → change execution (ACT) → "
      + "actual vs predicted timeline written back as new DATA → calibrated prediction models",
    implementationStatus: "implemented",
    ccImplementation: "Convex mutations → DB records + outcomeRecords table (REF-01). Every mutation result is persisted as new document state. DH-informed decisions recorded via recordPrediction, outcomes measured by analyzeOutcomes cron via recordActualOutcome.",
  },
  {
    id: "LEARN-02",
    name: "Evaluation Feedback Loop",
    description:
      "End-users flag AI outputs (correct/incorrect, helpful/unhelpful). Feedback is captured "
      + "as DATA in the ontology — not lost in chat history — then leveraged in the AI development "
      + "cycle to measure and improve quality through structured evaluation pipelines.",
    palantirMechanism:
      "AIP Evals: structured evaluation pipeline where user feedback is captured in the ontology, "
      + "dynamically integrated into eval suites, and used to improve model/prompt quality over time",
    feedbackTarget: "LOGIC layer — feedback refines Functions, models, and DecisionHeuristics",
    realWorldExample:
      "GE Aerospace: foundation laid in 2024, rigorous application of operational processes "
      + "in 2025 resulted in 26% more engines output — each production cycle's outcomes improved "
      + "the next cycle's planning models through continuous evaluation feedback",
    implementationStatus: "implemented",
    ccImplementation: "feedbackEvents table + dashboardActions.submitFeedback mutation + Lineage tab feedback buttons + /hooks/feedback HTTP route. Feedback feeds REF-01 outcome measurement (relatedFeedback → delta) in analyzeOutcomes cron.",
  },
  {
    id: "LEARN-03",
    name: "Decision Outcome Tracking",
    description:
      "Every decision's outcome is measured against its prediction, captured via Decision Lineage "
      + "(WHEN/ATOP/THROUGH/BY/WITH). Outcomes that contradict existing DecisionHeuristics trigger "
      + "refinement — DHs evolve from static tribal knowledge into continuously-improved institutional memory.",
    palantirMechanism:
      "Decision Lineage + AIP Automate outcome capture: selected COA rationale recorded, "
      + "outcome measured post-execution, heuristic accuracy tracked over time",
    feedbackTarget: "Cross-domain — outcomes update DATA, refine LOGIC heuristics, adjust ACTION autonomy levels",
    realWorldExample:
      "Centrus Energy (nuclear): 'Every action taken here compounds. The system learns "
      + "and improves, enables faster, more accurate decisions tomorrow.' Decision lineage is "
      + "critical for NRC audit compliance in the nuclear field.",
    implementationStatus: "implemented",
    ccImplementation: "outcomeAnalysis table + analyzeOutcomes action (cron: 30min) + REF-01..05 BackPropagation chain: outcomeRecords → dhAccuracyScores → refinementSignals → dhUpdateProposals → automationGraduation. Six crons: 30min(analysis), 6h(stale+accuracy), 12h(drift), 24h(graduation).",
  },
] as const;

// =========================================================================
// Section 12: Action Governance Model
// =========================================================================
//
// Every action in the ontology is governed by 5 dimensions. This is not RBAC alone
// (which is SECURITY_OVERLAY) — it is the full governance model that ENABLES
// progressive autonomy. Without auditable, staged, reversible actions, organizations
// cannot trust AI enough to let it act. Governance makes autonomy possible.
//
// Source: philosophy/digital-twin.md §Progressive Autonomy
//         Palantir Ontology platform page, AIPCon 9

/**
 * The 5 governance dimensions for every ontology action.
 * Governance is not a brake on AI — it is the mechanism that enables higher autonomy.
 */
export interface ActionGovernanceDimension {
  readonly id: string;
  readonly dimension: string;
  readonly mechanism: string;
  readonly enforcedBy: string;
}

export const ACTION_GOVERNANCE: readonly ActionGovernanceDimension[] = [
  {
    id: "AG-01",
    dimension: "Who can invoke it",
    mechanism: "Role-Based Access Control (RBAC) — ontology roles define broad permission categories",
    enforcedBy: "SECURITY_OVERLAY.layers[0] (RBAC)",
  },
  {
    id: "AG-02",
    dimension: "Under what conditions",
    mechanism: "Submission criteria — business rules that gate execution beyond RBAC (parameter validation, context checks, real-time attribute constraints)",
    enforcedBy: "HC-ACTION-05 (all submission criteria must pass)",
  },
  {
    id: "AG-03",
    dimension: "With what review level",
    mechanism: "Progressive autonomy — 5 levels from Monitor to Full Autonomy determine whether human review is required",
    enforcedBy: "PROGRESSIVE_AUTONOMY_LEVELS (PA-01..PA-05)",
  },
  {
    id: "AG-04",
    dimension: "What it changes",
    mechanism: "Typed edits — every mutation declares exactly which entities, properties, and links it modifies",
    enforcedBy: "ACTION_SEMANTICS.owns (Mutation, Webhook, Automation)",
  },
  {
    id: "AG-05",
    dimension: "What trace it leaves",
    mechanism: "Decision lineage — every execution captured across 5 dimensions (WHEN/ATOP/THROUGH/BY/WITH)",
    enforcedBy: "DECISION_LINEAGE (5 dimensions)",
  },
] as const;

// =========================================================================
// Section 13: Digital Twin Fidelity Dimensions
// =========================================================================
//
// The digital twin is MORE than a feedback loop diagram. It is a semantic modeling
// paradigm where typed definitions maintain correspondence between twin and reality.
// Without semantic modeling, the twin drifts from reality.
//
// Source: philosophy/digital-twin.md, philosophy/ontology-ultimate-vision.md §6-7

/**
 * How the twin maintains correspondence with physical reality.
 * Each dimension shows what happens WITHOUT vs WITH semantic modeling.
 */
export interface TwinFidelityDimension {
  readonly id: string;
  readonly name: string;
  readonly semanticRole: string;
  readonly withoutSemantic: string;
  readonly withSemantic: string;
}

export const TWIN_FIDELITY_DIMENSIONS: readonly TwinFidelityDimension[] = [
  {
    id: "TF-01",
    name: "Entity Correspondence",
    semanticRole: "Every real-world object has exactly one typed ObjectType with exhaustive properties",
    withoutSemantic: "Twin models a 'machine' with ad-hoc fields — different sessions add different properties, twin diverges from reality",
    withSemantic: "ObjectType 'CNCMachine' has 6 typed properties (serial, model, axes, spindle, magazine, vibration) — all sessions produce identical entity shape",
  },
  {
    id: "TF-02",
    name: "Relationship Faithfulness",
    semanticRole: "Every real-world connection has a typed LinkType with cardinality and traversal semantics",
    withoutSemantic: "Twin links 'Patient' to 'Doctor' with no cardinality — M:1 vs M:N ambiguity causes different traversal results per session",
    withSemantic: "LinkType 'treatingDoctor' (M:1, FK on Patient) — traversal semantics are deterministic across all sessions",
  },
  {
    id: "TF-03",
    name: "Interpretation Consistency",
    semanticRole: "Every derived value is a typed DerivedProperty with explicit computation formula",
    withoutSemantic: "Twin computes 'risk score' differently per session — one uses simple average, another uses weighted sum, results diverge",
    withSemantic: "DerivedProperty 'portfolioBeta' — weighted sum of individual betas across holdings — deterministic computation across sessions",
  },
  {
    id: "TF-04",
    name: "Action Determinism",
    semanticRole: "Every state change is a typed Mutation with submission criteria and typed edits",
    withoutSemantic: "Twin 'updates inventory' with free-form logic — some sessions validate before write, others don't, twin state becomes inconsistent",
    withSemantic: "Mutation 'adjustReorderPoint' — typed parameters, submission criteria (HC-ACTION-05), typed Edits[] — deterministic execution",
  },
  {
    id: "TF-05",
    name: "Temporal Coherence",
    semanticRole: "The LEARN loop ensures every decision outcome updates the twin's state, maintaining temporal fidelity",
    withoutSemantic: "Twin reflects yesterday's reality — decisions made today are not captured, twin drifts from current state",
    withSemantic: "LEARN-01 write-back + LEARN-03 decision outcome tracking — twin continuously reflects latest reality including decision impacts",
  },
] as const;

/**
 * Twin maturity progression: how a digital twin evolves from passive to autonomous.
 * Each stage requires the previous stage's semantic infrastructure.
 */
export interface TwinMaturityStage {
  readonly stage: number;
  readonly name: string;
  readonly description: string;
  readonly semanticRequirement: string;
  readonly realWorldExample: string;
}

export const TWIN_MATURITY_STAGES: readonly TwinMaturityStage[] = [
  {
    stage: 1,
    name: "Snapshot",
    description: "Twin reflects a point-in-time state of reality — data ingested but not continuously updated",
    semanticRequirement: "DATA layer with typed ObjectTypes and Properties — entity correspondence (TF-01)",
    realWorldExample: "Static asset registry: all machines cataloged with specs, but twin is refreshed manually",
  },
  {
    stage: 2,
    name: "Mirror",
    description: "Twin continuously reflects current reality — data streams in real-time, but twin is read-only",
    semanticRequirement: "DATA + real-time ingestion pipelines — temporal coherence (TF-05) for SENSE",
    realWorldExample: "Live production dashboard: sensor data streams in, operators observe but act through separate systems",
  },
  {
    stage: 3,
    name: "Model",
    description: "Twin reasons about reality — LOGIC layer interprets data, derives insights, propagates impact",
    semanticRequirement: "DATA + LOGIC with typed LinkTypes, DerivedProperties, Functions — relationship faithfulness (TF-02) + interpretation consistency (TF-03)",
    realWorldExample: "Predictive maintenance: twin computes maintenanceUrgency from vibration, hours, inspection — recommends but doesn't act",
  },
  {
    stage: 4,
    name: "Operator",
    description: "Twin changes reality — ACTION layer commits decisions, governed by progressive autonomy",
    semanticRequirement: "DATA + LOGIC + ACTION with typed Mutations, submission criteria, autonomy levels — action determinism (TF-04)",
    realWorldExample: "AIP Automate: twin proposes work orders, human approves, twin executes and logs decision lineage",
  },
  {
    stage: 5,
    name: "Living System",
    description: "Twin learns from outcomes — LEARN loop closes, every decision cycle improves the next",
    semanticRequirement: "Full SENSE-DECIDE-ACT-LEARN loop with all 3 LEARN_MECHANISMS + DECISION_LINEAGE",
    realWorldExample: "World View: 'Every mission, the ontology becomes a living memory of the operation — past events, decisions, and outcomes enrich every future flight plan'",
  },
] as const;

// =========================================================================
// Section 16: LEARN Graduation Criteria
// =========================================================================
//
// Autonomy increases as trust is earned through measured accuracy. Each
// graduation from staged review to auto-apply requires satisfying these
// criteria. Source: digital-twin.md §Graduation Pattern,
// automation.md §Auto-Apply Graduation Criteria
//
// This closes the gap between Stage 3 (LLM-Accessible Tools) and Stage 4-5
// (Institutional Memory → Autonomous Reasoning) in TRIBAL_KNOWLEDGE_PROGRESSION.

export interface LearnGraduationCriterion {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly metric: string;
  readonly source: string;
}

export const LEARN_GRADUATION_CRITERIA: readonly LearnGraduationCriterion[] = [
  {
    id: "LGC-01",
    name: "Accuracy Rate",
    description: "What percentage of AI proposals are accepted without modification? High acceptance signals readiness for auto-apply.",
    metric: "Proportion of accepted vs rejected/modified proposals in the staged review queue over a rolling window",
    source: "research/palantir/action/automation.md §Auto-Apply Graduation Criteria",
  },
  {
    id: "LGC-02",
    name: "Risk Profile",
    description: "Does the automation touch sensitive data or high-value objects? Low-risk, high-volume automations graduate first.",
    metric: "Object sensitivity classification + marking levels + financial impact threshold of affected entities",
    source: "research/palantir/action/automation.md §Auto-Apply Graduation Criteria",
  },
  {
    id: "LGC-03",
    name: "Volume Sufficiency",
    description: "Is there enough decision history to build statistical confidence in the automation's reliability?",
    metric: "Count of completed LEARN-03 decision outcome cycles for this specific automation pattern",
    source: "research/palantir/philosophy/digital-twin.md §Graduation Pattern",
  },
  {
    id: "LGC-04",
    name: "Reversibility",
    description: "Can the edits be easily undone if the AI makes errors? Reversible actions graduate faster.",
    metric: "Whether the action supports reverts (HC-ACTION-29) + downstream impact scope (propagation graph depth)",
    source: "research/palantir/action/automation.md §Auto-Apply Graduation Criteria + mutations.md §Action Reverts",
  },
] as const;

// =========================================================================
// Section 17: Agentic Workflow Patterns
// =========================================================================
//
// AI agents within the Ontology chain DATA queries (OAG Pattern 1), LOGIC tools
// (Pattern 2), and ACTION proposals (Pattern 3) — executing multi-step workflows.
// These are NOT free-form LLM agents. They are ontology-grounded: their tools,
// context, and actions are all derived from the ontology.
//
// Source: philosophy/digital-twin.md §Agentic Workflows
//         philosophy/llm-grounding.md §Ontology-Grounded Agents
//         AIPCon 9 demos (Freedom Mortgage, World View, Centrus)

export interface AgenticWorkflowPattern {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly toolChain: string;
  readonly realWorldDeployment: string;
  readonly source: string;
}

export const AGENTIC_WORKFLOW_PATTERNS: readonly AgenticWorkflowPattern[] = [
  {
    id: "AWP-01",
    name: "Document Processing Agent",
    description:
      "Agents grounded in domain ontology process documents at scale — extracting entities, "
      + "classifying content, and tracing rules back to source regulatory documents. The ontology "
      + "provides the entity schema that constrains what the agent can extract and how it classifies.",
    toolChain: "DATA queries (OAG) → LOGIC classification functions → ACTION entity creation",
    realWorldDeployment: "Freedom Mortgage: 500K calls/month, all documents uniformly operating inside the Ontology, rules traced to source regulatory documents",
    source: "research/palantir/philosophy/digital-twin.md §Agentic Workflows, AIPCon 9",
  },
  {
    id: "AWP-02",
    name: "Real-Time Planning Agent",
    description:
      "Agents with constraint propagation — update one constraint, see downstream effects instantaneously. "
      + "The ontology's Impact Propagation Graph (LOGIC layer) defines how changes cascade, enabling "
      + "agents to evaluate trade-offs across multiple scenarios before proposing actions.",
    toolChain: "DATA entity reads → LOGIC impact propagation → ACTION scenario proposals (PA-03)",
    realWorldDeployment: "World View: AI Flight Director compressed mission planning from 2 weeks to minutes — 'the stratosphere becomes a platform that participates in decisions'",
    source: "research/palantir/philosophy/digital-twin.md §Agentic Workflows, AIPCon 9",
  },
  {
    id: "AWP-03",
    name: "Continuous Monitoring Agent",
    description:
      "Long-running agents operating as advocates for every component in every product on every line. "
      + "These agents continuously SENSE (monitor ontology state), DECIDE (evaluate against thresholds "
      + "and heuristics), and propose ACTIONs with full decision lineage for audit compliance.",
    toolChain: "DATA subscriptions → LOGIC threshold evaluation → ACTION remediation proposals",
    realWorldDeployment: "Centrus Energy (nuclear): long-running agents with full NRC audit compliance — 'every action taken here compounds, the system learns and improves'",
    source: "research/palantir/philosophy/digital-twin.md §Agentic Workflows, AIPCon 9",
  },
] as const;

/**
 * The 4-layer architecture of ontology-grounded agents.
 * Agents are NOT free-form LLMs — their capabilities are derived from and constrained by the ontology.
 *
 * Source: research/palantir/philosophy/llm-grounding.md §Ontology-Grounded Agents
 */
export interface AgentGroundingLayer {
  readonly id: string;
  readonly layer: string;
  readonly derivedFrom: string;
  readonly purpose: string;
}

export const ONTOLOGY_GROUNDED_AGENT_LAYERS: readonly AgentGroundingLayer[] = [
  {
    id: "AGL-01",
    layer: "Tools",
    derivedFrom: "Ontology (DATA queries, LOGIC functions, ACTION mutations) — auto-surfaced from ontology definitions",
    purpose: "Type-safe operations the agent can perform — not arbitrary API calls but ontology-bound actions",
  },
  {
    id: "AGL-02",
    layer: "Context",
    derivedFrom: "Object properties, relationships, history — structured business context, not raw databases",
    purpose: "The agent reasons over the governed, real-world representation of the business",
  },
  {
    id: "AGL-03",
    layer: "Guardrails",
    derivedFrom: "Submission criteria (AG-02), RBAC (AG-01), markings — ACTION_GOVERNANCE dimensions",
    purpose: "Security and business rule constraints that prevent the agent from taking unauthorized actions",
  },
  {
    id: "AGL-04",
    layer: "Lineage",
    derivedFrom: "DECISION_LINEAGE (5 dimensions) — every tool call traced via Workflow Lineage",
    purpose: "Complete audit trail of what the agent did, why, and with what data — feeds LEARN-03",
  },
] as const;

// =========================================================================
// Section 18: Edge Semantics
// =========================================================================
//
// The Ontology is moving to the edge — embedded in NVIDIA hardware for real-time
// inference at the point of operations (factories, vehicles, battlefield sensors).
// Edge semantics means a subset of the full Ontology runs independently in
// disconnected environments, reconciling with the central truth when reconnected.
//
// Source: philosophy/llm-grounding.md §Edge Semantics
//         philosophy/ontology-ultimate-vision.md §5 NVIDIA Partnership
//         platform/aipcon.md §APC9-04 — Sovereign AI OS

export interface EdgeSemanticComponent {
  readonly id: string;
  readonly component: string;
  readonly edgeBehavior: string;
  readonly centralSyncBehavior: string;
}

export const EDGE_SEMANTICS: readonly EdgeSemanticComponent[] = [
  {
    id: "EDGE-01",
    component: "DATA at Edge",
    edgeBehavior: "Sensor fusion and local data ingestion — edge maintains a subset of ObjectTypes relevant to local operations",
    centralSyncBehavior: "On reconnect: edge DATA entities merged with central Ontology via primary key reconciliation",
  },
  {
    id: "EDGE-02",
    component: "LOGIC at Edge",
    edgeBehavior: "Local inference via edge models (NVIDIA Nemotron) — LOGIC functions execute with local data, no central dependency",
    centralSyncBehavior: "On reconnect: decision outcomes and derived values synced to central for global consistency checks",
  },
  {
    id: "EDGE-03",
    component: "ACTION at Edge",
    edgeBehavior: "Immediate response — edge executes actions locally without waiting for central approval (latency-critical)",
    centralSyncBehavior: "On reconnect: action logs and decision lineage synced to central for audit trail completeness",
  },
  {
    id: "EDGE-04",
    component: "Central Sync Protocol",
    edgeBehavior: "Edge operates autonomously during disconnection — security policies enforced locally",
    centralSyncBehavior: "Reconciliation protocol resolves conflicts (last-write-wins or domain-specific merge strategies)",
  },
] as const;

// =========================================================================
// Section 19: Workflow Lineage (Platform Tracing Infrastructure)
// =========================================================================
//
// Workflow Lineage is Palantir's platform-level tracing infrastructure that
// implements DECISION_LINEAGE concretely. It traces every function invocation,
// action execution, automation run, and LM call with full input/output context.
//
// GA: November 2025. Log Search expansion: February 2026.
// Source: platform/workflow-lineage.md §WL-01..06
//         philosophy/ontology-ultimate-vision.md §4.5

export interface WorkflowLineageTrace {
  readonly id: string;
  readonly traceType: string;
  readonly captured: string;
  readonly logSearchCapability: string;
}

export const WORKFLOW_LINEAGE: readonly WorkflowLineageTrace[] = [
  {
    id: "WL-01",
    traceType: "Function Trace",
    captured: "Input parameters, output values, execution duration, error states — per function invocation",
    logSearchCapability: "Search across all function logs within a 7-day window with wildcard support",
  },
  {
    id: "WL-02",
    traceType: "Action Trace",
    captured: "Submitting user/agent, parameters, edited objects, submission criteria results, side effect outcomes",
    logSearchCapability: "Search across all action execution logs, filterable by action type and user",
  },
  {
    id: "WL-03",
    traceType: "Automation Trace",
    captured: "Trigger condition, matched objects, effect execution, timeline of condition evaluations",
    logSearchCapability: "Search across automation run history with condition-match filtering",
  },
  {
    id: "WL-04",
    traceType: "Language Model Trace",
    captured: "Prompt, context window, response, tools invoked, confidence scores, token usage",
    logSearchCapability: "Search across LM invocation logs with prompt/response content matching",
  },
  {
    id: "WL-05",
    traceType: "Cross-Ontology Trace",
    captured: "Source ontology ID, target ontology ID, cross-ontology relationships, shared entity references, inter-ontology data flow direction",
    logSearchCapability: "Search across cross-ontology graph visualization logs with source/target ontology filtering",
  },
] as const;

// =========================================================================
// Section 20: Ontology MCP (External Agent Grounding)
// =========================================================================
//
// Ontology MCP enables external agents (Claude Code, LangChain, CrewAI) to
// access the Ontology via Model Context Protocol. This creates a new grounding
// vector beyond the 3 HRP patterns — agents can read entity definitions,
// invoke query/function tools, and execute agent-guided actions through a
// standardized protocol.
//
// Beta: January 2026.
// Source: cross-cutting/tool-exposure.md §TE-06 — Ontology MCP
//         platform/announcements.md §ANN-JAN — Ontology MCP Beta

export interface OntologyMcpCapability {
  readonly id: string;
  readonly capability: string;
  readonly grounding: string;
  readonly implication: string;
}

export const ONTOLOGY_MCP: readonly OntologyMcpCapability[] = [
  {
    id: "MCP-01",
    capability: "Entity Schema Access",
    grounding: "External agents read ObjectType definitions, property schemas, and link structures via MCP protocol",
    implication: "Agents ground their entity understanding in the Ontology's typed definitions rather than hallucinating schema",
  },
  {
    id: "MCP-02",
    capability: "Query and Function Invocation",
    grounding: "External agents invoke query functions and computational logic tools through MCP with typed parameters and application-scoped access",
    implication: "Extends HRP-01/02 beyond platform-internal agents to any MCP-compatible client without dropping typed ontology context",
  },
  {
    id: "MCP-03",
    capability: "Action Guidance and Proposal",
    grounding: "External agents use Ontology Manager's Agent tool description field plus higher-level Claude skills to compose search→reason→act workflows over ontology actions",
    implication: "Extends HRP-03 (Human-in-the-Loop) to external agent workflows while preserving submission criteria, review levels, and explicit action guidance",
  },
] as const;

// =========================================================================
// Section 21: Scenarios Framework (COA Generation)
// =========================================================================
//
// The Scenarios framework enables structured decision comparison — the concrete
// mechanism for PA-03 (Approve-then-act). AI proposes multiple courses of action
// as hypothetical edit sets, humans compare trade-offs, and the approved scenario
// applies edits with full decision lineage.
//
// Source: philosophy/ontology-ultimate-vision.md §4.5 Scenarios Framework
//         platform/aipcon.md §APC9-03 — ShipOS, CDAO demos

export interface ScenarioDefinition {
  readonly id: string;
  readonly component: string;
  readonly description: string;
  readonly palantirMechanism: string;
}

export const SCENARIOS_FRAMEWORK: readonly ScenarioDefinition[] = [
  {
    id: "SCN-01",
    component: "Scenario Generation",
    description: "AI evaluates current state and generates N alternative courses of action, each as a hypothetical edit set",
    palantirMechanism: "AIP Logic + COA generation: evaluate conditions, produce multiple action alternatives with distinct trade-off profiles",
  },
  {
    id: "SCN-02",
    component: "Trade-off Quantification",
    description: "Each scenario carries quantified impact dimensions (time, cost, risk) computed by LOGIC functions",
    palantirMechanism: "ShipOS: 3-COA with days-of-delay, dollars-of-cost, risk-score per option. Impact computed by traversing the ontology graph.",
  },
  {
    id: "SCN-03",
    component: "Side-by-Side Comparison",
    description: "Human reviewer compares scenarios in a structured UI with full decision context visible",
    palantirMechanism: "AIP Automate staged review: proposals in 24-hour visibility window, agent decision log (LLM reasoning) visible alongside quantified trade-offs",
  },
  {
    id: "SCN-04",
    component: "Scenario Application",
    description: "Approved scenario's edit set is committed atomically with full DECISION_LINEAGE (5D) capture",
    palantirMechanism: "Selected COA applies edits → action logs → decision lineage records which scenario was chosen, by whom, and why alternatives were rejected",
  },
] as const;

// =========================================================================
// Section 22: DH Refinement Protocol (BackPropagation)
// =========================================================================
//
// This is the CRITICAL gap in the LEARN loop. LEARN-01/02/03 capture outcomes
// as new DATA — they are FORWARD mechanisms. The Refinement Protocol defines
// how captured outcomes flow BACK through the LOGIC layer to modify existing
// DecisionHeuristics — the BACKPROPAGATION that makes the system self-improving.
//
// Without this protocol, LEARN mechanisms record but do not refine.
// With it, "every action compounds" (Centrus Energy, AIPCon 9).
//
// Source: philosophy/tribal-knowledge.md §Decision Lineage as LEARN Mechanism
//         philosophy/digital-twin.md §Self-Healing Enterprise Vision
//         AIPCon 9 demos (GE 26% improvement, Centrus compounding)

export interface RefinementStep {
  readonly id: string;
  readonly step: string;
  readonly input: string;
  readonly output: string;
  readonly mechanism: string;
  /** Which LEARN mechanism feeds this step. */
  readonly feedsFrom: string;
}

export const DH_REFINEMENT_PROTOCOL: readonly RefinementStep[] = [
  {
    id: "REF-01",
    step: "Outcome Collection",
    input: "Action execution results from LEARN-01 (write-back) + LEARN-03 (decision lineage)",
    output: "Structured outcome records: predicted impact vs actual impact per decision",
    mechanism: "Every action with decision lineage captures both the predicted outcome (from LOGIC) and actual outcome (from post-execution DATA). The delta is the refinement signal.",
    feedsFrom: "LEARN-01 + LEARN-03",
  },
  {
    id: "REF-02",
    step: "Accuracy Measurement",
    input: "Outcome deltas accumulated over a rolling window (LGC-03 volume sufficiency)",
    output: "Per-DH accuracy score: how often did decisions following this heuristic produce correct outcomes?",
    mechanism: "Aggregate outcome deltas grouped by the DH that informed the decision (captured in DECISION_LINEAGE.WITH_WHAT_REASONING). Compute acceptance rate, prediction error, and trend direction. Correctness evaluation uses per-DH criteria from EVALUATION_TAXONOMY (EVAL-01..03).",
    feedsFrom: "LEARN-02 (user feedback) + LEARN-03 (outcome tracking)",
  },
  {
    id: "REF-03",
    step: "Drift Detection",
    input: "Per-DH accuracy scores compared against historical baseline",
    output: "Refinement signals: which DHs have degraded beyond threshold, which have improved",
    mechanism: "If a DH's accuracy drops below a configurable threshold (e.g., <70% acceptance over 30-day rolling window), flag for review. If accuracy exceeds promotion threshold (e.g., >95%), flag for autonomy graduation.",
    feedsFrom: "REF-02 output",
  },
  {
    id: "REF-04",
    step: "Heuristic Update",
    input: "Flagged DHs with degraded accuracy + user/expert feedback from LEARN-02",
    output: "Updated DH constants: revised options, adjusted conditions, refined reasoning",
    mechanism: "Human-in-the-loop review of flagged DHs. Expert evaluates outcome data, adjusts DH options/conditions/reasoning. Updated DH is versioned and tested against existing test suite before deployment.",
    feedsFrom: "REF-03 + LEARN-02",
  },
  {
    id: "REF-05",
    step: "Autonomy Graduation",
    input: "LGC-01..04 criteria evaluated per automation pattern",
    output: "PA level promotion or demotion: staged-review ↔ auto-apply transitions",
    mechanism: "If LGC-01 (accuracy) + LGC-02 (risk) + LGC-03 (volume) + LGC-04 (reversibility) all satisfy thresholds, promote PA level. If accuracy degrades, demote. Graduation is bidirectional.",
    feedsFrom: "REF-02 + REF-03",
  },
] as const;

// =========================================================================
// Section 23: Agent Composition Protocol
// =========================================================================
//
// Ontology-grounded agents (AGL-01..04) chain DATA queries, LOGIC tools,
// and ACTION proposals into multi-step workflows. This protocol defines how
// agents compose tool calls, pass context between steps, and handle failures.
//
// Source: philosophy/llm-grounding.md §Ontology-Grounded Agents
//         philosophy/digital-twin.md §Agentic Workflows
//         platform/devcon.md §DC4-03 — AIP Agents + MCP

export interface AgentCompositionStep {
  readonly id: string;
  readonly phase: string;
  readonly description: string;
  readonly ontologyBinding: string;
}

export const AGENT_COMPOSITION_PROTOCOL: readonly AgentCompositionStep[] = [
  {
    id: "ACP-01",
    phase: "Context Acquisition",
    description: "Agent reads entity state via DATA queries (OAG Pattern 1), establishing the decision context",
    ontologyBinding: "HRP-01 (OAG) + AGL-02 (Context layer): agent reasons over governed, real-world representation, not raw databases",
  },
  {
    id: "ACP-02",
    phase: "Reasoning Chain",
    description: "Agent invokes LOGIC functions (HRP-02) for computation, traverses links for impact analysis, evaluates DH conditions",
    ontologyBinding: "HRP-02 (Logic Tool Handoff) + AGL-01 (Tools layer): deterministic functions, not LLM approximation",
  },
  {
    id: "ACP-03",
    phase: "Action Proposal",
    description: "Agent proposes ACTION mutations with full decision context, subject to submission criteria and PA review level",
    ontologyBinding: "HRP-03 (Human-in-the-Loop) + AG-01..05: governance dimensions enforced at proposal time",
  },
  {
    id: "ACP-04",
    phase: "Lineage Recording",
    description: "Every tool call in the composition chain is traced via WORKFLOW_LINEAGE (WL-01..04), feeding LEARN-03",
    ontologyBinding: "AGL-04 (Lineage layer) + DECISION_LINEAGE (5D): complete audit trail of the agent's reasoning path",
  },
  {
    id: "ACP-05",
    phase: "Error Recovery",
    description: "On failure at any step, agent rolls back to last successful state and proposes alternative path or escalates to human",
    ontologyBinding: "HC-ACTION-03 (function rule exclusivity) ensures atomic rollback. PA-03 escalation for unrecoverable failures.",
  },
] as const;

/**
 * ACP Real-World Validation — GE Aerospace (AIPCon 9, March 2026)
 *
 * GE Aerospace's 2026 architecture validates ACP in production:
 * - "Rich and powerful automation architecture with ORCHESTRATION AGENTS that are
 *    continuously monitoring and synthesizing signals, ROUTING TO FUNCTIONAL EXPERT
 *    AGENTS across fulfillment, MRO, customer service, all compounding into multiple
 *    workflows across the value chain." — Jess Salzbrun, CIO Defense & Systems
 *
 * Pattern: Orchestration Agent (ACP-01 continuous monitoring) → synthesizes signals →
 *          routes to Functional Expert Agent: Fulfillment (ACP-02 reasoning) →
 *          routes to Functional Expert Agent: MRO (ACP-02 reasoning) →
 *          routes to Functional Expert Agent: Customer Service (ACP-03 proposals) →
 *          compounds outcomes (ACP-04 lineage recording)
 *
 * Result: 26% more engines output in 2025 vs 2024 (J85 engine, T-38 fleet, US Air Force)
 * Source: devcon5-aipcon9-deep-dive-2026-03-17.md §2.5 GE Aerospace
 */

// =========================================================================
// Section 24: Schema Self-Audit BackPropagation (SSAB)
// =========================================================================
//
// The ontology schema defines LEARN mechanisms and REF-01..05 BackPropagation.
// Projects implement these protocols. But the schema itself never learns from
// being used — audit results go unrecorded, false positives go untracked,
// and declaration-implementation drift goes unmeasured.
//
// SSAB closes this gap by emitting schema audit results INTO the existing
// REF pipeline with an "SA-" dhId prefix. No new crons, no new tables for
// the REF chain — just a new namespace flowing through the same pipeline.
//
// Source: philosophy/digital-twin.md §Twin Maturity Stage 5 (Living System)
//         philosophy/tribal-knowledge.md §Decision Lineage (self-referential loop)

export interface SchemaAuditStep {
  readonly id: string;
  readonly step: string;
  readonly input: string;
  readonly output: string;
  readonly feedsExisting: string;
}

export const SCHEMA_SELF_AUDIT_BACKPROP: readonly SchemaAuditStep[] = [
  {
    id: "SSAB-01",
    step: "Audit Outcome Collection",
    input: "semantic-audit SA-01..25 execution results (coverage, evidence, twinMaturityStage)",
    output: "Structured schemaAuditResults records + outcomeRecords with dhId prefix 'SA-{NN}'",
    feedsExisting: "REF-01",
  },
  {
    id: "SSAB-02",
    step: "Gap Pattern Recognition",
    input: "Repeated gap patterns from audit history (layer-count-mismatch, dead-code-chain, declaration-impl-drift)",
    output: "Categorized gap frequencies per SA section, fed as accuracy measurements on SA-prefixed IDs",
    feedsExisting: "REF-02",
  },
  {
    id: "SSAB-03",
    step: "Declaration-Implementation Drift",
    input: "VIEW_DECLARATIONS from ontology/schema.ts vs actual component imports in src/",
    output: "Drift signals for declared views without matching implementations, fed as refinement signals",
    feedsExisting: "REF-03",
  },
  {
    id: "SSAB-04",
    step: "Schema Version Learning",
    input: "Git diff analysis of schemas/ after modifications — classify change type (addHC, modifyDH, addSection)",
    output: "New outcomeRecords from version deltas: what changed, why, and whether audit predictions held",
    feedsExisting: "REF-01",
  },
] as const;

// =========================================================================
// Section 25: Evaluation Taxonomy (EVAL-01..03)
// =========================================================================
//
// The REF pipeline (REF-02: Accuracy Measurement) requires per-DH correctness
// criteria. A binary classification decision (DH-DATA-01: struct vs entity) and
// a continuous metric (DH-LOGIC-05: timeseries threshold) cannot share a single
// hardcoded threshold. Palantir's AIP Evals defines a 3-tier evaluation taxonomy
// — deterministic, heuristic, expert_judgment — adopted here.
//
// Source: philosophy/digital-twin.md §LEARN-03 (outcome tracking)
//         Palantir AIP Evals — create-suite evaluation tiers
//         platform/aipcon.md §APC9-03 — GE Aerospace, ShipOS, Centrus

export type EvaluationTierId = "deterministic" | "heuristic" | "expert_judgment";

export interface EvaluationTier {
  readonly id: string;
  readonly tier: EvaluationTierId;
  readonly name: string;
  readonly description: string;
  readonly direction: "maximize" | "minimize";
  readonly defaultThreshold: number;
  /** Human-readable correctness check description. */
  readonly isCorrect: string;
  readonly palantirEquivalent: string;
  readonly source: string;
}

export const EVALUATION_TAXONOMY: readonly EvaluationTier[] = [
  {
    id: "EVAL-01",
    tier: "deterministic",
    name: "Deterministic Binary Evaluation",
    description:
      "Binary correct/incorrect decisions where outcome is unambiguous. "
      + "Examples: struct vs entity classification (DH-DATA-01), security role assignment (DH-SEC-*), "
      + "tool success/failure (tool:*). Delta must be near zero for correctness.",
    direction: "minimize",
    defaultThreshold: 0.01,
    isCorrect: "Math.abs(delta) <= 0.01 — binary decisions have no tolerance for partial correctness",
    palantirEquivalent: "AIP Evals deterministic scorer — exact match, boolean, regex",
    source: "Palantir AIP Evals create-suite: deterministic evaluators for factual accuracy",
  },
  {
    id: "EVAL-02",
    tier: "heuristic",
    name: "Heuristic Threshold Evaluation",
    description:
      "Continuous metrics where outcomes fall on a spectrum. "
      + "Examples: reasoning quality (DH-LOGIC-*), action impact estimation (DH-ACTION-*). "
      + "Correctness means delta is within a configurable threshold, not necessarily zero.",
    direction: "minimize",
    defaultThreshold: 0.5,
    isCorrect: "Math.abs(delta) <= threshold — continuous decisions allow configurable tolerance",
    palantirEquivalent: "AIP Evals heuristic scorer — semantic similarity, BLEU, F1",
    source: "Palantir AIP Evals create-suite: heuristic evaluators for nuanced quality",
  },
  {
    id: "EVAL-03",
    tier: "expert_judgment",
    name: "Expert Judgment Evaluation",
    description:
      "Human or multi-LLM agreement scores where correctness requires consensus. "
      + "Examples: K-LLM consensus validation, domain expert review of novel patterns. "
      + "Correct when agreement/confidence exceeds a threshold.",
    direction: "maximize",
    defaultThreshold: 0.7,
    isCorrect: "(1 - delta) >= threshold — expert agreement must exceed confidence floor",
    palantirEquivalent: "AIP Evals LLM-as-judge + human evaluator — rubric-based scoring",
    source: "Palantir AIP Evals create-suite: expert judgment for subjective quality assessment",
  },
] as const;

export interface DecisionCorrectnessConfig {
  /** Glob-like pattern matching DH IDs. '*' = fallback. */
  readonly dhPattern: string;
  /** Which evaluation tier applies to decisions matching this pattern. */
  readonly evaluationTier: EvaluationTierId;
  /** Delta threshold for correctness determination. */
  readonly threshold: number;
  /** Whether lower delta is better (minimize) or higher is better (maximize). */
  readonly direction: "maximize" | "minimize";
  /** Why this tier and threshold were chosen for this pattern. */
  readonly reasoning: string;
}

export const DEFAULT_CORRECTNESS_CONFIGS: readonly DecisionCorrectnessConfig[] = [
  {
    dhPattern: "DH-DATA-*",
    evaluationTier: "deterministic",
    threshold: 0.01,
    direction: "minimize",
    reasoning: "DATA decisions are binary classifications (struct vs entity, property type, value type). No middle ground.",
  },
  {
    dhPattern: "DH-LOGIC-*",
    evaluationTier: "heuristic",
    threshold: 0.3,
    direction: "minimize",
    reasoning: "LOGIC decisions involve reasoning quality with some tolerance. Tighter than default 0.5 but allows reasonable variance.",
  },
  {
    dhPattern: "DH-ACTION-*",
    evaluationTier: "heuristic",
    threshold: 0.5,
    direction: "minimize",
    reasoning: "ACTION decisions have broader impact estimation. Preserves backward-compatible 0.5 threshold for action outcome prediction.",
  },
  {
    dhPattern: "DH-SEC-*",
    evaluationTier: "deterministic",
    threshold: 0.01,
    direction: "minimize",
    reasoning: "Security decisions are binary: correct role, correct marking, correct policy. No tolerance for partial security.",
  },
  {
    dhPattern: "SA-*",
    evaluationTier: "deterministic",
    threshold: 0.01,
    direction: "minimize",
    reasoning: "Schema audit coverage is binary: implemented or not, drift detected or not. SSAB-01 feeds this as SA-prefixed IDs.",
  },
  {
    dhPattern: "tool:*",
    evaluationTier: "deterministic",
    threshold: 0.01,
    direction: "minimize",
    reasoning: "Tool calls succeed or fail. Error-based delta from analyzeOutcomes is binary in nature.",
  },
  {
    dhPattern: "SSAB-*",
    evaluationTier: "deterministic",
    threshold: 0.01,
    direction: "minimize",
    reasoning: "Schema self-audit steps produce binary pass/fail outcomes. Version learning and drift detection are factual.",
  },
  {
    dhPattern: "*",
    evaluationTier: "heuristic",
    threshold: 0.5,
    direction: "minimize",
    reasoning: "Fallback for unknown DH patterns. Uses backward-compatible 0.5 threshold. Override via evaluationCriteria table.",
  },
] as const;

// Section 25b: AIP Evals Built-In Evaluator Types [Official]
//
// Palantir AIP Evals provides 16 built-in deterministic evaluators + 3 marketplace
// LLM-backed evaluators. Verified 2026-03-17 from palantir.com/docs/foundry/aip-evals/create-suite/.
// These are the OFFICIAL evaluator types available in Foundry — our local analogue
// (evaluationRubrics + rubricEvaluations) should map to this taxonomy.

export type BuiltInEvaluatorCategory = "boolean" | "string" | "object" | "numeric" | "temporal";

export interface BuiltInEvaluatorType {
  readonly id: string;
  readonly name: string;
  readonly category: BuiltInEvaluatorCategory;
  readonly returnType: "boolean" | "numeric";
  readonly description: string;
}

export const BUILT_IN_EVALUATOR_TYPES: readonly BuiltInEvaluatorType[] = [
  { id: "BIE-01", name: "Exact boolean match", category: "boolean", returnType: "boolean", description: "Compare expected vs actual boolean value" },
  { id: "BIE-02", name: "Exact boolean array match", category: "boolean", returnType: "boolean", description: "Compare expected vs actual boolean arrays" },
  { id: "BIE-03", name: "Exact string match", category: "string", returnType: "boolean", description: "Compare strings with configurable case sensitivity and whitespace handling" },
  { id: "BIE-04", name: "Exact string array match", category: "string", returnType: "boolean", description: "Compare string arrays with configurable order, case, whitespace" },
  { id: "BIE-05", name: "Regex match", category: "string", returnType: "boolean", description: "Test if output matches a regular expression pattern" },
  { id: "BIE-06", name: "Levenshtein distance", category: "string", returnType: "numeric", description: "Edit distance between expected and actual strings" },
  { id: "BIE-07", name: "String length", category: "string", returnType: "boolean", description: "Check if string length falls within a specified range" },
  { id: "BIE-08", name: "Keyword checker", category: "string", returnType: "boolean", description: "Verify that specified keywords are present in text" },
  { id: "BIE-09", name: "Exact object match", category: "object", returnType: "boolean", description: "Compare expected vs actual ontology object reference" },
  { id: "BIE-10", name: "Object set contains", category: "object", returnType: "boolean", description: "Check if a specific object exists in a target object set" },
  { id: "BIE-11", name: "Object set size range", category: "object", returnType: "boolean", description: "Verify object set size falls within expected range" },
  { id: "BIE-12", name: "Integer range", category: "numeric", returnType: "boolean", description: "Check if integer value falls within specified range" },
  { id: "BIE-13", name: "Exact numeric match", category: "numeric", returnType: "boolean", description: "Compare expected vs actual numeric value (int, long, float, double, short)" },
  { id: "BIE-14", name: "Exact numeric array match", category: "numeric", returnType: "boolean", description: "Compare numeric arrays with configurable order" },
  { id: "BIE-15", name: "Floating-point range", category: "numeric", returnType: "boolean", description: "Check if floating-point value falls within specified range" },
  { id: "BIE-16", name: "Temporal range", category: "temporal", returnType: "boolean", description: "Check if Date or Timestamp falls within specified range" },
] as const;

export type MarketplaceEvaluatorId = "rubric_grader" | "contains_key_details" | "rouge_score";

export interface MarketplaceEvaluator {
  readonly id: MarketplaceEvaluatorId;
  readonly name: string;
  readonly description: string;
  readonly isLLMBacked: boolean;
  readonly returnType: "numeric" | "boolean";
}

export const MARKETPLACE_EVALUATORS: readonly MarketplaceEvaluator[] = [
  { id: "rubric_grader", name: "Rubric grader", description: "LLM-backed numeric grading against a dynamic marking rubric", isLLMBacked: true, returnType: "numeric" },
  { id: "contains_key_details", name: "Contains key details", description: "LLM-backed assessment of whether text contains specified key details", isLLMBacked: true, returnType: "boolean" },
  { id: "rouge_score", name: "ROUGE score", description: "Recall-Oriented Understudy for Gisting Evaluation — machine-generated text quality metric", isLLMBacked: false, returnType: "numeric" },
] as const;

// Section 25c: Evaluation Experiment Capabilities [Official]
//
// Experiment-level capabilities are distinct from evaluator types. They describe
// how AIP Evals compares targets, parameters, and grouped run results.

export interface EvaluationExperimentCapability {
  readonly id: string;
  readonly capability: string;
  readonly description: string;
  readonly officialMechanism: string;
  readonly localImplication: string;
  readonly source: string;
}

export const EVALUATION_EXPERIMENT_CAPABILITIES: readonly EvaluationExperimentCapability[] = [
  {
    id: "EEXP-01",
    capability: "Grid Search",
    description: "Full Cartesian comparison across configurable parameters such as model, prompt, and other inputs.",
    officialMechanism: "AIP Evals experiments / grid search",
    localImplication: "EvaluationSuite and EvaluationRun should remain attachable to a higher experiment grouping layer.",
    source: "research/palantir/platform/aip-evals.md §EVAL-04",
  },
  {
    id: "EEXP-02",
    capability: "Multi-Target Comparison",
    description: "Compare multiple function targets against the same evaluator suite, up to four simultaneous runs.",
    officialMechanism: "AIP Evals compare runs / multi-target mode",
    localImplication: "targetRef alone is insufficient; grouped comparison intent should be explicit.",
    source: "research/palantir/platform/aip-evals.md §EVAL-04",
  },
  {
    id: "EEXP-03",
    capability: "Versioned Evaluation Targets",
    description: "Run evaluations against last-saved, published, or other versioned function targets.",
    officialMechanism: "AIP Evals target version selection",
    localImplication: "targetVersion should be treated as first-class experiment metadata, not only an optional run field.",
    source: "research/palantir/platform/aip-evals.md §EVAL-04",
  },
  {
    id: "EEXP-04",
    capability: "Intermediate Parameter Evaluation",
    description: "Evaluate intermediate pipeline block outputs rather than only the final function result.",
    officialMechanism: "AIP Evals intermediate parameter evaluation",
    localImplication: "Local evaluation architecture should leave room for step-level observability.",
    source: "research/palantir/platform/aip-evals.md §EVAL-04",
  },
  {
    id: "EEXP-05",
    capability: "Results Analysis",
    description: "Cluster failures, suggest prompt changes, and persist grouped experiment results as analyzable datasets.",
    officialMechanism: "AIP Evals results analyzer + results dataset",
    localImplication: "LEARN should eventually reason over grouped experiment history, not only isolated rubric evaluations.",
    source: "research/palantir/platform/aip-evals.md §EVAL-04",
  },
] as const;

// =========================================================================
// Section 26: LEARN Evaluation Surfaces (LES-01..05)
// =========================================================================
//
// AIP Evals is the clearest official product surface for LEARN rubrics.
// These surfaces describe HOW Palantir turns human feedback and machine
// judgment into structured evaluation signals that can feed refinement.
//
// Source: research/palantir/platform/aip-evals.md §EVAL-01..05
//         Palantir AIP Evals docs

export type EvaluationSurfaceKind =
  | "deterministic"
  | "heuristic"
  | "rubricGrader"
  | "customFunction"
  | "ontologyEditSimulator";

export interface LearnEvaluationSurface {
  readonly id: string;
  readonly kind: EvaluationSurfaceKind;
  readonly name: string;
  readonly description: string;
  readonly officialMechanism: string;
  readonly outputSignal: string;
  readonly implementationImplication: string;
  readonly source: string;
}

export const LEARN_EVALUATION_SURFACES: readonly LearnEvaluationSurface[] = [
  {
    id: "LES-01",
    kind: "deterministic",
    name: "Deterministic Evaluators",
    description:
      "Exact-match or binary evaluators for objective correctness. Best for factual, structural, "
      + "or policy-conformance checks where the expected answer is unambiguous.",
    officialMechanism: "AIP Evals deterministic evaluators",
    outputSignal: "Binary or near-binary score mapped to low delta (correct/incorrect)",
    implementationImplication:
      "Maps naturally to EVAL-01 and should govern DATA/SECURITY classifications, tool success/failure, "
      + "and machine-checkable contract assertions.",
    source: "Palantir AIP Evals create-suite",
  },
  {
    id: "LES-02",
    kind: "heuristic",
    name: "Heuristic Evaluators",
    description:
      "Tolerance-based evaluators for quality dimensions that fall on a spectrum, such as semantic similarity, "
      + "coverage, or prediction error.",
    officialMechanism: "AIP Evals heuristic evaluators",
    outputSignal: "Continuous score or distance mapped to configurable tolerance thresholds",
    implementationImplication:
      "Maps to EVAL-02 and should drive rolling-window accuracy for LOGIC/ACTION decisions where partial correctness is meaningful.",
    source: "Palantir AIP Evals create-suite",
  },
  {
    id: "LES-03",
    kind: "rubricGrader",
    name: "Rubric Grader / LLM-as-Judge",
    description:
      "Multi-criterion rubric scoring where correctness is assessed against explicit dimensions instead of a single scalar threshold.",
    officialMechanism: "AIP Evals rubric grader / expert-judgment workflow",
    outputSignal: "Weighted rubric score + rationale mapped to normalized delta and pass/fail",
    implementationImplication:
      "This is the minimum viable self-improvement surface for LEARN-02 beyond thumbs-up/down. "
      + "Runtime systems should persist explicit criteria, evaluator provenance, and normalized score.",
    source: "Palantir AIP Evals create-suite",
  },
  {
    id: "LES-04",
    kind: "customFunction",
    name: "Custom Evaluation Functions",
    description:
      "Domain-specific evaluators implemented as custom logic when built-in scorers are insufficient for business semantics.",
    officialMechanism: "AIP Evals custom evaluation functions",
    outputSignal: "Arbitrary typed score or structured judgment converted into rubric or delta form",
    implementationImplication:
      "Use when tribal knowledge cannot be reduced to generic similarity metrics. "
      + "Best fit for domain-specific constraints or high-value workflows.",
    source: "Palantir AIP Evals create-suite",
  },
  {
    id: "LES-05",
    kind: "ontologyEditSimulator",
    name: "Ontology Edit Simulator",
    description:
      "Evaluation surface for proposed ontology edits before application, focusing on safety, policy conformance, and semantic validity.",
    officialMechanism: "AIP Evals evaluate ontology edits / ontology edits simulator",
    outputSignal: "Edit validity and policy-conformance judgment mapped to decision delta",
    implementationImplication:
      "Best aligned with ACTION proposals in digital twins: it evaluates whether a proposed change should be trusted before execution or autonomy promotion.",
    source: "Palantir AIP Evals evaluate-ontology-edits",
  },
] as const;

// =========================================================================
// Section 27: Platform Boundary — OSS vs Platform-Native (PB-01..03)
// =========================================================================
//
// The user-facing question is not only "what exists?" but "what can we import
// as OSS vs what must we model locally?" These entries capture the verified
// boundary from official docs/community surfaces.
//
// Source: research/palantir/platform/aipcon.md §APC9-04
//         research/palantir/cross-cutting/tool-exposure.md §TE-06..08
//         official Palantir GitHub community registry

export type PlatformBoundaryAvailability = "platformNative" | "protocolSurface" | "officialPublicRepo";

export interface PlatformBoundary {
  readonly id: string;
  readonly surface: string;
  readonly availability: PlatformBoundaryAvailability;
  readonly verifiedOpenSource: boolean;
  readonly description: string;
  readonly implementationImplication: string;
  readonly source: string;
}

export const PLATFORM_OPEN_SOURCE_BOUNDARY: readonly PlatformBoundary[] = [
  {
    id: "PB-01",
    surface: "AIP Evals + Workflow Lineage + autonomy graduation internals",
    availability: "platformNative",
    verifiedOpenSource: false,
    description:
      "The core LEARN engine surfaces are documented as Foundry platform capabilities, not as a verified official open-source package exposing internals.",
    implementationImplication:
      "Treat LEARN/rubric/lineage/autonomy logic as adapter-local runtime that mirrors platform behavior, not as a dependency imported from Palantir OSS.",
    source: "research/palantir/platform/aipcon.md §APC9-04 + research/palantir/platform/aip-evals.md §EVAL-01",
  },
  {
    id: "PB-02",
    surface: "Palantir MCP + Ontology MCP",
    availability: "protocolSurface",
    verifiedOpenSource: false,
    description:
      "Palantir exposes builder and ontology-consumption capabilities through documented MCP surfaces, but this is an integration boundary rather than open-sourcing platform internals.",
    implementationImplication:
      "Model these as external integration surfaces. They inform tool exposure and builder workflows, not local reimplementation of Foundry internals.",
    source: "research/palantir/platform/devcon.md §DC5-01..04 + research/palantir/platform/aipcon.md §APC9-01",
  },
  {
    id: "PB-03",
    surface: "AIP Community Registry",
    availability: "officialPublicRepo",
    verifiedOpenSource: true,
    description:
      "An official public GitHub community registry exists, but it is a community/open artifact surface rather than the managed LEARN core.",
    implementationImplication:
      "Community registry artifacts can be consumed as examples or integrations, but should not be conflated with platform-native evaluation/lineage engines.",
    source: "https://github.com/palantir/aip-community-registry",
  },
] as const;

// =========================================================================
// Section 28: MCP Product Split (MCP-PS-01..02)
// =========================================================================
//
// Official docs now distinguish two separate MCP products. This is a critical
// architectural boundary for builder-vs-runtime modeling.

export interface McpProductSurface {
  readonly id: string;
  readonly product: "Palantir MCP" | "Ontology MCP";
  readonly targetUser: string;
  readonly primaryCapability: string;
  readonly localImplication: string;
  readonly source: string;
}

export const MCP_PRODUCT_SPLIT: readonly McpProductSurface[] = [
  {
    id: "MCP-PS-01",
    product: "Palantir MCP",
    targetUser: "Ontology builders / developers",
    primaryCapability: "Build and modify ontology/project artifacts with platform context + tools",
    localImplication: "Maps to schema authoring, codegen, builder automation, and developer-console style workflows.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-06..08",
  },
  {
    id: "MCP-PS-02",
    product: "Ontology MCP",
    targetUser: "Ontology consumers / external agents",
    primaryCapability: "Expose query/action/function surfaces for grounded external agent use",
    localImplication: "Maps to runtime tool consumption, external agent grounding, and action/query exposure boundaries.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-06..08",
  },
] as const;

// =========================================================================
// Section 29: Foundry Orchestration Map (ORCH-01..06)
// =========================================================================
//
// A Palantir-aligned codebase should not drift into isolated features.
// It should remain legible as a builder-to-runtime-to-learning system.
// This map is the directional backbone for "is the whole codebase moving
// toward a Palantir-style digital twin and self-improving decision system?"
//
// Source: research/palantir/orchestration-map.md

export interface FoundryOrchestrationLayer {
  readonly id: string;
  readonly name: string;
  readonly purpose: string;
  readonly officialSurface: string;
  readonly localCodebaseMapping: string;
  readonly output: string;
}

export const FOUNDRY_ORCHESTRATION_MAP: readonly FoundryOrchestrationLayer[] = [
  {
    id: "ORCH-01",
    name: "Builder Surfaces",
    purpose: "Builders and AI coding surfaces shape ontology-backed systems coherently.",
    officialSurface: "AI FDE + Agent Studio + Pro-Code CLI + Palantir MCP",
    localCodebaseMapping: ".claude/research/ + .claude/schemas/ontology/ + builder-oriented skills and prompts",
    output: "Structured ontology and implementation intent",
  },
  {
    id: "ORCH-02",
    name: "Ontology Semantic Core",
    purpose: "The ontology remains the semantic center of the system rather than the UI or raw storage layer.",
    officialSurface: "Ontology + OSDK + data/logic/action/security integration",
    localCodebaseMapping: "schemas/ontology/ + palantir-learn/ontology/",
    output: "Typed semantic model of operational reality",
  },
  {
    id: "ORCH-03",
    name: "Runtime Digital Twin",
    purpose: "The system senses, reasons, and acts through explicit runtime constructs.",
    officialSurface: "Queries + Functions + Actions + Automations + runtime object services",
    localCodebaseMapping: "palantir-learn/convex/ + hooks + runtime ingestion paths",
    output: "Operational SENSE → DECIDE → ACT loop",
  },
  {
    id: "ORCH-04",
    name: "Governance and Lineage",
    purpose: "Actions become trustworthy through approval, security, and traceability.",
    officialSurface: "Workflow Lineage + staged review + project permissions + security controls",
    localCodebaseMapping: "hookEvents + pendingDecisions + approvalWorkflow + Lineage/Audit UI",
    output: "Auditable, governable decision execution",
  },
  {
    id: "ORCH-05",
    name: "LEARN and BackPropagation",
    purpose: "Outcomes become explicit evaluation signals that refine future decisions and autonomy levels.",
    officialSurface: "AIP Evals + feedback capture + outcome tracking + autonomy graduation",
    localCodebaseMapping: "feedbackEvents + outcomeRecords + evaluationRubrics + rubricEvaluations + REF tables",
    output: "Measured self-improvement instead of passive logging",
  },
  {
    id: "ORCH-06",
    name: "Integration and Expansion",
    purpose: "The system exposes stable integration surfaces for external agents, events, and future deployment environments.",
    officialSurface: "Ontology MCP + Listeners + Branching + external agent surfaces + edge direction",
    localCodebaseMapping: "HTTP hooks + MCP readiness + ontology sync + schema audit emit + future listener-style ingestion",
    output: "Externally connectable and evolvable platform boundary",
  },
] as const;

// =========================================================================
// Section 30: Palantir MCP Tool Categories (PMC-01..13)
// =========================================================================
//
// MCP_PRODUCT_SPLIT defines the builder-vs-consumer boundary. This section
// captures the official fixed builder-side taxonomy published for Palantir MCP.
//
// Source: research/palantir/cross-cutting/tool-exposure.md §TE-09..12

export interface PalantirMcpToolCategory {
  readonly id: string;
  readonly category: string;
  readonly totalTools: number;
  readonly readTools: number;
  readonly writeTools: number;
  readonly representativeTools: readonly string[];
  readonly localImplication: string;
  readonly source: string;
}

export const PALANTIR_MCP_TOOL_CATEGORIES: readonly PalantirMcpToolCategory[] = [
  {
    id: "PMC-01",
    category: "Compass",
    totalTools: 6,
    readTools: 5,
    writeTools: 1,
    representativeTools: ["create_foundry_project", "search_foundry_projects"],
    localImplication: "Maps to builder-side project discovery, project creation, and project-scoped workspace navigation.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
  {
    id: "PMC-02",
    category: "Dataset",
    totalTools: 8,
    readTools: 6,
    writeTools: 2,
    representativeTools: ["run_sql_query_on_foundry_dataset", "create_and_write_to_foundry_dataset"],
    localImplication: "Distinguishes dataset inspection/write flows from ontology data writes. Useful for builder data bootstrap tooling.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
  {
    id: "PMC-03",
    category: "Data Lineage",
    totalTools: 1,
    readTools: 1,
    writeTools: 0,
    representativeTools: ["get_resource_graph"],
    localImplication: "Builder-facing lineage graph retrieval is a distinct capability from runtime workflow lineage.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
  {
    id: "PMC-04",
    category: "Ontology",
    totalTools: 12,
    readTools: 6,
    writeTools: 6,
    representativeTools: ["create_or_update_foundry_object_type", "create_or_update_foundry_link_type", "create_or_update_foundry_action_type"],
    localImplication: "This is the highest-signal structure-edit category. It should map to schema authoring and proposal-reviewed structural change flows.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
  {
    id: "PMC-05",
    category: "Object Set",
    totalTools: 2,
    readTools: 2,
    writeTools: 0,
    representativeTools: ["query_ontology_objects", "aggregate_ontology_objects"],
    localImplication: "Builder-side object set querying is separate from Ontology MCP's app-scoped runtime tools.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
  {
    id: "PMC-06",
    category: "OSDK",
    totalTools: 2,
    readTools: 2,
    writeTools: 0,
    representativeTools: ["get_ontology_sdk_context", "get_ontology_sdk_examples"],
    localImplication: "Builder workflows can pull SDK context/examples explicitly rather than inferring client patterns ad hoc.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
  {
    id: "PMC-07",
    category: "Platform SDK",
    totalTools: 2,
    readTools: 2,
    writeTools: 0,
    representativeTools: ["list_platform_sdk_apis", "get_platform_sdk_api_reference"],
    localImplication: "Separates platform API discovery from ontology-specific SDK discovery.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
  {
    id: "PMC-08",
    category: "Code Repository",
    totalTools: 6,
    readTools: 3,
    writeTools: 3,
    representativeTools: ["create_python_transforms_code_repository", "create_code_repository_pull_request"],
    localImplication: "Builder tooling explicitly spans repo bootstrap plus PR workflows; this is not just codegen.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
  {
    id: "PMC-09",
    category: "Foundry Branching",
    totalTools: 6,
    readTools: 2,
    writeTools: 4,
    representativeTools: ["create_foundry_branch", "create_foundry_proposal"],
    localImplication: "Makes proposal review a first-class builder primitive rather than an afterthought.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
  {
    id: "PMC-10",
    category: "Developer Console",
    totalTools: 5,
    readTools: 2,
    writeTools: 3,
    representativeTools: ["convert_to_osdk_react", "generate_new_ontology_sdk_version"],
    localImplication: "Builder automation includes app conversion and SDK generation, not only ontology edits.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
  {
    id: "PMC-11",
    category: "Compute Module",
    totalTools: 5,
    readTools: 2,
    writeTools: 3,
    representativeTools: ["manage_compute_modules", "execute_compute_modules_function"],
    localImplication: "Compute Modules are a distinct builder surface and should not be collapsed into generic function tooling.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
  {
    id: "PMC-12",
    category: "Data Connection",
    totalTools: 3,
    readTools: 0,
    writeTools: 3,
    representativeTools: ["create_foundry_rest_api_data_source"],
    localImplication: "Data connection setup is a pure builder-write surface with no symmetric runtime analogue.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
  {
    id: "PMC-13",
    category: "Documentation",
    totalTools: 7,
    readTools: 7,
    writeTools: 0,
    representativeTools: ["search_foundry_documentation"],
    localImplication: "Documentation retrieval is a dedicated builder tool family, not just generic web search.",
    source: "research/palantir/cross-cutting/tool-exposure.md §TE-09..12",
  },
] as const;

// =========================================================================
// Section 31: Workflow Lineage Graph Model (WLG-01..10)
// =========================================================================
//
// WORKFLOW_LINEAGE defines the high-level trace semantics. This section captures
// the official graph surface shape: node families, visibility defaults, color
// groupings, refactoring tools, and AIP usage observability.
//
// Source: research/palantir/platform/workflow-lineage.md §WL-04..05

export interface WorkflowLineageNodeType {
  readonly id: string;
  readonly nodeType: string;
  readonly detailsPanel: string;
  readonly source: string;
}

export interface WorkflowLineageColorLegendGroup {
  readonly id: string;
  readonly group: "general" | "permissions" | "usage" | "organization";
  readonly options: readonly string[];
}

export interface WorkflowLineageGraphModel {
  readonly officialNodeTypes: readonly WorkflowLineageNodeType[];
  readonly hiddenEdgesByDefault: readonly string[];
  readonly colorLegendGroups: readonly WorkflowLineageColorLegendGroup[];
  readonly refactoringCapabilities: readonly string[];
  readonly aipUsageMetrics: readonly string[];
  readonly navigationBoundaries: readonly string[];
}

export const WORKFLOW_LINEAGE_GRAPH_MODEL: WorkflowLineageGraphModel = {
  officialNodeTypes: [
    {
      id: "WLG-01",
      nodeType: "Object Types",
      detailsPanel: "Properties, usage provenance counts, links, backing datasource, data preview",
      source: "research/palantir/platform/workflow-lineage.md §WL-04",
    },
    {
      id: "WLG-02",
      nodeType: "Object Links",
      detailsPanel: "Resource usage by objects, functions, actions, and Workshop apps",
      source: "research/palantir/platform/workflow-lineage.md §WL-04",
    },
    {
      id: "WLG-03",
      nodeType: "Actions",
      detailsPanel: "API name, RID, inputs, edits, submission criteria, code, action log",
      source: "research/palantir/platform/workflow-lineage.md §WL-04",
    },
    {
      id: "WLG-04",
      nodeType: "Functions",
      detailsPanel: "Inputs, outputs, dependencies, repository, code view",
      source: "research/palantir/platform/workflow-lineage.md §WL-04",
    },
    {
      id: "WLG-05",
      nodeType: "AIP Logic Functions",
      detailsPanel: "Dependencies, automations, creation metadata",
      source: "research/palantir/platform/workflow-lineage.md §WL-04",
    },
    {
      id: "WLG-06",
      nodeType: "Language Models",
      detailsPanel: "Description, creator metadata, context windows",
      source: "research/palantir/platform/workflow-lineage.md §WL-04",
    },
    {
      id: "WLG-07",
      nodeType: "Workshop Applications",
      detailsPanel: "Creation metadata, dependencies, view count",
      source: "research/palantir/platform/workflow-lineage.md §WL-04",
    },
    {
      id: "WLG-08",
      nodeType: "Automations",
      detailsPanel: "Property usages, condition dependencies, trigger connections",
      source: "research/palantir/platform/workflow-lineage.md §WL-04",
    },
    {
      id: "WLG-09",
      nodeType: "Interfaces",
      detailsPanel: "Cross-ontology resources shown with gray styling and warning icon",
      source: "research/palantir/platform/workflow-lineage.md §WL-04",
    },
    {
      id: "WLG-10",
      nodeType: "Text Nodes",
      detailsPanel: "User-created Markdown annotations",
      source: "research/palantir/platform/workflow-lineage.md §WL-04",
    },
  ],
  hiddenEdgesByDefault: [
    "Object→Action",
    "Object→Object",
    "Automation triggers",
  ],
  colorLegendGroups: [
    { id: "WLG-C-01", group: "general", options: ["Node type", "Custom color"] },
    { id: "WLG-C-02", group: "permissions", options: ["Ontology permissions", "Resource permissions"] },
    {
      id: "WLG-C-03",
      group: "usage",
      options: [
        "App views",
        "Out-of-date functions",
        "Model usage",
        "Ontology status",
        "Action rule",
        "Automation expiration",
        "Last modified",
      ],
    },
    {
      id: "WLG-C-04",
      group: "organization",
      options: ["Folder", "Project", "Portfolio", "Functions repository"],
    },
  ],
  refactoringCapabilities: [
    "Property provenance",
    "Function-backed action upgrade",
    "Bulk Workshop publish",
    "Bulk delete",
    "Bulk submission criteria update",
    "Bulk ontology role grant",
    "Marketplace product inspection",
  ],
  aipUsageMetrics: [
    "Successful requests",
    "Attempted requests",
    "Rate-limited requests",
    "Model requests count",
    "Token usage",
  ],
  navigationBoundaries: [
    "Pipeline Builder source-to-ontology lineage",
    "Workflow Lineage on-top-of-ontology graph",
    "Data Lineage end-to-end graph",
  ],
} as const;

// =========================================================================
// Section 32: Local Workflow Resource Taxonomy (LWR-01..24 / LWE-01..24)
// =========================================================================
//
// The official Workflow Lineage graph model is captured above. This section
// documents the adapter-local workflow graph so runtime/schema drift becomes
// explicit and testable.

export interface LocalWorkflowResourceType {
  readonly id: string;
  readonly resourceType: string;
  readonly description: string;
  readonly sourceTable: string;
}

export interface LocalWorkflowEdgeType {
  readonly id: string;
  readonly edgeType: string;
  readonly description: string;
}

export interface LocalWorkflowResourceTaxonomy {
  readonly resources: readonly LocalWorkflowResourceType[];
  readonly edges: readonly LocalWorkflowEdgeType[];
  readonly source: string;
}

export const LOCAL_WORKFLOW_RESOURCE_TAXONOMY: LocalWorkflowResourceTaxonomy = {
  resources: [
    { id: "LWR-01", resourceType: "application", description: "Application-level lineage node.", sourceTable: "workflowResources" },
    { id: "LWR-02", resourceType: "session", description: "Session-scoped execution container.", sourceTable: "workflowResources" },
    { id: "LWR-03", resourceType: "project", description: "Project-scoped lineage grouping.", sourceTable: "workflowResources" },
    { id: "LWR-04", resourceType: "tool", description: "Tool-call lineage node.", sourceTable: "workflowResources" },
    { id: "LWR-05", resourceType: "decision", description: "Governed decision artifact.", sourceTable: "workflowResources" },
    { id: "LWR-06", resourceType: "scenario", description: "Scenario / course-of-action artifact.", sourceTable: "workflowResources" },
    { id: "LWR-07", resourceType: "agent", description: "Agent identity node.", sourceTable: "workflowResources" },
    { id: "LWR-08", resourceType: "model", description: "Normalized model identity node.", sourceTable: "workflowResources" },
    { id: "LWR-09", resourceType: "provider", description: "Provider identity node.", sourceTable: "workflowResources" },
    { id: "LWR-10", resourceType: "workflow", description: "Workflow container node.", sourceTable: "workflowResources" },
    { id: "LWR-11", resourceType: "function", description: "Function lineage node.", sourceTable: "workflowResources" },
    { id: "LWR-12", resourceType: "functionExecution", description: "Function execution instance.", sourceTable: "workflowResources" },
    { id: "LWR-13", resourceType: "actionExecution", description: "Action execution instance.", sourceTable: "workflowResources" },
    { id: "LWR-14", resourceType: "automationExecution", description: "Automation execution instance.", sourceTable: "workflowResources" },
    { id: "LWR-15", resourceType: "ontologyObject", description: "Ontology-touched resource node.", sourceTable: "workflowResources" },
    { id: "LWR-16", resourceType: "trackable", description: "Tracked domain artifact.", sourceTable: "workflowResources" },
    { id: "LWR-17", resourceType: "outcome", description: "Outcome record node in the REF chain.", sourceTable: "workflowResources" },
    { id: "LWR-18", resourceType: "refinementSignal", description: "Drift/improvement signal node.", sourceTable: "workflowResources" },
    { id: "LWR-19", resourceType: "dhProposal", description: "DH update proposal node.", sourceTable: "workflowResources" },
    { id: "LWR-20", resourceType: "rubric", description: "Rubric definition node.", sourceTable: "workflowResources" },
    { id: "LWR-21", resourceType: "evaluation", description: "Rubric evaluation result node.", sourceTable: "workflowResources" },
    { id: "LWR-22", resourceType: "evaluationSuite", description: "Evaluation suite grouping node.", sourceTable: "workflowResources" },
    { id: "LWR-23", resourceType: "autonomyPolicy", description: "Autonomy graduation policy node.", sourceTable: "workflowResources" },
    { id: "LWR-24", resourceType: "automationTracker", description: "Automation tracking node.", sourceTable: "workflowResources" },
  ],
  edges: [
    { id: "LWE-01", edgeType: "invokes", description: "A resource invokes another resource." },
    { id: "LWE-02", edgeType: "produces", description: "A resource produces another artifact." },
    { id: "LWE-03", edgeType: "awaitsApproval", description: "Execution path is blocked on approval." },
    { id: "LWE-04", edgeType: "offersScenario", description: "Decision offers a scenario option." },
    { id: "LWE-05", edgeType: "selectsScenario", description: "Decision or user selects a scenario." },
    { id: "LWE-06", edgeType: "operatedBy", description: "Resource is operated by an agent." },
    { id: "LWE-07", edgeType: "usesModel", description: "Runtime resource uses a model." },
    { id: "LWE-08", edgeType: "servedBy", description: "Model is served by a provider." },
    { id: "LWE-09", edgeType: "belongsToApplication", description: "Resource belongs to an application scope." },
    { id: "LWE-10", edgeType: "hostsWorkflow", description: "Application or project hosts a workflow." },
    { id: "LWE-11", edgeType: "executesFunction", description: "Workflow executes a function." },
    { id: "LWE-12", edgeType: "realizesWorkflow", description: "Execution artifact realizes a workflow." },
    { id: "LWE-13", edgeType: "implementsFunction", description: "Execution artifact implements a function node." },
    { id: "LWE-14", edgeType: "emitsOutcome", description: "Execution emits an outcome node." },
    { id: "LWE-15", edgeType: "scopedToProject", description: "Resource is scoped to a project." },
    { id: "LWE-16", edgeType: "touchesOntology", description: "Execution path touches ontology resources." },
    { id: "LWE-17", edgeType: "tracks", description: "Tracker resource tracks another artifact." },
    { id: "LWE-18", edgeType: "evaluatedBy", description: "Artifact is evaluated by an evaluation node." },
    { id: "LWE-19", edgeType: "usesRubric", description: "Evaluation uses a rubric definition." },
    { id: "LWE-20", edgeType: "runsInSuite", description: "Evaluation run belongs to a suite." },
    { id: "LWE-21", edgeType: "detectsDrift", description: "Evaluation or signal detects drift." },
    { id: "LWE-22", edgeType: "proposesUpdate", description: "Signal proposes a DH update." },
    { id: "LWE-23", edgeType: "governs", description: "Policy node governs another resource." },
    { id: "LWE-24", edgeType: "promotes", description: "Graduation path promotes a resource or policy state." },
  ],
  source: "palantir-learn/convex/schema.ts",
} as const;

// =========================================================================
// Section 33: Human-Agent Leverage Criteria (HAL-01..03)
// =========================================================================
//
// DevCon 5 opening remarks framed the modern builder environment as a specific
// human-agent leverage pattern: shared mutable context, clear validation, and
// feedback-driven optimization. These are not just DX slogans. They are the
// criteria that determine whether AI agents can actually reduce HITL while
// preserving operational correctness.
//
// Source: research/palantir/platform/devcon.md §DC5-02..03

export interface HumanAgentLeverageCriterion {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly localImplication: string;
  readonly source: string;
}

export const HUMAN_AGENT_LEVERAGE_CRITERIA: readonly HumanAgentLeverageCriterion[] = [
  {
    id: "HAL-01",
    name: "Shared Mutable Context",
    description:
      "Humans and coding agents work best when they transmit context at high bandwidth against a shared mutable state, "
      + "not isolated prompts. The state itself becomes the coordination substrate.",
    localImplication:
      "Project scope should externalize shared state into typed backend and frontend ontology declarations, "
      + "not rely on chat memory or ad-hoc UI conventions.",
    source: "research/palantir/platform/devcon.md §DC5-02",
  },
  {
    id: "HAL-02",
    name: "Clear Validation Criteria",
    description:
      "Agentic work compounds only when each stage has explicit validation criteria, whether through phased review, "
      + "deterministic checks, or post-hoc analysis.",
    localImplication:
      "Backend and frontend ontology generation must end in explicit validators: schema checks, frontend reference integrity, "
      + "evaluation suites, and deterministic route/action/query contracts.",
    source: "research/palantir/platform/devcon.md §DC5-02 + research/palantir/platform/ai-fde.md §FDE-05",
  },
  {
    id: "HAL-03",
    name: "Feedback-Driven Optimization",
    description:
      "Prompt refinement, agent definitions, and structured operator feedback should improve the system over time instead of "
      + "being lost after a single run.",
    localImplication:
      "Durable feedback belongs in schema constants, task-context scaffolds, evaluation records, and typed frontend feedback surfaces "
      + "rather than free-form comments or transient chat history.",
    source: "research/palantir/platform/devcon.md §DC5-02 + research/palantir/platform/ai-fde.md §FDE-06",
  },
] as const;

// =========================================================================
// Section 34: Project Scope Ontology Surfaces (PS-01..04)
// =========================================================================
//
// DevCon 5 made the whole builder stack explicit: ontology primitives, functions,
// applications, voice/agent surfaces, scenarios, and automations are one project
// scope. If AI agents are expected to implement "the ontology" with minimal HITL,
// the contract must cover both backend and frontend surfaces.
//
// Source: research/palantir/platform/devcon.md §DC5-03, §DC5-08..10

export type ProjectScopeSurfaceLayer = "backend" | "frontend" | "cross";

export interface ProjectScopeOntologySurface {
  readonly id: string;
  readonly layer: ProjectScopeSurfaceLayer;
  readonly name: string;
  readonly officialSurface: string;
  readonly localImplication: string;
  readonly source: string;
}

export const PROJECT_SCOPE_ONTOLOGY_SURFACES: readonly ProjectScopeOntologySurface[] = [
  {
    id: "PS-01",
    layer: "backend",
    name: "Backend Semantic Core",
    officialSurface: "Object types, link types, functions, actions, security, and LEARN signals",
    localImplication:
      "This maps to BackendOntology: data, logic, action, security, and learn. AI agents must stabilize this semantic core before shipping UI.",
    source: "research/palantir/platform/devcon.md §DC5-03",
  },
  {
    id: "PS-02",
    layer: "frontend",
    name: "Application Surface",
    officialSurface: "Workshop applications, OSDK apps, dashboards, and local-first app scaffolds",
    localImplication:
      "Frontend ontology must declare routes/views against explicit entity/query/action references so AI agents can scaffold real applications without inventing bindings.",
    source: "research/palantir/platform/devcon.md §DC5-08..09",
  },
  {
    id: "PS-03",
    layer: "frontend",
    name: "Agent Surface",
    officialSurface: "Voice agents, assistant panels, inbox reviewers, and agent-built applications",
    localImplication:
      "Agent-facing UI surfaces must bind to explicit backend queries, functions, actions, and automations. This is the minimum contract for reducing HITL safely.",
    source: "research/palantir/platform/devcon.md §DC5-08..10 + research/palantir/platform/ai-fde.md §FDE-05..07",
  },
  {
    id: "PS-04",
    layer: "cross",
    name: "Sandbox and Review Surface",
    officialSurface: "Scenarios, staged review, Workflow Lineage, Object Security Policies, and transactions",
    localImplication:
      "Human-agent teaming should prefer sandboxed proposal flows over direct production mutation. Frontend contracts must be able to declare compare/submit/commit patterns explicitly.",
    source: "research/palantir/platform/devcon.md §DC5-10",
  },
] as const;

// =========================================================================
// Section 35: Ontology Design Principles (ODP-01..04)
// =========================================================================
//
// The advanced ontology session made four long-lived design principles explicit.
// These are durable enough to promote into schema authority because they improve
// how AI agents structure ontologies, not just how humans narrate them.
//
// Source: research/palantir/platform/devcon.md §DC5-04..06

export interface OntologyDesignPrinciple {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly aiAgentImplication: string;
  readonly source: string;
}

export const ONTOLOGY_DESIGN_PRINCIPLES: readonly OntologyDesignPrinciple[] = [
  {
    id: "ODP-01",
    name: "Domain-Driven Design",
    description:
      "Model real-world objects, links, and workflows as the virtual twin of operations rather than mirroring upstream datasets blindly.",
    aiAgentImplication:
      "Agents should translate source systems into operational semantics, not ontologize every upstream field one-to-one without abstraction.",
    source: "research/palantir/platform/devcon.md §DC5-05",
  },
  {
    id: "ODP-02",
    name: "Don't Repeat Yourself",
    description:
      "Use the rule of three: if the same workflow or schema is built repeatedly, refactor toward interfaces, shared representations, or canonical workflows.",
    aiAgentImplication:
      "When AI agents detect repeated object/view/workflow shapes, they should prefer interface-backed or shared constructs over copy-pasted ontology fragments.",
    source: "research/palantir/platform/devcon.md §DC5-05..06",
  },
  {
    id: "ODP-03",
    name: "Open for Extension, Closed for Modification",
    description:
      "Core workflows and interfaces should be stable enough to protect the canonical model while remaining extensible by downstream builders.",
    aiAgentImplication:
      "Agents should default to extending stable interfaces and action/query surfaces before mutating canonical definitions that many workflows depend on.",
    source: "research/palantir/platform/devcon.md §DC5-05..06",
  },
  {
    id: "ODP-04",
    name: "Producer Extends, Consumer Super",
    description:
      "Interface-based design increases plug-and-play reuse: producers can specialize while consumers operate over stable abstractions.",
    aiAgentImplication:
      "AI-generated frontend and backend workflows should prefer interface-level contracts when they need cross-type reuse or future-proof extensibility.",
    source: "research/palantir/platform/devcon.md §DC5-05..06",
  },
] as const;

// =========================================================================
// Section 36: Embedded Ontology App Surfaces (EO-01..05)
// =========================================================================
//
// Foundry now documents an explicit local-first / offline-capable application
// path using the embedded ontology. This gives DevCon 5's "embedded ontology"
// claim an official operational surface: explicit sync sets, local Wasm-backed
// runtime, PWA installation, and optional diff-based peering.
//
// Source: research/palantir/platform/devcon.md §DC5-09
//         research/palantir/platform/announcements.md §ANN-03

export interface EmbeddedOntologyAppSurface {
  readonly id: string;
  readonly component: string;
  readonly description: string;
  readonly localImplication: string;
  readonly source: string;
}

export const EMBEDDED_ONTOLOGY_APP_SURFACES: readonly EmbeddedOntologyAppSurface[] = [
  {
    id: "EO-01",
    component: "Offline-capable client-facing app",
    description: "Foundry can bootstrap a client-facing application that syncs ontology data locally and continues working without network connectivity.",
    localImplication: "Frontend ontology may need an explicit embeddedOntologyApp surface when the application semantics include offline operation.",
    source: "research/palantir/platform/devcon.md §DC5-09",
  },
  {
    id: "EO-02",
    component: "Explicit sync set",
    description: "Embedded ontology apps configure a bounded syncObjects set instead of implicitly mirroring the full ontology offline.",
    localImplication: "Offline-capable views should declare syncEntityApiNames rather than treating local sync scope as hidden runtime detail.",
    source: "research/palantir/platform/devcon.md §DC5-09",
  },
  {
    id: "EO-03",
    component: "Runtime support surface",
    description: "The embedded ontology runtime is a distinct support layer with its own bootstrapping, client, and sync lifecycle.",
    localImplication: "Runtime support bindings should be able to declare embedded ontology support explicitly instead of burying it in component code.",
    source: "research/palantir/platform/devcon.md §DC5-09",
  },
  {
    id: "EO-04",
    component: "Progressive Web App delivery",
    description: "Offline-capable applications can be installed as PWAs and keep working against synced ontology data while disconnected.",
    localImplication: "Local-first ontology surfaces are not only developer tooling; they are end-user runtime contracts that may affect routes, support bindings, and sync policy.",
    source: "research/palantir/platform/announcements.md §ANN-03",
  },
  {
    id: "EO-05",
    component: "Peering / diff sync",
    description: "Offline App Sync can switch from full reloads to diff-based peering for configured object types.",
    localImplication: "Projects with large offline sync sets should treat sync strategy as a semantic/runtime concern, not just a transport optimization.",
    source: "research/palantir/platform/announcements.md §ANN-03",
  },
] as const;

// =========================================================================
// Section 37: Structural Change Governance Surfaces (SCG-01..05)
// =========================================================================
//
// Builder-side ontology evolution is no longer a hidden admin concern. Foundry
// exposes explicit branch, proposal, and protection surfaces for structural
// changes. This is distinct from runtime scenarios: scenarios compare potential
// operational outcomes, while branch/proposal flows govern structural changes to
// the ontology/application stack itself.
//
// Source: research/palantir/platform/devcon.md §DC5-10
//         research/palantir/platform/announcements.md §ANN-07

export interface StructuralChangeGovernanceSurface {
  readonly id: string;
  readonly surface: string;
  readonly description: string;
  readonly localImplication: string;
  readonly source: string;
}

export const STRUCTURAL_CHANGE_GOVERNANCE_SURFACES: readonly StructuralChangeGovernanceSurface[] = [
  {
    id: "SCG-01",
    surface: "Global Branch",
    description: "Structural ontology and application edits are isolated on a dedicated branch before proposal or merge.",
    localImplication: "Project ontology changes should distinguish draft structural evolution from committed runtime behavior.",
    source: "research/palantir/platform/announcements.md §ANN-07",
  },
  {
    id: "SCG-02",
    surface: "Proposal review",
    description: "A proposal is the explicit review/merge object for branch-backed structural change, separate from the draft branch itself.",
    localImplication: "Review/approval semantics apply both to runtime actions and to structural change workflows; do not collapse them into one abstraction.",
    source: "research/palantir/platform/announcements.md §ANN-MCP",
  },
  {
    id: "SCG-03",
    surface: "Resource protection and project approval policies",
    description: "Protected resources and approval policies gate which structural changes can be promoted.",
    localImplication: "Local governance docs should treat protected structural surfaces as first-class authority boundaries, not as optional workflow hygiene.",
    source: "research/palantir/platform/devcon.md §DC5-10",
  },
  {
    id: "SCG-04",
    surface: "Delegated branch ownership",
    description: "Branch creators can assign owner-equivalent roles to additional users or groups, decoupling authorship from sole merge control.",
    localImplication: "Human-agent teaming should model ownership and review delegation explicitly instead of assuming one operator per change surface.",
    source: "research/palantir/platform/announcements.md §ANN-07",
  },
  {
    id: "SCG-05",
    surface: "Object view branching approval gap",
    description: "Object view branching exists, but approvals integration was still incomplete in the January 2026 announcement and explicitly on the roadmap.",
    localImplication: "Do not assume every branchable UI resource already inherits the full approval stack; review coverage itself must be checked.",
    source: "research/palantir/platform/announcements.md §ANN-JAN",
  },
] as const;
