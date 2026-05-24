/**
 * Domain Semantic Definitions — Barrel
 *
 * TERMINOLOGY NOTICE — LOCAL NORMALIZATION
 * This barrel exposes the domain-semantic contract from which all domain
 * schemas (data/schema.ts, logic/schema.ts, action/schema.ts) derive their
 * scope. See TERMINOLOGY_CHARTER (in semantics/semantics-core) for the
 * canonical boundary between official Palantir wording and local
 * normalization decisions.
 *
 * Structure (split 2026-04-19, D1):
 *   semantics/semantics-core.ts     — charter, types, heuristics, transitions,
 *                                     DOMAIN_SEMANTICS, DIGITAL_TWIN_LOOP,
 *                                     CONCEPT_OWNER, CONSISTENCY_INVARIANTS
 *   semantics/semantics-data.ts     — DATA_SEMANTICS
 *   semantics/semantics-logic.ts    — LOGIC_SEMANTICS
 *   semantics/semantics-action.ts   — ACTION_SEMANTICS
 *   semantics/semantics-security.ts — SECURITY_OVERLAY (governance overlay)
 *   semantics/semantics-learn.ts    — LEARN / philosophy / governance / eval /
 *                                     lineage / workflow / platform
 *
 * Consumers import from this barrel, e.g. `from "../semantics"`. Sub-file
 * layout may evolve within the v1.x line; pin imports to this barrel.
 *
 * Authority:
 *   - builder/fact route: .claude/research/palantir-developers/BROWSE.md
 *   - official ontology/platform facts: .claude/research/palantir-foundry/architecture/BROWSE.md
 *     and .claude/research/palantir-foundry/ontology/BROWSE.md
 *   - interpretation bridge: .claude/research/palantir-vision/architecture-gap/ontology-model.md
 *   - legacy citations still present in schema subfiles must be resolved via
 *     ./research-source-map.ts before they are treated as authority
 */

export * from "./semantics/semantics-core";
export * from "./semantics/semantics-security";
export * from "./semantics/semantics-data";
export * from "./semantics/semantics-logic";
export * from "./semantics/semantics-action";
export * from "./semantics/semantics-learn";
