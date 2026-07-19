// M840 (Wave 8): checkpointed rollback proof over M820 copies and M830-style
// in-memory shadow state. This test writes only to a mkdtempSync fixture root;
// it never writes the legacy store or installed runtime caches.

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import { createCheckpoint } from "../../src/migration/checkpoint";
import { importFamily, readLegacyFamilySource } from "../../src/migration/legacy-import";
import { replayHash, replayToState } from "../../src/migration/replay";
import { runCheckpointedRollbackDrill } from "../../src/migration/rollback-drill";
import { stateFamilyDefinition } from "../../src/migration/state-families";

function makeTempMarketplaceRoot(): string {
  return mkdtempSync(join(tmpdir(), "m840-rollback-drill-"));
}

function seedEventCopy(root: string): readonly Record<string, unknown>[] {
  const eventsPath = resolve(root, stateFamilyDefinition("events").legacyStore);
  mkdirSync(dirname(eventsPath), { recursive: true });
  const legacyCopy = [
    {
      eventId: "evt-rollback-1",
      schemaVersion: "1.0.0",
      envelopeRev: 1,
      type: "created",
      when: "2026-07-19T00:00:00Z",
      atopWhich: "rollback-target",
      throughWhich: { sessionId: "m840" },
      byWhom: { identity: "agent:codex-worker" },
      withWhat: { value: 1 },
      sequence: 1,
    },
    {
      eventId: "evt-rollback-2",
      schemaVersion: "1.0.0",
      envelopeRev: 1,
      type: "updated",
      when: "2026-07-19T00:01:00Z",
      atopWhich: "rollback-target",
      throughWhich: { sessionId: "m840" },
      byWhom: { identity: "agent:codex-worker" },
      withWhat: { value: 2 },
      sequence: 2,
    },
  ] as const;
  writeFileSync(eventsPath, legacyCopy.map((record) => JSON.stringify(record)).join("\n"));
  return legacyCopy;
}

