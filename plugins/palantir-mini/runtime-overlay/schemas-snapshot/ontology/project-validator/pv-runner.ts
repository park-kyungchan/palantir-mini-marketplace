/**
 * Project Validator — Public API Runner
 *
 * Split from legacy project-validator.ts v1.13.1 (D2, 2026-04-19).
 * Composes all PV-0X validators. Exports:
 *   - runProjectValidation(exports) — bun:test wrapper
 *   - validateProjectOntology(exports) — returns structured report (no bun:test)
 *
 * Consumers import from the parent barrel: `from "./project-validator"`.
 */

import { describe } from "bun:test";
import type { OntologyExports } from "../types";
import { VALID_BASE_TYPES } from "../types";
import { isPascalCase, isCamelCase } from "../helpers";
import { validateNaming, isReservedFrontendAction } from "./pv-01-naming";
import { validateReferentialIntegrity } from "./pv-02-referential";
import { validateHcCompliance } from "./pv-03-hc-compliance";
import { validateStructuralCompleteness } from "./pv-04-structural";
import { validatePropagationGraph } from "./pv-05-propagation";
import { validateFrontendOntology } from "./pv-07-frontend";
import { validateRuntimeOntology } from "./pv-08-runtime";

export function runProjectValidation(exports: OntologyExports): void {
  describe("Project Ontology Validation (Meta-Level Compliance)", () => {
    validateNaming(exports);
    validateReferentialIntegrity(exports);
    validateHcCompliance(exports);
    validateStructuralCompleteness(exports);
    validatePropagationGraph(exports);
    validateFrontendOntology(exports);
    validateRuntimeOntology(exports);
  });
}

/**
 * Non-test validation — returns a structured report without bun:test dependency.
 * Useful for CI/CD pipelines or runtime checks.
 */
