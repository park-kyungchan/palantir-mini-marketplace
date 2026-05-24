/**
 * Project Validator — PV-01 Naming Conventions
 *
 * Split from legacy project-validator.ts v1.13.1 (D2, 2026-04-19).
 * PascalCase / camelCase checks per domain.
 *
 * Consumers import from the parent barrel: `from "./project-validator"`.
 */

import { describe, test, expect } from "bun:test";
import type { OntologyExports } from "../types";
import { isPascalCase, isCamelCase } from "../helpers";

export const RESERVED_FRONTEND_ACTION_PREFIXES = ["navigate:", "view:", "tool:", "dispatch:"] as const;

export function isReservedFrontendAction(actionRef: string): boolean {
  return RESERVED_FRONTEND_ACTION_PREFIXES.some((prefix) => actionRef.startsWith(prefix));
}

export function validateNaming(exports: OntologyExports) {
  describe("PV-01: Naming Conventions", () => {
    test("entity apiNames are PascalCase", () => {
      for (const entity of exports.data.objectTypes) {
        expect(isPascalCase(entity.apiName)).toBe(true);
      }
    });

    test("property apiNames are camelCase", () => {
      for (const entity of exports.data.objectTypes) {
        for (const prop of entity.properties) {
          expect(isCamelCase(prop.apiName)).toBe(true);
        }
      }
    });

    test("link apiNames are camelCase", () => {
      for (const link of exports.logic.linkTypes) {
        expect(isCamelCase(link.apiName)).toBe(true);
      }
    });

    test("mutation apiNames are camelCase", () => {
      for (const mutation of exports.action.mutations) {
        expect(isCamelCase(mutation.apiName)).toBe(true);
      }
    });

    test("role apiNames are camelCase", () => {
      for (const role of exports.security.roles) {
        expect(isCamelCase(role.apiName)).toBe(true);
      }
    });

    test("valueType apiNames are PascalCase", () => {
      for (const vt of exports.data.valueTypes) {
        expect(isPascalCase(vt.apiName)).toBe(true);
      }
    });

    if (exports.logic.interfaces.length > 0) {
      test("interface apiNames are PascalCase (I-prefix recommended but not required)", () => {
        for (const iface of exports.logic.interfaces) {
          expect(isPascalCase(iface.apiName)).toBe(true);
          // I-prefix is a convention, not a hard rule — warn if missing
          if (!iface.apiName.startsWith("I")) {
            console.warn(`  [PV-01] Interface "${iface.apiName}" — consider I-prefix (e.g., "I${iface.apiName}")`);
          }
        }
      });
    }

    if (exports.data.structTypes.length > 0) {
      test("structType apiNames are PascalCase", () => {
        for (const st of exports.data.structTypes) {
          expect(isPascalCase(st.apiName)).toBe(true);
        }
      });
    }
  });
}

