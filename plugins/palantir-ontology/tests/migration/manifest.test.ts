// P550 S1: manifest types + copy-only direction enforcement
// (`src/migration/manifest.ts`). A1-012/MEM-012/X-010.

import { describe, expect, test } from "bun:test";
import migrationManifestSchema from "../../contracts/migration-manifest.contract.json";
import {
  checkCopyOnlyDirection,
  CURRENT_MIGRATION_MANIFEST_SCHEMA_VERSION,
  isMigrationStateFamily,
  MIGRATION_STATE_FAMILIES,
  validateMigrationManifestSemantics,
} from "../../src/migration/manifest";
import { validateContract } from "../support/schema-validate";

describe("MIGRATION_STATE_FAMILIES", () => {
  test("names exactly the mission's seven state families", () => {
    expect(MIGRATION_STATE_FAMILIES).toEqual(["sessions", "sic-dtc", "events", "memory", "consumer-bindings", "retention", "projections"]);
  });
});

describe("isMigrationStateFamily", () => {
  test("accepts every registered family", () => {
    for (const family of MIGRATION_STATE_FAMILIES) expect(isMigrationStateFamily(family)).toBe(true);
  });

  test("rejects an unregistered string and non-strings", () => {
    expect(isMigrationStateFamily("not-a-family")).toBe(false);
    expect(isMigrationStateFamily(42)).toBe(false);
    expect(isMigrationStateFamily(undefined)).toBe(false);
  });
});

describe("checkCopyOnlyDirection", () => {
  test("legacy-to-successor direction is accepted", () => {
    const violation = checkCopyOnlyDirection("ok.json", {
      sourceStore: "plugins/palantir-mini/.palantir-mini/session/events.jsonl",
      targetStore: "plugins/palantir-ontology/.palantir-ontology/session/events.jsonl",
    });
    expect(violation).toBeNull();
  });

  test("reversed direction (successor-to-legacy) is rejected", () => {
    const violation = checkCopyOnlyDirection("bad.json", {
      sourceStore: "plugins/palantir-ontology/.palantir-ontology/session/events.jsonl",
      targetStore: "plugins/palantir-mini/.palantir-mini/session/events.jsonl",
    });
    expect(violation).not.toBeNull();
  });

  test("a target that also references palantir-mini is rejected even if source is correct", () => {
    const violation = checkCopyOnlyDirection("bad2.json", {
      sourceStore: "plugins/palantir-mini/.palantir-mini/session/events.jsonl",
      targetStore: "plugins/palantir-mini/.palantir-mini/session/backup.jsonl",
    });
    expect(violation).not.toBeNull();
  });

  test("a source that is not a string (missing/malformed) is rejected", () => {
    const violation = checkCopyOnlyDirection("bad3.json", { sourceStore: 42, targetStore: "plugins/palantir-ontology/.palantir-ontology/x" });
    expect(violation).not.toBeNull();
  });
});

describe("validateMigrationManifestSemantics", () => {
  const manifest = {
    schemaVersion: CURRENT_MIGRATION_MANIFEST_SCHEMA_VERSION,
    migrationId: "mig-m850-version",
    sourceStore: "plugins/palantir-mini/.palantir-mini/session/events.jsonl",
    targetStore: "plugins/palantir-ontology/.palantir-ontology/session/events.jsonl",
    idMap: [],
    reconciliation: {
      expectedCount: 0,
      actualCount: 0,
      expectedHash: "0".repeat(64),
      actualHash: "0".repeat(64),
    },
    rollback: { available: false },
    status: "pending",
  };

  test("current 1.0.0 manifest passes the source semantic version gate", () => {
    expect(validateContract(migrationManifestSchema, manifest).valid).toBe(true);
    expect(validateMigrationManifestSemantics("current.json", manifest)).toBeNull();
  });

  test("stale semver-shaped 0.0.1 remains schema-valid but is semantically denied", () => {
    const stale = { ...manifest, schemaVersion: "0.0.1" };
    expect(validateContract(migrationManifestSchema, stale).valid).toBe(true);
    const violation = validateMigrationManifestSemantics("stale.json", stale);
    expect(violation).not.toBeNull();
    expect(violation?.reason).toContain("current migration manifest schema version");
  });
});
