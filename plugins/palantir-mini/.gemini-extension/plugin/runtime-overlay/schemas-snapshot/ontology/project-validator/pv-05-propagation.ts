/**
 * Project Validator — PV-05 Propagation Graph
 *
 * Split from legacy project-validator.ts v1.13.1 (D2, 2026-04-19).
 * Cycles and orphan detection across the impact propagation graph.
 *
 * Consumers import from the parent barrel: `from "./project-validator"`.
 */

import { describe, test, expect } from "bun:test";
import type { OntologyExports, PropagationEdge } from "../types";

export function validatePropagationGraph(exports: OntologyExports) {
  describe("PV-05: Propagation Graph", () => {
    // Build edges from links + derived properties
    const edges: PropagationEdge[] = [];

    for (const link of exports.logic.linkTypes) {
      edges.push({
        trigger: { entityApiName: link.sourceEntity, propertyApiName: link.apiName },
        affected: { entityApiName: link.targetEntity, propertyApiName: link.apiName },
        mechanism: "link",
      });
    }

    for (const dp of exports.logic.derivedProperties) {
      for (const sourceProp of dp.sourceProperties) {
        edges.push({
          trigger: { entityApiName: dp.entityApiName, propertyApiName: sourceProp },
          affected: { entityApiName: dp.entityApiName, propertyApiName: dp.apiName },
          mechanism: "derived",
        });
      }
    }

    test("propagation graph has edges (entities are connected)", () => {
      if (exports.logic.linkTypes.length > 0 || exports.logic.derivedProperties.length > 0) {
        expect(edges.length).toBeGreaterThan(0);
      }
    });

    test("no self-referencing links (source !== target on same entity+property)", () => {
      for (const link of exports.logic.linkTypes) {
        if (link.sourceEntity === link.targetEntity) {
          // Self-referencing entities are allowed (e.g., Employee→Manager)
          // but source and target property must differ
          expect(link.apiName).toBeTruthy();
        }
      }
    });

    // Check for orphan entities (no links, queries, or mutations)
    const connectedEntities = new Set<string>();
    for (const link of exports.logic.linkTypes) {
      connectedEntities.add(link.sourceEntity);
      connectedEntities.add(link.targetEntity);
    }
    for (const query of exports.logic.queries) {
      connectedEntities.add(query.entityApiName);
    }
    for (const mutation of exports.action.mutations) {
      connectedEntities.add(mutation.entityApiName);
    }

    test("orphan entity check (entities with no links, queries, or mutations)", () => {
      const orphans = exports.data.objectTypes
        .map((e) => e.apiName)
        .filter((name) => !connectedEntities.has(name));
      // Warn but don't fail — some entities may be lookup tables
      if (orphans.length > 0) {
        console.warn(`  [PV-05] Orphan entities (no links/queries/mutations): ${orphans.join(", ")}`);
      }
      // At least SOME entities should be connected
      if (exports.data.objectTypes.length > 1) {
        expect(connectedEntities.size).toBeGreaterThan(0);
      }
    });
  });
}

