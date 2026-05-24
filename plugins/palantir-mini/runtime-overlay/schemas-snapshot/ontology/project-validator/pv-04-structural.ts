/**
 * Project Validator — PV-04 Structural Completeness
 *
 * Split from legacy project-validator.ts v1.13.1 (D2, 2026-04-19).
 *
 * Consumers import from the parent barrel: `from "./project-validator"`.
 */

import { describe, test, expect } from "bun:test";
import type { OntologyExports } from "../types";

export function validateStructuralCompleteness(exports: OntologyExports) {
  describe("PV-04: Structural Completeness", () => {
    test("every entity has primaryKey", () => {
      for (const entity of exports.data.objectTypes) {
        expect(entity.primaryKey).toBeTruthy();
      }
    });

    test("every entity has titleKey", () => {
      for (const entity of exports.data.objectTypes) {
        expect(entity.titleKey).toBeTruthy();
      }
    });

    test("every entity has ≥1 property", () => {
      for (const entity of exports.data.objectTypes) {
        expect(entity.properties.length).toBeGreaterThanOrEqual(1);
      }
    });

    test("every link has sourceEntity and targetEntity", () => {
      for (const link of exports.logic.linkTypes) {
        expect(link.sourceEntity).toBeTruthy();
        expect(link.targetEntity).toBeTruthy();
      }
    });

    test("every link has valid cardinality", () => {
      const validCardinalities = new Set(["1:1", "M:1", "1:M", "M:N"]);
      for (const link of exports.logic.linkTypes) {
        expect(validCardinalities.has(link.cardinality)).toBe(true);
      }
    });

    test("every mutation has entityApiName", () => {
      for (const mutation of exports.action.mutations) {
        expect(mutation.entityApiName).toBeTruthy();
      }
    });

    test("every mutation has ≥1 edit", () => {
      for (const mutation of exports.action.mutations) {
        expect(mutation.edits.length).toBeGreaterThanOrEqual(1);
      }
    });

    test("every role has displayName", () => {
      for (const role of exports.security.roles) {
        expect(role.displayName).toBeTruthy();
      }
    });

    test("every entity titleKey is in its properties", () => {
      for (const entity of exports.data.objectTypes) {
        const propNames = new Set(entity.properties.map((p) => p.apiName));
        expect(propNames.has(entity.titleKey)).toBe(true);
      }
    });
  });
}

