/**
 * palantir-mini — check-schemas-snapshot-manifest tests (P2-6 integrity index)
 *
 * Covers:
 *   1. Live-repo green gate: checkSchemasSnapshotManifest() → pass after the
 *      MANIFEST.json fileSha256Index has been regenerated to match disk.
 *   2. Lib round-trip: a manifest built by buildRefreshedManifest() verifies
 *      in-sync against the live files (compute === verify).
 *   3. Drift detection: an injected fake recorded index is reported as stale.
 *   4. Release-mode wiring: pmPluginSelfCheck({ mode: "release" }) carries the
 *      schemasSnapshotManifestResult axis and lists it in activeChecks.
 */

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pmPluginSelfCheck } from "../../../../bridge/handlers/pm-plugin-self-check";
import { checkSchemasSnapshotManifest } from "../../../../bridge/handlers/pm-plugin-self-check/check-schemas-snapshot-manifest";
import {
  buildRefreshedManifest,
  computeSnapshotIndex,
  schemasSnapshotDir,
  verifySnapshotManifest,
} from "../../../../lib/runtime-overlay/schemas-snapshot-manifest";

const originalProjectEnv = process.env.PALANTIR_MINI_PROJECT;
const originalEventsFileEnv = process.env.PALANTIR_MINI_EVENTS_FILE;

// g10 fix follow-through: PALANTIR_MINI_PROJECT is now the highest-priority
// root override (resolveEmitRoot()), so leaving it set after this file's
// tests would hijack every other test file's emit() calls in the same bun
// test process. Restore it (and the paired events-file override) afterward.
afterEach(() => {
  if (originalProjectEnv === undefined) delete process.env.PALANTIR_MINI_PROJECT;
  else process.env.PALANTIR_MINI_PROJECT = originalProjectEnv;
  if (originalEventsFileEnv === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
  else process.env.PALANTIR_MINI_EVENTS_FILE = originalEventsFileEnv;
});

const eventsEnv = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sssm-"));
  process.env.PALANTIR_MINI_PROJECT = dir;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(dir, "events.jsonl");
};

describe("check-schemas-snapshot-manifest", () => {
  test("1. live repo: MANIFEST fileSha256Index is in sync with disk", () => {
    const result = checkSchemasSnapshotManifest();
    expect(result.status).toBe("pass");
    expect(result.missingInManifest).toBe(0);
    expect(result.missingOnDisk).toBe(0);
    expect(result.hashMismatches).toBe(0);
    expect(result.countsMatch).toBe(true);
  });

  test("2. lib round-trip: a freshly built manifest verifies in-sync", () => {
    // buildRefreshedManifest is the pure regenerator core — its output must
    // describe the same files computeSnapshotIndex/verify see on disk.
    const built = buildRefreshedManifest();
    const computed = computeSnapshotIndex();
    expect(built.totalFiles).toBe(computed.totalFiles);
    expect(built.totalBytes).toBe(computed.totalBytes);
    expect(built.fileSha256Index).toEqual(computed.fileSha256Index);

    const { inSync } = verifySnapshotManifest();
    expect(inSync).toBe(true);
  });

  test("3. drift detection: a tampered recorded index is reported stale", () => {
    // Build the live manifest, mutate one recorded hash + drop one entry in a
    // throwaway copy of the snapshot dir, and confirm verify flags both.
    const liveDir = schemasSnapshotDir();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sssm-drift-"));
    fs.cpSync(liveDir, tmpDir, { recursive: true });

    const manifestPath = path.join(tmpDir, "MANIFEST.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const keys = Object.keys(manifest.fileSha256Index);
    const corruptedKey = keys[0]!;
    const droppedKey = keys[1]!;
    // Corrupt one recorded hash and remove one recorded entry.
    manifest.fileSha256Index[corruptedKey] = "0".repeat(64);
    delete manifest.fileSha256Index[droppedKey];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    const { inSync, drift } = verifySnapshotManifest(tmpDir);
    expect(inSync).toBe(false);
    expect(drift.hashMismatches).toContain(corruptedKey);
    expect(drift.missingInManifest).toContain(droppedKey);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("4. release mode carries the schemasSnapshotManifest axis", async () => {
    eventsEnv();
    const result = await pmPluginSelfCheck({ mode: "release" });
    expect(result.schemasSnapshotManifestResult).toBeDefined();
    expect(result.schemasSnapshotManifestResult.status).toBe("pass");
    expect(result.activeChecks).toContain("schemas-snapshot-manifest");
  });
});
