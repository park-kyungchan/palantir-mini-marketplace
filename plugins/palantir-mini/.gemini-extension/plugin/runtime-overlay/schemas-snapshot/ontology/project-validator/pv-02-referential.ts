/**
 * Project Validator — PV-02 Referential Integrity
 *
 * Split from legacy project-validator.ts v1.13.1 (D2, 2026-04-19).
 * Cross-domain references exist, including typed LEARN refs.
 *
 * Consumers import from the parent barrel: `from "./project-validator"`.
 */

import { describe, test, expect } from "bun:test";
import type { OntologyExports } from "../types";

export function validateReferentialIntegrity(exports: OntologyExports) {
  const entityNames = new Set(exports.data.objectTypes.map((e) => e.apiName));
  const mutationNames = new Set(exports.action.mutations.map((m) => m.apiName));
  const functionNames = new Set(exports.logic.functions.map((f) => f.apiName));

  describe("PV-02: Referential Integrity", () => {
    test("link sourceEntity references existing entity", () => {
      for (const link of exports.logic.linkTypes) {
        expect(entityNames.has(link.sourceEntity)).toBe(true);
      }
    });

    test("link targetEntity references existing entity", () => {
      for (const link of exports.logic.linkTypes) {
        expect(entityNames.has(link.targetEntity)).toBe(true);
      }
    });

    test("mutation entityApiName references existing entity", () => {
      for (const mutation of exports.action.mutations) {
        expect(entityNames.has(mutation.entityApiName)).toBe(true);
      }
    });

    test("query entityApiName references existing entity", () => {
      for (const query of exports.logic.queries) {
        expect(entityNames.has(query.entityApiName)).toBe(true);
      }
    });

    if (exports.logic.derivedProperties.length > 0) {
      test("derivedProperty entityApiName references existing entity", () => {
        for (const dp of exports.logic.derivedProperties) {
          expect(entityNames.has(dp.entityApiName)).toBe(true);
        }
      });
    }

    if (exports.logic.interfaces.length > 0) {
      test("interface implementedBy references existing entities", () => {
        for (const iface of exports.logic.interfaces) {
          for (const impl of iface.implementedBy) {
            expect(entityNames.has(impl)).toBe(true);
          }
        }
      });
    }

    test("security permissionMatrix references existing entities", () => {
      for (const perm of exports.security.permissionMatrix) {
        expect(entityNames.has(perm.entityApiName)).toBe(true);
      }
    });

    test("security permissionMatrix references existing roles", () => {
      const roleNames = new Set(exports.security.roles.map((r) => r.apiName));
      for (const perm of exports.security.permissionMatrix) {
        expect(roleNames.has(perm.roleApiName)).toBe(true);
      }
    });

    test("security markings levels reference existing roles when declared", () => {
      const roleNames = new Set(exports.security.roles.map((r) => r.apiName));
      for (const marking of exports.security.markings) {
        for (const level of marking.levels ?? []) {
          expect(roleNames.has(level)).toBe(true);
        }
      }
    });

    test("learn entity refs reference existing entities", () => {
      const entityRefs = [
        exports.learn?.feedbackEntityRef,
        exports.learn?.evaluationEntityRef,
        exports.learn?.outcomeEntityRef,
        exports.learn?.accuracyEntityRef,
        exports.learn?.refinementSignalEntityRef,
        ...(exports.learn?.workflowLineageEntityRefs ?? []),
      ].filter((ref): ref is string => Boolean(ref));

      for (const ref of entityRefs) {
        expect(entityNames.has(ref)).toBe(true);
      }
    });

    test("learn mutation refs reference existing mutations", () => {
      const mutationRefs = [
        ...(exports.learn?.feedbackMutationRefs ?? []),
        ...(exports.learn?.evaluationMutationRefs ?? []),
        ...(exports.learn?.outcomeMutationRefs ?? []),
        ...(exports.learn?.graduationMutationRefs ?? []),
      ];

      for (const ref of mutationRefs) {
        expect(mutationNames.has(ref)).toBe(true);
      }
    });

    test("learn evaluation function refs reference existing functions", () => {
      for (const ref of exports.learn?.evaluationFunctionRefs ?? []) {
        expect(functionNames.has(ref)).toBe(true);
      }
    });
  });
}

