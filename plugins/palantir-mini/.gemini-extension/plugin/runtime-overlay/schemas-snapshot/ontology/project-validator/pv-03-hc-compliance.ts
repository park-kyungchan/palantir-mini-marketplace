/**
 * Project Validator — PV-03 HC Compliance (Platform Limits)
 *
 * Split from legacy project-validator.ts v1.13.1 (D2, 2026-04-19).
 *
 * Consumers import from the parent barrel: `from "./project-validator"`.
 */

import { describe, test, expect } from "bun:test";
import type { OntologyExports } from "../types";
import { VALID_BASE_TYPES } from "../types";

export function validateHcCompliance(exports: OntologyExports) {
  describe("PV-03: HC Compliance", () => {
    test("HC-DATA-03: each entity has ≤2000 properties", () => {
      for (const entity of exports.data.objectTypes) {
        expect(entity.properties.length).toBeLessThanOrEqual(2000);
      }
    });

    test("HC-DATA-05: vector dimensions ≤2048", () => {
      for (const entity of exports.data.objectTypes) {
        if (entity.vectors) {
          for (const vec of entity.vectors) {
            expect(vec.dimensions).toBeLessThanOrEqual(2048);
          }
        }
      }
    });

    test("property baseTypes are valid", () => {
      const validSet = new Set(VALID_BASE_TYPES);
      for (const entity of exports.data.objectTypes) {
        for (const prop of entity.properties) {
          expect(validSet.has(prop.baseType)).toBe(true);
        }
      }
    });

    if (exports.logic.queries.length > 0) {
      test("HC-LOGIC-01: searchAround traversalPath ≤3 hops", () => {
        for (const query of exports.logic.queries) {
          if (query.traversalPath) {
            expect(query.traversalPath.length).toBeLessThanOrEqual(3);
          }
        }
      });
    }

    test("HC-DATA-02: each entity primaryKey is in its properties", () => {
      for (const entity of exports.data.objectTypes) {
        const propNames = new Set(entity.properties.map((p) => p.apiName));
        expect(propNames.has(entity.primaryKey)).toBe(true);
      }
    });
  });
}

