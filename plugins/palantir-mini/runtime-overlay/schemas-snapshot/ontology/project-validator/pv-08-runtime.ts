/**
 * Project Validator — PV-08 Runtime Ontology Scope
 *
 * Split from legacy project-validator.ts v1.13.1 (D2, 2026-04-19).
 * Frontend/runtime/backend binding integrity.
 *
 * Consumers import from the parent barrel: `from "./project-validator"`.
 */

import { describe, test, expect } from "bun:test";
import type { OntologyExports } from "../types";
import { isPascalCase, isCamelCase } from "../helpers";

export function validateRuntimeOntology(exports: OntologyExports) {
  if (!exports.runtime) return;

  const entityNames = new Set(exports.data.objectTypes.map((e) => e.apiName));
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

  describe("PV-08: Runtime Ontology Scope", () => {
    test("runtime view bindings use PascalCase apiNames and absolute routes", () => {
      for (const binding of exports.runtime!.viewBindings) {
        expect(isPascalCase(binding.apiName)).toBe(true);
        expect(binding.route.startsWith("/")).toBe(true);
        for (const legacyRoute of binding.legacyRoutes ?? []) {
          expect(legacyRoute.startsWith("/")).toBe(true);
        }
      }
    });

    test("runtime bindings trace back to frontend/backend ontology references", () => {
      const reviewBindingRefs = new Set(exports.runtime!.reviewBindings?.map((binding) => binding.apiName) ?? []);
      const transactionBindingRefs = new Set(exports.runtime!.transactionBindings?.map((binding) => binding.apiName) ?? []);
      const auditBindingRefs = new Set(exports.runtime!.auditBindings?.map((binding) => binding.apiName) ?? []);

      for (const binding of exports.runtime!.viewBindings) {
        const linkedView = binding.frontendViewRef ? frontendViewsByName.get(binding.frontendViewRef) : undefined;
        if (binding.frontendViewRef) {
          expect(frontendViewNames.has(binding.frontendViewRef)).toBe(true);
        }
        if (linkedView) {
          expect(binding.route).toBe(linkedView.route);

          const declaredQueryRefs = new Set([
            linkedView.primaryQueryRef,
            ...(linkedView.secondaryQueryRefs ?? []),
          ].filter((ref): ref is string => Boolean(ref)));
          const declaredMutationRefs = new Set(linkedView.mutationActionRefs ?? []);

          for (const source of binding.sourceBindings ?? []) {
            if (source.kind === "query" && source.semanticRef) {
              expect(declaredQueryRefs.has(source.semanticRef)).toBe(true);
            }
          }

          for (const target of binding.writeTargets ?? []) {
            if (target.kind === "mutation" && target.semanticRef) {
              expect(declaredMutationRefs.has(target.semanticRef)).toBe(true);
            }
          }
        }
        if (binding.reviewBindingRef) {
          expect(reviewBindingRefs.has(binding.reviewBindingRef)).toBe(true);
        }
        if (binding.transactionBindingRef) {
          expect(transactionBindingRefs.has(binding.transactionBindingRef)).toBe(true);
        }
        if (binding.auditBindingRef) {
          expect(auditBindingRefs.has(binding.auditBindingRef)).toBe(true);
        }

        for (const source of binding.sourceBindings ?? []) {
          if (source.entityApiName) {
            expect(entityNames.has(source.entityApiName)).toBe(true);
          }
          if (source.kind === "query" && source.semanticRef) {
            expect(queryNames.has(source.semanticRef)).toBe(true);
          }
        }

        for (const target of binding.writeTargets ?? []) {
          if (target.entityApiName) {
            expect(entityNames.has(target.entityApiName)).toBe(true);
          }
          if (target.kind === "mutation" && target.semanticRef) {
            expect(mutationNames.has(target.semanticRef)).toBe(true);
          }
        }
      }

      for (const review of exports.runtime!.reviewBindings ?? []) {
        expect(isCamelCase(review.apiName)).toBe(true);
        expect(scenarioFlowNames.has(review.scenarioFlowRef)).toBe(true);
        if (review.actorSurfaceRef) {
          expect(frontendAgentSurfaceNames.has(review.actorSurfaceRef)).toBe(true);
        }
        if (review.submitActionRef) {
          expect(mutationNames.has(review.submitActionRef)).toBe(true);
        }
        if (review.commitActionRef) {
          expect(mutationNames.has(review.commitActionRef)).toBe(true);
        }
      }

      for (const transaction of exports.runtime!.transactionBindings ?? []) {
        expect(isCamelCase(transaction.apiName)).toBe(true);
        expect(transaction.mutationRefs.length).toBeGreaterThan(0);
        for (const ref of transaction.mutationRefs) {
          expect(mutationNames.has(ref)).toBe(true);
        }
        if (transaction.scenarioFlowRef) {
          expect(scenarioFlowNames.has(transaction.scenarioFlowRef)).toBe(true);
        }
      }

      for (const audit of exports.runtime!.auditBindings ?? []) {
        expect(isCamelCase(audit.apiName)).toBe(true);
        if (audit.hookEventActionRef) {
          expect(mutationNames.has(audit.hookEventActionRef)).toBe(true);
        }
        if (audit.auditLogActionRef) {
          expect(mutationNames.has(audit.auditLogActionRef)).toBe(true);
        }
        for (const ref of audit.evaluationActionRefs ?? []) {
          expect(mutationNames.has(ref)).toBe(true);
        }
        for (const ref of audit.outcomeActionRefs ?? []) {
          expect(mutationNames.has(ref)).toBe(true);
        }
        for (const ref of audit.accuracyActionRefs ?? []) {
          expect(mutationNames.has(ref)).toBe(true);
        }
      }

      for (const support of exports.runtime!.supportBindings ?? []) {
        expect(isCamelCase(support.apiName)).toBe(true);
        if (support.entityApiName) {
          expect(entityNames.has(support.entityApiName)).toBe(true);
        }
        if (support.kind === "query" && support.semanticRef) {
          expect(queryNames.has(support.semanticRef)).toBe(true);
        }
        if (support.kind === "mutation" && support.semanticRef) {
          expect(mutationNames.has(support.semanticRef)).toBe(true);
        }
      }

      if (offlineViewNames.size > 0) {
        const embeddedOntologySupports = exports.runtime!.supportBindings?.filter((support) => support.kind === "embeddedOntology") ?? [];
        expect(embeddedOntologySupports.length).toBeGreaterThan(0);
      }
    });
  });
}

