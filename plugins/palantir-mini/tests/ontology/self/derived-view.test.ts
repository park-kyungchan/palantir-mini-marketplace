// Tests: the DATA/LOGIC/ACTION/GOVERNANCE derived view is a PROJECTION of the registered
// self-Ontology instances — NOT a hand-authored list. The proof is structural: each axis
// count is asserted EQUAL to the corresponding live registry size. If `generateDerivedView`
// were a hardcoded list, registering/removing an instance would desync it from the registry
// and these equalities would break. Importing the self barrel (done inside derived-view.ts)
// fires every registration via side effect, so the registries are populated before we read.

import { test, expect } from "bun:test";
import {
  generateDerivedView,
  type DerivedView,
  type DerivedViewEntry,
} from "#schemas/ontology/self/derived-view";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import { LINK_TYPE_REGISTRY } from "#schemas/ontology/primitives/link-type";
import { ACTION_TYPE_REGISTRY } from "#schemas/ontology/primitives/action-type";
import { ROLE_REGISTRY } from "#schemas/ontology/primitives/role";
import { FUNCTION_INSTANCES } from "#schemas/ontology/self/functions";
import { SECURITY_LAYERS } from "#schemas/ontology/security/schema";

const view: DerivedView = generateDerivedView();

test("the view is marked generated (not hand-authored)", () => {
  expect(view.generated).toBe(true);
  expect(view.source).toContain("Projected from");
  expect(view.source).toContain("generateDerivedView()");
});

test("DATA axis is projected from the registries (objectTypes + properties + linkTypes)", () => {
  const objectTypeCount: number = OBJECT_TYPE_REGISTRY.list().length;
  const linkTypeCount: number = LINK_TYPE_REGISTRY.list().length;
  const propertyCount: number = OBJECT_TYPE_REGISTRY.list().reduce(
    (sum: number, decl: { properties: readonly unknown[] }): number =>
      sum + decl.properties.length,
    0,
  );

  // Per-kind projection equals the registry-derived counts (proves it reads the registry).
  const dataObjectTypes: DerivedViewEntry[] = view.data.entries.filter(
    (e: DerivedViewEntry): boolean => e.kind === "ObjectType",
  );
  const dataProperties: DerivedViewEntry[] = view.data.entries.filter(
    (e: DerivedViewEntry): boolean => e.kind === "Property",
  );
  const dataLinkTypes: DerivedViewEntry[] = view.data.entries.filter(
    (e: DerivedViewEntry): boolean => e.kind === "LinkType",
  );

  expect(dataObjectTypes.length).toBe(objectTypeCount);
  expect(dataProperties.length).toBe(propertyCount);
  expect(dataLinkTypes.length).toBe(linkTypeCount);
  // Total DATA axis count == sum of its three registry-derived sources.
  expect(view.data.count).toBe(objectTypeCount + propertyCount + linkTypeCount);
});

test("LOGIC axis count == FUNCTION_INSTANCES size (Functions projection)", () => {
  expect(view.logic.count).toBe(FUNCTION_INSTANCES.length);
  expect(view.logic.entries.every((e: DerivedViewEntry): boolean => e.kind === "Function")).toBe(
    true,
  );
});

test("ACTION axis count == ACTION_TYPE_REGISTRY size (ActionTypes projection)", () => {
  expect(view.action.count).toBe(ACTION_TYPE_REGISTRY.list().length);
  expect(
    view.action.entries.every((e: DerivedViewEntry): boolean => e.kind === "ActionType"),
  ).toBe(true);
});

test("GOVERNANCE axis == Roles + security layers + DTC/SIC governance ObjectTypes", () => {
  const roleCount: number = ROLE_REGISTRY.list().length;
  const securityCount: number = SECURITY_LAYERS.length;

  const govRoles: DerivedViewEntry[] = view.governance.entries.filter(
    (e: DerivedViewEntry): boolean => e.kind === "Role",
  );
  const govSecurity: DerivedViewEntry[] = view.governance.entries.filter(
    (e: DerivedViewEntry): boolean => e.kind === "SecurityLayer",
  );
  const govObjectTypes: DerivedViewEntry[] = view.governance.entries.filter(
    (e: DerivedViewEntry): boolean => e.kind === "ObjectType",
  );

  // Roles + security layers project 1:1 from their SSoT.
  expect(govRoles.length).toBe(roleCount);
  expect(govSecurity.length).toBe(securityCount);

  // The DTC/SIC governance ObjectTypes are a registry SUBSET (predicate over the registry),
  // so each must actually exist in OBJECT_TYPE_REGISTRY — never a fabricated name.
  const registeredNames: Set<string> = new Set(
    OBJECT_TYPE_REGISTRY.list().map(
      (decl: { apiName?: string; name: string }): string => decl.apiName ?? decl.name,
    ),
  );
  expect(govObjectTypes.length).toBeGreaterThan(0);
  for (const entry of govObjectTypes) {
    expect(registeredNames.has(entry.name)).toBe(true);
  }
  // The canonical DTC + SIC governance ObjectTypes are present.
  const govNames: Set<string> = new Set(
    govObjectTypes.map((e: DerivedViewEntry): string => e.name),
  );
  expect(govNames.has("SemanticIntentContract")).toBe(true);
  expect(govNames.has("DigitalTwinChangeContract")).toBe(true);

  expect(view.governance.count).toBe(roleCount + securityCount + govObjectTypes.length);
});

test("projection re-reflects the live registry total (no drift between view and registries)", () => {
  // Independent recompute of the whole-registry footprint the view claims to cover.
  const objectTypeCount: number = OBJECT_TYPE_REGISTRY.list().length;
  const linkTypeCount: number = LINK_TYPE_REGISTRY.list().length;
  const actionTypeCount: number = ACTION_TYPE_REGISTRY.list().length;
  expect(
    view.data.entries.filter((e: DerivedViewEntry): boolean => e.kind === "ObjectType").length,
  ).toBe(objectTypeCount);
  expect(
    view.data.entries.filter((e: DerivedViewEntry): boolean => e.kind === "LinkType").length,
  ).toBe(linkTypeCount);
  expect(view.action.count).toBe(actionTypeCount);
});
