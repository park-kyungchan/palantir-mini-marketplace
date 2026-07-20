// P820 (Wave 8): real, read-only legacy importers
// (`src/migration/legacy-import.ts`). Validation-contract items 1-4:
// "every family has a working importer reading the real legacyStore path
// and producing a copy-only MigrationManifest"; "checkCopyOnlyDirection
// holds for every imported manifest"; "weak/absent legacy provenance is
// labeled, not upgraded"; "hash/count reconciliation is recorded for
// every family".
//
// This suite exercises TWO fs roots deliberately:
//   - `MARKETPLACE_ROOT` (the real tree) -- proves the importer reads the
//     real, live `plugins/palantir-mini/.palantir-mini/**` legacy store
//     (refresh-first: assertions on the real read are invariant-shaped,
//     e.g. "count >= 0" / "events count > 0", never a hardcoded census
//     number that would go stale as the live store grows).
//   - a `mkdtempSync` temp root mirroring the SAME relative directory
//     shape `STATE_FAMILY_DEFINITIONS` names -- the same hermetic-real-fs
//     precedent `scripts/home-isolation-guard.ts` and
//     `tests/memory/second-brain-test-helpers.ts#makeTempOutcomeDir`
//     already establish -- to deterministically prove the weak-provenance
//     label, the unparseable-record exclusion, and the non-bijective-id
//     denial without depending on what the live store happens to contain
//     today.
//
// Never writes into, or reads a write target from,
// `plugins/palantir-mini/**` -- every write in this file targets its own
// `mkdtempSync` root, never the real legacy tree.

import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import migrationManifestSchema from "../../contracts/migration-manifest.contract.json";
import { importFamily, readLegacyFamilySource } from "../../src/migration/legacy-import";
import { checkCopyOnlyDirection, MIGRATION_STATE_FAMILIES } from "../../src/migration/manifest";
import { evaluateReconciliation } from "../../src/migration/reconciliation";
import { stateFamilyDefinition } from "../../src/migration/state-families";
import { validateContract } from "../support/schema-validate";

// `*.test.ts` is the one file kind `scripts/boundary-check.ts`'s
// `indirect-module-access` rule exempts for bare `import.meta` use (every
// other real-root-resolving test in this package follows the identical
// `resolve(import.meta.dir, "..", "..")` convention, e.g.
// `tests/control-plane/boundary-validator.test.ts`'s `PACKAGE_ROOT`) --
// `src/migration/legacy-import.ts` itself never computes a root; the
// caller always supplies `marketplaceRoot` explicitly (module doc there).
const PACKAGE_ROOT = resolve(import.meta.dir, "..", "..");
const MARKETPLACE_ROOT = resolve(PACKAGE_ROOT, "..", "..");

function makeTempMarketplaceRoot(): string {
  return mkdtempSync(join(tmpdir(), "m820-legacy-import-"));
}