export function validateProjectOntology(exports: OntologyExports): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const entityNames = new Set(exports.data.objectTypes.map((e) => e.apiName));
  const mutationNames = new Set(exports.action.mutations.map((m) => m.apiName));
  const functionNames = new Set(exports.logic.functions.map((f) => f.apiName));

  // PV-01: Naming (parity with runProjectValidation — WI-02 remediation 2026-03-17)
  for (const entity of exports.data.objectTypes) {
    if (!isPascalCase(entity.apiName)) {
      errors.push(`PV-01: Entity "${entity.apiName}" is not PascalCase`);
    }
    for (const prop of entity.properties) {
      if (!isCamelCase(prop.apiName)) {
        errors.push(`PV-01: Property "${entity.apiName}.${prop.apiName}" is not camelCase`);
      }
    }
  }
  for (const link of exports.logic.linkTypes) {
    if (!isCamelCase(link.apiName)) {
      errors.push(`PV-01: Link "${link.apiName}" is not camelCase`);
    }
  }
  for (const mutation of exports.action.mutations) {
    if (!isCamelCase(mutation.apiName)) {
      errors.push(`PV-01: Mutation "${mutation.apiName}" is not camelCase`);
    }
  }
  for (const role of exports.security.roles) {
    if (!isCamelCase(role.apiName)) {
      errors.push(`PV-01: Role "${role.apiName}" is not camelCase`);
    }
  }
  for (const vt of exports.data.valueTypes) {
    if (!isPascalCase(vt.apiName)) {
      errors.push(`PV-01: ValueType "${vt.apiName}" is not PascalCase`);
    }
  }
  for (const iface of exports.logic.interfaces) {
    if (!isPascalCase(iface.apiName)) {
      errors.push(`PV-01: Interface "${iface.apiName}" is not PascalCase`);
    }
  }
  for (const st of exports.data.structTypes) {
    if (!isPascalCase(st.apiName)) {
      errors.push(`PV-01: StructType "${st.apiName}" is not PascalCase`);
    }
  }

  // PV-02: Referential Integrity (parity with runProjectValidation — WI-02 remediation 2026-03-17)
  for (const link of exports.logic.linkTypes) {
    if (!entityNames.has(link.sourceEntity)) {
      errors.push(`PV-02: Link "${link.apiName}" sourceEntity "${link.sourceEntity}" not found`);
    }
    if (!entityNames.has(link.targetEntity)) {
      errors.push(`PV-02: Link "${link.apiName}" targetEntity "${link.targetEntity}" not found`);
    }
  }
  for (const mutation of exports.action.mutations) {
    if (!entityNames.has(mutation.entityApiName)) {
      errors.push(`PV-02: Mutation "${mutation.apiName}" entityApiName "${mutation.entityApiName}" not found`);
    }
  }
  for (const query of exports.logic.queries) {
    if (!entityNames.has(query.entityApiName)) {
      errors.push(`PV-02: Query "${query.apiName}" entityApiName "${query.entityApiName}" not found`);
    }
  }
  for (const dp of exports.logic.derivedProperties) {
    if (!entityNames.has(dp.entityApiName)) {
      errors.push(`PV-02: DerivedProperty "${dp.apiName}" entityApiName "${dp.entityApiName}" not found`);
    }
  }
  for (const iface of exports.logic.interfaces) {
    for (const impl of iface.implementedBy) {
      if (!entityNames.has(impl)) {
        errors.push(`PV-02: Interface "${iface.apiName}" implementedBy "${impl}" not found`);
      }
    }
  }
  const roleNames = new Set(exports.security.roles.map((r) => r.apiName));
  for (const perm of exports.security.permissionMatrix) {
    if (!entityNames.has(perm.entityApiName)) {
      errors.push(`PV-02: PermissionMatrix entry references entity "${perm.entityApiName}" not found`);
    }
    if (!roleNames.has(perm.roleApiName)) {
      errors.push(`PV-02: PermissionMatrix entry references role "${perm.roleApiName}" not found`);
    }
  }
  for (const marking of exports.security.markings) {
    for (const level of marking.levels ?? []) {
      if (!roleNames.has(level)) {
        errors.push(`PV-02: Marking "${marking.apiName}" references role level "${level}" not found`);
      }
    }
  }

  for (const ref of [
    exports.learn?.feedbackEntityRef,
    exports.learn?.evaluationEntityRef,
    exports.learn?.outcomeEntityRef,
    exports.learn?.accuracyEntityRef,
    exports.learn?.refinementSignalEntityRef,
    ...(exports.learn?.workflowLineageEntityRefs ?? []),
  ].filter((value): value is string => Boolean(value))) {
    if (!entityNames.has(ref)) {
      errors.push(`PV-02: LearnInfrastructure entity ref "${ref}" not found`);
    }
  }

  for (const ref of [
    ...(exports.learn?.feedbackMutationRefs ?? []),
    ...(exports.learn?.evaluationMutationRefs ?? []),
    ...(exports.learn?.outcomeMutationRefs ?? []),
    ...(exports.learn?.graduationMutationRefs ?? []),
  ]) {
    if (!mutationNames.has(ref)) {
      errors.push(`PV-02: LearnInfrastructure mutation ref "${ref}" not found`);
    }
  }

  for (const ref of exports.learn?.evaluationFunctionRefs ?? []) {
    if (!functionNames.has(ref)) {
      errors.push(`PV-02: LearnInfrastructure evaluation function ref "${ref}" not found`);
    }
  }

  const hasTypedLearnFeedback =
    Boolean(exports.learn?.feedbackEntityRef)
    || (exports.learn?.feedbackMutationRefs?.length ?? 0) > 0;
  const hasTypedLearnEvaluation =
    Boolean(exports.learn?.evaluationEntityRef)
    || (exports.learn?.evaluationMutationRefs?.length ?? 0) > 0
    || (exports.learn?.evaluationFunctionRefs?.length ?? 0) > 0;
  const hasTypedLearnOutcome =
    Boolean(exports.learn?.outcomeEntityRef)
    || (exports.learn?.outcomeMutationRefs?.length ?? 0) > 0;
  const hasTypedLearnRefinement =
    Boolean(exports.learn?.accuracyEntityRef)
    || Boolean(exports.learn?.refinementSignalEntityRef)
    || (exports.learn?.graduationMutationRefs?.length ?? 0) > 0;
  const hasTypedWorkflowLineage = (exports.learn?.workflowLineageEntityRefs?.length ?? 0) > 0;

  if (exports.learn?.hasEvaluatorResults && !(hasTypedLearnFeedback || hasTypedLearnEvaluation)) {
    warnings.push("PV-02: learn.hasEvaluatorResults=true but no typed feedback/evaluation refs are declared. Prefer feedbackEntityRef / evaluationEntityRef / evaluationMutationRefs for BackPropagation clarity.");
  }
  if (exports.learn?.hasOutcomeRecords && !hasTypedLearnOutcome) {
    warnings.push("PV-02: learn.hasOutcomeRecords=true but no typed outcome refs are declared. Prefer outcomeEntityRef / outcomeMutationRefs for REF-01 traceability.");
  }
  if (exports.learn?.hookEventsTable && !hasTypedWorkflowLineage) {
    warnings.push("PV-02: learn.hookEventsTable is declared but workflowLineageEntityRefs is empty. Declare typed trace entities so Workflow Lineage stays inspectable.");
  }
  if ((hasTypedLearnOutcome || exports.learn?.hasOutcomeRecords) && !hasTypedLearnRefinement) {
    warnings.push("PV-02: outcome tracking is declared without typed refinement refs. Prefer accuracyEntityRef / refinementSignalEntityRef / graduationMutationRefs for REF-02..05 coverage.");
  }

  // PV-03: HC Compliance (parity with runProjectValidation — WI-02 remediation 2026-03-17)
  const validBaseTypes = new Set(VALID_BASE_TYPES);
  for (const entity of exports.data.objectTypes) {
    if (entity.properties.length > 2000) {
      errors.push(`PV-03: Entity "${entity.apiName}" exceeds 2000 properties (HC-DATA-03)`);
    }
    for (const prop of entity.properties) {
      if (!validBaseTypes.has(prop.baseType)) {
        errors.push(`PV-03: Property "${entity.apiName}.${prop.apiName}" has invalid baseType "${prop.baseType}"`);
      }
    }
    if (entity.vectors) {
      for (const vec of entity.vectors) {
        if (vec.dimensions > 2048) {
          errors.push(`PV-03: Vector "${entity.apiName}.${vec.apiName}" exceeds 2048 dimensions (HC-DATA-05)`);
        }
      }
    }
  }
  for (const query of exports.logic.queries) {
    if (query.traversalPath && query.traversalPath.length > 3) {
      errors.push(`PV-03: Query "${query.apiName}" traversalPath exceeds 3 hops (HC-LOGIC-01)`);
    }
  }

  // PV-04: Structural Completeness
  for (const entity of exports.data.objectTypes) {
    if (!entity.primaryKey) errors.push(`PV-04: Entity "${entity.apiName}" missing primaryKey`);
    if (!entity.titleKey) errors.push(`PV-04: Entity "${entity.apiName}" missing titleKey`);
    if (entity.properties.length === 0) errors.push(`PV-04: Entity "${entity.apiName}" has 0 properties`);

    const propNames = new Set(entity.properties.map((p) => p.apiName));
    if (!propNames.has(entity.primaryKey)) {
      errors.push(`PV-04: Entity "${entity.apiName}" primaryKey "${entity.primaryKey}" not in properties`);
    }
    if (!propNames.has(entity.titleKey)) {
      errors.push(`PV-04: Entity "${entity.apiName}" titleKey "${entity.titleKey}" not in properties`);
    }
  }

  // PV-06: PropertySecurityPolicy validation (WI-04 remediation 2026-03-17)
  // HC-SEC-13: Property security policies require an object security policy
  // HC-SEC-14: Primary key property cannot be in a property security policy
  // HC-SEC-15: Each non-PK property can belong to at most one property security policy
  if (exports.security.propertyPolicies && exports.security.propertyPolicies.length > 0) {
    const objectPolicyEntities = new Set(
      exports.security.objectPolicies.map((p) => p.entityApiName),
    );
    const propertyPolicyClaims = new Map<string, string[]>();

    for (const pp of exports.security.propertyPolicies) {
      // HC-SEC-13: requires object security policy on same entity
      if (!objectPolicyEntities.has(pp.entityApiName)) {
        errors.push(
          `PV-06: PropertySecurityPolicy on "${pp.entityApiName}" requires an objectSecurityPolicy (HC-SEC-13)`,
        );
      }

      // HC-SEC-14: PK cannot be a guarded property
      const entity = exports.data.objectTypes.find((e) => e.apiName === pp.entityApiName);
      if (entity) {
        if (pp.guardedProperties.includes(entity.primaryKey)) {
          errors.push(
            `PV-06: PropertySecurityPolicy on "${pp.entityApiName}" guards primary key "${entity.primaryKey}" (HC-SEC-14)`,
          );
        }
      }

      // HC-SEC-15: each property in at most one policy
      for (const prop of pp.guardedProperties) {
        const key = `${pp.entityApiName}.${prop}`;
        const existing = propertyPolicyClaims.get(key) || [];
        existing.push(pp.description?.en || "unnamed");
        propertyPolicyClaims.set(key, existing);
      }
    }

    for (const [key, policies] of propertyPolicyClaims) {
      if (policies.length > 1) {
        errors.push(
          `PV-06: Property "${key}" is guarded by ${policies.length} property security policies (HC-SEC-15)`,
        );
      }
    }
  }

  // PV-07: Frontend ontology scope
  if (exports.frontend) {
    const queryNames = new Set(exports.logic.queries.map((q) => q.apiName));
    const functionNames = new Set(exports.logic.functions.map((f) => f.apiName));
    const mutationNames = new Set(exports.action.mutations.map((m) => m.apiName));
    const automationNames = new Set(exports.action.automations.map((a) => a.apiName));
    const backendCallableNames = new Set([
      ...queryNames,
      ...functionNames,
      ...mutationNames,
      ...automationNames,
    ]);

    for (const view of exports.frontend.views) {
      if (!isPascalCase(view.apiName)) {
        errors.push(`PV-07: Frontend view "${view.apiName}" is not PascalCase`);
      }
      if (!view.route.startsWith("/")) {
        errors.push(`PV-07: Frontend view "${view.apiName}" route "${view.route}" must start with "/"`);
      }
      if (view.entityApiName && !entityNames.has(view.entityApiName)) {
        errors.push(`PV-07: Frontend view "${view.apiName}" references missing entity "${view.entityApiName}"`);
      }
      if (view.primaryQueryRef && !queryNames.has(view.primaryQueryRef)) {
        errors.push(`PV-07: Frontend view "${view.apiName}" references missing primary query "${view.primaryQueryRef}"`);
      }
      for (const ref of view.secondaryQueryRefs ?? []) {
        if (!queryNames.has(ref)) {
          errors.push(`PV-07: Frontend view "${view.apiName}" references missing secondary query "${ref}"`);
        }
      }
      for (const ref of view.mutationActionRefs ?? []) {
        if (!mutationNames.has(ref)) {
          errors.push(`PV-07: Frontend view "${view.apiName}" references missing mutation "${ref}"`);
        }
      }
      for (const ref of view.functionRefs ?? []) {
        if (!functionNames.has(ref)) {
          errors.push(`PV-07: Frontend view "${view.apiName}" references missing function "${ref}"`);
        }
      }
      for (const ref of view.syncEntityApiNames ?? []) {
        if (!entityNames.has(ref)) {
          errors.push(`PV-07: Frontend view "${view.apiName}" references missing offline sync entity "${ref}"`);
        }
      }
      if ((view.supportsOffline || (view.syncEntityApiNames?.length ?? 0) > 0) && !["osdkApp", "embeddedOntologyApp", "mobile"].includes(view.surface)) {
        errors.push(`PV-07: Frontend view "${view.apiName}" declares offline sync but uses unsupported surface "${view.surface}"`);
      }
    }

    for (const surface of exports.frontend.agentSurfaces ?? []) {
      if (!isPascalCase(surface.apiName)) {
        errors.push(`PV-07: Frontend agent surface "${surface.apiName}" is not PascalCase`);
      }
      if (surface.entityApiName && !entityNames.has(surface.entityApiName)) {
        errors.push(`PV-07: Frontend agent surface "${surface.apiName}" references missing entity "${surface.entityApiName}"`);
      }
      const totalRefs =
        (surface.queryRefs?.length ?? 0)
        + (surface.functionRefs?.length ?? 0)
        + (surface.actionRefs?.length ?? 0)
        + (surface.automationRefs?.length ?? 0);
      if (totalRefs === 0) {
        warnings.push(`PV-07: Frontend agent surface "${surface.apiName}" has no backend tool references`);
      }
      for (const ref of surface.queryRefs ?? []) {
        if (!queryNames.has(ref)) {
          errors.push(`PV-07: Frontend agent surface "${surface.apiName}" references missing query "${ref}"`);
        }
      }
      for (const ref of surface.functionRefs ?? []) {
        if (!functionNames.has(ref)) {
          errors.push(`PV-07: Frontend agent surface "${surface.apiName}" references missing function "${ref}"`);
        }
      }
      for (const ref of surface.actionRefs ?? []) {
        if (!mutationNames.has(ref)) {
          errors.push(`PV-07: Frontend agent surface "${surface.apiName}" references missing action "${ref}"`);
        }
      }
      for (const ref of surface.automationRefs ?? []) {
        if (!automationNames.has(ref)) {
          errors.push(`PV-07: Frontend agent surface "${surface.apiName}" references missing automation "${ref}"`);
        }
      }
    }

    for (const flow of exports.frontend.scenarioFlows ?? []) {
      if (!isPascalCase(flow.apiName)) {
        errors.push(`PV-07: Frontend scenario flow "${flow.apiName}" is not PascalCase`);
      }
      if (!entityNames.has(flow.scenarioEntityApiName)) {
        errors.push(`PV-07: Frontend scenario flow "${flow.apiName}" references missing scenario entity "${flow.scenarioEntityApiName}"`);
      }
      if (!mutationNames.has(flow.submitActionRef)) {
        errors.push(`PV-07: Frontend scenario flow "${flow.apiName}" references missing submit action "${flow.submitActionRef}"`);
      }
      if (flow.commitActionRef && !mutationNames.has(flow.commitActionRef)) {
        errors.push(`PV-07: Frontend scenario flow "${flow.apiName}" references missing commit action "${flow.commitActionRef}"`);
      }
      for (const ref of flow.comparisonFunctionRefs ?? []) {
        if (!functionNames.has(ref)) {
          errors.push(`PV-07: Frontend scenario flow "${flow.apiName}" references missing comparison function "${ref}"`);
        }
      }
    }

    if (exports.frontend.interaction) {
      for (const gesture of exports.frontend.interaction.gestures) {
        if (!backendCallableNames.has(gesture.actionRef) && !isReservedFrontendAction(gesture.actionRef)) {
          errors.push(`PV-07: Interaction gesture "${gesture.apiName}" references missing backend callable "${gesture.actionRef}"`);
        }
      }
    }

    if (exports.frontend.views.some((view) => view.surface === "3dScene") && !exports.frontend.rendering) {
      errors.push("PV-07: Frontend declares a 3dScene view but no rendering export is present");
    }
  }

  // PV-08: Runtime ontology scope
  if (exports.runtime) {
    const queryNames = new Set(exports.logic.queries.map((q) => q.apiName));
    const mutationNames = new Set(exports.action.mutations.map((m) => m.apiName));
    const frontendViewNames = new Set(exports.frontend?.views.map((view) => view.apiName) ?? []);
    const frontendViewsByName = new Map((exports.frontend?.views ?? []).map((view) => [view.apiName, view]));
    const frontendAgentSurfaceNames = new Set(exports.frontend?.agentSurfaces?.map((surface) => surface.apiName) ?? []);
    const scenarioFlowNames = new Set(exports.frontend?.scenarioFlows?.map((flow) => flow.apiName) ?? []);
    const offlineViewNames = new Set(
      (exports.frontend?.views ?? [])
        .filter((view) => view.supportsOffline || view.surface === "embeddedOntologyApp" || (view.syncEntityApiNames?.length ?? 0) > 0)
        .map((view) => view.apiName),
    );
    const reviewBindingNames = new Set(exports.runtime.reviewBindings?.map((binding) => binding.apiName) ?? []);
    const transactionBindingNames = new Set(exports.runtime.transactionBindings?.map((binding) => binding.apiName) ?? []);
    const auditBindingNames = new Set(exports.runtime.auditBindings?.map((binding) => binding.apiName) ?? []);

    for (const binding of exports.runtime.viewBindings) {
      const linkedView = binding.frontendViewRef ? frontendViewsByName.get(binding.frontendViewRef) : undefined;
      if (!isPascalCase(binding.apiName)) {
        errors.push(`PV-08: Runtime view binding "${binding.apiName}" is not PascalCase`);
      }
      if (!binding.route.startsWith("/")) {
        errors.push(`PV-08: Runtime view binding "${binding.apiName}" route "${binding.route}" must start with "/"`);
      }
      for (const legacyRoute of binding.legacyRoutes ?? []) {
        if (!legacyRoute.startsWith("/")) {
          errors.push(`PV-08: Runtime view binding "${binding.apiName}" legacy route "${legacyRoute}" must start with "/"`);
        }
      }
      if (binding.frontendViewRef && !frontendViewNames.has(binding.frontendViewRef)) {
        errors.push(`PV-08: Runtime view binding "${binding.apiName}" references missing frontend view "${binding.frontendViewRef}"`);
      }
      if (linkedView && binding.route !== linkedView.route) {
        errors.push(
          `PV-08: Runtime view binding "${binding.apiName}" route "${binding.route}" does not match frontend view "${linkedView.apiName}" route "${linkedView.route}"`,
        );
      }
      if (binding.reviewBindingRef && !reviewBindingNames.has(binding.reviewBindingRef)) {
        errors.push(`PV-08: Runtime view binding "${binding.apiName}" references missing review binding "${binding.reviewBindingRef}"`);
      }
      if (binding.transactionBindingRef && !transactionBindingNames.has(binding.transactionBindingRef)) {
        errors.push(`PV-08: Runtime view binding "${binding.apiName}" references missing transaction binding "${binding.transactionBindingRef}"`);
      }
      if (binding.auditBindingRef && !auditBindingNames.has(binding.auditBindingRef)) {
        errors.push(`PV-08: Runtime view binding "${binding.apiName}" references missing audit binding "${binding.auditBindingRef}"`);
      }

      const declaredQueryRefs = linkedView
        ? new Set([
            linkedView.primaryQueryRef,
            ...(linkedView.secondaryQueryRefs ?? []),
          ].filter((ref): ref is string => Boolean(ref)))
        : null;
      const declaredMutationRefs = linkedView ? new Set(linkedView.mutationActionRefs ?? []) : null;

      for (const source of binding.sourceBindings ?? []) {
        if (source.entityApiName && !entityNames.has(source.entityApiName)) {
          errors.push(`PV-08: Runtime source "${binding.apiName}.${source.apiName}" references missing entity "${source.entityApiName}"`);
        }
        if (source.kind === "query" && source.semanticRef && !queryNames.has(source.semanticRef)) {
          errors.push(`PV-08: Runtime source "${binding.apiName}.${source.apiName}" references missing semantic query "${source.semanticRef}"`);
        }
        if (
          linkedView
          && source.kind === "query"
          && source.semanticRef
          && declaredQueryRefs
          && !declaredQueryRefs.has(source.semanticRef)
        ) {
          errors.push(
            `PV-08: Runtime source "${binding.apiName}.${source.apiName}" semantic query "${source.semanticRef}" is not declared on frontend view "${linkedView.apiName}"`,
          );
        }
      }

      for (const target of binding.writeTargets ?? []) {
        if (target.entityApiName && !entityNames.has(target.entityApiName)) {
          errors.push(`PV-08: Runtime write target "${binding.apiName}.${target.apiName}" references missing entity "${target.entityApiName}"`);
        }
        if (target.kind === "mutation" && target.semanticRef && !mutationNames.has(target.semanticRef)) {
          errors.push(`PV-08: Runtime write target "${binding.apiName}.${target.apiName}" references missing semantic mutation "${target.semanticRef}"`);
        }
        if (
          linkedView
          && target.kind === "mutation"
          && target.semanticRef
          && declaredMutationRefs
          && !declaredMutationRefs.has(target.semanticRef)
        ) {
          errors.push(
            `PV-08: Runtime write target "${binding.apiName}.${target.apiName}" semantic mutation "${target.semanticRef}" is not declared on frontend view "${linkedView.apiName}"`,
          );
        }
      }
    }

    for (const review of exports.runtime.reviewBindings ?? []) {
      if (!isCamelCase(review.apiName)) {
        errors.push(`PV-08: Runtime review binding "${review.apiName}" is not camelCase`);
      }
      if (!scenarioFlowNames.has(review.scenarioFlowRef)) {
        errors.push(`PV-08: Runtime review binding "${review.apiName}" references missing scenario flow "${review.scenarioFlowRef}"`);
      }
      if (review.actorSurfaceRef && !frontendAgentSurfaceNames.has(review.actorSurfaceRef)) {
        errors.push(`PV-08: Runtime review binding "${review.apiName}" references missing actor surface "${review.actorSurfaceRef}"`);
      }
      if (review.submitActionRef && !mutationNames.has(review.submitActionRef)) {
        errors.push(`PV-08: Runtime review binding "${review.apiName}" references missing submit action "${review.submitActionRef}"`);
      }
      if (review.commitActionRef && !mutationNames.has(review.commitActionRef)) {
        errors.push(`PV-08: Runtime review binding "${review.apiName}" references missing commit action "${review.commitActionRef}"`);
      }
    }

    for (const transaction of exports.runtime.transactionBindings ?? []) {
      if (!isCamelCase(transaction.apiName)) {
        errors.push(`PV-08: Runtime transaction binding "${transaction.apiName}" is not camelCase`);
      }
      if (transaction.mutationRefs.length === 0) {
        errors.push(`PV-08: Runtime transaction binding "${transaction.apiName}" has no mutation refs`);
      }
      for (const ref of transaction.mutationRefs) {
        if (!mutationNames.has(ref)) {
          errors.push(`PV-08: Runtime transaction binding "${transaction.apiName}" references missing mutation "${ref}"`);
        }
      }
      if (transaction.scenarioFlowRef && !scenarioFlowNames.has(transaction.scenarioFlowRef)) {
        errors.push(`PV-08: Runtime transaction binding "${transaction.apiName}" references missing scenario flow "${transaction.scenarioFlowRef}"`);
      }
    }

    for (const audit of exports.runtime.auditBindings ?? []) {
      if (!isCamelCase(audit.apiName)) {
        errors.push(`PV-08: Runtime audit binding "${audit.apiName}" is not camelCase`);
      }
      if (audit.hookEventActionRef && !mutationNames.has(audit.hookEventActionRef)) {
        errors.push(`PV-08: Runtime audit binding "${audit.apiName}" references missing hook event action "${audit.hookEventActionRef}"`);
      }
      if (audit.auditLogActionRef && !mutationNames.has(audit.auditLogActionRef)) {
        errors.push(`PV-08: Runtime audit binding "${audit.apiName}" references missing audit log action "${audit.auditLogActionRef}"`);
      }
      for (const ref of audit.evaluationActionRefs ?? []) {
        if (!mutationNames.has(ref)) {
          errors.push(`PV-08: Runtime audit binding "${audit.apiName}" references missing evaluation action "${ref}"`);
        }
      }
      for (const ref of audit.outcomeActionRefs ?? []) {
        if (!mutationNames.has(ref)) {
          errors.push(`PV-08: Runtime audit binding "${audit.apiName}" references missing outcome action "${ref}"`);
        }
      }
      for (const ref of audit.accuracyActionRefs ?? []) {
        if (!mutationNames.has(ref)) {
          errors.push(`PV-08: Runtime audit binding "${audit.apiName}" references missing accuracy action "${ref}"`);
        }
      }
    }

    for (const support of exports.runtime.supportBindings ?? []) {
      if (!isCamelCase(support.apiName)) {
        errors.push(`PV-08: Runtime support binding "${support.apiName}" is not camelCase`);
      }
      if (support.entityApiName && !entityNames.has(support.entityApiName)) {
        errors.push(`PV-08: Runtime support binding "${support.apiName}" references missing entity "${support.entityApiName}"`);
      }
      if (support.kind === "query" && support.semanticRef && !queryNames.has(support.semanticRef)) {
        errors.push(`PV-08: Runtime support binding "${support.apiName}" references missing semantic query "${support.semanticRef}"`);
      }
      if (support.kind === "mutation" && support.semanticRef && !mutationNames.has(support.semanticRef)) {
        errors.push(`PV-08: Runtime support binding "${support.apiName}" references missing semantic mutation "${support.semanticRef}"`);
      }
    }

    if (offlineViewNames.size > 0) {
      const hasEmbeddedOntologySupport = (exports.runtime.supportBindings ?? []).some((support) => support.kind === "embeddedOntology");
      if (!hasEmbeddedOntologySupport) {
        errors.push("PV-08: Offline/embedded frontend views require at least one runtime support binding with kind=\"embeddedOntology\"");
      }
    }
  }

  // PV-05: Orphan check
  const connected = new Set<string>();
  for (const link of exports.logic.linkTypes) {
    connected.add(link.sourceEntity);
    connected.add(link.targetEntity);
  }
  for (const query of exports.logic.queries) connected.add(query.entityApiName);
  for (const mutation of exports.action.mutations) connected.add(mutation.entityApiName);

  for (const entity of exports.data.objectTypes) {
    if (!connected.has(entity.apiName)) {
      warnings.push(`PV-05: Entity "${entity.apiName}" is orphaned (no links, queries, or mutations)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
