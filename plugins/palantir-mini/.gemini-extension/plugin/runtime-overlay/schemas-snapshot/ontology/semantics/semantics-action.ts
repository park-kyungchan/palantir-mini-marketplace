/**
 * ACTION Domain Semantics
 *
 * Split from legacy semantics.ts v1.13.1 (D1, 2026-04-19).
 * Digital Twin stage: ACT. Owns 3 concept types (Mutation, Webhook,
 * Automation).
 *
 * Consumers MUST import from the parent barrel: `from "../semantics"`.
 */

import type { DomainSemantics } from "./semantics-core";

// =========================================================================
// Section 6: ACTION_SEMANTICS
// =========================================================================

export const ACTION_SEMANTICS: DomainSemantics = {
  domain: "action",
  realWorldRole: "Defines levers that affect the real world when executed — commits, triggers, orchestrates",
  semanticQuestion: "Does this CHANGE REALITY when executed — creating, modifying, deleting, or triggering external effects?",
  description:
    "ACTION is the execution layer. It commits state changes described by LOGIC, triggers external side "
    + "effects, and orchestrates automated workflows. In a commercial sense: creating a work order for a "
    + "technician, a stock transfer order to move product, adjusting reorder points, sending notifications. "
    + "On a battlefield: kinetic actions, simulations, operational plans that translate into real intervention. "
    + "ACTION is execution-only — it does not compute, derive, or describe. It commits and triggers. The core "
    + "principle: 'ACTION is merely the executor that follows LOGIC's blueprint when a change actually occurs.'",
  analogy:
    "The circulation desk: checking out books, processing returns, ordering new acquisitions, sending "
    + "overdue notices — the operations that change the library's state when actually executed. The desk "
    + "follows the librarian's expertise to know what to do.",
  digitalTwinStage: "act",
  digitalTwinRole:
    "ACT: Approved decisions execute across all enterprise substrates — mutations commit state changes, "
    + "webhooks sync external systems, automations orchestrate scheduled workflows. ACTION is the kinetic "
    + "layer that CHANGES reality. In the LEARN feedback path, every action execution produces outcomes that "
    + "become new DATA: action logs capture WHEN/WHO/WHAT, updated metrics reflect impact, and decision "
    + "lineage records the full reasoning chain. Progressive autonomy (5 levels) governs how much AI "
    + "independence the system allows for each action type.",
  commercialExamples: [
    {
      sector: "healthcare",
      concept: "Prescribe medication mutation: creates PrescriptionOrder, links to Patient and Pharmacy, fires transactional webhook to pharmacy dispensing system, with submission criteria: prescriber must hold active license AND drug not in patient allergy list",
      reasoning: "Prescribing changes reality — a new order exists, the pharmacy is notified, the patient's medication list is altered. This is a real-world intervention, not reasoning.",
    },
    {
      sector: "logistics",
      concept: "Dispatch shipment mutation: assigns Driver to Shipment, updates Route status to 'in-transit', creates initial TrackingEvent, fires webhook to customer notification system with estimated delivery window",
      reasoning: "Dispatching a shipment changes the real world — a driver is committed to a route, a truck begins moving, a customer receives a notification. These are irreversible operational changes.",
    },
    {
      sector: "finance",
      concept: "Execute trade mutation: creates TradeOrder with execution price, updates Portfolio holding quantities, fires compliance-check webhook, with submission criteria: order notional value < daily risk limit AND security not in restricted trading list",
      reasoning: "Executing a trade changes financial reality — capital is committed, positions shift, regulatory obligations are triggered. This is a real-world financial intervention.",
    },
    {
      sector: "education",
      concept: "Enroll student mutation: creates Enrollment record, decrements available seats on Course, fires prerequisite validation, with waitlist automation: if seat opens AND student is first on waitlist, auto-enroll and notify via email webhook",
      reasoning: "Enrollment changes reality — a seat is taken, a student's schedule is altered, billing and room assignment systems are triggered downstream.",
    },
    {
      sector: "manufacturing",
      concept: "Create work order mutation: assigns Technician to Machine, sets priority from maintenanceUrgency (LOGIC), fires notification to shift supervisor, with escalation automation: if priority='critical' AND unacknowledged after 4 hours, escalate to plant manager",
      reasoning: "Creating a work order commits resources — a technician's schedule changes, parts may be ordered, production may be interrupted. This is a real operational intervention.",
    },
    {
      sector: "military",
      concept: "Authorize operational plan mutation: commits resource allocations (personnel, equipment, logistics), updates force readiness status, fires encrypted webhook to command chain, with submission criteria: authorization requires two-star or higher clearance level",
      reasoning: "Authorizing an operation changes the real world irreversibly — forces are committed, supplies are consumed, the operational state shifts. This is the ultimate ACTION.",
    },
    {
      sector: "energy",
      concept: "Adjust generation output mutation: modifies plant MW setpoint, triggers SCADA webhook to distributed control system for governor adjustment, with automation: if grid frequency deviates >0.5Hz from 60Hz, auto-dispatch reserve generation units within 30 seconds",
      reasoning: "Adjusting output changes physical reality — turbines spin faster or slower, electrons flow differently, grid frequency responds. This is direct physical intervention via digital twin.",
    },
  ],
  projectExamples: [
    { sector: "finance", concept: "createStoryThread mutation — creates a new thread grouping related news articles", reasoning: "Creating a thread changes reality — a new entity is written to the database, affecting downstream views" },
    { sector: "finance", concept: "assignArticleToThread mutation — links an article into an existing story thread", reasoning: "Assignment modifies the relationship graph — a write operation that changes which articles belong to which thread" },
    { sector: "finance", concept: "addImpactNode mutation — adds a stock impact to an article's causal chain", reasoning: "Adding an impact node creates a new edge in the impact graph — a state-changing write operation" },
  ],
  owns: ["Mutation", "Webhook", "Automation"],
  reads: ["ObjectType", "Property", "Function", "LinkType"],
  mustNotContain: [
    "ObjectType", "Property", "ValueType", "StructType", "SharedPropertyType",
    "GeoPointProperty", "GeoShapeProperty", "GeoTemporalProperty",
    "TimeSeriesProperty", "AttachmentProperty", "VectorProperty", "CipherProperty",
    "LinkType", "Interface", "Query", "DerivedProperty", "Function",
  ],
  classificationRules: [
    {
      id: "CR-ACTION-01",
      concept: "Mutation createWorkOrder: creates WorkOrder entity, assigns Technician, sets priority",
      semanticTest: "Does creating a work order CHANGE REALITY?",
      domain: "action",
      reasoning: "Creating a work order is a real-world intervention — a technician is committed, maintenance is scheduled, production may be affected. State is permanently changed.",
    },
    {
      id: "CR-ACTION-02",
      concept: "Webhook notifySupplier: fires HTTP POST to supplier API on shipment delay detection",
      semanticTest: "Does sending a notification to an external system CHANGE REALITY?",
      domain: "action",
      reasoning: "A webhook fires a side effect to an external system — the supplier receives information and may take real-world action. This is execution, not reasoning.",
    },
    {
      id: "CR-ACTION-03",
      concept: "Automation nightlyInventoryReconciliation: cron job at 02:00 UTC comparing physical counts against system records",
      semanticTest: "Does a scheduled reconciliation job CHANGE REALITY?",
      domain: "action",
      reasoning: "A cron automation executes mutations on a schedule — it changes stored state by reconciling discrepancies. The scheduled execution makes it ACTION, not LOGIC.",
    },
    {
      id: "CR-ACTION-04",
      concept: "$validateOnly operation: checks submission criteria without committing any edits",
      semanticTest: "Does validation-only checking CHANGE REALITY?",
      domain: "logic",
      reasoning: "$validateOnly does NOT change reality — it reasons about whether constraints are satisfied. Despite being invoked via the Action API, its semantic nature is LOGIC (reasoning about validity).",
      counterArgument: "$validateOnly is documented under Action Types and invoked via applyAction with $validateOnly:true. But the semanticTest is decisive: no state changes = not ACTION. The invocation context is an implementation detail; the semantic classification follows the question 'does this CHANGE reality?' Answer: no.",
    },
    {
      id: "CR-ACTION-05",
      concept: "Function-backed Action wrapping an edit function: calls closeIncident edit function then commits all returned Edits[]",
      semanticTest: "Does wrapping and committing edit function results CHANGE REALITY?",
      domain: "action",
      reasoning: "The wrapper commits what the edit function described — the edit function itself is LOGIC (returns Edits[]), but the function-backed Action that calls it and commits the edits is ACTION. The boundary is at the commit point.",
    },
  ],
  hardConstraints: [
    {
      id: "HC-ACTION-01",
      domain: "action",
      rule: "Maximum 10,000 objects editable per single Action (OSv2)",
      severity: "error",
      source: ".claude/research/palantir/architecture/ontology-model.md §ARCH-39 — Canonical Constraints",
      rationale: "Object Storage V2 transaction size limit — exceeding this causes transaction failure. Batch actions must respect this ceiling.",
    },
    {
      id: "HC-ACTION-02",
      domain: "action",
      rule: "$validateOnly and $returnEdits are mutually exclusive — cannot use both in same request",
      severity: "error",
      source: ".claude/research/palantir/action/README.md — Execution-Only Principle",
      rationale: "$validateOnly checks submission criteria without executing (true non-committing mode); $returnEdits executes AND commits the action but also returns the edits manifest in the response (post-commit introspection, NOT a preview). These serve different purposes and cannot be combined. (OFFICIAL FACT: OSDK TypeScript migration guide states 'It is not possible to return edits and validateOnly at the same time.')",
    },
    {
      id: "HC-ACTION-03",
      domain: "action",
      rule: "Function-backed rule is exclusive — no other rules allowed when a function rule is present in an Action",
      severity: "error",
      source: ".claude/research/palantir/action/README.md — Two-Tier Action Architecture",
      rationale: "When a function rule is present, the function takes full responsibility for all edits. Mixing simple rules with function rules creates ambiguous ownership of state changes.",
    },
    {
      id: "HC-ACTION-04",
      domain: "action",
      rule: "Search APIs see OLD state during function execution (eventual consistency lag)",
      severity: "error",
      source: ".claude/research/palantir/action/README.md — Tier 2: Function-Backed Rules",
      rationale: "Functions execute within a transaction boundary where search indexes have not yet been updated. Queries within a function may return stale results — must design for this.",
    },
    {
      id: "HC-ACTION-05",
      domain: "action",
      rule: "ALL submission criteria must pass before action can execute — independent from edit permissions",
      severity: "error",
      source: ".claude/research/palantir/action/README.md — Submission Criteria",
      rationale: "Submission criteria are a business logic gate on execution — if any criterion fails, the action is rejected and no side effects are triggered. This is a hard precondition, not a soft warning.",
    },
  ],
  boundaryTestId: "DS-3",
} as const;