describe("readLegacyFamilySource", () => {
  test("an absent legacy path returns zero records, not an error — but is marked pathExisted:false (RC3) so a caller can still fail loud on it", () => {
    const result = readLegacyFamilySource(join(makeTempMarketplaceRoot(), "does-not-exist"));
    expect(result.records).toEqual([]);
    expect(result.unparseableLegacyIds).toEqual([]);
    expect(result.unidentifiableLegacyIds).toEqual([]);
    expect(result.pathExisted).toBe(false);
  });

  test("reads a directory of one-record-per-file JSON (sessions/sic-dtc shape)", () => {
    const root = makeTempMarketplaceRoot();
    const dir = join(root, "fde-ontology-engineering");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "sess-strong.json"),
      JSON.stringify({ id: "sess-strong", byWhom: { identity: "agent:claude-sonnet-5" }, at: "2026-07-18T10:00:00Z", atopWhich: "a".repeat(40) }),
    );
    writeFileSync(join(dir, "sess-weak.json"), JSON.stringify({ note: "no byWhom, no hash, no timestamp here" }));

    const result = readLegacyFamilySource(dir);
    expect(result.pathExisted).toBe(true);
    expect(result.unparseableLegacyIds).toEqual([]);
    expect(result.records.length).toBe(2);
    const strong = result.records.find((r) => r.legacyId === "sess-strong");
    const weak = result.records.find((r) => r.legacyId === "sess-weak");
    expect(strong?.hasByWhom).toBe(true);
    expect(strong?.hasHashLike).toBe(true);
    expect(strong?.hasTimestampLike).toBe(true);
    expect(weak?.hasByWhom).toBe(false);
    expect(weak?.hasHashLike).toBe(false);
    expect(weak?.hasTimestampLike).toBe(false);
  });

  test("reads a JSONL file, one record per line (events shape)", () => {
    const root = makeTempMarketplaceRoot();
    const file = join(root, "events.jsonl");
    writeFileSync(
      file,
      [
        JSON.stringify({ eventId: "evt-a", byWhom: { identity: "monitor" }, when: "2026-07-18T10:00:00.000Z", atopWhich: "b".repeat(40) }),
        JSON.stringify({ eventId: "evt-b", byWhom: { identity: "monitor" }, when: "2026-07-18T10:01:00.000Z", atopWhich: "c".repeat(40) }),
      ].join("\n"),
    );

    const result = readLegacyFamilySource(file);
    expect(result.records.length).toBe(2);
    expect(result.records.map((r) => r.legacyId)).toEqual(["evt-a", "evt-b"]);
    expect(result.unparseableLegacyIds).toEqual([]);
  });

  test("reads a single-object JSON file with a stable id, wrapping it as one record (memory/consumer-bindings/retention/projections shape)", () => {
    const root = makeTempMarketplaceRoot();
    const file = join(root, "manifest.json");
    writeFileSync(file, JSON.stringify({ id: "singleton-stable-id", note: "singleton legacy blob" }));

    const result = readLegacyFamilySource(file);
    expect(result.records.length).toBe(1);
    expect(result.records[0]?.legacyId).toBe("singleton-stable-id");
    expect(result.unidentifiableLegacyIds).toEqual([]);
  });

  test("an unparseable entry is excluded and named, never silently dropped or guessed", () => {
    const root = makeTempMarketplaceRoot();
    const dir = join(root, "fde-ontology-engineering");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "sess-good.json"), JSON.stringify({ id: "sess-good" }));
    writeFileSync(join(dir, "sess-bad.json"), "{ this is not valid json");

    const result = readLegacyFamilySource(dir);
    expect(result.records.length).toBe(1);
    expect(result.records[0]?.legacyId).toBe("sess-good");
    expect(result.unparseableLegacyIds).toEqual(["sess-bad"]);
    expect(result.unidentifiableLegacyIds).toEqual([]);
  });

  test("idless JSONL, array, and singleton entries are named as unidentifiable, never promoted into generated ids", () => {
    const root = makeTempMarketplaceRoot();

    const jsonl = join(root, "events.jsonl");
    writeFileSync(jsonl, [JSON.stringify({}), JSON.stringify({ eventId: "evt-real" }), "{ truncated"].join("\n"));
    const jsonlRead = readLegacyFamilySource(jsonl);
    expect(jsonlRead.records.map((r) => r.legacyId)).toEqual(["evt-real"]);
    expect(jsonlRead.unidentifiableLegacyIds).toEqual(["line-1"]);
    expect(jsonlRead.unparseableLegacyIds).toEqual(["line-3"]);

    const array = join(root, "array.json");
    writeFileSync(array, JSON.stringify([{}, { id: "array-real" }]));
    const arrayRead = readLegacyFamilySource(array);
    expect(arrayRead.records.map((r) => r.legacyId)).toEqual(["array-real"]);
    expect(arrayRead.unidentifiableLegacyIds).toEqual(["item-1"]);

    const singleton = join(root, "singleton.json");
    writeFileSync(singleton, JSON.stringify({ note: "no stable id" }));
    const singletonRead = readLegacyFamilySource(singleton);
    expect(singletonRead.records).toEqual([]);
    expect(singletonRead.unidentifiableLegacyIds).toEqual(["singleton.json"]);
  });
});

