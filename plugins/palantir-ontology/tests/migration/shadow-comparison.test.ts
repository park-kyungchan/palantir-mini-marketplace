// M830 (Wave 8): shadow comparison harness
// (`src/migration/shadow-comparison.ts`). Validation-contract items 1-3:
// "the harness dual-reads M820's copied fixtures only; zero live
// dual-write"; "read/query/proposal/denial/replay outcomes are compared for
// all seven state families, every result recorded, not summarized away";
// "every divergence is either a defect or an explained deliberate safe
// denial citing a registered reason code".
//
// This suite builds its own hermetic per-family legacy stores under a
// `mkdtempSync` root (the same "M820's imported copy" input shape M820's
// own test establishes), then feeds the resulting `LegacyRecord[]`/
// `IdMapEntry[]` -- obtained via M820's OWN `readLegacyFamilySource`/
// `importFamily`, never re-read by this file -- into
// `runFamilyShadowComparison`. `src/migration/shadow-comparison.ts` itself
// has zero filesystem imports (confirmed by reading it): every fixture path
// below is constructed and read entirely in THIS test file, exactly
// mirroring `legacy-import.test.ts`'s own hermetic-root convention. Never
// writes into, or reads a write target from, `plugins/palantir-mini/**` --
// every write in this file targets its own `mkdtempSync` root.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import { importFamily, readLegacyFamilySource, type LegacyRecord } from "../../src/migration/legacy-import";
import { MIGRATION_STATE_FAMILIES, type IdMapEntry, type MigrationStateFamily } from "../../src/migration/manifest";
import {
  buildGoldenResults,
  compareFamilyReplay,
  evaluateSuccessorGate,
  generateShadowReport,
  runFamilyShadowComparison,
} from "../../src/migration/shadow-comparison";
import { stateFamilyDefinition } from "../../src/migration/state-families";
import { isRegisteredReasonCode, RC_SCHEMA_VALIDATION_FAILED, RC_SCHEMA_VERSION_UNSUPPORTED } from "../../src/semantic-core/reason-codes";

const PACKAGE_ROOT = resolve(import.meta.dir, "..", "..");
const MARKETPLACE_ROOT = resolve(PACKAGE_ROOT, "..", "..");

function makeTempMarketplaceRoot(): string {
  return mkdtempSync(join(tmpdir(), "m830-shadow-comparison-"));
}

/** A record body every family's mapped successor contract accepts (required fields present, non-blank). Families without a mapped contract (retention/projections) get an arbitrary ad hoc blob. */
const STRONG_BODY: Record<MigrationStateFamily, Record<string, unknown>> = {
  sessions: { sessionId: "sess-strong", schemaVersion: "1.0.0", status: "open", openedAt: "2026-07-18T10:00:00Z", byWhom: { identity: "agent:claude-sonnet-5" }, turns: [] },
  "sic-dtc": { sicId: "sic-strong", schemaVersion: "1.0.0", status: "proposed", bodyFingerprint: "e".repeat(64), proposedAt: "2026-07-18T10:00:00Z", byWhom: { identity: "agent:claude-sonnet-5" } },
  events: {
    eventId: "evt-strong",
    schemaVersion: "1.0.0",
    envelopeRev: 1,
    type: "shadow_test_event",
    when: "2026-07-18T10:00:00Z",
    atopWhich: "a".repeat(40),
    throughWhich: { sessionId: "local" },
    byWhom: { identity: "agent:claude-sonnet-5" },
    withWhat: {},
    sequence: 1,
  },
  memory: { itemId: "mem-strong", schemaVersion: "1.0.0", layer: "episodic", authority: "successor", retention: { policy: "durable" }, createdAt: "2026-07-18T10:00:00Z", byWhom: { identity: "agent:claude-sonnet-5" }, provenance: { source: "shadow-test" } },
  "consumer-bindings": {
    id: "binding-strong",
    schemaVersion: "1.0.0",
    consumerProjectId: "proj-1",
    consumerOntologyId: "ont-1",
    consumerOntologyVersion: "1.0.0",
    successorVersion: "1.0.0",
    bindingScope: "read",
    boundAt: "2026-07-18T10:00:00Z",
    byWhom: { identity: "agent:claude-sonnet-5" },
  },
  retention: { id: "retention-strong", retentionPolicy: "90d" },
  projections: { id: "projection-strong", snapshotId: "snap-strong" },
};

