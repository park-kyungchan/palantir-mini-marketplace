/**
 * Project Validator — Generic Meta→Project Compliance Test Suite (Barrel)
 *
 * Validates any project's ontology export against the Meta-Level schema rules.
 * Supports the flat OntologyExports shape and the scoped backend/frontend model.
 * Projects use this with a one-liner:
 *
 *   import { runProjectValidation } from "~/.claude/schemas/ontology/project-validator";
 *   import * as ontology from "./schema";
 *   runProjectValidation(ontology);
 *
 * Validation Groups:
 *   PV-01: Naming Conventions (PascalCase/camelCase per domain)
 *   PV-02: Referential Integrity (cross-domain references exist, including typed LEARN refs)
 *   PV-03: HC Compliance (platform limits)
 *   PV-04: Structural Completeness (required fields present)
 *   PV-05: Propagation Graph (cycles, orphans)
 *   PV-06: Security policy completeness (handled inline by pv-runner.validateProjectOntology)
 *   PV-07: Frontend ontology scope (backend↔frontend reference integrity)
 *   PV-08: Runtime ontology scope (frontend/runtime/backend binding integrity)
 *
 * Structure (split 2026-04-19, D2):
 *   project-validator/pv-01-naming.ts       — PV-01
 *   project-validator/pv-02-referential.ts  — PV-02
 *   project-validator/pv-03-hc-compliance.ts — PV-03
 *   project-validator/pv-04-structural.ts   — PV-04
 *   project-validator/pv-05-propagation.ts  — PV-05
 *   project-validator/pv-07-frontend.ts     — PV-07
 *   project-validator/pv-08-runtime.ts      — PV-08
 *   project-validator/pv-runner.ts          — runProjectValidation +
 *                                             validateProjectOntology (non-test API,
 *                                             contains inline PV-01..07 + PV-06 security)
 *
 * Consumers import from this barrel. Sub-file layout may evolve within the
 * v1.x line; pin imports to this barrel.
 *
 * Authority: schemas/ontology/semantics.ts (Meta-Level SSoT)
 * Depends on: types.ts (OntologyExports / ProjectOntologyScope compatibility shape)
 */

export { runProjectValidation, validateProjectOntology } from "./project-validator/pv-runner";
export {
  RESERVED_FRONTEND_ACTION_PREFIXES,
  isReservedFrontendAction,
  validateNaming,
} from "./project-validator/pv-01-naming";
export { validateReferentialIntegrity } from "./project-validator/pv-02-referential";
export { validateHcCompliance } from "./project-validator/pv-03-hc-compliance";
export { validateStructuralCompleteness } from "./project-validator/pv-04-structural";
export { validatePropagationGraph } from "./project-validator/pv-05-propagation";
export { validateFrontendOntology } from "./project-validator/pv-07-frontend";
export { validateRuntimeOntology } from "./project-validator/pv-08-runtime";
