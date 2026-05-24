/**
 * Project Validator — PV-07 Frontend Ontology Scope
 *
 * Split from legacy project-validator.ts v1.13.1 (D2, 2026-04-19).
 * Backend↔frontend reference integrity.
 *
 * Consumers import from the parent barrel: `from "./project-validator"`.
 */

import { describe, test, expect } from "bun:test";
import type { OntologyExports } from "../types";
import { isPascalCase, isCamelCase } from "../helpers";

export function validateFrontendOntology(exports: OntologyExports) {
  if (!exports.frontend) return;

  const entityNames = new Set(exports.data.objectTypes.map((e) => e.apiName));
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

  describe("PV-07: Frontend Ontology Scope", () => {
    test("frontend view apiNames are PascalCase", () => {
      for (const view of exports.frontend!.views) {
        expect(isPascalCase(view.apiName)).toBe(true);
      }
    });

    test("frontend views use absolute routes", () => {
      for (const view of exports.frontend!.views) {
        expect(view.route.startsWith("/")).toBe(true);
      }
    });

    test("frontend view references resolve to backend ontology", () => {
      for (const view of exports.frontend!.views) {
        if (view.entityApiName) {
          expect(entityNames.has(view.entityApiName)).toBe(true);
        }
        if (view.primaryQueryRef) {
          expect(queryNames.has(view.primaryQueryRef)).toBe(true);
        }
        for (const ref of view.secondaryQueryRefs ?? []) {
          expect(queryNames.has(ref)).toBe(true);
        }
        for (const ref of view.mutationActionRefs ?? []) {
          expect(mutationNames.has(ref)).toBe(true);
        }
        for (const ref of view.functionRefs ?? []) {
          expect(functionNames.has(ref)).toBe(true);
        }
        for (const ref of view.syncEntityApiNames ?? []) {
          expect(entityNames.has(ref)).toBe(true);
        }
        if (view.supportsOffline || (view.syncEntityApiNames?.length ?? 0) > 0) {
          expect(["osdkApp", "embeddedOntologyApp", "mobile"]).toContain(view.surface);
        }
      }
    });

    test("frontend agent surfaces reference backend ontology tools", () => {
      for (const surface of exports.frontend!.agentSurfaces ?? []) {
        expect(isPascalCase(surface.apiName)).toBe(true);
        if (surface.entityApiName) {
          expect(entityNames.has(surface.entityApiName)).toBe(true);
        }
        const totalRefs =
          (surface.queryRefs?.length ?? 0)
          + (surface.functionRefs?.length ?? 0)
          + (surface.actionRefs?.length ?? 0)
          + (surface.automationRefs?.length ?? 0);
        expect(totalRefs).toBeGreaterThan(0);
        for (const ref of surface.queryRefs ?? []) expect(queryNames.has(ref)).toBe(true);
        for (const ref of surface.functionRefs ?? []) expect(functionNames.has(ref)).toBe(true);
        for (const ref of surface.actionRefs ?? []) expect(mutationNames.has(ref)).toBe(true);
        for (const ref of surface.automationRefs ?? []) expect(automationNames.has(ref)).toBe(true);
      }
    });

    test("frontend scenario flows reference valid sandbox entities and commit actions", () => {
      for (const flow of exports.frontend!.scenarioFlows ?? []) {
        expect(isPascalCase(flow.apiName)).toBe(true);
        expect(entityNames.has(flow.scenarioEntityApiName)).toBe(true);
        expect(mutationNames.has(flow.submitActionRef)).toBe(true);
        if (flow.commitActionRef) {
          expect(mutationNames.has(flow.commitActionRef)).toBe(true);
        }
        for (const ref of flow.comparisonFunctionRefs ?? []) {
          expect(functionNames.has(ref)).toBe(true);
        }
      }
    });

    if (exports.frontend!.interaction) {
      test("frontend interaction bindings point at backend call surfaces", () => {
        for (const gesture of exports.frontend!.interaction!.gestures) {
          expect(backendCallableNames.has(gesture.actionRef)).toBe(true);
        }
      });
    }

    if (exports.frontend!.views.some((view) => view.surface === "3dScene")) {
      test("3dScene views require rendering declarations", () => {
        expect(exports.frontend!.rendering).toBeTruthy();
      });
    }
  });
}

