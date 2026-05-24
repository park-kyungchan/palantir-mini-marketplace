/**
 * Project Validator — Subfolder Barrel
 *
 * Re-exported by ../project-validator.ts. Consumers SHOULD import from the
 * parent barrel rather than this subfolder directly.
 */

export { runProjectValidation, validateProjectOntology } from "./pv-runner";
export {
  RESERVED_FRONTEND_ACTION_PREFIXES,
  isReservedFrontendAction,
  validateNaming,
} from "./pv-01-naming";
export { validateReferentialIntegrity } from "./pv-02-referential";
export { validateHcCompliance } from "./pv-03-hc-compliance";
export { validateStructuralCompleteness } from "./pv-04-structural";
export { validatePropagationGraph } from "./pv-05-propagation";
export { validateFrontendOntology } from "./pv-07-frontend";
export { validateRuntimeOntology } from "./pv-08-runtime";