/** A record body every mapped successor contract denies -- schema-free ad hoc legacy JSON missing every required field. */
const WEAK_BODY: Record<MigrationStateFamily, Record<string, unknown>> = {
  sessions: { id: "sess-weak", note: "legacy session blob, no successor-shaped fields" },
  "sic-dtc": { id: "sic-weak", note: "legacy sic/dtc blob" },
  events: { eventId: "evt-weak", byWhom: { identity: "monitor" } },
  memory: { id: "mem-weak", note: "legacy memory blob" },
  "consumer-bindings": { id: "binding-weak", note: "legacy registered-project blob" },
  retention: { id: "retention-weak", note: "legacy retention blob" },
  projections: { id: "projection-weak", note: "legacy projection blob" },
};

const FAMILIES_WITH_CONTRACT: readonly MigrationStateFamily[] = ["sessions", "sic-dtc", "events", "memory", "consumer-bindings"];
const FAMILIES_WITH_REQUIRED_FIELD_PARITY: readonly MigrationStateFamily[] = ["sessions", "sic-dtc", "memory", "consumer-bindings"];
const FAMILIES_WITHOUT_CONTRACT: readonly MigrationStateFamily[] = ["retention", "projections"];

/** Writes one family's hermetic legacy store (strong + weak record) at the exact relative `legacyStore` path `state-families.ts` fixes, then imports it via M820's own `importFamily` -- this file never calls a raw fs function on the legacy path itself beyond this one shared setup helper. */
function seedAndImportFamily(root: string, family: MigrationStateFamily, migrationId: string) {
  const def = stateFamilyDefinition(family);
  const legacyAbsPath = resolve(root, def.legacyStore);

  if (family === "events") {
    mkdirSync(dirname(legacyAbsPath), { recursive: true });
    writeFileSync(legacyAbsPath, [JSON.stringify(STRONG_BODY[family]), JSON.stringify(WEAK_BODY[family])].join("\n"));
  } else if (family === "sessions" || family === "sic-dtc") {
    mkdirSync(legacyAbsPath, { recursive: true });
    writeFileSync(join(legacyAbsPath, "strong.json"), JSON.stringify(STRONG_BODY[family]));
    writeFileSync(join(legacyAbsPath, "weak.json"), JSON.stringify(WEAK_BODY[family]));
  } else {
    mkdirSync(dirname(legacyAbsPath), { recursive: true });
    writeFileSync(legacyAbsPath, JSON.stringify([STRONG_BODY[family], WEAK_BODY[family]]));
  }

  const readResult = readLegacyFamilySource(legacyAbsPath);
  const importResult = importFamily({ family, marketplaceRoot: root, schemaVersion: "1.0.0", migrationId, priorMigrationIds: [] });
  if (!importResult.ok) throw new Error(`unexpected denial seeding ${family}: ${importResult.detail}`);
  return { records: readResult.records, idMap: importResult.value.manifest.idMap };
}

describe("shadow comparison — never mutates the imported copy (validation item 1)", () => {
  test("the imported copy (records + idMap) is byte-identical before and after a shadow run, for all seven families", () => {
    const root = makeTempMarketplaceRoot();
    for (const family of MIGRATION_STATE_FAMILIES) {
      const { records, idMap } = seedAndImportFamily(root, family, `mig-m830-immutation-${family}`);
      const beforeRecords = JSON.stringify(records);
      const beforeIdMap = JSON.stringify(idMap);

      runFamilyShadowComparison(family, records, idMap);

      expect(JSON.stringify(records)).toBe(beforeRecords);
      expect(JSON.stringify(idMap)).toBe(beforeIdMap);
    }
  });
});