describe("checkpointed rollback drill", () => {
  test("restores the same passed checkpoint deterministically after a deliberate failure and reconciles to untouched legacy copy", () => {
    const rootA = makeTempMarketplaceRoot();
    seedEventCopy(rootA);
    const legacyReadA = readLegacyFamilySource(resolve(rootA, stateFamilyDefinition("events").legacyStore));
    const legacyCopyA = legacyReadA.records.map((record) => record.body);

    const checkpointsA = [
      createCheckpoint("chk-imported-copy", "2026-07-19T00:02:00Z", "passed"),
      createCheckpoint("chk-shadow-failure", "2026-07-19T00:03:00Z", "failed"),
    ];
    const successorCopyAfterFailureA = [
      ...legacyCopyA,
      { eventId: "evt-failed-write", type: "must-roll-back", sequence: 999 },
    ];

    const runA = runCheckpointedRollbackDrill({
      legacyCopy: legacyCopyA,
      successorCopy: successorCopyAfterFailureA,
      checkpoints: checkpointsA,
      rollback: { available: true, procedureRef: "docs/migration.md#rollback" },
      snapshots: [{ checkpointId: "chk-imported-copy", successorCopy: legacyCopyA }],
    });

    const rootB = makeTempMarketplaceRoot();
    seedEventCopy(rootB);
    const legacyReadB = readLegacyFamilySource(resolve(rootB, stateFamilyDefinition("events").legacyStore));
    const legacyCopyB = legacyReadB.records.map((record) => record.body);
    const checkpointsB = [
      createCheckpoint("chk-imported-copy", "2026-07-19T00:02:00Z", "passed"),
      createCheckpoint("chk-shadow-failure", "2026-07-19T00:03:00Z", "failed"),
    ];
    const successorCopyAfterFailureB = [
      ...legacyCopyB,
      { eventId: "evt-failed-write", type: "must-roll-back", sequence: 999 },
    ];

    const runB = runCheckpointedRollbackDrill({
      legacyCopy: legacyCopyB,
      successorCopy: successorCopyAfterFailureB,
      checkpoints: checkpointsB,
      rollback: { available: true, procedureRef: "docs/migration.md#rollback" },
      snapshots: [{ checkpointId: "chk-imported-copy", successorCopy: legacyCopyB }],
    });

    expect(runA.ok).toBe(true);
    expect(runB.ok).toBe(true);
    if (!runA.ok || !runB.ok) return;

    expect(runA.value.rollbackRequiredReasonCode).toBe("RC-MIGRATION-ROLLBACK-REQUIRED");
    expect(runA.value.restoredCheckpoint.checkpointId).toBe("chk-imported-copy");
    expect(runA.value.restoredCopy).toEqual(legacyCopyA);
    expect(runA.value.restoredDigest).not.toBe(runA.value.successorBeforeRollbackDigest);
    expect(runA.value.reconciliation.expectedCount).toBe(2);
    expect(runA.value.reconciliation.actualCount).toBe(2);
    expect(runA.value.reconciliation.expectedHash).toBe(runA.value.reconciliation.actualHash);

    expect(runB.value.restoredCheckpoint).toEqual(runA.value.restoredCheckpoint);
    expect(runB.value.restoredDigest).toBe(runA.value.restoredDigest);
    expect(runB.value.reconciliation).toEqual(runA.value.reconciliation);
    expect(runB.value.restoredCopy).toEqual(runA.value.restoredCopy);
  });

  test("denies rather than proceeding when no checkpoint has failed", () => {
    const checkpoints = [createCheckpoint("chk-imported-copy", "2026-07-19T00:02:00Z", "passed")];
    const result = runCheckpointedRollbackDrill({
      legacyCopy: [],
      successorCopy: [],
      checkpoints,
      rollback: { available: true, procedureRef: "docs/migration.md#rollback" },
      snapshots: [{ checkpointId: "chk-imported-copy", successorCopy: [] }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-MIGRATION-ROLLBACK-REQUIRED");
  });

  test("preserves M820 weak migration provenance through checkpoint, rollback, and repeated replay", () => {
    const root = makeTempMarketplaceRoot();
    const eventsPath = resolve(root, stateFamilyDefinition("events").legacyStore);
    mkdirSync(dirname(eventsPath), { recursive: true });
    const ordinaryRoleCollision = "weak-provenance: marker-like ordinary role";
    const legacyCopy = [
      {
        eventId: "evt-m850-weak",
        schemaVersion: "1.0.0",
        envelopeRev: 1,
        type: "created",
        when: "2026-07-19T00:00:00Z",
        atopWhich: "m850-target",
        throughWhich: { sessionId: "m850" },
        byWhom: { identity: "agent:ordinary", role: ordinaryRoleCollision },
        withWhat: { value: 1 },
        sequence: 0,
      },
    ] as const;
    writeFileSync(eventsPath, legacyCopy.map((record) => JSON.stringify(record)).join("\n"));

    const imported = importFamily({ family: "events", marketplaceRoot: root, schemaVersion: "1.0.0", migrationId: "mig-m850-provenance", priorMigrationIds: [] });
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const migrationProvenance = imported.value.manifest.byWhom;
    expect(migrationProvenance?.identity).toBe("legacy-import:events");
    expect(migrationProvenance?.role).toContain("weak-provenance");

    const legacyRead = readLegacyFamilySource(eventsPath);
    const importedCopy = legacyRead.records.map((record) => record.body);
    const checkpoints = [
      createCheckpoint("chk-imported-copy", "2026-07-19T00:02:00Z", "passed"),
      createCheckpoint("chk-induced-failure", "2026-07-19T00:03:00Z", "failed"),
    ];
    const rollback = runCheckpointedRollbackDrill({
      legacyCopy: importedCopy,
      successorCopy: [...importedCopy, { eventId: "evt-corrupt", sequence: 999 }],
      checkpoints,
      rollback: { available: true, procedureRef: "docs/migration.md#rollback" },
      snapshots: [{ checkpointId: "chk-imported-copy", successorCopy: importedCopy, migrationProvenance }],
    });

    expect(rollback.ok).toBe(true);
    if (!rollback.ok) return;
    expect(rollback.value.restoredMigrationProvenance).toEqual(migrationProvenance);
    expect(rollback.value.restoredMigrationProvenance?.role).toBe(migrationProvenance?.role);

    const replayA = replayToState(rollback.value.restoredCopy, [], 0, rollback.value.restoredMigrationProvenance);
    const replayB = replayToState(rollback.value.restoredCopy, [], 0, rollback.value.restoredMigrationProvenance);
    expect(replayA.migrationProvenance).toEqual(migrationProvenance);
    expect(replayA.stateByTarget["m850-target"]?.lastByWhom).toEqual({ identity: "agent:ordinary", role: ordinaryRoleCollision });
    expect(replayHash(replayA)).toBe(replayHash(replayB));

    const differentProvenanceReplay = replayToState(rollback.value.restoredCopy, [], 0, { identity: "agent:ordinary", role: migrationProvenance?.role });
    expect(replayHash(differentProvenanceReplay)).not.toBe(replayHash(replayA));
  });
});
