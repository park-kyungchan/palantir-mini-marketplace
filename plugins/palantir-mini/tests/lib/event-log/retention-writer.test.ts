// sprint-106 PR 4.4 — retention-writer tests

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  writeRetentionManifest,
  readRetentionManifest,
  DEFAULT_RETENTION_MANIFEST,
} from "../../../lib/event-log/retention-writer";
import type { RetentionManifestEntry } from "../../../lib/event-log/retention-writer";

/** Brand-safe factory — mirrors retentionManifestRid from the schema primitive. */
function rid(s: string): RetentionManifestEntry["manifestId"] {
  return s as RetentionManifestEntry["manifestId"];
}

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-ret-writer-"));
}

function makeSessionDir(root: string): string {
  const d = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

describe("retention-writer", () => {
  let tmp: string;
  let sessionDir: string;

  beforeEach(() => {
    tmp = makeTmpDir();
    sessionDir = makeSessionDir(tmp);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // readRetentionManifest — null on missing
  // -------------------------------------------------------------------------
  test("readRetentionManifest returns null when file is absent", () => {
    const result = readRetentionManifest(sessionDir);
    expect(result).toBeNull();
  });

  test("null result means callers can fall back to DEFAULT_RETENTION_MANIFEST", () => {
    const manifest = readRetentionManifest(sessionDir) ?? DEFAULT_RETENTION_MANIFEST;
    expect(manifest.manifestId).toBe(rid("manifest-default-v1"));
    expect(manifest.tierPolicies).toHaveLength(5);
  });

  // -------------------------------------------------------------------------
  // writeRetentionManifest + readRetentionManifest — round-trip
  // -------------------------------------------------------------------------
  test("write then read round-trips DEFAULT_RETENTION_MANIFEST", () => {
    writeRetentionManifest({ sessionDir, manifest: DEFAULT_RETENTION_MANIFEST });
    const result = readRetentionManifest(sessionDir);
    expect(result).not.toBeNull();
    expect(result!.manifestId).toBe(DEFAULT_RETENTION_MANIFEST.manifestId);
    expect(result!.tierPolicies).toHaveLength(5);
  });

  test("round-trip preserves all tier fields", () => {
    writeRetentionManifest({ sessionDir, manifest: DEFAULT_RETENTION_MANIFEST });
    const result = readRetentionManifest(sessionDir)!;

    const t0 = result.tierPolicies.find((p) => p.tier === "T0");
    expect(t0).toBeDefined();
    expect(t0!.liveDays).toBe(7);
    expect(t0!.archiveDays).toBe(0);
    expect(t0!.purgeAfterDays).toBe(30);
    expect(t0!.cloudMirrorEnabled).toBe(false);

    const t4 = result.tierPolicies.find((p) => p.tier === "T4");
    expect(t4).toBeDefined();
    expect(t4!.liveDays).toBe(365);
    expect(t4!.archiveDays).toBe(2555);
    expect(t4!.cloudMirrorEnabled).toBe(true);
  });

  test("round-trip preserves provenance", () => {
    writeRetentionManifest({ sessionDir, manifest: DEFAULT_RETENTION_MANIFEST });
    const result = readRetentionManifest(sessionDir)!;
    expect(result.provenance.source).toBe("canonical-plan-v2-row-4.4");
  });

  test("round-trip works with a custom manifest", () => {
    const custom: RetentionManifestEntry = {
      manifestId: rid("manifest-custom-test"),
      tierPolicies: [
        {
          tier: "T1",
          liveDays: 14,
          archiveDays: 28,
          cloudMirrorEnabled: false,
          reason: "Short-lived test policy for unit test purposes only.",
        },
      ],
      createdAt: "2026-05-13T12:00:00.000Z",
      provenance: { source: "unit-test", rationale: "Test fixture for retention-writer." },
    };

    writeRetentionManifest({ sessionDir, manifest: custom });
    const result = readRetentionManifest(sessionDir)!;
    expect(result.manifestId).toBe(rid("manifest-custom-test"));
    expect(result.tierPolicies).toHaveLength(1);
    expect(result.tierPolicies[0]!.liveDays).toBe(14);
  });

  // -------------------------------------------------------------------------
  // Atomic write verification — tmp file must not persist
  // -------------------------------------------------------------------------
  test("atomic write: .tmp file does not remain after successful write", () => {
    writeRetentionManifest({ sessionDir, manifest: DEFAULT_RETENTION_MANIFEST });
    const retentionDir = path.join(sessionDir, "retention");
    const tmpFile = path.join(retentionDir, "manifest.json.tmp");
    expect(fs.existsSync(tmpFile)).toBe(false);
  });

  test("atomic write: manifest.json exists after write", () => {
    writeRetentionManifest({ sessionDir, manifest: DEFAULT_RETENTION_MANIFEST });
    const manifestFile = path.join(sessionDir, "retention", "manifest.json");
    expect(fs.existsSync(manifestFile)).toBe(true);
  });

  test("second write overwrites first atomically", () => {
    writeRetentionManifest({ sessionDir, manifest: DEFAULT_RETENTION_MANIFEST });

    const updated: RetentionManifestEntry = {
      ...DEFAULT_RETENTION_MANIFEST,
      manifestId: rid("manifest-updated-v2"),
    };
    writeRetentionManifest({ sessionDir, manifest: updated });

    const result = readRetentionManifest(sessionDir)!;
    expect(result.manifestId).toBe(rid("manifest-updated-v2"));
  });

  // -------------------------------------------------------------------------
  // readRetentionManifest — null on corrupt file
  // -------------------------------------------------------------------------
  test("readRetentionManifest returns null on corrupt JSON", () => {
    const retentionDir = path.join(sessionDir, "retention");
    fs.mkdirSync(retentionDir, { recursive: true });
    fs.writeFileSync(path.join(retentionDir, "manifest.json"), "{not valid json", "utf8");
    const result = readRetentionManifest(sessionDir);
    expect(result).toBeNull();
  });

  test("readRetentionManifest returns null on valid JSON that fails shape check", () => {
    const retentionDir = path.join(sessionDir, "retention");
    fs.mkdirSync(retentionDir, { recursive: true });
    fs.writeFileSync(
      path.join(retentionDir, "manifest.json"),
      JSON.stringify({ unexpected: "shape" }),
      "utf8"
    );
    const result = readRetentionManifest(sessionDir);
    expect(result).toBeNull();
  });
});