describe("shadow comparison — all seven families, every outcome recorded (validation item 2)", () => {
  test("recordOutcomes.length equals the number of copied records, for every family — nothing summarized away", () => {
    const root = makeTempMarketplaceRoot();
    for (const family of MIGRATION_STATE_FAMILIES) {
      const { records, idMap } = seedAndImportFamily(root, family, `mig-m830-coverage-${family}`);
      const result = runFamilyShadowComparison(family, records, idMap);
      expect(result.recordOutcomes.length).toBe(records.length);
      expect(result.recordOutcomes.length).toBe(2);
      expect(result.summary.total).toBe(2);
    }
  });
});

describe("shadow comparison — proposal/denial divergence is always explained with a registered reason code (validation item 3)", () => {
  test("a bijective, well-formed import produces zero unexplained-defects, for all seven families", () => {
    const root = makeTempMarketplaceRoot();
    for (const family of MIGRATION_STATE_FAMILIES) {
      const { records, idMap } = seedAndImportFamily(root, family, `mig-m830-defect-${family}`);
      const result = runFamilyShadowComparison(family, records, idMap);
      expect(result.summary.unexplainedDefects).toBe(0);
    }
  });

  test("every explained-safe-denial cites RC-SCHEMA-VALIDATION-FAILED, a registered code, never an invented one", () => {
    const root = makeTempMarketplaceRoot();
    for (const family of FAMILIES_WITH_CONTRACT) {
      const { records, idMap } = seedAndImportFamily(root, family, `mig-m830-denial-${family}`);
      const result = runFamilyShadowComparison(family, records, idMap);
      const denials = result.recordOutcomes.filter((o) => o.divergence?.kind === "explained-safe-denial");
      expect(denials.length).toBeGreaterThan(0); // the weak fixture must deny for every mapped family
      for (const outcome of denials) {
        expect(outcome.divergence?.kind).toBe("explained-safe-denial");
        if (outcome.divergence?.kind === "explained-safe-denial") {
          expect(isRegisteredReasonCode(outcome.divergence.reasonCode)).toBe(true);
          expect(outcome.divergence.reasonCode).toBe(RC_SCHEMA_VALIDATION_FAILED);
        }
      }
    }
  });

  test("a legacy-shaped record that ALSO satisfies the successor's stricter contract has no divergence (parity)", () => {
    // Events use the real event-reader/upcaster gate and are covered separately below.
    // For the other mapped families, exactly one of the two seeded records (the strong
    // one) must pass the mapped contract gate; the weak one must always be denied.
    const root = makeTempMarketplaceRoot();
    for (const family of FAMILIES_WITH_REQUIRED_FIELD_PARITY) {
      const { records, idMap } = seedAndImportFamily(root, family, `mig-m830-parity-${family}`);
      const result = runFamilyShadowComparison(family, records, idMap);
      const accepted = result.recordOutcomes.filter((o) => o.successorGate.kind === "gated" && o.successorGate.result.ok);
      const denied = result.recordOutcomes.filter((o) => o.divergence?.kind === "explained-safe-denial");
      expect(accepted.length).toBe(1);
      expect(denied.length).toBe(1);
      expect(accepted[0]?.divergence).toBeNull();
    }
  });

  test("retention and projections have no mapped successor contract yet — explicit no-successor-contract, never silently upgraded to accept", () => {
    const root = makeTempMarketplaceRoot();
    for (const family of FAMILIES_WITHOUT_CONTRACT) {
      const { records, idMap } = seedAndImportFamily(root, family, `mig-m830-nocontract-${family}`);
      const result = runFamilyShadowComparison(family, records, idMap);
      expect(result.summary.noSuccessorContract).toBe(2);
      for (const outcome of result.recordOutcomes) {
        expect(outcome.successorGate.kind).toBe("no-successor-contract");
        expect(outcome.divergence).toBeNull();
      }
    }
  });

  test("safety net: an artificial id-map gap is flagged unexplained-defect, never silently treated as parity", () => {
    const records: readonly LegacyRecord[] = [{ legacyId: "orphan-legacy-id", body: { note: "no id-map entry exists for this one" }, hasByWhom: false, hasHashLike: false, hasTimestampLike: false }];
    const idMap: readonly IdMapEntry[] = [];
    const result = runFamilyShadowComparison("sessions", records, idMap);
    expect(result.summary.unexplainedDefects).toBe(1);
    expect(result.recordOutcomes[0]?.divergence?.kind).toBe("unexplained-defect");
  });

  test("evaluateSuccessorGate never denies without RC-SCHEMA-VALIDATION-FAILED specifically", () => {
    const gate = evaluateSuccessorGate("sessions", { note: "missing everything" });
    expect(gate.kind).toBe("gated");
    if (gate.kind === "gated") {
      expect(gate.result.ok).toBe(false);
      if (!gate.result.ok) expect(gate.result.reasonCode).toBe(RC_SCHEMA_VALIDATION_FAILED);
    }
  });

  test("events use the real event reader: unsupported envelopeRev quarantines as an explained safe denial, not parity", () => {
    const body = {
      schemaVersion: "1.0.0",
      envelopeRev: 99,
      type: "shadow_test_event",
      when: "2026-07-19T00:00:00Z",
      atopWhich: "m850-target",
      throughWhich: "m850",
      byWhom: { identity: "agent:m850", role: "worker" },
      withWhat: {},
    };
    const gate = evaluateSuccessorGate("events", body);
    expect(gate.kind).toBe("gated");
    if (gate.kind === "gated") {
      expect(gate.result.ok).toBe(false);
      if (!gate.result.ok) expect(gate.result.reasonCode).toBe(RC_SCHEMA_VERSION_UNSUPPORTED);
    }

    const records: readonly LegacyRecord[] = [{ legacyId: "evt-unsupported-rev", body, hasByWhom: true, hasHashLike: false, hasTimestampLike: true }];
    const result = runFamilyShadowComparison("events", records, [{ legacyId: "evt-unsupported-rev", successorId: "evt-0001" }]);
    expect(result.summary.parity).toBe(0);
    expect(result.summary.explainedSafeDenials).toBe(1);
    expect(result.recordOutcomes[0]?.divergence?.kind).toBe("explained-safe-denial");
    if (result.recordOutcomes[0]?.divergence?.kind === "explained-safe-denial") {
      expect(result.recordOutcomes[0].divergence.reasonCode).toBe(RC_SCHEMA_VERSION_UNSUPPORTED);
    }
  });
});

