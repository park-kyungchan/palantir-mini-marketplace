// Gap C (Program B): a TRACKED fixture proving RC1 (pointer-file
// exclusion), RC2 (append-only amendment-qualified identity, including a
// negative control), and RC3 (absent-path fail-loud) against real,
// committed files -- not a `mkdtempSync` ephemeral root, and not the real
// `.palantir-mini` tree (which `git ls-files | grep -c "\.palantir-mini/"`
// proves is untracked -- 0 -- so no CI run can reproduce anything read from
// it; see legacy-import.test.ts's/shadow-comparison.test.ts's real-root
// describes, which stay environment-dependent and invariant-shaped on
// purpose).
//
// These fixtures live under `tests/fixtures/legacy-import-gapc/**`, never
// under a `.palantir-mini/` path segment rooted at `plugins/palantir-mini/`
// or at repo root -- `git check-ignore -v` on every fixture file here
// returns exit 1 (not ignored) as of this writing; re-verify with the same
// command if this directory is ever moved.
//
// Every assertion below is exact (never invariant-shaped like
// `count >= 0`) -- the real-root tests' looseness is precisely why RC1-RC3
// went uncaught for as long as they did; this file is the deterministic
// counterpart that would have caught them.
//
// `src/migration/id-map.ts` (the bijection guard) is never touched by this
// program slice -- the negative-control test below proves it is still
// exactly as strict as before: a genuine collision (same eventId AND same
// sequence) is still denied.

import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import { importFamily } from "../../src/migration/legacy-import";
import { stateFamilyDefinition } from "../../src/migration/state-families";

const PACKAGE_ROOT = resolve(import.meta.dir, "..", "..");
const FIXTURE_ROOT = resolve(PACKAGE_ROOT, "tests", "fixtures", "legacy-import-gapc");

describe("Gap C tracked fixture — RC1: current.json pointer excluded from the sessions directory scan", () => {
  test("a pointer file (current.json) sharing its target session's sessionId does not collide with the session record it points at", () => {
    const marketplaceRoot = resolve(FIXTURE_ROOT, "pointer-and-absent");
    const result = importFamily({
      family: "sessions",
      marketplaceRoot,
      schemaVersion: "1.0.0",
      migrationId: "mig-gapc-rc1-pointer",
      priorMigrationIds: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.recordCount).toBe(1);
    expect(result.value.manifest.idMap).toEqual([{ legacyId: "fde-gapc-0001", successorId: "fde-0001" }]);
    expect(result.value.unparseableLegacyIds).toEqual([]);
    expect(result.value.unidentifiableLegacyIds).toEqual([]);
  });
});

describe("Gap C tracked fixture — RC2: append-only (.jsonl) identity is amendment-qualified", () => {
  test("two events.jsonl rows sharing an eventId at DIFFERENT sequence values (a real amendment, e.g. a T3->T4 grade-promotion) are both kept as distinct legacy records, never collapsed", () => {
    const marketplaceRoot = resolve(FIXTURE_ROOT, "events-amendment");
    const result = importFamily({
      family: "events",
      marketplaceRoot,
      schemaVersion: "1.0.0",
      migrationId: "mig-gapc-rc2-amendment",
      priorMigrationIds: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.recordCount).toBe(2);
    expect(result.value.manifest.idMap).toEqual([
      { legacyId: "evt-gapc-amend#1", successorId: "evt-0001" },
      { legacyId: "evt-gapc-amend#2", successorId: "evt-0002" },
    ]);
  });

  test("negative control: two rows sharing BOTH the same eventId AND the same sequence are a genuine collision — still denied by id-map.ts's unmodified bijection guard", () => {
    const marketplaceRoot = resolve(FIXTURE_ROOT, "events-negative-control");
    const result = importFamily({
      family: "events",
      marketplaceRoot,
      schemaVersion: "1.0.0",
      migrationId: "mig-gapc-rc2-negative-control",
      priorMigrationIds: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
    expect(result.detail).toContain("evt-gapc-dup#5");
  });
});

describe("Gap C tracked fixture — RC3: an absent legacyStore path fails loud", () => {
  test("a family whose legacyStore path does not exist under an otherwise-real marketplaceRoot is denied, never a silent zero-record pass", () => {
    const marketplaceRoot = resolve(FIXTURE_ROOT, "pointer-and-absent");
    const expectedAbsPath = resolve(marketplaceRoot, stateFamilyDefinition("consumer-bindings").legacyStore);
    // This fixture root deliberately has no registered-projects.json --
    // consumer-bindings' legacyStore path is genuinely absent here.
    const result = importFamily({
      family: "consumer-bindings",
      marketplaceRoot,
      schemaVersion: "1.0.0",
      migrationId: "mig-gapc-rc3-absent",
      priorMigrationIds: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
    expect(result.detail).toContain("does not exist");
    expect(result.detail).toContain(expectedAbsPath);
  });
});