describe("importFamily — real legacy store", () => {
  test("every one of the seven families reads the real legacyStore path and produces a contract-valid, copy-only manifest when the path exists — and fails loud (RC3), never a silent pass, when it does not", () => {
    for (const family of MIGRATION_STATE_FAMILIES) {
      const def = stateFamilyDefinition(family);
      const legacyAbsPath = resolve(MARKETPLACE_ROOT, def.legacyStore);
      // refresh-first: query the REAL tree at test-run time for whether this
      // family's legacyStore path exists right now, rather than assuming --
      // this repo's `.palantir-mini` tree is gitignored/untracked (RC4) so
      // which of the seven paths exist varies by worktree/environment.
      const pathExistsNow = existsSync(legacyAbsPath);

      const result = importFamily({
        family,
        marketplaceRoot: MARKETPLACE_ROOT,
        schemaVersion: "1.0.0",
        migrationId: `mig-m820-${family}`,
        priorMigrationIds: [],
      });

      if (!pathExistsNow) {
        // RC3: an absent legacy store path must FAIL LOUD -- never the
        // silent "records: []" pass that let 5 of 7 families report UNKNOWN
        // as PASS before this fix.
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
          expect(result.detail).toContain(legacyAbsPath);
          expect(result.detail).toContain("does not exist");
        }
        continue;
      }

      expect(result.ok).toBe(true);
      if (!result.ok) continue;

      const validation = validateContract(migrationManifestSchema, result.value.manifest);
      expect(validation.errors).toEqual([]);
      expect(validation.valid).toBe(true);

      expect(checkCopyOnlyDirection(family, result.value.manifest)).toBeNull();
      expect(result.value.manifest.sourceStore).toBe(def.legacyStore);
      expect(result.value.manifest.targetStore).toBe(def.successorStore);
      expect(result.value.recordCount).toBeGreaterThanOrEqual(0);
      expect(result.value.unparseableLegacyIds).toEqual([]);

      const reconciled = evaluateReconciliation(result.value.manifest.reconciliation);
      expect(reconciled.ok).toBe(true);
      expect(result.value.manifest.reconciliation.expectedCount).toBe(result.value.manifest.reconciliation.actualCount);
      expect(result.value.manifest.reconciliation.expectedHash).toBe(result.value.manifest.reconciliation.actualHash);
    }
  });

  test("the real `events` legacy store is non-empty right now — a genuine non-trivial real-data read, not just an absent-path pass (refresh-first: no fixed count asserted)", () => {
    const result = importFamily({ family: "events", marketplaceRoot: MARKETPLACE_ROOT, schemaVersion: "1.0.0", migrationId: "mig-m820-events-nonempty", priorMigrationIds: [] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.recordCount).toBeGreaterThan(0);
  });
});

describe("importFamily — weak-provenance labeling", () => {
  test("a legacy record missing byWhom/hash/timestamp is labeled weak in byWhom.role, never upgraded to a synthesized strong identity", () => {
    const root = makeTempMarketplaceRoot();
    const dir = join(root, "plugins/palantir-mini/.palantir-mini/session/fde-ontology-engineering");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "sess-legacy-weak.json"), JSON.stringify({ id: "sess-legacy-weak", note: "no byWhom in this legacy record" }));

    const result = importFamily({ family: "sessions", marketplaceRoot: root, schemaVersion: "1.0.0", migrationId: "mig-m820-weak-sessions", priorMigrationIds: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.weakLegacyIds).toEqual(["sess-legacy-weak"]);
    expect(result.value.manifest.byWhom?.role).toContain("weak-provenance");
    expect(result.value.manifest.byWhom?.role).toContain("sess-legacy-weak");
    // Never fabricated as a real actor identity — the labeled identity names the importer, not a guessed legacy author.
    expect(result.value.manifest.byWhom?.identity).toBe("legacy-import:sessions");

    const validation = validateContract(migrationManifestSchema, result.value.manifest);
    expect(validation.valid).toBe(true);
  });

  test("a legacy record WITH byWhom + hash-like + timestamp-like signals is not labeled weak", () => {
    const root = makeTempMarketplaceRoot();
    const dir = join(root, "plugins/palantir-mini/.palantir-mini/session/fde-ontology-engineering");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "sess-legacy-strong.json"),
      JSON.stringify({ id: "sess-legacy-strong", byWhom: { identity: "agent:claude-sonnet-5" }, at: "2026-07-18T10:00:00Z", atopWhich: "d".repeat(40) }),
    );

    const result = importFamily({ family: "sessions", marketplaceRoot: root, schemaVersion: "1.0.0", migrationId: "mig-m820-strong-sessions", priorMigrationIds: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.weakLegacyIds).toEqual([]);
    expect(result.value.manifest.byWhom?.role).toBe("worker");
  });
});