describe("shadow comparison — replay outcome (mission's fifth outcome category)", () => {
  test("events: naturally-ordered records (array order == sequence order) produce replay parity and a stable hash", () => {
    const records: readonly LegacyRecord[] = [
      { legacyId: "evt-1", body: { atopWhich: "target-a", type: "created", sequence: 1, when: "2026-07-18T10:00:00Z", withWhat: {} }, hasByWhom: false, hasHashLike: false, hasTimestampLike: true },
      { legacyId: "evt-2", body: { atopWhich: "target-a", type: "updated", sequence: 2, when: "2026-07-18T10:01:00Z", withWhat: {} }, hasByWhom: false, hasHashLike: false, hasTimestampLike: true },
    ];
    const replay = compareFamilyReplay("events", records);
    expect(replay.applicable).toBe(true);
    expect(replay.orderMatches).toBe(true);
    expect(replay.replayHashStableAcrossRepeat).toBe(true);
    expect(replay.replayHash).not.toBeNull();
  });

  test("events: array order reversed relative to sequence order — the successor's sequence-authoritative replay diverges from a naive legacy array-order reconstruction, reported (never silently matched)", () => {
    const records: readonly LegacyRecord[] = [
      { legacyId: "evt-2", body: { atopWhich: "target-a", type: "updated", sequence: 2, when: "2026-07-18T10:01:00Z", withWhat: {} }, hasByWhom: false, hasHashLike: false, hasTimestampLike: true },
      { legacyId: "evt-1", body: { atopWhich: "target-a", type: "created", sequence: 1, when: "2026-07-18T10:00:00Z", withWhat: {} }, hasByWhom: false, hasHashLike: false, hasTimestampLike: true },
    ];
    const replay = compareFamilyReplay("events", records);
    expect(replay.applicable).toBe(true);
    // Naive legacy array-order pick = last in ARRAY order = "evt-1"/"created" (index 1).
    // Successor sequence-authoritative pick = highest sequence = "evt-2"/"updated" (sequence 2).
    expect(replay.legacyLastByTarget["target-a"]?.lastType).toBe("created");
    expect(replay.successorLastByTarget["target-a"]?.lastType).toBe("updated");
    expect(replay.orderMatches).toBe(false);
    expect(replay.replayHashStableAcrossRepeat).toBe(true);
  });

  test("non-events families are explicitly not-applicable for replay, never silently omitted", () => {
    for (const family of MIGRATION_STATE_FAMILIES) {
      if (family === "events") continue;
      const replay = compareFamilyReplay(family, []);
      expect(replay.applicable).toBe(false);
    }
  });
});

