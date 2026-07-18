// P550 S3: per-state-family manifest builder
// (`src/migration/state-families.ts`). A1-012/MEM-012/X-010, validation-
// contract items 2 and 3: "every state family's manifest is one-directional
// and non-mutating on the source", "ID maps + hash/count reconciliation
// prove zero loss".

import { describe, expect, test } from "bun:test";
import migrationManifestSchema from "../../contracts/migration-manifest.contract.json";
import { checkCopyOnlyDirection, MIGRATION_STATE_FAMILIES, type MigrationStateFamily } from "../../src/migration/manifest";
import { buildFamilyManifest, STATE_FAMILY_DEFINITIONS, stateFamilyDefinition } from "../../src/migration/state-families";
import { validateContract } from "../support/schema-validate";

describe("STATE_FAMILY_DEFINITIONS", () => {
  test("covers exactly the seven MIGRATION_STATE_FAMILIES, no more, no fewer", () => {
    const families = STATE_FAMILY_DEFINITIONS.map((d) => d.family).sort();
    expect(families).toEqual([...MIGRATION_STATE_FAMILIES].sort());
  });

  test("every definition's legacyStore references palantir-mini and successorStore references palantir-ontology", () => {
    for (const def of STATE_FAMILY_DEFINITIONS) {
      expect(def.legacyStore).toContain("palantir-mini");
      expect(def.successorStore).toContain("palantir-ontology");
    }
  });

  test("stateFamilyDefinition resolves every registered family", () => {
    for (const family of MIGRATION_STATE_FAMILIES) {
      expect(stateFamilyDefinition(family).family).toBe(family);
    }
  });
});

describe("buildFamilyManifest", () => {
  const baseParams = (family: MigrationStateFamily) => ({
    family,
    schemaVersion: "1.0.0",
    migrationId: `mig-test-${family}`,
    idMapPairs: [{ legacyId: "legacy-1", successorId: "succ-1" }],
    sourceItems: [{ id: "legacy-1", value: 1 }],
    targetItems: [{ id: "legacy-1", value: 1 }],
    rollback: { available: true, procedureRef: "docs/migration.md#rollback" },
    status: "completed" as const,
    byWhom: { identity: "agent:claude-sonnet-5", role: "worker" },
  });

  test("produces a contract-schema-valid, copy-only-direction-correct manifest for every one of the seven families", () => {
    for (const family of MIGRATION_STATE_FAMILIES) {
      const result = buildFamilyManifest(baseParams(family));
      expect(result.ok).toBe(true);
      if (!result.ok) continue;

      const validation = validateContract(migrationManifestSchema, result.value);
      expect(validation.errors).toEqual([]);
      expect(validation.valid).toBe(true);

      expect(checkCopyOnlyDirection(family, result.value)).toBeNull();
      expect(result.value.stateFamily).toBe(family);
    }
  });

  test("denies (does not throw) when the id map is not a bijection", () => {
    const params = baseParams("events");
    const result = buildFamilyManifest({
      ...params,
      idMapPairs: [
        { legacyId: "legacy-1", successorId: "succ-1" },
        { legacyId: "legacy-1", successorId: "succ-2" },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("still builds a schema-valid manifest when reconciliation does not (yet) balance -- reconciliation failure is a content check the caller runs separately via reconciliation.ts, not a build-time throw", () => {
    const params = baseParams("memory");
    const result = buildFamilyManifest({ ...params, sourceItems: [{ id: "a" }, { id: "b" }], targetItems: [{ id: "a" }], status: "in-progress" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.reconciliation.expectedCount).toBe(2);
      expect(result.value.reconciliation.actualCount).toBe(1);
    }
  });
});