describe("importFamily — malformed/collision safety", () => {
  test("an unparseable legacy record denies the import rather than emitting a completed partial manifest", () => {
    const root = makeTempMarketplaceRoot();
    const dir = join(root, "plugins/palantir-mini/.palantir-mini/session/fde-ontology-engineering");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "sess-ok.json"), JSON.stringify({ id: "sess-ok" }));
    writeFileSync(join(dir, "sess-broken.json"), "not json at all {{{");

    const result = importFamily({ family: "sessions", marketplaceRoot: root, schemaVersion: "1.0.0", migrationId: "mig-m820-malformed", priorMigrationIds: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
      expect(result.detail).toContain("unparseable");
      expect(result.detail).toContain("partial copy");
    }
  });

  test("idless parsed entries deny the import and never appear in a successful id map", () => {
    const root = makeTempMarketplaceRoot();
    const file = join(root, "plugins/palantir-mini/.palantir-mini/session/events.jsonl");
    mkdirSync(join(root, "plugins/palantir-mini/.palantir-mini/session"), { recursive: true });
    writeFileSync(file, [JSON.stringify({}), JSON.stringify({ eventId: "evt-ok" })].join("\n"));

    const result = importFamily({ family: "events", marketplaceRoot: root, schemaVersion: "1.0.0", migrationId: "mig-m850-idless", priorMigrationIds: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
      expect(result.detail).toContain("unidentifiable");
      expect(result.detail).toContain("line-1");
    }
  });

  test("denies (does not throw) when two legacy records collide on the same id (non-bijective id map)", () => {
    const root = makeTempMarketplaceRoot();
    const file = join(root, "plugins/palantir-mini/.palantir-mini/session/events.jsonl");
    mkdirSync(join(root, "plugins/palantir-mini/.palantir-mini/session"), { recursive: true });
    writeFileSync(
      file,
      [
        JSON.stringify({ eventId: "evt-dup", byWhom: { identity: "monitor" } }),
        JSON.stringify({ eventId: "evt-dup", byWhom: { identity: "monitor" } }),
      ].join("\n"),
    );

    const result = importFamily({ family: "events", marketplaceRoot: root, schemaVersion: "1.0.0", migrationId: "mig-m820-collision", priorMigrationIds: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
  });

  test("missing prior-id collection and duplicate migration-id deny, while a fresh id passes without mutating caller input", () => {
    const root = makeTempMarketplaceRoot();
    const file = join(root, "plugins/palantir-mini/.palantir-mini/session/events.jsonl");
    mkdirSync(join(root, "plugins/palantir-mini/.palantir-mini/session"), { recursive: true });
    writeFileSync(file, JSON.stringify({ eventId: "evt-fresh", byWhom: { identity: "monitor" }, when: "2026-07-19T00:00:00Z", atopWhich: "e".repeat(40) }));

    const missing = importFamily({ family: "events", marketplaceRoot: root, schemaVersion: "1.0.0", migrationId: "mig-m850-missing-prior" } as Parameters<typeof importFamily>[0]);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");

    const priorMigrationIds = ["mig-m850-duplicate"] as const;
    const duplicate = importFamily({
      family: "events",
      marketplaceRoot: root,
      schemaVersion: "1.0.0",
      migrationId: "mig-m850-duplicate",
      priorMigrationIds,
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
    expect(priorMigrationIds).toEqual(["mig-m850-duplicate"]);

    const freshPriorIds = ["mig-m850-old"] as const;
    const fresh = importFamily({
      family: "events",
      marketplaceRoot: root,
      schemaVersion: "1.0.0",
      migrationId: "mig-m850-fresh",
      priorMigrationIds: freshPriorIds,
    });
    expect(fresh.ok).toBe(true);
    expect(freshPriorIds).toEqual(["mig-m850-old"]);
  });
});