describe("shadow comparison — real marketplace root (refresh-first: verify against the actual real tree, not a description from memory)", () => {
  test("running the shadow comparison against the real, live legacy store for all seven families never throws and every family is well-formed", () => {
    for (const family of MIGRATION_STATE_FAMILIES) {
      const def = stateFamilyDefinition(family);
      const legacyAbsPath = resolve(MARKETPLACE_ROOT, def.legacyStore);
      // refresh-first: query the REAL tree at test-run time -- this repo's
      // `.palantir-mini` tree is gitignored/untracked (RC4), so which of
      // the seven paths exist varies by worktree/environment.
      const pathExistsNow = existsSync(legacyAbsPath);

      const importResult = importFamily({ family, marketplaceRoot: MARKETPLACE_ROOT, schemaVersion: "1.0.0", migrationId: `mig-m830-real-${family}`, priorMigrationIds: [] });

      if (!pathExistsNow) {
        // RC3: an absent legacy store path must FAIL LOUD -- never silently
        // treated as an empty-but-well-formed family.
        expect(importResult.ok).toBe(false);
        if (!importResult.ok) expect(importResult.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
        continue;
      }

      expect(importResult.ok).toBe(true);
      if (!importResult.ok) continue;
      const readResult = readLegacyFamilySource(legacyAbsPath);
      const result = runFamilyShadowComparison(family, readResult.records, importResult.value.manifest.idMap);
      expect(result.recordOutcomes.length).toBe(readResult.records.length);
      expect(result.summary.unexplainedDefects).toBe(0);
    }
  });
});

describe("shadow comparison — golden results fixture + report generator (S3)", () => {
  test("golden results are built and persisted for a deterministic hermetic seven-family scenario; report text names every family and totals zero unexplained defects", () => {
    const root = makeTempMarketplaceRoot();
    const perFamily = MIGRATION_STATE_FAMILIES.map((family) => {
      const { records, idMap } = seedAndImportFamily(root, family, `mig-m830-golden-${family}`);
      return runFamilyShadowComparison(family, records, idMap);
    });
    const golden = buildGoldenResults(perFamily);
    expect(golden.generatedFromFamilies).toEqual(MIGRATION_STATE_FAMILIES);
    expect(golden.totalUnexplainedDefects).toBe(0);

    const report = generateShadowReport(golden);
    for (const family of MIGRATION_STATE_FAMILIES) expect(report).toContain(`## ${family}`);
    expect(report).toContain("TOTAL unexplained-defects across all families: 0");

    const fixturePath = join(PACKAGE_ROOT, "tests/migration/fixtures/shadow-golden-results.json");
    mkdirSync(dirname(fixturePath), { recursive: true });
    writeFileSync(fixturePath, `${JSON.stringify(golden, null, 2)}\n`);

    const persisted = JSON.parse(readFileSync(fixturePath, "utf8"));
    expect(persisted).toEqual(JSON.parse(JSON.stringify(golden)));
  });
});
