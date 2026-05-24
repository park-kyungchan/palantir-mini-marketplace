/**
 * Ontology Pipeline Validation — Shared Types (Barrel)
 *
 * Aligned with production schema (ontology/schema.ts). Foundation types for
 * all 40 validation test files. Every test file imports from here — zero
 * duplication.
 *
 * Structure (split 2026-04-19, D4):
 *   types/types-core.ts     — test infra, unions, enums, StructuralRule,
 *                             BilingualDesc, ValueConstraint, propagation
 *                             graph, SemanticIssue, VALID_*_TYPES
 *   types/types-data.ts     — DATA entity shapes
 *   types/types-logic.ts    — LOGIC shapes (LinkType, Interface, Query, Function)
 *   types/types-action.ts   — ACTION shapes (Mutation, Webhook, Automation)
 *   types/types-security.ts — SECURITY shapes (Role, Marking, RLS/CLS, policies)
 *   types/types-learn.ts    — LEARN infrastructure, Backend/Frontend/Runtime
 *                             ontology shapes, ProjectOntologyScope,
 *                             OntologyExports composition
 *
 * Consumers import from this barrel, e.g. `from "../types"`. Sub-file
 * layout may evolve within the v1.x line; pin imports to this barrel.
 */

export * from "./types/types-core";
export * from "./types/types-data";
export * from "./types/types-logic";
export * from "./types/types-action";
export * from "./types/types-security";
export * from "./types/types-learn";
